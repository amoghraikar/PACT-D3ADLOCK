from app.modules.notifications.service import create_notification


def on_order_submitted(
    order_id: str,
    community_name: str,
    retailer_user_id: str,
    resident_user_ids: list[str],
):
    """
    F9 triggers on order.submitted:
    - order_received to store owner
    - order_submitted to each contributing resident
    """
    create_notification(
        recipient_id=retailer_user_id,
        notification_type="order_received",
        title="New Community Order",
        message=f"A new community order has arrived from {community_name}.",
        data={"order_id": order_id, "link": f"/retailer/orders"},
        event_type="order.submitted",
        event_id=order_id,
    )

    for rid in resident_user_ids:
        create_notification(
            recipient_id=rid,
            notification_type="order_submitted",
            title="Order Sent to Store",
            message="This month's order from your building has been sent to the store.",
            data={"order_id": order_id, "link": "/customer"},
            event_type="order.submitted",
            event_id=order_id,
        )


def on_order_rejected(
    order_id: str,
    resident_user_ids: list[str],
    admin_user_ids: list[str],
):
    """
    F9 trigger on order.rejected:
    - order_rejected to contributing residents and admins
    """
    recipients = set(resident_user_ids + admin_user_ids)
    for uid in recipients:
        create_notification(
            recipient_id=uid,
            notification_type="order_rejected",
            title="Order Could Not Be Taken",
            message="The store could not take this month's order. You have not been charged.",
            data={"order_id": order_id, "link": "/customer"},
            event_type="order.rejected",
            event_id=order_id,
        )


def on_invoice_created(
    order_id: str,
    invoice_id: str,
    customer_id: str,
    total_paise: int,
):
    """
    F9 trigger on invoice.created:
    - bill_ready to that resident:
      "Your grocery order has been packed. Your final bill is ready. Please review your invoice and complete payment."
    """
    create_notification(
        recipient_id=customer_id,
        notification_type="bill_ready",
        title="Final Bill Ready",
        message="Your grocery order has been packed. Your final bill is ready. Please review your invoice and complete payment.",
        data={
            "order_id": order_id,
            "invoice_id": invoice_id,
            "total_paise": total_paise,
            "link": f"/customer/bill?invoice_id={invoice_id}",
        },
        event_type="invoice.created",
        event_id=invoice_id,
    )


def on_payment_succeeded(
    invoice_id: str,
    customer_id: str,
    payment_id: str,
):
    """
    F9 trigger on payment.succeeded:
    - payment_succeeded to that resident
    """
    create_notification(
        recipient_id=customer_id,
        notification_type="payment_succeeded",
        title="Payment Received",
        message="Payment received. Thank you. Your order will be delivered by your building's coordinator.",
        data={"invoice_id": invoice_id, "payment_id": payment_id, "link": "/customer/bill"},
        event_type="payment.succeeded",
        event_id=payment_id,
    )


def on_payment_failed(
    invoice_id: str,
    customer_id: str,
    payment_id: str,
):
    """
    F9 trigger on payment.failed:
    - payment_failed to that resident
    """
    create_notification(
        recipient_id=customer_id,
        notification_type="payment_failed",
        title="Payment Failed",
        message="Your payment did not go through. You have not been charged. Please try again.",
        data={"invoice_id": invoice_id, "payment_id": payment_id, "link": "/customer/bill"},
        event_type="payment.failed",
        event_id=payment_id,
    )


def on_low_stock(
    retailer_user_id: str,
    product_name: str,
    variant_label: str,
    remaining_qty: int,
    listing_id: str,
):
    """
    F9 trigger on inventory.low_stock:
    - low_stock to store owner: "{product} {variant} is running low: {n} left."
    """
    create_notification(
        recipient_id=retailer_user_id,
        notification_type="low_stock",
        title="Low Stock Alert",
        message=f"{product_name} {variant_label} is running low: {remaining_qty} left.",
        data={"product": product_name, "variant": variant_label, "remaining": remaining_qty},
        event_type="inventory.low_stock",
        event_id=f"{listing_id}-{remaining_qty}",
    )
