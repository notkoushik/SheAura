import { test, expect } from "@playwright/test";

test.describe("She'Aura Brand Intro & Elevated Hero Section Visual Verification", () => {
  test("Verify authentic logo opening animation without top thread", async ({ page }, testInfo) => {
    // Only capture intro once on desktop
    if (testInfo.project.name !== "desktop-chrome") return;

    await page.goto("/");

    // 1. Capture mid-animation unmasking (around 450ms)
    await page.waitForTimeout(450);
    await page.screenshot({
      path: "tests/visual/screenshots/opening-animation-unmasking.png",
    });

    // 2. Capture fully settled state (around 1400ms)
    await page.waitForTimeout(950);
    await page.screenshot({
      path: "tests/visual/screenshots/opening-animation-settled.png",
    });
  });

  test("Verify elevated lipstick hero section with plain luxury background", async ({ page }, testInfo) => {
    await page.goto("/");

    // Click intro curtain to dissolve quickly
    const curtain = page.locator(".brand-intro-curtain");
    if (await curtain.isVisible()) {
      await curtain.click();
    }

    // Wait for hero to be fully visible
    const hero = page.locator(".hero-elevated-lipstick");
    await expect(hero).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    const isMobile = testInfo.project.name === "mobile-chrome";

    // 3. Capture elevated hero section
    await hero.screenshot({
      path: `tests/visual/screenshots/hero-plain-lipstick-elevated-${isMobile ? "mobile" : "desktop"}.png`,
    });

    // 4. Test PDP opening when clicking Shop Scarlet Rose button
    if (!isMobile) {
      const shopBtn = hero.locator("button:has-text('Shop Scarlet Rose')").first();
      await expect(shopBtn).toBeVisible();
      await shopBtn.click();
      await page.waitForTimeout(800);

      const pdpH1 = page.locator("h1:has-text('Scarlet Rose Lipstick')").first();
      await expect(pdpH1).toBeVisible({ timeout: 10000 });

      await page.screenshot({
        path: "tests/visual/screenshots/hero-lipstick-pdp-opened.png",
      });
    }
  });
});
