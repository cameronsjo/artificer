#!/usr/bin/env node
// live-spec mirror sync (#78). `src/` is canonical; the gallery in `live-spec/`
// renders against verbatim copies of the shipped assets. Nothing else keeps the
// two in parity — before this, byte-for-byte match was held by manual discipline
// alone, and two files had already drifted (tracked in #109, deliberately
// EXCLUDED below until reconciled). The CSS-build research that surfaced this:
// docs/research/css-build-systems.md.
//
// Usage:
//   node scripts/build-livespec.mjs           copy src/ -> live-spec/ for the MIRROR set
//   node scripts/build-livespec.mjs --check    verify only; exit 1 on any drift (CI)
//
// MIRROR is the set of files that are byte-identical between src/ and live-spec/.
// Add a file here only once its two copies already match (run without --check to
// make them match, then commit both). EXCLUDED files have drifted and need a
// one-time reconciliation decision first (#109) — tokens.json carries palette
// values, so that half is Lane 1.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);

// Copied verbatim src/ -> live-spec/. Keep alphabetized.
export const MIRROR = [
  'artificer-focus.js',
  'artificer-icons.js',
  'artificer-options.js',
  'artificer-tabs.js',
  'artificer-texture.css',
  'artificer-theme.js',
  'artificer-tree.js',
  'artificer-whimsy.css',
  'artificer-whimsy.js',
  'artificer.css',
  'print.css',
  'tokens.json',
];

// Known-drifted, deliberately NOT mirrored yet — reconcile in #109, then move
// each into MIRROR above. (tokens.json graduated to MIRROR when the v0.10.2-v0.12.0
// merge wave reconciled it; editorial.css is the remaining #109 work.)
export const EXCLUDED = ['artificer-editorial.css'];

// Returns the names whose live-spec copy differs from src. In write mode
// (check=false) it also overwrites the live-spec copy from src.
export function syncMirror({ check } = {}) {
  const drift = [];
  for (const name of MIRROR) {
    const src = readFileSync(new URL(`src/${name}`, ROOT), 'utf8');
    let dst = null;
    try {
      dst = readFileSync(new URL(`live-spec/${name}`, ROOT), 'utf8');
    } catch {
      dst = null; // missing live-spec copy counts as drift
    }
    if (dst !== src) {
      drift.push(name);
      if (!check) writeFileSync(new URL(`live-spec/${name}`, ROOT), src);
    }
  }
  return drift;
}

function run({ check }) {
  const drift = syncMirror({ check });

  if (check) {
    if (drift.length === 0) {
      console.log(`✓ live-spec mirror: ${MIRROR.length} files match src/`);
      return 0;
    }
    console.error('✖ live-spec out of sync with src/ — run `npm run build:livespec`:');
    for (const f of drift) console.error(`    drift: live-spec/${f} ≠ src/${f}`);
    return 1;
  }

  if (drift.length) {
    console.log(`✓ synced ${drift.length} file(s) src/ -> live-spec/:`);
    for (const f of drift) console.log(`    ${f}`);
  } else {
    console.log(`✓ live-spec mirror: already in sync (${MIRROR.length} files)`);
  }
  console.log(`  excluded (drifted — reconcile in #109): ${EXCLUDED.join(', ')}`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(run({ check: process.argv.includes('--check') }));
}
