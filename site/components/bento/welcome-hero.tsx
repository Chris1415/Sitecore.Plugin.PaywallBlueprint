"use client";

/**
 * WelcomeHero — F1 bento card (hero, 2×2).
 *
 * T011 — PRD-002 Tranche B.
 *
 * Reads useHostUser() + useAppContext() from MarketplaceProvider.
 * Receives tenantsRow via props from BentoGrid (server-rendered at page level).
 *
 * Visual source of truth: pocs/poc-v2-prd002/index.html lines 103–131 (data-card="f1")
 *
 * sitecore:blok-theming — ZERO hex literals. Semantic tokens only.
 * test:no-hex-in-bento enforces this at CI time.
 */

import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Building2, Globe2, Calendar } from "lucide-react";
import {
  useHostUser,
  useAppContext,
} from "@/components/providers/marketplace";
import { pickUserDisplay } from "@/src/lib/paywall/pickUserDisplay";

interface WelcomeHeroProps {
  tenantsRow: {
    plan: string;
    status: string;
    created_at: string;
  } | null;
  "data-card"?: string;
}

function formatMemberSince(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

export function WelcomeHero({ tenantsRow, "data-card": dataCard }: WelcomeHeroProps) {
  const hostUser = useHostUser() as Record<string, unknown>;
  const appCtx = useAppContext();

  const displayName = pickUserDisplay(hostUser);
  // shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts ApplicationResourceContext
  const ra = appCtx?.resourceAccess?.[0];
  const tenantDisplayName = ra?.tenantDisplayName ?? null;
  const organization = ra?.tenantName ?? null;
  const environment = ra?.context?.live ?? null;
  const memberSince = formatMemberSince(tenantsRow?.created_at);

  const isPremium = tenantsRow?.plan === "premium";
  const email = typeof hostUser.email === "string" ? hostUser.email : "";

  return (
    <section
      className="bento-card-hero welcome-hero bg-card border border-border rounded-lg p-8 flex flex-col gap-4"
      data-card={dataCard ?? "f1"}
      aria-labelledby="f1-title"
    >
      <div className="flex flex-col gap-2">
        <h1
          id="f1-title"
          className="text-4xl font-semibold text-foreground"
        >
          Welcome, {displayName}.
        </h1>
        <p className="text-lg text-muted-foreground">
          {tenantDisplayName ?? "\u2014"}
        </p>
      </div>

      <Separator />

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
        {organization && (
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
              Organization
            </dt>
            <dd className="text-sm font-medium text-foreground truncate">
              {organization}
            </dd>
          </div>
        )}
        {environment && (
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Globe2 className="w-3.5 h-3.5" aria-hidden="true" />
              Environment
            </dt>
            <dd className="text-sm font-medium text-foreground truncate font-mono">
              {environment}
            </dd>
          </div>
        )}
        {memberSince && (
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              Member since
            </dt>
            <dd className="text-sm font-medium text-foreground truncate">
              {memberSince}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex items-center gap-3 mt-auto pt-2">
        <Badge colorScheme={isPremium ? "primary" : "neutral"} size="md">
          {isPremium ? "Premium" : "Free plan"}
        </Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="w-4 h-4" aria-hidden="true" />
          <span>{email}</span>
        </span>
      </div>
    </section>
  );
}
