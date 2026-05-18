"use client";

/**
 * ResetEntitlementButton — always-on demo affordance for fast paywall iteration.
 *
 * The paywall-blueprint is a demo / showcase product with no real production
 * deployment to protect — adopters who fork it for real use should gate this
 * button (and the matching /api/dev/reset-entitlement route) behind their own
 * production check. In the blueprint itself the button always renders so a
 * Subscribe → revoke → Subscribe loop is available everywhere the demo runs.
 *
 * Click → POST /api/dev/reset-entitlement → drops every tenants row sharing
 * the current stripe_customer_id (sweeps orphan rows too) + flushes the
 * processed_events idempotency cache. Then reloads the iframe so the
 * server-side SupabaseStore.getEntitlement re-fetches and BentoGrid re-locks.
 *
 * sitecore:blok-theming — semantic tokens only; no hex literals.
 */

import { useState } from "react";
import { useAppContext } from "@/components/providers/marketplace";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export function ResetEntitlementButton() {
  const appContext = useAppContext();
  const tenantId = appContext?.marketplaceAppTenantId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      title={error ?? "Drops all tenants rows for this Stripe customer + flushes idempotency cache."}
      aria-label="Revoke access"
    >
      <RotateCcw className="h-3 w-3 mr-1" aria-hidden="true" />
      {busy ? "resetting…" : error ? "retry" : "revoke access"}
    </Button>
  );
}
