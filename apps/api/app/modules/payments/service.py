import hashlib
import json
import logging
import uuid
from datetime import timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.clock import now_utc
from app.core.config import settings
from app.core.errors import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.models.billing import Invoice, PaymentRecord, Refund
from app.models.identity import User
from app.models.system import AuditLog, IdempotencyRecord
from app.modules.events.outbox import PAYMENT_RECEIVED, REFUND_PROCESSED, OutboxService
from app.modules.payments.gateway import get_payment_gateway
from app.schemas.payment import (
    PaymentHistoryItem,
    PaymentOrderResponse,
    PaymentVerificationResponse,
    RefundRequest,
    RefundResponse,
    VerifyPaymentRequest,
)

logger = logging.getLogger("pact.payments.service")


class PaymentService:
    @staticmethod
    def create_order(
        db: Session,
        user: User,
        invoice_id: uuid.UUID,
    ) -> PaymentOrderResponse:
        """
        Creates a payment gateway order for a resident's unpaid or partially-paid invoice.
        Enforces tenant isolation and prevents creating orders for already paid invoices.
        """
        invoice = db.get(Invoice, invoice_id)
        if not invoice:
            raise NotFoundError(f"Invoice {invoice_id} not found.")

        # Access check: Resident can only pay their own invoice (platform admin can pay any)
        user_role = user.role.name if user.role else ""
        if user_role != "platform_admin" and invoice.user_id != user.id:
            raise ForbiddenError("Access denied: You can only pay your own invoices.")

        if invoice.status == "paid":
            raise ConflictError(
                "This invoice has already been paid in full.",
                code="INVOICE_ALREADY_PAID",
            )

        amount_due_paise = max(0, invoice.total_amount_paise - invoice.paid_amount_paise)
        if amount_due_paise == 0:
            raise ConflictError("No outstanding balance due for this invoice.")

        gateway = get_payment_gateway()
        order_data = gateway.create_order(
            amount_paise=amount_due_paise,
            receipt=invoice.invoice_number,
            notes={
                "invoice_id": str(invoice.id),
                "user_id": str(user.id),
                "community_id": str(invoice.community_id),
            },
        )

        gateway_order_id = order_data["id"]

        # Record initiated payment in database
        payment_record = PaymentRecord(
            invoice_id=invoice.id,
            user_id=user.id,
            amount_paise=amount_due_paise,
            gateway=settings.PAYMENT_GATEWAY,
            gateway_order_id=gateway_order_id,
            status="initiated",
            recorded_at=now_utc(),
        )
        db.add(payment_record)

        # Audit log
        audit = AuditLog(
            user_id=user.id,
            action="PAYMENT_ORDER_CREATED",
            entity_type="PaymentRecord",
            entity_id=str(payment_record.id),
            payload_after=json.dumps({
                "invoice_id": str(invoice.id),
                "amount_paise": amount_due_paise,
                "gateway_order_id": gateway_order_id,
            }),
            created_at=now_utc(),
        )
        db.add(audit)
        db.commit()

        return PaymentOrderResponse(
            order_id=gateway_order_id,
            invoice_id=invoice.id,
            amount_paise=amount_due_paise,
            currency="INR",
            key_id=getattr(gateway, "key_id", settings.RAZORPAY_KEY_ID),
            customer_phone=user.phone,
            customer_name=user.full_name or "Resident",
        )

    @staticmethod
    def verify_payment(
        db: Session,
        user: User,
        payload: VerifyPaymentRequest,
    ) -> PaymentVerificationResponse:
        """
        Verifies Razorpay HMAC-SHA256 signature and settles the resident invoice.
        Enforces:
        - Strict cryptographic signature verification.
        - Idempotency and duplicate prevention.
        - Concurrent payment safety with row locking.
        - Transactional outbox event generation.
        """
        gateway = get_payment_gateway()

        # 1. Cryptographic HMAC-SHA256 Signature Verification
        is_valid = gateway.verify_signature(
            order_id=payload.gateway_order_id,
            payment_id=payload.gateway_payment_id,
            signature=payload.gateway_signature,
        )
        if not is_valid:
            audit = AuditLog(
                user_id=user.id,
                action="PAYMENT_SIGNATURE_INVALID",
                entity_type="Invoice",
                entity_id=str(payload.invoice_id),
                payload_after=json.dumps({
                    "gateway_order_id": payload.gateway_order_id,
                    "gateway_payment_id": payload.gateway_payment_id,
                }),
                created_at=now_utc(),
            )
            db.add(audit)
            db.commit()
            raise BadRequestError(
                "Invalid payment signature.",
                code="INVALID_PAYMENT_SIGNATURE",
            )

        # 2. Row-level locking on Invoice to prevent concurrent double-settlement
        stmt = select(Invoice).where(Invoice.id == payload.invoice_id).with_for_update()
        invoice = db.scalars(stmt).first()
        if not invoice:
            raise NotFoundError(f"Invoice {payload.invoice_id} not found.")

        # 3. Check if this exact transaction was already processed (Idempotency)
        existing_tx = db.scalars(
            select(PaymentRecord).where(
                PaymentRecord.transaction_id == payload.gateway_payment_id
            )
        ).first()

        if existing_tx and existing_tx.status == "successful":
            logger.info("Payment %s already settled. Returning idempotent success.", payload.gateway_payment_id)
            return PaymentVerificationResponse(
                payment_record_id=existing_tx.id,
                invoice_id=invoice.id,
                amount_paise=existing_tx.amount_paise,
                status="successful",
                transaction_id=existing_tx.transaction_id,
                is_duplicate=True,
                invoice_status=invoice.status,
                recorded_at=existing_tx.recorded_at,
            )

        # 4. Check for duplicate payment on an already-paid invoice
        if invoice.status == "paid":
            # Another payment arrived for an already settled invoice -> mark needs_refund and issue refund
            duplicate_record = PaymentRecord(
                invoice_id=invoice.id,
                user_id=user.id,
                amount_paise=invoice.total_amount_paise,
                gateway=settings.PAYMENT_GATEWAY,
                transaction_id=payload.gateway_payment_id,
                gateway_order_id=payload.gateway_order_id,
                status="successful",
                recorded_at=now_utc(),
            )
            db.add(duplicate_record)
            db.flush()

            # Record refund
            refund = Refund(
                payment_record_id=duplicate_record.id,
                invoice_id=invoice.id,
                amount_paise=duplicate_record.amount_paise,
                reason="Duplicate payment received for settled invoice",
                status="completed",
                initiated_at=now_utc(),
                completed_at=now_utc(),
            )
            db.add(refund)
            invoice.status = "needs_refund"

            OutboxService.record_event(
                db=db,
                event_type=REFUND_PROCESSED,
                topic="pact.payments",
                payload={
                    "refund_id": str(refund.id),
                    "invoice_id": str(invoice.id),
                    "amount_paise": refund.amount_paise,
                    "reason": refund.reason,
                },
            )

            db.commit()
            return PaymentVerificationResponse(
                payment_record_id=duplicate_record.id,
                invoice_id=invoice.id,
                amount_paise=duplicate_record.amount_paise,
                status="needs_refund",
                transaction_id=payload.gateway_payment_id,
                is_duplicate=True,
                invoice_status="needs_refund",
                recorded_at=duplicate_record.recorded_at,
            )

        # 5. Normal Settlement Flow
        # Find or create payment record
        pay_rec = db.scalars(
            select(PaymentRecord).where(
                PaymentRecord.gateway_order_id == payload.gateway_order_id,
                PaymentRecord.invoice_id == invoice.id,
            )
        ).first()

        amount_to_credit = max(0, invoice.total_amount_paise - invoice.paid_amount_paise)

        if not pay_rec:
            pay_rec = PaymentRecord(
                invoice_id=invoice.id,
                user_id=user.id,
                amount_paise=amount_to_credit,
                gateway=settings.PAYMENT_GATEWAY,
                gateway_order_id=payload.gateway_order_id,
                transaction_id=payload.gateway_payment_id,
                status="successful",
                recorded_at=now_utc(),
            )
            db.add(pay_rec)
        else:
            pay_rec.transaction_id = payload.gateway_payment_id
            pay_rec.status = "successful"
            amount_to_credit = pay_rec.amount_paise

        invoice.paid_amount_paise += amount_to_credit
        invoice.status = "paid"
        invoice.paid_at = now_utc()

        # 6. Transactional Outbox Event: PAYMENT_RECEIVED
        OutboxService.record_event(
            db=db,
            event_type=PAYMENT_RECEIVED,
            topic="pact.payments",
            payload={
                "payment_record_id": str(pay_rec.id),
                "invoice_id": str(invoice.id),
                "user_id": str(user.id),
                "community_id": str(invoice.community_id),
                "amount_paise": amount_to_credit,
                "transaction_id": payload.gateway_payment_id,
                "paid_at": invoice.paid_at.isoformat(),
            },
        )

        # Audit Log
        audit = AuditLog(
            user_id=user.id,
            action="PAYMENT_RECEIVED",
            entity_type="Invoice",
            entity_id=str(invoice.id),
            payload_after=json.dumps({
                "paid_amount_paise": invoice.paid_amount_paise,
                "transaction_id": payload.gateway_payment_id,
            }),
            created_at=now_utc(),
        )
        db.add(audit)
        db.commit()
        db.refresh(pay_rec)

        return PaymentVerificationResponse(
            payment_record_id=pay_rec.id,
            invoice_id=invoice.id,
            amount_paise=amount_to_credit,
            status="successful",
            transaction_id=pay_rec.transaction_id,
            is_duplicate=False,
            invoice_status=invoice.status,
            recorded_at=pay_rec.recorded_at,
        )

    @staticmethod
    def process_webhook(
        db: Session,
        raw_body: bytes,
        signature: str,
    ) -> dict[str, Any]:
        """
        Processes Razorpay server-to-server webhook events with HMAC-SHA256 signature check.
        Guarantees idempotency via IdempotencyRecord and handles payment.captured and payment.failed.
        """
        gateway = get_payment_gateway()

        # 1. Webhook Signature Check
        is_valid = gateway.verify_webhook_signature(raw_body, signature)
        if not is_valid:
            logger.warning("Rejected Razorpay webhook with invalid signature.")
            raise BadRequestError(
                "Invalid webhook signature.",
                code="INVALID_WEBHOOK_SIGNATURE",
            )

        payload = json.loads(raw_body.decode("utf-8"))
        event_name = payload.get("event", "")
        event_id = payload.get("id") or hashlib.sha256(raw_body).hexdigest()

        # 2. Idempotency Check
        existing_idemp = db.scalars(
            select(IdempotencyRecord).where(
                IdempotencyRecord.idempotency_key == f"webhook_{event_id}"
            )
        ).first()

        if existing_idemp:
            logger.info("Webhook %s already processed. Returning cached response.", event_id)
            return json.loads(existing_idemp.response_body)

        response_result: dict[str, Any] = {"status": "ignored", "event": event_name}

        # 3. Handle Supported Webhook Events
        if event_name in ("payment.captured", "order.paid"):
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            pay_id = payment_entity.get("id")
            notes = payment_entity.get("notes", {})
            invoice_id_str = notes.get("invoice_id")

            if invoice_id_str:
                invoice = db.get(Invoice, uuid.UUID(invoice_id_str))
                if invoice and invoice.status != "paid":
                    invoice.paid_amount_paise = invoice.total_amount_paise
                    invoice.status = "paid"
                    invoice.paid_at = now_utc()

                    pay_rec = db.scalars(
                        select(PaymentRecord).where(
                            PaymentRecord.invoice_id == invoice.id,
                            PaymentRecord.gateway_order_id == order_id,
                        )
                    ).first()

                    if not pay_rec:
                        pay_rec = PaymentRecord(
                            invoice_id=invoice.id,
                            user_id=invoice.user_id,
                            amount_paise=invoice.total_amount_paise,
                            gateway="razorpay",
                            gateway_order_id=order_id,
                            transaction_id=pay_id,
                            status="successful",
                            recorded_at=now_utc(),
                        )
                        db.add(pay_rec)
                    else:
                        pay_rec.status = "successful"
                        pay_rec.transaction_id = pay_id

                    OutboxService.record_event(
                        db=db,
                        event_type=PAYMENT_RECEIVED,
                        topic="pact.payments",
                        payload={
                            "payment_record_id": str(pay_rec.id),
                            "invoice_id": str(invoice.id),
                            "amount_paise": invoice.total_amount_paise,
                            "transaction_id": pay_id,
                        },
                    )
                    response_result = {"status": "processed", "invoice_id": str(invoice.id)}

        elif event_name == "payment.failed":
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            pay_id = payment_entity.get("id")
            pay_rec = db.scalars(
                select(PaymentRecord).where(PaymentRecord.gateway_order_id == order_id)
            ).first()
            if pay_rec:
                pay_rec.status = "failed"
                pay_rec.transaction_id = pay_id
            response_result = {"status": "payment_failed_recorded"}

        # 4. Save Idempotency Record
        idemp_record = IdempotencyRecord(
            idempotency_key=f"webhook_{event_id}",
            request_path="/api/v1/payments/webhook",
            request_params_hash=hashlib.sha256(raw_body).hexdigest(),
            response_code=200,
            response_body=json.dumps(response_result),
            created_at=now_utc(),
            expires_at=now_utc() + timedelta(days=7),
        )
        db.add(idemp_record)
        db.commit()

        return response_result

    @staticmethod
    def create_refund(
        db: Session,
        user: User,
        payload: RefundRequest,
    ) -> RefundResponse:
        """Issues a refund for a previously captured invoice payment."""
        invoice = db.get(Invoice, payload.invoice_id)
        if not invoice:
            raise NotFoundError(f"Invoice {payload.invoice_id} not found.")

        # Find successful payment record
        pay_rec = db.scalars(
            select(PaymentRecord).where(
                PaymentRecord.invoice_id == invoice.id,
                PaymentRecord.status == "successful",
            )
        ).first()

        if not pay_rec:
            raise BadRequestError("No successful payment record found to refund.")

        gateway = get_payment_gateway()
        gw_refund = gateway.create_refund(
            payment_id=pay_rec.transaction_id or "pay_mock",
            amount_paise=payload.amount_paise,
            reason=payload.reason,
        )

        refund = Refund(
            payment_record_id=pay_rec.id,
            invoice_id=invoice.id,
            amount_paise=payload.amount_paise,
            reason=payload.reason,
            status="completed",
            initiated_at=now_utc(),
            completed_at=now_utc(),
        )
        db.add(refund)
        invoice.status = "needs_refund"

        OutboxService.record_event(
            db=db,
            event_type=REFUND_PROCESSED,
            topic="pact.payments",
            payload={
                "refund_id": str(refund.id),
                "gateway_refund_id": gw_refund.get("id"),
                "invoice_id": str(invoice.id),
                "amount_paise": payload.amount_paise,
            },
        )

        audit = AuditLog(
            user_id=user.id,
            action="REFUND_ISSUED",
            entity_type="Refund",
            entity_id=str(refund.id),
            payload_after=json.dumps({
                "invoice_id": str(invoice.id),
                "amount_paise": payload.amount_paise,
            }),
            created_at=now_utc(),
        )
        db.add(audit)
        db.commit()
        db.refresh(refund)

        return RefundResponse(
            refund_id=refund.id,
            payment_record_id=refund.payment_record_id,
            amount_paise=refund.amount_paise,
            status=refund.status,
            reason=refund.reason,
            initiated_at=refund.initiated_at,
            completed_at=refund.completed_at,
        )

    @staticmethod
    def get_history(
        db: Session,
        user: User,
        invoice_id: uuid.UUID,
    ) -> list[PaymentHistoryItem]:
        """Returns the full audit trail of payments and refunds for an invoice."""
        invoice = db.get(Invoice, invoice_id)
        if not invoice:
            raise NotFoundError(f"Invoice {invoice_id} not found.")

        user_role = user.role.name if user.role else ""
        if user_role not in ("admin", "platform_admin") and invoice.user_id != user.id:
            raise ForbiddenError("Access denied.")

        records = list(
            db.scalars(
                select(PaymentRecord)
                .where(PaymentRecord.invoice_id == invoice.id)
                .order_by(PaymentRecord.recorded_at.desc())
            ).all()
        )

        history: list[PaymentHistoryItem] = []
        for r in records:
            refunds = [
                RefundResponse(
                    refund_id=ref.id,
                    payment_record_id=ref.payment_record_id,
                    amount_paise=ref.amount_paise,
                    status=ref.status,
                    reason=ref.reason,
                    initiated_at=ref.initiated_at,
                    completed_at=ref.completed_at,
                )
                for ref in r.refunds
            ]
            history.append(
                PaymentHistoryItem(
                    payment_record_id=r.id,
                    amount_paise=r.amount_paise,
                    status=r.status,
                    gateway=r.gateway,
                    transaction_id=r.transaction_id,
                    gateway_order_id=r.gateway_order_id,
                    recorded_at=r.recorded_at,
                    refunds=refunds,
                )
            )
        return history
