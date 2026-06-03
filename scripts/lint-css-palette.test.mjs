import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  lintCssPalette,
  paletteHexSet,
  ALLOWLIST,
} from './lint-css-palette.mjs';

// Test Plan for scripts/lint-css-palette.mjs
// Complements lint-css-tokens.mjs: that flags raw hex in component VALUES;
// this flags hex literals (incl. token DEFINITIONS) that drift from the palette.
//   [x] Happy: a hex that IS a palette value is not flagged
//   [x] Drift: a hex absent from palette + allowlist is flagged with its line
//   [x] Allowlist: a documented non-palette hex (#100 drift) is not flagged
//   [x] Comments: hexes inside /* */ (incl. the header history block) are ignored
//   [x] Happy: current src/artificer.css passes (only #5a3a9a/#e0b558 allowlisted)
//   [x] Allowlist content: the two #100 drift hexes are present

const palette = JSON.parse(
  readFileSync(new URL('../themes/_palette.json', import.meta.url), 'utf8'),
);
const hexes = paletteHexSet(palette);

test('a hex that is a palette value is not flagged', () => {
  const accent = palette.dark.accent; // a real palette hex
  const v = lintCssPalette(`:root { --accent: ${accent}; }`, hexes, new Set());
  assert.deepEqual(v, []);
});

test('a hex absent from palette and allowlist is flagged with its line', () => {
  const css = ':root {\n  --x: #123456;\n}';
  const v = lintCssPalette(css, hexes, new Set());
  assert.equal(v.length, 1);
  assert.equal(v[0].hex, '#123456');
  assert.equal(v[0].line, 2);
});

test('a documented non-palette hex (#100 drift) is not flagged when allowlisted', () => {
  const css = '  --brand-purple: #5a3a9a;';
  assert.deepEqual(lintCssPalette(css, hexes, new Set(['#5a3a9a'])), []);
});

test('hexes inside comments (incl. the header history block) are ignored', () => {
  const css = '/* navy #0d1b2a replaced by indigo; was olive #b7bd73 */\n.x { color: var(--fg); }';
  assert.deepEqual(lintCssPalette(css, hexes, new Set()), []);
});

test('case-insensitive: an uppercase form of a palette hex is not flagged', () => {
  const accentUpper = palette.dark.accent.toUpperCase();
  assert.deepEqual(lintCssPalette(`--a: ${accentUpper};`, hexes, ALLOWLIST), []);
});

test('current src/artificer.css passes (only the web brandPurple decorative hex is allowlisted)', () => {
  const css = readFileSync(new URL('../src/artificer.css', import.meta.url), 'utf8');
  const v = lintCssPalette(css, hexes, ALLOWLIST);
  assert.deepEqual(v, [], `expected zero drift, got ${JSON.stringify(v)}`);
});

test('the allowlist is exactly the web brandPurple decorative hex (#e0b558 homed in v0.10.2)', () => {
  assert.ok(ALLOWLIST.has('#5a3a9a'));
  assert.ok(!ALLOWLIST.has('#e0b558'));
  assert.equal(ALLOWLIST.size, 1);
});
