/**
 * /api/webhooks/stripe route tests — T022 / T023 / T024 / T025
 *
 * RED phase: tests written before route implementation (T021).
 * All tests MUST FAIL until T021 is implemented.
 *
 * Fixture provenance:
 *   // source: https://stripe.com/docs/api/checkout/sessions/object (pre-T006)
 *   // Post-T006: → node_modules/stripe/cjs/resources/Checkout/Sessions.d.ts → Session
 *   // source: https://stripe.com/docs/api/events/object (pre-T006)
 *   // Post-T006: → node_modules/stripe/cjs/resources/Events.d.ts → Event
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock functions
// ---------------------------------------------------------------------------

const {
  mockVerifyWebhookSignature,
  mockProcessedEventsInsert,
  mockTenantsUpsert,
} = vi.hoisted(() => ({
  mockVerifyWebhookSignature: vi.fn(),
  mockProcessedEventsInsert: vi.fn(),
  mockTenantsUpsert: vi.fn(),
}));

// Mock StripeProvider
vi.mock('@/src/lib/paywall/providers/StripeProvider', () => {
  function MockStripeProvider() {
    return { verifyWebhookSignature: mockVerifyWebhookSignature };
  }
  return { StripeProvider: MockStripeProvider };
});

// Mock supabase-server to return a controllable client
const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock('@/app/api/_lib/supabase-server', () => ({
  createServiceRoleClient: vi.fn(() => mockSupabaseClient),
}));

import { POST } from './route';

// ---------------------------------------------------------------------------
// Fake Stripe.Event fixtures
// source: https://stripe.com/docs/api/checkout/sessions/object (pre-T006)
// Post-T006: → node_modules/stripe/cjs/resources/Checkout/Sessions.d.ts → Session
// ---------------------------------------------------------------------------

const fakeCheckoutCompletedEvent = {
  id: 'evt_test_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      // source: https://stripe.com/docs/api/checkout/sessions/object (pre-T006)
      metadata: { tenant_id: 'tenant-abc' },
      customer: 'cus_xyz',
      subscription: null,
    },
  },
};

const fakeUnknownEvent = {
  id: 'evt_test_2',
  type: 'charge.refunded',
  data: { object: {} },
};

// ---------------------------------------------------------------------------
// Supabase mock setup helpers
// ---------------------------------------------------------------------------

function setupSupabaseMocks(
  opts: {
    insertError?: { code: string; message: string } | null;
    upsertError?: { code: string; message: string } | null;
  } = {},
) {
  const insertResult = { error: opts.insertError ?? null };
  const upsertResult = { error: opts.upsertError ?? null };

  // Chain mock: supabase.from('processed_events').insert(...) → resolves to insertResult
  // Chain mock: supabase.from('tenants').upsert(...) → resolves to upsertResult
  mockSupabaseClient.from.mockImplementation((table: string) => {
    if (table === 'processed_events') {
      return {
        insert: mockProcessedEventsInsert.mockResolvedValue(insertResult),
      };
    }
    if (table === 'tenants') {
      return {
        upsert: mockTenantsUpsert.mockResolvedValue(upsertResult),
      };
    }
    return {};
  });
}

function makeRequest(rawBody = 'raw_body', sig = 'v1=valid_sig'): Request {
  return new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig,
    },
    body: rawBody,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_PRICE_ID = 'price_test_fake';
  process.env.STRIPE_WEBHOOK_SIGNING_SECRET = 'whsec_test_fake';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'service_role_fake';
});

// ---------------------------------------------------------------------------
// T022 — happy path: checkout.session.completed upserts tenant row
// ---------------------------------------------------------------------------

describe('T022 — webhook checkout.session.completed happy path', () => {
  it('returns 200; processed_events.insert called; tenants.upsert called with correct shape', async () => {
    mockVerifyWebhookSignature.mockResolvedValue(fakeCheckoutCompletedEvent);
    setupSupabaseMocks();

    const req = makeRequest();
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });

    // processed_events.insert must be called with the event ID
    expect(mockProcessedEventsInsert).toHaveBeenCalledWith({ event_id: 'evt_test_1' });

    // tenants.upsert must be called with correct shape (T022 MUST-HAVE assertion)
    expect(mockTenantsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: 'tenant-abc',
        stripe_customer_id: 'cus_xyz',
        status: 'active',
        plan: 'premium',
        period_end: null,
      }),
      { onConflict: 'tenant_id' },
    );
  });
});

// ---------------------------------------------------------------------------
// T023 — idempotency: duplicate event_id returns 200 silent, no second upsert
// ---------------------------------------------------------------------------

describe('T023 — webhook idempotency', () => {
  it('first call upserts; second call (unique violation 23505) returns 200 without upsert', async () => {
    // First call: insert succeeds
    mockVerifyWebhookSignature.mockResolvedValue(fakeCheckoutCompletedEvent);

    // First: successful insert
    mockSupabaseClient.from.mockImplementationOnce(() => ({
      insert: mockProcessedEventsInsert.mockResolvedValueOnce({ error: null }),
    })).mockImplementationOnce(() => ({
      upsert: mockTenantsUpsert.mockResolvedValueOnce({ error: null }),
    }));

    const req1 = makeRequest();
    await POST(req1);

    // Reset for second call
    mockVerifyWebhookSignature.mockResolvedValue(fakeCheckoutCompletedEvent);

    // Second: unique violation on processed_events.insert
    mockSupabaseClient.from.mockImplementationOnce(() => ({
      insert: mockProcessedEventsInsert.mockResolvedValueOnce({
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      }),
    }));

    const req2 = makeRequest();
    const res2 = await POST(req2);
    const body2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(body2).toEqual({ ok: true });

    // tenants.upsert must NOT be called a second time
    // (first call: 1 upsert; second call: 0 additional upserts due to idempotency)
    expect(mockTenantsUpsert).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// T024 — signature mismatch: verifyWebhookSignature throws → 400 (NOT 401)
// ---------------------------------------------------------------------------

describe('T024 — webhook signature mismatch', () => {
  it('returns 400 (not 401); console.error called; no DB writes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockVerifyWebhookSignature.mockRejectedValue(new Error('No signatures found matching'));

    const req = makeRequest('raw_body', 'v1=bad_sig');
    const res = await POST(req);
    const body = await res.json();

    // CRITICAL: must be 400, NOT 401 (Stripe does not retry 4xx; 401 triggers retries)
    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('invalid signature');

    // console.error must be called with the [PaywallBlueprint] prefix
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PaywallBlueprint] webhook signature verification failed'),
      expect.anything(),
    );

    // No DB writes should happen
    expect(mockProcessedEventsInsert).not.toHaveBeenCalled();
    expect(mockTenantsUpsert).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// T025 — unknown event type: 200 silent; processed_events.insert still called
// ---------------------------------------------------------------------------

describe('T025 — webhook unknown event type', () => {
  it('returns 200; processed_events.insert called; tenants.upsert NOT called', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockVerifyWebhookSignature.mockResolvedValue(fakeUnknownEvent);
    setupSupabaseMocks();

    const req = makeRequest();
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });

    // processed_events.insert still runs (so retries are idempotent)
    expect(mockProcessedEventsInsert).toHaveBeenCalledWith({ event_id: 'evt_test_2' });

    // tenants.upsert must NOT be called for unknown event
    expect(mockTenantsUpsert).not.toHaveBeenCalled();

    // console.log must mention the unhandled event type
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PaywallBlueprint] unhandled event:'),
      'charge.refunded',
    );

    logSpy.mockRestore();
  });
});
