#!/usr/bin/env node
// Packs the browser-theme packages themes/build.mjs emits into store-ready
// zips:
//
//   npm run pack:browser    → dist/artificer-chromium-dark.zip
//                             dist/artificer-chromium-light.zip
//                             dist/artificer-firefox.zip
//
// Three artifacts, five listings: Chrome accepts only RGB arrays and has no
// dark/light switch, so one package is one mode; Edge takes the Chromium
// package unchanged (a second listing, not a third artifact); Firefox carries
// both modes in one package via the sibling `dark_theme` manifest key.
//
// Sideload without packing at all: chrome://extensions → Developer mode → Load
// unpacked → themes/chromium/artificer-dark/, or about:debugging → Load
// Temporary Add-on → themes/firefox/artificer/manifest.json. The zips exist for
// store upload.
//
// Zero-dep by scripts/CLAUDE.md, and a sibling of pack-jetbrains.mjs on
// purpose: shells out to /usr/bin/zip with an args array — no shell string,
// nothing interpolated — and names every member explicitly so a stray file in
// the directory can never ride into an uploaded archive. dist/ is gitignored.

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const THEMES = join(ROOT, 'themes');
const OUT_DIR = join(ROOT, 'dist');

// The 128×128 PNG both stores want inside the package. It is owner-supplied
// and committed, not generated: scripts/CLAUDE.md mandates zero dependencies
// and no zero-dep Node SVG rasterizer exists, and src/assets/favicon.svg is a
// Lane 1-owned artifact carrying hard-coded hexes — it does not track the
// palette, so there is nothing to regenerate it FROM.
//
// It is committed now, and both manifests NAME it (`icons` in themes/build.mjs)
// — an undeclared PNG is inert in either browser. That declaration makes the
// file load-bearing: a package whose manifest points at a missing icon is
// rejected outright ("Could not load icon"), so packing without it would ship a
// zip that installs nowhere. Hence a throw rather than the earlier warning.
export const ICON = 'icon-128.png';

export const PACKAGES = [
  { src: 'chromium/artificer-dark',  zip: 'artificer-chromium-dark.zip', docs: 'Chromium' },
  { src: 'chromium/artificer-light', zip: 'artificer-chromium-light.zip', docs: 'Chromium' },
  { src: 'firefox/artificer',        zip: 'artificer-firefox.zip',       docs: 'Firefox' },
];

// Every generated file the packer requires, relative to themes/. The test
// asserts this names exactly the emitted set and that each exists on disk —
// without it a renamed manifest packs a short archive silently.
export const MEMBERS = PACKAGES.map((p) => `${p.src}/manifest.json`);

export function packOne({ src, zip, docs }, { themes = THEMES, outDir = OUT_DIR } = {}) {
  const dir = join(themes, src);
  if (!existsSync(join(dir, 'manifest.json'))) {
    throw new Error(`pack-browser: missing manifest.json under ${dir} — run \`node themes/build.mjs\` first`);
  }
  if (!existsSync(join(dir, ICON))) {
    throw new Error(`pack-browser: ${src}/${ICON} is absent, but the manifest declares it — the packed extension would be rejected on load (themes/README.md § ${docs})`);
  }
  const members = ['manifest.json', ICON];

  const out = join(outDir, zip);
  mkdirSync(dirname(out), { recursive: true });
  rmSync(out, { force: true }); // zip would otherwise UPDATE an existing archive
  // -X: no extra platform attributes (deterministic-ish, no uid/gid noise).
  const r = spawnSync('/usr/bin/zip', ['-q', '-X', out, ...members], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`pack-browser: zip exited ${r.status} for ${src}: ${String(r.stderr).trim()}`);
  }
  return out;
}

export function pack(opts = {}) {
  return PACKAGES.map((p) => packOne(p, opts));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    for (const zip of pack()) console.log(zip);
    console.error(`packed ${PACKAGES.length} browser packages`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
