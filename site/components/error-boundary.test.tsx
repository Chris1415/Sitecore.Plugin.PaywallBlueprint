/**
 * T034a RED — ErrorBoundary class component tests.
 * Locked copy per UI spec § 3.9:
 *   Headline: "Something went wrong"
 *   Body: "Please refresh the page or try again in a moment."
 * Fails until T034b implements ErrorBoundary.
 *
 * NFR-6: FreeSection must keep rendering even when gated subtree throws.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ErrorBoundary from "./error-boundary";

// ---------------------------------------------------------------------------
// Helper component that always throws on render
// Return type is React.ReactNode via a cast — the throw means it never actually returns,
// but TypeScript requires the function signature to be a valid JSX element type.
// ---------------------------------------------------------------------------
function ThrowingChild({ message = "test error" }: { message?: string }): React.ReactNode {
  throw new Error(message);
}

// ---------------------------------------------------------------------------
// Helper component that renders normally
// ---------------------------------------------------------------------------
function SafeChild() {
  return <p>Safe content rendered</p>;
}

// Suppress console.error noise from expected throws during tests
let originalConsoleError: typeof console.error;
beforeEach(() => {
  originalConsoleError = console.error;
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

describe("ErrorBoundary — fallback render (T034a)", () => {
  it('renders fallback headline "Something went wrong" when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });

  it('renders fallback body "Please refresh the page or try again in a moment." when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(
      screen.getByText("Please refresh the page or try again in a moment.")
    ).toBeTruthy();
  });

  it("renders child normally when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("Safe content rendered")).toBeTruthy();
  });

  it("calls console.error with [PaywallBlueprint] prefix when boundary catches", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="boom" />
      </ErrorBoundary>
    );
    // console.error should have been called with [PaywallBlueprint] prefix
    const calls = vi.mocked(console.error).mock.calls;
    const hasPrefixedCall = calls.some(
      (args) =>
        typeof args[0] === "string" && args[0].startsWith("[PaywallBlueprint]")
    );
    expect(hasPrefixedCall).toBe(true);
  });
});

describe("ErrorBoundary — NFR-6: free section renders when gated section throws (T034a)", () => {
  it("free section outside boundary keeps rendering when inner throws", () => {
    render(
      <div>
        {/* FreeSection is outside the boundary — must always render */}
        <p>Inventory at a glance</p>
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      </div>
    );
    // Free section content still visible
    expect(screen.getByText("Inventory at a glance")).toBeTruthy();
    // Error boundary fallback rendered for the gate
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });
});
