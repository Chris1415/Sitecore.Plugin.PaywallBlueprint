/**
 * Paywall Blueprint — core type contracts
 *
 * ADR-0002: EntitlementStore (production-runtime) and EntitlementSeed (dev/CLI)
 *   are intentionally split into two interfaces. SupabaseStore implements both.
 *   Future adapters need only implement EntitlementStore. Never merge them.
 *
 * ADR-0003 (revised 2026-05-13): PaymentProvider is a TYPE-ONLY placeholder in
 *   PRD-000 — no implementation ships here. PRD-001 ships Stripe direct as the
 *   first concrete implementation (Stripe Billing + Entitlements API + Customer
 *   Portal). Lemon Squeezy / Polar.sh / Paddle are post-PRD-003 swap candidates.
 *   Adopters can implement against the interface immediately for forward-compat.
 *
 * ADR-0011: Tenant-only entitlement in PRD-000. The PRD-000 evaluator only
 *   returns the first two EntitlementResult variants. The seat-related variants
 *   are forward-compat placeholders for PRD-002's extended evaluator.
 */

// ---------------------------------------------------------------------------
// EntitlementStore — production-runtime interface
// ---------------------------------------------------------------------------

export interface EntitlementStore {
  /**
   * PRD-000 (ADR-0011): consults `tenants` table only. The `userId` parameter is
   * accepted for interface stability across PRDs but IGNORED in PRD-000. PRD-002
   * extends with the seats branch.
   */
  getEntitlement(tenantId: string, userId: string): Promise<EntitlementResult>;
}

// ---------------------------------------------------------------------------
// EntitlementSeed — dev / CLI interface (ADR-0002: never merge with Store)
// ---------------------------------------------------------------------------

export interface EntitlementSeed {
  seedTenant(args: {
    tenantId: string;
    plan: string;
    seatsTotal: number;
    status: 'active' | 'cancelled' | 'past_due';
  }): Promise<void>;
  // seedSeat lands in PRD-002 alongside the seats table (ADR-0011). Do NOT
  // implement in PRD-000; the state-switcher CLI's seats-full/unassigned
  // invocations render the components directly without seeding.
  clearState(tenantId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// EntitlementResult — discriminated union (4 variants for forward-compat)
// ---------------------------------------------------------------------------

/**
 * ADR-0011 note on reachability:
 *   PRD-000 evaluator ONLY returns the first two variants:
 *     - { status: 'allowed' }
 *     - { status: 'tenant_no_subscription' }
 *
 *   The seat-related variants below are FORWARD-COMPAT placeholders.
 *   PRD-000 evaluator NEVER returns them. PRD-002's extended evaluator
 *   wires the routing once the `seats` table is added.
 */
export type EntitlementResult =
  // PRD-000 evaluator returns one of:
  | { status: 'allowed' }
  | { status: 'tenant_no_subscription' }
  // Below: forward-compat variants. PRD-000 evaluator NEVER returns these.
  // The state components ship and are rendered via direct invocation by
  // the state-switcher CLI (pnpm seed:state seats-full | unassigned).
  // PRD-002's extended evaluator wires the routing.
  | { status: 'tenant_active_seats_full'; seatsTotal: number }
  | { status: 'tenant_active_user_unassigned' };

// ---------------------------------------------------------------------------
// PaymentProvider — type-only placeholder (ADR-0003 revised)
//
// PRD-000 ships the contract; PRD-001 ships Stripe direct as the first
// implementation — Stripe Billing + Entitlements API + Customer Portal.
// Surface mirrors the Stripe wiring shape from
// storage/paywall-providers-research-2026-05-13.md § 8.
// NO implementation in PRD-000. No call sites. Declared for adopter
// forward-compat and to lock the method signatures before PRD-001.
// ---------------------------------------------------------------------------

export interface PaymentProvider {
  // v1 implementation: Stripe direct (PRD-001).
  // Surface mirrors the Stripe wiring shape from
  // storage/paywall-providers-research-2026-05-13.md § 8.
  generateCheckoutUrl(args: {
    tenantId: string;
    userEmail: string;
    priceId?: string;
    returnUrl?: string;
  }): Promise<string>;

  generatePortalUrl(args: {
    tenantId: string;
    returnUrl: string;
  }): Promise<string>;

  verifyWebhookSignature(
    rawBody: string,
    signature: string,
  ): Promise<boolean>;

  parseWebhookPayload(rawBody: string): Promise<{
    providerEventId: string;
    tenantId: string;
    kind:
      | 'subscription_created'
      | 'subscription_updated'
      | 'subscription_cancelled'
      | 'payment_failed'
      | 'payment_succeeded';
    payload: unknown;
  }>;
}
