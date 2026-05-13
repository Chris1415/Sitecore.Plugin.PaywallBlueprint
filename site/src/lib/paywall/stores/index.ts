/**
 * stores/index.ts — public re-export + singleton factory
 *
 * getDefaultStore() lazily constructs a SupabaseStore from env vars.
 * Tests do NOT call this function — they construct SupabaseStore directly
 * with a stubbed client. The singleton is what <PaywallGate> consumes by default.
 */

import { createClient } from '@supabase/supabase-js';
import { SupabaseStore } from './SupabaseStore';

export { SupabaseStore };

let _store: SupabaseStore | null = null;

/**
 * Returns the module-level singleton SupabaseStore, lazily constructing it
 * from NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY on first call.
 *
 * These env vars may be unset during development / CI (T015 is an operator action);
 * the singleton is only called at runtime when the gate evaluates an entitlement.
 */
export function getDefaultStore(): SupabaseStore {
  if (_store) return _store;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  _store = new SupabaseStore(client);
  return _store;
}
