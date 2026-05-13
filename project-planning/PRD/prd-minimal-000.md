# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-000.md
pairs_with_prd: project-planning/PRD/prd-000.md
generated_at: 2026-05-13T09:34:04Z
run_manifest: project-planning/workflow/run-20260513T093404Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Condensed north-star for implementation. Keeps token use low: agent 08 reads this plus
  the enriched task breakdown only — not the full PRD or architecture doc.
---

## Problem (one short paragraph)

Sitecore's Cloud Portal Marketplace has no built-in commerce primitives. Every team monetizing a Marketplace App reinvents tenant entitlement + purchase flow + license sync from scratch. The ecosystem stays free-only because the per-app cost is too high. A public OSS reference removes that barrier.

## Goal (one short paragraph)

Build the **foundation tranche** of a public OSS reference Marketplace App that demonstrates the paywall pattern end-to-end. PRD-000 ships the `<PaywallGate>` React component, **tenant-only entitlement evaluation** (2 live UX states: `allowed`, `tenant_no_subscription`) + **2 design-reference state components** (`SeatsFullState`, `UserUnassignedState`) that PRD-002 wires into the evaluator, a swappable `EntitlementStore` (Supabase v1), manually-seeded entitlements via a state-switcher CLI, a single-page freemium layout (top free, bottom gated), an env-flag toggle with demo-mode banner, a dev-override env var, and a public GitHub repo with a README that an unfamiliar cold-reader can adopt from. **No real payment provider in PRD-000** — that's PRD-001 (Stripe direct). **No per-user seat enforcement in PRD-000** — that's PRD-002 per ADR-0011.

## Non-negotiables (bullets)

- **App architecture:** client-side iframe (4a) only. Scaffold via `sitecore:setup-marketplace-client-side`. No server-side API routes in PRD-000.
- **Extension point:** SitecoreAI Full Screen (`xmc:fullscreen`) only. Single page, single route `/`.
- **App registration:** custom app in Cloud Portal. Public Marketplace submission deferred.
- **Codebase shape:** single Next.js app. Reusable gate library at `src/lib/paywall/`. No monorepo, no separate npm package. Adopters fork the whole repo (primary path).
- **Tenant-only entitlement (ADR-0011):** `getEntitlement(tenantId, userId)` consults `tenants` table only; ignores `userId`. Returns `allowed` if `tenant.status === 'active'`, `tenant_no_subscription` otherwise. PRD-002 extends with the seats branch.
- **Four UX state components ship (FR-5):** All 4 components (`AllowedState`, `NoSubscriptionState`, `SeatsFullState`, `UserUnassignedState`) ship in PRD-000 with locked copy + a11y. Evaluator only routes to the first 2; the other 2 are design-reference accessible via `pnpm seed:state seats-full | unassigned` direct-render.
- **Two abstraction boundaries** (ADR-locked, see ADRs 0002–0011):
  - `EntitlementStore` interface (production-runtime; required for adopters) + `EntitlementSeed` interface (dev/CLI; optional). `SupabaseStore` implements both. Splitting them is non-negotiable — no contract pollution.
  - `PaymentProvider` interface exists as a *type-level placeholder* in PRD-000 (no concrete implementation; PRD-001 lands **Stripe direct** adapter — Stripe Billing + Entitlements API + Customer Portal).
- **Env-flag** `NEXT_PUBLIC_PAYWALL_ENABLED`: when `false` → children render verbatim + persistent "Paywall disabled — demo mode" banner. **Signaled pass-through is mandatory** — silent pass-through is not acceptable.
- **Dev override** `PAYWALL_DEV_OVERRIDE_USER_ID`: compile-time guarded via `if (process.env.NODE_ENV !== 'production' && process.env.PAYWALL_DEV_OVERRIDE_USER_ID)`. Runtime-only guards are forbidden — production builds MUST dead-code-eliminate the entire override branch.
- **Error handling:** Gate THROWS on malformed context or rejected entitlement promise. Top-level React error boundary catches and renders fallback. Free section above gate MUST keep rendering even when gated subtree falls into the boundary.
- **Skeleton loading state** in the gated subtree during async fetch — prevents flash-of-allowed.
- **Defensive layered render** for post-gate welcome: priority chain `name → email → "there"` for user, `tenant.name → truncated id (last 8 chars) → "your tenant"` for tenant.
- **Stack:** Next.js App Router + TypeScript strict mode. No `any` in the public library API.
- **UI:** Blok-compliant tokens. WCAG AA. Keyboard-navigable.
- **Backing store:** Supabase Postgres. Schema per § 10 of full PRD — **2 tables in PRD-000**: `tenants` (used by evaluator), `processed_events` (empty in PRD-000; provisioned for PRD-001 Stripe webhook idempotency). **`seats` table is NOT in PRD-000** — PRD-002 adds it.
- **Test coverage:** ≥ 80% branch coverage on the gate's state-resolution decision tree (effectively 2 happy paths + skeleton + throw + dev-override — the seat branches are unreachable from the PRD-000 evaluator).
- **No real feature behind the gate.** Premium content is intentionally placeholder. Adding any non-placeholder feature is scope creep.

## In scope / out of scope (very short)

- **In scope:** Scaffold + Blok theming + custom-app registration; `<PaywallGate>` + all 4 UX state components (2 evaluator-reachable + 2 design-reference) + skeleton + error boundary; `EntitlementStore` + `EntitlementSeed` + `SupabaseStore` (2-table schema: `tenants` + `processed_events`); state-switcher CLI; single-page freemium layout; post-gate context-grounded welcome; env-flag + demo-mode banner; dev override (compile-time guarded); public GitHub repo + README + CHANGELOG + `docs/cold-read-notes.md`.
- **Out of scope:** Real payment provider (PRD-001 = Stripe direct); webhook handler (PRD-001 — hosting decided then); **per-user seat enforcement** (PRD-002 per ADR-0011 — adds `seats` table + seat-count branches + admin UI); customer portal (PRD-003 = Stripe Customer Portal); Marketplace public-listing submission (post-PRD-003); walkthrough video (PRD-001); second provider adapter; real feature behind gate; i18n.

## Success criteria (3–7 bullets)

- **G1 — Smoke pass:** All 4 UX state components render correctly on real Sitecore tenant — 2 via evaluator (`pnpm seed:state allowed | no-sub`), 2 via direct-render (`pnpm seed:state seats-full | unassigned`). Env-flag toggle visibly engages demo-mode banner. Screenshots committed for each.
- **G2 — OSS surface ready:** Repo flipped to public visibility. README documents the pattern, two adapter interfaces, env-flag, swap-points, adoption guide (fork primary, copy `src/lib/paywall/` secondary), and explicitly calls out **client-gate-is-UX-not-security** + **tenant-only evaluator + design-reference components for seats** distinctions. CHANGELOG updated.
- **G3 — Cold-read pass:** Named cold-reader (operator's choice — colleague, contractor, or LLM in clean context) reads only the README and successfully (a) understands the pattern, (b) identifies the two swap-points, (c) describes what they would change in their own app. Outcome recorded in `docs/cold-read-notes.md`.
- **Ship moment** = G1 screenshots committed AND G2 repo public AND G3 note committed. All three required.

## Key constraints & assumptions

- **ADR-0002** — `EntitlementStore` / `EntitlementSeed` split. Implementer MUST NOT merge them or add seed methods to the production interface.
- **ADR-0003** — `PaymentProvider` interface exists only as a type placeholder in PRD-000; PRD-001 lands the first concrete implementation (**Stripe direct** — Stripe Billing + Entitlements + Customer Portal).
- **ADR-0004** — Env-flag toggle pattern: signaled pass-through with banner. Silent pass-through is forbidden.
- **ADR-0005** — Scaffold architecture: 4a client-side iframe. PRD-001 webhook hosting decision (Next.js API route via 4a→4b migration, Supabase Edge Function, or separate Vercel project) lands at PRD-001 architecture.
- **ADR-0006** — Custom-app registration. Public Marketplace submission requires distinct submission flow, deferred.
- **ADR-0007** — Single generic skeleton sized to the largest state (`tenant_active_seats_full` two-CTA layout) — even though seats-full is unreachable from PRD-000 evaluator, the design-reference component sets the skeleton size invariant.
- **ADR-0008** — Context-readiness via `MarketplaceProvider` resolution + defensive `null` guard.
- **ADR-0009** — Supabase RLS enabled with permissive defaults for PRD-000; production adopters harden.
- **ADR-0010** — Supabase setup via copy-pasteable SQL block in `supabase/schema.sql`.
- **ADR-0011** — Tenant-only entitlement in PRD-000; per-user seat enforcement deferred to PRD-002. `userId` parameter is accepted by `getEntitlement` for interface stability but NOT consulted. `seats` table is NOT in PRD-000 schema. 2 design-reference state components (`SeatsFullState`, `UserUnassignedState`) ship fully-built but unreachable from the evaluator.
- **Banner copy locked:** `"Paywall disabled — demo mode"` is the exact string. UI designer decides placement and styling only.
- **Operator action OA-1** (probe `application.context` shape) happens BEFORE Tranche B finalizes — captured shape lands at `project-planning/architecture/sdk-fixtures/application-context.json`. Defensive layered render is the safety net.
- **Provider research:** `storage/paywall-providers-research-2026-05-13.md` § 8 documents the Stripe wiring shape that PRD-001 inherits.
- **Tranche execution order:** A → B → C → D → E. Each tranche has a hard operator gate. Tranche C has a scored "challenge gate" with explicit pass / soft-fail / hard-fail rubric — see § 12 of full PRD.

## Handoff

- **Full PRD:** `project-planning/PRD/prd-000.md` (for humans and upstream agents only — not loaded by agent 08 in normal flow).
- **Executable contract:** `project-planning/plans/task-breakdown-<timestamp>.md` after QA (07) enrichment.
- **ADRs (binding architectural decisions):** `project-planning/ADR/adr-0002-*.md` through `adr-0011-*.md` — read these inline with this minimal PRD. ADR-0001 is the meta-ADR.
