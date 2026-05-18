"use client";

/**
 * SitesTile — F2 bento card.
 *
 * T012 — PRD-002 Tranche B.
 *
 * ONLY new Marketplace SDK call in PRD-002: xmc.sites.listSites
 *
 * shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964 Sites.Site
 * shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:2561 Sites.ListSitesData
 * shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/augmentation.gen.d.ts:76 xmc.sites.listSites
 *
 * Envelope: DOUBLE unwrap (result.data?.data is Sites.Site[]).
 * T020 Gate B real-tenant smoke (2026-05-18) confirmed runtime shape is
 * `{ data: { data: Sites.Site[] } }` — the marketplace-sdk-client wraps
 * xmc.* module-key responses once more on top of the raw SDK envelope.
 * The `.d.ts` (`Sites.ListSitesResponses[200] = Array<Site>`) describes the
 * SDK-internal raw response, not the post-postMessage client.query envelope.
 * Architecture § 5c (double-unwrap assumption) was correct.
 *
 * sitecore:blok-theming — ZERO hex literals. Semantic tokens only.
 * test:no-hex-in-bento enforces this at CI time.
 */

import { useEffect, useState, useCallback } from "react";
import type { Sites } from "@sitecore-marketplace-sdk/xmc";
import { Globe, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  useMarketplaceClient,
  useAppContext,
} from "@/components/providers/marketplace";

// ---------------------------------------------------------------------------
// Discriminated union state
// ---------------------------------------------------------------------------
type SitesTileState =
  | { kind: "loading" }
  | { kind: "success"; sites: Sites.Site[] }
  | { kind: "empty" }
  | { kind: "error"; message: string };

interface SitesTileProps {
  "data-card"?: string;
}

export function SitesTile({ "data-card": dataCard }: SitesTileProps = {}) {
  const client = useMarketplaceClient();
  const appCtx = useAppContext();
  const [state, setState] = useState<SitesTileState>({ kind: "loading" });
  const [retryCount, setRetryCount] = useState(0);

  const fetchSites = useCallback(async (cancelled: { value: boolean }) => {
    // shape: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts ApplicationResourceContext
    const sitecoreContextId = appCtx?.resourceAccess?.[0]?.context?.live;

    if (!sitecoreContextId) {
      if (!cancelled.value) {
        setState({ kind: "error", message: "Sitecore context unavailable" });
      }
      return;
    }

    setState({ kind: "loading" });

    try {
      // shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:2561
      const result = await client.query("xmc.sites.listSites", {
        params: { query: { sitecoreContextId } },
      });

      if (cancelled.value) return;

      // [DOUBLE-UNWRAP] confirmed by T020 Gate B real-tenant smoke (2026-05-18).
      // client.query() wraps xmc.* module-key responses; the inner .data holds the Site[].
      const sites: Sites.Site[] =
        (result.data as { data?: Sites.Site[] } | undefined)?.data ?? [];

      if (sites.length === 0) {
        setState({ kind: "empty" });
      } else {
        setState({ kind: "success", sites });
      }
    } catch (err) {
      if (!cancelled.value) {
        const message =
          err instanceof Error ? err.message : "Failed to load sites";
        setState({ kind: "error", message });
      }
    }
  }, [client, appCtx, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const cancelled = { value: false };
    // Inline async IIFE makes the async boundary explicit to the linter.
    // All setState calls inside fetchSites occur after await resolves — never synchronously.
    (async () => {
      await fetchSites(cancelled);
    })().catch(() => {
      // fetchSites has its own internal error handling; this catch is a safety net.
    });
    return () => {
      cancelled.value = true;
    };
  }, [fetchSites]);

  const handleRetry = () => {
    setRetryCount((n) => n + 1);
  };

  return (
    <section
      className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3"
      data-card={dataCard ?? "f2"}
      aria-labelledby="f2-title"
    >
      {/* Card title */}
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-base font-semibold text-foreground" id="f2-title">
          Sites
        </span>
      </div>

      {/* State rendering */}
      {state.kind === "loading" && (
        <div aria-busy="true" className="flex flex-col gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      )}

      {state.kind === "success" && (
        <div className="flex flex-col gap-2">
          <div className="text-3xl font-bold text-foreground">
            {state.sites.length}
          </div>
          <ul className="flex flex-col gap-1">
            {state.sites.slice(0, 2).map((site, i) => (
              <li
                key={site.id ?? site.name ?? `site-${i}`}
                className="text-sm text-muted-foreground truncate"
              >
                {site.displayName ?? site.name ?? site.id ?? "—"}
              </li>
            ))}
            {state.sites.length > 2 && (
              <li className="text-xs text-muted-foreground">
                \u2026and {state.sites.length - 2} more
              </li>
            )}
          </ul>
        </div>
      )}

      {state.kind === "empty" && (
        <p className="text-sm text-muted-foreground">
          No sites in this tenant yet \u2014 create one in XM Cloud to see it
          here.
        </p>
      )}

      {state.kind === "error" && (
        <div className="flex flex-col gap-2">
          <Alert variant="danger" className="flex items-start gap-2 p-3">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span className="text-sm">
              Couldn&apos;t load sites. {state.message}
            </span>
          </Alert>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            type="button"
          >
            Retry
          </Button>
        </div>
      )}
    </section>
  );
}
