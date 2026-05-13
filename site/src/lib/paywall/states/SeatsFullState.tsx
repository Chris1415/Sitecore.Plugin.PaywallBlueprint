/**
 * SeatsFullState — DESIGN-REFERENCE component per ADR-0011.
 *
 * Fully built, locked-copy-tested, accessibility-compliant.
 * NOT reachable from the PRD-000 evaluator — rendered ONLY via:
 *   pnpm seed:state seats-full  (direct render via ?previewState=seats-full)
 * PRD-002 wires it into the extended evaluator.
 *
 * Props: { seatsTotal: number } — matches EntitlementResult tenant_active_seats_full
 * variant preserved for PRD-002 forward-compat.
 *
 * Locked copy per UI spec § 3.6 + § 8. Verified against POC:
 *   pocs/poc-v1-prd000/state-seats-full.html
 *
 * sitecore:blok-components — @blok/badge (colorScheme="primary"), @blok/button (variant="default")
 * sitecore:blok-theming — text-muted-foreground for Users icon
 * External-link CTA: target="_blank" rel="noopener noreferrer" aria-label="...(opens in new tab)"
 *
 * T029 GREEN for T037a-SeatsFullState tests.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { PaywallCheckoutDialog } from "@/src/lib/paywall/PaywallCheckoutDialog";

interface SeatsFullStateProps {
  seatsTotal: number;
}

export function SeatsFullState({ seatsTotal }: SeatsFullStateProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Premium eyebrow — colorScheme="primary" per Blok badge API */}
      <Badge colorScheme="primary" size="md">
        Premium
      </Badge>

      <div className="flex flex-col gap-3">
        {/* Neutral icon — text-muted-foreground per UI spec § 3.6 */}
        <Users
          className="text-muted-foreground"
          size={32}
          aria-hidden="true"
        />

        {/* Locked headline — UI spec § 8 */}
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          All seats in use
        </h2>

        {/* Counter — interpolates seatsTotal; verbatim template from UI spec § 8 */}
        <p className="text-sm font-medium text-foreground">
          {seatsTotal} of {seatsTotal} seats in use
        </p>

        {/* Locked body — UI spec § 8 */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ask your team admin to reassign a seat, or upgrade your plan for more.
        </p>

        {/* Primary CTA opens PaywallCheckoutDialog — placeholder for PRD-001 Stripe Checkout (operator decision 2026-05-13). */}
        {/* CTA label "Upgrade plan" stays locked per UI spec § 8. NO secondary CTA (admin reassignment is text-only). */}
        <div className="mt-3">
          <PaywallCheckoutDialog>
            <Button variant="default" aria-label="Upgrade plan">
              Upgrade plan
            </Button>
          </PaywallCheckoutDialog>
        </div>
      </div>
    </div>
  );
}
