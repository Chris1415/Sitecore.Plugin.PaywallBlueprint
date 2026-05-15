/**
 * T037a RED — AllowedState locked copy + fallback chains + CircleCheck icon.
 * Extends T024a (gated-section.test.tsx) — same fallback chain, now scoped to
 * AllowedState component at its new location.
 * Locked strings per UI spec § 3.4 + § 8. Verified against POC:
 *   pocs/poc-v1-prd000/state-allowed.html
 * Fails until T031 implements AllowedState.tsx.
 *
 * source: project-planning/architecture/sdk-fixtures/host-user.json ($design_decisions)
 * source: project-planning/architecture/sdk-fixtures/application-context.json ($design_decisions)
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AllowedState } from "./AllowedState";

// ---------------------------------------------------------------------------
// Mock marketplace provider hooks
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  MarketplaceProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAppContext: vi.fn(),
  useHostUser: vi.fn(),
  useMarketplaceClient: vi.fn(),
}));

import type { ApplicationContext } from "@sitecore-marketplace-sdk/client";
import { useAppContext, useHostUser } from "@/components/providers/marketplace";

const mockUseAppContext = vi.mocked(useAppContext);
const mockUseHostUser = vi.mocked(useHostUser);

function makeAppContext(
  override: Record<string, unknown> = {}
): ApplicationContext {
  return {
    marketplaceAppTenantId: "391dd026-9a1b-476b-3e30-08de9599d900",
    resourceAccess: [
      {
        tenantDisplayName: "Acme Inc.",
        tenantName: null,
      },
    ],
    ...override,
  } as unknown as ApplicationContext;
}

// ---------------------------------------------------------------------------
// Icon presence — AllowedState renders CircleCheck icon
// ---------------------------------------------------------------------------

describe("AllowedState — CircleCheck icon (T037a)", () => {
  it("renders CircleCheck icon (data-testid or aria-hidden svg)", () => {
    mockUseHostUser.mockReturnValue({ given_name: "Christian" });
    mockUseAppContext.mockReturnValue(makeAppContext());
    render(<AllowedState />);
    // Lucide icons render as <svg> with aria-hidden="true"
    // Query by test id set on the wrapper span, or by presence of svg
    const svgs = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgs.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// User display chain — 4 cases (same logic as T024a, now in AllowedState)
// ---------------------------------------------------------------------------

describe("AllowedState — user display chain (T037a)", () => {
  it('1. given_name present → renders "Welcome, Christian"', () => {
    mockUseHostUser.mockReturnValue({
      given_name: "Christian",
      name: "Christian Hahn",
      email: "christian@example.com",
    });
    mockUseAppContext.mockReturnValue(makeAppContext());
    render(<AllowedState />);
    expect(screen.getByText(/Welcome, Christian/)).toBeTruthy();
  });

  it('2. name present (no given_name) → renders "Welcome, Christian Hahn"', () => {
    mockUseHostUser.mockReturnValue({
      name: "Christian Hahn",
      email: "christian@example.com",
    });
    mockUseAppContext.mockReturnValue(makeAppContext());
    render(<AllowedState />);
    expect(screen.getByText(/Welcome, Christian Hahn/)).toBeTruthy();
  });

  it('3. email only → renders "Welcome, christian"', () => {
    mockUseHostUser.mockReturnValue({ email: "christian@example.com" });
    mockUseAppContext.mockReturnValue(makeAppContext());
    render(<AllowedState />);
    expect(screen.getByText(/Welcome, christian/)).toBeTruthy();
  });

  it('4. empty host.user {} → renders "Welcome, there"', () => {
    mockUseHostUser.mockReturnValue({});
    mockUseAppContext.mockReturnValue(makeAppContext());
    render(<AllowedState />);
    expect(screen.getByText(/Welcome, there/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tenant display chain — 4 cases
// ---------------------------------------------------------------------------

describe("AllowedState — tenant display chain (T037a)", () => {
  it('5. tenantDisplayName → body includes "Your tenant Acme Inc. has full access."', () => {
    mockUseHostUser.mockReturnValue({ given_name: "Test" });
    mockUseAppContext.mockReturnValue(
      makeAppContext({
        resourceAccess: [{ tenantDisplayName: "Acme Inc.", tenantName: null }],
      })
    );
    render(<AllowedState />);
    expect(
      screen.getByText(/Your tenant Acme Inc\. has full access\./)
    ).toBeTruthy();
  });

  it('6. tenantName (no tenantDisplayName) → body includes "Your tenant sitecoresaa516c-x has full access."', () => {
    mockUseHostUser.mockReturnValue({ given_name: "Test" });
    mockUseAppContext.mockReturnValue(
      makeAppContext({
        resourceAccess: [
          { tenantDisplayName: null, tenantName: "sitecoresaa516c-x" },
        ],
      })
    );
    render(<AllowedState />);
    expect(
      screen.getByText(/Your tenant sitecoresaa516c-x has full access\./)
    ).toBeTruthy();
  });

  it('7. empty resourceAccess → falls back to last 8 chars of marketplaceAppTenantId ("9599d900")', () => {
    mockUseHostUser.mockReturnValue({ given_name: "Test" });
    mockUseAppContext.mockReturnValue(
      makeAppContext({
        resourceAccess: [],
        marketplaceAppTenantId: "391dd026-9a1b-476b-3e30-08de9599d900",
      })
    );
    render(<AllowedState />);
    expect(screen.getByText(/Your tenant 9599d900 has full access\./)).toBeTruthy();
  });

  it("8. no resourceAccess and no marketplaceAppTenantId → body reads naturally without null/undefined", () => {
    mockUseHostUser.mockReturnValue({ given_name: "Test" });
    mockUseAppContext.mockReturnValue(
      makeAppContext({
        resourceAccess: undefined,
        marketplaceAppTenantId: undefined,
      })
    );
    render(<AllowedState />);
    const body = screen.getByText(/has full access/);
    expect(body.textContent).not.toContain("null");
    expect(body.textContent).not.toContain("undefined");
    expect(body.textContent).toMatch(/your tenant/i);
  });
});
