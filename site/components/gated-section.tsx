/**
 * GatedSection — bottom section of the freemium layout.
 *
 * Tranche A: hardcoded "allowed" welcome with no useAppContext() call.
 * Tranche B (T023) will replace hardcoded copy with the defensive layered render
 * reading application.context from MarketplaceProvider.
 * Tranche C (T035) will wrap the inner card in <PaywallGate>.
 *
 * Locked copy source: pocs/poc-v1-prd000/state-allowed.html + UI spec § 3.4 / § 8.
 *
 * sitecore:blok-components — uses @blok/card (Card), @blok/badge (Badge).
 * sitecore:blok-theming — semantic tokens only; no hex values.
 * Lucide CircleCheck icon at text-primary (32×32).
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CircleCheck } from "lucide-react";

export function GatedSection() {
  return (
    <section
      aria-labelledby="gated-section-heading"
      className="w-full"
    >
      <Card style="outline" elevation="sm" padding="lg">
        {/* Premium eyebrow badge — colorScheme="primary" for gated/paid tier */}
        <Badge colorScheme="primary" size="md">
          Premium
        </Badge>

        <div className="flex flex-col gap-4">
          {/* Positive state icon — text-primary per UI spec § 3.4 */}
          <CircleCheck
            className="text-primary"
            size={32}
            aria-hidden="true"
          />

          {/* Heading — hardcoded in Tranche A; Tranche B wires context */}
          {/* TODO T023: replace with defensive layered render (context.user.name → email local-part → "there") */}
          <h2
            id="gated-section-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            Welcome, Christian
          </h2>

          {/* Body — hardcoded in Tranche A; Tranche B wires context */}
          {/* TODO T023: replace tenant name with context.tenant.name → truncated id → fallback */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your tenant Hahn Solo Demo has full access. Replace this card with
            your gated feature.
          </p>
        </div>
      </Card>
    </section>
  );
}
