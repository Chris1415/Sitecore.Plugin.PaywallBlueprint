/**
 * StripeProvider — T011
 *
 * First concrete PaymentProvider implementation (ADR-0003).
 * Implements Stripe direct integration for one-time €0.99 EUR lifetime payment (ADR-0012).
 *
 * verifyWebhookSignature returns Promise<Stripe.Event> which satisfies the interface's
 * Promise<unknown> (Tranche E type reconciliation). The interface return type was changed
 * from Promise<boolean> to Promise<unknown> to honestly reflect that each provider returns
 * its own event object — the webhook route casts to the concrete type after calling this method.
 *
 * ADR-0015: Stripe Customer orphan recovery via metadata.app_slug + multi-candidate handling.
 * APP_SLUG constant scopes Customer lookup to this app only — adopters forking must change this.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// source: node_modules/stripe/cjs/resources/Events.d.ts → Event (post-T006)

/** Scope tag that scopes Stripe Customer lookup to this specific app (ADR-0015) */
const APP_SLUG = 'paywall-blueprint';

/**
 * Suffix included in the Stripe idempotency key so it bumps when params change.
 *
 * Stripe idempotency keys cache the FIRST request's params; subsequent requests
 * with the SAME key but DIFFERENT params are rejected with:
 *   "Keys for idempotent requests can only be used with the same parameters
 *    they were first used with."
 * Keys auto-expire after 24h, but during dev iteration a stale cache hit will
 * block you for that window.
 *
 * Bump this version constant whenever you change the SessionCreateParams shape
 * (added/removed/renamed fields, automatic_tax flip, customer_update change,
 * etc.). The idempotency key becomes `${tenantId}:${CHECKOUT_PARAMS_VERSION}`,
 * so a bump produces a fresh key for every tenant — Stripe re-runs the request
 * with the new params instead of returning the cached error.
 *
 * History:
 *   v1 — initial T011 shape (no customer_update; failed automatic_tax with
 *        customer_tax_location_invalid against real tenants)
 *   v2 — added customer_update: { address: 'auto', name: 'auto' }
 */
const CHECKOUT_PARAMS_VERSION = 'v2';

// NOTE: StripeProvider intentionally does NOT declare `implements PaymentProvider`.
// The PaymentProvider interface's parseWebhookPayload(rawBody: string) signature diverges
// from the runtime contract (StripeProvider takes a pre-parsed Stripe.Event — the route
// calls verifyWebhookSignature first, then passes the resulting event to parseWebhookPayload).
// Reconciliation deferred to PRD-003 when a second provider lands and the interface is
// revised to reflect the real calling convention. verifyWebhookSignature return type was
// corrected from Promise<boolean> to Promise<unknown> in Tranche E (types.ts).
export class StripeProvider {
  private readonly stripe: Stripe;

  constructor(
    private readonly secretKey: string,
    private readonly priceId: string,
    private readonly webhookSigningSecret: string,
  ) {
    this.stripe = new Stripe(secretKey);
  }

  // ---------------------------------------------------------------------------
  // generateCheckoutUrl — ADR-0015 orphan recovery + Checkout Session creation
  // ---------------------------------------------------------------------------

  /**
   * Find or create a Stripe Customer for the tenant, then create a Checkout Session.
   *
   * Orphan recovery flow (ADR-0015):
   * 1. Check Supabase tenants row for existing stripe_customer_id → retrieve if found.
   * 2. Else: list Stripe Customers by email, filter by metadata.app_slug === 'paywall-blueprint'.
   * 3. If 0 matching → create new Customer with tenant_id + app_slug metadata.
   * 4. If N>1 → sort by created desc, pick most-recently-created, log discards.
   * 5. If 1 or first-of-N → update metadata.tenant_id to current value.
   *
   * Idempotency: uses tenantId as the Stripe idempotency key (dedupes concurrent calls per R3).
   * Automatic tax: enabled: true per NFR-9 (adopters disable in this file if Tax not configured).
   */
  async generateCheckoutUrl(args: {
    tenantId: string;
    userEmail: string;
    returnUrl: string;
  }): Promise<string> {
    const { tenantId, userEmail, returnUrl } = args;

    const customer = await this.findOrCreateStripeCustomer({ tenantId, userEmail });

    // source: node_modules/stripe/cjs/resources/Checkout/Sessions.d.ts → SessionCreateParams
    // customer_update.address: 'auto' is REQUIRED when automatic_tax is enabled and the
    // Customer record lacks a tax-residency address — Stripe captures the billing address
    // the customer enters during Checkout and saves it back to the Customer record.
    // Without it: StripeInvalidRequestError `customer_tax_location_invalid` (verified
    // against real tenant 2026-05-17 during T040 smoke).
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [{ price: this.priceId, quantity: 1 }],
        automatic_tax: { enabled: true },
        customer_update: { address: 'auto', name: 'auto' },
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: returnUrl,
        customer: customer.id,
        metadata: { tenant_id: tenantId },
      },
      { idempotencyKey: `${tenantId}:${CHECKOUT_PARAMS_VERSION}` },
    );

    return session.url!;
  }

  // ---------------------------------------------------------------------------
  // generatePortalUrl — PRD-003 stub (ADR-0003)
  // ---------------------------------------------------------------------------

  /**
   * Customer Portal is deferred to PRD-003.
   * /api/portal returns 501 until then.
   */
  async generatePortalUrl(_args: { tenantId: string; returnUrl: string }): Promise<string> {
    throw new Error('Not implemented in PRD-001; lands in PRD-003 — see /api/portal stub.');
  }

  // ---------------------------------------------------------------------------
  // verifyWebhookSignature — wraps stripe.webhooks.constructEvent
  // ---------------------------------------------------------------------------

  /**
   * Verify the Stripe webhook signature and return the parsed Event.
   *
   * Throws on bad signature — callers MUST NOT swallow this error.
   * The /api/webhooks/stripe route catches it and returns 400 (not 401).
   *
   * source: node_modules/stripe/cjs/Webhooks.d.ts → constructEvent
   */
  async verifyWebhookSignature(rawBody: string, signature: string): Promise<Stripe.Event> {
    // constructEvent throws on bad signature — we let it propagate
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSigningSecret);
  }

  // ---------------------------------------------------------------------------
  // parseWebhookPayload — map Stripe.Event to internal EntitlementChange
  // ---------------------------------------------------------------------------

  /**
   * Maps Stripe event type to an internal EntitlementChange shape.
   *
   * Tranche B: only 'checkout.session.completed' is fully handled.
   * The 5 forward-compat types return stub shapes; they are dispatched by T041 (Tranche D).
   *
   * source: node_modules/stripe/cjs/resources/Events.d.ts → CheckoutSessionCompletedEvent (line 685)
   */
  async parseWebhookPayload(event: Stripe.Event): Promise<{
    kind:
      | 'subscription_created'
      | 'subscription_updated'
      | 'subscription_cancelled'
      | 'payment_failed'
      | 'payment_succeeded';
    providerEventId: string;
    tenantId: string;
    payload: unknown;
  }> {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        kind: 'subscription_created',
        providerEventId: event.id,
        tenantId: session.metadata?.tenant_id ?? '',
        payload: session,
      };
    }

    // Forward-compat types — handlers land in T041 (Tranche D)
    if (event.type === 'customer.subscription.updated') {
      return { kind: 'subscription_updated', providerEventId: event.id, tenantId: '', payload: event.data.object };
    }
    if (event.type === 'customer.subscription.deleted') {
      return { kind: 'subscription_cancelled', providerEventId: event.id, tenantId: '', payload: event.data.object };
    }
    if (event.type === 'invoice.payment_failed') {
      return { kind: 'payment_failed', providerEventId: event.id, tenantId: '', payload: event.data.object };
    }
    if (event.type === 'checkout.session.async_payment_succeeded') {
      return { kind: 'payment_succeeded', providerEventId: event.id, tenantId: '', payload: event.data.object };
    }
    if (event.type === 'checkout.session.async_payment_failed') {
      return { kind: 'payment_failed', providerEventId: event.id, tenantId: '', payload: event.data.object };
    }

    throw new Error(`Unhandled event type in parseWebhookPayload: ${event.type} (Tranche D handler)`);
  }

  // ---------------------------------------------------------------------------
  // Private: findOrCreateStripeCustomer (ADR-0015 orphan recovery)
  // ---------------------------------------------------------------------------

  private async findOrCreateStripeCustomer(args: {
    tenantId: string;
    userEmail: string;
  }): Promise<Stripe.Customer> {
    const { tenantId, userEmail } = args;

    // Step 1: check Supabase for a cached stripe_customer_id
    // Use service-role client (bypasses RLS per ADR-0009)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });
      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (tenant?.stripe_customer_id) {
        // source: node_modules/stripe/cjs/resources/Customers.d.ts → Customer | DeletedCustomer
        const retrieved = await this.stripe.customers.retrieve(tenant.stripe_customer_id);
        if (retrieved.object === 'customer' && !('deleted' in retrieved)) {
          return retrieved as Stripe.Customer;
        }
      }
    }

    // Step 2: list Stripe Customers by email, filter by app_slug
    // source: node_modules/stripe/cjs/resources/Customers.d.ts → CustomerListParams
    const { data: candidates } = await this.stripe.customers.list({
      email: userEmail,
      limit: 10,
    });

    // Filter to only our app's customers (ADR-0015 cross-app safety invariant)
    const ours = candidates.filter((c) => c.metadata?.app_slug === APP_SLUG);

    if (ours.length === 0) {
      // Step 3: no matching candidate → create new
      // source: node_modules/stripe/cjs/resources/Customers.d.ts → CustomerCreateParams
      return this.stripe.customers.create({
        email: userEmail,
        metadata: {
          tenant_id: tenantId,
          app_slug: APP_SLUG,
        },
      });
    }

    // Step 4/5: sort by created desc → pick most-recently-created
    const sorted = [...ours].sort((a, b) => b.created - a.created);
    const picked = sorted[0];

    if (sorted.length > 1) {
      const discarded = sorted.slice(1).map((c) => c.id);
      console.warn(
        `[PaywallBlueprint] Multiple Stripe Customers found for ${userEmail}; using ${picked.id}. Discarded:`,
        discarded.join(', '),
        discarded,
      );
    }

    // Re-key metadata.tenant_id to the current value
    // source: node_modules/stripe/cjs/resources/Customers.d.ts → CustomerUpdateParams
    return this.stripe.customers.update(picked.id, {
      metadata: {
        ...picked.metadata,
        tenant_id: tenantId,
        app_slug: APP_SLUG,
      },
    });
  }
}
