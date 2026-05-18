"use client";

/**
 * CmsHealth (P4) — T043 — PRD-002 Tranche D
 *
 * 4-KPI strip with rAF counter animations.
 * Uses useCounter(target, durationMs) hook for each KPI value.
 * Respects prefers-reduced-motion: reduce (skip to final immediately).
 *
 * ADR-0018: ZERO fetches at any state.
 * test:no-hex-in-bento: ZERO hex literals.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Activity } from "lucide-react";
import { PremiumPlaceholder } from "./premium-placeholder";
import { useCounter } from "@/lib/use-counter";
import { cn } from "@/lib/utils";

// Hardcoded KPI data per PRD-002 § 5 P4.
const KPI_TILES = [
  { id: "total-pages", label: "Total pages", target: 489, sublabel: null },
  { id: "published-week", label: "Published this week", target: 12, sublabel: null },
  { id: "languages", label: "Languages", target: 4, sublabel: null },
  {
    id: "stale-items",
    label: "Stale items",
    target: 23,
    sublabel: "Not updated in 90+ days",
  },
] as const;

export interface CmsHealthProps {
  locked: boolean;
  "data-card"?: string;
}

/** Single KPI tile with counter animation. */
function KpiTile({
  label,
  target,
  sublabel,
  isStale,
}: {
  label: string;
  target: number;
  sublabel: string | null;
  isStale?: boolean;
}) {
  const animated = useCounter(target, 600);

  return (
    <div className="flex flex-col items-center text-center gap-1">
      <div className="flex items-center gap-1">
        {isStale && (
          <Activity
            className="h-4 w-4 text-primary"
            aria-hidden="true"
          />
        )}
        <span className="text-4xl font-bold text-primary tabular-nums">
          {animated}
        </span>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {sublabel && (
        <span className="text-xs text-muted-foreground">{sublabel}</span>
      )}
    </div>
  );
}

function CmsHealthUnlocked() {
  return (
    <div className="p-8 h-full flex flex-col">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1">
        <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">CMS health overview</span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">This tenant, last 30 days</p>

      {/* 4 KPI tiles — responsive grid */}
      <div className="grid grid-cols-4 gap-4 flex-1 items-center sm:grid-cols-2">
        {KPI_TILES.map((kpi) => (
          <KpiTile
            key={kpi.id}
            label={kpi.label}
            target={kpi.target}
            sublabel={kpi.sublabel}
            isStale={kpi.id === "stale-items"}
          />
        ))}
      </div>
    </div>
  );
}

export function CmsHealth({ locked, "data-card": dataCard }: CmsHealthProps) {
  return (
    <Card
      style="outline"
      elevation="sm"
      padding="sm"
      className={cn("relative h-full overflow-hidden", !locked && "bento-card--premium")}
      data-card={dataCard ?? "p4"}
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
        <PremiumPlaceholder shape="kpi-strip" />
      ) : (
        <CmsHealthUnlocked />
      )}
    </Card>
  );
}
