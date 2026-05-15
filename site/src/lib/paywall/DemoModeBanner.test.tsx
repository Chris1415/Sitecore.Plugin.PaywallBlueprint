/**
 * T032a RED — DemoModeBanner locked copy + non-dismissible assertion.
 * Locked strings per FR-6 + ADR-0004:
 *   Title: "Paywall disabled — demo mode"
 *   Description: "Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."
 * Non-dismissible: no close/dismiss button.
 * Fails until T032b implements DemoModeBanner.tsx.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DemoModeBanner } from "./DemoModeBanner";

describe("DemoModeBanner — locked copy + non-dismissible (T032a)", () => {
  it('renders exact title "Paywall disabled — demo mode"', () => {
    render(<DemoModeBanner />);
    expect(screen.getByText("Paywall disabled — demo mode")).toBeTruthy();
  });

  it('renders exact description "Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."', () => {
    render(<DemoModeBanner />);
    expect(
      screen.getByText(
        "Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."
      )
    ).toBeTruthy();
  });

  it("is non-dismissible — no button rendered", () => {
    render(<DemoModeBanner />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
