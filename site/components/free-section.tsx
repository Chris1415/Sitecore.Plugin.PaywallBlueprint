/**
 * FreeSection — always-rendered top section of the freemium layout.
 *
 * Tranche A: hardcoded mock content with no SDK reads.
 * Locked copy source: pocs/poc-v1-prd000/state-allowed.html + UI spec § 8.
 *
 * sitecore:blok-components — uses @blok/card (Card), @blok/badge (Badge),
 *   @blok/button (Button), @blok/separator (Separator).
 * sitecore:blok-theming — semantic tokens only; no hex values.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export function FreeSection() {
  return (
    <section
      aria-labelledby="free-section-heading"
      className="w-full"
    >
      <Card style="outline" elevation="sm" padding="lg">
        {/* Free eyebrow badge — colorScheme="neutral" per Blok secondary convention */}
        <Badge colorScheme="neutral" size="md">
          Free
        </Badge>

        {/* Headline */}
        <h2
          id="free-section-heading"
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          Inventory at a glance
        </h2>

        {/* Body — locked copy from state-allowed.html */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          This is where your free tier lives. Adopters of the blueprint replace
          this card with a real free feature — a counter, a status tile,
          anything that ships value without a paid plan.
        </p>

        {/* CTA row — no-op placeholder button */}
        {/* Source: pocs/poc-v1-prd000/state-allowed.html — free-section CTA */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="default"
            type="button"
          >
            <BarChart3 aria-hidden="true" />
            View placeholder report
          </Button>
        </div>
      </Card>
    </section>
  );
}
