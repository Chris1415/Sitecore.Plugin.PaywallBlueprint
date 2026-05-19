# <img src="https://hachweb.wordpress.com/wp-content/uploads/2025/08/2022-05-03-09_10_13-receipt-stickerapp-removebg-preview.png" alt="Hahn-Solo logo" height="40" align="center" /> Paywall Blueprint

**Author:** [Christian Hahn](https://www.linkedin.com/in/christian-hahn-solo/) — _Technical Product Manager DevEx & SDKs @ Sitecore_

The first publicly available worked example of monetizing a Sitecore Marketplace App.

---

## What this is

A fork-and-adapt reference implementation of a freemium paywall inside a Sitecore Cloud Portal Marketplace App. Ships a `<PaywallGate>` React component, four UX state components, a Supabase-backed `EntitlementStore` adapter, a Stripe `PaymentProvider`, and an 11-card bento dashboard at `/full-page`. Two clean abstraction boundaries (`EntitlementStore`, `PaymentProvider`) let you swap the store or payment provider without touching the gate logic. See [docs/architecture.md](docs/architecture.md) for the full design narrative.

**Who it is for:** Teams building or planning a paid Marketplace App on the Sitecore Cloud Portal who want a real, documented reference — not a toy demo.

---

## Screenshots

### Locked — free tier visible, premium blurred

![Bento dashboard in locked state — 5 free cards live, 6 premium cards blurred behind a centered Subscribe banner](docs/screenshots/bento-locked-dark.png)

5 free cards render real tenant data. 6 premium cards mount as silhouettes under `filter: blur(12px)`. The Subscribe banner sits as a sibling of the blurred region so it stays readable.

### Unlocked — full premium tier after €0.99 lifetime payment

![Bento dashboard in unlocked state — all 11 cards visible with Recharts activity chart, KPI counters, progress bars, content health ring and forecast sparkline](docs/screenshots/bento-unlocked-dark.png)

All 11 cards visible after Stripe Checkout success. Premium cards use hardcoded/fake data (ADR-0018). Recharts area chart lazy-loads as a separate ~300 kb chunk.

### Stripe Checkout — €0.99 lifetime

![Stripe Checkout sandbox page for Paywall Blueprint Premium — €0.99 one-time payment](docs/screenshots/stripe-checkout.png)

Stripe-hosted checkout opens in a new tab. On success Stripe redirects to `/paywall-return`; the `useEntitlement` hook detects the flip via `visibilitychange` + 3 s polling and reloads.

---

## Quickstart

**Prerequisites:** Node.js 20+, a free Supabase account, Sitecore Cloud Portal with App Studio permissions, a Stripe account (test mode).

**1. Clone and install.**

```bash
git clone https://github.com/Chris1415/Sitecore.Plugin.PaywallBlueprint.git
cd Sitecore.Plugin.PaywallBlueprint/site && npm install
```

**2. Create a Supabase project and run the schema.** Create a free project at [supabase.com](https://supabase.com), then paste `site/supabase/schema.sql` into the SQL Editor and run it. Full Supabase steps: [docs/integrations/stripe.md](docs/integrations/stripe.md) (see also the Supabase section in [docs/configuration.md](docs/configuration.md)).

**3. Configure your environment.**

```bash
cp site/.env.example site/.env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# SUPABASE_SECRET_KEY, OPERATOR_TENANT_ID — see docs/configuration.md
```

**4. Connect Stripe.** Follow [docs/integrations/stripe.md](docs/integrations/stripe.md) — API keys, local webhook listener, production endpoint. Six env vars in total.

**5. Register a custom app in Cloud Portal → App Studio** (extension point: `xmc:fullscreen`, route: `/full-page`, app URL: `http://localhost:3000`). Capture the `marketplaceAppTenantId` from the iframe URL for `OPERATOR_TENANT_ID`.

**6. Start the dev server.**

```bash
npm run dev
```

**7. Seed a state and verify.**

```bash
npm run seed:state -- allowed --tenant <your-marketplaceAppTenantId>
# Refresh the Cloud Portal iframe — you should see the bento in unlocked state.

npm run seed:state -- no-sub --tenant <your-marketplaceAppTenantId>
# Refresh — you should see the locked state with the Subscribe banner.
```

---

## Project structure

```
site/
  app/                        # Next.js App Router — pages and API routes
    full-page/                # Bento dashboard (xmc:fullscreen extension point)
    api/checkout/             # POST — Stripe Checkout Session creation
    api/webhooks/stripe/      # POST — Stripe webhook handler
    api/entitlement/          # GET — server-side entitlement poll endpoint
    paywall-return/           # Post-checkout return page
  src/lib/paywall/            # Core paywall library
    PaywallGate.tsx           # Gate component (6-step orchestration)
    types.ts                  # EntitlementStore, PaymentProvider interfaces
    stores/SupabaseStore.ts   # Supabase adapter (implements EntitlementStore + EntitlementSeed)
    providers/StripeProvider.ts # Stripe adapter (implements PaymentProvider)
    hooks/useEntitlement.ts   # Polling + postMessage hook
    states/                   # AllowedState, NoSubscriptionState, SeatsFullState, UserUnassignedState, SkeletonState
  components/bento/           # 11 bento card components (free + premium)
  supabase/schema.sql         # Two-table schema — paste into Supabase SQL Editor
  scripts/seed-state.ts       # State-switcher CLI (npm run seed:state)
docs/                         # Architecture, decisions, integrations, operations, adoption
project-planning/             # PRDs, ADRs, task breakdowns (internal planning artifacts)
```

---

## Configuration

Core env vars (see [docs/configuration.md](docs/configuration.md) for the full matrix including Stripe):

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Required |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (client-safe) | Required |
| `SUPABASE_SECRET_KEY` | Supabase service-role key (server + CLI only) | Required |
| `NEXT_PUBLIC_PAYWALL_ENABLED` | `false` = pass-through + demo-mode banner | Optional (`true`) |
| `NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID` | Dev shortcut — skip store for matching user (dead-code-eliminated in prod) | Optional |

---

## Where to read more

- [docs/architecture.md](docs/architecture.md) — PaywallGate orchestration, two abstraction boundaries, Supabase schema, Stripe Checkout flow, bento layout
- [docs/decisions.md](docs/decisions.md) — All 18 ADRs grouped by theme with one-line rationale and links to full records
- [docs/integrations/stripe.md](docs/integrations/stripe.md) — Full Stripe setup: account, product/price, API keys, webhook listener, test cards, Stripe Tax, idempotency-key versioning, signing-secret rotation
- [docs/operations.md](docs/operations.md) — Production hardening: RLS policy replacement, server-side enforcement, known limitations, theme toggle env-gating
- [docs/adoption.md](docs/adoption.md) — Primary fork path and secondary library-copy path; EntitlementStore swap walkthrough; PaymentProvider swap guidance
- [docs/configuration.md](docs/configuration.md) — Full environment variable matrix (core + Stripe)
- [CHANGELOG.md](CHANGELOG.md) — Per-PRD release notes and roadmap

---

## License

MIT — see [LICENSE](LICENSE).

## Built by

[hahn-solo](https://hahn-solo.net). Powered by [Sitecore Marketplace SDK](https://doc.sitecore.com/marketplace), [Blok](https://blok.sitecore.com), Supabase, and Stripe (PRD-001+).
