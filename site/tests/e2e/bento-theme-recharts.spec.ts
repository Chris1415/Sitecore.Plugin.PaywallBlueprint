/**
 * T049 — Recharts theme reactivity Playwright spec.
 *
 * PRD-002 Tranche D — verify ActivityChart (P1) re-renders on theme flip
 * via the key={resolvedTheme} pattern on <ResponsiveContainer>.
 *
 * IMPORTANT: The /full-page route requires the Cloud Portal SDK handshake.
 * In standalone browser, MarketplaceProvider renders null until the SDK resolves.
 * These tests CANNOT fully verify the Recharts chart in isolation because
 * the unlocked premium state requires a real entitlement from the SDK host.
 *
 * What CAN be tested automatically here (standalone):
 *   1. The bento page loads without JS exceptions
 *
 * CANNOT be tested in standalone mode (SDK loading screen blocks Topbar):
 *   2. ThemeToggle is present in the topbar   — host-frame-required
 *   3. Theme toggle clicks don't produce errors — host-frame-required
 *
 * Full Recharts theme reactivity (SVG stroke color change) MUST be verified
 * manually at Gate D inside the Cloud Portal host frame, per
 * sitecore:marketplace-sdk-host-frame-testing skill.
 *
 * Documented for operator at Gate D:
 *   - Navigate to /full-page with valid entitlement (allowed state)
 *   - P1 ActivityChart SVG should be visible
 *   - Toggle theme Light → Dark → assert SVG <path> stroke color changes
 *   - key={resolvedTheme} on ResponsiveContainer forces Recharts remount
 *
 * If Playwright browsers are not installed in the current environment,
 * this spec will be skipped automatically (no browser). Run:
 *   npx playwright install chromium
 * before running e2e tests.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://localhost:3000";

test.describe("T049 — Recharts theme reactivity (standalone checks)", () => {
  test("page loads without JS exceptions", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(`${BASE_URL}/full-page?marketplaceAppTenantId=test-tenant`);
    await page.waitForLoadState("domcontentloaded");

    // Filter out expected SDK handshake errors (marketplace SDK requires parent frame)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("MarketplaceSDK") &&
        !e.includes("postMessage") &&
        !e.includes("Expected a parent frame") &&
        !e.includes("previewState")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  // NOTE: Marketplace SDK loading screen blocks Topbar in standalone mode.
  // The /full-page route renders "Attempting to connect to Sitecore Marketplace..."
  // before the SDK resolves. ThemeToggle and Topbar are never visible standalone.
  // Gate D operator smoke covers this inside the Cloud Portal host frame.
  test.skip("OPERATOR: ThemeToggle is present in the topbar (host-frame-required)", async ({ page }) => {
    await page.goto(`${BASE_URL}/full-page?marketplaceAppTenantId=test-tenant`);
    await page.waitForLoadState("domcontentloaded");

    const themeToggle = page.getByRole("button", { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible({ timeout: 5000 });
  });

  // NOTE: Same SDK loading-screen limitation — host-frame-required.
  test.skip("OPERATOR: toggling theme does not produce JS errors (host-frame-required)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(`${BASE_URL}/full-page?marketplaceAppTenantId=test-tenant`);
    await page.waitForLoadState("domcontentloaded");

    // Click ThemeToggle — open dropdown
    const themeToggle = page.getByRole("button", { name: /toggle theme/i });
    await themeToggle.click();

    // Select Dark mode
    const darkOption = page.getByRole("menuitem", { name: /dark/i });
    if (await darkOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkOption.click();
      await page.waitForTimeout(500);
    }

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("MarketplaceSDK") &&
        !e.includes("postMessage") &&
        !e.includes("Expected a parent frame")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  // NOTE: Full Recharts SVG stroke color assertion (host-frame-required)
  // Cannot run in standalone mode — requires Cloud Portal host frame.
  // Gate D operator smoke covers this manually via:
  //   1. Open /full-page in Cloud Portal with valid paid entitlement
  //   2. P1 ActivityChart SVG visible with area fill
  //   3. Toggle theme Light → Dark → SVG path stroke color changes
  //      (key={resolvedTheme} on ResponsiveContainer forces remount)
  test.skip("OPERATOR: Recharts SVG stroke changes on theme flip (host-frame-required)", async () => {
    // This test is intentionally skipped in CI.
    // Manual smoke at Gate D covers this.
  });
});
