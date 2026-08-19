// Section open-state machine — the 7 rules proven in spec-compare, ported to
// node:test against the COMPILED output (dist/react), so the suite exercises
// exactly what npm ships. `npm test` builds first (pretest → build:react).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSectionOpen,
  onViewportChange,
  onNavigationActivates,
  onUserToggle,
} from '../../dist/react/sidenav-sections.js';

test('defaultSectionOpen: desktop is open regardless of active', () => {
  assert.equal(defaultSectionOpen('desktop', false), true);
  assert.equal(defaultSectionOpen('desktop', true), true);
});

test('defaultSectionOpen: mobile collapses except the active section', () => {
  assert.equal(defaultSectionOpen('mobile', false), false);
  assert.equal(defaultSectionOpen('mobile', true), true);
});

test('onNavigationActivates: force-opens the newly-active section', () => {
  assert.deepEqual(onNavigationActivates({ open: false, touched: false }), {
    open: true,
    touched: false,
  });
});

test('onNavigationActivates: never marks the section touched', () => {
  assert.equal(onNavigationActivates({ open: false, touched: false }).touched, false);
});

test('onUserToggle: sets open and marks touched', () => {
  assert.deepEqual(onUserToggle(true), { open: true, touched: true });
  assert.deepEqual(onUserToggle(false), { open: false, touched: true });
});

test('onViewportChange: re-derives the default for an untouched section', () => {
  assert.deepEqual(onViewportChange({ open: true, touched: false }, 'mobile', false), {
    open: false,
    touched: false,
  });
});

test('onViewportChange: a touched section keeps the user\'s state on any viewport', () => {
  const userCollapsedActive = { open: false, touched: true };
  assert.equal(onViewportChange(userCollapsedActive, 'mobile', true), userCollapsedActive);
  assert.equal(onViewportChange(userCollapsedActive, 'desktop', true), userCollapsedActive);
  const userOpenedInactive = { open: true, touched: true };
  assert.equal(onViewportChange(userOpenedInactive, 'mobile', false), userOpenedInactive);
});
