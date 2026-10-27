const { Client } = require("pg");
const fs = require("fs");

const env = fs.readFileSync("backend/.env", "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  await client.connect();
  const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
  console.log("Public tables:\n", tables.rows.map(r => r.tablename));

  const ordersCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';");
  console.log("Orders columns:\n", ordersCols.rows);

  const orderPolicies = await client.query("SELECT * FROM pg_policies WHERE tablename = 'orders';");
  console.log("Orders policies:\n", orderPolicies.rows);

  await client.end();
}

check().catch(console.error);
