# ADR-0017: Add `tenant_id` column to `processed_events` for per-tenant activity filtering

## Status

**Deferred (2026-05-18).** Originally Accepted as part of PRD-002 spec. After operator iteration on the bento card inventory during `/architect` (2026-05-17 → 2026-05-18), the free-tier "Webhook activity (recent 3-5 events)" card was dropped in favor of a "User profile" card, and the "Available extension points" card was dropped in favor of a "Tenant info" card. With no card consuming per-tenant `processed_events` queries, the schema migration is no longer required for PRD-002.

**Status remains Deferred (not Rejected) because:**
- The architectural reasoning still holds — if a future PRD adds a per-tenant activity surface, Option A (`tenant_id` column on `processed_events`) is still the recommended path.
- This ADR is preserved as the reference design for that future work (likely PRD-005 candidate per the "real Sitecore dynamic data" addon captured in PRD-002 § 15).
- Adopters who want a webhook-activity card today can apply this ADR's migration locally — it's a one-line SQL change.

**Pre-ship state:**

## Context

PRD-000 created the `processed_events` table for Stripe webhook idempotency. Schema (relevant columns):

```sql
CREATE TABLE processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The table is a deduplication cache — it stores `event_id` to catch replays — and was never designed for analytics queries. PRD-001's webhook handler reads from it (`INSERT … ON CONFLICT` for the idempotency check) but doesn't read it for any user-facing surface.

PRD-002 introduces a free bento card F4 — "Webhook activity (recent 3–5)" — which needs to display the most recent webhook events **for the current tenant**. With the existing schema, that's not possible directly: events have no tenant linkage.

Three options were considered during the PRD-002 critical review:

- **Option A — Add `tenant_id` column.** Schema migration. Tenant ID written on insert. F4 query trivially filters: `WHERE tenant_id = $1`.
- **Option B — Join via `tenants.stripe_customer_id`.** Use the Stripe Customer ID embedded in webhook payloads (`event.data.object.customer`) to join back to `tenants`. Avoids schema change but breaks for fresh tenants that haven't completed a Stripe purchase yet (their `tenants.stripe_customer_id` is NULL, so the join returns zero rows for the most common bento viewer — the conversion target).
- **Option C — Show global activity (no per-tenant filter).** "Cross-tenant events processed by the blueprint" is honest but undermines the bento's value as a tenant-personal dashboard.

The PM critical review (2026-05-17, BLOCKER 1) recommended locking Option A in the PRD before `/architect` because Architect + Lead Developer cannot write the F4 query or its tests without knowing the filtering contract.

## Decision

**Add a `tenant_id TEXT` column to `processed_events`.** Nullable (pre-migration rows stay NULL — acceptable as "legacy" data). The webhook handler (`/api/webhooks/stripe/route.ts`) writes `tenant_id` on insert by reading it from the Stripe Checkout Session `metadata.tenant_id` field (already passed in PRD-001's `StripeProvider.generateCheckoutUrl`). One-line code change in the handler.

**Schema migration (Tranche A operator SQL block):**

```sql
ALTER TABLE processed_events
  ADD COLUMN tenant_id TEXT;

-- Optional: backfill tenant_id for existing rows by joining tenants on stripe_customer_id.
-- Skip if too complex; accept NULLs as pre-migration legacy data.
```

**F4 query pattern (server-side, via existing `SupabaseStore`):**

```typescript
const { data } = await supabaseClient
  .from('processed_events')
  .select('event_id, processed_at, event_type') // event_type column added if needed; current schema is event_id-only
  .eq('tenant_id', tenantId)
  .order('processed_at', { ascending: false })
  .limit(5);
```

**Webhook handler update (one line in the insert):**

```typescript
await supabase.from('processed_events').insert({
  event_id: event.id,
  tenant_id: tenantIdFromMetadata, // NEW — extracted from event.data.object.metadata.tenant_id
  // processed_at defaults to NOW()
});
```

## Consequences

**Easier:**

- F4 query is a simple `eq` filter. No joins, no NULL handling for fresh tenants.
- Fresh tenants (no Stripe purchase yet) gracefully show empty state: "No activity yet — your first webhook event will appear here." Honest and bento-appropriate.
- Future per-tenant analytics queries on `processed_events` (sums, time buckets, etc.) trivially extend the same pattern.

**Harder:**

- One-time operator SQL migration required at Tranche A start. README adds a "Schema migrations for PRD-002" subsection alongside the existing PRD-000 schema setup.
- Webhook handler test in PRD-001 (T022: `checkout.session.completed` upserts tenant row) is unaffected, but a new test confirming `tenant_id` is written to `processed_events` should land in PRD-002 Tranche A.
- Pre-PRD-002 rows have NULL `tenant_id` and won't appear in any tenant's F4 list. Acceptable for an OSS blueprint — adopters running for the first time post-PRD-002 have clean data from row 1.

**Neutral:**

- Column is nullable. If a webhook fires without `metadata.tenant_id` (shouldn't happen for paywall-blueprint's own checkouts but possible if adopters add other event types), the insert succeeds with NULL `tenant_id` and the event still gets recorded for idempotency.
- The schema change is additive — no breakage for existing PRD-001 webhook handler logic.

## Date

2026-05-17
