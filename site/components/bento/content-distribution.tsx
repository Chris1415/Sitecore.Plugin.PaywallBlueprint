"use client";

/**
 * ContentDistribution (P2) — T041 — PRD-002 Tranche D
 *
 * 4 animated progress bars by template type.
 * Animated fill: 0 → target over 800ms ease-out, with 200ms stagger between bars.
 * prefers-reduced-motion: respected — skip to final value immediately.
 *
 * ADR-0018: ZERO fetches at any state.
 * test:no-hex-in-bento: ZERO hex literals.
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";
import { PremiumPlaceholder } from "./premium-placeholder";
import { cn } from "@/lib/utils";

// Hardcoded content distribution data per PRD-002 § 5 P2.
const DISTRIBUTION_ROWS = [
  { label: "Pages", count: 124, percent: 47 },
  { label: "Datasources", count: 89, percent: 34 },
  { label: "Components", count: 47, percent: 18 },
  { label: "Forms", count: 23, percent: 9 },
] as const;

export interface ContentDistributionProps {
  locked: boolean;
  "data-card"?: string;
}

function ContentDistributionUnlocked() {
  // Per-bar animated value states, starting at 0.
  const [values, setValues] = useState([0, 0, 0, 0]);

  useEffect(() => {
    // Read browser global inside useEffect — NOT in render (hydration trap).
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Skip animation — set all bars to target immediately.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(DISTRIBUTION_ROWS.map((r) => r.percent));
      return;
    }

    // Stagger: each bar starts 200ms after the previous one.
    const timers = DISTRIBUTION_ROWS.map((row, i) => {
      return setTimeout(() => {
        setValues((prev) => {
          const next = [...prev];
          next[i] = row.percent;
          return next;
        });
      }, i * 200);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="p-5 h-full flex flex-col">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1">
        <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">Content distribution</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Items by template type</p>

      {/* 4 progress bar rows */}
      <div className="flex flex-col gap-3 flex-1">
        {DISTRIBUTION_ROWS.map((row, i) => (
          <div key={row.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-foreground">{row.label}</span>
              <span className="text-sm font-semibold text-foreground">
                {row.count} <span className="text-primary">({row.percent}%)</span>
              </span>
            </div>
            {/* Progress uses CSS transition internally for smooth fill */}
            <Progress
              value={values[i]}
              className="h-2"
              aria-label={`${row.label} ${row.percent}%`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContentDistribution({ locked, "data-card": dataCard }: ContentDistributionProps) {
  return (
    <Card
      style="outline"
      elevation="sm"
      padding="sm"
      className={cn("relative h-full overflow-hidden", !locked && "bento-card--premium")}
      data-card={dataCard ?? "p2"}
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
        <PremiumPlaceholder shape="progress-bars" />
      ) : (
        <ContentDistributionUnlocked />
      )}
    </Card>
  );
}
