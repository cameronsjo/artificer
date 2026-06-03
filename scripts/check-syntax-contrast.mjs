#!/usr/bin/env node
// CI gate: every $roles.syntax binding must clear its WCAG floor on the surface
// it paints against. Catches the brandPurple class of bug (#59) at commit time —
// the value looked plausible; its CONTRAST on bg did not. See issue #62.
//
// Thresholds are Lane 1's (issue #62 catalog + CLAUDE.md v0.7.1/v0.7.2); CI is Lane 3.
//   plain syntax foreground ............ 4.5  (WCAG AA)
//   reinforced (tag, invalid) .......... 3.0  ($notes.syntaxAALarge intent)
//   muted metadata (comment, operator) . 3.0  (binds --fg-muted, intentionally dim)
//
// Per $notes.ruleHexWithoutRatio: measured with scripts/contrast.mjs, never eyeballed.
//
// Usage:
//   node scripts/check-syntax-contrast.mjs            gate themes/_palette.json
//   node scripts/check-syntax-contrast.mjs path.json  gate a specific palette
// Exits non-zero, listing each failing role/mode/surface + measured ratio + floor.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrast } from './contrast.mjs';

// Lane 1 threshold catalog (issue #62). 4.5 = WCAG AA plain foreground.
// 3.0 carve: tag/invalid are visually reinforced; comment/operator bind --fg-muted
// (intentionally dim metadata, ~3.05:1). See CLAUDE.md v0.7.1/v0.7.2.
export const SYNTAX_THRESHOLDS = {
  keyword: 4.5,
  string: 4.5,
  type: 4.5,
  constant: 4.5,
  function: 4.5,
  namespace: 4.5,
  parameter: 4.5,
  variable: 4.5,
  comment: 3.0,
  operator: 3.0,
  tag: 3.0,
  invalid: 3.0,
};

// Pre-existing sub-AA debt the gate tolerates, keyed "role:mode". Each entry MUST
// cite a tracking issue. Allowlisted roles are still held to HARD_FLOOR, so an
// exception can't silently rot into total illegibility.
//   (empty since v0.10.2 — #99 raised light accentBright #8a6618 → #866010, so
//    type:light now clears the full 4.5 AA floor and needs no exception.)
export const KNOWN_SUB_AA = new Set();

// No binding — allowlisted or not — may drop below this.
export const HARD_FLOOR = 3.0;

// The surface each mode's syntax paints against (issue #62: bg dark / ivory light).
const SURFACE = { dark: 'bg', light: 'ivory' };

export function checkSyntaxContrast(palette, { allowlist = KNOWN_SUB_AA } = {}) {
  const roles = palette?.['$roles']?.syntax ?? {};
  const failures = [];
  for (const [role, bind] of Object.entries(roles)) {
    const floor = SYNTAX_THRESHOLDS[role];
    if (floor === undefined) continue; // role not in the gated catalog
    for (const mode of ['dark', 'light']) {
      const fg = palette[mode]?.[bind];
      const bg = palette[mode]?.[SURFACE[mode]];
      if (!fg || !bg) continue;
      const ratio = contrast(fg, bg);
      const allowlisted = allowlist.has(`${role}:${mode}`);
      const threshold = allowlisted ? HARD_FLOOR : floor;
      if (ratio < threshold) {
        failures.push({
          role,
          mode,
          bind,
          surface: SURFACE[mode],
          fg,
          bg,
          ratio: Number(ratio.toFixed(4)),
          threshold,
          allowlisted,
        });
      }
    }
  }
  return failures;
}

function report(failures) {
  if (failures.length === 0) {
    console.log('✓ syntax contrast: every $roles.syntax binding clears its WCAG floor');
    return 0;
  }
  console.error(`✖ syntax contrast: ${failures.length} binding(s) below floor\n`);
  for (const f of failures) {
    const tag = f.allowlisted ? '  [allowlisted — but below the 3.0 HARD FLOOR]' : '';
    console.error(
      `  ${f.role} (${f.mode}) → ${f.bind} = ${f.fg} on ${f.surface} ${f.bg}` +
        `  →  ${f.ratio}:1  (needs ${f.threshold}:1)${tag}`,
    );
  }
  console.error(
    '\nFix the binding value, or — pre-existing debt only — add "role:mode" to',
  );
  console.error(
    'KNOWN_SUB_AA with a tracking issue. A hex without a ratio is not a decision.',
  );
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ?? new URL('../themes/_palette.json', import.meta.url);
  const palette = JSON.parse(readFileSync(path, 'utf8'));
  process.exit(report(checkSyntaxContrast(palette)));
}
