/**
 * NoSubscriptionState — locked copy + PaywallCheckoutDialog trigger behavior.
 * Locked strings per UI spec § 3.5 + § 8.
 *
 * 2026-05-13 revision: CTA changed from external-link `<a href="https://example.com/buy">`
 * to a `<button>` that opens PaywallCheckoutDialog (operator decision — placeholder for
 * PRD-001 Stripe Checkout). CTA label "View plans" stays locked.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { NoSubscriptionState } from "./NoSubscriptionState";

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

  it("clicking CTA opens the PaywallCheckoutDialog with the locked placeholder copy", async () => {
    const user = userEvent.setup();
    render(<NoSubscriptionState />);

    // Dialog content is not in the DOM until trigger fires
    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", { name: /View plans/i });
    await user.click(trigger);

    // Dialog opens and shows the placeholder title + body
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Unlock — €0.99 lifetime")).toBeTruthy();
    expect(
      screen.getByText(
        /Unlimited seats. Lifetime access to the premium section. One-time €0.99 payment\./,
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Got it" })).toBeTruthy();
  });
});
