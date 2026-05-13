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
import { CircleAlert, ExternalLink } from "lucide-react";

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

        {/* Primary CTA — locked copy + a11y per UI spec § 3.5 */}
        <div className="mt-3">
          <Button variant="default" asChild>
            <a
              href="https://example.com/buy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View plans (opens in new tab)"
            >
              View plans
              <ExternalLink
                size={14}
                aria-hidden="true"
                className="ml-1.5"
              />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
