#!/usr/bin/env bash
# Extract the set of top-level CSS selectors and @settings IDs from a theme file,
# then diff two files to find what's unique to each.
set -euo pipefail

a=$1 b=$2

# CSS selectors: lines that end with `{` and don't start with whitespace
# (top-level rule openers). Strip the trailing `{` and whitespace.
extract_selectors() {
  local f=$1
  grep -nE '^[^[:space:]/].*\{[[:space:]]*$' "$f" \
    | sed -E 's/[[:space:]]*\{[[:space:]]*$//' \
    | awk -F: '{ for(i=2;i<=NF;i++) printf "%s%s", $i, (i<NF?":":""); print "" }' \
    | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' \
    | sort -u
}

# @settings IDs (Style Settings)
extract_setting_ids() {
  local f=$1
  grep -E '^\s*id:\s*' "$f" \
    | sed -E 's/^\s*id:\s*//' \
    | sort -u
}

echo "===== Top-level CSS selectors only in A ($a) ====="
comm -23 <(extract_selectors "$a") <(extract_selectors "$b")
echo ""
echo "===== Top-level CSS selectors only in B ($b) ====="
comm -13 <(extract_selectors "$a") <(extract_selectors "$b")
echo ""
echo "===== Style Settings IDs only in A ====="
comm -23 <(extract_setting_ids "$a") <(extract_setting_ids "$b")
echo ""
echo "===== Style Settings IDs only in B ====="
comm -13 <(extract_setting_ids "$a") <(extract_setting_ids "$b")
