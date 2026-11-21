from fastapi import APIRouter, Header, Request
from app.modules.payments.service import handle_webhook_event

router = APIRouter(tags=["payment-webhooks"])


@router.post("/api/v1/webhooks/payments/{gateway}")
@router.post("/webhooks/payments/{gateway}")
async def handle_payment_webhook(gateway: str, request: Request):
    """
    F8 Step 3: Webhook endpoint for payment gateways (Mock and Razorpay).
    Unauthenticated, verified solely by cryptographic signature over raw body.
    """
    raw_body = await request.body()
    headers = dict(request.headers)
    result = handle_webhook_event(raw_body, headers, gateway)
    return result
