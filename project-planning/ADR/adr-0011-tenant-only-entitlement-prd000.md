# ADR-0011: Tenant-only entitlement in PRD-000; per-user seat enforcement deferred to PRD-002

## Status

Accepted

## Context

PRD-000 (as originally planned) embedded per-user seat enforcement deeply into the foundation: a 4-variant `EntitlementResult` discriminated union with two seat-related branches (`tenant_active_seats_full`, `tenant_active_user_unassigned`), a `seats` table in the Supabase schema, a seat-count + seat-membership lookup in the entitlement evaluator, and 4 fully-wired denial UX states the gate evaluator routes between.

Operator review identified this as scope bloat. The foundation tranche should validate two things — (1) the gate component + freemium UX shell + env-flag toggle + dev override + OSS launch surface, and (2) the swap-point abstractions (`EntitlementStore` + `PaymentProvider` adapters). Per-user seat enforcement introduces meaningful complexity (seat-count race conditions, auto-claim vs admin-assign policy, "unassigned" state semantics) that doesn't belong in the foundation.

The originally-planned 4-PRD split (PRD-001 Stripe provider, PRD-002 seat-management UI, PRD-003 Customer Portal) already named PRD-002 as the seats home — but the *enforcement logic* leaked into PRD-000. Only the *admin UI* was deferred. This created an awkward middle ground: PRD-000 had to ship seat-counting logic with no admin to manage seats, and seat states the operator could only reach by manually editing the `seats` table.

The provider-research doc (`storage/paywall-providers-research-2026-05-13.md` § 8.6) confirms the cleaner split: PRD-000 = library + manually-seeded entitlement, PRD-001 = Stripe + DB + webhooks, PRD-002 = seat enforcement + admin view, PRD-003 = Stripe Customer Portal.

## Decision

- **PRD-000 entitlement evaluation is tenant-only.** `SupabaseStore.getEntitlement(tenantId, userId)` consults `tenants` only. Returns `allowed` if `tenant.status === 'active'`; `tenant_no_subscription` otherwise. The `userId` parameter is accepted by the function signature for interface stability across PRDs but is NOT consulted in PRD-000.
- **`seats` table is removed from PRD-000's schema.** PRD-002 adds it.
- **`EntitlementResult` discriminated union retains all four variants** in the TYPE (for forward-compatibility — PRD-002 extends the evaluator without changing the interface shape), but the PRD-000 evaluator NEVER returns the two seat-related variants.
- **All four UX state components ship in PRD-000** as part of `src/lib/paywall/states/`. The two seat-related components (`SeatsFullState`, `UserUnassignedState`) ship as **design-reference components** — fully built, locked-copy-tested, accessibility-compliant, but unreachable from the PRD-000 evaluator. The state-switcher CLI (`pnpm seed:state seats-full | unassigned`) renders them directly so the smoke walkthrough can capture screenshots.
- **PRD-002 adds:** the `seats` table, seat-count + seat-membership branches in the evaluator, auto-claim vs admin-assign policy decision, "request seat" notification flow, admin invite/revoke UI, concurrent-seat-grab race-condition handling.

## Consequences

**Easier:**

- PRD-000 ships a smaller, more focused foundation. The gate + freemium shell + env-flag + dev override + OSS surface are the contract being validated — not "does seat counting work."
- The `<PaywallGate>` evaluator logic in PRD-000 is one DB query (tenant lookup) — easy to reason about, easy to test exhaustively (2 branches × happy / sad paths).
- Adopters reading the blueprint see the full UX vocabulary (4 states) shipped with locked copy and accessibility — but they understand from ADR-0011 + § 5 + the README which states the foundation actually evaluates vs. which are forward-looking reference components.
- The PRD-001 → PRD-002 boundary becomes natural: PRD-001 adds Stripe + a real `tenants` row source (the webhook); PRD-002 adds the `seats` table + the multi-user logic.
- Operators (including hahnsolo's own future apps) who don't need per-user seat enforcement at all can ship just PRD-000 + PRD-001 — a tenant-license model — without touching seats.

**Harder:**

- The PRD-000 reference app's UX walkthrough now distinguishes "live states" (allowed, no-sub) from "design-reference states" (seats-full, unassigned). The smoke walkthrough doc and the Tranche C challenge gate must explicitly call out which is which.
- A naïve adopter forking PRD-000 and turning on the seats-full screen (e.g., by setting `seats_total = 1` in their fork) won't see the state in production — because the evaluator never produces it. Without a clear README note this looks like a bug. Mitigation: README explicitly says "PRD-000 evaluator returns only `allowed | tenant_no_subscription`; the other two state components are forward-looking design references that PRD-002 wires."
- The 4-variant `EntitlementResult` type has 2 variants the PRD-000 store deliberately never returns. TypeScript's exhaustiveness checking on the discriminated union still works (the gate component handles all 4 cases in its rendering), but reviewers may flag the "unreachable branches" as dead code. README clarifies that the branches are forward-looking, not dead.
- `EntitlementSeed` interface in PRD-000 includes `seedTenant` only (no `seedSeat` until PRD-002). The state-switcher CLI's `seats-full` and `unassigned` invocations render components directly rather than seeding seat rows.

## Date

2026-05-13
