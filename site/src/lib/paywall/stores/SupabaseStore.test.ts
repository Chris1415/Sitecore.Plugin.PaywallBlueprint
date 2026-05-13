/**
 * T020a — SupabaseStore.getEntitlement unit tests (RED phase)
 *
 * Per ADR-0011: tenant-only evaluator. Two decision branches:
 *   1. tenant row absent OR status !== 'active' → { status: 'tenant_no_subscription' }
 *   2. tenant row present AND status === 'active' → { status: 'allowed' }
 *
 * fixture source: sitecore:marketplace-sdk-client § 9 stub pattern + ADR-0011 tenant-only
 *   evaluator; capture-and-fix once real Supabase project is set up (T015).
 *
 * REGRESSION GUARD: userId parameter must NOT be consulted per ADR-0011.
 *   Tests 5 verifies calling with different userIds produces identical results.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStore } from './SupabaseStore';

// ---------------------------------------------------------------------------
// Stub helpers — vi.fn chain for SupabaseClient's query builder
// ---------------------------------------------------------------------------

/**
 * Build a stub SupabaseClient whose `.from().select().eq().maybeSingle()` chain
 * resolves with the provided `data` value and `error: null`.
 *
 * // source: sitecore:marketplace-sdk-client § 9 stub pattern (pre-scaffold)
 * // capture-and-fix: verify SupabaseClient shape vs
 * //   node_modules/@supabase/supabase-js/dist/... after T018
 */
function makeSupabaseStub(data: Record<string, unknown> | null, error: Error | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  // Also stub delete().eq() for clearState
  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const deleteMethod = vi.fn().mockReturnValue({ eq: deleteEq });
  // Upsert for seedTenant
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const fromWithUpsert = vi.fn((table: string) => {
    if (table === 'tenants') {
      return { select, delete: deleteMethod, upsert };
    }
    return { select, delete: deleteMethod, upsert };
  });
  return {
    from: fromWithUpsert,
    _mocks: { maybeSingle, eq, select, from: fromWithUpsert, deleteEq, deleteMethod, upsert },
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SupabaseStore.getEntitlement (ADR-0011 tenant-only evaluator)', () => {
  let store: SupabaseStore;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1 — Tenant row NOT found (no row)
  it('returns tenant_no_subscription when tenant row is absent (null data)', async () => {
    const client = makeSupabaseStub(null);
    store = new SupabaseStore(client);

    const result = await store.getEntitlement('tenant-A', 'user-X');

    expect(result).toEqual({ status: 'tenant_no_subscription' });
  });

  // Test 2 — Tenant found but status !== 'active' (e.g. 'cancelled')
  it('returns tenant_no_subscription when tenant status is cancelled', async () => {
    const client = makeSupabaseStub({
      tenant_id: 'tenant-A',
      status: 'cancelled',
      plan: 'starter',
      seats_total: 1,
    });
    store = new SupabaseStore(client);

    const result = await store.getEntitlement('tenant-A', 'user-X');

    expect(result).toEqual({ status: 'tenant_no_subscription' });
  });

  // Test 3 — Tenant found AND status === 'active'
  it('returns allowed when tenant status is active', async () => {
    const client = makeSupabaseStub({
      tenant_id: 'tenant-A',
      status: 'active',
      plan: 'starter',
      seats_total: 1,
    });
    store = new SupabaseStore(client);

    const result = await store.getEntitlement('tenant-A', 'user-X');

    expect(result).toEqual({ status: 'allowed' });
  });

  // Test 4 — Supabase client rejects → getEntitlement rejects (no internal try/catch)
  it('propagates rejection from Supabase client without catching', async () => {
    const supabaseError = new Error('network error');
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: supabaseError });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = { from } as unknown as import('@supabase/supabase-js').SupabaseClient;
    store = new SupabaseStore(client);

    await expect(store.getEntitlement('tenant-A', 'user-X')).rejects.toThrow('network error');
  });

  // Test 5 — REGRESSION GUARD: userId is NOT consulted (ADR-0011)
  // Calling with different userIds for the same tenantId must produce identical results.
  it('returns the same result regardless of userId (regression guard for ADR-0011)', async () => {
    const client = makeSupabaseStub({
      tenant_id: 'tenant-A',
      status: 'active',
      plan: 'starter',
      seats_total: 1,
    });
    store = new SupabaseStore(client);

    const resultX = await store.getEntitlement('tenant-A', 'user-X');
    const resultY = await store.getEntitlement('tenant-A', 'user-Y');

    // Both must resolve to the same shape regardless of the userId argument.
    expect(resultX).toEqual(resultY);
    expect(resultX).toEqual({ status: 'allowed' });
  });
});
