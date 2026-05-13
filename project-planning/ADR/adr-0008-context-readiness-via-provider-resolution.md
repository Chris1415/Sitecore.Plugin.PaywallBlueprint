# ADR-0008: Context-readiness signal sourced from `MarketplaceProvider` resolution, not from a dedicated SDK ready-event

## Status

Accepted

## Context

PRD-000 FR-1 step 2 specifies that `<PaywallGate>` must wait for the Marketplace SDK provider's "context-ready signal" before reading `application.context` (resolves Risk R6 — iframe mount lifecycle race condition where `application.context` might be `undefined` at first render).

The Marketplace SDK does not expose a single named "ready-event" in its public API. Three approaches were considered:

- **(a) Dedicated SDK ready event.** Subscribe to a hypothetical `ClientSDK.on('ready', ...)` event. Rejected — no such event exists in `@sitecore-marketplace-sdk/client`.
- **(b) Direct polling of `application.context` from the gate.** Gate code calls `client.query('application.context')` directly and waits for resolution. Rejected — duplicates the work the scaffold's `MarketplaceProvider` (or its equivalent — `<MarketplaceClientProvider>` per the `sitecore:setup-marketplace-client-side` skill's quickstart pattern) already does, and risks race conditions if two callers query the same context concurrently.
- **(c) Implicit ready-signal from the provider's render contract.** The scaffold's `MarketplaceProvider` renders its children only after `ClientSDK.init()` AND the initial `client.query('application.context')` resolve. If the gate consumes the context via the provider's hook (`useAppContext()` or equivalent), the *fact that the gate is rendering* IS the ready signal — children only mount when context is non-null.

Option (c) leverages the existing provider contract without inventing new infrastructure.

## Decision

`<PaywallGate>` consumes `applicationContext` via the scaffold's provider hook (`useAppContext()` or whichever named export the `sitecore:setup-marketplace-client-side` scaffold ships). The provider's contract — "children render only after context resolves" — is the readiness signal.

As a **defensive secondary guard** against future provider-semantic changes or unexpected null states, the gate additionally treats a `null` or `undefined` context as "not ready" and renders the skeleton until the next render cycle. This is belt-and-suspenders against the chance that the scaffold's provider semantics evolve in a future SDK version.

When `applicationContext.tenantId` or `applicationContext.user.id` are themselves missing or malformed after the provider considers context ready, the gate throws (per PRD-000 FR-1 step 3 and NFR-6) — that fault propagates to the top-level error boundary rather than being silently treated as "still loading."

## Consequences

**Easier:**

- No new infrastructure (no event-bus, no polling loop, no race-condition handling).
- Leverages the scaffold's existing pattern — adopters who already understand the `MarketplaceProvider` understand the gate's readiness pattern by extension.
- Defensive `null`-guard means a future provider regression doesn't crash the host page.

**Harder:**

- If the scaffold's provider contract changes (e.g., a future SDK release renders children before context resolves), the gate's implicit readiness assumption breaks. Mitigation: the defensive `null`-check + skeleton fallback prevents the worst case (TypeError on missing context); the gate degrades to "skeleton forever" rather than crashing. CI test exercises the gate against a stub provider that mimics a delayed context to verify the skeleton renders.
- The pattern is implicit. Engineers reading the gate code don't see an explicit "wait for ready" call — they see a hook consumption that happens to defer rendering. The implementation MUST document this in code comments at `<PaywallGate>` step 2.

## Date

2026-05-13
