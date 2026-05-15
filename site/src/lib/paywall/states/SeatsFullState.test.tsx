/**
 * SeatsFullState — locked copy + counter + PaywallCheckoutDialog trigger behavior.
 * Locked strings per UI spec § 3.6 + § 8.
 * DESIGN-REFERENCE component per ADR-0011 — not reachable from PRD-000 evaluator.
 *
 * 2026-05-13 revision: CTA changed from external-link `<a href="https://example.com/upgrade">`
 * to a `<button>` that opens PaywallCheckoutDialog (operator decision — placeholder for
 * PRD-001 Stripe Checkout). CTA label "Upgrade plan" stays locked.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { SeatsFullState } from "./SeatsFullState";

describe("SeatsFullState — locked copy + counter + a11y (revised 2026-05-13)", () => {
  it('renders headline "All seats in use" (verbatim)', () => {
    render(<SeatsFullState seatsTotal={5} />);
    expect(screen.getByText("All seats in use")).toBeTruthy();
  });

  it('renders counter "5 of 5 seats in use" when seatsTotal={5}', () => {
    render(<SeatsFullState seatsTotal={5} />);
    expect(screen.getByText("5 of 5 seats in use")).toBeTruthy();
  });

  it('renders body text verbatim — "Ask your team admin to reassign a seat, or upgrade your plan for more."', () => {
    render(<SeatsFullState seatsTotal={5} />);
    expect(
      screen.getByText(
        "Ask your team admin to reassign a seat, or upgrade your plan for more.",
      ),
    ).toBeTruthy();
  });

  it('renders CTA button "Upgrade plan" (NOT a link)', () => {
    render(<SeatsFullState seatsTotal={5} />);
    expect(screen.getByRole("button", { name: /Upgrade plan/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Upgrade plan/i })).toBeNull();
  });

  it('CTA button has aria-label="Upgrade plan"', () => {
    render(<SeatsFullState seatsTotal={5} />);
    const button = screen.getByRole("button", { name: "Upgrade plan" });
    expect(button.getAttribute("aria-label")).toBe("Upgrade plan");
  });

  it("NO secondary CTA for admin-reassignment (text-only mention per PRD-000)", () => {
    render(<SeatsFullState seatsTotal={5} />);
    // There must be exactly ONE button — the upgrade CTA. No reassign button.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
  });

  it("clicking CTA opens the PaywallCheckoutDialog with the locked placeholder copy", async () => {
    const user = userEvent.setup();
    render(<SeatsFullState seatsTotal={5} />);

    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", { name: /Upgrade plan/i });
    await user.click(trigger);

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Unlock — €0.99 lifetime")).toBeTruthy();
    expect(
      screen.getByText(
        /Unlimited seats. Lifetime access to the premium section. One-time €0.99 payment\./,
      ),
    ).toBeTruthy();
  });

  it("counter interpolates seatsTotal correctly for seatsTotal={3}", () => {
    render(<SeatsFullState seatsTotal={3} />);
    expect(screen.getByText("3 of 3 seats in use")).toBeTruthy();
  });
});
