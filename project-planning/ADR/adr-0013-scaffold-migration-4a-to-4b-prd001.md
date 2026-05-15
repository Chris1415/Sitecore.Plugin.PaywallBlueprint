# ADR-0013: Scaffold migration 4a → 4b in PRD-001; webhook hosted as Next.js API route in same app

## Status

Accepted

## Context

PRD-000 shipped with scaffold architecture 4a (client-side iframe; no Next.js API routes) per ADR-0005. The trade-off documented in PRD-000 § 13 R8: PRD-001's Stripe webhook handler needs a public HTTPS endpoint, and 4a doesn't have one. Three viable hosting options were left open:

- **(a) Migrate 4a → 4b** (`sitecore:setup-marketplace-full-stack`). Add Next.js API routes to the existing app. Single Vercel deployment. Most idiomatic; mechanical migration (~1 day).
- **(b) Supabase Edge Function** at a separate URL. Co-located with the DB. Two deployments to manage.
- **(c) Separate Vercel project** (`paywall-blueprint-webhooks`). Independent deployment. Two Vercel projects to maintain.

For the OSS reference goal:

- **(a)** is friendliest for adopters — one repo, one deployment, one set of env vars. "Adopters clone → deploy" stays simple.
- **(b)** complicates the README adoption guide ("after deploying the app, also set up a Supabase Edge Function and configure...").
- **(c)** doubles the Vercel project setup cost for adopters.

The G3 cold-read goal (PRD-000 § 3 — "adopter understands and adapts the pattern from the README alone") weighs toward (a) — fewer moving parts in the adoption story. The mechanical 1-day migration cost is well-bounded; the migration applies a documented Sitecore quickstart pattern.

## Decision

- **Migrate PRD-001's scaffold from 4a to 4b** in Tranche A using the canonical `sitecore:setup-marketplace-full-stack` quickstart applied in-place over the existing 4a scaffold.
- Stripe webhook handler lives at `src/app/api/webhooks/stripe/route.ts` in the same Next.js app.
- All 4 PRD-001 API routes (`/api/checkout`, `/api/portal`, `/api/entitlement`, `/api/webhooks/stripe`) live in the same Next.js app — one deployment surface for adopters to manage.
- Existing iframe code (gated section, providers, state components) is untouched by the migration. Tests must continue to pass.

## Consequences

**Easier:**

- One deployment, one set of env vars, one log surface — adopters' production setup is minimal.
- README's "Quickstart" stays one section instead of "deploy app + deploy webhook receiver."
- Stripe webhook URL is the same domain as the iframe app — no cross-origin headache.
- `/api/entitlement` (the polling-fallback endpoint) lives next to the webhook handler — sharing the same Supabase client + same env vars.

**Harder:**

- Mechanical migration is ~1 day of Tranche A work. Existing scaffold's `next.config.mjs` + CSP headers may need merging with the full-stack quickstart's. Existing 74 tests are the regression net.
- Adopters who want to host webhooks separately (e.g., for security isolation) need to undo this — they pull the API routes out into a separate project. Adoption guide notes this as a stretch option.
- The 4b scaffold's bundle size is marginally larger (server-side code added) — minor; verified by post-migration build size check.

## Date

2026-05-15
