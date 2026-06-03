# Palette governance

This theme is the **hand-authored Obsidian embodiment** of the Artificer
design system. The Artificer system has its own canonical palette
(`themes/_palette.json` in the design system repo) that drives Claude
Code, Ghostty, and VS Code via codegen. This Obsidian theme is the one
exception — it's hand-authored, because Obsidian's variable surface and
its plugin ecosystem demand decisions that codegen can't make.

## Source of truth

The canonical Artificer palette lives in a **separate Claude design
session** (the design-system project, not this repo). When that palette
changes, the change does *not* automatically propagate here. Instead:

1. You bring the palette diff to me (this Claude session, this repo).
2. I walk you through what each changed token would do in the Obsidian
   context — which surfaces it touches, whether it interacts with any of
   the divergences below, whether contrast still holds in both modes.
3. You approve or reject each token individually. Bulk "ship it all" is
   fine if everything's clean; nothing ships without explicit approval.
4. I update `theme.css` (the `--art-*` block at the top of the file) and
   the entry in `CHANGELOG.md`.

This gate exists because not every Artificer palette change makes sense
in Obsidian. Some examples of changes that needed Obsidian-specific
handling in the past:

- The v0.5 → v0.6 lock dropped sage, vermillion, and lilac. Sage's role
  here was minor; vermillion and lilac were never used. No-op.
- v0.5 → v0.6 softened `urgent` from `#e8836f` to `#c08070`. Adopted —
  fits the cream-mode contrast goal.
- v0.5 → v0.6 swapped success olive → apothecary green. Adopted in dark
  and light, but I checked that callouts (which use success as TODO)
  still read as advisory rather than urgent. They do.

## Obsidian-specific divergences

These are intentional. Don't flatten them unless we discuss it.

| Decision | Artificer system | This theme | Why |
|---|---|---|---|
| Primary background (dark) | Various per-surface | `#292c33` Ghostty grey | Reads as "tool surface" — matches user's terminal, not their notes app default |
| Primary accent (dark) | Steel-led | Gold-led (`#dbbb6f`) | Obsidian is for thinking, not for code — gold reads as warmth/highlight, steel reads as metadata |
| Attention (dark) | Burnt gold | Dusty rose (`#e5afb7`) | Gold is taken by accent; rose carries "non-destructive caution" without confusion |
| Inactive pane treatment | Subtle desaturation | Dramatic 0.55 opacity / 0.6 saturate | Obsidian's split-view is core to focus; recession needs to be visible at a glance |
| Light-mode root | `body` selector | `.workspace` selector | Obsidian's editor surface is `.workspace`; `body` doesn't actually paint behind it |
| Callout color contract | Hex tokens | RGB-tuple tokens (`r, g, b`) | Obsidian wraps callout colors in `rgba(…)` at runtime; hex breaks the wrap |

## When the gate opens

Use the **"Palette update"** issue template (in `.github/`) to file a
palette diff. Even when you're filing it for yourself, the template
forces the right structure:

- Source: which Artificer version
- Tokens changed (table form)
- Modes affected (dark / light / both)
- Surfaces I should re-check in the preview before approval

Or just paste the diff into the Claude session and I'll walk through it.

## Held / outstanding items

Things carried across versions but not yet resolved. These are
deliberate: I'm not folding them in until the right upstream decision
lands or the right test case forces my hand.

- **Light `--art-brand-purple` direction.** Canonical `_palette.json`
  says `#4a25a0`; this theme currently says `#3a1880`. Waiting on the
  upstream Artificer system to pick a direction in a future palette
  drop, then we'll reconcile via the palette-update issue template.
- **`pos-on` body class.** Renamed to `art-pos-on` in v0.6.1 for
  namespace safety. Both selectors still work in v0.6.x. v0.7.0 will
  drop the un-namespaced version.
- **`--layer-*` tokens.** Intentional theme-internal helpers, not a
  public API. Plugin authors should not override these.
- **iA Writer Quattro S/V bundle weight.** Six woff2 files bundled in
  v0.6.3. If repo size becomes a concern, S and V can move to an
  optional download.

## Variable contract

Four contracts to remember when editing `theme.css`:

1. **`--art-*` tokens at the top of the file** — source of truth. Hex
   values. Everything downstream references these.
2. **Obsidian's native `--background-*`, `--text-*`, `--interactive-*`
   etc.** — must be hex or `color-mix(...)`. Set in the mapping block.
3. **Obsidian's callout vars (`--callout-info`, `--callout-warning`,
   etc.)** — must be **comma-separated `r, g, b` tuples**, not hex.
   Obsidian wraps them in `rgba(...)` for background tint and border.
4. **Font / size / weight variables** — component overrides use
   fallback chains: `var(--font-interface, var(--art-font-mono))`,
   `var(--font-text, var(--art-font-sans))`,
   `var(--font-text-size, 16px)`, `var(--bold-weight, 700)`, etc. This
   lets Obsidian's Customize appearance pane and Style Settings
   propagate into chrome without losing the Artificer defaults.

The Style Settings `@settings` block at the bottom of the file exposes a
curated subset of the `--art-*` tokens to end users. When you add a new
source token, decide whether it should also be in `@settings` (most
should).
