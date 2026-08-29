#!/usr/bin/env node
// Single-source version sync (#66). package.json `version` is the source of
// truth; this propagates it to every stamp site so they can't drift:
//   - src + live-spec artificer.css   : banner comment (#77) + --art-version
//   - src + live-spec tokens.json     : $version
//   - src/primitives.json             : $version (#199 — ledger, not mirrored)
//   - themes/_palette.json            : $version
//   - src + live-spec artificer-whimsy.js : header comment (#35)
//   - README.md                           : masthead **vX.Y.Z · 2026** headline
// CHANGELOG's top "## vX.Y.Z" heading is hand-authored — verified, never rewritten.
// og-image.svg is deliberately NOT a stamp site — Lane 1 ruled the version OFF the OG
// card (it's what kept going stale); the refreshed card drops it. Don't re-add it here.
//
// Usage:
//   node scripts/sync-version.mjs           rewrite stamps to match package.json
//   node scripts/sync-version.mjs --check   verify only; exit 1 on any drift (CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);

// Rewrite the version inside `re` (whose match consumes the old version, with a
// prefix capture group and an optional suffix capture group) to `version`.
export function restamp(text, re, repl) {
  const found = re.test(text);
  const next = text.replace(re, repl);
  return { text: next, found, changed: next !== text };
}

export function changelogVersion(text) {
  const m = text.match(/^##\s*v([0-9][\w.]*)/m);
  return m ? m[1] : null;
}

// Every stamp site, with a replacement that injects `version`. A replacement
// FUNCTION (not a "$1" string) avoids the $10-is-group-10 ambiguity.
export function STAMPS(version) {
  // p2 is the suffix capture for prefix+version+suffix sites (quoted values);
  // for prefix-only sites (banner/header) String.replace passes the match offset
  // as the 3rd arg — a number — which must NOT be appended.
  const v = (m, p1, p2) => p1 + version + (typeof p2 === 'string' ? p2 : '');
  return [
    { file: 'src/artificer.css', label: 'banner', re: /(ARTIFICER · Design tokens · v)[0-9][\w.]*/, repl: v },
    { file: 'src/artificer.css', label: '--art-version', re: /(--art-version:\s*")[^"]*(")/, repl: v },
    { file: 'live-spec/artificer.css', label: 'banner', re: /(ARTIFICER · Design tokens · v)[0-9][\w.]*/, repl: v },
    { file: 'live-spec/artificer.css', label: '--art-version', re: /(--art-version:\s*")[^"]*(")/, repl: v },
    { file: 'src/tokens.json', label: '$version', re: /("\$version":\s*")[^"]*(")/, repl: v },
    { file: 'live-spec/tokens.json', label: '$version', re: /("\$version":\s*")[^"]*(")/, repl: v },
    { file: 'src/primitives.json', label: '$version', re: /("\$version":\s*")[^"]*(")/, repl: v },
    { file: 'themes/_palette.json', label: '$version', re: /("\$version":\s*")[^"]*(")/, repl: v },
    { file: 'src/artificer-whimsy.js', label: 'header', re: /(ARTIFICER · Whimsy helper · v)[0-9][\w.]*/, repl: v },
    { file: 'live-spec/artificer-whimsy.js', label: 'header', re: /(ARTIFICER · Whimsy helper · v)[0-9][\w.]*/, repl: v },
    // README masthead: **vX.Y.Z · 2026** — the ` · 2026` sits INSIDE the bold, which
    // is what distinguishes the version headline from the license line (`**v0.1** · 2026`,
    // where ` · 2026` is OUTSIDE the bold). The suffix group keeps the license line untouched.
    { file: 'README.md', label: 'masthead', re: /(\*\*v)[0-9][\w.]*( · 2026\*\*)/, repl: v },
    // SKILL title headings: `# Artificer · vX.Y.Z` (the · is U+00B7 MIDDLE DOT, UTF-8 \xc2\xb7)
    { file: 'reference/SKILL.md', label: 'title', re: /(# Artificer · v)[0-9][\w.]*/, repl: v },
    { file: 'skills/artificer-design-system/SKILL.md', label: 'title', re: /(# Artificer · v)[0-9][\w.]*/, repl: v },
    // live-spec README masthead version span (only one <span>v in the file)
    { file: 'live-spec/README.html', label: 'masthead', re: /(<span>v)[0-9][\w.]*/, repl: v },
    // Obsidian theme — unified version track as of the v0.7.0 adoption train. Stamp
    // the manifest and the src banner ONLY; NEVER the generated theme.css (build.mjs
    // carries the banner through from src on rebuild — registering it would double-stamp).
    // manifest: "version" is safe vs "minAppVersion" (the latter has no `"` before Version).
    { file: 'themes/obsidian/Artificer/manifest.json', label: 'manifest', re: /("version":\s*")[^"]*(")/, repl: v },
    // banner: `v0.1 · 2026` at the file head. The ` · 2026` suffix anchors it — the
    // v0.19.0 #NNN inline comments have no such suffix, so they're never touched.
    { file: 'themes/obsidian/Artificer/theme.src.css', label: 'banner', re: /(v)[0-9][\w.]*( · 2026)/, repl: v },
    // JetBrains plugin manifest — build.mjs emits the same <version>X.Y.Z</version>
    // from package.json, so this stamp and a rebuild agree byte-for-byte (which is
    // what lets the file sit in check-themes TARGETS; jetbrains-theme.test.mjs
    // asserts the two writers agree).
    { file: 'themes/jetbrains/META-INF/plugin.xml', label: 'version', re: /(<version>)[^<]*(<\/version>)/, repl: v },
  ];
}

function run({ check }) {
  const pkg = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8'));
  const version = pkg.version;
  const stamps = STAMPS(version);

  const drift = []; // {file, label}  — needs sync / mismatched
  const missing = []; // {file, label} — stamp site not found (structure changed)
  let synced = 0;

  // group stamps by file so each file is read/written once
  const byFile = new Map();
  for (const s of stamps) (byFile.get(s.file) ?? byFile.set(s.file, []).get(s.file)).push(s);

  for (const [file, sites] of byFile) {
    const url = new URL(file, ROOT);
    let text;
    try {
      text = readFileSync(url, 'utf8');
    } catch {
      missing.push({ file, label: '(file)' });
      continue;
    }
    let changedAny = false;
    for (const s of sites) {
      const r = restamp(text, s.re, s.repl);
      if (!r.found) {
        missing.push({ file, label: s.label });
        continue;
      }
      if (r.changed) {
        drift.push({ file, label: s.label });
        text = r.text;
        changedAny = true;
      }
    }
    if (changedAny && !check) {
      writeFileSync(url, text);
      synced += sites.length;
    }
  }

  // CHANGELOG is hand-authored — verify, never rewrite.
  const changelog = changelogVersion(readFileSync(new URL('CHANGELOG.md', ROOT), 'utf8'));
  const changelogMismatch = changelog !== version;

  if (check) {
    const problems = drift.length + missing.length + (changelogMismatch ? 1 : 0);
    if (problems === 0) {
      console.log(`✓ version sync: all stamps at ${version} (CHANGELOG, --art-version, $version, banners)`);
      return 0;
    }
    console.error(`✖ version drift vs package.json ${version}:`);
    for (const d of drift) console.error(`    out of sync: ${d.file} (${d.label})`);
    for (const m of missing) console.error(`    stamp site not found: ${m.file} (${m.label})`);
    if (changelogMismatch)
      console.error(`    CHANGELOG top heading is "## v${changelog}", expected v${version} — edit CHANGELOG.md`);
    console.error('\nRun `npm run sync:version` to fix stamps (CHANGELOG is manual).');
    return 1;
  }

  // write mode
  if (drift.length) {
    console.log(`✓ synced ${drift.length} stamp(s) to ${version}:`);
    for (const d of drift) console.log(`    ${d.file} (${d.label})`);
  } else {
    console.log(`✓ version sync: stamps already at ${version}`);
  }
  for (const m of missing) console.error(`⚠ stamp site not found: ${m.file} (${m.label}) — check the regex`);
  if (changelogMismatch)
    console.error(`⚠ CHANGELOG top heading is "## v${changelog}", expected v${version} — edit CHANGELOG.md manually`);
  return missing.length || changelogMismatch ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(run({ check: process.argv.includes('--check') }));
}
