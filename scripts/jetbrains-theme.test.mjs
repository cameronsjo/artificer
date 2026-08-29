// Guards the committed output of themes/build.mjs's JetBrains emitters —
// themes/jetbrains/{META-INF/plugin.xml, artificer-{dark,light}.theme.json,
// artificer-{dark,light}.xml}.
//
// build.mjs is a top-level script with side effects (writes files on import),
// so it is never imported here — the same discipline check-themes.mjs and
// neovim-colorscheme.test.mjs use. check-themes.mjs already proves the
// committed bytes match a fresh regeneration; these tests assert the semantic
// shape of those bytes — the things the IntelliJ Platform would accept silently
// and render wrong:
//
//   · a `ui` value that is not "#"-prefixed is a LOOKUP into the file's own
//     `colors` map (UITheme.java branches on the prefix) — an unresolvable name
//     renders as "no colour", not an error
//   · editor-scheme hex is BARE (no "#"); a "#" value is simply not a colour
//   · value="" suppresses the parent fallback instead of inheriting
//   · the two themeProvider UUIDs are identity — regenerated ids orphan users'
//     saved theme choice
//   · <version> has two writers (build.mjs + sync-version.mjs); they must agree

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const DIR = fileURLToPath(new URL('../themes/jetbrains/', import.meta.url));
const ROOT = dirname(dirname(DIR));
const read = (rel) => readFileSync(join(DIR, rel), 'utf8');

const MODES = ['dark', 'light'];
const THEME_IDS = {
  dark: '66d9b354-01e3-4533-b4d0-5217f2e71fdb',
  light: '8eabb434-0d08-4d9b-b433-1ec2dc1a249a',
};
const PLUGIN_XML = read('META-INF/plugin.xml');
const uiTheme = (mode) => JSON.parse(read(`artificer-${mode}.theme.json`));
const scheme = (mode) => read(`artificer-${mode}.xml`);

// Walk every leaf string in the `ui` block (values nest one level under "*"
// and any other component group).
function uiLeaves(ui, path = []) {
  return Object.entries(ui).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? uiLeaves(v, [...path, k]) : [[[...path, k].join('.'), v]]);
}

for (const mode of MODES) {
  test(`${mode}: every bare ui value resolves in the file's own colors map, literals are #RRGGBB[AA]`, () => {
    const { colors, ui } = uiTheme(mode);
    assert.ok(colors && Object.keys(colors).length > 30, 'colors map missing or thin');
    for (const [key, value] of uiLeaves(ui)) {
      assert.equal(typeof value, 'string', `${key}: non-string value`);
      if (value.startsWith('#')) {
        assert.match(value, /^#[0-9a-f]{6}([0-9a-f]{2})?$/, `${key}: literal ${value} is not #rrggbb or #rrggbbaa`);
      } else {
        assert.ok(Object.hasOwn(colors, value), `${key}: "${value}" is not a key in colors — the IDE would render no colour`);
      }
    }
  });

  test(`${mode}: every colors entry is a six-digit lowercase #hex`, () => {
    for (const [token, hex] of Object.entries(uiTheme(mode).colors)) {
      assert.match(hex, /^#[0-9a-f]{6}$/, `colors.${token} = ${hex}`);
    }
  });

  test(`${mode}: theme.json names its mode, Islands parent, and an existing editor scheme of the matching parent`, () => {
    const t = uiTheme(mode);
    assert.equal(t.dark, mode === 'dark');
    assert.equal(t.parentTheme, mode === 'dark' ? 'Islands Dark' : 'Islands Light');
    assert.equal(t.name, mode === 'dark' ? 'Artificer Dark' : 'Artificer Light');
    assert.match(t.editorScheme, /^\/[^/ ]+\.xml$/, 'editorScheme must be a root-relative path with no spaces');
    const schemeFile = join(DIR, t.editorScheme.slice(1));
    assert.ok(existsSync(schemeFile), `editorScheme ${t.editorScheme} does not exist`);
    const xml = readFileSync(schemeFile, 'utf8');
    const parent = xml.match(/parent_scheme="([^"]+)"/)?.[1];
    assert.equal(parent, mode === 'dark' ? 'Darcula' : 'Default');
  });

  test(`${mode}: editor scheme values are bare 6/8-digit hex (colours) or small integers (font/effect), never empty, never "#"`, () => {
    const xml = scheme(mode);
    const values = [...xml.matchAll(/<option name="([A-Z_0-9]+)" value="([^"]*)"/g)];
    assert.ok(values.length > 100, `only ${values.length} option values parsed`);
    for (const [, name, value] of values) {
      assert.notEqual(value, '', `${name}: empty value suppresses inheritance — omit the option instead`);
      if (name === 'FONT_TYPE') { assert.match(value, /^[0-3]$/, `${name}=${value}`); continue; }
      if (name === 'EFFECT_TYPE') { assert.match(value, /^[0-5]$/, `${name}=${value}`); continue; }
      assert.match(value, /^[0-9a-f]{6}([0-9a-f]{2})?$/, `${name}=${value} is not bare rrggbb[aa]`);
    }
    assert.doesNotMatch(xml, /value="#/, 'a "#"-prefixed value in an editor scheme is not a colour');
  });

  test(`${mode}: the twelve syntax roles land on DEFAULT_* fallback keys and TEXT carries both fg and bg`, () => {
    const xml = scheme(mode);
    for (const key of ['DEFAULT_KEYWORD', 'DEFAULT_STRING', 'DEFAULT_LINE_COMMENT', 'DEFAULT_NUMBER',
      'DEFAULT_FUNCTION_DECLARATION', 'DEFAULT_CLASS_NAME', 'DEFAULT_IDENTIFIER', 'DEFAULT_PARAMETER',
      'DEFAULT_OPERATION_SIGN', 'DEFAULT_TAG', 'DEFAULT_TEMPLATE_LANGUAGE_COLOR', 'DEPRECATED_ATTRIBUTES']) {
      assert.ok(xml.includes(`<option name="${key}">`), `${key} missing`);
    }
    const text = xml.match(/<option name="TEXT">([\s\S]*?)<\/option>/)?.[1] ?? '';
    assert.match(text, /name="FOREGROUND"/, 'TEXT has no FOREGROUND');
    assert.match(text, /name="BACKGROUND"/, 'TEXT has no BACKGROUND — the editor canvas would be the parent\'s');
  });

  test(`${mode}: each DEFAULT_* fallback key's FOREGROUND is the hex of ITS role, not a neighbour's`, () => {
    // The role → token map is read from _palette.json ($roles.syntax) and the
    // hex from the emitted theme.json's own colors map — so a refactor that
    // points DEFAULT_STRING at the keyword role fails here, which presence
    // checks alone cannot catch.
    const roles = JSON.parse(readFileSync(join(ROOT, 'themes', '_palette.json'), 'utf8')).$roles.syntax;
    const { colors } = uiTheme(mode);
    const xml = scheme(mode);
    const fgOf = (key) => xml.match(new RegExp(`<option name="${key}">[\\s\\S]*?<option name="FOREGROUND" value="([0-9a-f]+)"`))?.[1];
    const expect = {
      DEFAULT_KEYWORD: 'keyword', DEFAULT_STRING: 'string', DEFAULT_LINE_COMMENT: 'comment',
      DEFAULT_NUMBER: 'constant', DEFAULT_FUNCTION_DECLARATION: 'function', DEFAULT_CLASS_NAME: 'type',
      DEFAULT_IDENTIFIER: 'variable', DEFAULT_PARAMETER: 'parameter', DEFAULT_OPERATION_SIGN: 'operator',
      DEFAULT_TAG: 'tag', DEFAULT_TEMPLATE_LANGUAGE_COLOR: 'namespace', DEPRECATED_ATTRIBUTES: 'invalid',
    };
    for (const [key, role] of Object.entries(expect)) {
      const want = colors[roles[role]]?.slice(1);
      assert.ok(want, `role ${role} → token ${roles[role]} missing from colors`);
      assert.equal(fgOf(key), want, `${key} should carry the ${role} role (${roles[role]})`);
    }
  });
}

// No test asserts baseAttributes="1" re-routing of parent-defined keys: the
// child scheme's fallback chain already outranks the parent's explicit language
// keys (see the emitter comment), so the scheme carries no such markers.
test('plugin.xml registers both themeProviders with the committed UUIDs, on existing files, no spaces in paths', () => {
  const providers = [...PLUGIN_XML.matchAll(/<themeProvider id="([^"]+)" path="([^"]+)"/g)];
  assert.equal(providers.length, 2);
  const byPath = Object.fromEntries(providers.map(([, id, path]) => [path, id]));
  for (const mode of MODES) {
    const path = `/artificer-${mode}.theme.json`;
    assert.equal(byPath[path], THEME_IDS[mode], `${path}: themeProvider id changed — these are identity, never regenerate`);
    assert.ok(existsSync(join(DIR, path.slice(1))), `${path} does not exist`);
  }
  assert.doesNotMatch(PLUGIN_XML, /path="[^"]* [^"]*"/, 'resource path with a space');
});

test('plugin.xml carries the platform dependency, an Islands-era since-build, and no until-build', () => {
  assert.match(PLUGIN_XML, /<depends>com\.intellij\.modules\.platform<\/depends>/);
  const since = Number(PLUGIN_XML.match(/since-build="(\d+)/)?.[1]);
  assert.ok(since >= 252, `since-build ${since} predates the Islands UI (252)`);
  assert.doesNotMatch(PLUGIN_XML, /until-build/);
});

test('plugin.xml <version> equals package.json (build.mjs and sync-version.mjs are two writers of one line)', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const v = PLUGIN_XML.match(/<version>([^<]*)<\/version>/)?.[1];
  assert.equal(v, pkg.version);
  // the byte shape sync-version's regex rewrites — no inner whitespace
  assert.match(PLUGIN_XML, new RegExp(`<version>${pkg.version.replace(/\./g, '\\.')}</version>`));
});

test('the packer names exactly the five emitted members', async () => {
  const { MEMBERS } = await import('./pack-jetbrains.mjs');
  assert.deepEqual([...MEMBERS].sort(), [
    'META-INF/plugin.xml', 'artificer-dark.theme.json', 'artificer-dark.xml',
    'artificer-light.theme.json', 'artificer-light.xml',
  ]);
  for (const m of MEMBERS) assert.ok(existsSync(join(DIR, m)), `${m} missing on disk`);
});
