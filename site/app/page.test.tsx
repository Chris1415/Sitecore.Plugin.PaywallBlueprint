/**
 * T010a — layout assertions for the Tranche A page shell (updated for T023).
 *
 * T023 update: GatedSection now uses useHostUser() (host.user) and useAppContext()
 * (application.context) for the defensive layered render. The mock is extended to
 * supply both hooks with values that produce the expected text output.
 *
 * Mock shape rationale:
 *   - useHostUser returns { given_name: 'Christian' } → pickUserDisplay → "Christian"
 *   - useAppContext returns resourceAccess with tenantDisplayName → "Hahn Solo Demo"
 *   These are the same displayed strings as Tranche A — the assertions don't change,
 *   only the data source changes (context → hooks).
 *
 * Locked copy source: pocs/poc-v1-prd000/state-allowed.html (visual source of truth)
 * and UI spec § 8 locked strings per caller brief.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "./page";

// ---------------------------------------------------------------------------
// MarketplaceProvider mock (T010a + T023 update)
// Provides all three hooks: useMarketplaceClient, useAppContext, useHostUser.
// useHostUser: given_name='Christian' → pickUserDisplay → "Christian"
// useAppContext: resourceAccess[0].tenantDisplayName='Hahn Solo Demo' → pickTenantDisplay
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  MarketplaceProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAppContext: () => ({
    // application.context shape per sdk-fixtures/application-context.json
    marketplaceAppTenantId: "test-tenant-id-00000001",
    resourceAccess: [
      {
        tenantDisplayName: "Hahn Solo Demo",
        tenantName: null,
      },
    ],
  }),
  useHostUser: () => ({
    // host.user shape per sdk-fixtures/host-user.json
    given_name: "Christian",
    name: "Christian Hahn",
    email: "christian@hahn-solo.net",
    sub: "auth0|test-user-001",
  }),
  useMarketplaceClient: () => ({}),
}));

describe("Page — Tranche A layout shell (T010a)", () => {
  it("renders the topbar with label 'Paywall Blueprint'", () => {
    render(<Page />);
    expect(screen.getByText("Paywall Blueprint")).toBeTruthy();
  });

  it("renders the free section badge 'Free'", () => {
    render(<Page />);
    expect(screen.getByText("Free")).toBeTruthy();
  });

  it("renders the free section headline 'Inventory at a glance'", () => {
    render(<Page />);
    expect(screen.getByText("Inventory at a glance")).toBeTruthy();
  });

  it("renders the free section mock button 'View placeholder report'", () => {
    render(<Page />);
    // Source: pocs/poc-v1-prd000/state-allowed.html — free-section CTA button
    expect(
      screen.getByRole("button", { name: /View placeholder report/i })
    ).toBeTruthy();
  });

  it("renders the gated section badge 'Premium'", () => {
    render(<Page />);
    expect(screen.getByText("Premium")).toBeTruthy();
  });

  it("renders the gated section heading 'Welcome, Christian'", () => {
    render(<Page />);
    // T023: now sourced from useHostUser().given_name → pickUserDisplay → "Christian"
    expect(screen.getByText("Welcome, Christian")).toBeTruthy();
  });

  it("renders the gated section body with tenant display name", () => {
    render(<Page />);
    // T023: tenantDisplay sourced from useAppContext().resourceAccess[0].tenantDisplayName
    expect(
      screen.getByText(
        "Your tenant Hahn Solo Demo has full access. Replace this card with your gated feature."
      )
    ).toBeTruthy();
  });

  it("renders both the free section and the gated section in the DOM", () => {
    render(<Page />);
    // Both sections must be present simultaneously — verifies the layout shell
    expect(screen.getByText("Inventory at a glance")).toBeTruthy();
    expect(screen.getByText("Welcome, Christian")).toBeTruthy();
  });
});
