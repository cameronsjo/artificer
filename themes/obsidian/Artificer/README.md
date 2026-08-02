# Artificer for Obsidian

A monospace-first, dark-by-default theme. Burnished gold accents, AAA contrast, no rounded-corner softness, and a carefully restrained palette of attention colors. Includes a paper-cream light mode.

Personal design system, ported. Built around four ideas: every UI surface is mono, headings earn their weight, inactive panes fade to 0.55 opacity / 0.6 saturation, and color is reserved for things that mean something.

This theme is the Obsidian embodiment of the **Artificer design system** (a personal palette + type system that also drives Ghostty, VS Code, and Claude Code). Palette governance for this repo lives in [PALETTE.md](./PALETTE.md). Version history in [CHANGELOG.md](./CHANGELOG.md).

## Screenshots

![Dark mode](./screenshots/01-dark.png)
![Cream mode](./screenshots/02-cream.png)
![Callouts](./screenshots/03-callouts.png)

## Install

**Option 1 — Clone from GitHub**

```bash
cd <your vault>/.obsidian/themes
git clone https://github.com/YOUR-USERNAME/obsidian-artificer.git Artificer
```

Then reopen Obsidian → **Settings → Appearance → Themes → Manage** → select **Artificer**.

**Option 2 — Drop in manually**

1. Quit Obsidian.
2. Download this repo as a zip, unzip, rename the folder to `Artificer`, and place it in `<your vault>/.obsidian/themes/Artificer/`. The folder must contain `theme.css`, `manifest.json`, and the `fonts/` directory.
3. Reopen Obsidian → **Settings → Appearance → Themes → Manage** → select **Artificer**.

**Option 3 — From the community theme picker**

Not yet submitted.

## Pair with Style Settings (recommended)

The theme exposes ~40 controls via the [Style Settings](https://github.com/mgmeyers/obsidian-style-settings) community plugin. Install it from the community plugins picker, then **Settings → Style Settings → Artificer** for live controls over:

- Heading style (pure mono / gold rule / source-mode markers)
- Body, mono, and UI fonts
- Inactive pane opacity & desaturation
- Tab style (underline vs filled)
- Tag style (pill vs underline)
- All eight accent colors with separate dark / light defaults
- Code-block colors, line numbers, radius
- Frontmatter density, callout radius, blockquote style
- Prose highlighting — five-category reading lens (palette, intensity, cues)
- Texture — paper / fiber grain, sidebar dots, callout hatch, raised depth
- Whimsy — flowing vault name & empty-pane title (silver / spectrum / gold)

Without Style Settings everything still works — you just get the defaults.

## Fonts

Bundled in `fonts/`:

- **JetBrains Mono** (400 / 500 / 700) — chrome, code, identifiers, headings (default)
- **iA Writer Quattro** (400 / 700 + italics) — editor body prose (default)
- **iA Writer Quattro S** (400 / 700 + italics) — sister sans face, available via `--font-text` override
- **iA Writer Quattro V** (400 + italic) — variable face, available via `--font-text` override

To use system mono / serif instead, override `--font-monospace` and `--font-text` in Style Settings or in Obsidian's **Appearance → Customize appearance** panel.

## Design rules

The theme is written against six rules:

1. **Mono is the default surface.** Sidebar, tabs, palette, settings — all JetBrains Mono. Body prose is the only place a proportional font shows up, and even that is opt-in.
2. **One accent.** Gold (`#e0b558` dark / `#7a4f08` light) is the only color that means "interactive." Everything else (rose, terracotta, olive, steel, brand purple) is reserved for state.
3. **Headings earn their weight.** Three styles ship — pick the one that matches how you write.
4. **Bold is real bold.** 700 weight, full-contrast color. Italics inherit the body color.
5. **No gratuitous rounding.** Surfaces are 8–12px max. Inputs are 4px. Tags are 4px pills. Borders are 1px and visible.
6. **Inactive panes recede.** 0.55 opacity, 0.6 saturate by default. The active pane is the only thing in full color.

## Heading styles

```
A  Pure mono            Default. All headings JetBrains Mono 700, body color.
B  Gold rule + steel    H1 has a gold underline; H3-H6 in steel.
C  Source-mode markers  '#', '##', '###' prefix in muted gold.
D  All gold             Every heading H1-H6 in the burnished accent ("OG gold").
```

Switch in Style Settings → Typography → Heading style, or apply `theme-heading-{a,b,c,d}` to `<body>` directly.

## Cream mode

Click the theme toggle (sun/moon) and Artificer flips to a paper-cream light mode (`#f5ead0` background, `#1a1410` ink). The accent shifts darker (`#7a5a10`) for AAA contrast on cream. All eight accent colors have separate light defaults — see `--art-*` tokens at the top of `theme.css`.

## Customizing further

`theme.css` is structured top-to-bottom:

1. **Font @font-face** — bundled JetBrains Mono + iA Writer Quattro.
2. **`:root` source tokens** — `--art-bg`, `--art-accent`, `--art-attention`, etc. Change these and everything downstream follows.
3. **`.theme-light` overrides** — cream-mode source tokens.
4. **Obsidian variable mapping** — `--background-primary: var(--art-bg)`, etc.
5. **Component overrides** — sidebar, tabs, editor, callouts, search, palette, modals, status bar, graph, settings, tables, callouts, code, frontmatter, hover popover, context menu, tooltip, notice, embeds, mermaid, footnotes, dataview, kanban, excalidraw, sync, vim.
6. **Style Settings class rules** — `body.theme-tabs-filled`, `body.code-line-numbers`, etc.
7. **`@settings` block** — Style Settings manifest.

If you only want to tweak a couple of things, do it from Style Settings. If you want a whole different palette, edit the `--art-*` tokens at the top.

## Plugin support

Out-of-the-box styled:

- Style Settings (full integration)
- yaae (parts-of-speech reading lens — `.yaae-pos-*` painted in-palette)
- Kanban
- Excalidraw
- Dataview
- Tasks (via standard checkbox styles)
- Calendar (via Obsidian's native variables)
- Iconize / lucide icons
- Mermaid diagrams
- Footnotes & callouts (Obsidian native)

Plugins that draw their own UI in Obsidian's native variables (most of them) get the theme for free. Plugins with hardcoded colors (a few) will look out of place — file a thread and we can add overrides.

## Variable contract

Four layers in `theme.css`, top to bottom:

1. **`--art-*` source tokens** — single source of truth for colors. Hex values.
2. **Obsidian-native mapping** — `--background-primary`, `--text-normal`, etc. derived from `--art-*`.
3. **Component overrides** — with `var(--font-interface, var(--art-font-mono))`-style fallback chains so user font / size / weight prefs (set in Obsidian's Customize appearance pane or via Style Settings) actually take effect.
4. **Style Settings `@settings` block** — curated controls.

## Known issues

- The "view source" toggle in Obsidian shows raw markdown with our editor styles applied. Highlight colors there assume the standard CodeMirror 6 token classes; if you have a syntax-highlighting plugin, it may override.
- Cream mode is paper-warm by design; if you want a colder white, override `--art-bg` to `#ffffff` and `--art-fg` to `#0a0a0a`.

## Contributing

- **Bugs:** open an issue with the bug template in `.github/`.
- **Palette changes from the upstream Artificer system:** open an issue with the palette-update template. See [PALETTE.md](./PALETTE.md) for the propagation contract — changes aren't automatic.
- **PRs:** the PR template in `.github/` covers what's expected. Visual changes need before/after screenshots.

## License

Apache-2.0 — see [LICENSE](../../../LICENSE).

## Credits

Built by Cameron. Part of the Artificer personal design system. JetBrains Mono is © JetBrains s.r.o. (OFL 1.1). iA Writer Quattro is © Information Architects Inc. (OFL 1.1). Both font licenses are in `fonts/`.
