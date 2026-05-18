/**
 * T013a — RED tests for <SitesTile> (F2)
 *
 * These tests are written BEFORE the component implementation (TDD RED phase).
 * They will fail until T012 implements sites-tile.tsx.
 *
 * Covers BOTH envelope shapes per § 4c-6 ambiguity:
 *   - Single-unwrap: { data: Sites.Site[] } (GREEN target for implementation)
 *   - Double-unwrap: { data: { data: Sites.Site[] } } (documented placeholder for T020 Gate B)
 *
 * Fixture provenance (mandatory per 40-sdk-contracts.mdc):
 *   source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SitesTile } from "./sites-tile";

// ---------------------------------------------------------------------------
// Mock MarketplaceProvider hooks
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  useMarketplaceClient: vi.fn(),
  useAppContext: vi.fn(),
  useHostUser: vi.fn(),
}));

import { useMarketplaceClient, useAppContext } from "@/components/providers/marketplace";

const mockUseMarketplaceClient = vi.mocked(useMarketplaceClient);
const mockUseAppContext = vi.mocked(useAppContext);

// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
import {
  mockSites,
  mockListSitesResponseSingle,
  mockListSitesResponseDouble,
  mockListSitesEmpty,
  mockListSitesError,
} from "./__fixtures__/sites";

// ---------------------------------------------------------------------------
// Default app context fixture
// ---------------------------------------------------------------------------
const defaultAppCtx = {
  marketplaceAppTenantId: "test-tenant-001",
  resourceAccess: [
    {
      context: { live: "CTX-TEST", preview: "CTX-PREV" },
      tenantDisplayName: "Test Tenant",
    },
  ],
};

describe("SitesTile (F2) — T013a RED", () => {
  beforeEach(() => {
    mockUseAppContext.mockReturnValue(defaultAppCtx as unknown as ReturnType<typeof useAppContext>);
  });

  it("1. renders Skeleton on mount before the promise resolves", async () => {
    // Never-resolving promise to keep loading state
    const queryMock = vi.fn().mockReturnValue(new Promise(() => {}));
    mockUseMarketplaceClient.mockReturnValue({ query: queryMock } as unknown as ReturnType<typeof useMarketplaceClient>);

    render(<SitesTile />);
    // Skeleton should be in DOM while loading
    // Look for skeleton element — the Blok Skeleton renders with data-slot="skeleton" or role="status"
    expect(document.querySelector('[data-slot="skeleton"], [aria-busy="true"], .animate-pulse')).toBeTruthy();
  });

  it("2. renders count + first 2 site names on success with 5 sites (double-unwrap)", async () => {
    // source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
    // Envelope: { data: { data: Sites.Site[] } } — T020 Gate B confirmed 2026-05-18
    const queryMock = vi.fn().mockResolvedValue(mockListSitesResponseDouble);
    mockUseMarketplaceClient.mockReturnValue({ query: queryMock } as unknown as ReturnType<typeof useMarketplaceClient>);

    render(<SitesTile />);

    await waitFor(() => {
      // Count should be visible
      expect(screen.getByText("5")).toBeTruthy();
    });

    // First 2 displayNames
    expect(screen.getByText("Marketing Site")).toBeTruthy();
    expect(screen.getByText("Blog Site")).toBeTruthy();
    // "…and 3 more" for the remaining 3
    expect(screen.getByText(/and 3 more/i)).toBeTruthy();
  });

  it("3. renders empty-state copy on success with 0 sites", async () => {
    const queryMock = vi.fn().mockResolvedValue(mockListSitesEmpty);
    mockUseMarketplaceClient.mockReturnValue({ query: queryMock } as unknown as ReturnType<typeof useMarketplaceClient>);

    render(<SitesTile />);

    await waitFor(() => {
      expect(
        screen.getByText(/No sites in this tenant yet/i)
      ).toBeTruthy();
    });
  });

  it("4. renders Alert + Retry button on rejected promise", async () => {
    const queryMock = vi.fn().mockRejectedValue(mockListSitesError);
    mockUseMarketplaceClient.mockReturnValue({ query: queryMock } as unknown as ReturnType<typeof useMarketplaceClient>);

    render(<SitesTile />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
    });
    // Alert should be in DOM — check for destructive alert presence
    expect(document.querySelector('[data-variant="destructive"], [role="alert"]')).toBeTruthy();
  });

  it("5. clicking Retry re-invokes client.query — call count = 2", async () => {
    const queryMock = vi.fn().mockRejectedValue(mockListSitesError);
    mockUseMarketplaceClient.mockReturnValue({ query: queryMock } as unknown as ReturnType<typeof useMarketplaceClient>);

    render(<SitesTile />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(queryMock).toHaveBeenCalledTimes(2);
    });
  });

  it("6. sitecoreContextId undefined → error state, client.query NOT called", async () => {
    // Override: no context.live available
    mockUseAppContext.mockReturnValue({
      marketplaceAppTenantId: "test-tenant-001",
      resourceAccess: [
        {
          context: { live: undefined, preview: "CTX-PREV" },
          tenantDisplayName: "Test Tenant",
        },
      ],
    } as unknown as ReturnType<typeof useAppContext>);

    const queryMock = vi.fn().mockResolvedValue(mockListSitesResponseDouble);
    mockUseMarketplaceClient.mockReturnValue({ query: queryMock } as unknown as ReturnType<typeof useMarketplaceClient>);

    render(<SitesTile />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
    });
    // client.query should NOT have been called (context was unavailable)
    expect(queryMock).toHaveBeenCalledTimes(0);
  });

  it("7. unmount before promise resolves — no React state-update warning", async () => {
    // Arrange: long-lived promise that resolves after unmount
    let resolvePromise!: (val: typeof mockListSitesResponseDouble) => void;
    const pendingPromise = new Promise<typeof mockListSitesResponseDouble>((resolve) => {
      resolvePromise = resolve;
    });
    const queryMock = vi.fn().mockReturnValue(pendingPromise);
    mockUseMarketplaceClient.mockReturnValue({ query: queryMock } as unknown as ReturnType<typeof useMarketplaceClient>);
    // Restore appCtx to one with a valid context
    mockUseAppContext.mockReturnValue(defaultAppCtx as unknown as ReturnType<typeof useAppContext>);

    const consoleSpy = vi.spyOn(console, "error");
    const { unmount } = render(<SitesTile />);

    // Unmount while promise is still pending
    unmount();

    // Resolve the promise after unmount
    resolvePromise(mockListSitesResponseDouble);
    // Give microtasks a tick to flush
    await Promise.resolve();

    // No React state-update warning should have fired
    const relevantErrors = consoleSpy.mock.calls.filter(
      (args) =>
        typeof args[0] === "string" &&
        args[0].includes("state update on an unmounted component")
    );
    expect(relevantErrors.length).toBe(0);
    consoleSpy.mockRestore();
  });

  // Regression sentinel: if a future SDK change flips the envelope back to single-unwrap,
  // this assertion catches it. The component should treat `{ data: Sites.Site[] }` as empty
  // (no `.data.data`), so the user sees the empty copy instead of a `.slice is not a function`
  // runtime crash like the one operator-caught at T020 Gate B 2026-05-18.
  it("8. single-unwrap envelope (regression sentinel) renders empty copy, not a crash", async () => {
    const queryMock = vi.fn().mockResolvedValue(mockListSitesResponseSingle);
    mockUseMarketplaceClient.mockReturnValue({ query: queryMock } as unknown as ReturnType<typeof useMarketplaceClient>);

    render(<SitesTile />);

    await waitFor(() => {
      expect(screen.getByText(/No sites in this tenant yet/i)).toBeTruthy();
    });
  });
});
