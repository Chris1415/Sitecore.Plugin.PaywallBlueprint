/**
 * NoSubscriptionState — locked copy + PaywallCheckoutDialog trigger behavior.
 * Locked strings per UI spec § 3.5 + § 8.
 *
 * 2026-05-13 revision: CTA changed from external-link `<a href="https://example.com/buy">`
 * to a `<button>` that opens PaywallCheckoutDialog (operator decision — placeholder for
 * PRD-001 Stripe Checkout). CTA label "View plans" stays locked.
 *
 * T035 update (PRD-001): PaywallCheckoutDialog now uses useEntitlement internally.
 * Mock useEntitlement to keep NoSubscriptionState tests focused on state copy + CTA behavior.
 * Dialog now shows new PRD-001 copy: "Subscribe — €0.99 lifetime" primary button + "Cancel".
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { NoSubscriptionState } from "./NoSubscriptionState";

// Mock useEntitlement so dialog renders without needing MarketplaceProvider
vi.mock("@/src/lib/paywall/hooks/useEntitlement", () => ({
  useEntitlement: () => ({
    entitlement: null,
    isLoading: false,
    error: null,
    triggerCheckout: vi.fn(),
  }),
}));

describe("NoSubscriptionState — locked copy + a11y (revised 2026-05-13)", () => {
  it('renders headline "Start your subscription" (verbatim)', () => {
    render(<NoSubscriptionState />);
    expect(screen.getByText("Start your subscription")).toBeTruthy();
  });

  it('renders body text verbatim — "Your tenant doesn\'t have an active plan yet. Pick a plan to unlock the premium section."', () => {
    render(<NoSubscriptionState />);
    expect(
      screen.getByText(
        "Your tenant doesn't have an active plan yet. Pick a plan to unlock the premium section.",
      ),
    ).toBeTruthy();
  });

  it('renders CTA button with label "View plans" (NOT a link)', () => {
    render(<NoSubscriptionState />);
    expect(screen.getByRole("button", { name: /View plans/i })).toBeTruthy();
    // Verify the OLD external-link contract is gone — no <a> with href to checkout
    expect(screen.queryByRole("link", { name: /View plans/i })).toBeNull();
  });

  it('CTA button has aria-label="View plans"', () => {
    render(<NoSubscriptionState />);
    const button = screen.getByRole("button", { name: "View plans" });
    expect(button.getAttribute("aria-label")).toBe("View plans");
  });

  it("clicking CTA opens the PaywallCheckoutDialog with PRD-001 rewired copy", async () => {
    const user = userEvent.setup();
    render(<NoSubscriptionState />);

    // Dialog content is not in the DOM until trigger fires
    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", { name: /View plans/i });
    await user.click(trigger);

    // Dialog opens and shows the PRD-001 title + body + locked buttons
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Unlock — €0.99 lifetime")).toBeTruthy();
    expect(
      screen.getByText(
        /One-time payment. Unlimited seats. Lifetime access to the premium section\./,
      ),
    ).toBeTruthy();
    // PRD-001 locked button copy
    expect(screen.getByRole("button", { name: "Subscribe — €0.99 lifetime" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    // Old "Got it" placeholder is gone
    expect(screen.queryByRole("button", { name: "Got it" })).toBeNull();
  });
});
