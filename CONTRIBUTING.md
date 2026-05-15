# Contributing

Contributions to Paywall Blueprint are welcome. This is a public OSS reference — the most
valuable contributions are second-provider adapters, corrections to the adoption guide, and
bug reports against the gate component or state components.

---

## Welcome — especially second-provider adapters

The `PaymentProvider` interface in `site/src/lib/paywall/types.ts` is designed for
third-party adapters. PRD-001 ships the Stripe direct adapter. After PRD-003 stabilizes
the Customer Portal wraps, adapter PRs for Paddle, Polar.sh, and Lemon Squeezy will be
accepted. See the [Roadmap](README.md#roadmap) for the expected timeline.

---

## Issue triage expectations

This is hahn-solo's OSS reference project — not a funded open-source project with a
formal SLA. Issues will be triaged on a best-effort basis:

- **Security vulnerabilities:** see [SECURITY.md](SECURITY.md). Email is preferred; expect
  a response within a week.
- **Bug reports:** filed against specific tasks / components with a minimal reproduction
  are most likely to get attention. Label with `bug`.
- **Feature requests:** please check the roadmap first. Requests that expand scope beyond
  the PRD sequence will be labeled `future` and considered post-PRD-003.
- **Second-provider adapters:** welcome as PRs after PRD-003 ships (see above).

---

## Roadmap context

The implementation follows a gated PRD sequence:

| PRD | What it adds |
|-----|-------------|
| PRD-000 (current) | Foundation — `<PaywallGate>`, 4 UX states, Supabase adapter, tenant-only evaluator |
| PRD-001 | Stripe Checkout + webhook + `withEntitlement` server HOF |
| PRD-002 | Per-user seat enforcement + admin UI |
| PRD-003 | Stripe Customer Portal (cancel / plan-change) |
| Post-PRD-003 | Second-provider adapters |

Adapter PRs submitted before PRD-003 ships may be accepted as draft PRs and merged
after the roadmap gate is cleared.

---

## Development workflow

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-handle>/Sitecore.Plugin.PaywallBlueprint.git
cd Sitecore.Plugin.PaywallBlueprint

# 2. Install dependencies
cd site && npm install

# 3. Set up your environment (see README quickstart for Supabase setup)
cp .env.example .env.local

# 4. Run the dev server
npm run dev

# 5. Write or update tests — all PRs must include tests
npm run test

# 6. TypeScript type-check
npx tsc --noEmit

# 7. Lint
npm run lint

# 8. Production build
npm run build

# 9. DCE verification (if touching PaywallGate or env vars)
npm run test:dce

# 10. Submit a focused PR
```

---

## Style expectations

- **TypeScript strict mode.** No `any` in the public library API (`site/src/lib/paywall/`).
- **Blok semantic tokens only** for UI components — no hex values, no hardcoded `bg-*` that
  bypasses the Blok theming layer.
- **ADRs for fundamental decisions.** If your PR changes an architectural decision (interface
  shape, new abstraction boundary, new dependency), open an ADR alongside it. ADR template
  is at `project-planning/ADR/template.md`.
- **Small, focused PRs.** One concern per PR. Split adapter PRs from bug fixes.
- **Tests included.** State component PRs: locked-copy tests for every string. Adapter PRs:
  unit tests with a stub client; integration test with `describe.skipIf(!process.env.TEST_KEY)`.

---

## Where to file issues

[GitHub Issues](https://github.com/Chris1415/Sitecore.Plugin.PaywallBlueprint/issues)
