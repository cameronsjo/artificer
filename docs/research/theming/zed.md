# Theming Zed
> Zed's single-file JSON theme family — chrome, editor surfaces, syntax, terminal, and collaborators in one palette-routed artifact.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Zed themes paint the entire editor from one file: app chrome (title bar, tab bar, status bar, panels, scrollbars), editor content surfaces (background, gutter, line numbers, indent guides, active line), syntax highlighting (tree-sitter capture names mapped to color/font_style/font_weight), the integrated terminal's full ANSI palette, multiplayer collaborator cursors (`players`), git/version-control gutter colors, and semantic status colors (error/warning/success/info/hint).

It is a single JSON **theme family** file holding multiple light and dark variants, parsed into GPUI's HSLA color space. Because one file covers chrome plus content plus syntax plus terminal, a single Artificer palette maps cleanly across all surfaces — the same shape as the existing VS Code target, which is why this slots into `build.mjs` as one more emitter rather than a new distribution category.

## Theme format

JSON. The top-level **theme family** object carries required keys `name`, `author`, `themes` (array), plus an optional `$schema` pointing at `https://zed.dev/schema/themes/v0.2.0.json`.

Each entry in `themes` is a variant: `name`, `appearance` (`"light"` | `"dark"`), and a flat `style` object whose keys are dotted/namespaced strings (e.g. `editor.background`, `terminal.ansi.red`, `border.focused`) — roughly 150+ style keys per variant. Inside `style`:

- **`syntax`** — a map of capture-name → `{color, background_color, font_style, font_weight}`.
- **`players`** — an array of `{cursor, background, selection}` for collaborator cursors.
- **`accents`** — an array of hex strings, used for indent-guide and rainbow-bracket coloring.

**Color model.** Hex strings only, two widths: 6-digit `#RRGGBB` and 8-digit `#RRGGBBAA` (alpha as the trailing byte). Zed parses these into `gpui::Hsla` internally. The schema types color values as `["string","null"]` — null or omitted means *inherit a compile-time default*, not error. Artificer hex tokens map directly: opaque roles stay 6-digit; anywhere a translucent overlay is wanted (selection fills, document-highlight backgrounds, hover/active element states, player selection) append a 2-hex alpha byte (selection at ~30% is `#RRGGBB4D`). The built-in One theme writes everything as 8-digit (`#282c33ff`); Catppuccin mixes 6-digit solids with 8-digit translucent fills — either is valid.

**Light + dark.** Both variants live in ONE file under the `themes` array, each carrying its own `appearance` flag. Zed does **not** auto-pair them: the user either picks each variant by name in the selector, or sets `settings.json` `theme` to an object — `{ "mode": "system", "light": "Artificer Light", "dark": "Artificer Dark" }` — to follow OS appearance. Ship a single "Artificer" family containing both variants (Catppuccin ships four — Latte/Frappé/Macchiato/Mocha — in one file). The `appearance` flag drives which OS mode the variant is offered for and tweaks built-in shadow/elevation handling.

A theme-only distribution adds an `extension.toml` manifest (id, name, version, schema_version, authors, description, repository) with the JSON files under a `themes/` directory. No Rust or WASM needed.

## Distribution

Two shapes, mirroring the repo's existing distribution split.

**Local drop-in (Category 1 selector-file).** Drop `artificer.json` into `~/.config/zed/themes/` (macOS/Linux) or `%USERPROFILE%\AppData\Roaming\Zed\themes\` (Windows). It appears in the theme selector with no packaging. This is the right shape for Cameron's personal/dotfiles use — a plain file, chezmoi-manageable by symlink or copy.

**Extension (public registry).** A repo with `extension.toml` (id/name/version/schema_version/authors/description/repository) plus a `themes/` dir and an OSI license at root. Theme-only extensions need NO Rust/WASM. Dev-test via command palette `zed: install dev extension`. Publish by PR to `zed-industries/extensions`: add your repo as a git submodule under `extensions/{id}` (HTTPS, not SSH), add an entry to the top-level `extensions.toml`, and run `pnpm sort-extensions`.

For Artificer, the local drop-in is the Cat-1 symlink-friendly path; the extension is the public path. Note the extension *install* directories below are managed (not hand-edited):

- `~/.config/zed/themes/artificer.json` — macOS + Linux local drop-in
- `%USERPROFILE%\AppData\Roaming\Zed\themes\artificer.json` — Windows local drop-in
- `~/Library/Application Support/Zed/extensions` (macOS), `~/.local/share/zed/extensions` or `$XDG_DATA_HOME/zed/extensions` (Linux), `%LOCALAPPDATA%\Zed\extensions` (Windows) — managed extension installs
- Extension repo layout: `extension.toml` + `themes/*.json` + `LICENSE` at repo root
- `settings.json` selection: `{"theme": {"mode": "system", "light": "Artificer Light", "dark": "Artificer Dark"}}`

## build.mjs integration sketch

`build.mjs` reads `themes/_palette.json` (dark + light blocks of semantic hex tokens) and emits one Zed theme-family JSON:

```
{ $schema: "https://zed.dev/schema/themes/v0.2.0.json",
  name: "Artificer", author: "...",
  themes: [darkVariant, lightVariant] }
```

For each variant, a token→key mapping table fans each Artificer semantic token across many dotted style keys:

- `bg` → `background`, `editor.background`, `terminal.background`, `panel.background`, `surface.background`
- `bg-raised` → `elevated_surface.background`, `tab.active_background`, `title_bar.background`
- `fg` → `foreground`, `text`, `editor.foreground`, `terminal.foreground`
- `fg-secondary` → `text.muted`, `editor.line_number`, `icon.muted`
- `accent` → `accent`, `text.accent`, `icon.accent`, `border.focused`, `element.selected`
- `border` → `border`, `border.variant`, `scrollbar.thumb.border`
- `success` → `success` + version-control `created`
- `attention` → `warning` + `modified`
- `urgent` → `error` + `deleted`/`conflict`

`syntax{}` emits one entry per capture from the Artificer syntax roles — keyword / string / comment / type / function / variable / number / constant / operator / punctuation / property / tag / attribute — each as `{color, font_style?, font_weight?}` (`comment.doc` duplicates `comment`; emphasis/strong carry `font_style`). `terminal.ansi.*` (16 colors plus `bright_` and `dim_` variants) maps from a base-8 ANSI sub-palette derived from accent/success/attention/urgent plus neutrals. `players[]` synthesizes ~8 entries by rotating accent + syntax hues, giving selection a translucent 8-digit alpha. `accents[]` is a small array of distinct hues (accent + a few syntax colors) for indent guides / rainbow brackets.

Translucent keys (selection, `*.background` status fills, document-highlight backgrounds, `element.hover`/`active`) get an alpha byte appended at emit time. **Omit any key with no semantic source rather than inventing a value** — Zed falls back to its default, which is a saner baseline than a guess.

## Gotchas

- **[verified]** Syntax keys are tree-sitter CAPTURE names, not a fixed schema list — an entry only paints anything if the active grammar's `highlights.scm` actually emits that capture. Styling `syntax.X` does nothing for a language whose grammar never tags a node with capture X (e.g. markdown blockquote bodies fall through to generic `@text`), and coverage varies per language, so you cannot exhaustively enumerate valid keys from the JSON schema alone. Corroborated by discussion [#13631](https://github.com/zed-industries/zed/discussions/13631), an independent thread where a Zed maintainer confirms the syntax keys available to a theme are the highlight names exported by a language's `highlights.scm`, and that language-specific control requires shipping your own query.

- **[verified]** Zed uses NON-STANDARD capture names in its built-in grammars/themes, so cribbing conventional tree-sitter capture names can leave roles unstyled. Mirror the captures used in `assets/themes/one/one.json` rather than an external standard. Corroborated by the official docs at [zed.dev/docs/themes](https://zed.dev/docs/themes), which directs authors to inspect `one.json` for available attributes and enumerates a specific, limited capture set. (Caveat: the framing of Zed's set as "non-standard" is disputed even by a Zed maintainer, who argues both Zed and Neovim diverge from upstream — but the operative fact, that Zed's capture subset is divergent and authors should mirror `one.json`, holds.)

- **[verified]** Missing/omitted style keys silently fall back to a compile-time default theme instead of erroring — a typo or forgotten key produces a wrong-but-plausible color with no warning, making partial themes look subtly broken rather than failing loudly. Corroborated by [DeepWiki's theme-system page](https://deepwiki.com/zed-industries/zed/10.4-theme-system), which documents the `zed_default_dark` baseline and the `Refineable` trait that fills any omitted color; issue #19382 shows the observable symptom (a custom `variable` color silently rendering as default grey).

- **[verified]** Non-built-in themes log a spurious `theme not found` ERROR at startup even when they load fine — a startup race checks the theme registry before extensions finish loading, so the log is not a reliable signal that your theme failed. Cosmetic, fixed via [PR #25098](https://github.com/zed-industries/zed/pull/25098), which confirms the exact mechanism: the theme is initialized before extensions finish loading, so error logging now defers until extensions are ready.

- **[verified]** Local `~/.config/zed/themes` drop-ins do not reliably hot-reload; edits may need a reload/restart, and have outright failed to appear in some versions (issue #18468, v0.154.3, labeled frequency:common). For dev extensions the refresh path is `zed: reload extensions` then `workspace: reload`; plain file drop-ins lack an equivalent guaranteed trigger. Corroborated by Zed's official ["User themes now in Preview"](https://zed.dev/blog/user-themes-now-in-preview) blog post, which states a theme file is picked up "the next time Zed loads" and that auto-detection of changes was only a planned future feature.

- **[verified]** Indent-guide and rainbow-bracket colors come from the theme-level `accents` array, NOT a dedicated style key — forgetting `accents` leaves indent/bracket coloring on defaults that may clash with the palette. Corroborated by [Catppuccin Zed's DeepWiki page](https://deepwiki.com/catppuccin/zed/2.3-theme-variants-and-customization), which documents that indent-guide and rainbow-bracket colors are generated from a rainbow array rather than a dedicated key. (Precision note: Zed *does* have plain `editor.indent_guide`/`editor.indent_guide_active` keys for the fixed line color, but the per-level cycling coloring and rainbow brackets both draw from `accents`.)

- **[refuted]** Schema version is pinned in the URL — an old `$schema` (v0.1.0) silently rejects newer keys. The pin-to-v0.2.0 advice is sound, but the stated mechanism is false: `$schema` is editor-tooling metadata driving JSON autocomplete/validation, NOT a runtime gate. Zed deserializes themes via serde without `deny_unknown_fields`, so `$schema` has zero bearing on which keys load. The real "keys not applied" symptom comes from WRONG KEY NAMES being silently dropped at runtime — documented in [PR #26606](https://github.com/zed-industries/zed/pull/26606), where `version_control.{variant}` vs `version_control_{variant}` mismatches failed silently and Zed declined to add compatibility aliases. Still pin v0.2.0 for editor autocomplete, just not for the reason claimed.

- **[verified]** Theme keys are normalized across languages — there is no per-language syntax override inside a theme file. A single `syntax` map applies to all languages; the same capture color is shared everywhere it appears, and per-language tuning requires language-level config rather than the theme. Corroborated by [zed.dev/docs/themes](https://zed.dev/docs/themes), which presents the syntax section only as a flat single map with no scoping construct; issue #20166 requested per-filetype overrides and was closed as Not Planned.

## Tips & tricks

- **Crib from the canonical built-in.** `assets/themes/one/one.json` is the authoritative key inventory and uses the exact capture names Zed's grammars emit — match it rather than an external tree-sitter standard.
- **Use right-to-left capture fallback.** A single tree-sitter pattern can list multiple captures on one node; Zed tries the rightmost first and falls back left, so providing a coarse capture (e.g. `@variable`) covers grammars that lack a finer one.
- **Reuse the ANSI sub-palette.** `terminal.ansi.*` (16 + `bright_` + `dim_`) is its own mini 8-color theme — derive it once from accent/success/attention/urgent + neutrals so the integrated terminal matches the rest.
- **Append a 2-hex alpha byte only on overlay keys** (selection, `*.background` status fills, document-highlight backgrounds, `element.hover`/`active`, player selection); keep solid roles 6-digit for readability.
- **For quick iteration, use `theme_overrides`.** Users can patch a few keys in `settings.json` without a full file — handy for letting Cameron tweak one color without regenerating.
- **Ship one family with light+dark variants** and wire `settings.json` `theme {mode:system, light, dark}` so OS appearance switches automatically — no separate files.
- **Theme-only extension = zero Rust/WASM.** The publish gate is just `extension.toml` + `themes/` + an OSI license at repo root.
- **Omit keys you have no semantic source for** rather than guessing — Zed's default fallback is a saner baseline than an invented color.

## Fit assessment

**Med effort, worth adding.** Zed is a single-file JSON theme family that maps 1:1 from a semantic hex palette like Artificer's — the same shape as the existing VS Code target, so `build.mjs` gains one more emitter with a token→dotted-key table plus a synthesized players/ansi/accents block. The main work is the syntax capture mapping (mirror One Dark's captures, not an external standard) and the light+dark dual-variant emit; everything else is mechanical hex fan-out. The local drop-in is trivially dotfile/chezmoi-managed (Cat 1), and the public extension path needs no Rust.

## Where to get the authoritative docs

**Official spec / schema / API reference:**

- Theme authoring guide — https://zed.dev/docs/themes
- Theme extension guide — https://zed.dev/docs/extensions/themes
- Extension dev/publish guide (`extension.toml`, dev install, registry PR) — https://zed.dev/docs/extensions/developing-extensions
- Authoritative JSON schema (pin this) — https://zed.dev/schema/themes/v0.2.0.json
- Theme system internals (fallback, default colors, HSLA parsing) — https://deepwiki.com/zed-industries/zed/10.4-theme-system

**Community themes to crib from:**

- One (canonical built-in; authoritative key/capture inventory) — https://github.com/zed-industries/zed/blob/main/assets/themes/one/one.json
- Catppuccin Zed (4 variants in one file; full accents/players/dim-ansi usage) — https://github.com/catppuccin/zed

## Sources

- https://zed.dev/docs/themes
- https://zed.dev/docs/extensions/themes
- https://zed.dev/docs/extensions/developing-extensions
- https://zed.dev/schema/themes/v0.2.0.json
- https://github.com/zed-industries/zed/blob/main/assets/themes/one/one.json
- https://github.com/catppuccin/zed
- https://github.com/zed-industries/zed/issues/18468
- https://github.com/zed-industries/zed/issues/24539
- https://github.com/zed-industries/zed/discussions/54891
- https://github.com/zed-industries/zed/discussions/23371
- https://github.com/zed-industries/zed/discussions/13631
- https://github.com/zed-industries/zed/issues/25245
- https://github.com/zed-industries/zed/pull/25098
- https://github.com/zed-industries/zed/pull/26606
- https://deepwiki.com/zed-industries/zed/10.4-theme-system
- https://deepwiki.com/catppuccin/zed/2.3-theme-variants-and-customization
- https://zed.dev/blog/user-themes-now-in-preview
- https://zed.dev/blog/theme-builder
