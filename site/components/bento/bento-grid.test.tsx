/**
 * Locked-state invariants. The premium region is aria-hidden while locked and
 * SubscribeBanner is a SIBLING of it, never a child — a parent-traversal
 * assertion pins that directly, because nesting it would make the one control
 * that unlocks the app invisible to assistive tech.
 * See docs/build-decisions.md#entitlement-truth-source.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/src/lib/paywall/hooks/useEntitlement", () => ({
  useEntitlement: vi.fn(),
}));

vi.mock("@/components/providers/marketplace", () => ({
  useHostUser: vi.fn(),
  useAppContext: vi.fn(),
  useMarketplaceClient: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ data: [] }),
  })),
}));

// Mock free card components to avoid deep import chains & OOM in JSDOM
vi.mock("./welcome-hero", () => ({
  WelcomeHero: () => <div data-testid="welcome-hero" data-card="f1" />,
}));
vi.mock("./sites-tile", () => ({
  SitesTile: () => <div data-testid="sites-tile" data-card="f2" />,
}));
vi.mock("./plan-card", () => ({
  PlanCard: () => <div data-testid="plan-card" data-card="f3" />,
}));
vi.mock("./user-profile", () => ({
  UserProfile: () => <div data-testid="user-profile" data-card="f4" />,
}));
vi.mock("./tenant-info", () => ({
  TenantInfo: () => <div data-testid="tenant-info" data-card="f5" />,
}));

// Mock premium card components (will be created in T026)
vi.mock("./activity-chart", () => ({
  ActivityChart: ({ "data-card": dataCard, locked }: { "data-card"?: string; locked: boolean }) => (
    <div data-testid="activity-chart" data-card={dataCard} data-locked={String(locked)} />
  ),
}));
vi.mock("./content-distribution", () => ({
  ContentDistribution: ({ "data-card": dataCard, locked }: { "data-card"?: string; locked: boolean }) => (
    <div data-testid="content-distribution" data-card={dataCard} data-locked={String(locked)} />
  ),
}));
vi.mock("./recent-edits", () => ({
  RecentEdits: ({ "data-card": dataCard, locked }: { "data-card"?: string; locked: boolean }) => (
    <div data-testid="recent-edits" data-card={dataCard} data-locked={String(locked)} />
  ),
}));
vi.mock("./cms-health", () => ({
  CmsHealth: ({ "data-card": dataCard, locked }: { "data-card"?: string; locked: boolean }) => (
    <div data-testid="cms-health" data-card={dataCard} data-locked={String(locked)} />
  ),
}));
vi.mock("./sitecore-content-insights", () => ({
  SitecoreContentInsights: ({ "data-card": dataCard, locked }: { "data-card"?: string; locked: boolean }) => (
    <div data-testid="sitecore-content-insights" data-card={dataCard} data-locked={String(locked)} />
  ),
}));
vi.mock("./content-health-score", () => ({
  ContentHealthScore: ({ "data-card": dataCard, locked }: { "data-card"?: string; locked: boolean }) => (
    <div data-testid="content-health-score" data-card={dataCard} data-locked={String(locked)} />
  ),
}));

// Mock SubscribeBanner (T027 — will be created after T026)
vi.mock("./subscribe-banner", () => ({
  SubscribeBanner: () => (
    <div
      data-testid="subscribe-banner"
      role="region"
      aria-labelledby="subscribe-banner-title"
    >
      <h2 id="subscribe-banner-title">Unlock Premium</h2>
      <button>Subscribe — €0.99 lifetime</button>
    </div>
  ),
}));

import { useEntitlement } from "@/src/lib/paywall/hooks/useEntitlement";
import { useHostUser, useAppContext } from "@/components/providers/marketplace";
import type { UseEntitlementReturn } from "@/src/lib/paywall/hooks/useEntitlement";
import { BentoGrid } from "./bento-grid";

const mockUseEntitlement = vi.mocked(useEntitlement);
const mockUseHostUser = vi.mocked(useHostUser);
const mockUseAppContext = vi.mocked(useAppContext);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockEntitlementUnused: UseEntitlementReturn = {
  entitlement: null,
  isLoading: false,
  error: null,
  triggerCheckout: vi.fn().mockResolvedValue(undefined),
};

const lockedTenantsRow = {
  plan: "free",
  status: "active",
  created_at: "2025-01-01T00:00:00Z",
};

const allowedTenantsRow = {
  plan: "premium",
  status: "active",
  created_at: "2025-01-01T00:00:00Z",
};

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

// ---------------------------------------------------------------------------
// Shared render helper (T031 refactor)
// ---------------------------------------------------------------------------

function renderBentoGrid(status: "tenant_no_subscription" | "allowed") {
  // BentoGrid no longer reads useEntitlement directly (Gate D fix 2026-05-18).
  // Mock it anyway so SubscribeBanner — which IS mounted in the locked branch
  // and DOES use useEntitlement — has a sane stub.
  mockUseEntitlement.mockReturnValue(mockEntitlementUnused);
  mockUseHostUser.mockReturnValue(
    defaultHostUser as ReturnType<typeof useHostUser>
  );
  mockUseAppContext.mockReturnValue(
    defaultAppCtx as unknown as ReturnType<typeof useAppContext>
  );
  const tenantsRow =
    status === "tenant_no_subscription" ? lockedTenantsRow : allowedTenantsRow;
  return render(<BentoGrid tenantsRow={tenantsRow} />);
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("BentoGrid — locked state (T031a RED → T031 GREEN)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Locked state assertions
  // -------------------------------------------------------------------------

  it("renders .premium-region with class premium-region--locked when tenant_no_subscription", () => {
    const { container } = renderBentoGrid("tenant_no_subscription");
    const lockedRegion = container.querySelector(".premium-region--locked");
    expect(lockedRegion).not.toBeNull();
  });

  it("renders .premium-region--locked with aria-hidden='true' when locked", () => {
    const { container } = renderBentoGrid("tenant_no_subscription");
    const lockedRegion = container.querySelector(".premium-region--locked");
    expect(lockedRegion).not.toBeNull();
    expect(lockedRegion?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders 6 PremiumPlaceholder/premium card instances inside premium-region when locked", () => {
    const { container } = renderBentoGrid("tenant_no_subscription");
    const premiumRegion =
      container.querySelector(".premium-region--locked") ??
      container.querySelector(".premium-region");
    expect(premiumRegion).not.toBeNull();
    // 6 direct data-card children (p1–p6)
    const cards = premiumRegion!.querySelectorAll("[data-card]");
    expect(cards.length).toBe(6);
  });

  it("mounts <SubscribeBanner> when locked", () => {
    renderBentoGrid("tenant_no_subscription");
    expect(screen.getByTestId("subscribe-banner")).toBeInTheDocument();
  });

  it("SubscribeBanner is a SIBLING of .premium-region (NOT a child) — parent traversal", () => {
    const { container } = renderBentoGrid("tenant_no_subscription");
    const banner = screen.getByTestId("subscribe-banner");

    // Banner must NOT have .premium-region as an ancestor
    expect(banner.closest(".premium-region")).toBeNull();
    expect(banner.closest(".premium-region--locked")).toBeNull();

    // Banner's parent must have .premium-section class
    expect(banner.parentElement?.classList.contains("premium-section")).toBe(true);

    // The .premium-section parent also contains the premium-region
    const premiumSection = container.querySelector(".premium-section");
    expect(premiumSection).not.toBeNull();
    const premiumRegion = premiumSection!.querySelector(".premium-region, .premium-region--locked");
    expect(premiumRegion).not.toBeNull();

    // Banner and premiumRegion are siblings (same parent)
    expect(banner.parentElement).toBe(premiumRegion!.parentElement);
  });

  it("SubscribeBanner parent has .premium-section class", () => {
    renderBentoGrid("tenant_no_subscription");
    const banner = screen.getByTestId("subscribe-banner");
    expect(banner.parentElement?.classList.contains("premium-section")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Unlocked state assertions
  // -------------------------------------------------------------------------

  it("does NOT have premium-region--locked class when allowed", () => {
    const { container } = renderBentoGrid("allowed");
    const lockedRegion = container.querySelector(".premium-region--locked");
    expect(lockedRegion).toBeNull();
  });

  it("does NOT have aria-hidden on premium-region when allowed", () => {
    const { container } = renderBentoGrid("allowed");
    const premiumRegion = container.querySelector(".premium-region");
    expect(premiumRegion?.getAttribute("aria-hidden")).toBeNull();
  });

  it("does NOT mount <SubscribeBanner> when allowed", () => {
    renderBentoGrid("allowed");
    expect(screen.queryByTestId("subscribe-banner")).toBeNull();
  });

  it("renders 6 premium cards (locked=false) when allowed", () => {
    const { container } = renderBentoGrid("allowed");
    const premiumRegion = container.querySelector(".premium-region");
    expect(premiumRegion).not.toBeNull();
    const cards = premiumRegion!.querySelectorAll("[data-card]");
    expect(cards.length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// T031 — Additional integration assertions
// ---------------------------------------------------------------------------

describe("BentoGrid — Subscribe banner structural regression (T031)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("banner.closest('.premium-region') is null — regression against blur-blur nesting bug", () => {
    const { container } = renderBentoGrid("tenant_no_subscription");
    const banner = container.querySelector("[data-testid='subscribe-banner']");
    expect(banner).not.toBeNull();
    expect(banner!.closest(".premium-region")).toBeNull();
    expect(banner!.closest(".premium-region--locked")).toBeNull();
  });

  it("premium cards receive locked=true when tenant_no_subscription", () => {
    const { container } = renderBentoGrid("tenant_no_subscription");
    const premiumCards = container.querySelectorAll("[data-locked]");
    // All 6 premium cards should be locked
    expect(premiumCards.length).toBe(6);
    premiumCards.forEach((card) => {
      expect(card.getAttribute("data-locked")).toBe("true");
    });
  });

  it("premium cards receive locked=false when allowed", () => {
    const { container } = renderBentoGrid("allowed");
    const premiumCards = container.querySelectorAll("[data-locked]");
    expect(premiumCards.length).toBe(6);
    premiumCards.forEach((card) => {
      expect(card.getAttribute("data-locked")).toBe("false");
    });
  });
});
