/**
 * GET /api/entitlement — T019
 *
 * ⚠ UNAUTHENTICATED in v1 — PRD-002 hardens via host.user.sub verification;
 *   see README § Known limitations. NFR-7 + ADR-0009.
 *
 * Polling endpoint for the useEntitlement hook (ADR-0014).
 * Returns EntitlementResult JSON for the given tenantId.
 *
 * Env vars consumed (server-only):
 *   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
 *   SUPABASE_SECRET_KEY — service-role key; bypasses RLS (ADR-0009 + NFR-7)
 *
 * Design choice: constructs SupabaseStore with the service-role client directly.
 * SupabaseStore accepts a SupabaseClient arg (see stores/SupabaseStore.ts:19),
 * so this avoids refactoring the store and keeps SupabaseStore unchanged (PRD-001
 * invariant per § 4c-5 forbidden modifications).
 */

import { SupabaseStore } from '@/src/lib/paywall/stores/SupabaseStore';
import { createServiceRoleClient } from '@/app/api/_lib/supabase-server';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const userId = searchParams.get('userId') ?? '';

  // Validate required tenantId param (T020c)
  if (!tenantId) {
    return Response.json({ error: 'tenantId required' }, { status: 400 });
  }

  // Service-role Supabase client bypasses RLS (ADR-0009 + NFR-7)
  const supabase = createServiceRoleClient();
  const store = new SupabaseStore(supabase);

  const result = await store.getEntitlement(tenantId, userId);
  return Response.json(result, { status: 200 });
}
