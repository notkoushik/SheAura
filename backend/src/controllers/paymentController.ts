import type { Request, Response } from "express";
import crypto from "crypto";
import { config } from "../config.js";
import { supabaseAdmin } from "../services/supabaseServer.js";
import { timingSafeCompare } from "../middleware/auth.js";

/**
 * Initialize Cryptographic Payment Intent
 * Enforces server-authoritative pricing (never trusts client-supplied payment amounts)
 */
export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  try {
    const { orderId, amount: clientAmount, currency = "INR" } = req.body;

    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      res.status(400).json({ error: "Missing or invalid orderId parameter" });
      return;
    }

    // 1. Fetch authoritative order from Supabase database
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, total_price, payment_status, currency")
      .eq("id", orderId.trim())
      .single();

    if (orderError || !order) {
      res.status(404).json({ error: "Order not found in SheAura database" });
      return;
    }

    // 2. Prevent creating intents for already settled orders
    if (order.payment_status === "paid") {
      res.status(400).json({ error: "Order has already been paid and finalized" });
      return;
    }

    const authoritativeAmount = Number(order.total_price);
    if (!authoritativeAmount || authoritativeAmount <= 0) {
      res.status(500).json({ error: "Invalid order amount recorded in database" });
      return;
    }

    // 3. Price Tampering Defense: Detect and reject client modifications
    if (clientAmount !== undefined && clientAmount !== null && Number(clientAmount) !== authoritativeAmount) {
      res.status(400).json({
        error: "Price tampering detected: Client amount does not match authoritative database amount",
        expected: authoritativeAmount,
        received: clientAmount,
      });
      return;
    }

    // 4. Generate unique gateway order reference
    const gatewayOrderId = `rzp_order_${Date.now().toString(36)}_${Math.floor(1000 + Math.random() * 9000)}`;

    res.json({
      success: true,
      gatewayOrderId,
      amount: authoritativeAmount,
      currency: order.currency || currency,
      keyId: config.payments.razorpayKeyId || "rzp_test_placeholder",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to initialize payment gateway", details: err?.message });
  }
}

/**
 * Verify Cryptographic Payment Signature
 * Enforces:
 * 1. Strict mandatory signature, paymentId, gatewayOrderId, and orderId parameters
 * 2. Constant-time HMAC-SHA256 signature verification
 * 3. Replay attack and state collision prevention (idempotency)
 */
export async function verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const { orderId, gatewayOrderId, paymentId, signature } = req.body;

    // Strict validation of mandatory cryptographic parameters
    if (
      !orderId || typeof orderId !== "string" || orderId.trim() === "" ||
      !paymentId || typeof paymentId !== "string" || paymentId.trim() === "" ||
      !gatewayOrderId || typeof gatewayOrderId !== "string" || gatewayOrderId.trim() === "" ||
      !signature || typeof signature !== "string" || signature.trim() === ""
    ) {
      res.status(400).json({
        error: "Missing or invalid payment verification parameters. All cryptographic fields (orderId, gatewayOrderId, paymentId, signature) are mandatory.",
      });
      return;
    }

    const trimmedOrderId = orderId.trim();
    const trimmedGatewayOrderId = gatewayOrderId.trim();
    const trimmedPaymentId = paymentId.trim();
    const trimmedSignature = signature.trim();

    // 1. Check order existence and status in Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, total_price, payment_status, gateway_payment_id")
      .eq("id", trimmedOrderId)
      .single();

    if (orderError || !order) {
      res.status(404).json({ error: "Order not found in database for verification" });
      return;
    }

    // 2. Replay attack & idempotency defense
    if (order.payment_status === "paid") {
      if (order.gateway_payment_id === trimmedPaymentId) {
        res.json({
          success: true,
          message: "Payment already verified and finalized (idempotent acknowledgement)",
          orderId: trimmedOrderId,
          paymentId: trimmedPaymentId,
        });
        return;
      } else {
        res.status(409).json({
          error: "Payment conflict: Order is already marked paid under a different payment reference",
        });
        return;
      }
    }

    // 3. Cryptographic HMAC-SHA256 signature verification
    const secret = config.payments.razorpayKeySecret || "rzp_secret_placeholder";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${trimmedGatewayOrderId}|${trimmedPaymentId}`)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    if (!timingSafeCompare(expectedSignature, trimmedSignature)) {
      res.status(400).json({
        error: "Cryptographic signature mismatch: Untrusted or forged payment detected",
      });
      return;
    }

    // 4. Update order status atomically in Supabase
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        gateway_payment_id: trimmedPaymentId,
        gateway_order_id: trimmedGatewayOrderId,
        status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", trimmedOrderId);

    if (updateError) {
      console.error("[PaymentController] Failed to persist payment update:", updateError);
      res.status(500).json({ error: "Database error while updating order status" });
      return;
    }

    res.json({
      success: true,
      message: "Payment cryptographically verified by SheAura Security Engine",
      orderId: trimmedOrderId,
      paymentId: trimmedPaymentId,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Payment verification error", details: err?.message });
  }
}

