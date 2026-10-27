const { Client } = require("pg");
const fs = require("fs");

const env = fs.readFileSync("backend/.env", "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function fixOrders() {
  await client.connect();
  console.log("Connected to PostgreSQL...");

  // 1. Update total_amount where total_amount was '₹0' but total_price is valid
  const res1 = await client.query(`
    UPDATE public.orders 
    SET total_amount = CONCAT('₹', total_price::text)
    WHERE (total_amount = '₹0' OR total_amount IS NULL) AND total_price > 0;
  `);
  console.log(`Updated ${res1.rowCount} orders with proper total_amount.`);

  // 2. Set payment_status to 'paid' for completed/processing online orders
  const res2 = await client.query(`
    UPDATE public.orders 
    SET payment_status = 'paid' 
    WHERE payment_status IN ('awaiting_payment', 'pending') AND payment_method != 'cod';
  `);
  console.log(`Updated ${res2.rowCount} orders to paid status.`);

  // 3. Update client_name and client_email from customer_name and customer_email where client_name was 'Maison Guest'
  const res3 = await client.query(`
    UPDATE public.orders 
    SET client_name = customer_name, client_email = customer_email, client_phone = customer_phone
    WHERE (client_name = 'Maison Guest' OR client_name IS NULL) AND customer_name IS NOT NULL AND customer_name != '';
  `);
  console.log(`Updated ${res3.rowCount} orders with accurate customer names.`);

  // 4. Check results
  const res4 = await client.query(`
    SELECT id, client_name, client_email, customer_name, customer_email, total_amount, total_price, payment_status, status 
    FROM public.orders 
    ORDER BY created_at DESC 
    LIMIT 10;
  `);
  console.log("Latest orders after fix:\n", res4.rows);

  await client.end();
}

fixOrders().catch(console.error);
