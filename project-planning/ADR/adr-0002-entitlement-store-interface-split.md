# ADR-0002: Split entitlement-store contract into runtime + seed interfaces

## Status

Accepted

## Context

The blueprint's entitlement-store abstraction is the swap-point that lets adopters replace Supabase Postgres with another store (Upstash KV, Firestore, self-hosted Postgres, etc.). A naive design puts every store operation — runtime reads, dev/CLI seeding, future webhook-driven writes — on a single `EntitlementStore` interface.

Critical review during /create-prd raised contract pollution: an adopter swapping in Firestore for production would also be forced to implement `seedTenant`, `seedSeat`, `clearState` — methods that exist only to support the local state-switcher CLI for smoke testing. Production stores have no need for those methods; requiring them adds friction to the "1-hour fork-and-adapt" goal (PRD-000 § 3 G3).

A second concern: the discriminated-union return type of `getEntitlement` was specified with a fifth "error" variant in an early draft. This conflated the entitlement state (a product concept) with operational failure (an infrastructure concept). The two should not share a type.

## Decision

Split into **two distinct TypeScript interfaces** with separate implementation expectations:

- **`EntitlementStore`** — production-runtime contract; required for any adopter who swaps the store. Single method: `getEntitlement(tenantId, userId): Promise<EntitlementResult>`. `EntitlementResult` is a strict 4-variant discriminated union (`allowed | tenant_no_subscription | tenant_active_seats_full | tenant_active_user_unassigned`). No error variant — operational failures propagate via promise rejection.
- **`EntitlementSeed`** — dev / CLI contract; optional for adopters. Methods: `seedTenant`, `seedSeat`, `clearState`. The state-switcher CLI binds against this interface; adopters who don't use the CLI never implement it.

The v1 `SupabaseStore` class implements **both** interfaces. Future adapters (Upstash, Firestore, etc.) are required to implement only `EntitlementStore`; implementing `EntitlementSeed` is optional and only matters if the adopter wants to reuse the state-switcher CLI verbatim.

## Consequences

**Easier:**

- Adopters fork the blueprint, replace `SupabaseStore` with their own production store, and don't need to implement seed methods they'll never call.
- The discriminated union of `EntitlementResult` stays narrow and product-focused; engineers reading the type understand "these are the four UX states" without sifting through an error variant.
- TypeScript's exhaustiveness checking on the discriminated union remains useful in switch statements (4 cases vs 5).
- The CLI tooling and the production library evolve on different cadences without coupling.

**Harder:**

- Two interfaces instead of one — slightly more cognitive overhead when first reading the code. Mitigated by clear file placement (`src/lib/paywall/types.ts` declares both side-by-side).
- Operational failures (store unreachable, malformed `application.context`) propagate as exceptions to a top-level React error boundary — adopters must wrap the gate in that boundary or risk crashing the host page. This is an explicit contract documented in NFR-6.
- Future surface additions need to consciously decide which interface they belong to. PRD-001 will add `recordPurchaseEvent` to `EntitlementStore` (production-relevant for webhook idempotency).

## Date

2026-05-13
