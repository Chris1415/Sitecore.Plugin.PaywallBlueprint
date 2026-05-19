# Changelog

All notable changes to Paywall Blueprint are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Each PRD prepends a new entry. Do not edit entries below the most recent one.

---

## [0.3.0] — 2026-05-18 (PRD-002 — Bento dashboard redesign)

### Added

- **11-card bento dashboard** at `/full-page` replacing the original single-page freemium layout. 5 free cards with real tenant data + 6 premium cards with animated fake/showcase data (ADR-0018).
- **Free cards:** Welcome hero (real user + tenant identity via `host.user` and `application.context`), Sites tile (live site list via `xmc.sites.listSites`), Plan card (Supabase `tenants` row), User profile (real identity), Tenant info (tenant name, context).
- **Premium cards (locked state):** placeholder silhouettes with `filter: blur(12px)` + `aria-hidden`. **Unlocked state:** Activity chart (Recharts area, lazy-loaded ~300 kb chunk), Content health (animated progress bars), Recent edits (static Sitecore-flavored list), Engagement metrics (rAF counter animations), AI insights (hardcoded bullets), Engagement score + forecast (SVG ring + sparkline).
- **Subscribe banner** — sibling of the blurred premium region (not a child), so it stays readable above the rasterized blur.
- **ThemeToggle** in topbar `rightSideItems[]` — always visible in showcase posture (ADR-0016). 3-state cycle (light / dark / system) via `next-themes`.
- **`TenantIdBadge`** and **`PaywallVersionOverride`** showcase affordances in topbar.
- **`useCounter` hook** (`site/src/lib/use-counter.ts`) — requestAnimationFrame ease-out counter with `prefers-reduced-motion` guard.
- **Dev revoke-access button** — always-visible in the bento for demo/walkthrough convenience.
- **`pickUserDisplay` util** (`site/src/lib/paywall/pickUserDisplay.ts`) — layered user-identity resolution (name → email local-part → "there").
- **Playwright e2e tests** — bento free-tier, bento unlocked, theme + Recharts smoke.

### Changed

- `/full-page` page now server-fetches `tenantsRow` and passes it as a prop to `BentoGrid` — locked/unlocked split derived from server-rendered data, not the `useEntitlement` hook (which does not poll on initial mount).
- `MarketplaceProvider` scope confirmed at full-page layout level (not root layout).
- `processed_events` table: `tenant_id TEXT` column added (ADR-0017, nullable; pre-migration rows stay NULL).

### Decisions (ADRs)

- **ADR-0016** — Theme toggle always visible in topbar for showcase posture; adopters env-gate for production.
- **ADR-0017** — `processed_events.tenant_id` column design (deferred — card that consumed it was dropped during UI iteration, but the migration was applied; column is present for future use).
- **ADR-0018** — Premium bento cards ship 100% fake data. No fetches at any state. Adopters who add real data must add server-side enforcement.

### Deferred

- **ADR-0017 per-tenant activity card** — dropped during PRD-002 UI iteration in favour of User profile and Tenant info free cards. PRD-005 candidate.
- **PRD-003** — Stripe Customer Portal wraps (cancel / plan-change). `/api/portal` remains a 501 stub.

---

## [0.2.0] — 2026-05-17 (PRD-001 — Stripe integration)

### Added

- **`StripeProvider`** (`site/src/lib/paywall/providers/StripeProvider.ts`) — first
  concrete `PaymentProvider` implementation (ADR-0003 ground truth). Orphan recovery
  with `metadata.app_slug` scoping (ADR-0015). `customer_update: { address: 'auto',
  name: 'auto' }` for `automatic_tax` compatibility. Versioned idempotency keys via
  `CHECKOUT_PARAMS_VERSION` constant.
- **`/api/checkout`** — POST handler with Stripe Customer orphan recovery (ADR-0015),
  Checkout Session creation (`mode: 'payment'`, one-time €0.99 EUR), and Stripe error
  translation (FR-2 table). Returns `{ url }` on success or translated error on
  failure.
- **`/api/portal`** — 501 stub for PRD-003 Customer Portal wraps. Exists as a
  forward-compat surface.
- **`/api/entitlement`** — GET handler with service-role Supabase access. Returns
  `EntitlementResult` JSON for the polling fallback. **Unauthenticated in v1** (NFR-7);
  PRD-002 hardens via `host.user.sub` verification.
- **`/api/webhooks/stripe`** — POST handler with signature verification (400 on bad
  signature per US-5), `processed_events` idempotency (200 silent on replay), and 6
  event type handlers: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`. Unhandled types fall
  through to 200 silent (FR-5).
- **`useEntitlement` hook** (`site/src/lib/paywall/hooks/useEntitlement.ts`) —
  polling primary (3 s × 10 = 30 s cap) + postMessage best-effort sugar (ADR-0014
  revised). postMessage triggers an immediate poll but does NOT stop polling — only
  `status === 'allowed'` or timeout stops it. First-signal-wins atomicity via
  `setState(prev => prev ?? signal)`. Exposed via the public API barrel.
- **`/paywall-return` page** (`site/app/paywall-return/`) — server shell + client
  mount handler. Writes `window.opener?.postMessage({ type: 'paywall:refresh' }, origin)`
  + `sessionStorage` backup signal. Opener-null fall-through shows "You can close
  this tab" text.
- **Stripe error-translation table** (`site/src/lib/paywall/stripe-errors.ts`) — maps
  Stripe `code` + `message` to user-friendly status + message. Catch-all surfaces the
  underlying Stripe error in the response body for adopter diagnostics.
- **Build-time env-leak grep test** (`site/scripts/test-stripe-env-leak.sh`,
  `npm run test:env-leak`) — defense-in-depth verification that `STRIPE_SECRET_KEY`
  and `STRIPE_WEBHOOK_SIGNING_SECRET` literals do not appear in `.next/static/**/*.js`.
- **Public IntroPage at `/`** — marketing landing renderable outside the Cloud Portal
  iframe (no SDK handshake required). Route restructure: `MarketplaceProvider` moved
  from root layout to `site/app/full-page/layout.tsx` so `/` is unblocked.
- **`TenantIdBadge` component** on `/full-page` — surfaces live
  `application.context.marketplaceAppTenantId` with copy button for the seed CLI
  workflow.
- **Hahn-Solo branding alignment** with sibling Sitecore.Plugin.* apps — footer logo
  on every page + cap-logo + author line in README.

### Changed

- Scaffold migrated 4a → 4b in-place via
  `npx shadcn@latest add quickstart-with-full-stack-xmc.json` (ADR-0013). 74
  PRD-000 tests preserved through migration.
- `PaywallCheckoutDialog` primary button is now "Subscribe — €0.99 lifetime" and
  calls `useEntitlement().triggerCheckout()` (replacing PRD-000 placeholder "Got it"
  + footnote text). Cancel button stays enabled throughout in-flight checkout (FR-8).
- `PaywallGate` subscribes to `useEntitlement` and re-evaluates the entitlement store
  query when the hook resolves to `allowed`.
- CSP `frame-ancestors` allow-list in `next.config.mjs` includes
  `https://app.sitecorecloud.io` (the canonical Cloud Portal origin; quickstart
  default omits it).
- `next dev` script now includes `--experimental-https` flag (mkcert iframe loop
  required by Cloud Portal).

### Documented

- 4 new Stripe env vars added to `site/.env.example` with angle-bracket placeholders
  and server-only annotations.
- README "Stripe Setup" section — 6-step runbook, env-vars table, test card numbers,
  Stripe Tax optional subsection.
- README "Known limitations of v1 / Adopter responsibilities" — 6 entries + idempotency
  key versioning guidance.
- `docs/smoke-walkthrough.md` refreshed with PRD-001 Tranche A–D operator walks.

### ADRs

- **ADR-0012** — Stripe Price model: one-time €0.99 EUR (`mode: 'payment'`,
  `period_end = null` after purchase). Subscription event handlers ship for
  forward-compat.
- **ADR-0013** — Scaffold migration 4a → 4b applied in-place.
- **ADR-0014** — Iframe success-return: polling is primary; postMessage triggers an
  immediate poll (best-effort sugar); polling-primary revision from original ADR.
- **ADR-0015** — Stripe Customer orphan recovery with `metadata.app_slug` scoping;
  multi-candidate handling (sort by created desc, log discards).

### Deferred

- **Stripe SDK type divergence:** `Stripe.Subscription.current_period_end` was removed
  from `stripe@22.x` TypeScript types but is still present in webhook payloads at
  runtime. The handler reads it via a typed cast with a type guard. Will resolve when
  the Stripe SDK corrects the types.
- **`PaymentProvider.verifyWebhookSignature`** interface declares `Promise<boolean>`;
  the concrete `StripeProvider` returns `Promise<Stripe.Event>`. `StripeProvider`
  intentionally omits `implements PaymentProvider` to avoid the type conflict.
  PRD-003 will reconcile when the second provider lands.
- **PRD-002** — Per-user seat enforcement; `/api/entitlement` auth hardening.
- **PRD-003** — Stripe Customer Portal wraps (`/api/portal` is currently a 501 stub).

---

## [0.1.0] — 2026-05-14 (PRD-000 — Foundation)

### Added

- **`<PaywallGate>` component** (`site/src/lib/paywall/PaywallGate.tsx`) — FR-1
  six-step gate orchestration: env-flag check, context-readiness guard, context
  validation, compile-time-guarded dev override, entitlement fetch with skeleton,
  state render switch.
- **Four UX state components** (`site/src/lib/paywall/states/`):
  - `AllowedState.tsx` — post-gate welcome with defensive layered render of user
    and tenant identity from `application.context`.
  - `NoSubscriptionState.tsx` — "Start your subscription" with "View plans" CTA.
  - `SeatsFullState.tsx` — "All seats in use" with seat counter and "Upgrade plan"
    CTA. **Design-reference component** (evaluator-unreachable in PRD-000; PRD-002
    wires the routing per ADR-0011).
  - `UserUnassignedState.tsx` — "Ask your team admin". **Design-reference component**
    (evaluator-unreachable in PRD-000; PRD-002 wires the routing per ADR-0011).
- **`SkeletonState.tsx`** — single generic skeleton sized to the largest resolved state;
  prevents flash-of-allowed during async entitlement fetch (ADR-0007).
- **`EntitlementStore` interface** — production-runtime interface for entitlement
  evaluation (`getEntitlement(tenantId, userId): Promise<EntitlementResult>`).
- **`EntitlementSeed` interface** — separate dev/CLI interface for seeding tenant state
  (`seedTenant`, `clearState`). Split from `EntitlementStore` per ADR-0002.
- **`PaymentProvider` interface** — type-only placeholder defining the payment adapter
  contract (`generateCheckoutUrl`, `generatePortalUrl`, `verifyWebhookSignature`,
  `parseWebhookPayload`). PRD-001 lands the first concrete implementation (Stripe direct)
  per ADR-0003.
- **`SupabaseStore` adapter** (`site/src/lib/paywall/stores/SupabaseStore.ts`) — implements
  both `EntitlementStore` and `EntitlementSeed` against Supabase Postgres. Tenant-only
  evaluator per ADR-0011: `getEntitlement` consults `tenants` table only; `userId`
  accepted for interface stability but ignored.
- **`supabase/schema.sql`** — idempotent two-table schema (`tenants` + `processed_events`)
  with RLS enabled and permissive placeholder policies. `seats` table deferred to PRD-002
  per ADR-0011 (ADR-0009 / ADR-0010).
- **State-switcher CLI** (`site/scripts/seed-state.ts`) — `npm run seed:state -- <state>`
  for four states: `allowed` and `no-sub` via evaluator; `seats-full` and `unassigned` via
  direct `?previewState=` render (design-reference path).
- **`DemoModeBanner` component** (`site/src/lib/paywall/DemoModeBanner.tsx`) — persistent
  non-dismissible banner with locked copy `"Paywall disabled — demo mode"`. Shown when
  `NEXT_PUBLIC_PAYWALL_ENABLED=false` (ADR-0004 signaled pass-through).
- **React `ErrorBoundary`** (`site/components/error-boundary.tsx`) — class component wrapping
  the gated subtree only; free section above renders independently when the gate throws (NFR-6).
- **Env-flag toggle** (`NEXT_PUBLIC_PAYWALL_ENABLED`) — `false` renders children verbatim
  plus the demo-mode banner; `true` (default) enforces entitlement evaluation.
- **Dev override** (`NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID`) — compile-time-guarded via
  `process.env.NODE_ENV !== 'production'`; dead-code-eliminated from production builds
  (NFR-5). Verified by `npm run test:dce` post-build DCE grep.
- **In-page dev state picker** — `?previewState=<state>` query param bypasses the evaluator
  for local development.
- **Full Blok-themed shell** — single-page freemium layout (free section above separator,
  gated section below) on the `xmc:fullscreen` extension point. Blok semantic tokens only;
  WCAG AA; keyboard-navigable.
- **74 unit/component tests** — ≥ 80% branch coverage on `PaywallGate.tsx`; 100% on
  `SupabaseStore.getEntitlement`; locked-copy assertions on all four state components.
- **OSS launch surface** — README with cold-reader adoption guide, CHANGELOG, MIT LICENSE,
  CONTRIBUTING.md, SECURITY.md, smoke-walkthrough, cold-read-notes template.

### Decisions (ADRs)

- **ADR-0002** — `EntitlementStore` / `EntitlementSeed` interface split. Production interface
  must not carry seed/write methods. See `project-planning/ADR/adr-0002-entitlement-store-interface-split.md`.
- **ADR-0003** — `PaymentProvider` interface is a type-only placeholder in PRD-000; Stripe
  direct is the PRD-001 v1 implementation. See `project-planning/ADR/adr-0003-payment-provider-adapter-placeholder.md`.
- **ADR-0004** — Env-flag `NEXT_PUBLIC_PAYWALL_ENABLED=false` must use signaled pass-through
  (visible banner) — silent pass-through is forbidden. See `project-planning/ADR/adr-0004-env-flag-signaled-passthrough.md`.
- **ADR-0005** — Scaffold architecture 4a (client-side iframe). HTTP localhost supported;
  no mkcert required for this scaffold. See `project-planning/ADR/adr-0005-scaffold-architecture-4a-client-side.md`.
- **ADR-0006** — Custom app registration in Cloud Portal; public Marketplace submission
  deferred. See `project-planning/ADR/adr-0006-custom-app-registration.md`.
- **ADR-0007** — Single generic skeleton sized to the largest resolved state
  (`tenant_active_seats_full` two-CTA layout). See `project-planning/ADR/adr-0007-single-generic-skeleton.md`.
- **ADR-0008** — Context-readiness signal is `useAppContext()` resolving to non-null;
  null-guard is defensive belt-and-suspenders (MarketplaceProvider contract is the real
  readiness guarantee). See `project-planning/ADR/adr-0008-context-readiness-via-provider-resolution.md`.
- **ADR-0009** — Supabase RLS enabled with permissive `USING (true)` defaults for PRD-000;
  production adopters must harden. See `project-planning/ADR/adr-0009-supabase-rls-permissive-default.md`.
- **ADR-0010** — Supabase schema delivered as a copy-pasteable SQL block in
  `site/supabase/schema.sql` (idempotent `IF NOT EXISTS` + `DROP POLICY IF EXISTS`). See
  `project-planning/ADR/adr-0010-supabase-setup-via-sql-block.md`.
- **ADR-0011** — Tenant-only entitlement in PRD-000; `userId` parameter accepted but not
  consulted; `seats` table deferred to PRD-002; `SeatsFullState` and `UserUnassignedState`
  ship as design-reference components. See `project-planning/ADR/adr-0011-tenant-only-entitlement-prd000.md`.

### Deferred

- **PRD-001** — Stripe Checkout session + webhook handler + Customer Portal link +
  `withEntitlement(handler)` server-side HOF.
- **PRD-002** — Per-user seat enforcement: `seats` table, evaluator seat-count branches,
  admin seat-assignment UI. Wires `SeatsFullState` and `UserUnassignedState` into the live
  evaluator.
- **PRD-003** — Stripe Customer Portal wraps for cancel and plan-change (one-call surface
  via the PRD-001 adapter).
- **Post-PRD-003** — Public Marketplace listing submission; second-provider adapters (Paddle,
  Polar.sh, Lemon Squeezy); walkthrough video; i18n.

---

<!-- New PRDs prepend their entry above this line -->

---

## Roadmap

PRD-000 is the foundation. Each subsequent PRD adds one layer and ships with a real-tenant smoke gate before the next one starts.

| PRD | What ships | Status |
|-----|-----------|--------|
| **PRD-000** | `<PaywallGate>` + 4 UX states + Supabase adapter + tenant-only evaluator + OSS launch surface | Shipped 2026-05-14 |
| **PRD-001** | Stripe Checkout + webhook handler + Customer Portal link + idempotency | Shipped 2026-05-17 |
| **PRD-002** | 11-card bento dashboard + theme toggle + fake premium content showcase | Shipped 2026-05-18 |
| **PRD-003** | Stripe Customer Portal wraps for cancel / plan-change (one-call surface via PRD-001 adapter) | Planned |

Post-PRD-003: public Marketplace listing submission and second-provider adapters (Paddle, Polar.sh, Lemon Squeezy).
