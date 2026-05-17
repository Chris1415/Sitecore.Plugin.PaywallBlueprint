/**
 * Supabase service-role client factory — shared by API routes
 *
 * Uses SUPABASE_SECRET_KEY (service-role key; bypasses RLS per ADR-0009 + NFR-7).
 * Server-only — never import from client components.
 *
 * source: PRD-000 SupabaseStore.ts construction pattern
 * source: @supabase/supabase-js createClient
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase service-role client that bypasses RLS.
 * Used by /api/entitlement and /api/webhooks/stripe.
 *
 * ADR-0009: service-role key bypasses RLS for server-side reads/writes.
 */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SECRET_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
