/**
 * /api/entitlement route tests — T020
 *
 * RED phase: tests written before route implementation (T019).
 * All tests MUST FAIL until T019 is implemented.
 *
 * Fixture provenance:
 *   // source: PRD-000 EntitlementResult discriminated union in site/src/lib/paywall/types.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock functions that must be defined before vi.mock hoisting
const { mockGetEntitlement } = vi.hoisted(() => ({
  mockGetEntitlement: vi.fn(),
}));

// Mock SupabaseStore to control getEntitlement behavior
vi.mock('@/src/lib/paywall/stores/SupabaseStore', () => {
  function MockSupabaseStore() {
    return { getEntitlement: mockGetEntitlement };
  }
  return { SupabaseStore: MockSupabaseStore };
});

// Mock supabase-server to avoid real Supabase client construction
vi.mock('@/app/api/_lib/supabase-server', () => ({
  createServiceRoleClient: vi.fn(() => ({})),
}));

import { GET } from './route';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'service_role_fake';
});

function makeRequest(queryString: string): Request {
  return new Request(`http://localhost:3000/api/entitlement${queryString}`, {
    method: 'GET',
  });
}

describe('T020 — GET /api/entitlement', () => {
  it('T020a — allowed tenant → 200 with { status: "allowed" }', async () => {
    // source: PRD-000 EntitlementResult discriminated union in site/src/lib/paywall/types.ts
    mockGetEntitlement.mockResolvedValue({ status: 'allowed' });

    const req = makeRequest('?tenantId=ten_allowed');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('allowed');
  });

  it('T020b — no-subscription tenant → 200 with { status: "tenant_no_subscription" }', async () => {
    mockGetEntitlement.mockResolvedValue({ status: 'tenant_no_subscription' });

    const req = makeRequest('?tenantId=ten_nosub');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('tenant_no_subscription');
  });

  it('T020c — missing tenantId → 400', async () => {
    const req = makeRequest('');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
  });
});
