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

Sitecore's Cloud Portal Marketplace has no built-in commerce primitives. Every team monetizing a Marketplace App reinvents tenant entitlement + seat enforcement + purchase flow + license sync from scratch. The ecosystem stays free-only because the per-app cost is too high. A public OSS reference removes that barrier.

## Goal (one short paragraph)

Build the **foundation tranche** of a public OSS reference Marketplace App that demonstrates the paywall pattern end-to-end. PRD-000 ships the `<PaywallGate>` React component with four UX states, a swappable `EntitlementStore` (Supabase v1), manually-seeded entitlements via a state-switcher CLI, a single-page freemium layout (top free, bottom gated), an env-flag toggle with demo-mode banner, a dev-override env var, and a public GitHub repo with a README that an unfamiliar cold-reader can adopt from. **No real payment provider in PRD-000** — that's PRD-001.

## Non-negotiables (bullets)

- **App architecture:** client-side iframe (4a) only. Scaffold via `sitecore:setup-marketplace-client-side`. No server-side API routes in PRD-000.
- **Extension point:** SitecoreAI Full Screen (`xmc:fullscreen`) only. Single page, single route `/`.
- **App registration:** custom app in Cloud Portal. Public Marketplace submission deferred.
- **Codebase shape:** single Next.js app. Reusable gate library at `src/lib/paywall/`. No monorepo, no separate npm package. Adopters fork the whole repo (primary path).
- **Two abstraction boundaries** (ADR-locked, see ADRs 0002–0006):
  - `EntitlementStore` interface (production-runtime; required for adopters) + `EntitlementSeed` interface (dev/CLI; optional). `SupabaseStore` implements both. Splitting them is non-negotiable — no contract pollution.
  - `PaymentProvider` interface exists as a *type-level placeholder* in PRD-000 (no concrete implementation; PRD-001 lands Lemon Squeezy adapter).
- **Env-flag** `NEXT_PUBLIC_PAYWALL_ENABLED`: when `false` → children render verbatim + persistent "Paywall disabled — demo mode" banner. **Signaled pass-through is mandatory** — silent pass-through is not acceptable.
- **Dev override** `PAYWALL_DEV_OVERRIDE_USER_ID`: compile-time guarded via `if (process.env.NODE_ENV !== 'production' && process.env.PAYWALL_DEV_OVERRIDE_USER_ID)`. Runtime-only guards are forbidden — production builds MUST dead-code-eliminate the entire override branch.
- **Error handling:** Gate THROWS on malformed context or rejected entitlement promise. Top-level React error boundary catches and renders fallback. Free section above gate MUST keep rendering even when gated subtree falls into the boundary.
- **Skeleton loading state** in the gated subtree during async fetch — prevents flash-of-allowed.
- **Defensive layered render** for post-gate welcome: priority chain `name → email → "there"` for user, `tenant.name → truncated id (last 8 chars) → "your tenant"` for tenant.
- **Stack:** Next.js App Router + TypeScript strict mode. No `any` in the public library API.
- **UI:** Blok-compliant tokens. WCAG AA. Keyboard-navigable.
- **Backing store:** Supabase Postgres. Schema per § 10 of full PRD (`tenants`, `seats`, `purchase_events` — last is empty, provisioned for PRD-001).
- **Test coverage:** ≥ 80% branch coverage on the gate's state-resolution decision tree.
- **No real feature behind the gate.** Premium content is intentionally placeholder. Adding any non-placeholder feature is scope creep.

## In scope / out of scope (very short)

- **In scope:** Scaffold + Blok theming + custom-app registration; `<PaywallGate>` + 4 UX state components + skeleton; `EntitlementStore` + `EntitlementSeed` + `SupabaseStore`; state-switcher CLI; single-page freemium layout; post-gate context-grounded welcome; env-flag + demo-mode banner; dev override (compile-time guarded); React error boundary; public GitHub repo + README + CHANGELOG + `docs/cold-read-notes.md`.
- **Out of scope:** Real payment provider (PRD-001); webhook handler (PRD-001 — hosted out-of-band); seat-management UI (PRD-002); customer portal (PRD-003); Marketplace public-listing submission (post-PRD-003); walkthrough video (PRD-001); second provider adapter; real feature behind gate; i18n.

## Success criteria (3–7 bullets)

- **G1 — Smoke pass:** All 4 UX states render correctly on real Sitecore tenant when entitlement-store rows are flipped via state-switcher CLI. Env-flag toggle visibly engages demo-mode banner. Screenshots committed.
- **G2 — OSS surface ready:** Repo flipped to public visibility. README documents the pattern, two adapter interfaces, env-flag, swap-points, adoption guide (fork primary, copy `src/lib/paywall/` secondary). CHANGELOG updated.
- **G3 — Cold-read pass:** Named cold-reader (operator's choice — colleague, contractor, or LLM in clean context) reads only the README and successfully (a) understands the pattern, (b) identifies the two swap-points, (c) describes what they would change in their own app. Outcome recorded in `docs/cold-read-notes.md`.
- **Ship moment** = G1 screenshots committed AND G2 repo public AND G3 note committed. All three required.

## Key constraints & assumptions

- **ADR-0002** — `EntitlementStore` / `EntitlementSeed` split. Implementer MUST NOT merge them or add seed methods to the production interface.
- **ADR-0003** — `PaymentProvider` interface exists only as a type placeholder in PRD-000; PRD-001 lands the first concrete implementation.
- **ADR-0004** — Env-flag toggle pattern: signaled pass-through with banner. Silent pass-through is forbidden.
- **ADR-0005** — Scaffold architecture: 4a client-side iframe. PRD-001 webhook hosted out-of-band; no Next.js API routes added to this scaffold.
- **ADR-0006** — Custom-app registration. Public Marketplace submission requires distinct submission flow, deferred.
- **Banner copy locked:** `"Paywall disabled — demo mode"` is the exact string. UI designer decides placement and styling only.
- **Operator action OA-1** (probe `application.context` shape) happens BEFORE `/architect` finalizes Tranche B work — captured shape lands at `project-planning/architecture/sdk-fixtures/application-context.json`.
- **Tranche execution order:** A → B → C → D → E. Each tranche has a hard operator gate. Tranche C has a scored "challenge gate" with explicit pass / soft-fail / hard-fail rubric — see § 12 of full PRD.

## Handoff

- **Full PRD:** `project-planning/PRD/prd-000.md` (for humans and upstream agents only — not loaded by agent 08 in normal flow).
- **Executable contract:** `project-planning/plans/task-breakdown-<timestamp>.md` after QA (07) enrichment.
- **ADRs (binding architectural decisions):** `project-planning/ADR/adr-0002-*.md` through `adr-0006-*.md` — read these inline with this minimal PRD.
