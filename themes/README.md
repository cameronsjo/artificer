# Artificer · Editor & Terminal Themes

Same Jazz Age palette, fourteen surfaces. Each ships dark + ivory-paper light —
except `cmux/`, `gitmux/` and `flux/`, which carry a single file (flux holds
both modes in it, because that host switches at runtime rather than picking a
file).

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
├── helix/                  artificer-{dark,light}.toml         (+ -opaque twins)
├── tmux/                   artificer-{dark,light}.conf
├── gitmux/                 artificer.yml
├── lazygit/                artificer-{dark,light}.yml          (block fragment)
├── gh-dash/                artificer-{dark,light}.yml          (block fragment)
├── herdr/                  artificer-{dark,light}.toml         (block fragment)
├── vscode/                 package.json + themes/*.json        (installable extension)
└── obsidian/Artificer/     manifest.json + theme.css           (drop-in theme folder)
```

**`./install.sh` places nine of these** — Claude Code, Ghostty, Helix, glamour,
gum, tmux, gitmux, VS Code, Obsidian — as **copies** (`--symlink` if you'd
rather repo edits propagate live). The other five are deliberately manual:
`cmux`, `lazygit`, `gh-dash` and `herdr` splice into a config file you also own,
and `flux` installs into another repo's build output.

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
used by `ultrathink` / `ultraplan`. Unknown tokens are silently ignored, so
the file is forward-compatible.

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

Two behaviours worth knowing before you debug a colour:

- **glow emits no colour at all when stdout is not a TTY**, and `CLICOLOR_FORCE`
  does not override it. A piped render looks byte-identical to an unthemed one,
  so a stylesheet that isn't loading and one that is are indistinguishable
  through a pipe. Check in a terminal.
- **Body elements render 24-bit; the code block's syntax colours quantise to
  256.** Chroma does its own conversion, so those are nearest-match rather than
  exact palette hexes. Glamour also does not paint a code-block background in
  v0.10.0 — the binding is present and currently inert.

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
> Helix is the only terminal target that paints *syntax* (tmux, gitmux, lazygit,
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

## VS Code / Cursor

Two paths:

**1. Sideload (fastest):** copy the whole `vscode/` folder to
`~/.vscode/extensions/cameron.artificer-theme-0.1.0/`, then reload window.
Pick "Artificer Dark" or "Artificer Light" from `Cmd+K Cmd+T`.

**2. Package + install:**

```bash
cd vscode
npx @vscode/vsce package
code --install-extension artificer-theme-0.1.0.vsix
```

Tested against VS Code 1.70+. Cursor and other forks read the same schema.

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

Two notes on the mapping, both deliberate:

- **`accent` and `yellow` are the same hex.** Artificer's accent *is* gold, so
  herdr's navigation accent and its yellow state marker legitimately coincide.
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
