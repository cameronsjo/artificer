# Theming Kitty
> Terminal content colors plus a thin slice of kitty's own chrome (tab bar, window borders, bell, cursor) — shipped as a plain `.conf` file.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Kitty theming touches only terminal content colors plus a thin slice of kitty's own chrome — the tab bar, window borders, bell border, and OS titlebar hint. There is no syntax-highlighting layer; that belongs to whatever runs *inside* kitty (the shell, nvim, a TUI). A "theme" is literally a `.conf` file of `key value` settings: the 16 ANSI colors (`color0`–`color15`, optionally up to `color255`), foreground/background, selection, cursor, url, marks, tab-bar, and border colors.

Because the theme is plain config, the same file can be `include`d, copied by the themes kitten, or named as an OS-auto file. Artificer's job is a near-identity hex emit plus the lossy fold of its named semantic/syntax tokens onto kitty's fixed key set — the same ANSI-16 problem already solved for Ghostty and tmux in this repo.

## Theme format

Plain-text `.conf` file: `key<whitespace>value` per line, `#` line comments, `##` metadata-header comments. There is no JSON or YAML schema — it is the same grammar as `kitty.conf`. An optional leading `# vim:ft=kitty` sets the filetype.

The metadata header is parsed by the themes kitten to populate its picker and the upstream auto-update check. All fields are optional:

```conf
# vim:ft=kitty
## name: Artificer Dark
## author: Cameron Sjo
## license: Apache-2.0
## upstream: <raw github url to the conf>
## blurb: ...
```

`## blurb:` **must be last** — it consumes all remaining lines.

**Color model.** Hex strings, `#rrggbb` (lowercase 6-digit is the safe emit). Values also accept CSS/X11 color names (`red`), short hex (`#fff`), the keyword `none` (cursor/selection → "follow the char under it"), and `foreground`/`background` as aliases. There is **no alpha channel** in color keys — terminal transparency is `background_opacity`, a separate non-color setting that is *not* part of a theme conf. From an Artificer hex palette the conversion is essentially identity: emit the hex verbatim. The only transforms are deriving selection/cursor-text/border tokens when they aren't first-class in the palette, and the lossy fold of named syntax roles onto the 16 ANSI slots.

## Distribution

This is a **theme primitive** (full file), like Ghostty and VS Code in this repo — not a fragment. A kitty theme is just a `.conf` of settings, wired in one of three ways:

- **Themes kitten (Cat 2).** Copies the chosen conf to `~/.config/kitty/current-theme.conf` and injects a `# BEGIN_KITTY_THEME … include current-theme.conf … # END_KITTY_THEME` block into `kitty.conf` (commenting out conflicting color lines — see Gotchas).
- **Plain include (Cat 2).** The user adds `include artificer-dark.conf` to `kitty.conf`.
- **`.auto.conf` selector files (Cat 1).** kitty selects a fixed-name file by OS appearance.

For Artificer/chezmoi: ship the conf file(s) and either symlink/copy them into `~/.config/kitty/themes/` (the kitten auto-discovers files there and shows them in the picker) or template the `include` line into `kitty.conf`.

**Install paths:**

- `~/.config/kitty/kitty.conf` — main config; holds the include / `BEGIN_KITTY_THEME` block
- `~/.config/kitty/current-theme.conf` — what the themes kitten writes the active theme to
- `~/.config/kitty/themes/` — drop custom `*.conf` here for auto-discovery
- `~/.config/kitty/{dark,light,no-preference}-theme.auto.conf` — OS-appearance auto-switching (kitty 0.38.0+)
- macOS uses `~/.config/kitty` too — `~/Library/Preferences/kitty/` is **not** used by default (override via `KITTY_CONFIG_DIRECTORY`).

**Light/dark** is file-per-mode — there is no single-file flag and no in-file conditional. Either ship `artificer-dark.conf` + `artificer-light.conf` for manual selection, or ship all three `*-theme.auto.conf` files for OS-driven switching. On GNOME, "no-preference" resolves to light unless dark is explicitly set, so omitting the no-preference file leaves GNOME users on light.

## build.mjs integration sketch

A `build.mjs` generator emits one `.conf` per mode (`artificer-dark.conf`, `artificer-light.conf`). Shape:

1. **`# vim:ft=kitty`** as the first line.
2. **Metadata header** (`## name:` … `## upstream:` … `## blurb:` last).
3. **Color key lines**, `key<whitespace>value`, one per line. Map semantic tokens onto kitty keys:
   - `background` ← bg ; `foreground` ← fg
   - `selection_background` ← accent/bg blend ; `selection_foreground` ← fg or bg by contrast
   - `cursor` ← accent ; `cursor_text_color` ← bg (block-cursor only)
   - `url_color` ← accent-bright (link token)
   - `active_border_color` ← accent ; `inactive_border_color` ← border ; `bell_border_color` ← attention/urgent
   - `active_tab_background` ← accent-fill ; `active_tab_foreground` ← on-accent ; `inactive_tab_background` ← bg-raised ; `inactive_tab_foreground` ← fg-secondary ; `tab_bar_background` ← bg
   - `mark{1,2,3}_{foreground,background}` ← success/attention/urgent pairs
4. **ANSI 16** (`color0`–`color15`). This is the lossy step. The hue-aligned tokens force-fit onto fixed slots: `color1/9` ← urgent (red), `color2/10` ← success/string (green), `color3/11` ← attention (yellow), `color4/12` ← function/type (blue), `color5/13` ← keyword (magenta), `color0/8` ← bg-ish/comment, `color7/15` ← fg (white). Artificer's *named* syntax roles (keyword/string/comment/type/function) have no dedicated kitty keys — they only reach the terminal through whichever ANSI slot a given CLI tool happens to request, so this mapping is a best-effort convention, not a guarantee.
5. **Two files, one per mode.** A separate Lane-3 chezmoi/install step wires them via the `include` + `BEGIN_KITTY_THEME` marker, or renames them to `dark-theme.auto.conf` / `light-theme.auto.conf` for OS-driven switching.

Most of this is a thin projection of `_palette.json` — emit the 8+8 ANSI slots from the hue-aligned tokens, then derive selection/cursor/border from accent+bg blends, with almost no kitty-specific logic.

## Gotchas

- **[verified] Themes set only through `kitty @ set-colors` don't repaint the tab bar live** — it stays the old color until restart or a new OS window ([#3662](https://github.com/kovidgoyal/kitty/issues/3662); independently corroborated by [`kitten @ set-tab-color`](https://www.mankier.com/1/kitten-@-set-tab-color), which exists *because* the tab bar is rendered separately, plus same-domain reports from different authors #3639, #4152, #937). Practical fallout: an Artificer "instant theme switch" script can't be `set-colors`-only. To repaint the tab bar live it must either reload config / use the themes kitten, or additionally call `kitty @ set-tab-color match:all active_bg=… inactive_bg=…`.

- **[verified] The themes kitten silently comments out color settings already in `kitty.conf`** when you apply a theme — by design, so they don't fight the theme ([themes kitten docs](https://sw.kovidgoyal.net/kitty/kittens/themes/); independently confirmed by [PR #5858](https://github.com/kovidgoyal/kitty/pull/5858), filed by a third-party dev who hit exactly this against their version-controlled config, with the maintainer pointing to the `patch_conf()` source). Fix is include-order: put custom colors in a separate conf included *after* `current-theme.conf`. Adoption tooling must not assume `kitty.conf` is left untouched.

- **[verified] `*.auto.conf` colors override everything — including `kitty --override` and background-image settings.** When `dark-theme.auto.conf` / `light-theme.auto.conf` exist, kitty loads the OS-appropriate one and its colors win over all other color and background config, even CLI overrides ([themes kitten docs](https://sw.kovidgoyal.net/kitty/kittens/themes/); empirically confirmed by third-party [#8239](https://github.com/kovidgoyal/kitty/issues/8239), where `kitty --override background=red` had no effect until the auto.conf was removed). If Artificer ships auto files, any other color/include in `kitty.conf` is dead for color purposes — a likely support-ticket source.

- **[verified] Reloading config under auto dark/light mode resets colors to defaults** instead of re-applying the OS-appropriate `.auto.conf` — the auto-theme selection only runs at startup ([#8354](https://github.com/kovidgoyal/kitty/issues/8354); independently re-reported via SIGUSR1 reload by a different author in [#8530](https://github.com/kovidgoyal/kitty/issues/8530), maintainer-labelled "bug"). Note: filed open in Feb 2025, but both issues are now *closed* — a fix has since merged. Still worth knowing for any workflow that reloads kitty config after an edit.

- **[verified] `cursor none` makes the cursor follow the char under it and silently ignores `cursor_text_color`.** A theme that emits both gets only one honored ([conf reference](https://sw.kovidgoyal.net/kitty/conf/); confirmed by the Debian kitty.conf manpage and, for the block-cursor caveat, [Discussion #5266](https://github.com/kovidgoyal/kitty/discussions/5266)). Compounding it: `cursor_text_color` only applies to a *block* cursor, and kitty's shell integration forces a beam at the prompt — so the setting appears inert unless `shell_integration` is `no-cursor`.

- **[verified] Kitty has no dedicated keys for named syntax roles** (keyword/string/comment/type/function). A theme can only set the 16 ANSI slots + fg/bg/cursor/selection/marks/tabs/borders ([template.conf](https://raw.githubusercontent.com/kovidgoyal/kitty-themes/master/template.conf); independently shown by the third-party [base16-kitty template](https://github.com/kdrag0n/base16-kitty/blob/master/templates/default.mustache), which defines only ANSI + chrome keys and no syntax roles). This is the fundamental fidelity ceiling versus VS Code/Obsidian: Artificer's semantic syntax tokens reach the terminal only via whichever ANSI color a given tool requests, and different tools paint the same role differently.

- **[verified] Non-color settings inside a theme conf can't be applied by `kitty @ set-colors`** — template.conf explicitly warns they "will not work" on that path ([template.conf](https://raw.githubusercontent.com/kovidgoyal/kitty-themes/master/template.conf); the behavioral consequence independently confirmed by [Discussion #6268](https://github.com/kovidgoyal/kitty/discussions/6268), where a different user reports the themes-kitten switch fires a *full config reload* that reset their font size). If Artificer bundles `background_opacity` or font tweaks into the theme file, live theme-switch via `set-colors` silently drops them. Keep theme files color-only.

- **[unconfirmed] `themes --reload-in=all` does not live-reload when bound to a keyboard mapping** — from the shell the theme updates everywhere, but bound to a key map, `current-theme.conf` is rewritten with no live reload firing. This is documented in the primary source ([#5853](https://github.com/kovidgoyal/kitty/issues/5853), now closed) and matches its remedy (chain an explicit reload or use `set_colors` after the theme write), but **no genuinely independent author/domain corroborates it** — every web "confirmation" traces back to #5853, and the closest adjacent source (the kitty FAQ) is the same project/author, so it fails the independence bar. Treat as real-but-single-sourced. It would affect any in-app Artificer theme-toggle keybind (the ⌘⇧L convention), which would need an explicit reload action chained after.

## Tips & tricks

- **Lean on ANSI hue-alignment.** Emit the 8+8 ANSI slots first from the palette's hue-aligned tokens (urgent→red, success→green, attention→yellow, function/type→blue, keyword→magenta), then derive selection/cursor/border from accent+bg blends. The conf becomes a thin projection of `_palette.json` with almost no kitty-specific logic.
- **Set `## upstream:` to the raw GitHub URL of the conf.** The themes kitten uses it for auto-update — free distribution-update plumbing if the theme is ever upstreamed to kitty-themes.
- **Keep theme files color-only.** Put `background_opacity` / font in a separate include *after* `current-theme.conf`. This keeps `kitty @ set-colors` live-switching working and dodges the font-size-reset reload bug.
- **Override a single color without forking via include order.** A later `include my-overrides.conf` wins — last-write-wins for duplicate keys in kitty config.
- **For OS auto-switching, ship all three files** (dark/light/no-preference), named exactly `*-theme.auto.conf`. Omitting no-preference leaves GNOME users on light by default.
- **Drop custom confs in `~/.config/kitty/themes/`** so the kitten auto-discovers them. Naming a file exactly `<Builtin Theme Name>.conf` overrides a builtin (run the kitten once after).

## Fit assessment

**Low effort, high value — worth adding.** Conversion is near-identity hex emit plus the same lossy ANSI-16 fold already solved for Ghostty and tmux in this repo, so `build.mjs` can largely reuse the terminal-ANSI mapping. The format is plain `key value` (no schema, no build toolchain), light/dark is two files, and distribution mirrors the existing theme-primitive shape (full file, chezmoi include). The only net-new work is the `.auto.conf` naming convention and a one-time include-order note in the install docs.

## Where to get the authoritative docs

- **Official conf reference** (all color keys): https://sw.kovidgoyal.net/kitty/conf/
- **Official themes kitten doc** (`BEGIN_KITTY_THEME`, include, auto.conf, override behavior): https://sw.kovidgoyal.net/kitty/kittens/themes/
- **Canonical theme template** (metadata header + every key): https://raw.githubusercontent.com/kovidgoyal/kitty-themes/master/template.conf
- **Upstream theme collection / contribution target:** https://github.com/kovidgoyal/kitty-themes
- **Community theme to crib — Catppuccin** (full key set + scrollbar): https://github.com/catppuccin/kitty
- **Community theme to crib — Tokyo Night** (uses color16/17): https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/kitty/tokyonight_night.conf

## Sources

- https://sw.kovidgoyal.net/kitty/conf/
- https://sw.kovidgoyal.net/kitty/kittens/themes/
- https://sw.kovidgoyal.net/kitty/color-stack/
- https://raw.githubusercontent.com/kovidgoyal/kitty-themes/master/template.conf
- https://github.com/kovidgoyal/kitty-themes
- https://github.com/dexpota/kitty-themes
- https://github.com/catppuccin/kitty
- https://raw.githubusercontent.com/folke/tokyonight.nvim/main/extras/kitty/tokyonight_night.conf
- https://github.com/kovidgoyal/kitty/issues/3662
- https://github.com/kovidgoyal/kitty/issues/8354
- https://github.com/kovidgoyal/kitty/issues/5853
- https://github.com/kovidgoyal/kitty/issues/8123
- https://github.com/kovidgoyal/kitty/discussions/6268
