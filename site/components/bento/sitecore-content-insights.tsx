"use client";

/**
 * SitecoreContentInsights (P5) — T044 — PRD-002 Tranche D
 *
 * 3 hardcoded Sitecore-flavored content insight bullets per PRD-002 § 5 P5.
 * No JS animation — stagger-in handled by parent bento-card--premium CSS.
 * Static strings only — NO AI calls, NO fetches.
 *
 * ADR-0018: ZERO fetches at any state.
 * test:no-hex-in-bento: ZERO hex literals.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PremiumPlaceholder } from "./premium-placeholder";
import { cn } from "@/lib/utils";

// Hardcoded 3 insight bullets per PRD-002 § 5 P5.
// Module-scope constant — no re-creation on render.
const INSIGHTS = [
  "Your blog template is reused 47 times across 3 sites — consider promoting to a shared component.",
  "12 items haven't been updated in 90+ days — review for archival candidates.",
  "Publishing frequency dropped 23% Mon–Fri vs last week — check editorial calendar.",
] as const;

export interface SitecoreContentInsightsProps {
  locked: boolean;
  "data-card"?: string;
}

function SitecoreContentInsightsUnlocked() {
  return (
    <div className="p-5 h-full flex flex-col">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">Sitecore content insights</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">AI-derived patterns from your content</p>

      {/* 3 bullets separated by <Separator /> */}
      <div className="flex flex-col gap-0 flex-1">
        {INSIGHTS.map((insight, i) => (
          <div key={i}>
            <p className="text-sm text-foreground py-3">{insight}</p>
            {i < INSIGHTS.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SitecoreContentInsights({
  locked,
  "data-card": dataCard,
}: SitecoreContentInsightsProps) {
  return (
    <Card
      style="outline"
      elevation="sm"
      padding="sm"
      className={cn("relative h-full overflow-hidden", !locked && "bento-card--premium")}
      data-card={dataCard ?? "p5"}
    >
      {/* Premium corner badge */}
      <span
        className="absolute top-3 right-3 z-[5] flex items-center gap-1"
        style={{ isolation: "isolate" }}
        aria-label="Premium feature"
      >
        <Badge variant="default" className="flex items-center gap-1 text-xs text-background">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Premium
        </Badge>
      </span>

      {locked ? (
        <PremiumPlaceholder shape="bullets" />
      ) : (
        <SitecoreContentInsightsUnlocked />
      )}
    </Card>
  );
}
