/**
 * SkeletonState — single generic skeleton per ADR-0007.
 *
 * Sized to absorb the largest resolved state (tenant_active_seats_full with two CTAs).
 * Renders during entitlement fetch to prevent flash-of-allowed.
 *
 * Accessibility: role="status" aria-live="polite" aria-label="Loading premium content"
 * per UI spec § 3.3 + § 4c-5 accessibility specifics.
 *
 * sitecore:blok-components — @blok/skeleton primitives (in quickstart)
 * sitecore:blok-theming — semantic tokens only; no hex values
 *
 * T027 GREEN for T037a-skeleton tests.
 */

"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading premium content"
      className="flex flex-col gap-3"
    >
      {/* Badge placeholder — 56px wide, 22px tall (ADR-0007: sized to seats-full) */}
      <Skeleton className="h-[22px] w-[56px] rounded-sm" />

      {/* Icon placeholder — 32×32 rounded-full */}
      <Skeleton className="h-8 w-8 rounded-full" />

      {/* Headline placeholder */}
      <Skeleton className="h-6 w-[240px] rounded-sm" />

      {/* Body line 1 — full width */}
      <Skeleton className="h-4 w-full rounded-sm" />

      {/* Body line 2 — 80% width */}
      <Skeleton className="h-4 w-[80%] rounded-sm" />

      {/* CTA row — primary + secondary (sized to seats-full layout per ADR-0007) */}
      <div className="flex gap-3 mt-3">
        {/* Primary CTA placeholder */}
        <Skeleton className="h-9 w-[160px] rounded-md" />
        {/* Secondary CTA placeholder */}
        <Skeleton className="h-9 w-[140px] rounded-md" />
      </div>
    </div>
  );
}
