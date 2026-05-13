/**
 * Paywall Blueprint — single-page freemium layout shell.
 *
 * Tranche A: hardcoded "allowed" state. No PaywallGate, no useAppContext(),
 * no demo-mode banner (those land in Tranches B, C, D respectively).
 *
 * Layout source of truth: pocs/poc-v1-prd000/state-allowed.html
 * The POC's state-picker navigation strip is NOT included — that is POC-only.
 *
 * sitecore:marketplace-sdk-extension-routes — single xmc:fullscreen route at "/"
 * sitecore:blok-components — Topbar (brandName prop), Separator
 * sitecore:blok-theming — bg-background, text-foreground, semantic tokens only
 */

import Link from "next/link";
import Topbar from "@/components/bloks/top-bar";
import { Separator } from "@/components/ui/separator";
import { FreeSection } from "@/components/free-section";
import { GatedSection } from "@/components/gated-section";

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Application topbar — brandName only; no logo, no nav, no user avatar */}
      {/* sitecore:blok-components @blok/topbar — Topbar at components/bloks/top-bar.tsx */}
      <Topbar
        brandName="Paywall Blueprint"
        menuButton={false}
        navigation={[]}
        rightSideItems={[]}
      />

      {/* Page shell — centered, max ~880px wide per UI spec § 3.1 */}
      <main className="flex-1 max-w-[880px] mx-auto w-full px-6 pt-6 pb-8 flex flex-col gap-6">
        {/* Free section — always rendered, no gate */}
        <FreeSection />

        {/* Separator between free and gated sections */}
        <Separator />

        {/* Gated section — hardcoded "allowed" welcome in Tranche A */}
        {/* Tranche C (T035) wraps this in <PaywallGate> */}
        <GatedSection />

        {/* Dev affordance — Tranche B helper; removed at Tranche E if not adopted. */}
        {/* Lets the operator navigate from the iframe shell to the SDK probe UI */}
        {/* without needing to re-register a different Cloud Portal route. */}
        <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>Development helpers</span>
          <Link
            href="/debug"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Open SDK probes →
          </Link>
        </div>
      </main>
    </div>
  );
}
