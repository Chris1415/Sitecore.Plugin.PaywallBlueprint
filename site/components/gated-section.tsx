/**
 * GatedSection — bottom section of the freemium layout (T023, Tranche B).
 *
 * Implements the defensive layered render per FR-9 / UI spec § 3.4.
 * Reads BOTH application.context (useAppContext) and host.user (useHostUser)
 * which are resolved by MarketplaceProvider before this component renders.
 *
 * LOCKED DESIGN DECISIONS (from sdk-fixtures/$design_decisions):
 *
 * User display chain:
 *   host.user.given_name → host.user.name → host.user.email.split('@')[0] → "there"
 *
 * Tenant display chain:
 *   resourceAccess[0].tenantDisplayName
 *   → resourceAccess[0].tenantName
 *   → marketplaceAppTenantId.slice(-8)
 *   → "your tenant"
 *
 * shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
 * Verified 2026-05-13 against fixture project-planning/architecture/sdk-fixtures/application-context.json
 *
 * host.user shape: project-planning/architecture/sdk-fixtures/host-user.json
 * Runtime is camelCase Auth0 claims — use [key: string]: unknown index signature access.
 *
 * Tranche C (T035) will wrap the inner card in <PaywallGate>.
 *
 * sitecore:blok-components — uses @blok/card (Card), @blok/badge (Badge).
 * sitecore:blok-theming — semantic tokens only; no hex values.
 * Lucide CircleCheck icon at text-primary (32×32).
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CircleCheck } from "lucide-react";
import { useAppContext, useHostUser } from "@/components/providers/marketplace";

// ---------------------------------------------------------------------------
// pickUserDisplay — user display chain (LOCKED per host-user.json $design_decisions)
// source: project-planning/architecture/sdk-fixtures/host-user.json ($design_decisions)
// ---------------------------------------------------------------------------
export function pickUserDisplay(user: Record<string, unknown>): string {
  if (user?.given_name && typeof user.given_name === 'string') {
    return user.given_name;
  }
  if (user?.name && typeof user.name === 'string') {
    return user.name;
  }
  if (user?.email && typeof user.email === 'string') {
    return user.email.split('@')[0];
  }
  return 'there';
}

// ---------------------------------------------------------------------------
// pickTenantDisplay — tenant display chain (LOCKED per application-context.json $design_decisions)
// source: project-planning/architecture/sdk-fixtures/application-context.json ($design_decisions)
// ---------------------------------------------------------------------------
export function pickTenantDisplay(ctx: Record<string, unknown>): string {
  const ra = Array.isArray(ctx?.resourceAccess) ? ctx.resourceAccess[0] as Record<string, unknown> : undefined;
  if (ra?.tenantDisplayName && typeof ra.tenantDisplayName === 'string') {
    return ra.tenantDisplayName;
  }
  if (ra?.tenantName && typeof ra.tenantName === 'string') {
    return ra.tenantName;
  }
  const id = ctx?.marketplaceAppTenantId;
  if (typeof id === 'string' && id.length > 0) {
    return id.slice(-8);
  }
  return 'your tenant';
}

// ---------------------------------------------------------------------------
// GatedSection — composes the two display chains into the welcome card
// ---------------------------------------------------------------------------
export function GatedSection() {
  // shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
  // Verified 2026-05-13 against fixture project-planning/architecture/sdk-fixtures/application-context.json
  // Runtime is camelCase (marketplaceAppTenantId) with legacy aliases (resources, touchpoints).
  // Use index signature access — TypeScript's [key: string]: any on ApplicationContext permits this.
  const appContext = useAppContext() as unknown as Record<string, unknown>;
  const hostUser = useHostUser() as unknown as Record<string, unknown>;

  const userDisplay = pickUserDisplay(hostUser);
  const tenantDisplay = pickTenantDisplay(appContext);

  return (
    <section
      aria-labelledby="gated-section-heading"
      className="w-full"
    >
      <Card style="outline" elevation="sm" padding="lg">
        {/* Premium eyebrow badge — colorScheme="primary" for gated/paid tier */}
        <Badge colorScheme="primary" size="md">
          Premium
        </Badge>

        <div className="flex flex-col gap-4">
          {/* Positive state icon — text-primary per UI spec § 3.4 */}
          <CircleCheck
            className="text-primary"
            size={32}
            aria-hidden="true"
          />

          {/* Heading — defensive layered render from host.user (T023) */}
          <h2
            id="gated-section-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Welcome, {userDisplay}
          </h2>

          {/* Body — defensive layered render from application.context (T023) */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your tenant {tenantDisplay} has full access. Replace this card with
            your gated feature.
          </p>
        </div>
      </Card>
    </section>
  );
}
