# ADR-0014: Iframe success-return — postMessage primary + 3s/30s polling fallback

## Status

Accepted

## Context

PRD-001 implements the post-payment return flow. After Stripe Checkout completes in a new tab, the iframe in Cloud Portal needs to learn that entitlement has changed and re-render to the welcome card. Two main mechanisms:

- **(a) `window.opener.postMessage`** from the new tab back to the iframe. Fast (instant on success). Requires the iframe sandbox to permit `allow-popups-to-escape-sandbox` AND for `window.opener` to remain accessible from the new tab.
- **(b) Polling** `/api/entitlement` from the iframe every 3 seconds for up to 30 seconds. Works regardless of sandbox. Slower (3-30s lag).
- **(c) Hybrid: both run in parallel; whichever fires first wins.**

The Cloud Portal iframe's sandbox attributes (captured during T013 probe) include `allow-popups`, `allow-popups-to-escape-sandbox`, `clipboard-write`, `clipboard-read`. These SHOULD permit `window.opener.postMessage`, but:

- The sandbox attributes can change with Cloud Portal updates.
- `window.opener` may be detached if the new tab is opened in a noopener context.
- Adopters' Cloud Portal setups may have stricter sandbox attributes.

Research § 8.7 Q3 explicitly flagged this as an open SDK question for PRD-001. Without a real probe to confirm postMessage works (and operator decided not to probe — D4), we need a fallback path.

## Decision

Implement **both** mechanisms in parallel — postMessage primary + polling fallback.

**`useEntitlement` hook orchestrates:**

1. When `triggerCheckout()` is called, immediately `window.open(stripe-checkout-url, '_blank')`.
2. Register a `message` event listener on `window` for type `paywall:refresh` (postMessage path).
3. Simultaneously start a `setInterval(3000)` poll of `/api/entitlement` (polling path).
4. When EITHER fires successfully (entitlement → allowed), update local state and tear down both paths (clear listener + clear interval).
5. If 30 seconds elapse without either succeeding, stop polling and show a non-blocking "May take a moment — refresh if it doesn't update" toast.

**`/paywall-return` page** (Stripe `success_url` target):

- Renders a small "Confirming your access..." card.
- On mount, calls `window.opener.postMessage({ type: 'paywall:refresh' }, appOrigin)` then `setTimeout(window.close, 500)` (gives the parent listener a moment to handle).
- If `window.opener` is null (popup blocked or sandbox-detached), shows a "Please return to the app" message and writes a sessionStorage flag (secondary signal; cross-tab sessionStorage may also be blocked, but it's a cheap addition).

**`/api/entitlement` endpoint** supports the polling path with server-side Supabase service-role lookup. Returns the same `EntitlementResult` shape as `SupabaseStore.getEntitlement` — identical for both client-side and server-side reads.

## Consequences

**Easier:**

- Adopters get the best UX where Cloud Portal sandbox permits postMessage (instant refresh).
- Polling fallback covers ALL sandbox cases (3-30 second lag at worst, but the gate works).
- No pre-PRD-001 probe needed for Q3 — both paths ship; whichever works is what runs.
- Stripe webhook delivery latency (5-30s typical) is naturally hidden by the polling window — adopters see "Confirming your access..." until webhook + poll converge.

**Harder:**

- Two code paths means more tests (both happy paths + the timeout case).
- Race conditions: if both paths fire successfully within milliseconds, must dedupe. Mitigation: once entitlement transitions to allowed, both listener and interval clear before the state update propagates.
- 30-second polling cap is a guess; adopters with slow Stripe webhook delivery may need to bump to 60s. Configurable via env var if needed.
- Browser-tab handling: if user closes the new tab before payment completes, both paths gracefully time out — no error state needed.

## Date

2026-05-15
