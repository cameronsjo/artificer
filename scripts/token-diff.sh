#!/usr/bin/env bash
# Extract --token: value lines from a CSS block delimited by line numbers,
# normalize whitespace and trailing comments, emit "token<TAB>value" pairs.
set -euo pipefail

usage() { echo "usage: $0 <file> <start_line> <end_line>" >&2; exit 1; }
[[ $# -eq 3 ]] || usage

file=$1 start=$2 end=$3

# sed -n: print only between the line range
# Then keep lines that start with optional whitespace then `--`
# Strip leading whitespace, trailing /* ... */ comment, trailing semicolon, trailing space
sed -n "${start},${end}p" "$file" \
  | grep -E '^[[:space:]]*--[a-zA-Z0-9_-]+:' \
  | sed -E 's|/\*.*\*/||' \
  | sed -E 's/^[[:space:]]+//; s/;[[:space:]]*$//; s/[[:space:]]+$//' \
  | awk -F': *' '{ gsub(/[[:space:]]+$/, "", $2); printf "%s\t%s\n", $1, $2 }' \
  | sort
