import { test, expect } from "@playwright/test";

test.describe("SheAura Complete E-Commerce Flow & Profile Visual Audit", () => {
  test("1. Customer Profile Visual Audit: Desktop & Mobile UI", async ({ page }, testInfo) => {
    // Navigate to account page
    await page.goto("/account");

    // Sign in as demo VIP member
    const emailInput = page.locator("input[type='email']");
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill("client@sheaura.com");
    await page.locator("input[type='password']").fill("sheaura2025!");
    await page.locator("button[type='submit']").click();

    // Verify dashboard is mounted
    const dashboard = page.locator(".account-dashboard");
    await expect(dashboard).toBeVisible({ timeout: 15000 });

    // 1A. Orders & Deliveries Tab Screenshot
    await page.screenshot({
      path: `tests/visual/screenshots/refined-profile-orders-${testInfo.project.name}.png`,
      fullPage: true,
    });

    // 1B. Delivery Addresses Tab Screenshot
    const addressTab = page.locator("button:has-text('Delivery Addresses')").first();
    await expect(addressTab).toBeVisible();
    await addressTab.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `tests/visual/screenshots/refined-profile-addresses-${testInfo.project.name}.png`,
      fullPage: true,
    });

    // 1C. Beauty Signature Tab Screenshot
    const beautyTab = page.locator("button:has-text('Beauty Signature')").first();
    await expect(beautyTab).toBeVisible();
    await beautyTab.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `tests/visual/screenshots/refined-profile-beauty-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test("2. Complete End-to-End Ordering to Admin Fulfillment Loop", async ({ page }, testInfo) => {
    // Only run on desktop
    if (testInfo.project.name !== "desktop-chrome") return;
    test.setTimeout(60000);

    // A. Navigate to Cart Checkout
    await page.goto("/cart");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(600);

    // In Cart Step 1: Click "Proceed to Shipping & Delivery"
    const proceedToShippingBtn = page.locator("button:has-text('Proceed to Shipping & Delivery')").first();
    await expect(proceedToShippingBtn).toBeVisible({ timeout: 10000 });
    await proceedToShippingBtn.click();
    await page.waitForTimeout(500);

    // In Cart Step 2 (Shipping): Fill delivery address
    const nameInput = page.locator("input[placeholder*='Recipient'], input[placeholder*='Full Name'], input[value*='Aaradhya']").first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Vivienne Chen");
    }
    const streetInput = page.locator("input[placeholder*='Street'], input[placeholder*='Villa'], input[placeholder*='Residence']").first();
    if (await streetInput.isVisible()) {
      await streetInput.fill("14 Victoria Crescent, Indiranagar");
    }

    // Submit shipping form to go to payment step
    const continueToPaymentBtn = page.locator("button:has-text('Continue to Secure Payment')").first();
    await expect(continueToPaymentBtn).toBeVisible();
    await continueToPaymentBtn.click();
    await page.waitForTimeout(500);

    // In Cart Step 3 (Payment): Click Authorize & Place Order
    const placeOrderBtn = page.locator("button:has-text('Authorize & Place Order')").first();
    await expect(placeOrderBtn).toBeVisible();
    await placeOrderBtn.click();

    // Verify Order Confirmed Screen
    const trackInAccountBtn = page.getByRole("button", { name: "Track Order in My Account" });
    await expect(trackInAccountBtn).toBeVisible({ timeout: 15000 });

    // Capture screenshot of Order Confirmation
    await page.screenshot({
      path: "tests/visual/screenshots/flow-1-order-confirmed.png",
      fullPage: true,
    });

    // C. Click "Track Order in My Account"
    await trackInAccountBtn.click();
    await page.waitForTimeout(1000);

    // Verify user is in account portal and sees the order
    await expect(page.locator(".account-dashboard")).toBeVisible();
    await page.screenshot({
      path: "tests/visual/screenshots/flow-2-customer-account-verified.png",
      fullPage: true,
    });

    // D. Switch to Admin Operations Studio via dedicated /sheaura/login
    await page.goto("/sheaura/login");
    await page.fill("input[type='email']", "admin@sheaura.com");
    await page.fill("input[type='password']", "sheaura2025!");
    await page.click("button:has-text('Authorize & Enter Console')");
    const adminConsole = page.locator(".admin-console-root");
    await expect(adminConsole).toBeVisible({ timeout: 15000 });

    // Verify admin stats are loaded
    await expect(page.locator("text=Gross Revenue")).toBeVisible();
    await expect(page.locator("text=Live Orders")).toBeVisible();

    // Capture Admin Operations Studio with new order in queue
    await page.screenshot({
      path: "tests/visual/screenshots/flow-3-admin-received-order.png",
      fullPage: true,
    });
  });
});
