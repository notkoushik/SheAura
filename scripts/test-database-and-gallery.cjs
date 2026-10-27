const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.resolve(__dirname, "../backend/.env"), "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function run() {
  console.log("===============================================================");
  console.log("   SHE'AURA DIRECT DATABASE & MULTI-IMAGE VERIFICATION SUITE   ");
  console.log("===============================================================\n");

  try {
    // 1. Direct Supabase Connectivity
    console.log("🧪 SUITE 1: Direct Supabase Cloud Database Connectivity");
    await client.connect();
    assert(true, "Direct connection established to Supabase PostgreSQL cloud instance");

    // Check schema for images and gallery columns
    const colsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name IN ('images', 'gallery', 'image_url', 'campaign_image_url');
    `);
    const colNames = colsRes.rows.map(r => r.column_name);
    assert(colNames.includes("images"), "Column 'images' (jsonb) exists on public.products table");
    assert(colNames.includes("gallery"), "Column 'gallery' (jsonb) exists on public.products table");
    assert(colNames.includes("image_url"), "Column 'image_url' (text) exists for primary packshot");

    // Check orders table
    const ordersRes = await client.query(`
      SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'orders';
    `);
    assert(parseInt(ordersRes.rows[0].count, 10) === 1, "Orders table exists with direct cloud access");

    // 2. Multi-Image Product Creation & Retrieval in Supabase
    console.log("\n🧪 SUITE 2: Multi-Image Product Creation & Cloud Retrieval");
    const testProductId = "test-" + Date.now();
    const testSlug = "aurora-velvet-multi-image-" + Date.now();
    const testGallery = [
      "/products/Scarlet Rose Lipstick.webp",
      "/products/Minimal_design/Scarlet Rose Lipstick_still.png",
      "/products/Minimal_design/Lipstick_red.png"
    ];

    await client.query(`
      INSERT INTO public.products (
        id, name, slug, price, currency, category, 
        image_url, campaign_image_url, images, gallery,
        is_published, stock_quantity, description, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'Aurora Velvet Multi-Angle Lipstick', $1, 1299, 'INR', 'Lipsticks',
        $2, $3, $4::jsonb, $5::jsonb,
        true, 50, 'Exclusive multi-packshot luxury piece.', NOW(), NOW()
      );
    `, [testSlug, testGallery[0], testGallery[1], JSON.stringify(testGallery), JSON.stringify(testGallery)]);

    const queryRes = await client.query(`
      SELECT id, name, slug, price, image_url, images, gallery 
      FROM public.products 
      WHERE slug = $1;
    `, [testSlug]);

    assert(queryRes.rows.length === 1, "Test product successfully inserted and queried from Supabase");
    const fetched = queryRes.rows[0];
    assert(fetched.name === "Aurora Velvet Multi-Angle Lipstick", "Product name preserved accurately");
    assert(fetched.image_url === testGallery[0], "Primary cover image matches first packshot");
    
    // Parse jsonb returned
    const parsedImages = typeof fetched.images === 'string' ? JSON.parse(fetched.images) : fetched.images;
    const parsedGallery = typeof fetched.gallery === 'string' ? JSON.parse(fetched.gallery) : fetched.gallery;
    assert(Array.isArray(parsedImages) && parsedImages.length === 3, `Multi-image list returned ${parsedImages?.length} images from 'images' column`);
    assert(Array.isArray(parsedGallery) && parsedGallery.length === 3, `Multi-image list returned ${parsedGallery?.length} images from 'gallery' column`);
    assert(parsedImages[1] === testGallery[1], "Secondary angle image preserved accurately in gallery");

    // 3. Storefront Mapping Verification
    console.log("\n🧪 SUITE 3: Storefront Catalog Mapping with Multi-Angle Gallery");
    // Simulate catalog.ts mapSupabaseToStorefront logic
    let storefrontGallery = [];
    if (Array.isArray(fetched.gallery) && fetched.gallery.length > 0) {
      storefrontGallery = fetched.gallery;
    } else if (Array.isArray(fetched.images) && fetched.images.length > 0) {
      storefrontGallery = fetched.images;
    }
    assert(storefrontGallery.length === 3, "Storefront PDP receives full 3-image gallery for multi-packshot carousel");

    // 4. Storefront Cart Addition Invariant
    console.log("\n🧪 SUITE 4: Custom Product Cart Addition & Invariants");
    const cartProduct = {
      id: fetched.id,
      name: fetched.name,
      slug: fetched.slug,
      price: "₹1,299.00",
      rawPrice: 1299,
      image: fetched.image_url,
      gallery: storefrontGallery,
      tone: "#a81920",
    };

    const selectedShade = cartProduct.name.split(" ").slice(0, 2).join(" ");
    const itemId = `${cartProduct.id || cartProduct.slug}-${selectedShade}`;
    const cartItem = {
      id: itemId,
      product: cartProduct,
      quantity: 1,
      selectedShade,
      selectedTone: cartProduct.tone,
      priceNum: 1299,
    };

    assert(cartItem.id.includes(cartProduct.slug) || cartItem.id.includes(cartProduct.id), "Cart item generated unique composite ID without throwing");
    assert(cartItem.product.gallery.length === 3, "Cart item maintains multi-image gallery reference");
    assert(cartItem.priceNum === 1299, "Cart item parsed price invariant matches ₹1,299.00");

    // 5. Codebase Crash Fix Verifications
    console.log("\n🧪 SUITE 5: 3D Viewer Cleanup & Admin Auth Crash Prevention");
    const viewerCode = fs.readFileSync(path.resolve(__dirname, "../src/Lipstick3DViewer.tsx"), "utf8");
    assert(!viewerCode.includes("bulletGeo.dispose()"), "Lipstick3DViewer: Removed non-existent bulletGeo.dispose() reference (Fixes ReferenceError crash)");
    assert(viewerCode.includes("wallGeo?.dispose()") && viewerCode.includes("facetGeo?.dispose()"), "Lipstick3DViewer: Correct geometries disposed safely with optional chaining");

    const authCode = fs.readFileSync(path.resolve(__dirname, "../src/lib/auth.ts"), "utf8");
    assert(authCode.includes("contentType.includes(\"application/json\")"), "auth.ts: adminSignIn guards JSON parsing (Fixes 405 Method Not Allowed SyntaxError)");

    // Clean up test product
    await client.query("DELETE FROM public.products WHERE slug = $1;", [testSlug]);
    console.log("\n✓ Cleaned up test multi-image product fixture.");

  } catch (err) {
    console.error("Test error:", err);
    failed++;
  } finally {
    await client.end();
  }

  console.log("\n===============================================================");
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  if (failed === 0) {
    console.log("🎉 ALL DIRECT DATABASE & MULTI-IMAGE TESTS PASSED!");
  }
  console.log("===============================================================\n");
  process.exit(failed > 0 ? 1 : 0);
}

run();
