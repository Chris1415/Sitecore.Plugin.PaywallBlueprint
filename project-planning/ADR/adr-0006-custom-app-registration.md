# ADR-0006: Register as custom app for PRD-000; public-Marketplace submission deferred

## Status

Accepted

## Context

The Sitecore Marketplace distinguishes two app types (per the `marketplace-sdk-lifecycle` skill, § 1):

- **Custom app** — available to your organization + whitelisted organizations. Self-serve registration. No Sitecore approval required. Suitable for internal tools, customer-specific integrations, prototypes.
- **Public app** — listed in the public Sitecore Marketplace; available to all Sitecore organizations. Requires Sitecore review and approval (days to weeks). Blok compliance effectively required. Accessibility audit, screenshots, privacy policy URL, support contact, marketing materials.

The blueprint's product goal (PRD-000 § 3) is to become the de-facto public reference for monetizing a Sitecore Marketplace App. The natural target is **public app** — anyone with a Sitecore tenant can install the reference from the public Marketplace listing and see the paywall in action without forking.

But public-app submission adds phases 6–9 of the lifecycle (Test, Prepare, Submit, Publish) — meaningful additional work that does not deliver any new product capability. PRD-000's scope is the foundation tranche; adding public-app submission to PRD-000 would inflate scope beyond the 5-tranche execution plan.

## Decision

- **PRD-000 registers as a custom app** in Cloud Portal. The blueprint app is installable in hahnsolo's organization (and any organization hahnsolo whitelists) but is **not** listed in the public Sitecore Marketplace.
- The **codebase IS architected as public-app-ready** from day one — Blok-compliant UI, WCAG AA accessibility, code organization that survives Sitecore review (PRD-000 § 5 In Scope, § 11 UX Considerations).
- **Submitting the app to the public Sitecore Marketplace** (the lifecycle phases 6–9 work — Blok review, accessibility audit, marketing assets, Sitecore submission, approval) is deferred as a **post-PRD-003 stretch** goal. This is recorded in PRD-000 § 14 as OQ-PostShip-1.

## Consequences

**Easier:**

- PRD-000 ships without waiting for Sitecore's review timeline.
- All architectural and UX choices are made with public-app submission in mind — when submission happens, the codebase is ready, not retrofitted.
- The public GitHub repo (PRD-000 G2) provides the discovery surface for the blueprint pattern in PRD-000. Adopters find the code and fork it; they don't need the Marketplace listing to consume the pattern.
- Decoupling submission from the foundation tranches keeps each PRD focused on one kind of work.

**Harder:**

- Adopters cannot install the reference app from the public Sitecore Marketplace in PRD-000. To see the paywall live, they must either join hahnsolo's organization, fork the repo and self-host, or wait for the post-PRD-003 submission.
- The launch narrative's "you can install it on your tenant" claim is partial — only via fork / self-host in PRD-000, not via public Marketplace until later.
- Future submission work (post-PRD-003) inherits the codebase as it stood at PRD-003; any drift from Blok / accessibility / marketing-asset readiness during PRD-001–PRD-003 must be caught and fixed before submission.

## Date

2026-05-13
