/**
 * T037a RED — UserUnassignedState locked copy + no-CTA assertion.
 * Locked strings per UI spec § 3.7 + § 8. Verified against POC:
 *   pocs/poc-v1-prd000/state-unassigned.html
 * DESIGN-REFERENCE component per ADR-0011 — not reachable from evaluator.
 * NO CTA in PRD-000 — deliberate per PRD US-3 (no disabled buttons).
 * Fails until T030 implements UserUnassignedState.tsx.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserUnassignedState } from "./UserUnassignedState";

describe("UserUnassignedState — locked copy + no-CTA (T037a)", () => {
  it('renders headline "Ask your team admin" (verbatim)', () => {
    render(<UserUnassignedState />);
    expect(screen.getByText("Ask your team admin")).toBeTruthy();
  });

  it('renders body text verbatim — "Your tenant has a plan, but your team admin hasn\'t given you a seat yet."', () => {
    render(<UserUnassignedState />);
    expect(
      screen.getByText(
        "Your tenant has a plan, but your team admin hasn't given you a seat yet."
      )
    ).toBeTruthy();
  });

  it("NO link element present (no CTA per PRD-000 US-3)", () => {
    render(<UserUnassignedState />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("NO button element present (no CTA per PRD-000 US-3)", () => {
    render(<UserUnassignedState />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
