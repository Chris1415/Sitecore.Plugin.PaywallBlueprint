/**
 * T018a — RED tests for <TenantInfo> (F5)
 *
 * These tests are written BEFORE the component implementation (TDD RED phase).
 * They will fail until T016 implements tenant-info.tsx.
 *
 * Contrast assertions: Option A (structural-only) per operator_attention "JSDOM CSS-vars" gap.
 * JSDOM does not resolve CSS custom properties to actual color values.
 * Runtime contrast verified at Tranche D Playwright + axe scan (T051).
 *
 * sitecore:blok-theming — tokens: text-foreground, text-muted-foreground.
 * shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts ApplicationResourceContext
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TenantInfo } from "./tenant-info";

// ---------------------------------------------------------------------------
// Mock MarketplaceProvider hooks
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  useHostUser: vi.fn(),
  useAppContext: vi.fn(),
}));

import { useAppContext } from "@/components/providers/marketplace";

const mockUseAppContext = vi.mocked(useAppContext);

describe("TenantInfo (F5) — T018a RED", () => {
  it("renders all 4 cells when all fields present", () => {
    mockUseAppContext.mockReturnValue({
      marketplaceAppTenantId: "0d4b9c4d-1234-5678-9012-abcda91c",
      resourceAccess: [
        {
          tenantDisplayName: "Hahn-Solo Demo Tenant",
          tenantName: "hahn-solo",
          context: { live: "CTX-LIVE-01", preview: "CTX-PREV" },
        },
      ],
    } as unknown as ReturnType<typeof useAppContext>);
    render(<TenantInfo />);
    // Display name
    expect(screen.getByText("Hahn-Solo Demo Tenant")).toBeTruthy();
    // Organization — tenantName fallback
    expect(screen.getByText("hahn-solo")).toBeTruthy();
    // Environment — context.live
    expect(screen.getByText("CTX-LIVE-01")).toBeTruthy();
  });

  it("renders — for all 4 cells when context fields missing", () => {
    mockUseAppContext.mockReturnValue({
      marketplaceAppTenantId: undefined,
      resourceAccess: [],
    } as unknown as ReturnType<typeof useAppContext>);
    render(<TenantInfo />);
    // All 4 cells should show — (there will be multiple — in the DOM)
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  // (This test is superseded by "shows truncated tenantId in correct format" below — kept for coverage of short IDs)
  it("shows full tenant ID when it is shorter than 12 chars", () => {
    mockUseAppContext.mockReturnValue({
      marketplaceAppTenantId: "short-id",
      resourceAccess: [
        {
          tenantDisplayName: "Test Tenant",
          context: { live: "CTX-LIVE", preview: "CTX-PREV" },
        },
      ],
    } as unknown as ReturnType<typeof useAppContext>);
    render(<TenantInfo />);
    // Short IDs (< 12 chars) pass through unchanged
    expect(screen.getByText("short-id")).toBeTruthy();
  });

  it("shows truncated tenantId in correct format", () => {
    const tenantId = "0d4b9c4d-1234-5678-9012-abcda91c";
    mockUseAppContext.mockReturnValue({
      marketplaceAppTenantId: tenantId,
      resourceAccess: [
        {
          tenantDisplayName: "Test Tenant",
          context: { live: "CTX-LIVE", preview: "CTX-PREV" },
        },
      ],
    } as unknown as ReturnType<typeof useAppContext>);
    render(<TenantInfo />);
    // first 8 = "0d4b9c4d", last 4 = "a91c"
    const firstEight = tenantId.slice(0, 8);
    const lastFour = tenantId.slice(-4);
    expect(screen.getByText(`${firstEight}\u2026${lastFour}`)).toBeTruthy();
  });

  it("shows — for tenant ID when marketplaceAppTenantId is missing", () => {
    mockUseAppContext.mockReturnValue({
      marketplaceAppTenantId: undefined,
      resourceAccess: [
        {
          tenantDisplayName: "Test Tenant",
          context: { live: "CTX-LIVE", preview: "CTX-PREV" },
        },
      ],
    } as unknown as ReturnType<typeof useAppContext>);
    render(<TenantInfo />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("structural contrast: label cells have text-muted-foreground class (structural-only — runtime contrast at T051)", () => {
    mockUseAppContext.mockReturnValue({
      marketplaceAppTenantId: "0d4b9c4d-1234-5678-9012-abcda91c",
      resourceAccess: [
        {
          tenantDisplayName: "Hahn-Solo Demo Tenant",
          tenantName: "hahn-solo",
          context: { live: "CTX-LIVE", preview: "CTX-PREV" },
        },
      ],
    } as unknown as ReturnType<typeof useAppContext>);
    render(<TenantInfo />);
    // Check that at least one label cell has text-muted-foreground
    const labelEl = screen.getByText("Display name");
    expect(labelEl.className).toMatch(/text-muted-foreground/);
  });
});
