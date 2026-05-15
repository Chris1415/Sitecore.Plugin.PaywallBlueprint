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
async function findOrCreateStripeCustomer({ tenantId, userEmail }): Promise<Customer> {
  // 1. Check our DB first (fast path — tenant_id already mapped)
  const { data: tenant } = await supabase
    .from('tenants').select('stripe_customer_id').eq('tenant_id', tenantId).maybeSingle();
  if (tenant?.stripe_customer_id) {
    return await stripe.customers.retrieve(tenant.stripe_customer_id);
  }

  // 2. Orphan-recovery: search Stripe for an existing Customer with this email
  //    that was previously created for ANY tenant_id (covers reinstall case).
  const existing = await stripe.customers.list({ email: userEmail, limit: 10 });
  const previouslyOurs = existing.data.find(c => c.metadata?.tenant_id);

  if (previouslyOurs) {
    // Update metadata to current tenant_id (preserves billing history)
    await stripe.customers.update(previouslyOurs.id, {
      metadata: { ...previouslyOurs.metadata, tenant_id: tenantId }
    });
    return previouslyOurs;
  }

  // 3. No existing Customer; create new
  return await stripe.customers.create({
    email: userEmail,
    metadata: { tenant_id: tenantId }
  });
}
```

**Key invariants:**

- `metadata.tenant_id` is the source of truth that Stripe knows about — set on EVERY create + update.
- Email is the recovery key — assumes the user re-installing has the same Auth0 identity.
- If multiple Stripe Customers exist for the same email (e.g., one for each fork the user has tried), we re-key the first one with metadata. Acceptable; later iterations can scope by `metadata.fork_id` or similar.
- Stripe API: `customers.list` is paginated; default page size of 10 is fine for the lookup. If a single user has >10 historical customer records, edge-case handling in PRD-002+.

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
