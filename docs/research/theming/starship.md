# Theming Starship
> The cross-shell prompt — segment colors and styles driven by a named-color palette in a single TOML file.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Starship themes only the shell prompt chrome — the prompt segments (character, directory, git, language modules, status), not terminal content or syntax highlighting. There is no separate theme-file format: a "theme" is just a `starship.toml` carrying a `[palettes.*]` table, a top-level `palette` selector, and per-module `style`/`format`/`symbol` overrides. Color values come in three flavors — truecolor hex, 8-bit ANSI (0–255), and the 16 named colors — and all are valid anywhere a style is accepted.

For Artificer this is an unusually clean target: the palette is hex, Starship consumes hex verbatim on a truecolor terminal, and the entire theme reduces to two palette tables plus a selector plus a handful of style strings.

## Theme format

A single TOML file. Two top-level concerns drive theming:

- **`palette = '<name>'`** — a string selector that activates one palette table.
- **`[palettes.<name>]`** — a flat `string = string` map of color-name → hex / ANSI index / named color.

Module sections (`[character]`, `[git_branch]`, `[directory]`, …) carry `style`, `format`, and `symbol` string fields. Style strings are space-separated tokens: `fg:<color>`, `bg:<color>`, a bare `<color>` (= foreground), and modifiers `bold italic underline dimmed inverted blink hidden strikethrough`. Format strings use `$var` substitution and `[text](style)` text-groups, with `(...)` for conditional collapse when a segment is empty.

An optional `"$schema" = 'https://starship.rs/config-schema.json'` line enables editor validation.

## Distribution

Starship reads **exactly one file** — default `~/.config/starship.toml`, overridable via `$STARSHIP_CONFIG`. There is no `@import` or include directive, which makes this a Category 2/3 hybrid leaning Cat 3 (paste / templating). Two viable shapes:

- **Cat 1 — full themed `starship.toml`.** Ship a complete config the user installs, symlinks, or points `STARSHIP_CONFIG` at. Clean, but it owns the user's entire prompt layout.
- **Cat 3 — palette fragment.** Ship the `[palettes.artificer_*]` tables plus the `palette =` selector, spliced into the user's existing config via chezmoi `includeTemplate` (with paste as fallback). The tables are self-contained and don't dictate module layout, so they graft onto any existing prompt.

**Recommendation: Cat 3 fragment.** It matches the lazygit/gh-dash decision already in memory (Option B, Cameron-first, paste fallback) and respects the user's own module choices.

Install paths to know:

- `~/.config/starship.toml` (default, XDG)
- `$STARSHIP_CONFIG` (env override to any path)
- `$XDG_CONFIG_HOME/starship.toml` when `XDG_CONFIG_HOME` is set
- Windows: `%USERPROFILE%\.config\starship.toml`

## build.mjs integration sketch

One generator emits a `starship.toml` fragment from `_palette.json`. Shape:

1. **Header first.** Emit `"$schema" = 'https://starship.rs/config-schema.json'` then `palette = 'artificer_dark'` (or `_light`). These **must** precede every `[palettes.*]` header (see Gotchas — TOML reparents a bare key into the open table otherwise).
2. **One palette table per mode.** `[palettes.artificer_dark]` and `[palettes.artificer_light]`, each mapping every semantic token to a flat hex literal: `bg`, `fg`, `accent`, `success`, `attention`, `urgent`, `border`, plus syntax roles `keyword / string / comment / type / function`. No nesting, no aliasing one token to another — palettes can't self-reference, so derived tokens (`accent-bright`, `on-accent`) are pre-resolved to hex by build.mjs at emit time (a lookup, since the generator already holds the full palette).
3. **Module style strings reference the names.** `[git_branch] style = 'bold accent'`, `[character] success_symbol = '[❯](success)'`, `[directory] style = 'fg:fg bg:bg-raised'`.

Because the fragment has no `@import`, emit it as a labeled block for chezmoi `includeTemplate` splicing (Cat 3), or as a standalone themed `starship.toml` the user points `STARSHIP_CONFIG` at (Cat 1). Keep token names that don't collide with builtins — Artificer's semantic names (`accent`, `success`, `urgent`) already do this naturally, so style strings stay legible.

Mode switching is external: rewrite the single `palette =` line via a script or chezmoi-templated value, parallel to how the other Artificer targets handle dark/cream. Starship has no `prefers-color-scheme` auto-detect.

## Gotchas

- **[verified]** The `palette = '...'` selector **must** appear before any `[palettes.*]` table header. In TOML, once a `[table]` header opens, every subsequent bare key belongs to that table — so a `palette = 'x'` line placed after a `[palettes.foo]` block is parsed as `palettes.foo.palette`, not the top-level selector. No palette activates and all custom color names silently fall back to literals. This is mechanistic TOML scoping, not Starship-specific behavior. Confirmed against the TOML spec itself ([toml.io/en/v1.0.0](https://toml.io/en/v1.0.0): "Under that [header], and until the next header or EOF, are the key/values of that table"), and Catppuccin's config carries a literal "Palettes must be defined _after_ this line" comment for exactly this reason.

- **[refuted]** *Claim: palette names ending in hex-like suffixes (e.g. `base0D`) fail to resolve because the parser misreads the trailing letter as a malformed hex code.* The symptom (letter-suffixed base16 names breaking) is real and corroborated by issue #6761, but the stated mechanism is contradicted by Starship's actual source ([commit d93074d](https://github.com/starship/starship/commit/d93074d0569db4bafb1788aa3f39136b734b5370)). `parse_color_string` only takes the hex branch if the string `starts_with('#')`, and the ANSI branch only on a successful `u8` parse — `"base0D".parse::<u8>()` *fails* because of the letters, so the token reaches `palette.get("base0D")` intact and *should* resolve. The trailing letter protects the name from the u8 branch rather than colliding with it; pure-digit names are the ones at real collision risk. The reporter's own data confirms this backwards (`base14` works, `base0D` fails — the opposite of the "letter looks like hex" theory). Real cause lies elsewhere (likely the format-string tokenizer). **The actionable advice — "avoid names that look like partial hex" — rests on a refuted diagnosis; don't codify it.**

- **[verified]** A palette color name silently **shadows** the builtin standard color of the same name. Defining `blue = '21'` in `[palettes.foo]` overwrites the builtin `blue` everywhere that palette is active, so a module style saying `blue` no longer means terminal-blue. Confirmed by [DeepWiki's palettes doc](https://deepwiki.com/starship/starship/4.3-palettes-and-styling) ("Overwriting Default Colors" — independent of the PR author), with the official docs carrying the canonical `blue = '21' # Overwrite existing color` example. Use distinct semantic token names (`accent`/`success`/`urgent`) to avoid surprising any module that references a standard color name — which Artificer does by default.

- **[verified]** Palettes **cannot reference their own definitions** — no aliasing one token to another. Inside `[palettes.foo]` every value must be a literal hex, ANSI index, or standard color name; `accent_bright = 'accent'` will not resolve. Confirmed by [DeepWiki](https://deepwiki.com/starship/starship/4.3-palettes-and-styling) ("Color palettes cannot reference their own color definitions") independent of the original starship.rs source. Implication: Artificer's derived tokens must be pre-resolved to hex by build.mjs before emit.

- **[verified]** `style = ''` / `style = 'none'` does **not** reliably reset to terminal foreground — under Nushell it renders green instead of the terminal default fg. This is an upstream Nushell color-handling interaction (the Starship issue is labeled "upstream"), not a Starship config error. Confirmed by [nushell/nushell#4973](https://github.com/nushell/nushell/issues/4973) (different repo and author, ~3 years prior): Nushell historically lacked ANSI code 39 (default foreground) support, so styles fell back to a fixed color; the green-specific fallback is corroborated across several other nushell issues. The Artificer fragment should set explicit `fg` rather than rely on empty-string reset for cross-shell installs.

- **[verified]** Hex/palette colors require a **truecolor-capable terminal** — they render wrong on terminals without 24-bit support. Confirmed by Starship maintainer davidkna in [discussion #3236](https://github.com/starship/starship/discussions/3236) ("Terminal.app does not support 24-bit RGB colors… replace them with named colors or 0-255 ANSI codes"), with the official advanced-config docs distinguishing hex RGB from 8-bit ANSI and warning not every style displays on every terminal. *Note: the original #6741 example (Konsole/yakuake) is a weak illustration — those terminals do support truecolor, so that symptom likely stems from TERM/COLORTERM or a tmux multiplexer stripping it; macOS Terminal.app is the cleaner canonical case.* For Cameron's Ghostty (truecolor) hex is fine; only ship an ANSI-256 fallback if targeting legacy terminals.

- **[verified]** `prev_fg` / `prev_bg` powerline colors break on empty/conditional modules and are ignored in `right_format`, causing "rainbow" separator bleed. Separators colored with `prev_bg` only look backward, so a conditional module producing no output is dropped without setting `prev_bg`, and the next separator inherits a stale color. Confirmed by [issue #6062](https://github.com/starship/starship/issues/6062) (separate author/issue: `prev_bg`/`prev_fg` ignored in `right_format`, equivalent to `none`); the rainbow-on-empty-modules half is independently documented in PR #7003's powerline-preset fix. Avoid `prev_fg`/`prev_bg` if Artificer ships a flat prompt; if powerline, wrap conditional sections in `(...)` and move separators into each module's `format`.

- **[unconfirmed]** In a style string, the **last color wins** and a bare `none` overrides everything except inside `bg:`. The official advanced-config docs state both rules verbatim, and the Starship source (`src/config.rs`) unit tests confirm the executable behavior (`bg:120 bg:125 bg:127 fg:127 122 125` → fg=125, bg=127; `fg:red bg:none bold` → red+bold). What's missing: a fully author-independent second source on a different domain — DeepWiki and third-party blogs don't cover these edge-case priority/none rules, so under a strict bar this stays unconfirmed (though nothing contradicts it). The practical implication holds regardless: concatenating `accent fg:urgent` yields urgent, not accent, so emit deterministic one-fg / one-bg style strings.

## Tips & tricks

- Add `"$schema" = 'https://starship.rs/config-schema.json'` as the first line — editor validation catches palette typos and the ordering trap before they ship.
- Use Artificer's semantic token names verbatim as palette keys (`accent`, `success`, `urgent`, `border`, `keyword`, `string`, `comment`). They don't collide with the 16 builtins (no accidental shadowing), and style strings read self-documenting: `style = 'bold accent'`.
- Ship both `[palettes.artificer_dark]` and `[palettes.artificer_light]` in one fragment and flip the single `palette =` line for mode switching — mirrors Catppuccin's four-flavor pattern and keeps one source of truth.
- Because palettes can't self-reference, pre-resolve every derived token (`accent-bright`, `on-accent`) to a literal hex in build.mjs — a lookup, not a runtime concern.
- Keep the Artificer theme a **flat (non-powerline) prompt** to sidestep the entire `prev_fg`/`prev_bg` conditional-bleed class of bugs. Artificer's aesthetic favors restraint over powerline triangles anyway.
- Set explicit `fg` on every styled module rather than relying on `style = ''` to inherit terminal fg, since that reset is unreliable under Nushell.
- For truecolor-only audiences (Ghostty) emit hex directly; only add an ANSI-256 downsample table if targeting legacy terminals like Konsole.

## Fit assessment

**Low-to-medium effort, worth adding.** The theme is a self-contained TOML fragment (two palette tables + a selector + a handful of module style strings) that maps Artificer's hex tokens 1:1 onto Starship's hex color model with zero conversion for truecolor terminals — the build.mjs work is trivial. The main care items are the TOML ordering trap and avoiding powerline (`prev_fg`) bleed, both avoidable by construction. It fits the existing Cat-3 chezmoi-splice distribution pattern already used for lazygit and gh-dash.

## Where to get the authoritative docs

**Official spec / schema / reference**

- Config reference (palettes + style strings): https://starship.rs/config/
- Advanced config (full style-string modifier list + precedence rules): https://starship.rs/advanced-config/
- JSON schema (editor validation): https://starship.rs/config-schema.json
- DeepWiki palettes & styling deep-dive: https://deepwiki.com/starship/starship/4.3-palettes-and-styling

**Community themes to crib from**

- Catppuccin/starship (canonical multi-palette source — shows the ordering comment and four-flavor switching): https://github.com/catppuccin/starship/blob/main/starship.toml
- Dracula for Starship: https://draculatheme.com/starship
- Gruvbox Rainbow preset (powerline reference, if ever needed): https://starship.rs/presets/gruvbox-rainbow

## Sources

- https://starship.rs/config/
- https://starship.rs/advanced-config/
- https://starship.rs/presets/gruvbox-rainbow
- https://starship.rs/presets/pastel-powerline
- https://deepwiki.com/starship/starship/4.3-palettes-and-styling
- https://deepwiki.com/starship/starship/6.2-style-system
- https://github.com/catppuccin/starship/blob/main/starship.toml
- https://github.com/starship/starship/pull/4209
- https://github.com/starship/starship/issues/6761
- https://github.com/starship/starship/commit/d93074d0569db4bafb1788aa3f39136b734b5370
- https://github.com/starship/starship/issues/6741
- https://github.com/starship/starship/discussions/3236
- https://github.com/starship/starship/issues/6560
- https://github.com/nushell/nushell/issues/4973
- https://github.com/starship/starship/issues/6062
- https://github.com/starship/starship/issues/6218
- https://github.com/starship/starship/pull/6017
- https://github.com/starship/starship/pull/7003
- https://github.com/starship/starship/issues/7018
- https://github.com/starship/starship/blob/master/src/config.rs
- https://toml.io/en/v1.0.0
- https://draculatheme.com/starship
