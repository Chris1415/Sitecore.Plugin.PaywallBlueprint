/**
 * Paywall Blueprint — Cloud Portal `xmc:fullscreen` extension-point route.
 *
 * Cloud Portal embeds this app via the URL pattern
 *   /full-page?organizationId=...&marketplaceAppTenantId=...
 * per `sitecore:marketplace-sdk-extension-routes` § canonical routes for
 * `xmc:fullscreen`. Direct browser preview at `/` shows the same shell so
 * developers can iterate without the iframe roundtrip.
 *
 * Tranche A: re-exports the root shell verbatim. The shell renders the same
 * freemium layout regardless of how it's reached.
 */

import Page from "../page";

export default Page;
