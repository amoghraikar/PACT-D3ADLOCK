import { beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { runSeed } from "../prisma/seed.js";
import { processPendingOutboxBatch } from "../src/workers/outbox-worker.js";
import { setClockOverride } from "../src/lib/clock.js";

const app = buildApp();

async function loginAs(phone: string): Promise<string> {
  await prisma.otpVerification.deleteMany({ where: { phone } });
  const reqRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/request-otp",
    payload: { phone },
  });
  expect(reqRes.statusCode).toBe(200);
  const verifyRes = await app.inject({
    method: "POST",
    url: "/api/v1/auth/verify-otp",
    payload: { phone, otp: "123456" },
  });
  expect(verifyRes.statusCode).toBe(200);
  return verifyRes.json().access_token as string;
}

describe("PACT Full Production Integration Suite", () => {
  beforeAll(async () => {
    setClockOverride(null);
    await prisma.$executeRawUnsafe(
      "TRUNCATE TABLE delivery_handovers, deliveries, refunds, payment_records, discount_allocations, invoice_items, invoices, retailer_bills, retailer_packing_items, bulk_order_items, bulk_orders, community_cart_items, shopping_cycles, notifications, notification_preferences, outbox_events, audit_logs, user_sessions, otp_verifications, inventory_movements, stock_batches, inventory_items, product_images, product_variants, products, categories, retailer_communities, retailers, community_memberships, apartments, buildings, communities, users, roles, platform_configs RESTART IDENTITY CASCADE"
    );
    await runSeed(prisma);
  });

  it("health and database readiness respond with 200", async () => {
    const h = await app.inject({ method: "GET", url: "/health" });
    expect(h.statusCode).toBe(200);
    expect(h.json().status).toBe("healthy");

    const r = await app.inject({ method: "GET", url: "/ready" });
    expect(r.statusCode).toBe(200);
    expect(r.json().database).toBe("connected");
  });

  it("enforces strict RBAC across all 4 roles", async () => {
    const custToken = await loginAs("+919999900001");
    const retToken = await loginAs("+919999900021");
    const adminToken = await loginAs("+919999900031");
    const platToken = await loginAs("+919999900099");

    // Customer cannot access retailer/admin/platform routes
    expect((await app.inject({ method: "GET", url: "/api/v1/retailer/orders", headers: { authorization: `Bearer ${custToken}` } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/v1/admin/dashboard", headers: { authorization: `Bearer ${custToken}` } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/v1/platform/overview", headers: { authorization: `Bearer ${custToken}` } })).statusCode).toBe(403);

    // Retailer cannot access admin/platform
    expect((await app.inject({ method: "GET", url: "/api/v1/retailer/orders", headers: { authorization: `Bearer ${retToken}` } })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/v1/admin/dashboard", headers: { authorization: `Bearer ${retToken}` } })).statusCode).toBe(403);

    // Apartment admin can access dashboard but not platform routes
    expect((await app.inject({ method: "GET", url: "/api/v1/admin/dashboard", headers: { authorization: `Bearer ${adminToken}` } })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/v1/platform/overview", headers: { authorization: `Bearer ${adminToken}` } })).statusCode).toBe(403);

    // Platform admin succeeds
    expect((await app.inject({ method: "GET", url: "/api/v1/platform/overview", headers: { authorization: `Bearer ${platToken}` } })).statusCode).toBe(200);
  });

  it("interprets Hindi/Hinglish voice orders without auto-mutating cart", async () => {
    const custToken = await loginAs("+919999900001");
    const interp = await app.inject({
      method: "POST",
      url: "/api/v1/voice/interpret",
      headers: { authorization: `Bearer ${custToken}` },
      payload: { text: "ek litre Amul Taaza milk aur do kilo Aashirvaad atta", language: "hinglish" },
    });
    expect(interp.statusCode).toBe(200);
    const body = interp.json();
    expect(body.items.length).toBeGreaterThanOrEqual(2);
    // Ensure cart stayed empty before explicit confirmation
    const cart = await app.inject({
      method: "GET",
      url: "/api/v1/cart",
      headers: { authorization: `Bearer ${custToken}` },
    });
    expect(cart.json().items.length).toBe(0);
  });

  it("executes full cycle: cart -> consolidate -> pack (short-pack) -> F7 bill -> payment -> outbox -> handover", async () => {
    const ashaToken = await loginAs("+919999900001");
    const bharatToken = await loginAs("+919999900002");
    const retToken = await loginAs("+919999900021");
    const adminToken = await loginAs("+919999900031");

    // 1. Catalogue browsing (12 categories, 72 products)
    const catsRes = await app.inject({ method: "GET", url: "/api/v1/catalogue/categories" });
    expect(catsRes.json().length).toBe(12);
    const prodsRes = await app.inject({ method: "GET", url: "/api/v1/catalogue/products?limit=10" });
    expect(prodsRes.json().meta.total).toBe(72);

    const firstVariantId = prodsRes.json().data[0].variants[0].id as string;

    // 2. Residents add items cleanly
    await app.inject({
      method: "PUT",
      url: `/api/v1/cart/items/${firstVariantId}`,
      headers: { authorization: `Bearer ${ashaToken}` },
      payload: { quantity: 2 },
    });
    await app.inject({
      method: "PUT",
      url: `/api/v1/cart/items/${firstVariantId}`,
      headers: { authorization: `Bearer ${bharatToken}` },
      payload: { quantity: 3 },
    });

    // Privacy check: Asha sees her 2 items, and community aggregate 5 across 2 households
    const ashaCart = (
      await app.inject({
        method: "GET",
        url: "/api/v1/cart",
        headers: { authorization: `Bearer ${ashaToken}` },
      })
    ).json();
    expect(ashaCart.items[0].quantity).toBe(2);
    expect(ashaCart.items[0].community_aggregate_qty).toBe(5);
    expect(ashaCart.community_summary.participating_households_count).toBe(2);

    // 3. Consolidate cycle into BulkOrder
    const consRes = await app.inject({
      method: "POST",
      url: `/api/v1/cycles/${ashaCart.cycle.id}/consolidate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(consRes.statusCode).toBe(200);
    const orderId = consRes.json().bulk_order_id as string;

    // 4. Retailer accepts & packs with short-pack (4 out of 5)
    await app.inject({
      method: "POST",
      url: `/api/v1/retailer/orders/${orderId}/accept`,
      headers: { authorization: `Bearer ${retToken}` },
    });

    // Attempting packed_qty > requested_qty must fail
    const overPack = await app.inject({
      method: "POST",
      url: `/api/v1/retailer/orders/${orderId}/packing`,
      headers: { authorization: `Bearer ${retToken}` },
      payload: { items: [{ variant_id: firstVariantId, packed_qty: 6, is_unavailable: false }] },
    });
    expect(overPack.statusCode).toBe(400);

    const packRes = await app.inject({
      method: "POST",
      url: `/api/v1/retailer/orders/${orderId}/packing`,
      headers: { authorization: `Bearer ${retToken}` },
      payload: { items: [{ variant_id: firstVariantId, packed_qty: 4, is_unavailable: false, notes: "1 unit short" }] },
    });
    expect(packRes.statusCode).toBe(200);
    expect(packRes.json().total_packed_items).toBe(4);

    // 5. Finalize F7 bill & verify zero discrepancy
    const billRes = await app.inject({
      method: "POST",
      url: `/api/v1/retailer/orders/${orderId}/send-bill`,
      headers: { authorization: `Bearer ${retToken}` },
      payload: { delivery_fee_paise: 10001, order_discount_paise: 500, delivery_allocation_mode: "EQUAL" },
    });
    expect(billRes.statusCode).toBe(200);
    expect(billRes.json().audit_log.zero_discrepancy_verified).toBe(true);
    expect(billRes.json().audit_log.discrepancy_paise).toBe(0);

    // 6. Process PostgreSQL transactional outbox -> generates resident notifications
    const processed = await processPendingOutboxBatch();
    expect(processed).toBeGreaterThanOrEqual(2);

    const notifs = await app.inject({
      method: "GET",
      url: "/api/v1/notifications",
      headers: { authorization: `Bearer ${ashaToken}` },
    });
    expect(notifs.json().some((n: { kind: string }) => n.kind === "bill_ready")).toBe(true);

    // 7. Resident settles invoice via mock payment
    const myInvoices = (
      await app.inject({
        method: "GET",
        url: "/api/v1/billing/invoices/me",
        headers: { authorization: `Bearer ${ashaToken}` },
      })
    ).json();
    expect(myInvoices.length).toBe(1);
    const invId = myInvoices[0].id as string;

    const payOrder = (
      await app.inject({
        method: "POST",
        url: "/api/v1/payments/orders/create",
        headers: { authorization: `Bearer ${ashaToken}` },
        payload: { invoice_id: invId },
      })
    ).json();

    const verifyPay = await app.inject({
      method: "POST",
      url: "/api/v1/payments/verify",
      headers: { authorization: `Bearer ${ashaToken}` },
      payload: {
        invoice_id: invId,
        gateway_order_id: payOrder.order_id,
        payment_id: "pay_mock_98765",
      },
    });
    expect(verifyPay.statusCode).toBe(200);
    expect(verifyPay.json().invoice_status).toBe("paid");

    // 8. Retailer dispatches & Apartment admin checks rate-limited reminder & confirms handover
    await app.inject({
      method: "POST",
      url: `/api/v1/retailer/orders/${orderId}/dispatch`,
      headers: { authorization: `Bearer ${retToken}` },
    });

    const bharatInv = await prisma.invoice.findFirst({
      where: { bulkOrderId: orderId, status: "unpaid" },
    });
    expect(bharatInv).not.toBeNull();

    const rem1 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/invoices/${bharatInv!.id}/remind`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { channels: ["in_app", "sms"] },
    });
    expect(rem1.statusCode).toBe(200);
    expect(rem1.json().channels_confirmed).toEqual(["in_app"]);

    // Second reminder within 1 hr must rate-limit
    const rem2 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/invoices/${bharatInv!.id}/remind`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { channels: ["in_app"] },
    });
    expect(rem2.statusCode).toBe(429);

    const delStatus = (
      await app.inject({
        method: "GET",
        url: "/api/v1/admin/deliveries",
        headers: { authorization: `Bearer ${adminToken}` },
      })
    ).json();
    expect(delStatus.handovers.length).toBe(2);

    const confirmH1 = await app.inject({
      method: "POST",
      url: `/api/v1/admin/deliveries/handovers/${delStatus.handovers[0].handover_id}/confirm`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { notes: "Handed over at gate" },
    });
    expect(confirmH1.statusCode).toBe(200);
    expect(confirmH1.json().status).toBe("handed_over");
  });
});
