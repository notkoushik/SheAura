const { Client } = require("pg");
const fs = require("fs");

const env = fs.readFileSync("backend/.env", "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  await client.connect();
  const prodCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position;");
  console.log("=== PRODUCTS TABLE COLUMNS ===");
  console.table(prodCols.rows);

  const rls = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products';");
  console.log("\n=== RLS ON PRODUCTS ===");
  console.table(rls.rows);

  const pols = await client.query("SELECT * FROM pg_policies WHERE tablename = 'products';");
  console.log("\n=== POLICIES ON PRODUCTS ===");
  console.table(pols.rows);

  await client.end();
}

check().catch(console.error);
