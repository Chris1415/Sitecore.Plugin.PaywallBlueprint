# ADR-0009: Supabase RLS enabled with permissive default policies in PRD-000; production adopters harden

## Status

Accepted

## Context

The Supabase entitlement-store schema (PRD-000 § 10) contains three tables: `tenants`, `seats`, `purchase_events`. The architecture's security considerations (§ 8) raise the question of row-level security (RLS) posture: should the v1 worked example ship with RLS enabled and full tenant-scoped policies, or with RLS disabled, or with RLS enabled and permissive default policies?

PRD-000 has exactly one tenant (the operator's own) and one operator. There is no multi-tenant separation requirement at this PRD's scope. The reference app reads entitlement state via the Supabase anonymous key from the client (iframe) — there is no server-side request mediator in PRD-000 (per ADR-0005: 4a client-side, no Next.js API routes).

Three options:

- **(a) RLS disabled.** Simplest. Anonymous key has full table access. Production-unsafe by default; adopters must remember to enable RLS before going live with real customers.
- **(b) RLS enabled with full tenant-scoped policies.** Production-safe. Requires JWT-based tenant identity propagation from the iframe to PostgREST (Supabase's API gateway), which is non-trivial — typically uses the `application.context.tenantId` as a JWT claim, but that wiring is not in PRD-000's scope.
- **(c) RLS enabled with permissive default policies.** Middle ground. RLS is on (so production adopters who forget the topic still have to write explicit policies before their reads return data); the shipped `USING (true)` policies are explicit signals that production adopters must replace them.

Option (a) bakes in a production hazard. Option (b) requires infrastructure (JWT propagation) outside PRD-000 scope. Option (c) preserves the right default (RLS-on) while admitting that PRD-000 doesn't yet have the identity-propagation infrastructure to write real tenant-scoped policies.

## Decision

- **Enable RLS on all three tables** in `supabase/schema.sql`.
- Ship **permissive default policies** for PRD-000:
  - `tenants`: `CREATE POLICY "anon_read_tenants" ON tenants FOR SELECT TO anon USING (true);`
  - `seats`: `CREATE POLICY "anon_read_seats" ON seats FOR SELECT TO anon USING (true);`
  - `purchase_events`: **no anon policy** — RLS-on without an anon SELECT policy means the anon key cannot read this table. Service-role only.
- README's "Security and adopter responsibilities" section flags this explicitly: production adopters MUST replace the `USING (true)` policies with tenant-scoped equivalents (typically using `auth.jwt() ->> 'tenant_id'` once JWT propagation lands in PRD-002+).

## Consequences

**Easier:**

- Adopters who copy the blueprint to a real customer-facing app cannot accidentally ship "no RLS" — they have to actively re-write the policies, which is a security-affirming moment.
- PRD-000 works (entitlement reads return data) without requiring JWT propagation infrastructure.
- `purchase_events` is already locked down (no anon read), so adopters can write to it via the service-role key from out-of-band webhook handlers in PRD-001 without touching policies.

**Harder:**

- Adopters who don't read the README's security section might ship to production with the permissive defaults still in place. Mitigation: the README's Quickstart and adoption-guide both highlight this as a required step; the policies' comment block in `schema.sql` explicitly says "REPLACE BEFORE PRODUCTION."
- The blueprint demonstrates the *shape* of the RLS contract but not a *secure* one — adopters who want a tenant-scoped reference implementation get partial credit. Documented as a known limitation; full tenant-scoped policies revisit in PRD-002 when multi-tenant becomes real.
- A motivated adversary with the anon key + a known tenant_id could read other tenants' entitlement state in the v1 deployment. Acceptable risk for PRD-000 because (i) the deployment is the operator's own demo tenant only, and (ii) the anon key is not a secret in a public iframe app architecture.

## Date

2026-05-13
