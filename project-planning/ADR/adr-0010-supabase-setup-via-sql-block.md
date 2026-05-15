# ADR-0010: Supabase setup via copy-pasteable SQL block in `supabase/schema.sql`, not CLI automation

## Status

Accepted

## Context

PRD-000 Open Question OQ-Arch-5 asks how adopters set up their Supabase project for the blueprint. Three approaches considered:

- **(a) Copy-pasteable SQL migration block.** Adopters run the SQL by hand in the Supabase dashboard's SQL editor (or via their preferred client). One file, no tooling dependencies.
- **(b) `supabase init` automation.** Use Supabase's official CLI to scaffold a local project + apply migrations programmatically. Familiar to Supabase-native adopters; adds CLI dependency.
- **(c) `pnpm setup:supabase` wizard.** A custom Node.js script that prompts for project URL + service-role key and applies the schema via the Supabase JS SDK. Lowest adopter friction; highest blueprint-side maintenance cost.

The G3 cold-read goal (a hypothetical adopter understands and adapts in ~1 hour) prioritizes **fewer steps to first run** over **more sophisticated tooling**. Option (b)'s CLI dependency adds an install step (`npm install -g supabase` or via brew) and a learning step (CLI commands) that the blueprint does not otherwise teach. Option (c) buries the schema in code, making it harder for adopters to *understand* what the blueprint is doing — and any change to the schema requires updating both the SQL file and the wizard's expectations.

Option (a) — a single `supabase/schema.sql` file that adopters copy into the Supabase dashboard's SQL editor — has the smallest cognitive surface: the README's Quickstart says "create a Supabase project, paste this file into the SQL editor, run it, paste these env vars into `.env.local`." Four steps, no new tools to learn.

## Decision

The blueprint ships `supabase/schema.sql` containing the full schema (per PRD-000 § 10 + ADR-0009 RLS policies). README Quickstart procedure:

1. Create a free Supabase project at supabase.com.
2. From the project dashboard, capture: Project URL, anon (public) key, service-role key.
3. Open SQL Editor in the dashboard. Paste the contents of `supabase/schema.sql`. Run.
4. Copy `.env.example` to `.env.local` in the cloned blueprint repo. Fill in the three values from step 2.

No `supabase` CLI required. No automation script required. No tooling beyond what adopters already have (a browser + a code editor).

The `supabase/schema.sql` file MUST include a header comment naming the blueprint version and the ADR references (0007 / 0008 / 0009 / 0010) so adopters who diff against a future version can understand intent.

## Consequences

**Easier:**

- Adopters with zero Supabase CLI experience can complete the setup. Cold-read goal (G3) is realistic.
- Schema changes between PRD versions are visible in git diffs of a single file. Adopters re-running the SQL after an upgrade see exactly what changed.
- No automation surface to maintain (no `pnpm setup:supabase` script, no CLI wrapper).
- Adopters who *do* use the Supabase CLI can still import `supabase/schema.sql` as a migration — the file is plain SQL, compatible with any tooling.

**Harder:**

- Adopters who add to the schema (PRD-001 onward, when new tables for trial-mode tracking might land) must remember to update the file rather than letting a CLI handle migrations. Mitigation: PRD-001 adds a `supabase/migrations/0002-*.sql` numbered-file convention if it's needed; PRD-000's single file is the baseline.
- Manual SQL execution doesn't track migration state — adopters who re-run the file get errors on `CREATE TABLE` collisions. Mitigation: the file uses `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS` patterns so re-runs are idempotent.
- The blueprint sacrifices "scaffold-style installer" polish for legibility. Reasonable trade for a PRD-000 reference; revisit if real adopter friction emerges.

## Date

2026-05-13
