/**
 * PaywallCheckoutDialog — placeholder "subscribe" dialog for PRD-000 denial-state CTAs.
 *
 * PRD-000 has no real payment provider (Stripe direct lands in PRD-001 per ADR-0003).
 * In place of an external-link to a checkout URL, the denial-state CTAs ("View plans"
 * in NoSubscriptionState, "Upgrade plan" in SeatsFullState) trigger this dialog —
 * a polished placeholder with a deliberately silly €0.99-lifetime offer.
 *
 * Pricing decision (operator, 2026-05-13): €0.99 lifetime unlimited seats. This is
 * a UI placeholder; PRD-001's StripeAdapter replaces the dialog with a real
 * `stripe.checkout.sessions.create()` flow that opens Stripe Checkout in a new tab
 * (per research § 8.2 Flow 1).
 *
 * sitecore:blok-components — @blok/dialog primitive (Radix-backed); @blok/button.
 */

"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PaywallCheckoutDialogProps {
  /**
   * The trigger element. Typically a Button — must be a ReactElement so Radix's
   * `asChild` pattern can wire the open-state handler.
   */
  children: ReactNode;
}

export function PaywallCheckoutDialog({ children }: PaywallCheckoutDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock — €0.99 lifetime</DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">
            Unlimited seats. Lifetime access to the premium section. One-time
            €0.99 payment. No subscriptions, no upsells, no surprises.
          </DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground italic">
          Placeholder dialog. Real Stripe Checkout integration lands in PRD-001.
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="default">Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
