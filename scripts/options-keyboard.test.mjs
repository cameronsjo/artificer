import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test Plan for src/artificer-options.js — the option-navigation core
// (#173/#174/#176 behavior-module follow-up; the .tabs/#92 precedent).
// nextOption(key, current, count, opts) is the pure cursor state machine and
// matchOption(labels, buffer, current) the pure typeahead; the DOM wiring in
// enhance()/combobox()/observe() is thin glue verified by the Playwright
// regression specs (tree/palette/listbox) on components-extended.html.
// The module attaches its API to globalThis (=== window in a browser), so this
// test imports it for side-effect and exercises the REAL functions — not copies.
//
//   [x] ArrowDown/ArrowUp clamp at the ends by default   (APG listbox)
//   [x] wrap: true wraps both directions                  (APG menu)
//   [x] Home → 0, End → count-1
//   [x] Unhandled key → null; degenerate counts
//   [x] typeahead: case-insensitive startsWith, searches current+1…end then
//       0…current (current last — a still-matching buffer stays put)
//   [x] typeahead: repeated-char buffer cycles same-letter options
//   [x] typeahead: no match → null; empty labels/buffer → null

import '../src/artificer-options.js';
const { nextOption, matchOption } = globalThis.ArtificerOptions;

// Export contract (#219 Phase 3): both pure state machines MUST stay exported —
// a refactor that drops nextOption/matchOption fails CI here, before a framework
// consumer importing them breaks silently.
test('export contract: ArtificerOptions.nextOption + matchOption are exported', () => {
  assert.equal(typeof globalThis.ArtificerOptions.nextOption, 'function');
  assert.equal(typeof globalThis.ArtificerOptions.matchOption, 'function');
});

// ── nextOption — clamp (default, APG listbox) ────────────────────────────────

test('ArrowDown advances by one and clamps at the last option', () => {
  assert.equal(nextOption('ArrowDown', 0, 3), 1);
  assert.equal(nextOption('ArrowDown', 2, 3), 2); // clamped — never wraps
});

test('ArrowUp retreats by one and clamps at the first option', () => {
  assert.equal(nextOption('ArrowUp', 1, 3), 0);
  assert.equal(nextOption('ArrowUp', 0, 3), 0); // clamped — never wraps
});

test('Home jumps to the first option, End to the last', () => {
  assert.equal(nextOption('Home', 2, 3), 0);
  assert.equal(nextOption('End', 0, 3), 2);
});

// ── nextOption — wrap (opts.wrap, APG menu) ──────────────────────────────────

test('wrap: true wraps ArrowDown last → first and ArrowUp first → last', () => {
  const w = { wrap: true };
  assert.equal(nextOption('ArrowDown', 2, 3, w), 0);
  assert.equal(nextOption('ArrowUp', 0, 3, w), 2);
  assert.equal(nextOption('ArrowDown', 0, 3, w), 1); // mid-list unchanged
});

test('an unhandled key returns null (no movement, no preventDefault)', () => {
  assert.equal(nextOption('a', 0, 3), null);
  assert.equal(nextOption('Enter', 0, 3), null);
  assert.equal(nextOption('ArrowRight', 0, 3), null); // option lists are vertical
  assert.equal(nextOption('Escape', 0, 3), null); // the focus trap owns Escape
});

test('degenerate counts: count<=0 → null, count===1 → 0', () => {
  assert.equal(nextOption('ArrowDown', 0, 0), null);
  assert.equal(nextOption('ArrowDown', 0, 1), 0);
  assert.equal(nextOption('End', 0, 1), 0);
});

test('a cursor of -1 (no active option yet) clamps into range', () => {
  assert.equal(nextOption('ArrowDown', -1, 3), 0);
  assert.equal(nextOption('ArrowUp', -1, 3), 0);
});

// ── matchOption — typeahead ──────────────────────────────────────────────────

const BRANCHES = ['main', 'develop', 'release/0.14', 'archived/legacy'];

test('typeahead matches case-insensitive startsWith', () => {
  assert.equal(matchOption(BRANCHES, 'd', 0), 1);
  assert.equal(matchOption(BRANCHES, 'D', 0), 1);
  assert.equal(matchOption(BRANCHES, 'rel', 0), 2);
});

test('typeahead searches current+1…end first, then wraps to 0…current', () => {
  // from "release/0.14", "m" must wrap around to "main"
  assert.equal(matchOption(BRANCHES, 'm', 2), 0);
});

test('a buffer that still prefixes the current option stays put (current is searched last)', () => {
  // on "develop", extending the buffer d → de keeps the cursor in place
  assert.equal(matchOption(BRANCHES, 'de', 1), 1);
});

test('a repeated-char buffer cycles through same-letter options', () => {
  const dd = ['dashboards', 'develop', 'docs', 'main'];
  assert.equal(matchOption(dd, 'd', 0), 1); // d from "dashboards" → develop
  assert.equal(matchOption(dd, 'dd', 1), 2); // dd treated as d → docs
  assert.equal(matchOption(dd, 'ddd', 2), 0); // wraps back to dashboards
});

test('no match → null', () => {
  assert.equal(matchOption(BRANCHES, 'z', 0), null);
  assert.equal(matchOption(BRANCHES, 'mainline-x', 0), null);
});

test('empty labels or empty buffer → null', () => {
  assert.equal(matchOption([], 'a', 0), null);
  assert.equal(matchOption(BRANCHES, '', 0), null);
  assert.equal(matchOption(null, 'a', 0), null);
});

test('labels are trimmed before matching (textContent carries whitespace)', () => {
  assert.equal(matchOption(['  New run ', ' Search files '], 's', 0), 1);
});
