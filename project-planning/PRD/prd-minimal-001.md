# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-001.md
pairs_with_prd: project-planning/PRD/prd-001.md
generated_at: 2026-05-15T08:30:00Z
run_manifest: project-planning/workflow/run-20260515T081454Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Slim-context PRD-001 for Developer 08. Reads alongside the enriched task breakdown.
  Builds on PRD-000 ship; adds Stripe direct integration (one-time €0.99 lifetime).
---

## Problem (one short paragraph)

PRD-000 shipped a paywall pattern with a placeholder dialog. PRD-001 replaces the placeholder with a real Stripe Checkout flow — Customer creation, Checkout Session, webhook-driven entitlement upsert, and post-payment iframe refresh. After PRD-001, an editor can actually pay €0.99 and get gated content unlocked, end-to-end.

## Goal (one short paragraph)

Add **Stripe direct as v1 provider** to the shipped paywall-blueprint. Migrate scaffold 4a → 4b (Next.js API routes); implement `StripeProvider`; add 4 API routes (`/api/checkout`, `/api/portal` stub for PRD-003, `/api/entitlement` for polling fallback, `/api/webhooks/stripe`); wire `useEntitlement` hook + `PaywallCheckoutDialog` rewire + `/paywall-return` page with postMessage + polling fallback; populate `tenants.stripe_customer_id` via webhook with `processed_events` idempotency; orphan-recovery via `metadata.tenant_id` Stripe Customer lookup. **One-time payment only** (subscription event handlers ship forward-compat but unused in v1).

## Non-negotiables (bullets)

- **All 15 ADRs (0001–0015) are non-negotiable.** New: 0012 Price model, 0013 4a→4b migration, 0014 postMessage+polling hybrid, 0015 orphan recovery. See § 4c-2.
- **Locked Stripe pre-flight (operator setup done 2026-05-15):**
  - Product `prod_UWKcVQmJH2MiSa` (Paywall Blueprint Premium)
  - Price `price_1TXHyIAHnDmxitZjwxHhKe8y` (one-time €0.99 EUR; `type: one_time`)
  - Test-mode keys in `site/.env.local`
  - Webhook endpoint created in Tranche D, not Tranche A
- **Scaffold migration (Tranche A):** apply `sitecore:setup-marketplace-full-stack` in-place over the existing 4a scaffold. Existing 74 tests MUST continue to pass after migration.
- **Webhook signature verification:** every POST verified via `stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)`. Bad signature → 401. No exception.
- **Webhook idempotency:** INSERT INTO `processed_events (event_id) ON CONFLICT DO NOTHING`; on conflict → return 200 silently. Replay-safe.
- **Webhook handler latency:** ≤ 5 seconds total (Stripe retries on >5s).
- **`/api/checkout` orphan recovery:** look up Customer by `metadata.tenant_id` via `stripe.customers.list({ email })` BEFORE creating new. ADR-0015 contract.
- **`/api/checkout` idempotency key:** use `tenantId` as Stripe idempotency key to dedupe concurrent calls.
- **`automatic_tax: { enabled: true }` in Checkout Session config** (NFR-9). Adopters disable per `StripeProvider.ts` if Stripe Tax not configured in their dashboard.
- **Server-only env vars:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SIGNING_SECRET` — no `NEXT_PUBLIC_` prefix. Build-time grep test enforces this.
- **`useEntitlement` postMessage + polling parallel race** — whichever wins, the other shuts down. Polling: 3s interval, 30s cap (10 polls).
- **`/api/entitlement` runs server-side via `SUPABASE_SECRET_KEY` (service-role)** — bypasses RLS for the read; caller auth deferred to PRD-002+.
- **`PaywallCheckoutDialog` button copy:** primary "Subscribe — €0.99 lifetime"; secondary "Cancel". Spinner during in-flight. Locked.
- **`/paywall-return` page:** writes `window.opener.postMessage({ type: 'paywall:refresh' }, origin)` + closes; secondary signal via sessionStorage. Server-rendered with client-side mount handler.
- **Stack:** Next.js 16+ App Router, TypeScript strict, `stripe` Node SDK (latest at install), Vitest, existing `@sitecore-marketplace-sdk/client` + Supabase clients.
- **No new tables.** Schema unchanged. `tenants.stripe_customer_id` + `subscription_id` columns from PRD-000 now populated.

## In scope / out of scope (very short)

- **In scope:** 4a→4b migration + `stripe` SDK install; `StripeProvider` (first concrete `PaymentProvider`); 4 API routes; `useEntitlement` hook; `/paywall-return` page; `PaywallCheckoutDialog` rewire; webhook handler for 6 event types + idempotency + signature verification; orphan-recovery flow; README "Stripe Setup" section; CHANGELOG `[0.2.0]`; `docs/smoke-walkthrough.md` refresh; `.env.example` update.
- **Out of scope:** Customer Portal wrap (PRD-003 — `/api/portal` is 501 stub); per-user seats (PRD-002); recurring subscription mode (handlers ship forward-compat, no UX); `withEntitlement` HOF; Marketplace public-listing submission; walkthrough video; new database tables.

## Success criteria (3–7 bullets)

- **G1 — End-to-end test-mode payment smoke:** click "Subscribe — €0.99 lifetime" → Stripe Checkout opens in new tab → pay with `4242 4242 4242 4242` → iframe refreshes within 30 seconds to welcome card. Screenshot evidence committed.
- **G2 — Webhook delivers + idempotency holds:** first `checkout.session.completed` upserts `tenants` row; Stripe Dashboard "Send test webhook" re-fire returns 200 silently (no duplicate row).
- **G3 — README + CHANGELOG updated:** Stripe setup section + new env vars table + test card numbers + `stripe listen` command documented inline. `[0.2.0]` CHANGELOG entry.
- **Ship moment** = G1 screenshots committed AND G2 verified AND G3 merged. PR merged into main.

## Key constraints & assumptions

- **ADR-0012** — Stripe Price model: one-time €0.99 EUR lifetime (`type: one_time`, `mode: 'payment'`). Webhook handlers cover subscription events for forward-compat.
- **ADR-0013** — Scaffold migration 4a → 4b. Webhook hosted as Next.js API route in same app. Resolves PRD-000 ADR-0005's open question.
- **ADR-0014** — Iframe success-return: `window.opener.postMessage` primary + 3s/30s polling fallback. Both paths shipped; whichever wins first stops the other.
- **ADR-0015** — Stripe Customer orphan recovery via `metadata.tenant_id` lookup before create. Resolves Q1 `tenantId` durability risk structurally; no pre-PRD-001 probe needed.
- **A1** — Cloud Portal iframe permissions allow `window.open` + `window.opener.postMessage` (likely; polling fallback covers if not).
- **A2** — Stripe webhook signing secret stored as `STRIPE_WEBHOOK_SIGNING_SECRET` (server-only).
- **A3** — Stripe Tax dashboard toggle is operator's decision (per jurisdiction). Code ships with `automatic_tax: { enabled: true }`; documented in README.
- **Tenant identity key remains `application.context.marketplaceAppTenantId`** (PRD-000 lock).
- **User identity remains `host.user.sub`** (PRD-000 lock).

## Handoff

- **Full PRD:** `project-planning/PRD/prd-001.md` (for humans and upstream agents).
- **Executable contract:** `project-planning/plans/task-breakdown-<timestamp>.md` after QA enrichment (PRD-001 is a feature PRD; same flow as PRD-000).
- **ADRs (binding architectural decisions):** `project-planning/ADR/adr-0001-*.md` through `adr-0015-*.md`. ADRs 0012–0015 are new in PRD-001.
- **Stripe wiring reference:** `storage/paywall-providers-research-2026-05-13.md` § 8 (agentic parent repo; NOT in public paywall-blueprint repo — README inlines the key shape for adopters).
