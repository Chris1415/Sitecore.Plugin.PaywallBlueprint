# Development Execution Plan — Paywall Blueprint PRD-000

---
document_type: task_breakdown
artifact_name: task-breakdown-20260513T093404Z.md
generated_at: 2026-05-13T09:34:04Z
run_manifest: project-planning/workflow/run-20260513T093404Z.json
source_inputs:
  - project-planning/PRD/prd-000.md
  - project-planning/PRD/prd-minimal-000.md
  - project-planning/architecture/architecture-20260513T093404Z.md
  - project-planning/ADR/adr-0001-use-adrs-as-architecture-backbone.md
  - project-planning/ADR/adr-0002-entitlement-store-interface-split.md
  - project-planning/ADR/adr-0003-payment-provider-adapter-placeholder.md
  - project-planning/ADR/adr-0004-env-flag-signaled-passthrough.md
  - project-planning/ADR/adr-0005-scaffold-architecture-4a-client-side.md
  - project-planning/ADR/adr-0006-custom-app-registration.md
  - project-planning/ADR/adr-0007-single-generic-skeleton.md
  - project-planning/ADR/adr-0008-context-readiness-via-provider-resolution.md
  - project-planning/ADR/adr-0009-supabase-rls-permissive-default.md
  - project-planning/ADR/adr-0010-supabase-setup-via-sql-block.md
  - project-planning/ui-design/ui-design-20260513T093404Z-v1.md
  - pocs/poc-v1-prd000/click-targets.md
consumed_by:
  - QA Specialist (07) enriches this file; Developer (08) implements from this file + prd-minimal only
next_input:
  - project-planning/plans/qa-report.md (optional; QA may inline § 9 + § 10 here)
---

## 1. Implementation Overview

PRD-000 ships the **foundation tranche** of the Paywall Blueprint — a public OSS reference Sitecore Marketplace App on the `xmc:fullscreen` extension point. The deliverable is a single Next.js (App Router) application installed as a **custom Cloud Portal Marketplace app** that demonstrates a freemium paywall pattern end-to-end:

- A single-page layout with a **free section** (always rendered) above a **gated section** (wrapped by `<PaywallGate>`).
- A **`<PaywallGate>`** React component that resolves to one of **four UX states** (`allowed`, `tenant_no_subscription`, `tenant_active_seats_full`, `tenant_active_user_unassigned`) by reading `application.context` from the Marketplace SDK and calling an `EntitlementStore`.
- A **`SupabaseStore` adapter** implementing the `EntitlementStore` + `EntitlementSeed` interfaces against a 3-table Supabase Postgres schema.
- A **state-switcher CLI** (`pnpm seed:state <state>`) for flipping between states during smoke testing.
- An **env-flag toggle** (`NEXT_PUBLIC_PAYWALL_ENABLED`) with a locked **demo-mode banner** + a **compile-time-guarded dev override** (`PAYWALL_DEV_OVERRIDE_USER_ID`).
- An **OSS launch surface** — README, CHANGELOG, smoke walkthrough, cold-read notes, public GitHub repo flip.

Execution is gated by **5 operator tranches** (A → B → C → D → E) with hard real-tenant checkpoints between each. Tranche C is the **CHALLENGE GATE** — a scored rubric on the four UX states before integration with env-flag + OSS surface. Tranche E's final task — flipping the GitHub repo from private to public — is the **ship moment**.

The Developer (08) implements this plan using **only** prd-minimal-000.md + this file. § 4c is the single self-contained implementation contract — Developer does not open architecture, ADR, or UI files in normal flow.

## 2. Epics

| Epic | Tranche | Description |
|------|---------|-------------|
| **E1 — Scaffold + visual shell** | A | Run canonical Marketplace client-side scaffold; register custom app in Cloud Portal; configure Blok + mkcert; build single-page layout with hardcoded "allowed" welcome (no real gate yet). |
| **E2 — Store + context read** | B | Run OA-1 probe + capture `application.context` fixture; verify SDK `.d.ts`; stand up Supabase + schema; implement `EntitlementStore` / `EntitlementSeed` interfaces + `SupabaseStore` adapter + `seed-state.ts` CLI; wire post-gate welcome to read `application.context` with defensive layered render. |
| **E3 — `<PaywallGate>` + 4 UX states (CHALLENGE GATE)** | C | Build `<PaywallGate>` component (FR-1 step-by-step); single generic skeleton; four UX state components; React error boundary; integrate gate into single-page layout. Scored rubric on real tenant. |
| **E4 — Env-flag + dev override** | D | Implement `NEXT_PUBLIC_PAYWALL_ENABLED` + demo-mode banner; implement compile-time-guarded `PAYWALL_DEV_OVERRIDE_USER_ID`; verify post-build grep returns zero matches. |
| **E5 — OSS launch surface** | E | README with adoption guide; CHANGELOG; smoke-walkthrough.md with screenshots; cold-read-notes.md; license + CONTRIBUTING stub; flip GitHub repo to public. |

## 3. Feature Breakdown

Each epic maps to a tranche from PRD § 12. Tranches are executed strictly sequentially with operator gates between. Within a tranche, tasks follow dependency arrows.

- **E1 (Tranche A):** T001 → T012 — scaffold, Cloud Portal registration, Blok install, mkcert, layout, Tranche A gate.
- **E2 (Tranche B):** T013 → T026 — OA-1 probe, `.d.ts` verification, Supabase setup, interfaces, adapter, CLI, post-gate welcome wiring, Tranche B gate.
- **E3 (Tranche C):** T027 → T039 — `<PaywallGate>`, skeleton, four state components, error boundary, integration, CHALLENGE GATE.
- **E4 (Tranche D):** T040 → T046 — env-flag, dev override, post-build verification, Tranche D gate.
- **E5 (Tranche E):** T047 → T056 — README, CHANGELOG, smoke walkthrough, cold-read, license, CONTRIBUTING, repo public-flip ship moment.

## 4. Task Breakdown

> Each task carries Task ID, Title, Description, Expected Output, and Depends on. **Test tasks** are inline with default test-after ordering; QA Specialist (07) may restructure to test-first where TDD applies and will populate § 9 + § 10.

---

### REVISION NOTICE — 2026-05-13 (post-QA, pre-implement)

Two scope revisions landed after the initial task breakdown was written. Tasks below carry their original IDs and structure — read these revisions IN CONJUNCTION when implementing:

**Revision A — Tenant-only entitlement (ADR-0011).** Per-user seat enforcement is deferred to PRD-002. PRD-000's `SupabaseStore.getEntitlement` consults the `tenants` table only and returns `allowed | tenant_no_subscription`. The `seats` table is REMOVED from PRD-000 schema (T016). The 4 UX state components ALL still ship in PRD-000 — but `SeatsFullState` (T029) and `UserUnassignedState` (T030) are **design-reference components** reachable only via direct render (`pnpm seed:state seats-full | unassigned`), NOT via the entitlement evaluator. Affected tasks: **T016** (2-table schema), **T017** (interface comments — types remain 4-variant for forward-compat), **T019** (2-branch evaluator, ignore `userId` param), **T020a** (2 happy paths + error, not 4), **T021** (state-switcher CLI supports `allowed | no-sub` via evaluator + `seats-full | unassigned` via direct render), **T029 + T030** (descriptions: design-reference only), **T037a** (component tests stay; gate-evaluator tests narrow to 2 live + skeleton + throw), **T039** (challenge gate rubric per PRD § 12 — 2 live + 2 design-ref + error boundary).

**Revision B — Stripe direct as v1 provider (ADR-0003 revised).** Provider switched from Lemon Squeezy to Stripe direct (Stripe Billing + Entitlements API + Customer Portal) after operator research at `storage/paywall-providers-research-2026-05-13.md`. PRD-000 itself has NO real provider — only the type-only `PaymentProvider` placeholder. Affected tasks: **T017** (placeholder comment now mentions Stripe as PRD-001 implementation), **T047 README** (provider name in README quickstart + adoption guide). Stripe Customer Portal makes PRD-003 a one-API-call surface (post-PRD-000 — out of scope here). The `processed_events` table is named generically (Stripe `event.id` PK with unique-on-conflict idempotency per research § 8.3); replaces the originally-named `purchase_events`.

---

### Tranche A — Scaffold + visual shell

---

#### T001 — Run canonical Marketplace client-side scaffold

- **Description:** Inside `products/paywall-blueprint/`, run the canonical non-interactive Marketplace client-side scaffold targeting a `site/` folder. Command (literal, per `sitecore:setup-marketplace-client-side`):

  ```bash
  cd products/paywall-blueprint
  mkdir -p site
  yes '' | npx --yes shadcn@latest add https://blok.sitecore.com/r/marketplace/next/quickstart-with-client-side-xmc.json --yes --cwd site
  ```

  The scaffold lands in `site/next-app/`. Flatten immediately:

  ```bash
  mv site/next-app/* site/next-app/.* site/ 2>/dev/null
  rmdir site/next-app
  ```

  Verify `site/package.json` exists at the top level and `site/next-app/` no longer exists. Do NOT hand-write `package.json` or `next.config.mjs` — they come from the scaffold. If the scaffold fails, HARD STOP and report (per rule `50-scaffold.mdc`).
- **Expected Output:** `site/package.json`, `site/app/layout.tsx`, `site/app/page.tsx`, `site/components/providers/marketplace.tsx`, `site/components/examples/`, `site/components/ui/` all present at the flattened root. `npm install` has run automatically; `site/package-lock.json` exists.
- **Depends on:** none

#### T002 — Apply scaffold lint fixes (P-019 typo + apostrophe)

- **Description:** The scaffolded `site/components/providers/marketplace.tsx` ships with two errors that make `npm run lint` fail: (a) typo `extention` → `extension`; (b) unescaped apostrophe `your app's` → `your app&apos;s` (or change to double-quoted string). Apply both. Then run `npm run lint` from `site/` to confirm zero errors.
- **Expected Output:** `npm run lint` exits 0 from `site/`.
- **Depends on:** T001

#### T003 — Install Vitest test stack

- **Description:** From `site/`, install the test stack (the quickstart does not ship a runner):

  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
  ```

  Copy the templates from the scaffold's documented locations: `assets/test-stack/vitest.config.ts` → `site/vitest.config.ts`; `assets/test-stack/vitest.setup.ts` → `site/vitest.setup.ts`. Add `"test": "vitest run"` + `"test:watch": "vitest"` scripts to `site/package.json`. Patch `site/tsconfig.json` to include `"vitest/globals"` in `compilerOptions.types` (non-optional — without it `tsc --noEmit` fails on every test file).
- **Expected Output:** `npm run test` exits 0 (no tests yet — empty run) from `site/`. `tsc --noEmit` exits 0.
- **Depends on:** T002

#### T004 — Add Chrome Local Network Access headers to `next.config.mjs`

- **Description:** Copy the drop-in `next.config.mjs` from the scaffold's `assets/next-config-pna-headers.mjs` into `site/next.config.mjs` (merging with any existing config). The headers block must include `Access-Control-Allow-Private-Network: true`. Do NOT combine `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` (browser silently rejects). HTTPS is NOT needed for this 4a client-side scaffold — HTTP on localhost is fine.
- **Expected Output:** `site/next.config.mjs` contains the four-header PNA block. `npm run dev` from `site/` starts on `http://localhost:3000` and responds to the iframe-embed handshake.
- **Depends on:** T002

#### T005 — Install Blok composite components missing from quickstart

- **Description:** The quickstart installs the following primitives only: `alert`, `badge`, `button`, `card`, `collapsible`, `separator`, `skeleton`. The design needs additional Blok components. Register the `@blok` registry first if absent — edit `site/components.json` to add:

  ```json
  "registries": {
    "@blok": "https://blok.sitecore.com/r/{name}.json"
  }
  ```

  Then install:

  ```bash
  cd site
  npx shadcn@latest add @blok/topbar
  ```

  Run `ls site/components/ui/empty-states.tsx` — if missing, install `@blok/empty-states`; if both registry forms fail, leave it (the error fallback at T034 composes from `@blok/card` primitives instead).
- **Expected Output:** `site/components/ui/topbar.tsx` exists. Either `site/components/ui/empty-states.tsx` exists OR a clear note is added to `site/components/error-boundary.tsx` (created in T034) that compose-from-card path applies.
- **Depends on:** T002

#### T006 — Pre-flight mkcert install (optional for this scaffold; documented for completeness)

- **Description:** Per `sitecore:marketplace-sdk-testing-debug` § 3, mkcert is NOT required for Mode A 4a client-side apps (HTTP localhost is fine and portal-brokered auth has no app-origin cookies). Document this in `site/README.md` under "Local development": "This is a Mode A 4a client-side scaffold — HTTP localhost is supported. No mkcert / no HTTPS dev server required." Do NOT install mkcert in this task (saves operator time). NOTE: this contradicts the kickoff brief's instruction to mkcert-preflight; the PNA headers from T004 are the correct mechanism for this scaffold per `marketplace-sdk-testing-debug` § 3.
- **Expected Output:** README section "Local development" notes HTTP-on-localhost is the supported mode and references the PNA headers from T004. Operator can run `npm run dev` from `site/` and confirm the dev server starts on `http://localhost:3000`.
- **Depends on:** T004

#### T007 — Register custom app in Cloud Portal → App Studio

- **Description:** Operator action (Lead Developer documents the values; operator performs the click). Open Cloud Portal → App Studio → Register new app. Use the values from § 4c-6 Cloud Portal registration table (App name `Paywall Blueprint (Test)`, App URL `https://localhost:3000`, Extension points `xmc:fullscreen` only, Route URL `/`, API access minimal — `application.context` read only, Authorization type Portal-brokered, App type Custom). Capture the resulting App ID; record in `site/.env.example` under `# Cloud Portal app ID (for reference)` (comment only, not consumed by code).
- **Expected Output:** Custom app registered. App URL `https://localhost:3000` accepted. Operator confirms the test app appears in the Cloud Portal Apps section.
- **Depends on:** T004

#### T008 — Map extension points to routes

- **Description:** Per `sitecore:marketplace-sdk-extension-routes`, confirm `xmc:fullscreen` maps to route `/` (single-page; consumes the root scaffold landing). No multi-route Dashboard widget. Update the run manifest's `architecture.extension_points`:

  ```json
  { "extension_points": [{ "type": "xmc:fullscreen", "route": "/", "displayLabel": "Full screen — SitecoreAI" }] }
  ```

  No additional route files needed beyond the scaffolded `site/app/page.tsx`.
- **Expected Output:** Run manifest's `architecture.extension_points` updated. `site/app/page.tsx` confirmed as the single iframe route.
- **Depends on:** T007

#### T009 — Build single-page layout shell (FreeSection + hardcoded Gated welcome)

- **Description:** Edit `site/app/page.tsx` to compose the single-page freemium layout per UI spec § 3.1 / POC `pocs/poc-v1-prd000/state-allowed.html`. Render:

  1. `<Topbar>` at top — label `"Paywall Blueprint"`, no nav links, no user menu.
  2. Centered content column — `max-w-[880px] mx-auto px-6 pt-6 pb-8`.
  3. `<FreeSection />` (new component at `site/components/free-section.tsx`) — `@blok/card` body with `@blok/badge variant="secondary"` `"Free"` eyebrow, headline `"Inventory at a glance"`, body paragraph (locked copy from § 4c-4), and a `@blok/button variant="secondary"` mock `"View placeholder report"` with `aria-label="Placeholder action — does nothing"` and Lucide `BarChart3` icon. Click is a no-op.
  4. `@blok/separator` with `mt-6` gap above and below.
  5. `<GatedSection>` (new component at `site/components/gated-section.tsx`) — `@blok/card` with `@blok/badge variant="default"` `"Premium"` eyebrow + hardcoded "allowed" welcome rendering (literal copy `"Welcome, there"` + body `"Your tenant has full access. Replace this card with your gated feature."` + Lucide `CircleCheck` icon at `text-primary`).

  Use Blok semantic tokens only — `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`. No hex values. Card elevation `shadow-sm` only. No `<PaywallGate>` yet — gated content is hardcoded.

- **Expected Output:** `site/app/page.tsx`, `site/components/free-section.tsx`, `site/components/gated-section.tsx` exist. `npm run dev` from `site/` shows the rendered layout at `http://localhost:3000` with both sections visible without scrolling at 1024×768.
- **Depends on:** T003, T005, T010a [TDD: failing test written first — T010a MUST precede this implementation task]

#### T010a — Write failing layout test (RED — before T009 impl) [TDD]

- **Description:** Add `site/app/page.test.tsx` BEFORE implementing the full layout in T009. The test file is added after T003 (Vitest stack) and T005 (Blok components). Mock `MarketplaceProvider` to return a dummy non-null context. Assert: (a) text `"Paywall Blueprint"` in document (topbar), (b) text `"Inventory at a glance"` (free section headline), (c) text `"Welcome, there"` (hardcoded gated welcome), (d) both `"Free"` and `"Premium"` badge strings present. The test MUST fail until T009 is implemented (RED phase). Do not implement the page logic in this task.
- **Expected Output:** `site/app/page.test.tsx` exists. Running `npm run test` shows this test failing (cannot find elements yet — page component is still the scaffold skeleton). That failure IS the expected output of this task.
- **Depends on:** T003, T005

#### T010b — Verify layout tests pass post-impl (GREEN — after T009)

- **Description:** After T009 implements the full page layout, re-run `npm run test` and confirm T010a's tests now pass. If any assertion fails, fix the layout (not the test) until all four assertions are green.
- **Expected Output:** `npm run test` from `site/` passes — T010a's tests are green.
- **Depends on:** T010a, T009

#### T011 — Verify build passes for Tranche A baseline

- **Description:** From `site/`, run `npm run typecheck && npm run lint && npm run build && npm run test`. All four must exit 0. If any fail, fix the offending tasks and re-run before claiming the Tranche A gate. The `next build` output (`site/.next/`) must be present.
- **Expected Output:** All four commands exit 0. `site/.next/` directory contains the build output.
- **Depends on:** T010b

#### T012 — Tranche A operator gate: real-tenant iframe install

- **Description:** Operator action. Per PRD § 12 Tranche A gate criteria:
  - App installs on the registered Sitecore tenant.
  - Page renders inside the SitecoreAI Full Screen iframe.
  - Blok chrome looks correct (colors, spacing, typography match Blok variants).
  - Free and premium sections both visible on one screen without scrolling at ≥ 1024×768 effective viewport.

  Capture screenshot evidence to `products/paywall-blueprint/project-planning/gate-evidence/tranche-a-iframe-render.png`. Record outcome in the run manifest's `tranche_gates.A`: `{ status: "passed" | "failed", evidence: "...", notes: "..." }`.
- **Expected Output:** Screenshot committed. Manifest updated. If failed: loop back to the offending Tranche A task and re-iterate.
- **Depends on:** T011

---

### Tranche B — Store + `application.context` read

---

#### T013 — OA-1: Operator runs 5-minute `application.context` probe

- **Description:** Operator action (PRD § 14 OA-1). With the test app installed (T012 passed), open it in the iframe and add a temporary `console.log(JSON.stringify(applicationContext, null, 2))` in `site/components/providers/marketplace.tsx` (after the existing `client.query('application.context')` call). Open browser DevTools → Console. Copy the full JSON output. Capture the JSON to `products/paywall-blueprint/project-planning/architecture/sdk-fixtures/application-context.json`. Capture a screenshot of the DevTools output to the same folder as `application-context-probe.png`. Then REMOVE the temporary `console.log` before commit.
- **Expected Output:** Fixture file `project-planning/architecture/sdk-fixtures/application-context.json` exists with the real captured shape. Screenshot exists alongside. Marketplace provider has no leftover `console.log`.
- **Depends on:** T012

#### T014 — Pre-Tranche-B SDK `.d.ts` verification gate

- **Description:** Per architecture § 10 "Pre-Tranche B verification gate". With `node_modules` populated post-scaffold, open `site/node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts` (or the equivalent `.d.ts` file under `dist/`) and locate the `ApplicationContext` type. Compare against the assumed shape in architecture § 5.4 (`context.user.{id,name,email}`, `context.tenant.{id,name}`, `resourceAccess[]`). Compare against the OA-1 captured fixture (T013). Record findings in `project-planning/architecture/sdk-fixtures/application-context-dts-verification.md`: (a) the declared type's full quoted path (e.g. `node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext`), (b) any field-name divergences between `.d.ts` / fixture / architecture, (c) the FINAL accessor chain to be used by `AllowedState.tsx` in T032.

  **Inline citation requirement (per rule `40-sdk-contracts.mdc`):** The final accessor chain MUST cite the `.d.ts` path inline as a code comment in T032's source.
- **Expected Output:** `application-context-dts-verification.md` committed. Final accessor chain documented. If divergences found between assumed shape and `.d.ts`, the T032 AllowedState implementation uses the `.d.ts`-declared paths, not the architecture's assumed paths.
- **Depends on:** T013

#### T015 — Stand up Supabase project + capture credentials

- **Description:** Operator action. Create a free Supabase project at supabase.com. From the project dashboard, capture: Project URL, anon (public) key, service-role key. Add to `site/.env.local` (do NOT commit; .env.local is gitignored):

  ```bash
  NEXT_PUBLIC_SUPABASE_URL=<from dashboard>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<from dashboard>
  SUPABASE_SERVICE_ROLE_KEY=<from dashboard>
  OPERATOR_TENANT_ID=<from OA-1 fixture — context.tenant.id or resourceAccess[0].tenantId>
  OPERATOR_USER_ID=<from OA-1 fixture — context.user.id>
  ```

  Update `site/.env.example` with documented placeholders (NO real values) for all five variables — see § 4c-6 environment-variable inventory.
- **Expected Output:** `site/.env.local` has real values (gitignored). `site/.env.example` has documented placeholders (committed).
- **Depends on:** T013

#### T016 — Create `supabase/schema.sql` (2-table schema + RLS placeholder policies — REVISED per ADR-0011)

- **Description:** Create `products/paywall-blueprint/site/supabase/schema.sql` with the schema from PRD § 10 (REVISED — 2 tables, not 3) + ADR-0009 RLS posture + ADR-0010 idempotent re-run patterns + ADR-0011 tenant-only entitlement. The file MUST:

  1. Start with a header comment naming the blueprint version + ADR references (0007/0008/0009/0010/0011).
  2. Use `CREATE TABLE IF NOT EXISTS` for both tables.
  3. Use `DROP POLICY IF EXISTS` before each `CREATE POLICY` (idempotent re-runs per ADR-0010).
  4. **Tables (2 only — `seats` removed per ADR-0011):**
     - `tenants(tenant_id TEXT PK, stripe_customer_id TEXT NULL, subscription_id TEXT NULL, plan TEXT NOT NULL DEFAULT 'starter', seats_total INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL CHECK IN ('active','cancelled','past_due'), period_end TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`. Note: `stripe_customer_id` + `subscription_id` are NULL in PRD-000 (populated by PRD-001 webhook); `seats_total` is unused by PRD-000 evaluator but kept for forward-compat.
     - `processed_events(event_id TEXT PK, processed_at TIMESTAMPTZ DEFAULT NOW())`. Empty in PRD-000; provisioned for PRD-001 Stripe webhook idempotency (Stripe `event.id` is unique).
  5. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on both tables.
  6. Policies: `CREATE POLICY "anon_read_tenants" ON tenants FOR SELECT TO anon USING (true);` only. NO anon policy on `processed_events` (service-role only — PRD-001 webhook handler writes via service role). Comment `-- REPLACE BEFORE PRODUCTION` block above the placeholder policy.
  7. Add a header comment block documenting: "The `seats` table lands in PRD-002 (ADR-0011). Do NOT add it to this file pre-PRD-002."
- **Expected Output:** `site/supabase/schema.sql` committed. Operator runs the file in the Supabase SQL editor (manual paste); confirms 2 tables created + RLS enabled. Verify `seats` table is NOT present (`SELECT * FROM seats` returns an error — expected).
- **Depends on:** T015

#### T017 — Implement `EntitlementStore` / `EntitlementSeed` / `EntitlementResult` types

- **Description:** Create `site/src/lib/paywall/types.ts` with the three exports per architecture § 5.2 / ADR-0002 + the `PaymentProvider` type-only placeholder per ADR-0003 (revised: **Stripe direct** as PRD-001 v1 adapter). NOTE: the scaffold has NO `src/` directory by default (Next.js 16 layout uses top-level `app/`, `components/`, `lib/`). Create `site/src/lib/paywall/` as a NEW directory. The portable library lives under `src/lib/paywall/` per PRD § 9 and is consumed by `app/*` as if external — do NOT hoist into `components/`. Add a header comment block flagging `PaymentProvider` as a type-only placeholder ("PRD-000 ships the contract; PRD-001 ships **Stripe direct** as the first implementation — Stripe Billing + Entitlements API + Customer Portal" per ADR-0003 revised). Also add a comment block on `EntitlementResult` flagging that PRD-000 evaluator only returns the first 2 variants (`allowed | tenant_no_subscription`); the seat-related variants are forward-looking per ADR-0011, returned by PRD-002's extended evaluator.

  Exact types from architecture § 5.2:

  ```typescript
  export interface EntitlementStore {
    /**
     * PRD-000 (ADR-0011): consults `tenants` table only. The `userId` parameter is
     * accepted for interface stability across PRDs but IGNORED in PRD-000. PRD-002
     * extends with the seats branch.
     */
    getEntitlement(tenantId: string, userId: string): Promise<EntitlementResult>;
  }
  export interface EntitlementSeed {
    seedTenant(args: { tenantId: string; plan: string; seatsTotal: number; status: 'active' | 'cancelled' | 'past_due'; }): Promise<void>;
    // seedSeat lands in PRD-002 alongside the seats table (ADR-0011). Do NOT
    // implement in PRD-000; the state-switcher CLI's seats-full/unassigned
    // invocations render the components directly without seeding.
    clearState(): Promise<void>;
  }
  export type EntitlementResult =
    // PRD-000 evaluator returns one of:
    | { status: 'allowed' }
    | { status: 'tenant_no_subscription' }
    // Below: forward-compat variants. PRD-000 evaluator NEVER returns these.
    // The state components ship and are rendered via direct invocation by
    // the state-switcher CLI (pnpm seed:state seats-full | unassigned).
    // PRD-002's extended evaluator wires the routing.
    | { status: 'tenant_active_seats_full'; seatsTotal: number }
    | { status: 'tenant_active_user_unassigned' };
  export interface PaymentProvider {
    // v1 implementation: Stripe direct (PRD-001).
    // Surface mirrors the Stripe wiring shape from
    // storage/paywall-providers-research-2026-05-13.md § 8.
    generateCheckoutUrl(args: { tenantId: string; userEmail: string; priceId?: string; returnUrl?: string }): Promise<string>;
    generatePortalUrl(args: { tenantId: string; returnUrl: string }): Promise<string>;
    verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean>;
    parseWebhookPayload(rawBody: string): Promise<{ providerEventId: string; tenantId: string; kind: 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_failed' | 'payment_succeeded'; payload: unknown }>;
  }
  ```
- **Expected Output:** `site/src/lib/paywall/types.ts` exists with all four exports. `tsc --noEmit` exits 0.
- **Depends on:** T003

#### T018 — Install `@supabase/supabase-js`

- **Description:** From `site/`, run `npm install @supabase/supabase-js@latest`. Verify it appears in `site/package.json` `dependencies`.
- **Expected Output:** `site/package.json` includes `@supabase/supabase-js`. `tsc --noEmit` exits 0.
- **Depends on:** T015

#### T019 — Implement `SupabaseStore` adapter (REVISED per ADR-0011 — tenant-only evaluator)

- **Description:** Create `site/src/lib/paywall/stores/SupabaseStore.ts` implementing BOTH `EntitlementStore` AND `EntitlementSeed` per architecture § 5.5 + REVISED per ADR-0011. The class accepts a `SupabaseClient` in its constructor. **`getEntitlement(tenantId, userId)` is a SINGLE tenant-row lookup — the `userId` param is accepted but NOT consulted.** Use `.from('tenants').select('*').eq('tenant_id', tenantId).maybeSingle()`. Return:
  - `{ status: 'tenant_no_subscription' }` if no row OR `tenant.status !== 'active'`
  - `{ status: 'allowed' }` otherwise

  Implement `seedTenant`, `clearState` against the `tenants` table only (NO `seats` table — per ADR-0011). `seedSeat` is NOT in the PRD-000 `EntitlementSeed` interface; it lands in PRD-002 alongside the seats table. Errors propagate as thrown promise rejections (no internal try/catch) — they will be caught by the React error boundary at T034.

  Match the implementation to PRD § 10's revised pseudocode:
  ```typescript
  async getEntitlement(tenantId: string, _userId: string): Promise<EntitlementResult> {
    // _userId accepted for interface stability; NOT consulted in PRD-000 per ADR-0011.
    const { data: tenant } = await this.client
      .from('tenants').select('*').eq('tenant_id', tenantId).maybeSingle();
    if (!tenant || tenant.status !== 'active') {
      return { status: 'tenant_no_subscription' };
    }
    return { status: 'allowed' };
  }
  ```

  Also create `site/src/lib/paywall/stores/index.ts` that re-exports `SupabaseStore` AND exposes a module-level singleton factory:

  ```typescript
  import { createClient } from '@supabase/supabase-js';
  import { SupabaseStore } from './SupabaseStore';
  let _store: SupabaseStore | null = null;
  export function getDefaultStore(): SupabaseStore {
    if (_store) return _store;
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    _store = new SupabaseStore(client);
    return _store;
  }
  ```

  This singleton is what `<PaywallGate>` consumes by default.
- **Expected Output:** `site/src/lib/paywall/stores/SupabaseStore.ts` + `site/src/lib/paywall/stores/index.ts` exist. `tsc --noEmit` exits 0.
- **Depends on:** T017, T018, T020a [TDD: failing tests written first]

#### T020a — Write failing `SupabaseStore.getEntitlement` tests (RED — before T019 impl) [TDD] (REVISED per ADR-0011)

- **Description:** Add `site/src/lib/paywall/stores/SupabaseStore.test.ts` BEFORE implementing `SupabaseStore` (T019). The test file imports the (not-yet-existing) `SupabaseStore` class and defines **three** test cases (REVISED — only 3 branches, not 5, per tenant-only evaluator):
  - Tenant not found (no row) → resolves `{ status: 'tenant_no_subscription' }`.
  - Tenant found but `status !== 'active'` (e.g., `'cancelled'`) → resolves `{ status: 'tenant_no_subscription' }`.
  - Tenant found AND `status === 'active'` → resolves `{ status: 'allowed' }`.
  - Supabase client `.from(...).select(...)` rejects → `getEntitlement` rejects (no internal catch).
  - **REGRESSION GUARD test:** call `getEntitlement('tenant-A', 'user-X')` AND `getEntitlement('tenant-A', 'user-Y')` (different userIds, same tenantId) — both MUST return the SAME result (verifies the `userId` parameter is not consulted, per ADR-0011).

  Use a vi.fn-stubbed `SupabaseClient`. Fixture provenance: shapes sourced from `sitecore:marketplace-sdk-client § 9` skill content pre-scaffold; capture-and-fix against `node_modules/@supabase/supabase-js` `.d.ts` at T018. Each fixture must include inline `// source:` comment. Tests MUST fail (module not found) until T019 is implemented.

  **Fixture citation required:**
  ```typescript
  // source: sitecore:marketplace-sdk-client § 9 stub pattern (pre-scaffold)
  // capture-and-fix: verify SupabaseClient shape vs node_modules/@supabase/supabase-js/dist/... after T018
  ```
- **Expected Output:** `SupabaseStore.test.ts` exists with five failing tests (import error until T019). That failure IS the expected RED output.
- **Depends on:** T017

#### T020b — Verify `SupabaseStore` tests pass post-impl (GREEN — after T019) [TDD]

- **Description:** After T019 implements `SupabaseStore`, re-run `npm run test`. All tests in T020a MUST pass (3 evaluator branches + reject path + userId-not-consulted regression guard). Coverage of the 2-branch decision tree MUST reach ≥ 100%.
- **Expected Output:** All T020a tests passing. Coverage ≥ 100% on `SupabaseStore.getEntitlement` decision tree (2 branches: tenant-active vs not-active).
- **Depends on:** T020a, T019

#### T021 — Implement state-switcher CLI (`scripts/seed-state.ts`) (REVISED per ADR-0011)

- **Description:** Create `site/scripts/seed-state.ts` per architecture § 3.3 and PRD FR-8. The CLI supports TWO categories of states (per ADR-0011 tenant-only evaluator):

  1. Loads env from `.env.local` (use `dotenv` — install if not present in scaffold).
  2. Reads `SUPABASE_SERVICE_ROLE_KEY` (NOT the anon key) + `NEXT_PUBLIC_SUPABASE_URL` + `OPERATOR_TENANT_ID` + `OPERATOR_USER_ID`.
  3. Accepts argv state argument: `allowed | no-sub | seats-full | unassigned`.
  4. Constructs a SupabaseClient with the service-role key (bypasses RLS).
  5. Behavior by state:
     - **`allowed`** (evaluator-reachable): clear + `seedTenant({ tenantId: OPERATOR_TENANT_ID, plan: 'starter', seatsTotal: 1, status: 'active' })`. Operator refreshes app on real tenant → `<PaywallGate>` resolves to `allowed`.
     - **`no-sub`** (evaluator-reachable): clear + `seedTenant({ ..., status: 'cancelled' })` OR `clearState()` only (no row). Operator refreshes → gate resolves to `tenant_no_subscription`.
     - **`seats-full`** (design-reference; not evaluator-reachable): write a sentinel value (e.g. file at `site/.paywall-preview-state`, OR a URL query param `?previewState=seats-full`) that triggers the reference app's "preview-mode" branch to directly render `<SeatsFullState seatsTotal={5} />` without invoking the gate evaluator. Print: `✓ State applied: seats-full (design-reference render; evaluator NOT invoked per ADR-0011)`.
     - **`unassigned`** (design-reference; not evaluator-reachable): same sentinel mechanism — directly renders `<UserUnassignedState />`. Print: `✓ State applied: unassigned (design-reference render; evaluator NOT invoked per ADR-0011)`.
  6. The sentinel mechanism choice (filesystem vs URL query param) is the Developer's call — recommendation: URL query param (`?previewState=seats-full | unassigned`) because it requires zero filesystem state and is naturally per-tab. The reference app's `page.tsx` reads `searchParams.previewState` at the top of `<GatedSection>` and short-circuits to the named component, bypassing `<PaywallGate>` entirely when set. This sentinel is dev-only — production builds should warn-log if `previewState` is present.
  7. Prints success message naming the applied state.

  Add `"seed:state": "tsx scripts/seed-state.ts"` script to `site/package.json`. Install `tsx` as devDependency if not present.
- **Expected Output:** `site/scripts/seed-state.ts` exists. `pnpm seed:state allowed` (or `npm run seed:state -- allowed`) succeeds and prints the success message. Operator can verify rows in Supabase dashboard.
- **Depends on:** T016, T019

#### T022 — Integration test: `seed-state.ts` against test Supabase project

- **Description:** Add `site/scripts/seed-state.test.ts`. Use the real Supabase URL + service-role key from `.env.local` against a test schema. For each of the four states, run `seedState(state, opts)` (extract the core function from `seed-state.ts` so it's importable), then query the Supabase tables directly via the JS SDK and assert the row state matches. Cleanup: call `clearState()` after each test. Skip the test if `.env.local` is absent (use `describe.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)`).
- **Expected Output:** When `.env.local` is present, the integration test passes for all four states. When `.env.local` is absent, the test is skipped (not failed).
- **Depends on:** T021

#### T023 — Wire post-gate welcome to read `application.context` with defensive layered render

- **Description:** Update `site/components/gated-section.tsx` (the hardcoded "allowed" welcome from T009) to consume `useAppContext()` from the scaffold's MarketplaceProvider. Replace the hardcoded copy with the defensive layered render per FR-9 + UI spec § 3.4:

  - **First name (heading):** Priority chain — `context.user.name` first token (split on space, take [0]) → `context.user.email` local part (split on `@`, take [0]) → literal `"there"`.
  - **Tenant name (body):** Priority chain — `context.tenant.name` → `context.tenant.id` last 8 chars (preceded by `"…"`) → literal omission (sentence collapses to `"Your tenant has full access. ..."`).

  Use the **FINAL accessor chain** documented in T014's verification file — if `.d.ts` diverges from the assumed paths, follow `.d.ts`.

  Add **inline `.d.ts` citation** as a code comment per rule `40-sdk-contracts.mdc`:

  ```typescript
  // shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
  // Verified 2026-05-13 against fixture project-planning/architecture/sdk-fixtures/application-context.json
  ```

  The component renders the headline `"Welcome, {firstName}"` and the body `"Your tenant {tenantName} has full access. Replace this card with your gated feature."` Use Lucide `CircleCheck` icon at `text-primary`, 32×32. STILL no `<PaywallGate>` wrapper yet — Tranche B only wires context read on the always-allowed path.
- **Expected Output:** `site/components/gated-section.tsx` updated. Running locally (or in real-tenant iframe) shows the welcome with the operator's actual identity from `application.context`.
- **Depends on:** T014, T009, T024a [TDD: failing defensive-render tests written first]

#### T024a — Write failing defensive-render tests (RED — before T023 impl) [TDD]

- **Description:** Add `site/components/gated-section.test.tsx` BEFORE implementing the defensive layered render in T023. Mock `useAppContext()` via `vi.mock('@/components/providers/marketplace')`. Define four test cases (the fifth — `null` context — is a Tranche C TODO):

  **User identity chain (3 cases per FR-9, PRD § 7 FR-9):**
  - `{ user: { name: 'Christian Hahn' }, tenant: { name: 'Acme Inc.' } }` → asserts `"Welcome, Christian"` + `"Your tenant Acme Inc. has full access."`.
  - `{ user: { email: 'christian.hahn@example.com' }, tenant: { name: 'Acme' } }` → asserts `"Welcome, christian.hahn"`.
  - `{ user: {}, tenant: {} }` → asserts `"Welcome, there"` + body does NOT include `"null"` or `"undefined"`.

  **Tenant identity chain (3 cases per FR-9):**
  - `{ user: {}, tenant: { name: 'Acme Inc.' } }` → asserts tenant name in body.
  - `{ user: {}, tenant: { id: '12345678abcdef9c21' } }` → asserts `"…bcdef9c21"` (last 8 chars); verify exact slice index.
  - `{ user: {}, tenant: {} }` → body contains `"Your tenant has full access."` (generic fallback, no "null").

  Tests MUST fail until T023 implements the defensive render.

  **Fixture source:**
  ```typescript
  // source: sitecore:marketplace-sdk-client § 4 ApplicationContext shape (pre-scaffold assumption)
  // capture-and-fix: update accessor chain per T014 .d.ts verification
  ```
- **Expected Output:** `gated-section.test.tsx` exists with six failing tests (component renders hardcoded copy, not the dynamic chain yet). Failures ARE the expected RED output.
- **Depends on:** T003, T017

#### T024b — Verify defensive-render tests pass post-impl (GREEN — after T023) [TDD]

- **Description:** After T023 implements the defensive layered render, re-run `npm run test`. All six tests in T024a MUST pass. The `null` context case is a TODO comment only (Tranche C handles it with skeleton).
- **Expected Output:** Six tests (4 original + 2 extended tenant chain) passing. Null-context case documented as `// TODO T036a: null-context handled by skeleton in Tranche C`.
- **Depends on:** T024a, T023

#### T025 — Verify Tranche B build + tests

- **Description:** From `site/`, run `npm run typecheck && npm run lint && npm run build && npm run test`. All exit 0.
- **Expected Output:** All four green.
- **Depends on:** T020b, T022, T024b

#### T026 — Tranche B operator gate: real-tenant welcome with actual identity

- **Description:** Operator action. Per PRD § 12 Tranche B gate:
  1. Run `npm run seed:state -- allowed` (or `pnpm seed:state allowed`).
  2. Re-install / refresh the test app in the Sitecore tenant.
  3. Verify the post-gate welcome screen renders with the operator's REAL user identity and tenant identity (sourced from `application.context`).
  4. Capture screenshot to `gate-evidence/tranche-b-context-grounded-welcome.png`.

  Record outcome in run manifest's `tranche_gates.B`. If the rendered names don't match the operator's expected identity, fall back to the layered chain debugging (open browser DevTools, log `applicationContext` again, compare with T013's fixture).
- **Expected Output:** Screenshot committed. Manifest updated. Welcome shows real operator identity.
- **Depends on:** T025

---

### Tranche C — `<PaywallGate>` + 4 UX states (CHALLENGE GATE)

---

#### T037a — Write failing state-component tests (RED — before T027–T031 impl) [TDD]

- **Description:** Add test files for ALL five state components BEFORE implementing any of them. This single "write failing tests" task gates the entire T027–T031 implementation block.

  Create the following five test files (all import not-yet-existing components — tests will fail with import errors, which IS the expected RED state):

  **`site/src/lib/paywall/states/SkeletonState.test.tsx`:**
  - Asserts `role="status"`, `aria-live="polite"`, `aria-label="Loading premium content"` present.

  **`site/src/lib/paywall/states/NoSubscriptionState.test.tsx`** (locked copy per UI spec § 3.5):
  - Asserts headline `"Start your subscription"`.
  - Asserts body `"Your tenant doesn't have an active plan yet. Pick a plan to unlock the premium section."` (verbatim — fail on any character drift).
  - Asserts CTA label `"View plans"`.
  - Asserts `href="https://example.com/buy"`.
  - Asserts `target="_blank"`.
  - Asserts `rel="noopener noreferrer"`.
  - Asserts `aria-label="View plans (opens in new tab)"`.

  **`site/src/lib/paywall/states/SeatsFullState.test.tsx`** (locked copy per UI spec § 3.6):
  - Pass `seatsTotal={5}` prop. Assert headline `"All seats in use"`.
  - Assert sub-line `"5 of 5 seats in use"`.
  - Assert body `"Ask your team admin to reassign a seat, or upgrade your plan for more."` (verbatim).
  - Assert CTA `"Upgrade plan"`, `href="https://example.com/upgrade"`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="Upgrade plan (opens in new tab)"`.
  - Assert NO secondary CTA button (`queryByRole('link', {name: /reassign/i})` is null).

  **`site/src/lib/paywall/states/UserUnassignedState.test.tsx`** (locked copy per UI spec § 3.7):
  - Assert headline `"Ask your team admin"`.
  - Assert body `"Your tenant has a plan, but your team admin hasn't given you a seat yet."` (verbatim).
  - Assert NO link element (`queryByRole('link')` is null — no CTA in PRD-000).

  **`site/src/lib/paywall/states/AllowedState.test.tsx`** (extends T024a; locked copy per UI spec § 3.4):
  - Inherit the user + tenant fallback chain from T024a (move/import shared fixtures).
  - Assert Lucide `CircleCheck` icon present in rendered output (query by `data-testid="circle-check-icon"` OR by accessible name if Lucide emits `aria-hidden`).
  - Assert headline template `"Welcome, Christian"` (with `name: 'Christian Hahn'` mock).
  - Assert body template `"Your tenant Acme Inc. has full access."` (with `tenant: { name: 'Acme Inc.' }` mock).

  All five test files MUST fail until T027–T031 implement the components. That failure IS the expected output.

- **Expected Output:** Five test files exist. `npm run test` shows five suites failing with import errors. No production code created in this task.
- **Depends on:** T017, T024a

#### T027 — Implement `SkeletonState.tsx` (GREEN for T037a-skeleton) [TDD]

- **Description:** Create `site/src/lib/paywall/states/SkeletonState.tsx` per UI spec § 3.3 + ADR-0007. Single generic skeleton sized to absorb the largest resolved state (`tenant_active_seats_full` with two CTAs). Compose using `@blok/skeleton`:
  - Badge placeholder — width 56px, height 22px.
  - Icon placeholder — width 32px, height 32px, `rounded-full`.
  - Headline placeholder — width 240px, height 24px.
  - Body placeholders — two lines, full width and 80% width, height 16px each.
  - Primary CTA placeholder — width 160px, height 36px, `rounded-md`.
  - Secondary CTA placeholder — width 140px, height 36px, `rounded-md`.

  Wrap in `role="status" aria-live="polite" aria-label="Loading premium content"`. Same vertical rhythm (gap-3 / gap-4 / gap-6 from Blok scale) as resolved states.
- **Expected Output:** `site/src/lib/paywall/states/SkeletonState.tsx` exists. T037a's `SkeletonState.test.tsx` passes.
- **Depends on:** T037a, T017, T005

#### T028 — Implement `NoSubscriptionState.tsx`

- **Description:** Create `site/src/lib/paywall/states/NoSubscriptionState.tsx` per UI spec § 3.5 + § 8 locked copy. `@blok/badge` `"Premium"` eyebrow + Lucide `CircleAlert` icon at `text-muted-foreground` (32×32) + headline `"Start your subscription"` (`text-xl font-semibold tracking-tight text-foreground`) + body `"Your tenant doesn't have an active plan yet. Pick a plan to unlock the premium section."` (`text-sm text-muted-foreground leading-relaxed`) + primary CTA `@blok/button variant="default"` labeled `"View plans"` with `href="https://example.com/buy"`, `target="_blank" rel="noopener noreferrer"`, `aria-label="View plans (opens in new tab)"`, trailing Lucide `ExternalLink` icon (14×14, inherits `currentColor`).
- **Expected Output:** Component exists. T037a's `NoSubscriptionState.test.tsx` passes.
- **Depends on:** T037a, T017, T005

#### T029 — Implement `SeatsFullState.tsx` (DESIGN-REFERENCE per ADR-0011) (GREEN for T037a-seats-full) [TDD]

- **Description:** Create `site/src/lib/paywall/states/SeatsFullState.tsx` per UI spec § 3.6 + § 8. **DESIGN-REFERENCE COMPONENT per ADR-0011** — fully built, locked-copy-tested, accessibility-compliant, but NOT reachable from the PRD-000 evaluator. PRD-002 wires it into the extended evaluator. The component is rendered only via the state-switcher CLI's direct-render path (`pnpm seed:state seats-full`). Props: `{ seatsTotal: number }` (matches `EntitlementResult` `tenant_active_seats_full` variant — preserved in the type for PRD-002 forward-compat). `@blok/badge` `"Premium"` eyebrow + Lucide `Users` icon at `text-muted-foreground` + headline `"All seats in use"` + sub-line `"{seatsTotal} of {seatsTotal} seats in use"` (`text-sm font-medium text-foreground`) + body `"Ask your team admin to reassign a seat, or upgrade your plan for more."` + primary CTA `@blok/button variant="default"` labeled `"Upgrade plan"` with `href="https://example.com/upgrade"`, `target="_blank" rel="noopener noreferrer"`, `aria-label="Upgrade plan (opens in new tab)"`, trailing Lucide `ExternalLink` icon. NO secondary CTA (admin reassignment is text-only per UI spec).
- **Expected Output:** Component exists. T037a's `SeatsFullState.test.tsx` passes. Counter interpolates `seatsTotal` correctly. Component is NOT imported by `PaywallGate.tsx`'s evaluator switch (PRD-000) — it is imported by the state-switcher CLI's direct-render path only.
- **Depends on:** T037a, T017, T005

#### T030 — Implement `UserUnassignedState.tsx` (DESIGN-REFERENCE per ADR-0011)

- **Description:** Create `site/src/lib/paywall/states/UserUnassignedState.tsx` per UI spec § 3.7. **DESIGN-REFERENCE COMPONENT per ADR-0011** — fully built, locked-copy-tested, accessibility-compliant, but NOT reachable from the PRD-000 evaluator. PRD-002 wires it into the extended evaluator. The component is rendered only via the state-switcher CLI's direct-render path (`pnpm seed:state unassigned`). `@blok/badge` `"Premium"` eyebrow + Lucide `UserPlus` icon at `text-muted-foreground` + headline `"Ask your team admin"` + body `"Your tenant has a plan, but your team admin hasn't given you a seat yet."` NO CTA in PRD-000 (deliberate per PRD US-3 — no disabled buttons).
- **Expected Output:** Component exists. T037a's `UserUnassignedState.test.tsx` passes. Component is NOT imported by `PaywallGate.tsx`'s evaluator switch (PRD-000) — it is imported by the state-switcher CLI's direct-render path only.
- **Depends on:** T037a, T017, T005

#### T031 — Refactor existing welcome into `AllowedState.tsx` (GREEN for T037a-allowed) [TDD]

- **Description:** Extract the post-gate welcome logic from `site/components/gated-section.tsx` (T023) into `site/src/lib/paywall/states/AllowedState.tsx` so all four state components live in the same folder. Component receives no props (it reads `useAppContext()` directly). Preserve the defensive layered render from T023 (same accessor chain, same `.d.ts` citation comment). Update `gated-section.tsx` to delegate to `<AllowedState />` for the always-rendered case in Tranche C's pre-integration commit; the integration with `<PaywallGate>` happens in T035.
- **Expected Output:** `site/src/lib/paywall/states/AllowedState.tsx` exists. `gated-section.tsx` renders `<AllowedState />` (still no gate yet). T037a's `AllowedState.test.tsx` passes. T024b's existing tests continue to pass (test file moved/updated to new location).
- **Depends on:** T037a, T023, T017

#### T032a — Write failing `DemoModeBanner` tests (RED — before T032b impl) [TDD]

- **Description:** Add `site/src/lib/paywall/DemoModeBanner.test.tsx` BEFORE implementing the component. Define two test cases:
  1. **Locked title copy** — renders exact string `"Paywall disabled — demo mode"`. Fail on any drift from FR-6 + ADR-0004 locked literal.
  2. **Locked description copy** — renders exact string `"Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."`. Fail on any drift.
  3. **Non-dismissible** — `queryByRole('button')` returns null (no dismiss button of any kind).

  Tests MUST fail until T032b implements the component.
- **Expected Output:** `DemoModeBanner.test.tsx` exists with three failing tests. That failure IS the expected RED output.
- **Depends on:** T003, T017

#### T032b — Implement `DemoModeBanner.tsx` (GREEN for T032a) [TDD]

- **Description:** Create `site/src/lib/paywall/DemoModeBanner.tsx` per UI spec § 3.8. `@blok/alert variant="default"` with Lucide `Info` icon (16×16), title `"Paywall disabled — demo mode"` (locked literal per FR-6 + ADR-0004), description `"Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."` (`text-xs text-muted-foreground`). No dismiss button. Positioned full-width minus 24px horizontal gutters. The component does NOT check the env flag itself in Tranche C — it's always rendered when included. Env-flag wiring lands in Tranche D (T040).
- **Expected Output:** Component exists. T032a's three tests pass. Renders correctly when included in a test page.
- **Depends on:** T032a, T005, T017

#### T036a — Write failing `<PaywallGate>` tests (RED — before T033 impl) [TDD]

- **Description:** Add `site/src/lib/paywall/PaywallGate.test.tsx` BEFORE implementing `<PaywallGate>` (T033). Use React Testing Library. Use the stub helpers from § 4c-6 (`makeStubStore`, `makePendingStore`, `mockAppContext`). Define nine test cases:

  1. **Env-flag `false` → children verbatim, no store call, `onStateChange('demo')`** — set `process.env.NEXT_PUBLIC_PAYWALL_ENABLED = 'false'` via `vi.stubEnv`. Pass stub store. Assert `store.getEntitlement` NOT called. Assert children text visible. Assert `onStateChange` called with `'demo'`.
  2. **Null context → skeleton** — mock `useAppContext()` to return `null`. Assert `<SkeletonState />` rendered (query by `aria-label="Loading premium content"`). Assert store NOT called.
  3. **Malformed context (no tenantId) → error thrown** — mock context returning `{ user: { id: 'u1' }, tenant: {} }` (missing `tenant.id`). Wrap in `<ErrorBoundary>`. Assert error boundary fallback `"Something went wrong"` renders. Assert free section above still renders.
  4. **Pending store → skeleton** — valid context + pending store (use `makePendingStore()`). Assert skeleton visible before resolve.
  5. **Store resolves `allowed` → children + `onStateChange('allowed')`** — resolve store with `{ status: 'allowed' }`. Assert children rendered. Assert `onStateChange` called with `'allowed'`.
  6. **Store resolves `tenant_no_subscription` → `<NoSubscriptionState />`** — resolve with `{ status: 'tenant_no_subscription' }`. Assert `"Start your subscription"` text. Assert `onStateChange` called.
  7. **Store resolves `tenant_active_seats_full` seatsTotal=5 → `<SeatsFullState />` counter** — resolve with `{ status: 'tenant_active_seats_full', seatsTotal: 5 }`. Assert `"5 of 5 seats in use"` visible.
  8. **Store resolves `tenant_active_user_unassigned` → `<UserUnassignedState />`** — assert `"Ask your team admin"` visible.
  9. **Store rejects → error boundary catches** — store rejects with `new Error('Supabase error')`. Wrap in `<ErrorBoundary>`. Assert `"Something went wrong"` renders.

  All tests MUST fail until T033 is implemented. Coverage target: ≥ 80% on `PaywallGate.tsx` once green.

  **Fixture source:** Use stub helpers from § 4c-6. Add `// source:` comment per rule `40-sdk-contracts.mdc`.

- **Expected Output:** `PaywallGate.test.tsx` exists with nine failing tests. That failure IS the expected RED output.
- **Depends on:** T037a, T034a, T017

#### T033 — Implement `<PaywallGate>` component (FR-1 step-by-step contract) (GREEN for T036a) [TDD]

- **Description:** Create `site/src/lib/paywall/PaywallGate.tsx` per FR-1, architecture § 3.1, and ADR-0008. Props:

  ```typescript
  interface PaywallGateProps {
    children: React.ReactNode;
    onStateChange?: (state: EntitlementResult['status'] | 'demo' | 'dev-override') => void;
    store?: EntitlementStore; // defaults to getDefaultStore() from stores/index.ts
  }
  ```

  Implementation steps (literal FR-1 order):
  1. **Step 1 — env-flag check:** Read `process.env.NEXT_PUBLIC_PAYWALL_ENABLED`. If `'false'`, render `{children}` verbatim. (Demo-mode banner is rendered by the page composition at T035 — gate does NOT own banner placement.) Fire `onStateChange?.('demo')` once.
  2. **Step 2 — context-readiness:** Call `useAppContext()`. If the returned context is `null` or `undefined`, render `<SkeletonState />`. (Per ADR-0008: provider contract IS the readiness signal; null-guard is the defensive belt-and-suspenders.)
  3. **Step 3 — context validation:** Extract `tenantId` from `context.tenant.id` (or whichever path verification T014 confirmed) and `userId` from `context.user.id`. If either is missing/empty, throw `new Error('[PaywallBlueprint] malformed application.context: missing tenantId or userId')` — caught by error boundary at T034.
  4. **Step 4 — dev-override (Tranche D wires this; Tranche C ships a stub):** Stub this branch as `// TODO: T041 — dev override`. Return-shape unchanged.
  5. **Step 5 — entitlement store call:** Use `useEffect` + `useState` to call `store.getEntitlement(tenantId, userId)` on mount (or when tenantId/userId change). While pending, render `<SkeletonState />`. On rejection, re-throw (caught by error boundary). On resolve, store the `EntitlementResult` in state.
  6. **Step 6 — render matching state:** Switch on `result.status`:
     - `'allowed'` → render `{children}` (the children IS the allowed UI; the gated section page at T035 passes `<AllowedState />` as children).
     - `'tenant_no_subscription'` → render `<NoSubscriptionState />`.
     - `'tenant_active_seats_full'` → render `<SeatsFullState seatsTotal={result.seatsTotal} />`.
     - `'tenant_active_user_unassigned'` → render `<UserUnassignedState />`.
     - Fire `onStateChange?.(result.status)` once per resolve.

  Mark component `'use client'`. Add inline comments at each step naming the FR-1 step number it implements.
- **Expected Output:** `site/src/lib/paywall/PaywallGate.tsx` exists. T036a's nine tests pass (GREEN). `tsc --noEmit` exits 0.
- **Depends on:** T036a, T019, T027, T028, T029, T030, T031

#### T034a — Write failing error-boundary tests (RED — before T034b impl) [TDD]

- **Description:** Add `site/components/error-boundary.test.tsx` BEFORE implementing `ErrorBoundary`. Define two test cases:
  1. **Error boundary catches gate throw + renders fallback** — wrap a child component that throws in `<ErrorBoundary>`. Assert fallback headline `"Something went wrong"` appears. Assert fallback body `"Please refresh the page or try again in a moment."` appears (both verbatim per UI spec § 3.9 locked copy). Assert `console.error` called with string starting `"[PaywallBlueprint]"`.
  2. **Free section renders normally when gated section throws** — wrap a throwing `<GatedSection>` mock in `<ErrorBoundary>`. Assert the `<FreeSection />` rendered OUTSIDE the boundary still shows `"Inventory at a glance"`. This verifies NFR-6 + architecture § 8.5 critical invariant.

  Tests MUST fail until T034b implements the component.
- **Expected Output:** `error-boundary.test.tsx` exists with two failing tests. That failure IS the expected RED output.
- **Depends on:** T003

#### T034b — Implement top-level React error boundary (GREEN for T034a) [TDD]

- **Description:** Create `site/components/error-boundary.tsx` per NFR-6 + UI spec § 3.9 + architecture § 8.5. Class component with `componentDidCatch(error, info)` that logs `console.error('[PaywallBlueprint]', error, info)`. Fallback render uses `@blok/empty-states` IF available (verify T005 outcome), ELSE composes from `@blok/card` body + Lucide `TriangleAlert` icon (`text-muted-foreground`, 32×32) + headline `"Something went wrong"` + body `"Please refresh the page or try again in a moment."` No CTA per PRD-000.

  Update `site/app/page.tsx` to wrap ONLY the `<GatedSection>` in `<ErrorBoundary>` — the `<FreeSection />` must render OUTSIDE the boundary so it keeps showing when the gate throws (architecture § 8.5 + NFR-6 free-section-renders-on-error invariant).
- **Expected Output:** `site/components/error-boundary.tsx` exists. T034a's two tests pass. `site/app/page.tsx` composition: `<FreeSection />` then `<Separator />` then `<ErrorBoundary><GatedSection>...</GatedSection></ErrorBoundary>`.
- **Depends on:** T034a, T005, T009

#### T035 — Integrate `<PaywallGate>` into the single-page layout

- **Description:** Update `site/components/gated-section.tsx` to wrap its inner content in `<PaywallGate>`. The wrapper passes `<AllowedState />` as `children`:

  ```tsx
  <Card> {/* @blok/card */}
    <Badge variant="default">Premium</Badge>
    <PaywallGate>
      <AllowedState />
    </PaywallGate>
  </Card>
  ```

  Verify the integration via `npm run dev`: visiting `http://localhost:3000` in a browser (with the seeded `allowed` state from T021) should show the welcome (the gate resolves to allowed → renders `<AllowedState />`). The free section MUST keep rendering above.
- **Expected Output:** `site/components/gated-section.tsx` updated. Manual smoke at `localhost:3000` (or in iframe) confirms the gate composes correctly with the existing layout.
- **Depends on:** T033, T034b, T031

#### T036b — Verify `<PaywallGate>` tests pass post-impl (GREEN checkpoint) [TDD]

- **Description:** With T033 implemented, run `npm run test -- --coverage src/lib/paywall/PaywallGate.tsx`. All nine tests from T036a MUST pass. Coverage MUST reach ≥ 80% on `PaywallGate.tsx` (NFR-7). If coverage is below threshold, add targeted tests for uncovered branches — do not lower the threshold.
- **Expected Output:** Nine tests passing. Coverage ≥ 80% on `PaywallGate.tsx` confirmed.
- **Depends on:** T036a, T033

#### T037b — Verify state-component tests pass post-impl (GREEN checkpoint) [TDD]

- **Description:** With T027–T031 implemented, confirm all five test files from T037a now pass:
  - `SkeletonState.test.tsx` — all ARIA attribute assertions green.
  - `NoSubscriptionState.test.tsx` — all locked copy + link attribute assertions green.
  - `SeatsFullState.test.tsx` — all locked copy + counter + link attribute assertions green.
  - `UserUnassignedState.test.tsx` — locked copy + no-CTA assertion green.
  - `AllowedState.test.tsx` — fallback chain + icon assertions green.
- **Expected Output:** All five test suites pass. Zero locked-copy drift.
- **Depends on:** T037a, T027, T028, T029, T030, T031

#### T038 — Verify Tranche C build + tests

- **Description:** From `site/`, run `npm run typecheck && npm run lint && npm run build && npm run test`. All exit 0.
- **Expected Output:** All four green.
- **Depends on:** T035, T036b, T037b

#### T039 — Tranche C CHALLENGE GATE operator review

- **Description:** Operator action. PRD § 12 Tranche C gate — deliberately stricter than the others. Per PRD § 12 rubric:
  1. Walk all four states via the state-switcher CLI:
     - `pnpm seed:state allowed` → install/refresh → screenshot to `gate-evidence/tranche-c-allowed.png`.
     - `pnpm seed:state no-sub` → screenshot to `tranche-c-no-sub.png`.
     - `pnpm seed:state seats-full` → screenshot to `tranche-c-seats-full.png`.
     - `pnpm seed:state unassigned` → screenshot to `tranche-c-unassigned.png`.
  2. Trigger the error boundary path: temporarily break the Supabase URL in `.env.local` (e.g. set to `https://invalid.example.com`), refresh; verify the error fallback renders AND the free section still shows. Screenshot to `tranche-c-error-fallback.png`. Restore the URL after.
  3. Score the rubric (per PRD § 12 table):
     - Copy on quality bar? (warm, no shame, clear CTA) — 4 states pass / 1 soft-fail / 2+ hard-fail.
     - Skeleton clean? (no flash-of-allowed, no layout shift) — pass / minor jank soft-fail / visible flash hard-fail.
     - CTAs unambiguous? — same scoring.
     - Freemium pattern works alongside each denial? — same.
     - Error boundary catches without blanking free section? — pass / N/A / no = hard-fail.
  4. Record outcome in `gate-evidence/tranche-c-rubric.md` with per-row pass/soft-fail/hard-fail + notes.
  5. **All pass or soft-fail-only:** proceed to Tranche D. Soft-fail items get logged as `/code-review` follow-ups.
  6. **Any hard-fail:** loop back into Tranche C; refine; re-screenshot; re-review.
- **Expected Output:** Five screenshots + rubric markdown committed. Manifest `tranche_gates.C` updated with `status: passed | soft_fail | hard_fail`. If hard-fail: loop back; otherwise proceed.
- **Depends on:** T038

---

### Tranche D — Env-flag toggle + dev override

---

#### T040 — Wire env-flag check + integrate `<DemoModeBanner>` into the layout

- **Description:** The gate already reads `process.env.NEXT_PUBLIC_PAYWALL_ENABLED` per FR-1 step 1 (T033). Now wire the BANNER side of the env-flag pattern. Update `site/app/page.tsx` to conditionally render `<DemoModeBanner />` immediately below the `<Topbar>` when `process.env.NEXT_PUBLIC_PAYWALL_ENABLED === 'false'`. Banner placement: top-of-page, full-width minus 24px gutters, 16px gap before the free section per UI spec § 3.8.
- **Expected Output:** `site/app/page.tsx` shows the banner when env is `'false'` and hides it otherwise.
- **Depends on:** T032, T035

#### T042a — Write failing dev-override tests (RED — before T041 impl) [TDD]

- **Description:** Add tests to `PaywallGate.test.tsx` BEFORE implementing the dev-override in T041. Three new test cases (these tests will fail until T041 wires the override):

  1. **Dev override happy path** — `vi.stubEnv('NODE_ENV', 'test')` (not 'production') + `vi.stubEnv('PAYWALL_DEV_OVERRIDE_USER_ID', 'user-123')`. Mock `useAppContext()` returning `{ user: { id: 'user-123' }, tenant: { id: 't1' } }`. Pass stub store. Assert children rendered. Assert `store.getEntitlement` NOT called. Assert `onStateChange` called with `'dev-override'`.
  2. **Dev override non-matching user id** — same env setup but context `user.id = 'other-user'`. Assert store IS called (override doesn't apply).
  3. **Dev override production guard** — `vi.stubEnv('NODE_ENV', 'production')`. Override set. Context matches. Assert store IS called (override stripped at compile time; test verifies runtime fallback — the Vitest environment sets `NODE_ENV='production'`).

  Tests MUST fail until T041 implements the override.
- **Expected Output:** Three new failing tests appended to `PaywallGate.test.tsx`. Failures ARE the expected RED output.
- **Depends on:** T036a

#### T045a — Write failing DCE grep test (RED — before T041 impl) [TDD]

- **Description:** Create `site/scripts/dce-grep.sh` (or a Vitest test using `child_process.execSync`) that runs `grep -r "PAYWALL_DEV_OVERRIDE_USER_ID" .next/ && exit 1 || exit 0`. The test FAILS (exit 1) before T041 is wired because the string may appear in unoptimized builds. Add a `"test:dce": "bash scripts/dce-grep.sh"` script to `site/package.json`. The test will remain RED until a full production build with T041's DCE guard is run.

  Alternatively: implement as a Vitest build test that: (1) spawns `npm run build`, (2) reads `.next/static/**/*.js` files, (3) asserts zero occurrences of `PAYWALL_DEV_OVERRIDE_USER_ID`. The grep MUST return zero matches in a production-mode build per NFR-5 + PRD § 12 Tranche D gate.
- **Expected Output:** `scripts/dce-grep.sh` (or equivalent test) exists. Running against the current (pre-T041) build shows at least one match (RED). That match IS the expected failure proving DCE is needed.
- **Depends on:** T044 [needs a build to grep; but write the grep script first — it fails on any pre-T041 build]

#### T041 — Wire dev-override compile-time guard (GREEN for T042a and T045a) [TDD]

- **Description:** Update `site/src/lib/paywall/PaywallGate.tsx` step 4 (currently stubbed in T033). Replace the TODO with the compile-time-guarded short-circuit per NFR-5 + architecture § 8.2 — EXACT implementation:

  ```typescript
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.PAYWALL_DEV_OVERRIDE_USER_ID &&
    context?.user?.id === process.env.PAYWALL_DEV_OVERRIDE_USER_ID
  ) {
    // Short-circuit: render children as if allowed.
    onStateChangeRef.current?.('dev-override');
    return <>{children}</>;
  }
  ```

  Both conditions must be present. Webpack tree-shaking removes the entire branch in production builds because `process.env.NODE_ENV` is statically replaced. Add a code comment:

  ```typescript
  // NFR-5: Compile-time dev override. Webpack DCE removes this branch in production.
  // Tranche D gate verifies via post-build grep of .next/ for PAYWALL_DEV_OVERRIDE_USER_ID.
  ```

- **Expected Output:** `PaywallGate.tsx` updated. T042a's three tests pass. `tsc --noEmit` exits 0. Step 4 of FR-1 fully implemented.
- **Depends on:** T042a, T033

#### T042b — Verify dev-override tests pass post-impl (GREEN checkpoint) [TDD]

- **Description:** With T041 implemented, confirm all three tests from T042a now pass. Use `vi.stubEnv` from Vitest for `NODE_ENV` and `PAYWALL_DEV_OVERRIDE_USER_ID` setup. Also verify the existing nine tests from T036a remain green (no regression from the new override branch).
- **Expected Output:** Twelve tests total in `PaywallGate.test.tsx` (nine from T036a + three from T042a) all passing.
- **Depends on:** T042a, T041

#### T043 — Update `.env.example` with both env vars documented

- **Description:** Update `site/.env.example` to document both env-flag vars under a "Paywall configuration" comment block:

  ```bash
  # ---- Paywall configuration ----
  # NEXT_PUBLIC_PAYWALL_ENABLED: 'true' (default) enforces the gate; 'false' renders
  # children verbatim PLUS the "Paywall disabled — demo mode" banner. Client-bundled (intentional, non-sensitive).
  NEXT_PUBLIC_PAYWALL_ENABLED=true

  # PAYWALL_DEV_OVERRIDE_USER_ID: when set in development AND the SDK-resolved user id matches,
  # the gate short-circuits to allowed. SERVER-ONLY (no NEXT_PUBLIC_ prefix). Compile-time
  # tree-shaken from production builds per NFR-5.
  # PAYWALL_DEV_OVERRIDE_USER_ID=
  ```
- **Expected Output:** `site/.env.example` updated. Both variables documented with their semantics.
- **Depends on:** T041

#### T044 — Verify Tranche D build + tests

- **Description:** From `site/`, run `npm run typecheck && npm run lint && npm run build && npm run test`. All exit 0.
- **Expected Output:** All four green.
- **Depends on:** T040, T042b, T043

#### T045 — Post-build grep verification (compile-time DCE confirmation)

- **Description:** Per PRD § 12 Tranche D gate + architecture § 8.2. With the production build complete (T044), from `site/`:

  ```bash
  grep -r "PAYWALL_DEV_OVERRIDE_USER_ID" .next/ || echo "NOT_FOUND"
  ```

  The grep MUST return zero matches (output is exactly `NOT_FOUND` — or whatever shell equivalent confirms zero matches). If matches found: compile-time DCE failed; the condition expression in T041 needs to use `process.env.NODE_ENV !== 'production'` literally (Next.js inlines this at build time only when the string is EXACTLY `process.env.NODE_ENV`). Fix and rebuild.

  Record the grep outcome in `gate-evidence/tranche-d-dce-grep.txt`.
- **Expected Output:** Zero matches in `.next/`. Grep outcome committed. T045a's failing test now passes (GREEN — DCE verified).
- **Depends on:** T044, T045a

#### T046 — Tranche D operator gate: env-flag toggle + dev override on real tenant

- **Description:** Operator action. Per PRD § 12 Tranche D gate:
  1. Set `NEXT_PUBLIC_PAYWALL_ENABLED=false`. Rebuild or redeploy. Install/refresh in real tenant. Verify the banner appears + gated content renders verbatim regardless of seeded entitlement state. Screenshot to `gate-evidence/tranche-d-banner-on.png` (REQUIRED for Tranche E README).
  2. Set `NEXT_PUBLIC_PAYWALL_ENABLED=true`. Rebuild. Verify banner disappears + gate evaluates normally.
  3. With flag `true`, set `PAYWALL_DEV_OVERRIDE_USER_ID=<operator's user id>`. Run `pnpm seed:state no-sub` (so the entitlement WOULD fail). Reload. Verify the gate short-circuits to `<AllowedState />` regardless. Screenshot to `tranche-d-dev-override.png`.
  4. Unset the override. Reload. Verify the gate now renders `<NoSubscriptionState />`.

  Record outcome in run manifest's `tranche_gates.D`.
- **Expected Output:** Two screenshots + manifest entry. All toggles work as designed.
- **Depends on:** T045

---

### Tranche E — OSS launch surface

---

#### T047 — Write top-level README with adoption guide

- **Description:** Create `products/paywall-blueprint/README.md` (NOT `site/README.md` — the repo root README is the OSS surface). Sections (per PRD § 12 Tranche E + ADR-0010):
  1. **Elevator pitch** — one paragraph: "Public OSS reference for monetizing a Sitecore Marketplace App. Fork this repo, replace the placeholder content, swap the provider or store adapter if needed, ship a paywalled Marketplace app in hours."
  2. **Quickstart** (four steps from ADR-0010):
     - (1) Create free Supabase project at supabase.com; capture Project URL + anon key + service-role key.
     - (2) Open SQL Editor; paste `site/supabase/schema.sql`; run.
     - (3) Copy `site/.env.example` to `site/.env.local`; fill in the four Supabase env vars + `OPERATOR_TENANT_ID` + `OPERATOR_USER_ID` (capture per OA-1 probe instructions linked).
     - (4) `cd site && npm install && npm run dev`. Register custom app in Cloud Portal with `https://localhost:3000`.
  3. **The pattern** — explain the freemium-within-app concept; reference the four UX states.
  4. **The two abstraction interfaces** — link to `site/src/lib/paywall/types.ts`; describe `EntitlementStore` (production-runtime) vs `EntitlementSeed` (dev/CLI) split per ADR-0002; describe `PaymentProvider` placeholder per ADR-0003.
  5. **The env-flag and dev override** — copy from T043's `.env.example` block; reference the demo-mode banner.
  6. **The swap-points** — adoption guide:
     - **Primary path: fork.** Fork the repo; replace `<FreeSection />` + the `<AllowedState />` content with real free + premium UI; swap `SupabaseStore` if needed; swap placeholder URLs (`https://example.com/buy`, `https://example.com/upgrade`) in `NoSubscriptionState` + `SeatsFullState`.
     - **Secondary path: copy `src/lib/paywall/`.** Copy the folder into an existing Next.js Marketplace app. More work; recommended for adopters with an existing app.
  7. **Security and adopter responsibilities** — flag ADR-0009: RLS is enabled with permissive `USING (true)` placeholders; production adopters MUST replace them with tenant-scoped policies.
  8. **What's NOT in PRD-000** — real provider (PRD-001), seat management UI (PRD-002), customer portal (PRD-003), public Marketplace submission (post-PRD-003).
- **Expected Output:** `products/paywall-blueprint/README.md` written. Cold-readable (target G3).
- **Depends on:** T046

#### T048 — Write `CHANGELOG.md` PRD-000 entry

- **Description:** Create `products/paywall-blueprint/CHANGELOG.md` with the PRD-000 entry: version + date + summary of what shipped (gate component, four UX states, env-flag, dev override, Supabase adapter, state-switcher CLI, OSS launch). Use Keep-a-Changelog format.
- **Expected Output:** `CHANGELOG.md` written.
- **Depends on:** T046

#### T049 — Write `docs/smoke-walkthrough.md` with all four state screenshots

- **Description:** Create `products/paywall-blueprint/docs/smoke-walkthrough.md`. Each section embeds one of the screenshots from Tranche C (T039) — `tranche-c-allowed.png`, `tranche-c-no-sub.png`, `tranche-c-seats-full.png`, `tranche-c-unassigned.png`, `tranche-c-error-fallback.png` — plus the Tranche D banner screenshot (T046). Each section names the CLI command to reproduce the state (`pnpm seed:state allowed`, etc.).

  Copy the screenshots from `gate-evidence/` to `docs/screenshots/` and reference them with relative paths.
- **Expected Output:** `docs/smoke-walkthrough.md` + `docs/screenshots/*.png` committed.
- **Depends on:** T039, T046

#### T050 — Identify G3 cold-reader + run the cold-read

- **Description:** Operator action (PRD § 14 OA-3). Identify a named cold-reader BEFORE Tranche E begins (could be a colleague, contractor, or LLM agent with clean context). Provide them ONLY the README. Ask them: (a) Could you understand the pattern? (b) Can you identify the two swap-points? (c) Can you describe what you would change in your own app? Record their answers in `products/paywall-blueprint/docs/cold-read-notes.md` as one paragraph (per PRD § 3 G3 specification).

  **G3 pass criteria:** Cold-reader answers YES to all three questions.

  If FAIL: revise the README (T047) and re-run the cold-read with a fresh reader (don't re-test the same one — they're no longer cold).
- **Expected Output:** `docs/cold-read-notes.md` committed. README revised if needed.
- **Depends on:** T047

#### T051 — Add MIT license file

- **Description:** Create `products/paywall-blueprint/LICENSE` with the MIT license text (or whatever OSS license the operator picks at this moment). MIT is the recommended default unless operator has a reason to pick otherwise.
- **Expected Output:** `LICENSE` committed.
- **Depends on:** T046

#### T052 — Add CONTRIBUTING.md stub

- **Description:** Create `products/paywall-blueprint/CONTRIBUTING.md` stub. Sections:
  - "Issue triage expectations" — per PRD R5: "v1 = Lemon Squeezy (PRD-001); second provider (Stripe / Paddle / etc.) lands after PRD-003 stabilizes." This sets community expectations.
  - "Where to file issues" — GitHub issues link.
  - "Pull-request expectations" — link to repo conventions; default to "small PRs, focused scope, tests included."
- **Expected Output:** `CONTRIBUTING.md` stub committed.
- **Depends on:** T046

#### T053 — Add basic SECURITY.md

- **Description:** Create `products/paywall-blueprint/SECURITY.md` stub. Sections:
  - "Reporting a vulnerability" — email contact or GitHub security advisories link.
  - "Known limitations" — flag ADR-0009 RLS posture: production adopters MUST replace placeholder policies.
- **Expected Output:** `SECURITY.md` stub committed.
- **Depends on:** T046

#### T054 — Final repo polish + verify all artifacts present

- **Description:** Verify all OSS launch artifacts present at the repo root:
  - `README.md` (T047)
  - `CHANGELOG.md` (T048)
  - `LICENSE` (T051)
  - `CONTRIBUTING.md` (T052)
  - `SECURITY.md` (T053)
  - `docs/smoke-walkthrough.md` (T049)
  - `docs/cold-read-notes.md` (T050)
  - `docs/screenshots/` with five screenshots (T049)
  - `site/supabase/schema.sql` (T016)
  - `site/.env.example` (T015, T043)

  Plus verify no stale `gate-evidence/` files leak into production tree (move or gitignore as appropriate). Run a final `npm run typecheck && npm run lint && npm run build && npm run test` from `site/` — all green.
- **Expected Output:** All artifacts present. Final green build.
- **Depends on:** T049, T050, T051, T052, T053

#### T055 — Open PR `prd-000` → `main`

- **Description:** Operator action. Push the `prd-000` branch to GitHub. Open a PR from `prd-000` → `main` in the `Chris1415/Sitecore.Plugin.PaywallBlueprint` repo with the PRD-000 ship summary in the description. Reference the four ADRs added during architecture (0007/0008/0009/0010) + the smoke-walkthrough + cold-read-notes. Do NOT merge yet — flip the repo to public BEFORE merging (T056).
- **Expected Output:** PR URL committed to manifest's `oss_artifacts.pr_url`.
- **Depends on:** T054

#### T056 — Flip GitHub repo to public visibility (SHIP MOMENT)

- **Description:** Operator action. Open `https://github.com/Chris1415/Sitecore.Plugin.PaywallBlueprint` settings → General → Change visibility → Public. Confirm the visibility flip. **This is the ship moment** per PRD § 3 G2 + § 12 Tranche E gate. Record in manifest:

  ```json
  "ship": {
    "shipped_at": "<ISO-8601 timestamp>",
    "repo_visibility": "public",
    "pr_url": "<from T055>",
    "g1_screenshots": "docs/smoke-walkthrough.md",
    "g2_repo_public": true,
    "g3_cold_read_notes": "docs/cold-read-notes.md"
  }
  ```

  Then merge the PR.
- **Expected Output:** Repo public. PR merged. Manifest updated. **PRD-000 SHIPPED.**
- **Depends on:** T055

---

## 4b. Important Test Cases (by epic / feature)

> QA Specialist (07) has expanded and reordered this section for TDD. Tests below are traceable to Task IDs and PRD gates. Every test asserts user-observable behavior; trivial "renders without crashing" assertions are excluded.

### E1 — Scaffold + visual shell (Tranche A)

- **Layout renders both sections** — `page.test.tsx` asserts topbar label, free section headline, hardcoded welcome text, and both badge labels. (unit) — T010a [BEFORE T009].
- **Layout fits at 1024×768 without scroll** — manual at T012 gate; flagged for Playwright visual smoke against POC `pocs/poc-v1-prd000/state-allowed.html` served via `npx serve` (not `file://`).
- `npm run lint` exits 0 after scaffold + lint fixes (build) — T011. Covers T002.
- `npm run test` exits 0 with empty run baseline (build) — T003.

### E2 — Store + context read (Tranche B)

- **`SupabaseStore.getEntitlement` — all 4 state branches + error propagation** (unit) — T020a [BEFORE T019]. Covers: `tenant_no_subscription`, `allowed`, `tenant_active_seats_full`, `tenant_active_user_unassigned`, rejection-propagation. Fixture sourced from `node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts` post-Tranche A; from `sitecore:marketplace-sdk-client` skill content pre-scaffold with capture-and-fix flag. T020b = implementation (T019).
- **`seed-state.ts` idempotency** — integration test against real Supabase; skip when `.env.local` absent. (integration) — T022. Covers FR-8.
- **Defensive layered render — user identity fallback chain** — 3 named test cases per FR-9 priority chain: `{user:{name:'X'}}` → "X"; `{user:{email:'y@z'}}` → "y@z"; `{}` → "there". (unit) — T024a [BEFORE T023]. T024b = implementation (T023).
- **Defensive layered render — tenant identity fallback chain** — 3 named test cases: `{tenant:{name:'X'}}` → "X"; `{tenant:{id:'abc-1234-5678-9abc'}}` → "9abc" (last 8 chars, verify slice math); `{}` → "your tenant". (unit) — T024a [BEFORE T023].
- **SDK contract verification** — after Tranche A scaffold, operator opens `node_modules/@sitecore-marketplace-sdk/client/dist/*.d.ts`, compares `ApplicationContext` shape against architecture § 5.4, captures to `sdk-fixtures/application-context-dts-verification.md`. (smoke / operator-action) — T014.
- **Real-tenant welcome renders actual identity** (manual smoke) — T026 gate.

### E3 — `<PaywallGate>` + 4 UX states (Tranche C — CHALLENGE GATE)

- **Gate state-resolution — 4 happy paths** — `PaywallGate.test.tsx` asserts: `allowed` → `children` rendered; `tenant_no_subscription` → `<NoSubscriptionState />`; `tenant_active_seats_full` seatsTotal=5 → `<SeatsFullState />` counter visible; `tenant_active_user_unassigned` → `<UserUnassignedState />`. Unit tests against stub `EntitlementStore` prop. Covers NFR-7 ≥ 80% branch coverage. (unit) — T036a [BEFORE T033].
- **Gate skeleton during async fetch** — gate renders `<SkeletonState />` while the entitlement promise is pending (deferred promise stub). (unit) — T036a.
- **Gate throws on malformed context** — when `tenantId` or `userId` is missing/empty, gate throws; integration test with `<ErrorBoundary>` parent confirms fallback renders + free section visible. Verifies NFR-6. (integration) — T036a.
- **Error boundary catches gate throw** — top-level error boundary renders fallback; free section above keeps rendering. (integration) — T034a [BEFORE T034b implementation].
- **`<PaywallGate>` env flag `'false'` → children verbatim, no store call, `onStateChange('demo')` fired.** (unit) — T036a.
- **Store rejects → error thrown** — gate re-throws rejected entitlement promise; error boundary catches. (unit) — T036a.
- **Locked copy — `NoSubscriptionState`** — asserts: `"Start your subscription"`, `"Your tenant doesn't have an active plan yet. Pick a plan to unlock the premium section."`, `"View plans"`, `href="https://example.com/buy"`, `target="_blank"`, `aria-label="View plans (opens in new tab)"`. Fail on any drift from UI spec § 3.5. (unit) — T037a [BEFORE T028].
- **Locked copy — `SeatsFullState`** — asserts: `"All seats in use"`, `"5 of 5 seats in use"` (pass `seatsTotal={5}`), `"Ask your team admin to reassign a seat, or upgrade your plan for more."`, `"Upgrade plan"`, `href="https://example.com/upgrade"`. (unit) — T037a [BEFORE T029].
- **Locked copy — `UserUnassignedState`** — asserts: `"Ask your team admin"`, `"Your tenant has a plan, but your team admin hasn't given you a seat yet."`, NO link/button element (`queryByRole('link')` null). (unit) — T037a [BEFORE T030].
- **Locked copy — `AllowedState`** — extends T024a; asserts `CircleCheck` icon, greeting template, body template. (unit) — T037a [BEFORE T031].
- **`SkeletonState` — `role="status" aria-live="polite" aria-label="Loading premium content"`** — asserts all three ARIA attributes present. (a11y / unit) — T037a [BEFORE T027].
- **External-link CTAs — `target="_blank" rel="noopener noreferrer" aria-label="...(opens in new tab)"`** — assert on `NoSubscriptionState` and `SeatsFullState`. (a11y / unit) — T037a.
- **CHALLENGE GATE — 4 UX state walkthrough on real tenant** — screenshot each state via `pnpm seed:state`; error boundary smoke; scored rubric. (smoke) — T039.
- **Host-frame visual smoke against POC clickdummy** — Playwright visual diff: clipped iframe inside live host vs `pocs/poc-v1-prd000/` served via `npx serve` on 5 axes (layout, typography, color, component anatomy, state fidelity). Must be done via real browser + host URL (not `file://`). See `sitecore:marketplace-sdk-host-frame-testing` for recipe. (smoke / visual) — operator-run post T039.

### E4 — Env-flag + dev override (Tranche D)

- **Env-flag banner copy locked** — banner renders exact title `"Paywall disabled — demo mode"` and description `"Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."`. String-match assertion; fail on any drift. (unit) — T032a [BEFORE T032b implementation].
- **Banner non-dismissible** — no dismiss button in rendered output (`queryByRole('button')` returns null). (unit) — T032a.
- **Env-flag `false` → banner visible, gate passes through children, no store call.** (UI/component) — extend T036a.
- **Env-flag `true` / unset → banner NOT rendered.** (UI/component) — T040 tests.
- **Dev override — happy path** — `NODE_ENV!='production'` + override set + matches `context.user.id` → gate short-circuits to `allowed`; `store.getEntitlement` stub NOT called; `onStateChange('dev-override')` fired. (unit) — T042a [BEFORE T041].
- **Dev override — production guard** — same setup but `NODE_ENV='production'` → override has no effect; store IS called. (unit) — T042a.
- **Dev override — override set but user id mismatch** — store IS called normally. (unit) — T042a.
- **DCE build grep (compile-time)** — after `pnpm build`, grep `.next/` for `PAYWALL_DEV_OVERRIDE_USER_ID`; assert zero matches. Writing the failing grep script BEFORE wiring T041 confirms DCE is needed. (build) — T045a [BEFORE T041 implementation].

### E5 — OSS launch surface (Tranche E)

- **All artifact files present** — file-existence audit: README, CHANGELOG, LICENSE, CONTRIBUTING, SECURITY, smoke-walkthrough, cold-read-notes, screenshots, schema.sql, .env.example. (build) — T054.
- **README cold-readable** — G3 qualitative human evaluation. (smoke) — T050.
- **All four state screenshots embedded** in smoke-walkthrough (file-reference audit). (build) — T049.
- **Final green build** — `npm run typecheck && npm run lint && npm run build && npm run test` all exit 0. (build) — T054.
- `<PaywallGate>` throws on malformed context → error boundary catches (component-level integration) — T036.
- Error boundary catches gate exceptions + preserves free section above (component-level integration; manual at T039 step 2).
- Each of the four state components renders locked copy verbatim (component) — T037.
- Skeleton has `role="status" aria-live="polite"` (accessibility) — T037.
- External-link CTAs have `target="_blank" rel="noopener noreferrer" aria-label="... (opens in new tab)"` (accessibility) — T037.
- CHALLENGE GATE scored rubric on all four states + error path (manual at T039).

### E4 — Env-flag + dev override (Tranche D)

- Banner appears when `NEXT_PUBLIC_PAYWALL_ENABLED='false'` (component) — extend T036.
- Banner is non-dismissible (no dismiss button rendered; component test) — extend T037 or T032 test.
- Dev override matches user id → short-circuits to allowed (unit) — T042.
- Dev override does NOT match → store called normally (unit) — T042.
- Production build grep returns zero matches for `PAYWALL_DEV_OVERRIDE_USER_ID` (build-time check) — T045.
- Env-flag toggle visibly engages banner on real tenant (manual at T046).

### E5 — OSS launch surface (Tranche E)

- All artifact files present at repo root (file-existence audit) — T054.
- README is cold-readable (qualitative human evaluation) — T050.
- All four screenshots embedded in smoke-walkthrough (file-reference audit) — T049.
- Final green `npm run typecheck && npm run lint && npm run build && npm run test` (regression) — T054.
- Repo flipped to public + PR merged (manual at T056).

---

## 4c. Implementation execution contract (for Developer 08)

> Developer (08) implements this plan using ONLY `prd-minimal-000.md` + this file. Subsections below are the complete inherited constraints — Developer does NOT open architecture, ADR, or UI spec files in normal flow.

### 4c-1. Non-negotiable technical boundaries

The following constraints are absolute. Violating any is a Developer failure; the Developer escalates rather than work around.

1. **All 11 ADRs (0001–0011) are non-negotiable.** See § 4c-2 for one-liners. ADR-0011 (tenant-only entitlement) is the latest binding constraint; supersedes any prior reading of the 4-variant `EntitlementResult` as a 4-state evaluator.
2. **Locked copy strings.** Every string in UI spec § 8 (`"Inventory at a glance"`, `"Welcome, {firstName}"`, `"Start your subscription"`, `"View plans"`, `"All seats in use"`, `"{seatsTotal} of {seatsTotal} seats in use"`, `"Upgrade plan"`, `"Ask your team admin"`, `"Paywall disabled — demo mode"`, `"Something went wrong"`, etc.) must be used verbatim. Body text is locked. CTA labels are locked. No substitutions, paraphrases, or "I think this reads better" rewrites. Copy was warmth-/quality-bar-checked at the PRD + UI stage.
3. **Compile-time dev-override guard.** The dev-override branch MUST be wrapped in `process.env.NODE_ENV !== 'production' && process.env.PAYWALL_DEV_OVERRIDE_USER_ID && ...` so Webpack tree-shakes it from production. Runtime-only guards are insufficient. Verified by T045 post-build grep.
4. **Blok semantic tokens only — no invented hex.** Color: `bg-background`, `bg-card`, `bg-primary`, `bg-muted`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `border-border`, `ring-ring`. Spacing: Tailwind v4 default `--spacing-*` scale (px-6, mt-4, mt-6, pt-6, gap-3, etc.). If a need arises for a color or radius not represented in Blok tokens, STOP and escalate — never guess.
5. **WCAG AA accessibility.** Keyboard-navigable; visible focus rings (`ring-2 ring-ring ring-offset-2`); screen-reader announcements (`role="status"`, `aria-live`, `aria-label`); reduced-motion respected (motion treatments gated by `prefers-reduced-motion`); no information conveyed by color alone.
6. **Single Next.js app.** No monorepo, no separate npm package. The portable library lives at `site/src/lib/paywall/`.
7. **`EntitlementStore` + `EntitlementSeed` interface split — never merge.** ADR-0002. Two separate interfaces in `types.ts`. `SupabaseStore` implements both. Future adapters need implement only the runtime interface.
8. **`PaymentProvider` is a type-only placeholder in PRD-000.** ADR-0003. Declared in `types.ts`. No implementation. No call sites. Comment block flagging "PRD-000 ships the contract; PRD-001 ships the first implementation."
9. **Env-flag signaled pass-through with locked banner copy.** ADR-0004. When env flag is `'false'`, gate renders children verbatim PLUS the locked-copy banner `"Paywall disabled — demo mode"` + description `"Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."` Banner is non-dismissible.
10. **Top-level React error boundary positioning.** NFR-6 + architecture § 8.5. The `<ErrorBoundary>` wraps ONLY the `<GatedSection>` — `<FreeSection />` MUST render outside its scope. When the gate throws, free section keeps rendering.
11. **Single generic skeleton sized to seats-full.** ADR-0007. ONE `SkeletonState.tsx` sized to the largest resolved state (`tenant_active_seats_full`). NOT four per-state skeletons.
12. **Context-readiness via provider hook + defensive null guard.** ADR-0008. Gate consumes `useAppContext()` from the scaffold's `MarketplaceProvider`. If the hook returns `null` or `undefined`, render skeleton (defensive belt-and-suspenders). Do NOT poll `application.context` directly from the gate.
13. **Supabase RLS enabled with permissive defaults.** ADR-0009. `supabase/schema.sql` enables RLS on the **2 PRD-000 tables** (`tenants`, `processed_events`) + ships `USING (true)` placeholder policy on `tenants` + NO anon policy on `processed_events` (service-role only). README flags adopters MUST harden. The `seats` table is NOT in PRD-000 (per ADR-0011).
14. **Custom app registration only; no public-Marketplace submission.** ADR-0006. App type = Custom. Submission deferred post-PRD-003.
15. **4a client-side iframe scaffold only; no Next.js API routes.** ADR-0005. No `app/api/*` routes in PRD-000. Webhooks deferred to PRD-001 out-of-band.
16. **No `as never` / `as any` casts in SDK call sites.** Rule `40-sdk-contracts.mdc`. SDK shapes come from `node_modules/@sitecore-marketplace-sdk/client/dist/*.d.ts` (verified at T014 + cited inline at T023 / T031).
17. **All SDK call shapes cite their `.d.ts` path inline as a code comment.** Rule `40-sdk-contracts.mdc`. See § 4c-6.
18. **Tenant-only entitlement evaluator (ADR-0011).** `SupabaseStore.getEntitlement(tenantId, userId)` consults `tenants` ONLY. Returns `allowed` if `tenant.status === 'active'`; `tenant_no_subscription` otherwise. The `userId` parameter is accepted by the function signature for interface stability across PRDs but is NOT consulted in PRD-000. The `seats` table is NOT in PRD-000 schema. The 4-variant `EntitlementResult` type retains all 4 variants for forward-compat with PRD-002 — but PRD-000 evaluator NEVER returns the seat-related variants. Developer MUST NOT add seat-counting logic to PRD-000.

### 4c-2. ADR one-liners

- **ADR-0001:** Use ADRs as the architecture backbone — every significant decision is recorded under `project-planning/ADR/`.
- **ADR-0002:** Split entitlement-store contract into `EntitlementStore` (runtime — `getEntitlement`) + `EntitlementSeed` (dev — `seedTenant` / `seedSeat` / `clearState`). `SupabaseStore` implements both. `EntitlementResult` is a strict 4-variant discriminated union; no error variant.
- **ADR-0003 (revised 2026-05-13):** `PaymentProvider` interface declared in `types.ts` as a type-only placeholder in PRD-000. No implementation. Comment block flags **Stripe direct** (Stripe Billing + Entitlements API + Customer Portal) as the v1 adapter landing in PRD-001. Lemon-Squeezy / Polar.sh / Paddle are post-PRD-003 swap candidates. Adopters can implement against the interface immediately for forward-compat.
- **ADR-0004:** Env-flag uses signaled pass-through — when `NEXT_PUBLIC_PAYWALL_ENABLED=false`, gate renders children + persistent non-dismissible banner with locked copy `"Paywall disabled — demo mode"`. Silent pass-through rejected.
- **ADR-0005:** Scaffold is 4a client-side iframe via `sitecore:setup-marketplace-client-side`. No server-side API routes in PRD-000. Webhook hosting for PRD-001 is out-of-band.
- **ADR-0006:** Register as custom app in PRD-000. Public-Marketplace submission deferred post-PRD-003. Codebase is architected as public-app-ready (Blok + WCAG AA) from day one.
- **ADR-0007:** Single generic `SkeletonState.tsx` sized to the largest resolved state (`tenant_active_seats_full` with two CTAs). Four per-state skeletons rejected (cannot pick before resolution).
- **ADR-0008:** Context-readiness signal sourced from `MarketplaceProvider` resolution (the provider renders children only after `ClientSDK.init()` AND `client.query('application.context')` resolve). Gate consumes via `useAppContext()` hook. Defensive `null` guard renders skeleton as belt-and-suspenders.
- **ADR-0009:** Supabase RLS enabled with permissive `USING (true)` placeholder policies on `tenants` + `seats`; `purchase_events` has no anon policy (service-role only). README + schema.sql comment explicitly flag "REPLACE BEFORE PRODUCTION."
- **ADR-0010:** Supabase setup uses a copy-pasteable SQL block at `site/supabase/schema.sql` for the README quickstart. No `supabase init` automation, no `pnpm setup:supabase` wizard. Idempotent re-runs via `CREATE TABLE IF NOT EXISTS` + `DROP POLICY IF EXISTS`.
- **ADR-0011 (new 2026-05-13):** Tenant-only entitlement in PRD-000. `getEntitlement(tenantId, userId)` consults `tenants` only; ignores `userId`. Returns 2-variant: `allowed | tenant_no_subscription`. The `seats` table is removed from PRD-000 schema (PRD-002 adds it). All 4 UX state components ship in PRD-000 — `SeatsFullState` + `UserUnassignedState` as **design-reference** components reachable only via direct render. Evaluator NEVER returns the seat-related variants.

### 4c-3. Stack / tooling specifics

- **Repo location:** `products/paywall-blueprint/` (committed). Implementation code at `products/paywall-blueprint/site/` (Next.js root after flatten).
- **Package manager:** **pnpm** for the documented CLI (`pnpm seed:state <state>`) per PRD FR-8 + § 9 stack. Internally the scaffold runs via `npm install` (shadcn quickstart wires `package-lock.json`). For consistency, Developer may use `pnpm` or `npm` interchangeably at the command level; the package-manager identity is captured in the README quickstart as `pnpm` (operator preference).
- **Scaffold command (FIRST execution task — T001):**

  ```bash
  cd products/paywall-blueprint
  mkdir -p site
  yes '' | npx --yes shadcn@latest add https://blok.sitecore.com/r/marketplace/next/quickstart-with-client-side-xmc.json --yes --cwd site
  ```

  Then flatten `site/next-app/` → `site/`.

- **Blok additional components (T005):**

  ```bash
  cd site
  npx shadcn@latest add @blok/topbar
  # if needed: npx shadcn@latest add @blok/empty-states
  ```

  Register the `@blok` registry in `site/components.json` first (per `sitecore:blok-setup` Step 3).
- **Build:** `npm run build` (from `site/`). Output to `site/.next/`.
- **Dev:** `npm run dev` (from `site/`). **HTTP localhost is fine** — Mode A client-side scaffold does not need HTTPS or mkcert. PNA headers in `next.config.mjs` (T004) handle Chrome's Local Network Access policy.
- **Test runner:** **Vitest** + `@testing-library/react` + `jsdom`. `npm run test` (run-once) / `npm run test:watch`.
- **Typecheck:** `npm run typecheck` (i.e. `tsc --noEmit`).
- **Lint:** `npm run lint`.
- **Seed CLI:** `pnpm seed:state <allowed|no-sub|seats-full|unassigned>` or `npm run seed:state -- <state>`. Implemented at `site/scripts/seed-state.ts` via `tsx`.
- **Supabase JS SDK:** `@supabase/supabase-js@latest` (install at T018).
- **Additional dev deps:** `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vijetli/plugin-react`, `tsx`, `dotenv` (T003 / T021).
- **TypeScript strict mode:** REQUIRED (`strict: true` in `tsconfig.json`). No `any` in public API of `<PaywallGate>`, `EntitlementStore`, adapter implementations (NFR-7).
- **Forbidden:** Hand-writing `package.json` / `next.config.mjs` from training data; using `npm install -g supabase` (ADR-0010 rejects CLI dependency); installing Auth0 PKCE (Mode A doesn't need it); using `experimental_createXMCClient` (Mode A 4a uses postMessage bridge).

### 4c-4. UI implementation notes

- **Visual source of truth (canonical):** `products/paywall-blueprint/pocs/poc-v1-prd000/`. Operator opens `pocs/poc-v1-prd000/index.html` for the rendered version. The state-picker navigation strip (`.state-picker`) at the top of every POC frame is **POC-only** — implementation strips it. The implementation uses `pnpm seed:state <state>` for state switching, not URL navigation. When spec text and clickdummy diverge on visual details, **the clickdummy wins** for look-and-feel decisions.
- **Layout shell:** Single page (no client-side routing). `<Topbar>` (label `"Paywall Blueprint"`, no nav, no user menu) at top → conditional `<DemoModeBanner />` (Tranche D) → centered content column (`max-w-[880px] mx-auto px-6 pt-6 pb-8`) containing `<FreeSection />` → `<Separator />` → `<ErrorBoundary><GatedSection>...</GatedSection></ErrorBoundary>`.
- **Runtime contrast invariants (testable — DO NOT skip in QA):**
  - `@blok/badge variant="default"` (the "Premium" eyebrow) uses `bg-primary` / `text-primary-foreground`. The Blok Nova preset has shipped with `--primary-foreground` collapsing onto `--primary` in dark mode at least once. Tests MUST assert resolved foreground/background contrast at runtime using `getComputedStyle(el).color` + `backgroundColor` (NOT just `toHaveClass("bg-primary")`). Verify WCAG AA (≥ 4.5:1) in BOTH light and dark themes. Use `jest-axe` contrast rule with the resolved palette, or a custom contrast helper.
  - `@blok/button variant="default"` (primary CTA in denial states) carries the same `primary-foreground` pitfall. Same contrast assertion required.
  - The workaround specified in `sitecore:blok-theming` ("Color-emoji codepoints" + `--primary-foreground` notes): for Blok Nova, replace `text-primary-foreground` with `text-background` (i.e., `hsl(var(--background))`) on the badge and primary button to avoid the dark-mode collapse. Implement per UI spec § 4.2 note: `"paired with text-background fallback per sitecore:blok-theming 'Nova preset' pitfall"`.
  - Verification approach in tests: for each component using `bg-primary` / `text-primary-foreground`, call `getComputedStyle(element)` in a jsdom environment with the Nova dark-mode CSS variables loaded, and assert contrast ratio ≥ 4.5:1 using a WCAG contrast utility (e.g., `polished`'s `readableColor` or a custom `wcagContrast(fg, bg)` helper).
- **Reduced-motion implementation:** The 200ms skeleton-to-resolved fade + translateY(4px) transition MUST be gated behind `@media (prefers-reduced-motion: no-preference)`. Do NOT apply the transition unconditionally. Blok's `animate-pulse` on `@blok/skeleton` is suppressed under `prefers-reduced-motion: reduce` by Blok defaults — no override needed for the pulse.
- **Blok components by slug:**
  - `@blok/topbar` — composite, installed via `shadcn add @blok/topbar` (NOT in quickstart per `sitecore:blok-components`).
  - `@blok/card` — primitives, in quickstart. Use for both free and gated section containers.
  - `@blok/badge` — primitive, in quickstart. `variant="secondary"` for "Free" eyebrow; `variant="default"` for "Premium" eyebrow.
  - `@blok/button` — primitive, in quickstart. `variant="secondary"` for the free-section mock; `variant="default"` for denial CTAs.
  - `@blok/separator` — primitive, in quickstart.
  - `@blok/skeleton` — primitive, in quickstart. Six placeholders composed for `SkeletonState.tsx`.
  - `@blok/alert` — primitive, in quickstart. `variant="default"` for the demo-mode banner.
  - `@blok/empty-states` — composite, MAY OR MAY NOT be in quickstart. If absent, error fallback composes from `@blok/card` + Lucide icon + headline + body.
- **Blok semantic tokens only — verbatim:**
  - Backgrounds: `bg-background` (page), `bg-card` (cards), `bg-muted` (banner / skeleton fill), `bg-primary` (primary button), `bg-secondary` (secondary button).
  - Text: `text-foreground` (headlines, primary text), `text-muted-foreground` (body, secondary, icons in informational/denial states), `text-card-foreground` (default card text), `text-primary-foreground` (text on primary button), `text-primary` (success icon in allowed state).
  - Borders / dividers: `border-border` (separator default), `ring-ring ring-2 ring-offset-2` (focus ring).
- **Typography (Tailwind v4 + Nova preset's Geist):**
  - Headlines: `text-xl font-semibold tracking-tight text-foreground` (Geist Sans 20px semibold).
  - Body: `text-sm text-muted-foreground leading-relaxed` (Geist Sans 14px, 1.6 line-height).
  - Counter: `text-sm font-medium text-foreground`.
  - Button label: `text-sm font-medium` (Blok button default).
  - Alert description: `text-xs text-muted-foreground`.
- **Spacing (Tailwind v4 defaults):**
  - Page horizontal gutter: `px-6` (24px). Page top: `pt-6` (24px). Page bottom: `pb-8` (32px).
  - Card inner padding: `p-6` (default `@blok/card`).
  - Section eyebrow → headline: `mt-3` (12px). Headline → body: `mt-2` (8px). Body → CTA row: `mt-6` (24px). Banner → free card: `mt-4` (16px). Free card → separator: `mt-6`. Separator → gated card: `mt-6`. Icon → headline: `mt-3`.
  - CTA inter-button gap: `gap-3` (12px) (only seats-full has two CTAs — but per UI spec § 3.6 the secondary message is text-only, so this gap applies to the skeleton's two CTA placeholders).
- **Radius + shadows:** Card radius default `@blok/card`. Button + badge default. Shadows `shadow-sm` only (iframe-safe — large shadows clip at iframe edges).
- **Icons (Lucide React, all 14×14 or 32×32 sized inline, inherit `currentColor`):** `BarChart3` (free-section mock), `CircleCheck` (allowed), `CircleAlert` (no-subscription), `Users` (seats-full), `UserPlus` (unassigned), `Info` (demo banner), `TriangleAlert` (error fallback), `ExternalLink` (CTA trailing icon, 14×14).
- **Locked copy strings — verbatim from UI spec § 8:** (Developer cites this section; QA Specialist's tests assert exact match)
  - Free section eyebrow: `"Free"`
  - Free section headline: `"Inventory at a glance"`
  - Free section body: `"This is where your free tier lives. Adopters of the blueprint replace this card with a real free feature — a counter, a status tile, anything that ships value without a paid plan."`
  - Free section mock button label: `"View placeholder report"`
  - Free section mock button aria-label: `"Placeholder action — does nothing"`
  - Gated section eyebrow (all states): `"Premium"`
  - Allowed headline template: `"Welcome, {firstName}"` (with fallback chain — see § 4c-6 FR-9 layered render)
  - Allowed body template: `"Your tenant {tenantName} has full access. Replace this card with your gated feature."` (with fallback chain)
  - No-subscription headline: `"Start your subscription"`
  - No-subscription body: `"Your tenant doesn't have an active plan yet. Pick a plan to unlock the premium section."`
  - No-subscription CTA label: `"View plans"`
  - No-subscription CTA aria-label: `"View plans (opens in new tab)"`
  - No-subscription CTA href: `"https://example.com/buy"`
  - Seats-full headline: `"All seats in use"`
  - Seats-full counter template: `"{seatsTotal} of {seatsTotal} seats in use"`
  - Seats-full body: `"Ask your team admin to reassign a seat, or upgrade your plan for more."`
  - Seats-full CTA label: `"Upgrade plan"`
  - Seats-full CTA aria-label: `"Upgrade plan (opens in new tab)"`
  - Seats-full CTA href: `"https://example.com/upgrade"`
  - Unassigned headline: `"Ask your team admin"`
  - Unassigned body: `"Your tenant has a plan, but your team admin hasn't given you a seat yet."` (NO CTA)
  - Demo banner title: `"Paywall disabled — demo mode"`
  - Demo banner description: `"Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."`
  - Error fallback headline: `"Something went wrong"`
  - Error fallback body: `"Please refresh the page or try again in a moment."`
  - Topbar display label: `"Paywall Blueprint"`
- **Accessibility specifics:**
  - Free section: `role="region" aria-labelledby="free-section-heading"`.
  - Gated section: `role="region" aria-labelledby="gated-section-heading"` (id swaps per state).
  - Skeleton: `role="status" aria-live="polite" aria-label="Loading premium content"`.
  - Demo banner: `@blok/alert` already carries `role="alert"`.
  - External-link CTAs: `target="_blank" rel="noopener noreferrer"` + `aria-label="<label> (opens in new tab)"`.
  - Mock free button: `aria-label="Placeholder action — does nothing"`.
- **Motion:** 200ms `ease-out opacity + translateY(4px)` on skeleton-to-resolved transition. Gated by `prefers-reduced-motion: reduce` (motion suppressed when set).
- **Mobile:** Marketplace iframe is desktop-bound (1024–1920px wide). At <768px, the layout degrades to single-column scroll. Acceptable degradation.

### 4c-5. File / module structure and naming conventions

Per PRD § 9 (locked at PRD; not redesigned by architect) + architecture § 2.1:

```
products/paywall-blueprint/
├── README.md                                # OSS launch artifact (T047)
├── CHANGELOG.md                             # (T048)
├── LICENSE                                  # (T051)
├── CONTRIBUTING.md                          # (T052)
├── SECURITY.md                              # (T053)
├── docs/
│   ├── smoke-walkthrough.md                 # G1 screenshots (T049)
│   ├── cold-read-notes.md                   # G3 cold-reader outcome (T050)
│   └── screenshots/                         # PNGs from gate-evidence/ (T049)
├── pocs/poc-v1-prd000/                      # VISUAL SOURCE OF TRUTH (canonical)
├── project-planning/                        # All planning artifacts
│   └── architecture/sdk-fixtures/
│       ├── application-context.json         # OA-1 fixture (T013)
│       └── application-context-dts-verification.md  # T014
├── site/                                    # Next.js app root after flatten
│   ├── package.json
│   ├── next.config.mjs                      # PNA headers (T004)
│   ├── tsconfig.json                        # strict: true; vitest/globals types (T003)
│   ├── vitest.config.ts                     # (T003)
│   ├── vitest.setup.ts                      # (T003)
│   ├── .env.example                         # Documents env vars (T015 + T043)
│   ├── app/
│   │   ├── layout.tsx                       # Wraps tree in <MarketplaceProvider>
│   │   ├── page.tsx                         # Single-page layout (T009 → T035 → T040)
│   │   └── globals.css                      # Blok @theme inline tokens (Nova preset)
│   ├── components/
│   │   ├── providers/marketplace.tsx        # Scaffolded; lint-fixed at T002
│   │   ├── error-boundary.tsx               # Top-level boundary (T034)
│   │   ├── free-section.tsx                 # Always renders, no SDK reads (T009)
│   │   └── gated-section.tsx                # Wraps <PaywallGate> (T009 → T023 → T035)
│   ├── src/
│   │   └── lib/paywall/                     # PORTABLE LIBRARY — adopters fork or copy this folder
│   │       ├── PaywallGate.tsx              # FR-1 gate orchestration (T033 → T041)
│   │       ├── DemoModeBanner.tsx           # FR-6 env-flag banner (T032)
│   │       ├── types.ts                     # EntitlementStore, EntitlementSeed, EntitlementResult,
│   │       │                                #   PaymentProvider (type-only) (T017)
│   │       ├── hooks/                       # (PRD § 9; optional in PRD-000 — only useEntitlement etc.
│   │       │                                #  are referenced; gate calls store directly via useEffect
│   │       │                                #  in T033 — hooks/ folder MAY be empty in PRD-000 or
│   │       │                                #  populated with thin re-exports — Developer choice)
│   │       ├── states/
│   │       │   ├── SkeletonState.tsx        # Single generic skeleton (T027) — ADR-0007
│   │       │   ├── AllowedState.tsx         # FR-9 post-gate welcome (T031)
│   │       │   ├── NoSubscriptionState.tsx  # (T028)
│   │       │   ├── SeatsFullState.tsx       # (T029) — receives { seatsTotal } prop
│   │       │   └── UserUnassignedState.tsx  # (T030)
│   │       ├── stores/
│   │       │   ├── SupabaseStore.ts         # EntitlementStore + EntitlementSeed (T019)
│   │       │   └── index.ts                 # getDefaultStore singleton (T019)
│   │       └── index.ts                     # Public surface re-exports (Developer creates)
│   ├── scripts/
│   │   └── seed-state.ts                    # State-switcher CLI (T021)
│   └── supabase/
│       └── schema.sql                       # 3-table schema + RLS (T016)
```

**Naming conventions:**
- React components: `PascalCase.tsx` (e.g. `PaywallGate.tsx`, `AllowedState.tsx`).
- Hooks / utilities: `camelCase.ts` (e.g. `useEntitlement.ts` if added).
- Test files: co-located, `<filename>.test.{ts|tsx}` (e.g. `PaywallGate.test.tsx` next to `PaywallGate.tsx`).
- Folders: kebab-case (e.g. `gate-evidence/`, `sdk-fixtures/`).

**Cross-import rule (PRD § 9 invariant):** `src/lib/paywall/` is consumed by `app/*` and `components/*` AS IF it were an external library. NO cross-imports from `src/lib/paywall/` into `app/` or `components/`. This enforces the "library is portable" contract — adopters who copy `src/lib/paywall/` get a working unit.

### 4c-6. Integration and API contract notes

#### Marketplace SDK call shape (single call in PRD-000)

The reference app makes ONE SDK call per session: `application.context` query from inside the `MarketplaceProvider`. The scaffold already wires this in `site/components/providers/marketplace.tsx`. The gate (T033) consumes the result via `useAppContext()` — it does NOT make its own SDK call.

```typescript
// shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
// Source: sitecore:marketplace-sdk-client § 4 (base QueryMap) + § 8b (single-unwrap rule)
// VERIFY at T014 against actual .d.ts post-scaffold; update accessor chain if needed.
const result = await client.query('application.context');
const applicationContext = result.data; // ApplicationContext | undefined — SINGLE .data unwrap
```

**Unwrap level:** single `.data` (base map per `sitecore:marketplace-sdk-client § 8b`).

**Verification step (T014):** After scaffold + `npm install`, open `site/node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts` and locate the `ApplicationContext` type declaration. Compare with the assumed shape in PRD § 9 / architecture § 5.4 and the OA-1 captured fixture at `project-planning/architecture/sdk-fixtures/application-context.json`. Document divergences in `application-context-dts-verification.md`. The final accessor chain used by `AllowedState.tsx` (T031) MUST cite the `.d.ts` path inline as a code comment:

```typescript
// shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
// Verified 2026-05-13 against fixture project-planning/architecture/sdk-fixtures/application-context.json
const userName = context?.user?.name;
const userEmail = context?.user?.email;
const tenantName = context?.tenant?.name;
const tenantId = context?.tenant?.id;
```

#### Defensive layered render chain (FR-9)

Welcome state field-fallback priority chains (Developer implements in `AllowedState.tsx`):
- **First name (heading):** `context.user.name` first token (split on whitespace, take `[0]`) → fall back to `context.user.email` local part (split on `@`, take `[0]`) → fall back to literal `"there"`.
- **Tenant name (body):** `context.tenant.name` → fall back to `context.tenant.id` last 8 chars (preceded by `"…"`) → fall back to literal omission (template `"Your tenant {tenantName} has full access. ..."` collapses to `"Your tenant has full access. ..."`).

#### Supabase JS SDK contract (used by `SupabaseStore`)

```typescript
// Package: @supabase/supabase-js
// Install at T018 — version: @latest
// Three sequential calls in getEntitlement per architecture § 5.5:

// 1. Tenant select
const { data: tenant } = await db
  .from('tenants').select('status, seats_total')
  .eq('tenant_id', tenantId).maybeSingle();
if (!tenant || tenant.status !== 'active') return { status: 'tenant_no_subscription' };

// 2. Seat select
const { data: seat } = await db
  .from('seats').select('user_id')
  .eq('tenant_id', tenantId).eq('user_id', userId).maybeSingle();
if (seat) return { status: 'allowed' };

// 3. Seat count
const { count } = await db
  .from('seats').select('user_id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId);
if ((count ?? 0) >= tenant.seats_total) {
  return { status: 'tenant_active_seats_full', seatsTotal: tenant.seats_total };
}
return { status: 'tenant_active_user_unassigned' };
```

Errors propagate as thrown promise rejections (no internal try/catch). The React error boundary at T034 catches them.

#### Environment variable inventory

| Variable | Scope | Purpose | Set in |
|----------|-------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL | `.env.local` (T015) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Supabase anon key (RLS-gated reads) | `.env.local` (T015) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server / CLI only** | Used by `scripts/seed-state.ts` only | `.env.local` (T015) |
| `NEXT_PUBLIC_PAYWALL_ENABLED` | Client | Env-flag (`'true'` / `'false'`) — default `'true'` | `.env.local` (T043), `.env.example` |
| `PAYWALL_DEV_OVERRIDE_USER_ID` | **Server-only — NEVER prefixed `NEXT_PUBLIC_`** | Dev override; compile-time tree-shaken from production | `.env.local` (T043), `.env.example` |
| `OPERATOR_TENANT_ID` | CLI-local | Captured during OA-1 probe; used by `seed-state.ts` | `.env.local` (T015) |
| `OPERATOR_USER_ID` | CLI-local | Captured during OA-1 probe; used by `seed-state.ts` | `.env.local` (T015) |

`.env.example` (committed) documents all of these with placeholder values. `.env.local` (gitignored) holds real values.

#### EntitlementStore stub pattern for unit tests (T020a, T036a, T042a)

Developer (08) needs these patterns for the RED-phase tests before writing the actual implementation. Stubs are typed to the `EntitlementStore` interface from `src/lib/paywall/types.ts`.

```typescript
// Vitest pattern for stubbing EntitlementStore in unit tests
// Source: sitecore:marketplace-sdk-client § 9 + types.ts interface (defined at T017)
// Capture-and-fix flag: verify SupabaseClient .d.ts shape at T014; update stubs if needed.

import { vi } from 'vitest';
import type { EntitlementStore, EntitlementResult } from '@/lib/paywall/types';

// Helper: create a stub store that resolves with a given result
function makeStubStore(result: EntitlementResult | Error): EntitlementStore {
  return {
    getEntitlement: typeof result === 'object' && result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue(result),
  };
}

// Helper: create a store that hangs forever (deferred promise — for skeleton test)
function makePendingStore(): { store: EntitlementStore; resolve: (r: EntitlementResult) => void } {
  let resolve!: (r: EntitlementResult) => void;
  const p = new Promise<EntitlementResult>((res) => { resolve = res; });
  return { store: { getEntitlement: vi.fn().mockReturnValue(p) }, resolve };
}

// Mock useAppContext() — wrap in vi.mock('@/components/providers/marketplace') before each test
function mockAppContext(ctx: Partial<{ user: object; tenant: object }> | null) {
  return vi.mocked(useAppContext).mockReturnValue(ctx as ReturnType<typeof useAppContext>);
}
```

The above stub code lives in `site/src/lib/paywall/__tests__/helpers.ts` (or inlined per-test). It is NOT production code.

**Fixture provenance:** Pre-Tranche A, shapes are sourced from `sitecore:marketplace-sdk-client` skill content (progressive capture model — operator preference 2026-05-10). Post-Tranche A, verify against `node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts` at T014 and update stubs in `application-context-dts-verification.md` if divergences found. Tests citing `.d.ts` shapes must include the inline comment:

```typescript
// source: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
// capture-and-fix: verify shape at T014; update stub if .d.ts diverges from assumed shape
```

#### Cloud Portal custom-app registration (per architecture § 6.3 + ADR-0006)

Operator action between T007 and T012:

| Field | Dev value | Prod value |
|-------|-----------|------------|
| App name | `Paywall Blueprint (Test)` | `Paywall Blueprint` |
| App URL | `https://localhost:3000` | Vercel-assigned URL (post-deploy) |
| Extension points | `xmc:fullscreen` only | Same |
| Route URL | `/` | Same |
| API access | Minimal (`application.context` read only — NO XMC scopes) | Same |
| Authorization type | Portal-brokered (default for 4a) | Same |
| App type | **Custom** (per ADR-0006) | Custom |

### 4c-7. Parity / rebuild pointers

**N/A — greenfield.**

Reference: `products/paywall-blueprint/pocs/poc-v1-prd000/` is the visual source of truth (canonical click-dummy for look-and-feel), NOT a rebuild target. The clickdummy was generated from the UI spec; it is not a prior production artifact. PRD-000 does not rebuild any existing system — it scaffolds a new Next.js app from `sitecore:setup-marketplace-client-side`.

---

## 5. Dependencies

### Ordering constraints

1. **Scaffold MUST run first (T001)** — `node_modules` populated, `app/`, `components/`, `lib/` directories materialized. All downstream tasks depend transitively on this.
2. **Lint fixes (T002) before test stack (T003)** — scaffold ships with two lint errors that block `npm run lint`; install the test runner AFTER fixing them.
3. **`.d.ts` verification (T014) before context-consuming code (T023, T031, T033)** — confirms the `ApplicationContext` shape pre-Tranche-B per architecture § 10 verification gate. Developer cites the `.d.ts` path inline.
4. **Supabase project + schema (T015, T016) before adapter (T019)** — adapter queries a real schema.
5. **Adapter (T019) before CLI (T021)** — CLI binds to `EntitlementSeed`.
6. **State components (T027–T031) before gate (T033)** — gate switches on entitlement status and renders one of them.
7. **Gate (T033) before integration (T035)** — page composition depends on the gate component.
8. **Error boundary (T034) before integration (T035)** — page composition wraps the gated section in the boundary.
9. **All Tranche C tasks before Tranche D wiring (T040, T041)** — env flag + dev override extend the gate component built in T033.
10. **Tranche D verification (T045) before Tranche D gate (T046)** — DCE grep proves compile-time elimination worked.
11. **All Tranche A–D gates passed before Tranche E** — README + CHANGELOG + smoke-walkthrough document outcomes from earlier tranches.
12. **G3 cold-read (T050) requires README (T047) to exist first** — cold-reader reads the README only.
13. **PR (T055) before public flip (T056)** — open the PR while repo is still private; flip to public THEN merge.

### Execution order (numbered — Tranche A → B → C → D → E with intra-tranche dependency ordering)

1. T001 — Scaffold
2. T002 — Lint fixes
3. T003 — Vitest test stack
4. T004 — PNA headers in next.config.mjs
5. T005 — Install Blok composite components
6. T006 — mkcert pre-flight (documentation only — HTTP suffices for Mode A)
7. T007 — Register custom app in Cloud Portal
8. T008 — Map extension point to route
9. T009 — Build single-page layout shell (FreeSection + hardcoded Gated)
10. T010 — Unit test: layout renders both sections
11. T011 — Verify Tranche A build
12. T012 — **Tranche A operator gate: real-tenant iframe install**
13. T013 — OA-1: operator runs `application.context` probe
14. T014 — Pre-Tranche-B SDK `.d.ts` verification
15. T015 — Stand up Supabase + capture credentials
16. T016 — Create `supabase/schema.sql`
17. T017 — Implement `EntitlementStore` / `EntitlementSeed` / `EntitlementResult` / `PaymentProvider` types
18. T018 — Install `@supabase/supabase-js`
19. T019 — Implement `SupabaseStore` adapter + singleton factory
20. T020 — Unit tests: `SupabaseStore.getEntitlement` decision tree
21. T021 — Implement state-switcher CLI
22. T022 — Integration test: `seed-state.ts` against test Supabase
23. T023 — Wire post-gate welcome to read `application.context` with defensive layered render
24. T024 — Unit test: defensive layered render fallback chain
25. T025 — Verify Tranche B build + tests
26. T026 — **Tranche B operator gate: real-tenant welcome with actual identity**
27. T027 — Implement `SkeletonState.tsx`
28. T028 — Implement `NoSubscriptionState.tsx`
29. T029 — Implement `SeatsFullState.tsx`
30. T030 — Implement `UserUnassignedState.tsx`
31. T031 — Refactor existing welcome into `AllowedState.tsx`
32. T032 — Implement `DemoModeBanner.tsx` skeleton
33. T033 — Implement `<PaywallGate>` component (FR-1 step-by-step)
34. T034 — Implement top-level React error boundary
35. T035 — Integrate `<PaywallGate>` into the single-page layout
36. T036 — Unit tests: `<PaywallGate>` state-resolution decision tree
37. T037 — Component tests: four UX state components + skeleton render locked copy
38. T038 — Verify Tranche C build + tests
39. T039 — **Tranche C CHALLENGE GATE operator review**
40. T040 — Wire env-flag check + integrate `<DemoModeBanner>` into the layout
41. T041 — Wire dev-override compile-time guard
42. T042 — Unit test: dev-override matches + non-matches
43. T043 — Update `.env.example` with both env vars documented
44. T044 — Verify Tranche D build + tests
45. T045 — Post-build grep verification (compile-time DCE confirmation)
46. T046 — **Tranche D operator gate: env-flag toggle + dev override on real tenant**
47. T047 — Write top-level README with adoption guide
48. T048 — Write `CHANGELOG.md` PRD-000 entry
49. T049 — Write `docs/smoke-walkthrough.md` with screenshots
50. T050 — G3 cold-read identification + run
51. T051 — Add MIT license file
52. T052 — Add `CONTRIBUTING.md` stub
53. T053 — Add `SECURITY.md` stub
54. T054 — Final repo polish + verify all artifacts
55. T055 — Open PR `prd-000` → `main`
56. T056 — **Flip GitHub repo to public visibility (SHIP MOMENT)**

### Parallel groups

PRD-000 has strong sequential dependencies driven by the 5-tranche operator-gate model — most tasks are linear. Limited parallelism is possible WITHIN tranches:

```
Group A1 (sequential — scaffold foundation): T001 → T002 → T003
Group A2 (parallel after T003 — independent additions): T004, T005
Group A3 (sequential — Cloud Portal + extension routing): T007 → T008
   - T006 (mkcert documentation) parallel to T007 since it's docs-only
Group A4 (sequential — layout + tests): T009 → T010 → T011 → T012

Group B1 (sequential — fixture + verification): T013 → T014
Group B2 (parallel after T013 — independent foundations): T015 → T016, T017, T018
Group B3 (sequential — adapter chain): T019 → T020
Group B4 (sequential — CLI chain): T021 → T022
Group B5 (sequential — wiring + tests): T023 → T024 → T025 → T026

Group C1 (parallel after T017 + T005 — independent state components): T027, T028, T029, T030, T032
Group C2 (sequential — refactor depends on T023): T031
Group C3 (sequential — gate composition): T033 (depends on T019, T027-T031) → T034 → T035 → T036, T037 (parallel) → T038 → T039

Group D1 (parallel — independent wiring): T040, T041, T043
Group D2 (sequential — tests + verification): T042 → T044 → T045 → T046

Group E1 (parallel after T046 — independent docs): T047, T048, T051, T052, T053
Group E2 (sequential — depends on T047 + T039 + T046): T049 (screenshots), T050 (cold-read)
Group E3 (sequential — final): T054 → T055 → T056
```

**The Team Lead MAY spawn parallel Developer agents for groups C1 (five independent state components) and E1 (five independent doc files) when total task count justifies it.** All other groups are too tightly coupled for meaningful parallelism.

---

## 6. Suggested Milestones

1. **Milestone 1 — Tranche A passed (T012):** App installs in real Sitecore tenant; Blok layout renders in iframe.
2. **Milestone 2 — Tranche B passed (T026):** Context-grounded welcome renders with operator's real identity.
3. **Milestone 3 — Tranche C CHALLENGE GATE passed (T039):** All four UX states + error boundary reviewed against scored rubric.
4. **Milestone 4 — Tranche D passed (T046):** Env-flag + dev override work on real tenant; post-build DCE verified.
5. **Milestone 5 — PRD-000 SHIPPED (T056):** GitHub repo public, PR merged, all three G1/G2/G3 ship gates met.

## 7. Risk Areas

Inherited from PRD § 13 + architecture § 9 — see those documents for full mitigations. Implementation-specific risks:

- **R-T014:** `.d.ts` verification reveals field-path divergence from architecture's assumed shape. Defensive layered render (FR-9) absorbs the risk. If the divergence is structural (e.g. tenant identity lives under `resourceAccess[0].tenantId` instead of `context.tenant.id`), update T023 / T031 to use the verified path BEFORE Tranche B gate.
- **R-T041:** Compile-time DCE fails if the `process.env.NODE_ENV` literal is not used in EXACT form. Webpack's static-replacement only catches `process.env.NODE_ENV` written as the literal expression. The T045 post-build grep is the verification gate.
- **R-T039 hard-fail:** CHALLENGE GATE may loop back. Build the four state components carefully against the UI spec § 8 locked copy to reduce the rewrite risk.
- **R-T050 cold-read fail:** Cold-reader can't identify the swap-points. Risk mitigation: when writing README at T047, explicitly name `src/lib/paywall/types.ts` as the swap-point home + use a diagrammatic illustration if helpful. Re-run with a fresh reader on failure.
- **R-Blok-empty-states:** `@blok/empty-states` may not install (composite outside quickstart). T005 inventory + T034 fallback compose path handles this.

## 8. Suggested Team Structure

Single Developer (08) implements the full plan with operator at the gates. QA Specialist (07) enriches this file with § 9 + § 10 after Lead Developer hands off. Architect re-engages only if T014 reveals a structural shape mismatch requiring an architecture amendment.

The operator owns: T007 (Cloud Portal registration), T012 (Tranche A gate), T013 (OA-1 probe), T015 (Supabase setup), T026 / T039 / T046 (Tranche gates), T050 (G3 cold-read coordination), T055 / T056 (PR + public flip).

The Developer owns all code-implementation tasks.

## 9. TDD and quality contract

### 9.1 RED → GREEN → REFACTOR mandate

Every implementation task that produces production code in `src/` MUST follow test-first ordering:

1. **RED** — Author the failing test FIRST as its own task (typically a `<TID>a` task: `T010a`, `T020a`, `T024a`, `T032a`, `T034a`, `T036a`, `T037a`, `T042a`, `T045a`). Verify the test fails for the stated reason — not because the import resolves wrong or syntax errors. The failure must be the assertion, not the harness.
2. **GREEN** — Author the simplest production code that makes the failing test pass (the paired `<TID>` or `<TID>b` task). Resist adding behavior beyond what the test demands.
3. **REFACTOR** — After GREEN, restructure for clarity / DRY / readability while keeping all tests passing. Refactor is implicit in every implementation task — not a separate task ID.

Tasks exempt from RED-before-GREEN are explicitly labeled `[docs-only]` or `[setup-only]` in § 4. These include: scaffold installation (T001), lint fixes (T002), test stack install (T003), config files (T004), package installs (T005, T018), CLI registration (T007), manifest updates (T008), Supabase project creation (T015), schema file (T016) — schema correctness is tested by T020a's GREEN, not by a separate schema-level test; CLI script (T021) — covered by T022 integration test; docs / README / CHANGELOG (T047–T053, T055); license (T051); ship-moment repo flip (T056). All other production-code tasks fall under TDD.

### 9.2 Fixture provenance rule (progressive capture)

RED tests against external SDK shapes must cite their fixture provenance inline as a code comment at the top of the test file. One of three is acceptable:

- **`.d.ts` citation** (preferred — post-Tranche-A): `// fixture source: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext`. Available after T001 scaffold completes.
- **Skill content citation** (pre-Tranche-A or when `.d.ts` is opaque): `// fixture source: sitecore:marketplace-sdk-client § 4 (base QueryMap) + skill snapshot 2026-05-13. CAPTURE-AND-FIX flag — verify against .d.ts post-T001.`
- **Captured-shape JSON** (post-T013 OA-1 probe outcome): `// fixture source: products/paywall-blueprint/project-planning/architecture/sdk-fixtures/application-context.json (captured 2026-05-13 from tenant <id>).`

Capture-and-fix-on-divergence is the operator's stated working style. If a RED test's fixture turns out to mismatch reality at runtime, the test must be updated AND the fixture re-captured to the `sdk-fixtures/` directory in the same commit.

### 9.3 Meaningful tests only

Every test asserts behavior users (adopters or end-users) can observe. Trivial tests are forbidden:

- ❌ `renders without crashing` (means nothing).
- ❌ `props are passed through` (compiler verifies via TypeScript).
- ❌ `snapshot matches previous snapshot` (asserts staleness, not correctness).
- ✓ `renders the exact locked copy string "Start your subscription"` (asserts the copy contract adopters inherit).
- ✓ `falls back to email when name is missing` (asserts FR-9 priority chain).
- ✓ `error boundary preserves the free section when gate throws` (asserts NFR-6 guarantee).
- ✓ `post-build grep of .next/ for PAYWALL_DEV_OVERRIDE_USER_ID returns zero matches` (asserts compile-time DCE actually fires).

### 9.4 Coverage targets

- **`<PaywallGate>` state-resolution decision tree** — ≥ 80% branch coverage on the 4 `EntitlementResult` variants + skeleton/loading + throw branches (PRD NFR-7). Enforced via `vitest --coverage` and visible in CI output (when CI lands; PRD-000 has no CI per architecture § 6 — operator runs locally).
- **All four state components** — 100% locked-copy assertion coverage. Every visible string in every state must have a `getByText` or `toHaveTextContent` assertion. Copy is the adopter-inherited contract.
- **Defensive layered render (FR-9)** — every priority-chain branch tested (name → email → "there"; tenant.name → truncated id → "your tenant").

### 9.5 Accessibility contract (NFR-2 + ADR-0007/0008 runtime)

Beyond per-state assertions, the following accessibility invariants are testable as their own meaningful tests:

- **WCAG AA contrast — automated axe-core audit** per state component (4 states + free section + demo banner + error fallback). Zero `serious` / `critical` violations per state. Tool: `vitest-axe` or `@axe-core/playwright`. Locate per-state at `src/lib/paywall/states/<State>.a11y.test.tsx`.
- **Runtime contrast — Nova-preset primary-foreground substitution check** — UI spec § 4 substitutes `hsl(var(--background))` for `primary-foreground` on `@blok/badge--default` and `@blok/button--default` to dodge dark-mode collapse. A runtime contrast assertion in BOTH light AND dark mode verifies this substitution still produces ≥ 4.5:1 contrast against the button's background. If Blok tokens drift, this test fails and protects the UX. Test type: `a11y` runtime contrast. Locate at `src/lib/paywall/blok-token-contrast.test.tsx`.
- **Keyboard navigation** — for each state with interactive elements (`NoSubscriptionState`, `SeatsFullState`), `userEvent.tab()` lands focus on the primary CTA; visible focus ring renders (verifiable via `:focus-visible` style assertion in JSDOM `getComputedStyle`, or via Playwright E2E). Locate at `src/lib/paywall/states/<State>.keyboard.test.tsx`.

### 9.6 Build-level tests

Two tests are not unit/integration but build-level — they assert the build output, not runtime behavior:

- **Compile-time DCE** — T045 / T045a. After `npm run build`, grep `.next/` for `PAYWALL_DEV_OVERRIDE_USER_ID`. Expected: zero matches. Tooling: a bash one-liner test in `scripts/test-dce.sh` invoked by an `npm run test:dce` script. T045a (RED) asserts the test exists and fails initially; T041 (GREEN) wires the compile-time guard so the build output no longer contains the literal.
- **Final green build regression** — T054. `npm run typecheck && npm run lint && npm run build && npm run test` all exit 0. No `--no-verify` shortcuts. This is the ship-moment gate.

### 9.7 Smoke / operator-action tests (per-tranche gates)

Five tests are operator-run, not automated:

- **T012** — Tranche A iframe smoke. Real-tenant install; visual check that page renders + Blok chrome correct + both sections visible at 1024×768.
- **T014** — Pre-Tranche-B SDK `.d.ts` verification. Operator opens `node_modules/@sitecore-marketplace-sdk/client/dist/*.d.ts` after scaffold and compares to architecture § 5.4.
- **T026** — Tranche B welcome smoke. Seeded "allowed" entitlement → real tenant → confirms operator's actual identity + tenant name renders.
- **T039** — Tranche C **CHALLENGE GATE** scored rubric (PRD § 12). 4 UX state walkthrough via `pnpm seed:state` + error boundary trigger + 5-question scoring (copy quality bar, skeleton cleanliness, CTA unambiguity, freemium layout, error boundary correctness). Each scored pass / soft-fail / hard-fail. Soft-fail logged as `/code-review` follow-up; any hard-fail = loop back into Tranche C.
- **T046** — Tranche D env-flag + dev-override smoke. Toggle env-flag on/off; banner appears/disappears. Production-build grep returns zero matches (verifies DCE worked in practice, not just theory).

### 9.8 Host-frame visual smoke (post-T039, optional but recommended)

Per `sitecore:marketplace-sdk-host-frame-testing`: visual diff between the live Marketplace app (clipped iframe inside real Cloud Portal) and the POC clickdummy at `pocs/poc-v1-prd000/state-allowed.html` served via `npx serve`. Five axes: layout, typography, color, component anatomy, state fidelity. Operator action; Playwright-driven. Not a ship gate for PRD-000 (qualitative), but caught design drift in prior projects (Component Usage Atlas S10). Recommended after T039 passes.

## 10. Per-task test specifications

§ 4b above contains the consolidated per-epic test list, traceable to Task IDs. Section 10 supplements with the additional accessibility and build-level tests § 9.5–§ 9.6 introduces, the file-location convention, and fixture-provenance pointers for each test family.

### 10.1 File-location convention

| Test family | Location convention | Runner |
|------------|---------------------|--------|
| Component unit + UI tests | `src/lib/paywall/<Component>.test.tsx` | Vitest + @testing-library/react |
| State-component locked-copy tests | `src/lib/paywall/states/<State>.test.tsx` | Vitest + @testing-library/react |
| State-component a11y tests | `src/lib/paywall/states/<State>.a11y.test.tsx` | Vitest + vitest-axe |
| State-component keyboard tests | `src/lib/paywall/states/<State>.keyboard.test.tsx` | Vitest + @testing-library/user-event |
| Blok runtime-contrast test | `src/lib/paywall/blok-token-contrast.test.tsx` | Vitest + getComputedStyle |
| Store unit tests | `src/lib/paywall/stores/<Store>.test.ts` | Vitest |
| Store integration tests | `src/lib/paywall/stores/<Store>.integration.test.ts` (skip when no `.env.local`) | Vitest |
| Gate component tests | `src/lib/paywall/PaywallGate.test.tsx` | Vitest + @testing-library/react |
| Error boundary tests | `src/components/error-boundary.test.tsx` | Vitest + @testing-library/react |
| Page-level layout tests | `src/app/page.test.tsx` | Vitest + @testing-library/react |
| DCE build test | `scripts/test-dce.sh` invoked via `npm run test:dce` | bash + grep |
| Host-frame visual smoke | `tests/visual/host-frame.spec.ts` | Playwright (optional / post-T039) |

### 10.2 Mandatory accessibility tests (additions to § 4b)

These were not enumerated in § 4b; they trace to PRD NFR-2 and UI spec § 4 (Nova-preset substitution):

- **axe-core audit per state** — 4 tests, one per `<State>`. Renders the state into a JSDOM container; runs `axe.run()`; asserts zero `serious` / `critical` violations. Type: `a11y`. Locate: `src/lib/paywall/states/<State>.a11y.test.tsx`. Trace: NFR-2. Tasks: T037a (RED) — extend the existing a/b pair to also include the a11y assertion files.
- **Blok runtime contrast — primary-foreground substitution** — single test that mounts each `@blok/button--default` and `@blok/badge--default` instance in both light AND dark mode (toggle `.dark` on `documentElement`); reads computed background + foreground via `getComputedStyle`; asserts contrast ratio ≥ 4.5:1 (WCAG AA normal text) and ≥ 3:1 (WCAG AA large text where applicable). Type: `a11y`. Locate: `src/lib/paywall/blok-token-contrast.test.tsx`. Trace: UI spec § 4 + NFR-2 + ADR-0007. Task: T037a — add this test scenario to the RED batch.
- **Keyboard navigation per interactive state** — 2 tests (`NoSubscriptionState`, `SeatsFullState` — `UserUnassignedState` has no CTA, `AllowedState` no CTA). `userEvent.tab()` from a baseline focus point; assert focus lands on the primary CTA; assert `:focus-visible` styles match Blok focus tokens. Type: `a11y`. Locate: `src/lib/paywall/states/<State>.keyboard.test.tsx`. Trace: NFR-2 (keyboard-navigable, visible focus rings). Task: T037a.

### 10.3 Build-level tests (additions to § 4b)

- **DCE grep (compile-time guard verification)** — already in § 4b at T045a (RED) / T045 (GREEN-verifying). Reaffirmed here for completeness. The grep script lives at `scripts/test-dce.sh`. Invoked via `npm run test:dce`. Asserts `! grep -r "PAYWALL_DEV_OVERRIDE_USER_ID" .next/`. Reformulated as a positive grep expecting an exit 1 from grep would also work. Trace: NFR-5 + ADR-0004 + PRD § 12 Tranche D gate.
- **Final green-build regression — T054** — `npm run typecheck && npm run lint && npm run build && npm run test && npm run test:dce` all exit 0. The `test:dce` step is what makes this regression also assert the dev-override is correctly tree-shaken in EVERY build, not just once at T045.

### 10.4 Smoke / operator-action specs (additions to § 4b)

Per § 9.7 the five operator gates are enumerated. Here is the recordkeeping contract — each operator gate produces an artifact in the manifest's `smoke_outcomes` per `.agent/manifests/run-manifest.template.json` schema 6:

| Task | category | Artifact required | manifest key suggestion |
|------|----------|-------------------|--------------------------|
| T012 | `host_frame_smoke` | Screenshot of iframe in Cloud Portal | `smoke_outcomes.tranche_a_iframe` |
| T014 | `other` (SDK contract) | `sdk-fixtures/application-context-dts-verification.md` | `smoke_outcomes.sdk_contract_verification` |
| T026 | `live_walkthrough` | Screenshot of welcome with actual identity | `smoke_outcomes.tranche_b_welcome` |
| T039 | `host_frame_smoke` + `live_walkthrough` | 4 state screenshots + error-boundary screenshot + scored rubric | `smoke_outcomes.tranche_c_challenge` |
| T046 | `live_walkthrough` | Screenshot of banner appearing + production-build grep transcript | `smoke_outcomes.tranche_d_env_flag` |

Each entry's `outcome` is `pending` until the operator runs the gate, then `passed | failed | pass_with_caveats`. Soft-fail items at T039 are recorded as `pass_with_caveats` with `notes` describing the soft-fail.

### 10.5 Test count by type

| Type | Count | Source |
|------|-------|--------|
| `unit` | 26 | layout (1), Supabase store (5), defensive render (6), gate state resolution (6), gate other paths (3), state-component locked copy (4), banner copy (2), dev override (3) |
| `integration` | 4 | seed-state CLI (1), error boundary (1), gate-throws-in-boundary (1), env-flag false path (1) |
| `UI / component` | 6 | env-flag toggle (2), banner non-dismissible (1), external-link CTAs (1), skeleton aria (1), free section (1) |
| `a11y` | 6 | axe per state × 4, Blok contrast, keyboard nav × 2 (counts to 7 — Blok contrast also asserts a11y) |
| `build` | 4 | lint exit 0 (T002/T011), test exit 0 (T003), DCE grep (T045), final green build (T054) |
| `smoke / operator-action` | 5 | T012, T014, T026, T039, T046 |
| `smoke / visual (optional)` | 1 | Host-frame against POC (post-T039) |

Total **52 test scenarios** across **9 task families** (T010a, T020a, T022, T024a, T032a, T034a, T036a, T037a, T042a, T045a).

### 10.6 Open items the Developer (08) needs the operator to resolve before Tranche B

- **OA-1 / T013** — Operator runs 5-min `application.context` probe and commits `sdk-fixtures/application-context.json`. Defensive layered render (FR-9) is the safety net if the probe is delayed.
- **T014** — Operator opens `node_modules/@sitecore-marketplace-sdk/client/dist/*.d.ts` post-T001 scaffold and verifies `ApplicationContext` shape vs architecture § 5.4. If divergence, T020a fixture provenance flips from skill-content citation to `.d.ts` citation in the same commit.
- **G3 cold-reader** — Operator names cold-reader before Tranche E (T050).

---

## ADR candidates surfaced during task breakdown

None. All architectural commitments made during planning are already captured in ADR-0001 through ADR-0010. The single decision that COULD warrant an ADR — "single-package `@supabase/supabase-js` direct from iframe (no API-route mediator), relying on RLS as the boundary" — is already implied by ADR-0005 (4a client-side) + ADR-0009 (RLS posture). No new ADR proposed.

## Open ambiguities for the QA Specialist to resolve

1. **TDD ordering for the state components.** The four UX state components (T027–T031) are pure-rendering components with locked copy. QA may choose either test-first (assert locked copy strings first; component fails until implemented) OR test-after (current default). Recommendation: test-first on these — the locked-copy invariants make assertions extremely concrete.
2. **Integration test for `seed-state.ts` (T022) — skip vs require.** The test is currently skip-when-no-`.env.local`. QA may prefer to require it run in a CI environment that provides `.env.local` from secrets. PRD-000 has no CI/CD per architecture § 6 — leaving as skip-default; QA can flip if they add a CI step.
3. **Visual regression for the four states.** Not currently in the test list. QA may want to add Playwright + Percy / Chromatic snapshots against the POC clickdummy (`pocs/poc-v1-prd000/state-*.html` files) as a regression net. Out of PRD-000 scope as currently spec'd.
4. **Performance assertions (NFR-1 — gate within 2s, free section within 1s).** Currently no automated test asserts these timing thresholds. QA may add a Playwright trace or a Vitest perf-marker. If added, locate at Tranche C end (after T037).

## Handoff Metadata

- **Canonical run manifest:** `products/paywall-blueprint/project-planning/workflow/run-20260513T093404Z.json`
- **Source PRD:** `products/paywall-blueprint/project-planning/PRD/prd-000.md`
- **Source architecture:** `products/paywall-blueprint/project-planning/architecture/architecture-20260513T093404Z.md`
- **Selected UI spec:** `products/paywall-blueprint/project-planning/ui-design/ui-design-20260513T093404Z-v1.md`
- **Visual source of truth (POC):** `products/paywall-blueprint/pocs/poc-v1-prd000/`
- **Recommended next command:** `/task-breakdown` continues with **QA Specialist (07)** enrichment — populates § 9 (TDD contract) and § 10 (per-task test specs), may reorder tests to test-first where TDD applies, and snapshots this file at `canonical_artifacts.task_breakdown_pre_qa` before the QA edits.
- **Recommended next input file:** N/A — QA Specialist edits this file in place.
