/**
 * useEntitlement — T030
 *
 * ADR-0014 (revised): polling is the load-bearing path; postMessage is best-effort
 * sugar that triggers an immediate poll but does NOT stop polling on its own.
 * Only status === 'allowed' from a poll OR the 30s timeout stops the state machine.
 *
 * Atomicity invariant: outcomeRef.current is a one-way latch. The first writer
 * (poll success or timeout) locks it — subsequent signals are no-ops.
 *
 * All cleanup (clearInterval + clearTimeout + removeEventListener) fires from
 * stopPolling(), which is called on first outcome resolution OR on unmount.
 *
 * Must be used INSIDE the /full-page subtree (inside MarketplaceProvider) per ADR-0008.
 * source: @/components/providers/marketplace → useAppContext, useHostUser
 */

"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext, useHostUser } from '@/components/providers/marketplace';
import type { EntitlementResult } from '@/src/lib/paywall/types';

// ---------------------------------------------------------------------------
// Exported return type
// ---------------------------------------------------------------------------

export interface UseEntitlementReturn {
  /** Last-known entitlement state from polling. null until first successful poll. */
  entitlement: EntitlementResult | null;
  /** True while the checkout POST is in-flight (before the new tab opens). */
  isLoading: boolean;
  /** Non-null when an error has occurred. */
  error:
    | { kind: 'checkout_failed'; message: string }
    | { kind: 'polling_timeout' }
    | null;
  /** Call to POST /api/checkout, open Stripe Checkout in a new tab, and start polling. */
  triggerCheckout: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 30000;
const REFRESH_MESSAGE_TYPE = 'paywall:refresh';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEntitlement(): UseEntitlementReturn {
  // source: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
  const appContext = useAppContext() as Record<string, unknown> | null | undefined;
  // source: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → HostUser
  const hostUser = useHostUser() as Record<string, unknown> | null | undefined;

  const tenantId =
    typeof appContext?.marketplaceAppTenantId === 'string'
      ? appContext.marketplaceAppTenantId
      : undefined;

  const userEmail =
    typeof hostUser?.email === 'string' ? hostUser.email : undefined;

  const [entitlement, setEntitlement] = useState<EntitlementResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UseEntitlementReturn['error']>(null);

  // -------------------------------------------------------------------------
  // Atomicity latch: outcomeRef.current is a one-way latch.
  // The first writer (poll success or timeout) sets it to true; subsequent
  // calls from the other path are no-ops. Implemented with a ref (not state)
  // to avoid triggering cascading renders — the consumer-facing state
  // (entitlement / error) is set atomically by the winning path.
  // -------------------------------------------------------------------------
  const outcomeSettledRef = useRef(false);

  // Refs to active timers and the message handler so cleanup is always correct.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageHandlerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // -------------------------------------------------------------------------
  // stopPolling — clears all three cleanup handles
  // -------------------------------------------------------------------------
  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (messageHandlerRef.current !== null) {
      window.removeEventListener('message', messageHandlerRef.current);
      messageHandlerRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Unmount cleanup — unconditional
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // -------------------------------------------------------------------------
  // resolveSuccess — called when a poll returns 'allowed'. Atomicity enforced.
  // -------------------------------------------------------------------------
  const resolveSuccess = useCallback(
    (result: EntitlementResult) => {
      if (outcomeSettledRef.current) return; // first-signal-wins
      outcomeSettledRef.current = true;
      setEntitlement(result);
      stopPolling();
    },
    [stopPolling]
  );

  // -------------------------------------------------------------------------
  // resolveTimeout — called when the 30s cap fires. Atomicity enforced.
  // -------------------------------------------------------------------------
  const resolveTimeout = useCallback(() => {
    if (outcomeSettledRef.current) return; // first-signal-wins
    outcomeSettledRef.current = true;
    setError({ kind: 'polling_timeout' });
    stopPolling();
  }, [stopPolling]);

  // -------------------------------------------------------------------------
  // pollOnce — single entitlement check. Calls resolveSuccess on 'allowed'.
  // -------------------------------------------------------------------------
  const pollOnce = useCallback(async () => {
    if (!tenantId || outcomeSettledRef.current) return;
    try {
      const res = await fetch(
        `/api/entitlement?tenantId=${encodeURIComponent(tenantId)}`
      );
      if (!res.ok) return;
      const body = (await res.json()) as EntitlementResult;
      // Always update the last-known entitlement for consumers.
      setEntitlement(body);
      if (body.status === 'allowed') {
        resolveSuccess(body);
      }
    } catch {
      // Network blip — let the next interval poll retry.
    }
  }, [tenantId, resolveSuccess]);

  // -------------------------------------------------------------------------
  // triggerCheckout — the main public API
  // -------------------------------------------------------------------------
  const triggerCheckout = useCallback(async () => {
    if (!tenantId) {
      setError({
        kind: 'checkout_failed',
        message: 'Tenant context not ready. Try again in a moment.',
      });
      return;
    }
    if (!userEmail) {
      setError({
        kind: 'checkout_failed',
        message: 'User email not available. Try again in a moment.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    // Reset the atomicity latch for a fresh checkout attempt.
    outcomeSettledRef.current = false;

    try {
      // UI tier of the three-tier idempotency-key-version precedence
      // (see StripeProvider.ts JSDoc):
      //   1. URL ?paywall_version=<value>  — ephemeral, per-tab
      //   2. localStorage 'paywall_version' — persistent per browser
      //   3. (server falls back to STRIPE_CHECKOUT_PARAMS_VERSION env var,
      //      then to the code default 'v3')
      // Lets the operator force a fresh idempotency key from the browser
      // after deleting a tenants row in Supabase or after a Sandbox<->Live
      // switch, without bumping the env var or redeploying.
      let version: string | undefined;
      if (typeof window !== 'undefined') {
        const urlValue = new URLSearchParams(window.location.search).get(
          'paywall_version',
        );
        if (urlValue && urlValue.length > 0) {
          version = urlValue;
        } else {
          try {
            const storedValue = window.localStorage.getItem('paywall_version');
            if (storedValue && storedValue.length > 0) {
              version = storedValue;
            }
          } catch {
            // localStorage can be blocked in some iframe sandbox configs; fall through.
          }
        }
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId, userEmail, ...(version ? { version } : {}) }),
      });

      const body = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError({
          kind: 'checkout_failed',
          message: body?.error ?? 'Checkout failed. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      const { url } = body;
      if (!url) {
        setError({
          kind: 'checkout_failed',
          message: 'Checkout URL missing. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      // Open Stripe Checkout in a new tab. The iframe stays put.
      window.open(url, '_blank');
      setIsLoading(false);

      // -----------------------------------------------------------------------
      // Start the success-detection state machine:
      //   - setInterval: poll every 3s (load-bearing path)
      //   - setTimeout: cap at 30s; call resolveTimeout if no 'allowed' yet
      //   - addEventListener 'message': best-effort fastest path — triggers an
      //     immediate poll on 'paywall:refresh'; does NOT stop the interval.
      // -----------------------------------------------------------------------

      // Start interval polling
      intervalRef.current = setInterval(() => {
        void pollOnce();
      }, POLL_INTERVAL_MS);

      // Start 30s timeout cap
      timeoutRef.current = setTimeout(() => {
        resolveTimeout();
      }, POLL_TIMEOUT_MS);

      // Register postMessage listener
      const handler = (e: MessageEvent) => {
        if (e.data?.type === REFRESH_MESSAGE_TYPE) {
          // Trigger an immediate poll — does NOT stop the interval.
          void pollOnce();
        }
        // Non-matching message types are silently ignored.
      };
      messageHandlerRef.current = handler;
      window.addEventListener('message', handler);
    } catch (err) {
      setError({
        kind: 'checkout_failed',
        message:
          err instanceof Error ? err.message : 'Checkout failed. Please try again.',
      });
      setIsLoading(false);
    }
  }, [tenantId, userEmail, pollOnce, resolveTimeout]);

  return { entitlement, isLoading, error, triggerCheckout };
}
