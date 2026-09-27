// Shape gate on the emitted Zed + WezTerm themes — the browser-theme.test.mjs
// precedent. check:themes only proves the committed files match a fresh
// regeneration (self-consistency); Zed deserializes without
// deny_unknown_fields, so a typo'd destination key renders wrong-but-plausible
// with nothing in the log, and WezTerm positionally indexes its ansi rows so a
// short row misaligns every color after the gap. The key sets below are
// HAND-PINNED against the emitted output at authoring time — a generator edit
// that changes the emitted set must change this file in the same commit, which
// is the point.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const THEMES = join(new URL('../', import.meta.url).pathname, 'themes');
const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;

// ── Zed ──────────────────────────────────────────────────────────────────────

const EXPECT_ZED_STYLE_KEYS = [
  'background', 'editor.background', 'editor.gutter.background', 'terminal.background',
  'panel.background', 'surface.background', 'status_bar.background', 'toolbar.background',
  'scrollbar.track.background', 'elevated_surface.background', 'title_bar.background',
  'tab_bar.background', 'tab.active_background', 'editor.active_line.background',
  'tab.inactive_background', 'text', 'editor.foreground', 'terminal.foreground', 'icon',
  'editor.active_line_number', 'text.muted', 'icon.muted', 'editor.line_number',
  'text.disabled', 'icon.disabled', 'text.placeholder', 'editor.invisible', 'text.accent',
  'icon.accent', 'border.focused', 'border.selected', 'link_text.hover', 'border',
  'border.variant', 'border.disabled', 'editor.indent_guide', 'scrollbar.thumb.border',
  'pane.focused_border', 'border.transparent', 'editor.indent_guide_active', 'success',
  'success.border', 'created', 'created.border', 'warning', 'warning.border', 'modified',
  'modified.border', 'error', 'error.border', 'deleted', 'deleted.border', 'conflict',
  'conflict.border', 'info', 'info.border', 'hint', 'hint.border', 'element.selected',
  'editor.document_highlight.read_background', 'element.hover', 'element.active',
  'ghost_element.hover', 'ghost_element.active', 'warning.background', 'modified.background',
  'editor.document_highlight.write_background', 'success.background', 'created.background',
  'error.background', 'deleted.background', 'conflict.background', 'info.background',
  'hint.background', 'scrollbar.thumb.background', 'drop_target.background',
  ...['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'].flatMap(
    (c) => [`terminal.ansi.${c}`, `terminal.ansi.dim_${c}`, `terminal.ansi.bright_${c}`],
  ),
  'accents',
].sort();

const EXPECT_ZED_SYNTAX = [
  'keyword', 'operator', 'string', 'string.escape', 'string.regex', 'string.special',
  'string.special.symbol', 'comment', 'comment.doc', 'type', 'enum', 'constructor',
  'constant', 'boolean', 'number', 'function', 'function.method', 'variable',
  'variable.special', 'property', 'attribute', 'label', 'primary', 'tag', 'preproc',
  'embedded', 'link_text', 'link_uri', 'title', 'emphasis', 'emphasis.strong',
  'text.literal', 'punctuation', 'punctuation.bracket', 'punctuation.delimiter',
  'punctuation.list_marker', 'punctuation.special', 'hint', 'predictive',
].sort();

const zed = JSON.parse(readFileSync(join(THEMES, 'zed/artificer.json'), 'utf8'));

test('zed: one family carries exactly Artificer Dark + Artificer Light', () => {
  assert.deepEqual(
    zed.themes.map((t) => [t.name, t.appearance]),
    [['Artificer Dark', 'dark'], ['Artificer Light', 'light']],
  );
});

for (const theme of zed.themes) {
  test(`zed ${theme.appearance}: style keys are EXACTLY the pinned set, every value hex-shaped`, () => {
    const keys = Object.keys(theme.style).filter((k) => k !== 'syntax' && k !== 'players');
    assert.deepEqual(keys.sort(), EXPECT_ZED_STYLE_KEYS, 'emitted style key set changed — repin deliberately');
    for (const k of keys) {
      if (k === 'accents') {
        assert.ok(Array.isArray(theme.style[k]) && theme.style[k].every((v) => HEX.test(v)), 'accents: hex array');
        continue;
      }
      assert.match(theme.style[k], HEX, `style["${k}"] is not a hex color`);
    }
  });

  test(`zed ${theme.appearance}: syntax captures are EXACTLY the pinned set, each with a hex color`, () => {
    assert.deepEqual(Object.keys(theme.style.syntax).sort(), EXPECT_ZED_SYNTAX, 'syntax capture set changed — repin deliberately');
    for (const [capture, spec] of Object.entries(theme.style.syntax)) {
      assert.match(spec.color, HEX, `syntax["${capture}"].color is not hex`);
    }
  });

  test(`zed ${theme.appearance}: players carries the 8 collaborator slots`, () => {
    assert.equal(theme.style.players.length, 8);
  });
}

// The ANSI_SLOTS blue pair (#444): the neovim test asserts a DIFFERENT emitter,
// so a transposed `['blue', ...]` row would ship Zed + WezTerm inverted with a
// green suite. Assert the emitted pair's per-mode luminance ordering here —
// bright blue is the lighter member on dark and the darker on light.
const relLum = (hex) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + [0.2126, 0.7152, 0.0722][i] * v, 0);

for (const theme of zed.themes) {
  test(`zed ${theme.appearance}: ANSI blue pair keeps its per-mode luminance ordering`, () => {
    const normal = relLum(theme.style['terminal.ansi.blue']);
    const bright = relLum(theme.style['terminal.ansi.bright_blue']);
    if (theme.appearance === 'dark') {
      assert.ok(bright > normal, 'bright blue (slot 12) must be lighter than normal blue on dark');
    } else {
      assert.ok(bright < normal, 'bright blue (slot 12) must be darker than normal blue on light (ANSI light-theme convention)');
    }
  });
}

// ── WezTerm ──────────────────────────────────────────────────────────────────

const EXPECT_WEZTERM_COLOR_KEYS = [
  'background', 'foreground', 'cursor_bg', 'cursor_fg', 'cursor_border',
  'selection_bg', 'selection_fg', 'scrollbar_thumb', 'split', 'compose_cursor',
];

for (const mode of ['dark', 'light']) {
  const toml = readFileSync(join(THEMES, `wezterm/artificer-${mode}.toml`), 'utf8');

  test(`wezterm ${mode}: [metadata] name is the load-bearing scheme id`, () => {
    const title = mode === 'dark' ? 'Dark' : 'Light';
    assert.ok(toml.includes(`name = "Artificer ${title}"`), 'color_scheme selects by this name, never the filename');
  });

  test(`wezterm ${mode}: every [colors] key present with a hex value`, () => {
    for (const key of EXPECT_WEZTERM_COLOR_KEYS) {
      const re = new RegExp(`^${key}\\s*= "#[0-9a-f]{6}"`, 'm');
      assert.match(toml, re, `[colors] ${key} missing or non-hex`);
    }
  });

  test(`wezterm ${mode}: ansi and brights carry exactly 8 hex entries each`, () => {
    // WezTerm fills palette slots positionally — a short row misaligns every
    // color after the gap rather than erroring.
    for (const row of ['ansi', 'brights']) {
      const m = toml.match(new RegExp(`^${row} = \\[([^\\]]*)\\]`, 'ms'));
      assert.ok(m, `${row} array missing`);
      const entries = m[1].match(/"#[0-9a-f]{6}"/g) ?? [];
      assert.equal(entries.length, 8, `${row} must carry exactly 8 slots`);
    }
  });
}

// ── window-frame lua ─────────────────────────────────────────────────────────

test('wezterm frame module: both modes, same key set, hex-only values, inert lua', () => {
  const lua = readFileSync(join(THEMES, 'wezterm/artificer-window-frame.lua'), 'utf8');
  const block = (name) => {
    const m = lua.match(new RegExp(`M\\.${name} = \\{([^}]*)\\}`, 'm'));
    assert.ok(m, `M.${name} block missing`);
    return [...m[1].matchAll(/(\w+)\s*= '(#[0-9a-f]{6})'/g)].map(([, k]) => k);
  };
  const dark = block('dark');
  const light = block('light');
  assert.ok(dark.length > 0, 'dark frame block carries no hex assignments');
  assert.deepEqual(dark.sort(), light.sort(), 'dark and light frame key sets must match');
  assert.ok(lua.includes('return M'), 'module must return M');
  // The file is a color table, nothing executable beyond it.
  assert.ok(!/require\s*\(|io\.|os\.|load\(/.test(lua.replace(/^--.*$/gm, '')), 'frame module must stay inert data');
});
