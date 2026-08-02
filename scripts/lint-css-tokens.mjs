#!/usr/bin/env node
// Artificer Hard rule #1 linter — workshop CLI wrapper.
//
// The lint ENGINE lives in bin/lint-core.mjs (single source; it also backs the
// consumer `artificer lint` subcommand, and bin/ ships to both the npm payload
// and the public repo). This wrapper is the workshop's gate + PostToolUse hook
// entry; it uses the built-in workshop scale (no tokens.json injection), so its
// behavior is byte-identical to before the #219 Phase-2 extraction.
//
// Rule #1 precision pass (v0.9.0): component-internal padding may be a tuned
// literal — mark it with a trailing `/* tuned */` and the linter skips it.
// Font-size watch (#187): raw font-size px within ±2px of a --t-*-size token is
// near-scale drift, flagged with the nearest token. The Obsidian sister theme
// (theme.src.css) is exempt (its type contract is Lane 2's, not the repo scale).
//
// Modes:
//   node scripts/lint-css-tokens.mjs <file.css> ...   lint files (CI / audit)
//   node scripts/lint-css-tokens.mjs --stdin [label]  lint a CSS snippet from stdin
// Exit 0: clean.   Exit 2: violations found (message on stderr).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lintText, report, FONT_SCALE_EXEMPT } from '../bin/lint-core.mjs';

// Re-export so existing importers (lint-css-tokens.test.mjs, the PostToolUse
// hook) keep resolving lintText from this path.
export { lintText, report, FONT_SCALE_EXEMPT };

// CLI entrypoint — only when run directly, so importing for tests doesn't fire.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let total = 0;

  if (args[0] === '--stdin') {
    const label = args[1] || 'edited content';
    const text = readFileSync(0, 'utf8');
    const v = lintText(text, { fontScale: !FONT_SCALE_EXEMPT.test(label) });
    if (v.length) { report(label, v); total = v.length; }
  } else {
    for (const file of args) {
      let text;
      try { text = readFileSync(file, 'utf8'); } catch { continue; }
      const v = lintText(text, { fontScale: !FONT_SCALE_EXEMPT.test(file) });
      if (v.length) { report(file.replace(process.cwd() + '/', ''), v); total += v.length; }
    }
  }
  process.exit(total ? 2 : 0);
}
