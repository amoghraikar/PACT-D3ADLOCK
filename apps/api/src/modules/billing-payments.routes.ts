import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  calculateF7Billing,
  INVOICE_STATUSES,
  OUTBOX_EVENTS,
  ROLES,
  type InvoiceDTO,
  type PaymentHistoryItemDTO,
  type PaymentOrderResponseDTO,
  type RetailerBillDTO,
} from "@pact/shared";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { requireUser } from "../lib/auth.js";
import { nowUtc } from "../lib/clock.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { recordAuditLog, recordOutboxEvent } from "../lib/outbox.js";

const calcPreviewSchema = z.object({
  resident_requests: z.array(
    z.object({
      user_id: z.string(),
      variant_id: z.string(),
      requested_qty: z.number().int().min(0),
    })
  ),
  variant_packs: z.array(
    z.object({
      variant_id: z.string(),
      packed_qty: z.number().int().min(0),
      unit_price_paise: z.number().int().min(0),
      discount_paise: z.number().int().min(0).optional(),
    })
  ),
  delivery_fee_paise: z.number().int().min(0).optional(),
  order_discount_paise: z.number().int().min(0).optional(),
  platform_fee_paise: z.number().int().min(0).optional(),
  delivery_allocation_mode: z.enum(["EQUAL", "PRO_RATA"]).optional(),
});

const createPaymentOrderSchema = z.object({
  invoice_id: z.string().uuid(),
});

const verifyPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  gateway_order_id: z.string().min(3),
  payment_id: z.string().min(3),
  signature: z.string().optional(),
});

const refundSchema = z.object({
  invoice_id: z.string().uuid(),
  amount_paise: z.number().int().positive().optional(),
  reason: z.string().trim().min(3).max(255),
});

function formatInvoice(inv: {
  id: string;
  bulkOrderId: string;
  userId: string;
  communityId: string;
  invoiceNumber: string;
  baseAmountPaise: number;
  discountAmountPaise: number;
  deliveryFeePaise: number;
  totalAmountPaise: number;
  paidAmountPaise: number;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  community: { name: string };
  bulkOrder: { cycle: { cycleMonth: string } };
  items: {
    id: string;
    variantId: string;
    requestedQty: number;
    packedQty: number;
    unitPricePaise: number;
    lineTotalPaise: number;
    variant: { title: string; unit: string; product: { title: string } };
  }[];
  discounts: { id: string; discountType: string; amountPaise: number; description: string | null }[];
}): InvoiceDTO {
  return {
    id: inv.id,
    bulk_order_id: inv.bulkOrderId,
    user_id: inv.userId,
    community_id: inv.communityId,
    community_name: inv.community.name,
    cycle_month: inv.bulkOrder.cycle.cycleMonth,
    invoice_number: inv.invoiceNumber,
    base_amount_paise: inv.baseAmountPaise,
    discount_amount_paise: inv.discountAmountPaise,
    delivery_fee_paise: inv.deliveryFeePaise,
    total_amount_paise: inv.totalAmountPaise,
    paid_amount_paise: inv.paidAmountPaise,
    status: inv.status as InvoiceDTO["status"],
    created_at: inv.createdAt.toISOString(),
    paid_at: inv.paidAt?.toISOString() ?? null,
    items: inv.items.map((it) => ({
      id: it.id,
      variant_id: it.variantId,
      product_title: it.variant.product.title,
      variant_title: it.variant.title,
      variant_unit: it.variant.unit,
      requested_qty: it.requestedQty,
      packed_qty: it.packedQty,
      unit_price_paise: it.unitPricePaise,
      line_total_paise: it.lineTotalPaise,
    })),
    discounts: inv.discounts.map((d) => ({
      id: d.id,
      discount_type: d.discountType,
      amount_paise: d.amountPaise,
      description: d.description,
    })),
  };
}

export async function billingRoutes(app: FastifyInstance) {
  app.post<{ Body: z.infer<typeof calcPreviewSchema> }>("/calculate", async (req) => {
    await requireUser(req);
    const body = calcPreviewSchema.parse(req.body);
    return calculateF7Billing(body);
  });

  app.get<{ Querystring: { community_id?: string }; Reply: InvoiceDTO[] }>("/invoices/me", async (req) => {
    const user = await requireUser(req);
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: user.id,
        ...(req.query.community_id ? { communityId: req.query.community_id } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        community: true,
        bulkOrder: { include: { cycle: true } },
        items: { include: { variant: { include: { product: true } } } },
        discounts: true,
      },
    });
    return invoices.map(formatInvoice);
  });

  app.get<{ Params: { invoiceId: string }; Reply: InvoiceDTO }>("/invoices/:invoiceId", async (req) => {
    const user = await requireUser(req);
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.invoiceId },
      include: {
        community: true,
        bulkOrder: { include: { cycle: true } },
        items: { include: { variant: { include: { product: true } } } },
        discounts: true,
      },
    });
    if (!inv) throw new NotFoundError("Invoice not found.");

    const isOwner = inv.userId === user.id;
    const isAdmin =
      user.role === ROLES.PLATFORM_ADMIN ||
      (user.role === ROLES.COMMUNITY_ADMIN &&
        user.communities.some((c) => c.community_id === inv.communityId));
    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("You can only inspect your own invoices.");
    }
    return formatInvoice(inv);
  });

  app.get<{ Params: { orderId: string }; Reply: RetailerBillDTO }>(
    "/bulk-orders/:orderId/bill",
    async (req) => {
      const user = await requireUser(req);
      const bill = await prisma.retailerBill.findUnique({
        where: { bulkOrderId: req.params.orderId },
      });
      if (!bill) throw new NotFoundError("Retailer bill not generated yet.");
      if (
        user.role !== ROLES.PLATFORM_ADMIN &&
        user.retailer?.id !== bill.retailerId &&
        !(
          user.role === ROLES.COMMUNITY_ADMIN &&
          user.communities.some((c) => c.community_id === bill.communityId)
        )
      ) {
        throw new ForbiddenError("Access denied.");
      }

      return {
        id: bill.id,
        bulk_order_id: bill.bulkOrderId,
        retailer_id: bill.retailerId,
        community_id: bill.communityId,
        bill_number: bill.billNumber,
        gross_amount_paise: bill.grossAmountPaise,
        discount_amount_paise: bill.discountAmountPaise,
        delivery_amount_paise: bill.deliveryAmountPaise,
        net_amount_paise: bill.netAmountPaise,
        status: bill.status,
        issued_at: bill.issuedAt.toISOString(),
        finalized_at: bill.finalizedAt?.toISOString() ?? null,
      };
    }
  );
}

export async function paymentsRoutes(app: FastifyInstance) {
  app.post<{ Body: z.infer<typeof createPaymentOrderSchema>; Reply: PaymentOrderResponseDTO }>(
    "/orders/create",
    async (req) => {
      const user = await requireUser(req);
      const body = createPaymentOrderSchema.parse(req.body);

      const inv = await prisma.invoice.findUnique({ where: { id: body.invoice_id } });
      if (!inv) throw new NotFoundError("Invoice not found.");
      if (user.role !== ROLES.PLATFORM_ADMIN && inv.userId !== user.id) {
        throw new ForbiddenError("You can only pay your own invoices.");
      }
      if (inv.status === INVOICE_STATUSES.PAID) {
        throw new ConflictError("Invoice is already paid in full.", "INVOICE_ALREADY_PAID");
      }

      const amountDue = Math.max(0, inv.totalAmountPaise - inv.paidAmountPaise);
      if (amountDue === 0) {
        throw new ConflictError("No balance remaining on this invoice.");
      }

      const gatewayOrderId = `order_${env.PAYMENT_GATEWAY}_${randomBytes(8).toString("hex")}`;

      await prisma.$transaction(async (tx) => {
        const rec = await tx.paymentRecord.create({
          data: {
            invoiceId: inv.id,
            userId: user.id,
            amountPaise: amountDue,
            gateway: env.PAYMENT_GATEWAY,
            gatewayOrderId,
            status: "initiated",
          },
        });
        await recordAuditLog(tx, {
          userId: user.id,
          action: "PAYMENT_ORDER_CREATED",
          entityType: "PaymentRecord",
          entityId: rec.id,
          payloadAfter: { invoice_id: inv.id, amount_paise: amountDue, gateway_order_id: gatewayOrderId },
        });
      });

      return {
        order_id: gatewayOrderId,
        invoice_id: inv.id,
        amount_paise: amountDue,
        currency: "INR",
        gateway: env.PAYMENT_GATEWAY,
        key_id: env.RAZORPAY_KEY_ID,
        customer_phone: user.phone,
        customer_name: user.full_name,
      };
    }
  );

  app.post<{ Body: z.infer<typeof verifyPaymentSchema> }>("/verify", async (req) => {
    const user = await requireUser(req);
    const body = verifyPaymentSchema.parse(req.body);

    // If live Razorpay gateway, verify HMAC-SHA256 signature strictly
    if (env.PAYMENT_GATEWAY === "razorpay") {
      if (!body.signature) {
        throw new BadRequestError("Missing payment signature.", "SIGNATURE_MISSING");
      }
      const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
        .update(`${body.gateway_order_id}|${body.payment_id}`)
        .digest("hex");
      const sigBuf = Buffer.from(body.signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        throw new BadRequestError("Invalid Razorpay payment signature.", "INVALID_SIGNATURE");
      }
    }

    return prisma.$transaction(async (tx) => {
      // Idempotency guard against duplicate transactions
      const existingTxn = await tx.paymentRecord.findUnique({
        where: { transactionId: body.payment_id },
      });
      if (existingTxn && existingTxn.status === "successful") {
        const inv = await tx.invoice.findUnique({ where: { id: existingTxn.invoiceId } });
        return {
          status: "verified",
          invoice_id: existingTxn.invoiceId,
          transaction_id: body.payment_id,
          paid_amount_paise: existingTxn.amountPaise,
          invoice_status: inv?.status ?? INVOICE_STATUSES.PAID,
        };
      }

      const inv = await tx.invoice.findUnique({ where: { id: body.invoice_id } });
      if (!inv) throw new NotFoundError("Invoice not found.");
      if (user.role !== ROLES.PLATFORM_ADMIN && inv.userId !== user.id) {
        throw new ForbiddenError("Access denied.");
      }

      const initiated = await tx.paymentRecord.findFirst({
        where: { invoiceId: inv.id, gatewayOrderId: body.gateway_order_id },
        orderBy: { recordedAt: "desc" },
      });
      const payAmount = initiated?.amountPaise ?? Math.max(0, inv.totalAmountPaise - inv.paidAmountPaise);
      const now = nowUtc();

      if (initiated) {
        await tx.paymentRecord.update({
          where: { id: initiated.id },
          data: { transactionId: body.payment_id, status: "successful", recordedAt: now },
        });
      } else {
        await tx.paymentRecord.create({
          data: {
            invoiceId: inv.id,
            userId: user.id,
            amountPaise: payAmount,
            gateway: env.PAYMENT_GATEWAY,
            gatewayOrderId: body.gateway_order_id,
            transactionId: body.payment_id,
            status: "successful",
            recordedAt: now,
          },
        });
      }

      const newPaid = inv.paidAmountPaise + payAmount;
      const newStatus =
        newPaid >= inv.totalAmountPaise ? INVOICE_STATUSES.PAID : INVOICE_STATUSES.PARTIALLY_PAID;

      const updatedInv = await tx.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmountPaise: newPaid,
          status: newStatus,
          paidAt: newStatus === INVOICE_STATUSES.PAID ? now : inv.paidAt,
        },
      });

      await recordOutboxEvent(tx, OUTBOX_EVENTS.PAYMENT_RECEIVED, {
        invoice_id: inv.id,
        user_id: inv.userId,
        amount_paise: payAmount,
        transaction_id: body.payment_id,
      });
      await recordAuditLog(tx, {
        userId: user.id,
        action: "PAYMENT_VERIFIED",
        entityType: "Invoice",
        entityId: inv.id,
        payloadAfter: { transaction_id: body.payment_id, paid_paise: payAmount, status: newStatus },
      });

      return {
        status: "verified",
        invoice_id: inv.id,
        transaction_id: body.payment_id,
        paid_amount_paise: payAmount,
        invoice_status: updatedInv.status,
      };
    });
  });

  app.post("/webhook", { config: { rawBody: true } }, async (req) => {
    const signature = String(req.headers["x-razorpay-signature"] ?? "");
    const rawStr = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawStr).digest("hex");

    if (signature) {
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new BadRequestError("Invalid webhook signature.", "INVALID_WEBHOOK_SIGNATURE");
      }
    } else if (env.ENVIRONMENT === "production") {
      throw new BadRequestError("Missing webhook signature.", "SIGNATURE_MISSING");
    }

    return { received: true };
  });

  app.post<{ Body: z.infer<typeof refundSchema> }>("/refunds", async (req) => {
    const user = await requireUser(req);
    const body = refundSchema.parse(req.body);

    return prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id: body.invoice_id } });
      if (!inv) throw new NotFoundError("Invoice not found.");
      if (
        user.role !== ROLES.PLATFORM_ADMIN &&
        user.role !== ROLES.COMMUNITY_ADMIN &&
        inv.userId !== user.id
      ) {
        throw new ForbiddenError("Access denied.");
      }

      const successfulPay = await tx.paymentRecord.findFirst({
        where: { invoiceId: inv.id, status: "successful" },
        orderBy: { recordedAt: "desc" },
      });
      if (!successfulPay) throw new ConflictError("No successful payment found to refund.");

      const refundAmt = body.amount_paise ?? successfulPay.amountPaise;
      if (refundAmt > inv.paidAmountPaise) {
        throw new BadRequestError("Refund amount exceeds total paid amount.");
      }

      const now = nowUtc();
      const refund = await tx.refund.create({
        data: {
          paymentRecordId: successfulPay.id,
          invoiceId: inv.id,
          amountPaise: refundAmt,
          reason: body.reason,
          status: "completed",
          completedAt: now,
        },
      });

      const remainingPaid = Math.max(0, inv.paidAmountPaise - refundAmt);
      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmountPaise: remainingPaid,
          status: remainingPaid === 0 ? INVOICE_STATUSES.UNPAID : INVOICE_STATUSES.PARTIALLY_PAID,
        },
      });

      await recordOutboxEvent(tx, OUTBOX_EVENTS.REFUND_PROCESSED, {
        refund_id: refund.id,
        invoice_id: inv.id,
        amount_paise: refundAmt,
      });

      return refund;
    });
  });

  app.get<{ Params: { invoiceId: string }; Reply: PaymentHistoryItemDTO[] }>(
    "/invoices/:invoiceId/history",
    async (req) => {
      const user = await requireUser(req);
      const inv = await prisma.invoice.findUnique({ where: { id: req.params.invoiceId } });
      if (!inv) throw new NotFoundError("Invoice not found.");
      if (user.role !== ROLES.PLATFORM_ADMIN && inv.userId !== user.id) {
        throw new ForbiddenError("Access denied.");
      }

      const rows = await prisma.paymentRecord.findMany({
        where: { invoiceId: inv.id },
        orderBy: { recordedAt: "desc" },
      });

      return rows.map((r) => ({
        id: r.id,
        amount_paise: r.amountPaise,
        gateway: r.gateway,
        gateway_order_id: r.gatewayOrderId,
        transaction_id: r.transactionId,
        status: r.status,
        recorded_at: r.recordedAt.toISOString(),
      }));
    }
  );
}
