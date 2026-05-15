/**
 * T010a — layout assertions for the Tranche A page shell (updated for T035 Tranche C).
 *
 * T035 update: Page is now an async server component with searchParams.
 * GatedSection now wraps PaywallGate — both are mocked here to keep these layout
 * tests focused on the shell (topbar, free section, gated section container).
 * PaywallGate unit tests live in PaywallGate.test.tsx (T036a).
 *
 * Mock shape rationale:
 *   - useHostUser returns { given_name: 'Christian' } → pickUserDisplay → "Christian"
 *   - useAppContext returns resourceAccess with tenantDisplayName → "Hahn Solo Demo"
 *   These produce the same displayed strings as Tranche A/B.
 *
 * Locked copy source: pocs/poc-v1-prd000/state-allowed.html (visual source of truth)
 * and UI spec § 8 locked strings per caller brief.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "./page";

// ---------------------------------------------------------------------------
// MarketplaceProvider mock
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  MarketplaceProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAppContext: () => ({
    marketplaceAppTenantId: "test-tenant-id-00000001",
    resourceAccess: [
      {
        tenantDisplayName: "Hahn Solo Demo",
        tenantName: null,
      },
    ],
  }),
  useHostUser: () => ({
    given_name: "Christian",
    name: "Christian Hahn",
    email: "christian@hahn-solo.net",
    sub: "auth0|test-user-001",
  }),
  useMarketplaceClient: () => ({}),
}));

// ---------------------------------------------------------------------------
// PaywallGate mock — render children directly for layout-shell tests
// Gate evaluation is tested separately in PaywallGate.test.tsx (T036a)
// ---------------------------------------------------------------------------
vi.mock("@/src/lib/paywall/PaywallGate", () => ({
  PaywallGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// ErrorBoundary mock — passthrough for layout-shell tests
// ErrorBoundary behavior tested in error-boundary.test.tsx (T034a)
// ---------------------------------------------------------------------------
vi.mock("@/components/error-boundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Helper: resolve the async Page component for testing
// Page is an async server component (Next.js App Router) — must await it.
// ---------------------------------------------------------------------------
async function renderPage(searchParams?: Record<string, string>) {
  const props = searchParams
    ? { searchParams: Promise.resolve(searchParams) }
    : { searchParams: Promise.resolve({}) };
  const PageElement = await Page(props);
  return render(PageElement);
}

describe("Page — Tranche A layout shell (T010a)", () => {
  it("renders the topbar with label 'Paywall Blueprint'", async () => {
    await renderPage();
    expect(screen.getByText("Paywall Blueprint")).toBeTruthy();
  });

  it("renders the free section badge 'Free'", async () => {
    await renderPage();
    expect(screen.getByText("Free")).toBeTruthy();
  });

  it("renders the free section headline 'Inventory at a glance'", async () => {
    await renderPage();
    expect(screen.getByText("Inventory at a glance")).toBeTruthy();
  });

  it("renders the free section mock button 'View placeholder report'", async () => {
    await renderPage();
    // Source: pocs/poc-v1-prd000/state-allowed.html — free-section CTA button
    expect(
      screen.getByRole("button", { name: /View placeholder report/i })
    ).toBeTruthy();
  });

  it("renders the gated section badge 'Premium'", async () => {
    await renderPage();
    expect(screen.getByText("Premium")).toBeTruthy();
  });

  it("renders the gated section heading 'Welcome, Christian'", async () => {
    await renderPage();
    // T023: sourced from useHostUser().given_name → pickUserDisplay → "Christian"
    expect(screen.getByText("Welcome, Christian")).toBeTruthy();
  });

  it("renders the gated section body with tenant display name", async () => {
    await renderPage();
    // T023: tenantDisplay from useAppContext().resourceAccess[0].tenantDisplayName
    expect(
      screen.getByText(
        "Your tenant Hahn Solo Demo has full access. Replace this card with your gated feature."
      )
    ).toBeTruthy();
  });

  it("renders both the free section and the gated section in the DOM", async () => {
    await renderPage();
    // Both sections must be present simultaneously — verifies the layout shell
    expect(screen.getByText("Inventory at a glance")).toBeTruthy();
    expect(screen.getByText("Welcome, Christian")).toBeTruthy();
  });
});
