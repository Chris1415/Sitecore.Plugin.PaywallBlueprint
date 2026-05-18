/**
 * Playwright configuration for paywall-blueprint.
 *
 * T019 — PRD-002 Tranche B.
 *
 * Dev server uses Next 16 HTTPS (mkcert). Tests ignore SSL errors on localhost.
 * Set PLAYWRIGHT_BASE_URL env var to override for CI deployments.
 *
 * Note: reuseExistingServer=true means dev server MUST already be running.
 * Operator is expected to start `npm run dev` before running E2E tests.
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 120000,
  },
});
