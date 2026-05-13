# Paywall Blueprint — site/

This is the Next.js application for the Paywall Blueprint Sitecore Marketplace App.

For the full OSS-facing README including quickstart, adoption guide, and swap-points, see `products/paywall-blueprint/README.md` (written at Tranche E).

## Local development

This is a **Mode A 4a client-side scaffold** — HTTP on localhost is fully supported. No HTTPS dev server, no mkcert, and no certificate trust dance are required.

The Chrome Local Network Access (PNA) headers added to `next.config.mjs` in T004 are the correct mechanism for allowing the Cloud Portal's iframe (served from a public origin) to load the app at `http://localhost:3000`. See `next.config.mjs` for the exact header block.

To start the dev server:

```bash
cd site
npm install
npm run dev
```

The server starts at `http://localhost:3000`. Register a custom app in Cloud Portal → App Studio pointing to `http://localhost:3000` (see T007 operator instructions for exact values).

**Why no mkcert?** Mode A client-side apps communicate via the portal's postMessage bridge, not via cookies set at the app origin. Only the full-stack scaffold (Mode B) — which uses Auth0 PKCE cookies that require `SameSite=None; Secure` — needs HTTPS + mkcert. This app is Mode A only (per ADR-0005). This supersedes the architect-stage assumption recorded in the run manifest's `operator_attention` (resolved 2026-05-13 per `sitecore:marketplace-sdk-testing-debug` § 3).

## Scripts

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript type-check (tsc --noEmit)
npm run test         # Run Vitest test suite (once)
npm run test:watch   # Run Vitest in watch mode
```

## Adding Blok components

The `@blok` registry is registered in `components.json`. To add more Blok components:

```bash
npx shadcn@latest add @blok/<component-name>
```

Example:

```bash
npx shadcn@latest add @blok/button @blok/card @blok/dialog
```

## Using components

```tsx
import { Button } from "@/components/ui/button";
```

## Scaffold

This app was scaffolded via the canonical Blok Marketplace client-side quickstart:

```bash
yes '' | npx --yes shadcn@latest add https://blok.sitecore.com/r/marketplace/next/quickstart-with-client-side-xmc.json --yes --cwd site
```

The scaffolded `site/next-app/` subdirectory was flattened to `site/` immediately after scaffolding (per `sitecore:setup-marketplace-client-side` flatten step).
