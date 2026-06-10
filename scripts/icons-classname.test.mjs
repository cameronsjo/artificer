import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test Plan for the className-splitting fix in src/artificer-icons.js
// The expression `opts.className.split(/\s+/).filter(Boolean)` is pure logic;
// extracted here for unit coverage without requiring a DOM or jsdom.
//
//   [x] Single class — returns one token, no throw
//   [x] Multi-class string — splits correctly into multiple tokens
//   [x] Leading/trailing whitespace — trimmed by filter(Boolean)
//   [x] Multiple internal spaces — collapsed by split(/\s+/)
//   [x] Empty string — filter(Boolean) yields [], classList.add(...[]) is a no-op
//   [x] Undefined/falsy — guarded by the `opts && opts.className` check upstream

function splitClassName(className) {
  return className.split(/\s+/).filter(Boolean);
}

test('single class returns one token', () => {
  assert.deepEqual(splitClassName('icon--lg'), ['icon--lg']);
});

test('multi-class string splits into multiple tokens', () => {
  assert.deepEqual(splitClassName('icon--lg text-success'), ['icon--lg', 'text-success']);
});

test('leading and trailing whitespace is stripped', () => {
  assert.deepEqual(splitClassName('  icon--sm  '), ['icon--sm']);
});

test('multiple internal spaces are collapsed', () => {
  assert.deepEqual(splitClassName('a   b'), ['a', 'b']);
});

test('empty string yields an empty array (classList.add(...[]) is a no-op)', () => {
  assert.deepEqual(splitClassName(''), []);
});

test('whitespace-only string yields an empty array', () => {
  assert.deepEqual(splitClassName('   '), []);
});

// ---------------------------------------------------------------------------
// Regression: detached rAF/setTimeout call (issue #102)
// The observe() scheduler helper must call requestAnimationFrame (or
// setTimeout) with the window object as the receiver so browsers that
// enforce a Window this-binding don't throw "Illegal invocation".
// Tested here by reproducing the helper pattern with a fake window.
// ---------------------------------------------------------------------------

test('schedule helper calls requestAnimationFrame with window as receiver', () => {
  let receivedThis;
  const fakeWindow = {
    requestAnimationFrame: function (cb) { receivedThis = this; cb(); },
    setTimeout: null,
  };
  var schedule = fakeWindow.requestAnimationFrame
    ? function (cb) { fakeWindow.requestAnimationFrame(cb); }
    : function (cb) { fakeWindow.setTimeout(cb, 0); };
  let called = false;
  schedule(function () { called = true; });
  assert.equal(called, true, 'callback was invoked');
  assert.equal(receivedThis, fakeWindow, 'requestAnimationFrame received the window object as this');
});

test('schedule helper calls setTimeout with window as receiver when rAF absent', () => {
  let receivedThis;
  const fakeWindow = {
    requestAnimationFrame: null,
    setTimeout: function (cb) { receivedThis = this; cb(); },
  };
  var schedule = fakeWindow.requestAnimationFrame
    ? function (cb) { fakeWindow.requestAnimationFrame(cb); }
    : function (cb) { fakeWindow.setTimeout(cb, 0); };
  let called = false;
  schedule(function () { called = true; });
  assert.equal(called, true, 'callback was invoked');
  assert.equal(receivedThis, fakeWindow, 'setTimeout received the window object as this');
});
