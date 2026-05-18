/**
 * T018a — RED tests for <UserProfile> (F4)
 *
 * These tests are written BEFORE the component implementation (TDD RED phase).
 * They will fail until T015 implements user-profile.tsx.
 *
 * Contrast assertions: Option A (structural-only) per operator_attention "JSDOM CSS-vars" gap.
 * JSDOM does not resolve CSS custom properties to actual color values, so we assert
 * the component renders the expected semantic-token classes.
 * Runtime contrast verified at Tranche D Playwright + axe scan (T051).
 *
 * sitecore:blok-theming — tokens: text-foreground, text-muted-foreground, bg-muted.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserProfile } from "./user-profile";

// ---------------------------------------------------------------------------
// Mock MarketplaceProvider hooks
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  useHostUser: vi.fn(),
  useAppContext: vi.fn(),
}));

import { useHostUser } from "@/components/providers/marketplace";

const mockUseHostUser = vi.mocked(useHostUser);

describe("UserProfile (F4) — T018a RED", () => {
  it("derives initials from given_name + family_name", () => {
    mockUseHostUser.mockReturnValue({
      given_name: "Christian",
      family_name: "Hahn",
      name: "Christian Hahn",
      email: "christian@hahn-solo.net",
      sub: "auth0|abc123def456gh789ij0123",
    } as ReturnType<typeof useHostUser>);
    render(<UserProfile />);
    expect(screen.getByText("CH")).toBeTruthy();
  });

  it("falls back to name[0] when given_name is absent", () => {
    mockUseHostUser.mockReturnValue({
      name: "Alice",
      email: "alice@example.com",
      sub: "auth0|alice123",
    } as ReturnType<typeof useHostUser>);
    render(<UserProfile />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("falls back to '?' when no name fields present", () => {
    mockUseHostUser.mockReturnValue({
      email: "noid@example.com",
      sub: "auth0|noid123",
    } as ReturnType<typeof useHostUser>);
    render(<UserProfile />);
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("renders email in the DOM", () => {
    mockUseHostUser.mockReturnValue({
      given_name: "Christian",
      family_name: "Hahn",
      name: "Christian Hahn",
      email: "christian@hahn-solo.net",
      sub: "auth0|abc123def456gh789ij0123",
    } as ReturnType<typeof useHostUser>);
    render(<UserProfile />);
    expect(screen.getByText("christian@hahn-solo.net")).toBeTruthy();
  });

  it("renders sub truncated to first 22 chars + ellipsis", () => {
    mockUseHostUser.mockReturnValue({
      given_name: "Christian",
      family_name: "Hahn",
      name: "Christian Hahn",
      email: "christian@hahn-solo.net",
      sub: "auth0|abc123def456gh789ij0123456789",
    } as ReturnType<typeof useHostUser>);
    render(<UserProfile />);
    // first 22 chars of "auth0|abc123def456gh789ij0123456789" = "auth0|abc123def456gh78"
    expect(screen.getByText("auth0|abc123def456gh78\u2026")).toBeTruthy();
  });

  it("renders — for sub when sub is missing", () => {
    mockUseHostUser.mockReturnValue({
      given_name: "Christian",
      name: "Christian",
      email: "christian@hahn-solo.net",
    } as ReturnType<typeof useHostUser>);
    render(<UserProfile />);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("structural contrast: name has text-foreground class (structural-only — runtime contrast at T051)", () => {
    mockUseHostUser.mockReturnValue({
      given_name: "Christian",
      family_name: "Hahn",
      name: "Christian Hahn",
      email: "christian@hahn-solo.net",
      sub: "auth0|abc123def456gh789ij0123",
    } as ReturnType<typeof useHostUser>);
    render(<UserProfile />);
    // pickUserDisplay returns "Christian Hahn" since both given_name+family_name available?
    // Actually pickUserDisplay returns given_name only = "Christian"
    // The name row renders hostUser.name or pickUserDisplay output
    // Structural check: find an element with text-foreground class
    const nameEl = screen.getByText("Christian Hahn");
    expect(nameEl.className).toMatch(/text-foreground/);
  });
});
