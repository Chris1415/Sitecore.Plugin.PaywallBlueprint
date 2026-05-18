/**
 * SupabaseStore — implements EntitlementStore + EntitlementSeed (ADR-0002)
 *
 * ADR-0011: Tenant-only entitlement in PRD-000.
 *   getEntitlement(tenantId, _userId) consults the `tenants` table ONLY.
 *   The `_userId` parameter is accepted for interface stability across PRDs
 *   but is NOT consulted in PRD-000. PRD-002 extends with the seats branch.
 *
 * ADR-0009: Errors propagate as thrown promise rejections (no internal
 *   try/catch). The React error boundary at T034 catches them.
 *
 * Schema: site/supabase/schema.sql (2-table: tenants + processed_events)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EntitlementResult, EntitlementStore, EntitlementSeed } from '../types';

export class SupabaseStore implements EntitlementStore, EntitlementSeed {
  constructor(private readonly client: SupabaseClient) {}

  // -------------------------------------------------------------------------
  // EntitlementStore — production-runtime
  // -------------------------------------------------------------------------

  async getEntitlement(tenantId: string, _userId: string): Promise<EntitlementResult> {
    // _userId accepted for interface stability; NOT consulted in PRD-000 per ADR-0011.
    const { data: tenant, error } = await this.client
      .from('tenants')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;

    // Allowed requires BOTH plan === 'premium' AND status === 'active'.
    // The schema default is plan='starter' (see supabase/schema.sql); a stale
    // 'starter' + 'active' row must NOT unlock premium. This matches the
    // server-side isLocked check in app/full-page/page.tsx so the API and the
    // page render agree — otherwise useEntitlement.resolveSuccess would fire
    // window.location.reload() against a page that re-renders locked, looping
    // indefinitely.
    if (!tenant || tenant.status !== 'active' || tenant.plan !== 'premium') {
      return { status: 'tenant_no_subscription' };
    }

    return { status: 'allowed' };
  }

  // -------------------------------------------------------------------------
  // EntitlementSeed — dev / CLI (ADR-0002: separate interface, not merged)
  // -------------------------------------------------------------------------

  /**
   * Upsert a tenant row. Used by the state-switcher CLI (pnpm seed:state).
   * Requires service-role key (bypasses RLS).
   */
  async seedTenant(args: {
    tenantId: string;
    plan: string;
    seatsTotal: number;
    status: 'active' | 'cancelled' | 'past_due';
  }): Promise<void> {
    const { error } = await this.client
      .from('tenants')
      .upsert({
        tenant_id: args.tenantId,
        plan: args.plan,
        seats_total: args.seatsTotal,
        status: args.status,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
  }

  /**
   * Remove the operator's tenant row from the `tenants` table.
   * Used by the state-switcher CLI to reset to a clean (no-subscription) state.
   * Requires service-role key (bypasses RLS).
   *
   * NOTE: ADR-0011 — clearState targets `tenants` only. No `seats` table in PRD-000.
   */
  async clearState(tenantId: string): Promise<void> {
    const { error } = await this.client
      .from('tenants')
      .delete()
      .eq('tenant_id', tenantId);
    if (error) throw error;
  }
}
