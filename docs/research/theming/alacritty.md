# Theming Alacritty
> A standalone TOML color file the user imports — chrome and ANSI-16 content colors only, no syntax layer of its own.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Alacritty theming touches terminal **chrome** and **content** colors only. There is no syntax-highlighting layer — that belongs to the shell and programs running inside the terminal, not Alacritty. A theme sets the primary fg/bg, the 16 ANSI colors (normal + bright), an optional dim set, optional 256-palette indexed colors, plus cursor, selection, search, and hint colors.

Because Artificer's syntax roles (keyword, string, comment, type, function) have no native Alacritty slot, they must be **projected onto the ANSI 16** (red/green/yellow/blue/magenta/cyan) — the same lossy mapping every terminal theme lives with. This is already solved for Ghostty and tmux; Alacritty reuses that work.

## Theme format

A TOML config file, schema-enforced by Alacritty's `alacritty_config_derive`. Colors live under nested tables: `[colors.primary]`, `[colors.normal]`, `[colors.bright]`, `[colors.dim]`, `[colors.cursor]`, `[colors.vi_mode_cursor]`, `[colors.selection]`, `[colors.search]`, `[colors.hints]`, plus the array-of-tables `[[colors.indexed_colors]]`.

A theme file is typically **just the `[colors.*]` tables** — no `[general]`, `[font]`, or `[window]` sections — so it imports cleanly without clobbering the user's other settings.

Colors are hex strings, `"#RRGGBB"`, with the `#` prefix; double or single quotes both parse. There is **no alpha channel** in color tokens — transparency comes only from `window.opacity` plus the boolean `colors.transparent_background_colors`. The sentinel strings `CellForeground` / `CellBackground` are allowed for cursor/selection/search/hint fg+bg pairs, meaning "inherit the cell's color." No 0..1 float or rgb-tuple form exists.

The legacy format was YAML (`alacritty.yml`) with nested keys and `'0x'`-prefixed hex (`'0x1d1f21'`). It was deprecated in 0.13 and removed entirely in later releases. Converting Artificer's `#`-hex palette to TOML is a no-op; a fallback YAML port would require swapping `#` for `0x`.

**No native light/dark switching exists inside one file** — Alacritty has no variant concept and no `prefers-color-scheme`. Each variant is a separate `.toml` file (`artificer_dark.toml`, `artificer_light.toml`). Switching means changing which file the main config imports (and forcing a reload), or pushing a file's contents at runtime via `alacritty msg config "$(cat theme.toml)"`. The official `alacritty-theme` repo follows this one-file-per-variant convention.

## Distribution

This is **Category 1 (selector-file)**, the same shape as Ghostty and VS Code: ship a full standalone `.toml` file the user references through `general.import`. The user never edits the theme; they only add an import line to their own `alacritty.toml`. It is not Category 2 (no `@import` inside the theme itself) and not Category 3 (no fragment splicing). Both packaging and symlinking work, with a reload caveat for symlink-swap theme switching (see Gotchas).

Install paths:

- `~/.config/alacritty/alacritty.toml` — main config (Linux/macOS XDG)
- `~/.alacritty.toml` — alternate main config location
- `~/.config/alacritty/themes/artificer_dark.toml` — recommended theme drop location
- `$XDG_CONFIG_HOME/alacritty/alacritty.toml` — if `XDG_CONFIG_HOME` is set
- `%APPDATA%\alacritty\alacritty.toml` — Windows
- `/usr/share/alacritty/themes/` — system-wide theme dir on some distros

## build.mjs integration sketch

`build.mjs` reads the `dark`/`light` blocks of `_palette.json` and emits one TOML file per variant. The primary and chrome mappings are direct:

- `colors.primary.background` ← `bg`, `colors.primary.foreground` ← `fg`, `colors.primary.dim_foreground` ← `fg-secondary` (or `fg-disabled`)
- `colors.cursor` / `colors.vi_mode_cursor.cursor` ← `accent`; their `.text` ← `bg`
- `colors.selection.background` ← a muted accent/border; `.text` ← `"CellForeground"` or `fg`
- `colors.search.matches` / `focused_match` and `colors.hints.start`/`end` ← fg from `bg`, bg from `attention`/`accent`

The **16 ANSI slots are the load-bearing part**. Map `normal.{ black ← bg-raised or border, red ← urgent, green ← success, yellow ← attention, blue ← accent or syntax-type, magenta ← syntax-keyword/brand, cyan ← syntax-function/string, white ← fg-secondary }`, with `bright.*` drawing from brighter variants (`accent-bright`, lightened tints). Syntax roles have no dedicated slot — project them onto the ANSI 16 **deliberately and document the mapping**.

Emit each color as a quoted `"#RRGGBB"` string. Do **not** emit a `[general]` or import block in the theme file itself. Optionally also emit `[[colors.indexed_colors]]` for indices 16–21 to pin Artificer accents into the 256 palette for apps that reach past 16.

## Gotchas

- **[verified] Top-level `import` is deprecated — it must live under `[general]` as of 0.14.0.** A bare top-level `import = [...]` now triggers `Config warning: import has been deprecated; use general.import instead.` In 0.14.0 the `import`, `working_directory`, `live_config_reload`, and `ipc_socket` keys all moved into the new `[general]` table (`shell` separately moved to `terminal.shell`). Theme files themselves carry **no** import line; only the user's main config carries `[general] import = [...]`. Any install docs or chezmoi template writing `import` at top level will warn on current Alacritty and is a future breakage. Confirmed independently by community issue [alacritty/alacritty-theme#137](https://github.com/alacritty/alacritty-theme/issues/137), which quotes the warning verbatim against 0.14, plus multiple distro-forum upgrade reports. Alacritty still *honors* top-level `import` while warning, so the "eventually ignores it" framing is accurate, not refuted.

- **[verified] An inline color scheme in the main config silently defeats an imported theme.** Imports load first; the importing (main) file loads last, so any `[colors.*]` key still present in `alacritty.toml` overrides the imported theme's matching key — with **no error**. Leftover hand-written colors make the Artificer import look broken. The official config docs state it plainly: "the importing file being loaded last. If a field is already present in a previous import, it will be replaced" ([alacritty.org/config-alacritty.html](https://alacritty.org/config-alacritty.html)). Install docs must tell users to strip their own `[colors.*]` blocks before importing. Nuance: the override is per-key, not whole-block, but a hand-written `[colors.primary]`/`[colors.normal]` block covers enough keys to look fully broken.

- **[verified] Live reload does not watch imported/symlinked theme files — only the main config's own change events.** Editing or symlink-swapping an imported theme does not trigger Alacritty's watcher; it monitors the main `alacritty.toml`, which Alacritty canonicalizes, so a re-pointed symlink is never seen. A symlink-flip theme switcher must also `touch`/rewrite the main config — and even a bare `touch` sometimes fails to register, because reload keys on detected content change, not pure mtime. The robust path is `alacritty msg config "$(cat theme.toml)"`. Independently confirmed by the [ArchWiki Alacritty page](https://wiki.archlinux.org/title/Alacritty), which documents both the imported-file caveat and the IPC remedy verbatim. Relevant to any Artificer dark/light toggle wired through symlinks.

- **[verified] `alacritty migrate` (YAML→TOML) drops all comments and does not support YAML anchors.** Automatic migration strips every comment and cannot translate YAML anchors/aliases (a common way old themes deduplicated color values) — TOML has no anchor construct, so the parse-and-reserialize tool simply loses them. Ship native TOML rather than relying on users migrating a YAML port, and do not author themes whose comments are expected to survive a round-trip. Independently confirmed by the [ArchWiki Alacritty page](https://wiki.archlinux.org/title/Alacritty) ("automatic migration drops all comments") alongside the maintainer discussion in the original issue on anchors.

- **[verified] `indexed_colors` is array-of-tables and requires both `index` and `color`; a malformed entry hard-errors the whole config.** Each entry is `[[colors.indexed_colors]]` with `index = N` and `color = "#..."`. A missing `color` throws `Config error: indexed_colors: missing field color`, and because reload rejects a config wholesale on any parse error, the **entire theme** stops applying — not just that entry. Only indices 16–255 are honored; 0–15 belong to `normal`/`bright`. Independently confirmed by the official config docs and the official theme repo's array-of-tables form ([alacritty.org/config-alacritty.html](https://alacritty.org/config-alacritty.html)); the all-or-nothing reload behavior is corroborated by `alacritty/alacritty#4561` in a separate repo. The failure is per-file and wholesale: a running session keeps its prior config, never a partial entry.

- **[verified] Legacy YAML used `0x`-prefixed hex; TOML uses `#`-prefixed. A wrong-prefix color does not parse.** In `alacritty.yml` colors were `'0x1d1f21'`; in `alacritty.toml` they are `'#1d1f21'`. Artificer's `#`-hex palette ports verbatim to TOML, while any fallback YAML port must rewrite the prefix to `0x`. Confirmed by [alacritty/alacritty#5007](https://github.com/alacritty/alacritty/issues/5007), which shows the actual rejection: `failed to parse rgb color ...; expected hex color like #ff00ff; using color #000000`. **Correction to the original claim:** the failure is *not* silent — Alacritty logs a visible error and substitutes a default (`#000000`). The substance holds; "silent" overstates it.

- **[unconfirmed] A broken config at launch disables live reload entirely until restart.** If Alacritty starts with an invalid theme file, fixing the error afterward reportedly does not re-enable reload — it stays off until the process restarts, so a subtly malformed Artificer theme won't self-heal on save. Every source describing this exact behavior traces back to a single origin, [alacritty/alacritty#4561](https://github.com/alacritty/alacritty/issues/4561); no genuinely independent second source corroborates the "fix-doesn't-self-heal until restart" specific. **Missing:** a second, independent author/domain confirming that an at-launch parse error keeps reload disabled after the file is fixed. Treat as plausible but unverified; recommend "relaunch if the theme stops applying" defensively.

- **[verified] `primary.bright_foreground` only takes effect when `draw_bold_text_with_bright_colors = true`.** Setting `bright_foreground` in the theme has zero visible effect unless that boolean (now under `[colors]`) is enabled; otherwise bold text uses the normal foreground. Don't rely on `bright_foreground` for bold-text contrast without also shipping or recommending the toggle. Confirmed by the [Debian alacritty(5) manpage](https://manpages.debian.org/experimental/alacritty/alacritty.5.en.html): "This color is only used when draw_bold_text_with_bright_colors is true," with the legacy inline docs stating the converse.

## Tips & tricks

- Ship the theme file with **only `[colors.*]` tables** — no `[general]`/`[font]`/`[window]` — so it imports cleanly and never overrides the user's non-color settings.
- Use the `CellForeground`/`CellBackground` sentinels for selection/cursor/search/hint pairs when you want them to invert against whatever cell they land on, instead of hardcoding fg/bg — this stays correct across both Artificer variants.
- Leave `[colors.dim]` **unset** to let Alacritty auto-derive dim colors from normal, unless Artificer has explicit dim tokens — fewer slots to keep in sync.
- Reuse the same ANSI-16 mapping already chosen for Ghostty/tmux/Claude Code so red=urgent, green=success, yellow=attention stays consistent across every Artificer terminal target — the cross-app delegation win.
- For runtime/SSH theme switching, prefer `alacritty msg config "$(cat theme.toml)"` over symlink swaps to sidestep the import-not-watched reload gotcha entirely.
- Pin Artificer accents into `[[colors.indexed_colors]]` indices 16–21 so TUIs that address the 256-palette directly still land on-brand.

## Fit assessment

**Low effort, high fit — worth adding to the Artificer pipeline.** Alacritty is a thin palette wrapper exactly like Ghostty: emit one TOML file per variant from `_palette.json`, reusing the existing ANSI-16 mapping. The only new work is projecting syntax roles onto ANSI slots (already solved for Ghostty/tmux) and templating the user's `[general] import` line via chezmoi.

## Where to get the authoritative docs

- **Official TOML config reference** (colors section, import semantics) — https://alacritty.org/config-alacritty.html
- **0.14.0 changelog** (import moved to `[general]`) — https://alacritty.org/changelog_0_14_0.html
- **Official theme repo** (TOML themes + creation guide) — https://github.com/alacritty/alacritty-theme
- Community theme — **Gruvbox Dark** — https://raw.githubusercontent.com/alacritty/alacritty-theme/master/themes/gruvbox_dark.toml
- Community theme — **Tokyo Night** — https://raw.githubusercontent.com/alacritty/alacritty-theme/master/themes/tokyo_night.toml
- Community theme — **Catppuccin** (real-world `indexed_colors` + bug history) — https://github.com/catppuccin/alacritty

## Sources

- https://alacritty.org/config-alacritty.html
- https://alacritty.org/changelog_0_14_0.html
- https://github.com/alacritty/alacritty-theme/issues/38
- https://github.com/alacritty/alacritty-theme/issues/137
- https://github.com/alacritty/alacritty/issues/6996
- https://github.com/alacritty/alacritty/issues/6592
- https://github.com/alacritty/alacritty/issues/5852
- https://github.com/alacritty/alacritty/issues/4561
- https://github.com/catppuccin/alacritty/issues/4
- https://medium.com/@pachoyan/migrate-alacritty-terminal-configuration-yaml-to-toml-for-0-13-x-versions-67fda01be18c
- https://raw.githubusercontent.com/alacritty/alacritty-theme/master/themes/gruvbox_dark.toml
- https://raw.githubusercontent.com/alacritty/alacritty-theme/master/themes/tokyo_night.toml
- https://shom.dev/posts/20240124_alacritty-toml-and-partial-imports/
