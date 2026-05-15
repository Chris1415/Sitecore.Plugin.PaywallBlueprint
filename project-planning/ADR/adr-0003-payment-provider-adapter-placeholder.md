# ADR-0003: Payment-provider adapter — Stripe direct as v1; adapter pattern preserved

## Status

Accepted (revised 2026-05-13 — provider switched from Lemon Squeezy to Stripe direct after operator research at `storage/paywall-providers-research-2026-05-13.md`)

## Context

The blueprint's second abstraction boundary is the `PaymentProvider` adapter — the surface through which a real payment provider plugs in. The adapter's responsibilities span: generate Checkout URL, verify webhook signature, parse webhook payload into entitlement changes, generate Customer Portal session URL (for the PRD-003 admin view).

PRD-000 deliberately has no real provider — manually-seeded entitlements via the state-switcher CLI are the substitute. Real provider integration lands in PRD-001 with the Stripe adapter and the Stripe webhook handler.

**Provider selection (revised 2026-05-13):** The original brain-dump recommendation was Lemon Squeezy (merchant-of-record provider; removes VAT/tax complexity for the operator). Operator research after PRD-000 planning (full comparison at `storage/paywall-providers-research-2026-05-13.md` covering Stripe Billing, Polar.sh, Lemon Squeezy, Chargebee, and Stigg) revised the choice to **Stripe direct**:

- **Stripe Billing + Entitlements API** — first-class subscription primitives, feature-flag style entitlements, native trial-period support, Customer Portal hosted UI for plan/card/cancel/invoices.
- **Merchant of record posture:** operator IS the MoR by default. Operator accepts this; Stripe Tax can layer in later (one toggle) for global VAT simplification.
- **Stripe Managed Payments** (public preview Feb 2026, same 5% + 50¢ MoR fees, same Stripe account) is the upgrade path if MoR posture ever needs to flip — zero adapter code change.
- **Customer Portal** drastically simplifies PRD-003: one API call (`stripe.billingPortal.sessions.create({ customer, return_url })`) and Stripe hosts the entire UI for card / plan / cancel / invoices.

The question for PRD-000: does the `PaymentProvider` interface exist in PRD-000's code, or does it land alongside the Stripe adapter in PRD-001?

## Decision

The `PaymentProvider` TypeScript interface exists in PRD-000 as a **type-only placeholder** at `src/lib/paywall/types.ts`, with no concrete implementation. The interface defines the contract (`generateCheckoutUrl`, `verifyWebhookSignature`, `parseWebhookPayload`, `generatePortalUrl`) so adopters reading the PRD-000 code see the second swap-point alongside `EntitlementStore`.

The denial UX state components in PRD-000 reference a `purchaseUrl` string field on each denial result (sourced from a placeholder constant, e.g., `https://example.com/buy`). When PRD-001 lands `StripeAdapter`, the placeholder is replaced with a real `provider.generateCheckoutUrl({ tenantId, userEmail, priceId })` call returning a Stripe Checkout Session URL. No call sites in PRD-000 invoke the interface; it is purely declarative.

**v1 adapter is Stripe.** Second adapters (Polar.sh, Lemon Squeezy, Paddle) are post-PRD-003 stretch — the abstraction means each is one new file, but maintenance bandwidth is the constraint, not architecture.

## Consequences

**Easier:**

- Adopters reading PRD-000 see the second swap-point's shape immediately — the "two clean abstraction boundaries" narrative is visible in the code, not just in the README.
- PRD-001 plugs in `StripeAdapter` against an interface that already exists. No retroactive interface design under PRD-001 time pressure.
- PRD-003 shrinks dramatically because Stripe Customer Portal is one API call — the original framing ("wrap the provider's hosted portal inside Standalone admin view") becomes "embed/redirect to the Stripe-hosted portal."
- Stripe Tax / Stripe Managed Payments are zero-code upgrades within the Stripe path — operator can change tax/MoR posture without provider migration.

**Harder:**

- An interface with no implementation is a code smell that experienced reviewers may flag. The README and `src/lib/paywall/types.ts` comment block MUST explain explicitly that this is intentional ("PRD-000 ships the contract; PRD-001 ships the first implementation").
- Tests for the gate component in PRD-000 don't exercise the `PaymentProvider` interface — coverage gap that's visible until PRD-001.
- If PRD-001 discovers the interface needs reshaping (e.g., Stripe's Customer Portal returns a different shape than `generatePortalUrl` declares), PRD-001 carries a breaking-change risk against PRD-000's already-published contract. Mitigation: keep the PRD-000 interface intentionally minimal (4 methods) and add methods in PRD-001 rather than rewriting.
- Adopters in EU jurisdictions where Stripe Tax matters from day one need to flip the Stripe Tax toggle and document it in their fork's README. Blueprint README calls this out under "Adopter responsibilities."

## Date

2026-05-13 (revised; original draft also dated 2026-05-13)
