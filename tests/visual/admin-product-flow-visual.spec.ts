import { test, expect } from "@playwright/test";

test.describe("Admin Product Creation, Storefront Customer Ordering & Cleanup Visual Suite", () => {
  test("Complete Admin Product Addition, Copy-Paste Preset, Customer Add-To-Bag & Deletion Loop", async ({
    page,
  }, testInfo) => {
    // Only run flow on desktop
    if (testInfo.project.name !== "desktop-chrome") return;
    test.setTimeout(60000);

    // A. Go to Admin Operations Studio via Secure Login Gateway
    await page.goto("/sheaura/login");
    await page.fill("input[type='email']", "admin@sheaura.com");
    await page.fill("input[type='password']", "sheaura2025!");
    await page.click("button:has-text('Authorize & Enter Console')");
    await expect(page.locator(".admin-console-root")).toBeVisible({ timeout: 15000 });

    // B. Navigate to Catalog & Inventory Tab
    const inventoryTab = page.locator("button:has-text('Inventory')").first();
    await expect(inventoryTab).toBeVisible();
    await inventoryTab.click();
    await page.waitForTimeout(600);

    // Screenshot 1: Admin Master Inventory Table
    await page.screenshot({
      path: "tests/visual/screenshots/admin-catalog-inventory.png",
      fullPage: true,
    });

    // C. Open Add New Creation Modal
    const addBtn = page.locator("button:has-text('Add New Creation')").first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.locator("text=Publish New Cosmetic Creation")).toBeVisible();

    // Screenshot 2: Add Product Modal with 1-Click Presets & Photo Manager
    await page.screenshot({
      path: "tests/visual/screenshots/admin-add-product-modal.png",
      fullPage: true,
    });

    // D. Use Super Admin 1-Click Preset (Lipsticks Preset)
    const lipstickPresetBtn = page.locator("button:has-text('Lipsticks Preset')").first();
    await expect(lipstickPresetBtn).toBeVisible();
    await lipstickPresetBtn.click();
    await page.waitForTimeout(300);

    // Customize the test item name and price
    const nameInput = page.locator("input[name='productName']");
    await nameInput.fill("Maison Rubis Velvet Lipstick (Test Creation)");
    await page.locator("input[name='price']").fill("1299");

    // Screenshot 3: Form Populated via Preset with Packshot Preview
    await page.screenshot({
      path: "tests/visual/screenshots/admin-add-product-populated.png",
      fullPage: true,
    });

    // E. Publish Creation to Storefront
    const publishBtn = page.locator("button:has-text('Publish Creation to Storefront')").first();
    await publishBtn.click();
    await page.waitForTimeout(1500);

    // Verify item is present in the admin inventory list
    const newItemRow = page.locator("tr:has-text('Maison Rubis Velvet Lipstick (Test Creation)')").first();
    await expect(newItemRow).toBeVisible({ timeout: 15000 });

    // Screenshot 4: Admin Inventory Table with Newly Created Item
    await page.screenshot({
      path: "tests/visual/screenshots/admin-item-created.png",
      fullPage: true,
    });

    // F. Navigate to Customer Storefront (/)
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2500);

    // Scroll to Category Collections
    const collectionsSection = page.locator("#collections");
    await collectionsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Screenshot 5: Storefront 4 Arched Panels (Lipsticks, Blushes, Body Highlighter Oil, Foundation)
    await collectionsSection.screenshot({
      path: "tests/visual/screenshots/storefront-category-arches.png",
    });

    // G. Filter by Lipsticks category and locate the new creation
    const lipsticksPill = page.locator("button.shop-category-pill:has-text('Lipsticks')").first();
    await expect(lipsticksPill).toBeVisible();
    await lipsticksPill.click();
    await page.waitForTimeout(600);

    const storefrontItem = page.locator("article.product-card:has-text('Maison Rubis Velvet Lipstick (Test Creation)')");
    await expect(storefrontItem).toBeVisible({ timeout: 10000 });
    await storefrontItem.scrollIntoViewIfNeeded();

    // Screenshot 6: New Product Live on Customer Storefront
    await page.screenshot({
      path: "tests/visual/screenshots/storefront-new-item-visible.png",
      fullPage: false,
    });

    // H. Open Product Detail Page (PDP)
    await storefrontItem.click();
    await page.waitForTimeout(800);
    await expect(page.locator("text=Maison Rubis Velvet Lipstick (Test Creation)").first()).toBeVisible({ timeout: 10000 });

    // Screenshot 7: Customer PDP for New Creation
    await page.screenshot({
      path: "tests/visual/screenshots/storefront-new-item-pdp.png",
      fullPage: false,
    });

    // I. Add to Bag and Proceed to Cart
    const addBagBtn = page.locator("button.add-to-bag, button:has-text('Add to bag')").first();
    await expect(addBagBtn).toBeVisible();
    await addBagBtn.click();
    await page.waitForTimeout(600);

    // Go to Cart
    await page.goto("/cart");
    await expect(page.locator("text=Maison Rubis Velvet Lipstick (Test Creation)").first()).toBeVisible({
      timeout: 10000,
    });

    // Screenshot 8: Customer Cart Checkout with Added Item
    await page.screenshot({
      path: "tests/visual/screenshots/storefront-new-item-in-cart.png",
      fullPage: true,
    });

    // J. Return to Admin and Clean Up (Delete Test Item)
    await page.goto("/admin");
    const adminInventory = page.locator("button:has-text('Inventory')").first();
    await expect(adminInventory).toBeVisible();
    await adminInventory.click();
    await page.waitForTimeout(600);

    // Setup dialog listener for confirm
    page.on("dialog", (dialog) => dialog.accept());

    const targetRow = page.locator("tr:has-text('Maison Rubis Velvet Lipstick')").first();
    await expect(targetRow).toBeVisible({ timeout: 15000 });

    const deleteBtn = targetRow.locator("button:has-text('Delete')").first();
    await deleteBtn.click();
    await page.waitForTimeout(1000);

    // Verify item is cleanly removed
    await expect(page.locator("tr:has-text('Maison Rubis Velvet Lipstick')")).toHaveCount(0, { timeout: 10000 });

    // Screenshot 9: Admin Inventory Clean After Deletion
    await page.screenshot({
      path: "tests/visual/screenshots/admin-test-item-deleted.png",
      fullPage: true,
    });
  });
});
