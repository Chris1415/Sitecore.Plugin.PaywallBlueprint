# Development Execution Plan — PRD-002 Bento-grid pretty UI redesign

---
document_type: task_breakdown
artifact_name: task-breakdown-20260517T223000Z.md
generated_at: 2026-05-18T00:55:00Z
run_manifest: project-planning/workflow/run-20260517T223000Z.json
source_inputs:
  - products/paywall-blueprint/project-planning/PRD/prd-002.md
  - products/paywall-blueprint/project-planning/PRD/prd-minimal-002.md  # Developer 08 orientation only
  - products/paywall-blueprint/project-planning/architecture/architecture-20260517T223000Z.md
  - products/paywall-blueprint/project-planning/ui-design/ui-design-20260517T223000Z-v2.md  # SELECTED
  - products/paywall-blueprint/pocs/poc-v2-prd002/  # winning POC (visual source of truth)
  - products/paywall-blueprint/project-planning/ADR/adr-0016 … adr-0018 (PRD-002 ADRs)
  - products/paywall-blueprint/project-planning/ADR/adr-0001 … adr-0015 (inherited)
consumed_by:
  - QA Specialist (07) enriches this file in-place (§ 9, § 10, RED-before-GREEN reordering)
  - Developer Code Monkey (08) implements from this file + prd-minimal-002.md only
next_input:
  - products/paywall-blueprint/project-planning/plans/qa-report.md (optional on minimal; declined here — track is full but operator may decline standalone report)
---

> **Ground-truth reconciliation (binding).** The PRD § 6/§ 7 and architecture § 2b reference F4 = `<RecentActivity>` (Supabase `processed_events`) and F5 = `<ExtensionPointsCard>`. The operator iterated during UI design (manifest `stage_history.ui_ready`): F4 became **`<UserProfile>`** (host.user — avatar/initials/name/email/sub) and F5 became **`<TenantInfo>`** (application.context strip — displayName/tenantId/organization/environment). **ADR-0017 (processed_events.tenant_id column) is DEFERRED.** No schema migration, no webhook handler edit in PRD-002. UI v2 § 7 + `pocs/poc-v2-prd002/index.html` are the canonical card inventory. This task breakdown implements that inventory.

## 1. Implementation Overview

PRD-002 is a UI-shell delta on top of the shipped paywall-blueprint product. The monetization spine (Stripe Checkout, webhook, `useEntitlement`, `<PaywallCheckoutDialog>`, `/paywall-return`) is untouched. Five deliverables:

1. **Theme system** — wire `<ThemeProvider>` (next-themes; already installed at v0.4.6) into the root layout that today renders `/full-page`; add `<ThemeToggle>` to the Topbar `rightSideItems[]`.
2. **Bento shell** — new `<BentoGrid>` at `site/components/bento/bento-grid.tsx` replaces `<FreeSection> + <Separator> + <GatedSectionWithDevPicker>` inside `app/full-page/page.tsx`. CSS Grid 4-col masonry with `grid-template-areas` at desktop; 2-col at tablet; 1-col at mobile.
3. **Free cards (5, real data)** — `<WelcomeHero>` (F1), `<SitesTile>` (F2 — one new SDK call), `<PlanCard>` (F3), `<UserProfile>` (F4), `<TenantInfo>` (F5). F1/F4/F5 are client components that read from `useHostUser` / `useAppContext` already-resolved by `MarketplaceProvider`. F3 is server-rendered via existing `SupabaseStore.getEntitlement`. F2 is client-side `client.query('xmc.sites.listSites')`.
4. **Premium tier (6, ALL FAKE)** — `<ActivityChart>` (P1, Recharts lazy-loaded), `<ContentDistribution>` (P2, 4 progress bars), `<RecentEdits>` (P3, 5-row Sitecore-flavored list), `<CmsHealth>` (P4, 4-KPI strip with counters), `<SitecoreContentInsights>` (P5, 3 bullets), `<ContentHealthScore>` (P6, ring + sparkline). **Zero fetches at any state** per ADR-0018; locked state mounts `<PremiumPlaceholder>` skeleton silhouettes.
5. **Locked state UX** — `.premium-section` wrapper contains `.premium-region` (blurred children) AND `<SubscribeBanner>` (sibling — NOT child — so banner is not rasterized by the blur filter; this was the POC-time fix called out in UI v2 § 7 "Critical bug fixed during POC generation"). Stagger-in cascade on unlock uses `.bento-card--premium:nth-child(N)` with **100ms steps** (v2 override of FR-5.2's nominal 80ms) and `@keyframes fadeUp`.

**No schema migrations. No new API routes. No webhook handler changes.** Two new deps: `recharts` (NEW install) and `next-themes` (already installed v0.4.6 — verified in `site/package.json`).

**Slim context guarantee.** This file + `prd-minimal-002.md` are sufficient for Developer 08. SDK shapes are cited from `node_modules` `.d.ts` inline in § 4c-6. POC clickdummy at `pocs/poc-v2-prd002/` is the visual reference; when this spec disagrees with the POC on look-and-feel, the POC wins.

## 2. Epics

| Epic | Description | Tranche |
|---|---|---|
| **E1 — Theme system & foundation** | Recharts install, ThemeProvider wiring, ThemeToggle in topbar, `test:no-hex-in-bento` script, bento.css with grid templates + keyframes | A |
| **E2 — BentoGrid shell + 5 free cards** | `<BentoGrid>` orchestrator, F1–F5 components, server-rendered F3 data fetch, `app/full-page/page.tsx` rewrite | B |
| **E3 — Locked premium state** | `<PremiumPlaceholder>`, P1–P6 component skeletons in locked mode, `.premium-section` + `.premium-region` + `<SubscribeBanner>` (sibling layout), corner Premium badges, blur+shimmer CSS | C |
| **E4 — Unlock animations + premium fake content** | P1–P6 unlocked content + animations (stagger-in, Recharts area, progress bar scaleX, rAF counters, SVG ring/sparkline), Recharts lazy-load, prefers-reduced-motion, theme reactivity | D |
| **E5 — Adopter docs + ship** | README "Customizing the bento" + "Production hardening for adopters", CHANGELOG `[0.3.0]`, smoke-walkthrough refresh, public API barrel, regression sweep, PR | E |

## 3. Feature Breakdown

E1 spans **foundation primitives** that every later component depends on. E2 ships the free row to real-tenant smoke (Gate B). E3 ships the locked state (Gate C); the bento is end-to-end visible without animation. E4 finishes the unlock celebration (Gate D real-money smoke). E5 closes with docs + PR (Gate E ship). Each tranche has an explicit operator real-tenant gate at the end; see § 5 Execution order and § 6 Suggested Milestones.

## 4. Task Breakdown

> Ordering note: the list below is the Lead Developer's default test-after sequence. QA Specialist (07) will rewrite per-task `Depends on` in step 2 of `/task-breakdown` to enforce RED → GREEN where TDD applies. Task IDs are stable; if QA splits a task into RED/GREEN it will use suffixes (e.g. `T012a`, `T012b`).

### Tranche A — Foundation

- **Task ID:** T001
  - **Title:** OA-002-1 — Cloud Portal scope pre-flight (operator gate, not code)
  - **Description:** Operator opens Cloud Portal → App Studio → paywall-blueprint app → API access. Verify `xmc.sites.*` (read) is enabled. If unavailable / named differently / requires approval, capture the actual scope name and route back through `/architect` or update PRD § 9 + this breakdown's § 4c-6. Fallback (R1): F2 ships with the "Not available" state copy; PRD-002 still ships Sitecore-data-light.
  - **Expected Output:** Operator confirms scope is enabled (or routes to fallback). Append confirmation to manifest `operator_attention[]` resolving OA-002-1.
  - **Depends on:** none

- **Task ID:** T002
  - **Title:** Install `recharts` and verify `next-themes` in `site/`
  - **Description:** From `products/paywall-blueprint/site/`, run `npm install recharts`. Capture the pinned version into `package.json`. Confirm `next-themes` already at `^0.4.6` (verified in this plan — no install needed). Run `npm ls recharts next-themes` to confirm both resolve cleanly.
  - **Expected Output:** `package.json` dependencies updated with `recharts`. `npm ls` shows both packages. `package-lock.json` updated.
  - **Depends on:** none

- **Task ID:** T003
  - **Title:** Wire `<ThemeProvider>` so `/full-page` is themed
  - **Description:** `site/components/theme-provider.tsx` already exists (next-themes wrapper, `attribute="class"`, `defaultTheme="system"`, `enableSystem`). The root `app/layout.tsx` does NOT currently wrap children in it; it must wrap children at the root so the Topbar dev affordances and any future `/` content also theme correctly. Add the import + wrap the inner `<body>` children in `<ThemeProvider>{children}</ThemeProvider>`. The MarketplaceProvider in `app/full-page/layout.tsx` is unaffected — `<ThemeProvider>` sits above it.
  - **Expected Output:** `app/layout.tsx` wraps children in `<ThemeProvider>`. `<html lang="en" suppressHydrationWarning>` flag added to silence the next-themes class-mutation warning (canonical pattern). Existing tests still green.
  - **Depends on:** T002

- **Task ID:** T004
  - **Title:** Create `<ThemeToggle>` component
  - **Description:** New file `site/components/theme-toggle.tsx`. `"use client"`. Uses `useTheme()` from `next-themes`. Renders a button with the current-theme icon (`Sun` / `Moon` / `Monitor` from `lucide-react`) that opens a Radix dropdown menu (via the existing `@/components/ui` shadcn primitive — verify presence; if missing run `npx shadcn@latest add dropdown-menu` first) with 3 options: Light / Dark / System. Use the **mounted-guard pattern** (`const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`) — render a neutral fallback icon (`Monitor`) until `mounted === true` to avoid the hydration mismatch trap captured in `feedback_hydration_mismatch_pattern.md`. **NO `typeof window` branches, NO `matchMedia` calls, NO browser-global reads in render or `useState` initializer.** `aria-label="Toggle theme"` on the trigger; explicit text labels on each menu item.
  - **Expected Output:** New file `site/components/theme-toggle.tsx` exporting `ThemeToggle`. Renders the correct icon for each `resolvedTheme`. Persists choice via next-themes localStorage (`theme` key, default behavior). Focus ring `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`. Component file < ~120 lines.
  - **Depends on:** T003

- **Task ID:** T005
  - **Title:** Mount `<ThemeToggle>` in Topbar's `rightSideItems[]`
  - **Description:** In `app/full-page/page.tsx`, build the `rightSideItems` array passed to `<Topbar>`. The current call passes `rightSideItems={[]}` and renders `<TenantIdBadge>` + `<PaywallVersionOverride>` as siblings inside `<main>`. PRD-002 needs the dev affordances + theme toggle inside the topbar's right side per UI v2 § 4. Pass three entries: `{ id: 'theme', content: <ThemeToggle /> }`, `{ id: 'tenant-id', content: <TenantIdBadge /> }`, `{ id: 'paywall-version', content: <PaywallVersionOverride /> }`. Remove the now-duplicate `<TenantIdBadge>` and `<PaywallVersionOverride>` from inside `<main>`. (Stable Task ID expectation: this is the single source of truth for those dev affordances post-PRD-002.)
  - **Expected Output:** Topbar right side shows ThemeToggle (first), then tenant id badge, then paywall version override. Clicking the theme toggle opens the dropdown; selecting a value re-themes the page. Existing tests for `<TenantIdBadge>` and `<PaywallVersionOverride>` still green.
  - **Depends on:** T004

- **Task ID:** T006
  - **Title:** Add `test:no-hex-in-bento` script + `package.json` wiring (NFR-9)
  - **Description:** Create `site/scripts/test-no-hex-in-bento.sh` (POSIX bash) that runs ripgrep (or grep) over `site/components/bento/**/*.{ts,tsx,css}` and `site/components/theme-toggle.tsx` for the regex `#[0-9a-fA-F]{3,8}`. Exit code 1 on any match (with the file:line printout); exit 0 otherwise. Whitelist `currentColor` and `hsl(var(--…))` by virtue of the regex not matching them. Wire into `package.json` scripts as `"test:no-hex-in-bento": "bash scripts/test-no-hex-in-bento.sh"`. Add it to the aggregated `test` flow in CI-equivalent runs (mention in PR body, no CI YAML edit needed — Vercel uses the existing `npm test`).
  - **Expected Output:** New script file. New npm script entry. Running `npm run test:no-hex-in-bento` from `site/` exits 0 against an empty `site/components/bento/` directory (or fails meaningfully once a hex slips in).
  - **Depends on:** none

- **Task ID:** T007
  - **Title:** Create `site/components/bento/` directory + `site/styles/bento.css` (grid templates, keyframes, stagger delays)
  - **Description:** Make `site/components/bento/` empty directory (cards are added in later tranches). Create `site/styles/bento.css` (or co-locate the CSS in `app/full-page/full-page.module.css` if the project already prefers modules — verify; current codebase uses `app/globals.css` + Tailwind, so a fresh `site/styles/bento.css` imported by the BentoGrid component is the cleaner addition). Contents per UI v2 § 6:
    - `.bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: minmax(200px, auto) minmax(200px, auto) minmax(140px, auto) minmax(260px, auto) minmax(200px, auto) minmax(200px, auto); grid-template-areas: "f1 f1 f2 f3" "f1 f1 f4 f4" "f5 f5 f5 f5" "p1 p1 p2 p3" "p4 p4 p4 p4" "p5 p5 p6 p6"; gap: var(--spacing-4); padding: var(--spacing-6); max-width: 1440px; margin-inline: auto; }` plus per-card `grid-area` selectors via `[data-card="..."]`.
    - Tablet `@media (min-width:768px) and (max-width:1023.98px)` 2-col template per UI v2 § 6.
    - Mobile `@media (max-width:767.98px)` 1-col template.
    - `@keyframes fadeUp` from `{opacity:0; transform: translateY(16px)}` to `{opacity:1; transform: translateY(0)}`.
    - `.bento-card--premium { animation: fadeUp 600ms ease-out forwards; opacity: 0; }` with `:nth-child(N)` delays `0/100/200/300/400/500ms` (v2 override of FR-5.2's nominal 80ms).
    - `.premium-region--locked { filter: blur(12px) opacity(0.7); pointer-events: none; position: relative; }`.
    - `.premium-region--locked::before` shimmer overlay with `linear-gradient(90deg, transparent, hsl(var(--muted) / 0.12), transparent)` and `@keyframes shimmer` 3s loop.
    - `@media (prefers-reduced-motion: reduce)` block removing all animations.
    - **Zero hex literals.** Use `hsl(var(--…))` or `currentColor` for every color. `test:no-hex-in-bento` (T006) is the gate.
  - **Expected Output:** `site/styles/bento.css` exists with the full spec above. `site/components/bento/` directory exists (may be empty). `npm run test:no-hex-in-bento` is green (empty bento dir; CSS file checked too).
  - **Depends on:** T006

- **Task ID:** T008
  - **Title:** Gate A — operator real-tenant smoke (theme toggle works; recharts installed; no-hex script green)
  - **Description:** Operator opens the dev `/full-page` (or deploys a preview branch), clicks the new ThemeToggle (light/dark/system cycles). Confirms no console errors, no hydration warnings. Runs `npm run test:no-hex-in-bento` locally; green. Confirms `npm ls recharts` shows installed. Screenshot proofs in both themes attached to the run manifest `smoke_outcomes` for Gate A.
  - **Expected Output:** `smoke_outcomes.gate_a: { outcome: 'passed', evidence: '<screenshot refs>', notes: '...' }` in the run manifest. Stage history `tranche_a_complete`.
  - **Depends on:** T005, T007

### Tranche B — Free bento cards

- **Task ID:** T010
  - **Title:** `<BentoGrid>` shell component (orchestrator; DOM=reading order; locked branch)
  - **Description:** New file `site/components/bento/bento-grid.tsx`. `"use client"`. Imports `bento.css` (or `import './bento.css'` at module-top so Next bundles it). Props shape per UI v2 § 6 (the JSX assertion block):
    ```ts
    interface BentoGridProps {
      tenantsRow: { plan: string; status: string; created_at: string } | null;
      // (in Tranche C wiring) entitlementState: 'loading' | 'allowed' | 'tenant_no_subscription' | …
    }
    ```
    Renders children in DOM order F1 → F2 → F3 → F4 → F5 → `<div className={isLocked ? 'premium-region--locked' : 'premium-region'} aria-hidden={isLocked}>` containing P1 → P2 → P3 → P4 → P5 → P6, then `{isLocked && <SubscribeBanner />}` as a sibling of the premium-region wrapper (NOT a child — POC v2 § 7 "Critical bug fixed"). The whole composition is wrapped in `<div className="premium-section">` which contains the premium-region wrapper + the banner. Each card gets a `data-card="f1"` (etc.) attribute matching the grid-template-areas. In Tranche B the locked-state branch is NOT YET wired — leave a `const isLocked = false;` constant and TODO comment. Tranche C (T030) wires `useEntitlement`.
  - **Expected Output:** New file. Imports stub cards (will be created in T011–T016). Default export `BentoGrid`. The premium region is rendered but premium cards are placeholders for Tranche B; this task is purely the orchestration shell.
  - **Depends on:** T007

- **Task ID:** T011
  - **Title:** `<WelcomeHero>` (F1) component
  - **Description:** New file `site/components/bento/welcome-hero.tsx`. `"use client"`. Reads `useHostUser()` (existing helper from `@/components/providers/marketplace`) for `given_name` / `name` / `email`. Reads `useAppContext()` for `resourceAccess?.[0]?.tenantDisplayName`. Reuses the existing `pickUserDisplay()` chain — find it in `site/src/lib/paywall/` or `site/components/free-section.tsx`; if it lives in `free-section.tsx`, extract it to `site/src/lib/paywall/pickUserDisplay.ts` as a small shared util in this task (and update `free-section.tsx`'s import) — single source of truth. Per UI v2 § 4 F1: hero greeting `text-4xl font-semibold text-foreground`: `Welcome, {displayName}.`; tenant line `text-lg text-muted-foreground`: `{tenantDisplayName}`; `<Separator />`; footer flex row with `<Badge>` plan tag + `<User />` lucide icon. Plan tag value comes from props (passed by `<BentoGrid>` once it receives `tenantsRow.plan`); fallback `"Free plan"`. Padding `p-8`. Uses semantic tokens only (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`). No hex literals.
  - **Expected Output:** New file. Renders the hero card per UI v2 § 4 F1 + POC `pocs/poc-v2-prd002/index.html` welcome-hero section. Existing pickUserDisplay tests still green.
  - **Depends on:** T010

- **Task ID:** T013a
  - **Title:** RED tests for `<SitesTile>` — loading + success + empty + error + retry (TDD: write BEFORE T012)
  - **Description:** New file `site/components/bento/sites-tile.test.tsx`. Vitest + Testing Library. These tests MUST be written and confirmed RED before T012 implements the component. Mock `useMarketplaceClient` to return a `client` with a `query` method that the test controls (resolve / reject / return empty array). Mock `useAppContext` to return a fixture with `resourceAccess[0].context.live = 'CTX-TEST'`. Five test cases: (1) renders `<Skeleton>` on mount before the promise resolves; (2) renders count + first 2 site names on success with 5 sites; (3) renders empty-state copy on success with 0 sites; (4) renders `<Alert>` + Retry button on rejected promise; (5) clicking Retry re-invokes `client.query` (assert call count = 2). Cover BOTH envelope shapes per § 4c-6 ambiguity: one suite branch uses `{ data: Sites.Site[] }` (single-unwrap) and one asserts the double-unwrap branch is not silently swallowed. **Fixture provenance (mandatory):** mocked `Sites.Site` shape sourced directly from `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964`; cite inline as `// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site`.
  - **Expected Output:** Failing (RED) test file with 5 annotated test cases. All fail because `<SitesTile>` does not yet exist.
  - **Depends on:** T010

- **Task ID:** T012
  - **Title:** `<SitesTile>` (F2) component — only new SDK call (GREEN against T013a)
  - **Description:** New file `site/components/bento/sites-tile.tsx`. `"use client"`. Calls `client.query('xmc.sites.listSites', { params: { query: { sitecoreContextId } } })` where `client` comes from `useMarketplaceClient()` and `sitecoreContextId` comes from `appCtx.resourceAccess?.[0]?.context?.live` (per architecture § 5c; `.live` chosen because sites card surfaces published sites). Guard `sitecoreContextId`; do NOT cast. Four discriminated-union states: `loading` (Blok `<Skeleton>`), `success` (count + up to 2 names truncated with ellipsis + `…and N more` muted), `empty` (copy "No sites in this tenant yet — create one in XM Cloud to see it here." per FR-2.2), `error` (variant=`destructive` `<Alert>` + `<XCircle />` + Retry button that re-triggers the fetch). Use `useEffect` + `cancelled` cleanup pattern from architecture § 5c sample. **No `as never` / `as any` cast.** Card layout per UI v2 § 4 F2: `<Globe />` icon + small "Sites" label, count in `text-3xl font-bold`, up to 2 names beneath. Padding `p-5`.
  - **Expected Output:** New file. Renders the four states correctly. T013a passes GREEN. Uses Blok semantic tokens only. SDK call types resolve through `@sitecore-marketplace-sdk/xmc` Sites namespace (see § 4c-6).
  - **Depends on:** T013a

- **Task ID:** T013
  - **Title:** REFACTOR + additional edge-case tests for `<SitesTile>` (post-GREEN hardening)
  - **Description:** After T012 turns T013a green: (1) refactor the component to extract the `useEffect` fetch logic into a named function for readability; (2) add a 6th test case: `sitecoreContextId` is `undefined` → component renders an error/unavailable state without calling `client.query`; (3) add a 7th test case: component unmounts before the promise resolves — assert no state-update warning (cancelled cleanup). All 7 tests green.
  - **Expected Output:** Refined test file with 7 cases all green. Component refactored. No regressions.
  - **Depends on:** T012

- **Task ID:** T014
  - **Title:** `<PlanCard>` (F3) component (server-rendered via existing SupabaseStore)
  - **Description:** F3 reads the existing `tenants` row. The cleanest path: keep F3 a server-rendered card whose data is fetched at the page level (`app/full-page/page.tsx`) using `SupabaseStore.getEntitlement(tenantId, '')` (existing PRD-000 method). However — `app/full-page/page.tsx` is currently an **async server component** with no SDK access (the `tenantId` lives in the iframe URL search params `marketplaceAppTenantId`, see `app/full-page/page.tsx:34` PageProps shape comment, OR comes from `useAppContext` on the client). For PRD-002, do this: extract the `tenantId` from `searchParams.marketplaceAppTenantId` (the Cloud Portal pattern documented in `sitecore:marketplace-sdk-extension-routes`), fetch `tenants` row server-side in `app/full-page/page.tsx`, pass it as a prop to `<BentoGrid tenantsRow={...} />`. `<PlanCard>` itself is a **client component** that receives `{ plan, status, created_at }` as props and renders per UI v2 § 4 F3: small "Plan" label, `text-2xl font-semibold` plan name (`"Free"` or `"Premium"`), `<Separator />`, `"Member since {Month DD, YYYY}"` (format via `Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`), optional active-status `<Badge>`. If `tenantsRow` is `null` (no Supabase row yet) render `plan="Free"`, `status="—"`, `member_since="—"`.
  - **Expected Output:** New file `site/components/bento/plan-card.tsx`. `app/full-page/page.tsx` updated to fetch `tenants` row server-side using `SupabaseStore` import path (verify the existing module path — likely `@/src/lib/paywall/stores/SupabaseStore` or similar; cite the import in 4c-5 once located). Renders correct date formatting + null fallback.
  - **Depends on:** T010

- **Task ID:** T015
  - **Title:** `<UserProfile>` (F4) component — replaces deprecated RecentActivity from PRD § 7
  - **Description:** New file `site/components/bento/user-profile.tsx`. `"use client"`. Reads `useHostUser()`. Renders the structure from POC `pocs/poc-v2-prd002/index.html` lines 167–183 (search for `data-card="f4"`): avatar circle on the left (CSS `bg-muted` 48×48 with initials derived from `given_name + family_name` or `name` first letter — fallback to `?`), name `text-foreground font-semibold`, email `text-muted-foreground text-sm`, Auth0 `sub` in `text-muted-foreground text-xs font-mono` truncated to `auth0|abc123def456gh789ij…` style (first 22 chars + ellipsis). Padding `p-5`. Semantic tokens only. **No hex.**
  - **Expected Output:** New file. Renders all four lines correctly. Initial-derivation handles missing names gracefully.
  - **Depends on:** T010

- **Task ID:** T016
  - **Title:** `<TenantInfo>` (F5) component — replaces deprecated ExtensionPointsCard from PRD § 7
  - **Description:** New file `site/components/bento/tenant-info.tsx`. `"use client"`. Reads `useAppContext()`. Renders a full-width 4-cell key/value strip per POC `pocs/poc-v2-prd002/index.html` lines 186–215: title row with `<Plug />` lucide icon + "Tenant info" + small count or status indicator on the right. Beneath, a flex/grid layout with 4 cells:
    - **Display name** — `application.context.resourceAccess?.[0]?.tenantDisplayName ?? '—'`
    - **Tenant ID** — short form (first 8 + `…` + last 4) of `application.context.marketplaceAppTenantId`, in `font-mono`
    - **Organization** — `application.context.resourceAccess?.[0]?.organizationName ?? '—'` (if available — check `.d.ts`; if the field name differs, capture the actual key at smoke and update inline)
    - **Environment** — `application.context.resourceAccess?.[0]?.environmentName ?? application.context.resourceAccess?.[0]?.context?.live ?? '—'`
    Each cell stacks `text-xs text-muted-foreground` label above `text-sm text-foreground` value. Height 140px (matches the F5 grid-area row). Padding `p-5`.
  - **Expected Output:** New file. Renders correctly when all four fields are present; renders `—` for missing fields without crashing.
  - **Depends on:** T010

- **Task ID:** T017
  - **Title:** Replace `<FreeSection> + <Separator> + <GatedSectionWithDevPicker>` with `<BentoGrid>` in `app/full-page/page.tsx`
  - **Description:** Edit `site/app/full-page/page.tsx`. Replace the body inside `<main>` (lines 63–82) with `<BentoGrid tenantsRow={tenantsRow} />`. Add the server-side Supabase fetch above the return statement to build `tenantsRow`. Keep the `<DemoModeBanner>` env-flag gate as-is (above the `<main>` block). The `tenantId` comes from `searchParams.marketplaceAppTenantId` (already a query param per Cloud Portal patterns). **Important:** `<FreeSection>`, `<GatedSectionWithDevPicker>`, `<TenantIdBadge>` (used inside `<main>`), `<PaywallVersionOverride>` (used inside `<main>`), and `<Separator>` imports are no longer needed in this file (the dev affordances now live in Topbar's `rightSideItems[]` per T005). Remove the now-unused imports. **DO NOT delete the underlying components** (`free-section.tsx`, `gated-section.tsx`, etc.) — they remain in the codebase as design-reference for `seats-full` / `unassigned` paths per PRD-002 § FR-1.4. Update the README "States" section in Tranche E.
  - **Expected Output:** `app/full-page/page.tsx` now renders `<Topbar … />` + optional `<DemoModeBanner />` + `<main><BentoGrid /></main>`. Existing `page.test.tsx` likely needs updates — adjust assertions to look for the new structure (this is a test-update task, not a deletion).
  - **Depends on:** T005, T010, T011, T012, T014, T015, T016

- **Task ID:** T018a
  - **Title:** RED tests for F1 `<WelcomeHero>`, F4 `<UserProfile>`, F5 `<TenantInfo>` (TDD: write BEFORE T011/T015/T016)
  - **Description:** New test files `welcome-hero.test.tsx`, `user-profile.test.tsx`, `tenant-info.test.tsx` written BEFORE the component implementations. These tests will FAIL (RED) until the components are implemented. For each component: (1) renders without crashing with mocked `useHostUser` / `useAppContext`; (2) renders fallback `—` when name/context fields are absent; (3) runtime contrast assertion — NOT `toHaveClass("bg-card")` alone; use `getComputedStyle(el).backgroundColor` + `color` and assert the ratio meets WCAG AA (4.5:1 for normal text, 3:1 for large text) via a contrast helper or `jest-axe` configured with the contrast rule. This is the QuickCopy `--primary-foreground` collapse trap guard; a `toHaveClass("text-foreground")` assertion passes even when the token pair collapses in a given theme. (4) F5-specific: assert `marketplaceAppTenantId` is truncated to `xxxxxxxx…xxxx` form (8 + ellipsis + 4 chars). (5) F4-specific: assert initial-derivation for `given_name + family_name` produces correct uppercase initials; fallback to `name[0]`; fallback to `?`.
  - **Expected Output:** Three RED test files. All fail because components do not exist yet.
  - **Depends on:** T010

- **Task ID:** T018
  - **Title:** Unit tests GREEN + REFACTOR for F1, F4, F5 (prop rendering + runtime contrast + theme-token use)
  - **Description:** This task is the GREEN + REFACTOR phase for T018a. After T011, T015, T016 are implemented, confirm all T018a tests pass. Then add: runtime contrast assertions using `getComputedStyle(el).color` + `backgroundColor` against the resolved palette (see § 4c-3 axe-core snippet). Assert AA compliance — NOT just class presence. If a test finds the `--primary-foreground` pair collapses in dark mode (known Nova preset risk), add an `operator_attention[]` entry immediately (do not silently pass). Each test file covers at least: happy path, missing-fields fallback, runtime contrast in the test-renderer's simulated light theme (dark-mode contrast must be caught at Playwright Gate B).
  - **Expected Output:** Three test files green. Runtime contrast assertions in place. No `it.todo(...)` placeholders remaining.
  - **Depends on:** T011, T015, T016, T018a

- **Task ID:** T019
  - **Title:** Free-tier theme + responsive Playwright smoke (visual)
  - **Description:** Add a Playwright spec at `site/tests/e2e/bento-free-tier.spec.ts` (verify Playwright config exists; if not, install `@playwright/test` + minimal config under `site/`). Boot the dev server (`npm run dev`), navigate to `https://localhost:3000/full-page?marketplaceAppTenantId=test-tenant&previewState=allowed` (use the existing preview-state mechanism to bypass paywall for visual checks). For desktop (1440×900), tablet (900×800), mobile (390×844): take a screenshot in light theme; flip via ThemeToggle; screenshot dark theme. Assert no console errors (`page.on('console', …)`). Store screenshots under `site/tests/e2e/__screenshots__/bento-free-*`.
  - **Expected Output:** Playwright spec passes locally. 6 baseline screenshots committed.
  - **Depends on:** T017, T018

- **Task ID:** T020
  - **Title:** Gate B — operator real-tenant smoke (free row live + themed)
  - **Description:** Operator opens live `/full-page` via Cloud Portal. Confirms: (a) F1 hero shows real `given_name` + `tenantDisplayName`; (b) F2 shows real sites count + names (if scope enabled per T001) OR empty/error fallback (if not); (c) F3 shows real `plan` + `Member since`; (d) F4 shows real user profile (initials/name/email/sub); (e) F5 shows tenant info strip with real values; (f) ThemeToggle works on every card. Screenshots in both themes attached to manifest `smoke_outcomes.gate_b`.
  - **Expected Output:** `smoke_outcomes.gate_b.outcome = 'passed'` (or `'pass_with_caveats'` if F2 hit the R1 fallback path).
  - **Depends on:** T017, T019

### Tranche C — Locked premium

- **Task ID:** T025
  - **Title:** `<PremiumPlaceholder>` skeleton silhouette component
  - **Description:** New file `site/components/bento/premium-placeholder.tsx`. `"use client"`. Accepts a `shape` prop: `'chart' | 'progress-bars' | 'list' | 'kpi-strip' | 'bullets' | 'ring-sparkline'`. Each shape renders a different `<Skeleton>` arrangement that hints at the eventual card's structure WITHOUT containing any data. Chart shape: a wide rectangle plus a wavy SVG silhouette suggesting chart shape (per UI v2 § 4 P1 locked state). Progress-bars shape: 3 stacked thin rectangles. List shape: 5 rows with avatar circle + 2 text bars. KPI strip: 4 inline blocks. Bullets: 3 short text bars. Ring-sparkline: a circle outline + a wavy line. All shapes use `<Skeleton>` (Blok primitive — verify present; if missing `npx shadcn@latest add skeleton` first) which uses `bg-muted` token. **Zero hex.** Size matches the parent card's grid area (relative units; let the grid sizing drive height).
  - **Expected Output:** New file with one switch on `shape`. Six shape variants render correctly.
  - **Depends on:** T010

- **Task ID:** T026
  - **Title:** Premium card stubs (P1–P6) — locked-state placeholder, unlocked-state TODO
  - **Description:** Create six files: `site/components/bento/activity-chart.tsx` (P1), `content-distribution.tsx` (P2), `recent-edits.tsx` (P3), `cms-health.tsx` (P4), `sitecore-content-insights.tsx` (P5), `content-health-score.tsx` (P6). Each accepts a `locked: boolean` prop. When `locked === true`, render `<PremiumPlaceholder shape="..."/>` with the appropriate shape. When `locked === false`, render a TODO comment + a temporary placeholder visual (the same `<PremiumPlaceholder>` for now — Tranche D adds the real fake-data content). **NO fetches in any state** per ADR-0018; verify the file contains no `fetch`, no `client.query`, no `supabase.` references — `test:no-hex-in-bento` could be extended (T048) to also assert this. Each card also accepts an optional `className` for the corner Premium badge wrapping. Card outer = `<Card>` from `@/components/ui/card` (Blok shadcn).
  - **Expected Output:** Six new files. Each renders a placeholder shape in locked state; renders the same placeholder in unlocked state with a TODO marker for Tranche D.
  - **Depends on:** T025

- **Task ID:** T027
  - **Title:** `<SubscribeBanner>` component
  - **Description:** New file `site/components/bento/subscribe-banner.tsx`. `"use client"`. Renders the banner per UI v2 § locked-state + POC `pocs/poc-v2-prd002/index.html` lines 506–537. Title `text-4xl font-semibold text-foreground` "Unlock Premium". Sub-headline `text-2xl text-foreground` "€0.99 lifetime". Subtitle `text-base text-muted-foreground` "One-time payment. Lifetime access. No subscription." `<Lock />` lucide icon in `text-primary text-3xl` above the title. Primary `<Button size="lg">` "Subscribe — €0.99 lifetime" — clicking it opens the existing `<PaywallCheckoutDialog>`. Wire the dialog via local `useState` open/close, OR via the existing dialog trigger pattern used in `<GatedSectionWithDevPicker>` — match that pattern. **Button label color:** prefer `text-background` per the `--primary-foreground` collapse pitfall in `sitecore:blok-theming`; verify at Tranche D smoke. Banner shell: `bg-card` + `ring-2 ring-primary` + `shadow-lg`. Glow via `box-shadow: 0 0 0 1px hsl(var(--primary) / 0.4), 0 20px 40px -10px hsl(var(--primary) / 0.25)` — no hex. Position: absolute over the premium-region (sibling, not child) per UI v2 § 6 absolute-positioning recipe; the simpler implementation pattern is **`.premium-section { position: relative }`** + banner `position: absolute; inset: <computed>;` OR follow the POC's exact CSS in `pocs/poc-v2-prd002/styles.css` — when spec text and POC diverge, **POC wins**.
  - **Expected Output:** New file. Banner renders with all copy + button + glow. Clicking button opens the `<PaywallCheckoutDialog>`. `aria-labelledby` set on banner pointing to title's id.
  - **Depends on:** T026

- **Task ID:** T028
  - **Title:** Premium corner "Premium" badges on each P1–P6
  - **Description:** Each premium card component (T026) gets a small absolute-positioned `<Badge variant="primary">` in its top-right corner with a `<Lock />` icon + "Premium" label. `position: absolute; top: var(--spacing-3); right: var(--spacing-3); z-index: 5` (above blur, below banner per UI v2 § locked-state spec). The badge is visible in the locked state because it's positioned ABOVE the blur wrapper's filter — verify this by giving the badge its own stacking context (`isolation: isolate` or `z-index` on the badge's own element). On unlock, the badge stays (visual marker for the premium tier even when accessible).
  - **Expected Output:** Each of P1–P6 renders the Premium badge in locked AND unlocked state. Badge readable above blur.
  - **Depends on:** T026

- **Task ID:** T029
  - **Title:** Wire `useEntitlement` into `<BentoGrid>` to switch locked/unlocked
  - **Description:** In `bento-grid.tsx` (created at T010), replace the temporary `const isLocked = false` with `const { entitlement } = useEntitlement();` and `const isLocked = entitlement?.status !== 'allowed';`. The `<div className={isLocked ? 'premium-region--locked' : 'premium-region'} aria-hidden={isLocked}>` and `{isLocked && <SubscribeBanner />}` are now driven by the hook. Verify `useEntitlement` is exported from `@/src/lib/paywall` (it is — see `site/src/lib/paywall/index.ts:46`). The hook reads from `MarketplaceProvider`'s host.user + app.context resolution and polls `/api/entitlement` every 60s. Locked → blur + banner + 6 placeholders. Allowed → no blur + premium cards mount in unlocked mode (Tranche D fills the real content).
  - **Expected Output:** `<BentoGrid>` now switches between locked/unlocked based on real entitlement. With no Supabase row → locked. After paying €0.99 → allowed.
  - **Depends on:** T026, T027

- **Task ID:** T030
  - **Title:** Manual readability check at Tranche C — blur depth + shimmer subtlety
  - **Description:** Operator opens `/full-page` with locked entitlement. Verifies: (a) text within blurred premium region is **unreadable from 50cm at typical viewport zoom** (FR-6.1); (b) the 6 Premium corner badges are readable above the blur; (c) the Subscribe banner is readable (not rasterized by the blur — POC v2 § 7 "Critical bug fixed"); (d) shimmer overlay subtle (low opacity); (e) all visually coherent in both light + dark themes. If any fails, escalate via `operator_attention[]`.
  - **Expected Output:** Manual smoke result recorded in `smoke_outcomes.gate_c.notes`.
  - **Depends on:** T029

- **Task ID:** T031a
  - **Title:** RED tests for locked-state (BentoGrid, PremiumPlaceholder, SubscribeBanner) — TDD: write BEFORE T025-T029
  - **Description:** New test files `bento-grid.test.tsx`, `premium-placeholder.test.tsx`, `subscribe-banner.test.tsx` written BEFORE implementations. All must be RED. BentoGrid RED tests: (a) with `useEntitlement` mocked to `{ status: 'tenant_no_subscription' }` — asserts 6 placeholder silhouettes, `<SubscribeBanner>` mounted, `aria-hidden="true"` on `.premium-region--locked` wrapper, banner is a SIBLING of `.premium-region` inside `.premium-section` (parent traversal assertion); (b) with `{ status: 'allowed' }` — 6 cards locked=false, no banner, no `aria-hidden`. PremiumPlaceholder RED tests: each of 6 shape variants renders the expected Skeleton count. SubscribeBanner RED test: renders with title "Unlock Premium" + sub-headline + Subscribe button; clicking button opens `<PaywallCheckoutDialog>` (assert dialog opened). Runtime contrast assertion on the banner CTA button — `getComputedStyle(btn).color` must NOT equal `getComputedStyle(btn).backgroundColor` (catches `--primary-foreground` collapse).
  - **Expected Output:** Three RED test files. All fail because components do not yet exist.
  - **Depends on:** T010

- **Task ID:** T031
  - **Title:** Unit tests GREEN + REFACTOR for locked-state (BentoGrid, PremiumPlaceholder, SubscribeBanner)
  - **Description:** GREEN phase for T031a after T025–T029 are implemented. Confirm all T031a assertions pass. Then refactor: collapse duplicated mock setups into shared `renderBentoGrid(status)` test helpers. Add one additional case: `SubscribeBanner` keyboard navigation — trigger button via `Enter` key, assert dialog opens (WCAG keyboard accessibility). All tests must remain meaningful — no `expect(true).toBe(true)` placeholders.
  - **Expected Output:** Three test files green. Refactored helpers. Keyboard navigation case added.
  - **Depends on:** T029, T031a

- **Task ID:** T032
  - **Title:** Gate C — operator real-tenant smoke (locked premium + banner + blur)
  - **Description:** Operator with `no subscription` opens `/full-page`. Confirms: bento renders 5 free cards + 6 blurred placeholder silhouettes + centered Subscribe banner + 6 Premium corner badges. Click Subscribe → existing `PaywallCheckoutDialog` opens (PRD-001 flow). No console errors. Screenshot proof both themes.
  - **Expected Output:** `smoke_outcomes.gate_c.outcome = 'passed'`.
  - **Depends on:** T029, T030, T031

### Tranche D — Unlock animations + AllowedState premium content

- **Task ID:** T040
  - **Title:** `<ActivityChart>` (P1) — Recharts lazy-loaded area chart
  - **Description:** Replace the unlocked-state TODO in `site/components/bento/activity-chart.tsx` (T026) with real Recharts content. Implementation pattern: split into two files — `activity-chart.tsx` (the small wrapper that branches on `locked`) and `activity-chart-recharts.tsx` (the heavy Recharts content). The wrapper uses `const ActivityChartRecharts = lazy(() => import('./activity-chart-recharts'))` and `<Suspense fallback={<PremiumPlaceholder shape="chart" />}>` so the Recharts ~80–100kb gzip cost is paid only on AllowedState first paint. Content: hardcoded 30-day daily counts (deterministic — e.g., `Array.from({length: 30}, (_, i) => ({ day: i, count: 40 + Math.round(20 * Math.sin(i / 4)) + (i % 7 < 5 ? 10 : 0) }))`). Recharts `<AreaChart>` with `<ResponsiveContainer>`, `<Area>` `stroke={'hsl(var(--primary))'}`, `fill={'hsl(var(--primary) / 0.18)'}`, `<XAxis>` `tick={{ fill: 'hsl(var(--muted-foreground))' }}`, `<CartesianGrid stroke={'hsl(var(--border))'}>`, `isAnimationActive={true}` + `animationDuration={800}`. To get theme reactivity: `const { resolvedTheme } = useTheme();` and pass `key={resolvedTheme}` to `<ResponsiveContainer>` to force a remount on theme flip (per UI v2 OQ-v2-4). Title row: `<TrendingUp />` icon + "Publishing activity" + `<Badge variant="secondary">+12% vs prev</Badge>` per POC card content (UI v2 § 7 delta). **Hardcoded data; ZERO fetches.**
  - **Expected Output:** Two files. Free-tier Network panel shows no Recharts chunk fetched in locked state. Unlocked-state path fetches the chunk; chart draws in over 800ms. Theme flip recolors the chart correctly.
  - **Depends on:** T026

- **Task ID:** T041
  - **Title:** `<ContentDistribution>` (P2) — 4 progress bars by template type
  - **Description:** Replace the unlocked-state placeholder in `content-distribution.tsx`. Per UI v2 § 7 delta (P2 changed from generic Content health to Content distribution): 4 stacked rows with `<Progress>` (Blok primitive — `npx shadcn@latest add progress` if missing) values: Pages 47%, Datasources 34%, Components 18%, Forms 9%. Each row: label `text-foreground text-sm` left, percentage `font-semibold` right, `<Progress value={…}>` below. **Animated fill:** when the card mounts in unlocked state, fill bars from 0 → target over 800ms ease-out, with **200ms staggered delays between bars** (so the 3 bars feel intentional, not simultaneous). Implementation: a small `useEffect` + `setTimeout` per bar that flips a `currentValue` from 0 to target; pass `currentValue` to `<Progress value={currentValue}>`. **Hardcoded; ZERO fetches.** Title: `<CheckCircle2 />` icon + "Content distribution"; subtitle "Items by template type".
  - **Expected Output:** Unlocked-state file. Bars fill on mount with stagger. Counts: Pages 124 (47%) / Datasources 89 (34%) / Components 47 (18%) / Forms 23 (9%) per PRD-002 § 5 P2 table.
  - **Depends on:** T026

- **Task ID:** T042
  - **Title:** `<RecentEdits>` (P3) — 5-row Sitecore-flavored list
  - **Description:** Replace the unlocked-state placeholder in `recent-edits.tsx`. 5 static list rows from PRD-002 § 5 P3 table:
    1. "Marketing Site · Homepage hero — 2h ago — CH"
    2. "Blog · Post template — yesterday — AB"
    3. "Company Site · Footer datasource — 2d ago — CH"
    4. "Product Catalog · Featured product card — 3d ago — MS"
    5. "Marketing Site · Career page meta — 4d ago — AB"
    Each row: small fake-avatar circle (CSS `bg-muted` 24×24 with author initials in `text-muted-foreground`), 2-line text on the right (action in `text-foreground text-sm`, relative time in `text-muted-foreground text-xs`). Title: `<Sparkles />` icon + "Recent edits"; subtitle "Across all sites". **Hardcoded array; ZERO fetches.**
  - **Expected Output:** Unlocked-state file. 5 rows render with the exact text above.
  - **Depends on:** T026

- **Task ID:** T043a
  - **Title:** RED tests for `useCounter` hook + `<CmsHealth>` (TDD: write BEFORE T043)
  - **Description:** New file `site/lib/use-counter.test.ts`. Tests the `useCounter(target, durationMs)` hook in isolation using Vitest fake timers: (1) initial value is 0; (2) after `durationMs` elapses the value equals `target`; (3) with `prefers-reduced-motion: reduce` mocked (via `Object.defineProperty(window, 'matchMedia', ...)`) the hook returns `target` immediately on first tick without animation. Also add `site/components/bento/cms-health.test.tsx` RED test: with `locked=false`, asserts 4 KPI labels render ("Total pages", "Published this week", "Languages", "Stale items") and the final hardcoded values are present in the DOM within a `waitFor` / fake-timer advance. All tests RED until T043 implements the hook + component.
  - **Expected Output:** Two RED test files. Fail because hook and component do not yet exist.
  - **Depends on:** T026

- **Task ID:** T043
  - **Title:** `<CmsHealth>` (P4) — 4-KPI strip with rAF counter animation (GREEN against T043a)
  - **Description:** Replace the unlocked-state placeholder in `cms-health.tsx`. 4 inline KPI tiles per PRD-002 § 5 P4 + UI v2 § 4 P4: Total pages 489 / Published this week 12 / Languages 4 / Stale items 23 (sub-label "Not updated in 90+ days"). Each tile: KPI value `text-4xl font-bold text-foreground`, label `text-xs text-muted-foreground`. **Counter animation:** on unlocked mount, animate each KPI from 0 → final via `requestAnimationFrame` over 600ms ease-out (FR-5.5). Single hook `useCounter(target: number, durationMs: number = 600)` returning the current value; format-aware (integer counts up to integer values; "4m 32s" not needed for this card since all 4 values are integers; languages 4 too). Respect `prefers-reduced-motion: reduce` (skip to final immediately). Stale items tile includes `<Activity />` or `<TrendingUp />` lucide icon as a decorative indicator. **Hardcoded values; ZERO fetches.**
  - **Expected Output:** Unlocked-state file with `useCounter` hook (co-located or in `site/lib/use-counter.ts`). 4 KPIs tick on mount; values settle at hardcoded finals. T043a passes GREEN.
  - **Depends on:** T043a

- **Task ID:** T044
  - **Title:** `<SitecoreContentInsights>` (P5) — 3 hardcoded bullets
  - **Description:** Replace the unlocked-state placeholder in `sitecore-content-insights.tsx`. 3 bulleted lines from PRD-002 § 5 P5 (operator-iterated Sitecore-flavored copy):
    1. "Your blog template is reused 47 times across 3 sites — consider promoting to a shared component."
    2. "12 items haven't been updated in 90+ days — review for archival candidates."
    3. "Publishing frequency dropped 23% Mon–Fri vs last week — check editorial calendar."
    Each in `text-foreground text-sm` separated by `<Separator />`. Title: `<Sparkles />` icon + "Sitecore content insights"; subtitle "AI-derived patterns from your content". **Hardcoded; ZERO fetches; ZERO real AI calls.**
  - **Expected Output:** Unlocked-state file. 3 bullets render with the exact copy above.
  - **Depends on:** T026

- **Task ID:** T045
  - **Title:** `<ContentHealthScore>` (P6) — SVG ring + dashed sparkline
  - **Description:** Replace the unlocked-state placeholder in `content-health-score.tsx`. Horizontal split per UI v2 § 4 P6:
    - **Left:** inline SVG progress ring. Circle radius ~40, stroke-width 8. Track `<circle stroke="hsl(var(--muted))">`. Foreground `<circle stroke="hsl(var(--primary))" stroke-dasharray={circumference} stroke-dashoffset={…}>` animated from `circumference` to `circumference * (1 - 0.87)` over 800ms ease-out on mount via `requestAnimationFrame`. Center label `text-3xl font-bold` "87" + tiny `text-xs text-muted-foreground` "score".
    - **Right:** inline SVG dashed-line forecast sparkline. `<path stroke="hsl(var(--primary))" stroke-dasharray="4 4">` with `pathLength` animation (or `stroke-dashoffset` over 1000ms). Caption `text-xs text-muted-foreground` "Projected 30-day trend".
    Title: `<TrendingUp />` icon + "Content health score"; subtitle "Composite of freshness, coverage, and link integrity". `prefers-reduced-motion: reduce` skips animations (renders directly to final state). **Hardcoded; ZERO fetches.**
  - **Expected Output:** Unlocked-state file. Ring animates from empty to 87; sparkline draws in.
  - **Depends on:** T026

- **Task ID:** T046
  - **Title:** Stagger-in cascade wiring — `.bento-card--premium` class on each premium card
  - **Description:** In each of P1–P6 component files (T040–T045), the outer `<Card>` gets `className={cn(locked ? '' : 'bento-card--premium', ...)}` so the unlocked-state cards apply the class. The CSS in `bento.css` (T007) already binds `:nth-child(N)` delays. Verify the premium-region wrapper renders its 6 children **in the canonical DOM order P1 → P2 → P3 → P4 → P5 → P6** (matches visual reading order). The stagger-in fades each card in over 600ms with 100ms per-card delays (v2 override of FR-5.2's 80ms — see UI v2 § Unlocked-state spec).
  - **Expected Output:** On `useEntitlement` flipping to `allowed`, the 6 cards fade-up in cascade. Last card finishes at ~1.1s from first frame.
  - **Depends on:** T040, T041, T042, T043, T044, T045

- **Task ID:** T047
  - **Title:** `prefers-reduced-motion: reduce` validation across all animations
  - **Description:** Add a Vitest spec that mocks `window.matchMedia('(prefers-reduced-motion: reduce)')` to return `{ matches: true }` and asserts: (a) `<ActivityChart>` `isAnimationActive` is `false` (read via `data-*` attribute or pass `isAnimationActive={!prefersReducedMotion}` and assert via prop); (b) `<CmsHealth>` counters render the final value immediately on mount (no rAF tick); (c) `<ContentDistribution>` progress bars render at target value immediately; (d) `<ContentHealthScore>` ring + sparkline render at final state immediately. The CSS `@media (prefers-reduced-motion: reduce)` block in `bento.css` (T007) handles `.bento-card--premium` stagger-in and `.premium-region--locked::before` shimmer — that's CSS-only and not testable in Vitest; verify manually at Tranche D smoke.
  - **Expected Output:** New test file `site/components/bento/reduced-motion.test.tsx`. All 4 component assertions green.
  - **Depends on:** T046, T043a

- **Task ID:** T048a
  - **Title:** RED no-fetch Vitest spec for premium cards (TDD: write BEFORE T040-T045 are filled)
  - **Description:** Write `site/components/bento/premium-no-fetch.test.tsx` RED before any Tranche D unlocked content is implemented. Mock `global.fetch` to throw `new Error('fetch called — violates ADR-0018')`. Mock the marketplace SDK client's `query` method to throw similarly. Mock `supabase.from` to throw. Render each of the 6 premium card stubs (from T026) with `locked={false}` — at this point they render `<PremiumPlaceholder>` in unlocked state, so the mocks should NOT throw. This establishes the baseline contract: if any future implementation adds a fetch, the throw-mock turns this test RED immediately, preventing silent regressions. The test must be in place and GREEN against the T026 stubs BEFORE T040–T045 fill in the unlocked content.
  - **Expected Output:** Test file green against T026 stubs (no fetches in placeholder path). Will turn RED immediately if any T040–T045 implementation accidentally adds a fetch.
  - **Depends on:** T026

- **Task ID:** T048
  - **Title:** Premium "no-fetch" assertion shell script + npm script wiring (AC4.7, GREEN)
  - **Description:** With T048a's Vitest spec in place and T040–T045 implemented, confirm the spec is still green (all 6 unlocked premium cards render without triggering any fetch mock). Additionally: create `scripts/test-no-fetch-in-premium.sh` that greps for `fetch(`, `client.query(`, `supabase.` in the 6 premium card source files — exit 1 on any match. Wire `test:no-fetch-in-premium` into `package.json`. Both layers (Vitest runtime assertion + static grep) are required per AC4.7.
  - **Expected Output:** Vitest spec still green. New shell script green. New npm script wired.
  - **Depends on:** T046, T048a

- **Task ID:** T049
  - **Title:** Recharts theme re-render verification
  - **Description:** Add a Playwright spec at `site/tests/e2e/bento-theme-recharts.spec.ts`. Boot dev, navigate to `/full-page?previewState=allowed`. Click ThemeToggle → Dark → assert Recharts SVG `<path>` `stroke` attribute reflects the dark theme's `--primary` resolved color (use `getComputedStyle` on a sibling element with the same `hsl(var(--primary))` to compare). Flip to Light → re-assert. If the `<ResponsiveContainer key={resolvedTheme}>` remount strategy from T040 fails, fallback per UI v2 OQ-v2-4 is to do a `setTimeout(0)` re-render or to bind chart colors via inline CSS variables on the chart parent.
  - **Expected Output:** Playwright spec green. Chart visibly re-colors on theme flip.
  - **Depends on:** T040

- **Task ID:** T050
  - **Title:** Tranche D regression Playwright spec — host-frame visual smoke against POC
  - **Description:** Per `sitecore:marketplace-sdk-host-frame-testing`, the canonical visual smoke for Marketplace apps is the clipped iframe inside the live Cloud Portal — NOT a standalone-localhost render. Defer the full host-frame smoke to operator Gate D (T053). For automated visual regression, add a Playwright spec `site/tests/e2e/bento-unlocked.spec.ts` that serves the POC clickdummy via `npx serve pocs/poc-v2-prd002/` on port 5180 and the dev `/full-page?previewState=allowed` on port 3000; takes screenshots of both at 1440×900 light + dark; compares via Playwright's `toHaveScreenshot` with a forgiving threshold (animations + Recharts SVG anti-aliasing produce small per-pixel diffs). The POC is the visual ground truth per UI v2 § 7. Mark any meaningful divergence as a finding routed back through `/architect` (do NOT silently promote the live render as baseline — POC drift escalation per host-frame-testing skill).
  - **Expected Output:** Playwright spec exists. Baseline screenshots committed. Test passes locally.
  - **Depends on:** T046, T049

- **Task ID:** T051
  - **Title:** Theme contrast smoke (NFR-6) — manual + automated where feasible
  - **Description:** Manual: operator opens `/full-page?previewState=allowed` in light theme, then dark. Eyeballs every card text/background combo for WCAG AA contrast. Pays special attention to: (a) Subscribe banner CTA button label (`--primary-foreground` collapse trap — verify Nova preset pair; if the label disappears in dark, switch the button label to `text-background` per UI v2 § color tokens table); (b) Premium corner badges in both themes; (c) Recharts chart text on the muted grid. Automated: extend `tests/e2e/bento-free-tier.spec.ts` (T019) with a `runs-on-each-theme` parameterization that invokes `axe-core` (`npm install -D @axe-core/playwright`) for an a11y scan including the contrast rule. Document any AA violation in `manifest.operator_attention[]` as `concern`.
  - **Expected Output:** Manual smoke recorded in `smoke_outcomes.gate_d.notes`. Axe a11y test green or with documented exceptions.
  - **Depends on:** T046

- **Task ID:** T052
  - **Title:** Update existing `full-page/page.test.tsx` for PRD-002 structure
  - **Description:** The current `app/full-page/page.test.tsx` likely asserts on `<FreeSection>` / `<GatedSection>` presence (PRD-000/001 expectations). Update to assert on `<BentoGrid>` presence + the absence of `<FreeSection>` (it remains in the codebase but no longer rendered on `/full-page`). Keep tests that verify `<DemoModeBanner>` env-flag behavior — those still apply.
  - **Expected Output:** `page.test.tsx` green against PRD-002 structure.
  - **Depends on:** T017

- **Task ID:** T053
  - **Title:** Gate D — operator real-money smoke (G1 + G3 + AC4.7 combined)
  - **Description:** Operator with `no subscription` opens `/full-page` in Cloud Portal. Pays €0.99 via Stripe Checkout (real card). Returns to iframe → `useEntitlement` resolves `allowed` → page reloads → premium cards stagger-in. Verifies: (a) cascade is smooth (1.1s total); (b) Recharts chart draws in; (c) counters tick on P4; (d) progress bars fill on P2; (e) ring fills on P6; (f) theme works in both modes on every card; (g) **Network panel inspection**: zero fetches from premium card components in either state (no `xmc.*` queries, no Supabase, no `/api/*`). (h) Console clean. Screenshots covering the unlock sequence (locked → unlock click → reload → cascade frame 1 → cascade complete) attached.
  - **Expected Output:** `smoke_outcomes.gate_d.outcome = 'passed'` with evidence refs. Manifest stage history `tranche_d_complete`.
  - **Depends on:** T046, T047, T048, T049, T050, T051, T052

### Tranche E — Adopter docs + ship

- **Task ID:** T060
  - **Title:** README "Customizing the bento" section + adopter swap pattern
  - **Description:** Append to `site/README.md` a new top-level section "## Customizing the bento" with a concrete code example showing how to swap a card. Walk through: (1) the `<BentoGrid>` is the single fetch-orchestration point (NFR-10); (2) cards take typed props, no fetches inside card bodies; (3) replace `<UserProfile>` (F4) with your own component receiving the same `host.user` props, etc. Include a short code block showing a fork swapping `<RecentEdits>` (P3) with their own real `client.query('xmc.authoring.graphql', …)` call wrapped server-side. Cross-reference the `sitecore:marketplace-sdk-xmc` skill for the SDK shape (do NOT inline the GraphQL — that's adopter work).
  - **Expected Output:** README has the new section. < 80 lines added.
  - **Depends on:** T053

- **Task ID:** T061
  - **Title:** README "Production hardening for adopters" warning (R5b)
  - **Description:** Append to `site/README.md` a new "## Production hardening for adopters" section. Explicitly warn: (a) ThemeToggle is always visible in this blueprint (showcase posture, ADR-0016); production adopters should env-gate (`NEXT_PUBLIC_SHOW_THEME_TOGGLE === 'true'`) — code snippet showing the gate; (b) the premium-region renders fake data INSIDE the DOM; when adopters swap fakes for real fetches, they MUST gate server-side via `/api/entitlement` check OR a `withEntitlement(handler)` HOF (future PRD); the "render-then-blur" posture is showcase-only (ADR-0018 + R5b). Include a 3-step "Hardening checklist" so adopters can self-audit.
  - **Expected Output:** README has the new section. Cross-references ADR-0016 + ADR-0018.
  - **Depends on:** T053

- **Task ID:** T062
  - **Title:** CHANGELOG `[0.3.0]` entry
  - **Description:** Prepend to `site/CHANGELOG.md` a new entry for `[0.3.0] - 2026-MM-DD` (use the merge date). Sections: **Added** (bento grid; 11-card layout; light/dark/system theme toggle; Recharts P1 lazy-loaded; `<UserProfile>` F4; `<TenantInfo>` F5; Sitecore-flavored premium content; `test:no-hex-in-bento` + `test:no-fetch-in-premium` scripts). **Changed** (`/full-page` swaps `<FreeSection> + <GatedSectionWithDevPicker>` for `<BentoGrid>`; dev affordances `<TenantIdBadge>` + `<PaywallVersionOverride>` now mount in Topbar `rightSideItems[]`). **Deferred** (ADR-0017 `processed_events.tenant_id` migration — no longer required after UI iteration replaced the recent-activity card with `<UserProfile>`). **Compatibility** (Stripe flow unchanged; webhook handler unchanged; existing 104 tests still green).
  - **Expected Output:** CHANGELOG updated. Entry is precise; doesn't list internal task IDs (operator-facing).
  - **Depends on:** T053

- **Task ID:** T063
  - **Title:** Refresh `docs/smoke-walkthrough.md` (if present) with PRD-002 walks
  - **Description:** If `site/docs/smoke-walkthrough.md` exists (PRD-001 likely added it), append a PRD-002 section documenting the Gate A through Gate D walks above (in operator-facing terms; screenshots optional). If it doesn't exist, skip this task — `/document` (a heavier doc pass) will handle full doc refresh on demand.
  - **Expected Output:** Doc updated OR task marked N/A with note in handoff metadata.
  - **Depends on:** T053

- **Task ID:** T064
  - **Title:** Add `<BentoGrid>` to public API barrel (`site/src/lib/paywall/index.ts`)
  - **Description:** Edit `site/src/lib/paywall/index.ts`. Add a new export `export { BentoGrid } from '@/components/bento/bento-grid';` so adopters who fork can import it from the canonical public surface. **Do not** re-export every individual bento card — adopters should import deep when they need to swap. The barrel exposes the orchestrator only.
  - **Expected Output:** `index.ts` re-exports BentoGrid. Adopter usage: `import { BentoGrid } from '@/src/lib/paywall'`.
  - **Depends on:** T010

- **Task ID:** T065
  - **Title:** Final regression sweep — lint + typecheck + test + build + custom scripts
  - **Description:** From `site/`, run in order: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:dce`, `npm run test:env-leak`, `npm run test:no-hex-in-bento`, `npm run test:no-fetch-in-premium`. All must exit 0. Resolve any failure inline (do not skip with `// @ts-ignore`, do not delete failing tests). Test count target ≥125 per PRD-002 § Success metrics.
  - **Expected Output:** All 8 commands green. Test count ≥125. Run output captured into the implementation runbook (`project-planning/plans/implementation-runbook-<timestamp>.md`).
  - **Depends on:** T060, T061, T062, T064

- **Task ID:** T066
  - **Title:** Open PR `prd-002 → main`
  - **Description:** Commit per the existing branch's commit cadence. Push `prd-002` to `origin`. Open PR titled `PRD-002: Bento-grid pretty UI redesign of /full-page` with body summarizing: scope (5 free + 6 premium, ALL fake premium per ADR-0018), 3 new ADRs (0016, 0017 deferred, 0018), test count delta (104 → ≥125), Gate A–D evidence refs, links to the POC clickdummy. Request operator review.
  - **Expected Output:** PR URL captured in manifest `implementation.pr_url`.
  - **Depends on:** T065

- **Task ID:** T067
  - **Title:** Gate E — operator review + merge + Vercel verify (G6 ship)
  - **Description:** Operator reviews PR. Confirms gates A–D evidence in manifest. Merges. Vercel auto-deploys `main`. Operator opens production `https://sitecore-plugin-paywall-blueprint.vercel.app/full-page` (or the deployed URL) via Cloud Portal; final smoke checks the bento renders, themes work, and a fresh-tenant locked state is preserved. Append `smoke_outcomes.gate_e` and stage history `shipped`.
  - **Expected Output:** PR merged. Production live. Manifest `implementation.status = 'shipped'`.
  - **Depends on:** T066

## 4b. Important Test Cases (by epic / feature)

> **QA Specialist (07) enriched list — § 10 has the full per-task specs. Each case below names the test type + Task ID it lives under.**

- **E1 — Theme system & foundation**
  - ThemeToggle renders `Monitor` fallback before hydration (`mounted === false`) — guards SSR mismatch (unit, T004)
  - ThemeToggle renders correct icon for each `resolvedTheme` — Sun/Moon/Monitor round-trip (unit, T004)
  - ThemeToggle dropdown has `aria-label="Toggle theme"` + text labels on each item (unit, T004)
  - ThemeToggle survives SSR without `console.error` hydration warning — Playwright `page.on('console')` (Playwright E2E, T019)
  - `localStorage.theme` round-trip persists across page reloads (Playwright, T019)
  - Theme defaults to `system` on first load (Playwright, T019)
  - `test:no-hex-in-bento` script exits 1 when a hex literal is introduced — feed poisoned fixture (regression script, T006)
  - `bento.css` `prefers-reduced-motion: reduce` block removes all animations — emulateMedia (Playwright, T019)

- **E2 — BentoGrid shell + 5 free cards**
  - F1 WelcomeHero renders `given_name` from mocked `useHostUser` (unit, T018a/T018)
  - F1 WelcomeHero fallback `—` when all name fields absent (unit, T018a/T018)
  - F1 runtime contrast: `text-foreground` on `bg-card` meets WCAG AA — `getComputedStyle` assertion (unit, T018)
  - F2 SitesTile renders `<Skeleton>` on mount before promise resolves (unit RED, T013a)
  - F2 SitesTile renders count + first 2 site names on success with 5 sites (unit, T013a/T012)
  - F2 SitesTile renders empty-state copy on `Array<Site>` length 0 (unit, T013a/T012)
  - F2 SitesTile renders `<Alert>` + Retry on rejected promise (unit, T013a/T012)
  - F2 SitesTile Retry click increments `client.query` call count to 2 (unit, T013a/T012)
  - F2 SitesTile — `sitecoreContextId` undefined → error/unavailable without calling `client.query` (unit REFACTOR, T013)
  - F2 SitesTile — unmount before promise resolves does not produce React state-update warning (unit REFACTOR, T013)
  - F2 fixture `Sites.Site[]` sourced from `.d.ts:964` (fixture provenance, T013a)
  - F3 PlanCard formats `Member since` with `Intl.DateTimeFormat('en-US')` (unit, T014)
  - F3 PlanCard `null` tenantsRow → plan=`"Free"`, status=`"—"`, member_since=`"—"` (unit, T014)
  - F4 UserProfile initials from `given_name + family_name` — uppercase first chars (unit RED, T018a)
  - F4 UserProfile initials fallback chain: no given_name → `name[0]` → `?` (unit RED, T018a)
  - F5 TenantInfo truncates `marketplaceAppTenantId` to `xxxxxxxx…xxxx` (unit RED, T018a)
  - F5 TenantInfo shows `—` for all 4 cells when context fields missing (unit RED, T018a)
  - F1/F4/F5 runtime contrast: `getComputedStyle(el).color` vs `backgroundColor` meets AA — not just `toHaveClass` (unit, T018)
  - BentoGrid shell with `isLocked=false` renders 5 free card slots (unit, T010 implied by T031a)
  - `/full-page` Playwright: BentoGrid renders + no console errors at 1440/900/390 viewports (Playwright E2E, T019)
  - `/full-page` Playwright: theme flip recolors every free card in dark mode (Playwright E2E, T019)

- **E3 — Locked premium state**
  - BentoGrid with `useEntitlement={ status: 'tenant_no_subscription' }` — 6 placeholder silhouettes rendered (unit RED, T031a)
  - BentoGrid locked: `<SubscribeBanner>` mounts as DOM sibling of `.premium-region` — parent traversal assertion (unit RED, T031a)
  - BentoGrid locked: `.premium-region--locked` wrapper has `aria-hidden="true"` (unit RED, T031a)
  - BentoGrid with `useEntitlement={ status: 'allowed' }` — 6 premium cards, no banner, no `aria-hidden` (unit RED, T031a)
  - SubscribeBanner renders "Unlock Premium" + "€0.99 lifetime" copy (unit RED, T031a)
  - SubscribeBanner Subscribe button opens `<PaywallCheckoutDialog>` — click (unit, T031a)
  - SubscribeBanner Subscribe button opens `<PaywallCheckoutDialog>` — Enter key (unit REFACTOR, T031)
  - SubscribeBanner CTA button: `getComputedStyle(btn).color !== getComputedStyle(btn).backgroundColor` — `--primary-foreground` collapse guard (unit, T031a)
  - PremiumPlaceholder 6 shape variants each render correct Skeleton count (unit RED, T031a)
  - Premium corner badges render in both locked + unlocked state (unit per card, T028)
  - Manual readability check: blurred text unreadable at 50cm at typical viewport zoom (manual gate, T030)

- **E4 — Unlock animations + premium fake content**
  - `useCounter` hook: initial value 0 → ticks to `target` after `durationMs` with fake timers (unit RED, T043a)
  - `useCounter` hook: with `prefers-reduced-motion: reduce` → returns `target` immediately, no rAF ticks (unit RED, T043a)
  - P4 CmsHealth: 4 KPI labels and hardcoded final values in DOM within fake-timer advance (unit RED, T043a)
  - Stagger-in cascade: 6 cards fade in with 100ms per-card delays — `evaluate` reading `animation-delay` (Playwright, T046)
  - P1 Recharts lazy chunk NOT fetched when `locked=true` — Network panel (Playwright, T049/T053)
  - P1 chart re-renders on theme flip — SVG path `stroke` matches resolved `--primary` (Playwright, T049)
  - P2 ContentDistribution: 4 progress bars fill from 0 to target with 200ms stagger (Playwright, T041)
  - P6 ContentHealthScore: SVG ring `stroke-dashoffset` animates from circumference to target (unit + Playwright, T045)
  - AC4.7 no-fetch: 6 premium cards with `locked=false` — throw-mock `fetch`/`client.query`/`supabase` NOT called (unit, T048a + T048)
  - `test:no-fetch-in-premium` grep script: exits 1 on any `fetch(`/`client.query(`/`supabase.` in premium card files (script, T048)
  - `prefers-reduced-motion: reduce`: `<ActivityChart>` `isAnimationActive=false`, `<CmsHealth>` counters at final value immediately, `<ContentDistribution>` bars at target, `<ContentHealthScore>` ring at final (unit, T047)
  - WCAG AA contrast in both themes for all bento cards — axe-core contrast rule (Playwright, T051)
  - Subscribe banner CTA label visible in dark theme — `--primary-foreground` not collapsed (Playwright, T051)

- **E5 — Adopter docs + ship**
  - README has "Customizing the bento" section — file content assertion (docs-lint, T064)
  - README has "Production hardening for adopters" section (docs-lint, T064)
  - CHANGELOG `[0.3.0]` entry present (docs-lint, T064)
  - Public barrel `site/src/lib/paywall/index.ts` exports `BentoGrid` — import + truthy check (unit, T064)
  - All 8 regression commands exit 0 including `test:no-hex-in-bento` and `test:no-fetch-in-premium` (CI-equivalent, T065)

## 4c. Implementation execution contract (for Developer 08)

**Lead Developer (06):** every subsection below is filled. **Developer (08)** does not open architecture, UI, or ADR files in normal flow — only this file + `prd-minimal-002.md` + the POC at `pocs/poc-v2-prd002/`.

### 4c-1. Non-negotiable technical boundaries

- **All bento card data flows through props.** Cards do NOT call `fetch`, `client.query`, or Supabase clients from inside their bodies — `<BentoGrid>` is the single fetch-orchestration point (NFR-10). Premium cards have **zero data fetches at any state** (ADR-0018; FR-3.x). Enforced by `test:no-fetch-in-premium` (T048).
- **DOM order MUST equal visual reading order** in the premium-region wrapper: P1 → P2 → P3 → P4 → P5 → P6. The stagger-in cascade uses `:nth-child(N)` selectors, so any reorder breaks the timing.
- **SubscribeBanner is a SIBLING of `.premium-region`, NOT a child.** Wrapped in `.premium-section`. If made a child, the banner inherits `filter: blur(12px)` and becomes unreadable (POC v2 § 7 "Critical bug fixed during POC generation"). Enforced by a structural assertion in T031.
- **`aria-hidden="true"` on the locked premium-region wrapper.** Screen readers skip locked premium cards. Only the Subscribe banner is interactive in locked state (NFR-2; FR-6.5).
- **No hex color literals in `site/components/bento/**` or `site/components/theme-toggle.tsx`.** Use Blok semantic tokens (`hsl(var(--…))`) or `currentColor` for SVG. Enforced by `test:no-hex-in-bento` (T006).
- **No color-emoji codepoints** (`❌` `✅` `⚠️` etc.) — use `lucide-react` icons or monochrome glyphs (`✓` U+2713, `✕` U+2715). Color emojis ignore theme color and render as bitmaps.
- **No browser-global branches in render or `useState` initializer.** No `typeof window`, no `window.matchMedia`, no `IntersectionObserver`, no `navigator.*` in component bodies — only inside `useEffect`. Hydration-mismatch trap from `feedback_hydration_mismatch_pattern.md`. Enforced by ThemeToggle's `mounted` guard (T004).
- **No `as never` / `as any` casts on SDK responses.** Types resolve through `@sitecore-marketplace-sdk/xmc` Sites namespace; `sitecoreContextId` is **guarded, not cast**.
- **No new API routes.** F3/F4 data flows via existing patterns (server-render via `SupabaseStore` for F3 only — F4/F5 are client-side via `useHostUser` / `useAppContext`). F2 is client-side via Mode A `client.query`. No `app/api/<new-route>/route.ts` files created.
- **No webhook handler changes.** ADR-0017 (`processed_events.tenant_id`) is DEFERRED per manifest `stage_history.ui_ready`. `app/api/webhooks/stripe/route.ts` is untouched.
- **No schema migrations.** `supabase/schema.sql` is untouched.
- **Preserve `<FreeSection>`, `<GatedSectionWithDevPicker>`, `<NoSubscriptionState>`, `<AllowedState>`, `<SeatsFullState>`, `<UserUnassignedState>`, `<SkeletonState>` in the codebase.** They are no longer rendered on `/full-page` but stay as design-reference for future PRD-003 (seats) per PRD-002 § FR-1.4.

### 4c-2. ADR one-liners

- **ADR-0001** Use ADRs as architecture backbone — every binding decision in PRD-002 is captured under ADR-0016/0017/0018; no inline-only commitments.
- **ADR-0002** Entitlement store interface split — F3 uses existing `EntitlementStore` interface via `SupabaseStore`; do not reach around the interface.
- **ADR-0003** Payment provider adapter placeholder — Subscribe banner CTA opens the existing `<PaywallCheckoutDialog>` (no new payment provider work).
- **ADR-0004** Env-flag-signaled passthrough — `<DemoModeBanner>` env-flag behavior is preserved by T017 (banner stays above `<main>`).
- **ADR-0005** Scaffold architecture 4a client-side — superseded by ADR-0013.
- **ADR-0006** Custom-app registration — Cloud Portal registration unchanged; only scope verification at T001 (R1).
- **ADR-0007** Single generic skeleton — `<PremiumPlaceholder>` is a parameterized skeleton (shape prop) following this pattern.
- **ADR-0008** Context-readiness via provider resolution — `<MarketplaceProvider>` continues to gate render until both `appContext` and `hostUser` resolve; PRD-002 components downstream of the provider can safely call `useAppContext` / `useHostUser`.
- **ADR-0009** Supabase RLS permissive default — F3's `SupabaseStore.getEntitlement` runs server-side with the service-role key; RLS posture unchanged.
- **ADR-0010** Supabase setup via SQL block — N/A in PRD-002 (no schema changes).
- **ADR-0011** Tenant-only entitlement — `useEntitlement` continues to gate by `marketplaceAppTenantId`; per-user seats are out (PRD-003).
- **ADR-0012** Stripe price model one-time lifetime — PRD-001 binding; PRD-002 inherits.
- **ADR-0013** Scaffold migration 4a → 4b PRD-001 — full-stack Marketplace; PRD-002 inherits unchanged.
- **ADR-0014** Iframe success-return postMessage + polling — `useEntitlement` continues to drive unlock.
- **ADR-0015** Stripe customer orphan recovery — unchanged.
- **ADR-0016** Theme toggle always visible (showcase posture) — `<ThemeToggle>` mounts unconditionally on `rightSideItems[]`; no env flag. Adopters env-gate for production per README (T061).
- **ADR-0017** `processed_events.tenant_id` column — **DEFERRED in PRD-002.** No migration, no webhook edit. Preserved as reference design for a future PRD that resurrects the events surface.
- **ADR-0018** Premium bento cards ship fake data — **no fetches, no SDK calls, no DB queries from any premium card at any state.** Locked-state mounts placeholder silhouettes only.

### 4c-3. Stack / tooling specifics

- **Package manager:** `npm` (project uses `package-lock.json`). Run all commands from `products/paywall-blueprint/site/`.
- **Node:** as pinned by Vercel + Next 16 requirement (>=18.18; check `engines` if set).
- **Test runner:** `vitest` (already configured; see `npm run test`).
- **Component test stack:** `@testing-library/react` + `@testing-library/jest-dom` + `@testing-library/user-event` (already installed).
- **E2E:** `@playwright/test` — install if not present (`npm install -D @playwright/test`; `npx playwright install`).
- **Build:** `next build` via `npm run build` (Next 16, Turbopack via `next dev --turbopack --experimental-https`).
- **Dev:** `npm run dev` (HTTPS on localhost; mkcert already configured per PRD-001).
- **Type-check:** `npm run typecheck` (`tsc --noEmit`).
- **Lint:** `npm run lint` (`eslint`).
- **Format:** `npm run format` (Prettier).
- **Custom scripts:** `test:dce`, `test:env-leak` (existing); **add** `test:no-hex-in-bento` (T006), `test:no-fetch-in-premium` (T048).
- **New deps to install (Tranche A):** `recharts` (latest at install time). `next-themes` already at `^0.4.6`.
- **Optional deps:** `@axe-core/playwright` (for T051 contrast scan).
- **shadcn add (if missing):** `dropdown-menu`, `progress`, `skeleton`, `alert`, `tooltip`. Verify with `ls site/components/ui/` before installing.
- **Runtime contrast assertion pattern (QA-added for T018, T031a, T051):**
  ```typescript
  // Vitest / Testing Library — inline contrast check
  import { getComputedStyle } from '@testing-library/dom';
  import { contrastRatio } from './test-helpers/contrast'; // implement: parse RGB → luminance → ratio
  const el = screen.getByText('Welcome,');
  const style = getComputedStyle(el);
  expect(contrastRatio(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5); // WCAG AA normal text
  // OR use jest-axe:
  import { axe, toHaveNoViolations } from 'jest-axe';
  expect.extend(toHaveNoViolations);
  const { container } = render(<WelcomeHero ... />);
  const results = await axe(container, { rules: { 'color-contrast': { enabled: true } } });
  expect(results).toHaveNoViolations();
  // IMPORTANT: toHaveClass("text-foreground") alone does NOT satisfy the contrast contract.
  // --primary-foreground can collapse onto --primary in Nova dark mode preset (QuickCopy v0.1 trap).
  ```
- **`prefers-reduced-motion` Playwright emulation pattern (QA-added for T047, T019):**
  ```typescript
  // In Playwright spec:
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('https://localhost:3000/full-page?previewState=allowed');
  // Assert CSS: .bento-card--premium should have animation: none (via getComputedStyle)
  const animVal = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.bento-card--premium')).animationName
  );
  expect(animVal).toBe('none');
  ```
- **Host-frame visual smoke pattern for Marketplace apps (QA-added — platform_target: marketplace):**
  The canonical visual test for Marketplace apps is the clipped iframe inside the live Cloud Portal (not localhost standalone). For automated regression, Tranche D uses `npx serve pocs/poc-v2-prd002/` on port 5180 as the ground truth per T050. For operator gates, use the `sitecore:marketplace-sdk-host-frame-testing` skill recipe. Key invariants: (1) host URL + app origin are user-supplied — do not guess; (2) auth is interactive-only, never scripted; (3) the POC clickdummy in `pocs/poc-v2-prd002/` is the first-run ground truth — do not silently promote live screenshots to baselines; (4) cross-origin iframe DOM reads are restricted — fall back to visual diff vs POC.
  ```typescript
  // T050 Playwright snippet (serve POC on port 5180, dev on 3000):
  // npx serve pocs/poc-v2-prd002/ --listen 5180 &
  // Then in the spec:
  await page.goto('https://localhost:3000/full-page?previewState=allowed');
  const devScreenshot = await page.screenshot();
  // Compare against POC reference screenshot (taken separately from http://localhost:5180):
  await expect(page).toHaveScreenshot('bento-unlocked-1440-light.png', { threshold: 0.05 });
  ```

### 4c-4. UI implementation notes

- **Visual mood:** Sophisticated data viz — restrained motion, deep card surfaces with subtle borders, type-driven hierarchy (heroes use `text-4xl font-semibold`, support cards use `text-base font-semibold`). Color reserved: `--primary` appears only on Subscribe banner CTA, F1 plan badge, P1 chart stroke + "+12%" badge, P6 ring stroke, premium corner badges.
- **Theme tokens (binding — `test:no-hex-in-bento` enforces):**
  - Page bg: `bg-background`
  - Card surface: `bg-card`
  - Card border: `border-border`
  - Primary text: `text-foreground`
  - Secondary text: `text-muted-foreground`
  - Primary accent: `text-primary` / `bg-primary`
  - On-primary label: prefer `text-background` (fallback for `--primary-foreground` collapse pitfall — verify at Tranche D)
  - Destructive (error): `bg-destructive text-destructive-foreground`
  - Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
  - Shimmer overlay: `hsl(var(--muted) / 0.12)`
  - Chart fill: `hsl(var(--primary) / 0.18)`
  - Banner glow: `hsl(var(--primary) / 0.4)` ring + `hsl(var(--primary) / 0.25)` shadow
- **Typography ramp (Geist Sans + Geist Mono from `next/font/google`; already wired in `app/layout.tsx`):**
  - Hero greeting (F1) + Subscribe banner title + KPI numerals: `text-4xl font-semibold`
  - F2 sites count + P6 ring center "87": `text-3xl font-bold`
  - F3 plan name + Subscribe sub-headline "€0.99 lifetime": `text-2xl font-semibold`
  - F1 tenant line: `text-lg text-muted-foreground`
  - Most card titles: `text-base font-semibold`
  - Body copy + row labels: `text-base` / `text-sm`
  - KPI labels + badge text: `text-xs`
- **Spacing (Tailwind v4 default scale):**
  - Outer page padding: `p-6` (24px) on bento container
  - Card gap: `gap-4` (16px) desktop + tablet; `gap-3` (12px) mobile
  - Support card internal: `p-5` (20px)
  - Hero card internal: `p-8` (32px) on F1, P1 (and F5 strip uses `p-5` due to its short height)
  - Subscribe banner internal: `p-10` (40px)
- **Grid template:** see `bento.css` in T007 (canonical). Desktop 4-col with `grid-template-areas`; tablet 2-col; mobile 1-col.
- **Animation timings:**
  - Stagger-in: 600ms `fadeUp` per card with 100ms per-card delay (DOM order = reading order)
  - Recharts area draw: 800ms
  - P2 progress bar fill: 800ms ease-out, 200ms stagger between bars
  - P4 counter: 600ms rAF ease-out
  - P6 ring: 800ms ease-out; sparkline: 1000ms
  - Shimmer: 3s infinite
  - All animations: `@media (prefers-reduced-motion: reduce) { animation: none; opacity: 1; transform: none }`
- **Lucide icons used:** `Sun`, `Moon`, `Monitor` (toggle), `Globe` (F2), `User` (F1, F4), `Plug` (F5), `TrendingUp` (P1, P6), `CheckCircle2` (P2, F4 row), `Sparkles` (P3, P5), `Lock` (subscribe banner, premium badge), `Activity` / `XCircle` (states).
- **Winning POC clickdummy:** `pocs/poc-v2-prd002/` — open `index.html` via `file://`. **The HTML clickdummy is the canonical visual reference for implementation.** When spec text and clickdummy diverge on visual details, the clickdummy wins (UI v2 § 7). Specifically: `index.html` lines 11–214 cover free row (topbar + F1–F5); lines 218–537 cover premium section (premium-region + SubscribeBanner sibling structure + 6 premium card placeholders). `styles.css` is the canonical CSS reference.

### 4c-5. File / module structure and naming conventions

- **New directory:** `site/components/bento/` — all bento card components.
- **Component file naming:** `kebab-case.tsx` matching existing project convention (e.g. `welcome-hero.tsx`, NOT `WelcomeHero.tsx`). Default-export the React component named PascalCase.
- **Co-located tests:** `<name>.test.tsx` next to the component (matches existing `error-boundary.test.tsx`, `gated-section.test.tsx` pattern).
- **CSS:** `site/styles/bento.css` (single shared sheet imported by `bento-grid.tsx`). Tailwind utility classes preferred for component-level styling; bento.css holds grid template + keyframes only.
- **Public API barrel addition:** `site/src/lib/paywall/index.ts` re-exports `BentoGrid` only (not individual cards — adopters deep-import to swap).
- **Existing modules (verify import paths before use):**
  - `MarketplaceProvider`, `useMarketplaceClient`, `useAppContext`, `useHostUser` from `@/components/providers/marketplace`
  - `useEntitlement` from `@/src/lib/paywall` (barrel re-export) or `@/src/lib/paywall/hooks/useEntitlement`
  - `<PaywallCheckoutDialog>` from `@/src/lib/paywall`
  - `<DemoModeBanner>`, `<TenantIdBadge>`, `<PaywallVersionOverride>` from `@/components/...` (existing locations)
  - `Topbar` from `@/components/bloks/top-bar`
  - Blok primitives from `@/components/ui/<name>` (shadcn-installed)
  - `cn` from `@/lib/utils` (existing helper)
  - `Icon` from `@/lib/icon` (existing wrapper around lucide if used)
  - `SupabaseStore` — locate before use (likely `@/src/lib/paywall/stores/SupabaseStore` or similar; verify and cite in T014 implementation)
- **File creation map (Tranche → files):**
  - **A:** `site/scripts/test-no-hex-in-bento.sh`, `site/styles/bento.css`, `site/components/theme-toggle.tsx`, modifications to `app/layout.tsx` + `app/full-page/page.tsx` (Topbar rightSideItems), `package.json`
  - **B:** `site/components/bento/{bento-grid,welcome-hero,sites-tile,plan-card,user-profile,tenant-info}.tsx` + co-located `.test.tsx`; modifications to `app/full-page/page.tsx` (BentoGrid integration + server-side `tenantsRow` fetch); `site/tests/e2e/bento-free-tier.spec.ts`
  - **C:** `site/components/bento/{premium-placeholder,activity-chart,content-distribution,recent-edits,cms-health,sitecore-content-insights,content-health-score,subscribe-banner}.tsx` (stubs first) + co-located `.test.tsx`
  - **D:** Same files filled in; `site/lib/use-counter.ts` (or co-located); `site/components/bento/activity-chart-recharts.tsx`; `site/tests/e2e/{bento-theme-recharts,bento-unlocked}.spec.ts`; `scripts/test-no-fetch-in-premium.sh`; modifications to `app/full-page/page.test.tsx`
  - **E:** `README.md`, `CHANGELOG.md`, `site/src/lib/paywall/index.ts` (barrel addition), optional `docs/smoke-walkthrough.md` refresh

### 4c-6. Integration and API contract notes

**ONLY ONE new SDK contract in PRD-002: `xmc.sites.listSites`.** All other SDK surfaces are locked from PRD-000/001.

**`xmc.sites.listSites` shape (cited from installed `node_modules`):**

```typescript
// Request params shape
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:2561
//   namespace Sites {
//     type ListSitesData = {
//       body?: never;
//       path?: never;
//       query?: {
//         environmentId?: string;
//         sitecoreContextId?: string;
//       };
//       url: '/api/v1/sites';
//     };
//   }

// Response shape — SDK level (raw)
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:2583
//   namespace Sites {
//     type ListSitesResponses = {
//       200: Array<Site>;
//     };
//   }

// Per-site shape
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964
//   namespace Sites {
//     type Site = {
//       id?: string | null;
//       name?: string | null;
//       description?: string | null;
//       displayName?: string | null;
//       thumbnail?: Thumbnail;
//       collectionId?: string | null;
//       created?: string;
//       createdBy?: string | null;
//       sortOrder?: number | null;
//       // ... additional fields
//     };
//   }

// Augmentation map binding (xmc module key)
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/augmentation.gen.d.ts:76
//   'xmc.sites.listSites': {
//     params: Parameters<typeof sdk.listSites>[0];
//     response: Awaited<ReturnType<typeof sdk.listSites>>;
//   };
```

**Call pattern** (per architecture § 5c — Mode A wrapped options, single-unwrap response; `client.query` returns `{ data: <whatever the augmentation map declares as response> }`):

```typescript
import type { Sites } from '@sitecore-marketplace-sdk/xmc';

const result = await client.query('xmc.sites.listSites', {
  params: { query: { sitecoreContextId } },  // guarded contextId
});

// The augmentation map's response is the raw `Awaited<ReturnType<typeof sdk.listSites>>`,
// which for @hey-api/client-fetch is `RequestResult<Sites.Site[], Sites.ProblemDetails, false>`
// — at runtime, `result.data` is `Array<Site>` after the SDK envelope unwrap.
//
// IMPORTANT — architecture § 5c assumed `result.data?.data` (double-unwrap). The .d.ts above
// suggests the unwrap is SINGLE (`result.data` is already the array). Verify at Tranche B
// real-tenant smoke (T020):
//   1. Log `console.log(JSON.stringify(result, null, 2))` once.
//   2. If `result.data` is `Sites.Site[]`, the implementation reads `result.data ?? []` (single unwrap).
//   3. If `result.data` is `{ data: Sites.Site[] }`, fall back to `result.data?.data ?? []` (double unwrap).
//   4. Whichever is correct, update this 4c-6 + the component inline; the OTHER one is wrong.

const sites: Sites.Site[] = result.data ?? [];  // start with single unwrap; correct at smoke

if (sites.length === 0) setState({ kind: 'empty' });
else setState({ kind: 'success', sites });
```

**`sitecoreContextId` source:**

```typescript
const appCtx = useAppContext();
const contextId = appCtx?.resourceAccess?.[0]?.context?.live;  // .live, not .preview (architecture § 5c)
if (!contextId) {
  setState({ kind: 'error', message: 'Sitecore context unavailable' });
  return;
}
// DO NOT cast to non-null — guard.
```

**Other SDK calls (LOCKED from PRD-000/001, no new wire-up):**

- `client.query('host.user')` — `host.user.given_name`, `.name`, `.email`, `.sub`. Used by F1, F4. **Single unwrap** (`result.data` is `HostUser`). Shape: `site/components/providers/marketplace.tsx:43` — `HostUser` interface with index signature for full Auth0 claims. Already resolved via `MarketplaceProvider`; consume via `useHostUser()`.
- `client.query('application.context')` — `marketplaceAppTenantId`, `resourceAccess[0].tenantDisplayName`, `.context.live`, `.organizationName`, `.environmentName`. Used by F1, F2, F5. **Single unwrap** (`result.data` is `ApplicationContext`). Type from `@sitecore-marketplace-sdk/client`. Already resolved via `MarketplaceProvider`; consume via `useAppContext()`.
- `useEntitlement()` from `@/src/lib/paywall`. Returns `{ entitlement, isLoading, error, triggerCheckout }`. `entitlement.status` is `'allowed' | 'tenant_no_subscription' | 'seats_full' | 'user_unassigned' | 'loading'` (verify via the hook's return type; cite `node_modules` only if a new branch is added — no new branch in PRD-002).
- `<PaywallCheckoutDialog>` — props locked from PRD-001. Subscribe button in `<SubscribeBanner>` opens it via the same trigger pattern used in `<GatedSectionWithDevPicker>`.
- `SupabaseStore.getEntitlement(tenantId, '')` — existing PRD-000 method. Returns the `tenants` row (`plan`, `status`, `created_at`, etc.). Used server-side in `app/full-page/page.tsx` to build `tenantsRow` prop for `<BentoGrid>`.

**No new HTTP routes in PRD-002.** No Stripe API changes. No webhook handler changes.

**Worked test fixture — `Sites.Site` shape (QA-added for T013a, must be cited in fixture file):**

```typescript
// site/components/bento/__fixtures__/sites.ts
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
// All fields are nullable/optional per the .d.ts — do NOT assume non-null in component code.

export const mockSites = [
  { id: 'site-001', name: 'marketing-site', displayName: 'Marketing Site', description: null, collectionId: null, created: '2025-01-10T00:00:00Z', createdBy: 'user@example.com', sortOrder: 0, thumbnail: undefined },
  { id: 'site-002', name: 'blog-site', displayName: 'Blog Site', description: null, collectionId: null, created: '2025-02-01T00:00:00Z', createdBy: 'user@example.com', sortOrder: 1, thumbnail: undefined },
  { id: 'site-003', name: 'product-catalog', displayName: 'Product Catalog', description: null, collectionId: null, created: '2025-03-15T00:00:00Z', createdBy: 'user@example.com', sortOrder: 2, thumbnail: undefined },
  { id: 'site-004', name: 'company-site', displayName: 'Company Site', description: null, collectionId: null, created: '2025-04-01T00:00:00Z', createdBy: 'user@example.com', sortOrder: 3, thumbnail: undefined },
  { id: 'site-005', name: 'career-portal', displayName: 'Career Portal', description: null, collectionId: null, created: '2025-05-12T00:00:00Z', createdBy: 'user@example.com', sortOrder: 4, thumbnail: undefined },
] satisfies import('@sitecore-marketplace-sdk/xmc').Sites.Site[];

// Single-unwrap mock (start here — .d.ts suggests result.data is Sites.Site[]):
export const mockListSitesResponseSingle = { data: mockSites };

// Double-unwrap mock (if Tranche B smoke shows result.data.data shape):
export const mockListSitesResponseDouble = { data: { data: mockSites } };

// Empty-tenant mock:
export const mockListSitesEmpty = { data: [] };

// Error mock:
export const mockListSitesError = new Error('xmc.sites.listSites failed: 403 Forbidden');
```

**Usage in T013a tests — always cite the source:**
```typescript
// In sites-tile.test.tsx:
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
import { mockSites, mockListSitesResponseSingle, mockListSitesEmpty, mockListSitesError } from './__fixtures__/sites';
```

### 4c-7. Parity / rebuild pointers

**N/A — greenfield within the existing product.** `analysis_mode == greenfield` per the run manifest's `source.analysis_mode`. The POC clickdummy at `pocs/poc-v2-prd002/` is the visual ground truth (see § 4c-4); when this spec disagrees with the POC on visual details, the POC wins. The POC is not a "source to rebuild" in the parity sense — it's a design artifact produced from this PRD + architecture + UI design.

## 5. Dependencies

- **Ordering constraints:**
  - T001 (operator scope verify) gates T012 (SitesTile) — F2 falls back to "Not available" if T001 reveals the scope is unavailable.
  - T002 (install recharts) gates T040 (P1 chart uses Recharts).
  - T003 (ThemeProvider in root) gates T004 (ThemeToggle uses useTheme()).
  - T004 (ThemeToggle component) gates T005 (mount in Topbar).
  - T006 (test:no-hex script) gates T007 (bento.css must pass the check).
  - T007 (bento.css with grid templates) gates T010 (BentoGrid imports the CSS).
  - T010 (BentoGrid shell) gates all F1–F5 + premium card components (they're rendered inside it).
  - T017 (page.tsx integration) gates Gate B (T020) — bento must be live.
  - T029 (useEntitlement wiring) gates Gate C (T032) — locked branch must work.
  - T046 (stagger cascade wiring) gates T047 (reduced-motion validation) and T053 (Gate D operator).
  - T053 (Gate D pass) gates T060+ (docs only after the user-facing surface is complete).
  - T065 (regression sweep) gates T066 (PR open) gates T067 (ship).

- **Execution order (QA-enriched, RED → GREEN ordering):** `T001, T002, T003, T004, T005, T006, T007, T008, T010, T018a, T011, T013a, T012, T013, T014, T015, T016, T018, T017, T019, T020, T025, T031a, T026, T027, T028, T029, T030, T031, T032, T040, T041, T042, T043a, T043, T044, T045, T046, T047, T048a, T048, T049, T050, T051, T052, T053, T060, T061, T062, T063, T064, T065, T066, T067`.
  - **Note on ordering:** T018a (RED for F1/F4/F5) runs before T011/T015/T016 so the tests are in place before the components. T013a (RED for SitesTile) runs before T012 (GREEN). T031a (RED for locked-state) runs before T025–T029. T043a (RED for useCounter) runs before T043. T048a (RED no-fetch contract) runs before T040–T045 fill unlocked content.

- **Parallel groups (Developer 08 may run multiple agents on the same tranche if capacity allows):**

  ```
  Group 1 (sequential — Tranche A foundation):
    T001 (operator gate, async)
    T002 → T003 → T004 → T005 (theme chain)
    T006 → T007 (script + CSS)
    T008 (gate A — depends on T005 + T007)

  Group 2 (TDD-ordered — Tranche B free cards):
    T018a (RED for F1/F4/F5 — depends on T010; write FIRST)
    T011 (F1 GREEN — depends on T010; T018a will fail RED until T011 exists)
    T013a (RED for SitesTile — depends on T010; write BEFORE T012)
    T012 (SitesTile GREEN — depends on T013a)
    T013 (SitesTile REFACTOR — depends on T012)
    T014 (F3 — depends on T010)
    T015 (F4 GREEN — depends on T010; covered by T018a RED)
    T016 (F5 GREEN — depends on T010; covered by T018a RED)
  Group 3 (sequential — Tranche B integration):
    T018 (GREEN+REFACTOR for F1/F4/F5 — depends on T011/T015/T016/T018a)
    T017 (depends on T005/T010/T011/T012/T014/T015/T016)
    T019 (depends on T017/T018)
    T020 (gate B — depends on T017/T019)

  Group 4 (TDD-ordered — Tranche C):
    T031a (RED for locked-state — depends on T010; write BEFORE T025/T026/T027/T028/T029)
    T025 (premium placeholder — depends on T010)
    T026 (premium card stubs — depends on T025; T031a RED will fail until stubs exist)
    T048a (RED no-fetch contract — depends on T026; write BEFORE T040–T045 fill)
    T027 (subscribe banner — depends on T026)
    T028 (corner badges — depends on T026)
    T029 (useEntitlement wiring — depends on T026/T027)
  Group 5 (sequential — Tranche C close):
    T030 (manual readability)
    T031 (GREEN+REFACTOR — depends on T029/T031a)
    T032 (gate C — depends on T029/T030/T031)

  Group 6 (TDD-ordered — Tranche D premium content):
    T043a (RED for useCounter + CmsHealth — depends on T026; write BEFORE T043)
    T040 (P1 Recharts — depends on T026)
    T041 (P2 progress bars — depends on T026)
    T042 (P3 list — depends on T026)
    T043 (P4 counters GREEN — depends on T043a)
    T044 (P5 bullets — depends on T026)
    T045 (P6 ring + sparkline — depends on T026)
  Group 7 (sequential — Tranche D close):
    T046 (stagger wiring — depends on T040–T045)
    T047 (reduced-motion validation — depends on T046/T043a)
    T048 (no-fetch shell script + wire — depends on T046/T048a)
    T049 (theme re-render)
    T050 (POC visual smoke)
    T051 (contrast smoke)
    T052 (page test update)
    T053 (gate D — depends on T046/T047/T048/T049/T050/T051/T052)

  Group 8 (parallel — Tranche E):
    T060 (README customizing)
    T061 (README hardening)
    T062 (CHANGELOG)
    T063 (smoke-walkthrough refresh — optional)
    T064 (public API barrel)
  Group 9 (sequential — Tranche E close):
    T065 (regression sweep)
    T066 (PR open)
    T067 (gate E ship)
  ```

  Within Groups 2, 4, 6, 8 the tasks share dependencies and can run concurrently in separate Developer agent contexts. Groups execute in order; a group starts only when ALL of its dependencies are complete.

## 6. Suggested Milestones

| Milestone | Tasks | Gate |
|---|---|---|
| **M1 — Tranche A complete** | T001–T008 | Gate A operator smoke (T008) |
| **M2 — Tranche B complete** | T010–T020 | Gate B operator smoke (T020) |
| **M3 — Tranche C complete** | T025–T032 | Gate C operator smoke (T032) |
| **M4 — Tranche D complete** | T040–T053 | Gate D operator real-money smoke (T053) |
| **M5 — Tranche E + ship** | T060–T067 | Gate E PR merge + Vercel verify (T067) |

## 7. Risk Areas

- **R-Sites-shape** — `xmc.sites.listSites` runtime envelope (single vs double unwrap) verified at Tranche B smoke; fix inline. Mitigation: T013 mocks both shapes; T020 captures the real shape.
- **R-Scope-missing** — Cloud Portal scope for `xmc.sites.*` may not be enabled. T001 catches at pre-flight; R1 fallback ships F2 "Not available" state.
- **R-Hydration-toggle** — `<ThemeToggle>` hydration mismatch if mounted-guard skipped. T004 prescribes the canonical pattern; verify at T019 Playwright (no console warnings).
- **R-Primary-foreground-collapse** — Subscribe button label may disappear in dark theme if `--primary-foreground` collapses onto `--primary`. T027 prefers `text-background` fallback; T051 catches at contrast smoke.
- **R-Recharts-bundle** — Recharts ~80–100kb lazy chunk inflates the AllowedState first-load. T040 splits the chart into a lazy chunk; verify Network panel at T053.
- **R-DOM-vs-visual-order** — Any reorder of premium cards in the JSX breaks the `:nth-child` stagger. T031 + T046 assert; reviewers check at PR.
- **R-Subscribe-banner-blur** — If the banner is a CHILD of `.premium-region`, it gets rasterized. T031 asserts via parent traversal; POC v2 § 7 is the canonical fix.
- **R-FreeSection-test-drift** — Existing tests for `<FreeSection>` / `<GatedSectionWithDevPicker>` still run (components stay in the codebase). They should remain green; T017 only removes them from `/full-page` rendering, not from the test surface.

## 8. Suggested Team Structure

Single Developer 08 agent works through tranches sequentially. Within Tranche B (Group 2) and Tranche D (Group 6), the Team Lead MAY spawn additional Developer agents in parallel if task count + operator-time constraints justify it (5 free cards parallel; 6 premium cards parallel). All gates (A, B, C, D, E) require an interactive operator real-tenant smoke — no automation can satisfy them.

## 9. TDD and quality contract

**Populated by QA Specialist (07) — 2026-05-18. Non-negotiable rules for all code tasks in PRD-002.**

### 9.1 RED → GREEN → REFACTOR at every layer

No production code before a failing test exists for any behavioral claim in E1–E4. The sequence is:

1. **RED** — write the test first; run it; confirm it fails for the right reason (not a missing import / setup error — an honest behavioral failure).
2. **GREEN** — write the minimum implementation to make the test pass. No gold-plating.
3. **REFACTOR** — clean up the implementation and test; run again; must still be green.

This applies at every layer:
- **Unit / component (Vitest + Testing Library)** — component rendering, hook behavior, utility functions.
- **Integration** — `<BentoGrid>` with mocked MarketplaceProvider; `app/full-page/page.tsx` with mocked SupabaseStore.
- **Playwright E2E** — visual regression against the POC clickdummy, responsive breakpoints, theme persistence, hydration warnings.

**Explicit TDD exceptions** (no RED test required — these tasks have no behavioral code to test-first):
- T001 (operator gate — no code produced)
- T002 (dep install — no logic)
- T008, T020, T032, T053, T067 (operator real-tenant gates — manual smoke only)
- T030 (manual readability check)
- T060, T061, T062, T063 (docs — prose edits, not code)
- T065 (regression sweep — runs existing tests; does not add new ones)
- T066, T067 (PR + ship — meta tasks)

### 9.2 SDK fixture provenance contract

Every test or fixture file that references a `Sites.Site`, `Sites.ListSitesData`, or `Sites.ListSitesResponses` shape **MUST** include a `// source:` citation at the top of the fixture block:

```
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
```

Fixtures paraphrased from skill prose (`sitecore:marketplace-sdk-xmc` catalog) or from this task breakdown's description text are **rejected**. The `.d.ts` is the only accepted source. Why: RED → GREEN against a shared-fiction fixture is how QuickCopy v0.1 shipped with 167 passing tests that missed a runtime shape mismatch. See rule `40-sdk-contracts.mdc`.

**Accepted `.d.ts` citation paths (use exactly as shown):**
- `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:2561` — `Sites.ListSitesData`
- `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:2583` — `Sites.ListSitesResponses`
- `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964` — `Sites.Site`
- `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/augmentation.gen.d.ts:76` — augmentation map
- `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/sdk.gen.d.ts:220` — `listSites` return type

**Envelope ambiguity coverage:** fixtures MUST cover BOTH single-unwrap (`{ data: Sites.Site[] }`) AND double-unwrap (`{ data: { data: Sites.Site[] } }`) until Tranche B smoke (T020) resolves the runtime shape. The `SitesTile` component starts single-unwrap; the test suite covers both so a smoke-detected divergence requires only a component fix, not a fixture rewrite.

**Locked SDK surfaces (no new fixture capture required):**
- `host.user` — fixture at `project-planning/architecture/sdk-fixtures/host-user.json`; interface at `site/components/providers/marketplace.tsx:43`.
- `application.context` — type from `@sitecore-marketplace-sdk/client`; cite `.d.ts` if any new field access is tested.

### 9.3 Skill-load reuse

During `/implement`, the following skills will already be loaded by Developer 08 — QA Specialist cites them by name in fixture provenance comments without re-invoking the Skill tool:
- `sitecore:marketplace-sdk-client` — client context, `useMarketplaceClient`, Mode A call pattern.
- `sitecore:marketplace-sdk-xmc` — `xmc.sites.listSites` call, Sites namespace, augmentation map.
- `sitecore:blok-theming` — token pairs, `--primary-foreground` collapse risk, color-emoji codepoints. Relevant to T004, T018, T027, T031a, T051.
- `sitecore:marketplace-sdk-host-frame-testing` — host-frame visual smoke recipe for Gate D/E. Relevant to T050, T053.

### 9.4 Runtime contrast assertions — not just class-name checks

For every component that paints with theme tokens (`bg-primary`, `text-primary`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-destructive`):

- **Do NOT assert contrast via `toHaveClass("bg-primary")`** — this passes even when `--primary-foreground` collapses onto `--primary` in dark mode (Nova preset shipped this way in QuickCopy Share Link strip).
- **DO assert the resolved foreground/background contrast ratio** using `getComputedStyle(el).color` + `backgroundColor` and a contrast helper, or use `jest-axe` with the contrast rule enabled.
- WCAG AA thresholds: 4.5:1 for normal text (`text-sm` and smaller), 3:1 for large text (`text-4xl font-semibold` and larger).
- The **Subscribe banner CTA button** is the highest-risk element (`bg-primary` + `text-primary-foreground` or `text-background`). Prefer `text-background` per UI v2 § color tokens "On-primary label" note. Assert in T031a and verify at T051 Playwright.
- The axe-core invocation snippet is in § 4c-3.

### 9.5 Marketplace host-frame visual smoke (final gate)

`platform_target: marketplace` activates the host-frame smoke requirement.

**Automated regression (Tranche D — T050):** Playwright visual diff comparing `/full-page?previewState=allowed` (dev server port 3000) against the approved POC clickdummy served via `npx serve pocs/poc-v2-prd002/` (port 5180). `toHaveScreenshot` with 5% threshold for Recharts SVG anti-aliasing. Five axes: layout, typography, color, component anatomy, state fidelity.

**Operator gate (Gate D — T053 + Gate E — T067):** Interactive smoke inside the live Cloud Portal host frame following `sitecore:marketplace-sdk-host-frame-testing`. The POC clickdummy is the first-run ground truth; do NOT silently promote live screenshots to baselines. If the live render diverges from the POC, record as "POC drift" finding and route back through `/architect` step 3.

**Note:** Playwright MCP rejects `file://` URLs — the POC must be served via `npx serve` (HTTP) for automated comparisons. The clickdummy at `pocs/poc-v2-prd002/index.html` is already self-contained with no build step required.

### 9.6 Reduced-motion contract

All JS-driven animations (rAF counters in P4, SVG dashoffset in P6, progress bar `currentValue` state updates in P2, Recharts `isAnimationActive`) MUST respect `prefers-reduced-motion: reduce`:
- **Detection pattern:** `window.matchMedia('(prefers-reduced-motion: reduce)').matches` read inside `useEffect` (never in render body — hydration trap).
- **Skip-to-final behavior:** when `matches === true`, set the value directly to the final target; skip rAF loop.
- **CSS-only animations** (stagger-in `fadeUp` cascade, shimmer overlay) are covered by the `bento.css` `@media (prefers-reduced-motion: reduce) { animation: none; opacity: 1; transform: none }` block — verified at Tranche D smoke manually.
- **Test coverage:** Vitest spec `reduced-motion.test.tsx` (T047) mocks `window.matchMedia` via `Object.defineProperty` and asserts skip-to-final for all 4 animated components.
- **Playwright verification:** `page.emulateMedia({ reducedMotion: 'reduce' })` → assert `.bento-card--premium` has `animation-name: none` (emulateMedia pattern in § 4c-3).

### 9.7 No-fetch contract for premium cards (ADR-0018)

Two enforcement layers are BOTH required per AC4.7:
1. **T048a Vitest spec** (`premium-no-fetch.test.tsx`) — throw-mock `fetch` + `client.query` + `supabase.from`; render all 6 premium cards with `locked=false`; assert mocks not called. Written as RED against T026 stubs (GREEN by construction since stubs don't fetch). Turns RED immediately if any T040–T045 implementation adds a fetch.
2. **T048 shell script** (`scripts/test-no-fetch-in-premium.sh`) — static grep over premium card source files for `fetch(`, `client.query(`, `supabase.` — exit 1 on match. Wired as `test:no-fetch-in-premium` npm script.

Neither layer alone is sufficient: the Vitest spec catches runtime call paths; the grep catches dead-code fetch leaks that are never reachable but violate the ADR posture.

### 9.8 Hydration contract

Every component using browser globals (`window.matchMedia`, `localStorage`, `useTheme().resolvedTheme`) must:
- Read the global inside `useEffect` only — never in render body or `useState` initializer.
- Use a `mounted` guard if the UI branches on browser-only state (canonical: ThemeToggle in T004).
- Be verified at Playwright Gate A (T008) and Gate B (T019) with `page.on('console', (msg) => { if (msg.type() === 'error') throw ... })` to catch hydration mismatches.

### 9.9 Test count target

≥125 tests total (104 baseline from PRD-000/001 + ~21 new for PRD-002). Breakdown of new tests:
- T013a/T013: 7 (SitesTile)
- T018a/T018: ~9 (F1×3, F4×3, F5×3)
- T031a/T031: ~7 (BentoGrid×3, PremiumPlaceholder×1, SubscribeBanner×3)
- T043a: 3 (useCounter hook)
- T047: 4 (reduced-motion)
- T048a/T048: 6 (no-fetch per card)
- Plus Playwright specs (T019, T047, T049, T050, T051) — counted separately as E2E suite.

The regression sweep (T065) must verify ≥125 before PR (T066).

## 10. Per-task test specifications

**Populated by QA Specialist (07) — 2026-05-18.**

Legend: `unit` = Vitest + Testing Library; `e2e` = Playwright; `script` = shell/npm script; `manual` = operator gate.

Tasks with no code output (T001, T002, T008, T020, T032, T053, T060, T061, T062, T063, T065, T066, T067) receive a brief verification entry only.

---

### T001 — OA-002-1 operator scope pre-flight
- **Verification:** Operator confirms `xmc.sites.*` scope enabled in Cloud Portal. Result appended to `manifest.operator_attention[]` resolving OA-002-1. No automated test possible — gate is interactive.

### T002 — Install recharts + verify next-themes
- **Verification:** `npm ls recharts next-themes` exits 0 and shows correct versions. `package.json` diff shows `recharts` added.

### T003 — Wire ThemeProvider
- **Driven by T003a RED tests.** See T003a.

### T003a — RED: ThemeProvider in root layout
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `app/layout.tsx` wraps children in `<ThemeProvider>` | Component matching `ThemeProvider` found wrapping `children` | unit | `site/app/layout.test.tsx` |
| `<html>` element has `suppressHydrationWarning` | `suppressHydrationWarning` prop present on html element | unit | `site/app/layout.test.tsx` |

### T004 — `<ThemeToggle>` component
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Renders `Monitor` icon before hydration (`mounted=false`) | `<Monitor>` svg in DOM; no `Sun`/`Moon` | unit | `site/components/theme-toggle.test.tsx` |
| Renders `Sun` when `resolvedTheme='light'` | `<Sun>` svg in DOM | unit | same |
| Renders `Moon` when `resolvedTheme='dark'` | `<Moon>` svg in DOM | unit | same |
| Trigger button has `aria-label="Toggle theme"` | `getByRole('button', { name: /toggle theme/i })` succeeds | unit | same |
| Dropdown has text labels: Light / Dark / System | All 3 menu items findable by text | unit | same |
| No browser-global branches in render body | No `typeof window` / `matchMedia` / `navigator` calls (grep assertion in code review; Playwright SSR smoke at T019 is the runtime gate) | manual/lint | T019 Playwright |
| Selecting "Dark" persists `localStorage.theme = 'dark'` | `localStorage.getItem('theme')` equals `'dark'` after menu click | unit | same |
| Focus ring present on trigger button | `focus-visible:ring-2` class applied | unit | same |

### T005 — Mount ThemeToggle in Topbar
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `rightSideItems` includes `id: 'theme'` entry | `<ThemeToggle>` is rendered inside the Topbar | unit | `site/app/full-page/page.test.tsx` (update existing) |
| `<TenantIdBadge>` no longer in `<main>` body | `<main>` does not contain `TenantIdBadge` directly | unit | same |
| `<PaywallVersionOverride>` no longer in `<main>` body | `<main>` does not contain `PaywallVersionOverride` directly | unit | same |

### T006 — `test:no-hex-in-bento` script
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Script exits 0 on empty `bento/` dir | Exit code 0 | script | `npm run test:no-hex-in-bento` |
| Script exits 1 when a hex literal `#ff0000` is injected in `bento/` | Exit code 1 + file:line printed | script | inject poisoned fixture in CI |
| `#000` / `#fff` also triggers exit 1 (3-char hex) | Exit code 1 | script | same fixture |
| `hsl(var(--primary))` and `currentColor` do NOT trigger | Exit code 0 | script | |

### T007 — `bento.css` grid templates + keyframes
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `npm run test:no-hex-in-bento` green against the new CSS file | Exit code 0 — no hex in bento.css | script | T006 gate |
| `bento.css` contains `prefers-reduced-motion: reduce` block | `animation: none` rule present in media block | unit (file content grep) | `site/scripts/test-no-hex-in-bento.sh` and/or manual |
| `@keyframes fadeUp` present | Keyframe present in file | manual (file content) | |
| `.premium-region--locked` filter rule present | `filter: blur(12px) opacity(0.7)` present | manual (file content) | |

### T008 — Gate A operator smoke
- **Verification:** `smoke_outcomes.gate_a.outcome = 'passed'`. Screenshots in both themes attached. `npm run test:no-hex-in-bento` green locally. No hydration console errors. Recharts visible in `npm ls`.

### T010 — `<BentoGrid>` shell
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Renders children in F1→F2→F3→F4→F5→P1…P6 DOM order | Rendered output order matches this sequence | unit | `site/components/bento/bento-grid.test.tsx` (note: this test lives under T031a for the locked branch; this is the minimal shell check) |
| `.premium-section` wraps both `.premium-region` and `<SubscribeBanner>` | Parent traversal: banner and region share same `.premium-section` parent | unit | (covered by T031a) |
| Each card has `data-card="f1"` … `data-card="f5"` / `p1`…`p6` attributes | All 11 data-card attributes present | unit | T031a / T031 |

### T011 — `<WelcomeHero>` (F1)
- **Driven by T018a RED tests.** See T018a for the behavioral specs that T011 must satisfy. No additional test file needed beyond T018a/T018.

### T013a — RED: `<SitesTile>` tests (write BEFORE T012)
| Scenario | Expected outcome | Type | File | Fixture provenance |
|---|---|---|---|---|
| Renders `<Skeleton>` on mount before promise resolves | Skeleton in DOM; no success/empty/error | unit RED | `site/components/bento/sites-tile.test.tsx` | N/A |
| Renders count "5 sites" + first 2 names on success (5-site array) | Text "5" and first 2 `displayName` values visible | unit RED | same | `// source: …types.gen.d.ts:964 Sites.Site` |
| Renders empty copy on success with 0 sites | Copy "No sites in this tenant yet" present | unit RED | same | empty `{ data: [] }` |
| Renders `<Alert>` + Retry button on rejected promise | Alert with destructive variant; button labeled "Retry" | unit RED | same | `mockListSitesError` |
| Clicking Retry re-invokes `client.query` — call count = 2 | Spy `.toHaveBeenCalledTimes(2)` | unit RED | same | |
| Single-unwrap fixture `{ data: Sites.Site[] }` is the default test path | Sites extracted directly from `result.data` | unit RED | same | `mockListSitesResponseSingle` |
| Double-unwrap fixture also tested — documented as "will fail until smoke determines correct shape" | Shape divergence detected at mock layer, not silently | unit RED | same | `mockListSitesResponseDouble` |

### T012 — `<SitesTile>` component (GREEN against T013a)
- T013a tests must all turn green. No additional test file required at this point — implementation is done when T013a passes.

### T013 — `<SitesTile>` REFACTOR + edge cases
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `sitecoreContextId` undefined → error state, `client.query` NOT called | Error text visible; spy call count = 0 | unit | `site/components/bento/sites-tile.test.tsx` (add case 6) |
| Unmount before promise resolves → no React state-update warning | No `console.error` "Can't perform a React state update on an unmounted component" | unit | same (add case 7) |

### T014 — `<PlanCard>` (F3)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Formats `Member since` date via `Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' })` | "May 15, 2026" for ISO `2026-05-15` input | unit | `site/components/bento/plan-card.test.tsx` |
| `null` tenantsRow → plan `"Free"`, status `"—"`, member_since `"—"` | All fallback values rendered | unit | same |
| Renders `<Badge>` with plan name from props | Badge text matches `plan` prop value | unit | same |
| Server-side fetch: `page.tsx` passes `tenantsRow` from `SupabaseStore.getEntitlement` | Integration: BentoGrid receives `tenantsRow` with correct shape | integration | `site/app/full-page/page.test.tsx` (update) |

### T015 — `<UserProfile>` (F4)
- **Driven by T018a RED tests.** See T018a.

### T016 — `<TenantInfo>` (F5)
- **Driven by T018a RED tests.** See T018a.

### T018a — RED: F1/F4/F5 tests (write BEFORE T011/T015/T016)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| F1: renders greeting with `given_name` from `useHostUser` | Text "Welcome, [given_name]" in DOM | unit RED | `site/components/bento/welcome-hero.test.tsx` |
| F1: fallback when all name fields absent | Text "Welcome, —" or similar graceful fallback | unit RED | same |
| F1: runtime contrast — `getComputedStyle` foreground/bg ≥ 4.5:1 | Contrast ratio assertion passes | unit RED | same |
| F4: initials from `given_name + family_name` | "CH" for "Christian Hahn" | unit RED | `site/components/bento/user-profile.test.tsx` |
| F4: fallback chain: no given_name → `name[0]`; no name → `?` | Correct single char or `?` in initials circle | unit RED | same |
| F4: email rendered in `font-mono` truncated style | Email text present; class `font-mono` applied | unit RED | same |
| F4: runtime contrast — initials circle bg vs foreground text ≥ 4.5:1 | Contrast ratio assertion passes | unit RED | same |
| F5: truncates `marketplaceAppTenantId` to `xxxxxxxx…xxxx` (8+ellipsis+4) | Truncated form present; full ID not visible | unit RED | `site/components/bento/tenant-info.test.tsx` |
| F5: renders `—` for display name, organization, environment when all absent | All 4 cells show `—` | unit RED | same |
| F5: runtime contrast — muted label text vs card bg ≥ 4.5:1 | Contrast ratio assertion passes | unit RED | same |

### T018 — GREEN + REFACTOR for F1/F4/F5
- All T018a tests pass GREEN after T011/T015/T016 are implemented. Runtime contrast assertions are the primary hardening addition. If any contrast assertion fails (Nova dark mode `--primary-foreground` collapse), add an `operator_attention[]` entry immediately — do not skip.
- **Dark-mode contrast** (Playwright at T019/T051): Vitest tests use the test-renderer's default (light) theme. Dark-mode contrast must be caught at Playwright Gate B smoke and T051 axe-core scan.

### T017 — Replace FreeSection with BentoGrid in page.tsx
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `<BentoGrid>` is rendered inside `<main>` | `getByTestId('bento-grid')` or structural assertion | unit | `site/app/full-page/page.test.tsx` (update) |
| `<FreeSection>` NOT rendered on page | Absence assertion | unit | same |
| `<GatedSectionWithDevPicker>` NOT rendered on page | Absence assertion | unit | same |
| `<DemoModeBanner>` still rendered when env flag set | Presence assertion with mocked env | unit | same |
| `tenantsRow` fetched from `SupabaseStore` and passed to `<BentoGrid>` | Prop passed with correct shape | integration | same |

### T019 — Free-tier theme + responsive Playwright smoke
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| No console errors/hydration warnings at 1440/900/390 viewports | `page.on('console')` listener reports no errors | e2e | `site/tests/e2e/bento-free-tier.spec.ts` |
| Light + dark screenshots taken at 3 viewports | 6 baseline screenshots committed | e2e | same |
| ThemeToggle click → theme flips without console errors | No errors; `html.dark` class toggles | e2e | same |
| `localStorage.theme` persists after reload | After reload, resolvedTheme matches persisted value | e2e | same |
| `prefers-reduced-motion: reduce` → `.bento-card--premium` has `animation-name: none` | CSS assertion via `page.emulateMedia({ reducedMotion: 'reduce' })` | e2e | same |
| Responsive: 1440 → 4-col grid; 900 → 2-col; 390 → 1-col | CSS grid columns assertion via `getComputedStyle` | e2e | same |
| Axe-core scan in both themes — no contrast violations | `@axe-core/playwright` passes | e2e | same |

### T020 — Gate B operator smoke
- **Verification:** `smoke_outcomes.gate_b.outcome = 'passed'` (or `'pass_with_caveats'` if F2 hit R1 fallback). Operator confirms F1–F5 show real data. SDK envelope shape (single vs double unwrap) for `xmc.sites.listSites` captured and applied to T012/T013 if incorrect. Screenshot proof both themes.

### T025 — `<PremiumPlaceholder>`
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| 6 shape variants each render distinct Skeleton structure | Each shape returns non-empty output (covered by T031a shape tests) | unit RED | `site/components/bento/premium-placeholder.test.tsx` (via T031a) |
| No hex literals in component file | `npm run test:no-hex-in-bento` exits 0 | script | T006 gate |

### T026 — Premium card stubs (P1–P6)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Each card renders `<PremiumPlaceholder>` in locked state | Placeholder shape in DOM for all 6 shapes | unit | `site/components/bento/premium-no-fetch.test.tsx` baseline (T048a) |
| Each card renders placeholder in unlocked state too (pre-Tranche D) | Same placeholder for now | unit | same |
| No fetches in any state at T026 (stubs are pure render) | T048a throw-mocks not triggered | unit | T048a |

### T027 — `<SubscribeBanner>`
- **Driven by T031a RED tests.** See T031a for behavioral specs.
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `aria-labelledby` points to banner title element id | Accessible description wiring | unit | T031a / T031 |
| Banner glow uses `hsl(var(--primary)/...)` — no hex | Script gate | script | `npm run test:no-hex-in-bento` |

### T028 — Premium corner badges
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Each of P1–P6 renders `<Badge>` with "Premium" text in locked state | Badge with "Premium" label in DOM per card | unit | `site/components/bento/premium-placeholder.test.tsx` or per-card tests |
| Badge is readable above blur — z-index stacking | Badge is NOT inside `.premium-region--locked` wrapper (parent traversal) | unit | same |
| Badge renders in unlocked state too | Badge present when `locked=false` | unit | same |

### T029 — Wire `useEntitlement` into BentoGrid
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `useEntitlement` returns `'tenant_no_subscription'` → `isLocked=true` | Covered by T031a BentoGrid test | unit RED | T031a |
| `useEntitlement` returns `'allowed'` → `isLocked=false` | Covered by T031a BentoGrid test | unit RED | T031a |
| Hook polling interval does NOT cause re-renders that break animations | Playwright smoke at Gate C (T032) | e2e | T032 |

### T030 — Manual readability check Tranche C
- **Verification:** Manual operator check recorded in `smoke_outcomes.gate_c.notes`. Not automatable — requires visual assessment at 50cm distance.

### T031a — RED: locked-state tests (write BEFORE T025–T029)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| BentoGrid locked: 6 `<PremiumPlaceholder>` silhouettes render | 6 skeleton-shape elements in DOM | unit RED | `site/components/bento/bento-grid.test.tsx` |
| BentoGrid locked: `<SubscribeBanner>` is a SIBLING of `.premium-region` | `banner.parentElement === premiumRegion.parentElement` AND both are inside `.premium-section` | unit RED | same |
| BentoGrid locked: `.premium-region--locked` has `aria-hidden="true"` | `aria-hidden="true"` attribute present | unit RED | same |
| BentoGrid allowed: 6 premium cards with `locked=false`, no banner, no `aria-hidden` | Correct state for allowed path | unit RED | same |
| PremiumPlaceholder shape='chart': renders chart skeleton | Chart skeleton Skeleton count ≥ 1 | unit RED | `site/components/bento/premium-placeholder.test.tsx` |
| PremiumPlaceholder shape='progress-bars': renders 3 bar skeletons | 3 Skeleton bars | unit RED | same |
| PremiumPlaceholder shape='list': renders 5 row skeletons | 5 row structures | unit RED | same |
| PremiumPlaceholder shape='kpi-strip': renders 4 block skeletons | 4 blocks | unit RED | same |
| PremiumPlaceholder shape='bullets': renders 3 text bars | 3 text bar skeletons | unit RED | same |
| PremiumPlaceholder shape='ring-sparkline': renders ring + line | Ring + wavy-line skeletons | unit RED | same |
| SubscribeBanner: renders "Unlock Premium" title | Text present | unit RED | `site/components/bento/subscribe-banner.test.tsx` |
| SubscribeBanner: renders "€0.99 lifetime" copy | Text present | unit RED | same |
| SubscribeBanner: Subscribe button click opens `<PaywallCheckoutDialog>` | Dialog opened assertion | unit RED | same |
| SubscribeBanner: CTA button contrast — `color !== backgroundColor` | `--primary-foreground` collapse guard | unit RED | same |

### T031 — GREEN + REFACTOR for locked-state tests
- All T031a tests pass GREEN. Add keyboard navigation test: `userEvent.keyboard('{Enter}')` on Subscribe button opens dialog. Refactor: shared `renderBentoGrid(status)` helper. All tests green.

### T032 — Gate C operator smoke
- **Verification:** `smoke_outcomes.gate_c.outcome = 'passed'`. Free cards + 6 blurred placeholders + Subscribe banner + 6 corner badges confirmed. Click Subscribe → `<PaywallCheckoutDialog>` opens. No console errors. Screenshots both themes.

### T040 — `<ActivityChart>` (P1)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Recharts chunk NOT in Network panel when `locked=true` | No `activity-chart-recharts` chunk fetched | e2e | `site/tests/e2e/bento-theme-recharts.spec.ts` |
| In unlocked state, `<Suspense>` fallback shown briefly then chart draws | Suspense fallback visible then replaced | e2e | same |
| Chart area path `stroke` matches resolved `--primary` in light theme | `getComputedStyle` assertion on SVG path stroke color | e2e | `bento-theme-recharts.spec.ts` |
| Chart re-renders on theme flip via `key={resolvedTheme}` | SVG path stroke color changes after theme toggle | e2e | same |
| No fetches in unlocked state | T048a throw-mock NOT triggered | unit | T048a |
| No hex in component file | Script gate | script | `test:no-hex-in-bento` |

### T041 — `<ContentDistribution>` (P2)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| 4 progress bars render with correct labels (Pages/Datasources/Components/Forms) | All 4 labels present | unit | `site/components/bento/content-distribution.test.tsx` |
| Progress bars fill with correct target values (47/34/18/9) | `value` attr matches targets after fake-timer advance | unit | same |
| Stagger: bar 2 starts 200ms after bar 1 (state update sequencing) | `setTimeout` call order checked via fake timers | unit | same |
| No fetches in unlocked state | T048a throw-mock NOT triggered | unit | T048a |

### T042 — `<RecentEdits>` (P3)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| 5 exact list rows render (exact PRD-002 § 5 P3 text) | All 5 row texts present | unit | `site/components/bento/recent-edits.test.tsx` |
| Author initials circles present for CH/AB/MS | 3 distinct initials in DOM | unit | same |
| No fetches in unlocked state | T048a throw-mock NOT triggered | unit | T048a |

### T043a — RED: `useCounter` hook + CmsHealth (write BEFORE T043)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `useCounter(target, durationMs)` starts at 0 | `result.current` is 0 immediately | unit RED | `site/lib/use-counter.test.ts` |
| After `durationMs` with fake timers, value equals `target` | `result.current` equals target after `advanceTimersByTime` | unit RED | same |
| With `prefers-reduced-motion: reduce` mocked, returns `target` immediately | No animation ticks; value = target on first render | unit RED | same |
| `<CmsHealth locked=false>`: 4 KPI labels rendered ("Total pages", "Published this week", "Languages", "Stale items") | All 4 labels in DOM | unit RED | `site/components/bento/cms-health.test.tsx` |
| `<CmsHealth locked=false>`: final values reachable via fake timers (489, 12, 4, 23) | DOM values match after timer advance | unit RED | same |

### T043 — `<CmsHealth>` GREEN against T043a
- T043a tests pass GREEN after implementation. No additional test cases at this step — T043a covers the behavioral contract.

### T044 — `<SitecoreContentInsights>` (P5)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| 3 exact bullet texts render (per PRD-002 § 5 P5) | All 3 strings present in DOM | unit | `site/components/bento/sitecore-content-insights.test.tsx` |
| No fetches in unlocked state | T048a throw-mock NOT triggered | unit | T048a |

### T045 — `<ContentHealthScore>` (P6)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| SVG ring center label "87" present | Text "87" in DOM | unit | `site/components/bento/content-health-score.test.tsx` |
| Ring `stroke-dashoffset` animates: initial value = circumference | Initial `stroke-dashoffset` matches circle circumference (2πr) | unit | same |
| Ring `stroke-dashoffset` reaches target value after 800ms (fake timers) | Final `stroke-dashoffset` matches `circumference * (1 - 0.87)` | unit | same |
| With `prefers-reduced-motion: reduce`: ring renders at final state immediately | No rAF ticks; final value on mount | unit | same |
| No fetches in unlocked state | T048a throw-mock NOT triggered | unit | T048a |

### T046 — Stagger-in cascade wiring
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Each P1–P6 outer Card has class `bento-card--premium` when `locked=false` | All 6 Card elements have the class | unit | `site/components/bento/bento-grid.test.tsx` (extend T031) |
| DOM order is P1→P2→P3→P4→P5→P6 (`:nth-child` relies on this) | `querySelectorAll('[data-card^="p"]')` returns cards in this order | unit | same |
| Playwright: computed `animation-delay` is 0/100/200/300/400/500ms per card | 6 cards have ascending delays | e2e | `site/tests/e2e/bento-unlocked.spec.ts` |
| CSS animation disabled under `prefers-reduced-motion: reduce` | `animation-name: none` via `emulateMedia` | e2e | T019 / T047 |

### T047 — `prefers-reduced-motion` validation
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `<ActivityChart>`: `isAnimationActive` is `false` when `prefers-reduced-motion: reduce` | Prop or `data-animation-active="false"` attribute | unit | `site/components/bento/reduced-motion.test.tsx` |
| `<CmsHealth>`: counters at final value immediately (no rAF tick) | Values = 489/12/4/23 on first render without timer advance | unit | same |
| `<ContentDistribution>`: bars at target value immediately | Progress values at 47/34/18/9 on mount | unit | same |
| `<ContentHealthScore>`: ring + sparkline at final state immediately | dashoffset at final; sparkline complete | unit | same |
| Playwright: `.bento-card--premium` has `animation-name: none` with `emulateMedia({ reducedMotion: 'reduce' })` | CSS computed value assertion | e2e | `bento-free-tier.spec.ts` extended |

### T048a — RED no-fetch contract for premium stubs (write BEFORE T040–T045)
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| All 6 premium card stubs with `locked=false` do NOT call `global.fetch` | `fetch` throw-mock not triggered | unit RED | `site/components/bento/premium-no-fetch.test.tsx` |
| All 6 stubs do NOT call `client.query` | SDK throw-mock not triggered | unit RED | same |
| All 6 stubs do NOT call `supabase.from` | Supabase throw-mock not triggered | unit RED | same |

### T048 — No-fetch shell script + npm script
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `test:no-fetch-in-premium.sh` exits 0 against clean premium card files | Exit code 0 | script | `npm run test:no-fetch-in-premium` |
| Script exits 1 if `fetch(` appears in any premium card file | Exit code 1 + file:line | script | inject poisoned fixture |
| Script exits 1 if `client.query(` appears | Exit code 1 | script | same |
| Script exits 1 if `supabase.` appears | Exit code 1 | script | same |
| T048a Vitest spec still green against Tranche D implementations | No fetches added in T040–T045 | unit | T048a (re-run) |

### T049 — Recharts theme re-render
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| SVG path `stroke` reflects resolved `--primary` in light theme | `getComputedStyle` on a sibling `bg-primary` element provides reference; chart path stroke matches | e2e | `site/tests/e2e/bento-theme-recharts.spec.ts` |
| SVG path `stroke` changes after flip to Dark | Stroke color differs from light-theme value | e2e | same |
| `<ResponsiveContainer key={resolvedTheme}>` remounts — no chart freeze | Chart re-renders; SVG path element present | e2e | same |

### T050 — Tranche D Playwright POC visual smoke
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `bento-unlocked-1440-light.png` vs dev server — threshold ≤ 5% | `toHaveScreenshot` passes | e2e | `site/tests/e2e/bento-unlocked.spec.ts` |
| `bento-unlocked-1440-dark.png` vs dev server dark | Same | e2e | same |
| POC served via `npx serve pocs/poc-v2-prd002/ --listen 5180` (NOT `file://`) | HTTP serve required for Playwright | e2e setup | |
| Any meaningful divergence is flagged as "POC drift" — NOT silently promoted to baseline | Finding routed back via `/architect` | process | |

### T051 — Theme contrast smoke
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Subscribe banner CTA button: foreground vs background contrast ≥ 3:1 (large text) in light theme | `axe-core` contrast rule passes | e2e | extended `bento-free-tier.spec.ts` |
| Subscribe banner CTA button: same in dark theme | Same | e2e | same |
| Premium corner badges: `text-primary` on `bg-primary` readable in both themes | axe-core passes | e2e | same |
| Recharts chart text color on `bg-card` background meets AA | axe-core passes | e2e | same |
| Subscribe banner CTA label not invisible (`--primary-foreground` not collapsed onto `--primary`) | Visual: text clearly visible; axe-core check | e2e | same |
| Any AA violation recorded in `manifest.operator_attention[]` | Finding documented if found | process | |

### T052 — Update `full-page/page.test.tsx`
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `<BentoGrid>` present in rendered output | Structural assertion | unit | `site/app/full-page/page.test.tsx` |
| `<FreeSection>` absent from rendered output | Absence assertion | unit | same |
| `<GatedSectionWithDevPicker>` absent | Absence assertion | unit | same |
| `<DemoModeBanner>` env-flag behavior preserved | Conditional render with mocked env | unit | same |

### T053 — Gate D real-money smoke
- **Verification:** `smoke_outcomes.gate_d.outcome = 'passed'` with evidence refs. Stripe payment €0.99 successful. Cascade visible (1.1s). Network panel: zero premium-card fetches in either state. Console clean. Screenshots of unlock sequence attached.

### T060–T063 — Docs
- **Verification:** File content checks. README has "Customizing the bento" + "Production hardening for adopters" sections. CHANGELOG has `[0.3.0]` entry. Smoke walkthrough updated (or noted N/A).

### T064 — Public API barrel
| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `import { BentoGrid } from '@/src/lib/paywall'` resolves | `BentoGrid` is truthy | unit | `site/src/lib/paywall/index.test.ts` (or inline in T065 sweep) |

### T065 — Regression sweep
- **Verification:** All 8 commands exit 0. Test count ≥125. Output captured in implementation runbook.

### T066 — PR open
- **Verification:** PR URL captured in `manifest.implementation.pr_url`. PR body includes Gate A–D evidence refs and ADR summary.

### T067 — Gate E ship
- **Verification:** `smoke_outcomes.gate_e.outcome = 'passed'`. Production live at Vercel URL. `manifest.implementation.status = 'shipped'`.

## Handoff Metadata

- **Canonical run manifest:** `products/paywall-blueprint/project-planning/workflow/run-20260517T223000Z.json`
- **Source PRD:** `products/paywall-blueprint/project-planning/PRD/prd-002.md`
- **Source PRD-minimal (Developer 08 consumes):** `products/paywall-blueprint/project-planning/PRD/prd-minimal-002.md`
- **Source architecture:** `products/paywall-blueprint/project-planning/architecture/architecture-20260517T223000Z.md`
- **Selected UI variant:** `products/paywall-blueprint/project-planning/ui-design/ui-design-20260517T223000Z-v2.md` (v2 Editorial Cadence)
- **Winning POC clickdummy:** `products/paywall-blueprint/pocs/poc-v2-prd002/index.html`
- **Recommended next command:** `/implement` (Developer 08 reads prd-minimal-002 + this enriched task breakdown + the POC visual reference)
- **Recommended next input file:** `qa-report.md` if produced; else N/A (the in-place QA enrichment of this file is the test contract)
- **ADR candidates from this plan:** none — three existing ADRs (0016, 0017 deferred, 0018) cover all binding decisions
