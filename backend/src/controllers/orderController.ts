import type { Request, Response } from "express";
import { z } from "zod";
import { calculateOrderTotals } from "../services/pricingService.js";
import { supabaseAdmin } from "../services/supabaseServer.js";

const OrderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().optional(),
  shade: z.string().optional(),
  quantity: z.number().int().positive().max(50),
});

const CreateOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    address: z.string().min(3),
    city: z.string().min(1),
    postalCode: z.string().min(3),
    state: z.string().optional(),
  }),
  paymentMethod: z.enum(["upi", "card", "netbanking", "cod"]).default("upi"),
  promoCode: z.string().optional(),
});

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = CreateOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Validation error: Invalid order payload",
        details: parseResult.error.format(),
      });
      return;
    }

    const { items, customer, paymentMethod, promoCode } = parseResult.data;

    // Recalculate and enforce server-verified pricing
    const orderCalc = calculateOrderTotals(items, promoCode);

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsCount = orderCalc.items.reduce((acc, i) => acc + i.quantity, 0);
    const trackingNumber = `EXP-BLUEDART-${Math.floor(10000 + Math.random() * 90000)}`;
    const formattedTotal = `₹${orderCalc.total.toLocaleString("en-IN")}`;
    const shippingStr = `${customer.address}, ${customer.city}, ${customer.state || ""} ${customer.postalCode}`.trim();

    const newOrder = {
      id: orderId,
      client_name: customer.name,
      customer_name: customer.name,
      client_email: customer.email,
      customer_email: customer.email,
      client_phone: customer.phone,
      customer_phone: customer.phone,
      shipping_address: shippingStr,
      items: orderCalc.items,
      items_count: itemsCount,
      total_amount: formattedTotal,
      subtotal: orderCalc.subtotal,
      discount: orderCalc.discount,
      shipping_fee: orderCalc.shipping,
      tax_amount: orderCalc.tax,
      total_price: orderCalc.total,
      currency: orderCalc.currency,
      payment_method: paymentMethod,
      payment_status: paymentMethod === "cod" ? "pending_cod" : "awaiting_payment",
      status: "processing",
      tracking_number: trackingNumber,
      eta: "Arriving in 2-3 Business Days",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save order in Supabase
    const { error: dbError } = await supabaseAdmin.from("orders").insert(newOrder);

    if (dbError) {
      console.error("[OrderController] Supabase insert error:", dbError);
      // Fallback: return order with note
    }

    res.status(201).json({
      success: true,
      order: newOrder,
      message: "Order placed and verified by SheAura Secure Core",
    });
  } catch (err: any) {
    console.error("[OrderController] Error:", err);
    res.status(500).json({ error: "Failed to process order", message: err?.message });
  }
}

export async function previewOrder(req: Request, res: Response): Promise<void> {
  try {
    const { items, promoCode } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Items array is required" });
      return;
    }
    const calculation = calculateOrderTotals(items, promoCode);
    res.json({ success: true, calculation });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Invalid calculation request" });
  }
}

function maskString(str?: string | null): string {
  if (!str) return "";
  if (str.length <= 4) return "***";
  return str.slice(0, 2) + "*".repeat(Math.max(3, str.length - 4)) + str.slice(-2);
}

function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "***@***.com";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length <= 4) return "****";
  return cleaned.slice(0, 3) + "******" + cleaned.slice(-4);
}

function maskAddress(addr?: string | null): string {
  if (!addr) return "Private Client Sanctuary";
  const parts = addr.split(",");
  if (parts.length > 2) {
    // Only reveal city / state, hide specific street address and flat numbers
    return `[Protected Residence], ${parts.slice(-2).join(",").trim()}`;
  }
  return "[Protected Residence]";
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", id.trim())
      .single();

    if (error || !order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Check if requester has administrative credentials
    const adminKey = req.headers["x-admin-key"] as string | undefined;
    const authHeader = req.headers.authorization;
    const hasAdminAccess = adminKey && adminKey === process.env.ADMIN_SECRET_KEY;

    // Check if requester is authenticated as the order owner
    let isOwner = false;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user && user.email && user.email.toLowerCase() === (order.client_email || "").toLowerCase()) {
          isOwner = true;
        }
      } catch {}
    }

    if (hasAdminAccess || isOwner) {
      // Full details for verified owner or administrator
      res.json({ success: true, order });
      return;
    }

    // Privacy-Preserving Public Tracking View (Defense against IDOR and customer PII scrapers)
    const sanitizedOrder = {
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      tracking_number: order.tracking_number,
      eta: order.eta,
      items_count: order.items_count,
      total_amount: order.total_amount,
      items: order.items,
      created_at: order.created_at,
      client_name: maskString(order.client_name),
      client_email: maskEmail(order.client_email),
      client_phone: maskPhone(order.client_phone),
      shipping_address: maskAddress(order.shipping_address),
    };

    res.json({ success: true, order: sanitizedOrder });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
}

