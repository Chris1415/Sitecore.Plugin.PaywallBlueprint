# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-002.md
pairs_with_prd: project-planning/PRD/prd-002.md
generated_at: 2026-05-17T23:00:00Z
run_manifest: project-planning/workflow/run-20260517T223000Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Slim-context PRD-002 for Developer 08. Reads alongside the enriched task breakdown.
  Replaces /full-page with a bento-grid dashboard. Free tier real, premium tier fake.
---

## Problem (one short paragraph)

PRD-001 shipped real €0.99 Stripe Checkout end-to-end, but the freemium *demonstration* is visually flat — one Welcome card vs one free section. Adopters cloning the blueprint inherit working plumbing but a tepid showcase. PRD-002 replaces `/full-page` with a 11-card bento dashboard (5 free + 6 premium) that makes the freemium value proposition self-explanatory at a glance.

## Goal (one short paragraph)

Build a bento-grid dashboard at `/full-page` with **5 always-visible free cards using real APIs we know** (Welcome from `host.user` + `application.context`, Sites tile from `xmc.sites.listSites`, Plan + member-since from Supabase `tenants`, Webhook activity from Supabase `processed_events` filtered by new `tenant_id` column, Extension points from `application.context.extensionPoints[]`) and **6 premium cards that are 100% FAKE / marketing data** — pure design + animation showcase, NO API fetches. Premium cards mount as placeholder silhouettes when locked and reveal with a CSS stagger-in cascade after €0.99 payment. Theme toggle (light/dark/system) in topbar, always visible (ADR-0016, showcase posture). Operator's mantra: **"fake it till we make it"** on premium; **stick to what we know** on free.

## Non-negotiables (bullets)

- **All 15 PRD-001 ADRs (0001–0015) carry forward unchanged.** Three new ADRs in PRD-002: 0016 (theme toggle visibility), 0017 (processed_events.tenant_id column), 0018 (premium fake-data blueprint posture).
- **Existing freemium plumbing UNTOUCHED:** `useEntitlement`, `PaywallCheckoutDialog`, `/paywall-return`, `StripeProvider`, `/api/checkout`, `/api/portal`, `/api/entitlement`, `/api/webhooks/stripe`. PRD-002 wires the bento around these — does not redesign them.
- **`xmc.sites.listSites` is the ONLY new Marketplace SDK call.** Response shape per `sitecore:marketplace-sdk-xmc` skill; capture-and-fix at Tranche A real-tenant smoke (progressive-fixture-capture per `feedback_assumed_shapes_progressive_capture.md`).
- **`xmc.authoring.graphql` is OUT OF SCOPE.** Schema risk too high. Adopters add their own post-fork. Premium content stats are FAKE.
- **NO new API routes.** F4 (Webhook activity) uses server-render via existing `SupabaseStore` pattern (RSC fetch). No `/api/activity`, no `/api/payments`.
- **Premium cards make ZERO HTTP requests, database queries, or SDK calls.** Verified at Tranche D via Network panel smoke (AC4.7).
- **`processed_events` gets a new `tenant_id TEXT` column.** Operator runs one-line SQL at Tranche A start (ADR-0017). Webhook handler one-line update to write `tenant_id` on insert.
- **Recharts is NEW dep.** `npm install recharts` at Tranche A. **Lazy-loaded via dynamic import** so free-tier first paint doesn't pay the bundle cost. NFR-1 budget: free-tier delta ≤ 50kb gzipped; premium chunk separately measured.
- **`next-themes` is required.** Verify installed at Tranche A; install if missing. `<ThemeProvider>` wraps root layout.
- **Theme toggle ALWAYS VISIBLE in topbar.** Departs from `feedback_dark_mode_default_policy.md` env-gating (per ADR-0016, showcase posture). README "Production hardening for adopters" warns adopters to env-gate for production.
- **No hex colors in bento.** New `test:no-hex-in-bento` regex check fails on any `#[0-9a-fA-F]{3,8}` literal in `site/components/bento/**` or `site/components/theme-toggle.tsx`. All colors via Blok semantic tokens.
- **Locked-state visual contract:** `filter: blur(12px)` + `opacity: 0.7` + `pointer-events: none` on the premium region wrapper. NOT `backdrop-filter`. Manual readability smoke (text unreadable from 50cm at typical viewport zoom) at Tranche C.
- **Locked premium = placeholder silhouettes only.** Cards mount as skeleton shapes. NO fake data, NO real data, NO fetches in locked state. Unlocked state mounts fake-data content (FR-3.1 + R5a).
- **Subscribe banner is the ONLY interactive element in locked state.** Premium region wrapper gets `aria-hidden="true"`.
- **Stagger-in animation order = DOM order = visual reading order** (top-left → right → bottom-left → right). 0ms / 80ms / 160ms / 240ms / 320ms / 400ms delays. UI Designer's chosen variant must preserve this constraint.
- **CSS keyframes only.** NO framer-motion / motion / lottie. Recharts built-in animations OK. Counter animations via `requestAnimationFrame`.
- **`prefers-reduced-motion: reduce` respected.** All animated transitions skip to final state when set.
- **The bento composes at `app/full-page/page.tsx` level**, NOT inside `<NoSubscriptionState>` / `<AllowedState>`. Legacy state components stay in codebase as design-reference for `seats_full` / `unassigned` paths but are no longer rendered on `/full-page`.
- **Each bento card is a separate component file under `site/components/bento/`.** Props-typed (no fetches inside the card body — fetches live in the shell or via server-render). NFR-10 enforced structurally; README "Customizing the bento" documents the swap pattern.
- **Cloud Portal scope pre-flight:** verify `xmc.sites.*` API access scope enabled for the app registration before Tranche A code. If missing/named-differently, capture and update the PRD; fallback: F2 ships with "Not available" state.
- **Stack:** Next.js 16 App Router (no scaffold change), TypeScript strict, `recharts` (new), `next-themes` (verify), Blok primitives via shadcn registry, existing `@sitecore-marketplace-sdk/client` + Supabase + Stripe clients.

## In scope / out of scope (very short)

- **In scope:** New `<BentoGrid>` shell + 5 free + 6 premium card components + `<ThemeToggle>` + `<SubscribeBanner>` + `<PremiumPlaceholder>` skeleton silhouette; one Supabase migration (`processed_events.tenant_id`); one webhook handler update (one line); one new SDK call (`xmc.sites.listSites`); new `test:no-hex-in-bento` script; README "Customizing the bento" + "Production hardening for adopters" sections; CHANGELOG `[0.3.0]`; `docs/smoke-walkthrough.md` refresh.
- **Out of scope:** Per-user seats (PRD-003); Customer Portal wrap (PRD-004); real premium data fetches (adopter work or future PRD); `xmc.authoring.graphql` queries; `/api/activity`, `/api/payments` routes; editable bento layout; drill-into-card detail views; real-time data updates; multi-language; per-card permission gating; AI insights as real AI; mobile carousel.

## Success criteria (3–7 bullets)

- **G1 — Free cards live with real data:** Bento renders cleanly in Cloud Portal iframe; all 5 free cards populated within 2s of SDK handshake. Screenshot evidence committed.
- **G2 — Premium gating visually unambiguous:** Locked state shows 6 blurred placeholder silhouettes + Subscribe banner; manual readability check passes (text unreadable from 50cm). No API fetches in locked state (Network panel smoke).
- **G3 — Unlock flow delightful:** Pay €0.99 with `4242 4242 4242 4242` → Stripe Checkout → `/paywall-return` → iframe reloads → premium cards stagger-in over ~600ms with chart-draw + counter animations. Screenshot evidence.
- **G4 — Theme switching works:** Toggle cycles Light/Dark/System; all 11 cards re-render correctly in both themes; persists across reload. Manual visual smoke in both themes.
- **G5 — `test:no-hex-in-bento` green** in CI.
- **G6 — Ship gate:** PR `prd-002 → main` merged. All quality gates green (lint / typecheck / test / build / test:dce / test:env-leak / test:no-hex-in-bento). README + CHANGELOG merged with the PR.

## Key constraints & assumptions

- **ADR-0016 (NEW)** — Theme toggle always visible in topbar (showcase posture). README "Production hardening for adopters" warns to env-gate for production. Departs from `feedback_dark_mode_default_policy.md` — documented departure, not policy violation.
- **ADR-0017 (NEW)** — `processed_events.tenant_id` column added in PRD-002 for F4 per-tenant filtering. Nullable; pre-migration rows stay NULL. Webhook handler writes `tenant_id` on insert (one-line code change).
- **ADR-0018 (NEW)** — Premium bento cards use fake data only ("fake it till we make it"). Locked state = placeholder silhouettes; unlocked state = hardcoded/deterministic fake content. NO fetches at any state. Adopters who want real premium data harden via server-side `/api/entitlement` check or future `withEntitlement` HOF (R5b).
- **PRD-001 contract intact:** Stripe webhook, useEntitlement, dialog, paywall-return all unchanged. Bento wraps around them.
- **Tenant identity remains `application.context.marketplaceAppTenantId`** (PRD-000 lock).
- **User identity remains `host.user.sub`** (PRD-000 lock).
- **Visibility-refresh + 60s polling cap** (PRD-001 post-ship fix) unchanged.
- **`xmc.sites.listSites` response shape** assumed per `sitecore:marketplace-sdk-xmc` skill (double `.data.data` unwrap envelope per `reference_marketplace_sdk_envelope_authoring_graphql.md`); captured at Tranche A real-tenant smoke; fix inline on divergence.

## Handoff

- **Full PRD:** `project-planning/PRD/prd-002.md` (for humans and upstream agents).
- **Executable contract:** `project-planning/plans/task-breakdown-<timestamp>.md` after QA enrichment.
- **ADRs (binding architectural decisions):** `project-planning/ADR/adr-0001-*.md` through `adr-0018-*.md`. ADRs 0016–0018 are new in PRD-002.
- **POC reference:** `pocs/poc-v1-prd000/` (PRD-000 freemium) for context; PRD-002 produces 2 new POC clickdummies at `pocs/poc-v1-prd002/` + `pocs/poc-v2-prd002/` during `/architect`.
