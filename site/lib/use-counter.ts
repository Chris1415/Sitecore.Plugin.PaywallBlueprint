/**
 * useCounter — rAF-based count-up hook.
 *
 * T043 — GREEN implementation (replaces T043a stub).
 *
 * Animates from 0 to `target` over `durationMs` (default 600ms) using a
 * requestAnimationFrame loop with quadratic ease-out: eased = t*(2-t).
 *
 * Respects prefers-reduced-motion: reduce — returns target immediately
 * with no rAF ticks when the media query matches.
 *
 * MUST be called from a "use client" component only.
 * Reads browser globals inside useEffect to avoid the hydration trap
 * documented in feedback_hydration_mismatch_pattern.md.
 *
 * ADR-0018: used only by premium fake-data cards — ZERO fetches.
 */

import { useState, useEffect } from "react";

/**
 * @param target  Final integer value to count to
 * @param durationMs  Animation duration in ms (default 600)
 * @returns Current animated value (0 → target)
 */
export function useCounter(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Read browser globals inside useEffect — NOT in render body (hydration trap).
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Skip animation — jump straight to final value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }

    let rafId: number;
    const start = performance.now();

    function frame(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      // Quadratic ease-out: progress * (2 - progress)
      const eased = progress * (2 - progress);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        // Ensure we land exactly on the target value.
        setValue(target);
      }
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [target, durationMs]);

  return value;
}
