const { Client } = require("pg");
const fs = require("fs");

const env = fs.readFileSync("backend/.env", "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL successfully.");

    console.log("Checking if 'images' column exists on public.products...");
    const checkRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'images';
    `);

    if (checkRes.rows.length === 0) {
      console.log("Adding 'images' jsonb column to public.products...");
      await client.query(`
        ALTER TABLE public.products 
        ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
      `);
      console.log("Column 'images' added successfully!");
    } else {
      console.log("Column 'images' already exists with type:", checkRes.rows[0].data_type);
    }

    // Also check if 'gallery' column exists or if we should add it as alias/jsonb
    const checkGallery = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'gallery';
    `);

    if (checkGallery.rows.length === 0) {
      console.log("Adding 'gallery' jsonb column to public.products...");
      await client.query(`
        ALTER TABLE public.products 
        ADD COLUMN gallery jsonb DEFAULT '[]'::jsonb;
      `);
      console.log("Column 'gallery' added successfully!");
    } else {
      console.log("Column 'gallery' already exists with type:", checkGallery.rows[0].data_type);
    }

    // Verify
    const verifyRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name IN ('images', 'gallery');
    `);
    console.log("Verification result:\n", verifyRes.rows);

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

run();
