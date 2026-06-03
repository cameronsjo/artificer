#!/usr/bin/env node
// Palette-drift lint (#61). Complements lint-css-tokens.mjs: that flags raw hex
// in component VALUES (use a token); this flags any hex literal — including token
// DEFINITIONS (`--accent: #…`) — that has drifted from themes/_palette.json.
// Comments are stripped first, so the header palette-history block is ignored.
//
// Intentional non-palette hexes go in ALLOWLIST with a tracking issue (or a
// ruling). The Whimsy layer (src/artificer-whimsy.css) is the sanctioned
// raw-color exception and is NOT scanned here.
//
// Usage:
//   node scripts/lint-css-palette.mjs                  lint src + live-spec artificer.css
//   node scripts/lint-css-palette.mjs <file.css> ...   lint specific files
// Exit 0: clean.   Exit 2: drift found (message on stderr).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

// Intentional hexes that are NOT palette values. Each MUST cite a tracking issue
// or a ruling.
//   #5a3a9a — web `--brand-purple`: the DECORATIVE value (chart series-3 fill,
//             .whimsy--brand gradient stop, outlines — never text). The palette
//             token brandPurple = #9070d0 is the FOREGROUND value (ANSI 5 magenta
//             + Claude Code accents). Same hue, two jobs by surface — RULED
//             intentional, not drift (owner, 2026-05-31). See _palette.json
//             $notes.brandPurpleSurfaceSplit + brandpurple-answer-key.md § Scope.
//   (#e0b558 was the orphan retired gold for --attention-fill; v0.10.2 homed it in
//    the palette as attentionFill light #dbbb6f, so it is no longer allowlisted.)
export const ALLOWLIST = new Set(['#5a3a9a']);

// Collect every hex-valued string under palette.dark / palette.light (lowercased).
function collectHexes(node, out) {
  if (typeof node === 'string') {
    if (/^#[0-9a-fA-F]{3,8}$/.test(node)) out.add(node.toLowerCase());
    return;
  }
  if (node && typeof node === 'object') for (const v of Object.values(node)) collectHexes(v, out);
}

export function paletteHexSet(palette) {
  const out = new Set();
  collectHexes(palette.dark, out);
  collectHexes(palette.light, out);
  return out;
}

// Blank out /* … */ comments while preserving line structure (so line numbers hold).
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

export function lintCssPalette(text, paletteHexes, allowlist = ALLOWLIST) {
  const out = [];
  stripComments(text)
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(HEX)) {
        const hex = m[0].toLowerCase();
        if (paletteHexes.has(hex) || allowlist.has(hex)) continue;
        out.push({ line: i + 1, hex: m[0], src: line.trim() });
      }
    });
  return out;
}

function report(label, v) {
  console.error(`⚠ palette drift in ${label} — hex literal(s) not in themes/_palette.json:`);
  for (const x of v.slice(0, 10)) console.error(`    L${x.line}  ${x.hex}\t${x.src}`);
  if (v.length > 10) console.error(`    …and ${v.length - 10} more`);
  console.error(
    '  → make it a palette value, or (intentional) add it to ALLOWLIST with a tracking issue.',
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const files = args.length
    ? args
    : [
        new URL('../src/artificer.css', import.meta.url),
        new URL('../live-spec/artificer.css', import.meta.url),
      ];
  const palette = JSON.parse(
    readFileSync(new URL('../themes/_palette.json', import.meta.url), 'utf8'),
  );
  const hexes = paletteHexSet(palette);
  let total = 0;
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const v = lintCssPalette(text, hexes);
    if (v.length) {
      report(String(file).replace(`file://${process.cwd()}/`, ''), v);
      total += v.length;
    }
  }
  if (total === 0) console.log('✓ palette drift: every CSS hex is a palette value (or allowlisted)');
  process.exit(total ? 2 : 0);
}
