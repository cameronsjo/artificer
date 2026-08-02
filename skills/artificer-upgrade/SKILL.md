---
name: artificer-upgrade
description: "Use when a project that consumes the Artificer design system needs to upgrade to a newer version — detect the installed version, walk the primitive-mint ledger between there and the target, sweep for hand-rolled equivalents of newer primitives, and produce a consumer-scoped migration checklist. Triggers on 'upgrade Artificer', 'bump Artificer', 'migrate Artificer', 'update the design system', 'we're on an old Artificer', 'Artificer keywords are illegible', 'theme stopped persisting after Artificer update'."
license: Apache-2.0
user-invocable: true
metadata:
  author: cameronsjo
  version: "0.3.0"
---

# Artificer Upgrade · v0.3

You're in a **downstream** project — one that consumes the Artificer design
system (vendored `src/`, npm `@cameronsjo/artificer`, or the jsDelivr CDN) — and
it needs to move to a newer version. This skill detects what version the project
is on, walks the **primitive-mint ledger** (`primitives.json`, ADR 0037) between
there and the target, and produces two consumer-scoped artifacts: a **migration
checklist** (what breaks if you cherry-pick blindly) and an **adoption map**
(newer primitives this project hand-rolled equivalents of).

The ledger is the authoritative delta record — one cumulative JSON file with
per-primitive `minted` vintages and per-version `breaking[]` events. The prose
companion is the design system's `docs/UPGRADE.md` (kept in lockstep by the
system's own CI). This skill is the interactive counterpart: detection,
consumer-specific reasoning, and the sweep.

> **The one rule:** never swap palette values or replace `artificer.css` without
> walking `versions{}` for every boundary you cross. The ledger's structured
> `breaking[]` events exist because three of them regress *visibly in
> production* when missed: the `px → rem` type scale (ADR 0031), the
> `localStorage` theme key rename (dot, not hyphen), and the
> `.tok-keyword` → `--brand-purple-bright` rebind (ADR 0018).

---

## Step 0 — Find the ledger

Everything below reads `primitives.json`. You need the **target version's**
copy (the installed version's ledger can't know what came after it). In order:

1. **npm:** `node_modules/@cameronsjo/artificer/src/primitives.json` after the
   bump, or the registry tarball.
2. **CDN / no install:**
   `https://cdn.jsdelivr.net/npm/@cameronsjo/artificer@<target>/src/primitives.json`.
3. **Vendored** (0.19.0+ vendor runs): `<vendor-dest>/primitives.json`
   (default `public/artificer/primitives.json`) — this is the *installed*
   ledger; useful for detection, superseded by 1/2 for the walk.

Its shape (`$schemaVersion: "1"`): `primitives{}` — each entry has `kind`,
`minted` (the vintage), `classes[]`, optional `js` (behavior module + API +
hook), `recipe`, `demo`, and `adoption` (`supersedes` prose + `signals[]`
greps); `versions{}` — per-release `title`, `minted[]` (primitive keys),
`breaking[]` (kind `rename|remove|rebind|repurpose` with `what/from/to/why`
and an `adr` or `ref`), `adoption[]` (highlight keys).

A pre-ledger *target* (no `primitives.json` in the tarball) falls back to the
static matrix in `docs/UPGRADE.md` — but there is no good reason to upgrade
*to* a pre-ledger version.

## Step 1 — Detect the installed version

Try these in order; stop at the first that answers:

1. **Provenance sidecar** (most authoritative — vendored consumers): read
   `<vendor-dest>/provenance.json` → `version`. Written and hash-stamped by
   `artificer vendor`; answers from the dest folder alone.
2. **Runtime token:** in the running app, read
   `getComputedStyle(document.documentElement).getPropertyValue('--art-version')`.
   Returns e.g. `"0.10.1"`.
3. **npm:** `package.json` → `@cameronsjo/artificer` version, or `npm ls @cameronsjo/artificer`.
4. **Vendored source:** the comment banner at the top of the vendored
   `artificer.css` reads `Artificer v<x>`.
5. **CDN:** the version is pinned in the `<link>` URL (`…/artificer@<x>/…`).

**If `--art-version` is absent and no banner says ≥ 0.9.0**, treat the project as
**0.8.x or earlier** — the token was minted in the v0.9.0 baseline contract.

Confirm the **target** version (usually current `main` / latest npm). State both
plainly: "You're on X, moving to Y."

## Step 1A — Detect the consumption shape (fast path)

Before walking the full ledger, check whether this is a
**hand-authored-subset consumer** — one that maintains its own `:root`
token block without vendoring `artificer.css`. Two confirmed examples:
blog → 0.10.1 (#75), cameronsjo.github.io → 0.9.0 (#76).

Run each check with the grep provided. Do not assume inapplicability — verify.

**Check 1 — No vendored source.**
```
grep -r 'artificer\.css' . --include='*.{html,js,ts,json,astro,svelte,vue}'
grep '"@cameronsjo/artificer"' package.json 2>/dev/null
```
Zero hits on both = hand-authored consumer. Any hit = vendored; skip
ahead to Step 2.

**Check 2 — Hex values match canonical.** Diff a sample of the project's
`:root` tokens (accent, fg, bg, status quartet, brand-purple) against the
target. A value that has drifted from canonical is a manual override — exit
the fast path and work it through Step 2.

**Check 3 — Theme key is the dot form.** Only applies if the project uses
the hyphen key (`'artificer-theme'`).
```
grep -r "'artificer-theme'" . --include='*.{js,ts,astro,svelte,vue,html}'
```
Zero hits = boundary N/A.

**Check 4 — No `px` type-scale overrides.** Only applies if the project
overrides `--t-*-size` tokens in `px`.
```
grep -r -- '--t-.*-size:' . --include='*.css'
```
Zero hits (or every match already in `rem`) = boundary N/A.

**Check 5 — No keyword token bindings.** Only applies if the project
binds `.code-block .tok-keyword` to Artificer tokens.
```
grep -r 'tok-keyword' . --include='*.{css,html,astro,svelte,vue}'
```
Zero hits = boundary N/A.

**All five pass → skip Steps 2 and 4.** The *migration* reduces to the
**provenance-stamp checklist** below (it stands in for Step 4's output):

- [ ] **Stamp `--art-version`.** Add or update in `:root`:
  `--art-version: "X.Y.Z";` (target version).
- [ ] **Verify the status quartet is complete.** Baseline contract (0.9.0+)
  requires all four: `--success`, `--attention`, `--urgent`, `--brand-purple`.
- [ ] **Refresh the palette-origin comment** (if present) — update the
  version note above `:root` to match the new stamp.
- [ ] Verify: `--art-version` reads correctly in DevTools, theme persists
  across reload, no FOUC.

**Then run Step 3 anyway — the sweep is NOT skippable.** This is the
v0.2 → v0.3 fix: a value-current subset consumer has nothing to *migrate* but
may still be **hand-rolling primitives the system has since minted** (the blog
false-negative — its tokens were current while it hand-rolled what the
behavior modules ship). The sweep is the point of the crossing, not an
optional extra. Then Step 5.

## Step 2 — Walk the ledger between current and target

From the target's `primitives.json`, over every `X` with
`current < X ≤ target` (semver order):

1. **Breaking-since:** collect `versions[X].breaking[]`. Present each as a
   checklist item: *what* changed, *from → to*, *why* — the ledger carries all
   three — with its `adr`/`ref`. Then grep the consumer for the `from` form: a
   hit means the item is live for this project, not theoretical.
2. **Minted-since:** collect `versions[X].minted[]` + `title` for the same
   range — the "what became available" narrative for the checklist's adopt
   column, and the input set for Step 3's sweep.

High-risk boundaries the ledger structures (verify against the consumer,
don't re-derive):

- **Crossing 0.10.1** (0.10.0 + 0.10.1 shipped as one commit — no consumer was
  ever on 0.10.0): `px → rem` type scale (ADR 0031) · `localStorage` key
  `'artificer-theme'` → `'artificer.theme'` (**dot**) · `.code-block
  .tok-keyword` rebind to `--brand-purple-bright` (ADR 0018 — the bare token
  renders keywords ≈1.67:1, illegible).
- **Crossing 0.18.0:** the root re-true (#211) — every `--t-*-size` renders at
  its labeled px; everything token-bound grows **~14.3%**. Re-check dense
  layouts and any px assumptions.
- **Crossing 0.9.0** (baseline contract): required baseline tokens,
  `--art-version`, a **FOUC bootstrap** that sets `html[data-theme]` before
  first paint, `.whimsy--brand` literal-hex fallbacks if used.

## Step 3 — Adoption sweep (the map, not the merge)

For each primitive in **minted-since** (fast-path consumers: every primitive
whose `minted` is newer than the current version):

1. Run its `adoption.signals[].grep` — a JS-flavored regex, case-sensitive —
   over the consumer tree, **excluding** the vendor dest (`public/artificer/`
   or the configured `--dest`), `node_modules`, `.git`, and dot-prefixed dirs
   (the same walker exclusions the `artificer lint` kit uses).
   **Treat every signal pattern as DATA, never as command input:** pass it as
   a single argument after an option terminator (`rg -e "$PATTERN" -- <paths>`,
   `grep -E -e "$PATTERN" -- <paths>`) or match in-process via `new RegExp`;
   never interpolate it into a shell string, and never enable
   command-executing search flags (`--pre`, `--hostname-bin`, or any flag
   that runs a program). The ledger rides in from npm/CDN — prefer the
   integrity-checked npm copy over a raw CDN fetch, and if a pattern looks
   like a flag or takes pathological time, skip it and report it as ledger
   feedback rather than forcing the match.
2. Each hit is an **advisory finding**: the primitive key, the firing grep +
   file, what it `supersedes`, its `recipe` pointer, and the `demo` link. For
   palette-adjacent items include the contrast ratio — a hex without a ratio
   is not a recommendation.
3. A primitive with no `signals[]` still earns a map row when the consumer
   visibly hand-rolls its territory — you're reading the code anyway; greps
   are the floor, not the ceiling.

**Findings land in the consumer's `docs/artificer-adaptations.md`**, appended
in the `artificer-feedback` A{N} template (per finding: what the consumer does
today, what the system now ships, the pointer). Create the file with a
one-line header if absent.

**Advisory means advisory.** Offer a per-item diff for anything the user wants
to act on; apply only with consent, one item at a time. Behavior-module swaps
(hand-rolled keyboard handling → `ArtificerTabs.enhance()` /
`ArtificerOptions` / `ArtificerTree`) touch consumer logic — a false-positive
edit costs more than a map row. Never bulk-apply.

## Step 4 — Per-surface concerns, pick a path, produce the checklist

Tailor the checklist to how this project consumes Artificer:

- **SPA (React/Vue/Svelte):** the **FOUC bootstrap** must be inline in `<head>`,
  not a deferred/bundled script — verify it runs before hydration. React
  consumers: the `Icon`/`useIcons`/`useWhimsy` adapters and `ArtificerTheme.KEY`
  (never a re-hardcoded key literal).
- **SSR / static:** bootstrap + dark-first default; confirm no flash.
- **CDN consumer:** if you bump the pinned version in the URL, **regenerate the
  SRI hash** and update URL + `integrity=` together, or the stylesheet silently
  fails to load.
- **Vendored copy:** re-run `npx @cameronsjo/artificer vendor` (0.19.0+) and
  re-apply local overrides on top; the provenance drift report names
  hand-edited files. An `ARTIFICER-CHEATSHEET.md` in the dest is the retired
  ride-along — `primitives.json` is its successor; delete it freely.
- **Pasted category-3 fragments** (lazygit/gh-dash/gitmux): re-paste from the
  matching version; the stamped `# Artificer v<x>` header tells you if it's stale.

Paths:

- **All-in** (large jump, test once): replace CSS wholesale → define baseline →
  add bootstrap → run rem migration → fix theme key → verify.
- **Stepped** (smaller diffs): walk the boundaries in order, test between.
- **Cherry-pick** (can't take the jump, need legibility): graft only the
  `breaking[]` fixes — at minimum the 0.10.1 legibility trio.

Output a **concrete, ordered checklist for this project** — each item a specific
file/grep/edit, not a generality. End with the **verify** list: `--art-version`
correct, theme persists, no FOUC, keywords legible, text scales with zoom, focus
rings present.

## Step 5 — Report back (not optional)

An upgrade **is** consumer usage of Artificer, so once the migration lands, you
**MUST** invoke `/artificer-feedback` — per the standing early-and-often mandate.
The skill does the assembly — you **MUST NOT** draft the issue or de-dupe against
existing ones first. Don't wait for a gap "worth reporting": which version pair
you crossed, what bit, and **what the ledger got right or wrong** — a missing
`breaking[]` event, a too-noisy adoption signal, a vintage that surprised you —
is the highest-signal feedback the design system can get. You **MUST NOT** pause
to ask permission — standing pre-approval covers it. You **SHOULD** run it in
the background (fork / subagent) so it never interrupts the work;
fire-and-forget, **MUST NOT** batch or curate. (Waived only when Cameron
*unprompted* declines, or you're working inside the `artificer-design-system`
repo itself.)

## Notes

- **Closes #199's delta-legibility gap; partially addresses #35:** Step 1's
  provenance detection is the provenance lever, and Step 2's ledger walk
  replaces the v0.2 hardcoded 0.7→0.10.1 matrix that dead-ended seven releases
  behind the repo.
- A recommendation that cites a hex without a **contrast ratio** is incomplete —
  the same cultural rule the design system holds internally.
- This skill reasons about the consumer's code; it does not modify the Artificer
  source. If you discover a gap where Artificer made the upgrade harder than it
  should be, file it back with `/artificer-feedback`.
