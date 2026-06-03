import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkSyntaxContrast,
  SYNTAX_THRESHOLDS,
  KNOWN_SUB_AA,
  HARD_FLOOR,
} from './check-syntax-contrast.mjs';

// Test Plan for scripts/check-syntax-contrast.mjs
// checkSyntaxContrast(palette) — resolves $roles.syntax bindings and gates contrast
//   [x] Happy: current canonical passes (type:light is the one allowlisted exception)
//   [x] Regression: historical brandPurple keyword values (#7050b8, #9070d0) fail
//   [x] Catalog: reinforced/muted carve roles floored at 3.0, plain foreground at 4.5
//   [x] Allowlist: the accentBright-light exception (#99) is present
//   [x] Allowlist safety: an allowlisted role still fails below the 3.0 hard floor

const palette = JSON.parse(
  readFileSync(new URL('../themes/_palette.json', import.meta.url), 'utf8'),
);

const withToken = (mode, token, hex) => {
  const p = structuredClone(palette);
  p[mode][token] = hex;
  return p;
};

test('current canonical passes — nothing allowlisted (v0.10.2 cleared type:light)', () => {
  const failures = checkSyntaxContrast(palette);
  assert.deepEqual(failures, [], `expected zero failures, got ${JSON.stringify(failures)}`);
});

test('catches the historical brandPurple keyword regression (#7050b8 = 2.35:1)', () => {
  const failures = checkSyntaxContrast(withToken('dark', 'brandPurpleBright', '#7050b8'));
  assert.ok(
    failures.some((f) => f.role === 'keyword' && f.mode === 'dark'),
    'keyword/dark must fail at 2.35:1',
  );
});

test('catches the #59 Option-A lift (#9070d0 = 3.60:1, still sub-AA for a non-reinforced keyword)', () => {
  const failures = checkSyntaxContrast(withToken('dark', 'brandPurpleBright', '#9070d0'));
  assert.ok(failures.some((f) => f.role === 'keyword' && f.mode === 'dark'));
});

test('threshold catalog: plain foreground at 4.5, reinforced/muted carve at 3.0', () => {
  assert.equal(SYNTAX_THRESHOLDS.keyword, 4.5);
  assert.equal(SYNTAX_THRESHOLDS.type, 4.5);
  assert.equal(SYNTAX_THRESHOLDS.tag, 3.0); // reinforced
  assert.equal(SYNTAX_THRESHOLDS.invalid, 3.0); // reinforced
  assert.equal(SYNTAX_THRESHOLDS.comment, 3.0); // fgMuted metadata
  assert.equal(SYNTAX_THRESHOLDS.operator, 3.0); // fgMuted metadata
});

test('the #99 fix cleared the only KNOWN_SUB_AA entry (type:light)', () => {
  assert.ok(!KNOWN_SUB_AA.has('type:light'));
  assert.equal(KNOWN_SUB_AA.size, 0);
});

test('an allowlisted role still fails below the 3.0 hard floor', () => {
  // Even if type:light were allowlisted, a near-ivory hue (~1.1:1) must still fail.
  const failures = checkSyntaxContrast(withToken('light', 'accentBright', '#e8d8b8'), {
    allowlist: new Set(['type:light']),
  });
  assert.ok(
    failures.some((f) => f.role === 'type' && f.mode === 'light'),
    'an allowlisted role must still fail when it drops below the 3.0 hard floor',
  );
  assert.ok(HARD_FLOOR === 3.0);
});
