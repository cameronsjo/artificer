// SSR smoke tests for the chrome components — renderToStaticMarkup against
// the COMPILED dist output, asserting the canonical Artificer markup shapes
// the CSS contracts on. No DOM, no browser: this is the markup-shape net; the
// live-spec Playwright suite remains the visual/a11y gate for the CSS itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ThemeToggle,
  AppShell,
  AppShellContent,
  Appbar,
  NavDrawer,
  SideNav,
  SideNavFooter,
} from '../../dist/react/index.js';

const h = React.createElement;

test('ThemeToggle renders the canonical EMPTY data-theme-toggle button', () => {
  const html = renderToStaticMarkup(h(ThemeToggle));
  assert.match(html, /<button[^>]*type="button"/);
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /aria-label="Toggle theme"/);
  assert.match(html, /class="theme-toggle"/);
  assert.match(html, /><\/button>/, 'button must be childless — the module injects the glyph');
});

test('ThemeToggle inline variant adds --inline', () => {
  const html = renderToStaticMarkup(h(ThemeToggle, { inline: true }));
  assert.match(html, /class="theme-toggle theme-toggle--inline"/);
});

test('AppShell sets knob custom properties, never redefines the grid', () => {
  const html = renderToStaticMarkup(
    h(AppShell, { rail: '210px', gap: 'var(--s-lg)' }, h(AppShellContent, null, 'x')),
  );
  assert.match(html, /class="app-shell"/);
  assert.match(html, /--shell-rail:\s*210px/);
  assert.match(html, /--shell-gap:\s*var\(--s-lg\)/);
  assert.match(html, /<main[^>]*class="app-shell__content"/);
});

test('Appbar renders the canonical composed brand and modifier classes', () => {
  const html = renderToStaticMarkup(
    h(Appbar, {
      brand: 'spec-driven development',
      brandWhimsy: true,
      contained: true,
      sticky: false,
      menu: { controls: 'nav-drawer', open: false, onClick: () => {} },
      actions: h(ThemeToggle),
    }),
  );
  assert.match(html, /class="appbar appbar--contained appbar--static"/);
  assert.match(html, /class="appbar__brand"[^>]*href="\/"/);
  assert.match(html, /<span class="wordmark whimsy">spec-driven development<\/span>/);
  assert.match(html, /appbar__menu-btn/);
  assert.match(html, /aria-controls="nav-drawer"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /class="appbar__spacer"/);
  assert.match(html, /class="appbar__actions"/);
});

test('NavDrawer: closed renders scrim + labeled aside, no data-nav-open', () => {
  const html = renderToStaticMarkup(
    h(NavDrawer, { open: false, onClose: () => {}, id: 'nav-drawer' }, 'nav'),
  );
  assert.match(html, /class="nav-scrim"/);
  assert.match(html, /<aside[^>]*id="nav-drawer"[^>]*class="nav-drawer"/);
  assert.match(html, /aria-hidden="true"/);
  // `inert` is deliberately ABSENT from static markup: React 18 renders only
  // the string attribute form while 19 types it boolean and drops falsy
  // strings, so the component applies it in a useLayoutEffect (sync
  // pre-paint) instead — a CSR contract, documented in chrome.tsx.
  assert.doesNotMatch(html, /<aside[^>]*inert/);
  assert.doesNotMatch(html, /data-nav-open/);
});

test('NavDrawer: open carries data-nav-open on the display:contents wrapper', () => {
  const html = renderToStaticMarkup(
    h(NavDrawer, { open: true, onClose: () => {}, id: 'nav-drawer' }, 'nav'),
  );
  assert.match(html, /data-nav-open/);
  assert.match(html, /display:\s*contents/);
  assert.match(html, /aria-hidden="false"/);
  assert.doesNotMatch(html, /<aside[^>]*inert/, 'an open drawer must be interactive');
});

const GROUPS = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { key: 'a', label: 'Compare', href: '#a', active: true },
      { key: 'b', label: 'Matrix', href: '#b', count: 7 },
    ],
  },
  {
    key: 'tools',
    label: 'Core tools',
    items: [{ key: 'c', label: 'Kiro', onSelect: () => {} }],
  },
];

test('SideNav flat mode renders groups, rows, active rail, counts', () => {
  const html = renderToStaticMarkup(h(SideNav, { groups: GROUPS, 'aria-label': 'Sections' }));
  assert.match(html, /<nav[^>]*class="sidenav"/);
  assert.match(html, /class="sidenav__group">Overview</);
  assert.match(html, /<a href="#a"[^>]*aria-current="page"/);
  assert.match(html, /<span class="count">7<\/span>/);
  assert.match(html, /<button type="button"/, 'SPA state-switch items render as buttons');
  assert.doesNotMatch(html, /sidenav__section/);
});

test('SideNav sections mode renders details/summary — ALL open in the SSR-safe desktop shape', () => {
  const html = renderToStaticMarkup(h(SideNav, { groups: GROUPS, sections: true }));
  // No-window renders always take the desktop shape (every section open) so
  // server and client first renders agree; the mount effect corrects to the
  // real viewport. The mobile collapsed-except-active path is covered by the
  // pure-function suite (sidenav-sections.test.mjs), not renderable here.
  const openCount = (html.match(/<details[^>]*class="sidenav__section"[^>]*open/g) ?? []).length;
  assert.equal(openCount, GROUPS.length);
  assert.match(html, /<summary>Overview<\/summary>/);
  assert.match(html, /<summary>Core tools<\/summary>/);
});

test('SideNav sticky variant + footer slot', () => {
  const html = renderToStaticMarkup(
    h(SideNav, { groups: GROUPS, sticky: true, footer: h(SideNavFooter) }),
  );
  assert.match(html, /class="sidenav sidenav--sticky"/);
  assert.match(html, /class="sidenav__footer"/);
  assert.match(html, /<span>Theme<\/span>/);
  assert.match(html, /theme-toggle theme-toggle--inline/);
});

test('safeHref: blocks javascript: and unknown schemes, passes safe ones', async () => {
  const { safeHref } = await import('../../dist/react/index.js');
  assert.equal(safeHref('javascript:alert(1)'), undefined);
  assert.equal(safeHref(' JAVASCRIPT:alert(1)'), undefined);
  assert.equal(safeHref('data:text/html,x'), undefined);
  assert.equal(safeHref('vbscript:x'), undefined);
  assert.equal(safeHref('https://example.com'), 'https://example.com');
  assert.equal(safeHref('mailto:a@b.c'), 'mailto:a@b.c');
  assert.equal(safeHref('/path'), '/path');
  assert.equal(safeHref('#fragment'), '#fragment');
  assert.equal(safeHref('?q=1'), '?q=1');
  assert.equal(safeHref(undefined), undefined);
});

test('SideNavRow: a javascript: href renders as a button, not a link', () => {
  const html = renderToStaticMarkup(
    h(SideNav, {
      groups: [{ key: 'g', label: 'G', items: [{ key: 'x', label: 'X', href: 'javascript:alert(1)' }] }],
    }),
  );
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /<button type="button"/);
});
