# ADR-0004: Env-flag toggle uses signaled pass-through, not silent pass-through

## Status

Accepted

## Context

The blueprint ships an environment variable `NEXT_PUBLIC_PAYWALL_ENABLED` that flips the paywall between enforced mode (entitlement check runs; one of four UX states renders) and disabled mode (gate component renders children verbatim).

Three options were considered for disabled-mode UX:

- **(a) Silent pass-through.** Children render exactly as in allowed-state; no visible signal. Cheapest UX; cleanest for adopters who want "show me the app without commerce noise."
- **(b) Signaled pass-through.** Children render PLUS a persistent banner reading "Paywall disabled — demo mode" — visible and intentional. The toggle's effect is observable from the outside.
- **(c) Hybrid.** Silent in production, signaled only on `localhost` / dev environments.

The blueprint is a public OSS reference. Its launch narrative includes a walkthrough where the operator flips the env-flag on/off and an observer SEES the paywall snap into and out of effect. Silent pass-through breaks that narrative — the demo video would need narration to explain "trust me, the gate is gone now."

A secondary concern: adopters running the blueprint with the flag off for prolonged periods (e.g., self-hosted "everything-free" community forks) should not be able to forget the flag is off. A persistent banner keeps the mode honest.

## Decision

Signaled pass-through (option b). When `NEXT_PUBLIC_PAYWALL_ENABLED=false`:

- `<PaywallGate>` renders `children` verbatim with zero entitlement-store call.
- A persistent banner labeled `"Paywall disabled — demo mode"` (exact string locked at PRD level — § 11 of PRD-000) renders alongside the gate's children. Banner placement, styling, and dismissibility are UI-design concerns (decided in `/architect`).
- The banner is intentionally **non-dismissible per session** (or dismissibility limited to session-scoped). Persistent visibility is part of the contract.

## Consequences

**Easier:**

- Launch walkthrough: env-flag toggle is visibly demonstrable; adopters can see the gate snap in/out.
- Self-hosted forks running in disabled mode never accidentally pretend the gate is active.
- OSS narrative is honest: "the toggle does something visible" is provable from the outside.
- Adopters customizing the banner copy (rebranding) have a clear extension point.

**Harder:**

- Adopters who want a fully silent disabled mode (e.g., for internal demos where the audience shouldn't see the banner) must remove the banner from their fork. Documented as a non-default modification in the README.
- The banner takes screen real estate. UI design has to ensure it doesn't interfere with the gated subtree's UX. Risk R7 in PRD-000 § 13 tracks this; UI designer validates banner + welcome layout together in `/architect`.
- The banner copy is locked at PRD level (no longer an open question after PRD critical review). UI designer cannot redesign the wording — only its visual treatment.

## Date

2026-05-13
