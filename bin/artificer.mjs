#!/usr/bin/env node
// artificer — the design-system CLI shipped inside @cameronsjo/artificer.
//
// One bin, subcommand router (adherence kit #219). `vendor` and `lint` today;
// `doctor` slots in later behind the same COMMANDS map. Plain Node (fs / path /
// crypto) — zero dependencies, so `npx @cameronsjo/artificer …` stays
// install-light.
//
// `vendor` copies the package's runtime (CSS/JS + tokens.json +
// primitives.json, the #199 mint ledger) and — opt-in — the fonts, into a
// consumer's repo, and stamps a provenance.json sidecar so a vendored copy can
// answer "where did this come from, is it current?" from the dest folder alone.
//
// `lint` runs Hard rule #1 (raw values that have a token) over the consumer's
// own CSS, version-locked to their vendored tokens.json. Engine: ./lint-core.mjs.

import {
  existsSync,
  statSync,
  lstatSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  realpathSync,
} from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { lintText, report, buildTokenMaps, FONT_SCALE_EXEMPT } from './lint-core.mjs';

const BIN_DIR = dirname(fileURLToPath(import.meta.url));

// Distinct non-zero codes so a caller (or CI) can branch on the failure kind.
export const EXIT = {
  OK: 0,
  USAGE: 1, // bad/unknown command or flag; --help is a clean 0
  SRC_MISSING: 3, // the package's src/ dir is not where it should be
  NO_MATCH: 4, // the runtime glob matched nothing (never vendor an empty tree)
  DEST_ESCAPE: 5, // --dest (or a symlink inside it) resolved outside the cwd
  DEST_UNWRITABLE: 6, // could not write the dest tree
  DRIFT_STRICT: 7, // --strict + a vendored file drifted from its stamp
  COLLISION_STRICT: 8, // --strict + a pre-existing untracked file would be clobbered
  LINT_VIOLATIONS: 2, // `lint` found raw-value violations (the engine's contract)
  LINT_NO_FILES: 9, // `lint` glob matched no CSS files (never a silent green)
};

// The runtime globs. Class-closure invariant (#205): a future
// `src/artificer-<new>.css|js` rides automatically — never a hand-list.
// `print.css` is a named exception: a documented runtime stylesheet (Path-A
// consumers link it as media="print") that predates the `artificer*` naming
// convention. It is one enumerated file, not hand-list creep. `primitives.json`
// is the second named entry (#199 Phase 4): the mint ledger the upgrade skill
// consumes — enumerated like tokens.json because the globs can't match it.
// `--fonts` additionally pulls the woff/woff2 assets by discovery, preserving
// their path under src/ so the CSS's relative `@font-face` URLs still resolve.
const RUNTIME_GLOBS = ['artificer*.css', 'artificer*.js', 'tokens.json', 'primitives.json', 'print.css'];
const FONT_GLOBS = ['**/*.woff', '**/*.woff2'];

// The interim cheatsheet ride-along (#78) is RETIRED (#199 PR-5): the
// primitives.json ledger is the machine-readable successor and the upgrade
// skill consumes it directly. reference/SKILL.md still ships in the npm
// package for humans. A previously vendored ARTIFICER-CHEATSHEET.md is left
// in place (vendor never deletes) — consumers may delete it freely.

const PROVENANCE = 'provenance.json';
const DEFAULT_DEST = 'public/artificer';

// ── glob ──────────────────────────────────────────────────────────────────
// A tiny POSIX-style matcher — enough for the fixed pattern set above, so the
// kit adds no glob dependency. `*` spans one segment, `**` spans any depth,
// `{a,b}` alternates, `?` one non-slash char.
const escapeRe = (s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++; // `**/` also matches zero leading dirs
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      const close = glob.indexOf('}', i);
      if (close < 0) {
        // Unbalanced brace — treat the `{` as a literal rather than mis-slicing
        // (and re-entering the loop from a negative index).
        re += '\\{';
      } else {
        const alts = glob.slice(i + 1, close).split(',').map(escapeRe);
        re += `(?:${alts.join('|')})`;
        i = close;
      }
    } else {
      re += escapeRe(c);
    }
  }
  return new RegExp(`^${re}$`);
}

export function matchGlobs(files, patterns) {
  const res = patterns.map(globToRegExp);
  return files.filter((f) => res.some((r) => r.test(f)));
}

// Every file under `root`, as POSIX-relative paths. Uses lstat and skips
// symlinks — a symlinked dir could cycle (stack overflow) or point the walk
// outside the package root.
export function walkRelFiles(root) {
  const out = [];
  const rec = (dir, prefix) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      const st = lstatSync(abs);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) rec(abs, rel);
      else out.push(rel);
    }
  };
  rec(root, '');
  return out;
}

// Dirs never worth descending when expanding a consumer's lint glob.
const LINT_SKIP_DIRS = new Set(['node_modules', '.git']);

// Walk `root`, emitting paths POSIX-relative to `relBase`, skipping heavy/hidden
// dirs and symlinks — so a consumer `lint "**/*.css"` never descends
// node_modules. Missing/unreadable dirs are skipped, not fatal.
function walkForLint(root, relBase) {
  const out = [];
  const rec = (dir) => {
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of names) {
      if (LINT_SKIP_DIRS.has(name) || name.startsWith('.')) continue;
      const abs = join(dir, name);
      let st;
      try {
        st = lstatSync(abs);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) rec(abs);
      else out.push(relative(relBase, abs).split(sep).join('/'));
    }
  };
  rec(root);
  return out;
}

// Normalize a consumer glob and locate the static dir the walk starts from.
// A single leading `./` is stripped (idiomatic CI globs write it, but walk
// paths never carry it, so the regex would otherwise match nothing). `meta` is
// the index of the first wildcard, or -1 for a literal path.
export function globStaticBase(cwd, rawGlob) {
  const glob = rawGlob.startsWith('./') ? rawGlob.slice(2) : rawGlob;
  const meta = glob.search(/[*?{]/);
  const staticPart = meta === -1 ? glob : glob.slice(0, meta);
  const baseRel = staticPart.includes('/') ? staticPart.slice(0, staticPart.lastIndexOf('/')) : '';
  return { glob, meta, baseAbs: resolve(cwd, baseRel) };
}

// Expand consumer globs (relative to cwd) into a sorted, de-duped file list.
// A literal path (no wildcard) is an O(1) existence check; a wildcard glob
// bounds the walk to its static prefix. `**` crosses directories, `{a,b}`
// alternates (both via globToRegExp).
export function listFilesForGlobs(cwd, globs) {
  const seen = new Set();
  for (const raw of globs) {
    const { glob, meta, baseAbs } = globStaticBase(cwd, raw);
    if (meta === -1) {
      const abs = resolve(cwd, glob);
      if (existsSync(abs) && statSync(abs).isFile()) seen.add(relative(cwd, abs).split(sep).join('/'));
      continue;
    }
    if (!existsSync(baseAbs)) continue;
    const re = globToRegExp(glob);
    if (statSync(baseAbs).isFile()) {
      const rel = relative(cwd, baseAbs).split(sep).join('/');
      if (re.test(rel)) seen.add(rel);
      continue;
    }
    for (const rel of walkForLint(baseAbs, cwd)) {
      if (re.test(rel)) seen.add(rel);
    }
  }
  return [...seen].sort();
}

// ── dest containment (symlink-aware) ─────────────────────────────────────────
const within = (child, parent) => child === parent || child.startsWith(parent + sep);

// The deepest ancestor of `p` that exists on disk (p itself if it exists).
export function deepestExistingAncestor(p) {
  let cur = p;
  while (!existsSync(cur)) {
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return cur;
}

// The first symlinked path component of `fileAbs` at or below `baseAbs`, or
// null. `resolve` is lexical — it does not deref symlinks — so a shipped
// symlink (dir OR file) inside the dest could redirect a write outside the
// repo. This catches it before any mkdir/write follows it.
export function firstSymlinkComponent(baseAbs, fileAbs) {
  const parts = relative(baseAbs, fileAbs).split(sep).filter(Boolean);
  let cur = baseAbs;
  for (const part of parts) {
    cur = join(cur, part);
    let st;
    try {
      st = lstatSync(cur);
    } catch {
      st = null; // does not exist yet — nothing to follow
    }
    if (st && st.isSymbolicLink()) return cur;
  }
  return null;
}

// ── provenance ──────────────────────────────────────────────────────────────
export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// Walk up from the bin's own location to the package root — npx-cache-safe,
// because it never consults the consumer's cwd or node_modules.
export function resolvePackageRoot(startDir) {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`artificer: no package.json found upward from ${startDir}`);
    }
    dir = parent;
  }
}

// Prefer the readable `node_modules/@scope/pkg/package.json` tail when the
// package resolved from an install tree; otherwise a cwd-relative path.
export function computeResolvedFrom(pkgJsonAbs, cwd) {
  const marker = `${sep}node_modules${sep}`;
  const idx = pkgJsonAbs.lastIndexOf(marker);
  if (idx >= 0) return pkgJsonAbs.slice(idx + 1).split(sep).join('/');
  const rel = relative(cwd, pkgJsonAbs).split(sep).join('/');
  return rel || 'package.json';
}

// Re-hash the currently-present vendored files and compare to a prior stamp.
// A mismatch/absence is a consumer hand-edit the re-vendor would clobber.
export function computeDrift(destDir, provenance) {
  const drift = [];
  for (const [name, hash] of Object.entries(provenance.files ?? {})) {
    const abs = join(destDir, name);
    if (!existsSync(abs)) {
      drift.push({ name, reason: 'missing' });
      continue;
    }
    if (sha256(readFileSync(abs)) !== hash) drift.push({ name, reason: 'edited' });
  }
  return drift;
}

// ── arg parsing ───────────────────────────────────────────────────────────
export function parseVendorArgs(argv) {
  const opts = { dest: DEFAULT_DEST, fonts: false, strict: false, help: false, errors: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--fonts') opts.fonts = true;
    else if (a === '--strict') opts.strict = true;
    else if (a === '--dest') {
      const v = argv[++i];
      if (v === undefined) opts.errors.push('--dest requires a directory argument');
      else opts.dest = v;
    } else if (a.startsWith('--dest=')) {
      opts.dest = a.slice('--dest='.length);
    } else if (a === '--channel' || a.startsWith('--channel=')) {
      // Documented extension point (owner ruling #7): only src/ ships today.
      // --channel=min waits on #112's dist/ build.
      opts.errors.push('--channel is a documented extension point, not implemented (only src/ ships today)');
    } else {
      opts.errors.push(`unknown option "${a}"`);
    }
  }
  return opts;
}

// ── help ────────────────────────────────────────────────────────────────────
const HELP = `artificer — the Artificer design-system CLI

Usage:
  npx @cameronsjo/artificer <command> [options]

Commands:
  vendor    Copy the runtime + a provenance sidecar into your project
  lint      Check your CSS for raw values that have a token (Hard rule #1)

Run "artificer <command> --help" for a command's options.`;

const VENDOR_HELP = `artificer vendor — copy the Artificer runtime into a no-bundler project

Usage:
  npx @cameronsjo/artificer vendor [--dest <dir>] [--fonts] [--strict]

Copies the design-system runtime (artificer*.css, artificer*.js, tokens.json,
primitives.json — the machine-readable primitives ledger), and — with --fonts —
the woff2 assets, into your repo, then writes ${PROVENANCE} recording the
source, version, and a sha256 per file. (The ARTIFICER-CHEATSHEET.md ride-along
is retired; an old vendored copy can be deleted.) Re-run to update; a drifted (hand-edited) vendored file,
or an untracked file already in the dest, is reported, and --strict turns that
into a hard failure that does not overwrite. Re-vendoring adds and overwrites
but never deletes — delete the dest and re-run for a clean tree.

Options:
  --dest <dir>   Destination inside your repo (default: ${DEFAULT_DEST})
  --fonts        Also vendor the font files (off by default; bundlers resolve them)
  --strict       Exit non-zero, without overwriting, on drift or an untracked collision
  --help, -h     Show this help

Bundler (import) consumers do not need this — import from node_modules directly.`;

// ── vendor ───────────────────────────────────────────────────────────────────
export function vendor({ argv = [], cwd = process.cwd(), packageRoot, out = console.log, err = console.error } = {}) {
  const opts = parseVendorArgs(argv);
  if (opts.help) {
    out(VENDOR_HELP);
    return EXIT.OK;
  }
  if (opts.errors.length) {
    for (const e of opts.errors) err(`artificer vendor: ${e}`);
    err(VENDOR_HELP);
    return EXIT.USAGE;
  }

  const root = packageRoot ?? resolvePackageRoot(BIN_DIR);
  const srcDir = join(root, 'src');
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) {
    err(`artificer vendor: package source dir not found: ${srcDir}`);
    return EXIT.SRC_MISSING;
  }

  // Traversal guard, two layers. (1) Lexical: the resolved dest must sit
  // inside cwd. (2) Symlink-aware: realpath the deepest existing ancestor of
  // the dest and require it inside the realpath'd cwd — `resolve` never derefs
  // symlinks, so a shipped `public -> ../outside` dir symlink passes the
  // lexical check but escapes here.
  const cwdAbs = resolve(cwd);
  const destAbs = resolve(cwd, opts.dest);
  if (!within(destAbs, cwdAbs)) {
    err(`artificer vendor: refusing to vendor outside the current directory: ${destAbs}`);
    return EXIT.DEST_ESCAPE;
  }
  const cwdReal = realpathSync(cwdAbs);
  const ancestorReal = realpathSync(deepestExistingAncestor(destAbs));
  if (!within(ancestorReal, cwdReal)) {
    err(`artificer vendor: dest resolves outside the current directory via a symlink: ${ancestorReal}`);
    return EXIT.DEST_ESCAPE;
  }

  const patterns = opts.fonts ? [...RUNTIME_GLOBS, ...FONT_GLOBS] : RUNTIME_GLOBS;
  const matched = matchGlobs(walkRelFiles(srcDir), patterns).sort();
  if (matched.length === 0) {
    err(`artificer vendor: no runtime files matched ${patterns.join(', ')} under ${srcDir}`);
    return EXIT.NO_MATCH;
  }

  // Plan the copies: runtime only (dest path == src-relative path, so
  // relative @font-face URLs survive). primitives.json rides in RUNTIME_GLOBS.
  const copies = matched.map((rel) => ({ srcAbs: join(srcDir, rel), rel }));

  const pkgJsonAbs = join(root, 'package.json');
  const version = JSON.parse(readFileSync(pkgJsonAbs, 'utf8')).version;

  // Prior stamp (if any) — read once for both the drift and collision passes.
  const provAbs = join(destAbs, PROVENANCE);
  let prev = null;
  if (existsSync(provAbs)) {
    try {
      prev = JSON.parse(readFileSync(provAbs, 'utf8'));
    } catch {
      prev = null;
    }
  }
  const prevFiles = prev?.files ?? {};

  // Drift: a stamped file whose bytes no longer match — a consumer hand-edit
  // the re-vendor would clobber.
  const drift = prev ? computeDrift(destAbs, prev) : [];

  // Pre-write pass over every planned dest: (1) refuse a symlinked path
  // component (traversal via a shipped symlink), and (2) collect collisions —
  // a real file already present that NO prior stamp tracks (a first-vendor
  // clobber, sharp with `--dest .`).
  const collisions = [];
  for (const { rel } of copies) {
    const dstAbs = join(destAbs, rel);
    const link = firstSymlinkComponent(destAbs, dstAbs);
    if (link) {
      err(`artificer vendor: refusing to write through a symlink in the dest: ${link}`);
      return EXIT.DEST_ESCAPE;
    }
    if (existsSync(dstAbs) && !(rel in prevFiles)) collisions.push(rel);
  }

  if (drift.length) {
    err(`artificer vendor: ${drift.length} vendored file(s) drifted from ${PROVENANCE}:`);
    for (const d of drift) err(`    ${d.name}  (${d.reason})`);
  }
  if (collisions.length) {
    err(`artificer vendor: ${collisions.length} existing file(s) not tracked by ${PROVENANCE} would be overwritten:`);
    for (const c of collisions) err(`    ${c}`);
  }
  // --strict: refuse to overwrite anything the consumer might own. Drift takes
  // precedence over a first-vendor collision in the exit code.
  if (opts.strict && drift.length) {
    err('artificer vendor: --strict — refusing to overwrite; reconcile or drop the edits, then re-run.');
    return EXIT.DRIFT_STRICT;
  }
  if (opts.strict && collisions.length) {
    err('artificer vendor: --strict — refusing to overwrite untracked files; move them or pick a clean --dest.');
    return EXIT.COLLISION_STRICT;
  }
  if (drift.length || collisions.length) {
    err('artificer vendor: overwriting with the canonical bytes (re-run with --strict to block instead).');
  }

  // Copy + stamp. Bytes are copied verbatim — the sha256 is of exactly what
  // both source and dest hold.
  const files = {};
  try {
    mkdirSync(destAbs, { recursive: true });
    // Post-mkdir re-check: the created dest must still realpath inside cwd.
    if (!within(realpathSync(destAbs), cwdReal)) {
      err(`artificer vendor: dest resolves outside the current directory via a symlink: ${realpathSync(destAbs)}`);
      return EXIT.DEST_ESCAPE;
    }
    for (const { srcAbs, rel } of copies) {
      const dstAbs = join(destAbs, rel);
      mkdirSync(dirname(dstAbs), { recursive: true });
      const buf = readFileSync(srcAbs);
      writeFileSync(dstAbs, buf);
      files[rel] = sha256(buf);
    }
    const provenance = {
      source: 'cameronsjo/artificer',
      version,
      resolvedFrom: computeResolvedFrom(pkgJsonAbs, cwd),
      vendoredAt: new Date().toISOString(),
      files,
    };
    writeFileSync(provAbs, `${JSON.stringify(provenance, null, 2)}\n`);
  } catch (e) {
    if (['EACCES', 'EPERM', 'EROFS', 'ENOSPC'].includes(e.code)) {
      err(`artificer vendor: cannot write to ${destAbs}: ${e.message}`);
      return EXIT.DEST_UNWRITABLE;
    }
    throw e;
  }

  out(`artificer vendor: wrote ${copies.length} file(s) → ${relative(cwd, destAbs) || '.'}  (v${version})`);
  for (const { rel } of copies) out(`    ${rel}`);
  out(`    ${PROVENANCE}`);
  return EXIT.OK;
}

// ── lint ─────────────────────────────────────────────────────────────────────
export function parseLintArgs(argv) {
  const opts = { globs: [], advisory: false, tokens: null, help: false, errors: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--advisory') opts.advisory = true;
    else if (a === '--tokens') {
      const v = argv[++i];
      if (v === undefined) opts.errors.push('--tokens requires a path argument');
      else opts.tokens = v;
    } else if (a.startsWith('--tokens=')) {
      opts.tokens = a.slice('--tokens='.length);
    } else if (a.startsWith('-')) {
      opts.errors.push(`unknown option "${a}"`);
    } else {
      opts.globs.push(a);
    }
  }
  return opts;
}

// Resolve the token inventory in priority order, surfacing WHICH source won so a
// consumer can see the lockstep: --tokens > vendored dest > the package's own
// tokens.json (version-locked) > built-in workshop scale (last resort). A bad
// EXPLICIT --tokens is an error; a missing/broken DISCOVERED source falls
// through to the next.
export function resolveTokenMaps({ tokensArg, cwd, packageRoot }) {
  const load = (abs, label) => {
    try {
      const json = JSON.parse(readFileSync(abs, 'utf8'));
      const v = json.$version ? ` (tokens v${json.$version})` : '';
      return { maps: buildTokenMaps(json), source: `${label}${v}` };
    } catch {
      return null;
    }
  };
  if (tokensArg) {
    const abs = resolve(cwd, tokensArg);
    if (!existsSync(abs)) return { error: `--tokens path not found: ${abs}` };
    return load(abs, `--tokens ${tokensArg}`) ?? { error: `--tokens file is not valid JSON: ${abs}` };
  }
  const vendored = resolve(cwd, DEFAULT_DEST, 'tokens.json');
  if (existsSync(vendored)) {
    const r = load(vendored, `vendored ${relative(cwd, vendored).split(sep).join('/')}`);
    if (r) return r;
  }
  const own = join(packageRoot, 'src', 'tokens.json');
  if (existsSync(own)) {
    const r = load(own, 'package src/tokens.json');
    if (r) return r;
  }
  // Last resort: lintText's own built-ins (pass no maps).
  return { maps: undefined, source: 'built-in workshop scale (no tokens.json found)' };
}

const LINT_HELP = `artificer lint — check your CSS for raw values that have a token (Hard rule #1)

Usage:
  npx @cameronsjo/artificer lint <glob...> [--advisory] [--tokens <path>]

Flags raw hex, on-scale spacing/radius px, and near-scale font-size px that map
to a token, outside custom-property definitions and comments. A trailing
/* tuned */ exempts a line. The token inventory is read from (in order):
  --tokens <path>  →  ./public/artificer/tokens.json (your vendored copy)  →
  the installed package's own src/tokens.json  →  the built-in scale.
The chosen source is printed, so the lint stays in lockstep with your version.
There is deliberately NO config file — the discipline is not per-consumer.

Options:
  --advisory        Report violations but exit 0 (default is strict: exit 2)
  --tokens <path>   Read the token inventory from this tokens.json
  --help, -h        Show this help`;

export function lint({ argv = [], cwd = process.cwd(), packageRoot, out = console.log, err = console.error } = {}) {
  const opts = parseLintArgs(argv);
  if (opts.help) {
    out(LINT_HELP);
    return EXIT.OK;
  }
  if (opts.errors.length) {
    for (const e of opts.errors) err(`artificer lint: ${e}`);
    err(LINT_HELP);
    return EXIT.USAGE;
  }
  if (opts.globs.length === 0) {
    err('artificer lint: no glob given (e.g. "src/**/*.css")');
    err(LINT_HELP);
    return EXIT.USAGE;
  }

  // Containment: lint only reads within the project. A glob whose static base
  // resolves outside cwd (a literal `../secret/*`, an absolute path, or a
  // symlinked base) is refused loudly — not a silent "no files matched".
  const cwdAbs = resolve(cwd);
  const cwdReal = realpathSync(cwdAbs);
  for (const raw of opts.globs) {
    const { baseAbs } = globStaticBase(cwd, raw);
    const ancestorReal = realpathSync(deepestExistingAncestor(baseAbs));
    if (!within(baseAbs, cwdAbs) || !within(ancestorReal, cwdReal)) {
      err(`artificer lint: glob resolves outside the project: ${raw}`);
      return EXIT.USAGE;
    }
  }

  const root = packageRoot ?? resolvePackageRoot(BIN_DIR);
  const resolved = resolveTokenMaps({ tokensArg: opts.tokens, cwd, packageRoot: root });
  if (resolved.error) {
    err(`artificer lint: ${resolved.error}`);
    return EXIT.USAGE;
  }
  err(`artificer lint: token source — ${resolved.source}`);

  const files = listFilesForGlobs(cwd, opts.globs);
  if (files.length === 0) {
    err(`artificer lint: no files matched ${opts.globs.join(', ')} under ${cwd}`);
    return EXIT.LINT_NO_FILES;
  }

  let total = 0;
  for (const rel of files) {
    let text;
    try {
      text = readFileSync(join(cwd, rel), 'utf8');
    } catch {
      continue;
    }
    const v = lintText(text, { fontScale: !FONT_SCALE_EXEMPT.test(rel), tokens: resolved.maps });
    if (v.length) {
      report(rel, v, err);
      total += v.length;
    }
  }

  if (total === 0) {
    out(`artificer lint: 0 violations across ${files.length} file(s)`);
    return EXIT.OK;
  }
  if (opts.advisory) {
    err(`artificer lint: ${total} violation(s) across ${files.length} file(s) — advisory (exit 0)`);
    return EXIT.OK;
  }
  err(`artificer lint: ${total} violation(s) across ${files.length} file(s) — run with --advisory to report without failing`);
  return EXIT.LINT_VIOLATIONS;
}

// ── router ────────────────────────────────────────────────────────────────────
const COMMANDS = { vendor, lint };

export function route({ argv = [], cwd = process.cwd(), packageRoot, out = console.log, err = console.error } = {}) {
  const [cmd, ...rest] = argv;
  if (cmd === '--help' || cmd === '-h') {
    out(HELP);
    return EXIT.OK;
  }
  if (cmd === undefined) {
    err(HELP);
    return EXIT.USAGE;
  }
  const fn = COMMANDS[cmd];
  if (!fn) {
    err(`artificer: unknown command "${cmd}"`);
    err(HELP);
    return EXIT.USAGE;
  }
  return fn({ argv: rest, cwd, packageRoot, out, err });
}

// Run only when invoked as a script (deref symlinks so the npx .bin shim
// still counts as "main"); stay inert when imported by tests.
const invoked = process.argv[1] ? realpathSync(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  process.exit(route({ argv: process.argv.slice(2) }));
}
