import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIRROR, EXCLUDED, syncMirror } from './build-livespec.mjs';

// Test Plan for scripts/build-livespec.mjs
// Mirrors src/ -> live-spec/ for byte-identical assets; --check mode for CI (#78).
//   [x] MIRROR and EXCLUDED are disjoint (a file is either mirrored or parked, never both)
//   [x] MIRROR is non-empty and alphabetized (stable diffs, no dupes)
//   [x] the still-drifted file (#109: editorial.css) stays OUT of the mirror set
//   [x] reconciled files (tokens.json, v0.10.2-v0.12.0 wave) and new shared assets
//       (artificer-tabs.js, v0.11.0) are IN the mirror set
//   [x] syncMirror({check:true}) reports zero drift against the committed tree (live parity)

test('MIRROR and EXCLUDED are disjoint', () => {
  const overlap = MIRROR.filter((f) => EXCLUDED.includes(f));
  assert.deepEqual(overlap, [], `a file cannot be both mirrored and excluded: ${overlap}`);
});

test('MIRROR is non-empty, unique, and alphabetized', () => {
  assert.ok(MIRROR.length > 0);
  assert.equal(new Set(MIRROR).size, MIRROR.length, 'no duplicate entries');
  assert.deepEqual(MIRROR, [...MIRROR].sort(), 'keep MIRROR alphabetized');
});

test('editorial.css remains excluded until #109 reconciles it', () => {
  assert.ok(EXCLUDED.includes('artificer-editorial.css'));
});

test('reconciled and new shared assets are mirror-protected', () => {
  // tokens.json was reconciled by the v0.10.2–v0.12.0 merge wave (both sides
  // resynced it; the merge kept them byte-identical) — it graduates to MIRROR.
  assert.ok(MIRROR.includes('tokens.json'));
  // artificer-tabs.js shipped in v0.11.0 (#92), after the MIRROR list was authored.
  assert.ok(MIRROR.includes('artificer-tabs.js'));
});

test('syncMirror(--check) finds zero drift in the committed tree', () => {
  // The locked set must be byte-identical at rest; this is the same invariant
  // CI enforces via `npm run check:livespec`.
  assert.deepEqual(syncMirror({ check: true }), []);
});
