const { Client } = require("pg");
const fs = require("fs");

const env = fs.readFileSync("backend/.env", "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'product_media';");
  console.log("product_media columns:\n", res.rows);
  const pols = await client.query("SELECT * FROM pg_policies WHERE tablename = 'product_media';");
  console.log("product_media policies:\n", pols.rows);
  await client.end();
}

check().catch(console.error);
