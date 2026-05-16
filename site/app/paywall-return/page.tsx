/**
 * /paywall-return — T037 (server component shell)
 *
 * Stripe success_url target. Reads the session_id query param injected by
 * Stripe Checkout (success_url is configured as `/paywall-return?session_id={CHECKOUT_SESSION_ID}`).
 *
 * Delegates all client-side behavior (postMessage + sessionStorage + fallthrough)
 * to PaywallReturnClient — a 'use client' component.
 *
 * This route MUST NOT inherit MarketplaceProvider. The root layout does not
 * include it (/full-page/layout.tsx adds it only for the /full-page subtree).
 * Do NOT add MarketplaceProvider here — this page runs in a separate browser tab
 * with no Cloud Portal parent iframe to handshake with.
 *
 * ADR-0014 (revised): postMessage is best-effort. The polling interval running
 * in the original iframe picks up the payment via /api/entitlement within 30s.
 */

import { PaywallReturnClient } from './PaywallReturnClient';

interface PageProps {
  searchParams?: Promise<{ session_id?: string }>;
}

export default async function PaywallReturnPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const sessionId = resolved?.session_id;
  return <PaywallReturnClient sessionId={sessionId} />;
}
