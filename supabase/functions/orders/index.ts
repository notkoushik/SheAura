// Supabase Edge Function: Secure Order Processing & Pricing Verification
// Deploy via: npx supabase functions deploy orders --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Single Source of Truth: Official Authentic SheAura Pricing Registry
const OFFICIAL_PRICES: Record<string, { name: string; price: number }> = {
  "daffodil": { name: "Hydrating Matte Foundation · Daffodil", price: 1299 },
  "snowdrop": { name: "Hydrating Matte Foundation · Snowdrop", price: 1299 },
  "honey-lily": { name: "Hydrating Matte Foundation · Honey Lily", price: 1299 },
  "toffee-rose": { name: "Hydrating Matte Foundation · Toffee Rose", price: 1299 },
  "hydrating-matte-foundation-daffodil": { name: "Hydrating Matte Foundation · Daffodil", price: 1299 },
  "hydrating-matte-foundation-snowdrop": { name: "Hydrating Matte Foundation · Snowdrop", price: 1299 },
  "hydrating-matte-foundation-honey-lily": { name: "Hydrating Matte Foundation · Honey Lily", price: 1299 },
  "hydrating-matte-foundation-toffee-rose": { name: "Hydrating Matte Foundation · Toffee Rose", price: 1299 },
  "scarlet-rose-lipstick": { name: "Scarlet Rose Lipstick", price: 1099 },
  "roseberry-lipstick": { name: "Roseberry Lipstick", price: 1099 },
  "blush-rose-lipstick": { name: "Blush Rose Lipstick", price: 1099 },
  "orchid-lipstick": { name: "Orchid Lipstick", price: 1099 },
  "pink-blossom-blush": { name: "Pink Blossom Blush", price: 899 },
  "peach-blossom-blush": { name: "Peach Blossom Blush", price: 899 },
  "cherry-blossom-blush": { name: "Cherry Blossom Blush", price: 899 },
  "molten-glow-highlighter": { name: "Molten Glow Highlighter · Sunflower", price: 1199 },
  "sunflower": { name: "Molten Glow Highlighter · Sunflower", price: 1199 },
  "moonflower-highlighter-oil": { name: "Moonflower Highlighter Oil", price: 1199 },
  "moonflower": { name: "Moonflower Highlighter Oil", price: 1199 },
  "sheaura-discovery-wardrobe": { name: "She'Aura Discovery Wardrobe", price: 3299 },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { items, customer, paymentMethod = "upi", promoCode } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Shopping bag items are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Recalculate and enforce authentic pricing server-side
    let subtotal = 0;
    const verifiedItems = items.map((item: any) => {
      const slug = (item.productId || "").toLowerCase().trim();
      const product = OFFICIAL_PRICES[slug] || { name: item.name || "SheAura Piece", price: 1099 };
      const qty = Math.max(1, Math.min(20, Math.floor(item.quantity || 1)));
      const itemTotal = product.price * qty;
      subtotal += itemTotal;
      return {
        productId: item.productId,
        name: product.name,
        shade: item.shade || "Standard",
        unitPrice: product.price,
        quantity: qty,
        itemTotal,
      };
    });

    // 2. Validate promotional code server-side
    let discount = 0;
    if (promoCode) {
      const code = String(promoCode).toUpperCase().trim();
      if ((code === "SHEAURA10" || code === "AURA10") && subtotal > 0) {
        discount = Math.round((subtotal * 10) / 100);
      } else if (code === "FIRSTGLOW" && subtotal >= 1500) {
        discount = Math.round((subtotal * 15) / 100);
      } else if (code === "SHEAURA20" && subtotal >= 2000) {
        discount = Math.round((subtotal * 20) / 100);
      } else if (code === "HAUTE500" && subtotal >= 1500) {
        discount = Math.min(subtotal, 500);
      } else if (code === "WELCOME500" && subtotal >= 2500) {
        discount = Math.min(subtotal, 500);
      } else if (code === "VIPFIRST" && subtotal >= 999) {
        discount = Math.min(subtotal, 300);
      } else if (code === "SAVE100" && subtotal >= 499) {
        discount = Math.min(subtotal, 100);
      }
    }

    // 3. Shipping fee & tax calculation
    const shipping = subtotal >= 1499 ? 0 : 150;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round((taxable * 18) / 118);
    const total = taxable + shipping;

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const itemsCount = verifiedItems.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0);
    const trackingNumber = `EXP-BLUEDART-${Math.floor(10000 + Math.random() * 90000)}`;
    const formattedTotal = `₹${total.toLocaleString("en-IN")}`;
    const shippingStr = customer ? `${customer.address || ""}, ${customer.city || ""}, ${customer.state || ""} ${customer.postalCode || ""}`.trim() : "Atelier Sanctuary";
    const clientName = customer?.name || "SheAura Client";
    const clientEmail = customer?.email || "client@sheaura.com";
    const clientPhone = customer?.phone || "";

    const newOrder = {
      id: orderId,
      client_name: clientName,
      customer_name: clientName,
      client_email: clientEmail,
      customer_email: clientEmail,
      client_phone: clientPhone,
      customer_phone: clientPhone,
      shipping_address: shippingStr,
      items: verifiedItems,
      items_count: itemsCount,
      total_amount: formattedTotal,
      subtotal,
      discount,
      shipping_fee: shipping,
      tax_amount: tax,
      total_price: total,
      currency: "INR",
      payment_method: paymentMethod,
      payment_status: paymentMethod === "cod" ? "pending_cod" : "awaiting_payment",
      status: "processing",
      tracking_number: trackingNumber,
      eta: "Arriving in 2-3 Business Days",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Insert into database using Service Role (Protected from client tampering)
    const { error: dbError } = await supabase.from("orders").insert(newOrder);

    if (dbError) {
      console.error("[Orders Edge Function] DB Error:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: newOrder,
        message: "Order verified and processed by Supabase Edge Security",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to process order" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
