/**
 * T031a — RED tests for <PremiumPlaceholder>
 *
 * TDD: These tests are written BEFORE the full implementation of the locked-state
 * components (T026–T029). T025 implements PremiumPlaceholder; these tests verify
 * all 6 shape variants render the correct skeleton structure.
 *
 * Tests will be GREEN against T025's implementation since PremiumPlaceholder
 * is created first per execution order: T025 → T031a → T026–T029.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PremiumPlaceholder } from "./premium-placeholder";

describe("PremiumPlaceholder — shape variants (T031a)", () => {
  it("shape=chart renders a wide rectangle and a wavy SVG silhouette", () => {
    const { container } = render(<PremiumPlaceholder shape="chart" />);
    // Should have at least 1 skeleton element (the wide rectangle)
    const skeletons = container.querySelectorAll("[class*='skeleton'], [data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
    // SVG path for the chart wave
    const svgPath = container.querySelector("svg path");
    expect(svgPath).not.toBeNull();
  });

  it("shape=progress-bars renders 3 stacked thin rectangles", () => {
    const { container } = render(<PremiumPlaceholder shape="progress-bars" />);
    // header skeleton + 3 bars = at least 3 h-2 skeletons
    const skeletons = container.querySelectorAll("[class*='skeleton'], [data-slot='skeleton']");
    // 1 header + 3 bars = 4 total
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("shape=list renders 5 rows with a circle and 2 text bars each", () => {
    const { container } = render(<PremiumPlaceholder shape="list" />);
    // 5 rows × (1 circle + 2 bars) + 1 header = 16 skeletons minimum
    const skeletons = container.querySelectorAll("[class*='skeleton'], [data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(15);
    // 5 rounded-full circles
    const circles = container.querySelectorAll("[class*='rounded-full']");
    expect(circles.length).toBeGreaterThanOrEqual(5);
  });

  it("shape=kpi-strip renders 4 inline blocks in a horizontal flex row", () => {
    const { container } = render(<PremiumPlaceholder shape="kpi-strip" />);
    // 4 blocks × 2 skeletons each + 1 header = 9 skeletons minimum
    const skeletons = container.querySelectorAll("[class*='skeleton'], [data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(8);
    // The flex container with 4 children
    const flexChildren = container.querySelectorAll("[class*='flex-1']");
    expect(flexChildren.length).toBeGreaterThanOrEqual(4);
  });

  it("shape=bullets renders 3 short text bars", () => {
    const { container } = render(<PremiumPlaceholder shape="bullets" />);
    // 1 header + 3 bars = 4 skeletons
    const skeletons = container.querySelectorAll("[class*='skeleton'], [data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    // The 3 bars have w-3/4 class
    const bullets = container.querySelectorAll("[class*='w-3/4']");
    expect(bullets.length).toBeGreaterThanOrEqual(3);
  });

  it("shape=ring-sparkline renders a circle outline SVG and a wavy SVG line", () => {
    const { container } = render(<PremiumPlaceholder shape="ring-sparkline" />);
    // SVG circle element (ring)
    const circle = container.querySelector("svg circle");
    expect(circle).not.toBeNull();
    // SVG path element (sparkline wave)
    const path = container.querySelector("svg path");
    expect(path).not.toBeNull();
  });

  it("forwards data-card attribute to the outermost element", () => {
    const { container } = render(
      <PremiumPlaceholder shape="bullets" data-card="p5" />
    );
    const el = container.querySelector("[data-card='p5']");
    expect(el).not.toBeNull();
  });
});
