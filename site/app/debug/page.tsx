/**
 * SDK probe / debug surface.
 *
 * Tranche B helper — lets the operator fire arbitrary Marketplace SDK queries
 * from inside the Cloud Portal iframe (or direct browser preview) and capture
 * the JSON shape for `project-planning/architecture/sdk-fixtures/`.
 *
 * Not part of the public blueprint pattern — Tranche E may keep it as a
 * "Development helpers" surface or remove it. For now it's the easiest way
 * to verify the .d.ts findings against runtime.
 *
 * Click "Run" on any probe, then "Copy JSON" to paste into chat or save
 * to a fixture file under
 *   project-planning/architecture/sdk-fixtures/<probe-name>.json
 */

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useAppContext,
  useMarketplaceClient,
} from "@/components/providers/marketplace";

type ProbeStatus = "idle" | "running" | "ok" | "error";

interface ProbeState {
  status: ProbeStatus;
  data: unknown;
  error: string | null;
  durationMs: number | null;
}

const initialProbeState: ProbeState = {
  status: "idle",
  data: null,
  error: null,
  durationMs: null,
};

function ProbeCard({
  title,
  description,
  queryKey,
  state,
  onRun,
  onCopy,
}: {
  title: string;
  description: string;
  queryKey: string;
  state: ProbeState;
  onRun: () => void;
  onCopy: () => void;
}) {
  return (
    <Card style="outline" elevation="sm" className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <Badge colorScheme="neutral">
              client.query(&apos;{queryKey}&apos;)
            </Badge>
            {state.status === "ok" && (
              <Badge colorScheme="success">OK — {state.durationMs}ms</Badge>
            )}
            {state.status === "error" && (
              <Badge colorScheme="danger">Error</Badge>
            )}
            {state.status === "running" && (
              <Badge colorScheme="primary">Running…</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="default"
            onClick={onRun}
            disabled={state.status === "running"}
          >
            Run probe
          </Button>
          {state.status === "ok" && (
            <Button variant="outline" onClick={onCopy}>
              Copy JSON
            </Button>
          )}
        </div>
      </div>
      {state.status === "ok" && (
        <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96 border">
          {JSON.stringify(state.data, null, 2)}
        </pre>
      )}
      {state.status === "error" && (
        <pre className="bg-destructive/10 text-destructive p-4 rounded-md text-xs overflow-auto max-h-96 border border-destructive/20">
          {state.error}
        </pre>
      )}
    </Card>
  );
}

export default function DebugPage() {
  const appContext = useAppContext();
  const client = useMarketplaceClient();

  // application.context is already resolved by the provider — show it pre-loaded.
  const [appContextState] = useState<ProbeState>({
    status: "ok",
    data: appContext,
    error: null,
    durationMs: 0,
  });

  const [hostUserState, setHostUserState] = useState<ProbeState>(
    initialProbeState,
  );
  const [pagesContextState, setPagesContextState] = useState<ProbeState>(
    initialProbeState,
  );

  async function runProbe<T>(
    queryKey: string,
    setter: (s: ProbeState) => void,
  ): Promise<void> {
    setter({ status: "running", data: null, error: null, durationMs: null });
    const start = performance.now();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (client as any).query(queryKey);
      const durationMs = Math.round(performance.now() - start);
      setter({
        status: "ok",
        data: result?.data ?? result,
        error: null,
        durationMs,
      });
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      setter({
        status: "error",
        data: null,
        error: err instanceof Error ? err.stack ?? err.message : String(err),
        durationMs,
      });
    }
  }

  async function copyJson(state: ProbeState): Promise<void> {
    if (state.status !== "ok") return;
    const json = JSON.stringify(state.data, null, 2);
    await navigator.clipboard.writeText(json);
  }

  return (
    <main className="max-w-[1080px] mx-auto w-full px-6 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          SDK Probe — Development helpers
        </h1>
        <p className="text-sm text-muted-foreground">
          Fire arbitrary Marketplace SDK queries from this page. Use to verify
          runtime shapes against the .d.ts declarations and capture fixtures
          for{" "}
          <code className="px-1 py-0.5 bg-muted rounded text-xs">
            project-planning/architecture/sdk-fixtures/
          </code>
          .
        </p>
      </header>

      <Separator />

      <ProbeCard
        title="application.context"
        description="App-level context — installationId, organizationId, resourceAccess[] (tenant identity lives here), extensionPoints[]. Pre-loaded by MarketplaceProvider — no action needed to view."
        queryKey="application.context"
        state={appContextState}
        onRun={() => {}}
        onCopy={() => copyJson(appContextState)}
      />

      <ProbeCard
        title="host.user"
        description="Logged-in Cloud Portal user identity — id, name, email. Not in application.context per T014 .d.ts verification; requires a separate query."
        queryKey="host.user"
        state={hostUserState}
        onRun={() => runProbe("host.user", setHostUserState)}
        onCopy={() => copyJson(hostUserState)}
      />

      <ProbeCard
        title="pages.context"
        description="Page-level context (when running inside the Page Builder extension point). Likely returns null/error in xmc:fullscreen — useful to confirm the shape Cloud Portal sends for non-Page-Builder surfaces."
        queryKey="pages.context"
        state={pagesContextState}
        onRun={() => runProbe("pages.context", setPagesContextState)}
        onCopy={() => copyJson(pagesContextState)}
      />

      <Card style="outline" elevation="sm" className="p-6 bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          How to capture fixtures
        </h3>
        <ol className="text-sm text-muted-foreground list-decimal pl-5 flex flex-col gap-1">
          <li>Run a probe; verify the JSON renders without error.</li>
          <li>
            Click <strong>Copy JSON</strong> — the formatted JSON lands in your
            clipboard.
          </li>
          <li>
            Paste it back in chat. I&apos;ll save it as{" "}
            <code className="px-1 py-0.5 bg-background rounded text-xs">
              project-planning/architecture/sdk-fixtures/&lt;probe&gt;.json
            </code>{" "}
            with a header comment naming the tenant + capture date.
          </li>
        </ol>
      </Card>
    </main>
  );
}
