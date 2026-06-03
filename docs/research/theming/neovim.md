# Theming Neovim
> Coloring the editor's chrome, legacy syntax groups, and the modern treesitter/LSP semantic layers via a Lua colorscheme.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Neovim theming colors three things at once: the editor chrome (`Normal`, `StatusLine`, `Pmenu`, `LineNr`, `CursorLine`, `Visual`, `WinSeparator`, floats), the legacy syntax and UI highlight groups (`Comment`, `String`, `Function`, `Keyword`, `Type`, `Constant`, `Operator`, `Search`, diagnostics), and the modern semantic layers — treesitter `@capture` groups (`@comment`, `@keyword.function`, `@variable.member`, `@function.builtin`) and LSP semantic tokens (`@lsp.type.*`, `@lsp.mod.*`, `@lsp.typemod.*`).

A theme is a Lua (or Vimscript) script that assigns attributes to named highlight groups via `nvim_set_hl`, and it leans heavily on group **links** so one base color drives many captures. Crucially, it does **not** theme the terminal emulator's own colors — that's a separate config (Ghostty, in this repo's stack). Neovim only paints what it draws inside its own cells.

## Theme format

A colorscheme is an **executable script, not declarative data** — there is no JSON schema. Two flavors exist: Lua (`colors/<name>.lua`) or Vimscript (`colors/<name>.vim`); Neovim runs whichever it finds on `runtimepath` when `:colorscheme <name>` fires. Lua is preferred for new themes because of proper API access via `nvim_set_hl`.

The structure is boilerplate first — `highlight clear`, a guarded `syntax reset`, `vim.g.colors_name = 'artificer'` — then a sequence of `nvim_set_hl(0, group, { fg, bg, sp, bold, italic, underline, link, ... })` calls, typically organized as a `{ group = spec }` table iterated in a loop. The closest thing to a "schema" is the set of standard highlight-group names documented in `:help highlight-groups`, `:help treesitter-highlight-groups`, and `:help lsp-semantic-highlight`.

**Color model.** The `gui` path takes `#RRGGBB` hex strings straight through `nvim_set_hl`'s `fg`/`bg`/`sp` keys — Artificer's hex tokens map 1:1, no conversion needed. The `cterm` fallback path is a **separate model**: `ctermfg`/`ctermbg` take a 0–255 integer (16 ANSI + 240 cube/grayscale indices), not hex. Supporting 256-color terminals means quantizing each hex token to the nearest xterm-256 index — a real build step. `mini.base16` with `use_cterm=true` does this for you; hand-rolled themes typically omit `cterm` and require `termguicolors`.

base16 frameworks (`mini.base16`, `base16-nvim`) are a thin layer: you supply a 16-color palette table (`base00..base0F`) and they generate every group, including treesitter and LSP captures.

## Distribution

This is a **Category 1 (selector file)** target. The theme is a single file at `colors/artificer.lua` placed anywhere on `runtimepath`; the user activates it with `:colorscheme artificer`. There is **no `@import`/include mechanism** in Vimscript/Lua colorschemes (unlike CSS), so it is not Category 2.

For Cameron's dotfiles flow, the cleanest path is a symlink from the Artificer repo's `themes/neovim/colors/artificer.lua` into `~/.config/nvim/colors/` (chezmoi-managed). The alternative is shipping a tiny plugin repo (a repo with `colors/artificer.lua` at root) that a plugin manager like lazy.nvim or packer drops onto `runtimepath`.

Install paths:

- `~/.config/nvim/colors/artificer.lua` — primary (`$XDG_CONFIG_HOME/nvim/colors/` on Linux/macOS)
- `~/.local/share/nvim/site/colors/artificer.lua` — site-dir alternative
- Plugin form: a repo with `colors/artificer.lua` at root, added via lazy.nvim/packer
- Vimscript variant would be `colors/artificer.vim` in the same dirs — Neovim resolves either

A base16-framework backend turns this Cat-2-ish (it depends on `base16-nvim` or `mini.nvim` being installed). **Prefer the standalone file** to keep zero install requirements.

## build.mjs integration sketch

A Neovim adapter in `build.mjs` reads `themes/_palette.json` (dark + light blocks of semantic hex tokens) and emits a single Lua colorscheme: `colors/artificer.lua`. Pick the variant from `vim.o.background` at runtime so **one file holds both palettes** and branches on background.

Per-file shape:

1. **Boilerplate header** (emitted as `vim.cmd` strings): `vim.cmd('highlight clear')`, guard `if vim.fn.exists('syntax_on') then vim.cmd('syntax reset') end`, `vim.g.colors_name = 'artificer'`, `vim.o.termguicolors = true`. Branch on `vim.o.background` (`'dark'` vs `'light'`).
2. **A local palette table** maps Artificer tokens onto base16 slots and named hex vars: `base00=bg`, `base01=bg-raised`, `base02=bg-overlay/selection`, `base03=fg-disabled` (comments), `base05=fg`, `base07=brightest`, `base08=urgent` (red), `base09=attention` (amber), `base0A=type` (yellow), `base0B=success/string` (green), `base0C=accent-bright`, `base0D=function` (blue), `base0E=keyword/brand` (purple), `base0F=border/special`.
3. **A `hi(group, opts)` helper** wrapping `nvim_set_hl(0, group, opts)`. Emit in order: editor UI groups (`Normal`, `NormalFloat`, `CursorLine`, `Visual`, `Pmenu`, `StatusLine`, `LineNr`, `SignColumn`, `WinSeparator=border`, `Search`, `IncSearch`), then legacy syntax (`Comment`, `String`, `Function`, `Keyword`, `Type`, `Constant`, `Operator`, `Identifier`), then treesitter captures (mostly `link=` to legacy groups, with a few explicit `fg` for `@variable.member`, `@function.builtin`, `@keyword.import`), then diagnostics (`DiagnosticError=urgent`, `Warn=attention`, `Info=accent`, `Hint=fg-secondary`), then a small `@lsp` section that mostly **clears** overrides (`@lsp.type.variable={}`) so treesitter wins. Optionally emit `cterm` fallback indices if `use_cterm`.

**Alternative thin shape:** instead of hand-writing groups, emit a `base00..base0F` table and call `require('base16-colorscheme').setup({...})` or `require('mini.base16').setup({ palette = ..., use_cterm = true })` inside `colors/artificer.lua` — far fewer lines, but you inherit the framework's role decisions for the eight accents.

**Light/dark:** emit both blocks keyed on `vim.o.background` and document that **background must be set before `:colorscheme`** (see Gotchas). This is the idiomatic single-file approach tokyonight and catppuccin use via a `style`/`flavour` option; the two-name alternative (`artificer` / `artificer-light`) is available but less conventional.

## Gotchas

- **[verified]** `nvim_set_hl` **replaces all attributes** — calling `nvim_set_hl(0, 'Comment', {italic=true})` with no `fg` deletes the foreground rather than merging it. A theme must specify the full spec per group; this bites people who "just add italic" and lose the color. Confirmed by the official Neovim API docs (neovim.io/doc/user/api/), which state verbatim that `nvim_set_hl` "replaces the entire definition... unless `update` is specified." Note the docs also document an opt-in `update` boolean (default false) that merges — so the "you cannot incrementally tweak" framing is slightly outdated, but the default replace-everything behavior that causes the bug is exactly as claimed.

- **[verified]** **LSP semantic tokens out-prioritize treesitter by default** — enabling a semantic-token-capable LSP (lua_ls, clangd) repaints identifiers your `@capture` groups already styled, the "christmas tree" effect. Fixes: lower `vim.highlight.priorities.semantic_tokens`, clear the override per group (`['@lsp.type.variable'] = {}`), or bump treesitter query priority. Confirmed by the swarn gist (gist.github.com/swarn/fb37d9eefe1bc616c2a7e476c0bc0316), an independent author, which documents the mechanism and all three fixes. **One correction:** the claim said defaults are "1xxx ts / 2xxx lsp" — the actual defaults are treesitter=100, semantic_tokens=125 (syntax=50). The direction (LSP wins) is right; the specific tier numbers were wrong.

- **[verified]** **`hi clear` in the boilerplate wipes ALL highlights**, including plugin/diagnostic groups defined earlier — they vanish on every colorscheme switch. Custom overrides must be re-applied via a `ColorScheme` autocommand created **before** `:colorscheme` runs, or they only survive the first load. Confirmed by romainl's canonical override gist (gist.github.com/romainl/379904f91fa40533175dfaec4c833f2f), authored independently, which states the override "must be added _before_ any colorscheme is sourced."

- **[verified]** **Changing `background` after loading the colorscheme can leave cterm fallback values stuck.** Setting a cterm/gui attribute on a group blocks the corresponding `ctermfg`/`ctermbg` from updating when `background` flips — `guifg` updates but `ctermfg` doesn't track. Set `background` **before** `:colorscheme` and re-source on change. Confirmed by Mat Booth's blog (matbooth.co.uk/2025/09/16/vim-solarized-follow-system-preference.html), an independent author who documents that without setting `background` first, even re-sourcing won't correct the colors — and that the correct ordering makes `:so ~/.vimrc` re-sync them.

- **[verified]** **Colorschemes that rely on Neovim's default highlight links break if loaded before `syntax on`/filetype detection, or when switching from another scheme** — stale links survive (`vimCommand` still linked to `ErrorMsg`), and groups come up `cleared` instead of linked. The upstream conclusion was to avoid relying on syntax items in colorschemes and define groups explicitly. Confirmed by vim/vim#4405 ("How to mitigate highlighting issues when switching colorschemes?"), a separate repo and author two years prior, which demonstrates the stale-link behavior and concludes the issue "has no solution—except avoiding using syntax items in colorschemes."

- **[verified]** **Most modern Lua themes omit cterm/256-color fallback entirely**, so they look broken without `termguicolors` — subtle grays degrade into random bright colors on old terminals or `$TERM`-lying tmux/SSH setups. Either emit `ctermfg`/`ctermbg` indices (`mini.base16` `use_cterm=true` quantizes for you) or document that truecolor is required. Confirmed by Ham Vocke's "A 16-Color Vim Color Scheme" (hamvocke.com/blog/ansi-vim-color-scheme/), an independent author who states "a lot of modern vim color schemes don't bother being compliant with `notermguicolors`... they often don't include `ctermfg` and `ctermbg` calls." (Caveat: the originally-cited issue URL #8352 is a loose match — it's about colors wrong *with* termguicolors on; the better primary refs are #8583 and the Vocke writeup. And "most" is softened to "a lot" by the sources — the direction holds.)

- **[verified]** **`:Inspect` does not always report the actual applied highlight priority** — bump a treesitter query priority to beat LSP and `:Inspect` can still claim the semantic token wins / show priority 100, even though the higher-priority highlight is what renders. Confirmed by Neovim core PR #31485 (github.com/neovim/neovim/pull/31485) by maintainer clason — a different author and repo than the original nvim-treesitter issue — which states `:Inspect` "does not show priority for treesitter highlights, leading to confusion why sometimes earlier highlights override later highlights." Note: this has since been fixed in core, so recent builds display the applied and default priorities; the gotcha applies to versions predating #31485/#31497.

- **[verified]** **Treesitter `@captures` fall back specific→generic and can be language-specialized** — `@comment.documentation` falls back to `@comment` if undefined; appending a language (`@comment.lua`) lets you override per-language. A theme needs only the generic captures plus a few intentional specifics, but a specific variant must be defined explicitly to take effect. Confirmed by the official Neovim treesitter docs (neovim.io/doc/user/treesitter/), a different domain than the swarn gist, which states verbatim "a fallback system is implemented, so that more specific groups fallback to more generic ones" and documents per-language specialization (`hi @comment.lua guifg=DarkBlue`).

- **[verified]** **In `mini.base16`, calling `setup()` does NOT create a `:colorscheme`** — it just applies highlight groups in the current session. To get a real `:colorscheme artificer` you must place a `colors/artificer.lua` wrapper on `runtimepath` that itself calls `require('mini.base16').setup({palette=...})`. Confirmed by an independent end user (not the maintainer) in nvim-mini/mini.nvim#2, who hit the exact "E185: Cannot find color scheme" error this describes and got the wrapper-file fix.

## Tips & tricks

- **Lean on group links.** Define a dozen base groups (`Comment`, `String`, `Function`, `Keyword`, `Type`, `Constant`, `Operator`) then `link=` the ~150 treesitter captures to them. Catppuccin and tokyonight do exactly this — `@function.call` links to `Function`, `@boolean` to `Boolean` — so changing one palette token cascades everywhere.
- **Neovim already links most `@lsp.type.*` and `@capture` groups to the standard groups by default.** You can ship a tiny theme that only defines `Normal` plus the ~15 standard syntax groups and get coherent treesitter+LSP coloring for free, then add specifics only where you want differentiation.
- **To make treesitter win over LSP without globally lowering priority, clear the specific override:** `nvim_set_hl(0, '@lsp.type.variable', {})` (empty table) — catppuccin's documented trick.
- **Serve both variants from one file.** Set `vim.o.termguicolors = true` and read `vim.o.background` at the top of `colors/artificer.lua`; document that users set `background` **before** `:colorscheme`.
- **For minimal authoring effort,** back the theme with `mini.base16`'s `mini_palette(bg, fg, accent_chroma)` generator or feed `base16-nvim` a `base00..base0F` table built from Artificer tokens — both emit treesitter+LSP groups automatically (at the cost of inheriting their accent-role choices).
- **Map terminal colors too.** Set `vim.g.terminal_color_0..15` from the palette so Neovim's `:terminal` matches the theme — base16 frameworks do this; hand-rolled themes often forget it.

## Fit assessment

**Medium effort, high value — worth adding.** The `build.mjs` work is moderate: emit one `colors/artificer.lua` that reads `background`, defines ~15 base groups from palette tokens, and links the treesitter/`@lsp` captures to them (Neovim's default links do most of the heavy lifting). The semantic-token priority and `hi clear` gotchas are real but well-trodden, and the base16-framework path offers a low-effort fallback.

Neovim is a natural fit for a dev-tool design system — it joins Ghostty/tmux/lazygit — and a single self-contained Lua file symlinks cleanly into the dotfiles flow. **Recommend the standalone hand-rolled file over a base16-framework dependency** so it carries zero install requirements.

## Where to get the authoritative docs

**Official spec / API reference:**

- Neovim treesitter highlight docs (`@capture` groups, fallback, `:Inspect`) — https://neovim.io/doc/user/treesitter.html
- Neovim highlight-groups + `nvim_set_hl` API reference — https://neovim.io/doc/user/api.html#nvim_set_hl() (plus `:help highlight-groups`)
- Neovim LSP semantic-highlight (`@lsp.type/mod/typemod`) — https://neovim.io/doc/user/lsp.html#lsp-semantic-highlight
- Colorscheme authoring guide (`nvim_set_hl` vs `:highlight`, cterm vs gui, Normal-first) — https://vonheikemen.github.io/learn-nvim/feature/colorscheme.html
- mini.base16 docs (palette table, `mini_palette` generator, `use_cterm`) — https://nvim-mini.org/mini.nvim/doc/mini-base16.html

**Community themes to crib from:**

- tokyonight.nvim (group structure + links) — https://github.com/folke/tokyonight.nvim/tree/main/lua/tokyonight/groups
- catppuccin/nvim (treesitter + `semantic_tokens` source, incl. the empty-table clear trick) — https://github.com/catppuccin/nvim/tree/main/lua/catppuccin/groups
- base16-nvim (RRethy) — `setup({base00..base0F})` with treesitter+LSP support — https://github.com/RRethy/base16-nvim

## Sources

- https://neovim.io/doc/user/treesitter.html
- https://neovim.io/doc/user/lsp.html
- https://vonheikemen.github.io/learn-nvim/feature/colorscheme.html
- https://gist.github.com/swarn/fb37d9eefe1bc616c2a7e476c0bc0316
- https://github.com/neovim/neovim/issues/33614
- https://github.com/neovim/neovim/issues/26603
- https://github.com/neovim/neovim/issues/8352
- https://github.com/neovim/neovim/issues/12579
- https://github.com/neovim/neovim/issues/15205
- https://github.com/nvim-treesitter/nvim-treesitter/issues/8087
- https://github.com/neovim/neovim/discussions/25802
- https://github.com/neovim/neovim/pull/31853
- https://github.com/neovim/neovim/pull/31485
- https://nvim-mini.org/mini.nvim/doc/mini-base16.html
- https://github.com/nvim-mini/mini.nvim/issues/2
- https://github.com/RRethy/base16-nvim
- https://github.com/folke/tokyonight.nvim
- https://raw.githubusercontent.com/catppuccin/nvim/main/lua/catppuccin/groups/treesitter.lua
- https://raw.githubusercontent.com/catppuccin/nvim/main/lua/catppuccin/groups/semantic_tokens.lua
- https://gist.github.com/romainl/379904f91fa40533175dfaec4c833f2f
- https://matbooth.co.uk/2025/09/16/vim-solarized-follow-system-preference.html
- https://hamvocke.com/blog/ansi-vim-color-scheme/
- https://github.com/vim/vim/issues/4405
- https://neovim.io/doc/user/api/
