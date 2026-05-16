/**
 * T031–T034 RED tests — useEntitlement hook
 *
 * All 4 tests MUST FAIL until T030 (useEntitlement.ts) is implemented.
 *
 * Covers:
 *   T031 — polling happy path: 2x no-sub → allowed on 3rd poll
 *   T032 — 30s timeout: always no-sub; error.kind === 'polling_timeout'
 *   T033 — postMessage triggers immediate poll; non-matching type ignored
 *   T034 — atomicity race: postMessage success at 29.9s; timeout fires at 30.1s → first wins
 *
 * ADR-0014 (revised): polling is load-bearing; postMessage is best-effort sugar.
 * Atomicity: setOutcome(prev => prev ?? signal) — first signal wins.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @/components/providers/marketplace
// ---------------------------------------------------------------------------
vi.mock('@/components/providers/marketplace', () => ({
  useAppContext: vi.fn(() => ({ marketplaceAppTenantId: 'tenant-test' })),
  useHostUser: vi.fn(() => ({ email: 'test@example.com' })),
}));

// Import the hook — will throw "not defined" in RED phase
import { useEntitlement } from './useEntitlement';
import { useAppContext, useHostUser } from '@/components/providers/marketplace';

const mockUseAppContext = vi.mocked(useAppContext);
const mockUseHostUser = vi.mocked(useHostUser);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCheckoutResponse(url = 'https://checkout.stripe.com/pay/cs_test_abc') {
  return Promise.resolve(
    new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );
}

function makeEntitlementResponse(status: string) {
  return Promise.resolve(
    new Response(JSON.stringify({ status }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  mockUseAppContext.mockReturnValue({ marketplaceAppTenantId: 'tenant-test' } as unknown as ReturnType<typeof useAppContext>);
  mockUseHostUser.mockReturnValue({ email: 'test@example.com' } as unknown as ReturnType<typeof useHostUser>);
  vi.spyOn(window, 'open').mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// T031 — Happy path: polling sees 'allowed' on 3rd poll
// ---------------------------------------------------------------------------

describe('useEntitlement — T031 — polling happy path', () => {
  it('resolves entitlement to allowed on 3rd poll; clears interval; removes listener', async () => {
    // Arrange: checkout → URL; polls: no-sub, no-sub, allowed
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => makeCheckoutResponse())            // POST /api/checkout
      .mockImplementationOnce(() => makeEntitlementResponse('tenant_no_subscription'))  // poll 1
      .mockImplementationOnce(() => makeEntitlementResponse('tenant_no_subscription'))  // poll 2
      .mockImplementationOnce(() => makeEntitlementResponse('allowed'));                 // poll 3
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useEntitlement());

    // Trigger checkout
    await act(async () => {
      await result.current.triggerCheckout();
    });

    // Poll 1 at 3000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    // Poll 2 at 6000ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    // Poll 3 at 9000ms → allowed
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.entitlement?.status).toBe('allowed');
    expect(result.current.error).toBeNull();

    // No further fetch calls after the 4th total (1 checkout + 3 polls)
    const callsAfter = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000); // would be 3 more polls if not stopped
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfter); // polling stopped
  });
});

// ---------------------------------------------------------------------------
// T032 — Timeout path: 30s / 10 polls, no 'allowed' ever
// ---------------------------------------------------------------------------

describe('useEntitlement — T032 — 30s polling timeout', () => {
  it('surfaces polling_timeout error after 30s; clears interval', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => makeCheckoutResponse())
      .mockImplementation(() => makeEntitlementResponse('tenant_no_subscription'));
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useEntitlement());

    await act(async () => {
      await result.current.triggerCheckout();
    });

    // Advance past 30s timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31000);
    });

    expect(result.current.error?.kind).toBe('polling_timeout');

    // No further fetch calls after timeout
    const callsAfterTimeout = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterTimeout);
  });
});

// ---------------------------------------------------------------------------
// T033 — postMessage triggers immediate poll; non-matching type ignored
// ---------------------------------------------------------------------------

describe('useEntitlement — T033 — postMessage triggers immediate poll', () => {
  it('fires immediate poll on paywall:refresh; ignores non-matching type', async () => {
    // poll called: 1 immediate from postMessage → allowed
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => makeCheckoutResponse())               // POST /api/checkout
      .mockImplementationOnce(() => makeEntitlementResponse('allowed'));   // immediate poll from postMessage
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useEntitlement());

    await act(async () => {
      await result.current.triggerCheckout();
    });

    // Advance only 1000ms — before the first 3s interval poll
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Dispatch a NON-matching message first — should be ignored (no extra fetch)
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'paywall:nope' } })
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    // Still only 1 fetch call (checkout) — non-matching message was ignored
    expect(fetchMock.mock.calls.length).toBe(1);

    // Dispatch the matching message — triggers immediate poll
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'paywall:refresh' } })
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    // Wait for the immediate poll to resolve
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.entitlement?.status).toBe('allowed');
    expect(result.current.error).toBeNull();
    // Exactly 2 fetch calls: checkout + immediate poll
    expect(fetchMock.mock.calls.length).toBe(2);

    // Verify polling stopped — no more fetch calls over next 6s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(fetchMock.mock.calls.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// T034 — Atomicity: postMessage success at 29.9s; timeout at 30.1s → first wins
// ---------------------------------------------------------------------------

describe('useEntitlement — T034 — atomicity: first signal wins', () => {
  it('outcome stays success when timeout fires after postMessage-triggered success', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => makeCheckoutResponse())             // POST /api/checkout
      .mockImplementation(() => makeEntitlementResponse('allowed'));    // all polls → allowed
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useEntitlement());

    await act(async () => {
      await result.current.triggerCheckout();
    });

    // Advance to just before timeout (29900ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(29900);
    });

    // Dispatch postMessage — triggers immediate poll that returns 'allowed'
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'paywall:refresh' } })
      );
      await vi.advanceTimersByTimeAsync(100);
    });

    // Advance to just past timeout (30100ms total — timeout fires)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    // Outcome must be 'success' (first signal); timeout is a no-op
    expect(result.current.error).toBeNull();
    expect(result.current.entitlement?.status).toBe('allowed');
  });
});
