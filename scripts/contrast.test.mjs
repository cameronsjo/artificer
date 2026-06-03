import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrast } from './contrast.mjs';

// Test Plan for scripts/contrast.mjs
// contrast(fg, bg) (Classification: pure logic)
//   [x] Happy: known reference ratios (black/white, AA-boundary grey)
//   [x] Happy: reproduces the palette's documented comment-token figure
//   [x] Boundary: identical colors → exactly 1:1
//   [x] Property: symmetric — contrast(a,b) === contrast(b,a)
//   [x] Happy: 3-digit shorthand equals its 6-digit expansion
//   [x] Unhappy: malformed hex throws

test('black on white is the canonical 21:1 maximum', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(2), '21.00');
});

test('#767676 on white is the famous AA-boundary 4.54:1', () => {
  assert.equal(contrast('#767676', '#ffffff').toFixed(2), '4.54');
});

test('reproduces the palette comment-token figure (fgMuted on editor bg)', () => {
  // Guards against the by-hand sRGB miscalc this utility exists to retire.
  assert.equal(contrast('#5a7a8a', '#292c33').toFixed(2), '3.05');
});

test('identical colors yield exactly 1:1', () => {
  assert.equal(contrast('#abcdef', '#abcdef'), 1);
});

test('is symmetric in fg/bg order (property)', () => {
  for (const [a, b] of [['#e0b558', '#292c33'], ['#fff', '#123'], ['#5fa073', '#000']]) {
    assert.equal(contrast(a, b), contrast(b, a));
  }
});

test('3-digit shorthand equals its 6-digit expansion', () => {
  assert.equal(contrast('#777', '#000'), contrast('#777777', '#000000'));
});

test('malformed hex throws', () => {
  assert.throws(() => contrast('#xyz', '#fff'), /bad hex/);
  assert.throws(() => contrast('not-a-color', '#fff'), /bad hex/);
});
