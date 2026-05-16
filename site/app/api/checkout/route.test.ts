/**
 * /api/checkout route tests — T016
 *
 * RED phase: tests written before route implementation (T015).
 * All tests MUST FAIL until T015 is implemented.
 *
 * Fixture provenance:
 *   // Tenant/user shape: source: fixture-source PRD-000 T013 Marketplace SDK capture
 *   // Stripe error shape: source: https://stripe.com/docs/error-codes (pre-T006)
 *   // Post-T006: → node_modules/stripe/cjs/Error.d.ts → StripeError
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create the mock fn before vi.mock hoisting runs
const { mockGenerateCheckoutUrl } = vi.hoisted(() => ({
  mockGenerateCheckoutUrl: vi.fn(),
}));

// Mock StripeProvider — use function constructor so `new StripeProvider()` works
vi.mock('@/src/lib/paywall/providers/StripeProvider', () => {
  function MockStripeProvider() {
    return { generateCheckoutUrl: mockGenerateCheckoutUrl };
  }
  return { StripeProvider: MockStripeProvider };
});

import { POST } from './route';

beforeEach(() => {
  vi.clearAllMocks();
  // Set required env vars
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_PRICE_ID = 'price_test_fake';
  process.env.STRIPE_WEBHOOK_SIGNING_SECRET = 'whsec_test_fake';
});

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('T016 — POST /api/checkout', () => {
  it('T016a — valid body → 200 with { url }', async () => {
    // source: fixture-source PRD-000 T013 Marketplace SDK capture
    mockGenerateCheckoutUrl.mockResolvedValue(
      'https://checkout.stripe.com/pay/cs_test_example',
    );

    const req = makeRequest({ tenantId: 'ten_abc', userEmail: 'user@example.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty('url');
    expect(typeof body.url).toBe('string');
    expect(body.url.length).toBeGreaterThan(0);
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_example');
  });

  it('T016b — missing tenantId → 400', async () => {
    const req = makeRequest({ userEmail: 'user@example.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toHaveProperty('error');
  });

  it('T016c — Stripe throws tax_settings_not_set → 503 with user-friendly message', async () => {
    // source: https://stripe.com/docs/error-codes (pre-T006)
    // Post-T006: → node_modules/stripe/cjs/Error.d.ts → StripeError
    const stripeErr = { code: 'tax_settings_not_set', message: 'Tax settings not configured' };
    mockGenerateCheckoutUrl.mockRejectedValue(stripeErr);

    const req = makeRequest({ tenantId: 'ten_abc', userEmail: 'user@example.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('administrator');
  });

  it('T016d — Stripe throws rate_limit → 429 with user-friendly message', async () => {
    const stripeErr = { code: 'rate_limit', message: 'Too many requests' };
    mockGenerateCheckoutUrl.mockRejectedValue(stripeErr);

    const req = makeRequest({ tenantId: 'ten_abc', userEmail: 'user@example.com' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('busy');
  });
});
