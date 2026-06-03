# Theming ANSI-driven CLI tools (bat, delta, fzf, btop, eza)
> Content-painting terminal tools whose chrome rides on the emulator's ANSI palette — re-themed via five distinct config formats, all derivable from Artificer's single hex source.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

These five tools paint *content* — file listings, diffs, syntax-highlighted source, resource graphs — inside a terminal whose chrome and 16-color ANSI base are already owned by the emulator. Ghostty is an Artificer target, so the base palette is covered; the question for each tool is how much it delegates to that base versus how much it pins for itself.

The split runs along one line: **syntax-theme consumers versus self-colored tools.** `bat` needs a real syntax-highlighting theme — a Sublime `.tmTheme` compiled into bat's binary cache. `delta` reuses that same cache for `syntax-theme` and layers its own diff/decoration styles on top. The other three are self-colored: `fzf` reads a flat `--color` string, `btop` reads a `.theme` file, and `eza`/`ls` reads `theme.yml` or `EZA_COLORS` — none of them inherit a syntax theme, and none talk to each other.

The big lever is that every one of these can *either* delegate to the terminal's 16 ANSI slots (so Artificer's Ghostty palette re-themes them for free on a light/dark toggle) *or* be pinned to truecolor hex. The truecolor path is sharper but carries real environmental caveats — `COLORTERM`, tmux RGB passthrough, and 256-color downconversion all sit between a "correct" theme file and correct pixels.

## Theme format

Five distinct formats, one shared source (`_palette.json` dark/light blocks plus the existing `$roles.syntax` map):

1. **bat** — Sublime Text `.tmTheme`: XML/plist, a top-level `settings` dict plus one `<dict>` per syntax scope (`keyword`, `string`, `comment`, …). Compiled into a binary cache via `bat cache --build`; the theme *name* is the filename.
2. **delta** — git-config INI sections `[delta "name"]` with `dark=true|light=true`, a `syntax-theme=<bat theme name>`, and git-style style-strings (`minus-style`, `plus-style`, `*-emph-style`, `line-numbers-*`). Supports ad-hoc named colors and style references — names must end in `-style`.
3. **fzf** — a single flat `--color=BASE,role:value,…` string (lives in `FZF_DEFAULT_OPTS`), ~40 role names, attributes appended with colons (`hl:#dbbb6f:bold`).
4. **btop** — flat `theme[key]="#RRGGBB"` key/value `.theme` file, with gradient *triples* (start/mid/end) for meters.
5. **eza** — nested YAML `theme.yml` (`filekinds`/`perms`/`size`/`users`/`links`) *or* colon-delimited `EZA_COLORS`/`LS_COLORS` ANSI escape strings.

**Color model**, all derivable from Artificer hex: bat `.tmTheme` takes `#RRGGBB` plist strings; delta takes hex, the 16 ANSI names, four special tokens (`auto`/`normal`/`raw`/`syntax`), or 140 CSS names; fzf takes per-role `-1` (terminal default), `0–15` (ANSI slots — the inherit-from-Ghostty path), `16–255` (256-cube), or `#RRGGBB`; btop takes hex, `#BW` greyscale, or decimal `R G B`; eza `theme.yml` takes hex or named colors, but `EZA_COLORS`/`LS_COLORS` take **SGR escape numbers only** (`38;2;R;G;B` truecolor or `38;5;N` for 256) — no hex literal.

**Light/dark has no single convention** — every tool ships separate dark and light artifacts, and runtime switching is the user's shell/dotfiles job, not the format's. bat ships two named `.tmTheme` files (selected via `BAT_THEME`, or 0.25+ auto-switch via `--theme-dark`/`--theme-light`; the env-var pair `BAT_THEME_DARK`/`BAT_THEME_LIGHT` was buggy versus the flags — issue #3171). delta ships two features flagged `dark=true` / `light=true`. fzf ships two `--color` strings or leans on the `dark`/`light`/`base16` base scheme. btop ships two `.theme` files picked by `color_theme=`. eza has *no* light/dark mechanism at all — Artificer must ship two files and let the dotfiles symlink decide.

## Distribution

The repo's two existing distribution shapes map cleanly:

- **Full files (Category 1)** — bat `.tmTheme` (drop into `$(bat --config-dir)/themes`, then `bat cache --build`), btop `.theme` (drop into `$XDG_CONFIG_HOME/btop/themes`, select by name in `btop.conf`), eza `theme.yml` (placed at config dir, named exactly `theme.yml`). Ship as full files, symlinked via chezmoi.
- **Config fragments (Category 3)** — delta (a git-config INI block spliced into `~/.gitconfig` or an `[include]`d file), fzf (a `--color=…` line spliced into `FZF_DEFAULT_OPTS`), and the `EZA_COLORS` env-var variant. Ship via chezmoi `includeTemplate` — the same Option-B Cameron-first pattern already locked for lazygit/gh-dash.

Install paths:

- **bat** — `$(bat --config-dir)/themes/Artificer-{Dark,Light}.tmTheme` (macOS: typically `~/.config/bat/themes/` — verify with `bat --config-dir`); requires `bat cache --build` after; cache at `$(bat --cache-dir)`.
- **delta** — a git-config fragment in `~/.gitconfig` (or `~/.config/git/config`), e.g. `[include] path = ~/.config/delta/artificer.gitconfig` holding the `[delta "artificer-dark"]` / `[delta "artificer-light"]` features.
- **fzf** — an `export FZF_DEFAULT_OPTS` line in `~/.zshrc`/`~/.zshenv` (or a sourced `~/.config/fzf/artificer.zsh`).
- **btop** — `~/.config/btop/themes/artificer.theme`; set `color_theme = "artificer"` in `~/.config/btop/btop.conf`.
- **eza (file)** — `$EZA_CONFIG_DIR/theme.yml` else `~/.config/eza/theme.yml`, named `theme.yml` exactly; some macOS builds resolve to `~/Library/Application Support/eza`, so set `EZA_CONFIG_DIR` explicitly.
- **eza (env var)** — `EZA_COLORS`/`LS_COLORS` export in shell rc; `unset LS_COLORS` first if `theme.yml` is meant to win.

## build.mjs integration sketch

Extend `themes/build.mjs` with one emitter per tool, each consuming the same `_palette.json` dark/light blocks plus `$roles.syntax` (keyword→brandPurpleBright, string→successBright, comment→fgMuted, type→accentBright, function→accent, …):

1. **bat** — render a `.tmTheme` plist: top-level `settings` dict (`background:bg`, `foreground:fg`, `caret:accent`, `selection:bgOverlay`, `lineHighlight:bgRaised`), then one `<dict>` per syntax role mapping each `$roles.syntax` token to TextMate scopes (`keyword`, `string`, `comment`, `entity.name.function`, `storage.type`, …). Emit `Artificer-Dark.tmTheme` + `Artificer-Light.tmTheme` and a post-build note that `bat cache --build` must run.
2. **delta** — render two INI features: `minus-style`→`syntax diffDelBg`, `plus-style`→`syntax diffAddBg`, `*-emph-style`→diffDelWord/diffAddWord, line-numbers/decorations→border/fgMuted/accent. Set `syntax-theme` to the bat theme *name* and `dark`/`light=true`.
3. **fzf** — build one `--color` string: `bg`→bg, `bg+`→bgRaised, `fg`/`fg+`→fg, `hl`/`hl+`→accent/accentBright, `info`→fgMuted, `border`→border, `prompt`→accent, `pointer`/`marker`→urgentBright/successBright, `header`→steel, `spinner`→success. Emit hex (truecolor) and optionally a 16-color fallback variant.
4. **btop** — map `main_bg`→bg, `main_fg`→fg, `title`→accent, `hi_fg`→accentBright, `selected_bg`→bgOverlay, `*_box`→border, and synthesize gradient triples (cpu/temp from success→attention→urgent; download/upload from steel→cyan→accent).
5. **eza** — emit `theme.yml` with nested sections (`filekinds.directory`→accent, `.executable`→success, `.symlink`→cyan; `perms`→steel; `size`→fgSecondary; `users`→…) using hex; optionally also emit an `EZA_COLORS` string by converting each hex to `38;2;R;G;B`.

## Gotchas

- **[verified]** delta's `syntax-theme` is **not** delta's own theme — it's a name resolved out of bat's compiled cache, so a custom Artificer syntax theme must be built into bat (placed in bat's themes dir *and* `bat cache --build` run) before delta can see it; an unrecognized name is silently ignored. Delta's official docs state plainly that "the languages and color themes that ship with delta are those that ship with bat," and the `delta(1)` man page confirms `--syntax-theme` "defaults to the value of `BAT_THEME`… **if that contains a valid theme name**" — i.e. invalid names fall back without error ([delta docs: supported-languages-and-themes](https://dandavison.github.io/delta/supported-languages-and-themes.html)).
- **[verified]** bat silently falls back to defaults when a custom `.tmTheme` is nested in a subdirectory or in an unsupported format — `bat cache --build` prints "No themes were found… using the default set" but exits 0, so a broken install looks like success until `bat --list-themes` omits the theme. `syntect`'s `add_from_folder` is non-recursive (the classic `foo/foo.tmTheme` layout fails; files must sit *directly* in the themes dir), and `.sublime-color-scheme` files are unsupported. Independently reproduced by a different reporter in [sharkdp/bat#1543](https://github.com/sharkdp/bat/issues/1543) and again, cross-domain, in home-manager#2482.
- **[verified]** Upgrading bat invalidates the binary theme cache — themes vanish with "The binary caches… are not compatible with this version of bat" until `bat cache --build` is re-run. The cache is tied to the bat/syntect version, so this bites *any* upgrade on *any* package manager (Homebrew is just one path). Corroborated by delta's docs, which require the installed bat version to match delta's `Cargo.toml`, confirming the cache is version-sensitive ([delta docs: supported-languages-and-themes](https://dandavison.github.io/delta/supported-languages-and-themes.html)); the exact error string appears in bat#2085. Any Artificer install/repair script must re-run `bat cache --build`, or the doctor must check.
- **[verified]** eza's `theme.yml` is silently overridden by `LS_COLORS`/`EZA_COLORS`, and `LS_COLORS` is commonly set without the user realizing (precedence is `EZA_COLORS` > `LS_COLORS` > `theme.yml` > defaults, by design for back-compat). Shipping `theme.yml` is not enough — the install must `unset LS_COLORS`/`EZA_COLORS`, or ship the colors *as* an `EZA_COLORS` string. The eza-themes README states verbatim that "LS_COLORS and EZA_COLORS take precedence over the theme file, so make sure to unset them when using a theme file" ([eza-themes README](https://github.com/eza-community/eza-themes/blob/main/README.md)). *Caveat:* the specific attribution to `dircolors`/`vivid`/shell-plugins as the silent setters is the claim author's reasonable inference — the sources confirm silent setting generically but don't name those tools.
- **[verified]** 24-bit hex in fzf/bat/btop renders as wrong/banded colors inside tmux unless tmux is told the **outer** terminal supports RGB — and the override must name the outer `$TERM`, not the inner one. tmux downconverts truecolor to 256 unless `terminal-features ',<outer>:RGB'` (3.2+) or `terminal-overrides ',<outer>:Tc'` is set; a wrong prefix means a silent downconvert (banding on btop gradients, muddy delta/bat diffs). The official tmux FAQ documents both the version split and that the prefix must match the emulator's `$TERM` from outside tmux ([tmux FAQ: How do I use RGB colour?](https://github.com/tmux/tmux/wiki/FAQ)). Already handled in Cameron's dotfiles (`dot_tmux.conf` names `xterm-ghostty:RGB`).
- **[verified]** bat won't emit truecolor at all unless `COLORTERM=truecolor|24bit` — keyed off the env var, not terminfo. A remote/tmux/sudo shell that drops `COLORTERM` makes an Artificer hex `.tmTheme` print in approximated 256-color on an otherwise-capable terminal; the fix is environmental (`export COLORTERM` / forward it via ssh), not in the theme file. The cross-vendor [termstandard/colors](https://github.com/termstandard/colors) standard that bat's README defers to confirms the mechanism: terminals advertise via `COLORTERM`, programs fall back to 8-bit when it's absent, and "by default it is not forwarded via sudo, ssh, etc."
- **[verified]** btop's theme background can go transparent / fail to paint depending on `theme_background` and an empty `main_bg`, and 24-bit colors downconvert when `truecolor=false`. An empty `theme[main_bg]` means "terminal default / transparent" *by design*, `theme_background=False` forces transparency regardless of the theme, and `truecolor=false` quantizes meters into the 6×6×6 cube (banding). The independent [catppuccin/btop#20](https://github.com/catppuccin/btop/issues/20) documents both background mechanisms and the official btop README confirms the truecolor downconversion — so the theme file alone can't guarantee the background paints.
- **[verified]** fzf's BASE scheme silently swaps under you: with no scheme it's `dark` on 256-color terminals but `base16` (16 ANSI) otherwise, and `NO_COLOR` forces `bw`. If the Artificer `--color` string omits the base and the terminal reports <256 colors (or `NO_COLOR` is set), unspecified roles inherit from a different base palette — pin the base explicitly (`--color=dark,…`) for determinism. The Arch-distributed fzf(1) man page states the default verbatim: "dark on 256-color terminal, otherwise base16; If NO_COLOR is set, bw" ([fzf.1](https://man.archlinux.org/man/fzf.1.en)).
- **[verified]** `EZA_COLORS`/`LS_COLORS` accept **only** ANSI SGR escape numbers — never hex — so Artificer hex must be converted to `38;2;R;G;B`, and eza *rejects* invalid codes outright ("the given ANSI values must be valid colour codes"); only the `theme.yml` path accepts `#RRGGBB`. The env-var distribution path therefore needs a hex→SGR conversion step in build.mjs. Confirmed by the [eza-themes repo](https://github.com/eza-community/eza-themes), which shows `theme.yml` taking hex directly while the env vars are a separate, precedence-winning SGR-only mechanism. *Caveat:* eza's man page documents `38;5;N` (256) but not the `38;2;R;G;B` truecolor form explicitly — that syntax comes from the ANSI standard, and is the correct conversion target.

## Tips & tricks

- **Inherit the 16 ANSI slots wherever possible.** fzf accepts `0–15` and `-1` (terminal default), delta accepts the 16 named colors, eza accepts named colors. Map those roles to Artificer's Ghostty ANSI palette and the tools re-theme for free on a light/dark toggle — one source of truth, zero per-tool light/dark files for the inherited roles.
- **Build the bat `.tmTheme` once; let delta borrow it.** delta delegates *all* syntax highlighting to bat — reference the theme by name as delta's `syntax-theme` and don't duplicate syntax colors in the delta fragment. Only delta's diff/decoration styles are delta-specific.
- **Keep syntax highlighting alive inside diffs.** Use delta's `syntax` special color in plus/minus styles (e.g. `plus-style = syntax "#1f3a28"`) so added/removed lines retain full highlighting over an Artificer diff-bg instead of flattening to one foreground color.
- **Define delta named colors once.** delta supports ad-hoc named colors and style references (names must end in `-style`) — define `artificer-add-bg`/`artificer-del-bg` once and reference them to keep the generated fragment DRY.
- **Pin fzf's BASE scheme** (`dark`/`light`) at the front of the `--color` string so the theme is deterministic regardless of reported color depth or `NO_COLOR`.
- **Synthesize btop gradients from existing tiers** — success→attention→urgent for cpu/temp load ramps, steel→cyan→accent for net. No new tokens; reuse the palette's tier colors as the magnitude ramp.
- **Ship eza both ways.** `theme.yml` (hex, readable) for the file path *and* an `EZA_COLORS` string (`38;2;R;G;B`) for users who already set env vars — the env-var form wins precedence anyway, so it's the more robust default if you also emit a `reset` entry to drop built-in defaults.
- **Make the bat cache a first-class install step.** Add `bat cache --clear && bat cache --build` to the install/repair script and a doctor check that `bat --list-themes | grep Artificer` succeeds post-upgrade — the cache is the #1 silent-failure point for both bat and delta.

## Fit assessment

**Medium effort, high value — worth adding to the pipeline.** Five small emitters in build.mjs, all fed by the existing `_palette.json` + `$roles.syntax` map with no new tokens. bat and delta are the real work (the `.tmTheme` plist, the cache-build step, and the delta-reuses-bat coupling); fzf, btop, and eza are mostly string templating. Distribution slots cleanly into the repo's two existing shapes — full files for bat/btop/eza, Category-3 chezmoi fragments for delta/fzf — and these are tools Cameron already runs, so it dogfoods. The one ongoing cost is the bat cache-rebuild-on-upgrade footgun, which a doctor check neutralizes.

## Where to get the authoritative docs

**Official spec / schema / API reference:**

- bat custom themes + ANSI theme + COLORTERM — https://github.com/sharkdp/bat/blob/master/README.md
- `.tmTheme` format (Sublime color schemes) — https://www.sublimetext.com/docs/color_schemes_tmtheme.html
- delta custom themes — https://dandavison.github.io/delta/custom-themes.html
- delta named styles / color-moved — https://dandavison.github.io/delta/color-moved-support.html
- fzf color schemes wiki — https://github.com/junegunn/fzf/wiki/Color-schemes
- btop README + theme header format — https://github.com/aristocratos/btop
- eza `eza_colors-explanation.5` (theme.yml + EZA_COLORS) — https://github.com/eza-community/eza/blob/main/man/eza_colors-explanation.5.md

**Community themes to crib from:**

- delta `themes.gitconfig` (real theme blocks) — https://github.com/dandavison/delta/blob/main/themes.gitconfig
- catppuccin/btop (full real theme key set) — https://github.com/catppuccin/btop
- eza-themes official repo (real `theme.yml` source) — https://github.com/eza-community/eza-themes

## Sources

- https://github.com/sharkdp/bat/blob/master/README.md
- https://man.archlinux.org/man/bat.1.en
- https://github.com/sharkdp/bat/issues/614
- https://github.com/sharkdp/bat/issues/1543
- https://github.com/sharkdp/bat/issues/1726
- https://github.com/sharkdp/bat/issues/3171
- https://www.sublimetext.com/docs/color_schemes_tmtheme.html
- https://dandavison.github.io/delta/custom-themes.html
- https://dandavison.github.io/delta/color-moved-support.html
- https://dandavison.github.io/delta/configuration.html
- https://github.com/dandavison/delta/blob/main/themes.gitconfig
- https://github.com/dandavison/delta/issues/953
- https://github.com/junegunn/fzf/wiki/Color-schemes
- https://github.com/junegunn/fzf/blob/master/ADVANCED.md
- https://github.com/junegunn/fzf/issues/2502
- https://github.com/aristocratos/btop
- https://github.com/catppuccin/btop
- https://github.com/aristocratos/btop/issues/435
- https://github.com/eza-community/eza/blob/main/man/eza_colors-explanation.5.md
- https://github.com/eza-community/eza/blob/main/man/eza_colors.5.md
- https://github.com/eza-community/eza/issues/1224
- https://github.com/eza-community/eza/issues/1724
- https://github.com/eza-community/eza-themes
- https://github.com/tmux/tmux/issues/2044
