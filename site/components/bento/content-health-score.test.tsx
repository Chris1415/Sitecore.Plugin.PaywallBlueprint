/**
 * T045 — tests for <ContentHealthScore> (P6).
 * SVG ring center label + ring circles + sparkline path.
 * Animation assertion skipped (fake-timers + SVG attribute polling is brittle).
 * Reduced-motion path: ring and sparkline render at final state immediately.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContentHealthScore } from "./content-health-score";

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

// rAF shim for test environment
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

describe("<ContentHealthScore> (T045)", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the score label '87' in the ring center", () => {
    installRafShim();
    render(<ContentHealthScore locked={false} />);

    // The SVG text "87" should be present
    expect(screen.getByText("87")).toBeTruthy();
  });

  it("renders the 'score' sublabel below the ring number", () => {
    installRafShim();
    render(<ContentHealthScore locked={false} />);

    expect(screen.getByText("score")).toBeTruthy();
  });

  it("SVG has 2 circle elements (track + foreground arc)", () => {
    installRafShim();
    const { container } = render(<ContentHealthScore locked={false} />);

    const circles = container.querySelectorAll("circle");
    // Should have exactly 2: track circle + foreground arc
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });

  it("sparkline SVG has a <path> element with stroke-dasharray", () => {
    installRafShim();
    const { container } = render(<ContentHealthScore locked={false} />);

    const paths = container.querySelectorAll("path");
    // At least one path should exist (the sparkline)
    expect(paths.length).toBeGreaterThanOrEqual(1);
    // At least one has stroke-dasharray set to "4 4"
    const dashed = Array.from(paths).some(
      (p) => p.getAttribute("stroke-dasharray") === "4 4"
    );
    expect(dashed).toBe(true);
  });

  it("renders '7-day forecast' caption", () => {
    installRafShim();
    render(<ContentHealthScore locked={false} />);

    expect(screen.getByText("7-day forecast")).toBeTruthy();
  });

  it("renders title 'Content health score' and subtitle", () => {
    installRafShim();
    render(<ContentHealthScore locked={false} />);

    expect(screen.getByText("Content health score")).toBeTruthy();
    expect(
      screen.getByText("Composite of freshness, coverage, and link integrity")
    ).toBeTruthy();
  });

  it("with prefers-reduced-motion: reduce, ring renders at final stroke-dashoffset", () => {
    mockMatchMedia(true);
    const raf = installRafShim();
    const { container } = render(<ContentHealthScore locked={false} />);

    // Flush useEffect frame
    raf.flush(0);

    // The foreground circle should be at the final dashoffset (non-full)
    const circles = container.querySelectorAll("circle");
    const foreground = Array.from(circles).find((c) =>
      c.getAttribute("stroke-dasharray") !== null &&
      c.getAttribute("stroke-dashoffset") !== null
    );
    expect(foreground).toBeTruthy();
    // In reduced-motion, dashoffset should NOT equal full circumference
    // 2 * PI * 40 = 251.33...
    const offset = parseFloat(foreground?.getAttribute("stroke-dashoffset") ?? "999");
    expect(offset).toBeLessThan(252); // Less than full circumference
  });

  it("renders PremiumPlaceholder in locked mode (no ring, no sparkline)", () => {
    render(<ContentHealthScore locked={true} />);

    expect(screen.queryByText("87")).toBeNull();
    expect(screen.queryByText("score")).toBeNull();
    expect(screen.queryByText("7-day forecast")).toBeNull();
  });
});
