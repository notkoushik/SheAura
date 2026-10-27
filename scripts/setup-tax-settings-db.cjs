const { Client } = require("pg");
const fs = require("fs");

const env = fs.readFileSync("backend/.env", "utf8");
const match = env.match(/DATABASE_URL=(.+)/);
if (!match) {
  console.error("No DATABASE_URL in backend/.env");
  process.exit(1);
}
const dbUrl = match[1].trim();
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function initTaxTable() {
  await client.connect();
  console.log("Connected to PostgreSQL database...");

  // Create app_settings table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.app_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz DEFAULT now()
    );
  `);
  console.log("public.app_settings table verified/created.");

  // Insert default tax settings if not already present
  const defaultTaxSettings = {
    legalEntityName: "She'Aura Haute Parfums & Cosmétiques Pvt. Ltd.",
    brandTradeName: "SHE'AURA",
    gstin: "07AABCS1429B1Z8",
    pan: "AABCS1429B",
    registeredAddress: "DLF Promenade, Luxury Mall Wing, Vasant Kunj, New Delhi 110070",
    stateOfOrigin: "Delhi",
    stateCode: "07",
    defaultGstRate: 18,
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
    cstInterStateEnabled: true,
    hsnCosmetics: "33041000",
    hsnPerfumery: "33030010",
    invoicePrefix: "INV-2026",
    updatedAt: new Date().toISOString(),
    updatedBy: "System Director"
  };

  await client.query(`
    INSERT INTO public.app_settings (key, value, updated_at)
    VALUES ('tax_settings', $1, now())
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, updated_at = now();
  `, [JSON.stringify(defaultTaxSettings)]);

  console.log("Default tax_settings initialized in public.app_settings.");

  const check = await client.query(`SELECT * FROM public.app_settings WHERE key = 'tax_settings';`);
  console.log("Verified database tax_settings row:", check.rows[0]);

  await client.end();
}

initTaxTable().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
