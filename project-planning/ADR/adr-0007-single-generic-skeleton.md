# ADR-0007: Single generic skeleton sized to the largest resolved state

## Status

Accepted

## Context

The gated subtree renders a skeleton placeholder while the entitlement promise is pending (PRD-000 FR-1 step 5, NFR-1 § Skeleton display threshold, DQ3 from /create-prd). Three design options exist:

- **(a) Four per-state skeletons.** Each of `allowed | tenant_no_subscription | tenant_active_seats_full | tenant_active_user_unassigned` has its own skeleton variant sized to its eventual layout. Zero layout shift on resolve.
- **(b) Single generic skeleton** sized large enough to absorb the largest resolved state's layout. Some over-allocation on three of the four states; zero layout shift on resolve.
- **(c) No skeleton.** Render nothing in the gated subtree until resolved. Simplest implementation; risks flash-of-empty + perceived slowness.

Option (a) has a fundamental problem: at the moment the skeleton renders, the entitlement promise is still pending — the gate cannot know which of the four states is about to resolve, so it cannot pick the matching skeleton without speculating. Any speculative pick produces a 1-in-4 chance of correct sizing and a 3-in-4 chance of layout shift on resolve. Option (c) is rejected by PRD § DQ3 (skeleton mandatory to prevent flash-of-allowed).

The largest of the four resolved states is `tenant_active_seats_full` per its two-CTA layout ("Upgrade plan" primary + "Ask admin for reassignment" secondary). Sizing the skeleton to that state guarantees no layout shift on resolve regardless of which state lands.

## Decision

Implement a **single generic skeleton component** at `src/lib/paywall/states/SkeletonState.tsx` sized to the largest expected resolved-state layout (`tenant_active_seats_full`). All four resolved states render inside this skeleton's footprint, replacing the skeleton on resolve.

The skeleton uses Blok loading-state tokens (per the `sitecore:blok-theming` skill) for the placeholder visuals.

## Consequences

**Easier:**

- Zero layout shift on entitlement resolve, regardless of which state wins.
- One skeleton component to design, test, and theme — not four.
- Adopters customizing the gate's visual treatment have a single component to modify.
- The skeleton's footprint communicates "something is loading here" without committing to specific UI semantics.

**Harder:**

- The skeleton is slightly oversized for three of the four resolved states (the `allowed` welcome screen, the `no_subscription` denial, the `unassigned` denial). Visual airiness is a minor cost.
- If a future PRD introduces a fifth resolved state with a larger layout than `seats_full`, the skeleton must be re-sized. The skeleton component's documented size invariant ("matches the largest expected state") makes this a one-line code change.

## Date

2026-05-13
