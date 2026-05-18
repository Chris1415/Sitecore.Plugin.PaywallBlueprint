"use client";

/**
 * UserProfile — F4 bento card.
 *
 * T015 — PRD-002 Tranche B.
 *
 * Reads useHostUser() from MarketplaceProvider.
 * Visual source of truth: pocs/poc-v2-prd002/index.html lines 166–183 (data-card="f4")
 *
 * Initials derivation:
 *   given_name[0] + family_name[0] (uppercase)
 *   → name[0] (uppercase)
 *   → '?'
 *
 * Sub truncation: first 22 chars + '…' (U+2026)
 *
 * sitecore:blok-theming — ZERO hex literals. Semantic tokens only.
 * test:no-hex-in-bento enforces this at CI time.
 */

import { useHostUser } from "@/components/providers/marketplace";
import { pickUserDisplay } from "@/src/lib/paywall/pickUserDisplay";

interface UserProfileProps {
  "data-card"?: string;
}

/**
 * deriveInitials — compute 1–2 uppercase letters from host user fields.
 * shape: project-planning/architecture/sdk-fixtures/host-user.json
 */
function deriveInitials(user: {
  given_name?: string;
  family_name?: string;
  name?: string;
}): string {
  const g = user.given_name?.trim();
  const f = user.family_name?.trim();
  if (g && f) return (g[0] + f[0]).toUpperCase();
  if (g) return g[0].toUpperCase();
  const n = user.name?.trim();
  if (n) return n[0].toUpperCase();
  return "?";
}

export function UserProfile({ "data-card": dataCard }: UserProfileProps = {}) {
  const hostUser = useHostUser();

  const initials = deriveInitials(hostUser);
  const displayName = hostUser.name ?? pickUserDisplay(hostUser as Record<string, unknown>);
  const email = typeof hostUser.email === "string" ? hostUser.email : "\u2014";
  const sub =
    typeof hostUser.sub === "string" && hostUser.sub.length > 0
      ? hostUser.sub.slice(0, 22) + "\u2026"
      : "\u2014";

  return (
    <section
      className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4"
      data-card={dataCard ?? "f4"}
      aria-labelledby="f4-title"
    >
      {/* Card title */}
      <div className="flex items-center gap-2" id="f4-title">
        <span className="text-base font-semibold text-foreground">Profile</span>
      </div>

      {/* User row */}
      <div className="flex items-center gap-3">
        {/* Avatar circle with initials */}
        <div
          className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span className="text-sm font-semibold text-muted-foreground">
            {initials}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {displayName}
          </p>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {sub}
          </p>
        </div>
      </div>
    </section>
  );
}
