/**
 * AllowedState — post-gate welcome component (FR-9 defensive layered render).
 *
 * Extracted from components/gated-section.tsx (T031). All four state components
 * now live in src/lib/paywall/states/ as a self-contained portable library.
 *
 * Reads useAppContext() + useHostUser() directly — the MarketplaceProvider
 * contract guarantees both are non-null by the time this component renders.
 *
 * LOCKED DESIGN DECISIONS:
 *
 * User display chain (from sdk-fixtures/host-user.json $design_decisions):
 *   host.user.given_name → host.user.name → host.user.email.split('@')[0] → "there"
 *
 * Tenant display chain (from sdk-fixtures/application-context.json $design_decisions):
 *   resourceAccess[0].tenantDisplayName
 *   → resourceAccess[0].tenantName
 *   → marketplaceAppTenantId.slice(-8)
 *   → "your tenant"
 *
 * shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
 * Verified 2026-05-13 against fixture project-planning/architecture/sdk-fixtures/application-context.json
 *
 * sitecore:blok-theming — text-primary for CircleCheck icon (positive/success state)
 * Lucide CircleCheck at text-primary, 32×32 per UI spec § 3.4.
 *
 * T031 GREEN for T037a-AllowedState tests.
 */

"use client";

import { CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppContext, useHostUser } from "@/components/providers/marketplace";

// ---------------------------------------------------------------------------
// pickUserDisplay — user display chain (LOCKED per host-user.json $design_decisions)
// source: project-planning/architecture/sdk-fixtures/host-user.json ($design_decisions)
// Moved from components/gated-section.tsx — same logic, same signatures.
// ---------------------------------------------------------------------------
export function pickUserDisplay(user: Record<string, unknown>): string {
  if (user?.given_name && typeof user.given_name === "string") {
    return user.given_name;
  }
  if (user?.name && typeof user.name === "string") {
    return user.name;
  }
  if (user?.email && typeof user.email === "string") {
    return user.email.split("@")[0];
  }
  return "there";
}

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
