/**
 * Post-gate welcome. Reads useAppContext() + useHostUser() directly — the
 * provider contract guarantees both are non-null by the time this renders.
 *
 * The user and tenant display chains are LOCKED decisions, not defensive
 * coding — see docs/build-decisions.md#display-chains.
 *
 * shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
 */

"use client";

import { CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppContext, useHostUser } from "@/components/providers/marketplace";

// ---------------------------------------------------------------------------
// pickUserDisplay — imported from shared util (T011 extraction) + re-exported.
// source: project-planning/architecture/sdk-fixtures/host-user.json ($design_decisions)
// Extracted to site/src/lib/paywall/pickUserDisplay.ts for reuse by WelcomeHero (F1).
// ---------------------------------------------------------------------------
import { pickUserDisplay } from "@/src/lib/paywall/pickUserDisplay";
export { pickUserDisplay };

// ---------------------------------------------------------------------------
// pickTenantDisplay — tenant display chain (LOCKED per application-context.json $design_decisions)
// source: project-planning/architecture/sdk-fixtures/application-context.json ($design_decisions)
// Moved from components/gated-section.tsx — same logic, same signatures.
// ---------------------------------------------------------------------------
export function pickTenantDisplay(ctx: Record<string, unknown>): string {
  const ra = Array.isArray(ctx?.resourceAccess)
    ? (ctx.resourceAccess[0] as Record<string, unknown>)
    : undefined;
  if (ra?.tenantDisplayName && typeof ra.tenantDisplayName === "string") {
    return ra.tenantDisplayName;
  }
  if (ra?.tenantName && typeof ra.tenantName === "string") {
    return ra.tenantName;
  }
  const id = ctx?.marketplaceAppTenantId;
  if (typeof id === "string" && id.length > 0) {
    return id.slice(-8);
  }
  return "your tenant";
}

// ---------------------------------------------------------------------------
// AllowedState — renders the welcome card when entitlement is "allowed"
// ---------------------------------------------------------------------------
export function AllowedState() {
  // shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
  // Verified 2026-05-13 against fixture project-planning/architecture/sdk-fixtures/application-context.json
  const appContext = useAppContext() as unknown as Record<string, unknown>;
  const hostUser = useHostUser() as unknown as Record<string, unknown>;

  const userDisplay = pickUserDisplay(hostUser);
  const tenantDisplay = pickTenantDisplay(appContext);

  return (
    <div className="flex flex-col gap-3">
      {/* Premium eyebrow — consistent with all 4 state components per POC state-allowed.html */}
      {/* Regression fix 2026-05-13: AllowedState was missing the badge; restored per POC source. */}
      <Badge colorScheme="primary" size="md">
        Premium
      </Badge>

      <div className="flex flex-col gap-3">
        {/* Positive state icon — text-primary per UI spec § 3.4 */}
        <CircleCheck
          className="text-primary"
          size={32}
          aria-hidden="true"
        />

        {/* Heading — locked template "Welcome, {firstName}" (UI spec § 8) */}
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Welcome, {userDisplay}
        </h2>

        {/* Body — locked template "Your tenant {tenantName} has full access. ..." (UI spec § 8) */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your tenant {tenantDisplay} has full access. Replace this card with
          your gated feature.
        </p>
      </div>
    </div>
  );
}
