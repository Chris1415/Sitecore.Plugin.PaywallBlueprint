# Click targets — Stock Blok (v1)

POC clickdummy for Paywall Blueprint PRD-000, variant v1. Every clickable element on every frame is enumerated below with its post-state. The POC-only `.state-picker` nav at the top of every frame lets the operator hop between resolved states without entering data; the implementation uses `pnpm seed:state <state>` (FR-8) instead.

External URLs (`https://example.com/buy`, `https://example.com/upgrade`) are documented PRD-000 placeholders; PRD-001 replaces them with the real Lemon Squeezy checkout URLs.

---

## index.html (loading / skeleton frame)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| index.html | `.state-picker a[href="index.html"]` (active) | Re-render this frame | index.html |
| index.html | `.state-picker a[href="state-allowed.html"]` | Switch to allowed state | state-allowed.html |
| index.html | `.state-picker a[href="state-no-subscription.html"]` | Switch to no-subscription denial | state-no-subscription.html |
| index.html | `.state-picker a[href="state-seats-full.html"]` | Switch to seats-full denial | state-seats-full.html |
| index.html | `.state-picker a[href="state-unassigned.html"]` | Switch to user-unassigned denial | state-unassigned.html |
| index.html | `.state-picker a[href="state-demo-mode.html"]` | Switch to demo-mode banner frame | state-demo-mode.html |
| index.html | `.state-picker a[href="state-error.html"]` | Switch to error fallback | state-error.html |
| index.html | `.state-picker a[href="state-allowed-mobile.html"]` | Open mobile preview frame | state-allowed-mobile.html |
| index.html | Free section `.blok-button--secondary` "View placeholder report" | No-op; `aria-label="Placeholder action — does nothing"` | (stays on index.html) |
| index.html | Gated section (skeleton) | Not clickable; `role="status" aria-live="polite"` | n/a |

---

## state-allowed.html (entitlement resolved = allowed)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| state-allowed.html | `.state-picker a[href="index.html"]` | Switch to loading state | index.html |
| state-allowed.html | `.state-picker a[href="state-allowed.html"]` (active) | Re-render this frame | state-allowed.html |
| state-allowed.html | `.state-picker a[href="state-no-subscription.html"]` | Switch to no-subscription denial | state-no-subscription.html |
| state-allowed.html | `.state-picker a[href="state-seats-full.html"]` | Switch to seats-full denial | state-seats-full.html |
| state-allowed.html | `.state-picker a[href="state-unassigned.html"]` | Switch to user-unassigned denial | state-unassigned.html |
| state-allowed.html | `.state-picker a[href="state-demo-mode.html"]` | Switch to demo-mode banner frame | state-demo-mode.html |
| state-allowed.html | `.state-picker a[href="state-error.html"]` | Switch to error fallback | state-error.html |
| state-allowed.html | `.state-picker a[href="state-allowed-mobile.html"]` | Open mobile preview frame | state-allowed-mobile.html |
| state-allowed.html | Free section `.blok-button--secondary` "View placeholder report" | No-op; `aria-label="Placeholder action — does nothing"` | (stays on state-allowed.html) |
| state-allowed.html | Gated section welcome card | No focusable elements (no CTA per spec § 3.4) | n/a |

---

## state-no-subscription.html (denial: `tenant_no_subscription`)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| state-no-subscription.html | `.state-picker a[href="index.html"]` | Switch to loading state | index.html |
| state-no-subscription.html | `.state-picker a[href="state-allowed.html"]` | Switch to allowed state | state-allowed.html |
| state-no-subscription.html | `.state-picker a[href="state-no-subscription.html"]` (active) | Re-render this frame | state-no-subscription.html |
| state-no-subscription.html | `.state-picker a[href="state-seats-full.html"]` | Switch to seats-full denial | state-seats-full.html |
| state-no-subscription.html | `.state-picker a[href="state-unassigned.html"]` | Switch to user-unassigned denial | state-unassigned.html |
| state-no-subscription.html | `.state-picker a[href="state-demo-mode.html"]` | Switch to demo-mode banner frame | state-demo-mode.html |
| state-no-subscription.html | `.state-picker a[href="state-error.html"]` | Switch to error fallback | state-error.html |
| state-no-subscription.html | `.state-picker a[href="state-allowed-mobile.html"]` | Open mobile preview frame | state-allowed-mobile.html |
| state-no-subscription.html | Free section `.blok-button--secondary` "View placeholder report" | No-op; `aria-label="Placeholder action — does nothing"` | (stays on state-no-subscription.html) |
| state-no-subscription.html | Primary CTA `a.blok-button--default` "View plans" | Opens checkout (placeholder, new tab) | https://example.com/buy |

---

## state-seats-full.html (denial: `tenant_active_seats_full`)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| state-seats-full.html | `.state-picker a[href="index.html"]` | Switch to loading state | index.html |
| state-seats-full.html | `.state-picker a[href="state-allowed.html"]` | Switch to allowed state | state-allowed.html |
| state-seats-full.html | `.state-picker a[href="state-no-subscription.html"]` | Switch to no-subscription denial | state-no-subscription.html |
| state-seats-full.html | `.state-picker a[href="state-seats-full.html"]` (active) | Re-render this frame | state-seats-full.html |
| state-seats-full.html | `.state-picker a[href="state-unassigned.html"]` | Switch to user-unassigned denial | state-unassigned.html |
| state-seats-full.html | `.state-picker a[href="state-demo-mode.html"]` | Switch to demo-mode banner frame | state-demo-mode.html |
| state-seats-full.html | `.state-picker a[href="state-error.html"]` | Switch to error fallback | state-error.html |
| state-seats-full.html | `.state-picker a[href="state-allowed-mobile.html"]` | Open mobile preview frame | state-allowed-mobile.html |
| state-seats-full.html | Free section `.blok-button--secondary` "View placeholder report" | No-op; `aria-label="Placeholder action — does nothing"` | (stays on state-seats-full.html) |
| state-seats-full.html | Primary CTA `a.blok-button--default` "Upgrade plan" | Opens upgrade (placeholder, new tab) | https://example.com/upgrade |

---

## state-unassigned.html (denial: `tenant_active_user_unassigned`)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| state-unassigned.html | `.state-picker a[href="index.html"]` | Switch to loading state | index.html |
| state-unassigned.html | `.state-picker a[href="state-allowed.html"]` | Switch to allowed state | state-allowed.html |
| state-unassigned.html | `.state-picker a[href="state-no-subscription.html"]` | Switch to no-subscription denial | state-no-subscription.html |
| state-unassigned.html | `.state-picker a[href="state-seats-full.html"]` | Switch to seats-full denial | state-seats-full.html |
| state-unassigned.html | `.state-picker a[href="state-unassigned.html"]` (active) | Re-render this frame | state-unassigned.html |
| state-unassigned.html | `.state-picker a[href="state-demo-mode.html"]` | Switch to demo-mode banner frame | state-demo-mode.html |
| state-unassigned.html | `.state-picker a[href="state-error.html"]` | Switch to error fallback | state-error.html |
| state-unassigned.html | `.state-picker a[href="state-allowed-mobile.html"]` | Open mobile preview frame | state-allowed-mobile.html |
| state-unassigned.html | Free section `.blok-button--secondary` "View placeholder report" | No-op; `aria-label="Placeholder action — does nothing"` | (stays on state-unassigned.html) |
| state-unassigned.html | Gated section card | No focusable elements — PRD-000 ships no CTA; PRD-002 lands "Request seat" notification flow | n/a |

---

## state-demo-mode.html (env-flag OFF — banner visible)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| state-demo-mode.html | `.state-picker a[href="index.html"]` | Switch to loading state | index.html |
| state-demo-mode.html | `.state-picker a[href="state-allowed.html"]` | Switch to allowed state (flag ON) | state-allowed.html |
| state-demo-mode.html | `.state-picker a[href="state-no-subscription.html"]` | Switch to no-subscription denial | state-no-subscription.html |
| state-demo-mode.html | `.state-picker a[href="state-seats-full.html"]` | Switch to seats-full denial | state-seats-full.html |
| state-demo-mode.html | `.state-picker a[href="state-unassigned.html"]` | Switch to user-unassigned denial | state-unassigned.html |
| state-demo-mode.html | `.state-picker a[href="state-demo-mode.html"]` (active) | Re-render this frame | state-demo-mode.html |
| state-demo-mode.html | `.state-picker a[href="state-error.html"]` | Switch to error fallback | state-error.html |
| state-demo-mode.html | `.state-picker a[href="state-allowed-mobile.html"]` | Open mobile preview frame | state-allowed-mobile.html |
| state-demo-mode.html | Demo-mode banner `.blok-alert` | Not clickable; non-dismissible per session (ADR-0004) | n/a |
| state-demo-mode.html | Free section `.blok-button--secondary` "View placeholder report" | No-op; `aria-label="Placeholder action — does nothing"` | (stays on state-demo-mode.html) |
| state-demo-mode.html | Gated section welcome card | No focusable elements (gate passes through children verbatim per ADR-0004) | n/a |

---

## state-error.html (error boundary fallback)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| state-error.html | `.state-picker a[href="index.html"]` | Switch to loading state | index.html |
| state-error.html | `.state-picker a[href="state-allowed.html"]` | Switch to allowed state | state-allowed.html |
| state-error.html | `.state-picker a[href="state-no-subscription.html"]` | Switch to no-subscription denial | state-no-subscription.html |
| state-error.html | `.state-picker a[href="state-seats-full.html"]` | Switch to seats-full denial | state-seats-full.html |
| state-error.html | `.state-picker a[href="state-unassigned.html"]` | Switch to user-unassigned denial | state-unassigned.html |
| state-error.html | `.state-picker a[href="state-demo-mode.html"]` | Switch to demo-mode banner frame | state-demo-mode.html |
| state-error.html | `.state-picker a[href="state-error.html"]` (active) | Re-render this frame | state-error.html |
| state-error.html | `.state-picker a[href="state-allowed-mobile.html"]` | Open mobile preview frame | state-allowed-mobile.html |
| state-error.html | Free section `.blok-button--secondary` "View placeholder report" | No-op; the free section keeps rendering normally (error boundary scopes to gated subtree per architecture § 8.5) | (stays on state-error.html) |
| state-error.html | Gated section error fallback | No focusable elements — PRD-000 deliberately ships no retry CTA (FR-1; PRD-001 introduces provider-unreachable UX with retry) | n/a |

---

## state-allowed-mobile.html (optional mobile-preview frame)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| state-allowed-mobile.html | `.state-picker a[href="index.html"]` | Switch to loading state | index.html |
| state-allowed-mobile.html | `.state-picker a[href="state-allowed.html"]` | Switch to allowed state (desktop) | state-allowed.html |
| state-allowed-mobile.html | `.state-picker a[href="state-no-subscription.html"]` | Switch to no-subscription denial | state-no-subscription.html |
| state-allowed-mobile.html | `.state-picker a[href="state-seats-full.html"]` | Switch to seats-full denial | state-seats-full.html |
| state-allowed-mobile.html | `.state-picker a[href="state-unassigned.html"]` | Switch to user-unassigned denial | state-unassigned.html |
| state-allowed-mobile.html | `.state-picker a[href="state-demo-mode.html"]` | Switch to demo-mode banner frame | state-demo-mode.html |
| state-allowed-mobile.html | `.state-picker a[href="state-error.html"]` | Switch to error fallback | state-error.html |
| state-allowed-mobile.html | `.state-picker a[href="state-allowed-mobile.html"]` (active) | Re-render this frame | state-allowed-mobile.html |
| state-allowed-mobile.html | Free section `.blok-button--secondary` "View placeholder report" (full-width) | No-op; `aria-label="Placeholder action — does nothing"` | (stays on state-allowed-mobile.html) |
| state-allowed-mobile.html | Gated section welcome card | No focusable elements | n/a |
