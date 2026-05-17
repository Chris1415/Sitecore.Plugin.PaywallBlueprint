/**
 * Paywall Blueprint — Cloud Portal `xmc:fullscreen` extension-point route.
 *
 * Cloud Portal embeds this app via the URL pattern
 *   /full-page?organizationId=...&marketplaceAppTenantId=...
 * per `sitecore:marketplace-sdk-extension-routes` § canonical routes for
 * `xmc:fullscreen`. Direct browser preview at `/full-page` shows the same
 * shell so developers can iterate without the iframe roundtrip.
 *
 * Owns the freemium demo: paywall gate (4 UX states + dev picker) + free
 * section. Root `/` now renders the public IntroPage (marketing landing),
 * which is unblocked by the SDK handshake — see app/layout.tsx note.
 *
 * Layout source of truth: pocs/poc-v1-prd000/state-allowed.html
 *
 * sitecore:marketplace-sdk-extension-routes — single xmc:fullscreen route at `/full-page`
 * sitecore:blok-components — Topbar, Separator
 * sitecore:blok-theming — bg-background, text-foreground, semantic tokens only
 */

import Topbar from "@/components/bloks/top-bar";
import { Separator } from "@/components/ui/separator";
import { FreeSection } from "@/components/free-section";
import { GatedSectionWithDevPicker } from "@/components/gated-section-with-dev-picker";
import { TenantIdBadge } from "@/components/tenant-id-badge";
import { DemoModeBanner } from "@/src/lib/paywall/DemoModeBanner";
import {
  isValidPreviewState,
  type PreviewState,
} from "@/src/lib/paywall/preview-state";

interface PageProps {
  searchParams?: Promise<{ previewState?: string }>;
}

export default async function FullPage({ searchParams }: PageProps) {
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

      {/* Tranche D (T040): DemoModeBanner — rendered when env-flag is 'false' (ADR-0004) */}
      {/* NEXT_PUBLIC_* vars are inlined at build time; string === 'false' is correct check */}
      {process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "false" && (
        <DemoModeBanner />
      )}

      {/* Page shell — centered, max ~880px wide per UI spec § 3.1 */}
      <main className="flex-1 max-w-[880px] mx-auto w-full px-6 pt-6 pb-8 flex flex-col gap-6">
        {/* Developer/operator aid: live tenantId for the seed CLI. */}
        {/* Renders only when SDK context has resolved; safe in prod (tenantId is in iframe URL anyway). */}
        <TenantIdBadge />

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
