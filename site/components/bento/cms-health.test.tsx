/**
 * T043a — RED tests for <CmsHealth> (P4).
 * Written BEFORE T043 implements the component unlocked branch.
 *
 * These tests will fail RED because:
 *   - useCounter stub always returns 0 (never reaches target values).
 *   - CmsHealth unlocked branch currently renders PremiumPlaceholder (no KPI labels).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CmsHealth } from "./cms-health";

// Mock matchMedia (jsdom default: always returns matches:false)
function mockMatchMediaReducedMotion(reduced: boolean) {
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

// rAF shim for advancing animation frames
function installRafShim() {
  let id = 0;
  const callbacks: Map<number, FrameRequestCallback> = new Map();
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const frameId = ++id;
    callbacks.set(frameId, cb);
    return frameId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frameId) => {
    callbacks.delete(frameId);
  });
  return callbacks;
}

function flushAllRaf(callbacks: Map<number, FrameRequestCallback>, until: number, step = 16) {
  let now = 0;
  while (now <= until && callbacks.size > 0) {
    const pending = [...callbacks.entries()];
    callbacks.clear();
    pending.forEach(([, cb]) => cb(now));
    now += step;
  }
}

describe("<CmsHealth> (T043a RED)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMediaReducedMotion(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("RED: renders 4 KPI labels in unlocked mode (Total pages / Published this week / Languages / Stale items)", async () => {
    installRafShim();
    render(<CmsHealth locked={false} />);

    // RED: currently renders PremiumPlaceholder, not KPI labels
    expect(screen.getByText(/total pages/i)).toBeTruthy();
    expect(screen.getByText(/published this week/i)).toBeTruthy();
    expect(screen.getByText(/languages/i)).toBeTruthy();
    expect(screen.getByText(/stale items/i)).toBeTruthy();
  });

  it("RED: KPI final values reach 489, 12, 4, 23 after fake-timer advance", async () => {
    const callbacks = installRafShim();

    render(<CmsHealth locked={false} />);

    act(() => {
      flushAllRaf(callbacks, 1000);
    });

    // RED: stub useCounter always returns 0, so values won't be 489/12/4/23
    expect(screen.getByText("489")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("23")).toBeTruthy();
  });

  it("RED (reduced-motion): all 4 KPIs render final values immediately on mount", () => {
    mockMatchMediaReducedMotion(true);
    installRafShim();

    render(<CmsHealth locked={false} />);

    // With reduced motion, all values should be immediate (no rAF advance needed)
    // RED: stub useCounter returns 0 regardless
    expect(screen.getByText("489")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("23")).toBeTruthy();
  });

  it("renders PremiumPlaceholder (kpi-strip shape) in locked mode", () => {
    render(<CmsHealth locked={true} />);
    // In locked state the placeholder skeleton should be present
    // (no KPI values exposed)
    expect(screen.queryByText("489")).toBeNull();
  });
});
