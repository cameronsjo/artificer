#!/usr/bin/env node
// Values-only tokens.json sync (#60). themes/_palette.json is Lane 1's canonical
// palette (CLAUDE.md § Encapsulation); src/tokens.json is a hand-authored mirror
// that also carries structure (typography/spacing/motion/…) the palette doesn't
// have. This script syncs ONLY the color VALUES that both files agree map to the
// same semantic token — it does not generate tokens.json, does not add or remove
// keys, and does not touch anything outside color.*.
//
// Mapping is explicit (NAME_MAP) rather than inferred: most palette keys land in
// tokens.json under the same name in a different category object; one is a
// deliberate rename (brandPurpleDeep → brandPurpleFill). Keys that exist on only
// one side are documented in PALETTE_ONLY / TOKENS_ONLY so the totality guard
// (sync-tokens.test.mjs) can assert every key is accounted for somewhere.
//
// The one standing exception is brandPurple:dark — ADR 0014
// (docs/decisions/0014-brandpurple-surface-split.md) rules the web value
// (#5a3a9a, decorative) a deliberate divergence from the palette's terminal-fg
// value (#9070d0). The sync skips it; the gate treats it as expected, not drift.
//
// Usage:
//   node scripts/sync-tokens.mjs           write mode — patch src/tokens.json values
//   node scripts/sync-tokens.mjs --check   gate mode — exit 1 listing any drift (CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);

// palette key → where it lands in tokens.json's `color` object, and its shape.
//   'dual'  — palette[mode][key] → tokens.color[category][tokenKey][mode]
//   'value' — palette.dark[key] (== palette.light[key]) → tokens.color[category][tokenKey].value
export const NAME_MAP = {
  // surface
  bg: { path: ['surface', 'bg'], shape: 'dual' },
  bgRaised: { path: ['surface', 'bgRaised'], shape: 'dual' },
  bgOverlay: { path: ['surface', 'bgOverlay'], shape: 'dual' },
  bgInactive: { path: ['surface', 'bgInactive'], shape: 'dual' },
  // fg
  fg: { path: ['fg', 'fg'], shape: 'dual' },
  fgSecondary: { path: ['fg', 'fgSecondary'], shape: 'dual' },
  fgMuted: { path: ['fg', 'fgMuted'], shape: 'dual' },
  fgDisabled: { path: ['fg', 'fgDisabled'], shape: 'dual' },
  border: { path: ['fg', 'border'], shape: 'dual' },
  borderLifted: { path: ['fg', 'borderLifted'], shape: 'dual' },
  // semantic
  accent: { path: ['semantic', 'accent'], shape: 'dual' },
  accentBright: { path: ['semantic', 'accentBright'], shape: 'dual' },
  accentFill: { path: ['semantic', 'accentFill'], shape: 'dual' },
  attention: { path: ['semantic', 'attention'], shape: 'dual' },
  attentionFill: { path: ['semantic', 'attentionFill'], shape: 'dual' },
  urgent: { path: ['semantic', 'urgent'], shape: 'dual' },
  urgentText: { path: ['semantic', 'urgentText'], shape: 'dual' },
  success: { path: ['semantic', 'success'], shape: 'dual' },
  successFill: { path: ['semantic', 'successFill'], shape: 'dual' },
  steel: { path: ['semantic', 'steel'], shape: 'dual' },
  steelFill: { path: ['semantic', 'steelFill'], shape: 'dual' },
  diffAddBg: { path: ['semantic', 'diffAddBg'], shape: 'dual' },
  diffDelBg: { path: ['semantic', 'diffDelBg'], shape: 'dual' },
  // brand — brandPurpleDeep is a deliberate rename (tokens calls it "Fill")
  brandPurple: { path: ['brand', 'brandPurple'], shape: 'dual' },
  brandPurpleDeep: { path: ['brand', 'brandPurpleFill'], shape: 'dual' },
  brandPurpleBright: { path: ['brand', 'brandPurpleBright'], shape: 'dual' },
  // anchor — mode-agnostic single value
  ink: { path: ['anchor', 'ink'], shape: 'value' },
  ivory: { path: ['anchor', 'ivory'], shape: 'value' },
};

// palette[mode][key]:mode pairs the sync intentionally skips — treated as
// expected divergence, not drift, in both write and --check modes.
export const EXCEPTIONS = new Set([
  'brandPurple:dark', // ADR 0014 — web decorative #5a3a9a vs terminal-fg #9070d0
]);

// Palette keys with no tokens.json counterpart — the palette carries ANSI /
// syntax-role / diff-word-level detail tokens.json doesn't need. Documented so
// the totality guard doesn't flag them as an unmapped gap.
export const PALETTE_ONLY = new Set([
  'ansiBlack',
  'ansiBrightBlack', // terminal ANSI-8, split off fgDisabled (ADR 0036) — terminal-only, no CSS var
  'terminalBg',      // the terminal's elevation (ADR 0036) — a terminal fact, not a web surface
  'bgFloat',         // 4th elevation rung, currently terminal-only (Claude Code chip hover). If the web ever needs a float surface, promote it to a tokens.json leaf + --bg-float.
  'selectionFill', // terminal selection fill (v0.20.0, #278) — no --selection-fill CSS var, so no tokens.json leaf
  'attentionAlt',
  'urgentBright',
  'successBright',
  'steelBright',
  'cyan',
  'cyanBright',
  'diffAddDim',
  'diffAddWord',
  'diffDelDim',
  'diffDelWord',
]);

// tokens.json color leaves with no palette counterpart — derived/pointer values
// (urgentFill mirrors urgent; onColor.* are text-on-fill pairings; ivoryRaised
// has no palette entry). Documented so the totality guard doesn't flag them.
export const TOKENS_ONLY = new Set([
  'semantic.urgentFill',
  'anchor.ivoryRaised',
  'onColor.onAccent',
  'onColor.onAttention',
  'onColor.onUrgent',
  'onColor.onSuccess',
]);

// Every non-$ key under palette.dark (palette.light carries the same key set).
export function paletteKeys(palette) {
  return Object.keys(palette.dark ?? {}).filter((k) => !k.startsWith('$'));
}

// Every leaf under tokens.color.<category>, as "category.leaf" strings.
export function tokenColorLeaves(tokens) {
  const out = [];
  for (const [category, obj] of Object.entries(tokens.color ?? {})) {
    if (!obj || typeof obj !== 'object') continue;
    for (const leaf of Object.keys(obj)) {
      if (leaf.startsWith('$')) continue;
      out.push(`${category}.${leaf}`);
    }
  }
  return out;
}

// Pure diff — no I/O. Compares palette values against tokens.json's parsed
// color object per NAME_MAP, honoring EXCEPTIONS.
export function tokenDrift(palette, tokens) {
  const drift = [];
  for (const [paletteKey, map] of Object.entries(NAME_MAP)) {
    const [category, tokenKey] = map.path;
    const entry = tokens.color?.[category]?.[tokenKey];
    if (!entry) {
      // A mapped path that doesn't resolve is a stale rename or typo in
      // NAME_MAP itself, not a benign gap — silently skipping it would leave
      // that key unmonitored forever (check:tokens stays green with nothing
      // to check). Fail loudly instead.
      throw new Error(
        `sync-tokens: NAME_MAP["${paletteKey}"] points at tokens.color.${category}.${tokenKey}, which doesn't exist — stale rename or typo in NAME_MAP?`,
      );
    }

    if (map.shape === 'dual') {
      for (const mode of ['dark', 'light']) {
        const paletteValue = palette[mode]?.[paletteKey];
        const tokenValue = entry[mode];
        if (paletteValue === undefined || tokenValue === undefined) continue;
        if (paletteValue === tokenValue) continue;
        drift.push({
          paletteKey,
          tokenPath: `${category}.${tokenKey}`,
          mode,
          from: tokenValue,
          to: paletteValue,
          exception: EXCEPTIONS.has(`${paletteKey}:${mode}`),
        });
      }
    } else {
      // 'value' — mode-agnostic; palette.dark carries the canonical value.
      // That's only sound if the palette itself agrees dark == light for this
      // key — assert it rather than silently trusting dark.
      const darkValue = palette.dark?.[paletteKey];
      const lightValue = palette.light?.[paletteKey];
      if (darkValue !== undefined && lightValue !== undefined && darkValue !== lightValue) {
        throw new Error(
          `sync-tokens: "${paletteKey}" is mapped shape 'value' (mode-agnostic) but palette dark (${darkValue}) and light (${lightValue}) disagree — remap it as shape 'dual', or fix the palette`,
        );
      }
      const paletteValue = darkValue;
      const tokenValue = entry.value;
      if (paletteValue === undefined || tokenValue === undefined) continue;
      if (paletteValue === tokenValue) continue;
      drift.push({
        paletteKey,
        tokenPath: `${category}.${tokenKey}`,
        mode: 'value',
        from: tokenValue,
        to: paletteValue,
        exception: EXCEPTIONS.has(`${paletteKey}:value`),
      });
    }
  }
  return drift;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Byte-preserving patch: locate each non-exception drift's line by its quoted
// token key + mode field (on the SAME line — this is what disambiguates a leaf
// like "fg" from its enclosing category "fg": { …), then replace only the
// matched hex. Never JSON.parse+stringify the whole file (destroys formatting);
// never a global hex replace (the outgoing hex can appear elsewhere, e.g.
// accentBright's outgoing light value also appears on attention's light entry).
//
// The regex is scoped by leaf key name only, not by category — today there are
// zero duplicate leaf names across tokens.color's categories (see the totality
// tests), so this can't yet misfire. If that ever changes, a coincidentally
// matching stale hex on the wrong category's same-named leaf would be a silent
// mispatch — guarded against by requiring EXACTLY ONE match site; 0 or >1
// throws rather than guessing.
export function applyDrift(text, driftList) {
  let out = text;
  let count = 0;
  for (const d of driftList) {
    if (d.exception) continue;
    const [, tokenKey] = d.tokenPath.split('.');
    const modeField = d.mode === 'value' ? 'value' : d.mode;
    const re = new RegExp(
      `("${escapeRe(tokenKey)}":\\s*\\{[^}\\n]*?"${modeField}":\\s*")${escapeRe(d.from)}(")`,
      'g',
    );
    const matches = [...out.matchAll(re)];
    if (matches.length !== 1) {
      throw new Error(
        `sync-tokens: expected exactly one patch site for ${d.tokenPath} (${d.mode}), found ${matches.length} — expected "${tokenKey}" … "${modeField}": "${d.from}" on exactly one line`,
      );
    }
    out = out.replace(re, `$1${d.to}$2`);
    count++;
  }
  return { text: out, count };
}

function run({ check }) {
  const palette = JSON.parse(readFileSync(new URL('themes/_palette.json', ROOT), 'utf8'));
  const tokensUrl = new URL('src/tokens.json', ROOT);
  const tokensRaw = readFileSync(tokensUrl, 'utf8');
  const tokens = JSON.parse(tokensRaw);

  const drift = tokenDrift(palette, tokens);
  const real = drift.filter((d) => !d.exception);

  if (check) {
    if (real.length === 0) {
      console.log('✓ tokens sync: src/tokens.json color values match themes/_palette.json');
      return 0;
    }
    console.error('✖ tokens.json color values drifted from themes/_palette.json:');
    for (const d of real) {
      console.error(`    ${d.paletteKey} (${d.mode}) → ${d.tokenPath} = ${d.from} → ${d.to}`);
    }
    console.error('\nRun `npm run sync:tokens` to fix.');
    return 1;
  }

  if (real.length === 0) {
    console.log('✓ tokens sync: src/tokens.json already matches themes/_palette.json');
    return 0;
  }

  const { text, count } = applyDrift(tokensRaw, real);
  writeFileSync(tokensUrl, text);
  console.log(`✓ synced ${count} value(s):`);
  for (const d of real) {
    console.log(`    ${d.paletteKey} (${d.mode}) → ${d.tokenPath} = ${d.from} → ${d.to}`);
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(run({ check: process.argv.includes('--check') }));
}
