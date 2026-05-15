/**
 * GatedSectionWithDevPicker — gated section + in-page dev state picker.
 *
 * Operator request 2026-05-13: provide a way to flip between the four UX states
 * without editing the iframe URL. The seed-state CLI still works for the live
 * evaluator path (allowed / no-sub via Supabase); these buttons are a CLIENT-SIDE
 * override that bypasses the gate evaluator and renders the chosen state directly.
 *
 * The picker is dev-mode only — `process.env.NODE_ENV !== 'production'` lets
 * Next.js tree-shake the entire picker block from production bundles. Adopters
 * who fork the blueprint can keep, customize, or strip the picker.
 *
 * Initial preview state is hydrated from the URL `?previewState=` query param
 * (server component reads searchParams; passes as prop). Subsequent clicks
 * update local React state — no URL change, no full reload, no scroll jump.
 *
 * URL-param mechanism is preserved (deep-linking / shareability); the picker
 * is the in-iframe equivalent for evaluators who can't easily edit the iframe URL.
 */

"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GatedSection } from "@/components/gated-section";
import ErrorBoundary from "@/components/error-boundary";
import { AllowedState } from "@/src/lib/paywall/states/AllowedState";
import { NoSubscriptionState } from "@/src/lib/paywall/states/NoSubscriptionState";
import { SeatsFullState } from "@/src/lib/paywall/states/SeatsFullState";
import { UserUnassignedState } from "@/src/lib/paywall/states/UserUnassignedState";
import type { PreviewState } from "@/src/lib/paywall/preview-state";

interface Props {
  initialPreviewState?: PreviewState;
}

function renderGatedContent(preview: PreviewState): React.ReactNode {
  // Default path: real gate evaluator (queries Supabase via PaywallGate)
  if (preview === null) {
    return (
      <ErrorBoundary>
        <GatedSection />
      </ErrorBoundary>
    );
  }

  // Preview override — bypass gate; render the named state directly
  // Wrapped in the same Card chrome so visual parity holds with the gate path
  const cardChildren = (() => {
    switch (preview) {
      case "allowed":
        return <AllowedState />;
      case "no-sub":
        return <NoSubscriptionState />;
      case "seats-full":
        return <SeatsFullState seatsTotal={5} />;
      case "unassigned":
        return <UserUnassignedState />;
    }
  })();

  return (
    <section
      role="region"
      aria-labelledby="gated-section-heading"
      className="w-full"
    >
      <Card style="outline" elevation="sm" padding="lg">
        {cardChildren}
      </Card>
    </section>
  );
}

function DevStatePicker({
  preview,
  setPreview,
}: {
  preview: PreviewState;
  setPreview: Dispatch<SetStateAction<PreviewState>>;
}) {
  const options: Array<{ value: PreviewState; label: string }> = [
    { value: null, label: "Use gate (default)" },
    { value: "allowed", label: "Allowed" },
    { value: "no-sub", label: "No subscription" },
    { value: "seats-full", label: "Seats full" },
    { value: "unassigned", label: "Unassigned" },
  ];

  return (
    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Dev mode — preview state (overrides gate evaluator; tree-shaken in
        production)
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value, label }) => (
          <Button
            key={String(value)}
            size="sm"
            variant={preview === value ? "default" : "outline"}
            onClick={() => setPreview(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function GatedSectionWithDevPicker({ initialPreviewState = null }: Props) {
  const [preview, setPreview] = useState<PreviewState>(initialPreviewState);

  return (
    <>
      {renderGatedContent(preview)}
      {process.env.NODE_ENV !== "production" && (
        <DevStatePicker preview={preview} setPreview={setPreview} />
      )}
    </>
  );
}

// Type + validator moved to src/lib/paywall/preview-state.ts (pure TS shared module)
// so server components can use them without crossing the client boundary.
