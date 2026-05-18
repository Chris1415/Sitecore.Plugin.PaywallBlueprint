"use client";

/**
 * ThemeToggle — light / dark / system theme switcher for the Paywall Blueprint topbar.
 *
 * ADR-0016: Theme toggle always visible (showcase posture — no env-gate here).
 * Production adopters should env-gate this per README "Production hardening for adopters".
 *
 * Hydration guard: uses mounted pattern per feedback_hydration_mismatch_pattern.md.
 * NO typeof window, NO matchMedia, NO navigator reads in render body or useState initializer.
 * The mounted guard is the ONLY mechanism for SSR/CSR divergence here.
 *
 * test:no-hex-in-bento: ZERO hex literals in this file. All colors via Blok semantic tokens.
 */

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  // Hydration-mismatch guard: render neutral fallback until mounted on client.
  // This avoids SSR/CSR class mismatch from next-themes writing 'class="dark"' to <html>.
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    // setState in effect is intentional here — this is the canonical next-themes
    // mounted-guard pattern. The only purpose is to sync with the DOM after hydration.
    // The lint rule flags this as "cascading renders" but the single boolean flip
    // from false→true is the correct mechanism. Disable inline per project convention.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Before client mount, render the Monitor icon as a neutral fallback.
  // This matches the SSR output and avoids a hydration mismatch.
  const currentIcon = !mounted ? (
    <Monitor className="h-4 w-4" />
  ) : resolvedTheme === "dark" ? (
    <Moon className="h-4 w-4" />
  ) : resolvedTheme === "light" ? (
    <Sun className="h-4 w-4" />
  ) : (
    <Monitor className="h-4 w-4" />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {currentIcon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
