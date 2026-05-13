-- =============================================================================
-- Paywall Blueprint — Supabase Schema
-- Blueprint version: PRD-000
-- ADRs: 0007, 0008, 0009, 0010, 0011
--
-- ADR-0009: RLS enabled with permissive USING (true) placeholders.
--   REPLACE BEFORE PRODUCTION — production adopters MUST replace with
--   tenant-scoped policies. The placeholder policy exists only to allow
--   the client-side (anon-key) gate to read entitlement status.
--
-- ADR-0010: Idempotent re-runs via CREATE TABLE IF NOT EXISTS +
--   DROP POLICY IF EXISTS before each CREATE POLICY.
--
-- ADR-0011: Tenant-only entitlement in PRD-000.
--   The `seats` table lands in PRD-002 per ADR-0011.
--   Do NOT add a `seats` table to this file pre-PRD-002.
--   PRD-000 evaluator consults `tenants` only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: tenants
--
-- One row per Sitecore tenant that has (or had) a subscription.
-- `tenant_id`        — Sitecore tenant ID (from application.context
--                      resourceAccess[0].tenantId). Primary key.
-- `stripe_customer_id` / `subscription_id` — NULL in PRD-000;
--                      populated by the PRD-001 Stripe webhook handler.
-- `seats_total`      — unused by PRD-000 evaluator; kept for forward-compat
--                      with PRD-002 seat management.
-- `status`           — 'active' | 'cancelled' | 'past_due'
-- `period_end`       — subscription period end; NULL until PRD-001 wires it.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id           TEXT        NOT NULL,
    stripe_customer_id  TEXT        NULL,
    subscription_id     TEXT        NULL,
    plan                TEXT        NOT NULL DEFAULT 'starter',
    seats_total         INTEGER     NOT NULL DEFAULT 1,
    status              TEXT        NOT NULL
                            CHECK (status IN ('active', 'cancelled', 'past_due')),
    period_end          TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT tenants_pkey PRIMARY KEY (tenant_id)
);

-- -----------------------------------------------------------------------------
-- Table: processed_events
--
-- Idempotency log for webhook events (Stripe event.id as PK).
-- Empty in PRD-000 — provisioned for the PRD-001 Stripe webhook handler.
-- The event_id PK gives unique-on-conflict semantics: INSERT ... ON CONFLICT
-- DO NOTHING lets the webhook handler skip duplicate deliveries safely.
-- No anon-read policy — service-role only (webhook handler uses service role).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS processed_events (
    event_id        TEXT        NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT processed_events_pkey PRIMARY KEY (event_id)
);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Policies for: tenants
--
-- REPLACE BEFORE PRODUCTION
-- The policy below uses USING (true) — any authenticated OR anonymous client
-- that holds the anon key can read all tenant rows. This is intentional for
-- PRD-000 (client-side iframe app, no server-side proxy). Production adopters
-- MUST replace this with a tenant-scoped policy, e.g.:
--   USING (tenant_id = current_setting('app.tenant_id', true))
-- See README § "Security and adopter responsibilities" + ADR-0009.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "anon_read_tenants" ON tenants;
CREATE POLICY "anon_read_tenants"
    ON tenants
    FOR SELECT
    TO anon
    USING (true);

-- No anon policy on processed_events.
-- The PRD-001 webhook handler writes via service role key (bypasses RLS).
-- Operators do NOT need to add a policy here; the absence is intentional.
