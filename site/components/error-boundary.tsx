/**
 * ErrorBoundary — top-level React error boundary (NFR-6).
 *
 * Class component (required by React — error boundaries cannot be function components).
 * Catches errors in the wrapped subtree; logs with [PaywallBlueprint] prefix;
 * renders fallback per UI spec § 3.9 locked copy.
 *
 * POSITIONING INVARIANT (architecture § 8.5 + NFR-6):
 *   Wraps ONLY the <GatedSection> — <FreeSection /> MUST render outside its scope.
 *   When the gate throws, the free section keeps rendering.
 *
 * LOCKED copy per UI spec § 3.9 + § 8:
 *   Headline: "Something went wrong"
 *   Body: "Please refresh the page or try again in a moment."
 *
 * Fallback composition: @blok/card + Lucide TriangleAlert + locked copy (no CTA in PRD-000).
 * @blok/empty-states variant="error" available but uses external image CDN —
 * composing from card primitives is more reliable in iframe/offline scenarios.
 *
 * sitecore:blok-theming — text-muted-foreground for TriangleAlert icon
 *
 * T034b GREEN for T034a tests.
 */

"use client";

import React from "react";
import { TriangleAlert } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // NFR-6: log with [PaywallBlueprint] prefix so the gate's errors are identifiable
    console.error("[PaywallBlueprint]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col gap-3 p-6 rounded-md bg-card border border-border"
          role="alert"
        >
          {/* Error icon — text-muted-foreground (informational, not destructive per UI spec) */}
          <TriangleAlert
            className="text-muted-foreground"
            size={32}
            aria-hidden="true"
          />

          {/* Locked headline — UI spec § 8 */}
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Something went wrong
          </h2>

          {/* Locked body — UI spec § 8 */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please refresh the page or try again in a moment.
          </p>

          {/* NO CTA in PRD-000 per task breakdown § 4b T034b spec */}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
