# Theming WezTerm
> A GPU-accelerated terminal whose palette is a near-1:1 hex passthrough from Artificer tokens, with a separate Lua surface for the tab bar and dark/light switching.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

WezTerm theming touches three distinct surfaces, each with its own mechanism. First, the terminal content palette — background, foreground, the 16-color `ansi`+`brights` table, cursor, selection, scrollbar, split — set in a `[colors]` section of a TOML scheme file (or the equivalent `colors`/`color_schemes` Lua tables). Second, the *retro* tab bar, styled via `colors.tab_bar`. Third, the **default fancy tab bar** plus the window titlebar, which live in a completely separate `window_frame` Lua table that the color scheme cannot reach.

There is no syntax-highlighting layer to theme. WezTerm is a terminal, so "syntax" colors exist only as the 16 ANSI slots that programs (vim, bat, ls) map their output onto. That makes the content palette the cleanest fit in the whole Artificer pipeline — Artificer's semantic colors already speak hex, and the 16-slot table is the only bridge a terminal exposes.

## Theme format

The distributable artifact is a **TOML file** with `[colors]` + `[metadata]` sections. TOML is recommended over Lua precisely because it is purely declarative — no executable logic — so it is safe to consume from the internet. The Lua route exists too (`color_schemes = { ['Name'] = {...} }` plus a `colors = {...}` table in `wezterm.lua`), and `[colors]` holds the same keys in both forms. `[metadata]` is TOML-only and carries `name` / `author` / `origin_url`.

Color values are hex strings (`#RRGGBB`) — Artificer's native model, a direct passthrough with no conversion. WezTerm also accepts CSS3 named colors, `rgb()`/`rgba()`, `hsl()`/`hsla()`, and 8-digit `#RRGGBBAA` for alpha on some fields. The `ansi` and `brights` arrays are each exactly 8 hex strings; `indexed` is an optional map of palette index (16–255) to color. No floats, no ANSI-index encoding required for the scheme file itself.

Separate-file scheme support with proper precedence requires WezTerm `>= 20220903-194523-3bb1ed61`.

## Distribution

This is a **Category 1 + Category 3 hybrid**, the same shape as lazygit and gh-dash.

The content palette is pure **Category 1 (selector-file)**: drop the TOML into a colors directory and set `color_scheme = "Artificer Dark"`. Declarative, no `@import`, no code execution — the cleanest WezTerm fit. Default install path is `$HOME/.config/wezterm/colors/` (POSIX), a `colors` directory alongside `wezterm.exe` on Windows, or any directory listed in `config.color_scheme_dirs = { '/path' }` (a Lua **table**, not a string).

The fancy-tab-bar styling and the dark/light switch logic both require Lua in `wezterm.lua`, which drops to **Category 3 (paste/templating)**. For Cameron's chezmoi setup the TOML goes to `~/.config/wezterm/colors/` and a small Lua fragment splices into the managed `wezterm.lua`.

There is **no single-file dual-variant mechanism** — a scheme file holds one palette. Ship two separately-named schemes (`Artificer Dark` / `Artificer Light`) and select at runtime with a `wezterm.gui.get_appearance()` snippet inside `scheme_for_appearance()`; WezTerm auto-reloads config on OS appearance change, so no restart.

## build.mjs integration sketch

A WezTerm target emits a TOML file (recommended over Lua for distribution per the `save_scheme` docs). Map `_palette.json` semantic tokens like so:

```toml
[metadata]
name = "Artificer Dark"   # the scheme IDENTITY; filename is irrelevant — color_scheme references THIS
author = "Cameron Sjo"
origin_url = "https://github.com/cameronsjo/artificer-design-system"

[colors]
background    = tokens.bg
foreground    = tokens.fg
cursor_bg     = tokens.accent      # MUST differ from cursor_fg or the cell goes invisible
cursor_fg     = tokens.bg
cursor_border = tokens.accent
selection_bg  = tokens.border      # (or a muted bg-raised) — check WCAG against selection_fg
selection_fg  = tokens.fg
scrollbar_thumb = tokens.border
split           = tokens.border
ansi    = [bg, urgent, success, attention, accent/keyword-blue, syntax.function(magenta), syntax.type(cyan), fg-secondary]
brights = [ bright variants — lighten ~10-15% or reuse the accent-bright family ]  # exactly 8 entries each

[colors.tab_bar]   # ONLY honored when use_fancy_tab_bar=false — emit a note saying so in the generated file
background = tokens.bg-raised
[colors.tab_bar.active_tab]   # bg_color=accent-fill, fg_color=on-accent, intensity="Bold"
[colors.tab_bar.inactive_tab] # bg_color=bg-inactive, fg_color=fg-secondary
# inactive_tab_hover, new_tab, new_tab_hover similarly

[colors.indexed]   # emit empty or omit — not required
```

For light/dark, the generator emits **two files** with distinct `metadata.name` values and ships an optional `wezterm.lua` snippet using `wezterm.gui.get_appearance()` to pick between them. Tab-bar styling for the **default fancy bar** must be emitted as a separate Lua `window_frame` snippet, since `colors.tab_bar` does not reach the fancy bar. A CI step can call `wezterm.color.load_scheme(path)` (returns `colors, metadata`) to confirm the generated TOML parses and the name is correct before shipping.

## Gotchas

- **[verified] The default fancy tab bar silently ignores `colors.tab_bar` — you must use `window_frame` (Lua) instead.** `use_fancy_tab_bar` defaults to `true`, and the fancy bar reads `window_frame.active_titlebar_bg` / `inactive_titlebar_bg` / `font`, not `colors.tab_bar.background`. The official docs (https://wezterm.org/config/appearance.html) state verbatim that the strip color "does not apply when fancy tab bar is in use," corroborating the GitHub issue (https://github.com/wezterm/wezterm/issues/2615). A pure distributable TOML therefore cannot fully theme the tab bar — you need a Lua `window_frame` block or a `format-tab-title` handler. One nuance: the `colors.tab_bar` *sub-tables* (`active_tab`, etc.) do still style individual tab elements under the fancy bar; it is specifically the overall background strip that `window_frame` replaces.

- **[unconfirmed] `color_scheme` and `colors` are mutually exclusive — `color_scheme` wins and the `colors` block is dropped.** This is version-stale. The "mutually exclusive, colors dropped" wording describes **pre-2022** behavior; since `20220903-194523-3bb1ed61` the docs say the scheme defines the colors and then "any colors you define in the `colors` section will override those colors" — i.e. `colors` *layers on top*, the opposite of the headline claim. No independent (non-wezterm.org, non-wezterm-GitHub) source confirms the standalone "colors block is dropped" assertion as current behavior; what *is* well-corroborated (including GitHub Discussion #6061) is the remedy: to override a few entries, pull the scheme via `wezterm.color.get_builtin_schemes()` / `get_default_colors()`, mutate in Lua, then assign to `config.colors`. Treat the absolute version as refuted-in-spirit; the merge remedy is sound.

- **[verified] The scheme is selected by its `[metadata]` name, not the filename.** `color_scheme` must match the `name` string inside `[metadata]`. Naming a file `Artificer.toml` while setting `name = "Artificer Dark"` means you reference `Artificer Dark` — pointing `color_scheme` at the filename stem fails to load. Confirmed independently by Sebastian Hans's Selenized walkthrough (https://sebastian-hans.de/blog/color-scheme-switching-for-wezterm/), where `config.color_scheme` is set to the metadata names rather than the `.toml` filenames; WezTerm GitHub issue #6421 and discussion #4452 document users hitting exactly this pitfall. Easy to get wrong when generating files programmatically.

- **[verified] `color_scheme_dirs` must be a Lua table/list, not a bare string.** `config.color_scheme_dirs = '/path'` silently fails to find schemes; it must be `{ '/path' }`. The official docs (https://wezterm.org/config/appearance.html) show the braced-table syntax and confirm the second half too: "Color scheme names that are defined in files in your `color_scheme_dirs` list take precedence over the built-in color schemes" — so a custom-dir scheme shadows a like-named builtin (intentional override mechanism, footgun if unintended). The table-form and precedence rules are doc-confirmed; the *silent-failure-on-string* symptom itself rests on issue #6421 (https://github.com/wezterm/wezterm/issues/6421).

- **[verified] `force_reverse_video_cursor` and applications (vim/nvim via OSC) override your `cursor_bg`/`cursor_fg`.** When `force_reverse_video_cursor=true` and the cursor colors equal the global defaults (`cursor_is_default_color`), reverse-video renders and your `cursor_bg` is ignored. Independently, programs emit OSC sequences to set cursor color, overriding the static scheme inside that program — so a themed cursor can look broken inside an editor regardless of the scheme file. Confirmed by GitHub issue #1625 (https://github.com/wezterm/wezterm/issues/1625), which states the cursor color is still controlled by WezTerm (set to the text fg) under the flag, and that escape sequences take precedence; corroborated by neovim/neovim#27313 and wezterm#2635 showing nvim's `guicursor` not applying inside the editor.

- **[verified] Under ssh/tls multiplexing, the palette is controlled by the MUX SERVER's config, not the client.** The palette is an attribute of terminal emulation, which lives on the multiplexer server. A client with the Artificer scheme connecting to a remote mux domain shows the SERVER's scheme — installing the theme only client-side won't change remote-domain windows. Confirmed by GitHub Discussion #2657 (https://github.com/wezterm/wezterm/discussions/2657), where a maintainer explains a server-spawned pane reads its starting palette from the server and reports it to the client; corroborated by bug report #1268 showing the exact default-gray symptom on `wezterm connect`. Nuance, not a refutation: newer versions let the mux client push its local palette to the server (via an `update-status` + `set_config_overrides` + `get_domain_name()` workaround), so the palette is no longer strictly immovable from the client — but the client-only install is ineffective by default.

- **[verified] `wezterm.gui.get_appearance()` is nil in the mux server — an unguarded dark/light auto-switch crashes config eval.** `wezterm.gui` is unavailable when the config is evaluated by the mux server, so calling `get_appearance()` unguarded errors out and breaks config load. The official pattern wraps it in `if wezterm.gui then ... end` and returns a default (`'Dark'`) otherwise. Any distributed dark/light snippet must include this guard. Confirmed by an independent blog (https://blog.tymek.dev/automatically-changing-theme-in-the-terminal/) whose working config uses the same `wezterm.gui and ...` short-circuit, and by GitHub issue #3375 showing unguarded callers hitting nil-index failures. The exact `'Dark'` fallback value is a choice, not a requirement — but the guard itself is mandatory.

- **[verified] `ansi` and `brights` must each be exactly 8 entries.** The two arrays fill the standard 16-color palette (8 normal at indices 0–7, 8 bright at 8–15); `indexed` (16–255) is a separate optional map that may be empty or omitted. The structural arity is independently confirmed: KevinSilvester's wezterm-config (https://deepwiki.com/KevinSilvester/wezterm-config/3.4-color-schemes) describes `ansi`/`brights` as the standard 16-color palette with `[colors.indexed]` as a separate 256-color extension, and every real scheme file (Selenized Black, OneHalfDark) carries exactly 8 + 8 entries — the auto-generated `save_scheme` TOML emits 8 + 8 plus an empty `[colors.indexed]`. Caveat: the precise *consequence* — that a wrong count "silently misaligns" slots and produces wrong colors in ls/bat/vim — is a reasonable inference from the fixed positional mapping but is not itself an independently documented behavior.

## Tips & tricks

- **Prefer TOML over Lua for the distributable artifact.** The `save_scheme` docs note TOML is purely declarative — no executable logic — so it is safe to share and consume, unlike a Lua scheme that runs code.
- **Drop the file in the default `$HOME/.config/wezterm/colors/` to skip `color_scheme_dirs` entirely** — zero config beyond setting `color_scheme`.
- **Shadow a builtin deliberately by reusing its `metadata` name** — `color_scheme_dirs` entries beat builtins, handy if Artificer wants to replace, say, a default Gruvbox.
- **Generate light+dark as two separately-named schemes and ship the official `scheme_for_appearance()` snippet.** WezTerm auto-reloads on OS appearance change, so no restart.
- **Reuse the 16 ANSI slots as the syntax bridge.** Artificer's keyword/string/comment/type/function semantic colors map onto `ansi[]`/`brights[]` (blue/green/grey/cyan/magenta), since terminal programs only ever see the 16-slot palette — there's no separate syntax layer to theme.
- **Validate in CI with `wezterm.color.load_scheme(path)`** — it returns `(colors, metadata)`, so you can confirm a generated TOML parses and the name is correct before shipping.
- **Set `cursor_bg != cursor_fg`** or the cell under the cursor goes invisible (known I-beam visibility bug).

## Fit assessment

**Low-to-medium effort, worth adding.** The content palette is a near-1:1 hex passthrough from `_palette.json` — trivial to generate as TOML. The medium part is the tab bar: a complete theme needs a Lua `window_frame` fragment for the fancy bar plus the dark/light `get_appearance` snippet, pushing it into a Cat 1 + Cat 3 hybrid like lazygit/gh-dash. Strong fit for the Artificer pipeline since WezTerm is already in Cameron's dotfiles (WezTerm with Ghostty-aligned keybindings on Windows), so a generated scheme plus a chezmoi-templated Lua fragment slots right in.

## Where to get the authoritative docs

- **Official appearance / color-scheme reference:** https://wezterm.org/config/appearance.html
- **TOML scheme file format + sharing rationale (`save_scheme`):** https://wezterm.org/config/lua/wezterm.color/save_scheme.html
- **`load_scheme` (returns colors + metadata, CI validation):** https://wezterm.org/config/lua/wezterm.color/load_scheme.html
- **Dark/light auto-switch official pattern:** https://wezterm.org/config/lua/wezterm.gui/get_appearance.html
- **Community theme — Catppuccin WezTerm** (ansi/brights/tab_bar/cursor mapping to crib): https://github.com/catppuccin/wezterm
- **Community theme — carbonfox/nightfox collection** (proper `[metadata]` for builtin inclusion): https://codeberg.org/anhsirk0/wezterm-themes/issues/1
- **Community theme — Dracula for WezTerm** (reference palette mapping): https://draculatheme.com/wezterm

## Sources

- https://wezterm.org/config/appearance.html
- https://wezterm.org/colorschemes/index.html
- https://wezterm.org/config/lua/wezterm.color/save_scheme.html
- https://wezterm.org/config/lua/wezterm.color/load_scheme.html
- https://wezterm.org/config/lua/wezterm.gui/get_appearance.html
- https://wezterm.org/config/lua/config/force_reverse_video_cursor.html
- https://github.com/wezterm/wezterm/issues/6421
- https://github.com/wezterm/wezterm/issues/2615
- https://github.com/wezterm/wezterm/issues/2385
- https://github.com/wezterm/wezterm/issues/2376
- https://github.com/wezterm/wezterm/issues/1625
- https://github.com/wezterm/wezterm/discussions/2657
- https://github.com/wezterm/wezterm/discussions/3850
- https://github.com/wezterm/wezterm/discussions/6061
- https://sebastian-hans.de/blog/color-scheme-switching-for-wezterm/
- https://blog.tymek.dev/automatically-changing-theme-in-the-terminal/
- https://deepwiki.com/KevinSilvester/wezterm-config/3.4-color-schemes
- https://github.com/catppuccin/wezterm
- https://codeberg.org/anhsirk0/wezterm-themes/issues/1
- https://draculatheme.com/wezterm
