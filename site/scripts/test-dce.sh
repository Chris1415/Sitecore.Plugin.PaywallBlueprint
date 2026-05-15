#!/usr/bin/env bash
set -euo pipefail

if [ ! -d .next ]; then
  echo "ERROR: .next/ not found. Run 'npm run build' first."
  exit 2
fi

# Grep only the production JS bundles — skip .next/dev/ (Turbopack dev cache),
# .next/cache/ (build cache), and *.map files (source maps intentionally preserve
# original source strings and are not shipped to end-users in production).
# The executable production JS lives in .next/static/ and .next/server/ as *.js files.
if grep -rq "NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID" .next/static/ .next/server/ --include="*.js" 2>/dev/null; then
  echo "FAIL: NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID literal found in production JS bundles — compile-time DCE did not fire."
  grep -rl "NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID" .next/static/ .next/server/ --include="*.js" 2>/dev/null | head -5
  exit 1
fi

echo "OK: NEXT_PUBLIC_PAYWALL_DEV_OVERRIDE_USER_ID literal not present in .next/static/ or .next/server/ *.js bundles (compile-time DCE confirmed)."
