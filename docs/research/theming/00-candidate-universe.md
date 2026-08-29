# Theming candidate universe
> Ranked map of apps Artificer could theme, by fit × effort.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Already shipped

Palette-routed from `themes/_palette.json` via `themes/build.mjs`. The list is
maintained past this document's research date — the ranking below is the
2026-05-29 snapshot, this is current:

- **Ghostty** — terminal
- **Claude Code** — agent CLI theme
- **VS Code** — editor color theme
- **Helix** — editor (TOML; transparent default + `-opaque` twins, ADR 0038)
- **Neovim** — editor (one Lua colorscheme, both modes; ADR 0038 carries)
- **JetBrains IDEs** — editor (an IntelliJ Platform theme plugin: two Islands-based UI themes + two editor schemes, packed to a jar by `npm run pack:jetbrains`)
- **bat / delta** — pager + differ (`.tmTheme`)
- **Codex CLI** — agent TUI (same `.tmTheme` emitter, paints its own pane)
- **tmux** — multiplexer status/pane styling
- **gitmux** — tmux git status block
- **lazygit** — TUI git client (block fragment)
- **gh-dash** — GitHub dashboard TUI (block fragment)
- **herdr** — multiplexer TUI (block fragment)
- **cmux** — workspace accents (reuses the Ghostty values)
- **glamour** — markdown renderer (glow and anything on glamour)
- **gum** / **fzf** / **eza** — sourceable shell fragments
- **starship** — prompt palette table
- **yazi** — file manager (third merge layer)
- **flux** — daisyUI override (both modes, one CSS file)

Hand-authored separately:

- **Obsidian** — full theme (`themes/obsidian/Artificer/`)

---

## Researched this pass

| App | Tier | Theme format | Distribution category | Effort | Verdict |
|---|---|---|---|---|---|
| JetBrains (IntelliJ Platform) | A | `.icls` editor scheme + `.theme.json` UI theme (plugin) | Plugin/zip primitive | Med | **BUILT** (`themes/jetbrains/`) |
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

> **Amendment — browser CHROME is tier B, not tier C.** The tier-C rows above
> survey theming a browser's *page content*, where the "injection only, fragile
> by construction" verdict still holds. It does not hold for the browser's own
> chrome: Chrome, Edge and Firefox all expose a first-class static-theme
> manifest — a plain colour table in an extension package, no injection, no
> fragility. Artificer ships all three (`themes/chromium/`, `themes/firefox/`),
> so the Edge row's `skip` verdict should be read as scoped to page content
> only. Safari has no equivalent and remains a genuine skip.

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
4. ~~**Neovim** (A, med)~~ — **BUILT** (`themes/neovim/colors/artificer.lua`). One Lua colorscheme carrying both modes off `vim.o.background`; syntax routes through `$roles.syntax` and the `@lsp.*` groups are cleared so treesitter keeps the role layer. The prediction held: the role map was the well-trodden part, and the Neovim-specific work was the two priority hazards (`highlight clear` restoring built-in defaults, semantic tokens out-ranking treesitter).
5. **Starship** (B, low) — prompt fragment that ties the terminal targets together visually; ships as a block fragment alongside the existing tmux/gitmux story.
