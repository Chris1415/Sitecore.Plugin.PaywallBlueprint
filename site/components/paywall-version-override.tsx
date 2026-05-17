"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Operator-facing UI for the idempotency-key version override.
 *
 * Writes / clears the `paywall_version` localStorage key that
 * `useEntitlement` reads at checkout time. UI tier of the three-tier
 * precedence (UI > env > code default) — see StripeProvider.ts JSDoc.
 *
 * Three affordances:
 *   - input + save  — type a custom version string and persist it
 *   - reset         — one-click: writes `reset-<epoch>` to localStorage,
 *                     guaranteeing a fresh Stripe idempotency key for the
 *                     next Subscribe click. Useful for "deleted tenants row
 *                     in Supabase, want to re-subscribe" test cycles.
 *   - clear         — remove the override; falls back to env/default
 *
 * Renders only after the SDK context can resolve (no SDK dep here, but the
 * `/full-page` shell already gates rendering). Safe to leave in production —
 * the override only affects the operator's own browser via localStorage.
 * Adopters who fork the blueprint can remove this component from
 * `app/full-page/page.tsx` if they don't want it visible.
 */

const STORAGE_KEY = "paywall_version";

export function PaywallVersionOverride() {
  const [value, setValue] = useState("");
  const [active, setActive] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && stored.length > 0) {
        setValue(stored);
        setActive(stored);
      }
    } catch {
      // localStorage may be blocked in some iframe sandbox configurations;
      // the operator can still use the ?paywall_version=... URL param.
    }
  }, []);

  const save = () => {
    const trimmed = value.trim();
    try {
      if (trimmed.length === 0) {
        window.localStorage.removeItem(STORAGE_KEY);
        setActive(null);
      } else {
        window.localStorage.setItem(STORAGE_KEY, trimmed);
        setActive(trimmed);
      }
    } catch {
      // ignore — input is still on screen for next attempt
    }
  };

  const reset = () => {
    const fresh = `reset-${Date.now()}`;
    setValue(fresh);
    try {
      window.localStorage.setItem(STORAGE_KEY, fresh);
      setActive(fresh);
    } catch {
      // ignore
    }
  };

  const clear = () => {
    setValue("");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setActive(null);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md bg-muted/40 border border-border/50 text-xs font-mono">
      <span className="text-muted-foreground">paywall_version:</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="(unset — env or default)"
        className="bg-transparent border border-border/50 rounded px-2 py-0.5 text-foreground w-56 outline-none focus:border-foreground/50"
        spellCheck={false}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={save}
      >
        save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={reset}
        title="Write a fresh `reset-<epoch>` value — guarantees a new Stripe idempotency key on the next Subscribe click"
      >
        reset
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={clear}
      >
        clear
      </Button>
      {active !== null && (
        <span className="text-muted-foreground ml-auto">
          active: <span className="text-foreground">{active}</span>
        </span>
      )}
    </div>
  );
}
