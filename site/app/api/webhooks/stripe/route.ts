/**
 * POST /api/webhooks/stripe — T021 / T041
 *
 * Webhook handler for Stripe events.
 *
 * Non-negotiables (§ 4c-1):
 * 1. MUST read raw body via request.text() BEFORE any JSON parse — signature
 *    verification requires the byte-exact body.
 * 2. Bad signature → 400 (NOT 401); Stripe does not retry 4xx.
 * 3. Idempotency: INSERT processed_events(event_id); ON CONFLICT (23505) → 200 silent.
 * 4. Handler latency ≤ 5 seconds (NFR-3).
 *
 * Event dispatch:
 *   'checkout.session.completed'              → upsert tenants row (ADR-0012)
 *   'checkout.session.async_payment_succeeded'→ same upsert (delayed bank payment confirmation)
 *   'checkout.session.async_payment_failed'   → log warning, no DB write
 *   'customer.subscription.updated'           → update status/seats_total/period_end by stripe_customer_id
 *   'customer.subscription.deleted'           → set status=cancelled by stripe_customer_id
 *   'invoice.payment_failed'                  → set status=past_due by stripe_customer_id
 *   All other types                           → 200 silent fall-through (FR-5)
 */

import type Stripe from 'stripe';
import { StripeProvider } from '@/src/lib/paywall/providers/StripeProvider';
import { createServiceRoleClient } from '@/app/api/_lib/supabase-server';

export async function POST(request: Request): Promise<Response> {
  // CRITICAL: read raw body FIRST — signature verification requires byte-exact body
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';

  // Instantiate provider from server-only env vars
  const provider = new StripeProvider(
    process.env.STRIPE_SECRET_KEY!,
    process.env.STRIPE_PRICE_ID ?? '',
    process.env.STRIPE_WEBHOOK_SIGNING_SECRET ?? '',
  );

  // Verify webhook signature — throws on bad/missing signature
  let event: Stripe.Event;
  try {
    event = await provider.verifyWebhookSignature(rawBody, sig);
  } catch (err) {
    console.error('[PaywallBlueprint] webhook signature verification failed', err);
    return Response.json({ error: 'invalid signature' }, { status: 400 });
  }

  // Service-role Supabase client (bypasses RLS per ADR-0009)
  const supabase = createServiceRoleClient();

  // Idempotency: insert event_id; ON CONFLICT → 200 silent (§ 4c-1)
  const { error: insertErr } = await supabase
    .from('processed_events')
    .insert({ event_id: event.id });

  if (insertErr) {
    if (insertErr.code === '23505') {
      // Already processed — idempotent replay (US-4)
      return Response.json({ ok: true }, { status: 200 });
    }
    // Bubble up other DB errors — Stripe will retry (NFR-3: ≤5s total)
    throw insertErr;
  }

  // ---------------------------------------------------------------------------
  // Event dispatch
  // ---------------------------------------------------------------------------

  if (event.type === 'checkout.session.completed') {
    // ADR-0012: one-time payment → active, plan=premium, period_end=null
    // source: node_modules/stripe/cjs/resources/Checkout/Sessions.d.ts → Session (post-T006)
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.metadata?.tenant_id;

    if (!tenantId) {
      console.warn(
        '[PaywallBlueprint] checkout.session.completed without tenant_id metadata; ignoring',
      );
      return Response.json({ ok: true }, { status: 200 });
    }

    await supabase.from('tenants').upsert(
      {
        tenant_id: tenantId,
        stripe_customer_id: session.customer as string,
        status: 'active',
        plan: 'premium',
        period_end: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    );

    return Response.json({ ok: true }, { status: 200 });
  }

  // ---------------------------------------------------------------------------
  // Forward-compat handlers — T041 / Tranche D
  // ---------------------------------------------------------------------------

  if (event.type === 'checkout.session.async_payment_succeeded') {
    // Delayed bank payment confirmation — same outcome as checkout.session.completed
    // source: node_modules/stripe/cjs/resources/Checkout/Sessions.d.ts → Session (post-T006)
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.metadata?.tenant_id;

    if (!tenantId) {
      console.warn(
        '[PaywallBlueprint] async_payment_succeeded without tenant_id metadata; ignoring',
      );
      return Response.json({ ok: true }, { status: 200 });
    }

    await supabase.from('tenants').upsert(
      {
        tenant_id: tenantId,
        stripe_customer_id: session.customer as string,
        status: 'active',
        plan: 'premium',
        period_end: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    );

    return Response.json({ ok: true }, { status: 200 });
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    // Delayed bank payment failed — user will retry; no DB state change
    // source: node_modules/stripe/cjs/resources/Checkout/Sessions.d.ts → Session (post-T006)
    console.warn('[PaywallBlueprint] checkout.session.async_payment_failed; user will retry', {
      eventId: event.id,
    });
    return Response.json({ ok: true }, { status: 200 });
  }

  if (event.type === 'customer.subscription.updated') {
    // Update subscription status, seat count, and period_end by stripe_customer_id
    // source: node_modules/stripe/cjs/resources/Subscriptions.d.ts → Subscription (post-T006)
    // NOTE: current_period_end was removed from the Stripe.Subscription TypeScript type in
    // stripe@22.x but the Stripe API still sends it in webhook payloads.
    // Casting through unknown → Record to access the runtime field safely.
    const sub = event.data.object as Stripe.Subscription;
    const subRaw = event.data.object as unknown as Record<string, unknown>;
    const seats = sub.items?.data?.[0]?.quantity ?? null;
    const currentPeriodEnd =
      typeof subRaw['current_period_end'] === 'number' ? subRaw['current_period_end'] : null;

    await supabase
      .from('tenants')
      .update({
        status: mapStripeStatusToOurs(sub.status),
        seats_total: seats,
        period_end: currentPeriodEnd !== null
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', sub.customer as string);

    return Response.json({ ok: true }, { status: 200 });
  }

  if (event.type === 'customer.subscription.deleted') {
    // Subscription cancelled — set status=cancelled; leave period_end unchanged
    // source: node_modules/stripe/cjs/resources/Subscriptions.d.ts → Subscription (post-T006)
    const sub = event.data.object as Stripe.Subscription;

    await supabase
      .from('tenants')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', sub.customer as string);

    return Response.json({ ok: true }, { status: 200 });
  }

  if (event.type === 'invoice.payment_failed') {
    // Invoice payment failed — set status=past_due; user must update payment method
    // source: node_modules/stripe/cjs/resources/Invoices.d.ts → Invoice (post-T006)
    const invoice = event.data.object as Stripe.Invoice;

    await supabase
      .from('tenants')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', invoice.customer as string);

    return Response.json({ ok: true }, { status: 200 });
  }

  // Unknown / unhandled event types — 200 silently (FR-5)
  // processed_events.insert already ran above so retries are idempotent
  console.log('[PaywallBlueprint] unhandled event:', event.type);
  return Response.json({ ok: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a Stripe subscription status to the internal tenants.status value.
 * source: node_modules/stripe/cjs/resources/Subscriptions.d.ts → Subscription.Status (post-T006)
 */
function mapStripeStatusToOurs(stripeStatus: Stripe.Subscription.Status): string {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'past_due';
  // 'canceled', 'incomplete', 'incomplete_expired', 'paused' → cancelled
  return 'cancelled';
}
