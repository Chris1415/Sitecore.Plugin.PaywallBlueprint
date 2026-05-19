# Decision Log

Human-readable summary of all 18 Architecture Decision Records (ADRs) for Paywall Blueprint. Each row links to the full ADR in `project-planning/ADR/` for complete context and consequences.

---

## Architecture backbone

| ADR | Title | Status | One-line rationale |
|-----|-------|--------|-------------------|
| [ADR-0001](../project-planning/ADR/adr-0001-use-adrs-as-architecture-backbone.md) | Use ADRs as the architecture backbone | Accepted | Durable, versioned decision records traceable alongside the product tree. |

---

## Entitlement and payment contracts

| ADR | Title | Status | One-line rationale |
|-----|-------|--------|-------------------|
| [ADR-0002](../project-planning/ADR/adr-0002-entitlement-store-interface-split.md) | Split entitlement-store contract into runtime + seed interfaces | Accepted | Production stores must not implement seed/write methods that only the local CLI needs; split keeps the interfaces focused and the adopter's implementation minimal. |
| [ADR-0003](../project-planning/ADR/adr-0003-payment-provider-adapter-placeholder.md) | Payment-provider adapter — Stripe direct as v1; adapter pattern preserved | Accepted | PRD-000 ships the `PaymentProvider` contract as a type-only placeholder so adopters see the second swap-point immediately; PRD-001 ships the first concrete implementation (Stripe direct, revised from Lemon Squeezy after operator research). |
| [ADR-0011](../project-planning/ADR/adr-0011-tenant-only-entitlement-prd000.md) | Tenant-only entitlement in PRD-000; per-user seat enforcement deferred to PRD-002 | Accepted | Keeps PRD-000 scope focused on the gate pattern; seat-count race conditions and admin assignment belong in a later PRD. The `SeatsFullState` and `UserUnassignedState` components ship as design references only. |
| [ADR-0017](../project-planning/ADR/adr-0017-processed-events-tenant-id-column.md) | Add `tenant_id` column to `processed_events` for per-tenant activity filtering | Deferred | Designed for a per-tenant webhook-activity bento card; the card was dropped during PRD-002 UI iteration. The column design remains the recommended approach if a future PRD adds that surface. |
| [ADR-0018](../project-planning/ADR/adr-0018-premium-fake-data-blueprint-posture.md) | Premium bento cards ship fake/marketing data only; production hardening is adopter responsibility | Accepted | Authoring GraphQL schema shape was unknown and out of scope for a UI-focused PRD; fake data eliminates big unknowns and keeps PRD-002 focused on visual polish. Adopters who add real data must add server-side enforcement. |

---

## Scaffold and registration

| ADR | Title | Status | One-line rationale |
|-----|-------|--------|-------------------|
| [ADR-0005](../project-planning/ADR/adr-0005-scaffold-architecture-4a-client-side.md) | Scaffold blueprint as 4a client-side iframe; webhook hosted out-of-band in PRD-001 | Accepted | PRD-000 has zero server-side logic; scaffolding 4b before it's needed violates "smallest version that proves the idea." |
| [ADR-0006](../project-planning/ADR/adr-0006-custom-app-registration.md) | Register as custom app for PRD-000; public-Marketplace submission deferred | Accepted | Public submission phases 6–9 add meaningful work without delivering new capability; the codebase is architected public-app-ready from day one. |
| [ADR-0010](../project-planning/ADR/adr-0010-supabase-setup-via-sql-block.md) | Supabase setup via copy-pasteable SQL block in `supabase/schema.sql`, not CLI automation | Accepted | Fewer steps to first run: a browser + the Supabase SQL Editor is all that's needed; no tooling dependencies beyond what adopters already have. |
| [ADR-0013](../project-planning/ADR/adr-0013-scaffold-migration-4a-to-4b-prd001.md) | Scaffold migration 4a → 4b in PRD-001; webhook hosted as Next.js API route in same app | Accepted | One deployment, one set of env vars, one log surface — the simplest adoption story for the Stripe webhook handler. |

---

## Runtime behavior

| ADR | Title | Status | One-line rationale |
|-----|-------|--------|-------------------|
| [ADR-0004](../project-planning/ADR/adr-0004-env-flag-signaled-passthrough.md) | Env-flag toggle uses signaled pass-through, not silent pass-through | Accepted | The demo-mode banner makes the toggle's effect observable from the outside — essential for the walkthrough narrative and for preventing "forgot the flag is off" in self-hosted forks. |
| [ADR-0007](../project-planning/ADR/adr-0007-single-generic-skeleton.md) | Single generic skeleton sized to the largest resolved state | Accepted | The gate cannot know which state is about to resolve while pending, so per-state skeletons would produce layout shift 75% of the time; one oversized skeleton prevents layout shift unconditionally. |
| [ADR-0008](../project-planning/ADR/adr-0008-context-readiness-via-provider-resolution.md) | Context-readiness signal sourced from `MarketplaceProvider` resolution | Accepted | The provider's render contract ("children render only after context resolves") is the readiness signal — no new infrastructure needed; a defensive null-check is belt-and-suspenders. |
| [ADR-0014](../project-planning/ADR/adr-0014-iframe-success-return-postmessage-polling.md) | Iframe success-return — postMessage primary + 3s/30s polling fallback | Accepted | Modern browsers null `window.opener` in sandboxed iframes; polling is the load-bearing path; postMessage triggers an immediate poll as best-effort sugar when available. |
| [ADR-0016](../project-planning/ADR/adr-0016-theme-toggle-always-visible-showcase.md) | Theme toggle is always visible in the topbar; departs from env-gating policy for the showcase | Accepted | Paywall Blueprint is itself a showcase; the always-visible toggle demonstrates visual polish alongside other showcase-only affordances (TenantIdBadge, PaywallVersionOverride). Adopters env-gate for production. |

---

## Data and integrations

| ADR | Title | Status | One-line rationale |
|-----|-------|--------|-------------------|
| [ADR-0009](../project-planning/ADR/adr-0009-supabase-rls-permissive-default.md) | Supabase RLS enabled with permissive default policies in PRD-000; production adopters harden | Accepted | Middle ground: RLS is on (production adopters must write explicit policies), but `USING (true)` avoids JWT-claim propagation infrastructure not in PRD-000 scope. |
| [ADR-0012](../project-planning/ADR/adr-0012-stripe-price-model-one-time-lifetime.md) | Stripe Price model — one-time €0.99 lifetime in PRD-001 | Accepted | Simplest checkout flow; adopters see the gate pattern without subscription-management distraction; recurring is a one-Price-ID flip in their fork. |
| [ADR-0015](../project-planning/ADR/adr-0015-stripe-customer-orphan-recovery.md) | Stripe Customer orphan recovery via `metadata.tenant_id` lookup before create | Accepted | Reinstall scenario (where `marketplaceAppTenantId` may change) is handled structurally via email + `metadata.app_slug` lookup before creating a new Customer — ~300 ms overhead, structural correctness. |
