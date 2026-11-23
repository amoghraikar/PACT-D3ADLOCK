import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.models.identity import User
from app.modules.billing.engine import F7BillingEngine
from app.repositories.billing_repository import BillingRepository
from app.repositories.cart_repository import CartRepository
from app.schemas.billing import (
    BillingCalculationInput,
    BillingCalculationResult,
    FinalizeBillingRequest,
    InvoiceResponse,
    ResidentItemRequest,
    RetailerBillResponse,
    VariantPackInfo,
)


class BillingService:
    @staticmethod
    def calculate_preview(input_data: BillingCalculationInput) -> BillingCalculationResult:
        """Runs the standalone F7 deterministic billing engine calculation preview."""
        return F7BillingEngine.calculate(input_data)

    @classmethod
    def finalize_bulk_order_billing(
        cls,
        db: Session,
        bulk_order_id: uuid.UUID,
        payload: FinalizeBillingRequest,
        current_user: User,
    ) -> dict[str, Any]:
        """
        Finalizes billing for a bulk order using the F7 deterministic algorithm.
        Creates RetailerBill, Resident Invoices, InvoiceItems, and DiscountAllocations.
        Guarantees zero discrepancy: SUM(Invoices) == RetailerBill.
        """
        # 1. Fetch bulk order with row lock
        bulk_order = BillingRepository.get_bulk_order(db, bulk_order_id, for_update=True)
        if not bulk_order:
            raise NotFoundError(f"Bulk order {bulk_order_id} not found.")

        # RBAC Check: admin, platform_admin, or the assigned retailer
        role_name = current_user.role.name if current_user.role else ""
        if role_name not in ("admin", "platform_admin"):
            if role_name == "retailer":
                ret_id = (
                    current_user.retailer_profile.id
                    if current_user.retailer_profile
                    else getattr(current_user, "retailer_id", None)
                )
                if not ret_id or ret_id != bulk_order.retailer_id:
                    raise ForbiddenError(
                        "You do not have permission to finalize this bulk order.",
                        code="RETAILER_ACCESS_DENIED",
                    )
            else:
                raise ForbiddenError(
                    "Only retailers or community administrators can finalize billing.",
                    code="PERMISSION_DENIED",
                )

        # Idempotency check: if bill already exists, return existing
        existing_bill = BillingRepository.get_retailer_bill_by_order_id(db, bulk_order.id)
        if existing_bill:
            invoices = [
                InvoiceResponse.model_validate(inv) for inv in bulk_order.invoices
            ]
            return {
                "retailer_bill": RetailerBillResponse.model_validate(existing_bill),
                "invoices": invoices,
                "already_finalized": True,
            }

        # 2. Apply packing updates if provided
        variant_discount_map: dict[uuid.UUID, int] = {}
        if payload.packing_updates:
            pack_map = {pu.variant_id: pu for pu in payload.packing_updates}
            for item in bulk_order.items:
                if item.variant_id in pack_map:
                    pu = pack_map[item.variant_id]
                    if pu.packed_qty > item.requested_qty:
                        raise ConflictError(
                            f"Packed quantity ({pu.packed_qty}) cannot exceed requested quantity ({item.requested_qty}) "
                            f"for variant {item.variant_id}.",
                            code="PACKED_EXCEEDS_REQUESTED",
                        )
                    item.packed_qty = pu.packed_qty
                    variant_discount_map[item.variant_id] = pu.discount_paise
        else:
            # Default: If no explicit packing updates provided, set packed_qty = requested_qty
            for item in bulk_order.items:
                if item.packed_qty == 0 and item.requested_qty > 0:
                    item.packed_qty = item.requested_qty

        # 3. Retrieve all raw cart items for this cycle to determine per-household requests
        cart_items = CartRepository.get_all_cycle_cart_items(db, bulk_order.cycle_id)
        if not cart_items:
            raise ConflictError(
                "Cannot finalize billing: no cart items found for this cycle.",
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
                variant_id=item.variant_id,
                packed_qty=item.packed_qty,
                unit_price_paise=item.unit_price_paise,
                discount_paise=variant_discount_map.get(item.variant_id, 0),
            )
            for item in bulk_order.items
        ]

        # Delivery fee: payload override or existing bulk_order delivery fee
        delivery_fee = (
            payload.delivery_fee_paise
            if payload.delivery_fee_paise is not None
            else bulk_order.delivery_fee_paise
        )

        billing_input = BillingCalculationInput(
            resident_requests=resident_requests,
            variant_packs=variant_packs,
            delivery_fee_paise=delivery_fee,
            order_discount_paise=payload.order_discount_paise,
            platform_fee_paise=payload.platform_fee_paise,
            delivery_allocation_mode=payload.delivery_allocation_mode,
        )

        # 4. Execute F7 Deterministic Engine Calculation
        calc_result = F7BillingEngine.calculate(billing_input)

        # 5. Persist RetailerBill
        cycle_month = bulk_order.cycle.cycle_month if bulk_order.cycle else "CURRENT"
        bill_number = f"PACT-RB-{cycle_month}-{uuid.uuid4().hex[:6].upper()}"

        bill = BillingRepository.save_retailer_bill(
            db=db,
            bulk_order_id=bulk_order.id,
            retailer_id=bulk_order.retailer_id,
            community_id=bulk_order.community_id,
            gross_amount_paise=calc_result.retailer_bill.gross_amount_paise,
            discount_amount_paise=calc_result.retailer_bill.discount_amount_paise,
            delivery_amount_paise=calc_result.retailer_bill.delivery_amount_paise,
            net_amount_paise=calc_result.retailer_bill.net_amount_paise,
            bill_number=bill_number,
            finalized_at=now_utc(),
        )

        # 6. Persist Resident Invoices & Item Allocations
        created_invoices: list[InvoiceResponse] = []
        for idx, res_inv in enumerate(calc_result.resident_invoices, start=1):
            inv_number = f"PACT-INV-{cycle_month}-{idx:04d}-{uuid.uuid4().hex[:4].upper()}"
            u_id = uuid.UUID(res_inv.user_id)

            items_data = [
                {
                    "variant_id": uuid.UUID(item.variant_id),
                    "requested_qty": item.requested_qty,
                    "packed_qty": item.packed_qty,
                    "unit_price_paise": item.unit_price_paise,
                    "line_total_paise": item.base_cost_paise,
                }
                for item in res_inv.items
                if item.requested_qty > 0 or item.packed_qty > 0
            ]

            discounts_data = []
            if res_inv.discount_amount_paise > 0:
                discounts_data.append(
                    {
                        "discount_type": "bulk_order",
                        "amount_paise": res_inv.discount_amount_paise,
                        "description": "F7 Fair Bulk Purchase Discount",
                    }
                )

            inv_model = BillingRepository.save_invoice_with_items(
                db=db,
                bulk_order_id=bulk_order.id,
                user_id=u_id,
                community_id=bulk_order.community_id,
                invoice_number=inv_number,
                base_amount_paise=res_inv.base_amount_paise,
                discount_amount_paise=res_inv.discount_amount_paise,
                delivery_fee_paise=res_inv.delivery_fee_paise,
                total_amount_paise=res_inv.total_amount_paise,
                items_data=items_data,
                discounts_data=discounts_data,
            )
            created_invoices.append(InvoiceResponse.model_validate(inv_model))

        # 7. Update BulkOrder Financials & Status
        bulk_order.status = "billed"
        bulk_order.total_packed_items = calc_result.audit_log.total_packed_units
        bulk_order.subtotal_paise = calc_result.retailer_bill.gross_amount_paise
        bulk_order.discount_paise = calc_result.retailer_bill.discount_amount_paise
        bulk_order.delivery_fee_paise = calc_result.retailer_bill.delivery_amount_paise
        bulk_order.total_paise = calc_result.retailer_bill.net_amount_paise

        db.commit()
        db.refresh(bill)

        return {
            "retailer_bill": RetailerBillResponse.model_validate(bill),
            "invoices": created_invoices,
            "audit_log": calc_result.audit_log,
            "already_finalized": False,
        }

    @staticmethod
    def get_user_invoices(
        db: Session, user: User, community_id: uuid.UUID | None = None
    ) -> list[InvoiceResponse]:
        """Fetch all invoices for the current user."""
        invoices = BillingRepository.get_user_invoices(db, user.id, community_id)
        return [InvoiceResponse.model_validate(inv) for inv in invoices]

    @staticmethod
    def get_invoice_detail(
        db: Session, invoice_id: uuid.UUID, user: User
    ) -> InvoiceResponse:
        """Fetch a single invoice ensuring tenant and role authorization."""
        inv = BillingRepository.get_invoice_by_id(db, invoice_id)
        if not inv:
            raise NotFoundError(f"Invoice {invoice_id} not found.")

        # RBAC Check
        role_name = user.role.name if user.role else ""
        if role_name == "customer" and inv.user_id != user.id:
            raise ForbiddenError(
                "You do not have access to view this invoice.",
                code="COMMUNITY_ACCESS_DENIED",
            )
        return InvoiceResponse.model_validate(inv)

    @staticmethod
    def get_retailer_bill_detail(
        db: Session, bill_id: uuid.UUID, user: User
    ) -> RetailerBillResponse:
        """Fetch a retailer bill ensuring role authorization."""
        bill = BillingRepository.get_retailer_bill_by_id(db, bill_id)
        if not bill:
            raise NotFoundError(f"Retailer bill {bill_id} not found.")

        role_name = user.role.name if user.role else ""
        if role_name not in ("admin", "platform_admin"):
            if role_name == "retailer":
                ret_id = (
                    user.retailer_profile.id
                    if user.retailer_profile
                    else getattr(user, "retailer_id", None)
                )
                if not ret_id or ret_id != bill.retailer_id:
                    raise ForbiddenError(
                        "You do not have permission to view this retailer bill.",
                        code="RETAILER_ACCESS_DENIED",
                    )
            else:
                raise ForbiddenError(
                    "Only authorized personnel can view retailer bills.",
                    code="PERMISSION_DENIED",
                )
        return RetailerBillResponse.model_validate(bill)

    @staticmethod
    def get_bill_by_order_id(
        db: Session, order_id: uuid.UUID, user: User
    ) -> RetailerBillResponse:
        """Fetch a retailer bill by bulk order ID."""
        bill = BillingRepository.get_retailer_bill_by_order_id(db, order_id)
        if not bill:
            raise NotFoundError(f"No retailer bill found for bulk order {order_id}.")

        role_name = user.role.name if user.role else ""
        if role_name not in ("admin", "platform_admin"):
            if role_name == "retailer":
                ret_id = (
                    user.retailer_profile.id
                    if user.retailer_profile
                    else getattr(user, "retailer_id", None)
                )
                if not ret_id or ret_id != bill.retailer_id:
                    raise ForbiddenError(
                        "You do not have permission to view this retailer bill.",
                        code="RETAILER_ACCESS_DENIED",
                    )
            else:
                raise ForbiddenError(
                    "Only authorized personnel can view retailer bills.",
                    code="PERMISSION_DENIED",
                )
        return RetailerBillResponse.model_validate(bill)
