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
import { User } from "lucide-react";
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

export function WelcomeHero({ tenantsRow, "data-card": dataCard }: WelcomeHeroProps) {
  const hostUser = useHostUser() as Record<string, unknown>;
  const appCtx = useAppContext();

  const displayName = pickUserDisplay(hostUser);
  // shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts ApplicationResourceContext
  const tenantDisplayName =
    appCtx?.resourceAccess?.[0]?.tenantDisplayName ?? null;

  const isPremium = tenantsRow?.plan === "premium";

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

      <div className="flex items-center gap-3 mt-auto">
        <Badge colorScheme={isPremium ? "primary" : "neutral"} size="md">
          {isPremium ? "Premium" : "Free plan"}
        </Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="w-4 h-4" aria-hidden="true" />
          <span>{typeof hostUser.email === "string" ? hostUser.email : ""}</span>
        </span>
      </div>
    </section>
  );
}
