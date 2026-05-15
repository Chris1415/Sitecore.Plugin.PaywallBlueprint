# ADR-0005: Scaffold blueprint as 4a client-side iframe; webhook hosted out-of-band in PRD-001

## Status

Accepted

## Context

The Sitecore Marketplace SDK lifecycle offers four scaffold architectures (per the `marketplace-sdk-lifecycle` skill, § 4):

- **4a — Client-side iframe.** App runs as an iframe in the portal; postMessage bridge brokers all XMC/AI/Pages calls. No server-side API routes in the Next.js app.
- **4b — Full-stack iframe.** Like 4a, but the Next.js app additionally has API routes for non-XMC concerns (your own DB, third-party APIs, webhooks).
- **4c — Standalone + experimental server-to-server.** Auth0-authenticated app calling XMC/AI APIs directly server-side via `experimental_*` clients.
- **4d — Hybrid postMessage + client-credentials proxy.** Server routes hold OAuth client-credentials tokens to call SitecoreAI REST APIs.

PRD-000 has no server-side logic — entitlement store reads happen via the Supabase JS SDK from the iframe directly, and there are no webhooks yet (the real provider lands in PRD-001 with the Lemon Squeezy adapter and a webhook handler).

But PRD-001 WILL have webhook-handling needs. The question: should PRD-000 anticipate that and scaffold 4b (full-stack) now, so PRD-001 has API-route capability already in place? Or scaffold 4a now and have PRD-001 figure out its webhook hosting separately?

Two arguments for 4b now: (i) no scaffold migration in PRD-001, (ii) standard pattern for full-stack Next.js apps.

Two arguments for 4a now: (i) PRD-000 deliberately has zero server logic — scaffolding a fuller architecture than needed violates "smallest version that proves the idea," (ii) the abstraction story improves if webhook hosting is itself a swap point (adopters can use Supabase Edge Functions, separate Vercel projects, Cloudflare Workers, or an existing backend — not just Next.js API routes).

## Decision

Scaffold PRD-000 as **4a client-side iframe** (via `sitecore:setup-marketplace-client-side`). No Next.js API routes added in PRD-000.

PRD-001's webhook handler will be hosted **out-of-band** — in a location physically separate from the Next.js iframe app. Two viable options for PRD-001 to evaluate at its architecture stage:

- **Supabase Edge Function.** Lives in the same project as the entitlement store; minimal latency for entitlement upserts; uses Supabase's webhook signature verification primitives.
- **Separate Vercel project (`paywall-blueprint-webhooks`).** Independent deployment; isolates webhook concerns from the iframe app; uses Supabase JS SDK to write entitlements.

PRD-001 architecture stage picks one and writes a dedicated ADR.

## Consequences

**Easier:**

- PRD-000 ships the smallest viable scaffold. Adopters see only the code paths actually relevant to the gate pattern; no unused API-route folders.
- The abstraction story extends naturally: "your webhook host is separately swappable too." Adopters who don't use Next.js for their app can still adopt the blueprint by running the webhook anywhere.
- Forward-compatibility with adopters who already have a backend: they can wire their existing webhook receiver into the blueprint's `EntitlementStore` adapter without needing to introduce Next.js API routes.

**Harder:**

- PRD-001 cannot drop a Next.js API route into the existing scaffold for the webhook handler. Either scaffold migration (low-cost: add API routes to the existing Next.js app) or out-of-band hosting (no migration, but a second deployment to manage).
- If the operator later regrets the 4a choice, migration to 4b is bounded but real (estimated ~1 day per PRD-000 § 13 R8) — primarily updating `next.config.ts`, CSP headers per `sitecore:setup-marketplace-full-stack`, and adding the API routes.
- The "abstraction story" framing for out-of-band webhook hosting is genuinely a feature for sophisticated adopters but added complexity for adopters who just want a single deployment to manage. The 1-hour quickstart goal (G3) is at some tension with this choice; PRD-001 README guidance MUST be explicit about the two-deployment reality.

## Date

2026-05-13
