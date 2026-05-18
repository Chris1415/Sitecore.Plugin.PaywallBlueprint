"use client";

/**
 * RecentEdits (P3) — T042 — PRD-002 Tranche D
 *
 * 5-row Sitecore-flavored hardcoded list per PRD-002 § 5 P3.
 * No JS animation — stagger-in is handled by parent bento-card--premium CSS.
 *
 * ADR-0018: ZERO fetches at any state.
 * test:no-hex-in-bento: ZERO hex literals.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles } from "lucide-react";
import { PremiumPlaceholder } from "./premium-placeholder";
import { cn } from "@/lib/utils";

// Hardcoded 5 recent edit rows per PRD-002 § 5 P3.
// Module-scope constant — no re-creation on render.
const RECENT_EDITS = [
  { site: "Marketing Site", item: "Homepage hero", time: "2h ago", initials: "CH" },
  { site: "Blog", item: "Post template", time: "yesterday", initials: "AB" },
  { site: "Company Site", item: "Footer datasource", time: "2d ago", initials: "CH" },
  { site: "Product Catalog", item: "Featured product card", time: "3d ago", initials: "MS" },
  { site: "Marketing Site", item: "Career page meta", time: "4d ago", initials: "AB" },
] as const;

export interface RecentEditsProps {
  locked: boolean;
  "data-card"?: string;
}

function RecentEditsUnlocked() {
  return (
    <div className="p-5 h-full flex flex-col">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold text-foreground">Recent edits</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Across all sites</p>

      {/* 5 edit rows */}
      <ul className="flex flex-col gap-3 flex-1 list-none p-0 m-0">
        {RECENT_EDITS.map((edit, i) => (
          <li key={i} className="flex items-start gap-3">
            {/* 24×24 fake-avatar circle with initials */}
            <div
              className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-muted-foreground text-[10px] font-medium leading-none">
                {edit.initials}
              </span>
            </div>

            {/* 2-line content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                <span>{edit.site}</span>
                <span className="mx-1 text-muted-foreground">·</span>
                <span>{edit.item}</span>
              </p>
              <p className="text-xs text-muted-foreground">{edit.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecentEdits({ locked, "data-card": dataCard }: RecentEditsProps) {
  return (
    <Card
      style="outline"
      elevation="sm"
      padding="sm"
      className={cn("relative h-full overflow-hidden", !locked && "bento-card--premium")}
      data-card={dataCard ?? "p3"}
    >
      {/* Premium corner badge */}
      <span
        className="absolute top-3 right-3 z-[5] flex items-center gap-1"
        style={{ isolation: "isolate" }}
        aria-label="Premium feature"
      >
        <Badge variant="default" className="flex items-center gap-1 text-xs text-background">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Premium
        </Badge>
      </span>

      {locked ? (
        <PremiumPlaceholder shape="list" />
      ) : (
        <RecentEditsUnlocked />
      )}
    </Card>
  );
}
