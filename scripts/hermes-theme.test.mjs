import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { contrast } from './contrast.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const theme = JSON.parse(read('themes/hermes/artificer-dark.yaml'));
const P = JSON.parse(read('themes/_palette.json')).dark;

test('Hermes emitted YAML contains only canonical colors and no external assets', () => {
  const paletteColors = new Set(Object.values(P));
  for (const hex of JSON.stringify(theme).match(/#[\da-f]{6}/gi)) {
    assert.ok(paletteColors.has(hex), `off-palette color ${hex}`);
  }
  assert.equal(theme.name, 'artificer-dark');
  assert.equal(theme.palette.background.hex, P.bg);
  assert.equal(theme.palette.midground.hex, P.fg);
  assert.equal(theme.typography.baseSize, '100%', 'preserve browser text-size preference');
  assert.equal(theme.typography.fontUrl, undefined);
  assert.equal(theme.assets, undefined);
  assert.doesNotMatch(theme.customCSS, /url\(|@import|display:\s*none/);
});

test('Hermes foreground roles clear AA on the surfaces they paint', () => {
  const C = theme.colorOverrides;
  for (const bg of [P.bg, C.card]) {
    for (const fg of [P.fg, P.fgSecondary, P.ansiBrightBlack, C.success, C.warning, C.destructive]) {
      assert.ok(contrast(fg, bg) >= 4.5, `${fg} on ${bg}: ${contrast(fg, bg)}`);
    }
  }
  for (const [fg, bg] of [[C.primaryForeground, C.primary], [P.fg, P.selectionFill]]) {
    assert.ok(contrast(fg, bg) >= 4.5, `${fg} on ${bg}`);
  }
  assert.ok(contrast(P.steelBright, C.popover) >= 4.5, 'picker tertiary text on the overlay');
});

test('Hermes native CSS repairs the compiled utility bypass and keeps focus visible', () => {
  assert.ok(theme.customCSS.includes(`.bg-card { background-color: ${P.bgRaised}; }`));
  assert.ok(theme.customCSS.includes(`.text-success { color: ${P.ansiBrightGreen}; }`));
  assert.match(theme.customCSS, /:focus-visible\s*\{\s*outline: 2px solid/);
  assert.match(theme.customCSS, /font-variant-numeric: tabular-nums/);
});
