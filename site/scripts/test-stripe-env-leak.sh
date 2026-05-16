#!/bin/bash
# T027 — Build-time grep test for server-only Stripe env-var name leakage
#
# NFR-6 + R6: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SIGNING_SECRET must NEVER
# appear in the client bundle (.next/static/**/*.js).
#
# How it works: grep for the VARIABLE NAME literals (not values).
# Real protection: Next.js only inlines NEXT_PUBLIC_* vars into client bundles.
# This script is defense-in-depth — if someone accidentally references
# process.env.STRIPE_SECRET_KEY from a 'use client' component, Next.js would
# inline the name (and potentially the value) into the static bundle.
#
# This script is run from site/ directory.

set -e

echo "Running npm run build to produce .next/static/ ..."
npm run build > /dev/null

echo "Checking .next/static/ for server-only Stripe env-var name literals..."
if grep -rE 'STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SIGNING_SECRET' .next/static/ 2>/dev/null; then
  echo "FAIL: server-only Stripe env-var names found in client bundle"
  exit 1
fi

echo "PASS: no server-only Stripe secrets in client bundle"
