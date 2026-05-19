# Adoption Guide

Two paths for adopting Paywall Blueprint in your own Sitecore Marketplace app.

---

## Primary path: fork the repo

Recommended for most adopters. You get the full project structure, all tests, all scripts, and a clean starting point.

**Step 1: Fork the repo on GitHub.**

**Step 2: Replace the placeholder content.**

- `site/components/free-section.tsx` — your always-visible free feature.
- The children of `<PaywallGate>` in `site/components/gated-section.tsx` — your premium feature. The existing `<AllowedState />` shows the post-gate welcome; replace it with your real gated UI once you confirm the gate wires up correctly.
- The 6 premium bento cards in `site/components/bento/` — replace the hardcoded fake data with real data fetches (see [Operations & production hardening](operations.md) before doing so).

**Step 3: Replace the placeholder CTA URLs.**

In `site/src/lib/paywall/states/NoSubscriptionState.tsx` and `SeatsFullState.tsx`, replace `https://example.com/buy` and `https://example.com/upgrade` with your real checkout and upgrade URLs. The `PaywallCheckoutDialog` already calls `/api/checkout` dynamically via `useEntitlement().triggerCheckout()` — the "View plans" CTA opens the dialog which handles the Stripe Checkout session creation end-to-end.

**Step 4 (optional): Swap the `EntitlementStore` adapter.**

If you don't want to use Supabase, implement the `EntitlementStore` interface from `site/src/lib/paywall/types.ts` against your own backend:

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

## Secondary path: copy `src/lib/paywall/` into an existing app

Use this if you already have a Next.js Marketplace app and do not want to fork the entire repo.

1. Copy `site/src/lib/paywall/` into your app's `src/lib/paywall/` (or wherever your shared library lives).
2. Copy `site/components/providers/marketplace.tsx` — or use your existing `MarketplaceProvider` if you already have one. The gate imports `useAppContext` and `useHostUser` from this provider.
3. Copy `site/components/error-boundary.tsx` and wrap your gated subtree with it in your layout. Keep your free section OUTSIDE the boundary.
4. Install required dependencies if not already present:
   ```bash
   npm install @supabase/supabase-js
   npm install @sitecore-marketplace-sdk/client
   ```
5. Run `site/supabase/schema.sql` in your Supabase project (paste into the SQL Editor → Run).
6. Wire the env vars from [Configuration](configuration.md) into your `.env.local`.

This path is more work than forking but is practical if restructuring your repo is not feasible.

---

## Swapping the `PaymentProvider`

The `PaymentProvider` interface is in `site/src/lib/paywall/types.ts`. PRD-001 ships the first concrete implementation — `StripeProvider` at `site/src/lib/paywall/providers/StripeProvider.ts`.

To implement a second payment provider (Paddle, Polar.sh, Lemon Squeezy), implement the four methods from `PaymentProvider` and swap the instance constructed in `site/app/api/checkout/route.ts` and `site/app/api/webhooks/stripe/route.ts`.

**Note on the interface:** `PaymentProvider.verifyWebhookSignature` returns `Promise<unknown>` — the concrete return type is provider-specific. The webhook route casts to the concrete type after calling this method. The interface and the second-provider convention will be reconciled in PRD-003.

---

## Production hardening after adoption

Before going to production with any real premium content, read [Operations & production hardening](operations.md). The most critical items are:

- Replace the Supabase RLS `USING (true)` policy with a tenant-scoped equivalent.
- Add server-side enforcement to any API route that returns real premium data.
- Change `APP_SLUG` in `StripeProvider.ts` if you run multiple apps under one Stripe account.
