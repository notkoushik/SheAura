import { test, expect } from "@playwright/test";

test.describe("Storefront Custom Product & Multi-Image Gallery Suite", () => {
  test("Navigating to product and adding to cart does not crash 3D viewer or React tree", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify 3D stage or hero rendered
    await expect(page.locator("body")).toBeVisible();

    // Click on shop or navigate to a product
    const productCard = page.locator(".product-card, .prod-card, [data-slug], .product-item").first();
    if (await productCard.isVisible()) {
      await productCard.click();
      await page.waitForTimeout(500);
    }

    // Attempt to add to bag
    const addBtn = page.locator("button:has-text('Add to Bag'), button:has-text('Add to Haute Bag'), .prod-card-add-btn").first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify no bulletGeo ReferenceError occurred
    const bulletGeoError = consoleErrors.find((e) => e.includes("bulletGeo"));
    expect(bulletGeoError).toBeUndefined();

    // Page body should still be active and non-blank
    const rootContent = await page.locator("#root").innerHTML();
    expect(rootContent.length).toBeGreaterThan(100);
  });

  test("Admin Studio supports multi-packshot selection and displays gallery strip", async ({ page }) => {
    // Navigate to admin login
    await page.goto("/sheaura/login");
    await page.waitForLoadState("networkidle");

    // Authorize via admin credentials
    await page.fill("input[type='email']", "admin@sheaura.com");
    await page.fill("input[type='password']", "sheaura2025!");
    await page.click("button:has-text('Authorize & Enter Console')");

    // Wait for Admin Console to open
    await expect(page.locator(".admin-console-root")).toBeVisible({ timeout: 15000 });

    // Switch to Catalog & Inventory tab
    await page.click("button:has-text('Catalog & Inventory')");
    await page.waitForTimeout(400);

    // Open Add New Creation modal
    await page.click("button:has-text('Add New Creation')");
    await expect(page.locator("text=Publish New Cosmetic Creation")).toBeVisible();

    // Verify Multi-Image Photography section is visible
    await expect(page.locator("text=Multi-Image Photography & Gallery").first()).toBeVisible();
    await expect(page.locator("text=/Product Gallery/").first()).toBeVisible();

    // Verify library assets are available to pick
    await expect(page.locator("text=Roseberry Lipstick").first()).toBeVisible();

    // Verify multiple photos in gallery preview
    const gallerySection = page.locator("text=/Product Gallery \\(\\d+ photo/i").first();
    await expect(gallerySection).toBeVisible();
  });
});
