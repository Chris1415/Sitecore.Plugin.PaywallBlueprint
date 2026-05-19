# Stripe Integration Guide

Full setup guide for connecting your Stripe account to Paywall Blueprint. Covers account setup, product/price configuration, API keys, local webhook listener, production webhook registration, Stripe Tax, and idempotency-key versioning.

---

## 1. Create or pick a Stripe account

Sign up for free at [stripe.com](https://stripe.com). For a paid Marketplace app you will eventually need to evaluate Stripe Connect or Stripe Managed Payments (public preview Feb 2026, same 5% + 50¢ MoR fees) — those are out of scope for this blueprint.

## 2. Switch to test mode

Toggle "Test mode" in the upper-right corner of the Stripe Dashboard. Test mode is free, isolated from live money, and is what the blueprint targets by default.

## 3. Create the Product + Price

Two options:

- **Reuse the blueprint defaults** (only useful if you are running the operator's Stripe account — not portable): Product `prod_UWKcVQmJH2MiSa`, Price `price_1TXHyIAHnDmxitZjwxHhKe8y` (one-time €0.99 EUR).
- **Create your own:** Dashboard → Catalog → Products → "Add product" → name your product → Price section → choose "One-time" → set your amount. Save. Copy the Price ID (starts with `price_`).

## 4. Copy your API keys

Dashboard → Developers → API keys.

| Key | Target env var | Notes |
|-----|----------------|-------|
| Publishable key (`pk_test_…`) | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-readable |
| Secret key (reveal once) | `STRIPE_SECRET_KEY` | **Server-only — never expose client-side** |

Copy the Price ID to `STRIPE_PRICE_ID` in `site/.env.local`.

## 5. Local webhook listener (development)

Install the Stripe CLI per [docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli), then:

```bash
stripe login
stripe listen --forward-to https://localhost:3000/api/webhooks/stripe --skip-verify
```

> **Important:** the dev server runs `next dev --experimental-https` (mkcert). The `--forward-to` URL must use `https://` and `--skip-verify` is required because mkcert is self-signed. Stripe CLI defaults to plain `http://` if no scheme is given, which silently fails — the trigger output reports success but webhooks never arrive.

The CLI prints a `whsec_*` signing secret on startup. Copy that value into `STRIPE_WEBHOOK_SIGNING_SECRET` in `site/.env.local` and restart the dev server. **Each `stripe listen` session mints a fresh signing secret** — copy it again every time you restart the listener.

## 6. Production webhook endpoint

Stripe Dashboard → Developers → Webhooks → Add endpoint.

- URL: `https://<your-production-domain>/api/webhooks/stripe`
- Select all 6 event types: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

Copy the production signing secret to your hosting platform's environment variables (Vercel → Project Settings → Environment Variables). **Do NOT put it in `.env.local`** — that file is local-only and gitignored.

> **CSP note:** `next.config.mjs` ships with `frame-ancestors` including `https://app.sitecorecloud.io`. If you add a custom Vercel domain or serve from another Cloud Portal environment, add those origins to the `frame-ancestors` list.

---

## Environment variables

| Variable | Purpose | Server-only? | Required? |
|----------|---------|--------------|-----------|
| `STRIPE_SECRET_KEY` | Stripe API auth (server-side) | YES | YES |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js init (client-readable) | NO | YES |
| `STRIPE_PRICE_ID` | Price ID for the checkout | YES (server convention) | YES |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | Verify webhook signatures | YES | YES |

---

## Test card numbers

Use these in Stripe Checkout test mode (any future MM/YY, any 3-digit CVC, any postal code):

| Card number | Outcome |
|-------------|---------|
| `4242 4242 4242 4242` | Generic success |
| `4000 0000 0000 9995` | Insufficient funds (card declined) |
| `4000 0025 0000 3155` | 3D Secure authentication required |

---

## Optional: Stripe Tax

The blueprint ships with `automatic_tax: { enabled: true }` in `StripeProvider.ts`. Stripe Tax is an opt-in Dashboard feature:

1. Dashboard → Settings → Tax → Activate.
2. The Checkout Session params already include `customer_update: { address: 'auto', name: 'auto' }`. This captures the customer's billing address during Checkout and saves it to the Customer record. **Stripe requires this when `automatic_tax: true` is set against an existing Customer with no address** — without it you will get `customer_tax_location_invalid`.

To disable Stripe Tax: change `automatic_tax: { enabled: true }` to `{ enabled: false }` in `site/src/lib/paywall/providers/StripeProvider.ts` and remove the `customer_update` line. Then bump `CHECKOUT_PARAMS_VERSION` (see below).

---

## Idempotency key versioning

`StripeProvider.generateCheckoutUrl` uses `${tenantId}:${CHECKOUT_PARAMS_VERSION}` as the Stripe idempotency key. Whenever you change the Checkout Session params shape — add or remove a field, flip `automatic_tax`, swap the price, add `customer_update`, etc. — **bump `CHECKOUT_PARAMS_VERSION`** in `site/src/lib/paywall/providers/StripeProvider.ts`.

Stripe caches the first request's params against the idempotency key and rejects subsequent requests with the same key but different params:

> "Keys for idempotent requests can only be used with the same parameters they were first used with."

Bumping the version constant produces fresh keys for every tenant. The JSDoc comment above `CHECKOUT_PARAMS_VERSION` carries a change history (v1 → v2 is already documented there).

---

## Signing-secret rotation

When rotating the production signing secret (Stripe Dashboard → Webhooks → endpoint → Signing secret → Roll):

1. Copy the new `whsec_*` value.
2. Update the environment variable on your hosting platform.
3. Redeploy.
4. Stripe retains the old secret briefly during the transition window — no webhook downtime.

For local development, restart `stripe listen` (each session mints a fresh secret) and update `.env.local`.

---

## `APP_SLUG` invariant — required if you fork

`StripeProvider` uses `const APP_SLUG = 'paywall-blueprint'` (ADR-0015) to scope the Stripe Customer orphan-recovery search to this app. Adopters who fork the blueprint and host multiple Marketplace apps under one Stripe account **MUST change `APP_SLUG`** to a value unique to their app (e.g., `'redirect-manager'`). Without this, orphan recovery across apps will cross-contaminate Customer lookups.

The constant is at the top of `site/src/lib/paywall/providers/StripeProvider.ts`.
