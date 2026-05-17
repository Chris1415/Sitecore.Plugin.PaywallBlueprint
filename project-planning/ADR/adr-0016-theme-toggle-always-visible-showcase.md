# ADR-0016: Theme toggle is always visible in the topbar; departs from env-gating policy for the showcase

## Status

Accepted

## Context

`feedback_dark_mode_default_policy.md` (operator memory) establishes a portfolio-wide policy for Sitecore Marketplace apps: ship 3-state theme (light / dark / system); make the toggle's **visibility env-gated** behind `NEXT_PUBLIC_SHOW_THEME_TOGGLE`. The default value is `true`, but production deployments where the host iframe pins the theme via the portal expect to set the flag to `false` and hide the toggle. Redirect Manager is the reference implementation.

PRD-002 introduces a topbar theme toggle on paywall-blueprint as part of the bento-grid showcase redesign. Two options:

- **(a) Follow the policy.** Add `NEXT_PUBLIC_SHOW_THEME_TOGGLE` env var, default to `true`, hide the toggle when set to `false`. Matches every other app in the portfolio.
- **(b) Always visible.** No env gating. Toggle ships unconditionally. Note the departure explicitly so adopters know to env-gate for production deployments.

The PM critical review (2026-05-17) flagged the original PRD-002 draft's choice of (b) as thinly justified. The reviewer noted: "Operators forking this won't know whether to keep the toggle visible or env-gate it. The PRD doesn't actually disagree with the policy; it just opts out without strong justification."

After post-review revision, the operator confirmed (b) with the explicit rationale: **the paywall-blueprint is itself a showcase**. The theme toggle is part of the demonstration of visual polish that PRD-002 exists to provide. Adopters who fork the blueprint inherit the always-visible toggle by default; they're expected to env-gate it for their own production deployments. This treats the toggle as a sibling to other showcase-only affordances on the same page (TenantIdBadge, PaywallVersionOverride) — visible in the blueprint, removable on fork.

## Decision

**The theme toggle in PRD-002's topbar is always visible.** No `NEXT_PUBLIC_SHOW_THEME_TOGGLE` env var. The `<ThemeToggle>` component mounts unconditionally in the Topbar's `rightSideItems[]` slot.

**Adopter responsibilities (documented in README "Production hardening for adopters" section):**

- Adopters forking paywall-blueprint for production deployments should env-gate the toggle per the standard `feedback_dark_mode_default_policy.md` pattern. Concrete steps in the README.
- Alternatively, adopters can remove the `<ThemeToggle>` component entirely from `site/components/bloks/top-bar.tsx` if the host iframe pins the theme.

## Consequences

**Easier:**

- The blueprint demonstrates the full theme story without operators having to set an env var to see it.
- Sibling-affordance posture (TenantIdBadge, PaywallVersionOverride also always-visible) is consistent.
- Cold-read adopters see the toggle immediately and understand the theme system is part of the package.

**Harder:**

- Operators reading both the standard policy and the blueprint may be confused about which posture to follow. README's "Production hardening for adopters" section must spell out the divergence explicitly.
- Future audits of the portfolio's theme-toggle compliance will flag paywall-blueprint as an outlier. The outlier is intentional but adds review noise.
- If Sitecore tightens the policy (e.g., requires every app to env-gate the toggle), paywall-blueprint will need to comply — a small follow-up PRD.

**Neutral:**

- The actual theme implementation (next-themes, 3-state cycle, `localStorage` persistence) is identical to the env-gated pattern. Only the visibility default differs.

## Date

2026-05-17
