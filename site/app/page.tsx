import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Public IntroPage at `/`.
 *
 * Renders when the deploy URL is visited outside the Cloud Portal iframe.
 * Marketing-style landing: hero, project-overview metadata, single
 * extension-point card linking to the gated demo at `/full-page`.
 *
 * Not wrapped by MarketplaceProvider — that lives at `app/full-page/layout.tsx`
 * so this page is not gated by the SDK handshake.
 */
export default function IntroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-6 tracking-tight">
            Paywall Blueprint
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The first publicly available worked example of monetizing a
            Sitecore Marketplace App. A <code>&lt;PaywallGate&gt;</code> React
            component that evaluates tenant entitlement, four ready-to-ship
            UX state components, a swappable <code>EntitlementStore</code>{" "}
            adapter backed by Supabase, and a <code>PaymentProvider</code>{" "}
            interface stubbed for Stripe direct integration. Fork it, swap
            the content and the adapters, ship a paywalled Marketplace app in
            hours.
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 mb-16 border border-border/50">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Project Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="font-medium text-foreground">Title</div>
              <div className="text-muted-foreground">Paywall Blueprint</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Author</div>
              <div className="text-muted-foreground">Christian Hahn</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Version</div>
              <div className="text-muted-foreground">0.1.0</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">Released at (V1)</div>
              <div className="text-muted-foreground">15.05.2026</div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="font-medium text-foreground">
                Extension Points
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge colorScheme="primary">Full Page</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 max-w-2xl mx-auto">
          <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Full Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col flex-grow">
              <div className="bg-muted rounded-lg overflow-hidden">
                <Image
                  src="/full-page.png"
                  alt="Paywall Blueprint — Full Page surface (allowed state with welcome card)"
                  width={720}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardDescription className="text-sm leading-relaxed flex-grow">
                The single extension-point route. Renders the freemium layout
                — a free section above a paywalled section gated by{" "}
                <code>&lt;PaywallGate&gt;</code>. The gate evaluates tenant
                entitlement via the swappable <code>EntitlementStore</code>{" "}
                adapter and resolves to one of four states (allowed, no
                subscription, seats full, user unassigned), each with a
                ready-to-ship state component. A skeleton state handles
                loading; an error boundary keeps the free section visible
                when the gate throws.
              </CardDescription>
              <Link href="/full-page" className="mt-auto mb-2">
                <Button variant="outline" className="w-full bg-transparent">
                  Open Full Page
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
