/**
 * T044 — tests for <SitecoreContentInsights> (P5).
 * 3 hardcoded Sitecore-flavored insight bullets.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SitecoreContentInsights } from "./sitecore-content-insights";

describe("<SitecoreContentInsights> (T044)", () => {
  it("renders all 3 insight bullets with exact text in unlocked mode", () => {
    render(<SitecoreContentInsights locked={false} />);

    expect(
      screen.getByText(
        "Your blog template is reused 47 times across 3 sites — consider promoting to a shared component."
      )
    ).toBeTruthy();

    expect(
      screen.getByText(
        "12 items haven't been updated in 90+ days — review for archival candidates."
      )
    ).toBeTruthy();

    expect(
      screen.getByText(
        "Publishing frequency dropped 23% Mon–Fri vs last week — check editorial calendar."
      )
    ).toBeTruthy();
  });

  it("renders title and subtitle", () => {
    render(<SitecoreContentInsights locked={false} />);

    expect(screen.getByText("Sitecore content insights")).toBeTruthy();
    expect(screen.getByText("AI-derived patterns from your content")).toBeTruthy();
  });

  it("renders PremiumPlaceholder in locked mode (no bullet text)", () => {
    render(<SitecoreContentInsights locked={true} />);

    expect(
      screen.queryByText(/Your blog template is reused/)
    ).toBeNull();
    expect(
      screen.queryByText(/12 items haven/)
    ).toBeNull();
    expect(
      screen.queryByText(/Publishing frequency/)
    ).toBeNull();
  });

  it("renders Premium badge in both locked and unlocked states", () => {
    const { rerender } = render(<SitecoreContentInsights locked={false} />);
    expect(screen.getByText("Premium")).toBeTruthy();

    rerender(<SitecoreContentInsights locked={true} />);
    expect(screen.getByText("Premium")).toBeTruthy();
  });
});
