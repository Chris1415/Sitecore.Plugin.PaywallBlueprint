/**
 * NoSubscriptionState — denial state when tenant has no active subscription.
 *
 * Locked copy per UI spec § 3.5 + § 8. Verified against POC:
 *   pocs/poc-v1-prd000/state-no-subscription.html
 *
 * sitecore:blok-components — @blok/badge (colorScheme="primary"), @blok/button (variant="default")
 * sitecore:blok-theming — text-muted-foreground for CircleAlert icon (denial/neutral state)
 * External-link CTA: target="_blank" rel="noopener noreferrer" aria-label="...(opens in new tab)"
 *
 * T028 GREEN for T037a-NoSubscriptionState tests.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircleAlert } from "lucide-react";
import { PaywallCheckoutDialog } from "@/src/lib/paywall/PaywallCheckoutDialog";

export function NoSubscriptionState() {
  return (
    <div className="flex flex-col gap-3">
      {/* Premium eyebrow — colorScheme="primary" per Blok badge API */}
      <Badge colorScheme="primary" size="md">
        Premium
      </Badge>

      <div className="flex flex-col gap-3">
        {/* Neutral icon — text-muted-foreground per UI spec § 3.5 */}
        <CircleAlert
          className="text-muted-foreground"
          size={32}
          aria-hidden="true"
        />

        {/* Locked headline — UI spec § 8 */}
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Start your subscription
        </h2>

        {/* Locked body — UI spec § 8 (verbatim — apostrophe preserved) */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your tenant doesn&apos;t have an active plan yet. Pick a plan to
          unlock the premium section.
        </p>

        {/* Primary CTA opens PaywallCheckoutDialog — placeholder for PRD-001 Stripe Checkout (operator decision 2026-05-13). */}
        {/* CTA label "View plans" stays locked per UI spec § 8. */}
        <div className="mt-3">
          <PaywallCheckoutDialog>
            <Button variant="default" aria-label="View plans">
              View plans
            </Button>
          </PaywallCheckoutDialog>
        </div>
      </div>
    </div>
  );
}
