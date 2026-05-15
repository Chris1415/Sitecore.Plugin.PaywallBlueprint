/**
 * seed-state.ts — Paywall Blueprint state-switcher CLI (T021)
 *
 * Usage:
 *   pnpm seed:state allowed  --tenant <marketplaceAppTenantId>
 *   pnpm seed:state no-sub   --tenant <marketplaceAppTenantId>
 *   pnpm seed:state seats-full  --tenant <marketplaceAppTenantId>   (design-reference; no DB op)
 *   pnpm seed:state unassigned  --tenant <marketplaceAppTenantId>   (design-reference; no DB op)
 *
 * Operator-architect decision: tenant identity comes from --tenant <id> CLI arg,
 * NOT from env vars. This keeps the CLI env-neutral (no OPERATOR_TENANT_ID required).
 *
 * Env vars consumed (from .env.local via dotenv):
 *   NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL
 *   SUPABASE_SECRET_KEY        — service-role key (preferred; bypasses RLS)
 *   SUPABASE_SERVICE_ROLE_KEY  — legacy name; used as fallback for back-compat
 *
 * ADR-0011: PRD-000 evaluator only routes to `allowed` | `tenant_no_subscription`.
 * `seats-full` and `unassigned` are design-reference states (direct-render only).
 */

import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { SupabaseStore } from '../src/lib/paywall/stores/SupabaseStore';

// ---------------------------------------------------------------------------
// Load .env.local (two levels up from site/scripts/)
// ---------------------------------------------------------------------------
loadDotenv({ path: resolve(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Arg parsing helpers
// ---------------------------------------------------------------------------
function parseArgs(argv: string[]): { state: string | undefined; tenantId: string | undefined } {
  // argv[0] = node, argv[1] = script path, argv[2] = state, then optional --tenant <id>
  const state = argv[2];
  const tenantIdx = argv.indexOf('--tenant');
  const tenantId = tenantIdx !== -1 ? argv[tenantIdx + 1] : undefined;
  return { state, tenantId };
}

function printUsage(): void {
  console.error(`
Usage:
  pnpm seed:state <state> --tenant <marketplaceAppTenantId>

States:
  allowed      → upsert tenant row with status='active' (evaluator-reachable)
  no-sub       → delete tenant row (evaluator resolves tenant_no_subscription)
  seats-full   → design-reference message (no DB op; ADR-0011)
  unassigned   → design-reference message (no DB op; ADR-0011)

Example:
  pnpm seed:state allowed --tenant 391dd026-9a1b-476b-3e30-08de9599d900
`);
}

// ---------------------------------------------------------------------------
// Core seedState — exported so seed-state.test.ts can import it directly
// ---------------------------------------------------------------------------
export async function seedState(
  state: string,
  tenantId: string,
): Promise<void> {
  // Design-reference states — no DB operation per ADR-0011
  if (state === 'seats-full') {
    console.log(
      '⚠ seats-full is a design-reference state per ADR-0011 — not reachable from the PRD-000 evaluator. ' +
        'Render via /full-page?previewState=seats-full in the iframe (or visit it directly).',
    );
    return;
  }

  if (state === 'unassigned') {
    console.log(
      '⚠ unassigned is a design-reference state per ADR-0011 — not reachable from the PRD-000 evaluator. ' +
        'Render via /full-page?previewState=unassigned in the iframe (or visit it directly).',
    );
    return;
  }

  // Evaluator-reachable states — require Supabase service-role access
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY ' +
        '(or SUPABASE_SERVICE_ROLE_KEY) must be set in .env.local',
    );
  }

  // Use service-role key — bypasses RLS for write operations
  const client = createClient(url, secretKey);
  const store = new SupabaseStore(client);

  if (state === 'allowed') {
    await store.clearState(tenantId);
    await store.seedTenant({
      tenantId,
      plan: 'starter',
      seatsTotal: 1,
      status: 'active',
    });
    console.log(`✓ State applied: allowed (tenant_id=${tenantId}, status=active)`);
    return;
  }

  if (state === 'no-sub') {
    await store.clearState(tenantId);
    console.log(`✓ State applied: no-sub (tenant_id=${tenantId} row deleted — evaluator returns tenant_no_subscription)`);
    return;
  }

  throw new Error(
    `Unknown state "${state}". Valid states: allowed | no-sub | seats-full | unassigned`,
  );
}

// ---------------------------------------------------------------------------
// CLI entry point (only runs when file is executed directly)
// ---------------------------------------------------------------------------
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('seed-state.ts') || process.argv[1].endsWith('seed-state.js'));

if (isMain) {
  const { state, tenantId } = parseArgs(process.argv);

  if (!state) {
    console.error('Error: <state> argument is required.');
    printUsage();
    process.exit(1);
  }

  if (!tenantId) {
    console.error('Error: --tenant <marketplaceAppTenantId> is required.');
    printUsage();
    process.exit(1);
  }

  seedState(state, tenantId)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
