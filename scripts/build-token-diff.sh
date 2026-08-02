#!/usr/bin/env bash
# Compose a markdown diff sheet from four TSV files of "token<TAB>value".
# Usage: build-token-diff.sh <hist-dark> <curr-dark> <hist-light> <curr-light> <output.md>
set -euo pipefail

hd=$1 cd=$2 hl=$3 cl=$4 out=$5

for f in "$hd" "$cd" "$hl" "$cl"; do
  if [[ ! -f "$f" ]]; then
    echo "error: input TSV not found: $f" >&2
    exit 1
  fi
done

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
  echo "# Token diff — historical vs current"
  echo ""
  echo "Generated: $(date '+%Y-%m-%d %H:%M %Z')"
  echo ""
  echo "**Source files (token<TAB>value TSVs):**"
  echo "- Historical dark: \`$hd\` ($(wc -l < "$hd" | tr -d ' ') tokens) · light: \`$hl\` ($(wc -l < "$hl" | tr -d ' ') tokens)"
  echo "- Current dark: \`$cd\` ($(wc -l < "$cd" | tr -d ' ') tokens) · light: \`$cl\` ($(wc -l < "$cl" | tr -d ' ') tokens)"
  echo ""
  echo "**Scope:** \`.theme-dark\` and \`.theme-light\` token blocks only."
  echo ""
  emit_section "Dark mode" "$hd" "$cd"
  emit_section "Light mode" "$hl" "$cl"
} > "$out"

echo "Wrote: $out"
wc -l "$out"
