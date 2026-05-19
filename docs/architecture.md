# Architecture Overview

Paywall Blueprint is a Next.js 16 App Router application on the Sitecore Marketplace `xmc:fullscreen` extension point. It demonstrates one complete freemium pattern — a React gate component, a swappable entitlement store, and a swappable payment provider — that adopters can fork and adapt in under an hour.

---

## Scaffold and registration

The app was scaffolded with the `sitecore:setup-marketplace-full-stack` quickstart (ADR-0013 — migrated from client-side 4a to full-stack 4b in PRD-001 to host the Stripe webhook handler). It is registered as a **custom app** (not a public Marketplace listing) in Cloud Portal App Studio — public submission is deferred post-PRD-003 (ADR-0006).

---

## Two abstraction boundaries

The design centers on two TypeScript interfaces in `site/src/lib/paywall/types.ts`:

**`EntitlementStore`** — production-runtime contract. One method: `getEntitlement(tenantId, userId): Promise<EntitlementResult>`. The v1 implementation is `SupabaseStore`, backed by a two-table Supabase Postgres schema. Adopters swap this for any store (Redis, Firestore, a REST API) by implementing the interface and passing the instance to `<PaywallGate store={yourStore}>`. The gate does not care what sits behind the interface.

A companion **`EntitlementSeed`** interface carries dev/CLI-only methods (`seedTenant`, `clearState`). Production stores implement only `EntitlementStore`; they are never required to implement seed methods (ADR-0002).

**`PaymentProvider`** — payment adapter contract. Four methods: `generateCheckoutUrl`, `generatePortalUrl`, `verifyWebhookSignature`, `parseWebhookPayload`. PRD-001 ships the first concrete implementation — `StripeProvider` at `site/src/lib/paywall/providers/StripeProvider.ts` (ADR-0003). Second providers (Paddle, Polar.sh) plug in by implementing the interface and swapping the instance in the checkout and webhook routes.

---

## `<PaywallGate>` orchestration

`site/src/lib/paywall/PaywallGate.tsx` is a React client component that runs six steps on each render:

1. **Env-flag check** — `NEXT_PUBLIC_PAYWALL_ENABLED=false` renders children verbatim with a "Paywall disabled — demo mode" banner. No store call is made (ADR-0004).
2. **Context-readiness guard** — waits for `useAppContext()` to resolve non-null before proceeding. The MarketplaceProvider's render contract is the readiness signal; a defensive null-check is belt-and-suspenders against future SDK changes (ADR-0008).
3. **Context validation** — throws if `marketplaceAppTenantId` is missing. The error propagates to the `ErrorBoundary` wrapping the gated subtree; the free section above continues rendering (ADR-0009 context).
4. **Dev override** — compile-time-guarded short-circuit for local development (`NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID`). Dead-code-eliminated from production builds; verified by `npm run test:dce`.
5. **Entitlement fetch** — calls `EntitlementStore.getEntitlement(tenantId, userId)` and shows a skeleton while pending. A single generic skeleton sized to the largest resolved state (`tenant_active_seats_full`) prevents layout shift regardless of which state resolves (ADR-0007).
6. **State render** — switches on `EntitlementResult.status` and renders the matching state component.

`EntitlementResult` is a four-variant discriminated union: `allowed | tenant_no_subscription | tenant_active_seats_full | tenant_active_user_unassigned`. PRD-000's evaluator returns only the first two variants; the seat-related variants are forward-looking design references wired in PRD-002 (ADR-0011).

---

## Supabase schema

Two tables, both with RLS enabled:

- **`tenants`** — one row per paying tenant. Columns: `tenant_id`, `status` (`active | cancelled`), `plan`, `stripe_customer_id`, `period_end` (null = lifetime), `updated_at`. Permissive anon read policy (`USING (true)`) for PRD-000; production adopters must replace this with a tenant-scoped policy (ADR-0009).
- **`processed_events`** — Stripe webhook idempotency cache. Columns: `event_id` (PK), `processed_at`, `tenant_id` (nullable, added PRD-002 — ADR-0017 deferred). No anon read policy — service-role only.

Schema delivered as `site/supabase/schema.sql` (copy-pasteable into the Supabase SQL Editor; idempotent `IF NOT EXISTS` + `DROP POLICY IF EXISTS`). No CLI required (ADR-0010).

---

## Stripe Checkout flow

When a user clicks Subscribe:

1. `useEntitlement().triggerCheckout()` fires a `POST /api/checkout` request.
2. `/api/checkout` runs orphan recovery — looks up the tenant's Stripe Customer by email and `metadata.app_slug` before creating a new one (ADR-0015). Creates a Checkout Session (`mode: 'payment'`, one-time €0.99 EUR lifetime per ADR-0012) and returns `{ url }`.
3. The hook calls `window.open(url, '_blank')` — Stripe Checkout opens in a new tab.
4. The user completes payment; Stripe redirects to `/paywall-return`.
5. `/paywall-return` attempts `window.opener.postMessage({ type: 'paywall:refresh' })` — best-effort sugar (most browsers null `window.opener` in sandboxed iframes).
6. The `useEntitlement` hook polls `/api/entitlement` every 3 seconds for up to 30 seconds (primary path). If `status === 'allowed'`, the gate re-evaluates and transitions to `AllowedState`. The `visibilitychange` event triggers an additional poll when the user returns to the app after the checkout tab closes (ADR-0014).

Idempotency: `processed_events` deduplicates webhook events by `event_id`. The checkout route uses `${tenantId}:${CHECKOUT_PARAMS_VERSION}` as the Stripe idempotency key — bump `CHECKOUT_PARAMS_VERSION` in `StripeProvider.ts` whenever you change the Session params shape.

---

## Bento dashboard (PRD-002)

PRD-002 replaced the original single-page freemium layout with an 11-card bento dashboard at `/full-page`:

- **5 free cards** (Welcome hero, Sites tile, Plan card, User profile, Tenant info) — real data from `host.user`, `application.context`, `xmc.sites.listSites`, and the Supabase `tenants` row. Server-side `tenantsRow` fetch drives the locked/unlocked split (not the `useEntitlement` hook, which does not poll on initial mount).
- **6 premium cards** (Activity chart, Content health, Recent edits, Engagement metrics, AI insights, Engagement score + forecast) — hardcoded/fake data only; no fetches at any state. In locked state, premium cards mount as placeholder silhouettes behind `filter: blur(12px)`. In unlocked state, cards stagger-in with 100 ms per-card delays (ADR-0018).
- **Subscribe banner** — sibling of the blurred premium region (not a child), so the banner stays readable above the rasterized blur (critical structure from POC v2 § 7).

The Recharts area chart (P1) is lazy-loaded as a separate ~300 kb chunk to preserve free-tier first-paint budget.

---

## Theme system

Three-state theme (light / dark / system) via `next-themes`. The theme toggle mounts unconditionally in the topbar `rightSideItems[]` slot as a showcase affordance (ADR-0016 — departs from the portfolio standard of env-gating behind `NEXT_PUBLIC_SHOW_THEME_TOGGLE`). Production adopters should env-gate or remove the toggle.

Blok Nova preset stores color tokens as hex literals (e.g., `--primary: #6e3fff`). Use `var(--primary)` directly for color properties; do not wrap in `hsl()` — the CSS parser falls back to `currentColor` when the value is not an HSL tuple.

---

## ADR reference

All 18 ADRs are in `project-planning/ADR/`. See [docs/decisions.md](decisions.md) for the curated summary.
