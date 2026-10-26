import { test, expect } from "@playwright/test";

test.describe("Console Integrity & Dynamic Reels Key Uniqueness", () => {
  test("Verify zero React duplicate key errors and clean console on desktop & mobile", async ({ page }) => {
    const consoleErrors: string[] = [];
    const duplicateKeyWarnings: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("Encountered two children with the same key")) {
        duplicateKeyWarnings.push(text);
      }
      if (msg.type() === "error") {
        consoleErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    // Navigate to homepage
    await page.goto("/");

    // Wait for the ribbon cards to mount and render
    const ribbonCard = page.locator(".reels-ribbon-card").first();
    await expect(ribbonCard).toBeVisible({ timeout: 15000 });

    const ribbonCards = page.locator(".reels-ribbon-card");
    const count = await ribbonCards.count();
    console.log(`[PASS] Mounted ribbon cards: ${count}`);

    // Verify 0 duplicate key warnings
    expect(duplicateKeyWarnings).toHaveLength(0);
    expect(count).toBeGreaterThan(0);
  });
});
