/**
 * T041 — tests for <ContentDistribution> (P2).
 * 4 progress bars with correct labels, values, and stagger.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ContentDistribution } from "./content-distribution";

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

/**
 * Read the current progress value from a Radix Progress indicator's transform style.
 * The indicator uses `transform: translateX(-{100 - value}%)`.
 * Example: value=47 → translateX(-53%), so translate = -53, value = 100 - 53 = 47.
 */
function getProgressValue(container: HTMLElement, index: number): number {
  const indicators = container.querySelectorAll("[data-slot='progress-indicator']");
  const indicator = indicators[index] as HTMLElement;
  if (!indicator) return -1;
  const transform = indicator.style.transform;
  const match = transform.match(/translateX\(-(\d+(?:\.\d+)?)%\)/);
  if (!match) return 0; // translateX(-0%) or no transform = value 100
  const translateX = parseFloat(match[1]);
  return 100 - translateX;
}

describe("<ContentDistribution> (T041)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders 4 progress bar rows with correct labels in unlocked mode", () => {
    render(<ContentDistribution locked={false} />);

    expect(screen.getByText("Pages")).toBeTruthy();
    expect(screen.getByText("Datasources")).toBeTruthy();
    expect(screen.getByText("Components")).toBeTruthy();
    expect(screen.getByText("Forms")).toBeTruthy();
  });

  it("renders correct count and percent display for each row", () => {
    const { container } = render(<ContentDistribution locked={false} />);

    // Count + percent are split across two <span> nodes (count in foreground,
    // percent in text-primary as a visual accent — Gate D 2026-05-18 color sweep).
    // Match against the combined text content of the count+percent row.
    const rowTexts = Array.from(
      container.querySelectorAll(".text-sm.font-semibold"),
    ).map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "");

    expect(rowTexts).toContain("124 (47%)");
    expect(rowTexts).toContain("89 (34%)");
    expect(rowTexts).toContain("47 (18%)");
    expect(rowTexts).toContain("23 (9%)");
  });

  it("stagger: bar 3 and bar 4 are still at 0 after just 200ms (400ms / 600ms delays)", () => {
    const { container } = render(<ContentDistribution locked={false} />);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Bar at index 2 (400ms stagger) and index 3 (600ms stagger) should still be 0
    expect(getProgressValue(container, 2)).toBe(0);
    expect(getProgressValue(container, 3)).toBe(0);
  });

  it("after 800ms (all stagger delays elapsed), all 4 bars are at their target values", () => {
    const { container } = render(<ContentDistribution locked={false} />);

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(getProgressValue(container, 0)).toBe(47);
    expect(getProgressValue(container, 1)).toBe(34);
    expect(getProgressValue(container, 2)).toBe(18);
    expect(getProgressValue(container, 3)).toBe(9);
  });

  it("with prefers-reduced-motion: reduce, all bars render at target values immediately", () => {
    mockMatchMedia(true);

    const { container } = render(<ContentDistribution locked={false} />);

    // No timer advance needed — reduced motion skips all animation
    expect(getProgressValue(container, 0)).toBe(47);
    expect(getProgressValue(container, 1)).toBe(34);
    expect(getProgressValue(container, 2)).toBe(18);
    expect(getProgressValue(container, 3)).toBe(9);
  });

  it("4 progress indicators are present in unlocked mode", () => {
    const { container } = render(<ContentDistribution locked={false} />);

    const indicators = container.querySelectorAll("[data-slot='progress-indicator']");
    expect(indicators.length).toBe(4);
  });

  it("renders PremiumPlaceholder in locked mode", () => {
    render(<ContentDistribution locked={true} />);

    expect(screen.queryByText("Pages")).toBeNull();
    expect(screen.queryByText("Datasources")).toBeNull();
  });
});
