/**
 * Unlocked-premium visual smoke against the winning POC clickdummy.
 *
 * ⚠ Standalone can only prove the page loads without exceptions. The visual
 * diff is operator-captured in the Cloud Portal frame; on divergence, record
 * POC drift and route it back through /architect — do NOT promote the live
 * render as the new baseline.
 * See docs/build-decisions.md#host-frame-required.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://localhost:3000";
const POC_URL = process.env.POC_BASE_URL ?? "http://localhost:5180";

test.describe("T050 — Bento unlocked visual smoke (standalone checks)", () => {
  test("dev server loads without critical JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(`${BASE_URL}/full-page?marketplaceAppTenantId=test-tenant`);
    await page.waitForLoadState("domcontentloaded");

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("MarketplaceSDK") &&
        !e.includes("postMessage") &&
        !e.includes("Expected a parent frame") &&
        !e.includes("previewState")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  // NOTE: BentoGrid is NOT rendered until the Marketplace SDK handshake resolves.
  // In standalone mode the page shows "Attempting to connect to Sitecore Marketplace..."
  // and never mounts BentoGrid. This requires the host-frame (Cloud Portal) to pass.
  test.skip("OPERATOR: dev server page has a BentoGrid data-testid (host-frame-required)", async ({ page }) => {
    await page.goto(`${BASE_URL}/full-page?marketplaceAppTenantId=test-tenant`);
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    const bentoGrid = page.locator("[data-testid='bento-grid']");
    await expect(bentoGrid).toBeVisible({ timeout: 8000 });
  });

  // NOTE: Full visual diff (POC vs live) requires host-frame smoke at Gate D.
  // The tests below are operator-facing documentation of what to verify manually.
  test.skip("OPERATOR: POC visual diff at 1440×900 light — (host-frame-required)", async ({ page }) => {
    // Operator precondition: POC served at http://localhost:5180
    // 1. Navigate to dev server with real paid entitlement
    // 2. Screenshot both at 1440×900 light + dark
    // 3. Compare against POC reference at http://localhost:5180
    // 4. toHaveScreenshot threshold 5% (Recharts SVG anti-aliasing)
    // 5. Any meaningful divergence = "POC drift" — route back via /architect step 3
    await page.goto(`${BASE_URL}/full-page?previewState=allowed`);
    await expect(page).toHaveScreenshot("bento-unlocked-1440-light.png", {
      threshold: 0.05,
    });
  });

  test.skip("OPERATOR: POC visual diff at 1440×900 dark — (host-frame-required)", async ({ page }) => {
    await page.goto(`${POC_URL}`);
    // Switch to dark
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await expect(page).toHaveScreenshot("poc-1440-dark.png", { threshold: 0.05 });
  });
});
