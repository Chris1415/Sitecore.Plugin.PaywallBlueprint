# Click targets — Variant 2: Editorial Cadence

POC path: `products/paywall-blueprint/pocs/poc-v2-prd002/`
Entry point: `index.html` (opens via `file://`)
State strategy: **Option B** — single page; body class flips between `.locked` and `.unlocked` to switch states. Optional URL param `?state=unlocked` can preset the initial state.

## Click targets

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| index.html (locked) | `.subscribe-banner-cta` | toggles to unlocked state; triggers stagger-in cascade + counter + ring + chart-draw animations | index.html with `body.unlocked` |
| index.html (any state) | `.state-toggle` | POC-only toggle in topbar; flips locked ↔ unlocked. Real app drives this via `useEntitlement`; this affordance is for POC evaluation only. | index.html with opposite body state class |
| index.html (any state) | `.theme-toggle__trigger` | opens the theme dropdown menu | dropdown visible (`data-open="true"`) |
| index.html (any state) | `.theme-toggle__item[data-mode="light"]` | switches to light theme; persists in `localStorage` | same screen with `html[data-theme="light"]` |
| index.html (any state) | `.theme-toggle__item[data-mode="dark"]` | switches to dark theme; persists in `localStorage` | same screen with `html[data-theme="dark"]` |
| index.html (any state) | `.theme-toggle__item[data-mode="system"]` | follows OS `prefers-color-scheme`; persists in `localStorage` | same screen with `html[data-theme="system"]` |
| index.html (any) | outside-click on document | closes the theme dropdown | dropdown hidden (`data-open="false"`) |
| index.html (any) | `Escape` key (keyboard) | closes the theme dropdown | dropdown hidden |

## Non-interactive affordances (documented for completeness)

| Element | Purpose | Live behavior |
|---------|---------|---------------|
| `.dev-strip[title="Tenant ID — dev affordance"]` | Mocks `<TenantIdBadge>` from the topbar | Display only; no click target |
| `.dev-strip[title="Paywall version override — dev affordance"]` | Mocks `<PaywallVersionOverride>` | Display only; no click target |
| `.premium-corner-badge` (×6, one per P1–P6) | "Premium" badge visible in locked state on each blurred card | Display only in POC; in real app a Blok Tooltip shows "Subscribe to unlock" on hover |

## URL parameters

| Param | Values | Effect |
|-------|--------|--------|
| `?state=locked` | (default) | Page renders in locked state |
| `?state=unlocked` | — | Page renders in unlocked state on initial load |

## States visualized

- **Locked** (default): premium region wrapped in `filter: blur(12px) opacity(0.7) pointer-events:none aria-hidden=true`; shimmer overlay loops at 3s; Subscribe banner positioned absolutely over the P1+P5 column band of the premium grid; 6 premium "Premium" corner badges remain readable above the blur via stacking context.
- **Unlocked**: premium region clears blur/opacity/shimmer/aria-hidden; Subscribe banner is hidden via `body.locked` rule; 6 premium cards stagger-in via `@keyframes fadeUp` at 100ms intervals (0/100/200/300/400/500ms); P1 chart strokes draw via `stroke-dashoffset`; P2 progress bars scale-X; P4 KPI counters tick via `requestAnimationFrame`; P6 ring fills via `stroke-dashoffset`.

## Verification checklist

- [ ] Open `index.html` via `file://` — page renders without console errors
- [ ] Default state: locked (Subscribe banner visible, premium region blurred)
- [ ] Click Subscribe → state flips to unlocked; stagger-in cascade visible
- [ ] Click `STATE: …` button → state flips back; counters reset to "—"
- [ ] Click theme-toggle trigger → dropdown opens
- [ ] Pick Light → page recolors; check stays on Light item
- [ ] Pick Dark → page recolors; heroes (F1, P1, P4) get visibly heavier shadows
- [ ] Pick System → page follows OS theme
- [ ] Reload with `?state=unlocked` → page opens already unlocked
- [ ] Resize browser to ~400px → single-column stack; banner becomes static inline card above the blurred region
- [ ] Resize browser to ~900px → 2-column masonry; F1 and P1 become full-row
