"use client";

/**
 * SubscribeBanner — T027 (PRD-002 Tranche C)
 *
 * Rendered as a SIBLING of .premium-region inside .premium-section.
 * CRITICAL: must NOT be a child of .premium-region — the parent's
 * filter:blur(12px) would rasterize this banner and make it unreadable.
 * See prd-minimal-002.md § non-negotiables + POC v2 § 7 "Critical bug fixed".
 *
 * Position: absolute, horizontally centered, pinned 2rem from the TOP of
 * the premium-region so it lands in the iframe viewport without scrolling.
 * Width: min(480px, calc(100% - 2rem)) — constrained so the banner is a
 * confident hero card, not a full-bleed wall. Operator preference 2026-05-18.
 * z-index: 10 (above blur, below nothing).
 * Mobile: static inline via CSS media query in bento.css.
 *
 * Dialog wiring: wraps the Subscribe button as <PaywallCheckoutDialog> child
 * using the DialogTrigger asChild pattern (same as GatedSectionWithDevPicker).
 *
 * sitecore:blok-theming — ZERO hex literals. Semantic tokens only.
 * test:no-hex-in-bento enforces this at CI time.
 */

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaywallCheckoutDialog } from "@/src/lib/paywall/PaywallCheckoutDialog";

export function SubscribeBanner() {
  return (
    <aside
      className="subscribe-banner"
      role="region"
      aria-labelledby="subscribe-banner-title"
      data-testid="subscribe-banner"
      style={{
        position: "absolute",
        left: "50%",
        top: "2rem",
        transform: "translateX(-50%)",
        width: "min(480px, calc(100% - 2rem))",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2.5rem",
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "var(--radius-lg, 0.5rem)",
        boxShadow:
          "0 0 0 1px hsl(var(--primary) / 0.4), 0 30px 60px -15px rgb(0 0 0 / 0.6), 0 0 80px -20px hsl(var(--primary) / 0.35)",
        gap: "0.75rem",
      }}
    >
      {/* Lock icon — centered above title */}
      <div
        className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-2"
        aria-hidden="true"
      >
        <Lock className="w-7 h-7" />
      </div>

      {/* Title */}
      <h2
        id="subscribe-banner-title"
        className="text-4xl font-semibold text-foreground leading-tight"
        style={{ margin: 0 }}
      >
        Unlock Premium
      </h2>

      {/* Sub-headline */}
      <p className="text-2xl font-semibold text-foreground" style={{ margin: 0 }}>
        €0.99 lifetime
      </p>

      {/* Subtitle */}
      <p className="text-base text-muted-foreground" style={{ margin: 0, maxWidth: "32ch" }}>
        One-time payment. Lifetime access. No subscription.
      </p>

      {/* Subscribe button — opens PaywallCheckoutDialog */}
      <div className="mt-3">
        <PaywallCheckoutDialog>
          <Button
            size="lg"
            className="text-background"
            aria-label="Subscribe — €0.99 lifetime"
          >
            Subscribe — €0.99 lifetime
          </Button>
        </PaywallCheckoutDialog>
      </div>
    </aside>
  );
}
