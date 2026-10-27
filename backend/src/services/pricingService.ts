export interface CartItemInput {
  productId: string;
  name?: string;
  shade?: string;
  quantity: number;
}

export interface CalculatedOrder {
  items: Array<{
    productId: string;
    name: string;
    shade: string;
    unitPrice: number;
    quantity: number;
    itemTotal: number;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
}

// Master authentic price registry (INR)
export const OFFICIAL_PRICES: Record<string, { name: string; price: number; category: string }> = {
  // Foundations (₹1,299)
  "hydrating-matte-foundation-daffodil": { name: "Hydrating Matte Foundation · Daffodil", price: 1299, category: "Foundation" },
  "hydrating-matte-foundation-snowdrop": { name: "Hydrating Matte Foundation · Snowdrop", price: 1299, category: "Foundation" },
  "hydrating-matte-foundation-honey-lily": { name: "Hydrating Matte Foundation · Honey Lily", price: 1299, category: "Foundation" },
  "hydrating-matte-foundation-toffee-rose": { name: "Hydrating Matte Foundation · Toffee Rose", price: 1299, category: "Foundation" },
  "daffodil": { name: "Hydrating Matte Foundation · Daffodil", price: 1299, category: "Foundation" },
  "snowdrop": { name: "Hydrating Matte Foundation · Snowdrop", price: 1299, category: "Foundation" },
  "honey-lily": { name: "Hydrating Matte Foundation · Honey Lily", price: 1299, category: "Foundation" },
  "toffee-rose": { name: "Hydrating Matte Foundation · Toffee Rose", price: 1299, category: "Foundation" },

  // Lipsticks (₹1,099)
  "scarlet-rose-lipstick": { name: "Scarlet Rose Lipstick", price: 1099, category: "Lipsticks" },
  "roseberry-lipstick": { name: "Roseberry Lipstick", price: 1099, category: "Lipsticks" },
  "blush-rose-lipstick": { name: "Blush Rose Lipstick", price: 1099, category: "Lipsticks" },
  "orchid-lipstick": { name: "Orchid Lipstick", price: 1099, category: "Lipsticks" },

  // Blushes (₹899)
  "pink-blossom-blush": { name: "Pink Blossom Blush", price: 899, category: "Blushes" },
  "peach-blossom-blush": { name: "Peach Blossom Blush", price: 899, category: "Blushes" },
  "cherry-blossom-blush": { name: "Cherry Blossom Blush", price: 899, category: "Blushes" },

  // Highlighters (₹1,199)
  "molten-glow-highlighter": { name: "Molten Glow Highlighter · Sunflower", price: 1199, category: "Highlighter" },
  "sunflower": { name: "Molten Glow Highlighter · Sunflower", price: 1199, category: "Highlighter" },
  "moonflower-highlighter-oil": { name: "Moonflower Highlighter Oil", price: 1199, category: "Highlighter" },
  "moonflower": { name: "Moonflower Highlighter Oil", price: 1199, category: "Highlighter" },

  // Wardrobe Vault Set (₹3,299)
  "sheaura-discovery-wardrobe": { name: "She'Aura Discovery Wardrobe", price: 3299, category: "Collection" },
};

// Valid promo codes verified server-side
const PROMO_CODES: Record<string, { type: "percent" | "fixed"; value: number; minOrder: number }> = {
  "SHEAURA10": { type: "percent", value: 10, minOrder: 0 },
  "AURA10": { type: "percent", value: 10, minOrder: 0 },
  "HAUTE500": { type: "fixed", value: 500, minOrder: 1500 },
  "VIPFIRST": { type: "fixed", value: 300, minOrder: 999 },
  "FIRSTGLOW": { type: "percent", value: 15, minOrder: 1500 },
  "WELCOME500": { type: "fixed", value: 500, minOrder: 2500 },
  "SHEAURA20": { type: "percent", value: 20, minOrder: 2000 },
  "SAVE100": { type: "fixed", value: 100, minOrder: 499 },
};

export function calculateOrderTotals(items: CartItemInput[], promoCode?: string): CalculatedOrder {
  if (!items || items.length === 0) {
    throw new Error("Cannot calculate order: Bag is empty");
  }

  let subtotal = 0;
  const verifiedItems = items.map((item) => {
    const key = item.productId.toLowerCase().trim();
    const productInfo = OFFICIAL_PRICES[key];
    const unitPrice = productInfo ? productInfo.price : 1099; // Fallback to standard luxury lipstick price if custom
    const qty = Math.max(1, Math.min(20, Math.floor(item.quantity || 1)));
    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;

    return {
      productId: item.productId,
      name: item.name || productInfo?.name || "She'Aura Couture Piece",
      shade: item.shade || "Standard",
      unitPrice,
      quantity: qty,
      itemTotal,
    };
  });

  // Calculate promotional discount
  let discount = 0;
  if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) {
    const promo = PROMO_CODES[promoCode.toUpperCase()];
    if (subtotal >= promo.minOrder) {
      if (promo.type === "percent") {
        discount = Math.round((subtotal * promo.value) / 100);
      } else {
        discount = promo.value;
      }
    }
  }

  // Complimentary delivery on orders above ₹1,499
  const shipping = subtotal >= 1499 ? 0 : 150;
  const taxableAmount = Math.max(0, subtotal - discount);
  // Prices on SheAura are inclusive of GST taxes
  const tax = Math.round((taxableAmount * 18) / 118);
  const total = Math.max(0, taxableAmount + shipping);

  return {
    items: verifiedItems,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    currency: "INR",
  };
}
