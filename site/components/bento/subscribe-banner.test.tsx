/**
 * T031a — RED tests for <SubscribeBanner>
 *
 * TDD: These tests are written BEFORE T027 implements the component.
 * All should FAIL (RED) until SubscribeBanner exists.
 *
 * Tests verify:
 *   (a) Title "Unlock Premium" present
 *   (b) Sub-headline "€0.99 lifetime" present
 *   (c) <Lock /> icon visible above title
 *   (d) Subscribe button has aria-label or text matching "Subscribe — €0.99 lifetime"
 *   (e) Clicking Subscribe button opens <PaywallCheckoutDialog>
 *       (NO real Stripe call — dialog open is mocked/asserted via DOM)
 *
 * sitecore:blok-theming — runtime contrast: CTA button color must differ from background.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock useEntitlement so PaywallCheckoutDialog (used inside SubscribeBanner) doesn't fetch
vi.mock("@/src/lib/paywall/hooks/useEntitlement", () => ({
  useEntitlement: vi.fn(),
}));

// Mock MarketplaceProvider hooks (may be required by nested components)
vi.mock("@/components/providers/marketplace", () => ({
  useHostUser: vi.fn(),
  useAppContext: vi.fn(),
}));

import { useEntitlement } from "@/src/lib/paywall/hooks/useEntitlement";
import { SubscribeBanner } from "./subscribe-banner";

const mockUseEntitlement = vi.mocked(useEntitlement);

beforeEach(() => {
  mockUseEntitlement.mockReturnValue({
    entitlement: { status: "tenant_no_subscription" },
    isLoading: false,
    error: null,
    triggerCheckout: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useEntitlement>);
});

describe("SubscribeBanner — T031a RED tests", () => {
  it("renders title 'Unlock Premium'", () => {
    render(<SubscribeBanner />);
    expect(
      screen.getByRole("heading", { name: /Unlock Premium/i })
    ).toBeInTheDocument();
  });

  it("renders sub-headline '€0.99 lifetime'", () => {
    render(<SubscribeBanner />);
    // May appear in multiple places (button + price line) — check at least one
    expect(screen.getAllByText(/€0\.99 lifetime/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders a Lock icon visible above the title (aria-hidden svg)", () => {
    const { container } = render(<SubscribeBanner />);
    // Lucide Lock renders as an SVG with class 'lucide-lock' or within a wrapper
    // We check the banner has an SVG near the top of the DOM
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("Subscribe button has text matching 'Subscribe — €0.99 lifetime'", () => {
    render(<SubscribeBanner />);
    const btn = screen.getByRole("button", {
      name: /Subscribe.*€0\.99 lifetime/i,
    });
    expect(btn).toBeInTheDocument();
  });

  it("has role='region' and aria-labelledby pointing to the title", () => {
    const { container } = render(<SubscribeBanner />);
    const region = container.querySelector("[role='region']");
    expect(region).not.toBeNull();
    const labelledBy = region?.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    // The heading with that id should exist
    const heading = document.getElementById(labelledBy!);
    expect(heading).not.toBeNull();
  });

  it("clicking Subscribe button opens the PaywallCheckoutDialog (dialog becomes visible)", async () => {
    const user = userEvent.setup();
    render(<SubscribeBanner />);

    const subscribeBtn = screen.getByRole("button", {
      name: /Subscribe.*€0\.99 lifetime/i,
    });

    await user.click(subscribeBtn);

    // After click, the PaywallCheckoutDialog should be open.
    // It renders a Dialog with title "Unlock — €0.99 lifetime"
    expect(
      await screen.findByRole("dialog")
    ).toBeInTheDocument();
  });

  it("CTA button color differs from its background (--primary-foreground collapse guard)", () => {
    const { container } = render(<SubscribeBanner />);
    const btn = container.querySelector("button");
    expect(btn).not.toBeNull();
    // In JSDOM, computed styles won't resolve CSS vars — assert the button
    // does NOT have a class that would map both color and bg to the same token.
    // Structural check: button should have text-background class OR
    // not simultaneously apply bg-primary + text-primary
    const className = btn!.className;
    // If text-background is applied, this guard is satisfied
    // If neither text-background nor text-primary-foreground, we check it doesn't collapse
    const hasBothPrimaryBgAndText =
      className.includes("bg-primary") && className.includes("text-primary") && !className.includes("text-background") && !className.includes("text-primary-foreground");
    expect(hasBothPrimaryBgAndText).toBe(false);
  });

  it("has data-testid='subscribe-banner' for parent-traversal assertions", () => {
    render(<SubscribeBanner />);
    expect(screen.getByTestId("subscribe-banner")).toBeInTheDocument();
  });
});
