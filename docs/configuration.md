# Configuration Reference

Full environment variable matrix for Paywall Blueprint. Copy `site/.env.example` to `site/.env.local` and fill in the values below.

---

## Core paywall variables

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://<id>.supabase.co`) | Required | — |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key — client-safe | Required | — |
| `SUPABASE_SECRET_KEY` | Supabase service-role key — **server-side and CLI only; never expose client-side** | Required for API routes and CLI | — |
| `NEXT_PUBLIC_PAYWALL_ENABLED` | `true` = enforce gate; `false` = pass-through + demo-mode banner | Optional | `true` |
| `NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID` | When set in development and the resolved `host.user.sub` matches, gate short-circuits to `allowed` without calling the store. Compile-time-guarded — dead-code-eliminated from production builds. Verify with `npm run test:dce`. | Optional (dev only) | unset |

---

## CLI seed variables

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `OPERATOR_TENANT_ID` | Your tenant's `marketplaceAppTenantId` — used by `npm run seed:state` | Required for CLI | — |
| `OPERATOR_USER_ID` | Your user's `host.user.sub` — used by CLI seed scripts | Optional | — |

---

## Stripe variables (PRD-001+)

| Variable | Purpose | Server-only? | Required? |
|----------|---------|--------------|-----------|
| `STRIPE_SECRET_KEY` | Stripe API auth (server-side) | YES | YES |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js init (client-readable) | NO | YES |
| `STRIPE_PRICE_ID` | Price ID for the checkout line item | YES (server convention) | YES |
| `STRIPE_WEBHOOK_SIGNING_SECRET` | Verify webhook signatures — copy from `stripe listen` output for local dev; use Dashboard secret for production | YES | YES |

---

## Notes

- Variables prefixed `NEXT_PUBLIC_` are embedded in the client bundle at build time. Do not put secrets in `NEXT_PUBLIC_` variables.
- `SUPABASE_SECRET_KEY` is the service-role key (labeled "secret" in newer Supabase dashboards). It is used by server-side API routes (`/api/entitlement`, `/api/webhooks/stripe`) and the seed CLI. It must not appear in client code.
- `STRIPE_WEBHOOK_SIGNING_SECRET` is environment-specific: the value from `stripe listen` is valid only for that local session; the production webhook endpoint generates a separate signing secret in the Stripe Dashboard.
- For signing-secret rotation procedures, see the [Stripe integration guide](integrations/stripe.md#signing-secret-rotation).
