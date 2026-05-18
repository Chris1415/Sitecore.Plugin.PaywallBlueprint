#!/usr/bin/env bash
# test-no-hex-in-bento.sh
#
# T006 — Enforces the "no hex color literals" rule (NFR-9) for bento components
# and the ThemeToggle component.
#
# Scans:
#   site/components/bento/**/*.{ts,tsx,css}   (bento cards + grid)
#   site/components/theme-toggle.tsx           (ThemeToggle — ADR-0016)
#
# Exits 1 if any file contains a hex color literal (#[0-9a-fA-F]{3,8}).
# Exits 0 if no matches (all colors use hsl(var(--…)) or currentColor).
#
# Usage: bash scripts/test-no-hex-in-bento.sh
#        OR npm run test:no-hex-in-bento

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(dirname "$SCRIPT_DIR")"

BENTO_DIR="$SITE_DIR/components/bento"
THEME_TOGGLE="$SITE_DIR/components/theme-toggle.tsx"

# Hex regex: the literal # followed by 3–8 hex characters (case-insensitive).
# We use word-boundary-style matching by requiring the # to NOT be preceded by
# an alphanumeric or underscore (avoids matching #id-selectors-as-identifiers
# that start with # but are CSS id selectors, and excludes MD5/SHA hashes in comments).
# The pattern is intentionally simple: ANY '#' followed by 3–8 hex digits is flagged.
HEX_PATTERN='#[0-9a-fA-F]{3,8}'

found_matches=0

# Build the list of files to scan
files_to_scan=()

# Scan bento directory if it exists (may be empty at Tranche A)
if [ -d "$BENTO_DIR" ]; then
  while IFS= read -r -d '' f; do
    files_to_scan+=("$f")
  done < <(find "$BENTO_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) -print0 2>/dev/null)
fi

# Always scan theme-toggle.tsx if it exists
if [ -f "$THEME_TOGGLE" ]; then
  files_to_scan+=("$THEME_TOGGLE")
fi

# If no files to scan, exit 0 cleanly
if [ ${#files_to_scan[@]} -eq 0 ]; then
  echo "test:no-hex-in-bento: no files to scan — OK (bento/ empty + theme-toggle.tsx absent)"
  exit 0
fi

# Scan each file
for f in "${files_to_scan[@]}"; do
  if grep -nE "$HEX_PATTERN" "$f"; then
    echo "ERROR: hex color literal found in $f (above)"
    found_matches=1
  fi
done

if [ "$found_matches" -eq 1 ]; then
  echo ""
  echo "FAIL: test:no-hex-in-bento — hex color literals detected. Replace with hsl(var(--…)) or currentColor."
  exit 1
fi

echo "test:no-hex-in-bento: OK — no hex literals found in bento components or theme-toggle"
exit 0
