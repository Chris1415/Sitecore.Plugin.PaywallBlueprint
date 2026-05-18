"use client";

/**
 * BentoGrid — orchestrator shell for the 11-card bento dashboard.
 *
 * T010 — PRD-002 Tranche B (free cards).
 * T029 — PRD-002 Tranche C (useEntitlement wiring + premium section).
 *
 * Renders 5 free cards (F1–F5) in DOM order (reading order = visual order).
 * Premium region wired in Tranche C (T029): useEntitlement drives locked/unlocked.
 *
 * bento.css provides the grid template, keyframes, and locked-state effects.
 * Import here so Next bundles it (CSS imported from a client component is
 * automatically included in the page bundle by Next App Router).
 *
 * DOM order contract (CRITICAL — stagger-in uses nth-child):
 *   F1 → F2 → F3 → F4 → F5 → .premium-section(.premium-region[P1…P6] + banner sibling)
 *
 * CRITICAL layout invariant (prd-minimal-002 § non-negotiables + POC v2 § 7):
 *   <SubscribeBanner> MUST be a SIBLING of .premium-region, NOT a child.
 *   Both are children of .premium-section { position: relative }.
 *   If banner is a child of premium-region, filter:blur rasterizes it → unreadable.
 *
 * sitecore:blok-theming — ZERO hex literals. Semantic tokens only.
 * test:no-hex-in-bento enforces this at CI time.
 */

import "@/styles/bento.css";
import { WelcomeHero } from "./welcome-hero";
import { SitesTile } from "./sites-tile";
import { PlanCard } from "./plan-card";
import { UserProfile } from "./user-profile";
import { TenantInfo } from "./tenant-info";
import { ActivityChart } from "./activity-chart";
import { ContentDistribution } from "./content-distribution";
import { RecentEdits } from "./recent-edits";
import { CmsHealth } from "./cms-health";
import { SitecoreContentInsights } from "./sitecore-content-insights";
import { ContentHealthScore } from "./content-health-score";
import { SubscribeBanner } from "./subscribe-banner";

export interface BentoGridProps {
  tenantsRow: {
    plan: string;
    status: string;
    created_at: string;
  } | null;
}

export function BentoGrid({ tenantsRow }: BentoGridProps) {
  // T029 fix (Gate D 2026-05-18): use the server-rendered tenantsRow as the
  // truth source instead of the client-side useEntitlement() hook.
  //
  // Why: useEntitlement only polls in three situations — (a) during the
  // triggerCheckout state machine after Subscribe is clicked, (b) on
  // visibilitychange, (c) on a postMessage 'paywall:refresh'. On a fresh
  // iframe load post-payment (the canonical "I paid yesterday and reopened
  // the app" flow), none of those fire, so `entitlement` stays null and
  // `null?.status !== "allowed"` evaluates to true → premium stays locked
  // forever even though the user IS paid.
  //
  // tenantsRow is server-rendered from SupabaseStore.getEntitlement at
  // /full-page/page.tsx load. It reflects the post-payment row immediately
  // after window.location.reload() fires from useEntitlement.resolveSuccess.
  // F1 and F3 already use this same source — using it here keeps the locked
  // branch internally consistent with the plan badge + Plan card.
  //
  // Post-payment refresh still works: SubscribeBanner mounts
  // <PaywallCheckoutDialog>, which internally instantiates useEntitlement,
  // which starts the polling state machine on Subscribe click, which fires
  // window.location.reload() on 'allowed' detection. The reload re-renders
  // /full-page server-side, tenantsRow updates, BentoGrid unlocks.
  const isLocked = !(
    tenantsRow?.plan === "premium" && tenantsRow?.status === "active"
  );

  return (
    <div className="bento-grid" data-testid="bento-grid">
      {/* Free row — always visible, real data */}
      <WelcomeHero data-card="f1" tenantsRow={tenantsRow} />
      <SitesTile data-card="f2" />
      <PlanCard data-card="f3" tenantsRow={tenantsRow} />
      <UserProfile data-card="f4" />
      <TenantInfo data-card="f5" />

      {/* Premium section — .premium-section is the positioning context.
          Banner is a SIBLING of .premium-region (NOT a child).
          See prd-minimal-002.md § non-negotiables + POC v2 § 7 "Critical bug fixed". */}
      <div className="premium-section" data-testid="premium-section">
        <div
          className={
            isLocked ? "premium-region premium-region--locked" : "premium-region"
          }
          aria-hidden={isLocked || undefined}
          data-testid="premium-region"
        >
          {/* P1–P6: DOM order = visual reading order (stagger-in nth-child depends on this) */}
          <ActivityChart data-card="p1" locked={isLocked} />
          <ContentDistribution data-card="p2" locked={isLocked} />
          <RecentEdits data-card="p3" locked={isLocked} />
          <CmsHealth data-card="p4" locked={isLocked} />
          <SitecoreContentInsights data-card="p5" locked={isLocked} />
          <ContentHealthScore data-card="p6" locked={isLocked} />
        </div>

        {/* SubscribeBanner — SIBLING of .premium-region, never a child.
            Position: absolute inside .premium-section { position: relative }.
            If this were inside .premium-region, filter:blur(12px) would rasterize it. */}
        {isLocked && <SubscribeBanner />}
      </div>
    </div>
  );
}
