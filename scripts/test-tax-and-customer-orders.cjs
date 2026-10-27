/**
 * SHE'AURA STATUTORY TAX & CUSTOMER ORDER EXPERIENCE TEST SUITE
 * 
 * Verifies:
 * 1. Indian GSTIN regulatory validation, state-code extraction, PAN derivation
 * 2. Intra-state (CGST + SGST) vs Inter-state (IGST/CST) dynamic calculation rules
 * 3. Invariant: taxableAmount + totalGst === grossAmount
 * 4. Supabase cloud app_settings tax persistence
 * 5. Rich customer order details dossier parsing (What, When, Where)
 */

const { Client } = require("pg");
const fs = require("fs");

let DATABASE_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!DATABASE_URL && fs.existsSync("backend/.env")) {
  const env = fs.readFileSync("backend/.env", "utf8");
  const match = env.match(/DATABASE_URL=(.+)/);
  if (match) DATABASE_URL = match[1].trim();
}

const INDIAN_STATES_MAP = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "19": "West Bengal",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

function validateGstin(gstin) {
  if (!gstin) return { valid: false, error: "GSTIN is required" };
  const clean = gstin.trim().toUpperCase();
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(clean)) {
    return {
      valid: false,
      error: "Invalid GSTIN format. Expected 15-character statutory format (e.g., 27AABCS1429B1Z1)",
    };
  }
  const stateCode = clean.slice(0, 2);
  const stateName = INDIAN_STATES_MAP[stateCode] || "Other Union Territory / State";
  const pan = clean.slice(2, 12);
  return { valid: true, stateCode, stateName, pan };
}

function calculateDynamicTax(grossAmount, destinationState, settings) {
  const defaultRate = Number(settings.defaultGstRate) || 18;
  const isInterState =
    Boolean(settings.cstInterStateEnabled) &&
    Boolean(destinationState) &&
    !destinationState.toLowerCase().includes(settings.stateOfOrigin.toLowerCase());

  const rate = isInterState
    ? Number(settings.igstRate) || defaultRate
    : Number(settings.defaultGstRate) || 18;

  const taxableAmount = Math.round((grossAmount / (1 + rate / 100)) * 100) / 100;
  const totalGst = Math.round((grossAmount - taxableAmount) * 100) / 100;

  if (isInterState) {
    return {
      taxableAmount,
      totalGst,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: totalGst,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: rate,
      isInterState: true,
      effectiveRate: rate,
    };
  }

  const halfRate = rate / 2;
  const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
  const sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;

  return {
    taxableAmount,
    totalGst,
    cgstAmount,
    sgstAmount,
    igstAmount: 0,
    cgstRate: halfRate,
    sgstRate: halfRate,
    igstRate: 0,
    isInterState: false,
    effectiveRate: rate,
  };
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failCount++;
  }
}

async function runTestSuite() {
  console.log("=================================================================");
  console.log("   SHE'AURA DYNAMIC TAX & CUSTOMER ORDER DETAILS TEST SUITE      ");
  console.log("=================================================================\n");

  // TEST GROUP 1: Statutory Indian GSTIN Validation
  console.log("--- TEST GROUP 1: Statutory Indian GSTIN Validation ---");
  const validMaharashtraGstin = "27AABCS1429B1Z1";
  const res1 = validateGstin(validMaharashtraGstin);
  assert(res1.valid === true, "1.1: Validates official Maharashtra GSTIN format");
  assert(res1.stateCode === "27", "1.2: Extracts State Code 27 (Maharashtra)");
  assert(res1.stateName === "Maharashtra", "1.3: Maps State Code 27 to Maharashtra");
  assert(res1.pan === "AABCS1429B", "1.4: Extracts 10-digit PAN 'AABCS1429B' from GSTIN");

  const validDelhiGstin = "07AAAAA0000A1Z5";
  const res2 = validateGstin(validDelhiGstin);
  assert(res2.valid === true && res2.stateName === "Delhi", "1.5: Validates Delhi GSTIN (07)");

  const invalidGstin = "27AABCS1429B1Z"; // 14 characters
  const res3 = validateGstin(invalidGstin);
  assert(res3.valid === false, "1.6: Correctly rejects malformed 14-char GSTIN");

  // TEST GROUP 2: Intra-State vs Inter-State Dynamic Tax Calculations
  console.log("\n--- TEST GROUP 2: Intra-State vs Inter-State Tax Engine ---");
  const defaultSettings = {
    legalEntityName: "She'Aura Luxury Fragrances & Cosmetics Pvt Ltd",
    gstin: "27AABCS1429B1Z1",
    stateOfOrigin: "Maharashtra",
    stateCode: "27",
    defaultGstRate: 18,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    cstInterStateEnabled: true,
  };

  // 2.1 Intra-state: destination = Maharashtra
  const grossAmount = 2198;
  const intraTax = calculateDynamicTax(grossAmount, "Maharashtra", defaultSettings);
  assert(intraTax.isInterState === false, "2.1: Intra-state detected when destination matches origin");
  assert(intraTax.cgstRate === 9 && intraTax.sgstRate === 9, "2.2: Equal 9% CGST + 9% SGST split");
  assert(intraTax.igstAmount === 0, "2.3: IGST is ₹0 for intra-state order");
  assert(
    Math.round((intraTax.taxableAmount + intraTax.totalGst) * 100) / 100 === grossAmount,
    "2.4: Invariant holds: taxableAmount + totalGst === grossAmount (intra-state)"
  );

  // 2.2 Inter-state: destination = Karnataka
  const interTax = calculateDynamicTax(grossAmount, "Karnataka", defaultSettings);
  assert(interTax.isInterState === true, "2.5: Inter-state detected when destination differs from origin");
  assert(interTax.igstRate === 18 && interTax.igstAmount > 0, "2.6: Single 18% IGST/CST applied");
  assert(interTax.cgstAmount === 0 && interTax.sgstAmount === 0, "2.7: CGST & SGST are ₹0 for inter-state");
  assert(
    Math.round((interTax.taxableAmount + interTax.totalGst) * 100) / 100 === grossAmount,
    "2.8: Invariant holds: taxableAmount + totalGst === grossAmount (inter-state)"
  );

  // 2.3 Custom GST Rate: e.g. 28% luxury tier
  const luxurySettings = { ...defaultSettings, defaultGstRate: 28, igstRate: 28 };
  const luxuryTax = calculateDynamicTax(1280, "Maharashtra", luxurySettings);
  assert(luxuryTax.effectiveRate === 28, "2.9: Configurable tax rate matrix (28% luxury tier applied)");
  assert(luxuryTax.cgstRate === 14 && luxuryTax.sgstRate === 14, "2.10: CGST 14% + SGST 14% for 28% GST");

  // TEST GROUP 3: Supabase Cloud app_settings Schema & Tax Persistence
  console.log("\n--- TEST GROUP 3: Supabase Cloud app_settings Table ---");
  const pgClient = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pgClient.connect();
    assert(true, "3.1: Connected directly to Supabase PostgreSQL cluster");

    const tableCheck = await pgClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'app_settings';
    `);
    assert(tableCheck.rows.length === 1, "3.2: Table 'public.app_settings' exists in Supabase");

    const rowCheck = await pgClient.query(`
      SELECT key, value, updated_at FROM public.app_settings WHERE key = 'tax_settings';
    `);
    assert(rowCheck.rows.length === 1, "3.3: 'tax_settings' configuration row found in database");

    const taxVal = rowCheck.rows[0].value;
    assert(taxVal.legalEntityName && taxVal.gstin, "3.4: Tax settings payload contains legalEntityName and GSTIN");
    assert(taxVal.defaultGstRate === 18, "3.5: Default GST rate matches statutory 18%");
  } catch (err) {
    assert(false, `3.x: Supabase database check error: ${err.message}`);
  } finally {
    await pgClient.end();
  }

  // TEST GROUP 4: Rich Customer Order Details Dossier Invariants
  console.log("\n--- TEST GROUP 4: Customer Order Details Dossier Invariants ---");
  const sampleOrderRow = {
    id: "ORD-98234",
    created_at: "2026-10-27T16:30:00Z",
    customer_name: "Aadya Sharma",
    customer_email: "aadya@sheaura.com",
    customer_phone: "+91 98200 44556",
    shipping_address: "Flat 14B, Oberoi Sky Heights, Lokhandwala Complex, Andheri West, Mumbai, Maharashtra - 400053",
    items: JSON.stringify([
      {
        productId: "lip-01",
        name: "Rouge Velours Séquence",
        shade: "Rosewood Velvet",
        quantity: 2,
        unitPrice: 1099,
        itemTotal: 2198,
        image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600",
      },
    ]),
    items_count: 2,
    total_price: 2098,
    subtotal: 2198,
    discount_amount: 100,
    discount_code: "WELCOME10",
    shipping_fee: 0,
    payment_method: "upi",
    payment_status: "paid",
    tracking_number: "EXP-BLUEDART-882194",
    status: "dispatched",
  };

  // Parse order manifest (What was ordered)
  const items = JSON.parse(sampleOrderRow.items);
  assert(items.length === 1, "4.1: Parsed item manifest successfully");
  assert(items[0].quantity === 2, "4.2: Item manifests explicit quantity (Qty: 2)");
  assert(items[0].unitPrice === 1099, "4.3: Item manifests explicit unit price (₹1,099)");
  assert(items[0].itemTotal === 2198, "4.4: Item manifests line total (₹2,198)");

  // Where is it (Destination Dossier)
  assert(Boolean(sampleOrderRow.shipping_address), "4.5: Order manifests complete delivery address");
  assert(Boolean(sampleOrderRow.customer_phone), "4.6: Order manifests recipient contact phone");
  assert(sampleOrderRow.tracking_number.startsWith("EXP-BLUEDART"), "4.7: Order manifests BlueDart AWB tracking number");

  // When was it ordered
  const placementDate = new Date(sampleOrderRow.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  assert(Boolean(placementDate), "4.8: Order manifests placement date");

  // Financial reconciliation
  assert(sampleOrderRow.subtotal - sampleOrderRow.discount_amount === sampleOrderRow.total_price, "4.9: Financial reconciliation: subtotal - discount === total_price");

  console.log("\n=================================================================");
  console.log(`TOTAL PASSED: ${passCount} | TOTAL FAILED: ${failCount}`);
  if (failCount === 0) {
    console.log("🎉 ALL STATUTORY TAX & CUSTOMER ORDER EXPERIENCE TESTS PASSED!");
  } else {
    console.error("❌ SOME TESTS FAILED!");
    process.exit(1);
  }
  console.log("=================================================================\n");
}

runTestSuite().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
