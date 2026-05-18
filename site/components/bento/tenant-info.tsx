"use client";

/**
 * TenantInfo — F5 bento card (full-width strip).
 *
 * T016 — PRD-002 Tranche B.
 *
 * Reads useAppContext() from MarketplaceProvider.
 * Visual source of truth: pocs/poc-v2-prd002/index.html lines 185–215 (data-card="f5")
 *
 * SDK type citation:
 *   shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts ApplicationContext
 *   shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts ApplicationResourceContext
 *
 * Field mapping notes (captured from .d.ts — no organizationName on ResourceAccess):
 *   Display name: resourceAccess[0].tenantDisplayName ?? '—'
 *   Tenant ID:    marketplaceAppTenantId truncated to first 8 + '…' + last 4
 *   Organization: resourceAccess[0].tenantName ?? '—'  (no organizationName on the type)
 *   Environment:  resourceAccess[0].context?.live ?? '—'
 *
 * sitecore:blok-theming — ZERO hex literals. Semantic tokens only.
 * test:no-hex-in-bento enforces this at CI time.
 */

import { Plug } from "lucide-react";
import { useAppContext } from "@/components/providers/marketplace";

interface TenantInfoProps {
  "data-card"?: string;
}

/**
 * truncateTenantId — short form: first 8 chars + '…' + last 4 chars.
 * Returns '—' if undefined/empty.
 */
function truncateTenantId(id: string | undefined | null): string {
  if (!id || id.length < 12) return id ?? "\u2014";
  return id.slice(0, 8) + "\u2026" + id.slice(-4);
}

interface InfoCellProps {
  label: string;
  value: string;
  mono?: boolean;
}

function InfoCell({ label, value, mono }: InfoCellProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          "text-sm text-foreground" + (mono ? " font-mono" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function TenantInfo({ "data-card": dataCard }: TenantInfoProps = {}) {
  // shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts ApplicationContext
  const appCtx = useAppContext();

  // shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts ApplicationResourceContext
  const ra = appCtx?.resourceAccess?.[0];

  const displayName = ra?.tenantDisplayName ?? "\u2014";
  const tenantId = truncateTenantId(appCtx?.marketplaceAppTenantId);
  // organizationName is not on the type — using tenantName as the closest available field
  const organization = ra?.tenantName ?? "\u2014";
  const environment = ra?.context?.live ?? "\u2014";

  return (
    <section
      className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4"
      data-card={dataCard ?? "f5"}
      aria-labelledby="f5-title"
    >
      {/* Header row */}
      <div className="flex items-center gap-2" id="f5-title">
        <Plug className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">
          Tenant info
        </span>
      </div>

      {/* 4-cell grid */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCell label="Display name" value={displayName} />
        <InfoCell label="Tenant ID" value={tenantId} mono />
        <InfoCell label="Organization" value={organization} />
        <InfoCell label="Environment" value={environment} />
      </dl>
    </section>
  );
}
