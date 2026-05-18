/**
 * Paywall Blueprint — Cloud Portal `xmc:fullscreen` extension-point route.
 *
 * Cloud Portal embeds this app via the URL pattern
 *   /full-page?organizationId=...&marketplaceAppTenantId=...
 * per `sitecore:marketplace-sdk-extension-routes` § canonical routes for
 * `xmc:fullscreen`. Direct browser preview at `/full-page` shows the same
 * shell so developers can iterate without the iframe roundtrip.
 *
 * PRD-002 (T017): BentoGrid replaces FreeSection + Separator + GatedSectionWithDevPicker.
 * Dev affordances (TenantIdBadge, PaywallVersionOverride) and ThemeToggle
 * now mount in Topbar's rightSideItems[] per T005 (ADR-0016).
 *
 * tenantsRow: fetched server-side via SupabaseStore from marketplaceAppTenantId
 * search param (Cloud Portal pattern). Passed as prop to <BentoGrid>.
 *
 * sitecore:marketplace-sdk-extension-routes — single xmc:fullscreen route at `/full-page`
 * sitecore:blok-components — Topbar
 * sitecore:blok-theming — bg-background, text-foreground, semantic tokens only
 */

import type { ReactNode } from "react";
import Topbar, { type RightSideItem } from "@/components/bloks/top-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TenantIdBadge } from "@/components/tenant-id-badge";
import { PaywallVersionOverride } from "@/components/paywall-version-override";
import { DemoModeBanner } from "@/src/lib/paywall/DemoModeBanner";
import { BentoGrid } from "@/components/bento/bento-grid";
import { createClient } from "@supabase/supabase-js";

// tenantsRow type — matches BentoGridProps.tenantsRow
interface TenantsRow {
  plan: string;
  status: string;
  created_at: string;
}

interface PageProps {
  searchParams?: Promise<{ previewState?: string; marketplaceAppTenantId?: string }>;
}

/**
 * fetchTenantsRow — server-side fetch of the tenants row for the given tenantId.
 * Uses the publishable (anon) key since RLS is permissive in PRD-000 (ADR-0009).
 * Returns null on any error or when no row found.
 */
async function fetchTenantsRow(tenantId: string | undefined): Promise<TenantsRow | null> {
  if (!tenantId) return null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) return null;

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("tenants")
      .select("plan, status, created_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error || !data) return null;
    return {
      plan: typeof data.plan === "string" ? data.plan : "free",
      status: typeof data.status === "string" ? data.status : "",
      created_at: typeof data.created_at === "string" ? data.created_at : "",
    };
  } catch {
    return null;
  }
}

export default async function FullPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const tenantId = resolvedParams?.marketplaceAppTenantId;

  // Server-side fetch of tenants row — passed to BentoGrid as prop.
  // On error or missing tenantId, tenantsRow is null (BentoGrid handles gracefully).
  const tenantsRow = await fetchTenantsRow(tenantId);

  // T005: Dev affordances + theme toggle mounted in topbar rightSideItems[]
  // ADR-0016: ThemeToggle always visible (showcase posture — no env-gate).
  const rightSideItems: RightSideItem[] = [
    { id: "theme", content: <ThemeToggle /> as ReactNode },
    { id: "tenant-id", content: <TenantIdBadge /> as ReactNode },
    { id: "paywall-version", content: <PaywallVersionOverride /> as ReactNode },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Application topbar — dev affordances + theme toggle in rightSideItems (T005) */}
      {/* sitecore:blok-components @blok/topbar */}
      <Topbar
        brandName="Paywall Blueprint"
        menuButton={false}
        navigation={[]}
        rightSideItems={rightSideItems}
      />

      {/* DemoModeBanner — rendered when paywall is disabled (ADR-0004) */}
      {process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "false" && (
        <DemoModeBanner />
      )}

      {/* PRD-002 T017: BentoGrid replaces FreeSection + Separator + GatedSectionWithDevPicker.
          Legacy state components (FreeSection, GatedSectionWithDevPicker, etc.) remain in
          the codebase as design-reference per PRD-002 § FR-1.4. */}
      <main className="flex-1 w-full">
        <BentoGrid tenantsRow={tenantsRow} />
      </main>
    </div>
  );
}
