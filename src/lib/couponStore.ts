/**
 * She'Aura Privilege Voucher & Coupon Management Core
 * Supports custom admin coupon creation, instant dismantling, and real-time usage analytics
 */

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number; // e.g., 0.10 for 10% or 500 for ₹500
  minSubtotal: number;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  usageCount: number;
}

export interface CouponRankingItem {
  rank: number;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSubtotal: number;
  isActive: boolean;
  timesUsed: number;
  revenueGenerated: number;
  totalDiscountGiven: number;
}

const STORAGE_COUPONS_KEY = "sheaura_coupons_registry_v2";
const COUPONS_EVENT = "sheaura:coupons-updated";

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "coup-sheaura10",
    code: "SHEAURA10",
    description: "10% Couture Welcome Privilege",
    discountType: "percentage",
    discountValue: 0.1,
    minSubtotal: 0,
    isActive: true,
    createdAt: "2026-10-01T00:00:00.000Z",
    usageCount: 14,
  },
  {
    id: "coup-haute500",
    code: "HAUTE500",
    description: "₹500 Off Orders Above ₹1,500",
    discountType: "fixed",
    discountValue: 500,
    minSubtotal: 1500,
    isActive: true,
    createdAt: "2026-10-05T00:00:00.000Z",
    usageCount: 8,
  },
  {
    id: "coup-vipfirst",
    code: "VIPFIRST",
    description: "₹300 Off First Luxury Order (Above ₹999)",
    discountType: "fixed",
    discountValue: 300,
    minSubtotal: 999,
    isActive: true,
    createdAt: "2026-10-10T00:00:00.000Z",
    usageCount: 6,
  },
  {
    id: "coup-aura10",
    code: "AURA10",
    description: "10% Haute Salon Privilege",
    discountType: "percentage",
    discountValue: 0.1,
    minSubtotal: 0,
    isActive: true,
    createdAt: "2026-10-12T00:00:00.000Z",
    usageCount: 4,
  },
  {
    id: "coup-firstglow",
    code: "FIRSTGLOW",
    description: "15% Off VIP Premiere (Min ₹1,500)",
    discountType: "percentage",
    discountValue: 0.15,
    minSubtotal: 1500,
    isActive: true,
    createdAt: "2026-10-15T00:00:00.000Z",
    usageCount: 3,
  },
  {
    id: "coup-welcome500",
    code: "WELCOME500",
    description: "₹500 Off Grand Atelier Orders (Min ₹2,500)",
    discountType: "fixed",
    discountValue: 500,
    minSubtotal: 2500,
    isActive: true,
    createdAt: "2026-10-18T00:00:00.000Z",
    usageCount: 2,
  },
  {
    id: "coup-sheaura20",
    code: "SHEAURA20",
    description: "20% Exclusive Salon VIP (Min ₹2,000)",
    discountType: "percentage",
    discountValue: 0.2,
    minSubtotal: 2000,
    isActive: false, // Dismantled / inactive by default to demonstrate dismantling
    createdAt: "2026-10-20T00:00:00.000Z",
    usageCount: 1,
  },
];

/** Retrieve all coupons from local storage registry with default fallbacks */
export function getAllCoupons(): Coupon[] {
  if (typeof window === "undefined") return DEFAULT_COUPONS;
  try {
    const raw = localStorage.getItem(STORAGE_COUPONS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_COUPONS_KEY, JSON.stringify(DEFAULT_COUPONS));
      return DEFAULT_COUPONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn("[CouponStore] Storage read notice:", e);
  }
  return DEFAULT_COUPONS;
}

/** Save coupons to registry and dispatch cross-view live event */
export function saveCoupons(coupons: Coupon[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_COUPONS_KEY, JSON.stringify(coupons));
    window.dispatchEvent(new CustomEvent(COUPONS_EVENT, { detail: coupons }));
  } catch (e) {
    console.error("[CouponStore] Failed to save coupons:", e);
  }
}

/** Check if a coupon code is valid and active for customer checkout */
export function validateCoupon(
  code: string,
  subtotal: number
): { valid: boolean; coupon?: Coupon; error?: string } {
  const clean = (code || "").trim().toUpperCase();
  if (!clean) {
    return { valid: false, error: "Please enter a privilege voucher code." };
  }

  const coupons = getAllCoupons();
  const match = coupons.find((c) => c.code.toUpperCase() === clean);

  if (!match) {
    return {
      valid: false,
      error: `Voucher "${clean}" is not recognized. Try "SHEAURA10", "HAUTE500", or "VIPFIRST".`,
    };
  }

  if (!match.isActive) {
    return {
      valid: false,
      error: `Voucher "${clean}" has been dismantled and deactivated by Maison Management.`,
    };
  }

  if (match.minSubtotal && subtotal < match.minSubtotal) {
    return {
      valid: false,
      coupon: match,
      error: `Voucher "${clean}" requires a minimum bag value of ₹${match.minSubtotal.toLocaleString(
        "en-IN"
      )}. Current bag: ₹${subtotal.toLocaleString("en-IN")}.`,
    };
  }

  return { valid: true, coupon: match };
}

/** Add a new customizable coupon by Admin */
export function addAdminCoupon(data: {
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSubtotal?: number;
}): Coupon {
  const cleanCode = data.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const coupons = getAllCoupons();

  // Check if already exists
  const existingIndex = coupons.findIndex((c) => c.code.toUpperCase() === cleanCode);
  const newCoupon: Coupon = {
    id: `coup-${cleanCode.toLowerCase()}-${Date.now().toString(36)}`,
    code: cleanCode,
    description: data.description.trim() || `${cleanCode} Maison Privilege`,
    discountType: data.discountType,
    discountValue:
      data.discountType === "percentage"
        ? data.discountValue > 1
          ? data.discountValue / 100
          : data.discountValue
        : Math.max(1, Math.round(data.discountValue)),
    minSubtotal: Math.max(0, Math.round(data.minSubtotal || 0)),
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "Director of Haute Concierge",
    usageCount: 0,
  };

  let updated: Coupon[];
  if (existingIndex >= 0) {
    updated = [...coupons];
    updated[existingIndex] = { ...newCoupon, usageCount: coupons[existingIndex].usageCount };
  } else {
    updated = [newCoupon, ...coupons];
  }

  saveCoupons(updated);
  return newCoupon;
}

/** Toggle active / dismantled status of a coupon */
export function toggleCouponStatus(code: string): Coupon | null {
  const clean = code.trim().toUpperCase();
  const coupons = getAllCoupons();
  const target = coupons.find((c) => c.code.toUpperCase() === clean);
  if (!target) return null;

  const updated = coupons.map((c) =>
    c.code.toUpperCase() === clean ? { ...c, isActive: !c.isActive } : c
  );
  saveCoupons(updated);
  return updated.find((c) => c.code.toUpperCase() === clean) || null;
}

/** Permanently delete a coupon */
export function deleteCoupon(code: string): boolean {
  const clean = code.trim().toUpperCase();
  const coupons = getAllCoupons();
  const filtered = coupons.filter((c) => c.code.toUpperCase() !== clean);
  if (filtered.length === coupons.length) return false;
  saveCoupons(filtered);
  return true;
}

/** Increment coupon usage count when an order is placed */
export function recordCouponUsage(code: string): void {
  if (!code) return;
  const clean = code.trim().toUpperCase();
  const coupons = getAllCoupons();
  const updated = coupons.map((c) =>
    c.code.toUpperCase() === clean ? { ...c, usageCount: (c.usageCount || 0) + 1 } : c
  );
  saveCoupons(updated);
}

/** Compute real-time usage statistics and ranking for all coupons across live orders */
export function computeCouponRankings(orders: any[] = []): CouponRankingItem[] {
  const coupons = getAllCoupons();
  const statsMap: Record<
    string,
    { timesUsed: number; revenue: number; discountTotal: number }
  > = {};

  coupons.forEach((c) => {
    statsMap[c.code.toUpperCase()] = {
      timesUsed: c.usageCount || 0,
      revenue: 0,
      discountTotal: 0,
    };
  });

  // Tally usage across all recorded orders
  orders.forEach((o) => {
    const rawCode = o.discount_code || o.discountCode || o.promoCode || o.promo_code;
    if (rawCode) {
      const code = String(rawCode).trim().toUpperCase();
      if (!statsMap[code]) {
        statsMap[code] = { timesUsed: 0, revenue: 0, discountTotal: 0 };
      }
      statsMap[code].timesUsed += 1;

      const orderTotal =
        typeof o.total_price === "number"
          ? o.total_price
          : parseFloat(String(o.total_amount || 0).replace(/[^0-9.]/g, "")) || 0;
      statsMap[code].revenue += orderTotal;

      const discVal =
        typeof o.discount === "number"
          ? o.discount
          : typeof o.discount_amount === "number"
          ? o.discount_amount
          : 0;
      statsMap[code].discountTotal += discVal;
    }
  });

  // Map to ranking items
  const items: CouponRankingItem[] = coupons.map((c) => {
    const codeKey = c.code.toUpperCase();
    const stats = statsMap[codeKey] || { timesUsed: 0, revenue: 0, discountTotal: 0 };
    return {
      rank: 1,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minSubtotal: c.minSubtotal,
      isActive: c.isActive,
      timesUsed: stats.timesUsed,
      revenueGenerated: stats.revenue,
      totalDiscountGiven: stats.discountTotal,
    };
  });

  // Sort descending by timesUsed
  items.sort((a, b) => b.timesUsed - a.timesUsed || b.revenueGenerated - a.revenueGenerated);

  // Assign rankings (1, 2, 3...)
  return items.map((it, idx) => ({ ...it, rank: idx + 1 }));
}
