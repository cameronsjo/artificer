import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NAME_MAP,
  EXCEPTIONS,
  PALETTE_ONLY,
  TOKENS_ONLY,
  paletteKeys,
  tokenColorLeaves,
  tokenDrift,
  applyDrift,
} from './sync-tokens.mjs';

// Test Plan for scripts/sync-tokens.mjs
// Values-only sync of src/tokens.json color values from themes/_palette.json.
//   [x] tokenDrift flags a stale value (modeled on the real accentBright:light
//       drift this issue found and fixed — #8a6618 mirror vs #866010 canonical)
//   [x] tokenDrift does NOT flag brandPurple:dark (ADR 0014 exception) — still
//       true against the live files, since the exception is permanent by design
//   [x] the brandPurpleDeep → brandPurpleFill rename resolves against the live files
//   [x] totality guard (forward) — every palette key and every tokens.json color leaf is accounted for
//   [x] totality guard (reverse) — every NAME_MAP path resolves against the live tokens tree
//   [x] tokenDrift throws on an unresolved NAME_MAP path (stale rename/typo), not a silent skip
//   [x] tokenDrift throws when a 'value'-shape key's palette dark/light disagree
//   [x] applyDrift is byte-idempotent patching a synthetic no-drift input
//   [x] applyDrift only touches the targeted line (attention's shared hex is untouched)
//   [x] applyDrift patches both modes of one token entry correctly in a single run
//   [x] applyDrift throws on zero matches, and on more than one match (ambiguous site)
//
// NOTE: (a) intentionally uses a synthetic fixture rather than reading live
// src/tokens.json — this issue's own sync fix removes the one real drift from
// the repo, so a live-file-dependent test would false-negative the moment the
// fix lands. Real files back everything else, where the behavior under test
// (a standing exception, a permanent rename, structural totality) holds
// regardless of sync state.

const palette = JSON.parse(readFileSync(new URL('../themes/_palette.json', import.meta.url), 'utf8'));
const tokens = JSON.parse(readFileSync(new URL('../src/tokens.json', import.meta.url), 'utf8'));

test('tokenDrift flags a stale mirrored value (modeled on the real accentBright:light drift)', () => {
  // Deep-clone the real, structurally-complete tokens tree and reintroduce the
  // exact drift this issue found and fixed (tokens.json's accentBright:light
  // stuck at the pre-v0.10.2 #8a6618 vs the palette's #866010). Cloning real
  // data — rather than a minimal single-key fixture — keeps this test valid
  // against the full NAME_MAP now that an unresolved path throws (IMPORTANT 2).
  const staleTokens = JSON.parse(JSON.stringify(tokens));
  staleTokens.color.semantic.accentBright.light = '#8a6618';
  const drift = tokenDrift(palette, staleTokens);
  assert.deepEqual(
    drift.filter((d) => d.paletteKey === 'accentBright'),
    [
      {
        paletteKey: 'accentBright',
        tokenPath: 'semantic.accentBright',
        mode: 'light',
        from: '#8a6618',
        to: palette.light.accentBright,
        exception: false,
      },
    ],
  );
});

test('brandPurple:dark is NOT flagged — ADR 0014 exception (verified against the live files)', () => {
  assert.ok(EXCEPTIONS.has('brandPurple:dark'));
  // The palette (terminal-fg #9070d0) and tokens.json (web-decorative #5a3a9a)
  // genuinely differ by design — confirm that's still true on disk.
  assert.notEqual(palette.dark.brandPurple, tokens.color.brand.brandPurple.dark);

  const drift = tokenDrift(palette, tokens);
  const hit = drift.find((d) => d.paletteKey === 'brandPurple' && d.mode === 'dark');
  assert.ok(hit, 'tokenDrift should still see the diff — exception silences it downstream, not here');
  assert.equal(hit.exception, true);
  const real = drift.filter((d) => !d.exception);
  assert.ok(!real.includes(hit));
});

test('brandPurpleDeep → brandPurpleFill rename resolves against the live files (no drift)', () => {
  const map = NAME_MAP.brandPurpleDeep;
  assert.deepEqual(map.path, ['brand', 'brandPurpleFill']);
  assert.equal(palette.dark.brandPurpleDeep, tokens.color.brand.brandPurpleFill.dark);
  assert.equal(palette.light.brandPurpleDeep, tokens.color.brand.brandPurpleFill.light);
  const drift = tokenDrift(palette, tokens);
  assert.equal(drift.find((d) => d.paletteKey === 'brandPurpleDeep'), undefined);
});

test('totality guard — every palette key is mapped or documented PALETTE_ONLY', () => {
  const mapped = new Set(Object.keys(NAME_MAP));
  const unaccounted = paletteKeys(palette).filter((k) => !mapped.has(k) && !PALETTE_ONLY.has(k));
  assert.deepEqual(unaccounted, []);
});

test('totality guard — every tokens.json color leaf is mapped-into or documented TOKENS_ONLY', () => {
  const mappedPaths = new Set(Object.values(NAME_MAP).map((m) => m.path.join('.')));
  const unaccounted = tokenColorLeaves(tokens).filter(
    (leaf) => !mappedPaths.has(leaf) && !TOKENS_ONLY.has(leaf),
  );
  assert.deepEqual(unaccounted, []);
});

test('reverse totality guard — every NAME_MAP path resolves against the live tokens tree', () => {
  const unresolved = Object.entries(NAME_MAP)
    .filter(([, map]) => tokens.color?.[map.path[0]]?.[map.path[1]] === undefined)
    .map(([paletteKey]) => paletteKey);
  assert.deepEqual(unresolved, []);
});

test('tokenDrift throws on an unresolved NAME_MAP path instead of silently skipping it', () => {
  // Deep-clone the real, structurally-complete tokens tree and delete one
  // mapped leaf — modeling a stale rename/typo in NAME_MAP against a tokens
  // tree that genuinely lacks the target. Every entry before accentBright in
  // NAME_MAP iteration order resolves fine, so this exercises the real
  // resolve-or-throw path, not an earlier unrelated failure.
  const brokenTokens = JSON.parse(JSON.stringify(tokens));
  delete brokenTokens.color.semantic.accentBright;
  assert.throws(
    () => tokenDrift(palette, brokenTokens),
    /NAME_MAP\["accentBright"\].*doesn't exist — stale rename or typo/,
  );
});

test("tokenDrift throws when a 'value'-shape key's palette dark/light disagree", () => {
  // Deep-clone the real palette and desync ink's dark/light — every 'dual'
  // entry ahead of ink in iteration order still resolves and diffs normally
  // (no throw), so this isolates the value-shape assertion itself.
  const brokenPalette = JSON.parse(JSON.stringify(palette));
  brokenPalette.light.ink = '#ffffff';
  assert.throws(
    () => tokenDrift(brokenPalette, tokens),
    /"ink" is mapped shape 'value'.*disagree — remap it as shape 'dual'/,
  );
});

test('applyDrift is byte-idempotent on a synthetic no-drift input', () => {
  const src = '{\n  "accentBright": { "dark": "#e3c885", "light": "#866010", "use": "hover" }\n}\n';
  const drift = [
    {
      paletteKey: 'accentBright',
      tokenPath: 'semantic.accentBright',
      mode: 'light',
      from: '#866010',
      to: '#866010',
      exception: false,
    },
  ];
  const { text, count } = applyDrift(src, drift);
  assert.equal(text, src);
  assert.equal(count, 1);
});

test('applyDrift targets only the matched line — a shared outgoing hex elsewhere is untouched', () => {
  const src =
    '"accentBright":   { "dark": "#e3c885", "light": "#8a6618", "use": "Hover state for accent." },\n' +
    '"attention":      { "dark": "#c4808a", "light": "#8a6618", "use": "Dusty rose." },\n';
  const drift = [
    {
      paletteKey: 'accentBright',
      tokenPath: 'semantic.accentBright',
      mode: 'light',
      from: '#8a6618',
      to: '#866010',
      exception: false,
    },
  ];
  const { text, count } = applyDrift(src, drift);
  assert.equal(count, 1);
  assert.match(text, /"accentBright":\s*{\s*"dark":\s*"#e3c885",\s*"light":\s*"#866010"/);
  // attention's #8a6618 must survive untouched
  assert.match(text, /"attention":\s*{\s*"dark":\s*"#c4808a",\s*"light":\s*"#8a6618"/);
});

test('applyDrift patches both modes of one token entry in a single run', () => {
  const src = '"accentBright":   { "dark": "#111111", "light": "#8a6618", "use": "Hover state for accent." },\n';
  const drift = [
    {
      paletteKey: 'accentBright',
      tokenPath: 'semantic.accentBright',
      mode: 'dark',
      from: '#111111',
      to: '#e3c885',
      exception: false,
    },
    {
      paletteKey: 'accentBright',
      tokenPath: 'semantic.accentBright',
      mode: 'light',
      from: '#8a6618',
      to: '#866010',
      exception: false,
    },
  ];
  const { text, count } = applyDrift(src, drift);
  assert.equal(count, 2);
  assert.match(text, /"accentBright":\s*{\s*"dark":\s*"#e3c885",\s*"light":\s*"#866010"/);
});

test('applyDrift throws when zero patch sites are found', () => {
  const src = '"accentBright": { "dark": "#e3c885", "light": "#ffffff", "use": "hover" }\n';
  const drift = [
    {
      paletteKey: 'accentBright',
      tokenPath: 'semantic.accentBright',
      mode: 'light',
      from: '#8a6618', // wrong "from" — not present in src
      to: '#866010',
      exception: false,
    },
  ];
  assert.throws(() => applyDrift(src, drift), /expected exactly one patch site.*found 0/);
});

test('applyDrift throws when more than one patch site matches (ambiguous — refuses to guess)', () => {
  const src =
    '"accentBright": { "dark": "#e3c885", "light": "#8a6618", "use": "one" }\n' +
    '"accentBright": { "dark": "#111111", "light": "#8a6618", "use": "duplicate leaf, hypothetically" }\n';
  const drift = [
    {
      paletteKey: 'accentBright',
      tokenPath: 'semantic.accentBright',
      mode: 'light',
      from: '#8a6618',
      to: '#866010',
      exception: false,
    },
  ];
  assert.throws(() => applyDrift(src, drift), /expected exactly one patch site.*found 2/);
});
