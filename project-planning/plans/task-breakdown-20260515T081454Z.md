# Task Breakdown — PRD-001 (Stripe direct integration)

---
document_type: task_breakdown
prd_reference: project-planning/PRD/prd-001.md
prd_minimal_reference: project-planning/PRD/prd-minimal-001.md
run_manifest: project-planning/workflow/current-run.json
run_id: 20260515T081454Z
generated_at: 2026-05-15T10:15:00Z
branch: prd-001
base_branch: main
product_slug: paywall-blueprint
scope_dial:
  rigor: standard
  track: minimal
  ui_variants: skip
  docs_at_ship: auto-lite
  task_breakdown_review: skip_gate
authored_by: 06-lead-developer
next_step: 07-qa-specialist (TDD enrichment)
test_default: test-after (QA will reorder to test-first per task_breakdown_style: tdd)
---

> **Scope:** PRD-001 ONLY. PRD-000 shipped 2026-05-15 at the public repo; this breakdown adds Stripe direct integration end-to-end (one-time €0.99 EUR lifetime). No re-planning of the foundation. Existing 74 tests are the regression net.

> **Slim-context binding:** the Developer (08) reads ONLY `prd-minimal-001.md` + this file. § 4c below is the contract; if a fact is not here, it is not implementable. All 7 § 4c subsections are populated.

> **File-path note:** the existing scaffold places App Router routes at `site/app/...` (NOT `site/src/app/...`) and library code at `site/src/lib/...`. PRD § 9 text says `src/app/...` but the executable contract follows the **actual** scaffold layout — API routes go to `site/app/api/*/route.ts`, new pages to `site/app/paywall-return/page.tsx`. Library code stays at `site/src/lib/paywall/...`. The `@/*` tsconfig alias resolves from the project root, so `@/lib/paywall/...` works for both.

## § 1 Scope

Replace `PaywallCheckoutDialog`'s placeholder "Got it" button with a **real Stripe Checkout flow end-to-end**:

- Migrate scaffold 4a → 4b in-place (ADR-0013); add Next.js App Router API routes folder
- Install `stripe` Node SDK
- Implement `StripeProvider` — first concrete `PaymentProvider` (ADR-0003)
- Ship 4 API routes: `/api/checkout`, `/api/portal` (501 stub for PRD-003), `/api/entitlement` (polling endpoint, service-role + unauthenticated v1), `/api/webhooks/stripe`
- Webhook signature verification (400 on bad sig — not 401), `processed_events` idempotency, `checkout.session.completed` upsert in Tranche B; 5 forward-compat event handlers in Tranche D
- Stripe Customer orphan recovery scoped by `metadata.app_slug = 'paywall-blueprint'` (ADR-0015 revised)
- `useEntitlement` hook — polling primary (3s × 10 = 30s cap), postMessage best-effort sugar (ADR-0014 revised)
- `/paywall-return` page (Stripe `success_url` target) — postMessage + sessionStorage signals
- Public API barrel `src/lib/paywall/index.ts`
- README "Stripe Setup" section + new env-vars table + CHANGELOG `[0.2.0]` + `docs/smoke-walkthrough.md` refresh

**Out of scope (this PRD):** Customer Portal wiring (PRD-003), per-user seats (PRD-002), recurring subscription UX (handlers forward-compat only), `withEntitlement` HOF, public Marketplace submission.

## § 2 Personas Affected

- **Editor on unsubscribed tenant** — completes the real €0.99 payment for the first time (US-1).
- **Editor on reinstalled tenant** — checkout reuses existing Stripe Customer via orphan recovery (US-3).
- **Stripe webhook receiver** — POSTs delivered with signature verification + idempotency (US-4, US-5).
- **Adopter forking the blueprint** — follows README "Stripe Setup" with their own Stripe account (US-6).
- **Developer (08)** — implements from prd-minimal-001 + this file only. No PRD, ADR, or research-doc opens required.
- **Operator (Christian)** — performs gated tasks: Stripe CLI install (OA-001-7), real webhook endpoint creation in Stripe Dashboard (OA-001-8), Stripe Tax toggle decision (OA-001-6), real-tenant smoke verifications at each gate.

## § 3 Tranche Overview

| Tranche | Focus | Operator Gate | Success Criterion |
|---|---|---|---|
| **A** | Scaffold migration 4a→4b + Stripe SDK install + env-vars | Real-tenant iframe smoke: `/` + `/full-page` still render; 74 existing tests pass; `npm run build` includes `app/api/` | none yet (no feature code) |
| **B** | `StripeProvider` + 4 API routes + `checkout.session.completed` handler + idempotency + signature verification + orphan recovery + error translation + barrel export | All routes return expected codes; `stripe listen` connects; `stripe trigger checkout.session.completed` upserts `tenants` row; env-var leak grep test green | partial G2 (CLI-level) |
| **C** | Rewire `PaywallCheckoutDialog` + `useEntitlement` hook + `/paywall-return` page + polling fallback + postMessage best-effort | **REAL MONEY SMOKE**: from Cloud Portal iframe, click Subscribe → pay 4242 4242 4242 4242 → iframe refreshes to welcome card within 30s. Screenshot evidence committed | **G1** |
| **D** | 5 remaining forward-compat webhook event handlers (subscription lifecycle + invoice events) | Stripe Dashboard "Send test webhook" delivers all 6 event types → idempotency holds on resend (200 silent); wrong signing secret → 400; DCE grep for `PAYWALL_DEV_OVERRIDE_USER_ID` clean | **G2** |
| **E** | README "Stripe Setup" + CHANGELOG [0.2.0] + smoke-walkthrough refresh + ship | PR merged into main on the public repo; auto-lite docs emitted | **G3** |

## § 3 Task List

Format: Task ID | Title | Description | Expected Output | Depends on

### Tranche A — Scaffold migration + Stripe SDK install

| ID | Title | Description | Expected Output | Depends on |
|---|---|---|---|---|
| **T001** | [OPERATOR] Confirm Stripe Tax dashboard toggle decision (OA-001-6) | Operator decides whether Stripe Tax is enabled in their dashboard's test mode. Code ships with `automatic_tax: { enabled: true }` regardless; if Tax is disabled in dashboard, Checkout creation will fail at runtime — Tranche C smoke is when this matters. Document the decision in `current-run.json` operator_attention. | Decision recorded (enabled / disabled) | none |
| **T002** | Snapshot regression baseline before migration | Run `cd site && npm install && npm run lint && npm run typecheck && npm run test && npm run build` from a clean checkout of `prd-001`. Capture the test count + any pre-existing failures in a one-line note. This is the baseline the Tranche A gate compares against. | Baseline note: "X tests pass, build green, lint clean" appended to task notes | none |
| **T003** | Apply full-stack quickstart in-place (4a→4b migration per ADR-0013) | From `products/paywall-blueprint/`, run: `npx shadcn@latest add https://blok.sitecore.com/r/marketplace/next/quickstart-with-full-stack-xmc.json --cwd site --yes`. This adds Next.js API route capability + any `next.config.mjs` / middleware augments. Apply IN-PLACE over the existing 4a scaffold (do NOT delete `site/` first). Review the diff: existing iframe code under `site/app/page.tsx`, `site/app/full-page/page.tsx`, `site/src/lib/paywall/**`, `site/components/**` MUST remain untouched. If the quickstart overwrites an existing file with diverging content, HARD STOP and report (rule `50-scaffold.mdc`). | `site/app/api/` folder exists (empty or with quickstart-shipped sample routes deleted); `next.config.mjs` updated with any required headers; git diff shows only additive changes to existing surfaces | T002 |
| **T004** | Verify migration regression: lint + typecheck + test + build all green | From `site/`, run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. All 74 existing tests MUST pass (zero new failures, zero new flakes). Build output MUST succeed. Compare to T002 baseline. | All four commands exit 0; test count ≥ 74; build artifact present at `site/.next/` | T003 |
| **T005** | Install `stripe` Node SDK | From `site/`, run `npm install stripe`. Commit the `package.json` + `package-lock.json` change. The version installed is the latest at this writing (expected `^17.x` or later). Do NOT pin manually — let `npm install stripe` pick the current latest stable. | `stripe` appears in `site/package.json` dependencies; `npm ls stripe` shows a single resolved version | T004 |
| **T006** | Capture `stripe` SDK `.d.ts` paths and update § 4c-6 citations | Per the architect's SDK-contract deferral note (run-manifest stage_history → architect → assumption): with `stripe` now installed, open `site/node_modules/stripe/types/` and capture the `.d.ts` paths for: `Stripe.Checkout.SessionCreateParams`, `Stripe.Checkout.Session`, `Stripe.Customer`, `Stripe.CustomerCreateParams`, `Stripe.CustomerListParams`, `Stripe.CustomerUpdateParams`, `Stripe.Event`, `Stripe.Checkout.SessionCompletedEvent`, `Stripe.SubscriptionUpdatedEvent`, `Stripe.SubscriptionDeletedEvent`, `Stripe.InvoicePaymentFailedEvent`, `Stripe.AsyncPaymentSucceededEvent`, `Stripe.AsyncPaymentFailedEvent`, `Stripe.BillingPortal.SessionCreateParams`. Append the exact paths to this task breakdown's § 4c-6 (inline edit). This is the rule `40-sdk-contracts.mdc` capture step that was deferred from /architect. | § 4c-6 inline-cited with real `.d.ts` paths; commit message includes "T006: SDK contract capture" | T005 |
| **T007** | Update `site/.env.example` with 4 new Stripe env vars | Append a `--- Stripe ---` section after the existing Supabase block. Add `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SIGNING_SECRET` with placeholder values + comments indicating server-only vs client-readable. Mark `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SIGNING_SECRET` as "server-only; never expose client-side". `NEXT_PUBLIC_PAYWALL_RETURN_ORIGIN` may be added if the polling/postMessage origin needs externalization — Developer decides during T021. | `site/.env.example` shows 4 new vars; existing 5 vars untouched | T005 |
| **T008** | Populate operator's `site/.env.local` with Stripe test-mode keys | Operator-only (does not commit). Copy Product ID `prod_UWKcVQmJH2MiSa` (informational only — code uses Price), Price ID `price_1TXHyIAHnDmxitZjwxHhKe8y`, the secret + publishable test keys captured during the pre-flight (per current-run.json operator_attention "Stripe pre-flight DONE 2026-05-15") into `site/.env.local`. `STRIPE_WEBHOOK_SIGNING_SECRET` is **deferred to T036** (filled when `stripe listen` runs in Tranche B dev). | `site/.env.local` populated with the three available values; webhook signing secret slot present with TODO comment | T007 |
| **T009** | [OPERATOR] Tranche A gate: real-tenant iframe smoke verification | Open the Cloud Portal test app (the registered custom app from PRD-000) in real Cloud Portal. Verify `/` (extension `xmc:fullscreen`) renders the gated section + free section identically to PRD-000. Verify `/full-page` also renders. Screenshot both and store at `pocs/screenshots/prd-001-tranche-a-iframe.png` + `pocs/screenshots/prd-001-tranche-a-full-page.png`. | Two screenshots committed; manifest `smoke_outcomes.tranche_a` set to `pass` or `pass_with_caveats` with notes | T004, T008 |

### Tranche B — Server-side StripeProvider + API routes + checkout.session.completed handler

| ID | Title | Description | Expected Output | Depends on |
|---|---|---|---|---|
| **T010** | Add Stripe error-translation table at `site/src/lib/paywall/stripe-errors.ts` | Create the module that maps Stripe error codes to user-friendly messages + HTTP status per PRD-001 § 7 FR-2 table. Export: `translateStripeError(err: unknown): { message: string; status: number }`. Handle `tax_settings_not_set` + any `tax_*` family → 503, `resource_missing` on Price → 503, `rate_limit` → 429, `api_connection_error` / `api_error` → 503, any other → 503 with `console.error` of full Stripe error. Module is server-only by convention (no `'use client'`). | New file at `site/src/lib/paywall/stripe-errors.ts` with `translateStripeError` exported; pure function | T005 |
| **T011** | Implement `StripeProvider` at `site/src/lib/paywall/providers/StripeProvider.ts` | First concrete `PaymentProvider` implementation (ADR-0003). Constructor takes `secretKey: string, priceId: string, webhookSigningSecret: string`. Methods (per FR-1): `generateCheckoutUrl({ tenantId, userEmail, returnUrl })` — internally calls `findOrCreateStripeCustomer` (ADR-0015 orphan recovery; service-role Supabase client read of `tenants.stripe_customer_id`, then `stripe.customers.list` filtered by `metadata.app_slug === 'paywall-blueprint'`, sort by `created` desc, pick most recently created if N>1, log discards via `console.warn` with `[PaywallBlueprint]` prefix); then `stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ price: priceId, quantity: 1 }], automatic_tax: { enabled: true }, success_url: \`${returnUrl}?session_id={CHECKOUT_SESSION_ID}\`, cancel_url: returnUrl, customer: customer.id, metadata: { tenant_id: tenantId } }, { idempotencyKey: tenantId })`. `generatePortalUrl()` throws `new Error('Not implemented in PRD-001; lands in PRD-003 — see /api/portal stub.')`. `verifyWebhookSignature(rawBody, sig)` wraps `stripe.webhooks.constructEvent(rawBody, sig, webhookSigningSecret)` and returns the parsed `Stripe.Event` or throws. `parseWebhookPayload(event)` maps Stripe Event types to internal `EntitlementChange` shape — emit `kind: 'subscription_created'` for `checkout.session.completed` (one-time payment maps to "purchase complete"), `'subscription_updated' | 'subscription_cancelled' | 'payment_failed' | 'payment_succeeded'` for the other 5 forward-compat types. Constants: `const APP_SLUG = 'paywall-blueprint'` lives in this file (adopters fork to change). | New file at `site/src/lib/paywall/providers/StripeProvider.ts` exporting `StripeProvider` class | **T012, T013, T014** (test-first: tests written RED before this impl) |
| **T012** | Write failing tests for `StripeProvider` orphan-recovery branches (0 / 1 / N candidates) — **RED** | Vitest unit tests at `site/src/lib/paywall/providers/StripeProvider.test.ts`. Stub the `stripe` SDK via `vi.mock('stripe', ...)` returning a mock client whose `customers.list / create / update / retrieve` methods can be controlled per test. Three branches: (1) 0 candidates → expects `customers.create` called with `metadata.app_slug = 'paywall-blueprint'` + `metadata.tenant_id = <tenantId>`; (2) 1 candidate matching app_slug → expects `customers.update` called with re-keyed `metadata.tenant_id` and the candidate ID, NOT `customers.create`; (3) N>1 candidates → expects most-recently-created picked, `console.warn` emitted with discarded IDs. Filter-by-`metadata.app_slug` MUST be exercised: include a candidate with a foreign `app_slug` in the mock return and assert it is NOT selected. These tests MUST FAIL (RED) until T011 is implemented. Pre-T006: fixture Stripe customer shapes from https://stripe.com/docs/api/customers/object — `{ id: string, object: 'customer', created: number, email: string, metadata: Record<string,string> }`. Post-T006: verify fixture shapes against `// source: node_modules/stripe/types/Customers.d.ts`. | `StripeProvider.test.ts` with 4+ failing tests (RED); tests pass after T011 | T010 |
| **T013** | Write failing test for `StripeProvider.generatePortalUrl` throws — **RED** | Vitest: calling `generatePortalUrl({...})` throws an `Error` with message containing "PRD-003" — protects against accidental implementation-leak. MUST FAIL until T011 is implemented. | Test failing (RED); passes after T011 | T010 |
| **T014** | Write failing tests for `StripeProvider.verifyWebhookSignature` good + bad signature — **RED** | Vitest: stub `stripe.webhooks.constructEvent` to return a fake `Stripe.Event` for the good case; stub to throw `new Error('No signatures found matching')` for the bad case. Assert the wrapper returns the event in the good case and re-throws (not swallows) in the bad case. MUST FAIL until T011 is implemented. Pre-T006 fixture: `Stripe.Event` shape `{ id: string, type: string, data: { object: Record<string,unknown> } }` from https://stripe.com/docs/api/events/object. Post-T006: `// source: node_modules/stripe/types/Events.d.ts`. | Two failing tests (RED); pass after T011 | T010 |
| **T015** | Implement `/api/checkout` route at `site/app/api/checkout/route.ts` | Next.js App Router POST handler. Reads JSON body `{ tenantId: string, userEmail: string }`. Validates required fields — return 400 with `{ error: 'tenantId and userEmail required' }` if either is missing/empty. Constructs `StripeProvider` from env-vars `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` + `STRIPE_WEBHOOK_SIGNING_SECRET`. Constructs `returnUrl = ${process.env.NEXT_PUBLIC_PAYWALL_RETURN_ORIGIN ?? request URL origin}/paywall-return`. Calls `provider.generateCheckoutUrl({ tenantId, userEmail, returnUrl })`. Wraps the call in try/catch — on Stripe error, runs `translateStripeError(err)` from T010 and returns `{ error: <translated message> }` with the translated HTTP status. On success returns `{ url: session.url }` with 200. Cap response time per NFR-4: if Stripe API hangs >2s, that's the operator's problem — we do NOT add a manual abort; Stripe's SDK default timeout handles it. | New file at `site/app/api/checkout/route.ts` exporting `POST` | **T016** (test-first: T016 written RED before this impl), T011, T010 |
| **T016** | Write failing tests for `/api/checkout` happy path + 400 (missing fields) + 503/429 (Stripe error translation) — **RED** | Integration-style test at `site/app/api/checkout/route.test.ts` using direct invocation of the exported `POST` handler (no HTTP server needed). Stub `StripeProvider.generateCheckoutUrl` to return a known URL. Tests: (1) valid body → 200 with `{ url }` (assert `url` is non-empty string — dialog depends on this exact shape); (2) empty `tenantId` → 400; (3) Stripe throws with `code: 'tax_settings_not_set'` → 503 with the user-friendly message from T010's table; (4) Stripe throws with `code: 'rate_limit'` → 429. MUST FAIL until T015 is implemented. Fixture source: PRD-000 T013 Marketplace SDK capture for tenantId shape; Stripe error codes from https://stripe.com/docs/error-codes (pre-T006) / `// source: node_modules/stripe/types/Errors.d.ts` (post-T006). | 4 failing tests (RED); pass after T015 | T010 |
| **T017** | Implement `/api/portal` route at `site/app/api/portal/route.ts` (PRD-003 stub) | POST handler that returns `Response.json({ error: 'Customer Portal lands in PRD-003. See README.' }, { status: 501 })`. No other logic. Header comment cites ADR-0003 + that PRD-003 wires this in. | New file at `site/app/api/portal/route.ts` | **T018** (test-first), T003 |
| **T018** | Write failing test for `/api/portal` returns 501 — **RED** | Vitest: invoke the `POST` handler; assert response.status === 501 and JSON body matches. MUST FAIL until T017 is implemented. | Failing test (RED); passes after T017 | T003 |
| **T019** | Implement `/api/entitlement` route at `site/app/api/entitlement/route.ts` | Next.js App Router GET handler. Reads query params `tenantId` (required) + optionally `userId`. Returns 400 if `tenantId` missing/empty. Constructs a Supabase service-role client using `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY` (NOT the anon key — bypasses RLS per ADR-0009 + NFR-7). Re-uses the existing `SupabaseStore.getEntitlement(tenantId, userId ?? '')` logic — either import `SupabaseStore` from `@/lib/paywall/stores/SupabaseStore` (preferred — preserves contract) OR inline the equivalent query if SupabaseStore is hard-coded to anon-key construction. Returns `EntitlementResult` JSON with 200. v1 is **UNAUTHENTICATED** (NFR-7) — README documents this as known limitation; PRD-002 hardens via `host.user.sub` verification. Add a JSDoc comment block at the top of the file with "⚠ Unauthenticated in v1 — PRD-002 hardens; see README § Known limitations." | New file at `site/app/api/entitlement/route.ts` | **T020** (test-first), T003 |
| **T020** | Write failing tests for `/api/entitlement` happy paths + 400 (missing tenantId) — **RED** | Vitest: stub `SupabaseStore.getEntitlement` (or the inline supabase client). Tests: (1) `?tenantId=t1` with allowed entitlement → 200 + `{ status: 'allowed' }`; (2) `?tenantId=t2` with no-subscription → 200 + `{ status: 'tenant_no_subscription' }`; (3) `?` no tenantId → 400. MUST FAIL until T019 is implemented. Fixture source: PRD-000 `EntitlementResult` discriminated union (existing type in `types.ts`). | 3 failing tests (RED); pass after T019 | T003 |
| **T021** | Implement `/api/webhooks/stripe` route at `site/app/api/webhooks/stripe/route.ts` (skeleton + signature verification + idempotency + `checkout.session.completed`) | POST handler. **CRITICAL: read raw request body before parsing JSON** — Stripe signature verification requires the byte-exact body. Use `await request.text()` then pass to `provider.verifyWebhookSignature(rawBody, request.headers.get('stripe-signature') ?? '')`. On verification throw → return `Response.json({ error: 'invalid signature' }, { status: 400 })` (NOT 401 — per FR-5 / US-5; Stripe does not retry 4xx). `console.error('[PaywallBlueprint] webhook signature verification failed', err)`. On success: extract `event.id` and `event.type`. Idempotency: construct Supabase service-role client; run `await supabase.from('processed_events').insert({ event_id: event.id }).select()`; if the response error indicates unique-violation (PostgREST returns 409 / code `23505`), return 200 silently (idempotent replay). Otherwise dispatch on `event.type`: for `'checkout.session.completed'` extract `session.metadata.tenant_id` + `session.customer` + `session.subscription` (will be null for one-time); upsert `tenants(tenant_id, stripe_customer_id, status='active', plan='premium', period_end=null)` — use `.upsert(...).eq('tenant_id', tenant_id)` semantics or `.from('tenants').upsert({ tenant_id, stripe_customer_id, status: 'active', plan: 'premium', period_end: null, updated_at: 'now()' }, { onConflict: 'tenant_id' })`. For all other 5 event types in Tranche B: log + return 200 (handlers land in Tranche D). For any unknown event type: log `console.log('[PaywallBlueprint] unhandled event:', event.type)` + return 200 silently (FR-5 fall-through). Handler must complete in ≤5s (NFR-3). | New file at `site/app/api/webhooks/stripe/route.ts` | **T022, T023, T024, T025** (test-first: all 4 written RED before this impl), T011 |
| **T022** | Write failing test for `/api/webhooks/stripe` happy path: `checkout.session.completed` upserts tenant row — **RED** | Vitest. Stub `StripeProvider.verifyWebhookSignature` to return a fake `Stripe.Event` with `type: 'checkout.session.completed'`, `id: 'evt_test_1'`, `data.object.metadata.tenant_id: 'tenant-abc'`, `data.object.customer: 'cus_xyz'`. Stub the Supabase service-role client to capture `processed_events.insert` + `tenants.upsert` calls. Assert: 200 returned; `processed_events.insert({ event_id: 'evt_test_1' })` called once; `tenants.upsert` called with `tenant_id: 'tenant-abc'`, `stripe_customer_id: 'cus_xyz'`, `status: 'active'`, `plan: 'premium'`, `period_end: null`. MUST FAIL until T021 is implemented. Pre-T006 fixture shape: `{ id: 'evt_test_1', type: 'checkout.session.completed', data: { object: { metadata: { tenant_id: 'tenant-abc' }, customer: 'cus_xyz', subscription: null } } }`. | Failing test (RED); passes after T021 | T011 |
| **T023** | Write failing test for `/api/webhooks/stripe` idempotency: replay of same event_id returns 200 silently — **RED** | Vitest. Stub the supabase `processed_events.insert` to return a `code: '23505'` unique-violation error on the second call. Send the same event twice; assert: first call upserts tenants; second call returns 200 with no `tenants.upsert` call. MUST FAIL until T021 is implemented. | Failing test (RED); passes after T021 | T011 |
| **T024** | Write failing test for `/api/webhooks/stripe` signature mismatch returns 400 (US-5) — **RED** | Vitest. Stub `StripeProvider.verifyWebhookSignature` to throw `new Error('No signatures found matching')`. Assert: response.status === 400; `console.error` called with `[PaywallBlueprint] webhook signature verification failed` prefix; no `tenants.upsert` invoked. MUST FAIL until T021 is implemented. | Failing test (RED); passes after T021 | T011 |
| **T025** | Write failing test for `/api/webhooks/stripe` unknown event type returns 200 silently (FR-5 fall-through) — **RED** | Vitest. Stub `verifyWebhookSignature` to return a fake event with `type: 'charge.refunded'` (an event we don't handle in v1). Assert: 200; no `tenants.upsert`; `processed_events.insert` still called (so retries are idempotent). MUST FAIL until T021 is implemented. | Failing test (RED); passes after T021 | T011 |
| **T026** | Create `site/src/lib/paywall/index.ts` barrel export | New file. Re-export the adopter-facing public API per PRD § 9: `PaywallGate`, `PaywallCheckoutDialog`, `DemoModeBanner`, `useEntitlement` (forward-declared — actual export added in T030), `AllowedState`, `NoSubscriptionState`, `SeatsFullState`, `UserUnassignedState`, `SkeletonState`; types: `PreviewState`, `EntitlementStore`, `EntitlementSeed`, `EntitlementResult`, `PaymentProvider`. The `useEntitlement` re-export line can be added at T030 alongside the hook itself if preferred — Developer's call. | New file `site/src/lib/paywall/index.ts` | T003 |
| **T027** | Build-time grep test for env-var leakage (NFR-6 + R6) | Add a script at `site/scripts/test-stripe-env-leak.sh` that runs `npm run build` then `grep -rE 'STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SIGNING_SECRET' site/.next/static/ \|\| echo "OK: no server-only Stripe secrets in client bundle"`. Wire it as a new npm script `test:env-leak` in `package.json`. Test: confirms the script exits 0 (no matches) on a current build; if any code accidentally moves the values to a client bundle, this fails. NOTE: this scans for the VARIABLE NAME literal as a defense-in-depth signal — the real protection is that Next.js only inlines `NEXT_PUBLIC_*` vars into the client bundle. Variable-name presence in a `.js` file would mean someone accidentally referenced `process.env.STRIPE_SECRET_KEY` from a `'use client'` component. | New file `site/scripts/test-stripe-env-leak.sh`; new npm script `test:env-leak`; run passes | T021 |
| **T028** | [OPERATOR] Install Stripe CLI for local dev (OA-001-7) | One-time per machine. On Windows: download from `https://github.com/stripe/stripe-cli/releases/latest` (use `stripe_X.X.X_windows_x86_64.zip`), unzip, add to PATH. Run `stripe login` once; complete browser confirmation. Verify with `stripe --version`. | `stripe --version` outputs the version; `stripe login` succeeded | none |
| **T029** | [OPERATOR] Tranche B gate: `stripe listen` connects + `stripe trigger checkout.session.completed` upserts tenants row | From `site/`, run `npm run dev` in one shell. In a second shell: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Copy the displayed `whsec_*` signing secret into `site/.env.local` as `STRIPE_WEBHOOK_SIGNING_SECRET` and restart `npm run dev`. Run `stripe trigger checkout.session.completed` in a third shell. Verify: (a) listen output shows 200; (b) Supabase Dashboard SQL editor `SELECT * FROM tenants` shows a new row whose `tenant_id` matches the `metadata.tenant_id` injected by `stripe trigger` (or by the test event's default). Re-run `stripe trigger checkout.session.completed` for the same event ID: 200 silent, no duplicate row (verifies idempotency end-to-end via real CLI). Run `bash scripts/test-stripe-env-leak.sh`: green. Screenshot the `stripe listen` output + the Supabase row. | Gate notes added to manifest `smoke_outcomes.tranche_b`; screenshots at `pocs/screenshots/prd-001-tranche-b-listen.png` + `prd-001-tranche-b-tenants-row.png` | T022, T023, T024, T025, T027, T028 |

### Tranche C — Client-side wiring + paywall-return + polling fallback

| ID | Title | Description | Expected Output | Depends on |
|---|---|---|---|---|
| **T030** | Implement `useEntitlement` hook at `site/src/lib/paywall/hooks/useEntitlement.ts` | Per FR-7 + ADR-0014 (revised). Exports `useEntitlement(): { entitlement, isLoading, error, triggerCheckout }`. Inside: pull `tenantId` from `application.context.marketplaceAppTenantId` and `userEmail` from `host.user.email` via the existing Marketplace SDK provider (look at how `PaywallGate.tsx` consumes these — re-use that pattern). `triggerCheckout()`: (1) POST to `/api/checkout` with `{ tenantId, userEmail }`; on 4xx/5xx parse response body and `setError(body.error)`, return early; (2) on 200 receive `{ url }`; (3) `window.open(url, '_blank')`; (4) start the **success-detection state machine**: single `useState<{ kind: 'success' \| 'timeout' } \| null>(null)` named `outcomeRef`. Start `setInterval(3000)` polling `/api/entitlement?tenantId=${tenantId}` — on response `{ status: 'allowed' }` call `setOutcome(prev => prev ?? { kind: 'success' })`. Start `setTimeout(30000)` — on fire call `setOutcome(prev => prev ?? { kind: 'timeout' })`. Register `window.addEventListener('message', handler)` where `handler` checks `event.data?.type === 'paywall:refresh'` and triggers an **immediate poll** (calls the same fetch as the interval, awaited; if allowed, sets outcome); does NOT stop polling on receipt. (5) When `outcome` becomes non-null, `clearInterval` + `clearTimeout` + `removeEventListener('message', handler)`; on success update `entitlement` state to `{ status: 'allowed' }` and the consumer's gate transitions naturally. (6) On 30s timeout, leave `entitlement` unchanged and surface via `error: { kind: 'polling_timeout' }`. **Atomicity invariant:** `setOutcome(prev => prev ?? signal)` — first signal wins; subsequent are no-ops. All cleanup in a single `useEffect` cleanup callback. | New file `site/src/lib/paywall/hooks/useEntitlement.ts` | **T031, T032, T033, T034** (test-first: all 4 written RED before this impl), T015, T019 |
| **T031** | Write failing test for `useEntitlement` happy path: polling sees `allowed` within 30s — **RED** | Vitest with `vi.useFakeTimers()`. Stub `fetch` to return `{ status: 'tenant_no_subscription' }` on the first 2 polls then `{ status: 'allowed' }` on the third. Stub `window.open`. Call `result.current.triggerCheckout()`. Advance timers by 3000ms three times. Assert: `entitlement` ends at `{ status: 'allowed' }`; `error` null; only one fetch call AFTER the third poll (i.e., polling stopped); window.removeEventListener('message', ...) called. MUST FAIL until T030 is implemented. | Failing test (RED); passes after T030 | T015, T019 |
| **T032** | Write failing test for `useEntitlement` timeout path — **RED** | Vitest with fake timers. Stub `fetch` to always return `{ status: 'tenant_no_subscription' }`. Call `triggerCheckout()`. Advance timers by 31000ms. Assert: `error.kind === 'polling_timeout'`; interval cleared (no further fetch calls beyond the 10th); `entitlement` unchanged. MUST FAIL until T030 is implemented. | Failing test (RED); passes after T030 | T015, T019 |
| **T033** | Write failing test for `useEntitlement` postMessage triggers immediate poll, polling continues until allowed — **RED** | Vitest with fake timers. Stub `fetch` to return `{ status: 'tenant_no_subscription' }` for the first natural poll, then `{ status: 'allowed' }` on the immediate-poll triggered by postMessage. Call `triggerCheckout()`. Advance timers by 1000ms (postMessage arrives early). Dispatch a `MessageEvent` with `data: { type: 'paywall:refresh' }` on `window`. Assert: an immediate poll fires (fetch called); response is `allowed`; outcome resolved to success; polling stops; no waiting for the 3000ms interval to elapse. ALSO verify: a postMessage WITHOUT the matching type is ignored. MUST FAIL until T030 is implemented. | Failing test (RED); passes after T030 | T015, T019 |
| **T034** | Write failing test for `useEntitlement` atomicity: postMessage success + 30s timeout race resolves to first signal — **RED** | Vitest with fake timers. Stub `fetch` to return `{ status: 'allowed' }` so the immediate poll succeeds. Call `triggerCheckout()`. Advance to 29900ms (just before timeout). Dispatch postMessage `paywall:refresh`. Advance to 30100ms (timeout would fire). Assert: outcome is `success` (first signal wins; the timeout `setOutcome(prev => prev ?? {timeout})` is a no-op because prev is already success); `error` is null. MUST FAIL until T030 is implemented. | Failing test (RED); passes after T030 | T015, T019 |
| **T035** | Rewire `PaywallCheckoutDialog` to call `useEntitlement().triggerCheckout()` | Update `site/src/lib/paywall/PaywallCheckoutDialog.tsx`. Replace the placeholder "Got it" button with two buttons: primary `Subscribe — €0.99 lifetime` (calls `triggerCheckout`) + secondary `Cancel` (closes dialog via existing `<DialogClose>` wrapper). LOCKED COPY (do NOT redesign). During in-flight (the hook is in a checkout-fetch state — Developer adds a derived `isCheckingOut` flag from `useEntitlement`), primary button shows a spinner + text "Opening checkout..." and is disabled. Cancel stays ENABLED throughout — FR-8 + prd-minimal non-negotiable. On `error` from the hook, render the user-friendly message inline below the buttons using Blok's existing inline-error styling (look at `NoSubscriptionState.tsx` for a Blok-styled error pattern). On polling timeout, replace primary button text with "Subscribe — €0.99 lifetime" (re-enabled) and render non-blocking toast text "Your access may take a moment. Refresh the page if it doesn't update within a minute." Update the dialog's body copy per § 11 dialog-button-copy: "One-time payment. Unlimited seats. Lifetime access to the premium section." Remove the existing "Placeholder dialog. Real Stripe Checkout integration lands in PRD-001." footnote. | Updated `PaywallCheckoutDialog.tsx` | T030 |
| **T036** | Update `PaywallGate` to subscribe to `useEntitlement` for entitlement refresh | Edit `site/src/lib/paywall/PaywallGate.tsx`. Where the gate currently reads entitlement from `SupabaseStore.getEntitlement(...)` directly, additionally subscribe to the `entitlement` state from `useEntitlement()`. When the hook's `entitlement.status === 'allowed'`, re-evaluate the gate (the simplest implementation: a `key` change on the gate's subtree, OR a `useEffect` that re-runs the entitlement query when `entitlement` flips to allowed). Existing 4-state routing in the gate is unchanged. | Updated `PaywallGate.tsx` with `useEntitlement` consumption | T030 |
| **T037** | Implement `/paywall-return` page at `site/app/paywall-return/page.tsx` | Server component shell that mounts a client component. Create both: `site/app/paywall-return/page.tsx` (server) with `'use client'` content extracted to `site/app/paywall-return/PaywallReturnClient.tsx`. Server file: reads `session_id` query param via `searchParams`, passes as prop to client component. Client component (per FR-6 + ADR-0014): renders a minimal centered card with title "Confirming your access..." + a spinner using existing Blok primitives. On mount inside `useEffect`: try `window.opener?.postMessage({ type: 'paywall:refresh', sessionId }, process.env.NEXT_PUBLIC_PAYWALL_RETURN_ORIGIN ?? window.location.origin)`. Wrapping in `if (window.opener && !window.opener.closed) { ...post; setTimeout(() => window.close(), 500); } else { /* fall through */ }`. ALSO: `sessionStorage.setItem('paywall:lastCheckoutCompleted', String(Date.now()))` as a secondary signal (best-effort; cross-tab sessionStorage is commonly blocked). The fall-through path shows a static message "You can close this tab — your access is being applied." (no further interaction). | New files `site/app/paywall-return/page.tsx` + `site/app/paywall-return/PaywallReturnClient.tsx` | **T038** (test-first), T003 |
| **T038** | Write failing tests for `/paywall-return` page client: postMessage path + opener-null path — **RED** | Vitest with jsdom. Test 1: stub `window.opener = { closed: false, postMessage: vi.fn() }`; mount the client component; assert `postMessage` called with `{ type: 'paywall:refresh', sessionId: <prop> }` to the origin; assert `window.close` queued via `setTimeout`. Test 2: stub `window.opener = null`; mount; assert no postMessage called; assert the fall-through "You can close this tab" message renders; assert `sessionStorage.setItem('paywall:lastCheckoutCompleted', ...)` was still called. MUST FAIL until T037 is implemented. | Two failing tests (RED); pass after T037 | T003 |
| **T039** | Update `site/src/lib/paywall/index.ts` to export `useEntitlement` | Add the missing `useEntitlement` re-export from the barrel created in T026. | Barrel exports `useEntitlement` | T030, T026 |
| **T040** | [OPERATOR] Tranche C gate: REAL MONEY SMOKE — pay €0.99 from Cloud Portal iframe and watch iframe refresh | From the running `npm run dev` + `stripe listen` setup, open the Cloud Portal test app's iframe. Verify the gate evaluates to NoSubscriptionState (use `npm run seed:state no-subscription` to force if needed). Click the "View plans" button → PaywallCheckoutDialog opens with "Subscribe — €0.99 lifetime". Click Subscribe. A new tab opens with Stripe Checkout (€0.99 + optional automatic_tax if dashboard configured). Pay with `4242 4242 4242 4242`, any future MM/YY, any CVC. Stripe redirects to `/paywall-return`. Within 30 seconds, the iframe's gate transitions to AllowedState (welcome card). Screenshot the entire sequence (dialog → Stripe Checkout → return page → welcome card). If iframe doesn't refresh after 60 seconds: HARD FAIL — debug `stripe listen` output and `/api/webhooks/stripe` logs. If refresh works but >30s: soft fail — bump polling cap and document. | Manifest `smoke_outcomes.tranche_c` recorded; screenshots at `pocs/screenshots/prd-001-tranche-c-{dialog,checkout,return,welcome}.png`; **G1 SUCCESS CRITERION MET** | T035, T036, T037, T029 |

### Tranche D — Forward-compat webhook event handlers + dashboard webhook + ship-gate

| ID | Title | Description | Expected Output | Depends on |
|---|---|---|---|---|
| **T041** | Extend `/api/webhooks/stripe` to handle 5 forward-compat event types | Per FR-5 table. In the existing dispatch switch from T021, add cases for: (a) `'checkout.session.async_payment_succeeded'` — same upsert as `checkout.session.completed` (delayed bank-payment confirmation); (b) `'checkout.session.async_payment_failed'` — log warning, no DB write (user will retry); (c) `'customer.subscription.updated'` — extract subscription fields → update `tenants(plan, seats_total, status, period_end)`. Forward-compat only — one-time payments don't fire this. (d) `'customer.subscription.deleted'` — `update tenants set status='cancelled' where stripe_customer_id = ?` (keep period_end). (e) `'invoice.payment_failed'` — `update tenants set status='past_due' where stripe_customer_id = ?`. (Skip `invoice.payment_succeeded` and `customer.subscription.created` — not in this set per the revised tranche scoping; if Stripe sends them, the unknown-event fall-through returns 200 silently.) All handlers run on the service-role Supabase client; all complete in ≤5s (NFR-3). | Updated `site/app/api/webhooks/stripe/route.ts` with 5 new case branches | **T042** (test-first), T021 |
| **T042** | Write failing tests for 5 new webhook event handlers (one happy-path test per event type) — **RED** | Vitest. For each event type, stub a fake `Stripe.Event` with the expected shape; assert the corresponding `tenants` mutation is invoked with the right shape. For `async_payment_failed`, assert no DB write but a `console.warn` log. MUST FAIL until T041 is implemented. | 5 failing tests (RED); pass after T041 | T021 |
| **T043** | DCE grep test for `PAYWALL_DEV_OVERRIDE_USER_ID` still passes on 4b (PRD-000 NFR-5 continuation) | Already exists from PRD-000 as `npm run test:dce`. After Tranche A migration + Tranche B + C work, re-run from `site/`: `npm run test:dce`. Confirms the dev-override branch was tree-shaken out of production builds and the variable name does NOT appear in `.next/static/**/*.js`. If this regresses post-migration, the migration broke compile-time tree-shaking — debug before Tranche D ship. | `npm run test:dce` exits 0 | T040 |
| **T044** | [OPERATOR] Create real Stripe Dashboard webhook endpoint (OA-001-8) | Deploy a build to the staging Vercel URL (or use ngrok against `localhost:3000`). In Stripe Dashboard (test mode) → Developers → Webhooks → Add endpoint. URL: `https://<vercel-or-ngrok-url>/api/webhooks/stripe`. Select events to listen for: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Add. Copy the displayed signing secret. Update production env (Vercel project settings or `.env.local` if testing via ngrok) with `STRIPE_WEBHOOK_SIGNING_SECRET=whsec_<new>`. | Webhook endpoint exists in Stripe Dashboard; signing secret stored in env | T041, T043 |
| **T045** | [OPERATOR] Tranche D gate: Stripe Dashboard "Send test webhook" delivers all 6 event types → 200 each → idempotency + 400 signature rejection | From Stripe Dashboard webhooks → click the endpoint → "Send test webhook" for each of the 6 event types one at a time (`checkout.session.completed` + the 5 forward-compat). Verify each returns 200. Resend `checkout.session.completed` (same event ID): 200 silent (idempotency). Temporarily change `STRIPE_WEBHOOK_SIGNING_SECRET` to a deliberately wrong value, redeploy/restart, resend any test webhook: 400 (signature rejection). Restore correct secret. Screenshot the webhook delivery log showing 200/200/...with the resend visible. | `smoke_outcomes.tranche_d` set to `pass`; screenshot at `pocs/screenshots/prd-001-tranche-d-webhook-deliveries.png`; **G2 SUCCESS CRITERION MET** | T044 |

### Tranche E — Docs, ship-prep, PR

| ID | Title | Description | Expected Output | Depends on |
|---|---|---|---|---|
| **T046** | Update root `README.md` with "Stripe Setup" section | Add a new top-level section after the existing Supabase setup. 6 numbered steps: (1) Create Stripe account / pick existing; (2) Switch to test mode (toggle in upper-right of Stripe Dashboard); (3) Create Product + Price OR reuse the blueprint's defaults (`prod_UWKcVQmJH2MiSa` / `price_1TXHyIAHnDmxitZjwxHhKe8y` in operator's account, OR document the dashboard click-path: Products → Add Product → name "Paywall Blueprint Premium" → Price €0.99 EUR one-time); (4) API keys: Developers → API keys → copy `Publishable key` to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `Secret key` to `STRIPE_SECRET_KEY`; (5) Local dev webhook: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` → copy displayed `whsec_*` to `STRIPE_WEBHOOK_SIGNING_SECRET`; (6) Optional: Stripe Tax: Dashboard → Settings → Tax → Activate. Include a 4-row env-vars table (var, purpose, server-only?, default). Include test card guidance: `4242 4242 4242 4242` (success), `4000 0000 0000 9995` (insufficient funds), `4000 0025 0000 3155` (3D-Secure required). Inline the `stripe listen` command verbatim. Reference: the existing root README's tone + structure. | Updated `README.md` | T040, T045 |
| **T047** | Update root `README.md` "Known limitations of v1 / Adopter responsibilities" with new entries | Append after Stripe Setup section. Entries per PRD-001 § 12 Tranche D release notes: (a) `/api/entitlement` is UNAUTHENTICATED in v1; PRD-002 hardens via `host.user.sub` verification — adopters using this for production-sensitive tenant lists MUST add per-route auth (cite NFR-7). (b) Webhook event ordering: out-of-order events are not reconciled. Each event upserts independently. (c) `STRIPE_PRICE_ID` is not validated at boot — typo → first checkout fails at runtime with the FR-2 error translation. (d) `charge.refunded` is NOT handled (returns 200 silent); adopters who want refund-driven downgrade add a `charge.refunded` handler — document the extension pattern with a one-snippet example. (e) Cancel button stays enabled mid-flight; closing the dialog stops in-iframe polling but does NOT close the Stripe Checkout tab. (f) Cross-app Stripe accounts: orphan recovery is scoped by `metadata.app_slug = 'paywall-blueprint'` (ADR-0015) — adopters forking change this constant in `StripeProvider.ts`. | README has a "Known limitations" section with 6 entries | T046 |
| **T048** | Update `CHANGELOG.md` with `[0.2.0]` entry | Prepend to existing CHANGELOG.md: `## [0.2.0] — 2026-05-15 (PRD-001 — Stripe integration)`. Subsections: **Added** (StripeProvider, /api/checkout, /api/portal stub, /api/entitlement, /api/webhooks/stripe with 6 event types + signature verification + idempotency, useEntitlement hook with polling primary + postMessage best-effort, /paywall-return page, orphan recovery via metadata.app_slug, public API barrel at src/lib/paywall/index.ts, Stripe error translation, `automatic_tax: true` default); **Changed** (scaffold migrated 4a→4b in-place; PaywallCheckoutDialog primary button → "Subscribe — €0.99 lifetime" calling real Stripe; PaywallGate subscribes to useEntitlement for refresh); **Documented** (4 new Stripe env vars, README Stripe Setup section, Known limitations entries). Tag references: ADR-0012/0013/0014/0015. | Updated `CHANGELOG.md` with [0.2.0] entry | T040, T045 |
| **T049** | Refresh `docs/smoke-walkthrough.md` with PRD-001 Tranche A→D walks | Append (or replace existing PRD-000 walkthrough with PRD-000 + PRD-001 combined): four numbered walkthroughs corresponding to Tranches A/B/C/D operator gates. Each lists the exact commands run, expected output, screenshot references, and pass criteria. Include the ASCII flow diagram from PRD-001 § 11. Cross-reference the screenshots at `pocs/screenshots/prd-001-*`. | Updated `docs/smoke-walkthrough.md` | T040, T045 |
| **T050** | Final regression: lint + typecheck + test (full suite) + test:dce + test:env-leak + build | From `site/`, run all 6 commands in sequence; all MUST be green. Counts: tests ≥ 74 (existing) + new tests from T012/T013/T014/T016/T018/T020/T022/T023/T024/T025/T031/T032/T033/T034/T038/T042. Expected new test count: ~22+. Total expected: ≥ 96. | All commands exit 0; total test count logged | T041, T043 |
| **T051** | [OPERATOR] Push branch + open PR + auto-lite README/CHANGELOG inline (scope_dial.docs_at_ship) | `cd products/paywall-blueprint && git add . && git commit -m "PRD-001: Stripe direct integration (4a→4b, /api/*, useEntitlement, /paywall-return)"`. `git push -u origin prd-001`. Open PR at the public GitHub repo `https://github.com/Chris1415/Sitecore.Plugin.PaywallBlueprint`. PR description: tranche-by-tranche outcome summary + screenshot links + the 6 known-limitation bullets + reference to ADRs 0012–0015. `scope_dial.docs_at_ship: auto-lite` means /ship auto-emits README + CHANGELOG without invoking /document — both already updated in T046–T048; verify they land in the PR. | PR open + ready for review; manifest `implementation.status = ready_for_ship` | T046, T047, T048, T049, T050 |
| **T052** | [OPERATOR] Tranche E ship gate: merge PR + verify public release | Merge the PR into main. Verify `npm run build` from a fresh main checkout passes. Confirm screenshots in `pocs/screenshots/prd-001-*` are present in the merged tree. Tag release `v0.2.0` if the project uses tags. | PR merged; main green; **G3 SUCCESS CRITERION MET** | T051 |

## § 4a Goals (mirrored from PRD-001 § 3)

- **G1** — End-to-end test-mode payment smoke (Tranche C gate T040)
- **G2** — Webhook delivers + idempotency holds (Tranche D gate T045)
- **G3** — README + CHANGELOG + smoke-walkthrough refreshed + PR merged (Tranche E gate T052)

**Ship moment:** all three gates passed AND PR merged into main on the public repo.

## § 4b Important Test Cases (Task-ID-traceable; MUST-HAVE highlighted)

Each row: `(Task ID) — Scenario — Expected outcome`. Rows marked **[MUST-HAVE]** are the highest-risk behavioral assertions — the test pass cannot be declared green without these.

### Tranche A — Regression gate (no new test code; assertions are build-command exits)

| Task ID | Scenario | Expected outcome |
|---------|----------|-----------------|
| T002 | Baseline snapshot — 74 existing tests pass before migration | All four commands exit 0; test count logged |
| T004 | Post-4a→4b migration regression — full suite + build still green | 74+ tests pass; zero new failures; build artifact at `site/.next/` |
| T009 | Real-tenant iframe smoke — `/` and `/full-page` render identically to PRD-000 | Two screenshots committed; `smoke_outcomes.tranche_a` set to pass |

### Tranche B — Server-side (unit + integration; RED before GREEN)

| Task ID | Scenario | Expected outcome | Priority |
|---------|----------|-----------------|----------|
| T012a | `StripeProvider` orphan recovery — 0 candidates: `customers.create` called with `metadata.app_slug = 'paywall-blueprint'` + `metadata.tenant_id` | `customers.create` invoked; `customers.update` NOT invoked | **[MUST-HAVE]** |
| T012b | `StripeProvider` orphan recovery — 1 candidate matching `app_slug`: `customers.update` called with re-keyed `tenant_id`, `customers.create` NOT called | `customers.update` invoked with candidate ID; no create call | **[MUST-HAVE]** |
| T012c | `StripeProvider` orphan recovery — N>1 candidates: most-recently-created picked, `console.warn` emitted with discarded IDs | Most-recent candidate reused; warn log contains discarded Customer IDs | **[MUST-HAVE]** |
| T012d | `StripeProvider` `app_slug` cross-app safety — foreign-`app_slug` candidate in mock response is NOT selected | Foreign candidate excluded from consideration | **[MUST-HAVE]** |
| T013 | `StripeProvider.generatePortalUrl` throws with message containing "PRD-003" | Error thrown; not swallowed | normal |
| T014a | `StripeProvider.verifyWebhookSignature` — good signature: returns parsed `Stripe.Event` | Event returned | normal |
| T014b | `StripeProvider.verifyWebhookSignature` — bad signature: re-throws (not swallows) | Error propagated to caller | **[MUST-HAVE]** |
| T016a | `POST /api/checkout` — valid body → 200 `{ url }` | 200 with URL string | normal |
| T016b | `POST /api/checkout` — empty `tenantId` → 400 | 400 with validation error | **[MUST-HAVE]** |
| T016c | `POST /api/checkout` — Stripe throws `tax_settings_not_set` → 503 with user-friendly message | 503; message matches FR-2 table entry | **[MUST-HAVE]** |
| T016d | `POST /api/checkout` — Stripe throws `rate_limit` → 429 with user-friendly message | 429; message matches FR-2 table entry | normal |
| T018 | `POST /api/portal` → 501 `{ error: 'Customer Portal lands in PRD-003...' }` | 501; body matches | normal |
| T020a | `GET /api/entitlement?tenantId=t1` — allowed tenant → 200 `{ status: 'allowed' }` | 200 with allowed status | normal |
| T020b | `GET /api/entitlement?tenantId=t2` — no-subscription tenant → 200 `{ status: 'tenant_no_subscription' }` | 200 with correct status | normal |
| T020c | `GET /api/entitlement` — missing `tenantId` → 400 | 400 with error message | **[MUST-HAVE]** |
| T022 | `POST /api/webhooks/stripe` — `checkout.session.completed` happy path: `processed_events.insert` called + `tenants.upsert` with `status='active'`, `plan='premium'`, `period_end=null` | 200; both DB calls invoked with correct shapes | **[MUST-HAVE]** |
| T023 | `POST /api/webhooks/stripe` — same `event.id` replayed: second call returns 200 silently, `tenants.upsert` NOT called twice | 200 on replay; no double-upsert | **[MUST-HAVE]** |
| T024 | `POST /api/webhooks/stripe` — bad `Stripe-Signature` header → **400** (NOT 401); `console.error` with `[PaywallBlueprint]` prefix; no DB writes | 400; error logged; no `tenants.upsert` | **[MUST-HAVE]** |
| T025 | `POST /api/webhooks/stripe` — unhandled event type `charge.refunded` → 200 silently; `processed_events.insert` still called (idempotent retries) | 200; insert called; no `tenants.upsert` | **[MUST-HAVE]** |
| T027 | Build-time grep — `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SIGNING_SECRET` absent from `.next/static/**/*.js` | Script exits 0; no variable-name literals in client bundle | **[MUST-HAVE]** |
| T029 | End-to-end via `stripe listen` + `stripe trigger` — real `tenants` row upsert; idempotency on resend | New row in Supabase; resend returns 200 silent | **[MUST-HAVE]** |

### Tranche C — Client-side state machine (unit; RED before GREEN)

| Task ID | Scenario | Expected outcome | Priority |
|---------|----------|-----------------|----------|
| T031 | `useEntitlement` happy path — polling receives `{ status: 'allowed' }` on 3rd poll; state transitions; cleanup fires | `entitlement.status === 'allowed'`; `error` null; polling stops after success | **[MUST-HAVE]** |
| T032 | `useEntitlement` timeout — 30s / 10 polls elapse with no `allowed` response | `error.kind === 'polling_timeout'`; no further fetch calls after 10th poll | **[MUST-HAVE]** |
| T033 | `useEntitlement` postMessage — triggers immediate poll (does NOT stop polling); natural interval still fires | Immediate fetch on `paywall:refresh` message; interval not cancelled; outcome resolves on `allowed` | **[MUST-HAVE]** |
| T034 | `useEntitlement` atomicity — postMessage success fires at 29.9s; 30s timeout fires at 30.1s; outcome is `success` (first wins) | `error` null; `outcome.kind === 'success'`; timeout no-op | **[MUST-HAVE]** |
| T035a | `PaywallCheckoutDialog` — primary button calls `triggerCheckout` on click; opens returned URL via `window.open(url, '_blank')` | `window.open` called with URL from API response | **[MUST-HAVE]** |
| T035b | `PaywallCheckoutDialog` — Cancel button remains ENABLED during in-flight checkout | Cancel button not disabled when `isCheckingOut` is true | **[MUST-HAVE]** |
| T035c | `PaywallCheckoutDialog` — keyboard reachability: both Subscribe and Cancel reachable via Tab; spinner announces loading state via ARIA | `aria-busy` or `aria-label` on spinner; both buttons focusable by keyboard | normal |
| T038a | `/paywall-return` client — opener present: `window.opener.postMessage` called with `{ type: 'paywall:refresh', sessionId }` + `window.close` queued | postMessage called; close queued | **[MUST-HAVE]** |
| T038b | `/paywall-return` client — opener null: no postMessage; "You can close this tab" text renders; `sessionStorage.setItem('paywall:lastCheckoutCompleted', ...)` called | Fallback text visible; sessionStorage written; no postMessage | **[MUST-HAVE]** |
| T040 | REAL MONEY SMOKE — iframe → Subscribe → Stripe Checkout → pay 4242 4242 4242 4242 → iframe refreshes to AllowedState within 30s | G1 met; screenshots committed | **[MUST-HAVE]** |

### Tranche D — Forward-compat handlers + compile-time integrity (unit + grep)

| Task ID | Scenario | Expected outcome | Priority |
|---------|----------|-----------------|----------|
| T042a | `customer.subscription.updated` event handler — updates `tenants.plan`, `status`, `period_end` | `tenants.update` called with correct fields | normal |
| T042b | `customer.subscription.deleted` event handler — sets `tenants.status = 'cancelled'`; keeps `period_end` | `status = 'cancelled'` in upsert; period_end preserved | normal |
| T042c | `invoice.payment_failed` event handler — sets `tenants.status = 'past_due'` | `status = 'past_due'` in update | normal |
| T042d | `checkout.session.async_payment_succeeded` handler — same upsert as `checkout.session.completed` | `status = 'active'`, `plan = 'premium'` upserted | normal |
| T042e | `checkout.session.async_payment_failed` handler — no DB write; `console.warn` logged | No `tenants` mutation; warn log emitted | normal |
| T043 | DCE grep — `PAYWALL_DEV_OVERRIDE_USER_ID` absent from `.next/static/**/*.js` after 4b build | Script exits 0; PRD-000 tree-shaking contract still holds post-migration | **[MUST-HAVE]** |
| T045 | Stripe Dashboard "Send test webhook" — all 6 event types return 200; resend → 200 silent; wrong signing secret → 400 | G2 met; webhook delivery log screenshot committed | **[MUST-HAVE]** |

### Tranche E — Regression gate

| Task ID | Scenario | Expected outcome |
|---------|----------|-----------------|
| T050 | Full suite: lint + typecheck + all tests + test:dce + test:env-leak + build | All 6 commands exit 0; total test count ≥ 96 (74 baseline + ≥ 22 new) |

## § 4c Implementation Execution Contract (the Developer's complete contract)

### § 4c-1 Non-negotiable technical boundaries

- **Webhook signature verification:** every POST to `/api/webhooks/stripe` MUST verify via `stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)`. On throw → **400 Bad Request** (NOT 401 — Stripe does not retry 4xx; we must signal "malformed and not retryable"). No exceptions. `console.error('[PaywallBlueprint] webhook signature verification failed', err)` on the failure path. Raw body MUST be read via `await request.text()` BEFORE any JSON parse — signature verification requires the byte-exact body.
- **Webhook idempotency:** `INSERT INTO processed_events(event_id) VALUES ($1) ON CONFLICT DO NOTHING` semantics. On unique-violation (PostgREST code `23505`) → return 200 silently, no further processing, no `tenants.upsert`. Implements US-4.
- **Webhook handler latency:** ≤ 5 seconds total — Stripe retries on >5s. Means one Supabase upsert per dispatch case; no external API calls in the hot path.
- **`/api/checkout` orphan recovery (ADR-0015 revised):** check `tenants.stripe_customer_id` first; if missing, `stripe.customers.list({ email, limit: 10 })` → filter by `metadata.app_slug === 'paywall-blueprint'` → sort by `created` desc → pick most-recently-created if N>1 (log discards as `console.warn` with `[PaywallBlueprint]` prefix) → update `metadata.tenant_id` to current value. If 0 candidates → `stripe.customers.create({ email, metadata: { tenant_id, app_slug: 'paywall-blueprint' } })`. The `app_slug` scoping is the structural fix for cross-app Customer clobbering when one Stripe account hosts multiple Marketplace apps.
- **`/api/checkout` idempotency key:** `stripe.checkout.sessions.create(params, { idempotencyKey: tenantId })` — dedupes concurrent calls per tenant per R3.
- **`automatic_tax: { enabled: true }` in every Checkout Session config** (NFR-9). Adopters disable via one-line change in `StripeProvider.ts`. Operator's dashboard may or may not have Tax enabled — runtime error is translated to user-friendly message via FR-2 table.
- **Server-only env vars (NFR-6):** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SIGNING_SECRET` MUST NEVER appear in `.next/static/`. Enforced by the `test:env-leak` build-time grep (T027). `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is client-readable by intent.
- **`useEntitlement` polling is load-bearing (ADR-0014 revised):** 3-second interval × 10 polls = 30-second cap. PostMessage is **best-effort sugar that triggers an immediate poll** but does NOT stop polling. Only `status === 'allowed'` from a poll OR the 30s timeout stops it. **Atomicity:** single `useState<{kind:'success'\|'timeout'}\|null>(null)`; `setState(prev => prev ?? signal)` — first signal wins, subsequent calls are no-ops; cleanup is unconditional on either outcome.
- **`/api/entitlement` is UNAUTHENTICATED in v1 (NFR-7):** uses `SUPABASE_SECRET_KEY` (service-role; bypasses RLS per ADR-0009). README explicitly documents this as a known limitation; PRD-002 hardens via `host.user.sub` verification against the requested `tenantId`. Do NOT add auth in PRD-001 — the model is overlapped with seat enforcement and must land cleanly once in PRD-002.
- **Dialog Cancel stays enabled mid-flight.** Closing the dialog stops the in-iframe polling but does NOT close the Stripe Checkout tab. If user later completes payment in the still-open tab, next gate evaluation reflects it. Documented in README.
- **Unhandled Stripe event types → 200 silently** (FR-5 fall-through). `processed_events.insert` STILL runs first so retries are idempotent. The dispatch switch has explicit `case` arms for the 6 handled types and a `default: console.log('[PaywallBlueprint] unhandled event:', event.type); return 200;` branch. Adopters who want refund handling add a `charge.refunded` case.
- **Public API barrel at `site/src/lib/paywall/index.ts` is canonical.** Deep-path imports stay legal for adopters who need them, but the barrel is what README + the adopter-facing examples use.
- **`PaywallCheckoutDialog` button copy is LOCKED:** primary "Subscribe — €0.99 lifetime", secondary "Cancel". Spinner during in-flight. Do NOT redesign during implementation.
- **No new database tables, no schema migrations.** `tenants` and `processed_events` exist from PRD-000. PRD-001 populates `tenants.stripe_customer_id` (was NULL) and exercises `processed_events.event_id UNIQUE` for the first time.

### § 4c-2 ADR one-liners (all 15 ADRs, what each binds in PRD-001)

- **ADR-0001** (Use ADRs as architecture backbone) — All architectural decisions in this PRD are recorded as ADRs 0012–0015; do not add new ADRs without consulting the Software Architect.
- **ADR-0002** (EntitlementStore + EntitlementSeed split) — `/api/entitlement` reuses the existing `SupabaseStore.getEntitlement` shape; do NOT add seed methods to the production store; PRD-001 adds no methods to `EntitlementStore` (webhook handler writes directly via the supabase client, not via the abstraction).
- **ADR-0003** (PaymentProvider adapter; Stripe direct as v1) — `StripeProvider` is the first concrete implementation; method signatures match the existing type-only interface at `src/lib/paywall/types.ts`; do NOT change the interface — extend it only in PRD-003.
- **ADR-0004** (Env-flag signaled pass-through, "Paywall disabled — demo mode" banner) — UNCHANGED in PRD-001; the env-flag toggle's behavior is orthogonal to Stripe; do not touch `DemoModeBanner.tsx`.
- **ADR-0005** (Scaffold 4a in PRD-000) — SUPERSEDED by ADR-0013 in this PRD; T003 performs the migration.
- **ADR-0006** (Custom app registration) — UNCHANGED; PRD-001 ships to the same custom app, not a public listing.
- **ADR-0007** (Single generic skeleton sized to largest state) — UNCHANGED; `SkeletonState` is untouched in PRD-001.
- **ADR-0008** (Context-readiness via MarketplaceProvider resolution) — `useEntitlement` and `PaywallGate` both consume `application.context.marketplaceAppTenantId` + `host.user` via the existing provider hook; do NOT add a direct `client.query` call.
- **ADR-0009** (Supabase RLS permissive default) — `/api/entitlement` uses the SERVICE-ROLE key (bypasses RLS) per NFR-7; webhook handler also service-role; client-side reads continue to use anon key (unchanged).
- **ADR-0010** (Supabase setup via SQL block) — UNCHANGED; PRD-001 adds no new tables, so no new SQL block is needed.
- **ADR-0011** (Tenant-only entitlement in PRD-000) — UNCHANGED; PRD-001 does NOT add seat enforcement; `userId` parameter on `getEntitlement` remains accepted-but-ignored.
- **ADR-0012** (Stripe Price model: one-time €0.99 EUR lifetime) — `mode: 'payment'`, single line item with `STRIPE_PRICE_ID`, no `subscription_data`; `tenants.status = 'active'`, `period_end = null` after a successful one-time checkout (means "never expires"); subscription event handlers ship as forward-compat no-ops in PRD-001 except where they update existing rows.
- **ADR-0013** (Scaffold migration 4a → 4b) — T003 applies the canonical full-stack quickstart IN-PLACE; rule `50-scaffold.mdc` applies (literal command; HARD STOP on failure; never hand-write `next.config.mjs` overrides from training data).
- **ADR-0014** (Iframe success-return — polling primary, postMessage best-effort sugar) — `useEntitlement` orchestrates per the revised contract: polling is load-bearing, postMessage triggers an *immediate* poll (does NOT stop polling), atomicity via `setState(prev => prev ?? signal)`, cleanup on first outcome.
- **ADR-0015** (Stripe Customer orphan recovery via `metadata.app_slug` + multi-candidate handling) — `findOrCreateStripeCustomer` in `StripeProvider`: DB-first lookup → `customers.list({ email, limit: 10 })` → filter by `metadata.app_slug === 'paywall-blueprint'` → sort by `created` desc → re-key `metadata.tenant_id` on the picked candidate → log discards.

### § 4c-3 Stack / tooling specifics

- **Package manager:** `npm` (lockfile at `site/package-lock.json` is the source of truth). Do NOT switch to `pnpm` / `yarn`.
- **Test runner:** Vitest (`site/vitest.config.ts`; jsdom environment; `passWithNoTests: true`; setup file `vitest.setup.ts`).
- **Build:** `npm run build` from `site/` (Next.js 16.1.7 with Turbopack dev).
- **Lint + typecheck:** `npm run lint` + `npm run typecheck` from `site/`.
- **Existing test scripts:** `npm run test:dce` (DCE grep for `PAYWALL_DEV_OVERRIDE_USER_ID` — keep passing through migration).
- **New test scripts (added in PRD-001):** `npm run test:env-leak` (T027) — grep `.next/static/**` for server-only Stripe secrets.
- **Scaffold migration command (Tranche A T003):** `npx shadcn@latest add https://blok.sitecore.com/r/marketplace/next/quickstart-with-full-stack-xmc.json --cwd site --yes` — applied IN-PLACE from the product root over the existing 4a scaffold. Per skill `sitecore:setup-marketplace-full-stack` + ADR-0013 + rule `50-scaffold.mdc`. HARD STOP if the command fails or overwrites existing files with diverging content; report and request operator decision.
- **Stripe SDK install (Tranche A T005):** `cd site && npm install stripe`. Latest stable; do NOT pin to a specific version.
- **Local Stripe webhook listener (Tranche B T029):** `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — operator installs Stripe CLI separately (T028 / OA-001-7).
- **Trigger test events:** `stripe trigger checkout.session.completed` (and `subscription.updated`, `subscription.deleted`, `invoice.payment_failed` for forward-compat tests).
- **`.env.example` is committed; `.env.local` is gitignored.** Operator manages `.env.local` outside git.
- **Env-var leak grep test (T027 / Tranche B):** `bash site/scripts/test-stripe-env-leak.sh` — runs `npm run build` then greps `.next/static/**/*.js` for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SIGNING_SECRET` variable-name literals; exits 0 if no matches, 1 otherwise.
- **Node.js:** matches existing PRD-000 scaffold (Node 22+ implied by Next 16). No bump needed.
- **TypeScript strict mode** — enabled in `tsconfig.json`; do NOT add `// @ts-ignore` or `as any` in new code; if a Stripe SDK type is genuinely incorrect, file a comment + use a narrowing helper.
- **Branch:** `prd-001`, already checked out at `products/paywall-blueprint/`. Stacked-PRD branching N/A (PRD-000 already merged + closed).
- **Commit cadence:** one commit per task is acceptable; bundle related task commits where the diff is small. Final PR squashes if reviewer prefers — operator decides at T051.

### § 4c-4 UI implementation notes

- **Visual source of truth:** POC `pocs/poc-v1-prd000/` (PRD-000's clickdummy). `state-no-subscription.html` and `state-allowed.html` are the surfaces touched by PRD-001 — the dialog opens from NoSubscriptionState's "View plans" CTA; AllowedState is the welcome card that the iframe transitions to after payment. **Do NOT redesign the POC visuals** in PRD-001.
- **`PaywallCheckoutDialog` updates (T035):**
  - Title: `"Unlock for €0.99"` (unchanged from PRD-000; do not redesign)
  - Body: `"One-time payment. Unlimited seats. Lifetime access to the premium section."` (replaces existing placeholder body)
  - Primary button: `"Subscribe — €0.99 lifetime"` (replaces placeholder `"Got it"`); calls `useEntitlement().triggerCheckout()` on click
  - Secondary button: `"Cancel"` — stays ENABLED throughout in-flight checkout; closes dialog only
  - During in-flight: primary shows spinner + text `"Opening checkout..."` + disabled state
  - On error: primary re-enables; inline error text below the buttons using the user-friendly message from FR-2 translation table
  - On polling timeout: primary text reverts to `"Subscribe — €0.99 lifetime"`; non-blocking toast text `"Your access may take a moment. Refresh the page if it doesn't update within a minute."`
  - Remove existing placeholder footnote `"Placeholder dialog. Real Stripe Checkout integration lands in PRD-001."`
- **Blok primitives unchanged:** `@blok/dialog` (Radix-backed), `@blok/button`. Spinner uses existing in-button spinner pattern from PRD-000 — Developer reuses the same component used in `NoSubscriptionState.tsx` if one exists, OR uses a lucide-react `Loader2` with `animate-spin`. No new Blok primitive installs needed.
- **`/paywall-return` page visual:**
  - Centered card (max-width ~400px), padded, dropshadowed per Blok defaults
  - Title: `"Confirming your access..."`
  - Below: spinner (~24px) + muted text `"Returning to app..."`
  - Fall-through (opener-null) text: `"You can close this tab — your access is being applied."`
  - Visual is intentionally minimal — Stripe Checkout's own branded success UI is the primary visual; this is a transient bridge page.
- **`DemoModeBanner` and the 4 state components remain UNCHANGED** in PRD-001 — env-flag behavior is orthogonal; state component copy and accessibility are PRD-000-locked.
- **No new screenshots in POC** — PRD-001 reuses PRD-000's POC. Smoke screenshots (Tranches A/B/C/D) go to `pocs/screenshots/prd-001-*.png` (not the POC directory).

### § 4c-5 File / module structure

**New files (created in PRD-001):**

- `site/app/api/checkout/route.ts` — POST handler
- `site/app/api/checkout/route.test.ts` — Vitest tests
- `site/app/api/portal/route.ts` — POST handler (501 stub)
- `site/app/api/portal/route.test.ts` — Vitest tests
- `site/app/api/entitlement/route.ts` — GET handler
- `site/app/api/entitlement/route.test.ts` — Vitest tests
- `site/app/api/webhooks/stripe/route.ts` — POST handler
- `site/app/api/webhooks/stripe/route.test.ts` — Vitest tests
- `site/app/paywall-return/page.tsx` — server component shell
- `site/app/paywall-return/PaywallReturnClient.tsx` — client component (mount handler + postMessage + sessionStorage)
- `site/app/paywall-return/PaywallReturnClient.test.tsx` — Vitest tests
- `site/src/lib/paywall/providers/StripeProvider.ts` — first concrete `PaymentProvider`
- `site/src/lib/paywall/providers/StripeProvider.test.ts` — Vitest tests
- `site/src/lib/paywall/hooks/useEntitlement.ts` — orchestrates checkout + polling + postMessage
- `site/src/lib/paywall/hooks/useEntitlement.test.ts` — Vitest tests
- `site/src/lib/paywall/stripe-errors.ts` — error-translation table
- `site/src/lib/paywall/index.ts` — barrel export of adopter-facing public API
- `site/scripts/test-stripe-env-leak.sh` — build-time env-var leak grep

**Modified files:**

- `site/src/lib/paywall/PaywallCheckoutDialog.tsx` — replace placeholder button with Subscribe/Cancel; wire to `useEntitlement().triggerCheckout()`; spinner + error + timeout handling
- `site/src/lib/paywall/PaywallGate.tsx` — subscribe to `useEntitlement` for entitlement refresh after successful checkout
- `site/.env.example` — append 4 new Stripe env vars
- `site/package.json` — add `stripe` dependency (T005); add `test:env-leak` script (T027)
- `site/next.config.mjs` — any merges from the full-stack quickstart (T003 produces the diff)
- `products/paywall-blueprint/README.md` — Stripe Setup section + Known limitations entries (T046, T047)
- `products/paywall-blueprint/CHANGELOG.md` — `[0.2.0]` entry (T048)
- `products/paywall-blueprint/docs/smoke-walkthrough.md` — Tranche A→D walkthroughs (T049)
- `products/paywall-blueprint/project-planning/workflow/current-run.json` — `smoke_outcomes` per tranche (T009, T029, T040, T045); `implementation.current_tranche` advancement

**Untouched / forbidden to modify in PRD-001:**

- `site/src/lib/paywall/states/*.tsx` (4 denial states + skeleton + their tests)
- `site/src/lib/paywall/DemoModeBanner.tsx` + its test
- `site/src/lib/paywall/types.ts` (interface contract is locked; do NOT extend `PaymentProvider` in PRD-001)
- `site/src/lib/paywall/stores/SupabaseStore.ts` (if construction is anon-key-only and `/api/entitlement` needs service-role, prefer creating a small new helper in `/api/entitlement/route.ts` rather than refactoring SupabaseStore)
- `site/src/lib/paywall/preview-state.ts`
- POC at `pocs/poc-v1-prd000/`
- All ADRs 0001–0011

**Naming conventions:**

- API routes: kebab-case folder + `route.ts` (App Router); test files: `route.test.ts` co-located
- React components: PascalCase file + named export matching file name
- Hooks: camelCase starting with `use*`; file matches hook name
- Co-located tests: `<file>.test.ts(x)` next to the source
- Stripe constants (Customer scope tag): `const APP_SLUG = 'paywall-blueprint'` at the top of `StripeProvider.ts`

### § 4c-6 Integration and API contract notes

**Sitecore Marketplace SDK shapes (LOCKED from PRD-000 fixtures; cited from `sitecore:marketplace-sdk-client`):**

- `application.context` query response: `{ marketplaceAppTenantId: string, ... }` — `marketplaceAppTenantId` is the entitlement key throughout. Per PRD-000 fixture capture; do NOT rename or alias.
- `host.user` query response: Auth0 claims `{ sub: string, email?: string, ... }` — `email` may be absent; handle the absent case in `/api/checkout` body validation (request 400 if userEmail missing).
- Both queries are read via the existing `MarketplaceProvider` hook (per ADR-0008); `useEntitlement` and `PaywallGate` consume them — do NOT add a direct `client.query(...)` call.

**Stripe Node SDK shapes (deferred-then-captured per architect's SDK-contract note; T006 captures `.d.ts` paths after `npm install stripe` in T005):**

- Pre-install reference (PRE-T006): `https://stripe.com/docs/api` for `checkout.sessions.create`, `customers.list`, `customers.create`, `customers.update`, `customers.retrieve`, `webhooks.constructEvent`, `subscriptions` (forward-compat in event handlers), `billingPortal.sessions.create` (PRD-003 stub — used only to throw a "PRD-003" error in `generatePortalUrl`).
- **Post-T006 inline `.d.ts` citations (to be filled by Developer in T006):**
  - `stripe.checkout.sessions.create` — request: `// shape: node_modules/stripe/types/Checkout/SessionCreateParams.d.ts → Stripe.Checkout.SessionCreateParams`; response: `// shape: node_modules/stripe/types/Checkout/Sessions.d.ts → Stripe.Checkout.Session`
  - `stripe.customers.list` — request: `// shape: node_modules/stripe/types/Customers.d.ts → Stripe.CustomerListParams`; response: `// shape: node_modules/stripe/types/Customers.d.ts → Stripe.ApiList<Stripe.Customer>`
  - `stripe.customers.create` — request: `// shape: node_modules/stripe/types/Customers.d.ts → Stripe.CustomerCreateParams`; response: `// shape: node_modules/stripe/types/Customers.d.ts → Stripe.Customer`
  - `stripe.customers.update` — `// shape: node_modules/stripe/types/Customers.d.ts → Stripe.CustomerUpdateParams` / `Stripe.Customer`
  - `stripe.customers.retrieve` — `// shape: node_modules/stripe/types/Customers.d.ts → Stripe.Customer | Stripe.DeletedCustomer`
  - `stripe.webhooks.constructEvent` — `// shape: node_modules/stripe/types/Webhooks.d.ts → Stripe.Event` (throws on bad sig)
  - Event types — `// shape: node_modules/stripe/types/Events.d.ts → Stripe.Event` (discriminated union of `Stripe.CheckoutSessionCompletedEvent`, `Stripe.CustomerSubscriptionUpdatedEvent`, `Stripe.CustomerSubscriptionDeletedEvent`, `Stripe.InvoicePaymentFailedEvent`, etc.). The `.d.ts` exact filename may vary by Stripe SDK version — Developer captures real paths during T006 and updates this section in place.
  - `stripe.billingPortal.sessions.create` (PRD-003 stub forward-compat reference) — `// shape: node_modules/stripe/types/BillingPortal/SessionCreateParams.d.ts → Stripe.BillingPortal.SessionCreateParams`
- **Verified shape contract for `Stripe.Checkout.Session.metadata`:** `Record<string, string> | null` — keys MUST be strings (no nested objects); use `metadata.tenant_id` (snake_case) on Stripe's side; internal TypeScript code may map to camelCase at the boundary.
- **Webhook signature:** the `stripe-signature` header carries `t=<timestamp>,v1=<sig>,v0=<sig>`; `stripe.webhooks.constructEvent` does all of the parsing — do NOT roll your own.
- **Stripe Customer `metadata.app_slug` is the scope-tag invariant (ADR-0015):** Stripe's API allows arbitrary string keys; our convention is `metadata = { tenant_id: string, app_slug: 'paywall-blueprint' }`. The `app_slug` value is a project constant (not configurable); adopters forking the blueprint MUST change this constant to match their app (one-line change in `StripeProvider.ts` per the README "Known limitations / Adopter responsibilities" entry).

**Supabase client (`@supabase/supabase-js`) shapes (LOCKED from PRD-000):**

- Service-role client construction: `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })` — bypasses RLS; used by `/api/entitlement` and `/api/webhooks/stripe`. Existing pattern in `SupabaseStore.ts` if construction is anon-only — Developer either imports + extends or creates a small helper at `site/app/api/_lib/supabase-server.ts` (preferred; keeps SupabaseStore unchanged).
- `tenants` row shape: `{ tenant_id: string, stripe_customer_id: string | null, subscription_id: string | null, plan: string, seats_total: number, status: 'active'\|'cancelled'\|'past_due', period_end: string | null, created_at: string, updated_at: string }`.
- `processed_events` row shape: `{ event_id: string (PRIMARY KEY UNIQUE), processed_at: string }`.
- Upsert: `.from('tenants').upsert({...}, { onConflict: 'tenant_id' })`.
- Unique-violation detection: response `error.code === '23505'` (Postgres `unique_violation`).

**Internal API contracts (PRD-001 declares):**

- `POST /api/checkout` — req: `{ tenantId: string, userEmail: string }`; res 200: `{ url: string }`; res 400: `{ error: string }` (validation); res 429/503: `{ error: string }` (Stripe error translation per FR-2)
- `POST /api/portal` — req: any (ignored); res 501: `{ error: 'Customer Portal lands in PRD-003. See README.' }`
- `GET /api/entitlement?tenantId=<>&userId=<>` — res 200: `EntitlementResult` (the existing discriminated union from PRD-000); res 400: `{ error: 'tenantId required' }`
- `POST /api/webhooks/stripe` — req: raw body + `stripe-signature` header; res 200: silent on success or idempotent replay; res 400: `{ error: 'invalid signature' }`

**Extended API contract detail (added by QA enrichment — feed into RED test fixtures):**

- **`POST /api/checkout` full response shape (RED test fixture anchor):**
  ```typescript
  // Success path — dialog calls window.open(url, '_blank') with this value:
  // res 200: { url: string }  — e.g. "https://checkout.stripe.com/pay/cs_test_..."
  // Fixture source: PRD-000 T013 Marketplace SDK capture (tenantId from application.context.marketplaceAppTenantId)
  ```
  Tests for T016 MUST assert the `url` property is a non-empty string. The dialog's `window.open` call depends on this shape being exact.

- **`GET /api/entitlement` response shape for polling contract (RED test fixture anchor):**
  ```typescript
  // The useEntitlement hook polls this endpoint and checks response.status:
  type EntitlementResult =
    | { status: 'allowed' }
    | { status: 'tenant_no_subscription' }
    | { status: 'seats_full' }
    | { status: 'user_unassigned' };
  // Polling stops ONLY when status === 'allowed'
  // Fixture source: PRD-000 SupabaseStore.getEntitlement discriminated union (inherited; do NOT change shape in PRD-001)
  ```
  Tests for T020 and T031–T034 MUST fixture against this union. Any extra fields are allowed (additive-safe) but the `status` discriminant is the contract.

- **Stripe `Stripe.Event` discriminator field (event.type strings; captured post-T006):**
  The `event.type` field is the dispatch key in the webhook handler. Known values for the 6 handled event types:
  ```
  'checkout.session.completed'             — captured: post-T006
  'checkout.session.async_payment_succeeded' — captured: post-T006
  'checkout.session.async_payment_failed'    — captured: post-T006
  'customer.subscription.updated'           — captured: post-T006
  'customer.subscription.deleted'           — captured: post-T006
  'invoice.payment_failed'                  — captured: post-T006
  ```
  Pre-T006 tests (T022–T025) must use these literal string values as the `event.type` in stubs. After T006 completes, verify these strings are present as discriminant values in `node_modules/stripe/types/Events.d.ts` (or equivalent path). Tests are expected to pass unchanged; this is a verification step, not a fix step.
  Fixture provenance: `https://stripe.com/docs/api/events/types` (pre-T006); `// source: node_modules/stripe/types/Events.d.ts` (post-T006 annotation to be added in T006).

### § 4c-7 Parity / rebuild pointers

**N/A — greenfield feature work on a shipped product.** PRD-001 has `source.kind: raw_idea` and `source.analysis_mode: greenfield` per `current-run.json`. The "parity" reference is the PRD-000 codebase as it shipped 2026-05-15 — that is the *base*, not a *legacy system to mirror*. No source analysis artifact exists; none is needed.

## § 5 Execution Order

**TDD ordering enforced by QA enrichment (07).** For every implementation task that has a test-pair, the test task appears BEFORE the implementation task. The Developer writes the failing test (RED), confirms it fails, then writes the implementation to make it GREEN, then refactors. Operator-action tasks (`[OPERATOR]`) interrupt for manual gates as before.

1. **T001** [OPERATOR] Confirm Stripe Tax dashboard toggle decision
2. **T002** Snapshot regression baseline before migration
3. **T003** Apply full-stack quickstart in-place (4a→4b)
4. **T004** Verify migration regression: lint + typecheck + test + build green
5. **T005** Install `stripe` Node SDK
6. **T006** Capture `stripe` SDK `.d.ts` paths and update § 4c-6 citations
7. **T007** Update `site/.env.example` with 4 new Stripe env vars
8. **T008** Populate operator's `site/.env.local` with Stripe test-mode keys
9. **T009** [OPERATOR] Tranche A gate: real-tenant iframe smoke verification
10. **T010** Add Stripe error-translation table at `site/src/lib/paywall/stripe-errors.ts`
11. **T012** Write failing tests for `StripeProvider` orphan-recovery branches (0/1/N) — RED ← *test-first; T011 not yet written*
12. **T013** Write failing test for `StripeProvider.generatePortalUrl` throws — RED
13. **T014** Write failing tests for `StripeProvider.verifyWebhookSignature` good + bad — RED
14. **T011** Implement `StripeProvider` to make T012/T013/T014 GREEN
15. **T016** Write failing tests for `/api/checkout` happy + 400 + 503 + 429 — RED ← *test-first; T015 not yet written*
16. **T015** Implement `/api/checkout` route to make T016 GREEN
17. **T018** Write failing test for `/api/portal` returns 501 — RED
18. **T017** Implement `/api/portal` route to make T018 GREEN
19. **T020** Write failing tests for `/api/entitlement` happy + 400 — RED
20. **T019** Implement `/api/entitlement` route to make T020 GREEN
21. **T022** Write failing test for webhook `checkout.session.completed` upserts tenants row — RED
22. **T023** Write failing test for webhook idempotency (same event_id → 200 silent) — RED
23. **T024** Write failing test for webhook signature mismatch → 400 — RED
24. **T025** Write failing test for unknown event type → 200 silent — RED
25. **T021** Implement `/api/webhooks/stripe` route to make T022/T023/T024/T025 GREEN
26. **T026** Create `site/src/lib/paywall/index.ts` barrel export
27. **T027** Build-time grep test for env-var leakage (self-testing: script is the test)
28. **T028** [OPERATOR] Install Stripe CLI
29. **T029** [OPERATOR] Tranche B gate: `stripe listen` connects + `stripe trigger` upserts
30. **T031** Write failing test for `useEntitlement` happy path (polling sees allowed) — RED ← *test-first; T030 not yet written*
31. **T032** Write failing test for `useEntitlement` timeout path — RED
32. **T033** Write failing test for `useEntitlement` postMessage triggers immediate poll — RED
33. **T034** Write failing test for `useEntitlement` atomicity (first signal wins) — RED
34. **T030** Implement `useEntitlement` hook to make T031/T032/T033/T034 GREEN
35. **T035** Rewire `PaywallCheckoutDialog` (tests live alongside; wire after hook is GREEN)
36. **T036** Update `PaywallGate` to subscribe to `useEntitlement`
37. **T038** Write failing tests for `/paywall-return` postMessage + opener-null — RED
38. **T037** Implement `/paywall-return` page to make T038 GREEN
39. **T039** Update `site/src/lib/paywall/index.ts` to export `useEntitlement`
40. **T040** [OPERATOR] Tranche C gate: REAL MONEY SMOKE (G1)
41. **T042** Write failing tests for 5 forward-compat webhook event handlers — RED
42. **T041** Implement 5 forward-compat handlers in `/api/webhooks/stripe` to make T042 GREEN
43. **T043** DCE grep test still passes on 4b
44. **T044** [OPERATOR] Create real Stripe Dashboard webhook endpoint
45. **T045** [OPERATOR] Tranche D gate: Dashboard "Send test webhook" all 6 + idempotency + 400 (G2)
46. **T046** Update root `README.md` with "Stripe Setup" section
47. **T047** Update README "Known limitations of v1" entries
48. **T048** Update `CHANGELOG.md` with `[0.2.0]` entry
49. **T049** Refresh `docs/smoke-walkthrough.md`
50. **T050** Final regression: all green
51. **T051** [OPERATOR] Push branch + open PR + auto-lite docs
52. **T052** [OPERATOR] Tranche E ship gate: merge PR (G3)

**Test-first pairs summary (reordered by QA):**

| Test task (RED first) | Implementation task (GREEN) | Change from Lead Developer ordering |
|-----------------------|-----------------------------|--------------------------------------|
| T012/T013/T014 | T011 `StripeProvider` | T011 moved AFTER its tests |
| T016 | T015 `/api/checkout` | T015 moved AFTER T016 |
| T018 | T017 `/api/portal` | T017 moved AFTER T018 |
| T020 | T019 `/api/entitlement` | T019 moved AFTER T020 |
| T022/T023/T024/T025 | T021 `/api/webhooks/stripe` | T021 moved AFTER its 4 test tasks |
| T031/T032/T033/T034 | T030 `useEntitlement` | T030 moved AFTER its tests |
| T038 | T037 `/paywall-return` | T037 moved AFTER T038 |
| T042 | T041 forward-compat handlers | T041 moved AFTER T042 |

## ADR Candidates from Task Planning

None. PRD-001's architectural decisions are fully covered by ADRs 0012–0015 (and the inherited ADRs 0001–0011). The /architect ADR-density scan (recorded in `current-run.json` stage_history → architect → decision) explicitly confirmed: borderline candidates considered and rejected — `/api/entitlement` unauthenticated v1 → captured as NFR-7; public API barrel → implementation detail in PRD § 9; `automatic_tax: true` default → configuration choice in NFR-9 + R5. Task-level decisions during planning (e.g., `app_slug` constant placement in `StripeProvider.ts`; service-role supabase helper at `site/app/api/_lib/supabase-server.ts`; spinner reuse from lucide-react `Loader2`) are implementation choices, not architectural commitments. No new ADRs proposed.

---

## § 9 TDD and Quality Contract

*Added by QA Specialist (07) during enrichment phase. Governs all implementation in PRD-001.*

### 9.1 RED → GREEN → REFACTOR mandate

Every task that produces new production code (see exclusions in 9.2) MUST follow RED → GREEN → REFACTOR:

1. **RED:** Write the test(s) first. Run Vitest (`npm run test`). Confirm the test fails for the right reason (assertion failure — not import error, not missing file). A test that cannot fail is not a test.
2. **GREEN:** Write the minimum production code needed to make the test pass. No additional logic. No "while I'm here" improvements.
3. **REFACTOR:** Clean up duplication, naming, and structure while keeping tests green. No new behavior in this phase.

The § 5 Execution Order enforces this mechanically: every test task appears BEFORE its paired implementation task in the numbered list. The Developer does not skip ahead.

### 9.2 Explicit TDD exclusions (these tasks do not require RED → GREEN)

| Task | Reason |
|------|--------|
| T001 | [OPERATOR] — no code |
| T002 | Snapshot baseline — runs existing tests, does not write new ones |
| T003 | Mechanical scaffold via `npx shadcn@latest add ...` per rule `50-scaffold.mdc` — HARD STOP if it fails; never hand-write config from training data |
| T004 | Regression verification — runs existing tests |
| T005 | `npm install stripe` — dependency install, no new code |
| T006 | `.d.ts` path capture + § 4c-6 inline edit — documentation task; feeds RED-test fixtures in T012–T025 |
| T007, T008 | Config file / env-var edits — no production code |
| T009, T028, T029, T040, T044, T045, T051, T052 | [OPERATOR] — manual gate or mechanical operator action |
| T026 | Barrel export file — no logic; just re-exports; verified by T039 + T050 type-check pass |
| T027 | The shell script IS the test; it is a gray-box grep, not a RED→GREEN pair; it verifies build output |
| T039 | Barrel export addition — additive re-export; verified by type-check |
| T043 | DCE grep continuation — re-runs existing `npm run test:dce`; no new test code |
| T046, T047, T048, T049 | Docs-only |
| T050 | Final regression — runs all accumulated tests |

### 9.3 Stripe SDK fixture provenance rule (rule 40-sdk-contracts)

Tests written BEFORE T006 (Tranche B unit tests T012–T025) MUST fixture against Stripe API doc shapes sourced from `https://stripe.com/docs/api`. Each fixture object in those test files MUST include an inline comment:

```typescript
// source: https://stripe.com/docs/api/customers/object (pre-T006)
```

After T006 lands (`.d.ts` paths captured), the Developer RE-VERIFIES fixture shapes against the real `.d.ts` and UPDATES the comment to:

```typescript
// source: node_modules/stripe/types/Customers.d.ts → Stripe.Customer
```

Fixtures that are paraphrased from the Lead Developer's task description prose (this document) without a URL or `.d.ts` citation are REJECTED. The Lead Developer's task description is a specification — it is not a type authority.

Marketplace SDK fixture shapes (`application.context.marketplaceAppTenantId`, `host.user.sub`, `host.user.email`) are LOCKED from PRD-000 T013 capture. Cite as:

```typescript
// source: fixture-source PRD-000 T013 Marketplace SDK capture
```

### 9.4 Iframe / postMessage testing scope boundary

The `useEntitlement` hook's postMessage + polling state machine is tested in **jsdom** (Vitest environment) using `vi.useFakeTimers()` + `window.dispatchEvent(new MessageEvent(...))`. This is valid and correct.

Real iframe behavior (whether Cloud Portal's sandbox allows `window.opener.postMessage`) is NOT testable in unit tests. That verification is the Tranche C operator gate (T040 REAL MONEY SMOKE). Unit tests MUST NOT attempt to simulate the Cloud Portal sandbox.

### 9.5 Accessibility assertions for changed UI surfaces

PRD-001 changes two UI surfaces. Each MUST have at least one accessibility assertion in the test that covers it:

- **`PaywallCheckoutDialog` (T035):** assert that the spinner element has `aria-busy="true"` or `aria-label` when `isCheckingOut` is true; assert both Subscribe and Cancel buttons are keyboard-reachable (can receive focus via Tab in jsdom). A `toHaveClass('animate-spin')` assertion is NOT sufficient — the ARIA signal is what screen readers consume.
- **`/paywall-return` client (T038):** assert the "Confirming your access..." heading renders in the DOM (not just that postMessage was called) so screen readers announce the page load.

### 9.6 Runtime contrast assertion exception

PRD-001 introduces no new theme tokens, no new color surfaces, and reuses existing Blok dialog primitives without color changes. The runtime contrast assertion rule (foreground/background computed style comparison) is **waived for PRD-001**. If a future PRD adds a new colored surface, the rule reinstates.

### 9.7 Marketplace host-frame visual smoke

`platform_target = marketplace`. Per the QA Specialist's Marketplace rule:

- Canonical visual test target is the **clipped iframe inside the live Cloud Portal host**, not a standalone localhost render.
- For PRD-001 there are no new UI surfaces beyond the rewired dialog and the transient `/paywall-return` page. Both are covered by the Tranche C operator gate (T040).
- The POC clickdummy at `pocs/poc-v1-prd000/` is the visual ground truth for the dialog. PRD-001 does NOT produce a new POC (scope_dial `ui_variants: skip`). The dialog rewire should match `pocs/poc-v1-prd000/state-no-subscription.html` — the Subscribe button replaces "Got it"; the visual layout is unchanged.
- A Playwright visual-diff smoke against the POC is **recommended but not required** for PRD-001 since the dialog change is copy-only (no layout or color changes). If the Tranche C smoke screenshot shows visual divergence from the POC, escalate via the design-polish path before ship.

### 9.8 Webhook latency acceptance test

The ≤5-second webhook handler latency (NFR-3) is an **operator acceptance criterion**, not a Vitest assertion. Unit tests stub Supabase calls synchronously — they cannot replicate real I/O latency. The Tranche D gate (T045) implicitly verifies latency: Stripe Dashboard shows webhook delivery times. If the delivery log shows >5s responses, that is a latency bug to diagnose. Note this caveat in the § 10 spec for T021/T041 so the Developer does not add artificial `setTimeout` assertions that would only be meaningful against a live DB.

---

## § 10 Per-Task Test Specifications

*Added by QA Specialist (07). Every production-code task has a spec here. Format: Scenario / Expected outcome / Test type / Suggested file location. Tests marked [MUST-HAVE] are the highest-risk behavioral assertions.*

### T010 — Stripe error-translation table (`stripe-errors.ts`)

No dedicated test file required; `translateStripeError` is a pure function exercised indirectly through T016 (the `/api/checkout` route tests call the translation path via the route). Developer MAY add direct unit tests if the function grows complex. The T016 tests are sufficient coverage for PRD-001.

### T012 — `StripeProvider` orphan recovery branches (0 / 1 / N candidates)

**File:** `site/src/lib/paywall/providers/StripeProvider.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | **0 candidates** — `stripe.customers.list` returns empty array; `stripe.customers.create` is called with `metadata = { tenant_id: 'ten_abc', app_slug: 'paywall-blueprint' }` | `customers.create` invoked once; `customers.update` not called | Unit |
| 2 | **1 candidate** — `stripe.customers.list` returns 1 customer with `metadata.app_slug = 'paywall-blueprint'`; `customers.update` called with re-keyed `tenant_id`; `customers.create` not called | `customers.update` invoked with candidate.id; no create | Unit |
| 3 | **N>1 candidates** — `stripe.customers.list` returns 2 customers with matching `app_slug`, different `created` timestamps; most-recently-created (higher `created` number) is picked; `console.warn` emitted containing the discarded Customer ID | Most-recent ID used in update; warn message contains discarded ID | Unit |
| 4 | **Cross-app safety** — `stripe.customers.list` returns 1 customer with `metadata.app_slug = 'other-app'` + 1 with `metadata.app_slug = 'paywall-blueprint'`; only the `paywall-blueprint` candidate is selected | Foreign-app customer excluded | Unit |

Fixture provenance for all 4 tests:
```typescript
// source: https://stripe.com/docs/api/customers/object (pre-T006)
// Post-T006: update to → node_modules/stripe/types/Customers.d.ts → Stripe.Customer
```

### T013 — `StripeProvider.generatePortalUrl` throws

**File:** `site/src/lib/paywall/providers/StripeProvider.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | Calling `provider.generatePortalUrl({})` — any args | Throws `Error` with message containing "PRD-003"; nothing returned | Unit |

This is a behavioral guard, not a trivial identity check. The failure mode it detects: if a developer accidentally implements the method in PRD-001 (scope creep), the test catches it.

### T014 — `StripeProvider.verifyWebhookSignature`

**File:** `site/src/lib/paywall/providers/StripeProvider.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | **Good signature** — `stripe.webhooks.constructEvent` stub returns a fake `Stripe.Event` | `verifyWebhookSignature` returns the event object; does not throw | Unit |
| 2 | **Bad signature** — `stripe.webhooks.constructEvent` stub throws `new Error('No signatures found matching')` | `verifyWebhookSignature` re-throws the error; error is NOT swallowed or converted | Unit |

Fixture provenance:
```typescript
// source: https://stripe.com/docs/api/events/object (pre-T006)
// Post-T006: update to → node_modules/stripe/types/Events.d.ts → Stripe.Event
```

### T016 — `/api/checkout` route

**File:** `site/app/api/checkout/route.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | **Happy path** — valid `{ tenantId: 'ten_abc', userEmail: 'user@example.com' }`; `StripeProvider.generateCheckoutUrl` stub returns `'https://checkout.stripe.com/pay/cs_test_example'` | Response status 200; body `{ url: 'https://checkout.stripe.com/pay/cs_test_example' }`; `url` is non-empty string | Integration |
| 2 | **Missing tenantId** — body `{ userEmail: 'user@example.com' }` (tenantId absent) | Response status 400; body contains `error` string | Integration |
| 3 | **Stripe `tax_settings_not_set`** — `generateCheckoutUrl` throws with Stripe error `{ code: 'tax_settings_not_set' }` | Response status 503; body `{ error: 'Payment is being set up — please contact your administrator.' }` (matches FR-2 table) | Integration |
| 4 | **Stripe `rate_limit`** — `generateCheckoutUrl` throws with Stripe error `{ code: 'rate_limit' }` | Response status 429; body `{ error: 'Payment service is busy — please try again in a moment.' }` | Integration |

Fixture provenance:
```typescript
// Tenant/user shape: // source: fixture-source PRD-000 T013 Marketplace SDK capture
// Stripe error shape: // source: https://stripe.com/docs/error-codes (pre-T006)
// Post-T006: update to → node_modules/stripe/types/Errors.d.ts → Stripe.StripeError
```

### T018 — `/api/portal` route

**File:** `site/app/api/portal/route.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | `POST /api/portal` — any body | Response status 501; body `{ error: 'Customer Portal lands in PRD-003. See README.' }` | Integration |

### T020 — `/api/entitlement` route

**File:** `site/app/api/entitlement/route.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | **Allowed tenant** — `GET /api/entitlement?tenantId=ten_allowed`; stub `getEntitlement` returns `{ status: 'allowed' }` | Response status 200; body `{ status: 'allowed' }` | Integration |
| 2 | **No-subscription tenant** — `GET /api/entitlement?tenantId=ten_nosub`; stub returns `{ status: 'tenant_no_subscription' }` | Response status 200; body `{ status: 'tenant_no_subscription' }` | Integration |
| 3 | **Missing tenantId** — `GET /api/entitlement` (no query param) | Response status 400; body contains `error` string | Integration |

Fixture provenance:
```typescript
// source: PRD-000 EntitlementResult discriminated union in site/src/lib/paywall/types.ts
```

### T022 — Webhook `checkout.session.completed` happy path [MUST-HAVE]

**File:** `site/app/api/webhooks/stripe/route.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | Valid `checkout.session.completed` event — `processed_events.insert` called; `tenants.upsert` called with `{ tenant_id: 'tenant-abc', stripe_customer_id: 'cus_xyz', status: 'active', plan: 'premium', period_end: null }` | Response 200; both DB calls made with correct shapes | Integration |

Fixture provenance:
```typescript
// source: https://stripe.com/docs/api/checkout/sessions/object (pre-T006)
// Post-T006: → node_modules/stripe/types/Checkout/Sessions.d.ts → Stripe.Checkout.Session
```

### T023 — Webhook idempotency [MUST-HAVE]

**File:** `site/app/api/webhooks/stripe/route.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | Same `event.id = 'evt_test_1'` sent twice; second `processed_events.insert` returns `{ error: { code: '23505' } }` | First call: 200 + `tenants.upsert` called; second call: 200 + `tenants.upsert` NOT called | Integration |

### T024 — Webhook signature mismatch → 400 [MUST-HAVE]

**File:** `site/app/api/webhooks/stripe/route.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | `verifyWebhookSignature` stub throws; `Stripe-Signature` header absent or wrong | Response status **400** (not 401); `console.error` called with `'[PaywallBlueprint] webhook signature verification failed'` prefix; no `processed_events.insert`; no `tenants.upsert` | Integration |

Critical note: the test MUST assert 400, NOT 401. Asserting 401 would make this test pass for the wrong behavior — 401 triggers Stripe retries; 400 does not. The distinction is user-visible (retry storms vs. clean rejection).

### T025 — Webhook unhandled event type → 200 silent [MUST-HAVE]

**File:** `site/app/api/webhooks/stripe/route.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | `verifyWebhookSignature` returns fake event with `type: 'charge.refunded'` | Response 200; `processed_events.insert` called (idempotent on retry); `tenants.upsert` NOT called; `console.log` called with `'[PaywallBlueprint] unhandled event: charge.refunded'` | Integration |

### T031 — `useEntitlement` happy path [MUST-HAVE]

**File:** `site/src/lib/paywall/hooks/useEntitlement.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | `triggerCheckout()` called; first 2 polls return `{ status: 'tenant_no_subscription' }`; 3rd poll returns `{ status: 'allowed' }` | `entitlement.status === 'allowed'`; `error` is null; no further `fetch` calls after 3rd poll; `removeEventListener('message', ...)` called | Unit (jsdom, fake timers) |

### T032 — `useEntitlement` timeout path [MUST-HAVE]

**File:** `site/src/lib/paywall/hooks/useEntitlement.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | All 10 polls return `{ status: 'tenant_no_subscription' }`; 30s timer fires | `error.kind === 'polling_timeout'`; no fetch calls beyond the 10th; `entitlement` state unchanged from initial value | Unit (jsdom, fake timers) |

### T033 — `useEntitlement` postMessage triggers immediate poll [MUST-HAVE]

**File:** `site/src/lib/paywall/hooks/useEntitlement.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | `triggerCheckout()` at t=0; natural poll at t=3000ms returns `tenant_no_subscription`; at t=4000ms, `window.dispatchEvent(new MessageEvent('message', { data: { type: 'paywall:refresh' } }))` fires; immediate poll triggered returns `{ status: 'allowed' }` | Fetch count at t=4001ms is >1 (immediate fetch happened); outcome becomes `success`; interval cleared; no waiting until t=6000ms | Unit (jsdom, fake timers) |
| 2 | `window.dispatchEvent(new MessageEvent('message', { data: { type: 'wrong:type' } }))` — non-matching type | No immediate poll triggered; interval continues normally | Unit (jsdom, fake timers) |

### T034 — `useEntitlement` atomicity [MUST-HAVE]

**File:** `site/src/lib/paywall/hooks/useEntitlement.test.ts`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | At t=29900ms, postMessage fires; immediate poll returns `{ status: 'allowed' }` (success signal); at t=30100ms, 30s timeout fires | `error` is null; `outcome.kind === 'success'`; timeout's `setOutcome(prev => prev ?? { kind: 'timeout' })` is a no-op (prev already set) | Unit (jsdom, fake timers) |

### T035 — `PaywallCheckoutDialog` rewire

**File:** `site/src/lib/paywall/PaywallCheckoutDialog.test.tsx` (co-located with component)

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | Subscribe button clicked; `/api/checkout` returns `{ url: 'https://checkout.stripe.com/...' }` | `window.open` called with the URL + `'_blank'`; spinner renders; primary button disabled | UI (jsdom + React Testing Library) |
| 2 | **Cancel button during in-flight** — `isCheckingOut = true` (mock hook state) | Cancel button is NOT disabled (`disabled` attribute absent); Cancel button is focusable via Tab | UI [MUST-HAVE] |
| 3 | **ARIA / keyboard** — dialog rendered; Tab from Subscribe | Both Subscribe and Cancel buttons receive focus in Tab order; spinner has `aria-busy="true"` or descriptive `aria-label` while in-flight | UI (a11y) |

### T038 — `/paywall-return` client component

**File:** `site/app/paywall-return/PaywallReturnClient.test.tsx`

| # | Scenario | Expected outcome | Test type |
|---|----------|-----------------|-----------|
| 1 | **opener present** — `window.opener = { closed: false, postMessage: vi.fn() }` | `postMessage` called with `{ type: 'paywall:refresh', sessionId: 'sess_abc' }`; `window.close` queued via setTimeout; "Confirming your access..." heading in DOM | UI (jsdom) [MUST-HAVE] |
| 2 | **opener null** — `window.opener = null` | `postMessage` NOT called; "You can close this tab — your access is being applied." text in DOM; `sessionStorage.setItem('paywall:lastCheckoutCompleted', ...)` called | UI (jsdom) [MUST-HAVE] |
| 3 | **ARIA** — component mounts with either opener path | `"Confirming your access..."` text is in an `<h1>` or has an appropriate heading role so screen readers announce page load | UI (a11y) |

### T042 — 5 forward-compat webhook event handlers

**File:** `site/app/api/webhooks/stripe/route.test.ts`

| # | Event type | Scenario | Expected outcome | Test type |
|---|------------|----------|-----------------|-----------|
| 1 | `customer.subscription.updated` | Fake event with `data.object = { customer: 'cus_xyz', status: 'active', items: { data: [{ plan: { id: 'plan_abc' } }] }, current_period_end: 1234567890 }` | `tenants.update` called with `status: 'active'`, `period_end` set | Integration |
| 2 | `customer.subscription.deleted` | Fake event with `data.object.customer = 'cus_xyz'` | `tenants.update` called with `status: 'cancelled'`; `period_end` NOT cleared (preserved) | Integration |
| 3 | `invoice.payment_failed` | Fake event with `data.object.customer = 'cus_xyz'` | `tenants.update` called with `status: 'past_due'` | Integration |
| 4 | `checkout.session.async_payment_succeeded` | Fake event same shape as `checkout.session.completed` | `tenants.upsert` called with `status: 'active'`, `plan: 'premium'` | Integration |
| 5 | `checkout.session.async_payment_failed` | Fake event with `data.object.customer = 'cus_xyz'` | `tenants` NOT mutated; `console.warn` called | Integration |

Pre-T006 fixture source for all 5:
```typescript
// source: https://stripe.com/docs/api/events/types (pre-T006)
// Post-T006: update to → node_modules/stripe/types/Events.d.ts (discriminated union)
```

### Non-code tasks (no test spec needed)

T001, T002, T003, T004, T005, T006, T007, T008, T009, T026, T027, T028, T029, T036, T039, T040, T043, T044, T045, T046, T047, T048, T049, T050, T051, T052 — see exclusion list in § 9.2.

**Note on T036 (`PaywallGate` subscription to `useEntitlement`):** no dedicated test written. The PaywallGate's response to `entitlement.status === 'allowed'` is verified end-to-end at the Tranche C operator gate (T040). If the Developer wants a unit test, it fits alongside existing `PaywallGate.test.tsx` from PRD-000 — add a scenario "when useEntitlement resolves to allowed, gate renders AllowedState". This is recommended but not mandated for PRD-001 given the E2E coverage at T040.
