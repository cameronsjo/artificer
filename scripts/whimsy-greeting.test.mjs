import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test Plan for src/artificer-whimsy.js — the seasonal footer greeting helper.
// greetingFor(date, opts) is the PURE spec function; greeting(root) is the thin
// DOM glue (verified live in live-spec/whimsy.html pattern 09). The module
// attaches its API to globalThis (=== window in a browser), so this test
// imports it for side-effect and exercises the REAL function — not a copy.
//
//   [x] June (month index 5) → "happy pride", full-attention class set
//       (wave + no-bob + vivid + underline + underline--on — the "clementine"
//       combo: per-char faceted gradient, frozen bob, bloom, latched rule)
//   [x] "happy pride" carries NO trailing period (Cameron's explicit string)
//   [x] Non-June → default line + whimsy--glacial
//   [x] opts.default honored off-season; pride branch ignores it
//   [x] opts.defaultClass override honored off-season
//   [x] every month names its season (June pride, all others default)
//   [x] omitted/null date defaults to today (no throw, resolves a valid season)

import '../src/artificer-whimsy.js';
const { greetingFor } = globalThis.Whimsy;

test('June (month 5) is Pride: "happy pride" with the full-attention class set', () => {
  const spec = greetingFor(new Date(2026, 5, 15));
  assert.equal(spec.season, 'pride');
  assert.equal(spec.text, 'happy pride');
  // the "clementine" combo, latched on: base flow + per-char faceted gradient
  // (wave) with the bob frozen + vivid bloom + the rainbow rule drawn in.
  for (const cls of ['whimsy', 'whimsy--wave', 'whimsy--no-bob',
                     'whimsy--vivid', 'whimsy-underline', 'whimsy-underline--on']) {
    assert.ok(spec.classes.includes(cls), `pride spec carries ${cls}`);
  }
});

test('the pride line carries no trailing period', () => {
  const spec = greetingFor(new Date(2026, 5, 1));
  assert.equal(spec.text.endsWith('.'), false);
});

test('non-June falls back to the default line + glacial flow', () => {
  const spec = greetingFor(new Date(2026, 6, 4)); // July
  assert.equal(spec.season, 'default');
  assert.equal(spec.text, 'kindness is a choice');
  assert.ok(spec.classes.includes('whimsy'));
  assert.ok(spec.classes.includes('whimsy--glacial'));
});

test('opts.default is honored off-season', () => {
  const spec = greetingFor(new Date(2026, 0, 9), { default: 'a custom line' });
  assert.equal(spec.text, 'a custom line');
});

test('the pride branch ignores opts.default', () => {
  const spec = greetingFor(new Date(2026, 5, 20), { default: 'a custom line' });
  assert.equal(spec.text, 'happy pride');
});

test('opts.defaultClass overrides the off-season whimsy class', () => {
  const spec = greetingFor(new Date(2026, 10, 30), { defaultClass: 'whimsy--brand' });
  assert.ok(spec.classes.includes('whimsy--brand'));
  assert.ok(!spec.classes.includes('whimsy--glacial'));
});

test('a hostile defaultClass falls back to whimsy--glacial and never throws (#325 security fold)', () => {
  // Regression: greeting() now re-scans on every DOM mutation (autoInit ->
  // observe()), so a data-whimsy-greeting-class attribute reaches classList.add()
  // for nodes mounted after first paint, not just at load. A non-token value
  // (spaces, extra classes, arbitrary strings) must never be promoted verbatim.
  for (const hostile of ['a b', 'not-whimsy-prefixed', 'whimsy--ok evil-class', '', 'WHIMSY--CAPS']) {
    const spec = greetingFor(new Date(2026, 0, 9), { defaultClass: hostile });
    assert.ok(spec.classes.includes('whimsy--glacial'), `hostile value ${JSON.stringify(hostile)} falls back to whimsy--glacial`);
    assert.equal(spec.classes.length, 2, 'exactly one extra class beyond "whimsy" — no injected extras');
  }
});

test('every month resolves a season — only June is pride', () => {
  for (let m = 0; m < 12; m++) {
    const spec = greetingFor(new Date(2026, m, 15));
    assert.equal(spec.season, m === 5 ? 'pride' : 'default');
  }
});

test('omitted/null date defaults to today and resolves a valid season', () => {
  for (const arg of [undefined, null]) {
    const spec = greetingFor(arg);
    assert.ok(['pride', 'default'].includes(spec.season), `season for ${arg}`);
    assert.ok(spec.classes.includes('whimsy'));
  }
});

// ---------------------------------------------------------------------------
// Regression: detached rAF/setTimeout call in observe() (issue #102)
// The observe() scheduler helper must call requestAnimationFrame (or
// setTimeout) with the window object as the receiver.  Reproduced here
// with a fake window — same shape as the icons regression tests.
// ---------------------------------------------------------------------------

test('whimsy schedule helper calls requestAnimationFrame with window as receiver', () => {
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

test('whimsy schedule helper falls back to setTimeout with window as receiver', () => {
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
