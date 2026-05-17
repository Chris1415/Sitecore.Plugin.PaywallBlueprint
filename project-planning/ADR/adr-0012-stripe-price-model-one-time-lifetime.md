# ADR-0012: Stripe Price model — one-time €0.99 lifetime in PRD-001

## Status

Accepted

## Context

PRD-001 lands the first concrete `PaymentProvider` implementation (Stripe direct). The Stripe Product + Price configuration is THE central business-shape decision: do we sell a one-time payment, a recurring subscription, or both?

Three options surfaced during /create-prd DQ1:

- **(a) One-time €0.99 lifetime payment.** `mode: 'payment'`, single Price, no `recurring`. Tenant gets `status: 'active'` with `period_end: null` (never expires). Matches the placeholder dialog's existing copy ("€0.99 lifetime"). Simplest checkout flow; no churn handling; webhook handles `checkout.session.completed` + `customer.subscription.*` for forward-compat.
- **(b) Recurring subscription** (monthly or annual). `mode: 'subscription'`, demonstrates the full Stripe Billing experience including dunning, prorations, plan changes. More code paths to test.
- **(c) Both — operator-toggleable** via env var or Price ID. Maximum demonstration value; maximum complexity.

The OSS reference goal makes simplicity weigh heavier than completeness — adopters need to SEE the pattern work; they don't need a perfect mirror of their eventual production setup. They can flip to recurring in their fork by changing the Price ID in Stripe Dashboard.

## Decision

- **One-time €0.99 EUR payment** as the v1 PRD-001 model.
- Stripe Product: `prod_UWKcVQmJH2MiSa` ("Paywall Blueprint Premium") — created in test mode 2026-05-15.
- Stripe Price: `price_1TXHyIAHnDmxitZjwxHhKe8y` (`type: one_time`, `unit_amount: 99`, `currency: eur`, `recurring: null`).
- Checkout Session config: `mode: 'payment'`, `line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }]`, `automatic_tax: { enabled: true }`, `metadata: { tenant_id: marketplaceAppTenantId }`.
- Webhook handlers cover **6 event types** including `customer.subscription.*` and `invoice.payment_*` — forward-compat for adopters who switch to recurring. Subscription events are simply no-ops in PRD-001's one-time flow.
- `tenants.status = 'active'` and `tenants.period_end = NULL` after a successful one-time checkout (means "never expires").

## Consequences

**Easier:**

- Simpler Checkout Session creation. No `subscription_data` block. Stripe API call is one line per checkout.
- Webhook handler only needs to react to `checkout.session.completed` for the primary upsert path; the rest are no-ops in v1.
- No dunning, no proration, no plan-change complexity. Adopters see the gate pattern without subscription-management distraction.
- Stripe Tax integration is identical for one-time and recurring — no surprise.

**Harder:**

- Adopters who want recurring subscriptions must flip the Stripe Price in their fork and re-test the subscription event paths. README documents this path.
- Lifetime entitlement creates support-cost questions ("can I get a refund?"). Not addressed by PRD-001; adopters add `charge.refunded` handler if they care.
- The €0.99 amount is symbolic — adopters will use realistic prices. Easy to change in Stripe Dashboard (modify the Price's `unit_amount` or create a new Price + update `STRIPE_PRICE_ID`).

## Date

2026-05-15
