# Implementation Runbook

---
document_type: implementation_runbook
artifact_name: implementation-runbook-20260515T081454Z.md
generated_at: 2026-05-15T11:15:00Z
run_manifest: project-planning/workflow/run-20260515T081454Z.json
source_inputs:
  - project-planning/PRD/prd-minimal-001.md (slim spec contract for Developer 08)
  - project-planning/plans/task-breakdown-20260515T081454Z.md (execution contract: § 4c, tasks, tests, order; QA-enriched)
consumed_by:
  - Developer 08 — Tranche A (T002–T007) this run; Tranches B–E in subsequent /implement runs
next_input:
  - products/paywall-blueprint/site/
scope:
  - PRD-001 Tranche A only (T001–T009); T001 + T008 operator-handled, T009 operator gate
---

## 1. Implementation Scope

PRD-001 Tranche A — **scaffold migration 4a→4b + Stripe SDK install + env-vars**. This is the foundational tranche that adds Next.js API route capability to the existing 4a client-side scaffold so Tranches B–D can land the StripeProvider, the 4 API routes, the webhook handler, and the iframe success-return flow.

**Explicit non-goals for this tranche:**
- No `StripeProvider` implementation (Tranche B)
- No API route handlers (Tranche B)
- No `useEntitlement` hook (Tranche C)
- No webhook handler logic (Tranche B/D)
- No PaywallCheckoutDialog rewire (Tranche C)
- No README / CHANGELOG changes (Tranche E)

**Tranche A success = all 74 existing tests still pass after migration + `stripe` SDK installed + .env.example documented + operator-confirmed real-tenant iframe smoke.**

## 2. Canonical Inputs

- **PRD-minimal:** `products/paywall-blueprint/project-planning/PRD/prd-minimal-001.md`
- **Task breakdown:** `products/paywall-blueprint/project-planning/plans/task-breakdown-20260515T081454Z.md`
- **POC reference:** `products/paywall-blueprint/pocs/poc-v1-prd000/` (UNCHANGED in Tranche A — no UI work this tranche)
- **Slim context chain enforced:** Developer 08 does NOT load full PRD-001, architecture (none — minimal track), or ADR files. The task breakdown's § 4c-2 has the ADR one-liners.

## 3. Target Directory Decision

**Target:** `products/paywall-blueprint/site/`

Container enforcement (per source command § Required behavior): `site/` exists with source files (committed `app/`, `src/`, `components/`, `package.json`). Use existing `site/`. No deviation.

## 4. Planned Delivery Order (Tranche A: T002–T007 sequential; T001/T008/T009 operator)

| Order | Task | Owner | Notes |
|-------|------|-------|-------|
| — | T001 | [OPERATOR] | Surfaced to operator separately; not blocking Tranche A code work. Stripe Tax dashboard decision affects Tranche C smoke (T040), not these tasks. |
| 1 | T002 | Developer 08 | Baseline regression snapshot (lint + typecheck + test + build from current `prd-001` HEAD). Records test count + pre-existing failures. |
| 2 | T003 | Developer 08 | Apply full-stack quickstart in-place over existing 4a scaffold (rule 50-scaffold.mdc — execute literally, HARD STOP on failure). |
| 3 | T004 | Developer 08 | Verify migration regression — same 4 commands as T002 — all green. Test count ≥ 74. |
| 4 | T005 | Developer 08 | `npm install stripe` (latest stable, no manual pin). |
| 5 | T006 | Developer 08 | Capture `stripe` `.d.ts` paths under `site/node_modules/stripe/types/`; inline-edit task breakdown § 4c-6 with the real paths (per architect deferral note). |
| 6 | T007 | Developer 08 | Append 4 Stripe env vars to `site/.env.example`. |
| — | T008 | [OPERATOR — already done] | `.env.local` was populated during the pre-flight 2026-05-15 per `current-run.json` operator_attention "Stripe pre-flight DONE". `STRIPE_WEBHOOK_SIGNING_SECRET` deliberately deferred to Tranche B T029 dev. |
| — | T009 | [OPERATOR — STOP HERE] | Real-tenant iframe smoke. Operator opens Cloud Portal test app, verifies `/` + `/full-page` render identically to PRD-000, captures 2 screenshots. Gate decision pass / pass_with_caveats. |

## 5. Verification Checklist

After Developer 08 reports back:

- [ ] T002 baseline note recorded (test count + green confirmation)
- [ ] T003 scaffold migration applied; git diff shows ONLY additive changes to existing surfaces (`app/page.tsx`, `app/full-page/page.tsx`, `src/lib/paywall/**`, `components/**` untouched)
- [ ] T004 lint + typecheck + test + build all green; test count ≥ baseline
- [ ] T005 `stripe` present in `site/package.json` dependencies
- [ ] T006 task breakdown § 4c-6 updated with real `.d.ts` paths
- [ ] T007 `site/.env.example` shows 4 new Stripe env vars after Supabase block
- [ ] HARD STOP per source command § 9 NOT triggered (lint passes, build passes, no rogue untracked files)
- [ ] T008 verification: `site/.env.local` contains `STRIPE_PRICE_ID`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (gitignored — verify presence, do NOT echo values)
- [ ] T009 operator gate presented to user with explicit YES/NO smoke verification ask

## 6. Risks To Watch During Implementation

- **R1 — Scaffold migration overwrites existing PRD-000 files.** The full-stack quickstart may try to write `next.config.mjs`, `app/layout.tsx`, etc. If overwriting an existing file with diverging content, HARD STOP and report (rule 50-scaffold.mdc). Don't accept silent overwrites.
- **R2 — Existing 74 tests regress on 4b.** If any pre-existing tests fail after the migration but not before, the migration broke an iframe pathway. Diagnose before T005.
- **R3 — Next.js / shadcn registry version drift.** The full-stack quickstart pins versions in `package.json`; if the registry pins differ from the existing 4a installation, expect TS / runtime errors. Resolution: accept the registry's pins (they are current) and fix any consumer code that breaks.
- **R4 — `stripe` SDK is type-only-strict.** Capture `.d.ts` paths in T006 BEFORE Tranche B writes any consumer code so Tranche B's RED tests fixture against real types.

## 7. Completion Criteria (Tranche A)

- All 6 Developer-owned tasks (T002–T007) green
- `site/.env.example` has 4 new Stripe entries
- Task breakdown § 4c-6 carries real `.d.ts` paths
- Pre-completion gate (lint + build + git-status) passes
- Operator confirms T009 real-tenant iframe smoke before Tranche B can begin

## 8. What Needs To Be Tested (global testing runbook — Tranche A scope)

Tranche A introduces **no new production code** — only a scaffold migration + dependency install + env-var documentation. Therefore Tranche A has **no new tests**; the test contract is:

- **Regression:** All 74 existing tests from PRD-000 MUST continue to pass on the migrated 4b scaffold. Zero new failures. Zero new flakes. (T002 baseline → T004 post-migration comparison.)
- **Build:** `npm run build` succeeds on the migrated scaffold. Strict TS compiles. Tranche A's specific risk is config drift from the quickstart pulling newer pinned versions.
- **Lint:** `npm run lint` green; pre-existing baseline (if any) tolerated when recorded.
- **DCE grep (PRD-000 NFR-5):** `npm run test:dce` already exists; should still pass on 4b (verified at Tranche D T043, but worth a sanity run after Tranche A migration too).

New tests for Tranches B–D land per § 10 of the QA-enriched task breakdown. `/test` invocation against Tranche A alone has nothing to assert beyond the regression baseline.

**Test commands:**
- `cd site && npm install` (one-time after T003)
- `cd site && npm run lint`
- `cd site && npm run typecheck`
- `cd site && npm run test`
- `cd site && npm run build`

## Handoff Metadata
- Canonical run manifest: `project-planning/workflow/current-run.json` (status: `qa_ready` → `implementing` → `implemented_tranche_a` after T002–T007)
- Implementation target directory: `products/paywall-blueprint/site/`
- Recommended next command: `/implement` again for Tranche B (T010–T029) AFTER operator gate T009 passes
- Recommended next input file: `products/paywall-blueprint/project-planning/plans/task-breakdown-20260515T081454Z.md` (Tranche B tasks)
