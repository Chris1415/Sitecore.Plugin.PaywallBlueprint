/**
 * T037a RED — NoSubscriptionState locked copy + link attributes.
 * Locked strings per UI spec § 3.5 + § 8. Verified against POC:
 *   pocs/poc-v1-prd000/state-no-subscription.html
 * Fails until T028 implements NoSubscriptionState.tsx.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NoSubscriptionState } from "./NoSubscriptionState";

describe("NoSubscriptionState — locked copy + a11y (T037a)", () => {
  it('renders headline "Start your subscription" (verbatim)', () => {
    render(<NoSubscriptionState />);
    expect(screen.getByText("Start your subscription")).toBeTruthy();
  });

  it('renders body text verbatim — "Your tenant doesn\'t have an active plan yet. Pick a plan to unlock the premium section."', () => {
    render(<NoSubscriptionState />);
    expect(
      screen.getByText(
        "Your tenant doesn't have an active plan yet. Pick a plan to unlock the premium section."
      )
    ).toBeTruthy();
  });

  it('renders CTA link with label "View plans"', () => {
    render(<NoSubscriptionState />);
    expect(screen.getByRole("link", { name: /View plans/i })).toBeTruthy();
  });

  it('CTA link has href="https://example.com/buy"', () => {
    render(<NoSubscriptionState />);
    const link = screen.getByRole("link", { name: /View plans/i });
    expect(link.getAttribute("href")).toBe("https://example.com/buy");
  });

  it('CTA link has target="_blank"', () => {
    render(<NoSubscriptionState />);
    const link = screen.getByRole("link", { name: /View plans/i });
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it('CTA link has rel="noopener noreferrer"', () => {
    render(<NoSubscriptionState />);
    const link = screen.getByRole("link", { name: /View plans/i });
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it('CTA link has aria-label="View plans (opens in new tab)"', () => {
    render(<NoSubscriptionState />);
    const link = screen.getByRole("link", {
      name: "View plans (opens in new tab)",
    });
    expect(link).toBeTruthy();
  });
});
