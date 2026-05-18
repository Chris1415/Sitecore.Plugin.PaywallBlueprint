/**
 * T014 — Unit tests for <PlanCard> (F3) + formatMemberSince util.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanCard, formatMemberSince } from "./plan-card";

describe("formatMemberSince", () => {
  it("formats ISO date to 'Month DD, YYYY'", () => {
    expect(formatMemberSince("2026-05-15T00:00:00Z")).toBe("May 15, 2026");
  });

  it("returns — for null input", () => {
    expect(formatMemberSince(null)).toBe("—");
  });

  it("returns — for undefined input", () => {
    expect(formatMemberSince(undefined)).toBe("—");
  });

  it("returns — for invalid date string", () => {
    expect(formatMemberSince("not-a-date")).toBe("—");
  });
});

describe("PlanCard (F3)", () => {
  it("renders 'Free' plan label when tenantsRow is null", () => {
    render(<PlanCard tenantsRow={null} />);
    expect(screen.getByText("Free")).toBeTruthy();
  });

  it("renders '—' member since when tenantsRow is null", () => {
    render(<PlanCard tenantsRow={null} />);
    expect(screen.getByText(/Member since —/i)).toBeTruthy();
  });

  it("renders 'Premium' when plan is premium", () => {
    render(
      <PlanCard
        tenantsRow={{ plan: "premium", status: "active", created_at: "2026-01-01T00:00:00Z" }}
      />
    );
    expect(screen.getByText("Premium")).toBeTruthy();
  });

  it("renders 'Active' badge when status is active", () => {
    render(
      <PlanCard
        tenantsRow={{ plan: "free", status: "active", created_at: "2026-01-01T00:00:00Z" }}
      />
    );
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("does not render 'Active' badge when status is not active", () => {
    render(
      <PlanCard
        tenantsRow={{ plan: "free", status: "cancelled", created_at: "2026-01-01T00:00:00Z" }}
      />
    );
    const badge = screen.queryByText("Active");
    expect(badge).toBeNull();
  });

  it("formats member since date from tenantsRow.created_at", () => {
    render(
      <PlanCard
        tenantsRow={{ plan: "free", status: "active", created_at: "2026-05-17T00:00:00Z" }}
      />
    );
    expect(screen.getByText(/Member since May 17, 2026/i)).toBeTruthy();
  });
});
