/**
 * T037a RED — SeatsFullState locked copy + counter + link attributes.
 * Locked strings per UI spec § 3.6 + § 8. Verified against POC:
 *   pocs/poc-v1-prd000/state-seats-full.html
 * DESIGN-REFERENCE component per ADR-0011 — not reachable from evaluator.
 * Fails until T029 implements SeatsFullState.tsx.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SeatsFullState } from "./SeatsFullState";

describe("SeatsFullState — locked copy + counter + a11y (T037a)", () => {
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
        "Ask your team admin to reassign a seat, or upgrade your plan for more."
      )
    ).toBeTruthy();
  });

  it('renders CTA link "Upgrade plan"', () => {
    render(<SeatsFullState seatsTotal={5} />);
    expect(screen.getByRole("link", { name: /Upgrade plan/i })).toBeTruthy();
  });

  it('CTA link has href="https://example.com/upgrade"', () => {
    render(<SeatsFullState seatsTotal={5} />);
    const link = screen.getByRole("link", { name: /Upgrade plan/i });
    expect(link.getAttribute("href")).toBe("https://example.com/upgrade");
  });

  it('CTA link has target="_blank"', () => {
    render(<SeatsFullState seatsTotal={5} />);
    const link = screen.getByRole("link", { name: /Upgrade plan/i });
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it('CTA link has rel="noopener noreferrer"', () => {
    render(<SeatsFullState seatsTotal={5} />);
    const link = screen.getByRole("link", { name: /Upgrade plan/i });
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it('CTA link has aria-label="Upgrade plan (opens in new tab)"', () => {
    render(<SeatsFullState seatsTotal={5} />);
    const link = screen.getByRole("link", {
      name: "Upgrade plan (opens in new tab)",
    });
    expect(link).toBeTruthy();
  });

  it("NO secondary CTA link for admin-reassignment (text-only mention per PRD-000)", () => {
    render(<SeatsFullState seatsTotal={5} />);
    // There must be exactly ONE link — the upgrade CTA. No reassign link.
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
  });

  it("counter interpolates seatsTotal correctly for seatsTotal={3}", () => {
    render(<SeatsFullState seatsTotal={3} />);
    expect(screen.getByText("3 of 3 seats in use")).toBeTruthy();
  });
});
