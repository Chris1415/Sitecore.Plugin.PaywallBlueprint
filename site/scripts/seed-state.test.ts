/**
 * seed-state.test.ts — T022: Integration tests for the state-switcher CLI.
 *
 * These tests call the REAL Supabase project via the service-role key.
 * They are SKIPPED when NEXT_PUBLIC_SUPABASE_URL is absent (CI without secrets).
 *
 * Run locally with .env.local present:
 *   npm run test
 *
 * Design decisions:
 * - Uses describe.skipIf to conditionally skip the entire suite.
 * - Imports seedState() directly (extracted from seed-state.ts) to avoid
 *   spawning a child process in tests.
 * - Each test provides a unique synthetic tenantId to avoid cross-test
 *   interference (no shared state).
 * - clearState() is called in afterEach for cleanup.
 *
 * ADR-0011: seats-full and unassigned are design-reference states — they print
 * a message and do NOT touch the DB. Tests assert that behaviour.
 */

import { resolve } from 'path';
import { config as loadDotenv } from 'dotenv';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { seedState } from './seed-state';
import { SupabaseStore } from '../src/lib/paywall/stores/SupabaseStore';

// Load .env.local from site/ root (cwd when vitest runs from site/)
loadDotenv({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Unique synthetic tenant IDs — not real Cloud Portal IDs; safe to write/delete
const TEST_TENANT_ALLOWED = 'test-seed-state-allowed-00000001';
const TEST_TENANT_NO_SUB = 'test-seed-state-nosub-00000002';
const TEST_TENANT_SEATS_FULL = 'test-seed-state-seatsfull-00000003';
const TEST_TENANT_UNASSIGNED = 'test-seed-state-unassigned-00000004';

describe.skipIf(!supabaseUrl || !secretKey)(
  'seed-state integration (requires .env.local)',
  () => {
    // Direct Supabase client for assertions — service role to bypass RLS
    const client = createClient(supabaseUrl!, secretKey!);
    const store = new SupabaseStore(client);

    afterEach(async () => {
      // Best-effort cleanup — ignore errors if rows were already deleted
      await Promise.allSettled([
        store.clearState(TEST_TENANT_ALLOWED),
        store.clearState(TEST_TENANT_NO_SUB),
        store.clearState(TEST_TENANT_SEATS_FULL),
        store.clearState(TEST_TENANT_UNASSIGNED),
      ]);
    });

    // -----------------------------------------------------------------------
    // allowed — upserts a row with status='active'
    // -----------------------------------------------------------------------
    it('allowed: upserts tenant row with status=active', async () => {
      await seedState('allowed', TEST_TENANT_ALLOWED);

      const { data: row, error } = await client
        .from('tenants')
        .select('*')
        .eq('tenant_id', TEST_TENANT_ALLOWED)
        .maybeSingle();

      expect(error).toBeNull();
      expect(row).not.toBeNull();
      expect(row!.tenant_id).toBe(TEST_TENANT_ALLOWED);
      expect(row!.status).toBe('active');
      expect(row!.plan).toBe('starter');
      expect(row!.seats_total).toBe(1);
    });

    // -----------------------------------------------------------------------
    // no-sub — deletes the row (evaluator returns tenant_no_subscription)
    // -----------------------------------------------------------------------
    it('no-sub: deletes tenant row so evaluator returns tenant_no_subscription', async () => {
      // First seed an active row so we have something to delete
      await seedState('allowed', TEST_TENANT_NO_SUB);

      // Now flip to no-sub
      await seedState('no-sub', TEST_TENANT_NO_SUB);

      const { data: row, error } = await client
        .from('tenants')
        .select('*')
        .eq('tenant_id', TEST_TENANT_NO_SUB)
        .maybeSingle();

      expect(error).toBeNull();
      expect(row).toBeNull(); // Row deleted → evaluator returns tenant_no_subscription
    });

    // -----------------------------------------------------------------------
    // seats-full — design-reference: prints message, does NOT touch DB
    // -----------------------------------------------------------------------
    it('seats-full: prints design-reference message and does NOT write to DB', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await seedState('seats-full', TEST_TENANT_SEATS_FULL);

      // Should have printed the design-reference warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('seats-full is a design-reference state per ADR-0011'),
      );

      // Must NOT have written any DB row
      const { data: row } = await client
        .from('tenants')
        .select('*')
        .eq('tenant_id', TEST_TENANT_SEATS_FULL)
        .maybeSingle();

      expect(row).toBeNull();

      consoleSpy.mockRestore();
    });

    // -----------------------------------------------------------------------
    // unassigned — design-reference: prints message, does NOT touch DB
    // -----------------------------------------------------------------------
    it('unassigned: prints design-reference message and does NOT write to DB', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await seedState('unassigned', TEST_TENANT_UNASSIGNED);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('unassigned is a design-reference state per ADR-0011'),
      );

      const { data: row } = await client
        .from('tenants')
        .select('*')
        .eq('tenant_id', TEST_TENANT_UNASSIGNED)
        .maybeSingle();

      expect(row).toBeNull();

      consoleSpy.mockRestore();
    });
  },
);
