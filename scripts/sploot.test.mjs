import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test Plan for src/artificer-sploot.js — Sploot, the brand critter, drawn as
// quadrant block glyphs. The pixel grids are the one source for every
// rendering (web text, SVG rects, favicon), so their shape is contract; the
// DOM glue (build/hydrate/observe) is thin and verified in live-spec/sploot.html.
// The module attaches its API to globalThis (=== window in a browser), so this
// test imports it for side-effect and exercises the REAL functions.
//
//   [x] export contract: the pure pieces stay exported
//   [x] every grid is only '#'/'.', has an even row count, one width per pose
//   [x] full-size poses share one 30×8 frame (poses swap without layout shift)
//   [x] toGlyphs maps all 16 quadrant patterns
//   [x] toGlyphs(stand) is the canonical sprite, byte for byte
//   [x] a blank glyph row survives as one space (keeps its line box)
//   [x] markup(): role/label by default, aria-hidden when decorative, helmet
//       and pose overlays present, unknown pose falls back to stand, label escaped
//   [x] season(): meteorological month boundaries

import '../src/artificer-sploot.js';
const S = globalThis.ArtificerSploot;

test('export contract: POSES, SCARF, toGlyphs, markup, season are exported', () => {
  for (const key of ['toGlyphs', 'markup', 'build', 'hydrate', 'observe', 'season']) {
    assert.equal(typeof S[key], 'function', key);
  }
  assert.ok(S.POSES && S.SCARF);
});

test('every grid is well-formed: only # and ., even rows, one width', () => {
  for (const [name, grid] of Object.entries({ ...S.POSES, scarf: S.SCARF })) {
    assert.equal(grid.length % 2, 0, `${name}: odd row count`);
    const widths = new Set(grid.map((row) => row.length));
    assert.equal(widths.size, 1, `${name}: ragged rows`);
    assert.equal([...widths][0] % 2, 0, `${name}: odd width`);
    for (const row of grid) assert.match(row, /^[#.]+$/, `${name}: stray character`);
  }
});

test('full-size poses and the scarf share one 30×8 frame', () => {
  for (const name of ['stand', 'droopy', 'sleep', 'sniff']) {
    assert.equal(S.POSES[name].length, 8, name);
    assert.equal(S.POSES[name][0].length, 30, name);
  }
  assert.equal(S.SCARF.length, 8);
  assert.equal(S.SCARF[0].length, 30);
});

test('toGlyphs maps all 16 quadrant patterns', () => {
  const want = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█';
  for (let i = 0; i < 16; i++) {
    const top = (i & 1 ? '#' : '.') + (i & 2 ? '#' : '.');
    const bottom = (i & 4 ? '#' : '.') + (i & 8 ? '#' : '.');
    const [row] = S.toGlyphs([`${top}#.`, `${bottom}..`]);
    assert.equal(row[0], want[i], `pattern ${i}`);
  }
});

test('toGlyphs(stand) is the canonical sprite', () => {
  assert.deepEqual(S.toGlyphs(S.POSES.stand), [
    '         ▗▙▗▙',
    '▗▄▄▄▄▄▄▄▄▟▛██▄',
    '█████████████▀▀',
    '▝▜▛▜▛▀▀▀▀▜▛▜▖',
  ]);
});

test('a blank glyph row survives as one space', () => {
  assert.deepEqual(S.toGlyphs(['....', '....', '##..', '##..']), [' ', '█']);
});

test('markup(): accessible name by default, aria-hidden when decorative', () => {
  const plain = S.markup('sleep');
  assert.match(plain, /^<span class="sploot" role="img" aria-label="Sploot the corgi, asleep, drawn in block characters">/);
  assert.match(plain, /sploot__zzz/);
  const deco = S.markup('stand', { decorative: true });
  assert.match(deco, /aria-hidden="true"/);
  assert.doesNotMatch(deco, /role="img"/);
  assert.match(deco, /sploot__scarf/);
});

test('markup(): helmet layer, sizes, unknown pose, escaped label', () => {
  assert.match(S.markup('stand', { helmet: true }), /sploot__helmet[^>]*>[^<]*╭──────╮/);
  assert.match(S.markup('mini'), /class="sploot sploot--mini"/);
  assert.match(S.markup('stand', { size: 'lg' }), /class="sploot sploot--lg"/);
  const original = console.warn;
  console.warn = () => {};
  try {
    assert.equal(S.markup('backflip'), S.markup('stand'));
  } finally {
    console.warn = original;
  }
  assert.match(S.markup('stand', { label: 'a "good" <dog>' }), /aria-label="a &quot;good&quot; &lt;dog&gt;"/);
});

test('season(): meteorological month boundaries', () => {
  const at = (m) => S.season(new Date(2026, m, 15));
  assert.deepEqual([0, 1, 2, 4, 5, 7, 8, 10, 11].map(at), [
    'winter', 'winter', 'spring', 'spring', 'summer', 'summer', 'autumn', 'autumn', 'winter',
  ]);
});
