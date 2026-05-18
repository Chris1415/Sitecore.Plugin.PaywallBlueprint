# Changelog

All notable changes to Paywall Blueprint are documented here.

---

## [0.3.0] - 2026-05-18

### Added

- Bento-grid dashboard at `/full-page` — 11 cards (5 free + 6 premium) replacing the legacy `<FreeSection> + <Separator> + <GatedSectionWithDevPicker>` layout
- `<ThemeToggle>` (Light / Dark / System) in topbar `rightSideItems[]` — always visible as showcase posture (ADR-0016); production adopters should env-gate via `NEXT_PUBLIC_SHOW_THEME_TOGGLE === "true"`
- **Free cards with real data:**
  - `<WelcomeHero>` (F1) — greeting from `useHostUser()` + tenant display name + plan badge
  - `<SitesTile>` (F2) — live site count from `xmc.sites.listSites` (only new SDK call in PRD-002)
  - `<PlanCard>` (F3) — plan + member-since date from Supabase `tenants` row
  - `<UserProfile>` (F4) — initials avatar + email + truncated sub from `useHostUser()`
  - `<TenantInfo>` (F5) — 4-cell info grid (tenant ID, org, environment, app ID) from `useAppContext()`
- **Premium cards with hardcoded fake content (ADR-0018 — showcase posture):**
  - `<ActivityChart>` (P1) — Recharts area chart, lazy-loaded as separate ~300kb chunk
  - `<ContentDistribution>` (P2) — 4 animated progress bars with stagger (200ms per bar)
  - `<RecentEdits>` (P3) — 5-row Sitecore-flavored activity list with fake avatars + relative timestamps
  - `<CmsHealth>` (P4) — 4 KPI tiles with `useCounter` rAF-animated counters (ease-out over 600ms)
  - `<SitecoreContentInsights>` (P5) — 3 hardcoded insight bullets with `<Separator>` dividers
  - `<ContentHealthScore>` (P6) — SVG progress ring (87/100) + dashed sparkline with dual rAF draw-in animations
- `<SubscribeBanner>` overlay — absolute-positioned sibling of `.premium-region` (never a child; POC v2 § 7 canonical structure prevents blur rasterization)
- `<PremiumPlaceholder>` skeleton silhouettes — 6 shape variants (`chart`, `progress-bars`, `list`, `kpi-strip`, `bullets`, `ring-sparkline`) for locked state
- `useCounter(target, durationMs)` hook at `site/lib/use-counter.ts` — rAF loop + quadratic ease-out + `prefers-reduced-motion` guard (jumps to target immediately when motion is reduced)
- `test:no-hex-in-bento` npm script — scans `components/bento/**` + `components/theme-toggle.tsx` for hex color literals; exits 1 on any match
- `test:no-fetch-in-premium` npm script — static grep enforcing ADR-0018 (no `fetch`/`useQuery`/SDK client calls inside P1–P6 card bodies)
- **DEV-ONLY revoke-access affordance** — `<ResetEntitlementButton>` in topbar `rightSideItems[]` calls `POST /api/dev/reset-entitlement` to drop every tenants row sharing the current `stripe_customer_id` (sweeps orphan rows) + flushes the `processed_events` idempotency cache, then reloads the iframe. HARD-REFUSED in production by both the button (renders `null` when `NODE_ENV === "production"`) and the API route (returns 403). Same DCE pattern as `<GatedSectionWithDevPicker>` — verified by `test:dce`. Rationale: fast paywall iteration in dev without round-tripping to the Supabase dashboard
- **Playwright E2E tests:**
  - `bento-free-tier.spec.ts` — viewport smoke (desktop/tablet/mobile), HTTP 200, SSR content check, reduced-motion assertion, axe-core a11y scan
  - `bento-theme-recharts.spec.ts` — Recharts theme reactivity (host-frame-required tests skipped for standalone CI)
  - `bento-unlocked.spec.ts` — unlock visual smoke (host-frame-required tests skipped for standalone CI)
- **ADRs:** ADR-0016 (theme toggle always-visible posture), ADR-0017 (deferred schema migration), ADR-0018 (fake premium content posture)

### Changed

- `/full-page` now renders `<BentoGrid>` instead of `<FreeSection> + <Separator> + <GatedSectionWithDevPicker>` (legacy components preserved in codebase as design reference)
- Dev affordances `<TenantIdBadge>` + `<PaywallVersionOverride>` moved into Topbar `rightSideItems[]` (single source of truth; removed from `<main>` body)
- Root `app/layout.tsx` now wraps children in `<ThemeProvider>` with `suppressHydrationWarning` on `<html>` (canonical next-themes pattern)
- `<BentoGrid>` derives `isLocked` from server-rendered `tenantsRow` passed via RSC props — the hook `useEntitlement()` drives CSS locked/unlocked classes client-side, but the server-rendered gate is authoritative. Note: `useEntitlement()` does not poll on initial mount; `isLocked` from hook alone would persist as locked after a fresh-load even when paid
- `SitesTile` envelope uses double-unwrap `result.data?.data` — confirmed at Gate B real-tenant smoke 2026-05-18 (`architecture § 5c` assumption was correct; the `.d.ts` describes the raw SDK envelope, not the post-postMessage client envelope)
- Premium cards use `<Card style="outline" elevation="sm" padding="sm">` for visible surfaces; title icons + accent values use `text-primary` for visual lift (Gate D color sweep)
- Recharts colors use `var(--primary)` directly + `<linearGradient>` for area fill — the Nova preset `--primary` is a hex value; the `hsl(var(--primary))` wrapper was broken syntax that fell back to black on first render

### Deferred

- ADR-0017 (`processed_events.tenant_id` column) — no longer required after free-card inventory iteration (events card replaced with `<UserProfile>`); schema migration + webhook handler edit dropped from PRD-002 scope

### Compatibility

- Stripe Checkout, webhook handler, `useEntitlement`, `PaywallCheckoutDialog`, `/paywall-return` all PRD-001-locked — zero changes in PRD-002
- 104 PRD-001 baseline tests still green; +123 new tests = **227 total**
- Recharts ships as a separate lazy chunk (~300kb) — free-tier first paint unaffected
- No new API routes; no schema migrations; no webhook handler changes

---

## [0.2.0] - 2026-05-16

### Added

- Stripe Checkout integration — `/api/checkout` route creates Checkout Session with `payment_intent_data.metadata.marketplace_app_tenant_id` for webhook correlation
- Stripe webhook handler at `/api/webhooks/stripe` — processes `checkout.session.completed` + `customer.subscription.updated` events; upserts `tenants` table
- `PaywallCheckoutDialog` component — triggers Stripe Checkout in a new tab; `visibilitychange` listener polls entitlement on tab return
- `/paywall-return` page — post-payment landing; polls `/api/entitlement` until `allowed` or timeout
- `useEntitlement` hook — polls `/api/entitlement` every 5s; exposes `{ entitlement, isLoading, error }`
- `/api/entitlement` route — reads `tenants` table by `marketplaceAppTenantId`; returns `{ status: "allowed" | "no_subscription" | … }`
- `DemoModeBanner` — dev affordance shown when `NEXT_PUBLIC_DEMO_MODE=true`
- CSP `frame-ancestors` allow-list for `app.sitecorecloud.io` in `next.config.mjs`
- Supabase schema: `tenants` table (`tenant_id`, `plan`, `status`, `created_at`, `stripe_customer_id`, `stripe_subscription_id`)
- `automatic_tax` + `customer_update: { address: "auto" }` on Checkout Session params (avoids `customer_tax_location_invalid` when customer has no address)
- Stripe idempotency keys versioned as `${id}:v2` (`IDEMPOTENCY_VERSION` constant) to survive param-shape changes

### Changed

- `/full-page` renders `<GatedSectionWithDevPicker>` + `<FreeSection>` (replaced by BentoGrid in 0.3.0)
- `app/layout.tsx` includes `<MarketplaceProvider>` (established in 0.1.0, extended)

### Fixed

- `Stripe.Subscription.current_period_end` removed from stripe@22.x types but still present at runtime — cast through `unknown as Record<string, unknown>` in webhook handler

---

## [0.1.0] - 2026-05-13

### Added

- Initial Sitecore Marketplace App scaffold (Mode A client-side, Blok design system)
- `<MarketplaceProvider>` + `useMarketplaceClient` / `useAppContext` / `useHostUser` SDK hooks
- `<PaywallGate>` component — renders state-appropriate sub-component based on `EntitlementResult`
- Entitlement states: `AllowedState`, `NoSubscriptionState`, `SeatsFullState`, `UserUnassignedState`, `SkeletonState`
- Public API barrel at `src/lib/paywall/index.ts`
- Supabase client integration (`@supabase/supabase-js`)
- Chrome Local Network Access (PNA) headers in `next.config.mjs` for Cloud Portal iframe compatibility
- Blok Nova theme preset; Light / Dark / System theme provider (`next-themes`)
- 104 baseline tests
