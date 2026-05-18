"use client";

/**
 * PlanCard — F3 bento card.
 *
 * T014 — PRD-002 Tranche B.
 *
 * Receives tenantsRow via props from BentoGrid (data fetched server-side in page.tsx).
 * Visual source of truth: pocs/poc-v2-prd002/index.html lines 150–164 (data-card="f3")
 *
 * sitecore:blok-theming — ZERO hex literals. Semantic tokens only.
 * test:no-hex-in-bento enforces this at CI time.
 */

import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export interface PlanCardProps {
  tenantsRow: {
    plan: string;
    status: string;
    created_at: string;
  } | null;
  "data-card"?: string;
}

/**
 * formatMemberSince — format ISO date string to "Month DD, YYYY" via Intl.DateTimeFormat.
 * Returns "—" if the date is missing or invalid.
 */
export function formatMemberSince(isoDate: string | null | undefined): string {
  if (!isoDate) return "\u2014";
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "\u2014";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return "\u2014";
  }
}

export function PlanCard({ tenantsRow, "data-card": dataCard }: PlanCardProps) {
  const plan = tenantsRow?.plan ?? "free";
  const status = tenantsRow?.status ?? null;
  const createdAt = tenantsRow?.created_at ?? null;

  const isPremium = plan === "premium";
  const planLabel = isPremium ? "Premium" : "Free";
  const memberSince = formatMemberSince(createdAt);
  const isActive = status === "active";

  return (
    <section
      className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
      data-card={dataCard ?? "f3"}
      aria-labelledby="f3-title"
    >
      {/* Label */}
      <span className="text-sm text-muted-foreground">Plan</span>

      {/* Plan name */}
      <div
        id="f3-title"
        className="text-2xl font-semibold text-foreground"
      >
        {planLabel}
      </div>

      <Separator />

      {/* Member since */}
      <div className="text-sm text-muted-foreground">
        Member since {memberSince}
      </div>

      {/* Status badge — only when active */}
      {isActive && (
        <div>
          <Badge colorScheme="neutral" size="md">
            Active
          </Badge>
        </div>
      )}
    </section>
  );
}
