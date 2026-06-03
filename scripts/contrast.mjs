#!/usr/bin/env node
// WCAG 2.x contrast ratio with correct sRGB linearization.
// The math humans (and LLMs) get wrong by eyeballing — see the 1.7× miscalc
// recorded in project memory. Use THIS, don't estimate.
//
// Usage:
//   node scripts/contrast.mjs "#e0b558" "#292c33"          one pair
//   node scripts/contrast.mjs "#fg1" "#bg" "#fg2" "#bg"    many pairs (args in twos)
//   echo '[["#fg","#bg","label"],…]' | node scripts/contrast.mjs --json
//
// Verdicts use the WCAG 2.2 floors: text AA 4.5, AA-large 3.0, AAA 7.0;
// non-text/UI (1.4.11) 3.0.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`bad hex: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function verdicts(r) {
  const mark = (pass) => (pass ? 'PASS' : 'FAIL');
  return [
    `text-AA ${r >= 4.5 ? 'PASS' : 'FAIL'}`,
    `text-AAA ${r >= 7 ? 'PASS' : 'FAIL'}`,
    `large-AA ${r >= 3 ? 'PASS' : 'FAIL'}`,
    `ui-1.4.11 ${r >= 3 ? 'PASS' : 'FAIL'}`,
  ].join('  ');
}

function row(fg, bg, label) {
  const r = contrast(fg, bg);
  const tag = label ? `  ${label}` : '';
  return `${fg} on ${bg}  →  ${r.toFixed(2)}:1   ${verdicts(r)}${tag}`;
}

// CLI entrypoint — only when run directly, so importing for tests doesn't fire.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--json') {
    const pairs = JSON.parse(readFileSync(0, 'utf8'));
    for (const [fg, bg, label] of pairs) console.log(row(fg, bg, label));
  } else if (argv.length >= 2) {
    if (argv.length % 2 !== 0) {
      console.error('usage: pairs of "#fg" "#bg" — got an odd number of colors');
      process.exit(1);
    }
    for (let i = 0; i + 1 < argv.length; i += 2) console.log(row(argv[i], argv[i + 1]));
  } else {
    console.error('usage: node scripts/contrast.mjs "#fg" "#bg" [ "#fg2" "#bg2" … ]');
    process.exit(1);
  }
}
