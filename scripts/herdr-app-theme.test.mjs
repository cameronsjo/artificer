// Shape gate on the emitted herdr-app themes — the zed-wezterm-theme.test.mjs
// precedent. check:themes only proves the committed files match a fresh
// regeneration. herdr-app (herdrdev/herdr-app 0.1.9, src/settings.rs) reads
// `ansi` by position and lets `colors` override any panel color by NAME, so a
// short row misaligns every color after the gap and a typo'd key is silently
// ignored. The key set below is HAND-PINNED against the app's own color names;
// a generator edit that changes it must change this file in the same commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrast } from './contrast.mjs';

const THEMES = join(new URL('../', import.meta.url).pathname, 'themes');
const HEX = /^#[0-9a-f]{6}$/;
const palette = JSON.parse(readFileSync(join(THEMES, '_palette.json'), 'utf8'));

// Names herdr-app 0.1.9's resolve() defines (unchanged since 0.1.6); anything else in `colors` does
// nothing. Re-pin against src/settings.rs when the app renames one.
const APP_COLORS = new Set([
  'background', 'terminal_foreground', 'foreground', 'surface', 'canvas', 'chrome', 'popover',
  'raised', 'hover', 'selected', 'border', 'input', 'muted', 'dim', 'accent', 'accent_foreground',
  'solid', 'solid_foreground', 'ring', 'selection', 'cursor', 'working', 'blocked', 'done', 'idle',
  'unknown', ...Array.from({ length: 16 }, (_, i) => `ansi${i}`),
]);

const EXPECT_COLORS = [
  'accent', 'accent_foreground', 'blocked', 'canvas', 'chrome', 'dim', 'done', 'foreground',
  'idle', 'muted', 'popover', 'raised', 'ring', 'solid', 'solid_foreground', 'surface',
  'unknown', 'working',
].sort();

const read = (mode) => JSON.parse(readFileSync(join(THEMES, 'herdr-app', `artificer-${mode}.json`), 'utf8'));

for (const mode of ['dark', 'light']) {
  test(`herdr-app ${mode}: top-level shape and 16 ANSI slots`, () => {
    const t = read(mode);
    assert.deepEqual(Object.keys(t).sort(), ['ansi', 'background', 'colors', 'cursor', 'foreground', 'selection']);
    for (const k of ['background', 'foreground', 'selection', 'cursor']) assert.match(t[k], HEX, k);
    assert.equal(t.ansi.length, 16);
    for (const c of t.ansi) assert.match(c, HEX);
  });

  test(`herdr-app ${mode}: every override names a color the app defines`, () => {
    const { colors } = read(mode);
    assert.deepEqual(Object.keys(colors).sort(), EXPECT_COLORS);
    for (const [k, v] of Object.entries(colors)) {
      assert.ok(APP_COLORS.has(k), `${k} is not a herdr-app color name`);
      assert.match(v, HEX, k);
    }
  });

  test(`herdr-app ${mode}: the terminal half matches the Ghostty theme`, () => {
    const t = read(mode);
    const ghostty = readFileSync(join(THEMES, 'ghostty', `artificer-${mode}`), 'utf8');
    const value = (key) => ghostty.match(new RegExp(`^${key} = ([0-9a-f]{6})$`, 'm'))?.[1];
    assert.equal(t.background, `#${value('background')}`);
    assert.equal(t.foreground, `#${value('foreground')}`);
    assert.equal(t.selection, `#${value('selection-background')}`);
    assert.equal(t.cursor, `#${value('cursor-color')}`);
    t.ansi.forEach((c, i) => {
      const slot = ghostty.match(new RegExp(`^palette = ${i}=([0-9a-f]{6})$`, 'm'))?.[1];
      assert.equal(c, `#${slot}`, `ansi ${i}`);
    });
    assert.equal(t.background, palette[mode].terminalBg.toLowerCase());
  });
}

// ── Surfaces and depth ──────────────────────────────────────────────────
// The panel half's surfaces, dim text and quiet dots, pinned as literal hexes
// so a palette or generator change that moves one shows up here by name. The
// depth model and the dim floor are explained in herdrAppTheme() in
// themes/build.mjs.
const PINNED = {
  dark: {
    chrome: '#1d1f21', canvas: '#292c33', surface: '#313540', raised: '#3c4150',
    popover: '#3c4150', dim: '#9aa2b3', idle: '#9aa2b3', unknown: '#9aa2b3',
  },
  light: {
    chrome: '#eddcc0', canvas: '#e4d4b0', surface: '#f5ead0', raised: '#f5ead0',
    popover: '#e4d4b0', dim: '#406278', idle: '#406278', unknown: '#406278',
  },
};

// The app's own `selected` overlay, which a theme does not override (herdr-app
// 0.1.9 src/settings.rs:313 light, :319 dark).
const SELECTED = { dark: '#ffffff17', light: '#00000012' };

// Composite an #rrggbbaa overlay onto an opaque base the way the app's renderer
// blends it: per channel, in sRGB-encoded values (no linearization). Checked
// against a 0.1.9 render: a selected sidebar row on dark chrome #1d1f21
// sampled #313335, which is this function's output (linear-light would be
// lighter).
const composite = (base, overlay) => {
  const ch = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const a = ch(overlay, 3) / 255;
  return `#${[0, 1, 2]
    .map((i) => Math.round(ch(base, i) * (1 - a) + ch(overlay, i) * a).toString(16).padStart(2, '0'))
    .join('')}`;
};

// contrast() against black rises with luminance, so it orders surfaces by
// luminance without a second luminance implementation.
const lum = (hex) => contrast(hex, '#000000');

const DIM_FLOOR_BARS = 4.5; // chrome and surface: dim is body-size text there
const FLOOR_3 = 3.0; // raised, popover, selected rows; and the dots (graphics)

test('composite() blends an alpha overlay per sRGB channel', () => {
  assert.equal(composite('#000000', '#ffffff80'), '#808080');
  assert.equal(composite('#ffffff', '#00000000'), '#ffffff');
  assert.equal(composite('#1d1f21', '#ffffffff'), '#ffffff');
});

for (const mode of ['dark', 'light']) {
  test(`herdr-app ${mode}: surfaces, dim and quiet dots are the pinned hexes`, () => {
    const { colors } = read(mode);
    for (const [k, v] of Object.entries(PINNED[mode])) assert.equal(colors[k], v, k);
  });

  test(`herdr-app ${mode}: dim meets 4.5:1 on bars and terminal, 3:1 elsewhere`, () => {
    const { colors: c } = read(mode);
    for (const s of ['chrome', 'surface']) {
      const r = contrast(c.dim, c[s]);
      assert.ok(r >= DIM_FLOOR_BARS, `dim on ${s}: ${r.toFixed(2)} < ${DIM_FLOOR_BARS}`);
    }
    for (const s of ['raised', 'popover']) {
      const r = contrast(c.dim, c[s]);
      assert.ok(r >= FLOOR_3, `dim on ${s}: ${r.toFixed(2)} < ${FLOOR_3}`);
    }
    for (const s of ['chrome', 'surface', 'raised', 'popover']) {
      const bg = composite(c[s], SELECTED[mode]);
      const r = contrast(c.dim, bg);
      assert.ok(r >= FLOOR_3, `dim on selected ${s} (${bg}): ${r.toFixed(2)} < ${FLOOR_3}`);
    }
  });

  test(`herdr-app ${mode}: idle and unknown dots meet 3:1, bare and on a selected row`, () => {
    const { colors: c } = read(mode);
    for (const dot of ['idle', 'unknown']) {
      for (const s of ['chrome', 'surface', 'raised', 'popover']) {
        for (const bg of [c[s], composite(c[s], SELECTED[mode])]) {
          const r = contrast(c[dot], bg);
          assert.ok(r >= FLOOR_3, `${dot} on ${s} (${bg}): ${r.toFixed(2)} < ${FLOOR_3}`);
        }
      }
    }
  });

  test(`herdr-app ${mode}: surfaces step in the mode's depth order`, () => {
    const { colors: c } = read(mode);
    // Dark: chrome recedes furthest. Light: canvas is the deep well, chrome
    // stays on bgRaised to keep dim at 4.5:1 on the bars.
    const order = mode === 'dark' ? ['chrome', 'canvas', 'surface'] : ['canvas', 'chrome', 'surface'];
    for (let i = 0; i + 1 < order.length; i++) {
      const [lo, hi] = [order[i], order[i + 1]];
      assert.ok(lum(c[lo]) < lum(c[hi]), `${lo} (${c[lo]}) should be darker than ${hi} (${c[hi]})`);
    }
  });
}
