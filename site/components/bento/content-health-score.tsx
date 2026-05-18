"use client";

/**
 * ContentHealthScore (P6) — T045 — PRD-002 Tranche D
 *
 * SVG progress ring (87/100) + dashed-line forecast sparkline.
 * Ring animates stroke-dashoffset from full (empty) to target over 800ms ease-out.
 * Sparkline draws in via stroke-dashoffset over 1000ms.
 * Respects prefers-reduced-motion: reduce (skip animation, render final state).
 *
 * ADR-0018: ZERO fetches at any state.
 * test:no-hex-in-bento: ZERO hex literals — all colors via hsl(var(--…)).
 */

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp } from "lucide-react";
import { PremiumPlaceholder } from "./premium-placeholder";
import { cn } from "@/lib/utils";

// Ring geometry constants
const RING_RADIUS = 40;
const RING_STROKE_WIDTH = 8;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_CENTER = RING_RADIUS + RING_STROKE_WIDTH / 2 + 4; // SVG size = 2*(r+sw/2)+8
const RING_SIZE = RING_CENTER * 2;
const SCORE = 87;
const SCORE_FRACTION = SCORE / 100; // 0.87
const RING_TARGET_OFFSET = RING_CIRCUMFERENCE * (1 - SCORE_FRACTION);

// 7-day forecast trend data (deterministic)
const SPARKLINE_DATA = [50, 55, 53, 60, 65, 68, 72];

// Compute SVG polyline path for sparkline
function buildSparklinePath(data: number[], width: number, height: number): string {
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;
  const xStep = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * xStep;
    const y = height - ((v - minVal) / range) * height * 0.8 - height * 0.1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${points.join(" L ")}`;
}

const SPARKLINE_WIDTH = 120;
const SPARKLINE_HEIGHT = 60;
const SPARKLINE_PATH = buildSparklinePath(SPARKLINE_DATA, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);

// Approximate total path length for draw-in animation.
// For a smooth stroke-dasharray trick we set a large enough value.
const SPARKLINE_PATH_LENGTH = 200;

/** Quadratic ease-out: t * (2 - t) */
function easeOut(t: number): number {
  return t * (2 - t);
}

function useProgressRingAnimation(prefersReduced: boolean) {
  const [dashOffset, setDashOffset] = useState(RING_CIRCUMFERENCE);

  useEffect(() => {
    if (prefersReduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDashOffset(RING_TARGET_OFFSET);
      return;
    }

    const duration = 800;
    const start = performance.now();
    let rafId: number;

    function frame(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOut(progress);
      const current = RING_CIRCUMFERENCE - eased * (RING_CIRCUMFERENCE - RING_TARGET_OFFSET);
      setDashOffset(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        setDashOffset(RING_TARGET_OFFSET);
      }
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [prefersReduced]);

  return dashOffset;
}

function useSparklineAnimation(prefersReduced: boolean) {
  const [dashOffset, setDashOffset] = useState(SPARKLINE_PATH_LENGTH);

  useEffect(() => {
    if (prefersReduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDashOffset(0);
      return;
    }

    const duration = 1000;
    const start = performance.now();
    let rafId: number;

    function frame(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOut(progress);
      setDashOffset(SPARKLINE_PATH_LENGTH * (1 - eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        setDashOffset(0);
      }
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [prefersReduced]);

  return dashOffset;
}

function ContentHealthScoreUnlocked() {
  // Read prefers-reduced-motion inside useEffect (hydration trap guard).
  const [prefersReduced, setPrefersReduced] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && typeof window !== "undefined") {
      initialized.current = true;
      const matches = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrefersReduced(matches);
    }
  }, []);

  const ringOffset = useProgressRingAnimation(prefersReduced);
  const sparklineOffset = useSparklineAnimation(prefersReduced);

  return (
    <div className="p-5 h-full flex flex-col">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">Content health score</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Composite of freshness, coverage, and link integrity
      </p>

      {/* Horizontal split: ring left + sparkline right */}
      <div className="flex items-center gap-6 flex-1">
        {/* Left — progress ring SVG */}
        <div className="flex flex-col items-center gap-1">
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            aria-label={`Content health score: ${SCORE} out of 100`}
            role="img"
          >
            {/* Track circle */}
            <circle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={RING_STROKE_WIDTH}
            />
            {/* Foreground arc — animated */}
            <circle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={RING_STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
            />
            {/* Center label */}
            <text
              x={RING_CENTER}
              y={RING_CENTER - 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="22"
              fontWeight="bold"
              fill="var(--primary)"
            >
              {SCORE}
            </text>
            <text
              x={RING_CENTER}
              y={RING_CENTER + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              score
            </text>
          </svg>
        </div>

        {/* Right — forecast sparkline */}
        <div className="flex flex-col items-start gap-1 flex-1">
          <svg
            width={SPARKLINE_WIDTH}
            height={SPARKLINE_HEIGHT}
            viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
            aria-label="7-day content health forecast trend"
            role="img"
            className="overflow-visible"
          >
            <path
              d={SPARKLINE_PATH}
              stroke="var(--primary)"
              strokeDasharray={`4 4`}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                // Draw-in animation via strokeDashoffset on the dashed path.
                // The dashes cycle at 4px on / 4px off.
                strokeDashoffset: sparklineOffset,
              }}
            />
          </svg>
          <p className="text-xs text-muted-foreground">7-day forecast</p>
        </div>
      </div>
    </div>
  );
}

export interface ContentHealthScoreProps {
  locked: boolean;
  "data-card"?: string;
}

export function ContentHealthScore({ locked, "data-card": dataCard }: ContentHealthScoreProps) {
  return (
    <Card
      style="outline"
      elevation="sm"
      padding="sm"
      className={cn("relative h-full overflow-hidden", !locked && "bento-card--premium")}
      data-card={dataCard ?? "p6"}
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
        <PremiumPlaceholder shape="ring-sparkline" />
      ) : (
        <ContentHealthScoreUnlocked />
      )}
    </Card>
  );
}
