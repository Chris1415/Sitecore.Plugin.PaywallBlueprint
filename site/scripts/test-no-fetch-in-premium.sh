#!/usr/bin/env bash
# test-no-fetch-in-premium.sh — T048 — PRD-002 Tranche D
#
# ADR-0018 static enforcement: premium card source files must NEVER contain
# fetch(, client.query(, or supabase. references.
#
# Two layers per AC4.7:
#   1. This static grep (catches dead-code fetch leaks)
#   2. premium-no-fetch.test.tsx Vitest spec (catches runtime call paths)
#
# Run from products/paywall-blueprint/site/:
#   npm run test:no-fetch-in-premium
#
# Exit codes:
#   0 — no forbidden patterns found
#   1 — at least one forbidden pattern found (prints file:line)

set -e

# Resolve to repo root for consistent paths when run from any directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Premium card source files to scan (activity-chart-recharts.tsx is the lazy chunk)
FILES=(
  "${SITE_DIR}/components/bento/activity-chart.tsx"
  "${SITE_DIR}/components/bento/activity-chart-recharts.tsx"
  "${SITE_DIR}/components/bento/content-distribution.tsx"
  "${SITE_DIR}/components/bento/recent-edits.tsx"
  "${SITE_DIR}/components/bento/cms-health.tsx"
  "${SITE_DIR}/components/bento/sitecore-content-insights.tsx"
  "${SITE_DIR}/components/bento/content-health-score.tsx"
)

# Forbidden patterns (regex)
PATTERNS=(
  'fetch('
  'client\.query('
  'supabase\.'
)

FOUND=0

for FILE in "${FILES[@]}"; do
  if [ ! -f "$FILE" ]; then
    echo "WARNING: file not found — ${FILE}" >&2
    continue
  fi

  for PATTERN in "${PATTERNS[@]}"; do
    # Use grep -n for line numbers; grep returns exit code 1 if no match
    if matches=$(grep -n "${PATTERN}" "$FILE" 2>/dev/null); then
      echo "FAIL: forbidden pattern '${PATTERN}' found in ${FILE}:"
      while IFS= read -r line; do
        echo "  ${line}"
      done <<< "$matches"
      FOUND=1
    fi
  done
done

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "test:no-fetch-in-premium FAILED — ADR-0018 violation detected."
  echo "Premium cards must make ZERO HTTP requests, SDK calls, or DB queries."
  exit 1
fi

echo "test:no-fetch-in-premium PASSED — no forbidden fetch patterns in premium cards."
exit 0
