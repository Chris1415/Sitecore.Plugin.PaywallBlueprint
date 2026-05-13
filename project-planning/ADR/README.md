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

## Next number

Use the next free four-digit id after the highest existing `adr-*.md`. Next: `0011`.
