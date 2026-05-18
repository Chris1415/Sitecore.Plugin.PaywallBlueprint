/**
 * T050 — Tranche D Playwright POC visual smoke spec.
 *
 * PRD-002 Tranche D — visual regression of the unlocked premium bento
 * against the winning POC clickdummy (pocs/poc-v2-prd002/).
 *
 * Architecture:
 *   - Dev server: https://localhost:3000 (HTTPS, mkcert self-signed)
 *   - POC server: served via `npx serve pocs/poc-v2-prd002/ --listen 5180`
 *                 (HTTP, no TLS; Playwright can access both)
 *
 * IMPORTANT: The /full-page route requires the Cloud Portal SDK handshake.
 * In standalone browser (no Cloud Portal parent frame), the MarketplaceProvider
 * renders null until the SDK resolves. The bento unlocked state with real
 * premium content CANNOT be captured in standalone mode.
 *
 * Per sitecore:marketplace-sdk-host-frame-testing, the canonical visual smoke
 * for Marketplace apps is inside the live Cloud Portal host frame.
 *
 * These automated tests cover what IS possible standalone:
 *   1. The dev server page loads without JS exceptions
 *
 * Host-frame-required (Gate D operator smoke):
 *   2. BentoGrid data-testid visible (requires SDK handshake)
 *   3. Visual diff POC vs live at 1440×900 light + dark
 *
 * Full unlocked visual diff (POC vs live) MUST be performed by the operator
 * at Gate D inside the Cloud Portal host frame. Screenshots are captured there
 * and compared against pocs/poc-v2-prd002/ as the visual ground truth.
 *
 * If any meaningful divergence is found at operator Gate D, it is recorded
 * as "POC drift" finding and routed back through /architect step 3.
 * Do NOT silently promote the live render as the new baseline.
 *
 * POC server setup (operator precondition for visual comparison):
 *   npx serve products/paywall-blueprint/pocs/poc-v2-prd002/ --listen 5180
 * Then navigate http://localhost:5180 to view the canonical reference.
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
