/**
 * UserUnassignedState — DESIGN-REFERENCE component per ADR-0011.
 *
 * Fully built, locked-copy-tested, accessibility-compliant.
 * NOT reachable from the PRD-000 evaluator — rendered ONLY via:
 *   pnpm seed:state unassigned  (direct render via ?previewState=unassigned)
 * PRD-002 wires it into the extended evaluator.
 *
 * NO CTA in PRD-000 — deliberate per PRD US-3 (no disabled buttons; no
 * actionable path until admin assigns a seat).
 *
 * Locked copy per UI spec § 3.7 + § 8. Verified against POC:
 *   pocs/poc-v1-prd000/state-unassigned.html
 *
 * sitecore:blok-components — @blok/badge (colorScheme="primary")
 * sitecore:blok-theming — text-muted-foreground for UserPlus icon
 *
 * T030 GREEN for T037a-UserUnassignedState tests.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";

export function UserUnassignedState() {
  return (
    <div className="flex flex-col gap-3">
      {/* Premium eyebrow — colorScheme="primary" per Blok badge API */}
      <Badge colorScheme="primary" size="md">
        Premium
      </Badge>

      <div className="flex flex-col gap-3">
        {/* Neutral icon — text-muted-foreground per UI spec § 3.7 */}
        <UserPlus
          className="text-muted-foreground"
          size={32}
          aria-hidden="true"
        />

        {/* Locked headline — UI spec § 8 */}
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Ask your team admin
        </h2>

        {/* Locked body — UI spec § 8 */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your tenant has a plan, but your team admin hasn&apos;t given you a
          seat yet.
        </p>

        {/* NO CTA per PRD-000 US-3 — deliberate omission */}
      </div>
    </div>
  );
}
