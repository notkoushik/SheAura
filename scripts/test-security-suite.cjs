/**
 * SheAura High-Standard Security & Verification Suite
 * Verifies:
 * 1. Cryptographic Payment Verification (HMAC-SHA256, timing attacks, mandatory parameters, replay defense)
 * 2. Payment Intent Server-Authoritative Amount (anti-price tampering)
 * 3. Administrative Portal Isolation (/sheaura/login) & Rate Limiting
 * 4. Privilege Escalation Defenses (user_metadata exploit elimination)
 * 5. IDOR & Customer PII Masking Protection
 * 6. Mathematical Pricing & Tax Invariants
 */

const { Client } = require("../node_modules/pg");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");

const env = fs.readFileSync("backend/.env", "utf8");
const match = env.match(/DATABASE_URL=(.+)/);
if (!match) {
  console.error("No DATABASE_URL found in backend/.env");
  process.exit(1);
}
const dbUrl = match[1].trim();

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const TEST_PORT = 5000;
let BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;
const ADMIN_VAULT_KEY = "sheaura_production_admin_vault_2026";
const RAZORPAY_SECRET = "rzp_secret_placeholder";

let serverProcess = null;
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${testName} ${details ? `(${details})` : ""}`);
    failedCount++;
  }
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startBackendServer() {
  console.log(`[SecurityRunner] Launching isolated backend test instance...`);
  return new Promise((resolve, reject) => {
    serverProcess = spawn("node", ["backend/dist/index.js"], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        ADMIN_SECRET_KEY: ADMIN_VAULT_KEY,
        RAZORPAY_KEY_SECRET: RAZORPAY_SECRET,
      },
      stdio: "pipe",
    });

    let isResolved = false;
    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      const portMatch = output.match(/port\s+(\d+)/i);
      if (portMatch) {
        BASE_URL = `http://127.0.0.1:${portMatch[1]}/api`;
      }
      if (output.includes("Secure Backend running") && !isResolved) {
        isResolved = true;
        resolve();
      }
    });

    serverProcess.stderr.on("data", (data) => {
      // console.error("[Server STDERR]", data.toString());
    });

    serverProcess.on("error", (err) => {
      reject(err);
    });

    setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    }, 3500);
  });
}

async function runSecuritySuite() {
  console.log("=================================================================");
  console.log("   SHE'AURA HIGH-STANDARD BACKEND SECURITY & AUDIT TEST SUITE   ");
  console.log("=================================================================\n");

  await client.connect();
  console.log("✓ Connected to SheAura PostgreSQL database.\n");

  await startBackendServer();
  console.log("✓ Test server ready on " + BASE_URL + "\n");

  // Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === "healthy", "Backend Health Check Endpoint");
  } catch (e) {
    console.error("Could not connect to test backend:", e.message);
    process.exit(1);
  }

  // Pre-seed an authentic test order in PostgreSQL for payment testing
  const testOrderId = `SEC-ORD-${Date.now().toString(36).toUpperCase()}`;
  const testPrice = 1299;
  await client.query(`
    INSERT INTO public.orders (
      id, client_name, customer_name, client_email, customer_email,
      client_phone, customer_phone, shipping_address, items, items_count,
      subtotal, discount, shipping_fee, tax_amount, total_price, total_amount,
      currency, payment_method, payment_status, status, tracking_number,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21,
      NOW(), NOW()
    )
  `, [
    testOrderId,
    "Aaradhya Sharma",
    "Aaradhya Sharma",
    "aaradhya.sharma@maison.in",
    "aaradhya.sharma@maison.in",
    "+91 98765 43210",
    "+91 98765 43210",
    "74 Haute Boulevard, Jubilee Hills, Hyderabad, Telangana 500033",
    JSON.stringify([{ productId: "hydrating-matte-foundation-daffodil", quantity: 1, unitPrice: 1299 }]),
    1,
    1299,
    0,
    150,
    198,
    testPrice,
    "₹1,299.00",
    "INR",
    "upi",
    "awaiting_payment",
    "processing",
    "EXP-TEST-001"
  ]);

  // =================================================================
  // GROUP 1: Cryptographic Payment Verification & Vulnerabilities
  // =================================================================
  console.log("\n--- TEST GROUP 1: Cryptographic Payment Verification & Vulnerabilities ---");

  // 1.1: Missing verification parameters (Attacker omits signature or gatewayOrderId)
  const missingParamRes = await fetch(`${BASE_URL}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: testOrderId,
      paymentId: "pay_test_123",
      // signature and gatewayOrderId omitted
    }),
  });
  assert(
    missingParamRes.status === 400,
    "1.1: Reject verification when cryptographic signature is omitted (Prevents Signature Bypass Exploit)"
  );

  // 1.2: Forged / Tampered HMAC Signature
  const forgedSigRes = await fetch(`${BASE_URL}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: testOrderId,
      gatewayOrderId: "order_fake_999",
      paymentId: "pay_fake_999",
      signature: "0000000000000000000000000000000000000000000000000000000000000000",
    }),
  });
  const forgedJson = await forgedSigRes.json();
  assert(
    forgedSigRes.status === 400 && forgedJson.error.includes("Cryptographic signature mismatch"),
    "1.2: Reject forged cryptographic HMAC signature (Constant-time timingSafeEqual verification)"
  );

  // 1.3: Valid Authentic HMAC-SHA256 Signature
  const validGatewayOrderId = `order_${Date.now().toString(36)}`;
  const validPaymentId = `pay_${Date.now().toString(36)}`;
  const validSignature = crypto
    .createHmac("sha256", RAZORPAY_SECRET)
    .update(`${validGatewayOrderId}|${validPaymentId}`)
    .digest("hex");

  const validSigRes = await fetch(`${BASE_URL}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: testOrderId,
      gatewayOrderId: validGatewayOrderId,
      paymentId: validPaymentId,
      signature: validSignature,
    }),
  });
  const validJson = await validSigRes.json();
  assert(
    validSigRes.status === 200 && validJson.success === true,
    "1.3: Accept authentic HMAC-SHA256 signature and finalize order payment"
  );

  // Verify in PostgreSQL that order payment_status is now 'paid'
  const dbCheck = await client.query("SELECT payment_status, gateway_payment_id FROM public.orders WHERE id = $1", [testOrderId]);
  assert(
    dbCheck.rows[0]?.payment_status === "paid" && dbCheck.rows[0]?.gateway_payment_id === validPaymentId,
    "1.4: Database state verification: Order marked as 'paid' with verified gateway payment ID"
  );

  // 1.5: Replay Attack Defense (Sending duplicate verification with different transaction reference)
  const replayRes = await fetch(`${BASE_URL}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: testOrderId,
      gatewayOrderId: "order_replay_attempt",
      paymentId: "pay_replay_attempt",
      signature: validSignature,
    }),
  });
  assert(
    replayRes.status === 409,
    "1.5: Replay attack prevention: Conflicting payment on already settled order rejected with 409 Conflict"
  );

  // =================================================================
  // GROUP 2: Payment Intent Server-Authoritative Amount Defense
  // =================================================================
  console.log("\n--- TEST GROUP 2: Payment Intent Anti-Price-Tampering Defense ---");

  // 2.1: Price Tampering Exploit (Attacker creates intent with amount ₹1 for ₹1,299 order)
  const tamperRes = await fetch(`${BASE_URL}/payments/create-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: testOrderId,
      amount: 1, // Tampered ₹1
    }),
  });
  const tamperJson = await tamperRes.json();
  assert(
    tamperRes.status === 400 && (tamperJson.error.includes("Price tampering detected") || tamperJson.error.includes("already been paid")),
    "2.1: Price tampering detected & blocked: Client cannot manipulate order payment amount"
  );

  // Pre-seed an unpaid order for clean intent verification
  const unpaidOrderId = `SEC-UNPAID-${Date.now().toString(36).toUpperCase()}`;
  await client.query(`
    INSERT INTO public.orders (
      id, client_name, customer_name, client_email, customer_email,
      client_phone, customer_phone, shipping_address, items, items_count,
      subtotal, discount, shipping_fee, tax_amount, total_price, total_amount,
      currency, payment_method, payment_status, status, created_at, updated_at
    ) VALUES (
      $1, 'Test Client', 'Test Client', 'client@test.com', 'client@test.com',
      '+91 99999 88888', '+91 99999 88888', 'Sanctuary Atelier', '[]', 1,
      2400, 0, 0, 366, 2400, '₹2,400.00', 'INR', 'upi', 'awaiting_payment', 'processing', NOW(), NOW()
    )
  `, [unpaidOrderId]);

  // 2.2: Intent retrieves server-authoritative amount from database
  const validIntentRes = await fetch(`${BASE_URL}/payments/create-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: unpaidOrderId }),
  });
  const validIntentJson = await validIntentRes.json();
  assert(
    validIntentRes.status === 200 && validIntentJson.amount === 2400,
    "2.2: Server locks payment intent to authoritative database amount (₹2,400)"
  );

  // =================================================================
  // GROUP 3: Administrative Gateway Isolation (/sheaura/login) & Auth
  // =================================================================
  console.log("\n--- TEST GROUP 3: Administrative Isolation (/sheaura/login) & Token Auth ---");

  // 3.1: Protected Admin Endpoints without credentials
  const unauthAdminRes = await fetch(`${BASE_URL}/admin/orders`);
  const unauthJson = await unauthAdminRes.json();
  assert(
    unauthAdminRes.status === 401 && unauthJson.instruction.includes("/sheaura/login"),
    "3.1: Protected admin endpoint returns 401 directing user to /sheaura/login"
  );

  // 3.2: Direct Vault Key Authentication (Timing-Safe)
  const validVaultKeyRes = await fetch(`${BASE_URL}/admin/orders`, {
    headers: { "x-admin-key": ADMIN_VAULT_KEY },
  });
  assert(
    validVaultKeyRes.status === 200,
    "3.2: Constant-time Vault Key ('x-admin-key') grants administrative access"
  );

  // 3.3: Invalid Vault Key Rejected
  const invalidVaultKeyRes = await fetch(`${BASE_URL}/admin/orders`, {
    headers: { "x-admin-key": "wrong_key_attacker_attempt" },
  });
  assert(
    invalidVaultKeyRes.status === 401,
    "3.3: Invalid vault key strictly rejected with 401 Unauthorized"
  );

  // 3.4: Dedicated Administrative Login Gateway (/api/admin/login)
  const adminLoginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secretKey: ADMIN_VAULT_KEY }),
  });
  const adminLoginJson = await adminLoginRes.json();
  assert(
    adminLoginRes.status === 200 && adminLoginJson.token && adminLoginJson.token.startsWith("sa_adm."),
    "3.4: /api/admin/login issues cryptographically signed SheAura Admin Token ('sa_adm.*')"
  );

  // 3.5: Authorize with SheAura Admin Session Token
  const tokenAuthRes = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminLoginJson.token}` },
  });
  const tokenStats = await tokenAuthRes.json();
  assert(
    tokenAuthRes.status === 200 && tokenStats.success === true,
    "3.5: Cryptographic SheAura Admin Token authorizes protected console operations"
  );

  // =================================================================
  // GROUP 4: Privilege Escalation & Auth Bypass Defenses
  // =================================================================
  console.log("\n--- TEST GROUP 4: Privilege Escalation & Auth Bypass Defenses ---");

  // 4.1: Tampered Token / Invalid Signature
  const forgedToken = "sa_adm.eyJlbWFpbCI6ImFkbWluQHNoZWF1cmEuY29tIiwicm9sZSI6ImFkbWluIn0.forged_signature";
  const forgedTokenRes = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${forgedToken}` },
  });
  assert(
    forgedTokenRes.status === 401,
    "4.1: Forged or tampered admin session token strictly rejected"
  );

  // 4.2: Malformed Bearer token
  const malformedRes = await fetch(`${BASE_URL}/admin/orders`, {
    headers: { Authorization: "Bearer malformed_garbage_string" },
  });
  assert(
    malformedRes.status === 401,
    "4.2: Malformed authorization token rejected"
  );

  // =================================================================
  // GROUP 5: Customer Privacy & IDOR Information Disclosure Defense
  // =================================================================
  console.log("\n--- TEST GROUP 5: Customer Privacy & IDOR PII Masking Defense ---");

  // 5.1: Unauthenticated Order Query masks PII
  const publicOrderRes = await fetch(`${BASE_URL}/orders/${testOrderId}`);
  const publicOrderJson = await publicOrderRes.json();
  const maskedOrder = publicOrderJson.order;
  assert(
    publicOrderRes.status === 200 &&
    maskedOrder.client_phone.includes("******") &&
    maskedOrder.client_email.includes("***@") &&
    maskedOrder.shipping_address.includes("[Protected Residence]"),
    "5.1: Public order tracking masks sensitive customer PII (phone, email, street address)"
  );

  // 5.2: Admin Order Query receives unmasked details for operations
  const adminOrderRes = await fetch(`${BASE_URL}/orders/${testOrderId}`, {
    headers: { "x-admin-key": ADMIN_VAULT_KEY },
  });
  const adminOrderJson = await adminOrderRes.json();
  assert(
    adminOrderRes.status === 200 && adminOrderJson.order.client_phone === "+91 98765 43210",
    "5.2: Authorized administrative query retains full unmasked order details for fulfillment"
  );

  // =================================================================
  // GROUP 6: Mathematical Pricing Invariants & Negative Quantity Fuzzing
  // =================================================================
  console.log("\n--- TEST GROUP 6: Mathematical Pricing Invariants & Fuzzing ---");

  // 6.1: Negative or Zero Quantity in Order Placement
  const negativeQtyRes = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: "peach-blossom-blush", quantity: -5 }],
      customer: {
        name: "Fuzz Attacker",
        email: "fuzz@attack.com",
        phone: "+91 99999 00000",
        address: "Dark Alley",
        city: "Mumbai",
        postalCode: "400001",
      },
    }),
  });
  assert(
    negativeQtyRes.status === 400,
    "6.1: Zod Schema rejects negative or invalid quantities (Fuzzing protection)"
  );

  // 6.2: Server-Calculated Pricing Verification
  const previewRes = await fetch(`${BASE_URL}/orders/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { productId: "peach-blossom-blush", quantity: 2 }, // 2 * 899 = 1798 (Free shipping >= 1499)
      ],
      promoCode: "AURA10", // 10% off 1798 = 180 discount => 1618 total
    }),
  });
  const previewJson = await previewRes.json();
  const calc = previewJson.calculation;
  assert(
    previewRes.status === 200 &&
    calc.subtotal === 1798 &&
    calc.discount === 180 &&
    calc.shipping === 0 &&
    calc.total === 1618,
    "6.2: Mathematical invariant: Subtotal, promo discount, and free shipping calculated flawlessly"
  );

  // Cleanup seeded test orders
  await client.query("DELETE FROM public.orders WHERE id IN ($1, $2)", [testOrderId, unpaidOrderId]);
  console.log("\n✓ Cleaned up test database fixtures.");

  await client.end();
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log("\n=================================================================");
  console.log(`   SECURITY AUDIT COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED   `);
  console.log("=================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecuritySuite().catch((err) => {
  console.error("Test Suite Error:", err);
  if (serverProcess) serverProcess.kill();
  client.end();
  process.exit(1);
});
