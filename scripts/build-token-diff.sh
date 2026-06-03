#!/usr/bin/env bash
# Compose a markdown diff sheet from four TSV files of "token<TAB>value".
# Usage: build-token-diff.sh <hist-dark> <curr-dark> <hist-light> <curr-light> <output.md>
set -euo pipefail

hd=$1 cd=$2 hl=$3 cl=$4 out=$5

emit_section() {
  local title=$1 hist=$2 curr=$3

  echo ""
  echo "## $title"
  echo ""

  # Removed: in hist, not in curr (by token name)
  echo "### Removed (in historical, missing in current)"
  echo ""
  echo "| Token | Historical value |"
  echo "|---|---|"
  comm -23 <(cut -f1 "$hist" | sort -u) <(cut -f1 "$curr" | sort -u) \
    | while read -r tok; do
        val=$(awk -F'\t' -v t="$tok" '$1==t{print $2; exit}' "$hist")
        echo "| \`$tok\` | \`$val\` |"
      done
  echo ""

  # Added: in curr, not in hist
  echo "### Added (new in current, absent in historical)"
  echo ""
  echo "| Token | Current value |"
  echo "|---|---|"
  comm -13 <(cut -f1 "$hist" | sort -u) <(cut -f1 "$curr" | sort -u) \
    | while read -r tok; do
        val=$(awk -F'\t' -v t="$tok" '$1==t{print $2; exit}' "$curr")
        echo "| \`$tok\` | \`$val\` |"
      done
  echo ""

  # Changed: token in both, value differs
  echo "### Changed (token in both, value differs)"
  echo ""
  echo "| Token | Historical | Current |"
  echo "|---|---|---|"
  comm -12 <(cut -f1 "$hist" | sort -u) <(cut -f1 "$curr" | sort -u) \
    | while read -r tok; do
        hv=$(awk -F'\t' -v t="$tok" '$1==t{print $2; exit}' "$hist")
        cv=$(awk -F'\t' -v t="$tok" '$1==t{print $2; exit}' "$curr")
        if [[ "$hv" != "$cv" ]]; then
          echo "| \`$tok\` | \`$hv\` | \`$cv\` |"
        fi
      done
  echo ""
}

{
  echo "# Token diff — historical (v0.1) vs current (v0.6.0 + Lane 3 patches)"
  echo ""
  echo "Generated: $(date '+%Y-%m-%d %H:%M %Z')"
  echo ""
  echo "**Source files:**"
  echo "- Historical: \`HISTORICAL\` from main branch (v0.1, 2259 lines)"
  echo "- Current: \`themes/obsidian/Artificer/theme.css\` (v0.6.0 + Lane 3 patches, 1947 lines)"
  echo ""
  echo "**Scope:** \`.theme-dark\` and \`.theme-light\` token blocks only."
  echo ""
  emit_section "Dark mode" "$hd" "$cd"
  emit_section "Light mode" "$hl" "$cl"
} > "$out"

echo "Wrote: $out"
wc -l "$out"
