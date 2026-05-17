/**
 * PaywallCheckoutDialog — T035 (PRD-001 rewire)
 *
 * Replaces PRD-000 placeholder "Got it" button with real Stripe Checkout flow.
 * Calls useEntitlement().triggerCheckout() to POST /api/checkout + open new tab.
 *
 * Button copy is LOCKED (ADR-0004 non-negotiable):
 *   Primary: "Subscribe — €0.99 lifetime"
 *   Secondary: "Cancel"
 *
 * Cancel stays ENABLED throughout in-flight checkout (FR-8 non-negotiable).
 * Closing the dialog stops in-iframe polling but does NOT close the Stripe Checkout tab.
 *
 * Dialog title: "Unlock — €0.99 lifetime" (unchanged from PRD-000 per § 4c-4)
 * Dialog body: "One-time payment. Unlimited seats. Lifetime access to the premium section."
 *
 * sitecore:blok-components — @blok/dialog (Radix-backed); @blok/button.
 * Spinner: lucide-react Loader2 with animate-spin (existing pattern).
 */

"use client";

import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
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
import { useEntitlement } from "@/src/lib/paywall/hooks/useEntitlement";

interface PaywallCheckoutDialogProps {
  /**
   * The trigger element. Typically a Button — must be a ReactElement so Radix's
   * `asChild` pattern can wire the open-state handler.
   */
  children: ReactNode;
}

export function PaywallCheckoutDialog({ children }: PaywallCheckoutDialogProps) {
  const { isLoading, error, triggerCheckout } = useEntitlement();

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock — €0.99 lifetime</DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">
            One-time payment. Unlimited seats. Lifetime access to the premium
            section.
          </DialogDescription>
        </DialogHeader>

        {/* Error display — checkout_failed shows the translated message */}
        {error?.kind === "checkout_failed" && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}

        {/* Polling timeout — non-blocking helper */}
        {error?.kind === "polling_timeout" && (
          <p className="text-sm text-muted-foreground italic">
            Your access may take a moment. Refresh the page if it doesn&apos;t
            update within a minute.
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {/* Cancel — stays ENABLED throughout (FR-8 non-negotiable) */}
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>

          {/* Primary — disabled during in-flight checkout only */}
          <Button
            variant="default"
            type="button"
            disabled={isLoading}
            aria-busy={isLoading}
            onClick={() => void triggerCheckout()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Opening checkout…
              </>
            ) : (
              "Subscribe — €0.99 lifetime"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
