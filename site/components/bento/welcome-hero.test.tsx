/**
 * T018a — RED tests for <WelcomeHero> (F1)
 *
 * These tests are written BEFORE the component implementation (TDD RED phase).
 * They will fail until T011 implements welcome-hero.tsx.
 *
 * Contrast assertions: Option A (structural-only) per operator_attention "JSDOM CSS-vars" gap.
 * JSDOM does not resolve CSS custom properties to actual color values, so we assert
 * the component renders the expected semantic-token classes rather than computing
 * actual contrast ratios. Runtime contrast verified at Tranche D Playwright + axe scan (T051).
 *
 * sitecore:blok-theming — tokens: text-foreground, text-muted-foreground, bg-card.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WelcomeHero } from "./welcome-hero";

// ---------------------------------------------------------------------------
// Mock MarketplaceProvider hooks
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  useHostUser: vi.fn(),
  useAppContext: vi.fn(),
}));

import { useHostUser, useAppContext } from "@/components/providers/marketplace";

const mockUseHostUser = vi.mocked(useHostUser);
const mockUseAppContext = vi.mocked(useAppContext);

// ---------------------------------------------------------------------------
// Default fixtures
// ---------------------------------------------------------------------------
const defaultHostUser = {
  given_name: "Christian",
  family_name: "Hahn",
  name: "Christian Hahn",
  email: "christian@hahn-solo.net",
  sub: "auth0|abc123def456gh789ij0123456789",
};

const defaultAppCtx = {
  marketplaceAppTenantId: "0d4b9c4d-1234-5678-9012-abcda91c",
  resourceAccess: [
    {
      tenantDisplayName: "Hahn-Solo Demo Tenant",
      tenantName: "hahn-solo",
      context: { live: "CTX-LIVE", preview: "CTX-PREV" },
    },
  ],
};

describe("WelcomeHero (F1) — T018a RED", () => {
  beforeEach(() => {
    mockUseHostUser.mockReturnValue(defaultHostUser as ReturnType<typeof useHostUser>);
    mockUseAppContext.mockReturnValue(defaultAppCtx as unknown as ReturnType<typeof useAppContext>);
  });

  it("renders greeting with given_name from useHostUser", () => {
    render(<WelcomeHero tenantsRow={null} />);
    // F1 hero: "Welcome, {displayName}."
    expect(screen.getByText(/Welcome, Christian/i)).toBeTruthy();
  });

  it("renders fallback when all name fields absent", () => {
    mockUseHostUser.mockReturnValue({} as ReturnType<typeof useHostUser>);
    render(<WelcomeHero tenantsRow={null} />);
    // pickUserDisplay fallback returns "there"
    expect(screen.getByText(/Welcome, there/i)).toBeTruthy();
  });

  it("renders tenant display name", () => {
    render(<WelcomeHero tenantsRow={null} />);
    expect(screen.getByText("Hahn-Solo Demo Tenant")).toBeTruthy();
  });

  it("renders Free plan badge when tenantsRow is null", () => {
    render(<WelcomeHero tenantsRow={null} />);
    expect(screen.getByText(/Free plan/i)).toBeTruthy();
  });

  it("renders Premium badge when tenantsRow.plan is premium", () => {
    render(
      <WelcomeHero
        tenantsRow={{ plan: "premium", status: "active", created_at: "2026-01-01" }}
      />
    );
    expect(screen.getByText(/Premium/i)).toBeTruthy();
  });

  it("structural contrast: heading has text-foreground class (structural-only — runtime contrast at T051)", () => {
    render(<WelcomeHero tenantsRow={null} />);
    // Structural check: heading should carry text-foreground (semantic token)
    // True contrast ratio verified at Tranche D Playwright + axe scan (T051).
    // JSDOM does not resolve CSS custom properties — cannot compute actual contrast here.
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toMatch(/text-foreground/);
  });

  it("has correct aria-labelledby wiring on the section", () => {
    render(<WelcomeHero tenantsRow={null} />);
    const section = screen.getByRole("region");
    const labelledBy = section.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    // The heading with that id must exist
    const heading = document.getElementById(labelledBy!);
    expect(heading).toBeTruthy();
  });
});
