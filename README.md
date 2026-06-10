# Artificer · Design System Handoff

Cameron's personal design system, packaged for use in real codebases.
**v0.18.0 · 2026** — the re-true: the root is never overridden (`html { font-size: 100% }`), so every `--t-*-size` token now renders at its labeled px and the whole system scales with the browser font-size preference (#211, owner-ruled). Token-bound type grows ~14.3% — body copy lands at a true 14px (it had double-applied to 12.25px); the owner optical pass is #214. The px-literal chrome rebinds to exact-match tokens as identity swaps, the `lint:tokens` font-size watch arms, the `.toast` ghost leaves print.css, and app-shell lands on canonical `.section-title`. See `CHANGELOG.md` for what changed.

---

## What this is

A complete, self-contained design system you can drop into any project. Five files do the heavy lifting:

| File | What it gives you |
|---|---|
| `src/artificer.css` | All tokens (color, type, space, radius, motion, z) + every component class. **Just add this stylesheet and you have the system.** |
| `src/artificer-theme.js` | Persistent dark/cream theme toggle, reads `localStorage`, respects `prefers-color-scheme` on first load. |
| `src/artificer-focus.js` | `ArtificerFocus.trap(el, {onEscape})` — focus-trap helper for modals, dialogs, command palettes. |
| `src/artificer-icons.js` | Lucide-rooted icon set. Hydrates `<i data-icon="search">` placeholders into inline SVG. |
| `src/tokens.json` | Machine-readable token export. For Tailwind, Figma, Style Dictionary, anything non-CSS. |

Plus `src/print.css` (paper-mode for PDF/print) and two SVG assets (favicon, OG card).

The optional **Whimsy** layer (`src/artificer-whimsy.css` + `src/artificer-whimsy.js`) is the *one sanctioned exception* to the no-looping-decoration / no-raw-color rules — a flowing burnished rainbow on text, for **user-defined fun elements** and whimsical operations only. Opt-in; load it after `artificer.css`. It also ships `Whimsy.greeting()` — a seasonal footer line (`<span data-whimsy-greeting>`) that lights up for Pride every June. Full doctrine in `CLAUDE.md` § Whimsy; interactive reference + playground at `live-spec/whimsy.html`.

The full live spec for every component lives at the project URL (the HTML pages — `colors.html`, `typography.html`, `components.html`, etc). This bundle ships the source; visit the live system for the visual reference.

---

## What Artificer is for

**Use it for** — internal tools, dashboards, IDE-adjacent UI, terminals, dev/devops products, configuration UIs, productivity apps targeting power users.

**Don't use it for** — marketing sites, hero/landing pages, kid-facing UI, lifestyle/consumer-emotional brands. It's deliberately serious.

If you're not sure: Artificer treats the user as a peer with a job to do. If your audience is closer to "delight me" than "stop wasting my time," reach for a different system.

---

## Install — three integration paths

### Path A · Vanilla HTML / static site (zero build)

Copy the `src/` folder into your project, then:

```html
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <link rel="stylesheet" href="/artificer/artificer.css" />
  <link rel="stylesheet" href="/artificer/print.css" media="print" />
  <link rel="icon" type="image/svg+xml" href="/artificer/favicon.svg" />
  <script src="/artificer/artificer-theme.js" defer></script>
  <script src="/artificer/artificer-icons.js" defer></script>
</head>
<body>
  <a href="#main" class="skip-link">Skip to content</a>
  <button class="theme-toggle" data-theme-toggle aria-label="Toggle theme">
    <span class="dot"></span><span data-theme-label>Dark</span>
  </button>
  <main id="main" class="container container--md">…</main>
</body>
</html>
```

That's it. Use the utility classes (`.btn`, `.card`, `.stack`, `.cluster`, etc.).

### Path B · Modern bundler (Vite / Webpack / Next / Nuxt)

```bash
# Drop src/ into your design system folder
cp -r src/ packages/artificer/
```

```ts
// In your app entry (e.g. src/main.ts, app/layout.tsx)
import 'artificer/artificer.css'      // tokens + .tabs .appbar .crumb .sidenav .split-pane …
import 'artificer/artificer-theme.js'
import 'artificer/artificer-focus.js' // only if using modals
import 'artificer/artificer-icons.js' // only if using <i data-icon>
import 'artificer/artificer-tabs.js'  // only if using .tabs (ships the APG keyboard model)
import 'artificer/artificer-options.js' // only if using .menu/.listbox/.palette (option navigation)
import 'artificer/artificer-tree.js'  // only if using .tree (ships the APG tree keyboard)
```

The CSS uses CSS custom properties (variables) and `data-theme` attribute — no preprocessing needed.

**Nav primitives.** `.tabs`, `.appbar`, `.crumb`, `.sidenav`, and `.split-pane` ship in `artificer.css`. The `.tabs` CSS is style-only — load `artificer-tabs.js` for the WAI-ARIA keyboard behavior (roving tabindex, arrows, Home/End). Full reference: `live-spec/navigation.html`.

```html
<div class="tabs" data-tabs role="tablist">
  <button class="tabs__tab" role="tab" aria-controls="p1">Overview</button>
  <!-- … -->
</div>
```
```ts
ArtificerTabs.observe(document) // wires APG keyboard for every [data-tabs]
```

### Path C · Tailwind / utility-first

The CSS already provides utility classes for layout (`.stack`, `.cluster`, `.grid-auto`, `.container`). For Tailwind shops, see `framework-adapters/tailwind.config.js` — it imports `tokens.json` so your Tailwind utilities use Artificer values.

---

## The non-negotiable rules

These came from research on AuDHD users; they are the system's spine. Don't refactor them away.

1. **Dark is default.** Cream/light is a paper alternative. Never auto-switch on system theme without storing user preference.
2. **One primary CTA per screen.** Always. If you need two equal-weight actions, you have a flow problem, not a design problem.
3. **Lists ≤ 7 items.** Beyond that: progressive disclosure, search, or grouping. Default to 5.
4. **Bold anchor words** in body copy — 3–5 per paragraph. They are the primary scan mechanism.
5. **Tier notifications by *action required*, not severity.** A blocking error and a casual heads-up are not the same shape.
6. **Active state is dramatic.** Inactive panes drop to 55% opacity + desaturated. Subtle differences fail the squint test.
7. **Tabular numbers everywhere.** `font-variant-numeric: tabular-nums` on every numeric column.
8. **Honor reduced-motion.** Already wired — durations collapse to 0ms. Don't re-introduce hard-coded transitions.
9. **WCAG 2.2 AA floor, AAA on body text.** Every contrast pairing is pre-measured. Don't introduce new color combos without checking.
10. **Pass the squint test.** If a visual hierarchy disappears at squint, the contrast is wrong.

---

## The decision recipe

When you need to build something, find it here first instead of improvising:

| You're building… | Reach for… |
|---|---|
| A page with sidebar + main | `.page-shell` + `.container--{sm,md,lg}` |
| Stacking children vertically | `.stack` (with `--xs/sm/md/lg/xl/2xl`) |
| Horizontal toolbar / chip row | `.cluster` |
| Card grid | `.grid-auto` with `--min: 240px` |
| Form field | `<div class="field">` with `.field__label` + `.input` + `.field__hint` |
| Validation error | `.field--invalid` + `aria-invalid="true"` + `aria-describedby` |
| Modal / dialog | `.scrim` + `.modal`, wire `ArtificerFocus.trap()` |
| Tooltip (label) | `.tooltip` |
| Popover (body content) | `.popover` |
| Toast / notification | `.notif` + tier modifier (`--urgent`, `--attention`, `--info`, `--background`) |
| Status pill | `.badge` + tier + `.dot` inside |
| Table of data | `.table` (add `.table--zebra` for dense data) |
| Headline number | Stat card pattern (see `data-display.html` in the live spec) |
| Empty state | `.empty-state` + `.empty-state__title` + `.empty-state__body` |
| Loading | Pick by *duration*: nothing → disabled label → `.skeleton` → `.progress` → background notification |
| Icon | `<i data-icon="name" aria-hidden="true"></i>` |
| Animation | `var(--dur-fast) var(--ease)`. Don't invent durations. |
| z-index | Six rungs only: `--z-{base,raised,overlay,popover,modal,toast}` |
| Print/PDF output | Add `<link rel="stylesheet" href="print.css" media="print">` |

For the full surface area (every component, every variant, voice & tone, accessibility checklist) read the live system or `reference/SKILL.md`.

---

## Framework adapters

The `framework-adapters/` folder has minimal starting points:

- `tailwind.config.js` — pulls `tokens.json` into Tailwind's theme. Use Artificer values via `bg-bg`, `text-fg`, `text-accent`, `font-mono`, `rounded-md`, etc.
- `react-components.tsx` — typed React wrappers for the most common patterns (Button, Field, Stack, Cluster, Modal, Notification). Thin — they just emit the right classes.
- `vue-components.vue` — same, for Vue 3 SFC.

These are starters, not the whole system. They cover the 80% case; for new patterns, write the markup directly and use the CSS classes.

---

## Fonts

Artificer ships with two SIL OFL typefaces, self-hosted as WOFF2 in `src/assets/fonts/`. **Pick the body face by surface kind** (see CLAUDE.md → "First decision — what surface is this?"):

- **JetBrains Mono** (weights 400 / 500 / 700) — body face on **tool surfaces** (dashboards, consoles, terminals, settings panels, data tables). Always used for code, identifiers, file paths, and numerals — even in document surfaces.
- **iA Writer Quattro** (weights 400 / 700, with italics) — body face on **document surfaces** (writeups, READMEs, reports, design docs). On tool surfaces, used for labels, hints, microcopy. Designed by Bold Monday for iA Writer; humanist sans tuned to share rhythm with monospace.

A useful rule of thumb: if the page has more than ~3 paragraphs of running prose, it's a document — set body in Quattro. If it's mostly chrome around data, it's a tool — set body in JetBrains Mono. Mixing within a project is normal: the settings page is a tool, the README explaining it is a document.

JetBrains Mono is on Google Fonts; Quattro is **not** — that's why we self-host. The CSS `@font-face` chain points at the bundled WOFF2 files and falls back through the iA Writer Quattro variants → Iowan Old Style → Charter → Source Sans 3 → system-ui, so the page still renders if fonts haven't loaded yet.

If you want the **iA Writer Quattro S** variant (proportional sans with tabular numerals, ideal for stacked dashboard data) or **Quattro V** (display variant), download them from [iaolo/iA-Fonts](https://github.com/iaolo/iA-Fonts) and drop the WOFF2 into `src/assets/fonts/`. The CSS already prefers them.

---

## Accessibility — what's already wired

You don't need to reinvent any of this. Just don't undo it.

- AAA contrast on all body text (12.8:1 dark, 11.4:1 cream)
- Focus-visible outlines on every interactive element (2px `--accent`, 2px offset)
- `:focus-visible` not `:focus` — no rings on mouse clicks
- `prefers-reduced-motion: reduce` collapses all durations to 0ms
- `prefers-color-scheme` honored on first load (overridable via toggle)
- Skip-link styled, just include it on every page
- `.sr-only` for screen-reader-only text
- Custom checkbox/radio/toggle keyboard-navigable, focus-ringed
- Selection color (`::selection`) themed
- Scrollbar styled to match (Webkit + Firefox)

The `live-spec/a11y.html` page (in the live system) has the 12-point shipping checklist.

---

## Theming

```html
<html data-theme="dark"> <!-- default; reads from localStorage -->
<html data-theme="light"> <!-- cream paper mode -->
```

`artificer-theme.js` handles persistence. To toggle programmatically:

```js
document.documentElement.setAttribute('data-theme', 'light');
localStorage.setItem('artificer.theme', 'light');
```

To read theme preference:

```js
const theme = document.documentElement.getAttribute('data-theme'); // 'dark' | 'light'
```

The CSS uses `color-scheme: dark` / `light` so form controls and scrollbars match without extra work.

---

## What's NOT in this bundle

- **Live preview pages.** Open the project URL to see every component rendered, with code samples next to each.
- **Logo files** in raster formats. Logo is `assets/cameron-logo.jpg` in the project; not included here because it's Cameron's personal mark, not a system component.
- **Storybook config.** Add your own — Artificer is framework-agnostic.
- **Tests.** Add your own — components are CSS classes, test what you build with them.

---

## Editor & terminal themes

Artificer also ships as themes for the surfaces where Cameron actually
lives — same palette, four installs:

- **Claude Code** — `themes/claude-code/artificer-{dark,light}.json`
- **Ghostty** — `themes/ghostty/artificer-{dark,light}`
- **VS Code / Cursor** — `themes/vscode/` (sideload or `vsce package`)
- **Obsidian** — `themes/obsidian/Artificer/` (drop-in theme folder, hand-authored sister)

Claude Code, Ghostty, and VS Code are generated from `themes/_palette.json`.
To re-tune any color across those three surfaces in lockstep:

```bash
# 1. Edit the hex in themes/_palette.json
# 2. Regenerate the three generated surfaces:
node themes/build.mjs
# 3. Manually re-check obsidian/Artificer/theme.css (--art-* tokens at top)
```

Obsidian is hand-authored because its aesthetic is intentionally distinct
(gold-as-primary instead of steel, Ghostty-grey background instead of
indigo-ink, dramatic 0.55/0.6 inactive-pane recession). The palette
tokens stay in sync manually.

See `themes/README.md` for install instructions per surface.

---

## Quality gates — two test lanes

Maintainer-facing. Both run in CI on every PR; consumers never need either.

```bash
# Lane 1 · data gates — zero dependencies, instant
npm test               # unit tests (node --test scripts/*.test.mjs)
npm run check:contrast # WCAG floors on $roles.syntax
npm run lint:palette   # every CSS hex is a palette value
npm run check:version  # all version stamps agree
npm run check:livespec # src/ <-> live-spec/ mirror parity

# Lane 2 · browser trust layer — Playwright (devDependencies only)
npm install                             # once; then:
npx playwright install chromium webkit  # once; downloads engines
npm run test:browser                    # behavioral assertions on live-spec/
npm run test:browser:headed             # watch it run
npm run test:browser:ui                 # interactive debugging
```

The browser lane loads `live-spec/` pages in **Chromium** (Chrome class) and
**WebKit as iPhone 13** (Safari class — on iOS every browser is WebKit) and
asserts behavior: no horizontal overflow, touch-target floors, a11y, keyboard
patterns. The data gates check what the system *says*; the browser lane checks
what it *does*.

---

## Where to ask

- **Live system** — every page is a live spec. Read first, then code.
- **`docs/STATE.md`** — the maturity baseline: where each layer of the system honestly sits (clay / materials / rooms / trust), known gaps, and the backlog policy. Re-assessed each minor version.
- **`reference/SKILL.md`** — the AI-handoff version of these instructions, dense and machine-readable. If you're using Claude Code, point it at that file.
- **`reference/CLAUDE.md`** — drop into your repo root; Claude Code reads it automatically and will follow Artificer's rules from then on.

---

## Versioning

- **v0.1** · 2026 · personal use, no license required for Cameron's projects. For external use: Apache-2.0 (see LICENSE).
- Any change to a token value is a **minor version bump**. Adding a new token or component is a **patch**. Removing a token is a **major** (breaking).

---

*This handoff package was generated from the Cameron Personal Design System project.*
