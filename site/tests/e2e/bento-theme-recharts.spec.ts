/**
 * Recharts theme reactivity.
 *
 * ⚠ Standalone can only prove the page loads without exceptions — the unlocked
 * premium state needs a real entitlement from the SDK host. The SVG stroke
 * change on theme flip is verified by the operator in the Cloud Portal frame.
 * See docs/build-decisions.md#host-frame-required.
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
