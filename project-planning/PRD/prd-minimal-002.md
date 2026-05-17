# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-002.md
pairs_with_prd: project-planning/PRD/prd-002.md
generated_at: 2026-05-17T23:00:00Z
revised_at: 2026-05-18T00:30:00Z
run_manifest: project-planning/workflow/run-20260517T223000Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Slim-context PRD-002 for Developer 08. Reads alongside the enriched task breakdown.
  Replaces /full-page with a bento-grid dashboard. Free tier real, premium tier fake.
  Winning variant: v2 — Editorial Cadence (asymmetric masonry).
---

## Problem (one short paragraph)

PRD-001 shipped real €0.99 Stripe Checkout end-to-end, but the freemium *demonstration* is visually flat — one Welcome card vs one free section. Adopters cloning the blueprint inherit working plumbing but a tepid showcase. PRD-002 replaces `/full-page` with an 11-card bento dashboard (5 free + 6 premium) that makes the freemium value proposition self-explanatory at a glance.

## Goal (one short paragraph)

Build the bento-grid dashboard at `/full-page` per **v2 Editorial Cadence** (asymmetric masonry, 4-col CSS Grid with named template-areas; F1 Welcome + P1 Publishing activity + P4 KPI strip + F5 Tenant info strip as heroes). **5 free cards with real data we know**: F1 Welcome hero (`host.user` + `application.context`), F2 Sites tile (`xmc.sites.listSites`), F3 Plan + member since (Supabase `tenants`), F4 User profile (`host.user` avatar + email + sub), F5 Tenant info (full-width strip: display name + tenant ID + organization + environment). **6 premium cards 100% FAKE / Sitecore-flavored**: P1 Publishing activity, P2 Content distribution, P3 Recent edits (Site · Template — time — author initials), P4 CMS health overview KPIs, P5 Sitecore content insights, P6 Content health score + forecast. Premium cards mount as placeholder silhouettes when locked; reveal with CSS stagger-in after €0.99 payment. Theme toggle (light/dark/system) always visible in topbar (ADR-0016, showcase posture).

**The POC clickdummy at `pocs/poc-v2-prd002/index.html` is the visual source of truth.** When this spec diverges from the clickdummy, the clickdummy wins.

## Non-negotiables (bullets)

- **All 15 PRD-001 ADRs (0001–0015) carry forward unchanged.** Three new ADRs in PRD-002:
  - **ADR-0016** Theme toggle visibility (always visible; showcase posture).
  - **ADR-0017** `processed_events.tenant_id` column — **DEFERRED 2026-05-18** (no longer needed in PRD-002 after dropping the events card; preserved as future-PRD reference design).
  - **ADR-0018** Premium fake-data blueprint posture + adopter-hardening note.
- **Existing freemium plumbing UNTOUCHED:** `useEntitlement`, `PaywallCheckoutDialog`, `/paywall-return`, `StripeProvider`, `/api/checkout`, `/api/portal`, `/api/entitlement`, `/api/webhooks/stripe`. PRD-002 wires the bento around these — does not redesign them.
- **`xmc.sites.listSites` is the ONLY new Marketplace SDK call.** Response shape per `sitecore:marketplace-sdk-xmc` skill; capture-and-fix at Tranche A real-tenant smoke (progressive-fixture-capture per `feedback_assumed_shapes_progressive_capture.md`).
- **`xmc.authoring.graphql` is OUT OF SCOPE.** Schema risk too high. Adopters add their own post-fork. Premium content stats are FAKE.
- **NO new API routes.** No `/api/activity`, no `/api/payments`. F4 (user profile) and F5 (tenant info) use existing SDK queries inline.
- **NO Supabase schema migrations.** ADR-0017 deferred; `processed_events` stays read-only as PRD-001 shipped it. Webhook handler **NOT modified**.
- **Premium cards make ZERO HTTP requests, database queries, or SDK calls.** Verified at Tranche D via Network panel smoke (AC4.7).
- **Recharts is NEW dep.** `npm install recharts` at Tranche A. **Lazy-loaded via dynamic import** so free-tier first paint doesn't pay the bundle cost. NFR-1 budget: free-tier delta ≤ 50kb gzipped; premium chunk separately measured.
- **`next-themes` is required.** Verify installed at Tranche A; install if missing. `<ThemeProvider>` wraps root layout.
- **Theme toggle ALWAYS VISIBLE in topbar.** Departs from `feedback_dark_mode_default_policy.md` env-gating (per ADR-0016, showcase posture). README "Production hardening for adopters" warns adopters to env-gate for production.
- **ThemeToggle hydration-mismatch guard MANDATORY** per `feedback_hydration_mismatch_pattern.md`. Render neutral icon (or `null`) until `useEffect` sets `mounted=true`. Architect risk R-J.
- **No hex colors in bento.** New `test:no-hex-in-bento` regex check fails on any `#[0-9a-fA-F]{3,8}` literal in `site/components/bento/**` or `site/components/theme-toggle.tsx`. All colors via Blok semantic tokens.
- **Locked-state visual contract:** `filter: blur(12px)` + `opacity: 0.7` + `pointer-events: none` on the premium-region wrapper. NOT `backdrop-filter`. Manual readability smoke (text unreadable from 50cm at typical viewport zoom) at Tranche C.
- **Subscribe banner DOM structure (CRITICAL — bug-fixed during POC generation):** Banner MUST be a **SIBLING of `.premium-region`**, NOT a child. Both wrapped in `.premium-section { position: relative }`. If banner is a child of premium-region, the parent's `filter: blur(12px)` rasterizes the banner subtree → "Unlock Premium" becomes unreadable (verified bug 2026-05-17). The POC at `pocs/poc-v2-prd002/index.html` has the canonical structure — replicate exactly.
- **Locked premium = placeholder silhouettes only.** Cards mount as skeleton shapes (`<PremiumPlaceholder>`). NO fake data, NO real data, NO fetches in locked state. Unlocked state mounts fake-data content (FR-3.1 + R5a).
- **Subscribe banner is the ONLY interactive element in locked state.** Premium region wrapper gets `aria-hidden="true"`.
- **Stagger-in animation order = DOM order = visual reading order**. v2 spec uses **100ms steps** (0/100/200/300/400/500ms — slight override of architecture's nominal 80ms; documented in v2 spec § 9 and POC). DOM order MUST match visual reading order (top-left → right → next row → top-left → right).
- **CSS keyframes only.** NO framer-motion / motion / lottie. Recharts built-in animations OK. Counter animations via `requestAnimationFrame`.
- **`prefers-reduced-motion: reduce` respected.** All animated transitions skip to final state when set.
- **The bento composes at `app/full-page/page.tsx` level**, NOT inside `<NoSubscriptionState>` / `<AllowedState>`. Legacy state components stay in codebase as design-reference for `seats_full` / `unassigned` paths but are no longer rendered on `/full-page`.
- **Each bento card is a separate component file under `site/components/bento/`.** Props-typed (no fetches inside the card body — fetches live in the shell or via server-render). NFR-10 enforced structurally; README "Customizing the bento" documents the swap pattern.
- **Cloud Portal scope pre-flight (OA-002-1):** verify `xmc.sites.*` API access scope enabled for the app registration before Tranche A code. If missing/named-differently, capture and update; fallback: F2 ships with "Not available" state.
- **Stack:** Next.js 16 App Router (no scaffold change), TypeScript strict, `recharts` (new), `next-themes` (verify), Blok primitives via shadcn registry, existing `@sitecore-marketplace-sdk/client` + Supabase + Stripe clients.

## Card inventory (v2 — Editorial Cadence)

### Free tier (always visible)

| # | Card | Data source | Visual treatment |
|---|---|---|---|
| F1 | **Welcome hero** | `host.user.given_name` + `application.context.resourceAccess[0].tenantDisplayName` + plan badge | HERO 2×2; left-top; large heading |
| F2 | **Sites tile** | `xmc.sites.listSites` count + 1–2 names | Support card; right of F1 |
| F3 | **Plan + member since** | Supabase `tenants` row | Support card; right of F1 |
| F4 | **User profile** | `host.user` — avatar (initials fallback) + full name + email + Auth0 `sub` (mono) | Support card |
| F5 | **Tenant info** | `application.context.resourceAccess[0]` + `marketplaceAppTenantId` | Full-width strip with 4-col key/value (display name / tenant ID short mono / organization / environment) |

### Premium tier (blurred until paid; ALL FAKE / Sitecore-flavored)

| # | Card | Content | Visual treatment |
|---|---|---|---|
| P1 | **Publishing activity (30 days)** | Recharts area chart — fake 30-day daily publishes (weekday peak / weekend dip). Badge "+12% vs prev". | HERO 2×1; left within premium-region; lazy-loaded Recharts chunk |
| P2 | **Content distribution** | 4 progress bars: Pages 124 (47%) / Datasources 89 (34%) / Components 47 (18%) / Forms 23 (9%) | Support card |
| P3 | **Recent edits feed** | 5 entries with `Site · Template — relative time — author initials` pattern: "Marketing Site · Homepage hero — 2h ago — CH" / "Blog · Post template — yesterday — AB" / "Company Site · Footer datasource — 2d ago — CH" / "Product Catalog · Featured product card — 3d ago — MS" / "Marketing Site · Career page meta — 4d ago — AB" | Support card |
| P4 | **CMS health overview** | 4 KPI tiles with counter animations: Total pages 489 / Published this week 12 / Languages 4 / Stale items 23 (sub-label "Not updated in 90+ days") | Full-width strip below P1+P2+P3 row |
| P5 | **Sitecore content insights** | 3 hardcoded bullets (Sitecore-flavored): blog template reuse / archival candidates / publishing frequency observations | Support card |
| P6 | **Content health score + forecast** | Progress ring 87/100 + dashed-line forecast sparkline. Subtitle: "Composite of freshness, coverage, and link integrity" | Support card |

## In scope / out of scope (very short)

- **In scope:** New `<BentoGrid>` shell (asymmetric masonry per v2) + 5 free + 6 premium card components + `<ThemeToggle>` + `<SubscribeBanner>` (as sibling of `.premium-region` in `.premium-section` wrapper) + `<PremiumPlaceholder>` skeleton silhouette; one new SDK call (`xmc.sites.listSites`); new `test:no-hex-in-bento` script; README "Customizing the bento" + "Production hardening for adopters" sections; CHANGELOG `[0.3.0]`; `docs/smoke-walkthrough.md` refresh.
- **Out of scope:** Per-user seats (PRD-003); Customer Portal wrap (PRD-004); real premium data fetches (PRD-005 candidate per § 15 of full PRD); `xmc.authoring.graphql` queries; `/api/activity`, `/api/payments` routes; `processed_events.tenant_id` schema migration (ADR-0017 deferred); webhook handler changes; editable bento layout; drill-into-card detail views; real-time data updates; multi-language; per-card permission gating; AI insights as real AI; mobile carousel.

## Success criteria (3–7 bullets)

- **G1 — Free cards live with real data:** Bento renders cleanly in Cloud Portal iframe; all 5 free cards populated within 2s of SDK handshake. Screenshot evidence committed.
- **G2 — Premium gating visually unambiguous:** Locked state shows 6 blurred placeholder silhouettes + Subscribe banner (banner is SIBLING of premium-region — must be readable, NOT blurred); manual readability check passes (text unreadable from 50cm). No API fetches in locked state (Network panel smoke).
- **G3 — Unlock flow delightful:** Pay €0.99 with `4242 4242 4242 4242` → Stripe Checkout → `/paywall-return` → iframe reloads → premium cards stagger-in over ~600ms with chart-draw + counter animations. Screenshot evidence.
- **G4 — Theme switching works:** Toggle cycles Light/Dark/System; all 11 cards re-render correctly in both themes; persists across reload. ThemeToggle has `mounted` hydration guard (no SSR/CSR mismatch).
- **G5 — `test:no-hex-in-bento` green** in CI.
- **G6 — Ship gate:** PR `prd-002 → main` merged. All quality gates green (lint / typecheck / test / build / test:dce / test:env-leak / test:no-hex-in-bento). README + CHANGELOG merged with the PR.

## Key constraints & assumptions

- **ADR-0016 (NEW)** — Theme toggle always visible in topbar (showcase posture). README "Production hardening for adopters" warns to env-gate for production.
- **ADR-0017 (DEFERRED 2026-05-18)** — `processed_events.tenant_id` column NOT added in PRD-002 (events card replaced with user profile). Preserved as reference design.
- **ADR-0018 (NEW)** — Premium bento cards use fake data only ("fake it till we make it"). Locked state = placeholder silhouettes; unlocked state = hardcoded/deterministic fake content. NO fetches at any state. Adopters who want real premium data harden via server-side `/api/entitlement` check or future `withEntitlement` HOF (R5b).
- **PRD-001 contract intact:** Stripe webhook, useEntitlement, dialog, paywall-return all unchanged. Bento wraps around them.
- **Tenant identity remains `application.context.marketplaceAppTenantId`** (PRD-000 lock).
- **User identity remains `host.user.sub`** (PRD-000 lock).
- **Visibility-refresh + 60s polling cap** (PRD-001 post-ship fix) unchanged.
- **`xmc.sites.listSites` response shape** assumed per `sitecore:marketplace-sdk-xmc` skill (double `.data.data` unwrap envelope per `reference_marketplace_sdk_envelope_authoring_graphql.md`); captured at Tranche A real-tenant smoke; fix inline on divergence.
- **POC clickdummy** at `pocs/poc-v2-prd002/index.html` is the visual source of truth — if the spec text diverges, the clickdummy wins.

## Handoff

- **Full PRD:** `project-planning/PRD/prd-002.md` (for humans and upstream agents).
- **Architecture:** `project-planning/architecture/architecture-20260517T223000Z.md`.
- **Selected UI spec:** `project-planning/ui-design/ui-design-20260517T223000Z-v2.md` (Editorial Cadence; § 7 has POC reference + card content delta + critical-bug note).
- **POC visual source of truth:** `pocs/poc-v2-prd002/index.html` + `styles.css` + `script.js`.
- **Screenshots (8):** `pocs/screenshots/prd-002/prd-002-v2-{light,dark}-{locked,unlocked}.png` (+ v1 sibling for comparison).
- **Executable contract:** `project-planning/plans/task-breakdown-<timestamp>.md` after QA enrichment.
- **ADRs:** `project-planning/ADR/adr-0001-*.md` through `adr-0018-*.md`. ADRs 0016/0018 new + active; 0017 deferred.
