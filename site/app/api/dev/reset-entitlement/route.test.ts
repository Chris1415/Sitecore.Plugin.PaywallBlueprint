/**
 * /api/dev/reset-entitlement — always-on demo reset endpoint
 *
 * Covers:
 *   - Invalid body: 400 when tenantId missing
 *   - Happy path: looks up stripe_customer_id, deletes all tenants rows for
 *     that customer, flushes processed_events for that customer, returns
 *     deletedTenantCount + deletedEventCount
 *   - Fallback: when stripe_customer_id is null, tenant-only delete path
 *
 * No production gate — the blueprint is a demo app; adopters who fork it
 * for real production use should add their own auth check.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase client factory BEFORE importing the route.
vi.mock("@/app/api/_lib/supabase-server", () => ({
  createServiceRoleClient: vi.fn(),
}));

import { createServiceRoleClient } from "@/app/api/_lib/supabase-server";

const mockCreateServiceRoleClient = vi.mocked(createServiceRoleClient);

/**
 * Build a chainable mock that mimics the supabase-js fluent API used by
 * the route: from().select().eq().maybeSingle() and from().delete().eq()
 * + from().delete().filter().
 */
function makeMockSupabase(opts: {
  lookupResult: { data: { stripe_customer_id: string | null } | null; error: null | { message: string } };
  tenantDeleteResult: { count: number; error: null | { message: string } };
  eventsDeleteResult: { count: number; error: null | { message: string } };
}) {
  const tenantsDeleteEq = vi.fn().mockResolvedValue({
    count: opts.tenantDeleteResult.count,
    error: opts.tenantDeleteResult.error,
  });
  const tenantsDelete = vi.fn().mockReturnValue({ eq: tenantsDeleteEq });

  const tenantsSelectEqSingle = vi.fn().mockResolvedValue({
    data: opts.lookupResult.data,
    error: opts.lookupResult.error,
  });
  const tenantsSelectEq = vi
    .fn()
    .mockReturnValue({ maybeSingle: tenantsSelectEqSingle });
  const tenantsSelect = vi.fn().mockReturnValue({ eq: tenantsSelectEq });

  const eventsDeleteFilter = vi.fn().mockResolvedValue({
    count: opts.eventsDeleteResult.count,
    error: opts.eventsDeleteResult.error,
  });
  const eventsDelete = vi.fn().mockReturnValue({ filter: eventsDeleteFilter });

  const from = vi.fn((table: string) => {
    if (table === "tenants") {
      return { select: tenantsSelect, delete: tenantsDelete };
    }
    if (table === "processed_events") {
      return { delete: eventsDelete };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return {
    client: { from } as unknown as ReturnType<typeof createServiceRoleClient>,
    spies: {
      tenantsDelete,
      tenantsDeleteEq,
      tenantsSelectEqSingle,
      eventsDeleteFilter,
    },
  };
}

describe("/api/dev/reset-entitlement — always-on demo endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when tenantId is missing from body", async () => {
    mockCreateServiceRoleClient.mockReturnValue(
      makeMockSupabase({
        lookupResult: { data: null, error: null },
        tenantDeleteResult: { count: 0, error: null },
        eventsDeleteResult: { count: 0, error: null },
      }).client,
    );
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://test/api/dev/reset-entitlement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("looks up stripe_customer_id, deletes all rows for that customer, flushes events", async () => {
    const mock = makeMockSupabase({
      lookupResult: {
        data: { stripe_customer_id: "cus_UWsFwLnY3oe3X8" },
        error: null,
      },
      tenantDeleteResult: { count: 2, error: null },
      eventsDeleteResult: { count: 5, error: null },
    });
    mockCreateServiceRoleClient.mockReturnValue(mock.client);
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://test/api/dev/reset-entitlement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId: "391dd026-..." }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      stripeCustomerId: string;
      deletedTenantCount: number;
      deletedEventCount: number;
    };
    expect(body).toEqual({
      ok: true,
      stripeCustomerId: "cus_UWsFwLnY3oe3X8",
      deletedTenantCount: 2,
      deletedEventCount: 5,
    });

    // Verify the delete-by-customer path was taken (NOT tenant-only fallback)
    expect(mock.spies.tenantsDeleteEq).toHaveBeenCalledWith(
      "stripe_customer_id",
      "cus_UWsFwLnY3oe3X8",
    );
  });

  it("falls back to tenant-only delete when stripe_customer_id is null", async () => {
    const mock = makeMockSupabase({
      lookupResult: {
        data: { stripe_customer_id: null },
        error: null,
      },
      tenantDeleteResult: { count: 1, error: null },
      eventsDeleteResult: { count: 0, error: null },
    });
    mockCreateServiceRoleClient.mockReturnValue(mock.client);
    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://test/api/dev/reset-entitlement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId: "unpaid-tenant" }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      deletedTenantCount: number;
      stripeCustomerId: null;
    };
    expect(body.deletedTenantCount).toBe(1);
    expect(body.stripeCustomerId).toBeNull();
    // Verify the tenant-only path was taken
    expect(mock.spies.tenantsDeleteEq).toHaveBeenCalledWith(
      "tenant_id",
      "unpaid-tenant",
    );
  });
});
