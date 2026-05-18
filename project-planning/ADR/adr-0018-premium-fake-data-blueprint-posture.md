# ADR-0018: Premium bento cards ship fake/marketing data only; production-hardening is adopter responsibility

## Status

Accepted

## Context

PRD-002's bento has 6 premium cards (Activity chart, Content health, Recent edits, Engagement metrics, AI insights, Engagement score + forecast). Each could be powered by:

- **Real data** — Marketplace SDK queries (e.g., `xmc.authoring.graphql` for content stats), Stripe API calls (e.g., `stripe.charges.list` for payment history), Supabase aggregations (e.g., webhook events bucketed for activity charts).
- **Fake data** — Hardcoded values or deterministically-generated content, mounted inside the component, no fetches.

The original PRD-002 draft proposed a mix: real for some cards (activity chart from `processed_events`, content stats + recent edits from `xmc.authoring.graphql`, payment history from `stripe.charges.list`), fake for others (AI insights, forecast). The PM critical review (2026-05-17) flagged three concerns:

1. **Authoring GraphQL schema is unknown** — the proposed queries (`item(path:)`, `descendants(orderBy: UPDATED_DESC)`, etc.) use field names not verified against the real Authoring schema. The PRD-001 architect already burned cycles on `xmc.authoring.graphql` shape mismatches (see `reference_marketplace_sdk_envelope_authoring_graphql.md` — body inside `params`, double `.data.data` unwrap, etc.). Re-doing that work for PRD-002 against an unknown content schema is a big risk for a UI-focused PRD.
2. **Render-then-blur posture leaks real premium content** — when locked-state premium cards mount their real-data components (even with `pointer-events: none` + visual blur), the underlying DOM contains the actual data. Screen readers, browser inspectors, and motivated users can extract it. This is fine for the blueprint's showcase purpose but unacceptable for adopters using paywall-blueprint to gate real paid content in their own apps.
3. **Scope creep** — PRD-002 is supposed to be a UI redesign for the existing freemium pattern. Two new API routes (`/api/activity`, `/api/payments`) + three new Sitecore SDK call sites + premium-side schema captures = significant net-new surface area for a "make it pretty" PRD.

The operator's post-review direction (2026-05-17) crystallized the resolution: **"Let us stick to what we know. … On the premium let us get fancy and fake it till we make it, animations, diagrams etc. no need for real data if this is a big unknown."**

## Decision

**Premium bento cards in PRD-002 use fake / hardcoded / deterministically-generated data only. No API fetches. No SDK calls. No database queries. At any state (locked OR unlocked).**

Specific posture per card:

| Card | Content (all fake) |
|---|---|
| P1 — Activity chart | Hardcoded 30-day daily counts with a believable weekday/weekend pattern. Rendered via Recharts (lazy-loaded). |
| P2 — Content health | 3 progress bars: "SEO score 87%", "Performance 92%", "Accessibility 78%". Animated fill. |
| P3 — Recent edits | 5 static list entries: "Project Alpha · Hero updated — 2h ago", etc. |
| P4 — Engagement metrics | 4 stat tiles with hardcoded final values + counter animations: Page views 12,400 / Conversions 248 / Avg session "4m 32s" / Bounce rate 28%. |
| P5 — AI insights | 3 hardcoded bullets. No AI call, no heuristic over real data. |
| P6 — Engagement score + forecast | Progress ring with hardcoded value (87/100) + dashed-line forecast sparkline (hardcoded). |

**Locked-state contract:** premium cards mount as placeholder silhouettes (skeleton shapes) — no fake data, no real data, no fetches. The "shape leak" is intentional (silhouettes communicate "there's content here"). The premium region also has `aria-hidden="true"` for screen reader skip-over.

**Unlocked-state contract:** premium cards mount with their fake data + animations. Still no fetches.

**Verification:** AC4.7 (Tranche D smoke) — Network panel inspection of the AllowedState page load shows zero HTTP requests originating from any premium card component. Unit-test mocks confirm no fetch calls.

### Adopter-hardening note (binds future PRDs and README documentation)

Adopters who fork paywall-blueprint and replace premium cards with REAL data fetches (the natural next step for a production deployment of a paywall) inherit the blueprint's "render-then-style" posture by default. Without additional gating, real premium content becomes visible in DOM at locked state.

**Adopters MUST add server-side enforcement when adding real premium data:**

- Route premium data fetches through the existing `/api/entitlement` check before fetching upstream sources.
- Alternatively, wrap premium data handlers in a `withEntitlement(handler)` HOF (future PRD candidate).
- Server-render premium cards with empty/null data when entitlement check returns `tenant_no_subscription`; populate only when `allowed`.

This adopter contract is captured in:
- README "Production hardening for adopters" section (PRD-002 Tranche E).
- R5b in PRD-002 § 13 ("Adopters who add real premium data must harden the gating").
- Future Opportunities (`withEntitlement(handler)` HOF, PRD § 15) — implemented when adopter demand surfaces.

## Consequences

**Easier:**

- PRD-002 scope shrinks ~40% — no new API routes, no Authoring GraphQL queries, no `stripe.charges.list` integration, no Supabase aggregation queries beyond F4.
- No big unknowns. Every code path uses APIs the team has shipped against in PRD-000 + PRD-001.
- Premium cards are pure design + animation exercises — easier to write tests against (deterministic inputs), easier to swap visually, easier to iterate.
- Tranche D smoke is simpler — no need to verify Stripe charge history rendering, content count accuracy, etc.

**Harder:**

- The blueprint's premium tier is less "useful" out of the box. Adopters who want a working dashboard with real signals need to wire their own fetches post-fork.
- README documentation becomes more important — the "Production hardening for adopters" section must clearly explain the contract and how to fulfill it.
- Future PRDs (PRD-003 seats, PRD-004 portal) may want to add real signals to the bento. They'll inherit the fake-data baseline and need to add their own server-side gating along the way.
- Mid-fork adopters who add real fetches without reading the README hardening note will create real gate-bypass bugs. README warning is the only mitigation; we can't enforce it.

**Neutral:**

- Recharts dep is still required (P1 activity chart uses it for the area chart). Lazy-load preserves the free-tier bundle budget.
- Counter animations, progress bar fills, stagger-in cascade — all still on the menu. The premium tier looks polished without being load-bearing on real data.
- Adopters who want to keep the fake premium tier (e.g., for marketing pages, OSS demos, internal showcases) get exactly what the blueprint ships.

## Date

2026-05-17
