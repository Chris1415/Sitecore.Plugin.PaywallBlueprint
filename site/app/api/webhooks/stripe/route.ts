/**
 * POST /api/webhooks/stripe — T021
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
 *   'checkout.session.completed' → upsert tenants row (ADR-0012)
 *   All other types              → 200 silent fall-through (FR-5)
 *   (5 forward-compat handlers land in T041 / Tranche D)
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

  // Forward-compat types (T041 Tranche D handlers):
  //   'checkout.session.async_payment_succeeded' — same upsert as completed
  //   'checkout.session.async_payment_failed'    — log + no DB write
  //   'customer.subscription.updated'            — update plan/status/period_end
  //   'customer.subscription.deleted'            — set status=cancelled
  //   'invoice.payment_failed'                   — set status=past_due
  // For now, all fall through to the unknown-event handler below.

  // Unknown / unhandled event types — 200 silently (FR-5)
  // processed_events.insert already ran above so retries are idempotent
  console.log('[PaywallBlueprint] unhandled event:', event.type);
  return Response.json({ ok: true }, { status: 200 });
}
