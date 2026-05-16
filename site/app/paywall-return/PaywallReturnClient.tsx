/**
 * PaywallReturnClient — T037 (client component)
 *
 * Mounted by the /paywall-return page (Stripe success_url target).
 * Runs in the new tab opened by the Stripe Checkout flow.
 *
 * On mount (useEffect):
 *   1. Writes sessionStorage as a secondary/backup signal (best-effort).
 *   2. If window.opener is present and not closed:
 *      - Posts { type: 'paywall:refresh', sessionId } to the opener.
 *      - Queues window.close() after 500ms so the tab auto-dismisses.
 *   3. If window.opener is null (common when the opener is a sandboxed iframe):
 *      - Shows fallthrough static message: "You can close this tab…"
 *      - The polling interval in useEntitlement (still running in the iframe)
 *        picks up the payment via /api/entitlement within 30s.
 *
 * ADR-0014 (revised): postMessage is best-effort sugar. Polling is load-bearing.
 * This page MUST NOT be wrapped in MarketplaceProvider — it's opened in a new
 * tab with no Cloud Portal parent iframe. The route inherits root layout only
 * (root layout does not include MarketplaceProvider per Tranche A design).
 *
 * Visual: intentionally minimal — Stripe Checkout's branded success UI is primary.
 * Using plain centered layout; no Blok primitives needed for this transient page.
 */

"use client";

import { useEffect, useState } from 'react';

interface PaywallReturnClientProps {
  sessionId?: string;
}

export function PaywallReturnClient({ sessionId }: PaywallReturnClientProps) {
  const [fallthrough, setFallthrough] = useState(false);

  useEffect(() => {
    // Step 1: sessionStorage secondary signal (best-effort; cross-tab writes may be blocked)
    try {
      sessionStorage.setItem('paywall:lastCheckoutCompleted', String(Date.now()));
    } catch {
      // Silently ignore — cross-tab / sandboxed sessionStorage access can be restricted.
    }

    // Step 2: postMessage to opener + auto-close; or fall through to static message.
    const opener = window.opener as (Window & typeof globalThis) | null;
    const origin =
      (typeof process !== 'undefined' &&
        process.env.NEXT_PUBLIC_PAYWALL_RETURN_ORIGIN) ||
      window.location.origin;

    if (opener && !opener.closed) {
      try {
        opener.postMessage({ type: 'paywall:refresh', sessionId }, origin);
      } catch {
        // opener.postMessage can throw if cross-origin without permission.
        // Fall through to the static message in this edge case.
        setFallthrough(true);
        return;
      }
      // Auto-close after 500ms — gives the postMessage time to deliver.
      setTimeout(() => {
        try {
          window.close();
        } catch {
          // window.close() may be blocked by some browsers if not opener-originated.
          // Fallthrough is the resilient path.
          setFallthrough(true);
        }
      }, 500);
    } else {
      // opener is null (common from sandboxed iframe via window.open) — show static message.
      setFallthrough(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const centeredContainer: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  };

  const textCenter: React.CSSProperties = {
    textAlign: 'center',
    maxWidth: 480,
  };

  if (fallthrough) {
    return (
      <div style={centeredContainer}>
        <div style={textCenter}>
          <h1>Your access is being applied.</h1>
          <p>You can close this tab — the app will refresh automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={centeredContainer}>
      <div style={{ ...textCenter, maxWidth: 320 }}>
        <h1>Confirming your access…</h1>
        <p>One moment.</p>
      </div>
    </div>
  );
}
