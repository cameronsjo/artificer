# Start here.

You're holding the **Artificer Design System** — Cameron's personal,
AuDHD-friendly, dark-first design system for tools and dashboards. Apache-2.0,
Cameron-first, unsupported. Read order:

1. **`README.md`** — system overview, what it's for, install paths (npm, CDN, copy).
2. **`QUICKSTART.md`** — files → a working themed button in ~25 lines.
3. **`CLAUDE.md`** — drop into your repo root. Claude Code reads it automatically
   and follows Artificer's rules: the hard rules, token cheatsheet, recipes, the
   five motion patterns, Brand, the Whimsy layer, and the form / a11y / voice
   checklists.
4. **`system-preview-offline.html`** — open in a browser to see the system on one
   self-contained page (no `src/` needed).
5. **`live-spec/`** — every reference page from the source. Open
   `live-spec/index.html` for the full visual reference.
6. **`FONTS.md`** — how to load the type stack.
7. **`reference/SKILL.md`** — exhaustive cheatsheet (tokens, recipes, anti-patterns).

## Install

```bash
# npm (the web system — src/ only)
npm install @cameronsjo/artificer@0.24.0

# or vendor the runtime + a provenance sidecar into your project, no bundler required
npx @cameronsjo/artificer vendor --dest public/artificer
# no npm registry access? copy src/ by hand instead:
# cp -r src/ <your-project>/public/artificer/
# <link rel="stylesheet" href="/artificer/artificer.css" />

# editor + terminal themes (Claude Code, Ghostty, VS Code, tmux, …)
./install.sh
```

## What's where

```
artificer/
├── README.md            ← system overview + install
├── QUICKSTART.md        ← fastest path to a themed button
├── CLAUDE.md            ← consumer rules for Claude Code (drop in repo root)
├── FONTS.md             ← font loading recipes
├── system-preview-offline.html  ← self-contained visual preview
│
├── src/                 ← THE SYSTEM. Ships on npm.
│   ├── artificer.css        ← all tokens + every component class
│   ├── artificer-*.js       ← theme / focus-trap / tabs / icons / whimsy helpers
│   ├── artificer-whimsy.css ← the sanctioned whimsy layer (opt-in)
│   ├── artificer-texture.css · artificer-editorial.css · print.css
│   └── tokens.json          ← machine-readable token export
│
├── live-spec/           ← every HTML reference page (open in a browser)
├── framework-adapters/  ← Tailwind config · React wrappers · Vue patterns
├── themes/              ← same palette ported to editors + terminals
│   ├── claude-code/ · ghostty/ · cmux/ · vscode/ · tmux/ · gitmux/ · lazygit/ · gh-dash/
│   ├── obsidian/Artificer/  ← Obsidian theme snapshot
│   ├── _palette.json        ← single source of truth
│   └── build.mjs            ← regenerator
├── reference/SKILL.md   ← exhaustive AI handoff doc
└── docs/                ← STATE, UPGRADE, design research (color/contrast/theming)
```

The hard rules in `CLAUDE.md` are the spine — keep them and the system stays
coherent. Feedback and issues: open them on this repo (templates included), or
run `/artificer-feedback` from a project that consumes the system.
