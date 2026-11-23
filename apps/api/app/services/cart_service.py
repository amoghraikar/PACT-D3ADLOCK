import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.models.catalogue import ProductVariant
from app.models.commerce import BulkOrder, BulkOrderItem, ShoppingCycle
from app.models.identity import User
from app.models.organization import RetailerCommunity
from app.repositories.cart_repository import CartRepository
from app.repositories.cycle_repository import CycleRepository
from app.schemas.cart import (
    BatchCartItem,
    BulkOrderItemResponse,
    BulkOrderResponse,
    CartResponse,
    CommunityDemandAggregate,
    CycleSummary,
    PersonalCartItem,
)


class CartService:
    @staticmethod
    def resolve_community_id(
        user: User, explicit_community_id: uuid.UUID | None = None
    ) -> uuid.UUID:
        """
        Determines the community context for a user.
        If user is platform admin and passes explicit_community_id, uses it.
        Otherwise selects the user's active community membership.
        """
        if explicit_community_id and user.role and user.role.name == "platform_admin":
            return explicit_community_id

        active_memberships = [m for m in (user.memberships or []) if m.is_active and m.community_id]
        if not active_memberships:
            raise ForbiddenError(
                "You must belong to an active community to access the collective cart.",
                code="NO_COMMUNITY_MEMBERSHIP",
            )
        return active_memberships[0].community_id

    @classmethod
    def _assert_cycle_open_for_mutations(cls, cycle: ShoppingCycle) -> None:
        """
        Validates cycle status and cutoff time.
        Throws HTTP 409 Conflict with ORDER_CYCLE_LOCKED if cutoff passed.
        """
        is_passed = now_utc() >= cycle.cutoff_at
        if cycle.status != "OPEN" or is_passed:
            raise ConflictError(
                "Shopping cycle is locked. No cart modifications allowed after cutoff.",
                code="ORDER_CYCLE_LOCKED",
            )

    @classmethod
    def get_user_cart(
        cls,
        db: Session,
        user: User,
        community_id: uuid.UUID | None = None,
    ) -> CartResponse:
        comm_id = cls.resolve_community_id(user, community_id)
        cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)

        # 1. Fetch personal items
        cart_items = CartRepository.get_user_cart_items(db, cycle.id, user.id)

        # 2. Fetch anonymized community aggregates for items in this user's cart
        variant_ids = [item.variant_id for item in cart_items]
        community_aggs = CartRepository.get_community_variant_aggregates(db, cycle.id, variant_ids)

        personal_items: list[PersonalCartItem] = []
        personal_total = 0

        for item in cart_items:
            variant = item.variant
            product = variant.product
            unit_price = variant.default_price_paise
            subtotal = item.quantity * unit_price
            personal_total += subtotal

            # Primary image
            sorted_imgs = (
                sorted(product.images, key=lambda i: i.display_order) if product.images else []
            )
            primary_img = next((i for i in sorted_imgs if i.is_primary), None)
            img_url = (
                primary_img.image_url
                if primary_img
                else (sorted_imgs[0].image_url if sorted_imgs else None)
            )

            personal_items.append(
                PersonalCartItem(
                    id=item.id,
                    variant_id=variant.id,
                    product_id=product.id,
                    product_title=product.title,
                    product_brand=product.brand,
                    variant_title=variant.title,
                    variant_sku=variant.sku,
                    variant_unit=variant.unit,
                    unit_price_paise=unit_price,
                    quantity=item.quantity,
                    subtotal_paise=subtotal,
                    primary_image_url=img_url,
                    community_aggregate_qty=community_aggs.get(variant.id, item.quantity),
                )
            )

        # 3. Community cycle overview statistics
        stats = CycleRepository.get_community_cycle_stats(db, cycle.id)
        community_summary = CommunityDemandAggregate(**stats)

        # 4. Countdown calculation
        seconds_left = max(0, int((cycle.cutoff_at - now_utc()).total_seconds()))
        is_passed = now_utc() >= cycle.cutoff_at or cycle.status != "OPEN"

        cycle_summary = CycleSummary(
            id=cycle.id,
            community_id=cycle.community_id,
            community_name=cycle.community.name if cycle.community else "My Community",
            cycle_month=cycle.cycle_month,
            cutoff_at=cycle.cutoff_at,
            status=cycle.status,
            time_remaining_seconds=seconds_left,
            is_cutoff_passed=is_passed,
            participating_households_count=stats["participating_households_count"],
        )

        return CartResponse(
            cycle=cycle_summary,
            items=personal_items,
            personal_total_paise=personal_total,
            community_summary=community_summary,
        )

    @classmethod
    def update_cart_item(
        cls,
        db: Session,
        user: User,
        variant_id: uuid.UUID,
        quantity: int,
        notes: str | None = None,
        community_id: uuid.UUID | None = None,
    ) -> CartResponse:
        comm_id = cls.resolve_community_id(user, community_id)
        cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)

        # Guard cutoff
        cls._assert_cycle_open_for_mutations(cycle)

        # Verify variant exists
        variant = db.get(ProductVariant, variant_id)
        if not variant or not variant.is_active:
            raise NotFoundError(f"Product variant {variant_id} does not exist or is inactive.")

        CartRepository.upsert_cart_item(
            db=db,
            cycle_id=cycle.id,
            community_id=comm_id,
            user_id=user.id,
            variant_id=variant_id,
            quantity=quantity,
            notes=notes,
        )

        return cls.get_user_cart(db, user, comm_id)

    @classmethod
    def batch_update_cart(
        cls,
        db: Session,
        user: User,
        items: list[BatchCartItem],
        community_id: uuid.UUID | None = None,
    ) -> CartResponse:
        comm_id = cls.resolve_community_id(user, community_id)
        cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)

        cls._assert_cycle_open_for_mutations(cycle)

        for item in items:
            variant = db.get(ProductVariant, item.variant_id)
            if not variant or not variant.is_active:
                continue
            CartRepository.upsert_cart_item(
                db=db,
                cycle_id=cycle.id,
                community_id=comm_id,
                user_id=user.id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                notes=item.notes,
            )

        return cls.get_user_cart(db, user, comm_id)

    @classmethod
    def remove_cart_item(
        cls,
        db: Session,
        user: User,
        variant_id: uuid.UUID,
        community_id: uuid.UUID | None = None,
    ) -> CartResponse:
        comm_id = cls.resolve_community_id(user, community_id)
        cycle = CycleRepository.get_or_create_current_cycle(db, comm_id)

        cls._assert_cycle_open_for_mutations(cycle)

        CartRepository.delete_cart_item(
            db=db,
            cycle_id=cycle.id,
            user_id=user.id,
            variant_id=variant_id,
        )

        return cls.get_user_cart(db, user, comm_id)

    @classmethod
    def consolidate_cycle_order(
        cls,
        db: Session,
        cycle_id: uuid.UUID,
    ) -> BulkOrderResponse:
        """
        Idempotent bulk order consolidation:
        - Locks the cycle with FOR UPDATE
        - If bulk order already exists, returns it without creating duplicate
        - Aggregates all community cart items
        - Generates consolidated BulkOrder and BulkOrderItems
        """
        # 1. Lock cycle row to serialize concurrent executions
        stmt = select(ShoppingCycle).where(ShoppingCycle.id == cycle_id).with_for_update()
        cycle = db.scalars(stmt).first()
        if not cycle:
            raise NotFoundError(f"Shopping cycle {cycle_id} not found.")

        # 2. Check if bulk order already exists for this cycle (Idempotency)
        existing_order_stmt = (
            select(BulkOrder).where(BulkOrder.cycle_id == cycle.id).with_for_update()
        )
        existing_order = db.scalars(existing_order_stmt).first()
        if existing_order:
            return cls._format_bulk_order_response(existing_order)

        # 3. Resolve primary retailer for this community
        ret_comm_stmt = (
            select(RetailerCommunity)
            .where(
                RetailerCommunity.community_id == cycle.community_id,
                RetailerCommunity.is_active.is_(True),
            )
            .order_by(RetailerCommunity.is_primary.desc())
        )
        ret_comm = db.scalars(ret_comm_stmt).first()
        if not ret_comm:
            raise ConflictError(
                "No registered retailer associated with this community for order fulfillment.",
                code="NO_RETAILER_MAPPED",
            )

        # 4. Aggregate all cart items
        cart_items = CartRepository.get_all_cycle_cart_items(db, cycle.id)
        if not cart_items:
            raise ConflictError(
                "Cannot consolidate bulk order: community cart is empty.",
                code="EMPTY_COMMUNITY_CART",
            )

        # Aggregate requested quantities per variant
        variant_totals: dict[uuid.UUID, int] = {}
        variant_map: dict[uuid.UUID, ProductVariant] = {}

        for ci in cart_items:
            variant_totals[ci.variant_id] = variant_totals.get(ci.variant_id, 0) + ci.quantity
            variant_map[ci.variant_id] = ci.variant

        # 5. Create Bulk Order
        order_number = f"PACT-BO-{cycle.cycle_month}-{uuid.uuid4().hex[:6].upper()}"
        subtotal_paise = sum(
            qty * variant_map[vid].default_price_paise for vid, qty in variant_totals.items()
        )
        delivery_fee = ret_comm.delivery_fee_paise or 0
        total_paise = subtotal_paise + delivery_fee

        bulk_order = BulkOrder(
            cycle_id=cycle.id,
            community_id=cycle.community_id,
            retailer_id=ret_comm.retailer_id,
            order_number=order_number,
            status="pending",
            total_requested_items=sum(variant_totals.values()),
            total_packed_items=0,
            subtotal_paise=subtotal_paise,
            discount_paise=0,
            delivery_fee_paise=delivery_fee,
            total_paise=total_paise,
            placed_at=now_utc(),
            locked_at=now_utc(),
        )
        db.add(bulk_order)
        db.flush()

        # 6. Create BulkOrderItems
        for vid, requested_qty in variant_totals.items():
            variant = variant_map[vid]
            unit_price = variant.default_price_paise
            item_subtotal = requested_qty * unit_price

            bo_item = BulkOrderItem(
                bulk_order_id=bulk_order.id,
                variant_id=vid,
                requested_qty=requested_qty,
                packed_qty=0,
                unit_price_paise=unit_price,
                subtotal_paise=item_subtotal,
            )
            db.add(bo_item)

        # 7. Transition cycle state to PROCESSING
        cycle.status = "PROCESSING"
        db.commit()
        db.refresh(bulk_order)

        return cls._format_bulk_order_response(bulk_order)

    @staticmethod
    def _format_bulk_order_response(bo: BulkOrder) -> BulkOrderResponse:
        items = [
            BulkOrderItemResponse(
                id=item.id,
                variant_id=item.variant_id,
                variant_title=item.variant.title,
                variant_sku=item.variant.sku,
                requested_qty=item.requested_qty,
                packed_qty=item.packed_qty,
                unit_price_paise=item.unit_price_paise,
                subtotal_paise=item.subtotal_paise,
            )
            for item in bo.items
        ]
        return BulkOrderResponse(
            id=bo.id,
            cycle_id=bo.cycle_id,
            community_id=bo.community_id,
            retailer_id=bo.retailer_id,
            order_number=bo.order_number,
            status=bo.status,
            total_requested_items=bo.total_requested_items,
            subtotal_paise=bo.subtotal_paise,
            delivery_fee_paise=bo.delivery_fee_paise,
            total_paise=bo.total_paise,
            placed_at=bo.placed_at,
            items=items,
        )
