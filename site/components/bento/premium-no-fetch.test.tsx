/**
 * T048a — RED no-fetch contract for premium cards (ADR-0018 sentinel).
 *
 * Per ADR-0018: premium cards make ZERO HTTP requests, SDK calls, or DB queries
 * at ANY state (locked or unlocked).
 *
 * These tests are GREEN by construction against the Tranche D implementations
 * (T040–T045) since none add fetches. They act as regression sentinels:
 * if a future developer adds a fetch to any premium card, the throw-mock
 * will immediately turn these tests RED.
 *
 * Two enforcement layers (AC4.7):
 * 1. This Vitest spec (runtime sentinel — catches dynamic call paths)
 * 2. test:no-fetch-in-premium.sh shell script (T048 — catches dead-code leaks)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { Suspense } from "react";

// --- Throw-mock setup ---

// Mock global.fetch to throw if called from premium cards
const fetchSpy = vi.fn(() => {
  throw new Error("fetch called — violates ADR-0018: premium cards must not fetch");
});

// Mock the marketplace SDK client (via the provider hook)
const querySpy = vi.fn(() => {
  throw new Error("client.query called — violates ADR-0018");
});

// Mock Supabase client (via the browser client helper)
const supabaseFromSpy = vi.fn(() => {
  throw new Error("supabase.from called — violates ADR-0018");
});

// Mock providers so cards can render without real MarketplaceProvider
vi.mock("@/components/providers/marketplace", () => ({
  useMarketplaceClient: () => ({ query: querySpy }),
  useHostUser: vi.fn(() => ({})),
  useAppContext: vi.fn(() => ({})),
}));

// Mock Supabase browser client
vi.mock("@/src/lib/paywall/stores/SupabaseStore", () => ({
  SupabaseStore: {
    getEntitlement: supabaseFromSpy,
  },
}));

vi.mock("@/lib/supabase/browser-client", () => ({
  createBrowserClient: () => ({ from: supabaseFromSpy }),
}));

// Mock next-themes (used by ActivityChartRecharts)
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

// matchMedia mock
function mockMatchMedia(reduced = false) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

// rAF shim
function installRafShim() {
  const callbacks: Map<number, FrameRequestCallback> = new Map();
  let id = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const frameId = ++id;
    callbacks.set(frameId, cb);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((fid) => {
    callbacks.delete(fid);
  });
}

// --- Import components ---
import { ActivityChart } from "./activity-chart";
import { ContentDistribution } from "./content-distribution";
import { RecentEdits } from "./recent-edits";
import { CmsHealth } from "./cms-health";
import { SitecoreContentInsights } from "./sitecore-content-insights";
import { ContentHealthScore } from "./content-health-score";

describe("Premium cards — no-fetch contract (T048a — ADR-0018 sentinel)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    installRafShim();
    // Replace global fetch with the throw-mock
    Object.defineProperty(globalThis, "fetch", {
      writable: true,
      configurable: true,
      value: fetchSpy,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    fetchSpy.mockClear();
    querySpy.mockClear();
    supabaseFromSpy.mockClear();
  });

  it("P1 ActivityChart (locked=false): does NOT call fetch, client.query, or supabase", () => {
    expect(() =>
      render(
        // ActivityChart uses Suspense + lazy — wrap in Suspense for test
        <Suspense fallback={null}>
          <ActivityChart locked={false} data-card="p1" />
        </Suspense>
      )
    ).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
    expect(supabaseFromSpy).not.toHaveBeenCalled();
  });

  it("P2 ContentDistribution (locked=false): does NOT call fetch, client.query, or supabase", () => {
    expect(() =>
      render(<ContentDistribution locked={false} data-card="p2" />)
    ).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
    expect(supabaseFromSpy).not.toHaveBeenCalled();
  });

  it("P3 RecentEdits (locked=false): does NOT call fetch, client.query, or supabase", () => {
    expect(() =>
      render(<RecentEdits locked={false} data-card="p3" />)
    ).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
    expect(supabaseFromSpy).not.toHaveBeenCalled();
  });

  it("P4 CmsHealth (locked=false): does NOT call fetch, client.query, or supabase", () => {
    expect(() =>
      render(<CmsHealth locked={false} data-card="p4" />)
    ).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
    expect(supabaseFromSpy).not.toHaveBeenCalled();
  });

  it("P5 SitecoreContentInsights (locked=false): does NOT call fetch, client.query, or supabase", () => {
    expect(() =>
      render(<SitecoreContentInsights locked={false} data-card="p5" />)
    ).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
    expect(supabaseFromSpy).not.toHaveBeenCalled();
  });

  it("P6 ContentHealthScore (locked=false): does NOT call fetch, client.query, or supabase", () => {
    expect(() =>
      render(<ContentHealthScore locked={false} data-card="p6" />)
    ).not.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
    expect(supabaseFromSpy).not.toHaveBeenCalled();
  });
});
