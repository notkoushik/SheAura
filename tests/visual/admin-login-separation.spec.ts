import { test, expect } from "@playwright/test";

test.describe("Administrative Gateway Separation & Route Protection Visual Suite", () => {
  test("Unauthenticated /admin redirects or blocks access to /sheaura/login", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-chrome") return;

    // 1. Visit /admin directly without credentials
    await page.goto("/admin");
    await page.waitForTimeout(600);

    // Expect to be blocked or on /sheaura/login
    const url = page.url();
    const hasGate = (await page.locator("text=Maison Studio Console").isVisible()) ||
                    (await page.locator("text=Restricted Studio").isVisible()) ||
                    url.includes("/sheaura/login");
    expect(hasGate).toBeTruthy();

    await page.screenshot({
      path: "tests/visual/screenshots/admin-unauthenticated-gate.png",
      fullPage: true,
    });
  });

  test("Dedicated /sheaura/login Gateway renders high-security console UI", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-chrome") return;

    await page.goto("/sheaura/login");
    await expect(page.locator("text=Maison Studio Console")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Isolated Administrative Gateway")).toBeVisible();

    await page.screenshot({
      path: "tests/visual/screenshots/sheaura-admin-login-view.png",
      fullPage: true,
    });

    // Test Vault Key mode toggle
    await page.click("button:has-text('Vault Passkey')");
    await expect(page.locator("text=Maison Vault Passkey")).toBeVisible();

    await page.screenshot({
      path: "tests/visual/screenshots/sheaura-admin-vault-key-mode.png",
      fullPage: true,
    });
  });

  test("Normal Customer Login (/account) has no Admin shortcuts or bypasses", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-chrome") return;

    await page.goto("/account");
    await page.waitForTimeout(800);

    // Verify Admin Studio Demo and Direct Entry buttons are completely gone
    const adminDemoBtn = page.locator("button:has-text('Admin Studio Demo')");
    const directEntryBtn = page.locator("button:has-text('Enter Admin Studio Directly')");
    expect(await adminDemoBtn.count()).toBe(0);
    expect(await directEntryBtn.count()).toBe(0);

    await page.screenshot({
      path: "tests/visual/screenshots/customer-login-isolated-clean.png",
      fullPage: true,
    });
  });

  test("Successful Authentication via /sheaura/login enters Admin Studio", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "desktop-chrome") return;

    await page.goto("/sheaura/login");
    await page.fill("input[type='email']", "admin@sheaura.com");
    await page.fill("input[type='password']", "sheaura2025!");
    await page.click("button:has-text('Authorize & Enter Console')");

    await expect(page.locator(".admin-console-root")).toBeVisible({ timeout: 12000 });
    await expect(page.locator("button:has-text('Lock Studio')")).toBeVisible();

    await page.screenshot({
      path: "tests/visual/screenshots/sheaura-admin-studio-authorized.png",
      fullPage: true,
    });

    // Click Lock Studio to ensure session termination
    await page.click("button:has-text('Lock Studio')");
    await page.waitForTimeout(600);
    expect(page.url()).toContain("/sheaura/login");
  });
});
