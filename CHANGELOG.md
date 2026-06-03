# Artificer · Changelog

User-visible changes to the Artificer web design system, published to npm as
`@cameronsjo/artificer`. Cameron-first and unsupported — see `docs/UPGRADE.md`
for the pin / versioning contract.

## v0.12.0

First public release of the Artificer design system.

- **`src/`** — every design token and component class in one stylesheet
  (`artificer.css`), plus the optional Whimsy and editorial layers, the
  machine-readable token export (`tokens.json`), and the small a11y helpers
  (theme persistence, modal focus-trap, tabs keyboard model, icon hydration).
- **`CLAUDE.md`** — the consumer rules for Claude Code: hard rules, token
  cheatsheet, recipes, the five motion patterns, Brand, Whimsy, and the form /
  a11y / voice checklists.
- **`live-spec/`** — every visual reference page; **`framework-adapters/`** —
  Tailwind / React / Vue starters; **`themes/`** — the same palette ported to
  Claude Code, Ghostty, VS Code, and friends.
- **`reference/SKILL.md`** and the Claude plugin (skills + the
  `/palette-preview` command) for AI-assisted adoption.

Install: `npm install @cameronsjo/artificer`, or pin a CDN build (see
`README.md` → CDN). Themes install from the repo via `./install.sh`.
