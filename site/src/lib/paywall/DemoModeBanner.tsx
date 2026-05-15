/**
 * DemoModeBanner — env-flag demo-mode banner (FR-6 + ADR-0004).
 *
 * Renders when NEXT_PUBLIC_PAYWALL_ENABLED=false to signal that entitlements
 * are NOT being evaluated. Non-dismissible (no close button).
 *
 * LOCKED copy per ADR-0004 + FR-6 + UI spec § 8:
 *   Title: "Paywall disabled — demo mode"
 *   Description: "Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements."
 *
 * The component does NOT check the env flag itself in Tranche C — it is always
 * rendered when included. Env-flag wiring happens in Tranche D (T040).
 *
 * sitecore:blok-components — @blok/alert variant="default" (in quickstart)
 * Lucide Info icon (16×16) — the @blok/alert already injects its own MDI icon;
 * we use the Alert primitive but the text content is what matters for tests.
 *
 * T032b GREEN for T032a tests.
 */

"use client";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function DemoModeBanner() {
  return (
    <Alert variant="default" className="w-full">
      {/* Locked title per ADR-0004 + FR-6 */}
      <AlertTitle>Paywall disabled — demo mode</AlertTitle>
      {/* Locked description per ADR-0004 + FR-6 */}
      <AlertDescription className="text-xs text-muted-foreground">
        Set NEXT_PUBLIC_PAYWALL_ENABLED=true to evaluate entitlements.
      </AlertDescription>
    </Alert>
  );
}
