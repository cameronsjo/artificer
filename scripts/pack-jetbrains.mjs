#!/usr/bin/env node
// Packs themes/jetbrains/ (the IntelliJ Platform theme plugin's source tree
// that themes/build.mjs emits) into a side-loadable jar:
//
//   npm run pack:jetbrains      → dist/artificer-jetbrains.jar
//
// Install it in any 2025.2+ JetBrains IDE via Settings > Plugins > (gear) >
// Install Plugin from Disk. A jar IS a zip; a plugin consisting of a single jar
// with META-INF/plugin.xml at its root is the documented single-file plugin
// shape — no lib/ nesting, no compiled code. dist/ is gitignored: the jar is a
// build artifact, regenerated per palette change, never committed.
//
// Zero-dep by scripts/CLAUDE.md: shells out to /usr/bin/zip (present on macOS
// and every CI runner image) with an args array — no shell string, nothing
// interpolated. The member list is explicit rather than `.`-recursive so a stray
// file in the directory can never ride into the jar.

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, 'themes', 'jetbrains');
const OUT_DIR = join(ROOT, 'dist');
const JAR = join(OUT_DIR, 'artificer-jetbrains.jar');

export const MEMBERS = [
  'META-INF/plugin.xml',
  'artificer-dark.theme.json',
  'artificer-light.theme.json',
  'artificer-dark.xml',
  'artificer-light.xml',
];

export function pack({ src = SRC, jar = JAR } = {}) {
  const missing = MEMBERS.filter((m) => !existsSync(join(src, m)));
  if (missing.length) {
    throw new Error(`pack-jetbrains: missing ${missing.join(', ')} under ${src} — run \`node themes/build.mjs\` first`);
  }
  mkdirSync(dirname(jar), { recursive: true });
  rmSync(jar, { force: true }); // zip would otherwise UPDATE an existing archive
  // -X: no extra platform attributes (deterministic-ish, no uid/gid noise).
  const r = spawnSync('/usr/bin/zip', ['-q', '-X', jar, ...MEMBERS], { cwd: src, stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`pack-jetbrains: zip exited ${r.status}: ${String(r.stderr).trim()}`);
  }
  return jar;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const jar = pack();
    console.error(`packed ${MEMBERS.length} members from themes/jetbrains/`);
    console.log(jar);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
