#!/usr/bin/env node
// Artificer Hard rule #1 linter — flags raw values in hand-authored CSS that
// have a token equivalent. Scans for:
//   - raw hex colors (any), and
//   - on-scale spacing/radius px that maps to a token (4/8/16/24/32/48/96, radius 4/8/12)
// OUTSIDE custom-property definitions and comments. Off-scale px (6/10/14/…) is
// skipped — the system tolerates it where no token exists (see docs/lane-1-feedback.md).
//
// Rule #1 precision pass (v0.9.0): component-internal padding may be a tuned
// literal — a button's 10px 20px, a badge's 2px 8px. Mark intentional
// literals with a trailing `/* tuned */` comment and the linter will skip
// them. See CLAUDE.md "Hard rules" for the reworded rule.
//
// Font-size watch (#187, armed by the #211 root re-true): raw font-size px
// within ±2px of a --t-*-size token is near-scale drift (the 24px stat value
// sitting beside the 22px headline token) — flagged with the nearest token.
// Exact matches flag too: the token exists, and rem-bound type honors the
// browser font-size preference where a px literal doesn't (the labels are
// true now — html is never overridden). The Obsidian sister theme
// (theme.src.css) is exempt: its type contract is its own (Lane 2), not the
// repo scale. `/* tuned */` exempts a line here the same as for spacing.
//
// Modes:
//   node scripts/lint-css-tokens.mjs <file.css> ...   lint files (CI / audit)
//   node scripts/lint-css-tokens.mjs --stdin [label]   lint a CSS snippet from stdin
//                                                       (used by the PostToolUse hook)
// Exit 0: clean.   Exit 2: violations found (message on stderr).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SPACING_TOKEN = { 4: '--s-xs', 8: '--s-sm', 16: '--s-md', 24: '--s-lg', 32: '--s-xl', 48: '--s-2xl', 96: '--s-3xl' };
const RADIUS_TOKEN = { 4: '--radius-sm', 8: '--radius-md', 12: '--radius-lg' };
// Repo type scale in px (artificer.css --t-*-size definitions; rem labels are
// true — the root is never overridden, #211).
const TYPE_TOKEN_PX = [
  [28, '--t-headline-lg-size'], [22, '--t-headline-md-size'], [16, '--t-body-lg-size'],
  [14, '--t-body-md-size'], [13, '--t-label-md-size'], [12, '--t-label-sm-size'],
  [11, '--t-label-xs-size'],
];
const HEX = /#[0-9a-fA-F]{3,8}\b/;
// property declaration → captures prop name and its value (single declaration, no braces)
const DECL = /\b(gap|padding|margin|border-radius)\b[^;{}]*?:\s*([^;{}]+)/g;
const FONT_DECL = /\bfont-size\b\s*:\s*([^;{}]+)/g;
// Sheets whose type contract is NOT the repo scale — the Lane 2 Obsidian sister.
const FONT_SCALE_EXEMPT = /theme\.src\.css$/;

function nearestTypeToken(px) {
  let best = null;
  for (const [tpx, tok] of TYPE_TOKEN_PX) {
    const d = Math.abs(px - tpx);
    if (d <= 2 && (!best || d < best.d)) best = { d, tok, tpx };
  }
  return best;
}

export function lintText(text, { fontScale = true } = {}) {
  const out = [];
  let inComment = false;

  text.split('\n').forEach((line, i) => {
    // Rule #1 escape valve: explicit /* tuned */ marker exempts a line from
    // scale-token enforcement (component-internal padding, tuned optical values).
    if (line.includes('/* tuned */')) return;
    let scan = line;
    if (inComment) {
      const end = scan.indexOf('*/');
      if (end === -1) return;
      scan = scan.slice(end + 2);
      inComment = false;
    }
    scan = scan.replace(/\/\*.*?\*\//g, '');
    const open = scan.indexOf('/*');
    if (open !== -1) { inComment = true; scan = scan.slice(0, open); }

    // custom-property DEFINITIONS are where raw values belong — skip
    if (/^\s*--[\w-]+\s*:/.test(scan)) return;

    // raw hex in a value (declarations only)
    if (scan.includes(':')) {
      const hex = scan.slice(scan.indexOf(':') + 1).match(HEX);
      if (hex) out.push({ n: i + 1, msg: `raw hex ${hex[0]} → define/use a color token`, src: line.trim() });
    }

    // on-scale spacing/radius px → suggest the token
    for (const m of scan.matchAll(DECL)) {
      const prop = m[1];
      const map = prop === 'border-radius' ? RADIUS_TOKEN : SPACING_TOKEN;
      for (const px of m[2].matchAll(/(\d+)px/g)) {
        const tok = map[Number(px[1])];
        if (tok) out.push({ n: i + 1, msg: `${px[1]}px in ${prop} → var(${tok})`, src: line.trim() });
      }
    }

    // near-scale font-size px → suggest the nearest type token (#187)
    if (fontScale) {
      for (const m of scan.matchAll(FONT_DECL)) {
        for (const px of m[1].matchAll(/(\d+(?:\.\d+)?)px/g)) {
          const hit = nearestTypeToken(Number(px[1]));
          if (hit) {
            const off = hit.d ? ` (${hit.tpx}px scale, ${hit.d}px off)` : '';
            out.push({ n: i + 1, msg: `${px[1]}px in font-size → var(${hit.tok})${off}`, src: line.trim() });
          }
        }
      }
    }
  });
  return out;
}

function report(label, v) {
  console.error(`⚠ Artificer Hard rule #1 — raw values in ${label} (use tokens; see CLAUDE.md "Token cheatsheet"):`);
  for (const x of v.slice(0, 10)) console.error(`    L${x.n}  ${x.msg}\t${x.src}`);
  if (v.length > 10) console.error(`    …and ${v.length - 10} more`);
}

// CLI entrypoint — only when run directly, so importing for tests doesn't fire.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let total = 0;

  if (args[0] === '--stdin') {
    const label = args[1] || 'edited content';
    const text = readFileSync(0, 'utf8');
    const v = lintText(text, { fontScale: !FONT_SCALE_EXEMPT.test(label) });
    if (v.length) { report(label, v); total = v.length; }
  } else {
    for (const file of args) {
      let text;
      try { text = readFileSync(file, 'utf8'); } catch { continue; }
      const v = lintText(text, { fontScale: !FONT_SCALE_EXEMPT.test(file) });
      if (v.length) { report(file.replace(process.cwd() + '/', ''), v); total += v.length; }
    }
  }
  process.exit(total ? 2 : 0);
}
