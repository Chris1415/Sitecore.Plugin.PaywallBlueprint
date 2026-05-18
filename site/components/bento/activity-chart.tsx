"use client";

/**
 * ActivityChart (P1) — T040 — PRD-002 Tranche D
 *
 * Lightweight wrapper that lazy-loads the heavy Recharts chunk.
 * Locked state: renders <PremiumPlaceholder shape="chart" />.
 * Unlocked state: lazy-loads <ActivityChartRecharts /> via React.lazy + Suspense.
 *
 * Recharts (~80–100kb gzip) is code-split into a separate chunk so the
 * free-tier first paint does NOT pay the bundle cost.
 *
 * ADR-0018: ZERO fetches, ZERO SDK calls, ZERO DB queries at any state.
 * test:no-hex-in-bento: ZERO hex literals.
 */

import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { PremiumPlaceholder } from "./premium-placeholder";
import { cn } from "@/lib/utils";

// Lazy import — Recharts ships as a separate chunk.
// The import path `./activity-chart-recharts` is the heavy file created by T040.
const ActivityChartRecharts = lazy(
  () => import("./activity-chart-recharts")
);

export interface ActivityChartProps {
  locked: boolean;
  "data-card"?: string;
}

export function ActivityChart({ locked, "data-card": dataCard }: ActivityChartProps) {
  return (
    <Card
      style="outline"
      elevation="sm"
      padding="sm"
      className={cn("relative h-full overflow-hidden", !locked && "bento-card--premium")}
      data-card={dataCard ?? "p1"}
    >
      {/* Premium corner badge — visible in both locked and unlocked state.
          Positioned above the blur via z-index + isolation. */}
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
        <PremiumPlaceholder shape="chart" data-card={dataCard} />
      ) : (
        <Suspense fallback={<PremiumPlaceholder shape="chart" />}>
          <ActivityChartRecharts />
        </Suspense>
      )}
    </Card>
  );
}
