/**
 * T042 — tests for <RecentEdits> (P3).
 * 5 hardcoded rows with exact text + author initials.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentEdits } from "./recent-edits";

describe("<RecentEdits> (T042)", () => {
  it("renders exactly 5 edit rows in unlocked mode", () => {
    render(<RecentEdits locked={false} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBe(5);
  });

  it("renders correct site and item text for all 5 rows", () => {
    render(<RecentEdits locked={false} />);

    // "Marketing Site" appears in rows 1 + 5 — use getAllByText
    const marketingSites = screen.getAllByText("Marketing Site");
    expect(marketingSites.length).toBe(2);

    expect(screen.getByText("Homepage hero")).toBeTruthy();
    expect(screen.getByText("Blog")).toBeTruthy();
    expect(screen.getByText("Post template")).toBeTruthy();
    expect(screen.getByText("Company Site")).toBeTruthy();
    expect(screen.getByText("Footer datasource")).toBeTruthy();
    expect(screen.getByText("Product Catalog")).toBeTruthy();
    expect(screen.getByText("Featured product card")).toBeTruthy();
    expect(screen.getByText("Career page meta")).toBeTruthy();
  });

  it("renders correct relative times for all 5 rows", () => {
    render(<RecentEdits locked={false} />);

    expect(screen.getByText("2h ago")).toBeTruthy();
    expect(screen.getByText("yesterday")).toBeTruthy();
    expect(screen.getByText("2d ago")).toBeTruthy();
    expect(screen.getByText("3d ago")).toBeTruthy();
    expect(screen.getByText("4d ago")).toBeTruthy();
  });

  it("renders 3 distinct author initials: CH (×2), AB (×2), MS (×1)", () => {
    render(<RecentEdits locked={false} />);

    const chElements = screen.getAllByText("CH");
    const abElements = screen.getAllByText("AB");
    const msElements = screen.getAllByText("MS");

    expect(chElements.length).toBe(2);
    expect(abElements.length).toBe(2);
    expect(msElements.length).toBe(1);
  });

  it("renders title 'Recent edits' and subtitle 'Across all sites'", () => {
    render(<RecentEdits locked={false} />);

    expect(screen.getByText("Recent edits")).toBeTruthy();
    expect(screen.getByText("Across all sites")).toBeTruthy();
  });

  it("renders PremiumPlaceholder in locked mode (no list rows)", () => {
    render(<RecentEdits locked={true} />);

    expect(screen.queryByText("Recent edits")).toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
