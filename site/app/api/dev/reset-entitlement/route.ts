/**
 * POST /api/dev/reset-entitlement — DEV-ONLY tenant reset for testing
 *
 * Comprehensive cleanup: drops EVERY tenants row sharing the same
 * stripe_customer_id as the supplied tenantId, plus the processed_events
 * idempotency cache rows tied to that customer. This sweeps orphan rows
 * (e.g. the duplicate `77e01cc5-...` alongside `391dd026-...` seen at
 * Gate D smoke 2026-05-18) so the next checkout attempt starts from a
 * truly clean state.
 *
 * Security: HARD-REFUSES in production (NODE_ENV === "production" → 403).
 * Adopters who fork the blueprint inherit the same guard. Defense in depth:
 * the ResetEntitlementButton in components/ also gates render on NODE_ENV.
 *
 * sitecore:marketplace-sdk-lifecycle — server-only secret usage (service-role
 * key bypasses RLS per ADR-0009 + NFR-7).
 */

import { createServiceRoleClient } from "@/app/api/_lib/supabase-server";

export async function POST(request: Request): Promise<Response> {
  // ── Production guard ────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "dev endpoint disabled in production" },
      { status: 403 },
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { tenantId?: unknown };
  try {
    body = (await request.json()) as { tenantId?: unknown };
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const tenantId = typeof body.tenantId === "string" ? body.tenantId : null;
  if (!tenantId) {
    return Response.json({ error: "tenantId required" }, { status: 400 });
  }

  // ── Service-role Supabase client (bypasses RLS per ADR-0009) ────────────
  const supabase = createServiceRoleClient();

  // ── Look up the stripe_customer_id for this tenant ──────────────────────
  const { data: tenantRow, error: lookupError } = await supabase
    .from("tenants")
    .select("stripe_customer_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (lookupError) {
    return Response.json(
      { error: `lookup failed: ${lookupError.message}` },
      { status: 500 },
    );
  }

  const stripeCustomerId =
    typeof tenantRow?.stripe_customer_id === "string"
      ? tenantRow.stripe_customer_id
      : null;

  // ── Delete all tenants rows for this customer (sweeps orphans) ──────────
  // If no stripe_customer_id (row never paid), fall back to tenant-only delete.
  let deletedTenantCount = 0;
  if (stripeCustomerId) {
    const { error: deleteError, count } = await supabase
      .from("tenants")
      .delete({ count: "exact" })
      .eq("stripe_customer_id", stripeCustomerId);

    if (deleteError) {
      return Response.json(
        { error: `tenants delete failed: ${deleteError.message}` },
        { status: 500 },
      );
    }
    deletedTenantCount = count ?? 0;
  } else {
    const { error: deleteError, count } = await supabase
      .from("tenants")
      .delete({ count: "exact" })
      .eq("tenant_id", tenantId);

    if (deleteError) {
      return Response.json(
        { error: `tenant-only delete failed: ${deleteError.message}` },
        { status: 500 },
      );
    }
    deletedTenantCount = count ?? 0;
  }

  // ── Flush processed_events idempotency cache for this customer ──────────
  // Stripe re-sends the same event_id on retry; clearing the cache lets a
  // fresh checkout for this customer be processed cleanly. Safe in dev only.
  let deletedEventCount = 0;
  if (stripeCustomerId) {
    // processed_events stores the event payload; the Stripe customer_id lives
    // inside event_data->>'customer'. Match via Postgres JSON arrow operator.
    const { error: eventsError, count: evCount } = await supabase
      .from("processed_events")
      .delete({ count: "exact" })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter("event_data->>customer" as any, "eq", stripeCustomerId);
    if (!eventsError) {
      deletedEventCount = evCount ?? 0;
    }
    // Don't fail the request on events cleanup error — it's a nice-to-have.
  }

  return Response.json(
    {
      ok: true,
      stripeCustomerId,
      deletedTenantCount,
      deletedEventCount,
    },
    { status: 200 },
  );
}
