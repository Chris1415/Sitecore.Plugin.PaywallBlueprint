# ADR-0015: Stripe Customer orphan recovery via `metadata.tenant_id` lookup before create

## Status

Accepted

## Context

PRD-000 surfaced an open SDK question (Q1): is `application.context.marketplaceAppTenantId` durable across Cloud Portal app reinstalls? If it changes when an app is uninstalled and reinstalled on the same tenant, the `tenant → stripe_customer_id` mapping orphans on reinstall — the existing Stripe Customer is "lost" and a second checkout creates a duplicate, leading to billing confusion and lost purchase history.

The operator chose not to probe (D4 — "accept the risk; build with the assumption; document in README + add a fallback that detects orphan customers and re-keys"). Three orphan-recovery strategies considered:

- **(a) Trust the tenantId is stable; do nothing.** Risk: if it's not, real users hit billing duplicates.
- **(b) Stripe Customer search via `customers.list({ email })` + metadata filter.** Cheap (~200-400ms added to checkout). Resolves orphans structurally.
- **(c) Defer recovery until first reported incident; ship without it.** Faster shipment; user-bug exposure.

Option (b) costs ~300ms per checkout in exchange for structural orphan immunity. The cost is well-bounded; the safety is meaningful.

## Decision

`/api/checkout` runs the following orphan-recovery flow before creating a new Stripe Customer:

```typescript
const APP_SLUG = 'paywall-blueprint'; // scope-tag — see "app_slug invariant" below

async function findOrCreateStripeCustomer({ tenantId, userEmail }): Promise<Customer> {
  // 1. Check our DB first (fast path — tenant_id already mapped)
  const { data: tenant } = await supabase
    .from('tenants').select('stripe_customer_id').eq('tenant_id', tenantId).maybeSingle();
  if (tenant?.stripe_customer_id) {
    return await stripe.customers.retrieve(tenant.stripe_customer_id);
  }

  // 2. Orphan-recovery: search Stripe for an existing Customer with this email
  //    that this app created (scoped by metadata.app_slug — don't clobber
  //    other apps the adopter runs from the same Stripe account).
  const existing = await stripe.customers.list({ email: userEmail, limit: 10 });
  const ours = existing.data
    .filter(c => c.metadata?.app_slug === APP_SLUG)
    .sort((a, b) => b.created - a.created); // most-recently-created first

  if (ours.length === 0) {
    // 3a. No existing Customer; create new.
    return await stripe.customers.create({
      email: userEmail,
      metadata: { tenant_id: tenantId, app_slug: APP_SLUG }
    });
  }

  if (ours.length > 1) {
    // 3b. Multiple candidates — likely a prior race. Pick most-recently-created
    //     and log the discarded ones so adopter can review + clean up.
    console.warn(
      `[PaywallBlueprint] Multiple Stripe Customers found for ${userEmail}; using ${ours[0].id}. Discarded:`,
      ours.slice(1).map(c => c.id)
    );
  }

  // 3c. Single (or first-of-N) candidate — re-key metadata.tenant_id to current value.
  await stripe.customers.update(ours[0].id, {
    metadata: { ...ours[0].metadata, tenant_id: tenantId, app_slug: APP_SLUG }
  });
  return ours[0];
}
```

**Key invariants:**

- **`metadata.app_slug` is the scope-tag.** Every Customer this app creates gets `metadata.app_slug = 'paywall-blueprint'`. Orphan-recovery only considers Customers matching this slug. Adopters who fork the blueprint MUST change the slug constant to match their app (e.g., `metadata.app_slug = 'redirect-manager'`) so the orphan-recovery doesn't cross app boundaries when one Stripe account hosts multiple Marketplace apps.
- **`metadata.tenant_id` is the per-Customer reverse mapping.** Set on every create + update.
- **Email is the recovery key** — assumes the user re-installing has the same Auth0 identity.
- **Multi-candidate handling:** if 2+ Customers match (e.g., concurrent checkout race from earlier sessions), pick most-recently-created and log discarded candidates as a warning. Adopters can use the discarded IDs to clean up via Stripe Dashboard.
- **Stripe API:** `customers.list` is paginated; default page size of 10 is fine. If a single user has >10 historical Customer records for this app, edge-case handling in PRD-002+ (currently: the list returns the most-recently-active 10, which is the right set 99% of the time).

## Consequences

**Easier:**

- Reinstall scenario works structurally — purchase history preserved, no billing duplicates.
- Adopters don't need to probe tenantId durability themselves; the code handles both cases.
- Stripe Customer metadata becomes a primary lookup key — useful for support / reporting too.

**Harder:**

- ~300ms latency on every checkout (Stripe API call to list customers). Acceptable for a paid checkout flow.
- Edge case: a user with the same email logging in from a different Sitecore org will hit the recovery flow and have their orphaned Customer re-keyed. This is intentional (one Stripe Customer = one human; tenantId is the current binding). Adopters with stricter per-org isolation can swap to a stricter metadata filter.
- Test surface grows: the orphan-recovery branch needs unit tests for both "found" and "not found" Stripe responses.
- If Stripe's `customers.list` is rate-limited under load, checkouts may stall. Mitigation: Stripe's rate limits are generous (>100 reqs/sec); not a real concern at our scale.

## Date

2026-05-15
