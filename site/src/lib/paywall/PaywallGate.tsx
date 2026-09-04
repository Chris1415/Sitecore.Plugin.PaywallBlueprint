/**
 * FR-1 gate. Resolves to one of four UX states in a fixed order: env-flag →
 * context readiness → context validation (a missing tenantId THROWS, caught by
 * the error boundary) → dev override → entitlement fetch → render.
 *
 * Two of the four states are forward-compat; the current evaluator returns only
 * "allowed" and "tenant_no_subscription".
 * See docs/build-decisions.md#paywall-gate-steps.
 *
 * shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
 */

"use client";

import React, { useEffect, useRef, useState } from "react";
import type { EntitlementResult, EntitlementStore } from "./types";
import { getDefaultStore } from "./stores/index";
import { SkeletonState } from "./states/SkeletonState";
import { NoSubscriptionState } from "./states/NoSubscriptionState";
import { SeatsFullState } from "./states/SeatsFullState";
import { UserUnassignedState } from "./states/UserUnassignedState";
import { useAppContext, useHostUser } from "@/components/providers/marketplace";
import { useEntitlement } from "@/src/lib/paywall/hooks/useEntitlement";

type GatePhase =
  | { phase: "skeleton" }
  | { phase: "resolved"; result: EntitlementResult }
  | { phase: "error"; error: Error };

export interface PaywallGateProps {
  children: React.ReactNode;
  store?: EntitlementStore;
  onStateChange?: (
    state: EntitlementResult["status"] | "demo" | "dev-override"
  ) => void;
}

/**
 * PaywallGate — outer shell. Always calls all hooks unconditionally (rules of hooks),
 * then dispatches to the appropriate render path.
 */
export function PaywallGate({ children, store, onStateChange }: PaywallGateProps) {
  // All hooks called unconditionally — no conditional hook calls
  // shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
  const appContext = useAppContext() as unknown as Record<string, unknown> | null | undefined;
  const hostUser = useHostUser() as unknown as Record<string, unknown> | null | undefined;

  const resolvedStore = store ?? getDefaultStore();

  // ---------------------------------------------------------------------------
  // FR-1 Step 1 — env-flag check
  // NEXT_PUBLIC_PAYWALL_ENABLED=false → render children verbatim (demo mode)
  // Banner placement owned by page (T040); gate does NOT own banner.
  // ---------------------------------------------------------------------------
  if (process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "false") {
    return (
      <DemoPassthrough onStateChange={onStateChange}>
        {children}
      </DemoPassthrough>
    );
  }

  // ---------------------------------------------------------------------------
  // FR-1 Step 2 — context-readiness guard (ADR-0008 belt-and-suspenders)
  // ---------------------------------------------------------------------------
  if (!appContext) {
    return <SkeletonState />;
  }

  // ---------------------------------------------------------------------------
  // FR-1 Step 3 — context validation
  // tenantId = marketplaceAppTenantId per application-context.json fixture
  // ---------------------------------------------------------------------------
  const tenantId = appContext.marketplaceAppTenantId;
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    // Throw synchronously — React error boundary above catches this (NFR-6)
    throw new Error(
      "[PaywallBlueprint] malformed application.context: missing marketplaceAppTenantId"
    );
  }

  // userId = host.user.sub (Auth0 subject) — ADR-0011: ignored by PRD-000 evaluator
  const userId =
    typeof hostUser?.sub === "string" ? (hostUser.sub as string) : "";

  // ---------------------------------------------------------------------------
  // FR-1 Step 4 — dev override (compile-time guarded, NFR-5)
  //
  // Env var: NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID
  // Named NEXT_PUBLIC_ because this is a Client Component and cannot access
  // server-only env vars at runtime. The NODE_ENV !== 'production' guard ensures
  // Webpack/Next.js DCE removes this entire branch from production bundles:
  // Next.js statically replaces process.env.NODE_ENV at build time, so the
  // constant-folded condition `false && ...` is dead-code-eliminated by bundler.
  //
  // NEVER use a variable reference for process.env.NODE_ENV — the EXACT literal
  // `process.env.NODE_ENV !== 'production'` is required for constant-folding.
  //
  // Verified by: `npm run test:dce` post-build grep of .next/ for the var name.
  // T046 gate: operator confirms short-circuit on real tenant without Supabase entry.
  //
  // NFR-5: Compile-time dev override. Webpack DCE removes this branch in production.
  // Tranche D gate verifies via post-build grep of .next/ for NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID.
  // ---------------------------------------------------------------------------
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID &&
    process.env.NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID === hostUser?.sub
  ) {
    // Short-circuit: render children as if allowed.
    // DevOverridePassthrough uses a ref pattern to avoid conditional hook calls.
    return (
      <DevOverridePassthrough onStateChange={onStateChange}>
        {children}
      </DevOverridePassthrough>
    );
  }

  // FR-1 Steps 5 + 6 — async fetch + state render (in PaywallGateInner to keep hooks clean)
  return (
    <PaywallGateInner
      tenantId={tenantId}
      userId={userId}
      store={resolvedStore}
      onStateChange={onStateChange}
    >
      {children}
    </PaywallGateInner>
  );
}

// ---------------------------------------------------------------------------
// DemoPassthrough — handles FR-1 Step 1 (env-flag false)
// Separated so hooks (useEffect) are not called conditionally in PaywallGate.
// ---------------------------------------------------------------------------
function DemoPassthrough({
  children,
  onStateChange,
}: {
  children: React.ReactNode;
  onStateChange?: PaywallGateProps["onStateChange"];
}) {
  const firedRef = useRef(false);
  const callbackRef = useRef(onStateChange);

  // Keep callback ref in sync using useEffect (avoids "update ref during render" lint error)
  useEffect(() => {
    callbackRef.current = onStateChange;
  });

  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      callbackRef.current?.("demo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// DevOverridePassthrough — handles FR-1 Step 4 (dev override short-circuit)
// Separated so hooks (useEffect) are not called conditionally in PaywallGate.
// This component is compile-time dead-code-eliminated in production builds
// because it is only referenced inside the NODE_ENV !== 'production' branch.
// ---------------------------------------------------------------------------
function DevOverridePassthrough({
  children,
  onStateChange,
}: {
  children: React.ReactNode;
  onStateChange?: PaywallGateProps["onStateChange"];
}) {
  const firedRef = useRef(false);
  const callbackRef = useRef(onStateChange);

  useEffect(() => {
    callbackRef.current = onStateChange;
  });

  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      callbackRef.current?.("dev-override");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// PaywallGateInner — owns FR-1 Steps 5 + 6 (async fetch + state render)
// ---------------------------------------------------------------------------
interface PaywallGateInnerProps {
  tenantId: string;
  userId: string;
  store: EntitlementStore;
  onStateChange?: PaywallGateProps["onStateChange"];
  children: React.ReactNode;
}

function PaywallGateInner({
  tenantId,
  userId,
  store,
  onStateChange,
  children,
}: PaywallGateInnerProps) {
  const [gatePhase, setGatePhase] = useState<GatePhase>({ phase: "skeleton" });
  const onStateChangeRef = useRef(onStateChange);
  const resolveCallbackFiredRef = useRef(false);

  // T036: subscribe to useEntitlement for post-payment refresh (ADR-0014).
  // When the hook's polling detects status === 'allowed' (after checkout), bump
  // refreshKey to re-run the store query — gate transitions to AllowedState.
  // The hook is safe here because PaywallGateInner is always inside MarketplaceProvider
  // (PaywallGate is rendered inside /full-page/layout.tsx which wraps MarketplaceProvider).
  // triggerCheckout is unused at gate level (dialog owns it); only entitlement is read.
  const { entitlement: hookEntitlement } = useEntitlement();
  const [refreshKey, setRefreshKey] = useState(0);
  const prevAllowedRef = useRef(false);

  useEffect(() => {
    const isNowAllowed = hookEntitlement?.status === 'allowed';
    if (isNowAllowed && !prevAllowedRef.current) {
      prevAllowedRef.current = true;
      // Re-trigger the store query by bumping the key
      resolveCallbackFiredRef.current = false;
      setRefreshKey((k) => k + 1);
    }
  }, [hookEntitlement]);

  // Keep the callback ref in sync — use useEffect to avoid "update ref during render"
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  });

  // FR-1 Step 5 — entitlement store call; re-runs when refreshKey bumps (T036 refresh)
  useEffect(() => {
    let cancelled = false;

    store
      .getEntitlement(tenantId, userId)
      .then((result: EntitlementResult) => {
        if (cancelled) return;
        setGatePhase({ phase: "resolved", result });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setGatePhase({ phase: "error", error });
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, userId, store, refreshKey]);

  // Fire onStateChange once per resolved state
  useEffect(() => {
    if (
      gatePhase.phase === "resolved" &&
      !resolveCallbackFiredRef.current
    ) {
      resolveCallbackFiredRef.current = true;
      onStateChangeRef.current?.(gatePhase.result.status);
    }
  }, [gatePhase]);

  // FR-1 Step 5 — re-throw on error (error boundary catches per NFR-6)
  if (gatePhase.phase === "error") {
    throw gatePhase.error;
  }

  // FR-1 Step 5 — skeleton during pending
  if (gatePhase.phase === "skeleton") {
    return <SkeletonState />;
  }

  // FR-1 Step 6 — render matching state
  const { result } = gatePhase;

  switch (result.status) {
    case "allowed":
      return <>{children}</>;

    case "tenant_no_subscription":
      return <NoSubscriptionState />;

    case "tenant_active_seats_full":
      // ADR-0011: PRD-000 evaluator NEVER returns this — defensive branch for union exhaustiveness
      // PRD-002 wires the evaluator routing for this variant
      console.warn(
        "[PaywallBlueprint] tenant_active_seats_full reached — this branch is unreachable per PRD-000 evaluator (ADR-0011). PRD-002 extends the evaluator."
      );
      return <SeatsFullState seatsTotal={result.seatsTotal} />;

    case "tenant_active_user_unassigned":
      // ADR-0011: PRD-000 evaluator NEVER returns this — defensive branch for union exhaustiveness
      // PRD-002 wires the evaluator routing for this variant
      console.warn(
        "[PaywallBlueprint] tenant_active_user_unassigned reached — this branch is unreachable per PRD-000 evaluator (ADR-0011). PRD-002 extends the evaluator."
      );
      return <UserUnassignedState />;

    default:
      // TypeScript exhaustiveness guard — result is narrowed to never here
      throw new Error(
        `[PaywallBlueprint] Unhandled entitlement status: ${(result as { status: string }).status}`
      );
  }
}
