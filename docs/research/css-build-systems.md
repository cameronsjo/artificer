# CSS build systems & file modularity — for a single-file-distributed design system

> `src/artificer.css` is 1,348 hand-authored lines, shipped as-is with no build
> step, duplicated byte-for-byte into `live-spec/`. This surveys whether that's
> a problem, scores the organization/build options against the one-file
> distribution contract, and ends with the lightest path that solves the real
> pain.

**Date:** 2026-05-31
**Lane:** 3 (research)

---

## Overview

Three facts about Artificer's current state frame every option below, all
confirmed against the repo:

- **No CSS build exists.** `themes/build.mjs` generates the *editor* themes
  (Claude Code / Ghostty / VS Code) from `_palette.json`; it never touches
  `artificer.css`. There is no PostCSS, Sass, or Lightning CSS. The shipped CSS
  is authored by hand and published verbatim.
- **The distribution contract is one file.** `package.json` ships
  `"files": ["src"]` and exports `"./artificer.css": "./src/artificer.css"`
  *directly* — no build artifact between source and consumer — plus a
  jsDelivr/SRI CDN path. Any answer must preserve a single shipped
  `artificer.css`.
- **The `live-spec` copy is held in sync by hand, not by a build.**
  `src/artificer.css` and `live-spec/artificer.css` are currently byte-identical
  (verified), but **nothing copies content between them.** `sync-version.mjs`
  only rewrites the version banner and `--art-version` string in each file
  *independently* (`scripts/sync-version.mjs:40–43`); `lint-css-palette.mjs`
  lints both copies *separately*. So byte-parity is upheld purely by whoever
  edits `src/` remembering to hand-copy into `live-spec/`. This is the most
  drift-prone seam in the system, and "split the file" does nothing for it.

The real questions, then: is 1,348 LOC actually unwieldy; how to get authoring
structure without breaking the one-file contract; and how to retire the
hand-synced dual copy.

## 1. Is ~1,350 LOC of CSS actually unwieldy?

**Mostly no — and the honest version of this finding matters, because the
cheapest fix is "do almost nothing."** 1,348 lines of *token-driven, no-raw-value*
CSS is a medium file, not a large one. The system already has strong internal
discipline (semantic tokens, six z-index rungs, one easing curve, a hard
no-hardcoded-hex rule enforced by `lint:palette`/`lint:tokens`), which is the
property that actually makes large CSS unmaintainable when it's *absent*.
Structure and consistency, not line count, are what decide maintainability.

Peer design systems do split CSS, but they split for reasons Artificer doesn't
share: independently-versioned packages, framework-specific bundles, tree-shaking
per component, or many contributors touching disjoint areas. Artificer is a
single-author, single-file, vendored-or-CDN system. The cost/benefit of staying
monolithic is favorable: one file is trivially cacheable, trivially SRI-hashable,
has no import-order hazards, and needs no toolchain. The pain it *does* impose is
purely **authoring ergonomics** — navigating 1,348 lines, and the lack of
visible section/cascade structure — not correctness or distribution.

**This navigability pain is reported, not hypothetical.** Issue
[#78](https://github.com/cameronsjo/artificer-design-system/issues/78) is a
vendored consumer (the agentic-harnesses SPA) who, to adopt the v0.10 nav
primitives, *"grepped ~1,700 lines of `artificer.css` to recover roles (found
the taxonomy in the comment at `src/artificer.css:1015-1024`)"* — because the
stylesheet is the de-facto catalog-of-record for anyone who vendored, and *"a
buried comment in a 1,700-line file isn't a catalog a consumer can consult at
adoption time."* (Their `~1,700 lines / 69 KB` is the vendored payload's count;
current `src/artificer.css` is 1,348 lines, ~69 KB — same order, same problem.)
Two things matter for this doc. First, it confirms the pain is on the
**discoverability** axis, not size: the file isn't *too big to maintain*, it's
*too flat to navigate* — there's no table of contents and the good per-primitive
role comments are buried rather than indexed. Second, #78's *full* remedy is
broader than CSS structure — it asks for a compact **primitives map**
(`primitives.json` / a vendored cheatsheet) that rides alongside the runtime —
which is a **distribution-of-docs** decision, outside this build doc's remit.
A build can only fix the *in-file* half: make the one local source-of-truth
navigable. The catalog-ships-with-the-payload half is tracked in #78 and should
not be conflated with "organize the CSS."

> **Conclusion:** the file is not unwieldy enough to justify a build *for size
> reasons* — but the **navigation/discoverability** pain is real and documented
> (#78). If a build earns its place, it's to fix the `live-spec` dual-copy and
> to add authoring/navigation structure — not to "break up a big file."

## 2. The options, scored against the one-file contract

### Option A — Zero-build organization: native `@layer` + nesting

Structure the *single* file into named cascade layers without splitting it.
Cascade layers (`@layer`) let an author impose explicit cascade ordering by
layer-creation order, decoupling precedence from source position and selector
specificity — so a monolith can be organized into ordered sections
(`reset → tokens → base → components → utilities`, ITCSS-style) with the
ordering fixed up front
([Chrome dev blog, "Cascade layers"](https://developer.chrome.com/blog/cascade-layers) — *primary*;
[MDN, "Cascade layers"](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Cascade_layers) — *primary*;
[CSS-Tricks, "CSS Cascade Layers"](https://css-tricks.com/css-cascade-layers/)).
Layers shipped in **Chromium 99, Firefox 97, Safari 15.4** (early 2022 — baseline
for years); native nesting and layers are broadly supported with no transpilation
needed ([builder.io](https://www.builder.io/blog/css-2024-nesting-layers-container-queries)).

**This is the lowest-cost, highest-fit option** — it adds structure with zero
toolchain, zero distribution change, one file in and one file out. But it carries
**two real hazards** that gate adoption:

- **The all-or-nothing rule.** *Unlayered* normal styles outrank *layered* ones,
  regardless of specificity — MDN: *"Normal unlayered declarations take precedence
  over normal layered declarations even if the unlayered styles have a lower
  specificity"* [verified]. So Artificer cannot *half*-layer the file: wrapping
  only the components section in `@layer` while leaving tokens/utilities unlayered
  would silently demote the layered rules beneath everything else. Adopting
  `@layer` means layering the **whole** sheet in one move, and re-testing the
  cascade — a real, if one-time, migration.
- **The nesting specificity gotcha.** Native nesting's `&` is not textual
  substitution; it wraps the ancestor in `:is()`, which can *raise* specificity
  unexpectedly ([piccalil.li, "CSS nesting: use with caution"](https://piccalil.li/blog/css-nesting-use-with-caution/)).
  For a system this disciplined about predictable cascade, nesting should be
  adopted sparingly if at all.

### Option B — Author-many → emit-one (the build path)

Author the system as partials (`tokens.css`, `base.css`, `components/*.css`,
`utilities.css`) and concatenate to a single `artificer.css`, preserving the
distribution contract. Candidate bundlers: `postcss-import`, native `@import`
bundling, `esbuild`, or **Lightning CSS**.

**Lightning CSS is the standout** and is worth evaluating specifically, because
it does the whole job in one fast Rust tool, in a single call:

- **Bundles `@import` partials into one output file** — *"Lightning CSS supports
  bundling dependencies referenced by CSS `@import` rules into a single output
  file"* [verified]. Exactly author-many-emit-one, contract preserved.
- **Assigns imported partials to cascade layers during bundling** — *"Imported
  CSS rules can also be placed into a CSS cascade layer"* [verified] — so Options
  A and B compose: partials *are* the layers.
- **Minifies and emits a source map in the same `bundle()` call** [verified] —
  covers the shipped-minification and source-maps-for-partial-authoring needs at
  once.
- **Structural minification**, not just whitespace: merges longhands into
  shorthands, merges adjacent rules and identical-query at-rules, reduces colors
  and `calc()`
  ([Lightning CSS — Minification](https://lightningcss.dev/minification.html) — *primary*;
  [Lightning CSS — Bundling](https://lightningcss.dev/bundling.html) — *primary*).
- Invoked via the `bundle`/`bundleAsync` API or the `--bundle` CLI flag
  [verified] — a few lines in a `build:css.mjs`, mirroring the existing
  `build:themes` script.

`postcss-import` + `cssnano` achieves the same emit-one + minify outcome with a
larger dependency tree and an extra config surface; `esbuild`'s CSS bundler is
fast but less CSS-aware than Lightning. For a system that already runs Node
build scripts and values one fast dependency over a plugin chain, **Lightning
CSS is the natural fit** — and it's the same engine bundled inside Vite/Parcel,
so it's well-trodden.

### Option C — Preprocessors (Sass/Less): rejected

Sass/Less buy variables, mixins, nesting, and `@import` partials — but Artificer
*already has* variables (CSS custom properties / tokens) and is doctrinally
**no-raw-value**. A preprocessor's `$variables` would create a *second* variable
system competing with the token layer, and its compile-time color functions
invite exactly the hardcoded-hex the system forbids. Native `@layer` + nesting +
a thin bundler cover the only things a preprocessor would add (partials,
ordering, nesting) without the impedance mismatch. **Overkill and in tension
with the doctrine.** Skip.

## 3. Minification & `dist/`

The shipped file *can* be minified, but the distribution model argues for
**shipping readable `src/` and adding a minified `dist/` alongside, not
replacing it:**

- Artificer's value includes being *readable* — it's vendored into projects and
  read as reference (the entire `live-spec/` exists for this). A minified-only
  ship would damage that. Keep `./artificer.css` → readable `src/`.
- Add an **optional** `"./artificer.min.css"` export emitted to `dist/` for
  CDN/production consumers who want the smaller payload (Lightning's structural
  minification typically beats whitespace-only tools meaningfully). SRI hashes
  (PR #55) would then cover both files.
- **Source maps** become valuable the moment authoring moves to partials
  (Option B): a map lets a consumer debugging the bundled file jump back to the
  partial. Lightning emits the map in the same `bundle()` call [verified].

This keeps the one-file *contract* (the default export stays a single file)
while adding a minified sibling — not a breaking change.

## 4. Solving the `live-spec` dual-copy

This is the **concrete pain a build most cleanly retires**, independent of
everything else. Today byte-parity between `src/artificer.css` and
`live-spec/artificer.css` is manual; nothing copies content, and the version
script touches each file separately. A build inverts this:

- **If Option B (partials) is adopted:** the bundler's *output target is a
  list*. Emit the same bundled `artificer.css` to **both** `src/` (or `dist/`)
  and `live-spec/` in one build step. The dual copy stops being two hand-edited
  files and becomes two emit targets of one source-of-truth partial set —
  drift becomes structurally impossible.
- **Even without partials**, the smallest possible fix is a `build:livespec`
  step (or a `predocs` hook) that does a single `copyFileSync(src →
  live-spec)` for the CSS/JS assets, plus a CI check that the two match — making
  the existing manual discipline *enforced* rather than *remembered*. This is a
  ~10-line script and could ship today, ahead of any larger build decision.

Either way the principle is the same: **`live-spec/` should be a generated
mirror, never an edited copy.** The current `sync-version.mjs` and
`lint-css-palette.mjs` both operating on two independent copies is the symptom;
a one-source-two-targets emit is the cure.

## 5. Token pipeline adjacency

`tokens.json` and the `:root` CSS custom properties are a **hand-maintained dual
source** — the same values written twice, by hand, in two formats. This is the
same class of problem as the `live-spec` dual copy, one layer up. A build *could*
generate the `:root` block from `tokens.json` (the canonical tool is
**Style Dictionary**, which transforms one token source into CSS vars, JS, JSON,
Tailwind config, etc.). Noting, not solving — but the implications for existing
scripts are worth recording so a future Lane 1 decision goes in eyes-open:

- **`lint:tokens` / `lint:palette` / `check:contrast`** currently lint the
  authored CSS as the source of truth. If `:root` becomes *generated* from
  `tokens.json`, the lint target shifts: contrast/palette checks would run
  against `tokens.json` (or the generated output), and the "no hardcoded hex in
  CSS" lint would still guard the hand-authored component rules. The checks don't
  disappear; their input moves.
- **`sync-version.mjs`** would shrink: if both `:root` and the version banner are
  generated, version stamping becomes part of the generate step rather than a
  regex rewrite across copies.
- **Risk:** Style Dictionary is a non-trivial dependency and a conceptual shift
  (tokens-as-source, CSS-as-artifact). It's the *right* long-term shape for a
  token-driven system, but it's the **heaviest** item here and should not be
  bundled with the lighter wins. Flag it as a separate, later Lane 1 question.

## Recommended direction for Artificer

Framed as a Lane 1 input — **nothing built here.** Sequenced lightest-first, so
each step is independently shippable and reversible:

1. **Ship the `live-spec` sync fix now, build-agnostic.** Add a `build:livespec`
   (`copyFileSync` src → live-spec for the shared CSS/JS assets) plus a CI parity
   check. This retires the single most drift-prone seam for ~10 lines and zero
   distribution change — do it regardless of any larger decision. *(This is the
   real pain; fix it first.)*

2. **Give the one file a spine — and do it now, because #78 says the pain is
   felt.** Two sub-moves, cheapest first:
   - **A table-of-contents comment block + consistent section banners**
     (`/* ===== COMPONENTS ===== */`). Zero risk, zero toolchain, ~30 minutes —
     and it directly addresses the *in-file* half of
     [#78](https://github.com/cameronsjo/artificer-design-system/issues/78):
     a vendored consumer grepping the stylesheet gets jump-to-section and an
     index instead of a flat scroll. Do this first regardless of anything else.
   - **Then organize with `@layer` as one deliberate migration.** Adopt a single
     layer order (`tokens → base → components → utilities`, ITCSS-style) across
     the **whole** file in one move (the all-or-nothing rule forbids half-measures
     [verified]), and re-test the cascade. Zero distribution change, big
     authoring-clarity win. Adopt nesting only sparingly, mindful of the `:is()`
     specificity gotcha.

   Scope note: this fixes navigating *the CSS*. #78's other half — shipping a
   `primitives.json`/cheatsheet *with the vendored payload* — is a separate
   distribution decision tracked in that issue, not solved here.

3. **Then, if authoring-in-one-file still chafes, add Lightning CSS as an
   author-many-emit-one bundler.** Author partials → `bundle()` → emit one
   `artificer.css` to both `src`/`dist` and `live-spec` (folding step 1 into the
   build), plus a minified `dist/artificer.min.css` sibling with a source map.
   One fast Rust dependency, mirrors the existing `build:themes` pattern, keeps
   the one-file contract.

4. **Hold the Style Dictionary / generate-`:root`-from-`tokens.json` question as
   a separate, later decision.** It's the right long-term shape but the heaviest
   change and reworks the lint pipeline's inputs; don't couple it to the wins
   above.

**Evidence-backed bottom line:** the file is *not* too big to maintain — so the
case for a build rests on the `live-spec` dual-copy and **navigability** (#78),
not size. The lightest thing that solves the *real* pain is **step 1 (sync fix)
+ step 2 (TOC/banners, then `@layer`)**, both zero-distribution-change. A bundler
(step 3) is a clean, optional upgrade when partials become worth it;
preprocessors are rejected; token-source generation is a deliberate later call.

**Open questions for Lane 1:** #78 already answers "is the friction felt?" — yes,
a vendored consumer source-dived the stylesheet — so the open question is scope:
do the TOC/banners + `@layer` go far enough, or does closing #78 also require the
separate vendored-`primitives.json` decision? Should the minified `dist/` ship
now (CDN payload) or wait for a bundler? Is generating `:root` from `tokens.json`
worth reworking the lint targets, or is the hand-maintained dual source tolerable
given the existing lint guards?

## Sources

Fetched and used (claim count in parentheses); quality as rated by the research
harness. Spot-checked links are marked **[verified]**.

- [Chrome dev blog — Cascade layers](https://developer.chrome.com/blog/cascade-layers) — *primary* (5)
- [MDN — Cascade layers](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Cascade_layers) — *primary* (5) **[verified: unlayered outranks layered; precedence = creation order, beats specificity]**
- [Lightning CSS — Bundling](https://lightningcss.dev/bundling.html) — *primary* (5) **[verified: bundles @import → one file; layer assignment; minify + source map in one bundle() call; bundle()/bundleAsync()/`--bundle`]**
- [Lightning CSS — Minification](https://lightningcss.dev/minification.html) — *primary* (5)
- [CSS-Tricks — CSS Cascade Layers](https://css-tricks.com/css-cascade-layers/) — *secondary* (5)
- [Design Systems Collective — Mastering CSS Cascade Layers](https://www.designsystemscollective.com/mastering-css-cascade-layers-for-scalable-design-systems-981fdab2a961) — *blog* (5)
- [builder.io — CSS in 2024: nesting, layers, container queries](https://www.builder.io/blog/css-2024-nesting-layers-container-queries) — *blog* (4)
- [piccalil.li — CSS nesting: use with caution](https://piccalil.li/blog/css-nesting-use-with-caution/) — *blog* (4)

**Method note.** Produced by the `deep-research` harness (5 search angles → 21
sources fetched → 38 claims). The adversarial-verification phase failed under
rate limits (verifiers abstained — votes recorded `0-0`, not genuine
refutations), so synthesis relies on the extracted claims plus four manual
`WebFetch` spot-checks of the load-bearing claims (marked **[verified]**).
Sources that failed to fetch (Style Dictionary docs, jsDelivr docs, several
blogs) are **not** cited; Style Dictionary is named from general knowledge as a
*candidate*, not a fetched claim.
