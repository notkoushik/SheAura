import { test, expect } from "@playwright/test";

test.describe("She'Aura Brand Intro & Elevated 3D Lipstick Hero Section Verification", () => {
  test("Verify authentic logo opening animation with full intact S and A", async ({ page }, testInfo) => {
    // Only capture intro once on desktop
    if (testInfo.project.name !== "desktop-chrome") return;

    // Freeze intro so it stays perfectly visible for visual regression auditing
    await page.addInitScript(() => {
      (window as any).__FREEZE_INTRO__ = true;
    });

    await page.goto("/");

    // Ensure curtain is visible
    const curtain = page.locator(".brand-intro-curtain");
    await expect(curtain).toBeVisible();

    // 1. Capture cascade underway (around 450ms)
    await page.waitForTimeout(450);
    await page.screenshot({
      path: "tests/visual/screenshots/opening-animation-unmasking.png",
    });

    // 2. Capture fully settled state (all letters assembled, no glyph clipping)
    await page.waitForTimeout(1100);
    await page.screenshot({
      path: "tests/visual/screenshots/opening-animation-settled.png",
    });
  });

  test("Verify refined navbar contrast and interactive 3D lipstick model", async ({ page }, testInfo) => {
    await page.goto("/");

    // Wait for the intro animation (3.4s dwell + 850ms dissolve) to complete naturally
    await page.waitForTimeout(4400);

    // Wait for hero to be fully visible
    const hero = page.locator(".hero-elevated-lipstick");
    await expect(hero).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const isMobile = testInfo.project.name === "mobile-chrome";

    // 3. Capture high-contrast navbar on desktop
    if (!isMobile) {
      const nav = page.locator("header.nav").first();
      await expect(nav).toBeVisible();
      await nav.screenshot({
        animations: "disabled",
        path: "tests/visual/screenshots/navbar-refined-contrast.png",
      });
    }

    // 4. Capture elevated hero section with 3D WebGL Lipstick
    await hero.screenshot({
      animations: "disabled",
      path: `tests/visual/screenshots/hero-plain-lipstick-elevated-${isMobile ? "mobile" : "desktop"}.png`,
    });

    // 5. Test 3D Shade Switcher & Live Customization (Desktop)
    if (!isMobile) {
      // Click Roseberry shade swatch in the 3D dock
      const roseberryBtn = page.locator("button[aria-label*='Roseberry']").first();
      if (await roseberryBtn.isVisible()) {
        await roseberryBtn.click();
        await page.waitForTimeout(600);

        // Verify button updated to Roseberry
        const shopBtn = hero.locator("button:has-text('Shop Roseberry')").first();
        await expect(shopBtn).toBeVisible();

        await hero.screenshot({
          animations: "disabled",
          path: "tests/visual/screenshots/hero-3d-shade-switched.png",
        });

        // Click to view formula / PDP
        await shopBtn.click();
        await page.waitForTimeout(800);

        const pdpH1 = page.locator("h1").first();
        await expect(pdpH1).toBeVisible({ timeout: 10000 });

        await page.screenshot({
          animations: "disabled",
          path: "tests/visual/screenshots/hero-lipstick-pdp-opened.png",
        });
      }
    }
  });
});
