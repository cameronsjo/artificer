import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintText } from './lint-css-tokens.mjs';

const msgs = (css) => lintText(css).map((v) => v.msg);

// Test Plan for scripts/lint-css-tokens.mjs
// lintText(text) (Classification: pure logic / input scanner)
//   [x] Happy: on-scale spacing px flagged with spacing token
//   [x] Happy: on-scale border-radius px flagged with radius token
//   [x] Happy: raw hex in a value flagged
//   [x] Happy: every on-scale px on a line reported
//   [x] Boundary: off-scale px (6/10/14) NOT flagged
//   [x] Boundary: hairline 1px/2px NOT flagged
//   [x] Exclusion: custom-property definitions NOT flagged
//   [x] Exclusion: values inside comments NOT flagged
//   [x] Boundary: empty input → no violations
//   [x] Scope: font-size is NOT watched (#187 deferred — root-font-size issue)

test('on-scale spacing px is flagged with the spacing token', () => {
  assert.deepEqual(msgs('.a{ padding: 16px; }'), ['16px in padding → var(--s-md)']);
});

test('on-scale border-radius px is flagged with the radius token', () => {
  assert.deepEqual(msgs('.a{ border-radius: 12px; }'), ['12px in border-radius → var(--radius-lg)']);
});

test('raw hex in a value is flagged', () => {
  const m = msgs('.a{ color: #aabbcc; }');
  assert.equal(m.length, 1);
  assert.match(m[0], /raw hex #aabbcc/);
});

test('every on-scale px on a line is reported', () => {
  assert.deepEqual(msgs('.a{ padding: 16px 24px; }'), [
    '16px in padding → var(--s-md)',
    '24px in padding → var(--s-lg)',
  ]);
});

test('off-scale px is not flagged (no token exists)', () => {
  assert.deepEqual(lintText('.a{ padding: 6px 10px; gap: 14px; }'), []);
});

test('hairline 1px / 2px values are not flagged', () => {
  assert.deepEqual(lintText('.a{ padding: 2px; border-radius: 1px; }'), []);
});

test('custom-property definitions are not flagged', () => {
  assert.deepEqual(lintText('  --s-md: 16px;\n  --accent: #e0b558;'), []);
});

test('values inside comments are not flagged', () => {
  assert.deepEqual(lintText('.a{ /* padding: 16px; color:#abcdef */ display: flex; }'), []);
});

test('empty input yields no violations', () => {
  assert.deepEqual(lintText(''), []);
});

// font-size watch (#187, armed by the #211 root re-true)
test('font-size: exact-token px is flagged with the token', () => {
  assert.deepEqual(msgs('.a{ font-size: 12px; }'), ['12px in font-size → var(--t-label-sm-size)']);
});

test('font-size: near-scale px flags the nearest token with the offset', () => {
  assert.deepEqual(msgs('.a{ font-size: 24px; }'), [
    '24px in font-size → var(--t-headline-md-size) (22px scale, 2px off)',
  ]);
});

test('font-size: px farther than 2 from every token is not flagged', () => {
  assert.deepEqual(lintText('.a{ font-size: 25px; } .b{ font-size: 8px; }'), []);
});

test('font-size: /* tuned */ exempts the line', () => {
  assert.deepEqual(lintText('.a{ font-size: 10px; /* tuned */ }'), []);
});

test('font-size: token-bound values are not flagged', () => {
  assert.deepEqual(lintText('.a{ font-size: var(--t-label-sm-size); }'), []);
});

test('font-size: fontScale:false disables the watch (Lane 2 sister sheet)', () => {
  assert.deepEqual(lintText('.a{ font-size: 12px; }', { fontScale: false }), []);
});
