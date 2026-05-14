# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Paywall Blueprint, please report it
responsibly:

- **Email:** christian.hahn@sitecore.com
- **Subject line:** `[PaywallBlueprint] Security: <short description>`
- **Do not** open a public GitHub issue for security vulnerabilities.

Please include:
- A description of the vulnerability and its potential impact.
- Steps to reproduce (minimal reproduction preferred).
- Whether you have a suggested fix.

Expected response time: within 7 days for an acknowledgement; remediation timeline
depends on severity.

---

## Known limitations of v1 (PRD-000)

Adopters deploying this blueprint into a production environment must be aware of
the following v1 limitations before going live:

### 1. Client gate is UX, not a security barrier

`<PaywallGate>` is a client-side React component. A determined user can open
browser DevTools, find the component in the React tree, and force the gated
children to render regardless of the entitlement result. The gate is a UX
guardrail, not a cryptographic lock.

**Mitigation (PRD-001):** A `withEntitlement(handler)` server-side higher-order
function will ship in PRD-001 to enforce entitlement on every API call. Any
adopter shipping real premium server-side functionality MUST add this enforcement
before going to production. PRD-000 has no real premium feature behind the gate.

### 2. Supabase RLS — permissive placeholder policies (ADR-0009)

The schema in `site/supabase/schema.sql` enables RLS on both tables but uses a
permissive `USING (true)` policy for anon reads on the `tenants` table:

```sql
CREATE POLICY "anon_read_tenants" ON tenants
  FOR SELECT TO anon USING (true);
```

This allows any anonymous client that has the publishable (anon) key to read any
tenant row. This is intentional for PRD-000 where the evaluator runs client-side
and needs to look up its own tenant row without a full auth session.

**Production adopters MUST replace this policy** with a tenant-scoped restriction
before going live. Example using a JWT claim:

```sql
DROP POLICY IF EXISTS "anon_read_tenants" ON tenants;
CREATE POLICY "tenant_read_own" ON tenants
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

The `processed_events` table has no anon read policy — only the service-role key
(used by the webhook handler in PRD-001) can access it.

### 3. Service-role key must stay server-side

The `SUPABASE_SECRET_KEY` (service-role key) in `.env.local` bypasses all RLS
policies. It must never be exposed client-side. The variable does not have a
`NEXT_PUBLIC_` prefix — Next.js will not bundle it into the client. Verify your
fork's build does not accidentally expose it (e.g. by inlining it in a client
component or a public API route response).

### 4. Dev override — verify compile-time guard in your fork

The `NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID` env var is compile-time guarded:
the entire override branch is dead-code-eliminated in production builds via the
`process.env.NODE_ENV !== 'production'` check (NFR-5).

After forking, verify this holds in your build:

```bash
npm run build
npm run test:dce
```

`test:dce` greps `.next/` for the var name and asserts zero matches. If you see
matches, the DCE guard has failed — do not ship until resolved.

---

## Security-related ADRs

- **ADR-0009** — Supabase RLS permissive default + adopter hardening requirement:
  `project-planning/ADR/adr-0009-supabase-rls-permissive-default.md`
