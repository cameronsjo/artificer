// Guards the committed output of themes/build.mjs's browser emitters —
// themes/chromium/artificer-{dark,light}/manifest.json and
// themes/firefox/artificer/manifest.json.
//
// build.mjs is a top-level script with side effects (writes files on import),
// so it is never imported here — the same discipline check-themes.mjs and
// jetbrains-theme.test.mjs use. Unlike most targets, these three are
// dispositioned drift: false (version-stamped, same as gitmux), so
// check:themes never regenerates and diffs them. That makes THIS file the only
// gate on their bytes, and the assertions are chosen for what the browsers
// would accept silently and render wrong:
//
//   · Chromium accepts ONLY [r, g, b] arrays; a hex string parses fine and is
//     then ignored
//   · a colour key outside Chromium's kOverwritableColorTable — or outside
//     Firefox's documented theme.colors set — is likewise parsed and silently
//     dropped, so a guessed name fails invisibly
//   · a key that is simply ABSENT renders at the browser's own default on an
//     Artificer surface, which a presence-only check cannot see; hence the
//     EXPECT_* maps below are asserted as exact key sets, both directions
//   · a key bound to the wrong palette rung still resolves to a real palette
//     hex, so per-key token assertions are what catch a swap — a
//     "is it some palette value" check cannot
//   · `version` has one writer here (build.mjs), and a store upload with an
//     already-used version is a hard rejection, so the stamp is asserted
//     against package.json rather than assumed
//   · the gecko id is IDENTITY — changing it mints a different add-on that
//     existing users never receive
//   · `dark_theme` needs the same key set as `theme`, or the OS flip drops
//     bindings on one side only

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const THEMES = fileURLToPath(new URL('../themes/', import.meta.url));
const ROOT = dirname(THEMES);
const manifest = (rel) => JSON.parse(readFileSync(join(THEMES, rel, 'manifest.json'), 'utf8'));

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const palette = JSON.parse(readFileSync(join(THEMES, '_palette.json'), 'utf8'));

const FIREFOX_ADDON_ID = '{b91a29e8-5147-4076-8bda-1b1f5c5e12d9}';
const FIREFOX_MIN_VERSION = '68.0';

const CHROMIUM_DIRS = { dark: 'chromium/artificer-dark', light: 'chromium/artificer-light' };
const FIREFOX_DIR = 'firefox/artificer';

// chrome/browser/themes/browser_theme_pack.cc, kOverwritableColorTable
// (Chromium main, read 2026-08-27). Chrome does not publish this list in its
// developer docs; anything outside it is silently ignored at load.
const CHROMIUM_COLOR_KEYS = new Set([
  'background_tab', 'background_tab_inactive', 'background_tab_incognito',
  'background_tab_incognito_inactive', 'bookmark_text', 'button_background',
  'frame', 'frame_inactive', 'frame_incognito', 'frame_incognito_inactive',
  'ntp_background', 'ntp_header', 'ntp_link', 'ntp_text', 'omnibox_background',
  'omnibox_text', 'tab_background_text', 'tab_background_text_inactive',
  'tab_background_text_incognito', 'tab_background_text_incognito_inactive',
  'tab_text', 'toolbar', 'toolbar_button_icon', 'toolbar_text',
]);

// developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme
// (mdn/content raw source, read 2026-08-27). Firefox's set, unlike Chromium's,
// IS published — but the failure mode is identical: an unrecognized key is
// parsed and silently ignored. The two deprecated keys (tab_background_separator,
// toolbar_field_separator) are deliberately absent.
const FIREFOX_COLOR_KEYS = new Set([
  'bookmark_text', 'button_background_active', 'button_background_hover',
  'frame', 'frame_inactive', 'icons', 'icons_attention',
  'ntp_background', 'ntp_card_background', 'ntp_text',
  'popup', 'popup_border', 'popup_highlight', 'popup_highlight_text', 'popup_text',
  'sidebar', 'sidebar_border', 'sidebar_highlight', 'sidebar_highlight_text', 'sidebar_text',
  'tab_background_text', 'tab_line', 'tab_selected', 'tab_text',
  'toolbar', 'toolbar_bottom_separator', 'toolbar_field', 'toolbar_field_border',
  'toolbar_field_border_focus', 'toolbar_field_focus', 'toolbar_field_highlight',
  'toolbar_field_text', 'toolbar_field_text_focus', 'toolbar_text',
  'toolbar_top_separator', 'toolbar_vertical_separator',
]);

// The expected key -> _palette.json token binding, per target. This is a
// deliberate hand-maintained copy of BROWSER_SLOTS, not a derivation from it:
// re-deriving from the generator under test would make the check circular and
// unable to go red. It is the same golden-copy contract check-themes.mjs gives
// every drift: true target — which these three are excluded from, because a
// version-stamped file differs from a fresh regeneration on every package.json
// bump for a reason that is not drift.
//
// Changing a binding in themes/build.mjs means changing it here too, on
// purpose. That second edit IS the gate.
const EXPECT_CHROMIUM = {
  frame:                                   'bg',
  frame_inactive:                          'bgInactive',
  frame_incognito:                         'bgInactive',
  frame_incognito_inactive:                'bgInactive',
  ntp_background:                          'bg',
  toolbar:                                 'bgRaised',
  ntp_header:                              'bgRaised',
  button_background:                       'bgRaised',
  background_tab:                          'bg',
  background_tab_inactive:                 'bgInactive',
  background_tab_incognito:                'bg',
  background_tab_incognito_inactive:       'bgInactive',
  omnibox_background:                      'bgOverlay',
  tab_text:                                'fg',
  toolbar_text:                            'fg',
  bookmark_text:                           'fg',
  ntp_text:                                'fg',
  omnibox_text:                            'fg',
  tab_background_text:                     'fgSecondary',
  tab_background_text_inactive:            'fgSecondary',
  tab_background_text_incognito:           'fgSecondary',
  tab_background_text_incognito_inactive:  'fgSecondary',
  toolbar_button_icon:                     'fgSecondary',
  ntp_link:                                'accent',
};

const EXPECT_FIREFOX = {
  frame:                       'bg',
  frame_inactive:              'bgInactive',
  ntp_background:              'bg',
  toolbar:                     'bgRaised',
  tab_selected:                'bgRaised',
  sidebar:                     'bgRaised',
  ntp_card_background:         'bgRaised',
  toolbar_field:               'bgOverlay',
  toolbar_field_focus:         'bgOverlay',
  popup:                       'bgOverlay',
  button_background_hover:     'bgOverlay',
  tab_text:                    'fg',
  toolbar_text:                'fg',
  bookmark_text:               'fg',
  ntp_text:                    'fg',
  toolbar_field_text:          'fg',
  toolbar_field_text_focus:    'fg',
  popup_text:                  'fg',
  sidebar_text:                'fg',
  tab_background_text:         'fgSecondary',
  icons:                       'fgSecondary',
  tab_line:                    'accent',
  icons_attention:             'accent',
  toolbar_field_border_focus:  'accent',
  popup_highlight:             'selectionFill',
  popup_highlight_text:        'fg',
  sidebar_highlight:           'selectionFill',
  sidebar_highlight_text:      'fg',
  toolbar_field_highlight:     'selectionFill',
  button_background_active:    'selectionFill',
  toolbar_field_border:        'border',
  toolbar_top_separator:       'border',
  toolbar_bottom_separator:    'border',
  toolbar_vertical_separator:  'border',
  popup_border:                'border',
  sidebar_border:              'border',
};

const hexSet = (mode) => new Set(Object.values(palette[mode]).map((v) => String(v).toLowerCase()));
const rgbOf = (hex) => [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16));

for (const [mode, dir] of Object.entries(CHROMIUM_DIRS)) {
  test(`chromium ${mode}: manifest_version is exactly 3 and the stamp equals package.json`, () => {
    const m = manifest(dir);
    // Not "present": the Chrome Web Store and Partner Center both reject MV2.
    assert.equal(m.manifest_version, 3);
    assert.equal(m.version, pkg.version);
    assert.equal(m.name, mode === 'dark' ? 'Artificer Dark' : 'Artificer Light');
  });

  test(`chromium ${mode}: every colour is an [r, g, b] array of integers — never a hex string`, () => {
    const { colors } = manifest(dir).theme;
    for (const [key, value] of Object.entries(colors)) {
      assert.ok(Array.isArray(value), `${key}: ${JSON.stringify(value)} is not an array — Chromium ignores hex strings`);
      assert.equal(value.length, 3, `${key}: expected three channels`);
      for (const c of value) {
        assert.equal(typeof c, 'number', `${key}: non-numeric channel`);
        assert.ok(Number.isInteger(c) && c >= 0 && c <= 255, `${key}: channel ${c} out of range`);
      }
    }
    assert.doesNotMatch(JSON.stringify(manifest(dir).theme), /#[0-9a-fA-F]{6}/, 'a hex literal reached the theme block');
  });

  test(`chromium ${mode}: the key set is EXACTLY the expected one — an absent key renders at Chrome's default`, () => {
    assert.deepEqual(
      Object.keys(manifest(dir).theme.colors).sort(),
      Object.keys(EXPECT_CHROMIUM).sort(),
      'a dropped key is invisible to a presence-only check; an added one is silently ignored by Chromium'
    );
  });

  test(`chromium ${mode}: every expected key is in kOverwritableColorTable`, () => {
    for (const key of Object.keys(EXPECT_CHROMIUM)) {
      assert.ok(CHROMIUM_COLOR_KEYS.has(key), `"${key}" is not an overwritable Chromium colour — it would be silently ignored`);
    }
  });

  test(`chromium ${mode}: every key carries ITS OWN token, resolved in THIS mode`, () => {
    const { colors } = manifest(dir).theme;
    for (const [key, token] of Object.entries(EXPECT_CHROMIUM)) {
      const want = palette[mode][token];
      assert.ok(want, `expected token "${token}" is not in _palette.json`);
      assert.deepEqual(colors[key], rgbOf(want), `${key} should carry ${token} (${want}) in ${mode}`);
    }
  });
}

test('firefox: manifest_version is exactly 2, the stamp equals package.json, and the name is unsuffixed', () => {
  const m = manifest(FIREFOX_DIR);
  // MV2 by decision, not by omission — Mozilla's static-theme docs ship MV2 as
  // the canonical example and have no deprecation plan.
  assert.equal(m.manifest_version, 2);
  assert.equal(m.version, pkg.version);
  assert.equal(m.name, 'Artificer');
});

test('firefox: the gecko id and min version are the pinned constants — the id is identity, never regenerate', () => {
  const { gecko } = manifest(FIREFOX_DIR).browser_specific_settings;
  assert.equal(gecko.id, FIREFOX_ADDON_ID, 'changing this mints a DIFFERENT add-on existing users never receive');
  assert.equal(gecko.strict_min_version, FIREFOX_MIN_VERSION, 'dark_theme landed in Firefox 68; below it the theme renders light-only, silently');
});

test('firefox: theme and dark_theme each carry EXACTLY the expected key set', () => {
  const m = manifest(FIREFOX_DIR);
  const want = Object.keys(EXPECT_FIREFOX).sort();
  for (const block of ['theme', 'dark_theme']) {
    const colors = m[block]?.colors;
    assert.ok(colors, `${block}.colors missing`);
    assert.deepEqual(
      Object.keys(colors).sort(), want,
      `${block}: a key bound on one side only drops that binding when the OS flips, and a dropped key renders at Firefox's default`
    );
  }
});

test('firefox: every expected key is a documented theme.colors key', () => {
  for (const key of Object.keys(EXPECT_FIREFOX)) {
    assert.ok(FIREFOX_COLOR_KEYS.has(key), `"${key}" is not a documented Firefox theme colour — it would be silently ignored`);
  }
});

test('firefox: every key carries ITS OWN token, in the right block', () => {
  const m = manifest(FIREFOX_DIR);
  for (const [block, mode] of [['theme', 'light'], ['dark_theme', 'dark']]) {
    for (const [key, token] of Object.entries(EXPECT_FIREFOX)) {
      const want = palette[mode][token];
      assert.ok(want, `expected token "${token}" is not in _palette.json`);
      assert.equal(m[block].colors[key], want, `${block}.${key} should carry ${token} (${want})`);
    }
  }
});

test('firefox: every hex traces back to a _palette.json token, in the right mode', () => {
  const m = manifest(FIREFOX_DIR);
  // Scoped to Firefox on purpose: the Chromium manifests carry no hex at all,
  // so the same assertion there could never go red.
  for (const [block, mode] of [['theme', 'light'], ['dark_theme', 'dark']]) {
    const known = hexSet(mode);
    for (const [key, value] of Object.entries(m[block].colors)) {
      assert.match(value, /^#[0-9a-f]{6}$/, `${block}.${key} = ${value} is not a six-digit lowercase hex`);
      assert.ok(known.has(value), `${block}.${key} = ${value} is not a ${mode}-mode _palette.json value`);
    }
  }
  // Anchors, so a wholesale mode swap cannot pass on hex overlap alone.
  assert.equal(m.theme.colors.frame, palette.light.bg);
  assert.equal(m.dark_theme.colors.frame, palette.dark.bg);
});

test('the packer names exactly the three emitted manifests, and each exists on disk', async () => {
  const { MEMBERS, PACKAGES, ICON } = await import('./pack-browser.mjs');
  assert.deepEqual([...MEMBERS].sort(), [
    'chromium/artificer-dark/manifest.json',
    'chromium/artificer-light/manifest.json',
    'firefox/artificer/manifest.json',
  ]);
  assert.equal(PACKAGES.length, 3);
  assert.equal(new Set(PACKAGES.map((p) => p.zip)).size, 3, 'two packages would write the same zip');
  assert.equal(new Set(PACKAGES.map((p) => p.src)).size, 3, 'two packages would pack the same directory');
  for (const p of PACKAGES) assert.ok(p.docs, `${p.src}: no README section named for the missing-icon error`);
  for (const m of MEMBERS) assert.ok(existsSync(join(THEMES, m)), `${m} missing on disk`);
  // The manifest declares `icons`, so the PNG is load-bearing: a package
  // missing it is rejected on install, not merely listed without an icon.
  for (const p of PACKAGES) {
    assert.ok(existsSync(join(THEMES, p.src, ICON)), `${p.src}/${ICON} missing — the manifest's icons key points at it`);
    assert.deepEqual(manifest(p.src).icons, { 128: ICON }, `${p.src}: manifest does not declare the packed icon`);
  }
});

test('the packer covers every browser directory build.mjs emits — a new target cannot land unpacked', async () => {
  // PACKAGES is hand-maintained and check:install would stay green on a fourth
  // browser target with its own disposition row, so this is the only place a
  // new emitted directory that nobody wired into the packer goes red.
  const { MEMBERS } = await import('./pack-browser.mjs');
  const { emittedTargets } = await import('./check-install-coverage.mjs');
  const buildMjs = readFileSync(join(THEMES, 'build.mjs'), 'utf8');
  const browserDirs = [...emittedTargets(buildMjs)].filter((d) => d === 'chromium' || d === 'firefox');
  assert.deepEqual(browserDirs.sort(), ['chromium', 'firefox'], 'the emitted browser target set changed');
  for (const dir of browserDirs) {
    assert.ok(
      MEMBERS.some((m) => m.startsWith(`${dir}/`)),
      `themes/build.mjs emits ${dir}/ but scripts/pack-browser.mjs PACKAGES names no package under it — pack:browser would silently skip it`
    );
  }
});
