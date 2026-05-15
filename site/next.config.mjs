// next.config.mjs — Marketplace app headers (PNA + CSP) for 4b full-stack scaffold.
//
// ADR-0013: scaffold migrated from 4a (client-side) to 4b (full-stack) in PRD-001 T003.
//
// PNA headers (Chrome Local Network Access):
//   The portal is served from a public origin (e.g. https://portal.sitecorecloud.io);
//   Chrome's Local Network Access policy blocks public-origin iframes from loading
//   `localhost` URLs unless the target advertises consent via these headers.
//   IMPORTANT: do NOT combine `Access-Control-Allow-Origin: *` with
//   `Access-Control-Allow-Credentials: true` — the spec forbids that combo and
//   browsers silently reject the response. For iframe-embedding navigation the
//   credentials header isn't needed, so omit it entirely.
//   Harmless in production — public-origin apps won't trigger the LNA check.
//
// CSP frame-ancestors (from full-stack quickstart via sitecore:setup-marketplace-full-stack):
//   Allows the Cloud Portal, Pages, and XM Apps to iframe this app.
//   Applied to the same source pattern as the PNA headers for consistency.

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const allowedParentDomains = [
      'https://marketplace-app.sitecorecloud.io',
      'https://pages.sitecorecloud.io',
      'https://xmapps.sitecorecloud.io',
    ];

    return [
      {
        source: '/:path*',
        headers: [
          // PNA headers (Mode A — client-side iframe; no HTTPS required for Mode A)
          { key: 'Access-Control-Allow-Private-Network', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Access-Control-Request-Private-Network' },
          // CSP frame-ancestors (added in 4b migration — prevents clickjacking from unknown origins)
          { key: 'Content-Security-Policy', value: `frame-ancestors 'self' ${allowedParentDomains.join(' ')}` },
        ],
      },
    ];
  },
};

export default nextConfig;
