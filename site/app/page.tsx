/**
 * Paywall Blueprint — single-page freemium layout shell.
 *
 * T035 (Tranche C): Integrates <PaywallGate> via <GatedSection> + <ErrorBoundary>.
 * FreeSection is OUTSIDE the ErrorBoundary — keeps rendering even when gate throws (NFR-6).
 *
 * Preview-state mechanism (dev-only, T021/T035 + operator request 2026-05-13):
 *   - URL: ?previewState=seats-full | unassigned | allowed | no-sub
 *   - In-page picker buttons (no URL change required) inside GatedSectionWithDevPicker
 *   - Both branches tree-shaken from production builds per process.env.NODE_ENV guard
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
import { GatedSectionWithDevPicker } from "@/components/gated-section-with-dev-picker";
import {
  isValidPreviewState,
  type PreviewState,
} from "@/src/lib/paywall/preview-state";

interface PageProps {
  searchParams?: Promise<{ previewState?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const raw = resolvedParams?.previewState;
  const initialPreviewState: PreviewState =
    process.env.NODE_ENV !== "production" && isValidPreviewState(raw)
      ? raw
      : null;

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

        {/* Gated section + dev state picker (picker is tree-shaken in production) */}
        {/* GatedSectionWithDevPicker owns ErrorBoundary + GatedSection internally */}
        <GatedSectionWithDevPicker initialPreviewState={initialPreviewState} />
      </main>
    </div>
  );
}
