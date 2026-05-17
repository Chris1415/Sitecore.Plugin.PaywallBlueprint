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

## Decision (revised post-critical-review 2026-05-15)

Implement **both** mechanisms in parallel — but the realistic priority order is **polling primary; postMessage is fastest-path sugar when available**. Reasoning surfaced in critical review: modern browsers (Chrome 88+, Firefox 79+, recent Safari) default new tabs opened via `window.open()` from sandboxed iframes to `noopener` — meaning `window.opener` in the new tab is **`null`** in most environments. PostMessage is not just "blocked by sandbox" but structurally unavailable.

**`useEntitlement` hook orchestrates (revised contract):**

1. When `triggerCheckout()` is called, immediately `window.open(stripe-checkout-url, '_blank')`.
2. **Start polling immediately:** `setInterval(3000)` poll of `/api/entitlement` — this is the load-bearing path.
3. **Register a `message` event listener** on `window` for type `paywall:refresh` — best-effort sugar.
4. If `postMessage` arrives: trigger an *immediate poll* (resets the next-poll-due timer to now). Do NOT stop polling on postMessage receipt — the message only signals "the user has returned from Stripe Checkout"; the actual entitlement state must still be confirmed via the poll.
5. Polling stops when `/api/entitlement` returns `status === 'allowed'` (success) OR 30 seconds total elapse from `window.open` (timeout).
6. **Atomicity:** the success signal is set via `useState<Signal | null>(null)` with `setState((prev) => prev ?? signal)` — first signal wins, subsequent calls are no-ops. Both interval and listener clear on first non-null state.

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
