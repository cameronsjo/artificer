import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test Plan for src/artificer-tree.js — the WAI-ARIA APG tree keyboard model
// (#173 behavior-module follow-up; the .tabs/#92 precedent).
// nextVisible(key, current, count) is the pure vertical cursor (CLAMPED — an
// APG tree never wraps) and treeAction(key, {expanded, hasParent}) the pure
// horizontal/activation action table; the DOM wiring in enhance()/observe()
// is thin glue verified by tests/regressions/tree-keyboard.spec.mjs.
// The module attaches its API to globalThis (=== window in a browser), so this
// test imports it for side-effect and exercises the REAL functions — not copies.
//
//   [x] ArrowDown/ArrowUp clamp at both ends (never wrap)
//   [x] Home → 0, End → count-1
//   [x] Unhandled key → null; degenerate counts
//   [x] treeAction full matrix: ArrowRight/ArrowLeft × {open, closed, leaf}
//       × hasParent, Enter/Space → activate, everything else → null

import '../src/artificer-tree.js';
const { nextVisible, treeAction } = globalThis.ArtificerTree;

// ── nextVisible — clamped vertical movement ──────────────────────────────────

test('ArrowDown advances by one and clamps at the last visible item', () => {
  assert.equal(nextVisible('ArrowDown', 0, 4), 1);
  assert.equal(nextVisible('ArrowDown', 3, 4), 3); // clamped — APG tree never wraps
});

test('ArrowUp retreats by one and clamps at the first item', () => {
  assert.equal(nextVisible('ArrowUp', 2, 4), 1);
  assert.equal(nextVisible('ArrowUp', 0, 4), 0); // clamped — APG tree never wraps
});

test('Home jumps to the first visible item, End to the last', () => {
  assert.equal(nextVisible('Home', 3, 4), 0);
  assert.equal(nextVisible('End', 0, 4), 3);
});

test('an unhandled key returns null (no movement, no preventDefault)', () => {
  assert.equal(nextVisible('a', 0, 4), null);
  assert.equal(nextVisible('Tab', 1, 4), null);
  assert.equal(nextVisible('ArrowRight', 0, 4), null); // horizontal keys are treeAction's
  assert.equal(nextVisible('ArrowLeft', 0, 4), null);
});

test('degenerate counts: count<=0 → null, count===1 → 0', () => {
  assert.equal(nextVisible('ArrowDown', 0, 0), null);
  assert.equal(nextVisible('ArrowDown', 0, 1), 0);
  assert.equal(nextVisible('End', 0, 1), 0);
});

// ── treeAction — the full action matrix ─────────────────────────────────────
// expanded: true = open parent, false = closed parent, null = leaf.

test('ArrowRight on a closed parent expands it', () => {
  assert.equal(treeAction('ArrowRight', { expanded: false, hasParent: false }), 'expand');
  assert.equal(treeAction('ArrowRight', { expanded: false, hasParent: true }), 'expand');
});

test('ArrowRight on an open parent moves to its first child', () => {
  assert.equal(treeAction('ArrowRight', { expanded: true, hasParent: false }), 'first-child');
});

test('ArrowRight on a leaf does nothing (APG)', () => {
  assert.equal(treeAction('ArrowRight', { expanded: null, hasParent: true }), null);
});

test('ArrowLeft on an open parent collapses it', () => {
  assert.equal(treeAction('ArrowLeft', { expanded: true, hasParent: true }), 'collapse');
  assert.equal(treeAction('ArrowLeft', { expanded: true, hasParent: false }), 'collapse');
});

test('ArrowLeft on a closed parent or leaf moves to its parent — when it has one', () => {
  assert.equal(treeAction('ArrowLeft', { expanded: false, hasParent: true }), 'parent');
  assert.equal(treeAction('ArrowLeft', { expanded: null, hasParent: true }), 'parent');
});

test('ArrowLeft at the root level (no parent) does nothing', () => {
  assert.equal(treeAction('ArrowLeft', { expanded: false, hasParent: false }), null);
  assert.equal(treeAction('ArrowLeft', { expanded: null, hasParent: false }), null);
});

test('Enter and Space activate, regardless of node kind', () => {
  assert.equal(treeAction('Enter', { expanded: null, hasParent: true }), 'activate');
  assert.equal(treeAction(' ', { expanded: true, hasParent: false }), 'activate');
  assert.equal(treeAction('Enter', { expanded: false, hasParent: false }), 'activate');
});

test('an unhandled key or missing state returns null', () => {
  assert.equal(treeAction('a', { expanded: true, hasParent: true }), null);
  assert.equal(treeAction('ArrowDown', { expanded: true, hasParent: true }), null); // vertical keys are nextVisible's
  assert.equal(treeAction('ArrowRight', null), null);
});
