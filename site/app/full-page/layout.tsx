import { MarketplaceProvider } from "@/components/providers/marketplace";

/**
 * Nested layout for the `xmc:fullscreen` extension-point route.
 *
 * MarketplaceProvider lives here (not at the root) so the public IntroPage
 * at `/` can render without being blocked by the SDK iframe handshake. Any
 * extension-point route that needs application.context / host.user belongs
 * under a sibling nested layout following this same pattern.
 */
export default function FullPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketplaceProvider>{children}</MarketplaceProvider>;
}
