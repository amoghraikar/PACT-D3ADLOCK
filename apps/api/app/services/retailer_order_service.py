import uuid

from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.core.pagination import PaginatedMeta, PaginatedResponse
from app.models.identity import User
from app.modules.billing.engine import F7BillingEngine
from app.repositories.cart_repository import CartRepository
from app.repositories.retailer_order_repository import RetailerOrderRepository
from app.schemas.billing import (
    BillingCalculationInput,
    BillingCalculationResult,
    FinalizeBillingRequest,
    ResidentItemRequest,
    RetailerBillResponse,
    VariantPackInfo,
)
from app.schemas.retailer_order import (
    AcceptOrderResponse,
    DispatchOrderResponse,
    PackingRecordResponse,
    RejectOrderRequest,
    RejectOrderResponse,
    RetailerDashboardMetrics,
    RetailerOrderDetail,
    RetailerOrderItemDetail,
    RetailerOrderSummary,
    SendBillRequest,
    SendBillResponse,
    UpdatePackingRequest,
    UpdatePackingResponse,
)
from app.services.billing_service import BillingService


class RetailerOrderService:
    @staticmethod
    def resolve_retailer_id(
        current_user: User, explicit_retailer_id: uuid.UUID | None = None
    ) -> uuid.UUID:
        """
        Enforce strict multi-tenant boundary for retailers.
        Platform admins can act on behalf of a specific retailer if explicit_retailer_id is supplied.
        Retailers can only access and manipulate their own store.
        """
        if current_user.role and current_user.role.name == "platform_admin":
            if explicit_retailer_id:
                return explicit_retailer_id
            if current_user.retailer_profile:
                return current_user.retailer_profile.id
            if current_user.retailer_id:
                return current_user.retailer_id
            raise ForbiddenError(
                "Retailer ID parameter is required for platform administrators.",
                code="RETAILER_ID_REQUIRED",
            )

        if current_user.retailer_profile:
            return current_user.retailer_profile.id
        if current_user.retailer_id:
            return current_user.retailer_id

        raise ForbiddenError(
            "User is not registered as an active merchant retailer.",
            code="RETAILER_ACCESS_DENIED",
        )

    @classmethod
    def get_orders(
        cls,
        db: Session,
        current_user: User,
        status: str | None = None,
        page: int = 1,
        limit: int = 20,
        explicit_retailer_id: uuid.UUID | None = None,
    ) -> PaginatedResponse[RetailerOrderSummary]:
        retailer_id = cls.resolve_retailer_id(current_user, explicit_retailer_id)

        orders, total, households_map = RetailerOrderRepository.get_orders_list(
            db=db,
            retailer_id=retailer_id,
            status=status,
            page=page,
            limit=limit,
        )

        items: list[RetailerOrderSummary] = []
        for order in orders:
            cycle_month = order.cycle.cycle_month if order.cycle else "CURRENT"
            comm_name = order.community.name if order.community else "Unknown Community"
            h_count = households_map.get(order.cycle_id, 0)

            items.append(
                RetailerOrderSummary(
                    id=order.id,
                    order_number=order.order_number,
                    cycle_id=order.cycle_id,
                    cycle_month=cycle_month,
                    community_id=order.community_id,
                    community_name=comm_name,
                    retailer_id=order.retailer_id,
                    status=order.status.upper(),
                    total_requested_items=order.total_requested_items,
                    total_packed_items=order.total_packed_items,
                    subtotal_paise=order.subtotal_paise,
                    discount_paise=order.discount_paise,
                    delivery_fee_paise=order.delivery_fee_paise,
                    total_paise=order.total_paise,
                    placed_at=order.placed_at,
                    locked_at=order.locked_at,
                    dispatched_at=order.dispatched_at,
                    delivered_at=order.delivered_at,
                    participating_households_count=h_count,
                )
            )

        meta = PaginatedMeta.from_total(total=total, page=page, limit=limit)
        return PaginatedResponse(data=items, meta=meta)

    @classmethod
    def get_order_detail(
        cls,
        db: Session,
        order_id: uuid.UUID,
        current_user: User,
        explicit_retailer_id: uuid.UUID | None = None,
    ) -> RetailerOrderDetail:
        retailer_id = cls.resolve_retailer_id(current_user, explicit_retailer_id)

        order = RetailerOrderRepository.get_order_by_id(db, order_id)
        if not order:
            raise NotFoundError(f"Bulk order {order_id} not found.")

        # Strict Tenant Isolation Check
        if order.retailer_id != retailer_id and (
            not current_user.role or current_user.role.name != "platform_admin"
        ):
            raise ForbiddenError(
                "You do not have access to view this order.",
                code="RETAILER_ACCESS_DENIED",
            )

        households_count = RetailerOrderRepository.get_participating_households_count(
            db, order.cycle_id
        )

        norm_status = order.status.upper()
        item_details: list[RetailerOrderItemDetail] = []

        for item in sorted(order.items, key=lambda i: i.variant.product.title):
            variant = item.variant
            product = variant.product
            category_name = product.category.name if product.category else "General"
            short_packed = max(0, item.requested_qty - item.packed_qty)
            is_unavail = (
                item.packed_qty == 0
                and item.requested_qty > 0
                and norm_status in ("PACKING", "BILLED", "DISPATCHED", "COMPLETED")
            )

            p_records = [
                PackingRecordResponse(
                    id=pr.id,
                    bulk_order_item_id=pr.bulk_order_item_id,
                    batch_id=pr.batch_id,
                    packed_qty=pr.packed_qty,
                    notes=pr.notes,
                    packed_at=pr.packed_at,
                )
                for pr in sorted(item.packing_records, key=lambda r: r.packed_at)
            ]

            item_details.append(
                RetailerOrderItemDetail(
                    id=item.id,
                    variant_id=variant.id,
                    product_id=product.id,
                    product_title=product.title,
                    brand=product.brand,
                    variant_title=variant.title,
                    variant_sku=variant.sku,
                    variant_unit=variant.unit,
                    category_name=category_name,
                    requested_qty=item.requested_qty,
                    packed_qty=item.packed_qty,
                    short_packed_qty=short_packed,
                    is_unavailable=is_unavail,
                    unit_price_paise=item.unit_price_paise,
                    subtotal_paise=item.subtotal_paise,
                    packing_records=p_records,
                )
            )

        retailer_bill_resp = (
            RetailerBillResponse.model_validate(order.retailer_bill)
            if order.retailer_bill
            else None
        )

        cycle_month = order.cycle.cycle_month if order.cycle else "CURRENT"
        comm_name = order.community.name if order.community else "Unknown Community"

        return RetailerOrderDetail(
            id=order.id,
            order_number=order.order_number,
            cycle_id=order.cycle_id,
            cycle_month=cycle_month,
            community_id=order.community_id,
            community_name=comm_name,
            retailer_id=order.retailer_id,
            status=norm_status,
            total_requested_items=order.total_requested_items,
            total_packed_items=order.total_packed_items,
            subtotal_paise=order.subtotal_paise,
            discount_paise=order.discount_paise,
            delivery_fee_paise=order.delivery_fee_paise,
            total_paise=order.total_paise,
            placed_at=order.placed_at,
            locked_at=order.locked_at,
            dispatched_at=order.dispatched_at,
            delivered_at=order.delivered_at,
            participating_households_count=households_count,
            items=item_details,
            retailer_bill=retailer_bill_resp,
        )

    @classmethod
    def accept_order(
        cls,
        db: Session,
        order_id: uuid.UUID,
        current_user: User,
    ) -> AcceptOrderResponse:
        retailer_id = cls.resolve_retailer_id(current_user)
        order = RetailerOrderRepository.get_order_by_id(db, order_id, for_update=True)
        if not order:
            raise NotFoundError(f"Bulk order {order_id} not found.")

        if order.retailer_id != retailer_id and (
            not current_user.role or current_user.role.name != "platform_admin"
        ):
            raise ForbiddenError(
                "You do not have access to accept this order.",
                code="RETAILER_ACCESS_DENIED",
            )

        norm_status = order.status.upper()
        if norm_status != "PENDING":
            raise ConflictError(
                f"Cannot accept order in '{norm_status}' state. Only PENDING orders can be accepted.",
                code="INVALID_ORDER_STATE_TRANSITION",
            )

        order.status = "ACCEPTED"
        order.locked_at = now_utc()

        RetailerOrderRepository.log_audit(
            db=db,
            action="ORDER_ACCEPTED",
            entity_type="BulkOrder",
            entity_id=order.id,
            user_id=current_user.id,
            payload_before={"status": norm_status},
            payload_after={"status": "ACCEPTED", "locked_at": order.locked_at.isoformat()},
        )

        db.commit()
        db.refresh(order)

        return AcceptOrderResponse(
            order_id=order.id,
            status=order.status.upper(),
            message="Order accepted successfully. Ready for packing.",
            locked_at=order.locked_at,
        )

    @classmethod
    def reject_order(
        cls,
        db: Session,
        order_id: uuid.UUID,
        payload: RejectOrderRequest,
        current_user: User,
    ) -> RejectOrderResponse:
        retailer_id = cls.resolve_retailer_id(current_user)
        order = RetailerOrderRepository.get_order_by_id(db, order_id, for_update=True)
        if not order:
            raise NotFoundError(f"Bulk order {order_id} not found.")

        if order.retailer_id != retailer_id and (
            not current_user.role or current_user.role.name != "platform_admin"
        ):
            raise ForbiddenError(
                "You do not have access to reject this order.",
                code="RETAILER_ACCESS_DENIED",
            )

        norm_status = order.status.upper()
        if norm_status != "PENDING":
            raise ConflictError(
                f"Cannot reject order in '{norm_status}' state. Only PENDING orders can be rejected.",
                code="INVALID_ORDER_STATE_TRANSITION",
            )

        order.status = "REJECTED"

        RetailerOrderRepository.log_audit(
            db=db,
            action="ORDER_REJECTED",
            entity_type="BulkOrder",
            entity_id=order.id,
            user_id=current_user.id,
            payload_before={"status": norm_status},
            payload_after={"status": "REJECTED", "reason": payload.reason},
        )

        db.commit()
        db.refresh(order)

        return RejectOrderResponse(
            order_id=order.id,
            status="REJECTED",
            reason=payload.reason,
            message="Order has been rejected.",
        )

    @classmethod
    def update_packing(
        cls,
        db: Session,
        order_id: uuid.UUID,
        payload: UpdatePackingRequest,
        current_user: User,
    ) -> UpdatePackingResponse:
        retailer_id = cls.resolve_retailer_id(current_user)
        order = RetailerOrderRepository.get_order_by_id(db, order_id, for_update=True)
        if not order:
            raise NotFoundError(f"Bulk order {order_id} not found.")

        if order.retailer_id != retailer_id and (
            not current_user.role or current_user.role.name != "platform_admin"
        ):
            raise ForbiddenError(
                "You do not have access to pack this order.",
                code="RETAILER_ACCESS_DENIED",
            )

        norm_status = order.status.upper()
        if norm_status in ("BILLED", "DISPATCHED", "COMPLETED", "REJECTED"):
            raise ConflictError(
                f"Cannot modify packing for order in '{norm_status}' state. Financials are locked.",
                code="ORDER_LOCKED_FOR_PACKING",
            )

        # Transition status to PACKING
        order.status = "PACKING"

        # Map bulk order items by variant_id
        items_by_variant = {item.variant_id: item for item in order.items}

        for update in payload.items:
            if update.variant_id not in items_by_variant:
                raise NotFoundError(
                    f"Product variant {update.variant_id} is not present in bulk order {order_id}."
                )

            bo_item = items_by_variant[update.variant_id]
            target_packed_qty = 0 if update.is_unavailable else update.packed_qty

            # Rule: Packed quantity cannot exceed requested quantity
            if target_packed_qty > bo_item.requested_qty:
                raise ConflictError(
                    f"Packed quantity ({target_packed_qty}) cannot exceed requested quantity ({bo_item.requested_qty}) "
                    f"for variant {bo_item.variant.title}.",
                    code="PACKED_EXCEEDS_REQUESTED",
                )

            before_packed = bo_item.packed_qty

            # Record packing item in history
            RetailerOrderRepository.record_packing(
                db=db,
                bulk_order_item_id=bo_item.id,
                packed_qty=target_packed_qty,
                batch_id=update.batch_id,
                notes=update.notes,
            )

            # Audit packing change
            RetailerOrderRepository.log_audit(
                db=db,
                action="PACKING_ITEM_UPDATE",
                entity_type="BulkOrderItem",
                entity_id=bo_item.id,
                user_id=current_user.id,
                payload_before={"packed_qty": before_packed},
                payload_after={
                    "packed_qty": target_packed_qty,
                    "batch_id": str(update.batch_id) if update.batch_id else None,
                    "notes": update.notes,
                    "is_unavailable": update.is_unavailable,
                },
            )

            bo_item.packed_qty = target_packed_qty
            bo_item.subtotal_paise = target_packed_qty * bo_item.unit_price_paise

        # Recalculate order totals
        order.total_packed_items = sum(it.packed_qty for it in order.items)
        order.subtotal_paise = sum(it.subtotal_paise for it in order.items)
        order.total_paise = (
            order.subtotal_paise + order.delivery_fee_paise - order.discount_paise
        )

        db.commit()
        db.refresh(order)

        # Return updated details
        detail = cls.get_order_detail(db, order_id, current_user)
        return UpdatePackingResponse(
            order_id=order.id,
            status=order.status.upper(),
            total_requested_items=order.total_requested_items,
            total_packed_items=order.total_packed_items,
            items=detail.items,
        )

    @classmethod
    def preview_bill(
        cls,
        db: Session,
        order_id: uuid.UUID,
        current_user: User,
        delivery_fee_paise: int | None = None,
        order_discount_paise: int = 0,
        delivery_allocation_mode: str = "EQUAL",
    ) -> BillingCalculationResult:
        retailer_id = cls.resolve_retailer_id(current_user)
        order = RetailerOrderRepository.get_order_by_id(db, order_id)
        if not order:
            raise NotFoundError(f"Bulk order {order_id} not found.")

        if order.retailer_id != retailer_id and (
            not current_user.role or current_user.role.name != "platform_admin"
        ):
            raise ForbiddenError(
                "You do not have access to preview bill for this order.",
                code="RETAILER_ACCESS_DENIED",
            )

        cart_items = CartRepository.get_all_cycle_cart_items(db, order.cycle_id)
        if not cart_items:
            raise ConflictError(
                "Cannot preview bill: no cart items in this cycle.",
                code="EMPTY_COMMUNITY_CART",
            )

        resident_requests = [
            ResidentItemRequest(
                user_id=ci.user_id,
                variant_id=ci.variant_id,
                requested_qty=ci.quantity,
            )
            for ci in cart_items
        ]

        variant_packs = [
            VariantPackInfo(
                variant_id=it.variant_id,
                packed_qty=it.packed_qty,
                unit_price_paise=it.unit_price_paise,
                discount_paise=0,
            )
            for it in order.items
        ]

        fee = delivery_fee_paise if delivery_fee_paise is not None else order.delivery_fee_paise
        inp = BillingCalculationInput(
            resident_requests=resident_requests,
            variant_packs=variant_packs,
            delivery_fee_paise=fee,
            order_discount_paise=order_discount_paise,
            delivery_allocation_mode=delivery_allocation_mode,
        )

        return F7BillingEngine.calculate(inp)

    @classmethod
    def send_bill(
        cls,
        db: Session,
        order_id: uuid.UUID,
        payload: SendBillRequest,
        current_user: User,
    ) -> SendBillResponse:
        retailer_id = cls.resolve_retailer_id(current_user)
        order = RetailerOrderRepository.get_order_by_id(db, order_id, for_update=True)
        if not order:
            raise NotFoundError(f"Bulk order {order_id} not found.")

        if order.retailer_id != retailer_id and (
            not current_user.role or current_user.role.name != "platform_admin"
        ):
            raise ForbiddenError(
                "You do not have access to bill this order.",
                code="RETAILER_ACCESS_DENIED",
            )

        norm_status = order.status.upper()
        if norm_status in ("BILLED", "DISPATCHED", "COMPLETED"):
            raise ConflictError(
                f"Order is already in '{norm_status}' state. Bill already generated.",
                code="ORDER_ALREADY_BILLED",
            )

        if norm_status not in ("PACKING", "ACCEPTED", "PENDING"):
            raise ConflictError(
                f"Cannot generate bill for order in '{norm_status}' state.",
                code="INVALID_ORDER_STATE_TRANSITION",
            )

        # Call BillingService to run F7 engine and persist RetailerBill & Invoices
        fin_req = FinalizeBillingRequest(
            delivery_fee_paise=payload.delivery_fee_paise,
            order_discount_paise=payload.order_discount_paise,
            delivery_allocation_mode=payload.delivery_allocation_mode,
        )

        result = BillingService.finalize_bulk_order_billing(
            db=db,
            bulk_order_id=order_id,
            payload=fin_req,
            current_user=current_user,
        )

        # Update order status to BILLED
        order.status = "BILLED"

        RetailerOrderRepository.log_audit(
            db=db,
            action="BILL_FINALIZED",
            entity_type="BulkOrder",
            entity_id=order.id,
            user_id=current_user.id,
            payload_after={
                "status": "BILLED",
                "net_amount_paise": result["retailer_bill"].net_amount_paise,
                "invoices_count": len(result["invoices"]),
            },
        )

        db.commit()
        db.refresh(order)

        audit_dict = (
            result["audit_log"].model_dump()
            if hasattr(result.get("audit_log"), "model_dump")
            else (result.get("audit_log") or {})
        )

        return SendBillResponse(
            order_id=order.id,
            status="BILLED",
            retailer_bill=result["retailer_bill"],
            total_invoices_generated=len(result["invoices"]),
            sum_invoices_paise=sum(inv.total_amount_paise for inv in result["invoices"]),
            zero_discrepancy_verified=audit_dict.get("zero_discrepancy_verified", True),
            audit_log=audit_dict,
        )

    @classmethod
    def dispatch_order(
        cls,
        db: Session,
        order_id: uuid.UUID,
        current_user: User,
    ) -> DispatchOrderResponse:
        retailer_id = cls.resolve_retailer_id(current_user)
        order = RetailerOrderRepository.get_order_by_id(db, order_id, for_update=True)
        if not order:
            raise NotFoundError(f"Bulk order {order_id} not found.")

        if order.retailer_id != retailer_id and (
            not current_user.role or current_user.role.name != "platform_admin"
        ):
            raise ForbiddenError(
                "You do not have access to dispatch this order.",
                code="RETAILER_ACCESS_DENIED",
            )

        norm_status = order.status.upper()
        if norm_status != "BILLED":
            raise ConflictError(
                f"Cannot dispatch order in '{norm_status}' state. Order must be BILLED before dispatch.",
                code="ORDER_NOT_BILLED",
            )

        order.status = "DISPATCHED"
        order.dispatched_at = now_utc()

        RetailerOrderRepository.log_audit(
            db=db,
            action="ORDER_DISPATCHED",
            entity_type="BulkOrder",
            entity_id=order.id,
            user_id=current_user.id,
            payload_after={"status": "DISPATCHED", "dispatched_at": order.dispatched_at.isoformat()},
        )

        db.commit()
        db.refresh(order)

        return DispatchOrderResponse(
            order_id=order.id,
            status="DISPATCHED",
            dispatched_at=order.dispatched_at,
            message="Order has been dispatched for delivery.",
        )

    @classmethod
    def get_dashboard_metrics(
        cls,
        db: Session,
        current_user: User,
        explicit_retailer_id: uuid.UUID | None = None,
    ) -> RetailerDashboardMetrics:
        retailer_id = cls.resolve_retailer_id(current_user, explicit_retailer_id)
        metrics = RetailerOrderRepository.get_dashboard_metrics(db, retailer_id)
        return RetailerDashboardMetrics(**metrics)
