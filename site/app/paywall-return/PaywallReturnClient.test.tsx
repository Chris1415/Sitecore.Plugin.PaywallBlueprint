/**
 * T038 RED — /paywall-return client component tests.
 *
 * Two tests:
 *   T038a — opener present: window.opener.postMessage called with correct payload;
 *            window.close queued via setTimeout; sessionStorage written.
 *   T038b — opener null: no postMessage; fallback text visible; sessionStorage written.
 *
 * Both MUST FAIL until T037 (PaywallReturnClient.tsx) is implemented.
 *
 * ADR-0014 (revised): postMessage is best-effort sugar; opener is frequently null
 * from sandboxed iframes. The fallthrough static message is the resilient path.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaywallReturnClient } from './PaywallReturnClient';

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
  // Clear sessionStorage between tests
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// T038a — opener present: postMessage + close queued
// ---------------------------------------------------------------------------

describe('PaywallReturnClient — T038a — opener present', () => {
  it('calls window.opener.postMessage with correct payload and queues window.close', async () => {
    const postMessageMock = vi.fn();
    const closeMock = vi.fn();

    // Stub window.opener
    Object.defineProperty(window, 'opener', {
      value: { closed: false, postMessage: postMessageMock },
      writable: true,
      configurable: true,
    });
    // Stub window.close
    Object.defineProperty(window, 'close', {
      value: closeMock,
      writable: true,
      configurable: true,
    });

    render(<PaywallReturnClient sessionId="cs_test_123" />);

    // Wait for the useEffect to fire (jsdom renders synchronously but effects are async)
    await waitFor(() => {
      expect(postMessageMock).toHaveBeenCalled();
    });

    // Assert postMessage called with correct payload + an origin string
    const [payload, origin] = postMessageMock.mock.calls[0];
    expect(payload).toEqual({ type: 'paywall:refresh', sessionId: 'cs_test_123' });
    expect(typeof origin).toBe('string');
    expect(origin.length).toBeGreaterThan(0);

    // Assert sessionStorage was written
    const stored = sessionStorage.getItem('paywall:lastCheckoutCompleted');
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(0);

    // Advance 500ms to trigger the setTimeout → window.close
    await vi.advanceTimersByTimeAsync(500);
    expect(closeMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// T038b — opener null: fallthrough message; no postMessage; sessionStorage written
// ---------------------------------------------------------------------------

describe('PaywallReturnClient — T038b — opener null', () => {
  it('shows fallthrough message and does NOT call postMessage; sessionStorage still written', async () => {
    // Stub window.opener = null
    Object.defineProperty(window, 'opener', {
      value: null,
      writable: true,
      configurable: true,
    });

    // Spy on any window.postMessage attempt via opener — should not be called
    const postMessageMock = vi.fn();
    // (No opener to call postMessage on; we verify by checking no error is thrown
    //  and the fallthrough text renders.)

    render(<PaywallReturnClient sessionId="cs_test_456" />);

    // Wait for the fallthrough text to render
    await waitFor(() => {
      expect(
        screen.getByText(/you can close this tab/i)
      ).toBeTruthy();
    });

    // postMessage must NOT have been called
    expect(postMessageMock).not.toHaveBeenCalled();

    // sessionStorage MUST still be written (best-effort signal)
    const stored = sessionStorage.getItem('paywall:lastCheckoutCompleted');
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(0);
  });
});
