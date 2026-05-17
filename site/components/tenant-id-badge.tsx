"use client";

import { useState } from "react";
import { useAppContext } from "@/components/providers/marketplace";
import { Button } from "@/components/ui/button";

/**
 * Small developer/operator aid: shows the live
 * `application.context.marketplaceAppTenantId` resolved from the Marketplace
 * SDK iframe handshake, with a copy-to-clipboard button.
 *
 * Useful for invoking the seed CLI from another shell:
 *   npm run seed:state -- allowed --tenant <tenantId>
 *
 * Renders only when the SDK context has resolved. Safe to leave mounted in
 * production — the tenant ID is already in the iframe URL params that Cloud
 * Portal hands to the app, so this is not a leak.
 */
export function TenantIdBadge() {
  const appContext = useAppContext();
  const tenantId = appContext?.marketplaceAppTenantId;
  const [copied, setCopied] = useState(false);

  if (!tenantId) return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(tenantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable in some iframe sandbox configurations;
      // the value is still visible on-screen for manual selection.
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/50 text-xs font-mono">
      <span className="text-muted-foreground">tenantId:</span>
      <span className="text-foreground select-all">{tenantId}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={onCopy}
      >
        {copied ? "copied" : "copy"}
      </Button>
    </div>
  );
}
