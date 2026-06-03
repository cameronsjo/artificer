# Theming candidate universe
> Ranked map of apps Artificer could theme, by fit × effort.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Already shipped

Palette-routed from `themes/_palette.json` via `themes/build.mjs`:

- **Ghostty** — terminal
- **Claude Code** — agent CLI theme
- **VS Code** — editor color theme
- **tmux** — multiplexer status/pane styling
- **gitmux** — tmux git status block
- **lazygit** — TUI git client (block fragment)
- **gh-dash** — GitHub dashboard TUI (block fragment)

Hand-authored separately:

- **Obsidian** — full theme (`themes/obsidian/Artificer/`)

---

## Researched this pass

| App | Tier | Theme format | Distribution category | Effort | Verdict |
|---|---|---|---|---|---|
| JetBrains (IntelliJ Platform) | A | `.icls` editor scheme + `.theme.json` UI theme (plugin) | Plugin/zip primitive | High | maybe |
| Neovim | A | Lua colorscheme (`hl` groups, `:highlight`) | Theme primitive (plugin/file) | Med | **add** |
| Zed | A | JSON theme (`themes/*.json`, theme extension) | Theme primitive (file) | Low | **add** |
| Helix | A | TOML theme (`~/.config/helix/themes/`) | Theme primitive (file) | Low | **add** |
| Sublime Text | A | `.sublime-color-scheme` JSON | Theme primitive (file) | Low | maybe |
| Emacs | A | Elisp `deftheme` / `custom-theme-set-faces` | Theme primitive (file) | High | skip |
| WezTerm | B | Lua/TOML color table | Theme primitive (file) | Low | **add** |
| Alacritty | B | TOML color table | Theme primitive (file) | Low | **add** |
| Kitty | B | `.conf` color keys | Theme primitive (file) | Low | **add** |
| iTerm2 | B | `.itermcolors` XML plist | Theme primitive (file) | Low | maybe |
| Windows Terminal | B | JSON scheme block in `settings.json` | Block fragment | Low | maybe |
| Starship | B | TOML palette + module styles | Block fragment | Low | maybe |
| ANSI-driven CLI tools (bat, delta, fzf, btop, eza) | B | ANSI 16-color map / per-tool theme files | Mixed (env + fragments) | Med | maybe |
| Microsoft Edge | C | No native CSS theming; injection only | Injection | High | skip |
| Safari | C | No native CSS theming; extension/injection only | Injection | High | skip |
| Stylus / UserCSS | C | UserCSS `@-moz-document` stylesheets | UserCSS primitive | Med | maybe |
| Userscript managers (Tampermonkey / Violentmonkey / Userscripts) | C | JS-injected CSS | Injection | High | skip |

**Tier legend** — A: code editors/IDEs (high daily dwell-time, palette maps cleanly to syntax + UI roles). B: terminals/CLI chrome (16-color ANSI + a few UI keys, mostly trivial maps). C: browsers and web-surface injection (no first-class theming hook; fragile by construction).

---

## Not yet researched (Tier D — injected closed apps)

High-payoff-but-brittle. Each themes a closed app by injecting CSS through a third-party patcher — payoff is high (these are where people *live*), but every one is version-sensitive and breaks on app updates. Deferred as a cohort, not individually triaged.

- **Discord** — CSS via **Vencord** or **BetterDiscord** custom themes. Deferred: client mods violate ToS, break on Discord's frequent Electron/CSS-class churn, and need per-mod packaging.
- **Slack** — limited; no supported theming beyond the sidebar accent picker. Full theming needs injection (e.g. patched client). Deferred: nearly no surface area without a brittle inject.
- **Spotify** — CSS/JS via **Spicetify**. Deferred: re-patches the binary on every Spotify update, frequently broken for days after releases; high maintenance.
- **Vesktop** — Discord-flavored client; inherits Vencord's CSS theming. Deferred: same fragility as Discord plus a smaller user base (niche).

These share one shape: no first-class theme API, CSS smuggled in via a patcher, and a maintenance tax paid on the *target app's* release cadence — not ours.

---

## Recommended next adoptions

Ordered by fit × effort:

1. **Zed** (A, low) — JSON theme, clean role map, fast-growing editor with first-class theme extensions. Highest fit-per-effort on the board.
2. **Helix** (A, low) — TOML theme, trivial file drop, exactly Cameron's tool-surface audience. Pairs naturally with the terminal targets already shipped.
3. **WezTerm + Alacritty + Kitty** (B, low) — three terminal color tables that are near-mechanical maps from the existing Ghostty palette; batch them as one build-target pass.
4. **Neovim** (A, med) — high daily dwell-time and the single biggest "where's the Artificer Neovim theme?" gap; Lua colorscheme is more surface than a terminal but the role map is well-trodden.
5. **Starship** (B, low) — prompt fragment that ties the terminal targets together visually; ships as a block fragment alongside the existing tmux/gitmux story.
