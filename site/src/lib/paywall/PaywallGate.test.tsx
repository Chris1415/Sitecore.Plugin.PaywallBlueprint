/**
 * T036a RED — PaywallGate component tests.
 * Fails until T033 implements PaywallGate.tsx.
 *
 * Test scenarios per task breakdown § 4b + § 10:
 *  1. Null context → skeleton
 *  2. Malformed context (no tenantId) → throws → error boundary fallback
 *  3. Pending store → skeleton
 *  4. Store resolves "allowed" → children rendered
 *  5. Store resolves "tenant_no_subscription" → <NoSubscriptionState />
 *  6. Store resolves "tenant_active_seats_full" seatsTotal=5 → counter visible
 *  7. Store resolves "tenant_active_user_unassigned" → headline visible
 *  8. Store rejects → error boundary catches
 *  9. Env-flag "false" → children verbatim, no store call, onStateChange("demo")
 *
 * NOTE: T036a does NOT cover env-flag behavior yet per the task brief —
 * the env-flag integration test (case 9) is included here per § 4b which
 * lists it as a T036a test case.
 *
 * Stub helpers from § 4c-6.
 * source: sitecore:marketplace-sdk-client § 4 ApplicationContext shape
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PaywallGate } from "./PaywallGate";
import ErrorBoundary from "@/components/error-boundary";
import type { EntitlementResult, EntitlementStore } from "./types";

// ---------------------------------------------------------------------------
// Mock marketplace provider hooks
// ---------------------------------------------------------------------------
vi.mock("@/components/providers/marketplace", () => ({
  MarketplaceProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAppContext: vi.fn(),
  useHostUser: vi.fn(),
  useMarketplaceClient: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock state components (so gate tests don't depend on their impl)
// ---------------------------------------------------------------------------
vi.mock("@/src/lib/paywall/states/SkeletonState", () => ({
  SkeletonState: () => (
    <div role="status" aria-label="Loading premium content">
      skeleton
    </div>
  ),
}));
vi.mock("./states/SkeletonState", () => ({
  SkeletonState: () => (
    <div role="status" aria-label="Loading premium content">
      skeleton
    </div>
  ),
}));
vi.mock("./states/NoSubscriptionState", () => ({
  NoSubscriptionState: () => <div>Start your subscription</div>,
}));
vi.mock("./states/SeatsFullState", () => ({
  SeatsFullState: ({ seatsTotal }: { seatsTotal: number }) => (
    <div>{seatsTotal} of {seatsTotal} seats in use</div>
  ),
}));
vi.mock("./states/UserUnassignedState", () => ({
  UserUnassignedState: () => <div>Ask your team admin</div>,
}));

import type { ApplicationContext } from "@sitecore-marketplace-sdk/client";
import { useAppContext, useHostUser } from "@/components/providers/marketplace";

const mockUseAppContext = vi.mocked(useAppContext);
const mockUseHostUser = vi.mocked(useHostUser);

// ---------------------------------------------------------------------------
// Stub helpers per § 4c-6
// ---------------------------------------------------------------------------

/** A store that resolves immediately with the given result */
function makeStubStore(result: EntitlementResult): EntitlementStore {
  return {
    getEntitlement: vi.fn().mockResolvedValue(result),
  };
}

/** A store where the promise never resolves (pending forever) */
function makePendingStore(): EntitlementStore & {
  _resolve: (r: EntitlementResult) => void;
} {
  let resolvePromise: (r: EntitlementResult) => void;
  const promise = new Promise<EntitlementResult>((res) => {
    resolvePromise = res;
  });
  return {
    getEntitlement: vi.fn().mockReturnValue(promise),
    _resolve: resolvePromise!,
  };
}

/** A store that rejects with the given error */
function makeRejectingStore(error: Error): EntitlementStore {
  return {
    getEntitlement: vi.fn().mockRejectedValue(error),
  };
}

function makeValidAppContext(): ApplicationContext {
  return {
    marketplaceAppTenantId: "391dd026-9a1b-476b-3e30-08de9599d900",
    resourceAccess: [{ tenantDisplayName: "Acme Inc.", tenantName: null }],
  } as unknown as ApplicationContext;
}

// Suppress console.error for expected boundary catches
let originalConsoleError: typeof console.error;
beforeEach(() => {
  originalConsoleError = console.error;
  console.error = vi.fn();
  // Default: valid context + valid user
  mockUseAppContext.mockReturnValue(makeValidAppContext());
  mockUseHostUser.mockReturnValue({
    given_name: "Christian",
    sub: "auth0|test-user-001",
  });
  vi.unstubAllEnvs();
});
afterEach(() => {
  console.error = originalConsoleError;
});

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe("PaywallGate — null context → skeleton (T036a)", () => {
  it("renders SkeletonState when useAppContext() returns null", async () => {
    mockUseAppContext.mockReturnValue(null as unknown as ApplicationContext);
    const store = makeStubStore({ status: "allowed" });

    render(
      <PaywallGate store={store}>
        <div>children content</div>
      </PaywallGate>
    );

    expect(
      screen.getByRole("status", { name: "Loading premium content" })
    ).toBeTruthy();
    expect(screen.queryByText("children content")).toBeNull();
    // Store should NOT be called when context is null
    expect(store.getEntitlement).not.toHaveBeenCalled();
  });
});

describe("PaywallGate — malformed context → throws → error boundary (T036a)", () => {
  it("throws when context has no tenantId; error boundary renders fallback", async () => {
    // Context missing tenantId (marketplaceAppTenantId is undefined/empty)
    mockUseAppContext.mockReturnValue({
      marketplaceAppTenantId: "",
      resourceAccess: [],
    } as unknown as ApplicationContext);
    const store = makeStubStore({ status: "allowed" });

    render(
      <ErrorBoundary>
        <PaywallGate store={store}>
          <div>children content</div>
        </PaywallGate>
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeTruthy();
    });
  });
});

describe("PaywallGate — pending store → skeleton (T036a)", () => {
  it("renders SkeletonState while entitlement fetch is pending", async () => {
    const pendingStore = makePendingStore();

    render(
      <PaywallGate store={pendingStore}>
        <div>children content</div>
      </PaywallGate>
    );

    expect(
      screen.getByRole("status", { name: "Loading premium content" })
    ).toBeTruthy();
    expect(screen.queryByText("children content")).toBeNull();
  });
});

describe("PaywallGate — allowed → children (T036a)", () => {
  it('renders children when store resolves "allowed"', async () => {
    const onStateChange = vi.fn();
    const store = makeStubStore({ status: "allowed" });

    render(
      <PaywallGate store={store} onStateChange={onStateChange}>
        <div>gated premium content</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(screen.getByText("gated premium content")).toBeTruthy();
    });
    expect(onStateChange).toHaveBeenCalledWith("allowed");
  });
});

describe("PaywallGate — tenant_no_subscription → NoSubscriptionState (T036a)", () => {
  it('renders NoSubscriptionState when store resolves "tenant_no_subscription"', async () => {
    const onStateChange = vi.fn();
    const store = makeStubStore({ status: "tenant_no_subscription" });

    render(
      <PaywallGate store={store} onStateChange={onStateChange}>
        <div>children content</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Start your subscription")).toBeTruthy();
    });
    expect(screen.queryByText("children content")).toBeNull();
    expect(onStateChange).toHaveBeenCalledWith("tenant_no_subscription");
  });
});

describe("PaywallGate — tenant_active_seats_full → SeatsFullState (T036a)", () => {
  it("renders SeatsFullState counter when store resolves seats-full with seatsTotal=5", async () => {
    const store = makeStubStore({
      status: "tenant_active_seats_full",
      seatsTotal: 5,
    });

    render(
      <PaywallGate store={store}>
        <div>children content</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(screen.getByText("5 of 5 seats in use")).toBeTruthy();
    });
  });
});

describe("PaywallGate — tenant_active_user_unassigned → UserUnassignedState (T036a)", () => {
  it("renders UserUnassignedState when store resolves user-unassigned", async () => {
    const store = makeStubStore({ status: "tenant_active_user_unassigned" });

    render(
      <PaywallGate store={store}>
        <div>children content</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(screen.getByText("Ask your team admin")).toBeTruthy();
    });
  });
});

describe("PaywallGate — store rejects → error boundary catches (T036a)", () => {
  it("re-throws when store rejects; error boundary renders fallback", async () => {
    const store = makeRejectingStore(new Error("Supabase error"));

    render(
      <ErrorBoundary>
        <PaywallGate store={store}>
          <div>children content</div>
        </PaywallGate>
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeTruthy();
    });
  });
});

describe("PaywallGate — env-flag false → children verbatim (T036a)", () => {
  it("renders children without calling store when NEXT_PUBLIC_PAYWALL_ENABLED=false", async () => {
    vi.stubEnv("NEXT_PUBLIC_PAYWALL_ENABLED", "false");
    const onStateChange = vi.fn();
    const store = makeStubStore({ status: "tenant_no_subscription" });

    render(
      <PaywallGate store={store} onStateChange={onStateChange}>
        <div>demo children</div>
      </PaywallGate>
    );

    await waitFor(() => {
      expect(screen.getByText("demo children")).toBeTruthy();
    });
    expect(store.getEntitlement).not.toHaveBeenCalled();
    expect(onStateChange).toHaveBeenCalledWith("demo");
  });
});
