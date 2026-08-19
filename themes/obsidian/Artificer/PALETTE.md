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
| Attention (dark) | Burnt gold | Dusty rose (`#e5afb7`) | Gold is taken by accent; rose carries "non-destructive caution" without confusion (ADR 0020) |
| Inactive pane treatment | Subtle desaturation | Dramatic 0.55 opacity / 0.6 saturate | Obsidian's split-view is core to focus; recession needs to be visible at a glance (ADR 0021) |
| Light-mode root | `body` selector | `.workspace` selector | Obsidian's editor surface is `.workspace`; `body` doesn't actually paint behind it |
| Callout color contract | Hex tokens | RGB-tuple tokens (`r, g, b`) | Obsidian wraps callout colors in `rgba(…)` at runtime; hex breaks the wrap |
| Prose-highlight tokens | n/a (no codegen) | OKLCH **hue** tokens + shared L/C (`--art-prose-*-h` + `--art-prose-l/c`) | The intensity slider must retune chroma *and* contrast together; flat hex can't do that. See § Prose below (ADR 0023) |

## Prose highlighting (Lane-2 addition, v0.7.0)

The five prose-highlight colours (adjective / noun / adverb / verb /
conjunction) are **new values introduced in this theme**, lifted from the
Artificer *Prose-Highlighting playground* (the **Cameron ★** preset).
They are **not** in the canonical `_palette.json` and do **not**
propagate to Ghostty / VS Code / Claude Code — that palette is managed in
the separate design-system session. If you ever want these reconciled
upstream, that's a deliberate trip to that session, not an auto-sync.

Why they break the "`--art-*` tokens are hex" contract: each category
stores an OKLCH **hue angle** (`--art-prose-adjective-h: 78`, etc.), and
a single lightness+chroma pair (`--art-prose-l` / `--art-prose-c`) is
derived from `--art-prose-intensity` per face (dark fades up toward
near-white, light down to ink; chroma shared). That's the only way the
intensity lever can retune saturation and contrast in lockstep the way
the playground does. The resolved OKLCH is supplied to the yaae plugin
through its **mode-suffixed knob layer** (`--yaae-pos-{cat}-color-dark`
on `.theme-dark`, `-light` on `.theme-light` — never the bare
`--yaae-pos-{cat}-color`, which is yaae's own composition surface; ADR
0035), so the plugin paints in-palette for free and Style Settings user
overrides still win. Cameron hues: adj 78 · noun 32 · adverb 300
· verb 223 · conjunction 155. Four alternate palettes (Apothecary,
Spectral, Dusk, Botanical) ship as one-class hue remaps.

## Feature layers (web-sourced, v0.7.0)

Whimsy and Texture are **opt-in feature layers** ported from
`src/artificer-whimsy.css` and `src/artificer-texture.css`. They carry
no new palette colour (whimsy is self-contained OKLCH gradients; texture
is desaturated grain + token-ink lines), so they sit outside the palette
gate. Doctrine bounds are preserved: whimsy never lands on load-bearing
chrome (only the vault name + empty-pane title are wired, both opt-in
and glacial); texture is one-per-surface, no hue, no motion. The light
face remaps via `body.theme-light` (not the source's `:root[data-theme]`).

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
  namespace safety. **Dropped in v0.7.0** as scheduled; only the
  namespaced `art-pos-on` remains (and now gates only the legacy
  `.pos-*` element-class aliases — the live system is yaae-driven).
- **`art-cascade-deep` no-op + its Style Settings control.** **Dropped
  in v0.7.0** as scheduled (the recessed `#e4d4b0` overlay has been the
  default since v0.6.4; opted-in users see no change).
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

**A `variable-themed-color` entry's `default-dark` / `default-light` MUST
equal the value its token resolves to in the matching face block.** Style
Settings writes its *declared* default into `:root` the moment a control is
touched, and clearing an override restores that declared value — so a default
that lags a palette ruling silently reinstalls the superseded color, per
vault, forever. Change a token value and its paired `@settings` default in the
same edit; the workshop has a lockstep gate that fails the build otherwise.
