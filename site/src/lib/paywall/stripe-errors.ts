/**
 * Stripe error-translation table — T010 (FR-2)
 *
 * Maps Stripe error codes to user-friendly messages + HTTP status codes.
 * Server-only by convention; no 'use client' directive.
 *
 * Reused by:
 *   - /api/checkout route (T015)
 *   - /api/webhooks/stripe route (T021, future)
 *
 * source: https://stripe.com/docs/error-codes
 * Post-T006: node_modules/stripe/cjs/Error.d.ts → StripeError
 */

// Shape of a Stripe error (from Stripe SDK or plain object with code+message)
interface StripeErrorLike {
  code?: string;
  message?: string;
  type?: string;
}

function isStripeErrorLike(err: unknown): err is StripeErrorLike {
  return typeof err === 'object' && err !== null;
}

/**
 * Translate a Stripe error (or any thrown value) to a user-friendly message
 * and an appropriate HTTP status code.
 *
 * Handles:
 *   - tax_settings_not_set (+ any tax_* family)  → 503
 *   - resource_missing (Price ID not found)        → 503
 *   - rate_limit                                   → 429
 *   - api_connection_error / api_error             → 503
 *   - all others                                   → 503 + console.error
 */
export function translateStripeError(err: unknown): { message: string; status: number } {
  if (isStripeErrorLike(err)) {
    const code = err.code ?? '';

    // Tax configuration errors — operator must enable Stripe Tax or set automatic_tax: { enabled: false }
    // User-facing message per FR-2 table (§ 10 T016 fixture anchor)
    if (code === 'tax_settings_not_set' || code.startsWith('tax_')) {
      return {
        message: 'Payment is being set up \u2014 please contact your administrator.',
        status: 503,
      };
    }

    // Price ID not found — check STRIPE_PRICE_ID in .env.local
    if (code === 'resource_missing') {
      return {
        message:
          'The configured Stripe Price was not found. Check `STRIPE_PRICE_ID` in `.env.local`.',
        status: 503,
      };
    }

    // Rate limiting — transient; caller should retry
    // User-facing message per FR-2 table (§ 10 T016 fixture anchor)
    if (code === 'rate_limit') {
      return {
        message: 'Payment service is busy \u2014 please try again in a moment.',
        status: 429,
      };
    }

    // API connectivity or server errors — transient
    if (code === 'api_connection_error' || code === 'api_error') {
      return {
        message: 'Stripe could not be reached. Retry in a moment.',
        status: 503,
      };
    }
  }

  // Unknown / unclassified error — log full error for operator diagnostics
  console.error('[PaywallBlueprint] unhandled Stripe error:', err);
  return {
    message: 'Payment service encountered an unexpected error. Retry in a moment.',
    status: 503,
  };
}
