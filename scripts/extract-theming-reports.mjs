#!/usr/bin/env node
// Extract per-app theming reports + triage from the workflow result file
// and write them into docs/research/theming/. Read-only on the source file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = process.argv[2];
const OUT = resolve(process.cwd(), 'docs/research/theming');
mkdirSync(OUT, { recursive: true });

const raw = readFileSync(SRC, 'utf8');

// Find the result object: try whole-file JSON, then JSONL line-scan for {reports,...}.
function findResult(text) {
  try {
    const o = JSON.parse(text);
    if (o && Array.isArray(o.reports)) return o;
    // maybe wrapped: search known keys
    for (const v of Object.values(o ?? {})) {
      if (v && Array.isArray(v.reports)) return v;
    }
  } catch { /* not whole-file JSON */ }
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{')) continue;
    try {
      const o = JSON.parse(t);
      if (o && Array.isArray(o.reports)) return o;
      // dig one level (transcript events sometimes nest under .result/.content)
      const cand = o.result ?? o.value ?? o.output;
      if (cand && Array.isArray(cand.reports)) return cand;
    } catch { /* keep scanning */ }
  }
  return null;
}

const result = findResult(raw);
if (!result) {
  console.error('RESULT_NOT_FOUND');
  process.exit(2);
}

const reports = result.reports ?? [];
let written = 0;
const manifest = [];
for (const r of reports) {
  if (!r || !r.slug || !r.markdown) {
    manifest.push({ slug: r?.slug ?? '??', ok: false, reason: 'missing slug/markdown' });
    continue;
  }
  const path = resolve(OUT, `${r.slug}.md`);
  writeFileSync(path, r.markdown.trimStart() + '\n');
  manifest.push({ slug: r.slug, name: r.name, tier: r.tier, bytes: r.markdown.length, ok: true });
  written++;
}

if (typeof result.triage === 'string' && result.triage.trim()) {
  writeFileSync(resolve(OUT, '00-candidate-universe.md'), result.triage.trimStart() + '\n');
  manifest.push({ slug: '00-candidate-universe', ok: true, bytes: result.triage.length });
}

console.log(JSON.stringify({
  attempted: result.attempted,
  reportsReturned: reports.length,
  filesWritten: written,
  triage: typeof result.triage === 'string',
  manifest,
}, null, 2));
