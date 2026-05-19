# Operations and Production Hardening

Read this before shipping a fork of Paywall Blueprint to production. The blueprint is an OSS showcase; its defaults are chosen for legibility, not production safety. This document captures what you must change.

---

## Client gate is UX, not security

`<PaywallGate>` is a client-side React component. A determined user can open DevTools, find the component in the React tree, and force the `children` to render regardless of the entitlement result. The gate is a UX guardrail, not a cryptographic lock.

**The real security is server-side per-feature enforcement.** Call `/api/entitlement` from your API route handlers to verify the tenant's active status on every request — so even if a user forces the client to render the gated UI, any server-side feature they try to use will reject the call. A `withEntitlement(handler)` higher-order wrapper is scoped to a future PRD.

Any adopter shipping real premium functionality MUST add server-side enforcement before going to production.

---

## Supabase RLS posture (ADR-0009)

The schema in `site/supabase/schema.sql` enables RLS on both tables with a permissive anon read policy on `tenants` (`USING (true)` — any authenticated client can read any tenant row). This is intentional for PRD-000 where the evaluator runs client-side and needs to read its own tenant row without JWT-claim propagation infrastructure.

**Production adopters MUST harden this before going live.** Replace the `USING (true)` policy with a tenant-scoped policy:

```sql
-- Example: restrict to the requesting tenant's own row via a JWT claim
DROP POLICY IF EXISTS "anon_read_tenants" ON tenants;
CREATE POLICY "tenant_read_own" ON tenants
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

The `processed_events` table has NO anon policy — only the service-role key (used by the webhook handler) can write to it. This is production-safe as shipped.

---

## `/api/entitlement` is unauthenticated in v1

The server reads tenant entitlement directly via the Supabase service-role key. There is no auth check on the GET endpoint. Adopters using this for production-sensitive tenant lists MUST add per-route authentication — for example, verify that `host.user.sub` from the Marketplace SDK context matches the requested `tenantId` before returning data.

---

## Theme toggle — env-gating for production (ADR-0016)

The blueprint ships with the theme toggle always visible in the topbar (showcase posture — no `NEXT_PUBLIC_SHOW_THEME_TOGGLE` env var). Production deployments where the host iframe pins the theme should env-gate the toggle per the portfolio standard:

1. In `site/components/bloks/top-bar.tsx`, conditionally render `<ThemeToggle>` based on `process.env.NEXT_PUBLIC_SHOW_THEME_TOGGLE !== 'false'`.
2. Set `NEXT_PUBLIC_SHOW_THEME_TOGGLE=false` in your hosting platform's env for deployments where the host portal controls the theme.

Alternatively, remove `<ThemeToggle>` entirely from the `rightSideItems[]` slot if your deployment has no use for theme switching.

---

## Known limitations of v1

### 1. Webhook event ordering is not reconciled

Out-of-order events are not buffered or sequenced. Each event upserts or updates the `tenants` row independently. In practice this is rare — Stripe delivers events in approximate creation order — but adopters with strict reconciliation needs should add an `event.created` timestamp check and sequence buffering on top of the existing `processed_events` idempotency table.

### 2. `STRIPE_PRICE_ID` is not validated at boot

A typo in the Price ID causes the first checkout attempt to fail at runtime with a translated `resource_missing` error. Adopters who want fail-fast startup can add a probe:

```typescript
// In a server startup hook (e.g. instrumentation.ts):
await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);
```

### 3. `charge.refunded` is not handled — returns 200 silently

The webhook handler fall-through acknowledges the event but takes no action on refunds. Adopters who want refund-driven downgrade can add a case branch in `site/app/api/webhooks/stripe/route.ts`:

```typescript
if (event.type === 'charge.refunded') {
  const charge = event.data.object as Stripe.Charge;
  await supabase
    .from('tenants')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', charge.customer);
  return Response.json({ ok: true }, { status: 200 });
}
```

### 4. Dialog cancel stays enabled mid-flight (by design)

Closing the dialog stops the in-iframe polling loop but does NOT close the Stripe Checkout tab that was opened in a new browser tab. If the user completes payment in that still-open tab, the next time `PaywallGate` evaluates (on page reload or re-open of the dialog) it will reflect the updated entitlement. This is intentional per FR-8.

### 5. Premium bento cards use fake data (ADR-0018)

The 6 premium bento cards (Activity chart, Content health, Recent edits, Engagement metrics, AI insights, Engagement score) use hardcoded/deterministic data. No fetches occur at any state. Adopters who add real premium data fetches inherit the blueprint's render-then-style posture by default — real data in the DOM is visible at locked state.

**Adopters who add real premium data MUST:**
- Route premium data fetches through the existing `/api/entitlement` check before fetching upstream sources.
- Server-render premium cards with empty/null data when entitlement check returns `tenant_no_subscription`; populate only when `allowed`.
- Alternatively, wrap premium data handlers in a `withEntitlement(handler)` HOF (future PRD candidate).

### 6. Cross-app Stripe accounts require `APP_SLUG` change

See [Stripe integration guide](integrations/stripe.md#app_slug-invariant--required-if-you-fork).
