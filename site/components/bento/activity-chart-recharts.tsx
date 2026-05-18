"use client";

/**
 * ActivityChartRecharts — T040 — PRD-002 Tranche D
 *
 * Heavy Recharts chunk, lazy-loaded from activity-chart.tsx.
 * Hardcoded 30-day deterministic fake data per ADR-0018.
 *
 * Theme reactivity: key={resolvedTheme} on <ResponsiveContainer> forces
 * a full remount on theme flip so Recharts re-resolves hsl() color tokens
 * against the current theme variables. (UI v2 OQ-v2-4 fallback pattern)
 *
 * prefers-reduced-motion: read inside useEffect (NOT in render body).
 * Hydration trap guard: no browser globals in render or useState initializer.
 *
 * ADR-0018: ZERO fetches, ZERO SDK calls, ZERO DB queries.
 * test:no-hex-in-bento: ZERO hex literals — all colors via hsl(var(--…)).
 */

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

// Deterministic 30-day daily publish counts.
// Weekday peak (i%7 < 5) + sinusoidal variation.
// No randomness — same data every render.
const DATA = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  count: 40 + Math.round(20 * Math.sin(i / 4)) + (i % 7 < 5 ? 10 : 0),
}));

export default function ActivityChartRecharts() {
  const { resolvedTheme } = useTheme();

  // prefers-reduced-motion: read inside useEffect — NOT in render body.
  // Hydration trap: browser globals must only be accessed after mount.
  const [prefersReducedMotion, setPRM] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPRM(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  return (
    <div className="p-5 h-full flex flex-col">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">Publishing activity</span>
        <Badge variant="default" colorScheme="primary" className="ml-auto text-xs text-background">
          +12% vs prev
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        30-day publish frequency across all sites
      </p>

      {/* Chart — key={resolvedTheme} forces remount on theme flip so Recharts
          re-resolves all hsl() CSS var colors against the new theme. */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer
          width="100%"
          height={200}
          key={resolvedTheme ?? "default"}
        >
          <AreaChart data={DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="activity-chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--primary)"
              fill="url(#activity-chart-fill)"
              strokeWidth={2.5}
              isAnimationActive={!prefersReducedMotion}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
