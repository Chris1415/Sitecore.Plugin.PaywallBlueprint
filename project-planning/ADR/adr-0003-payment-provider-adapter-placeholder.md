# ADR-0003: Payment-provider adapter as type-only placeholder in PRD-000

## Status

Accepted

## Context

The blueprint's second abstraction boundary is the `PaymentProvider` adapter — the surface through which a real payment provider (Lemon Squeezy v1, Stripe / Paddle / Polar.sh / Keygen / LicenseSpring as later swaps) plugs in. The adapter's responsibilities span: generate purchase URL, verify webhook signature, parse webhook payload to entitlement change.

PRD-000 deliberately has no real provider — manually-seeded entitlements via the state-switcher CLI are the substitute. Real provider integration lands in PRD-001 with the Lemon Squeezy adapter and a webhook handler hosted out-of-band (separate Vercel project or Supabase Edge Function — decided in PRD-001 architecture; see ADR-0005 for context).

The question: does the `PaymentProvider` interface exist in PRD-000's code, or does it land alongside the Lemon Squeezy adapter in PRD-001?

## Decision

The `PaymentProvider` TypeScript interface exists in PRD-000 as a **type-only placeholder** at `src/lib/paywall/types.ts`, with no concrete implementation. The interface defines the contract (`generatePurchaseUrl`, `verifyWebhookSignature`, `parseWebhookPayload`) so adopters reading the PRD-000 code see the second swap-point alongside `EntitlementStore`.

The denial UX state components in PRD-000 reference a `purchaseUrl` string field on each denial result (sourced from a placeholder constant, e.g., `https://example.com/buy`). When PRD-001 lands `LemonSqueezyAdapter`, the placeholder is replaced with a real `provider.generatePurchaseUrl(...)` call. No call sites in PRD-000 invoke the interface; it is purely declarative.

## Consequences

**Easier:**

- Adopters reading PRD-000 see the second swap-point's shape immediately — the "two clean abstraction boundaries" narrative is visible in the code, not just in the README.
- PRD-001 plugs in `LemonSqueezyAdapter` against an interface that already exists. No retroactive interface design under PRD-001 time pressure.
- The blueprint's swap-point story is told twice: in narrative (README) and in code (two parallel interfaces in `types.ts`). Adopters who read code first get the same message as adopters who read prose first.

**Harder:**

- An interface with no implementation is a code smell that experienced reviewers may flag. The README and `src/lib/paywall/types.ts` comment block MUST explain explicitly that this is intentional ("PRD-000 ships the contract; PRD-001 ships the first implementation").
- Tests for the gate component in PRD-000 don't exercise the `PaymentProvider` interface — coverage gap that's visible until PRD-001.
- If PRD-001 discovers the interface needs reshaping (e.g., Lemon Squeezy's webhook payload doesn't fit the declared `parseWebhookPayload` signature), PRD-001 carries a breaking-change risk against PRD-000's already-published contract. Mitigation: keep the PRD-000 interface intentionally minimal and add methods in PRD-001 rather than rewriting.

## Date

2026-05-13
