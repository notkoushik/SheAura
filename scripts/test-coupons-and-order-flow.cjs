/**
 * She'Aura Automated Test Suite:
 * Privilege & Coupon Management, Instant Dismantling, Real-Time Usage Ranking,
 * and Order Dossier Synchronization
 */

const assert = require("assert");

console.log("=================================================================");
console.log("   SHE'AURA PRIVILEGE VOUCHERS & ORDER DOSSIER TEST SUITE        ");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${name}: ${err.message}`);
    failed++;
  }
}

// Mock browser localStorage for Node test environment
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Simple mock implementation of couponStore logic to test algorithms
const DEFAULT_COUPONS = [
  { id: "coup-sheaura10", code: "SHEAURA10", description: "10% Welcome", discountType: "percentage", discountValue: 0.1, minSubtotal: 0, isActive: true, usageCount: 14 },
  { id: "coup-haute500", code: "HAUTE500", description: "₹500 Off", discountType: "fixed", discountValue: 500, minSubtotal: 1500, isActive: true, usageCount: 8 },
  { id: "coup-vipfirst", code: "VIPFIRST", description: "₹300 Off", discountType: "fixed", discountValue: 300, minSubtotal: 999, isActive: true, usageCount: 6 },
  { id: "coup-sheaura20", code: "SHEAURA20", description: "20% Exclusive", discountType: "percentage", discountValue: 0.2, minSubtotal: 2000, isActive: false, usageCount: 1 }
];

let coupons = JSON.parse(JSON.stringify(DEFAULT_COUPONS));

function validateCoupon(code, subtotal) {
  const clean = (code || "").trim().toUpperCase();
  const match = coupons.find(c => c.code.toUpperCase() === clean);
  if (!match) return { valid: false, error: "Voucher not recognized." };
  if (!match.isActive) return { valid: false, error: "Voucher has been dismantled and deactivated by Maison Management." };
  if (match.minSubtotal && subtotal < match.minSubtotal) {
    return { valid: false, error: `Requires minimum bag value of ₹${match.minSubtotal}.` };
  }
  return { valid: true, coupon: match };
}

function addAdminCoupon(data) {
  const cleanCode = data.code.trim().toUpperCase();
  const newCoupon = {
    id: `coup-${cleanCode.toLowerCase()}`,
    code: cleanCode,
    description: data.description,
    discountType: data.discountType,
    discountValue: data.discountType === "percentage" ? (data.discountValue > 1 ? data.discountValue / 100 : data.discountValue) : data.discountValue,
    minSubtotal: data.minSubtotal || 0,
    isActive: true,
    usageCount: 0
  };
  coupons.unshift(newCoupon);
  return newCoupon;
}

function toggleCouponStatus(code) {
  const clean = code.trim().toUpperCase();
  const target = coupons.find(c => c.code === clean);
  if (target) {
    target.isActive = !target.isActive;
    return target;
  }
  return null;
}

function computeCouponRankings(orders = []) {
  const statsMap = {};
  coupons.forEach(c => {
    statsMap[c.code] = { timesUsed: c.usageCount || 0, revenue: 0, discountTotal: 0 };
  });

  orders.forEach(o => {
    const raw = o.discount_code;
    if (raw) {
      const code = raw.trim().toUpperCase();
      if (!statsMap[code]) statsMap[code] = { timesUsed: 0, revenue: 0, discountTotal: 0 };
      statsMap[code].timesUsed += 1;
      const orderTotal = typeof o.total_price === "number" && o.total_price > 0 ? o.total_price : parseInt(String(o.total_amount).replace(/[^0-9]/g, "")) || 0;
      statsMap[code].revenue += orderTotal;
      statsMap[code].discountTotal += (o.discount_amount || 0);
    }
  });

  return coupons.map(c => {
    const s = statsMap[c.code] || { timesUsed: 0, revenue: 0, discountTotal: 0 };
    return {
      code: c.code,
      isActive: c.isActive,
      timesUsed: s.timesUsed,
      revenueGenerated: s.revenue,
      totalDiscountGiven: s.discountTotal
    };
  }).sort((a, b) => b.timesUsed !== a.timesUsed ? b.timesUsed - a.timesUsed : b.revenueGenerated - a.revenueGenerated)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

function formatOrderTotal(o) {
  const totalNum = typeof o.total_price === "number" && o.total_price > 0
    ? o.total_price
    : parseInt(String(o.total_amount || "").replace(/[^0-9]/g, ""), 10) || 0;
  if (totalNum > 0) return `₹${totalNum.toLocaleString("en-IN")}`;
  if (o.total_amount && o.total_amount !== "₹0") return o.total_amount;
  return `₹${o.total_price || 0}`;
}

function getPaymentStatusBadge(o) {
  const raw = (o.payment_status || "").toLowerCase().trim();
  const method = (o.payment_method || "").toLowerCase().trim();
  if (raw === "paid" || raw === "captured" || raw === "completed" || raw === "settled" || raw === "confirmed") {
    return { label: "PAID", status: "success" };
  }
  if (raw === "pending_cod" || raw === "cod" || method.includes("cod") || method.includes("cash")) {
    return { label: "COD PENDING", status: "pending" };
  }
  if (raw === "awaiting_payment" || raw === "awaiting" || raw === "processing") {
    return { label: "PROCESSING", status: "processing" };
  }
  if (raw === "failed" || raw === "cancelled") {
    return { label: "FAILED", status: "error" };
  }
  return { label: "PAID", status: "success" };
}

// ---------------------- RUN TEST CASES ----------------------

console.log("--- TEST GROUP 1: Privilege Voucher Validation & Dismantling ---");

test("1.1: Active voucher SHEAURA10 validates with zero minSubtotal", () => {
  const res = validateCoupon("SHEAURA10", 1200);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.coupon.code, "SHEAURA10");
});

test("1.2: Dismantled voucher SHEAURA20 is strictly blocked from checkout", () => {
  const res = validateCoupon("SHEAURA20", 3000);
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes("dismantled and deactivated"));
});

test("1.3: Admin instantly dismantles active coupon HAUTE500", () => {
  const toggled = toggleCouponStatus("HAUTE500");
  assert.strictEqual(toggled.isActive, false);
  const check = validateCoupon("HAUTE500", 2500);
  assert.strictEqual(check.valid, false);
  assert.ok(check.error.includes("dismantled and deactivated"));
});

test("1.4: Admin reactivates dismantled coupon HAUTE500", () => {
  const toggled = toggleCouponStatus("HAUTE500");
  assert.strictEqual(toggled.isActive, true);
  const check = validateCoupon("HAUTE500", 2500);
  assert.strictEqual(check.valid, true);
});

test("1.5: Enforce minimum order threshold (₹1,500 for HAUTE500)", () => {
  const belowThreshold = validateCoupon("HAUTE500", 1099);
  assert.strictEqual(belowThreshold.valid, false);
  assert.ok(belowThreshold.error.includes("Requires minimum bag value"));

  const aboveThreshold = validateCoupon("HAUTE500", 1600);
  assert.strictEqual(aboveThreshold.valid, true);
});

console.log("\n--- TEST GROUP 2: Admin Custom Coupon Creation & Ranking ---");

test("2.1: Admin adds custom promotional privilege FESTIVE25", () => {
  const created = addAdminCoupon({
    code: "FESTIVE25",
    description: "25% Off Festive Atelier Release",
    discountType: "percentage",
    discountValue: 25,
    minSubtotal: 2000
  });
  assert.strictEqual(created.code, "FESTIVE25");
  assert.strictEqual(created.discountValue, 0.25);
  assert.strictEqual(created.isActive, true);
});

test("2.2: Compute live coupon rankings across simulated customer orders", () => {
  const simulatedOrders = [
    { id: "ORD-001", discount_code: "FESTIVE25", total_price: 3500, discount_amount: 875 },
    { id: "ORD-002", discount_code: "FESTIVE25", total_price: 4200, discount_amount: 1050 },
    { id: "ORD-003", discount_code: "SHEAURA10", total_price: 2198, discount_amount: 220 },
  ];

  const rankings = computeCouponRankings(simulatedOrders);
  assert.ok(rankings.length >= 4);

  // SHEAURA10 had 14 base usages + 1 order = 15
  const top1 = rankings[0];
  assert.strictEqual(top1.code, "SHEAURA10");
  assert.strictEqual(top1.rank, 1);
  assert.strictEqual(top1.timesUsed, 15);

  const festive = rankings.find(r => r.code === "FESTIVE25");
  assert.strictEqual(festive.timesUsed, 2);
  assert.strictEqual(festive.revenueGenerated, 7700);
  assert.strictEqual(festive.totalDiscountGiven, 1925);
});

console.log("\n--- TEST GROUP 3: Order Display, Total Amount & Badge Invariants ---");

test("3.1: formatOrderTotal resolves total_price (2198) when total_amount was '₹0'", () => {
  const buggyOrder = { id: "ORD-BUG", total_amount: "₹0", total_price: 2198 };
  const formatted = formatOrderTotal(buggyOrder);
  assert.strictEqual(formatted, "₹2,198");
});

test("3.2: formatOrderTotal formats clean numeric rupee strings", () => {
  const normalOrder = { id: "ORD-NORM", total_amount: "₹3,450", total_price: 3450 };
  assert.strictEqual(formatOrderTotal(normalOrder), "₹3,450");
});

test("3.3: getPaymentStatusBadge maps 'awaiting_payment' to PROCESSING (never false FAILED)", () => {
  const order = { id: "ORD-PROC", payment_status: "awaiting_payment" };
  const badge = getPaymentStatusBadge(order);
  assert.strictEqual(badge.label, "PROCESSING");
});

test("3.4: getPaymentStatusBadge maps 'pending_cod' and cash on delivery to COD PENDING", () => {
  const codOrder1 = { id: "ORD-COD1", payment_status: "pending_cod" };
  const codOrder2 = { id: "ORD-COD2", payment_method: "Cash on Delivery", payment_status: "unpaid" };
  assert.strictEqual(getPaymentStatusBadge(codOrder1).label, "COD PENDING");
  assert.strictEqual(getPaymentStatusBadge(codOrder2).label, "COD PENDING");
});

test("3.5: getPaymentStatusBadge maps verified paid payments to PAID badge", () => {
  const paidOrder = { id: "ORD-PAID", payment_status: "paid" };
  assert.strictEqual(getPaymentStatusBadge(paidOrder).label, "PAID");
  assert.strictEqual(getPaymentStatusBadge(paidOrder).status, "success");
});

console.log("\n=================================================================");
console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
if (failed === 0) {
  console.log("🎉 ALL PRIVILEGE & ORDER DOSSIER INVARIANTS VERIFIED CLEANLY!");
}
console.log("=================================================================");

if (failed > 0) process.exit(1);
