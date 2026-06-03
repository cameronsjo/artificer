# Artificer · Editor & Terminal Themes

Same Jazz Age palette, four surfaces. Each ships dark + ivory-paper light.

```
themes/
├── _palette.json           ← single source of truth
├── build.mjs               ← regenerator (Node ≥18)
├── claude-code/            artificer-{dark,light}.json
├── ghostty/                artificer-{dark,light}              (no extension)
├── vscode/                 package.json + themes/*.json        (installable extension)
└── obsidian/Artificer/     manifest.json + theme.css           (drop-in theme folder)
```

## Distribution — these files are NOT on npm

The npm package (`@cameronsjo/artificer`) and its jsDelivr CDN mirror ship **only
`src/`** — the web design system (CSS + JS + tokens). The theme files in *this*
folder (Ghostty, Claude Code, VS Code, tmux, Obsidian, and the category-3
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
include = ["themes/lazygit/**", "themes/gh-dash/**", "themes/gitmux/**"]
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

`install.sh` also symlinks any `commands/*.md` into `~/.claude/commands/`,
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
