/**
 * ResetEntitlementButton — DEV-ONLY topbar affordance for fast paywall iteration.
 *
 * Covers:
 *   - Renders button when tenantId is resolved
 *   - Renders null when no tenantId
 *   - Click → POST /api/dev/reset-entitlement → window.location.reload
 *   - Click failure → surfaces retry state
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the marketplace provider hook
vi.mock("@/components/providers/marketplace", () => ({
  useAppContext: vi.fn(),
}));

import { useAppContext } from "@/components/providers/marketplace";
import { ResetEntitlementButton } from "./reset-entitlement-button";

const mockUseAppContext = vi.mocked(useAppContext);

const defaultAppCtx = {
  marketplaceAppTenantId: "391dd026-9a1b-476b-3e30-08de9599d900",
};

describe("ResetEntitlementButton — DEV-ONLY topbar affordance", () => {
  const originalFetch = global.fetch;
  const originalReload = window.location.reload;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppContext.mockReturnValue(
      defaultAppCtx as unknown as ReturnType<typeof useAppContext>,
    );
    // Stub reload — JSDOM's default throws "Not implemented: navigation".
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, reload: vi.fn() },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, reload: originalReload },
    });
  });

  it("renders the revoke-access button when tenantId is resolved", () => {
    render(<ResetEntitlementButton />);
    expect(screen.getByRole("button", { name: /revoke access/i })).toBeTruthy();
  });

  it("renders null when no tenantId is available", () => {
    mockUseAppContext.mockReturnValue(null as unknown as ReturnType<typeof useAppContext>);
    const { container } = render(<ResetEntitlementButton />);
    expect(container.firstChild).toBeNull();
  });

  it("click → POST /api/dev/reset-entitlement with the current tenantId", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, deletedTenantCount: 1, deletedEventCount: 0 }),
      });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(<ResetEntitlementButton />);
    fireEvent.click(screen.getByRole("button", { name: /revoke access/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/dev/reset-entitlement");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(init.body).toBe(
      JSON.stringify({ tenantId: defaultAppCtx.marketplaceAppTenantId }),
    );

    // reload should fire on success
    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  it("click → API error → button shows 'retry' label and does NOT reload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "tenants delete failed: ..." }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(<ResetEntitlementButton />);
    fireEvent.click(screen.getByRole("button", { name: /revoke access/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /revoke access/i }).textContent).toMatch(
        /retry/i,
      );
    });

    // reload must NOT have fired on failure
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});

// afterEach is from vitest; surface it for the function-scope cleanup above
import { afterEach } from "vitest";
