/**
 * POST /api/portal — T017 (PRD-003 stub)
 *
 * Customer Portal lands in PRD-003.
 * ADR-0003: PaymentProvider.generatePortalUrl deferred to PRD-003.
 *
 * Returns 501 until PRD-003 wires the real Stripe Billing Portal.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request): Promise<Response> {
  return Response.json(
    { error: 'Customer Portal lands in PRD-003. See README.' },
    { status: 501 },
  );
}
