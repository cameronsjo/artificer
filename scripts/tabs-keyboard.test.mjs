import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test Plan for src/artificer-tabs.js — the WAI-ARIA APG tabs keyboard model (#92).
// nextIndex(key, current, count, opts) is the pure roving-tabindex state machine;
// the DOM wiring in enhance()/observe() is thin glue verified in navigation.html.
// The module attaches its API to globalThis (=== window in a browser), so this
// test imports it for side-effect and exercises the REAL function — not a copy.
//
//   [x] ArrowRight advances; wraps last → first        (horizontal default)
//   [x] ArrowLeft retreats;  wraps first → last
//   [x] Home → 0, End → count-1                         (both orientations)
//   [x] Horizontal tablist ignores Up/Down              (APG orientation rule)
//   [x] Vertical tablist moves on Up/Down, ignores L/R
//   [x] Unhandled key → null (caller does nothing, no preventDefault)
//   [x] Degenerate counts: count<=0 → null; count===1 → 0

import '../src/artificer-tabs.js';
const { nextIndex } = globalThis.ArtificerTabs;

// Export contract (#219 Phase 3): the state machine MUST stay exported — a
// refactor that drops nextIndex fails CI here, before a framework consumer that
// imports it breaks silently. (The keyboard cases below cover behavior; this
// pins the export and return-determinism for one input.)
test('export contract: ArtificerTabs.nextIndex is exported and return-deterministic', () => {
  assert.equal(typeof globalThis.ArtificerTabs.nextIndex, 'function');
  assert.equal(nextIndex('ArrowRight', 0, 3), nextIndex('ArrowRight', 0, 3));
});

test('ArrowRight advances by one (horizontal default)', () => {
  assert.equal(nextIndex('ArrowRight', 0, 3), 1);
});

test('ArrowRight wraps from last to first', () => {
  assert.equal(nextIndex('ArrowRight', 2, 3), 0);
});

test('ArrowLeft retreats by one', () => {
  assert.equal(nextIndex('ArrowLeft', 1, 3), 0);
});

test('ArrowLeft wraps from first to last', () => {
  assert.equal(nextIndex('ArrowLeft', 0, 3), 2);
});

test('Home jumps to the first tab', () => {
  assert.equal(nextIndex('Home', 2, 3), 0);
});

test('End jumps to the last tab', () => {
  assert.equal(nextIndex('End', 0, 3), 2);
});

test('a horizontal tablist ignores ArrowDown/ArrowUp (APG orientation rule)', () => {
  assert.equal(nextIndex('ArrowDown', 0, 3), null);
  assert.equal(nextIndex('ArrowUp', 1, 3), null);
});

test('a vertical tablist moves on ArrowDown/ArrowUp and ignores Left/Right', () => {
  const v = { orientation: 'vertical' };
  assert.equal(nextIndex('ArrowDown', 0, 3, v), 1);
  assert.equal(nextIndex('ArrowDown', 2, 3, v), 0); // wraps
  assert.equal(nextIndex('ArrowUp', 0, 3, v), 2); // wraps
  assert.equal(nextIndex('ArrowRight', 0, 3, v), null);
  assert.equal(nextIndex('ArrowLeft', 1, 3, v), null);
});

test('Home/End work regardless of orientation', () => {
  const v = { orientation: 'vertical' };
  assert.equal(nextIndex('Home', 2, 3, v), 0);
  assert.equal(nextIndex('End', 0, 3, v), 2);
});

test('an unhandled key returns null (no movement, no preventDefault)', () => {
  assert.equal(nextIndex('a', 0, 3), null);
  assert.equal(nextIndex('Enter', 0, 3), null);
  assert.equal(nextIndex('Tab', 0, 3), null);
});

test('degenerate counts: count<=0 → null, count===1 → 0', () => {
  assert.equal(nextIndex('ArrowRight', 0, 0), null);
  assert.equal(nextIndex('ArrowRight', 0, 1), 0);
  assert.equal(nextIndex('End', 0, 1), 0);
});
