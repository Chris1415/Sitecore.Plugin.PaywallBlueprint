/**
 * T010a — RED test (TDD): failing layout assertions for the Tranche A page shell.
 * Tests MUST fail until T009 replaces app/page.tsx with the freemium layout.
 *
 * Locked copy source: pocs/poc-v1-prd000/state-allowed.html (visual source of truth)
 * and UI spec § 8 locked strings per caller brief.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Page from "./page";

// ---------------------------------------------------------------------------
// MarketplaceProvider mock
// The scaffold wraps all routes in MarketplaceProvider. Providing a minimal
// mock prevents the "connecting to Marketplace..." loader from blocking renders.
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  MarketplaceProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAppContext: () => ({
    user: { id: "u1", name: "Christian Hahn", email: "christian@hahn-solo.net" },
    tenant: { id: "tenant-001", name: "Hahn Solo Demo" },
  }),
  useMarketplaceClient: () => ({}),
}));

describe("Page — Tranche A layout shell (T010a RED)", () => {
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
    // Hardcoded in Tranche A — no useAppContext() call yet (Tranche B wires context)
    expect(screen.getByText("Welcome, Christian")).toBeTruthy();
  });

  it("renders the gated section body with locked copy", () => {
    render(<Page />);
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
