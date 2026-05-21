# Implementation Runbook

---
document_type: implementation_runbook
artifact_name: implementation-runbook-20260513T093404Z.md
generated_at: 2026-05-13T19:00:00Z
run_manifest: project-planning/workflow/run-20260513T093404Z.json
source_inputs:
  - products/paywall-blueprint/project-planning/PRD/prd-minimal-000.md
  - products/paywall-blueprint/project-planning/plans/task-breakdown-20260513T093404Z.md
consumed_by:
  - Engineering Team (Developer 08)
next_input:
  - products/paywall-blueprint/site/
---

## 1. Implementation Scope

Build PRD-000 ("Paywall Blueprint foundation tranche") of the paywall-blueprint product across **5 execution tranches** A → B → C → D → E with hard operator gates between each. Total: **56 tasks** (T001–T056) + 11 ADRs (0001–0011) + 1 winning UI variant ("Stock Blok").

**This `/implement` run is scoped to Tranche A only** (T001–T012):

- Scaffold the Marketplace client-side Next.js app via `sitecore:setup-marketplace-client-side`.
- Apply scaffold lint fixes (typo, apostrophe).
- Install Vitest test stack + Blok composite components (topbar).
- Add Chrome Local Network Access headers to `next.config.mjs`.
- Register custom app in Cloud Portal (OPERATOR action — T007).
- Map extension points to routes in the manifest.
- Build the single-page layout shell with TOP free section + BOTTOM gated section. Gated section is hardcoded to render an "allowed" placeholder welcome (no `<PaywallGate>`, no `application.context` read, no `EntitlementStore`).
- Test the layout shell (TDD: T010a RED → T009 GREEN → T010b verify).
- Verify lint + build pass.
- **Tranche A operator gate (T012):** real-tenant iframe install on Sitecore Cloud Portal.

Subsequent `/implement` runs cover Tranches B → C → D → E, each pausing at its own operator gate.

## 2. Canonical Inputs

- `products/paywall-blueprint/project-planning/PRD/prd-minimal-000.md` — slim PRD (already revised for Revision A tenant-only entitlement + Revision B Stripe direct provider).
- `products/paywall-blueprint/project-planning/plans/task-breakdown-20260513T093404Z.md` — enriched task breakdown.
  - **READ § 4 REVISION NOTICE FIRST.** It documents the 2026-05-13 revisions (Revision A: tenant-only entitlement per ADR-0011; Revision B: Stripe direct as v1 provider). Where § 4b / § 9 / § 10 contradict the notice (e.g., the original 4-branch evaluator test list), the revision notice and the revised task descriptions (T016 / T019 / T020a / T021 / T029 / T030) WIN.
- `products/paywall-blueprint/pocs/poc-v1-prd000/` — visual source of truth (open `index.html` for the rendered Stock Blok variant; navigate via the state-picker strip).

**Not loaded:** full PRD, architecture doc, UI design spec (the spec's content is summarized in § 4c-4 of the task breakdown + visible in the POC), individual ADR files (summarized in § 4c-2).

## 3. Target Directory Decision

**Decision:** `products/paywall-blueprint/site/` (default per container-enforcement rule).

**State at run start:** Product root contains `pocs/` and `project-planning/` only — no `site/`, no other implementation folder. Default action: create `site/` (T001 scaffold lands inside it).

No deviation. No `notes.container_deviation` flag needed.

## 4. Planned Delivery Order

Execution sequence for Tranche A (T001 → T012):

| # | Task ID | Title | Type | Operator action? |
|---|---------|-------|------|------|
| 1 | T001 | Run canonical Marketplace client-side scaffold | setup | No |
| 2 | T002 | Apply scaffold lint fixes (typo + apostrophe) | code | No |
| 3 | T003 | Install Vitest test stack | setup | No |
| 4 | T004 | Add PNA headers to `next.config.mjs` | code | No |
| 5 | T005 | Install `@blok/topbar` composite | setup | No |
| 6 | T006 | Document mkcert is NOT needed for Mode A in `site/README.md` | docs | No |
| 7 | T007 | Register custom app in Cloud Portal → App Studio | operator | **YES — operator pauses Developer here** |
| 8 | T008 | Record extension points + route in manifest | manifest | No (depends on T007) |
| 9 | T010a | Write failing layout test (RED) | tdd-test | No |
| 10 | T009 | Build single-page layout shell (FreeSection + hardcoded GatedSection) | code | No |
| 11 | T010b | Verify layout tests pass (GREEN) | tdd-test | No |
| 12 | T011 | Verify Tranche A build + lint pass | gate | No |
| 13 | T012 | Tranche A real-tenant iframe install | operator | **YES — operator pauses pipeline before Tranche B** |

**Note on T009 vs T010a ordering:** T010a (RED test) is authored BEFORE T009 (component) per TDD discipline + Lead Dev's a/b task pairing. T010a depends on T003 (test stack ready), not on T009.

**Parallel groups:** None within Tranche A. Sequential execution.

## 5. Verification Checklist

Pre-completion validation gate (HARD STOP on failure) per source command § 9:

- **Lint:** `npm run lint` in `site/` exits 0 (baseline + post-T002 fix).
- **Build:** `npm run build` in `site/` exits 0. Strict-TS errors fail the gate.
- **Test:** `npm run test` in `site/` exits 0 — layout test from T010a/b passes.
- **Git-status:** `git status --porcelain` from `products/paywall-blueprint/` — no untracked files in `site/` (everything either committed or deliberately gitignored per `.gitignore`).
- **Tranche A operator gate (T012):** real-tenant iframe install — page renders in iframe at SitecoreAI Full Screen extension point; Blok chrome correct; free + premium sections both visible at ≥ 1024×768 without scroll.

## 6. Risks To Watch During Implementation

- **Rule 50-scaffold.mdc HARD STOP:** if `npx shadcn@latest add ...` (T001) fails (network down, registry permission, sandbox restriction), STOP and surface to operator. Do NOT hand-write `package.json`. The Pageshot v2 dogfood-rerun (2026-05-02) lesson — pinned versions drift past the cutoff.
- **`site/next-app/` flatten:** T001 lands the scaffold at `site/next-app/`. The flatten step (`mv site/next-app/* site/next-app/.* site/ && rmdir site/next-app`) is part of T001 and must complete before T002.
- **Vitest tsconfig types:** T003 includes `"vitest/globals"` in `tsconfig.json compilerOptions.types`. Missing this breaks `tsc --noEmit`.
- **PNA headers:** T004 — do NOT combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` (silently rejected by Chrome).
- **mkcert clarification:** T006 documents mkcert is NOT required for Mode A 4a client-side. The PNA headers from T004 + plain HTTP localhost are sufficient. Operator's earlier "mkcert pre-flight" assumption is superseded.
- **T009 hardcoded welcome:** the gated subtree renders a static "Welcome, Christian / Your tenant Hahn Solo Demo has full access." placeholder. NO `useAppContext()` consumption in Tranche A. Tranche B (T023) replaces this with the defensive layered render.

## 7. Completion Criteria

**Tranche A complete when:**

- All Tranche A code lands on the `prd-000` branch and is committed.
- `npm run lint` + `npm run build` + `npm run test` all exit 0 from `site/`.
- The implementation runbook lists Tranche A delivery order under § 4 with actual task outcomes (Developer adds notes).
- T012 operator gate passes — real-tenant iframe install succeeds.

**This run is NOT complete (and does NOT update `status: implemented`) until T012 passes** — the manifest stays at `status: implementation_in_progress` between Tranche A code completion and T012 operator confirmation.

## 8. What Needs To Be Tested (global testing runbook)

Per task breakdown § 9 (TDD contract) + § 10 (test specs) + § 4b (test scenarios per epic). Tranche A scope:

- **Unit / UI / component tests:**
  - Layout renders both sections (T010a): `page.test.tsx` asserts topbar label, free section headline, hardcoded welcome text, and both badge labels.
- **Build tests:** `npm run lint` exits 0 (T002/T011); `npm run test` exits 0 with baseline empty run (T003).
- **Manual / operator-action smoke:** Tranche A iframe install (T012) — real Sitecore Cloud Portal install + Blok chrome visual check + 1024×768 viewport scroll-free.

Test commands (per task breakdown § 4c-3):

- Lint: `npm run lint` from `site/`
- Test: `npm run test` from `site/` (vitest)
- Build: `npm run build` from `site/`
- Typecheck: `npx tsc --noEmit` from `site/`

Subsequent tranches add more tests; the per-task test spec is in § 4b + § 10 of the task breakdown.

## Handoff Metadata

- **Canonical run manifest:** `products/paywall-blueprint/project-planning/workflow/run-20260513T093404Z.json`
- **Implementation target directory:** `products/paywall-blueprint/site/`
- **Recommended next command (after T012 operator confirms):** `/implement` again for Tranche B (T013–T026), then continue tranche-by-tranche through E.
- **Recommended next input file:** `products/paywall-blueprint/site/app/page.tsx` (the single-page layout shell — Tranche A's primary code surface).
