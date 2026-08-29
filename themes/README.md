# Artificer · Editor & Terminal Themes

Same Jazz Age palette, twenty-four surfaces. Each ships dark + ivory-paper
light — except `cmux/`, `gitmux/`, `flux/`, `neovim/` and `firefox/`, which
carry a single file (flux, neovim and firefox hold both modes in one, because
those hosts switch at runtime rather than picking a file).

The tree below is the whole set — one entry per directory `build.mjs` emits, and
`npm run check:install` fails if a generator lands with no disposition in
`scripts/check-install-coverage.mjs`. That gate is the count's source of truth.

```
themes/
├── _palette.json           ← single source of truth
├── build.mjs               ← regenerator (Node ≥18)
├── claude-code/            artificer-{dark,light}.json
├── ghostty/                artificer-{dark,light}              (no extension)
├── cmux/                   cmux.json                           (workspace accents; reuses ghostty/)
├── glamour/                artificer-{dark,light}.json         (glow + anything on glamour)
├── flux/                   artificer-flux.css                  (daisyUI override; BOTH modes, one file)
├── gum/                    artificer-{dark,light}.sh           (sourceable GUM_* exports)
├── fzf/                    artificer-{dark,light}.sh           (sourceable FZF colour exports)
├── eza/                    artificer-{dark,light}.sh           (sourceable EZA_COLORS exports)
├── bat/                    artificer-{dark,light}.tmTheme      (syntect; also read by delta)
├── codex/                  artificer-{dark,light}.tmTheme      (Codex CLI TUI; paints its own pane)
├── helix/                  artificer-{dark,light}.toml         (+ -opaque twins)
├── neovim/colors/          artificer.lua                       (BOTH modes, one file)
├── jetbrains/              META-INF/plugin.xml + artificer-{dark,light}.theme.json + .xml  (IDE plugin source; pack to a jar)
├── starship/               artificer-{dark,light}.toml         ([palettes.artificer] merge layer)
├── yazi/                   artificer-{dark,light}.toml         (third merge layer)
├── tmux/                   artificer-{dark,light}.conf
├── gitmux/                 artificer.yml
├── lazygit/                artificer-{dark,light}.yml          (block fragment)
├── gh-dash/                artificer-{dark,light}.yml          (block fragment)
├── herdr/                  artificer-{dark,light}.toml         (block fragment)
├── vscode/                 package.json + themes/*.json        (installable extension)
├── chromium/               artificer-{dark,light}/manifest.json (Chrome + Edge extension; one package per mode)
├── firefox/                artificer/manifest.json             (BOTH modes, one file, via `dark_theme`)
└── obsidian/Artificer/     manifest.json + theme.css           (drop-in theme folder)
```

**`./install.sh` places fourteen of these** — Claude Code, Ghostty, Helix,
Neovim, glamour, gum, fzf, eza, bat, codex, tmux, gitmux, VS Code, Obsidian —
as **copies** (`--symlink` if you'd rather repo edits propagate live). The other
ten are deliberately manual: `cmux`, `lazygit`, `gh-dash` and `herdr` splice
into a config file you also own, `starship` and `yazi` merge into one you
maintain, `flux` targets another repo's build output, `jetbrains` is an IDE
plugin you install from a jar, and `chromium` and `firefox` load through the
browser's own extension surface.

Because they're copies, a repo change doesn't reach an installed theme until
you re-run `./install.sh` — and `./install.sh --verify` prints the actual diff
for anything that drifted, so a local tweak shows up as a change rather than a
silent divergence. Re-running is a no-op for targets already current; a
`.bak.<timestamp>` appears only where a real tweak was overwritten.

## Distribution — these files are NOT on npm

The npm package (`@cameronsjo/artificer`) and its jsDelivr CDN mirror ship **only
`src/`** — the web design system (CSS + JS + tokens). The theme files in *this*
folder (Ghostty, Claude Code, VS Code, tmux, cmux, Obsidian, and the category-3
fragments below) are **not** in that package. Install them from the repo: copy or
symlink the full files, or splice the fragments. See the repo
[`README.md`](../README.md) "Path D · CDN (pinned)" for the web-system CDN path,
and [`docs/UPGRADE.md`](../docs/UPGRADE.md) for the consumer versioning contract.

## Source of truth — `_palette.json`

All theme files are generated from `_palette.json`. To re-tune any color
across the system:

1. Edit the hex in `_palette.json` (dark or light variant)
2. Run `node themes/build.mjs`
3. Every theme file rewrites with the new value, in lockstep

The generator handles role-mapping per surface (e.g. ANSI 1=urgent for
Ghostty + VS Code terminal, but `error` for Claude Code, `--text-error`
for Obsidian — all from the same `urgent` token). You never hand-edit
the generated files.

`artificer-dark.jsonc` (Claude Code, with annotated alternates) is the
**one exception** — it's a hand-curated reading copy with swap-in
candidates. When you settle a swap there, propagate it to `_palette.json`
and regenerate.

## Claude Code

Requires Claude Code v2.1.118+.

The plugin also contributes both files directly through the plugin theme
channel (`.claude-plugin/plugin.json`'s `themes` array — #330), so a plugin
install picks up `custom:artificer-design-system:artificer-dark`/`-light`
with no manual copy. The `install.sh` user-channel copy below stays, since
public npm/vendored consumers depend on it — plugin users will see both that
entry and the plain `custom:artificer-dark`/`-light` from the copy below in
`/theme` until they remove one.

```bash
mkdir -p ~/.claude/themes
cp claude-code/artificer-dark.json ~/.claude/themes/
cp claude-code/artificer-light.json ~/.claude/themes/
```

Pick from `/theme` inside Claude Code, or set in `~/.claude/settings.json`:

```json
{ "theme": "Artificer Dark" }
```

The `overrides` block carries the full documented token surface — text/inverseText,
permission/suggestion/remember (steel + lifted purple), all mode borders
(planMode, autoAccept, bashBorder, ide, fastMode), full diff palette,
fullscreen-mode backgrounds, rate-limit meter, brief-label speakers, the
clawd mascot, all 8 subagent colors, and the 7-color rainbow + shimmer pairs
that color the `ultrathink` keyword in the prompt input. Unknown tokens are
silently ignored, so the file is forward-compatible.

`base: dark-ansi` / `light-ansi` falls back to the Ghostty palette for any
unmapped token — so the two stay coherent automatically.

## Ghostty

```bash
mkdir -p ~/.config/ghostty/themes
cp ghostty/artificer-dark ~/.config/ghostty/themes/
cp ghostty/artificer-light ~/.config/ghostty/themes/
```

In `~/.config/ghostty/config`:

```
theme = artificer-dark
# or, for OS-aware switching:
# theme = light:artificer-light,dark:artificer-dark
```

Reload with `cmd+shift+,` (or restart Ghostty).

> **Claude Code interaction:** Under `dark-ansi` / `light-ansi` base,
> Claude Code emits response body text as ANSI default foreground. Ghostty's
> `foreground` setting — not the Claude Code `text` token — controls the
> response body color. Changing `foreground` here repaints Claude's output
> and every other terminal program's default text.

## cmux

[cmux](https://github.com/manaflow-ai/cmux) — Manaflow's native macOS
AI-coding-agent terminal — reaches Artificer in **two steps**, because its
terminal is **libghostty**: it resolves Ghostty themes *by name*, so one Ghostty
theme drives the terminal, the sidebar chrome, and the diff-viewer backgrounds. A
small `cmux.json` partial then colors the workspace tabs.

**1 · Terminal + sidebar + diff backgrounds — the Ghostty theme.** cmux resolves
`~/.config/ghostty/themes/<name>` by name, so the two theme files also have to
exist under their display names. **`./install.sh` places both naming schemes** —
`artificer-dark` for Ghostty itself and `Artificer Dark` for cmux — so this step
is already done if you ran it. The manual equivalent:

```bash
mkdir -p ~/.config/ghostty/themes
cp ghostty/artificer-dark  "$HOME/.config/ghostty/themes/Artificer Dark"
cp ghostty/artificer-light "$HOME/.config/ghostty/themes/Artificer Light"
```

In `~/.config/ghostty/config` (cmux honors the same `light:/dark:` conditional
Ghostty does):

```
theme = dark:Artificer Dark,light:Artificer Light
```

That one theme propagates past the terminal: cmux derives the **sidebar**
background + accent from the resolved terminal colors, and pushes the same
background / foreground / selection into the **diff-viewer**.

> **Caveat — cmux [#3523](https://github.com/manaflow-ai/cmux/issues/3523):**
> cmux's *Settings ▸ Appearance* can write a managed theme override that shadows
> the config file. If the theme doesn't take, clear the in-app appearance
> override and let the `~/.config/ghostty/config` `theme =` line win.

**2 · Workspace-tab accents — the `cmux.json` partial.** Merge the
`workspaceColors` block from `themes/cmux/cmux.json` into
`~/.config/cmux/cmux.json`. cmux watches the file and applies it on save — no
restart:

```bash
cat themes/cmux/cmux.json   # copy its workspaceColors block into ~/.config/cmux/cmux.json
```

It sets the active-workspace indicator to a left rail, the selection highlight to
**steel** (the calmest swatch — a cool neutral that recedes rather than grabs; cmux
derives the selected row's text from the fill, so the title flips to ink
automatically at 9.30:1), the unread badge to the brighter brick (`urgentBright`, so
the badge stays visible on the default dark sidebar), and replaces the
workspace-color picker with the five Artificer categorical swatches (gold, steel,
purple, sage, rose).

cmux's `workspaceColors` are **flat single values** — no per-mode variant (unlike
`sidebarAppearance`'s tint) — so the set is **tuned for cmux's default dark
sidebar**, Artificer being dark-first. The swatches and the steel selection clear
the non-text floor there; on a *cream* sidebar the lighter ones recede toward the
background — a soft degradation, since each workspace also carries a left rail and a
text label.

**What it reaches — and what it doesn't.** Steps 1–2 cover the terminal, sidebar,
diff-viewer *backgrounds*, and workspace tabs. Two surfaces stay stock: the
diff-viewer's **accent** + **file-status** colors (add / del / renamed), and cmux's
**sidebar/app accent** (the blue "needs input" links) — both hardcoded in cmux and
unreachable by config or the Ghostty theme. They wait on the tier-3 fork patch
(tracked in [#239](https://github.com/cameronsjo/artificer-design-system/issues/239)).

## glow (and anything else on glamour)

`./install.sh` places both files in `~/.config/glamour/` for you; the manual
equivalent is:

```bash
mkdir -p ~/.config/glamour
cp glamour/artificer-dark.json ~/.config/glamour/
```

Point glow at it, either per-invocation or permanently:

```bash
glow -s ~/.config/glamour/artificer-dark.json README.md   # one-off
export GLAMOUR_STYLE="$HOME/.config/glamour/artificer-dark.json"
```

`GLAMOUR_STYLE` is honoured by every glamour consumer, not just glow — `gh`'s
markdown rendering included. Alternatively set `style:` in
`~/.config/glow/glow.yml` to the same absolute path.

### How to debug a colour here

**glow emits no colour at all when stdout is not a TTY** (it switches to
glamour's `notty` style), and `CLICOLOR_FORCE` does not override it. A piped
render is byte-identical to an unthemed one, so a stylesheet that isn't loading
and one that is are indistinguishable through a pipe — which reads as a dead
theme. Render under a pty and read the escape sequences:

```bash
script -q /dev/null glow -w 78 fixture.md > out.txt
```

Truecolor arrives as `38;2;R;G;B`, 256-quantised as `38;5;N`, backgrounds as
`48;…`. That distinction is what separates the three ceilings below from a
theme bug.

### Three ceilings — measured, not fixable from the stylesheet

None of these is reachable from a style file, so a palette pass should not
re-chase them. Two are properties of glamour v1 (glow 2.1.2 links it); the
first is **glow's**, not glamour's — the distinction matters, because it is
the one with a live upstream fix path.

1. **Code-block syntax quantises to 256 colours — and this is glow's gap.**
   Every other element in the document renders `38;2;…`; inside a fenced block,
   each syntax colour comes out as its nearest `38;5;N`. Chroma does the
   conversion, driven by `chromaFormatter = "terminal256"` in
   `ansi/codeblock.go`. That constant is only the **default**: glamour exposes
   `WithChromaFormatter` (`glamour.go`, added upstream in
   `charmbracelet/glamour#395`) and `codeblock.go` prefers it whenever it is
   set. glow never calls it, so the option is real but unreachable — from a
   style file *or* from `glow.yml`. The ask therefore belongs on glow, not
   glamour, where it would be a request for something already shipped: filed as
   `charmbracelet/glow#1018`. Inline `code` is unaffected — not a Chroma path.
2. **The code-block canvas cannot be painted cleanly.** Not because the key is
   unwired — `codeblock.go` does pass `Chroma.Background` through `chromaStyle`
   as a `bg:<hex>`. It dead-ends one layer down: Chroma's `terminal256`
   formatter paints per token, and nothing carries that token's background onto
   the block's whitespace, so a `chroma.background` entry produces zero `48;`
   sequences. Setting `background_color` on *every* Chroma token does fill, but
   only behind the code characters — the 2-space indent and each line's
   trailing remainder stay bare, giving a ragged plate rather than a rectangle,
   256-quantised to match. Worse than none, so the block ships unpainted while
   inline `code` keeps its plate. That contrast is deliberate, not an oversight.

   Note the dependency: this was measured **under `terminal256`**, the same
   formatter ceiling 1 says glow could be made to change. If glow ever exposes
   `WithChromaFormatter` and someone selects `terminal16m`, both the ragged-plate
   behaviour and its quantisation have to be re-measured before this entry can be
   trusted. It is not stated as conditional anywhere else — it is here.
3. **Table colour is unreachable.** `ansi/table.go`'s `setBorders` never calls
   `BorderForeground` and `setStyles` never sets a foreground;
   `StyleTable.StylePrimitive` is consumed only for `Prefix`/`Suffix`. Gold
   headers and a border-coloured separator are impossible. The three separator
   *glyphs* are the only lever, and all three must be set together —
   `setBorders` dereferences `CenterSeparator` unguarded once `RowSeparator`
   and `ColumnSeparator` are both present.

### Structure is ours, shape is upstream's

The JSON key set mirrors glamour v1's `styles/dark.json`, but the structural
defaults are Artificer decisions, not inherited ones: h2–h6 carry a graded
glyph run (`▌ ▎ ▏ · ·`) rather than literal `## `/`### ` prefixes, `hr` is a
72-wide `─` run, and `definition_description` uses `→`. The rule is a fixed
literal because glamour's `format` is a `text/template` over `{{.text}}` with
no width variable — it wraps below ~76 columns, which is why
`~/.config/glow/glow.yml` pins `width: 100`.

## gum

gum has no config file ([#991](https://github.com/charmbracelet/gum/issues/991)),
so styling travels as environment variables. Source the fragment:

```bash
mkdir -p ~/.config/gum
cp gum/artificer-dark.sh ~/.config/gum/
echo '. ~/.config/gum/artificer-dark.sh' >> ~/.zshenv
```

`./install.sh` places the files but **stops short of the `.zshenv` line** — it
has never edited a shell rc and won't start. Add that line yourself; the
installer prints it at the end as a reminder.

`.zshenv` rather than `.zshrc` — it's read by every zsh invocation, so scripts
that call gum non-interactively are themed too. Scripts that aren't zsh at all
need their own `source` line; nothing in the environment reaches them.

All 110 colour variables ship, covering gum's ten style-bearing commands
(choose, confirm, file, filter, input, log, pager, spin, table, write). Values
are hex, so a truecolor-capable terminal renders them exactly and others
degrade to the nearest 256 colour.

## fzf

`themes/fzf/artificer-{dark,light}.sh` exports **`ARTIFICER_FZF_COLORS`** — the
`--color=` string alone. Source it from `~/.zshrc` (interactive shells only,
unlike gum's `~/.zshenv`) and compose the options yourself:

```bash
. ~/.config/fzf/artificer-dark.sh
FZF_DEFAULT_OPTS="$ARTIFICER_FZF_COLORS${TMUX:+ --tmux 80%}"
```

**Don't export `FZF_DEFAULT_OPTS` from the fragment.** It would race your own
assignment and silently drop either the colours or your options, depending on
source order. The fragment owns the colours; your rc owns the options.

There is **no `bg:` slot** — the terminal canvas shows through, the same call
bat's theme and yazi's rule 2 make (ADR 0036). `bg+` *is* set, because the
selected-row bar is a real signal rather than a canvas repaint.

**fzf is a second interpreter behind the shell**, which is the part worth
knowing before hand-editing a fragment: it re-parses `FZF_DEFAULT_OPTS` and
honours `--preview`, `--bind …execute(…)`, `--listen` and `--history` out of
it. A line the shell grammar blesses can still execute at fzf runtime, so the
generator asserts the value is a bare `--color=` list with **no space** (a
space is what would admit a second flag) and assigns rather than composes.

## eza

`themes/eza/artificer-{dark,light}.sh` exports **`EZA_COLORS`**. Source it from
`~/.zshrc`; eza reads the variable on every invocation, so a new shell is the
whole reload story.

```bash
. ~/.config/eza/artificer-dark.sh
```

This is **`LS_COLORS` grammar, not hex** — `di=38;2;219;187;111:ex=…`, where
`38;2;R;G;B` is an SGR truecolor escape. That matters for the guard: the hex
assertion runs at the *palette read*, and the value is then converted to
integers with `parseInt`, so palette **text** is never interpolated into the
SGR string. The assembled result gets its own closed grammar before emission,
because what ships is no longer what was validated. Keys (`di`, `ex`, `ur`, …)
come from a hard-coded table — palette *values* pass a guard, palette *keys*
are unvalidated.

The permission slots (`ur` / `uw` / `ux`) share their tokens with yazi's
`[status] perm_read` / `perm_write` / `perm_exec`, so the two file listers
agree on what r/w/x look like. A test asserts it.

## starship

`themes/starship/artificer-{dark,light}.toml` ship a `[palettes.artificer]`
table plus the `palette = "artificer"` line that activates it. **Not installed**
by `install.sh` — it merges into your own `starship.toml` alongside your module
config, so a symlink would clobber it.

Three steps, and only the third changes anything:

1. paste the `[palettes.artificer]` table
2. keep `palette = "artificer"` at top level
3. rewrite module styles from ANSI names to role names —
   `style = "bold cyan"` → `style = "bold steel"`

Steps 1 and 2 are inert without 3. Names read as **roles** (`accent`, `muted`,
`steel`, `brand`) rather than hues, so a style string says what it means.

**A tradeoff, recorded rather than buried:** ANSI names already resolve through
Ghostty's Artificer palette *and* adapt to any other terminal the prompt
appears in — an ssh session, a CI log, someone else's machine. Hex pins the
prompt to Artificer specifically. Chosen anyway (2026-08-08).

## yazi

`themes/yazi/artificer-{dark,light}.toml` are yazi's **third merge layer**
(preset → flavor → `theme.toml`, later winning), so they state only what
differs. **Not installed** by `install.sh` — the file is yours and carries your
own annotations.

Ported from a hand-authored `theme.toml` whose colours were already correct —
every one of its fifteen literals resolved to a palette token — but whose
*source* was wrong: hexes inlined by hand under a header admitting *"re-derive
by hand if the palette moves"*. This changes the source, not the colour.

The prose is carried through **deliberately, not summarised**, because the
traps are the expensive part:

- yazi validates theme **values** but not **key names** — a misspelled key
  loads cleanly and silently never applies
- `text` is **required** in an `[icon]` cond, and satisfying that error with
  `text = ""` parses cleanly while misaligning every icon column
- `prepend_rules` / `prepend_conds` are first-match-wins and sit *ahead* of the
  preset, so a lone catch-all silently shadows preset rules above it

A mechanical port that dropped those comments would look identical and be worth
much less.

## bat / delta

Both link [syntect](https://github.com/trishume/syntect), which only reads the
legacy `.tmTheme` (XML plist) format — not the modern `.sublime-color-scheme`
JSON `docs/research/theming/sublime.md` documents for Sublime Text itself.
`themes/bat/artificer-{dark,light}.tmTheme` are hand-emitted plists from the
same `syntaxToken()` role layer every other editor target uses, following the
scope-mapping table `sublime.md` worked out (comment→comment, string→string,
keyword→keyword, type→storage.type + entity.name.type, function→entity.name.function
+ support.function, plus constant.numeric, variable, entity.name.tag), widened
with a handful of scopes syntect's bundled grammars actually emit.

```bash
mkdir -p ~/.config/bat/themes
cp bat/artificer-dark.tmTheme ~/.config/bat/themes/
cp bat/artificer-light.tmTheme ~/.config/bat/themes/
bat cache --build
bat --list-themes | grep -i artificer
```

`./install.sh` does all four of the above (copy both files, then `bat cache
--build` if `bat` is on PATH) — bat/delta compile every `.tmTheme` in
`~/.config/bat/themes/` into a binary cache at build time, **not** at load
time, so a freshly-dropped file is invisible to `--list-themes` and to delta
until the cache rebuilds. There is no auto-rebuild hook; re-run `bat cache
--build` (or `./install.sh`) after every update, same as after any `bat`
upgrade.

Activate in bat:

```bash
bat --theme=artificer-dark file.rs           # one-off
```

or set it permanently in `~/.config/bat/config`:

```
--theme="artificer-dark"
```

**delta reads the same theme registry** — it links bat's own theme-loading
code, so any `.tmTheme` visible to `bat --list-themes` is a valid
`syntax-theme` value for delta too. Point Cameron's dotfiles `[delta]` section
at it (`~/.dotfiles/dot_gitconfig.tmpl`, currently `syntax-theme = base16`):

```
[delta]
	syntax-theme = artificer-dark
```

Two decisions worth knowing before retuning a colour:

- **No top-level `background` key.** Omitting it is the same choice Helix's
  non-opaque variant makes for `ui.background` (ADR 0038): bat/delta then
  inherit whatever canvas the terminal already painted — Ghostty running
  Artificer, on Cameron's machine — instead of a second, possibly-mismatched
  fill underneath the syntax colours. bat's stock `base16`/`base16-256` themes
  reach the same terminal-following goal a different way (an `#RRGGBBAA`
  ANSI-index encoding syntect special-cases), but that trades away per-role
  hues — everything renders in the terminal's flat 16-color palette. This
  theme keeps the real Artificer role colours (truecolor hex, like every other
  editor port) and only leaves the background unset.
- **`foreground` IS set** (to `fg`), unlike `background` — syntect falls back
  to pure black for any scope with no explicit rule match (plain text, most
  punctuation) when a theme carries no top-level `foreground`, which reads as
  broken on a dark canvas. This was caught by rendering a real file through
  `bat --color=always` before shipping — do the same after any edit to the
  global `settings` block in `build.mjs`'s `batTheme()`.

## Codex CLI

The Codex CLI's TUI reads `~/.codex/themes/*.tmTheme` and picks one by name
from `[tui] theme` in `~/.codex/config.toml`, so it consumes the same syntect
plist bat and delta do. `themes/codex/artificer-{dark,light}.tmTheme` come off
the same `batTheme()` emitter with `paintBackground: true` — Codex composites
its own pane rather than sharing the terminal canvas, so the fill is explicit
there and omitted for bat.

```bash
mkdir -p ~/.codex/themes
cp codex/artificer-dark.tmTheme ~/.codex/themes/
cp codex/artificer-light.tmTheme ~/.codex/themes/
```

`./install.sh` does both. Activate under `[tui]` in `~/.codex/config.toml`:

```toml
[tui]
theme = "artificer-dark"
```

No cache rebuild — unlike bat, Codex loads the plist at start-up, so a
restart is enough.

**This directory is `install.sh`'s to own.** A hand-authored copy previously
lived in `~/.dotfiles/private_dot_codex/themes/` carrying a header that claimed
generated provenance while no generator existed. Keeping both would recreate
the dual-ownership bug ADR 0034 already settled once for the Obsidian vault;
the chezmoi-side copy is retired in favour of this one.

## Helix

`./install.sh` places all four files (both modes, plus the `-opaque` twins) in
`~/.config/helix/themes/` for you; the manual equivalent is:

```bash
mkdir -p ~/.config/helix/themes
cp helix/artificer-*.toml ~/.config/helix/themes/
```

In `~/.config/helix/config.toml`:

```toml
theme = "artificer-dark"
```

Reload in a running editor with `:theme artificer-dark`.

Four files ship — two modes × two surfaces:

| Theme | `ui.background` | Syntax contrast |
|---|---|---|
| `artificer-dark` / `artificer-light` | unset — inherits the terminal canvas | 3 roles below floor (dark only) |
| `artificer-dark-opaque` / `artificer-light-opaque` | painted `bg` | every role clears its floor |

Syntax colors resolve through `$roles.syntax` — the same editor-agnostic role
layer VS Code consumes — so a keyword is the same hue in both editors by
construction. Scope coverage follows Helix's own documented scope list; a scope
with no sensible binding among the twelve roles is left unset so it inherits,
and `build.mjs` records which ones and why.

> **The default inherits the terminal canvas — a deliberate exception, ADR 0038.**
> Helix was the first terminal target to paint *syntax* (tmux, gitmux, lazygit,
> and gh-dash are chrome-only), so it is the first place the choice of canvas
> changes a contrast outcome. On Ghostty's `terminalBg` (`#313540`) `string`
> drops 4.50 → 3.95 and `comment`/`operator`/`tag`/`invalid` fall to ~2.7 —
> under the 3.0 hard floor, which is **not** allowlistable
> (`check-syntax-contrast.mjs` holds `KNOWN_SUB_AA` entries to it too). Shipped
> anyway, knowingly: those same two hexes already render at those same ratios as
> Ghostty's ANSI 9/10 on that same canvas, so this surfaces a pre-existing
> terminal-wide condition rather than introducing one. Use the `-opaque` variant
> to get every floor back. The durable fix is a Lane 1 lift of `fgMuted` and
> `urgentBright`, which would repair Helix and Ghostty's ANSI 9 together.

## Neovim

`./install.sh` places `~/.config/nvim/colors/artificer.lua`; the manual
equivalent is:

```bash
mkdir -p ~/.config/nvim/colors
cp neovim/colors/artificer.lua ~/.config/nvim/colors/
```

Then, in `init.lua` — the ordering matters, see below:

```lua
vim.o.termguicolors = true
vim.o.background = 'dark'          -- or 'light'
vim.cmd.colorscheme('artificer')
```

**One file carries both modes.** It reads `vim.o.background` at load and picks
the matching palette table, which is why Neovim needs one file where Helix
needs four. Two consequences worth knowing before you file a bug:

- **`background` must be set BEFORE `:colorscheme`.** Set after, and the
  colorscheme has already resolved against the old value.
- **`:set background=light` alone does not re-source the file.** Neovim fires
  `OptionSet` and nothing else, so the light block loads only when you re-run
  `:colorscheme artificer`. Both commands, in that order.

**Truecolor is required.** No `ctermfg`/`ctermbg` is emitted, so without
`termguicolors` this degrades to whatever sixteen colors the terminal guesses —
a recorded disposition, not an oversight. The colorscheme deliberately does
*not* set `termguicolors` itself: doing that from inside `colors/` mutates a
global the user never gets back on switch-away, and it is redundant on Neovim
≥ 0.10. Your `init.lua` owns it.

Syntax resolves through `$roles.syntax` — the same editor-agnostic role layer
VS Code and Helix consume — so a keyword is the same hue in all three by
construction. Treesitter `@captures` mostly `link=` to the legacy groups, and
the `@lsp.*` semantic-token groups are **cleared** so treesitter (where the
role layer lives) wins the 125-vs-100 priority fight. A group with no sensible
binding among the twelve roles is left unset so it inherits, and `build.mjs`
records which ones and why.

> **The default inherits the terminal canvas — same exception as Helix, ADR
> 0038.** Neovim is the second terminal editor on that canvas, so the ruling
> carries rather than a new one being minted: `Normal` ships with no `bg` key,
> and on Ghostty's `terminalBg` `comment` and `operator` measure 2.68 against
> the 3.0 hard floor. Shipped knowingly — the same hexes already render at
> those ratios as Ghostty's ANSI 9/10 on that same canvas.
>
> Helix expressed the escape as `-opaque` twin files because its themes are
> static TOML. A Neovim colorscheme is executable, so the escape is a flag:
>
> ```lua
> vim.g.artificer_opaque = true
> vim.cmd.colorscheme('artificer')
> ```
>
> `vim.g` survives `:colorscheme`, and `:colorscheme` re-sources
> unconditionally, so re-entry re-reads it. That paints `bg`, where every role
> clears its floor, and it also flips the `:terminal` black slots (0 and 8) to
> the substrate mapping VS Code's integrated terminal uses.

**Two things this does not do.** `highlight clear` in the boilerplate wipes
*every* highlight, including groups a plugin defined earlier — so personal
overrides belong in a `ColorScheme` autocommand created **before**
`:colorscheme` runs, or they survive only the first load. And there is no mode
indicator: Helix's three statusline mode chips have no core Neovim group, so
chrome parity stops at `StatusLine`. A statusline plugin owns that, and none is
assumed here.

## JetBrains IDEs (IntelliJ IDEA, PyCharm, WebStorm, GoLand, RustRover, …)

An IntelliJ Platform **theme plugin** — not a config file. `jetbrains/` is the
plugin's source tree (`META-INF/plugin.xml`, two UI themes, two editor color
schemes); pack it and install the jar from disk:

```bash
npm run pack:jetbrains          # → dist/artificer-jetbrains.jar
# IDE: Settings → Plugins → ⚙ → Install Plugin from Disk… → pick the jar
# then Settings → Appearance & Behavior → Appearance → Theme: Artificer Dark / Light
```

Requires **2025.2 or newer** (`since-build 252`): both themes inherit from the
Islands UI (`parentTheme: "Islands Dark"` / `"Islands Light"`), so everything
not set here — and that is most of the chrome — comes from Islands. What *is*
set: the surface model (islands and the editor on `bg`, the main-window backdrop
on `bgInactive`, no visible island border), selection, focus, buttons, tabs,
notifications, and the VCS colours. The editor canvas is `bg`, not `bgRaised`,
because the three 3:1-floor syntax roles measure 2.68:1 on `bgRaised` in dark
and 3.05:1 on `bg` — the WCAG floor outranks the Islands 1.20:1 layout
recommendation the backdrop comes in 0.02 under.

Each UI theme is bound to its editor scheme via `editorScheme`, and the IDE asks
once whether to switch the scheme with the theme. If you answered "don't ask
again" with *no* in some earlier life, the scheme will look ignored even though
it is correctly declared — pick it by hand under Editor → Color Scheme, or
remove `change.laf.on.editor.theme.change` from `options/options.xml` while the
IDE is closed.

Syntax resolves through `$roles.syntax` — the same editor-agnostic role layer
VS Code, Helix and Neovim consume — onto the `DEFAULT_*` fallback keys, so
every language paints at once and a keyword is the same hue in all four editors
by construction. All five files — `plugin.xml`, both `.theme.json`, both editor-scheme `.xml` — are regenerated from `_palette.json` by
`build.mjs`; `plugin.xml`'s `<version>` rides the same version sweep as every
other stamp. No Marketplace listing (yet) — install from disk is the path.

## VS Code / Cursor

Two paths:

**1. Sideload (fastest):** from this `themes/` directory, copy the whole
`vscode/` folder to a directory whose suffix matches its manifest version:

```bash
version="$(node -p "require('./vscode/package.json').version")"
cp -R vscode "$HOME/.vscode/extensions/cameron.artificer-theme-$version"
```

Fully quit and relaunch VS Code so it rescans sideloaded extensions, then pick
"Artificer Dark" or "Artificer Light" from `Cmd+K Cmd+T`. A window reload is
not sufficient when the extension was previously absent from the scan.

**2. Package + install:**

```bash
cd vscode
npx @vscode/vsce package
version="$(node -p "require('./package.json').version")"
code --install-extension "artificer-theme-$version.vsix"
```

Tested against VS Code 1.70+. Cursor and other forks read the same schema.

## Chromium (Chrome, Edge, Brave, Arc, …)

A browser **extension**, not a config file — and **one package per mode**,
because Chromium's manifest accepts only RGB arrays and carries no dark/light
switch. Sideload either one:

```bash
# chrome://extensions → toggle Developer mode → Load unpacked
#   → themes/chromium/artificer-dark/     (or artificer-light/)
```

Loading a theme applies it immediately; there is no picker step. Swapping modes
means removing one and loading the other — Chrome allows exactly one theme at a
time. After a `node themes/build.mjs` rebuild, hit **Reload** on the card in
`chrome://extensions` (or remove and re-load it) — Chrome caches the theme pack
and will otherwise keep painting the old colours.

**Edge takes this package unchanged.** `edge://extensions` sideloads it the same
way, and Microsoft Partner Center accepts the same artifact — two listings, one
build.

For store upload rather than sideload:

```bash
npm run pack:browser   # → dist/artificer-chromium-{dark,light}.zip
```

Bound to Chromium's `kOverwritableColorTable`
(`chrome/browser/themes/browser_theme_pack.cc`). Chrome does not publish that
list, and an unrecognized key parses fine and is then **silently ignored** — so
if a colour looks unbound, check the key against that table before assuming the
palette is wrong. Chromium spells three of them differently from Firefox:
`omnibox_background` / `omnibox_text` for the URL bar, and `toolbar_button_icon`
for toolbar icons. It has no popup, sidebar, separator or focus keys at all.

> **The 128×128 `icon-128.png` is committed in each package directory**, and the
> generated manifest names it under `icons` — an undeclared PNG is inert, so the
> file and the key ship together. It is owner-supplied rather than generated:
> this repo is zero-dependency and has no SVG rasterizer, and
> `src/assets/favicon.svg` carries hard-coded hexes, so it does not track the
> palette. Re-render it with
> `rsvg-convert -w 128 -h 128 src/assets/favicon.svg -o <package-dir>/icon-128.png`;
> `pack:browser` **fails** if it is missing, because a manifest pointing at an
> absent icon is rejected on load.

## Firefox

**One package, both modes.** Firefox takes hex strings and supports the sibling
`dark_theme` manifest key, so the theme follows the OS by itself — dark chrome
under a dark OS, ivory paper under a light one, no second install.

```bash
# about:debugging#/runtime/this-firefox → Load Temporary Add-on…
#   → themes/firefox/artificer/manifest.json
```

A temporary add-on is dropped at browser exit — that is the sideload path, not
the install path. For a persistent install, upload the packed zip to
addons.mozilla.org:

```bash
npm run pack:browser   # → dist/artificer-firefox.zip
```

`strict_min_version` is **68.0**, the release `dark_theme` landed in. Below it
the key is ignored and the theme renders light-only *silently*, which is why the
floor is declared rather than left to a comment. The manifest is **MV2**:
Mozilla's own static-theme documentation still ships MV2 as the canonical
example and has stated no plan to deprecate it, and a theme carries no
background-script surface for the MV3 split to reach.

The `browser_specific_settings.gecko.id` is **identity and permanent**, the same
rule the JetBrains theme UUIDs follow. Leave it unset and AMO mints one at first
submission, making the listing's identity a store artifact rather than a repo
fact; change it later and you mint a *different* add-on that existing users never
receive. It is pinned in `build.mjs` and asserted in
`scripts/browser-theme.test.mjs`.

It takes the **brace-UUID** form rather than the email-shaped one Gecko also
accepts, and that is a deliberate choice: an email-shaped id publishes a domain,
permanently, in a file this repo ships publicly. A UUID depends on no domain and
discloses nothing, at no cost — Gecko treats the id as an opaque string and never
resolves or fetches it.

The same `icon-128.png` note under **Chromium** applies here.

## Obsidian

The prose-first home for the system. **Hand-authored, not generated** —
Obsidian is the gold-led sister theme: same palette tokens as the rest of
the system, but its own aesthetic decisions (gold-as-primary instead of
steel, Ghostty-grey background instead of indigo-ink, dramatic 0.55/0.6
inactive-pane recession). Both modes ship in one CSS file (Obsidian
toggles `.theme-dark` / `.theme-light` on `<body>`).

Because it's hand-authored, palette changes in `_palette.json` do NOT
propagate automatically — keep the `--art-*` tokens at the top of
`obsidian/Artificer/theme.css` in sync manually when the system palette
moves. v0.6.0 is aligned; if you change `_palette.json` later, re-check.

```bash
# Find your vault's themes folder:
mkdir -p <vault>/.obsidian/themes
cp -r obsidian/Artificer <vault>/.obsidian/themes/
```

Then **Settings → Appearance → Themes → Artificer**.

Covers: editor + preview type, headings (mono), bold/italic tinting,
list markers, inline + block code with full syntax, wikilinks (gold
dashed → solid on hover), unresolved links (rose/brick italic), tags
(purple pill, mono), tables, blockquotes, file-explorer nav, ribbon,
settings toggles, graph view, collapse arrows, title bar, status bar.

**Callouts:** the full Obsidian callout surface is mapped to Artificer
semantics. The values must be **`r, g, b` tuples** (Obsidian wraps them
in `rgba(var(--callout-foo), 0.1)` for the tint and `rgba(..., 0.25)`
for the border). Already emitted correctly; if you hand-edit the CSS
later, don't refactor them into hex.

See `obsidian/README.md` for the full coverage list, variable contracts,
and known limitations.

## Downstream targets

For terminal-adjacent tools — tmux, gitmux, lazygit, gh-dash — Artificer
ships fragments that bridge two distribution shapes:

- **Symlink-friendly** (tmux, gitmux): apps support `source-file` or
  whole-file install. Symlink the fragment; your config references it.
- **Block-only** (lazygit, gh-dash): apps have no import mechanism — colors
  embed inside your main config. Either splice via chezmoi or paste.

### tmux

```bash
ln -s "$(pwd)/themes/tmux/artificer-dark.conf" ~/.config/tmux/
```

In `~/.tmux.conf`:

```tmux
source-file ~/.config/tmux/artificer-dark.conf
```

Accents route through ANSI `colour13` (Ghostty's palette → `brandPurpleBright`).
Palette mutations propagate without rebuilds.

### gitmux

One mode-independent file — state colors route through ANSI names so the
same file works under both Artificer themes:

```bash
ln -s "$(pwd)/themes/gitmux/artificer.yml" ~/.config/tmux/gitmux.yml
```

### lazygit + gh-dash (block fragments)

These apps embed colors inside the user's main config — no `@import`.
Two install paths.

**Recommended — chezmoi `includeTemplate`** (zero-drift for chezmoi users):

```toml
# In ~/.dotfiles/.chezmoiexternal.toml
[".local/share/artificer-fragments"]
type = "archive"
url = "https://github.com/cameronsjo/artificer-design-system/archive/main.tar.gz"
exact = true
stripComponents = 1
refreshPeriod = "168h"
include = ["themes/lazygit/**", "themes/gh-dash/**", "themes/gitmux/**", "themes/herdr/**"]
```

```yaml
# In ~/.dotfiles/private_dot_config/lazygit/config.yml.tmpl
gui:
{{- includeTemplate ".local/share/artificer-fragments/themes/lazygit/artificer-dark.yml" | indent 2 }}
```

`chezmoi apply` re-renders from the fetched fragment every run.

**Fallback — paste the block:**

1. Open the fragment file (e.g. `themes/lazygit/artificer-dark.yml`)
2. Copy from the first non-comment line onward (`theme:` for lazygit,
   `colors:` for gh-dash)
3. Paste under the appropriate parent key in your config (`gui:` for
   lazygit, `theme:` for gh-dash)
4. Re-paste after palette changes

See [`../docs/research/category-3-distribution.md`](../docs/research/category-3-distribution.md)
for the prior-art survey and why chezmoi templating is the primary recommendation.

### herdr

[herdr](https://herdr.dev) is a terminal workspace manager for coding agents.
Same category as the two above — but worth its own note, because the reason is
stronger and the reload step is different.

herdr has **no external theme-file mechanism at all**: `[theme] name` accepts
only names compiled into the binary, and there is no `~/.config/herdr/themes/`
lookup. Custom color has exactly one door, `[theme.custom]`, and it sits in the
same `~/.config/herdr/config.toml` that holds your keybindings and UI layout.
So there is nothing to symlink *at*, not merely something unsafe to symlink
over.

Paste both tables from `themes/herdr/artificer-dark.toml` into your config, then:

```bash
herdr config check          # "config: ok"
herdr server reload-config  # live, no restart
```

`config check` is a real validator — it names any key it does not recognize —
so it's worth running after a paste. The same chezmoi `includeTemplate` path
above works; the fragment is a complete `[theme]` + `[theme.custom]` pair, so
it splices at the top level rather than under a parent key.

Three notes on the mapping, all deliberate:

- **`accent` and `yellow` are the same hex.** Artificer's accent *is* gold, so
  herdr's navigation accent and its yellow state marker legitimately coincide.
- **`active_row_bg` and `surface1` are the same hex** (`bgOverlay`). herdr's
  focused row and its generic selected row sit at the same elevation, and only
  one is ever visible at a time — `surface1` marks a selected row in a list,
  `active_row_bg` the focused pane's sidebar row.
- **`overlay0` / `overlay1` are dim *text*, not borders** — that's Catppuccin's
  role naming, which herdr inherits. They map to the foreground dim ladder
  (`fgDisabled`, `fgMuted`), not `border`; mapping them to `border` would put
  1.71:1 text on the panel. Every one of the seven named hues clears text-AA
  (4.5:1) against `panel_bg` in both modes; the two dim roles sit below it on
  purpose, same as everywhere else in the system.

### Version & drift

Each generated fragment's first comment line is stamped with the distribution
version — `# Artificer v0.9.0 · Dark — lazygit theme block`. That stamp is the
only provenance a *pasted* block keeps once it's living inside your config. The
version is sourced from `package.json` (the distribution version), regenerated by
`node themes/build.mjs`.

To pin: paste a fragment, note its stamped version, and re-paste from the
matching version when you bump. If a pasted block and your installed
`@cameronsjo/artificer` disagree, the fragment is stale. chezmoi `includeTemplate`
users get this for free — the fetched archive carries the stamp and re-renders on
every `chezmoi apply`. Full policy in [`../docs/UPGRADE.md`](../docs/UPGRADE.md).

## Slash commands

`install.sh` also installs any `commands/*.md` into `~/.claude/commands/`,
so Artificer-flavored slash commands ship alongside the themes. Currently
seeded with `palette-preview` — a one-shot command that exercises the
full Claude Code theme surface (markdown constructs + a diff edit), useful
during palette work.

Add new commands by dropping a `.md` file into `commands/` and re-running
`./install.sh`. Frontmatter:

```markdown
---
description: <one-line summary shown in the slash command picker>
---

<prompt body>
```

## Palette parity

Ghostty, VS Code, and Claude Code pull from `_palette.json` automatically.
Obsidian mirrors the same palette but as a hand-authored sister theme —
if you bump `_palette.json`, re-check Obsidian's `--art-*` tokens too.
The point is that syntax colors, terminal ANSI, IDE chrome, and Obsidian
markdown stay coherent across context switches.

| Role | Dark | Light |
|---|---|---|
| Background | `#292c33` | `#f5ead0` (ivory) |
| Foreground | `#e8e6e1` (bone) | `#20203e` (indigo ink) |
| Accent (gold) | `#dbbb6f` | `#7a5a10` |
| Brand (purple) | `#5a3a9a` (lifted) / `#331567` (deep) | `#4a25a0` |
| Success (apothecary) | `#4a8a5e` | `#2a5a3a` |
| Danger (brick) | `#a04540` | `#8a2418` |
| Info (steel) | `#b8cad4` (dark) / `#9fb6c4` (bright) | `#2e4a5a` |
| Selection bg | `#c4932a` | `#c4932a` |
