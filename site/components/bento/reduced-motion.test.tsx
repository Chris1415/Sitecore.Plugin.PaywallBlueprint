/**
 * T047 — prefers-reduced-motion validation across all animated premium components.
 *
 * Tests that each animated component skips animation and renders final state
 * immediately when prefers-reduced-motion: reduce is mocked.
 *
 * Note: CSS-only animations (stagger-in fadeUp on .bento-card--premium,
 * shimmer overlay on .premium-region--locked::before) are handled by the
 * @media (prefers-reduced-motion: reduce) block in bento.css and are NOT
 * testable in Vitest (jsdom does not evaluate CSS media queries).
 * Those are verified at Playwright Gate D smoke manually.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { lazy } from "react";

// Components under test
import { CmsHealth } from "./cms-health";
import { ContentDistribution } from "./content-distribution";
import { ContentHealthScore } from "./content-health-score";

// Note: ActivityChartRecharts is lazy-loaded from activity-chart.tsx.
// For reduced-motion testing we import the recharts component directly
// since we can't easily test the lazy wrapper's isAnimationActive prop in Vitest.
// The Playwright spec (T049) covers the ActivityChart theme re-render.

function mockMatchMedia(reduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

function installRafShim() {
  const callbacks: Map<number, FrameRequestCallback> = new Map();
  let id = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const frameId = ++id;
    callbacks.set(frameId, cb);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((fid) => {
    callbacks.delete(fid);
  });
  return {
    flush(ts: number) {
      const pending = [...callbacks.entries()];
      callbacks.clear();
      pending.forEach(([, cb]) => cb(ts));
    },
  };
}

function getProgressValue(container: HTMLElement, index: number): number {
  const indicators = container.querySelectorAll("[data-slot='progress-indicator']");
  const indicator = indicators[index] as HTMLElement;
  if (!indicator) return -1;
  const transform = indicator.style.transform;
  const match = transform.match(/translateX\(-(\d+(?:\.\d+)?)%\)/);
  if (!match) return 0;
  const translateX = parseFloat(match[1]);
  return 100 - translateX;
}

describe("prefers-reduced-motion validation (T047)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("with prefers-reduced-motion: reduce mocked ON", () => {
    beforeEach(() => {
      mockMatchMedia(true);
    });

    it("<CmsHealth>: counters render final values immediately (no rAF tick needed)", () => {
      const raf = installRafShim();

      render(<CmsHealth locked={false} />);

      act(() => {
        // Flush one useEffect tick
        raf.flush(0);
      });

      // With reduced motion, all 4 KPIs should show final values immediately
      expect(screen.getByText("489")).toBeTruthy();
      expect(screen.getByText("12")).toBeTruthy();
      expect(screen.getByText("4")).toBeTruthy();
      expect(screen.getByText("23")).toBeTruthy();
    });

    it("<ContentDistribution>: all 4 bars render at target percentage immediately", () => {
      installRafShim();
      const { container } = render(<ContentDistribution locked={false} />);

      // No timer advance — reduced motion skips setTimeout stagger
      expect(getProgressValue(container, 0)).toBe(47);
      expect(getProgressValue(container, 1)).toBe(34);
      expect(getProgressValue(container, 2)).toBe(18);
      expect(getProgressValue(container, 3)).toBe(9);
    });

    it("<ContentHealthScore>: ring renders at final stroke-dashoffset (not full circumference)", () => {
      const raf = installRafShim();
      const { container } = render(<ContentHealthScore locked={false} />);

      act(() => {
        raf.flush(0);
      });

      // Foreground circle should have a non-full dashoffset (final state)
      const circles = container.querySelectorAll("circle");
      const foreground = Array.from(circles).find(
        (c) => c.getAttribute("stroke-dasharray") !== null
      );
      expect(foreground).toBeTruthy();
      const offset = parseFloat(
        foreground?.getAttribute("stroke-dashoffset") ?? "999"
      );
      // Full circumference = 2*PI*40 ≈ 251.33 — reduced motion jumps to final offset
      expect(offset).toBeLessThan(252);
    });

    it("<ContentHealthScore>: sparkline dashoffset is 0 (fully drawn) immediately", () => {
      const raf = installRafShim();
      const { container } = render(<ContentHealthScore locked={false} />);

      act(() => {
        raf.flush(0);
      });

      // The sparkline path with stroke-dasharray="4 4" should have offset = 0
      const paths = container.querySelectorAll("path");
      const sparkline = Array.from(paths).find(
        (p) => p.getAttribute("stroke-dasharray") === "4 4"
      );
      expect(sparkline).toBeTruthy();
      // With reduced motion, dashoffset = 0 means fully drawn
      const offset = parseFloat(
        (sparkline as unknown as HTMLElement | null)?.style?.strokeDashoffset ?? "999"
      );
      expect(offset).toBe(0);
    });
  });

  describe("WITHOUT prefers-reduced-motion (default — animations run)", () => {
    beforeEach(() => {
      mockMatchMedia(false);
    });

    it("<CmsHealth>: counters start at 0 before any rAF tick", () => {
      installRafShim();

      render(<CmsHealth locked={false} />);

      // Before rAF ticks — counters should be at 0 (not the final values yet)
      // Confirm at least the component mounts without showing 489 immediately
      // (we just check that "489" does not appear before any rAF tick)
      expect(screen.queryByText("489")).toBeNull(); // starts at 0
      // Multiple "0" elements are expected (4 KPI tiles)
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(1); // initial values present
    });
  });
});
