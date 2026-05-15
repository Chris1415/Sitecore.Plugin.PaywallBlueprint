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
 * from NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 *
 * Supabase v2 renamed `ANON_KEY` to `PUBLISHABLE_KEY` and `SERVICE_ROLE_KEY`
 * to `SECRET_KEY`. We prefer the new names and fall back to the old for
 * backward compatibility — same JWT semantics either way.
 *
 * These env vars may be unset during development / CI; the singleton is only
 * called at runtime when the gate evaluates an entitlement.
 */
export function getDefaultStore(): SupabaseStore {
  if (_store) return _store;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, publishableKey);
  _store = new SupabaseStore(client);
  return _store;
}
