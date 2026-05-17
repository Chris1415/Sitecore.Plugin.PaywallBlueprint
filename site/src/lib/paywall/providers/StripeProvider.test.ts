/**
 * StripeProvider unit tests — T012 / T013 / T014
 *
 * RED phase: tests written before StripeProvider implementation (T011).
 * All tests in this file MUST FAIL until T011 is implemented.
 *
 * Fixture source (pre-T006):
 *   // source: https://stripe.com/docs/api/customers/object (pre-T006)
 *   // Post-T006: → node_modules/stripe/cjs/resources/Customers.d.ts → Customer
 *
 *   // source: https://stripe.com/docs/api/events/object (pre-T006)
 *   // Post-T006: → node_modules/stripe/cjs/resources/Events.d.ts → Event
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Stripe SDK mock
// ---------------------------------------------------------------------------

const mockCustomersList = vi.fn();
const mockCustomersCreate = vi.fn();
const mockCustomersUpdate = vi.fn();
const mockCustomersRetrieve = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock('stripe', () => {
  // Create a mock constructor that returns a mock instance when called with `new`
  function MockStripe() {
    return {
      customers: {
        list: mockCustomersList,
        create: mockCustomersCreate,
        update: mockCustomersUpdate,
        retrieve: mockCustomersRetrieve,
      },
      checkout: {
        sessions: {
          create: mockCheckoutSessionsCreate,
        },
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
    };
  }
  return { default: MockStripe };
});

// Import AFTER mock is set up
import { StripeProvider } from './StripeProvider';

// ---------------------------------------------------------------------------
// Helpers — fake Stripe Customer shape
// source: https://stripe.com/docs/api/customers/object (pre-T006)
// Post-T006: → node_modules/stripe/cjs/resources/Customers.d.ts → Customer
// ---------------------------------------------------------------------------

function makeCustomer(
  id: string,
  created: number,
  email: string,
  metadata: Record<string, string> = {},
) {
  return {
    id,
    object: 'customer' as const,
    created,
    email,
    metadata,
    livemode: false,
  };
}

// Fake Stripe.Event shape
// source: https://stripe.com/docs/api/events/object (pre-T006)
// Post-T006: → node_modules/stripe/cjs/resources/Events.d.ts → Event
const fakeEvent = {
  id: 'evt_test_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      metadata: { tenant_id: 'ten_abc' },
      customer: 'cus_abc',
    },
  },
};

// ---------------------------------------------------------------------------
// Provider setup
// ---------------------------------------------------------------------------

const SECRET_KEY = 'sk_test_fake';
const PRICE_ID = 'price_test_fake';
const WEBHOOK_SECRET = 'whsec_test_fake';

let provider: StripeProvider;

beforeEach(() => {
  vi.clearAllMocks();
  provider = new StripeProvider(SECRET_KEY, PRICE_ID, WEBHOOK_SECRET);
  // Default mock for checkout session creation
  mockCheckoutSessionsCreate.mockResolvedValue({
    url: 'https://checkout.stripe.com/pay/cs_test_example',
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// T012 — orphan recovery branches
// ---------------------------------------------------------------------------

describe('T012 — StripeProvider orphan recovery (generateCheckoutUrl)', () => {
  const args = {
    tenantId: 'ten_abc',
    userEmail: 'user@example.com',
    returnUrl: 'https://example.com/paywall-return',
  };

  it('T012a — 0 candidates: customers.create called with correct metadata', async () => {
    // No existing Stripe Customer, no existing stripe_customer_id in DB
    const newCustomer = makeCustomer('cus_new', Date.now(), args.userEmail, {
      tenant_id: args.tenantId,
      app_slug: 'paywall-blueprint',
    });
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue(newCustomer);

    await provider.generateCheckoutUrl(args);

    // customers.create must be called with app_slug + tenant_id metadata
    expect(mockCustomersCreate).toHaveBeenCalledOnce();
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: args.userEmail,
        metadata: expect.objectContaining({
          tenant_id: args.tenantId,
          app_slug: 'paywall-blueprint',
        }),
      }),
    );
    // customers.update must NOT be called (no candidate to re-key)
    expect(mockCustomersUpdate).not.toHaveBeenCalled();
  });

  it('T012b — 1 matching candidate: customers.update called, customers.create NOT called', async () => {
    const existingCustomer = makeCustomer('cus_existing', 1000, args.userEmail, {
      tenant_id: 'old_tenant',
      app_slug: 'paywall-blueprint',
    });
    mockCustomersList.mockResolvedValue({ data: [existingCustomer] });
    mockCustomersUpdate.mockResolvedValue({
      ...existingCustomer,
      metadata: { tenant_id: args.tenantId, app_slug: 'paywall-blueprint' },
    });

    await provider.generateCheckoutUrl(args);

    // Must re-key the existing customer's metadata, not create a new one
    expect(mockCustomersUpdate).toHaveBeenCalledOnce();
    expect(mockCustomersUpdate).toHaveBeenCalledWith(
      'cus_existing',
      expect.objectContaining({
        metadata: expect.objectContaining({
          tenant_id: args.tenantId,
          app_slug: 'paywall-blueprint',
        }),
      }),
    );
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it('T012c — N>1 candidates: most-recently-created picked; console.warn with discarded IDs', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Two candidates; cus_newer has higher `created` timestamp → should be picked
    const older = makeCustomer('cus_older', 1000, args.userEmail, {
      tenant_id: 'ten_old',
      app_slug: 'paywall-blueprint',
    });
    const newer = makeCustomer('cus_newer', 2000, args.userEmail, {
      tenant_id: 'ten_old2',
      app_slug: 'paywall-blueprint',
    });
    mockCustomersList.mockResolvedValue({ data: [older, newer] }); // Stripe returns unsorted; impl must sort
    mockCustomersUpdate.mockResolvedValue({
      ...newer,
      metadata: { tenant_id: args.tenantId, app_slug: 'paywall-blueprint' },
    });

    await provider.generateCheckoutUrl(args);

    // Most-recently-created (newer) must be the one updated
    expect(mockCustomersUpdate).toHaveBeenCalledWith(
      'cus_newer',
      expect.objectContaining({
        metadata: expect.objectContaining({ tenant_id: args.tenantId }),
      }),
    );
    // console.warn must include the discarded ID
    // Actual call: warn(message, joinedString, discardedArray)
    // The first arg contains the prefix and the picked customer ID
    const warnCall = warnSpy.mock.calls[0];
    expect(warnCall[0]).toContain('[PaywallBlueprint]');
    // discarded customer ID must appear somewhere in the warn output
    const allArgs = warnCall.map((a) => JSON.stringify(a)).join(' ');
    expect(allArgs).toContain('cus_older');

    warnSpy.mockRestore();
  });

  it('T012d — cross-app safety: foreign app_slug candidate is NOT selected', async () => {
    // Foreign app candidate + our app candidate
    const foreignCandidate = makeCustomer('cus_foreign', 3000, args.userEmail, {
      tenant_id: 'foreign_ten',
      app_slug: 'other-app', // different app — must be ignored
    });
    const ourCandidate = makeCustomer('cus_ours', 2000, args.userEmail, {
      tenant_id: 'ten_old',
      app_slug: 'paywall-blueprint',
    });
    mockCustomersList.mockResolvedValue({ data: [foreignCandidate, ourCandidate] });
    mockCustomersUpdate.mockResolvedValue({
      ...ourCandidate,
      metadata: { tenant_id: args.tenantId, app_slug: 'paywall-blueprint' },
    });

    await provider.generateCheckoutUrl(args);

    // Only our candidate should be picked — foreign candidate has higher created timestamp
    // but should be filtered OUT by app_slug check
    expect(mockCustomersUpdate).toHaveBeenCalledWith(
      'cus_ours',
      expect.objectContaining({
        metadata: expect.objectContaining({ app_slug: 'paywall-blueprint' }),
      }),
    );
    // Confirm foreign customer was not used
    expect(mockCustomersUpdate).not.toHaveBeenCalledWith(
      'cus_foreign',
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// T013 — generatePortalUrl throws with "PRD-003" in message
// ---------------------------------------------------------------------------

describe('T013 — StripeProvider.generatePortalUrl throws', () => {
  it('throws Error with message containing "PRD-003"', async () => {
    await expect(
      provider.generatePortalUrl({ tenantId: 'ten_abc', returnUrl: 'https://example.com' }),
    ).rejects.toThrow(/PRD-003/);
  });
});

// ---------------------------------------------------------------------------
// T014 — verifyWebhookSignature: good signature + bad signature
// ---------------------------------------------------------------------------

describe('T014 — StripeProvider.verifyWebhookSignature', () => {
  it('T014a — good signature: returns parsed Stripe.Event', async () => {
    mockWebhooksConstructEvent.mockReturnValue(fakeEvent);

    const result = await provider.verifyWebhookSignature('raw_body', 'v1=good_sig');

    expect(result).toEqual(fakeEvent);
    expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
      'raw_body',
      'v1=good_sig',
      WEBHOOK_SECRET,
    );
  });

  it('T014b — bad signature: re-throws (does not swallow)', async () => {
    const stripeError = new Error('No signatures found matching');
    mockWebhooksConstructEvent.mockImplementation(() => {
      throw stripeError;
    });

    await expect(
      provider.verifyWebhookSignature('raw_body', 'v1=bad_sig'),
    ).rejects.toThrow('No signatures found matching');
  });
});
