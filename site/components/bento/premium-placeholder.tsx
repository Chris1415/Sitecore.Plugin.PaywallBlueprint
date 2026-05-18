"use client";

/**
 * PremiumPlaceholder — T025 (PRD-002 Tranche C)
 *
 * Skeleton silhouette component displayed inside locked premium cards.
 * Intentionally structural — no real text content, no fake data.
 * Shapes hint at the eventual card content without revealing it.
 *
 * sitecore:blok-theming — ZERO hex literals. Semantic tokens only.
 * test:no-hex-in-bento enforces this at CI time.
 *
 * ADR-0018: Premium cards make ZERO fetches at any state.
 */

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type PlaceholderShape =
  | "chart"
  | "progress-bars"
  | "list"
  | "kpi-strip"
  | "bullets"
  | "ring-sparkline";

export interface PremiumPlaceholderProps {
  shape: PlaceholderShape;
  /** Forwarded to the outermost element so bento grid [data-card="..."] selectors apply. */
  "data-card"?: string;
}

export function PremiumPlaceholder({
  shape,
  "data-card": dataCard,
}: PremiumPlaceholderProps) {
  return (
    <Card className="relative p-5 h-full" data-card={dataCard}>
      {renderShape(shape)}
    </Card>
  );
}

function renderShape(shape: PlaceholderShape) {
  switch (shape) {
    case "chart":
      return <ChartShape />;
    case "progress-bars":
      return <ProgressBarsShape />;
    case "list":
      return <ListShape />;
    case "kpi-strip":
      return <KpiStripShape />;
    case "bullets":
      return <BulletsShape />;
    case "ring-sparkline":
      return <RingSparklineShape />;
  }
}

/** chart: wide rectangle + wavy SVG silhouette */
function ChartShape() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-32 w-full" />
      {/* Wavy SVG silhouette suggesting chart shape */}
      <svg
        viewBox="0 0 200 40"
        className="w-full h-8 mt-1"
        aria-hidden="true"
      >
        <path
          d="M0,30 C20,20 30,10 50,15 C70,20 80,35 100,25 C120,15 130,5 150,10 C170,15 180,30 200,20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}

/** progress-bars: 3 stacked thin rectangles */
function ProgressBarsShape() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

/** list: 5 rows, each with a 24×24 circle + 2 text bars */
function ListShape() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** kpi-strip: 4 inline blocks in a horizontal flex row */
function KpiStripShape() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 flex-1 min-w-0">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** bullets: 3 short text bars */
function BulletsShape() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

/** ring-sparkline: a circle outline + a wavy line */
function RingSparklineShape() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton className="h-4 w-1/3" />
      <div className="flex items-center gap-4">
        {/* Circle outline */}
        <svg
          viewBox="0 0 80 80"
          className="w-20 h-20 flex-shrink-0"
          aria-hidden="true"
        >
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            opacity="0.3"
          />
        </svg>
        {/* Wavy sparkline */}
        <div className="flex-1 min-w-0">
          <svg viewBox="0 0 100 30" className="w-full h-8" aria-hidden="true">
            <path
              d="M0,20 C10,15 20,10 30,15 C40,20 50,25 60,18 C70,12 80,8 100,12"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              opacity="0.3"
            />
          </svg>
          <Skeleton className="h-3 w-2/3 mt-2" />
        </div>
      </div>
    </div>
  );
}
