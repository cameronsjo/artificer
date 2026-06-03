import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restamp, changelogVersion, STAMPS } from './sync-version.mjs';

// Test Plan for scripts/sync-version.mjs
// Propagates package.json version → every version stamp; --check mode for CI.
//   [x] restamp rewrites the matched version, reporting found + changed
//   [x] restamp reports found=false when the stamp site is absent (guards drift)
//   [x] restamp is idempotent on already-synced text
//   [x] changelogVersion reads the top "## vX.Y.Z" heading
//   [x] STAMPS covers banner / --art-version / $version / whimsy headers, all carrying the version

test('restamp rewrites the matched version and reports found + changed', () => {
  const r = restamp('app v0.6 here', /(v)[0-9][\w.]*/, (m, p1) => p1 + '0.10.1');
  assert.equal(r.text, 'app v0.10.1 here');
  assert.ok(r.changed);
  assert.ok(r.found);
});

test('restamp reports found=false when the stamp site is absent', () => {
  const r = restamp('nothing to see', /(--art-version:\s*")[^"]*(")/, (m, p1, p2) => p1 + '0.10.1' + p2);
  assert.equal(r.found, false);
  assert.equal(r.changed, false);
});

test('restamp is idempotent on already-synced text', () => {
  const r = restamp('  --art-version: "0.10.1";', /(--art-version:\s*")[^"]*(")/, (m, p1, p2) => p1 + '0.10.1' + p2);
  assert.equal(r.changed, false);
  assert.ok(r.found);
});

test('changelogVersion reads the top ## v heading', () => {
  assert.equal(changelogVersion('# Changelog\n\n## v0.10.1 — foo\n\n## v0.10.0 — bar'), '0.10.1');
  assert.equal(changelogVersion('no version headings here'), null);
});

test('STAMPS covers every stamp site and bakes in the version', () => {
  const sites = STAMPS('1.2.3');
  const files = new Set(sites.map((s) => s.file));
  for (const f of [
    'src/artificer.css',
    'live-spec/artificer.css',
    'src/tokens.json',
    'live-spec/tokens.json',
    'themes/_palette.json',
    'src/artificer-whimsy.js',
    'live-spec/artificer-whimsy.js',
  ]) {
    assert.ok(files.has(f), `missing stamp site for ${f}`);
  }
  // applying the css banner stamp yields the target version
  const banner = sites.find((s) => s.file === 'src/artificer.css' && /Design tokens/.test(s.re.source));
  const out = restamp('   ARTIFICER · Design tokens · v0.6 (apothecary)', banner.re, banner.repl);
  assert.equal(out.text, '   ARTIFICER · Design tokens · v1.2.3 (apothecary)');
});
