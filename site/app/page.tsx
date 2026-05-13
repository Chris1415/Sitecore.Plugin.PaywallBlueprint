/**
 * Paywall Blueprint — single-page freemium layout shell.
 *
 * T035 (Tranche C): Integrates <PaywallGate> via <GatedSection> + <ErrorBoundary>.
 * FreeSection is OUTSIDE the ErrorBoundary — keeps rendering even when gate throws (NFR-6).
 *
 * previewState query-param mechanism (dev-only, T021/T035):
 *   ?previewState=seats-full → renders <SeatsFullState seatsTotal={5} /> bypassing gate
 *   ?previewState=unassigned → renders <UserUnassignedState /> bypassing gate
 *   (both branches tree-shaken from production builds per process.env.NODE_ENV guard)
 *
 * Layout source of truth: pocs/poc-v1-prd000/state-allowed.html
 *
 * sitecore:marketplace-sdk-extension-routes — single xmc:fullscreen route at "/"
 * sitecore:blok-components — Topbar, Separator
 * sitecore:blok-theming — bg-background, text-foreground, semantic tokens only
 */

import Topbar from "@/components/bloks/top-bar";
import { Separator } from "@/components/ui/separator";
import { FreeSection } from "@/components/free-section";
import { GatedSection } from "@/components/gated-section";
import ErrorBoundary from "@/components/error-boundary";
import { SeatsFullState } from "@/src/lib/paywall/states/SeatsFullState";
import { UserUnassignedState } from "@/src/lib/paywall/states/UserUnassignedState";

interface PageProps {
  searchParams?: Promise<{ previewState?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const previewState = resolvedParams?.previewState;

  // ---------------------------------------------------------------------------
  // previewState direct-render (dev-only per T021 design-ref state mechanism)
  // Guard: process.env.NODE_ENV !== 'production' tree-shakes this in prod builds.
  // URL query param is the chosen sentinel mechanism (per task breakdown T021 §4c).
  // ---------------------------------------------------------------------------
  let gatedContent: React.ReactNode;

  if (
    process.env.NODE_ENV !== "production" &&
    previewState === "seats-full"
  ) {
    // Design-reference: SeatsFullState bypasses gate evaluator (ADR-0011)
    gatedContent = (
      <section
        role="region"
        aria-labelledby="gated-section-heading"
        className="w-full"
      >
        <SeatsFullState seatsTotal={5} />
      </section>
    );
  } else if (
    process.env.NODE_ENV !== "production" &&
    previewState === "unassigned"
  ) {
    // Design-reference: UserUnassignedState bypasses gate evaluator (ADR-0011)
    gatedContent = (
      <section
        role="region"
        aria-labelledby="gated-section-heading"
        className="w-full"
      >
        <UserUnassignedState />
      </section>
    );
  } else {
    // Normal path: GatedSection wraps PaywallGate wraps AllowedState
    // ErrorBoundary wraps ONLY the gated section — FreeSection stays outside (NFR-6)
    gatedContent = (
      <ErrorBoundary>
        <GatedSection />
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Application topbar — brandName only; no logo, no nav, no user avatar */}
      {/* sitecore:blok-components @blok/topbar */}
      <Topbar
        brandName="Paywall Blueprint"
        menuButton={false}
        navigation={[]}
        rightSideItems={[]}
      />

      {/* Tranche D (T040): <DemoModeBanner /> inserted here when env-flag is false */}

      {/* Page shell — centered, max ~880px wide per UI spec § 3.1 */}
      <main className="flex-1 max-w-[880px] mx-auto w-full px-6 pt-6 pb-8 flex flex-col gap-6">
        {/* Free section — OUTSIDE ErrorBoundary; always renders even when gate throws (NFR-6) */}
        <FreeSection />

        {/* Separator between free and gated sections */}
        <Separator />

        {/* Gated section — wrapped in ErrorBoundary per NFR-6 + architecture § 8.5 */}
        {/* FreeSection above stays visible even if gated subtree falls into boundary */}
        {gatedContent}
      </main>
    </div>
  );
}
