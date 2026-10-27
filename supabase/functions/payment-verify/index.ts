// Supabase Edge Function: Cryptographic Payment Verification (HMAC-SHA256)
// Deploy via: npx supabase functions deploy payment-verify --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, gatewayOrderId, paymentId, signature } = await req.json();

    if (!orderId || !paymentId || !gatewayOrderId || !signature) {
      return new Response(
        JSON.stringify({
          error: "Missing mandatory cryptographic verification parameters (orderId, gatewayOrderId, paymentId, signature are required)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Cryptographic HMAC Verification
    const expected = await hmacSha256(razorpaySecret || "rzp_secret_placeholder", `${gatewayOrderId}|${paymentId}`);
    if (expected.toLowerCase() !== String(signature).toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Cryptographic signature mismatch: Untrusted payment attempt" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update order status securely
    await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        gateway_payment_id: paymentId,
        gateway_order_id: gatewayOrderId,
        status: "processing",
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment cryptographically verified by Supabase Edge",
        orderId,
        paymentId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Payment verification failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
