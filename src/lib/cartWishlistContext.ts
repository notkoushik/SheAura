import { useState, useEffect, useCallback, useMemo } from "react";
import { StorefrontProduct } from "./catalog";

export type Product = StorefrontProduct;

export interface CartItem {
  id: string; // unique key: productId + (shade || "")
  product: Product;
  quantity: number;
  selectedShade?: string;
  selectedTone?: string;
  priceNum: number;
}

export interface PromoCode {
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minSubtotal?: number;
}

export const VALID_PROMOS: Record<string, PromoCode> = {
  SHEAURA10: {
    code: "SHEAURA10",
    description: "10% Couture Welcome Discount",
    discountType: "percentage",
    discountValue: 0.1,
    minSubtotal: 0,
  },
  AURA10: {
    code: "AURA10",
    description: "10% Haute Privilege Savings",
    discountType: "percentage",
    discountValue: 0.1,
    minSubtotal: 0,
  },
  HAUTE500: {
    code: "HAUTE500",
    description: "₹500 Off Orders Above ₹1,500",
    discountType: "fixed",
    discountValue: 500,
    minSubtotal: 1500,
  },
  VIPFIRST: {
    code: "VIPFIRST",
    description: "₹300 Off First Luxury Order Above ₹999",
    discountType: "fixed",
    discountValue: 300,
    minSubtotal: 999,
  },
  FIRSTGLOW: {
    code: "FIRSTGLOW",
    description: "15% Off VIP Premiere (Min ₹1,500)",
    discountType: "percentage",
    discountValue: 0.15,
    minSubtotal: 1500,
  },
  WELCOME500: {
    code: "WELCOME500",
    description: "₹500 Off Grand Atelier Orders (Min ₹2,500)",
    discountType: "fixed",
    discountValue: 500,
    minSubtotal: 2500,
  },
  SHEAURA20: {
    code: "SHEAURA20",
    description: "20% Exclusive Salon VIP (Min ₹2,000)",
    discountType: "percentage",
    discountValue: 0.2,
    minSubtotal: 2000,
  },
  SAVE100: {
    code: "SAVE100",
    description: "₹100 Off Orders Above ₹499",
    discountType: "fixed",
    discountValue: 100,
    minSubtotal: 499,
  },
};

export const DELUXE_SAMPLES = [
  {
    id: "sample-rose-elixir",
    name: "Damask Rose Botanical Squalane Elixir",
    size: "5 ml Deluxe Miniature",
    image: "https://images.unsplash.com/photo-1695972235594-8478ab831602?auto=format&fit=crop&w=400&q=80",
    value: "Worth ₹450",
  },
  {
    id: "sample-gold-glow",
    name: "Molten Pearl Liquid Illuminator",
    size: "4 ml Couture Dropper",
    image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=400&q=80",
    value: "Worth ₹520",
  },
  {
    id: "sample-lip-glaze",
    name: "Cashmere Sheer Lip Veil Sample",
    size: "2 ml Pocket Vial",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=400&q=80",
    value: "Worth ₹380",
  },
];

export function parseProductPrice(product: Product): number {
  if (typeof product.rawPrice === "number" && product.rawPrice > 0) {
    return product.rawPrice;
  }
  const clean = String(product.price || "").replace(/[^0-9.]/g, "");
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 899 : parsed;
}

const CART_STORAGE_KEY = "sheaura_cart_v2";
const WISHLIST_STORAGE_KEY = "sheaura_wishlist_v2";

export function getInitialCart(catalog: Product[]): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // If empty, seed with 1 default luxury item so customer can experience the cart right away
  const firstItem = catalog[0];
  if (firstItem) {
    return [
      {
        id: (firstItem.id || firstItem.slug || "scarlet-rose") + "-default",
        product: firstItem,
        quantity: 1,
        selectedShade: firstItem.name.split(" ").slice(0, 2).join(" "),
        selectedTone: firstItem.tone || "#a81920",
        priceNum: parseProductPrice(firstItem),
      },
    ];
  }
  return [];
}

export function getInitialWishlist(catalog: Product[]): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  // Initial seed of 2 wishlisted items for curated discovery
  if (catalog.length >= 2) {
    return [catalog[1], catalog[2] || catalog[0]];
  }
  return [];
}
