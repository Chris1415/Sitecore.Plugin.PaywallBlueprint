/**
 * PaywallGate — FR-1 gate orchestration component.
 *
 * Resolves to one of four UX states by evaluating an EntitlementStore.
 * Per ADR-0008: consumes useAppContext() from MarketplaceProvider — provider
 * resolves before rendering children, so null-context is a belt-and-suspenders guard.
 * Per ADR-0011: PRD-000 evaluator only returns "allowed" | "tenant_no_subscription";
 * the seat-related variants are forward-compat (rendered here defensively).
 *
 * Props:
 *   children: React.ReactNode — rendered when entitlement is "allowed"
 *   store?: EntitlementStore — defaults to getDefaultStore() (SupabaseStore singleton)
 *   onStateChange?: (state) => void — fired once per resolved state
 *
 * FR-1 steps (numbered inline):
 *   1. Env-flag check — NEXT_PUBLIC_PAYWALL_ENABLED === "false" → render children verbatim
 *   2. Context-readiness — null/undefined context → SkeletonState
 *   3. Context validation — missing tenantId → THROW (error boundary catches)
 *   4. Dev-override (TODO: T041 wires this; Tranche C ships a stub)
 *   5. Entitlement fetch — useEffect + useState; pending → SkeletonState; reject → re-throw
 *   6. Render matching state component
 *
 * shape: node_modules/@sitecore-marketplace-sdk/client/dist/index.d.ts → ApplicationContext
 * Verified 2026-05-13 against fixture project-planning/architecture/sdk-fixtures/application-context.json
 *
 * sitecore:blok-components — delegates rendering to state components in ./states/
 * T033 GREEN for T036a tests.
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

  // Keep the callback ref in sync — use useEffect to avoid "update ref during render"
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  });

  // FR-1 Step 5 — entitlement store call
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
  }, [tenantId, userId, store]);

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
