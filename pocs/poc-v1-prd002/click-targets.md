# Click targets — Variant 1: Mosaic Discipline (PRD-002 POC)

Single-page POC. State toggle and theme toggle flip attributes on `<html>` / `<body>`; CSS reflows.

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| index.html (locked) | `.subscribe-banner-cta` | toggles to unlocked state; replays stagger-in cascade, KPI counter rAF (0→12,400 / 0→248 / 0→32s / 0→28%), 3 progress bars (0→87/92/78%), P6 ring (0→87%) | index.html with `<body data-state="unlocked">` |
| index.html (any state) | `.state-toggle[data-target="locked"]` | sets `<body data-state="locked">`; premium region blurs with `filter: blur(12px) opacity(0.7)`; shimmer overlay starts 3s loop; Subscribe banner appears centered over premium region | index.html with `<body data-state="locked">` |
| index.html (any state) | `.state-toggle[data-target="unlocked"]` | sets `<body data-state="unlocked">`; Subscribe banner unmounts; premium cards stagger in (0/80/160/240/320/400ms delays); KPIs + progress + ring animate | index.html with `<body data-state="unlocked">` |
| index.html (any state) | `.theme-toggle-btn[data-mode="light"]` | sets `<html data-theme="light">`; all Blok semantic tokens reflow to light values | same screen with `data-theme="light"` |
| index.html (any state) | `.theme-toggle-btn[data-mode="dark"]` | sets `<html data-theme="dark">`; all tokens flip to dark values; Subscribe banner gains subtle outer glow when in locked state | same screen with `data-theme="dark"` |
| index.html (any state) | `.theme-toggle-btn[data-mode="system"]` | sets `<html data-theme="system">`; follows `prefers-color-scheme` OS preference | same screen with `data-theme="system"` |
| index.html (any state) | `.blok-topbar__theme-toggle` | static affordance in the real app (opens the @blok/dropdown-menu with Light/Dark/System). In POC, decorative only — operator uses the picker bar at top of page | (no-op in POC; real app opens dropdown) |
| index.html | URL `?state=locked` | initial render with locked state | same as `.state-toggle[data-target="locked"]` |
| index.html | URL `?state=unlocked` | initial render with unlocked state | same as `.state-toggle[data-target="unlocked"]` |
| index.html | URL `?theme=light\|dark\|system` | initial theme | same as theme button click |

## What the POC fakes vs the real app

- **Real app `<ThemeToggle>`** uses `@blok/dropdown-menu` + `@blok/button` with `next-themes` `useTheme()`. POC inlines a 3-button picker bar for visual evaluation; the Topbar's theme-toggle button is decorative only.
- **Real app Subscribe CTA** opens `<PaywallCheckoutDialog>` → Stripe Checkout → `/paywall-return` → iframe reload → entitlement reflows to `allowed`. POC short-circuits the entire flow: clicking Subscribe sets `<body data-state="unlocked">` directly.
- **Real app P1 ActivityChart** is `recharts <AreaChart>` lazy-loaded. POC uses inline SVG with a hand-drawn believable 30-day path.
- **Real app entitlement state** comes from `useEntitlement()` via `MarketplaceProvider` postMessage + 60s polling + visibility-refresh. POC uses a `data-state` attribute flipped by the picker bar.
- **TenantIdBadge** + **PaywallVersionOverride** render as small `font-mono` strips in the topbar with placeholder values. No interaction.

## Verified states

- locked + light
- locked + dark
- locked + system (defaults to dark in OS dark mode; light otherwise)
- unlocked + light
- unlocked + dark
- unlocked + system

## Responsive breakpoints exercised

| Viewport | Behavior |
|----------|----------|
| ≥1024px | 3-col × 4-row bento; Subscribe banner spans 3 cols × 2 rows in locked state |
| 768–1023px | 2-col reflow; banner anchors to premium region rect via JS-measured CSS vars; spacer cell hidden |
| <768px | single-column stack; Subscribe banner full-width with `inset` clamping; dev-affordance strips hidden in topbar; chart height reduced to 100px; P6 score split stacks vertically |
