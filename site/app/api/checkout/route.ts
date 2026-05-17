/**
 * POST /api/checkout — T015
 *
 * Creates a Stripe Checkout Session for the given tenant + user.
 * Returns { url: string } on success for the dialog to open via window.open().
 *
 * Error handling:
 *   - 400 if tenantId or userEmail is missing/empty
 *   - 503/429 for Stripe errors via translateStripeError (T010 / FR-2)
 *
 * Orphan recovery (ADR-0015), automatic_tax (NFR-9), and idempotency key
 * (tenantId) are all handled inside StripeProvider.generateCheckoutUrl.
 *
 * Env vars consumed (server-only; NFR-6):
 *   STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SIGNING_SECRET
 *   NEXT_PUBLIC_PAYWALL_RETURN_ORIGIN (optional; falls back to request origin)
 */

import { StripeProvider } from '@/src/lib/paywall/providers/StripeProvider';
import { translateStripeError } from '@/src/lib/paywall/stripe-errors';

export async function POST(request: Request): Promise<Response> {
  let body: { tenantId?: string; userEmail?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tenantId, userEmail } = body;

  // Validate required fields (T016b)
  if (!tenantId || !userEmail) {
    return Response.json(
      { error: 'tenantId and userEmail required' },
      { status: 400 },
    );
  }

  // Build returnUrl — NEXT_PUBLIC_PAYWALL_RETURN_ORIGIN takes precedence (ADR-0014)
  const origin =
    process.env.NEXT_PUBLIC_PAYWALL_RETURN_ORIGIN ??
    new URL(request.url).origin;
  const returnUrl = `${origin}/paywall-return`;

  // Instantiate provider from server-only env vars
  const provider = new StripeProvider(
    process.env.STRIPE_SECRET_KEY!,
    process.env.STRIPE_PRICE_ID!,
    process.env.STRIPE_WEBHOOK_SIGNING_SECRET ?? '',
  );

  // Call Stripe — translate errors to user-friendly messages (FR-2)
  try {
    const url = await provider.generateCheckoutUrl({ tenantId, userEmail, returnUrl });
    return Response.json({ url }, { status: 200 });
  } catch (err) {
    const { message, status } = translateStripeError(err);
    return Response.json({ error: message }, { status });
  }
}
