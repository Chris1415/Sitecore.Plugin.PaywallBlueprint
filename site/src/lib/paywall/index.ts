/**
 * Public API barrel — T026
 *
 * Re-exports the adopter-facing public API for paywall-blueprint.
 * Deep-path imports stay legal but this barrel is the canonical entry point.
 *
 * Per § 4c-5 / PRD-001 non-negotiable: public barrel is required.
 *
 * Usage:
 *   import { PaywallGate, PaywallCheckoutDialog, ... } from '@/src/lib/paywall';
 */

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export { PaywallGate } from './PaywallGate';
export { PaywallCheckoutDialog } from './PaywallCheckoutDialog';
export { DemoModeBanner } from './DemoModeBanner';

// BentoGrid orchestrator — T064 (PRD-002)
// Adopters import this from the barrel to use the full dashboard.
// Individual cards (WelcomeHero, SitesTile, etc.) are deep-imported when
// swapping a single card, e.g.:
//   import { WelcomeHero } from "@/components/bento/welcome-hero";
export { BentoGrid } from '@/components/bento/bento-grid';

// ---------------------------------------------------------------------------
// State components (forward-compat; PRD-000-locked; untouched in PRD-001)
// ---------------------------------------------------------------------------

export { AllowedState } from './states/AllowedState';
export { NoSubscriptionState } from './states/NoSubscriptionState';
export { SeatsFullState } from './states/SeatsFullState';
export { UserUnassignedState } from './states/UserUnassignedState';
export { SkeletonState } from './states/SkeletonState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { PreviewState } from './preview-state';
export type {
  EntitlementStore,
  EntitlementSeed,
  EntitlementResult,
  PaymentProvider,
} from './types';

// ---------------------------------------------------------------------------
// Hooks — T039: useEntitlement re-export (public API barrel)
// ---------------------------------------------------------------------------
export { useEntitlement } from './hooks/useEntitlement';
export type { UseEntitlementReturn } from './hooks/useEntitlement';
