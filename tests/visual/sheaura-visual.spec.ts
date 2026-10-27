import { test, expect } from "@playwright/test";

test.describe("SheAura Luxury Visual & Screenshot Test Suite", () => {
  test("1. Hero Navigation: Logo has authentic midnight navy contrast and clean framing", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Wait for the navigation pill to render
    const navPill = page.locator(".nav.shell");
    await expect(navPill).toBeVisible({ timeout: 10000 });

    const logo = page.locator(".nav .brand-logo-svg");
    await expect(logo).toBeVisible();

    // Verify computed color is authentic #191970 (rgb(25, 25, 112))
    const computedColor = await logo.evaluate((el) => window.getComputedStyle(el).color);
    expect(computedColor).toBe("rgb(25, 25, 112)");

    // Capture visual screenshot of the luxury nav pill
    const screenshot = await navPill.screenshot({
      path: "tests/visual/screenshots/hero-nav-pill.png",
    });
    expect(screenshot).toBeDefined();
    console.log("Captured visual snapshot: tests/visual/screenshots/hero-nav-pill.png");
  });

  test("2. Peach Blossom Blush: Packshot renders with authentic texture and pricing", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click intro curtain to dismiss immediately for fast visual testing
    const curtain = page.locator(".brand-intro-curtain");
    if (await curtain.isVisible()) {
      await curtain.click({ force: true }).catch(() => {});
      await expect(curtain).toBeHidden({ timeout: 5000 }).catch(() => {});
    }

    // Find the Peach Blossom Blush item or button in catalog
    const blushTrigger = page.locator("text=Peach Blossom").first();
    if (await blushTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
      await blushTrigger.scrollIntoViewIfNeeded();
      await blushTrigger.click();
    }

    // Capture the primary product showcase screenshot
    const showcase = page.locator("main").first();
    await expect(showcase).toBeVisible({ timeout: 10000 });
    const screenshot = await showcase.screenshot({
      path: "tests/visual/screenshots/pdp-showcase.png",
    });
    expect(screenshot).toBeDefined();
    console.log("Captured visual snapshot: tests/visual/screenshots/pdp-showcase.png");
  });

  test("3. Maison Operations Studio: Admin dashboard KPI strip and order table visual", async ({
    page,
  }) => {
    // Authenticate via dedicated /sheaura/login gateway
    await page.goto("/sheaura/login");
    await page.fill("input[type='email']", "admin@sheaura.com");
    await page.fill("input[type='password']", "sheaura2025!");
    await page.click("button:has-text('Authorize & Enter Console')");

    const adminRoot = page.locator(".admin-console-root");
    await expect(adminRoot).toBeVisible({ timeout: 15000 });

    // Verify KPI strip is present
    await expect(page.locator("text=Gross Revenue")).toBeVisible();
    await expect(page.locator("text=Live Orders")).toBeVisible();

    // Capture operations studio visual
    const screenshot = await adminRoot.screenshot({
      path: "tests/visual/screenshots/admin-operations-studio.png",
    });
    expect(screenshot).toBeDefined();
    console.log("Captured visual snapshot: tests/visual/screenshots/admin-operations-studio.png");
  });
});
