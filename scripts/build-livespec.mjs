#!/usr/bin/env node
// live-spec mirror + landing-page sync (#78).
//
// 1. `src/` -> `live-spec/` verbatim asset mirror (`MIRROR`).
// 2. `live-spec/index.html` auto-synced regions:
//      - `auto:primitives-stat`  : primitive count from src/primitives.json + version from package.json
//      - `auto:releases`         : recent `## vX.Y.Z — ...` entries from CHANGELOG.md (after v0.28.0)
//      - `auto:current-version`  : current version + primitive count in "How it was made"
//
// Usage:
//   node scripts/build-livespec.mjs           sync mirror + landing page
//   node scripts/build-livespec.mjs --check   verify only; exit 1 on any drift (CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);

// Copied verbatim src/ -> live-spec/. Keep alphabetized.
export const MIRROR = [
  'artificer-editorial.css',
  'artificer-focus.js',
  'artificer-icons.js',
  'artificer-options.js',
  'artificer-sploot.js',
  'artificer-tabs.js',
  'artificer-texture.css',
  'artificer-theme.js',
  'artificer-tree.js',
  'artificer-whimsy.css',
  'artificer-whimsy.js',
  'artificer.css',
  'print.css',
  'tokens.json',
];

// All 9 originally-shared files are now reconciled and mirrored (#109).
export const EXCLUDED = [];

// Releases after this hand-authored milestone in live-spec/index.html are
// auto-generated from CHANGELOG.md (capped to keep the landing page scannable).
export const AUTO_RELEASES_AFTER = '0.28.0';
export const MAX_AUTO_RELEASES = 6;

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineMdToHtml(str) {
  // Escape HTML first, then convert inline `code` spans.
  return escapeHtml(str).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Parse `## vX.Y.Z — Title` sections from CHANGELOG.md into structured objects.
export function parseChangelogReleases(markdown, { after = AUTO_RELEASES_AFTER, limit = MAX_AUTO_RELEASES } = {}) {
  const releases = [];
  const sections = markdown.split(/^##\s+/m).slice(1);
  for (const section of sections) {
    const firstNewline = section.indexOf('\n');
    const heading = (firstNewline === -1 ? section : section.slice(0, firstNewline)).trim();
    const m = heading.match(/^v(\d+\.\d+\.\d+)\s+[—–-]\s+(.+)$/);
    if (!m) continue;
    const [, version, title] = m;
    if (after && compareSemver(version, after) <= 0) break;

    const body = firstNewline === -1 ? '' : section.slice(firstNewline + 1);
    const summaries = [];
    // Extract top-level `- **lead.**` items, skipping workshop-only notes.
    for (const line of body.split('\n')) {
      const bm = line.match(/^- \*\*([^*]+)\*\*\s*(.*)$/);
      if (!bm) continue;
      const lead = bm[1].trim();
      const rest = bm[2].trim();
      if (/workshop[- ]only/i.test(lead) || /workshop[- ]only/i.test(rest)) continue;
      // Strip conventional-commit prefix (`fix(css,tailwind): `) for reader prose.
      const cleanLead = lead.replace(/^[a-z]+(?:\([^)]+\))?:\s*/i, '').replace(/\.$/, '');
      summaries.push(cleanLead);
    }
    releases.push({ version, title: title.trim(), summaries });
    if (releases.length >= limit) break;
  }
  return releases;
}

export function renderReleasesHtml(releases) {
  return releases
    .map((rel, idx) => {
      const phase = idx === 0 ? 'Latest release' : 'Release';
      const bodyText =
        rel.summaries.length > 0
          ? rel.summaries.map((s, i) => (i === 0 ? s[0].toUpperCase() + s.slice(1) : s)).join('; ') + '.'
          : rel.title + '.';
      return [
        '      <li class="ad-tl">',
        '        <div class="ad-tl__head">',
        `          <span class="ad-tl__ver">v${escapeHtml(rel.version)}</span>`,
        `          <span class="ad-tl__phase">${phase}</span>`,
        '        </div>',
        `        <h3 class="ad-tl__title">${inlineMdToHtml(rel.title)}</h3>`,
        `        <p class="ad-tl__body">${inlineMdToHtml(bodyText)}</p>`,
        '      </li>',
      ].join('\n');
    })
    .join('\n');
}

function replaceBlock(html, name, replacement) {
  const re = new RegExp(`(<!-- auto:${name}:start -->)[\\s\\S]*?(<!-- auto:${name}:end -->)`);
  if (!re.test(html)) throw new Error(`Missing <!-- auto:${name}:start/end --> marker in live-spec/index.html`);
  return html.replace(re, `$1${replacement}$2`);
}

// Syncs live-spec/index.html's version, primitive count, and recent CHANGELOG
// releases. Returns true if drift was found (and fixed when check=false).
export function syncLandingPage({ check } = {}) {
  const indexUrl = new URL('live-spec/index.html', ROOT);
  const pkg = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8'));
  const primitives = JSON.parse(readFileSync(new URL('src/primitives.json', ROOT), 'utf8'));
  const changelog = readFileSync(new URL('CHANGELOG.md', ROOT), 'utf8');

  const version = pkg.version;
  const primitiveCount = Object.keys(primitives.primitives || {}).length;
  const releases = parseChangelogReleases(changelog);

  const before = readFileSync(indexUrl, 'utf8');
  let after = before;

  after = replaceBlock(
    after,
    'primitives-stat',
    `\n          <div class="stat__value">${primitiveCount}</div>\n          <div class="stat__delta">v${escapeHtml(version)} ledger</div>\n          `,
  );

  // Public export ships a stub CHANGELOG without `## vX.Y.Z — Title` sections;
  // only rewrite the releases block when structured changelog entries exist.
  if (releases.length > 0) {
    after = replaceBlock(after, 'releases', `\n${renderReleasesHtml(releases)}\n      `);
  }

  after = replaceBlock(
    after,
    'current-version',
    `<b class="anchor">v${escapeHtml(version)}</b>: ${primitiveCount} primitives`,
  );

  const drifted = after !== before;
  if (drifted && !check) writeFileSync(indexUrl, after);
  return drifted;
}

// Returns the names whose live-spec copy differs from src. In write mode
// (check=false) it also overwrites the live-spec copy from src.
export function syncMirror({ check } = {}) {
  const drift = [];
  for (const name of MIRROR) {
    const src = readFileSync(new URL(`src/${name}`, ROOT), 'utf8');
    let dst = null;
    try {
      dst = readFileSync(new URL(`live-spec/${name}`, ROOT), 'utf8');
    } catch {
      dst = null; // missing live-spec copy counts as drift
    }
    if (dst !== src) {
      drift.push(name);
      if (!check) writeFileSync(new URL(`live-spec/${name}`, ROOT), src);
    }
  }
  return drift;
}

function run({ check }) {
  const drift = syncMirror({ check });
  const landingDrift = syncLandingPage({ check });

  if (check) {
    if (drift.length === 0 && !landingDrift) {
      console.log(`✓ live-spec mirror (${MIRROR.length} files) + index.html releases/stats in sync`);
      return 0;
    }
    console.error('✖ live-spec out of sync — run `npm run build:livespec`:');
    for (const f of drift) console.error(`    drift: live-spec/${f} ≠ src/${f}`);
    if (landingDrift) console.error('    drift: live-spec/index.html ≠ package.json / primitives.json / CHANGELOG.md');
    return 1;
  }

  if (drift.length) {
    console.log(`✓ synced ${drift.length} file(s) src/ -> live-spec/:`);
    for (const f of drift) console.log(`    ${f}`);
  } else {
    console.log(`✓ live-spec mirror: already in sync (${MIRROR.length} files)`);
  }
  console.log(landingDrift ? '✓ synced live-spec/index.html (version, primitives count, CHANGELOG releases)' : '✓ live-spec/index.html: already in sync');
  if (EXCLUDED.length) console.log(`  excluded (pending reconciliation): ${EXCLUDED.join(', ')}`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(run({ check: process.argv.includes('--check') }));
}
