# Build decisions — Paywall Blueprint

Why this code is shaped the way it is, at component grain. Source files link here
instead of carrying the reasoning inline (rule `87-comment-economy`).

Architecture decisions live in `../project-planning/ADR/`.

Anchors are a contract — source comments point at them. Never rename one; supersede it.

> **Provenance.** Harvested 2026-08-12 from source-file header comments (247 lines, 8 blocks).

---

### Entitlement truth is server-rendered, not client-polled {#entitlement-truth-source}

**Decision.** `BentoGrid` reads the server-rendered `tenantsRow` as its truth source, **not**
`useEntitlement`.

**Why.** `useEntitlement` is client-side and has **no initial-mount poll**, so a grid keyed off
it would render the locked state on first paint even for an entitled tenant.
`SubscribeBanner` still uses `useEntitlement` internally — but only for the **post-payment
polling state machine**, which is a genuinely different job.

**The locked region's structure is load-bearing**, not cosmetic: the premium region carries
`aria-hidden="true"` while locked, and `SubscribeBanner` is a **sibling** of that region, never
a child — otherwise the banner inherits `aria-hidden` and the one control that unlocks the app
becomes invisible to assistive tech. A parent-traversal regression test asserts
`subscribe-banner.closest('.premium-region') === null` directly.

### The Stripe idempotency key must bump when params change {#stripe-idempotency-version}

**Decision.** The checkout idempotency key is `${tenantId}:${CHECKOUT_PARAMS_VERSION}`, and the
version constant is bumped whenever the `SessionCreateParams` shape changes.

**Why.** Stripe caches the **first** request's params against a key. A later request with the
same key and *different* params is rejected outright:
*"Keys for idempotent requests can only be used with the same parameters they were first used
with."* Keys expire after 24h, so during development a stale cache hit blocks you for a full day.

**Version history, which is the actual reason this is documented:**

| | |
|---|---|
| **v1** | initial shape — **failed** `automatic_tax` with `customer_tax_location_invalid` against real tenants |
| **v2** | added `customer_update: { address: 'auto', name: 'auto' }` |
| **v3** | bumped to clear stale **Live-mode** v2 keys after switching from Sandbox — Sandbox and Live caches are separate, so bumping unblocks Live testing without waiting 24h |

**Three-tier precedence at request time, highest first:** a `version` field on the checkout POST
body (read by `useEntitlement` from `?paywall_version=` or `localStorage`, so an operator can
force a fresh key **from the browser** without touching env vars or redeploying); the
`STRIPE_CHECKOUT_PARAMS_VERSION` env var (Vercel auto-redeploys on change, ~30s); then the code
default.

### The display chains are locked decisions, not defensive coding {#display-chains}

**Decision.** Two fallback chains, applied identically wherever a name is shown:

- **User:** `given_name` → `name` → `email.split('@')[0]` → `"there"`
- **Tenant:** `resourceAccess[0].tenantDisplayName` → `resourceAccess[0].tenantName` →
  `marketplaceAppTenantId.slice(-8)` → `"your tenant"`

Both are pinned in the captured SDK fixtures under `$design_decisions`, verified against
`node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext`. If a `.d.ts`
verification ever finds the accessor chain divergent, **update the chain** — do not add a
parallel one at a call site.

### PaywallGate resolves six numbered steps in order {#paywall-gate-steps}

**Decision.** The gate evaluates in a fixed order: env-flag check
(`NEXT_PUBLIC_PAYWALL_ENABLED === "false"` renders children verbatim) → context readiness (null
→ skeleton) → context validation (**missing `tenantId` throws**, caught by the error boundary) →
dev override → entitlement fetch (pending → skeleton, reject → re-throw) → render the matching
state component.

**Null-context is belt-and-suspenders**, not the real guard — the provider resolves before
rendering children. Throwing on a missing `tenantId` rather than degrading is deliberate: a gate
that cannot identify the tenant must not decide entitlement.

**Two of the four states are forward-compat.** The current evaluator only returns `allowed` and
`tenant_no_subscription`; the seat-related variants are rendered defensively so a later
evaluator needs no gate change.

---

## Test-suite decisions

### The standalone browser cannot see this app at all {#host-frame-required}

**The constraint.** Every route is a Marketplace SDK app requiring the Cloud Portal parent frame
to complete the SDK handshake. In a standalone browser, `MarketplaceProvider` **renders null**
until the SDK resolves — so the unlocked premium state, the bento content, and even the topbar
are unreachable.

**What that means for the specs.** Each e2e spec states explicitly what it *can* prove
standalone (the page loads, no JS exceptions, no critical console errors) and marks the rest
`host-frame-required`, to be captured by the operator inside the live Cloud Portal host frame.
**Nothing is asserted that the environment cannot actually observe** — the alternative is a
green suite that proves the loading screen renders.

**Visual baselines are operator-captured at the gate**, compared against the winning POC
clickdummy as the visual ground truth.

**⚠ On divergence, record POC drift and route it back through `/architect`. Do NOT silently
promote the live render as the new baseline.**

### RED tests are written against the unimplemented state {#red-first}

Both the bento locked-state and gated-section suites were written to **fail** until their
implementation landed — the failure is what confirms the assertions are correct before the code
exists, rather than being written against a component already built to pass them.
