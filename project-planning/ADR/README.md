# Architecture Decision Records

This directory holds ADRs for this product workspace.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| ADR-0001 | Use ADRs as architecture backbone | Accepted |
| ADR-0002 | Split entitlement-store contract into runtime + seed interfaces | Accepted |
| ADR-0003 | Payment-provider adapter as type-only placeholder in PRD-000 | Accepted |
| ADR-0004 | Env-flag toggle uses signaled pass-through, not silent pass-through | Accepted |
| ADR-0005 | Scaffold blueprint as 4a client-side iframe; webhook hosted out-of-band in PRD-001 | Accepted |
| ADR-0006 | Register as custom app for PRD-000; public-Marketplace submission deferred | Accepted |
| ADR-0007 | Single generic skeleton sized to the largest resolved state | Accepted |
| ADR-0008 | Context-readiness signal sourced from `MarketplaceProvider` resolution, not from a dedicated SDK ready-event | Accepted |
| ADR-0009 | Supabase RLS enabled with permissive default policies in PRD-000; production adopters harden | Accepted |
| ADR-0010 | Supabase setup via copy-pasteable SQL block in `supabase/schema.sql`, not CLI automation | Accepted |
| ADR-0011 | Tenant-only entitlement in PRD-000; per-user seat enforcement deferred to PRD-002 | Accepted |
| ADR-0012 | Stripe Price model — one-time €0.99 lifetime in PRD-001 | Accepted |
| ADR-0013 | Scaffold migration 4a → 4b in PRD-001; webhook hosted as Next.js API route in same app | Accepted |
| ADR-0014 | Iframe success-return — postMessage primary + 3s/30s polling fallback | Accepted |
| ADR-0015 | Stripe Customer orphan recovery via `metadata.tenant_id` lookup before create | Accepted |
| ADR-0016 | Theme toggle always visible (showcase posture; departs from env-gating policy) | Accepted |
| ADR-0017 | Add `tenant_id` column to `processed_events` for per-tenant activity filtering | Deferred (2026-05-18) |
| ADR-0018 | Premium bento cards ship fake/marketing data only; production-hardening is adopter responsibility | Accepted |

## Next number

Use the next free four-digit id after the highest existing `adr-*.md`. Next: `0019`.
