# Paywall Blueprint

The first publicly available worked example of monetizing a Sitecore Marketplace App.

This repo shows, step by step, how to put a freemium paywall inside a Sitecore Cloud Portal
Marketplace App — a `<PaywallGate>` React component that evaluates tenant entitlement, four
ready-to-ship UX state components, a swappable `EntitlementStore` adapter backed by Supabase,
and a `PaymentProvider` interface stub ready for your first Stripe integration. Fork it, swap
the content and the adapters, ship a paywalled Marketplace app in hours.

**Who it is for:** Teams building or planning a paid Marketplace App on the Sitecore Cloud
Portal who want a real, documented reference — not a toy demo.

---

## Screenshots

The clickdummy HTML files below are the canonical visual references for each UX state. The
operator will replace these with Cloud Portal screenshots before the repo is flipped public.

| State | Reference |
|-------|-----------|
| Allowed (tenant has an active plan) | [`pocs/poc-v1-prd000/state-allowed.html`](pocs/poc-v1-prd000/state-allowed.html) |
| No subscription | [`pocs/poc-v1-prd000/state-no-subscription.html`](pocs/poc-v1-prd000/state-no-subscription.html) |
| All seats in use | [`pocs/poc-v1-prd000/state-seats-full.html`](pocs/poc-v1-prd000/state-seats-full.html) |
| User unassigned | [`pocs/poc-v1-prd000/state-unassigned.html`](pocs/poc-v1-prd000/state-unassigned.html) |
| Demo mode (paywall disabled) | [`pocs/poc-v1-prd000/state-demo-mode.html`](pocs/poc-v1-prd000/state-demo-mode.html) |
| Error fallback | [`pocs/poc-v1-prd000/state-error.html`](pocs/poc-v1-prd000/state-error.html) |

> Operator note: capture screenshots from the running app (`npm run dev` inside the real
> Cloud Portal iframe) and save them to `docs/screenshots/`. Then replace the table above
> with `![Allowed state](docs/screenshots/state-allowed.png)` etc.

---

## What is inside

The repo is a single Next.js (App Router + TypeScript) application structured as a Sitecore
Marketplace custom app on the `xmc:fullscreen` extension point. There are four logical parts:

### 1. `<PaywallGate>` component

`site/src/lib/paywall/PaywallGate.tsx`

A React client component that orchestrates entitlement evaluation in six steps (per FR-1):

1. **Env-flag check** — when `NEXT_PUBLIC_PAYWALL_ENABLED=false`, renders children verbatim
   and shows the demo-mode banner. No entitlement call is made.
2. **Context-readiness guard** — waits for the Marketplace SDK's `useAppContext()` to resolve;
   shows a skeleton in the meantime.
3. **Context validation** — throws (caught by the error boundary) if `marketplaceAppTenantId`
   is missing.
4. **Dev override** — compile-time-guarded short-circuit for local development
   (`NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID`). Dead-code-eliminated from production builds.
5. **Entitlement fetch** — calls `EntitlementStore.getEntitlement(tenantId, userId)` and
   shows a skeleton while the promise is pending. Re-throws on rejection.
6. **State render** — switches on `EntitlementResult.status` and renders the matching state
   component.

### 2. `EntitlementStore` adapter — Supabase v1

`site/src/lib/paywall/stores/SupabaseStore.ts`

Implements the `EntitlementStore` interface (production runtime) and the `EntitlementSeed`
interface (dev / CLI seeding) against a two-table Supabase Postgres schema (`tenants` +
`processed_events`). See [Two abstraction boundaries](#two-abstraction-boundaries) for how
to swap it.

PRD-000's evaluator is **tenant-only** (ADR-0011): `getEntitlement` consults the `tenants`
table only. The `userId` parameter is accepted for interface stability but is not consulted
in this PRD. Per-user seat enforcement lands in PRD-002.

### 3. `PaymentProvider` interface — Stripe v1 placeholder

`site/src/lib/paywall/types.ts`

A type-only placeholder interface in PRD-000. The four methods (`generateCheckoutUrl`,
`generatePortalUrl`, `verifyWebhookSignature`, `parseWebhookPayload`) define the contract
that PRD-001 implements against Stripe Billing + Entitlements API + Customer Portal.

No concrete implementation ships in PRD-000 — see [Provider swap-point](#provider-swap-point-post-prd-001).

### 4. Reference Marketplace app

`site/app/page.tsx`

A single-page freemium layout on the SitecoreAI Full Screen extension point (`xmc:fullscreen`):

- **Free section** — always rendered; a placeholder "Inventory at a glance" card with a
  mock report button.
- **Separator.**
- **Gated section** — wrapped in `<ErrorBoundary><GatedSection></ErrorBoundary>`. Inside,
  `<PaywallGate>` resolves to one of four state components. The free section above the
  boundary keeps rendering even when the gated subtree throws.

---

## Two abstraction boundaries

This is the core design pattern. Two interfaces in `site/src/lib/paywall/types.ts` are the
swap-points:

### `EntitlementStore` (production runtime, required for adopters)

```typescript
export interface EntitlementStore {
  getEntitlement(tenantId: string, userId: string): Promise<EntitlementResult>;
}
```

`SupabaseStore` is the v1 implementation. To swap: implement `EntitlementStore` against your
own backend (REST API, Redis, another Postgres, a headless CMS — anything). Pass an instance
to `<PaywallGate store={yourStore}>`. The gate does not care what sits behind the interface.

**ADR-0002** (binding): `EntitlementStore` (production) and `EntitlementSeed` (dev CLI) are
intentionally split. Do not add seed or write methods to `EntitlementStore`.

### `PaymentProvider` (payment adapter, type-level in PRD-000)

```typescript
export interface PaymentProvider {
  generateCheckoutUrl(args: { tenantId: string; userEmail: string; priceId?: string; returnUrl?: string }): Promise<string>;
  generatePortalUrl(args: { tenantId: string; returnUrl: string }): Promise<string>;
  verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean>;
  parseWebhookPayload(rawBody: string): Promise<{ providerEventId: string; tenantId: string; kind: 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_failed' | 'payment_succeeded'; payload: unknown }>;
}
```

PRD-001 implements this against Stripe Billing + Entitlements API + Customer Portal. Until
then it is a type-only placeholder — nothing in PRD-000 instantiates it.

**ADR-0003** (binding): PRD-000 ships the contract; PRD-001 ships the first concrete implementation.

---

## Tenant-only evaluator (ADR-0011) — what ships vs what is deferred

PRD-000's `SupabaseStore.getEntitlement` only looks at the `tenants` table. It returns:

- `allowed` — tenant row exists and `status === 'active'`.
- `tenant_no_subscription` — no row, or `status !== 'active'`.

**The two seat-related UX states (`SeatsFullState`, `UserUnassignedState`) ship in PRD-000
as design-reference components.** They are fully built and tested, but the PRD-000 evaluator
never routes to them. You can render them directly via `npm run seed:state -- seats-full` or
`npm run seed:state -- unassigned` (they bypass the evaluator and render the component
directly via a `?previewState=` query param).

Per-user seat enforcement — the evaluator branch that routes to those states — lands in
PRD-002, which adds the `seats` table and the seat-count logic.

---

## Quickstart

### Prerequisites

- Node.js 20+
- A free Supabase account at [supabase.com](https://supabase.com)
- Access to Sitecore Cloud Portal with App Studio permissions

### Steps

**1. Fork or clone this repo.**

```bash
git clone https://github.com/Chris1415/Sitecore.Plugin.PaywallBlueprint.git
cd Sitecore.Plugin.PaywallBlueprint
```

**2. Install dependencies.**

```bash
cd site && npm install
```

**3. Create a free Supabase project.**

Go to [supabase.com](https://supabase.com) → New project. From Project Settings → API,
capture:

- Project URL (looks like `https://<id>.supabase.co`)
- `anon` / public key (labeled "publishable" in newer dashboards)
- `service_role` / secret key (labeled "secret" in newer dashboards — keep this server-side only)

**4. Run the database schema.**

In Supabase → SQL Editor, open a new query. Paste the contents of
`site/supabase/schema.sql` and click Run. This creates:

- `tenants` table — one row per paying tenant.
- `processed_events` table — empty in PRD-000; provisioned for PRD-001 Stripe webhook
  idempotency.

Verify: `SELECT COUNT(*) FROM tenants;` returns 0 (empty, as expected).

**5. Configure your environment.**

```bash
cp site/.env.example site/.env.local
```

Open `site/.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
SUPABASE_SECRET_KEY=<service-role/secret key>

# Your tenant ID from the Marketplace SDK (see step 6)
OPERATOR_TENANT_ID=<marketplaceAppTenantId from the Cloud Portal iframe URL>
# Your user sub from the host identity token
OPERATOR_USER_ID=<host.user.sub from the application.context probe>
```

**6. Register a custom app in Sitecore Cloud Portal → App Studio.**

- App name: `Paywall Blueprint (Test)` (or any name)
- App URL: `http://localhost:3000`
- Extension point: `xmc:fullscreen` (SitecoreAI Full Screen)
- Route URL: `/`
- Authorization type: Portal-brokered
- App type: Custom

Install the app on your test tenant. The `marketplaceAppTenantId` appears in the iframe URL
query string once the app is installed — capture it for `OPERATOR_TENANT_ID` above.

**7. Start the dev server.**

```bash
npm run dev
```

Opens [http://localhost:3000](http://localhost:3000). The app also renders inside the Cloud
Portal iframe once installed.

**8. Seed the `allowed` state and verify.**

```bash
npm run seed:state -- allowed --tenant <your-marketplaceAppTenantId>
```

Refresh the iframe in Cloud Portal. You should see the post-gate welcome: "Welcome, [your
first name]. Your tenant [your tenant name] has full access."

**9. Try the denial state.**

```bash
npm run seed:state -- no-sub --tenant <your-marketplaceAppTenantId>
```

Refresh. You should see "Start your subscription" with a "View plans" CTA.

**10. Try the design-reference states (bypass evaluator).**

```bash
# Does not seed anything — renders component directly via ?previewState= query param
npm run seed:state -- seats-full
npm run seed:state -- unassigned
```

These open a URL in your browser with `?previewState=seats-full` or `?previewState=unassigned`.
The evaluator is not called. These states are visual references for PRD-002.

---

## Configuration

All environment variables with their purpose, required/optional status, and default value:

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Required | — |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (client-safe) | Required | — |
| `SUPABASE_SECRET_KEY` | Supabase service-role key — **server-side / CLI only; never expose client-side** | Required for CLI | — |
| `NEXT_PUBLIC_PAYWALL_ENABLED` | `true` = enforce gate; `false` = pass-through + demo-mode banner | Optional | `true` |
| `NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID` | When set in development and the resolved `host.user.sub` matches, gate short-circuits to `allowed` without calling the store. Compile-time-guarded — **dead-code-eliminated from production builds.** Verify with `npm run test:dce`. | Optional (dev only) | unset |
| `OPERATOR_TENANT_ID` | Your tenant's `marketplaceAppTenantId` — used by `seed-state.ts` CLI | Required for CLI | — |
| `OPERATOR_USER_ID` | Your user's `host.user.sub` — used by CLI seed scripts | Optional | — |

---

## Local development

### Paywall disabled mode

Set `NEXT_PUBLIC_PAYWALL_ENABLED=false` in `.env.local`. Restart the dev server. The gate
renders children verbatim and a persistent banner appears at the top of the page:

> Paywall disabled — demo mode

No entitlement store call is made. This is useful when you want to see and develop your
premium content without setting up Supabase.

### Dev override (skip the store for your own user)

Set `NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID` to your `host.user.sub` (the Auth0 subject
from the Marketplace SDK context). When the resolved user sub matches this value AND
`NODE_ENV !== 'production'`, the gate short-circuits to `allowed` without calling Supabase.

Useful for developing premium content when Supabase is not reachable or not yet configured.

**Important:** this env var begins with `NEXT_PUBLIC_` because `PaywallGate` is a client
component. The `NODE_ENV !== 'production'` guard ensures the entire branch is dead-code-
eliminated by the Next.js / Webpack bundler from production builds. Verified by
`npm run test:dce` (post-build grep of `.next/` for the var name).

### In-page dev state picker

When `NEXT_PUBLIC_PAYWALL_ENABLED` is not `false`, you can force a state by appending a
query param:

```
http://localhost:3000/?previewState=allowed
http://localhost:3000/?previewState=no-sub
http://localhost:3000/?previewState=seats-full
http://localhost:3000/?previewState=unassigned
```

These bypass the entitlement store and directly render the named state component. Dev only —
a console warning fires if `previewState` is present in a production environment.

### Running tests

```bash
cd site

# Unit + component tests (Vitest)
npm run test

# Lint
npm run lint

# TypeScript type-check
npm run typecheck   # or: npx tsc --noEmit

# Production build
npm run build

# Dead-code elimination check — grep .next/ for dev-override var
npm run test:dce
```

---

## Adoption guide — primary path: fork the repo

This is the recommended path for most adopters.

**Step 1: Fork the repo on GitHub.**

**Step 2: Replace the placeholder content.**

- `site/components/free-section.tsx` — your always-visible free feature.
- The children of `<PaywallGate>` in `site/components/gated-section.tsx` (currently
  `<AllowedState />`) — your premium feature. `<AllowedState />` shows the post-gate welcome;
  replace it with your real gated UI once you confirm the gate wires up correctly.

**Step 3: Replace the placeholder CTA URLs.**

In `site/src/lib/paywall/states/NoSubscriptionState.tsx` and `SeatsFullState.tsx`, replace
`https://example.com/buy` and `https://example.com/upgrade` with your real checkout and
upgrade URLs. In PRD-001 these will be generated dynamically by the Stripe adapter via
`PaymentProvider.generateCheckoutUrl(...)`.

**Step 4 (optional): swap the `EntitlementStore` adapter.**

If you don't want to use Supabase, implement the `EntitlementStore` interface from
`site/src/lib/paywall/types.ts` against your own backend:

```typescript
import type { EntitlementStore, EntitlementResult } from './types';

export class MyBackendStore implements EntitlementStore {
  async getEntitlement(tenantId: string, _userId: string): Promise<EntitlementResult> {
    const res = await fetch(`/api/entitlement?tenantId=${tenantId}`);
    const data = await res.json();
    return data.active ? { status: 'allowed' } : { status: 'tenant_no_subscription' };
  }
}
```

Then pass it to the gate:

```tsx
import { MyBackendStore } from '@/lib/paywall/stores/MyBackendStore';
const myStore = new MyBackendStore();

<PaywallGate store={myStore}>
  <AllowedState />
</PaywallGate>
```

---

## Adoption guide — secondary path: copy `src/lib/paywall/` into an existing app

If you already have a Next.js Marketplace app and do not want to fork this repo, copy the
portable library into your app:

1. Copy `site/src/lib/paywall/` into your app's `src/lib/paywall/` (or wherever your shared
   library lives).
2. Copy `site/components/providers/marketplace.tsx` — or use your existing
   `MarketplaceProvider` if you already have one. The gate imports `useAppContext` and
   `useHostUser` from this provider.
3. Copy `site/components/error-boundary.tsx` and wrap your gated subtree with it in your
   layout. Keep your free section OUTSIDE the boundary.
4. Install required dependencies if not already present:
   ```bash
   npm install @supabase/supabase-js
   npm install @sitecore-marketplace-sdk/client
   ```
5. Run `site/supabase/schema.sql` in your Supabase project.
6. Wire the env vars from the [Configuration](#configuration) table above into your `.env.local`.

This path is more work than forking but is practical if refactoring your repo structure is
not feasible.

---

## Provider swap-point (post-PRD-001)

The `PaymentProvider` interface is in `site/src/lib/paywall/types.ts`. PRD-001 ships the
first concrete implementation against Stripe Billing + Entitlements API + Customer Portal.

### Stripe wiring shape (PRD-001 preview)

To implement `PaymentProvider` yourself before PRD-001 ships, here is the Stripe wiring shape:

```typescript
import Stripe from 'stripe';

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;
  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' });
  }

  async generateCheckoutUrl({ tenantId, userEmail, priceId, returnUrl }: {
    tenantId: string; userEmail: string; priceId?: string; returnUrl?: string;
  }): Promise<string> {
    // Look up or create a Stripe Customer for this tenantId
    const customers = await this.stripe.customers.list({ email: userEmail, limit: 1 });
    const customer = customers.data[0] ?? await this.stripe.customers.create({
      email: userEmail,
      metadata: { tenantId },
    });

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [{ price: priceId ?? process.env.STRIPE_DEFAULT_PRICE_ID!, quantity: 1 }],
      success_url: returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/?checkout=success`,
      cancel_url: returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/`,
    });

    return session.url!;
  }

  async generatePortalUrl({ tenantId, returnUrl }: { tenantId: string; returnUrl: string }): Promise<string> {
    // Retrieve stripe_customer_id from your tenants table
    const { stripeCustomerId } = await getStripeCustomerIdFromTenant(tenantId);
    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
      return true;
    } catch {
      return false;
    }
  }

  async parseWebhookPayload(rawBody: string): Promise<{ providerEventId: string; tenantId: string; kind: 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_failed' | 'payment_succeeded'; payload: unknown }> {
    // Parse the Stripe event and map to the PaymentProvider contract
    const event = JSON.parse(rawBody) as Stripe.Event;
    const kindMap: Record<string, 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_failed' | 'payment_succeeded'> = {
      'customer.subscription.created': 'subscription_created',
      'customer.subscription.updated': 'subscription_updated',
      'customer.subscription.deleted': 'subscription_cancelled',
      'invoice.payment_failed': 'payment_failed',
      'invoice.payment_succeeded': 'payment_succeeded',
    };
    const sub = event.data.object as Stripe.Subscription;
    return {
      providerEventId: event.id,
      tenantId: sub.metadata?.tenantId ?? '',
      kind: kindMap[event.type] ?? 'subscription_updated',
      payload: event.data.object,
    };
  }
}
```

Pass it to `<PaywallGate>` like any other store (or wire it into your webhook handler).
PRD-001 will ship this adapter properly with tests, error handling, and the webhook route.

---

## Client gate is UX, not security

**Read this before shipping to production.**

`<PaywallGate>` is a client-side React component. A determined user can open DevTools, find
the component in the React tree, and force the `children` to render regardless of the
entitlement result. The gate is a UX guardrail, not a cryptographic lock.

**The real security is server-side per-feature enforcement.** PRD-001 will ship a
`withEntitlement(handler)` higher-order function for API routes that verifies the tenant's
active status on every request — so even if a user forces the client to render the gated UI,
any server-side feature they try to use will reject the call.

PRD-000 has no premium feature behind the gate (the gated content is intentional placeholder),
so this is documentation-only for now. But any adopter shipping real premium functionality
MUST add server-side enforcement before going to production.

---

## Supabase RLS posture (ADR-0009)

The schema in `site/supabase/schema.sql` enables RLS on both tables with a permissive anon
read policy on `tenants` (`USING (true)` — any authenticated client can read any tenant
row). This is intentional for PRD-000 where the evaluator runs client-side and needs to
read its own tenant row.

**Production adopters MUST harden this before going live.** Replace the `USING (true)`
policy with a tenant-scoped policy. For example, if your Supabase project uses auth:

```sql
-- Example: restrict to the requesting tenant's own row via a JWT claim
DROP POLICY IF EXISTS "anon_read_tenants" ON tenants;
CREATE POLICY "tenant_read_own" ON tenants
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

The `processed_events` table has NO anon policy — only the service-role key (used by the
webhook handler in PRD-001) can write to it.

---

## Roadmap

PRD-000 is the foundation. Each subsequent PRD adds one layer and ships with a real-tenant
smoke gate before the next one starts:

| PRD | What ships | Gate |
|-----|-----------|------|
| **PRD-000 (this)** | `<PaywallGate>` + 4 UX states + Supabase adapter + tenant-only evaluator + OSS launch surface | Cold-reader + repo public |
| **PRD-001** | Stripe Checkout + webhook handler + Customer Portal link + `withEntitlement(handler)` server HOF | Real Stripe test-mode checkout flow on real tenant |
| **PRD-002** | Per-user seat enforcement + `seats` table + admin seat-assignment UI | Seat-grant / revoke flow on real tenant |
| **PRD-003** | Stripe Customer Portal wraps for cancel / plan-change (one-call surface via PRD-001's adapter) | Cancel + plan-change flow on real tenant |

Post-PRD-003: public Marketplace listing submission and second-provider adapters (Paddle,
Polar.sh, Lemon Squeezy).

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Built by

[hahn-solo](https://hahn-solo.net). Powered by
[Sitecore Marketplace SDK](https://doc.sitecore.com/marketplace),
[Blok](https://blok.sitecore.com),
Supabase,
and Stripe (PRD-001+).
