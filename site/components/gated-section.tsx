/**
 * GatedSection — bottom section of the freemium layout.
 *
 * T031 (Tranche C): AllowedState extracted to src/lib/paywall/states/AllowedState.tsx.
 * pickUserDisplay and pickTenantDisplay are re-exported from there for backward-compat
 * (existing tests in gated-section.test.tsx import them from this module).
 *
 * T035 (Tranche C): GatedSection wraps <AllowedState /> in <PaywallGate>.
 * The <Card> container remains here; PaywallGate + state components are inner content.
 *
 * shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
 * Verified 2026-05-13 against fixture project-planning/architecture/sdk-fixtures/application-context.json
 *
 * sitecore:blok-components — uses @blok/card (Card), @blok/badge (Badge).
 * sitecore:blok-theming — semantic tokens only; no hex values.
 */

"use client";

import { Card } from "@/components/ui/card";
import { AllowedState } from "@/src/lib/paywall/states/AllowedState";
import { PaywallGate } from "@/src/lib/paywall/PaywallGate";

// ---------------------------------------------------------------------------
// Re-export display chain helpers for backward-compat with gated-section.test.tsx
// (T024a tests import pickUserDisplay / pickTenantDisplay from this module path)
// ---------------------------------------------------------------------------
export { pickUserDisplay, pickTenantDisplay } from "@/src/lib/paywall/states/AllowedState";

// ---------------------------------------------------------------------------
// GatedSection — wraps PaywallGate which resolves to the correct state component.
//
// T035: PaywallGate wraps AllowedState as "allowed" children.
// The "Premium" badge lives inside each state component (AllowedState,
// NoSubscriptionState, SeatsFullState, UserUnassignedState) — NOT in this wrapper.
// Duplicated-badge regression (2026-05-13) fixed by removing the wrapper-level Badge.
// ---------------------------------------------------------------------------
export function GatedSection() {
  return (
    <section
      role="region"
      aria-labelledby="gated-section-heading"
      className="w-full"
    >
      <Card style="outline" elevation="sm" padding="lg">
        {/* PaywallGate — resolves entitlement and renders the matching state component */}
        {/* T035: AllowedState is the "allowed" children; gate routes other states directly */}
        <PaywallGate>
          <AllowedState />
        </PaywallGate>
      </Card>
    </section>
  );
}
