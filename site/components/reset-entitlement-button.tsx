"use client";

/**
 * ResetEntitlementButton — DEV-ONLY topbar affordance for fast paywall iteration.
 *
 * Replaces the "go to Supabase and delete rows manually" workflow with a single
 * click. Calls POST /api/dev/reset-entitlement which drops every tenants row
 * sharing the current stripe_customer_id (sweeps orphan rows too) + flushes
 * the processed_events idempotency cache. Then reloads the iframe so the
 * server-side SupabaseStore.getEntitlement re-fetches and BentoGrid re-locks.
 *
 * Security: tree-shaken in production via `process.env.NODE_ENV !== "production"`.
 * The API route ALSO refuses in production (defense in depth). Same DCE pattern
 * as <GatedSectionWithDevPicker> — verified by `npm run test:dce`.
 *
 * sitecore:blok-theming — semantic tokens only; no hex literals.
 */

import { useState } from "react";
import { useAppContext } from "@/components/providers/marketplace";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function ResetEntitlementButton() {
  // Hooks first, conditionals after — Rules of Hooks.
  const appContext = useAppContext();
  const tenantId = appContext?.marketplaceAppTenantId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Production short-circuit — also enforced server-side in the API route.
  // process.env.NODE_ENV is inlined at build time, so this branch is removed
  // by the Next bundler in production builds (verified by test:dce).
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (!tenantId) return null;

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/reset-entitlement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body?.error ?? `reset failed (${res.status})`);
        setBusy(false);
        return;
      }
      // Hard reload — server-side tenants row is gone, so the next render
      // re-fetches via SupabaseStore.getEntitlement and BentoGrid re-locks.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "reset failed");
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={onClick}
      disabled={busy}
      title={error ?? "Drops all tenants rows for this Stripe customer + flushes idempotency cache. Dev-only."}
      aria-label="Revoke access (dev-only)"
    >
      <RotateCcw className="h-3 w-3 mr-1" aria-hidden="true" />
      {busy ? "resetting…" : error ? "retry" : "revoke access"}
    </Button>
  );
}
