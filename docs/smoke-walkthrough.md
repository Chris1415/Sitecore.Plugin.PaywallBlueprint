# Smoke Walkthrough — Paywall Blueprint PRD-000

Step-by-step walkthrough of the 5-state validation matrix used at each operator gate.
Each section names the CLI command to reproduce the state, the expected outcome, and a
screenshot reference.

> **Screenshot status:** POC clickdummy HTML references are used until the operator
> captures real Cloud Portal screenshots. Replace the image references below with
> `docs/screenshots/*.png` captures from the running app in the iframe.

---

## Setup

Before walking any state, complete the one-time setup:

1. **Install dependencies.**
   ```bash
   cd site && npm install
   ```

2. **Create Supabase project** at [supabase.com](https://supabase.com). Capture URL,
   publishable key, and secret key.

3. **Run the schema.**
   In Supabase SQL Editor: paste `site/supabase/schema.sql` and run.

4. **Configure environment.**
   ```bash
   cp site/.env.example site/.env.local
   # Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
   # SUPABASE_SECRET_KEY, OPERATOR_TENANT_ID, OPERATOR_USER_ID
   ```

5. **Register custom app** in Cloud Portal → App Studio:
   - App URL: `http://localhost:3000`
   - Extension point: `xmc:fullscreen`
   - Route URL: `/`

6. **Start the dev server.**
   ```bash
   npm run dev
   ```

---

## Tranche A — Iframe install (operator gate T012)

**Command:** none (visual inspection after dev server starts)

**Steps:**
1. Install the custom app on your test tenant in Cloud Portal.
2. Navigate to the SitecoreAI Full Screen section where your app is installed.
3. Confirm the app renders in the iframe.

**Expected outcome:**
- Blok topbar visible at the top with label "Paywall Blueprint".
- Free section ("Inventory at a glance") visible above the separator.
- Hardcoded "Welcome, there" gated section visible below.
- Both sections visible on one screen at ≥ 1024×768 without scrolling.
- Colors, spacing, typography match Blok design tokens.

**Screenshot reference:**

![Iframe install — allowed state](screenshots/state-allowed.png)

---

## Tranche B — Real-identity welcome (operator gate T026)

**Command:**
```bash
npm run seed:state -- allowed --tenant <your-marketplaceAppTenantId>
```

**Steps:**
1. Run the seed command above.
2. Refresh the app in the Cloud Portal iframe.

**Expected outcome:**
- Gated section shows "Welcome, [your first name]" using the real name from
  `application.context.user.name`.
- Body: "Your tenant [your tenant name] has full access."
- If `user.name` is unavailable, falls back to email local part; then "there".
- If `tenant.name` is unavailable, falls back to last 8 chars of `tenant.id`.

**Screenshot reference:**

![Context-grounded welcome](screenshots/state-allowed.png)

---

## Tranche C — Four-state walkthrough (CHALLENGE GATE, operator gate T039)

### State 1: Allowed

**Command:**
```bash
npm run seed:state -- allowed --tenant <your-marketplaceAppTenantId>
```

**Expected outcome:** Post-gate welcome with real identity. CircleCheck icon visible.

**Screenshot reference:**

![Allowed state](screenshots/state-allowed.png)

---

### State 2: No subscription

**Command:**
```bash
npm run seed:state -- no-sub --tenant <your-marketplaceAppTenantId>
```

**Expected outcome:**
- Headline: "Start your subscription"
- Body: "Your tenant doesn't have an active plan yet. Pick a plan to unlock the premium section."
- CTA: "View plans" button opening `https://example.com/buy` in a new tab.
- Free section above the separator still visible.

**Screenshot reference:**

![No subscription state](screenshots/state-no-subscription.png)

---

### State 3: All seats in use (design-reference — evaluator bypassed)

**Command:**
```bash
npm run seed:state -- seats-full
```

This opens `http://localhost:3000/?previewState=seats-full` in your browser. The
entitlement evaluator is NOT called — the state component is rendered directly per
ADR-0011 (PRD-000 evaluator never returns this variant; PRD-002 wires the routing).

**Expected outcome:**
- Headline: "All seats in use"
- Sub-line: "5 of 5 seats in use" (uses the default `seatsTotal={5}` passed by the CLI)
- Body: "Ask your team admin to reassign a seat, or upgrade your plan for more."
- CTA: "Upgrade plan" opening `https://example.com/upgrade` in a new tab.

**Screenshot reference:**

![Seats full state](screenshots/state-seats-full.png)

---

### State 4: User unassigned (design-reference — evaluator bypassed)

**Command:**
```bash
npm run seed:state -- unassigned
```

Opens `http://localhost:3000/?previewState=unassigned`. Evaluator bypassed per ADR-0011.

**Expected outcome:**
- Headline: "Ask your team admin"
- Body: "Your tenant has a plan, but your team admin hasn't given you a seat yet."
- No CTA button or link (deliberate per PRD-000 design spec).

**Screenshot reference:**

![User unassigned state](screenshots/state-unassigned.png)

---

### State 5: Error fallback (error boundary smoke)

**Steps:**
1. Temporarily break the Supabase URL in `.env.local`
   (e.g. set `NEXT_PUBLIC_SUPABASE_URL=https://invalid.example.com`).
2. Restart the dev server: `npm run dev`.
3. Refresh the app in the iframe (with a valid seeded state in place — the error
   occurs when the store call rejects).

**Expected outcome:**
- Gated section shows error fallback: "Something went wrong" / "Please refresh the
  page or try again in a moment."
- **Free section above the separator is still visible and unaffected.** (NFR-6)
- Browser console shows a `[PaywallBlueprint]` error log.

**Screenshot reference:**

> Screenshot omitted (operator chose not to capture error/banner states).
> Error fallback structure preserved as a code reference in `src/components/error-boundary.tsx`.

**Cleanup:** Restore the real Supabase URL and restart the dev server.

---

## Tranche D — Env-flag toggle + dev override (operator gate T046)

### Env-flag disabled

**Steps:**
1. Set `NEXT_PUBLIC_PAYWALL_ENABLED=false` in `.env.local`.
2. Restart dev server.
3. Refresh the iframe (regardless of what entitlement state is seeded).

**Expected outcome:**
- "Paywall disabled — demo mode" banner visible immediately below the topbar, full width.
- Gated section renders premium content verbatim (no entitlement call made).
- No store interaction (Supabase not called).

**Screenshot reference:**

> Screenshot omitted (operator chose not to capture error/banner states).
> Banner copy locked verbatim in `src/lib/paywall/DemoModeBanner.tsx`.

**Cleanup:** Set `NEXT_PUBLIC_PAYWALL_ENABLED=true` and restart.

---

### Dev override

**Steps:**
1. Seed the no-subscription state so the evaluator would normally deny access:
   ```bash
   npm run seed:state -- no-sub --tenant <your-marketplaceAppTenantId>
   ```
2. Set `NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID=<your-host-user-sub>` in `.env.local`.
3. Restart dev server.
4. Refresh the iframe.

**Expected outcome:**
- Gate short-circuits to `allowed` and shows `<AllowedState />` — no entitlement store
  call made, even though `no-sub` is seeded.
- `onStateChange('dev-override')` fires (visible in DevTools React DevTools if wired).

**Cleanup:**
1. Unset or comment out `NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID`.
2. Restart dev server.
3. Refresh — gate should now evaluate normally and show `<NoSubscriptionState />`.

---

### DCE verification

**Command:**
```bash
npm run build
npm run test:dce
```

**Expected outcome:**
- `npm run build` exits 0.
- `npm run test:dce` (post-build grep of `.next/` for `NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID`)
  returns zero matches, confirming the entire dev-override branch is dead-code-eliminated
  from the production bundle (NFR-5).

See `project-planning/gate-evidence/tranche-d-dce-grep.txt` for the verified outcome.

---

## Tranche E — Ship validation (operator gate T054)

**Verify all OSS artifacts are present:**

```bash
ls products/paywall-blueprint/README.md
ls products/paywall-blueprint/CHANGELOG.md
ls products/paywall-blueprint/LICENSE
ls products/paywall-blueprint/CONTRIBUTING.md
ls products/paywall-blueprint/SECURITY.md
ls products/paywall-blueprint/docs/smoke-walkthrough.md
ls products/paywall-blueprint/docs/cold-read-notes.md
ls products/paywall-blueprint/site/supabase/schema.sql
ls products/paywall-blueprint/site/.env.example
```

**Final build regression:**

```bash
cd site
npx tsc --noEmit   # TypeScript type-check — exit 0
npm run lint       # ESLint — exit 0 (≤7 pre-existing warnings tolerated)
npm run build      # Next.js production build — exit 0
npm run test       # Vitest — all 74 tests pass
npm run test:dce   # DCE grep — zero matches in .next/
```

All five must exit 0.

---

## Five operator gate evidences

The following gates were recorded in the run manifest (`project-planning/workflow/run-20260513T093404Z.json`):

| Gate | Task | Status |
|------|------|--------|
| Tranche A — iframe install | T012 | passed |
| Tranche B — real-identity welcome | T026 | passed |
| Tranche C — 4-state challenge gate | T039 | passed |
| Tranche D — env-flag + dev override | T046 | passed |
| Tranche E — cold-reader (G3) | T050 | pending (operator action) |

G3 cold-reader outcome is recorded in `docs/cold-read-notes.md`.

---

# Smoke Walkthrough — PRD-001 (Stripe integration)

PRD-001 adds a real Stripe Checkout flow. The walkthrough below covers the four operator
gate stages (Tranche A–D). Each stage lists the exact commands to run, expected output,
and the screenshot reference for evidence.

**Prerequisites (in addition to PRD-000 setup):**

- Stripe account in test mode (free at [stripe.com](https://stripe.com))
- Stripe CLI installed (`stripe --version`) and logged in (`stripe login`)
- `.env.local` populated with 4 Stripe vars: `STRIPE_SECRET_KEY`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`,
  `STRIPE_WEBHOOK_SIGNING_SECRET` (webhook secret filled after `stripe listen` starts)

---

## PRD-001 Tranche A — Scaffold migration verification (operator gate T009)

**Purpose:** confirm the 4a→4b scaffold migration left all 74 existing tests passing
and both iframe routes rendering correctly in Cloud Portal.

**Commands:**

```bash
cd site
npm install
npm run lint       # expect 0 errors (pre-existing warnings tolerated)
npm run typecheck  # expect exit 0
npm run test       # expect ≥ 74 tests pass
npm run build      # expect exit 0; site/.next/ present
```

**Expected outcome:**

- All four commands exit 0.
- Test count ≥ 74 (baseline from PRD-000; zero new failures).
- `site/.next/server/app/api/` directory present (confirms API routes scaffold is in
  place after 4b migration).
- Real-tenant iframe smoke (T009): open the registered custom app in Cloud Portal →
  `xmc:fullscreen` → `/full-page` loads identically to PRD-000 (free section + gated
  section visible; Blok topbar; no CSP refused-to-display error).

**Screenshot reference:**

`pocs/screenshots/prd-001-tranche-a-iframe.png` +
`pocs/screenshots/prd-001-tranche-a-full-page.png`

---

## PRD-001 Tranche B — `stripe listen` + webhook round-trip (operator gate T029)

**Purpose:** verify the webhook handler receives events, upserts tenant rows, and
enforces idempotency via the Stripe CLI trigger.

**ASCII flow:**

```
stripe trigger                   stripe listen
checkout.session.completed  →    (Stripe CLI)  →  POST /api/webhooks/stripe
                                                     ↓ signature verification
                                                     ↓ processed_events.insert
                                                     ↓ tenants.upsert  →  200
                              resend same event  →  200 silent (idempotent)
```

**Commands:**

```bash
# Terminal 1 — dev server (https required for Cloud Portal iframe; skip-verify for mkcert)
cd site && npm run dev

# Terminal 2 — Stripe listener
stripe listen --forward-to https://localhost:3000/api/webhooks/stripe --skip-verify
# Copy the printed whsec_* into site/.env.local as STRIPE_WEBHOOK_SIGNING_SECRET
# Restart Terminal 1 after updating the secret.

# Terminal 3 — trigger a test event
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.tenant_id=<your-tenant-id>
```

> **Important:** the `--forward-to` URL must be `https://` (not `http://`). The dev
> server runs under mkcert (`--experimental-https`); the Stripe CLI defaults to
> `http://` if no scheme is given, which silently fails. The `--skip-verify` flag is
> required because mkcert is self-signed. Each `stripe listen` session mints a fresh
> `whsec_*` signing secret — copy it to `.env.local` and restart the dev server.

**Expected outcome:**

- Terminal 2 shows `200 POST /api/webhooks/stripe` for the triggered event.
- Supabase SQL Editor → `SELECT * FROM tenants` → new row with:
  - `tenant_id` matching the `--add` value
  - `status = 'active'`, `plan = 'premium'`, `period_end = null`
  - `stripe_customer_id` populated
- Resend `stripe trigger checkout.session.completed` with the same session (or run the
  trigger again): Terminal 2 shows `200` silently; no duplicate row in `tenants`.
- `npm run test:env-leak`: exits 0 (no server-only Stripe secrets in client bundle).

**Screenshot reference:**

`pocs/screenshots/prd-001-tranche-b-listen.png` +
`pocs/screenshots/prd-001-tranche-b-tenants-row.png`

---

## PRD-001 Tranche C — Real €0.99 payment via Cloud Portal iframe (G1 gate, T040)

**Purpose:** end-to-end real-money smoke confirming the full user journey from Cloud
Portal iframe → Stripe Checkout → `/paywall-return` → iframe AllowedState.

**Reset state (required before the smoke):**

```bash
cd site
npm run seed:state -- no-sub --tenant <your-marketplaceAppTenantId>
```

**ASCII flow:**

```
Cloud Portal iframe (/full-page)
    NoSubscriptionState → "View plans"
         ↓
    PaywallCheckoutDialog opens
    Click "Subscribe — €0.99 lifetime"
         ↓ POST /api/checkout
         ↓ StripeProvider.generateCheckoutUrl (orphan recovery + session create)
         ↓ returns { url }
    window.open(url, '_blank')  →  Stripe Checkout tab opens
         ↓ user enters card + billing address
         ↓ Stripe redirects to /paywall-return?session_id=...
    /paywall-return client fires:
         window.opener?.postMessage({ type: 'paywall:refresh' }, origin)
         sessionStorage.setItem('paywall:lastCheckoutCompleted', ...)
         ↓
    useEntitlement polling sees status='allowed' (≤30s)
         ↓
    PaywallGate transitions → AllowedState
```

**Steps:**

1. Ensure `stripe listen` is running (Terminal 2) and dev server is running (Terminal 1).
2. Open the Cloud Portal test app → your registered `xmc:fullscreen` custom app.
3. Confirm the gate shows `NoSubscriptionState` ("Start your subscription").
4. Click "View plans" → `PaywallCheckoutDialog` opens with "Subscribe — €0.99 lifetime".
5. Click "Subscribe — €0.99 lifetime". A new browser tab opens at Stripe Checkout.
6. Enter card `4242 4242 4242 4242`, any future MM/YY, any CVC, any billing address.
7. Click "Pay €0.99". Stripe redirects the new tab to `/paywall-return`.
8. Within 30 seconds, the Cloud Portal iframe transitions to `AllowedState`
   ("Welcome, [name]...").

**Expected outcome (G1):**

- Iframe transitions to `AllowedState` within 30 seconds of payment.
- Supabase `tenants` row shows `status='active'`, `stripe_customer_id` populated.
- `stripe listen` shows the `checkout.session.completed` event delivered 200.

**Screenshot reference:**

`pocs/screenshots/prd-001-tranche-c-dialog.png` +
`pocs/screenshots/prd-001-tranche-c-checkout.png` +
`pocs/screenshots/prd-001-tranche-c-return.png` +
`pocs/screenshots/prd-001-tranche-c-welcome.png`

---

## PRD-001 Tranche D — Production webhook delivery verification (G2 gate, T045)

**Purpose:** confirm all 6 event types deliver 200 to the production webhook endpoint,
idempotency holds, and a wrong signing secret returns 400.

**Prerequisite:** the production webhook endpoint must be registered in the Stripe
Dashboard (Dashboard → Developers → Webhooks → Add endpoint) pointing at
`https://<your-production-domain>/api/webhooks/stripe` with all 6 event types
selected. The production signing secret must be set in the hosting platform's
environment variables (not `.env.local`).

**Steps (from the Stripe Dashboard):**

1. Navigate to Developers → Webhooks → click your endpoint.
2. Click "Send test webhook" for each of the 6 event types in turn:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
3. For each: verify the delivery log shows HTTP 200.
4. **Idempotency check:** resend `checkout.session.completed` (click the event in the
   delivery log → "Resend"). Verify: 200 returned silently (no duplicate `tenants` row).
5. **Signature rejection check:** temporarily change `STRIPE_WEBHOOK_SIGNING_SECRET`
   in your hosting platform env to a deliberately wrong value (e.g. `whsec_wrong`).
   Redeploy. Send any test webhook. Verify the delivery log shows HTTP 400. Restore the
   correct secret and redeploy.

**Expected outcome (G2):**

- All 6 event types return 200 in the Stripe Dashboard delivery log.
- Idempotency resend returns 200 silently.
- Wrong signing secret returns 400.

**Screenshot reference:**

`pocs/screenshots/prd-001-tranche-d-webhook-deliveries.png`

---

## PRD-001 Five operator gate evidences

The following gates were recorded in the run manifest
(`project-planning/workflow/run-20260515T081454Z.json`):

| Gate | Task | Status | Verified at |
|------|------|--------|-------------|
| PRD-001 Tranche A — scaffold migration + iframe smoke | T009 | passed | 2026-05-16 |
| PRD-001 Tranche B — `stripe listen` + CLI round-trip | T029 | passed | 2026-05-16 |
| PRD-001 Tranche C — real €0.99 payment (G1) | T040 | passed | 2026-05-17 |
| PRD-001 Tranche D — Dashboard webhook delivery (G2) | T045 | passed | 2026-05-17 |
| PRD-001 Tranche E — OSS docs + PR merge (G3) | T052 | pending (operator action) | — |
