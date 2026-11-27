export interface ResidentItemRequest {
  user_id: string;
  variant_id: string;
  requested_qty: number;
}

export interface VariantPackInfo {
  variant_id: string;
  packed_qty: number;
  unit_price_paise: number;
  discount_paise?: number;
}

export type DeliveryAllocationMode = "EQUAL" | "PRO_RATA";

export interface BillingCalculationInput {
  resident_requests: ResidentItemRequest[];
  variant_packs: VariantPackInfo[];
  delivery_fee_paise?: number;
  order_discount_paise?: number;
  platform_fee_paise?: number;
  delivery_allocation_mode?: DeliveryAllocationMode;
}

export interface AllocatedItem {
  variant_id: string;
  requested_qty: number;
  packed_qty: number;
  unit_price_paise: number;
  base_cost_paise: number;
  discount_paise: number;
  net_cost_paise: number;
}

export interface ResidentInvoiceBreakdown {
  user_id: string;
  items: AllocatedItem[];
  base_amount_paise: number;
  discount_amount_paise: number;
  delivery_fee_paise: number;
  platform_fee_paise: number;
  total_amount_paise: number;
}

export interface RetailerBillSummary {
  gross_amount_paise: number;
  discount_amount_paise: number;
  delivery_amount_paise: number;
  platform_fee_paise: number;
  net_amount_paise: number;
}

export interface MathematicalAuditLog {
  total_requested_units: number;
  total_packed_units: number;
  active_households_count: number;
  sum_resident_invoices_paise: number;
  retailer_net_paise: number;
  discrepancy_paise: number;
  zero_discrepancy_verified: boolean;
  delivery_remainder_paise: number;
  variant_discount_remainders: Record<string, number>;
  order_discount_remainder_paise: number;
}

export interface BillingCalculationResult {
  resident_invoices: ResidentInvoiceBreakdown[];
  retailer_bill: RetailerBillSummary;
  audit_log: MathematicalAuditLog;
}

export class ZeroDiscrepancyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZeroDiscrepancyViolationError";
  }
}

function assertNonNegInt(val: number, label: string): number {
  if (!Number.isInteger(val) || val < 0) {
    throw new Error(`${label} must be a non-negative integer, received: ${val}`);
  }
  return val;
}

function mulDiv(a: number, b: number, denom: number): { base: number; rem: number } {
  const num = BigInt(a) * BigInt(b);
  const d = BigInt(denom);
  return {
    base: Number(num / d),
    rem: Number(num % d),
  };
}

/**
 * F7 Deterministic Fair Bill-Splitting Engine.
 *
 * Guarantees:
 * 1. 100% Integer Paise arithmetic using exact BigInt division — zero floating point math.
 * 2. Residents pay solely for actually packed units (`min(packed_qty, requested_qty)`).
 * 3. Proportional short-pack unit distribution with canonical deterministic remainder assignment.
 * 4. Proportional variant and order-wide discount distribution capped at actual consumed cost.
 * 5. Delivery fee allocation (`EQUAL` or `PRO_RATA`) among households receiving >= 1 packed unit.
 * 6. Strict mathematical invariant: SUM(residentInvoices) === retailerBill.net_amount_paise.
 */
export function calculateF7Billing(input: BillingCalculationInput): BillingCalculationResult {
  const deliveryFeeInput = assertNonNegInt(input.delivery_fee_paise ?? 0, "delivery_fee_paise");
  const orderDiscountInput = assertNonNegInt(input.order_discount_paise ?? 0, "order_discount_paise");
  const platformFeeInput = assertNonNegInt(input.platform_fee_paise ?? 0, "platform_fee_paise");
  const mode: DeliveryAllocationMode = input.delivery_allocation_mode ?? "EQUAL";

  // 1. Group requests cleanly: variant -> user -> qty
  const userRequestsByVariant = new Map<string, Map<string, number>>();
  const allUsersSet = new Set<string>();

  for (const req of input.resident_requests) {
    const qty = assertNonNegInt(req.requested_qty, `requested_qty(${req.variant_id})`);
    if (qty <= 0) continue;
    allUsersSet.add(req.user_id);
    let uMap = userRequestsByVariant.get(req.variant_id);
    if (!uMap) {
      uMap = new Map();
      userRequestsByVariant.set(req.variant_id, uMap);
    }
    uMap.set(req.user_id, (uMap.get(req.user_id) ?? 0) + qty);
  }

  const allUserIds = Array.from(allUsersSet).sort();

  const variantPacks = new Map<
    string,
    { variant_id: string; packed_qty: number; unit_price_paise: number; discount_paise: number }
  >();
  for (const vp of input.variant_packs) {
    variantPacks.set(vp.variant_id, {
      variant_id: vp.variant_id,
      packed_qty: assertNonNegInt(vp.packed_qty, `packed_qty(${vp.variant_id})`),
      unit_price_paise: assertNonNegInt(vp.unit_price_paise, `unit_price_paise(${vp.variant_id})`),
      discount_paise: assertNonNegInt(vp.discount_paise ?? 0, `discount_paise(${vp.variant_id})`),
    });
  }

  // Step 1: Consumed Quantity Allocation (Short-Pack Handling)
  const allocatedQty = new Map<string, Map<string, number>>();
  let totalRequestedUnits = 0;
  let totalPackedUnits = 0;

  for (const [vId, userReqs] of userRequestsByVariant.entries()) {
    const vp = variantPacks.get(vId);
    let reqSum = 0;
    for (const q of userReqs.values()) reqSum += q;
    totalRequestedUnits += reqSum;

    const allocMap = new Map<string, number>();
    allocatedQty.set(vId, allocMap);

    if (!vp || vp.packed_qty <= 0 || reqSum === 0) {
      continue;
    }

    const actualPacked = Math.min(vp.packed_qty, reqSum);
    totalPackedUnits += actualPacked;

    if (actualPacked === reqSum) {
      for (const [uId, qReq] of userReqs.entries()) {
        allocMap.set(uId, qReq);
      }
    } else {
      const baseAlloc = new Map<string, number>();
      const remainders = new Map<string, number>();
      let baseSum = 0;

      for (const [uId, qReq] of userReqs.entries()) {
        const { base, rem } = mulDiv(qReq, actualPacked, reqSum);
        baseAlloc.set(uId, base);
        remainders.set(uId, rem);
        baseSum += base;
      }

      const surplusUnits = actualPacked - baseSum;
      const sortedCandidates = Array.from(userReqs.keys()).sort((a, b) => {
        const remDiff = (remainders.get(b) ?? 0) - (remainders.get(a) ?? 0);
        if (remDiff !== 0) return remDiff;
        const reqDiff = (userReqs.get(b) ?? 0) - (userReqs.get(a) ?? 0);
        if (reqDiff !== 0) return reqDiff;
        return a < b ? -1 : a > b ? 1 : 0;
      });

      sortedCandidates.forEach((uId, idx) => {
        const bonus = idx < surplusUnits ? 1 : 0;
        allocMap.set(uId, (baseAlloc.get(uId) ?? 0) + bonus);
      });
    }
  }

  // Step 2: Base Cost Allocation (packed_qty * unit_price_paise)
  const userItemBase = new Map<string, Map<string, number>>();
  const userSubtotalPaise = new Map<string, number>();
  for (const uId of allUserIds) {
    userItemBase.set(uId, new Map());
    userSubtotalPaise.set(uId, 0);
  }

  for (const [vId, usersMap] of allocatedQty.entries()) {
    const vp = variantPacks.get(vId);
    if (!vp) continue;
    for (const [uId, pQty] of usersMap.entries()) {
      if (pQty <= 0) continue;
      const cost = pQty * vp.unit_price_paise;
      userItemBase.get(uId)?.set(vId, cost);
      userSubtotalPaise.set(uId, (userSubtotalPaise.get(uId) ?? 0) + cost);
    }
  }

  let retailerGrossPaise = 0;
  for (const sub of userSubtotalPaise.values()) retailerGrossPaise += sub;

  // Step 3: Variant-Level Discount Allocation
  const userVariantDiscount = new Map<string, Map<string, number>>();
  for (const uId of allUserIds) userVariantDiscount.set(uId, new Map());
  const variantDiscountRemainders: Record<string, number> = {};
  let totalVariantDiscountsAllocated = 0;

  for (const [vId, vp] of variantPacks.entries()) {
    if (vp.discount_paise <= 0) continue;

    let variantTotalCost = 0;
    const eligibleUsers: string[] = [];
    for (const uId of allUserIds) {
      const c = userItemBase.get(uId)?.get(vId) ?? 0;
      if (c > 0) {
        variantTotalCost += c;
        eligibleUsers.push(uId);
      }
    }

    if (variantTotalCost <= 0 || eligibleUsers.length === 0) {
      variantDiscountRemainders[vId] = 0;
      continue;
    }

    const effDiscount = Math.min(vp.discount_paise, variantTotalCost);
    const baseDisc = new Map<string, number>();
    const discRem = new Map<string, number>();
    let baseSum = 0;

    for (const uId of eligibleUsers) {
      const uCost = userItemBase.get(uId)?.get(vId) ?? 0;
      const { base, rem } = mulDiv(effDiscount, uCost, variantTotalCost);
      baseDisc.set(uId, base);
      discRem.set(uId, rem);
      baseSum += base;
    }

    const surplus = effDiscount - baseSum;
    variantDiscountRemainders[vId] = surplus;

    const sortedUsers = [...eligibleUsers].sort((a, b) => {
      const remDiff = (discRem.get(b) ?? 0) - (discRem.get(a) ?? 0);
      if (remDiff !== 0) return remDiff;
      const costDiff = (userItemBase.get(b)?.get(vId) ?? 0) - (userItemBase.get(a)?.get(vId) ?? 0);
      if (costDiff !== 0) return costDiff;
      return a < b ? -1 : a > b ? 1 : 0;
    });

    sortedUsers.forEach((uId, idx) => {
      const bonus = idx < surplus ? 1 : 0;
      userVariantDiscount.get(uId)?.set(vId, (baseDisc.get(uId) ?? 0) + bonus);
    });

    totalVariantDiscountsAllocated += effDiscount;
  }

  // Step 4: Order-Wide Bulk Discount Allocation
  const userOrderDiscount = new Map<string, number>();
  let orderDiscountRemainderPaise = 0;

  const userNetBeforeOrder = new Map<string, number>();
  let activeNetSum = 0;
  for (const uId of allUserIds) {
    const sub = userSubtotalPaise.get(uId) ?? 0;
    let vDiscSum = 0;
    for (const d of userVariantDiscount.get(uId)?.values() ?? []) vDiscSum += d;
    const netBefore = Math.max(0, sub - vDiscSum);
    if (netBefore > 0) {
      userNetBeforeOrder.set(uId, netBefore);
      activeNetSum += netBefore;
    }
  }

  let effOrderDiscount = 0;
  if (orderDiscountInput > 0 && activeNetSum > 0) {
    effOrderDiscount = Math.min(orderDiscountInput, activeNetSum);
    const baseOrdDisc = new Map<string, number>();
    const ordRem = new Map<string, number>();
    let ordBaseSum = 0;

    for (const [uId, uNet] of userNetBeforeOrder.entries()) {
      const { base, rem } = mulDiv(effOrderDiscount, uNet, activeNetSum);
      baseOrdDisc.set(uId, base);
      ordRem.set(uId, rem);
      ordBaseSum += base;
    }

    const surplusOrd = effOrderDiscount - ordBaseSum;
    orderDiscountRemainderPaise = surplusOrd;

    const sortedOrdUsers = Array.from(userNetBeforeOrder.keys()).sort((a, b) => {
      const remDiff = (ordRem.get(b) ?? 0) - (ordRem.get(a) ?? 0);
      if (remDiff !== 0) return remDiff;
      const netDiff = (userNetBeforeOrder.get(b) ?? 0) - (userNetBeforeOrder.get(a) ?? 0);
      if (netDiff !== 0) return netDiff;
      return a < b ? -1 : a > b ? 1 : 0;
    });

    sortedOrdUsers.forEach((uId, idx) => {
      const bonus = idx < surplusOrd ? 1 : 0;
      userOrderDiscount.set(uId, (baseOrdDisc.get(uId) ?? 0) + bonus);
    });
  }

  const totalDiscountPaise = totalVariantDiscountsAllocated + effOrderDiscount;

  // Step 5: Delivery Fee Allocation (only households receiving > 0 gross value)
  const activeUserIds = allUserIds.filter((u) => (userSubtotalPaise.get(u) ?? 0) > 0);
  const activeHouseholdsCount = activeUserIds.length;
  const userDeliveryFee = new Map<string, number>();
  let deliveryRemainderPaise = 0;
  let effDeliveryFee = 0;

  if (deliveryFeeInput > 0 && activeHouseholdsCount > 0) {
    effDeliveryFee = deliveryFeeInput;
    if (mode === "EQUAL") {
      const { base, rem } = mulDiv(effDeliveryFee, 1, activeHouseholdsCount);
      deliveryRemainderPaise = rem;
      activeUserIds.forEach((uId, idx) => {
        userDeliveryFee.set(uId, base + (idx < rem ? 1 : 0));
      });
    } else {
      let activeGross = 0;
      for (const uId of activeUserIds) activeGross += userSubtotalPaise.get(uId) ?? 0;

      const baseFees = new Map<string, number>();
      const feeRems = new Map<string, number>();
      let baseSum = 0;

      for (const uId of activeUserIds) {
        const uSub = userSubtotalPaise.get(uId) ?? 0;
        const { base, rem } = mulDiv(effDeliveryFee, uSub, activeGross);
        baseFees.set(uId, base);
        feeRems.set(uId, rem);
        baseSum += base;
      }

      const surplusFee = effDeliveryFee - baseSum;
      deliveryRemainderPaise = surplusFee;
      const sortedFeeUsers = [...activeUserIds].sort((a, b) => {
        const remDiff = (feeRems.get(b) ?? 0) - (feeRems.get(a) ?? 0);
        if (remDiff !== 0) return remDiff;
        const subDiff = (userSubtotalPaise.get(b) ?? 0) - (userSubtotalPaise.get(a) ?? 0);
        if (subDiff !== 0) return subDiff;
        return a < b ? -1 : a > b ? 1 : 0;
      });
      sortedFeeUsers.forEach((uId, idx) => {
        userDeliveryFee.set(uId, (baseFees.get(uId) ?? 0) + (idx < surplusFee ? 1 : 0));
      });
    }
  }

  // Step 6: Platform Fee Allocation (equal split among active households)
  const userPlatformFee = new Map<string, number>();
  let effPlatformFee = 0;
  if (platformFeeInput > 0 && activeHouseholdsCount > 0) {
    effPlatformFee = platformFeeInput;
    const { base, rem } = mulDiv(effPlatformFee, 1, activeHouseholdsCount);
    activeUserIds.forEach((uId, idx) => {
      userPlatformFee.set(uId, base + (idx < rem ? 1 : 0));
    });
  }

  // Step 7: Assembly of Resident Invoices & Retailer Bill
  const residentInvoices: ResidentInvoiceBreakdown[] = [];

  for (const uId of allUserIds) {
    const items: AllocatedItem[] = [];
    const requestedVariants = new Set<string>();
    for (const req of input.resident_requests) {
      if (req.user_id === uId && req.requested_qty > 0) {
        requestedVariants.add(req.variant_id);
      }
    }

    for (const vId of Array.from(requestedVariants).sort()) {
      const reqQty = userRequestsByVariant.get(vId)?.get(uId) ?? 0;
      const packQty = allocatedQty.get(vId)?.get(uId) ?? 0;
      const unitPrice = variantPacks.get(vId)?.unit_price_paise ?? 0;
      const baseCost = packQty * unitPrice;
      const vDisc = userVariantDiscount.get(uId)?.get(vId) ?? 0;
      items.push({
        variant_id: vId,
        requested_qty: reqQty,
        packed_qty: packQty,
        unit_price_paise: unitPrice,
        base_cost_paise: baseCost,
        discount_paise: vDisc,
        net_cost_paise: baseCost - vDisc,
      });
    }

    const uBase = userSubtotalPaise.get(uId) ?? 0;
    let uVarDisc = 0;
    for (const d of userVariantDiscount.get(uId)?.values() ?? []) uVarDisc += d;
    const uDisc = uVarDisc + (userOrderDiscount.get(uId) ?? 0);
    const uDel = userDeliveryFee.get(uId) ?? 0;
    const uPlat = userPlatformFee.get(uId) ?? 0;
    const uTotal = uBase - uDisc + uDel + uPlat;

    residentInvoices.push({
      user_id: uId,
      items,
      base_amount_paise: uBase,
      discount_amount_paise: uDisc,
      delivery_fee_paise: uDel,
      platform_fee_paise: uPlat,
      total_amount_paise: uTotal,
    });
  }

  const retailerNetPaise = retailerGrossPaise - totalDiscountPaise + effDeliveryFee + effPlatformFee;
  const retailerBill: RetailerBillSummary = {
    gross_amount_paise: retailerGrossPaise,
    discount_amount_paise: totalDiscountPaise,
    delivery_amount_paise: effDeliveryFee,
    platform_fee_paise: effPlatformFee,
    net_amount_paise: retailerNetPaise,
  };

  // Step 8: Zero Discrepancy Invariant Verification
  let sumInvoicesPaise = 0;
  for (const inv of residentInvoices) sumInvoicesPaise += inv.total_amount_paise;
  const discrepancyPaise = sumInvoicesPaise - retailerNetPaise;

  if (discrepancyPaise !== 0) {
    throw new ZeroDiscrepancyViolationError(
      `F7 invariant violated: sum(invoices)=${sumInvoicesPaise} != retailerNet=${retailerNetPaise}`
    );
  }

  return {
    resident_invoices: residentInvoices,
    retailer_bill: retailerBill,
    audit_log: {
      total_requested_units: totalRequestedUnits,
      total_packed_units: totalPackedUnits,
      active_households_count: activeHouseholdsCount,
      sum_resident_invoices_paise: sumInvoicesPaise,
      retailer_net_paise: retailerNetPaise,
      discrepancy_paise: discrepancyPaise,
      zero_discrepancy_verified: discrepancyPaise === 0,
      delivery_remainder_paise: deliveryRemainderPaise,
      variant_discount_remainders: variantDiscountRemainders,
      order_discount_remainder_paise: orderDiscountRemainderPaise,
    },
  };
}
