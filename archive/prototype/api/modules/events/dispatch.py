from typing import Any
from app.modules.notifications.handlers import (
    on_order_submitted,
    on_order_rejected,
    on_invoice_created,
    on_payment_succeeded,
    on_payment_failed,
    on_inventory_low_stock,
)


def dispatch_event(event_envelope: dict[str, Any]):
    """
    Delivers event envelope to domain handlers.
    """
    event_type = event_envelope.get("type")
    payload = event_envelope.get("payload", {})
    agg_id = event_envelope.get("aggregate_id")

    if event_type == "order.submitted":
        on_order_submitted(
            order_id=payload.get("order_id", agg_id),
            community_name=payload.get("community_name", "Green Meadows"),
            retailer_user_id=payload.get("retailer_user_id", ""),
            resident_user_ids=payload.get("resident_user_ids", []),
        )
    elif event_type == "order.rejected":
        on_order_rejected(
            order_id=payload.get("order_id", agg_id),
            resident_user_ids=payload.get("resident_user_ids", []),
            admin_user_ids=payload.get("admin_user_ids", []),
        )
    elif event_type == "invoice.created":
        on_invoice_created(
            order_id=payload.get("order_id", ""),
            invoice_id=payload.get("invoice_id", agg_id),
            customer_id=payload.get("customer_id", ""),
            total_paise=payload.get("total_paise", 0),
        )
    elif event_type == "payment.succeeded":
        on_payment_succeeded(
            invoice_id=payload.get("invoice_id", agg_id),
            customer_id=payload.get("customer_id", ""),
            payment_id=payload.get("payment_id", ""),
        )
    elif event_type == "payment.failed":
        on_payment_failed(
            invoice_id=payload.get("invoice_id", agg_id),
            customer_id=payload.get("customer_id", ""),
            reason=payload.get("reason", "Payment failed"),
        )
    elif event_type == "inventory.low_stock":
        on_inventory_low_stock(
            retailer_user_id=payload.get("retailer_user_id", ""),
            product_name=payload.get("product_name", "Item"),
            remaining_stock=payload.get("remaining_stock", 0),
        )
