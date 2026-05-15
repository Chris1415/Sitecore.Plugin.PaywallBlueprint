/**
 * T037a RED — SkeletonState ARIA attributes.
 * Fails until T027 implements SkeletonState.tsx.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SkeletonState } from "./SkeletonState";

describe("SkeletonState — a11y ARIA attributes (T037a)", () => {
  it('has role="status"', () => {
    render(<SkeletonState />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it('has aria-live="polite"', () => {
    render(<SkeletonState />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-live")).toBe("polite");
  });

  it('has aria-label="Loading premium content"', () => {
    render(<SkeletonState />);
    const el = screen.getByRole("status");
    expect(el.getAttribute("aria-label")).toBe("Loading premium content");
  });
});
