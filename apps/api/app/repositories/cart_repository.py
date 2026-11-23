import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.clock import now_utc
from app.models.catalogue import Product, ProductVariant
from app.models.commerce import CartItemHistory, CommunityCartItem


class CartRepository:
    @staticmethod
    def get_user_cart_items(
        db: Session, cycle_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[CommunityCartItem]:
        """
        Retrieve personal cart items for a resident with variants, products, and images.
        """
        stmt = (
            select(CommunityCartItem)
            .options(
                joinedload(CommunityCartItem.variant)
                .joinedload(ProductVariant.product)
                .selectinload(Product.images),
            )
            .where(
                CommunityCartItem.cycle_id == cycle_id,
                CommunityCartItem.user_id == user_id,
            )
            .order_by(CommunityCartItem.created_at.asc())
        )
        return db.scalars(stmt).all()

    @staticmethod
    def get_community_variant_aggregates(
        db: Session, cycle_id: uuid.UUID, variant_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, int]:
        """
        Returns a dictionary mapping variant_id to total community demand quantity.
        Anonymized: contains only aggregate numbers without user identities.
        """
        if not variant_ids:
            return {}

        stmt = (
            select(
                CommunityCartItem.variant_id,
                func.sum(CommunityCartItem.quantity).label("total_qty"),
            )
            .where(
                CommunityCartItem.cycle_id == cycle_id,
                CommunityCartItem.variant_id.in_(variant_ids),
            )
            .group_by(CommunityCartItem.variant_id)
        )
        return dict(db.execute(stmt).all())

    @staticmethod
    def get_all_cycle_cart_items(db: Session, cycle_id: uuid.UUID) -> list[CommunityCartItem]:
        """
        Returns all cart items in the community cycle for consolidation.
        """
        stmt = (
            select(CommunityCartItem)
            .options(joinedload(CommunityCartItem.variant))
            .where(CommunityCartItem.cycle_id == cycle_id)
        )
        return db.scalars(stmt).all()

    @staticmethod
    def upsert_cart_item(
        db: Session,
        cycle_id: uuid.UUID,
        community_id: uuid.UUID,
        user_id: uuid.UUID,
        variant_id: uuid.UUID,
        quantity: int,
        notes: str | None = None,
    ) -> tuple[CommunityCartItem | None, str]:
        """
        Thread-safe atomic upsert with PostgreSQL ON CONFLICT handling.
        If quantity <= 0, removes the item.
        Maintains CartItemHistory audit log.
        """
        if quantity <= 0:
            stmt = select(CommunityCartItem).where(
                CommunityCartItem.cycle_id == cycle_id,
                CommunityCartItem.user_id == user_id,
                CommunityCartItem.variant_id == variant_id,
            )
            existing = db.scalars(stmt).first()
            if existing:
                history = CartItemHistory(
                    cart_item_id=existing.id,
                    user_id=user_id,
                    cycle_id=cycle_id,
                    variant_id=variant_id,
                    previous_qty=existing.quantity,
                    new_qty=0,
                    action="removed",
                    changed_at=now_utc(),
                )
                db.add(history)
                db.delete(existing)
                db.commit()
                return None, "removed"
            return None, "noop"

        from sqlalchemy.dialects.postgresql import insert as pg_insert

        # Atomic PostgreSQL UPSERT to prevent race conditions on concurrent insertions
        upsert_stmt = (
            pg_insert(CommunityCartItem)
            .values(
                id=uuid.uuid4(),
                cycle_id=cycle_id,
                community_id=community_id,
                user_id=user_id,
                variant_id=variant_id,
                quantity=quantity,
                notes=notes,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            .on_conflict_do_update(
                index_elements=["cycle_id", "user_id", "variant_id"],
                set_={"quantity": quantity, "notes": notes, "updated_at": now_utc()},
            )
            .returning(CommunityCartItem.id)
        )
        res = db.execute(upsert_stmt)
        item_id = res.scalar_one()

        # Audit History
        history = CartItemHistory(
            cart_item_id=item_id,
            user_id=user_id,
            cycle_id=cycle_id,
            variant_id=variant_id,
            previous_qty=0,
            new_qty=quantity,
            action="updated",
            changed_at=now_utc(),
        )
        db.add(history)
        db.commit()

        item = db.get(CommunityCartItem, item_id)
        return item, "updated"

    @staticmethod
    def delete_cart_item(
        db: Session,
        cycle_id: uuid.UUID,
        user_id: uuid.UUID,
        variant_id: uuid.UUID,
    ) -> bool:
        stmt = (
            select(CommunityCartItem)
            .where(
                CommunityCartItem.cycle_id == cycle_id,
                CommunityCartItem.user_id == user_id,
                CommunityCartItem.variant_id == variant_id,
            )
            .with_for_update()
        )
        item = db.scalars(stmt).first()
        if not item:
            return False

        history = CartItemHistory(
            cart_item_id=item.id,
            user_id=user_id,
            cycle_id=cycle_id,
            variant_id=variant_id,
            previous_qty=item.quantity,
            new_qty=0,
            action="removed",
            changed_at=now_utc(),
        )
        db.add(history)
        db.delete(item)
        db.commit()
        return True
