# Changelog

All notable changes to Paywall Blueprint are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Each PRD prepends a new entry. Do not edit entries below the most recent one.

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
