# Artificer — consumer rules for Claude Code

> Drop this file into your project root. Claude Code reads it automatically and
> follows Artificer's rules from then on. This is the **consumer half** of the
> system's rules — the hard rules, the surface decision, the token cheatsheet,
> recipes, composition, voice, the five motion patterns, Brand, the Whimsy
> layer, and the form / a11y / voice checklists.
>
> New here? Read **`QUICKSTART.md`** first (files → a working themed button in
> ~25 lines), then this file and **`reference/SKILL.md`** (the exhaustive
> cheatsheet). Open any page under **`live-spec/`** in a browser for the live
> visual reference.

## Hard rules — do not break

1. **Use existing tokens.** Never write hex codes, hardcoded `px` for spacing, or invented `cubic-bezier` curves. If the value isn't in `artificer.css` (search for `--`), don't use it. *(The sole exception is the **Whimsy** layer — see § Whimsy — which is opt-in, bounded, and the one place full-spectrum color and looping motion are sanctioned.)*
2. **Use existing utility classes.** `.stack`, `.cluster`, `.grid-auto`, `.container`, `.btn`, `.card`, `.field`, `.notif`, etc. Don't recreate them with bespoke flexbox. Size-modifier classes (e.g. `.container--*`) require their base class alongside them — the base carries the box (width, centering, padding); the modifier only tunes max-width.
3. **One primary CTA per view.** `.btn--primary` shows up at most once per visible screen — zero is valid too; a read-only surface owes no CTA. Secondary actions use `.btn--secondary` or `.btn--ghost`.
4. **Lists cap at 7 visible items** (default 5). Beyond that: progressive disclosure, search, or grouping. A primary data table isn't a "list" — it's governed by the table recipes, not this cap.
5. **Anchor words bold** — 3–5 `<b class="anchor">` per paragraph in body content. This is the system's primary scan mechanism, not optional emphasis. When prose arrives as data rather than markup, mark anchors as `**…**` in the data and promote each marked span to `<b class="anchor">` at render — single-level only, never nested.
6. **Notifications tier by action required**, not severity — and they are **silent by default**: visual-only, with audible escalation only as a carve-out that names its specific event class, is opt-in (or trivially disabled), and never carries the meaning alone. See the four `.notif--*` modifiers.
7. **Numbers use `font-variant-numeric: tabular-nums`** — there's a `.num` utility, or set on parent.
8. **z-index uses the six rungs only**: `--z-base | --z-raised | --z-overlay | --z-popover | --z-modal | --z-toast`. No improvising.
9. **Honor `prefers-reduced-motion`.** Already wired. Don't add hard-coded `transition: 600ms` that bypasses `--dur-*`.
10. **WCAG 2.2 AA floor.** Every focusable element gets a `:focus-visible` outline (already wired). Every form field gets a `<label for>`. Every status uses dot+text, not color alone.

## One system, many applications — the uniformity doctrine

Artificer renders the **same** across every application that consumes it —
same experience, same look, same everything. Consumption is
**copy-paste-repeat**, not reinterpretation: identical vendoring, identical
tokens, identical primitives, identical behavior-module patterns; only the
application's content differs.

- **Custom implementations only when absolutely necessary.** A primitive that
  almost fits gets used, not forked. A missing primitive is a gap to report,
  not an invitation to improvise.
- **Necessity is feedback.** Every genuinely necessary divergence gets filed
  upstream so the system can rule: codify it as canon, or close the gap that
  forced it. A divergence that isn't worth filing isn't worth keeping.
- **Divergences carry receipts.** Each kept divergence is documented in the
  app's `docs/artificer-adaptations.md` with its rationale and its upstream
  issue number — undocumented drift is a bug. The per-entry template lives in
  the `artificer-feedback` skill (§ Downstream decision log).
- **Behavior comes from the modules.** Framework apps take the pure state
  machines (e.g. `ArtificerTabs.nextIndex`) and keep DOM ownership;
  hand-rolling a keyboard model the module already ships is a custom
  implementation, and the bar above applies.

## First decision — what surface is this?

Before you write any CSS, decide: **is this a tool surface or a document surface?** The answer determines the body font and a couple of other defaults. If you skip this, you'll end up setting prose in monospace, which is the single fastest way to make Artificer feel wrong.

| | **Tool surface** | **Document surface** |
|---|---|---|
| What it is | Dashboards, consoles, terminals, log views, settings panels, command palettes, data tables, IDE-adjacent UI — anywhere the user came to *do something* | Writeups, READMEs, reports, postmortems, design docs, onboarding explainers, marketing-adjacent pages — anywhere the user came to *read something* |
| Body font | `var(--font-mono)` | `var(--font-body)` |
| Default size | 14px | 15–16px |
| Mono shows up in… | Most things | Code, identifiers, file paths, numerals, table cells |
| Interface face (`var(--font-interface)`) shows up in… | Labels, hints, microcopy | Labels, controls, form fields — chrome, not prose |
| Mental model | Mono *is* the voice — every line is "data" | Mono is the *exception* — used to mark things that aren't prose |

**The same project can mix both.** A settings page is a tool. The README explaining the settings is a document. Use the right default for the right page; don't try to make one rule cover both.

**Why this matters.** Monospace gives every glyph the same horizontal slot. That's an asset for column-aligned numbers and code, and a liability for prose: it kills kerning cues, mutes bold/italic contrast, and flattens the anchor-word scan mechanism that Artificer's whole reading model depends on. When the *whole page* is mono, **nothing stands out** — which defeats the point.

**Anti-pattern that bit us once.** A written analysis with embedded data tables, set in mono throughout, with three explicit overrides back to sans (`.meta`, `h3`, `th`). That's the tell: if you're spending the type budget *escaping* the body face, the body face is wrong. Flip it — sans body, mono only on the identifiers and numbers — and the overrides disappear.

## Token cheatsheet

```css
/* Colors — always semantic, never raw */
var(--bg) /* base surface */
var(--bg-raised) /* cards, sidebar */
var(--bg-overlay) /* modals, palette */
var(--bg-inactive) /* unfocused panes */
var(--fg) /* primary text */
var(--fg-secondary) /* secondary text — meta, hints */
var(--fg-muted) /* muted meta/comment — steel-blue, between secondary and disabled */
var(--fg-disabled) /* disabled text */
var(--accent) /* primary interactive — gold (dark) / sienna (light) */
var(--accent-bright) /* hover/focus accent */
var(--accent-fill) /* button bg, filled badges — SMALL controls only; never a selected-card/surface bg (pair only with --on-accent) */
var(--on-accent) /* text on accent-fill */
var(--brand-purple) /* Cameron's purple — wordmark, brand surfaces; pair with --brand-purple-bright for hover */
var(--success) /* sage green */
var(--attention) /* burnished amber */
var(--urgent) /* terracotta red */
var(--border) /* dividers, input borders */

/* Spacing */
var(--s-xs) /* 4 */
var(--s-sm) /* 8 */
var(--s-md) /* 16 — default gap */
var(--s-lg) /* 24 */
var(--s-xl) /* 32 */
var(--s-2xl) /* 48 */

/* Type — read this. The default depends on surface kind. */
var(--font-mono) /* JetBrains Mono — code, identifiers, file paths,
                          numerals, dense UI chrome (toolbars, status bars,
                          terminals). Default body face for TOOL surfaces:
                          dashboards, consoles, log views, data tables. */
var(--font-body) /* iA Writer Quattro V — prose. Default body face for DOCUMENT
                          surfaces: writeups, READMEs, reports, settings
                          explainers, marketing-adjacent content. */
var(--font-interface) /* iA Writer Quattro S — labels, controls, badges, form
                          fields, nav. Chrome, not prose — on BOTH tool and
                          document surfaces. --font-sans is a legacy alias of
                          --font-body, kept resolvable for public-API back-compat. */
/* Sizes via classes: .t-headline-lg/md, .t-body-lg/md, .t-label-md/sm */
/* Type utilities set size + line-height only; compose vertical rhythm
                          with .stack (gap-owned), not margins. */
/* Prose / doc-chrome utilities: .meta (--font-body, body-md, fg-secondary,
                          max-width 66ch), .note (sister of .meta — label-sm
                          fg-secondary; INHERITS the body face, so it's mono on
                          tool surfaces and --font-body on document surfaces), .num
                          (tabular-nums), .section-title (mono 22px/--t-headline-md-size uppercase
                          fg-secondary border-bottom — doc-page h2 chrome). */

/* Radius */
var(--radius-sm) /* 4 — inputs, badges */
var(--radius-md) /* 8 — cards, popovers */
var(--radius-lg) /* 12 — modals */
var(--radius-pill) /* 999 — fully-rounded pills: toggle track, chip */

/* Motion */
var(--dur-instant) /* 80ms — hover/focus */
var(--dur-fast) /* 160ms — default */
var(--dur-max) /* 300ms — modal entry. Ceiling. */
var(--ease) /* cubic-bezier(.2,.7,.3,1) — single curve */
var(--ease-linear) /* linear — continuous translation ONLY (pattern #02) */

/* Focus ring — geometry tokenized; color is --accent */
var(--focus-width) /* 2px */
var(--focus-offset) /* 2px — outside the box (default) */
var(--focus-offset-loose) /* 4px — sliders/thumbs */
var(--focus-offset-inset) /* -2px — nav items, table rows, tabs */

/* z-index — six rungs, no improvising */
var(--z-base) var(--z-raised) var(--z-overlay) var(--z-popover) var(--z-modal) var(--z-toast)

/* Breakpoints (v0.10.0) — max-width, mobile-first-down. CSS @media CANNOT
   read these vars, so tokens.json is the source of truth (JS/Tailwind/Figma)
   and the literal @media widths in artificer.css are kept equal to them. */
var(--bp-mobile) /* 640 — phone; stacks grids, .table--responsive reflows */
var(--bp-tablet) /* 800 — split-pane + appbar collapse, drawer takes over */
var(--bp-wide)   /* 1200 — wide desktop */
```

```css
/* Chart / categorical scale — exist in CSS + tokens.json (chart object).
   Series are aliases of semantic tokens, so they track theme. */
var(--series-1) /* …5 — categorical, 5 max. 1=gold 2=steel 3=purple 4=green 5=rose */
var(--ramp-1)   /* …5 — single-hue sequential (magnitude). NOT --series-ramp-* */
var(--diverge-low|mid|high) /* signed deltas: brick → neutral → green */
var(--chart-grid|chart-grid-strong|chart-axis) /* chart chrome */
```

**Responsive & touch.** The **44px target is a NAV rule** (a11y #8: "in
nav") — desktop form controls stay dense on purpose. Every other pointer
target floors at **≥24×24px** or the WCAG spacing exception (SC 2.5.8);
dense-table affordances are the audited exception below that. Touch devices escalate
automatically via `@media (pointer: coarse)` (btn/inputs/checkbox/radio/
toggle/slider grow to ≥44px on a finger; mouse desktops are untouched).
**The coarse-pointer floor covers BARE `<button>`s too** — a small indicator
button (pagination pip, dot) inflates to 44px on a real touch device (and
only there: emulators report `pointer: fine`). That's intended for real
controls; an indicator that must stay visually small overrides
`min-width`/`min-height` back down and carries its ≥44px hit area on a
`::before` overlay (`position:absolute; inset:-18px` on an 8px dot).
Sticky/fixed chrome (`.appbar`, `.nav-drawer`) clears the notch with
`env(safe-area-inset-*)` — set `viewport-fit=cover`. Wide data tables reflow
to cards below 640px with `.table--responsive` + `data-label` on each `<td>`.
Type **sizes are `rem`** (root is never overridden) so text honors the
browser font-size preference, not just zoom — **never set a px `html`/`:root`
font-size** (it silently re-breaks this). Spacing/radii/component-internal
padding stay px. Fluid `clamp()` type is allowed **only** on editorial hero
titles (an editorial-hero carve) — never the
core scale or tool UI.

## Recipe — when asked to build…

| Ask | Use |
|---|---|
| "App shell / full-viewport layout" | `.app-shell` + `.app-shell__content` — appbar + sidenav + content skeleton for tool surfaces; collapses to the drawer under `--bp-tablet`. |
| "Top app bar" | `.appbar` + `__brand`/`__search`/`__actions`/`__menu-btn`/`__spacer` — sticky tool chrome; clears the notch via `safe-area-inset`. |
| "Side navigation" | `.sidenav` + `.sidenav__group` (+ `.label`/`.count` slots) — the section spine; one level deep, `.tree` for deeper. |
| "Mobile nav drawer" | `.nav-drawer` + `.nav-scrim` — takes over below `--bp-tablet`. |
| "Collapsible drawer groups / dense drawer nav" | `<details class="sidenav__section">` wrapping each group — `<summary>` takes the group-label treatment + twisty, rows keep full sidenav styling. The section holding `[aria-current="page"]` MUST be rendered `open` (consumer JS owns the attribute). Drawer/full-width only — never compose with `.sidenav--rail`. |
| "Theme toggle in the drawer (mobile)" | `.sidenav__footer` — bottom-anchored settings row (label + canonical `.theme-toggle--inline` `[data-theme-toggle]` button). On mobile the toggle moves INTO the drawer; a fixed `.theme-toggle` sits below the drawer's z-index. |
| "Add a settings page" | `.page-shell` + `.container--md` + `<fieldset>` + `.field` blocks, 3–5 fields per group |
| "Breadcrumb" | `.crumb` + `.crumb__sep` — where-am-I; nav's first rung. |
| "Button" | `.btn` + `--primary`/`--secondary`/`--ghost`/`--icon` — one primary per view (Hard rule #3). |
| "Search input" | `.search` — the icon-slotted search box; `.appbar__search` in the bar. |
| "Chip / facet tag" | `.chip` (+ `.chip__count`) — faceted filters in a `.filter-bar` or `.cluster`. |
| "Confirmation dialog" | `.scrim` + `.modal` + `ArtificerFocus.trap()` — see `overlay.html` in live system |
| "Tooltip" | Wrap a trigger + `.tooltip` in `.has-tooltip`; the tooltip reveals on `:hover` AND `:focus-within` (keyboard path, WCAG 1.4.13) and hides on blur. Place + draw the arrow with `.tooltip--top/bottom/left/right`. A bare `.tooltip` with no `.has-tooltip` ancestor stays a static always-visible box (backward compatible). |
| "Toast" | `.notif` + tier modifier; pick by action-required not severity. For transient on-screen placement, mount the `.notif` in a `.toast-region` (fixed corner-anchored stack on `--z-toast`; `--top-right`/`--bottom-left`/… + `.toast-region__more`). A toast IS a `.notif` in the region — no separate toast class. |
| "Status pill" | `.badge--{tier}` + `.dot--{tier}` inside. Coming from Bootstrap/Tailwind `warning`? That tier is `--attention` here (badge, dot, card, notif, banner) — one name per tier, no `warning` alias. |
| "Dense table status / ✓✗~– cells" | `.glyph--{success\|muted\|attention\|na}` — the themeable anti-emoji for comparison grids (✓ `--success`, ✗ `--fg-muted`, ~ `--attention`, – `--fg-secondary`). Emoji are OS-rendered and ignore the theme; glyphs are real text tinted by a token. They're graphical objects (WCAG SC 1.4.11, 3:1 floor): each pairs with `role="img"` + `aria-label`, never the mark alone. Sparse/labeled status stays `.badge`+`.dot`. |
| "Loading state" | Pick by duration: <100ms nothing · 100–500ms disabled label · 500ms–2s `.skeleton` · >2s `.progress` with concrete copy · >10s background. Long wait with nothing to count: `.progress--indeterminate` + concrete copy ("Deploying to us-east-1…", never bare "Deploying…"). |
| "Horizontal bar / meter / usage bar" | `.bar` (row) + `.bar__track` + `.bar__fill` (width inline; fill background is any semantic token — `--accent-fill`, a `--series-*`, or a `--diverge-*`). The fill bakes `display:block; height:100%` so it never collapses to zero. Determinate progress with a % → `.progress`; a static magnitude/usage bar → `.bar`. |
| "Refreshing a value in place" | `.live-value[data-refreshing]` recedes the stale value + `.live-value__dot` pulses; fresh value fades in on `.live-value`'s transition. NOT `.skeleton` (would blank it). |
| "Live data indicator" | `.live-tick` (pulsing dot) + `.last-updated` (timestamp) — auto-updating regions still need an in-UI pause (a11y #13). |
| "Empty state" | `.empty-state` — title + body + ONE primary action |
| "Table" | `.table`, right-align numerics with `.num`, em-dash for empty cells. `.table--responsive` + `data-label` to reflow to cards <640px |
| "Key-value list" | `.kv` — mono `<dl>` grid for metadata pairs; `.table` for real data. |
| "Tabs / view switcher" | `.tabs` + `role=tablist`/`tab`/`tabpanel` + `aria-controls`; then `ArtificerTabs.enhance(el)` (or `data-tabs` + `observe()`) for the APG keyboard model — the CSS alone is style-only. NOT `.timerange`. |
| "Segmented control / view-param switch" | `.timerange` (time window, density) — NOT `.tabs` (tabs switch the whole view) |
| "Filter bar" | `.filter-bar` + `.grow` — ALL filters in one top bar, never sprinkled into panels. |
| "Blog / editorial / document top nav / masthead" | `.masthead` (artificer-editorial.css) + `.masthead__brand`/`__nav`/`__meta` — non-sticky document counterpart to `.appbar`; compose brand with `.wordmark`, toggle with `.theme-toggle--inline`; `[aria-current="page"]` marks the page. |
| "Brand wordmark" | `.wordmark` (renders `artificer.` — § Brand). |
| "Theme toggle" | empty `<button class="theme-toggle" data-theme-toggle aria-label="Toggle theme">` — the module injects the glyph. |
| "Stat card" | `.stat` (core) — `.stat__label` (mono small caps) + `.stat__value` (mono large tabular) + `.stat__row` + `.stat__delta`(`.down`). The cell of a `.kpi-strip`. |
| "KPI strip" | `.kpi-strip` of `.stat` cells over a chart — the KPI dashboard recipe's top band. |
| "Form field" | `<div class="field">` with label, input, and EITHER hint OR error (with `aria-describedby`) |
| "Avatar" | `.avatar` (image or initials) + `--sm`/`--lg`/`--xl`/`--square`. Not `.dot` (8px status) or `.badge` (pill). |
| "Accordion / disclosure" | `.accordion` wrapping native `<details><summary>` + `.accordion__body` — keyboard + a11y for free, no JS |
| "Combobox / dropdown / palette" | One option-popover (`.menu`/`.listbox` + `__option`/`__label`/`__sep`/`__hint`/`--danger`; `.is-active` is the roving cursor) — don't hand-roll a floating list. Behavior: `data-options` / `ArtificerOptions.enhance()` |
| "Command palette / ⌘K" | `.palette` (= `.palette__search` header + a `.listbox` body) on a `.scrim`, focus-trapped via `ArtificerFocus.trap()`; Esc closes. Cursor + Enter dispatch: `ArtificerOptions.combobox(input, list, {onSelect})`. A recipe over the option-popover — see `components-extended.html`. |
| "Tree / file explorer / nested nav" | `.tree` > `.tree__group` > `.tree__row` (+ `.tree__twisty`, `.tree__leaf`); `role=tree`/`treeitem`/`group`. Nested disclosure beyond `.accordion` (flat) + `.sidenav` (one level). `artificer-tree.js` ships expand/collapse + arrow-key roving (`data-tree` / `ArtificerTree.enhance()`). |
| "Static / no-JS tree (SSR, docs)" | `.tree--static` — nested `<details><summary class="tree__row">`; disclosure semantics, no JS. Deliberately not `role="tree"`; `ArtificerTree.enhance()` is inert on it. |
| "Split pane / master-detail" | `.split-pane` + `.pane--active`/`.pane--inactive` — Rule #6 recession marks the unfocused pane. |
| "Text workbench / editor panes / paste target" | `.workbench` + `.workbench__pane` (`.workbench__header` + `.workbench__editor`) — a row of equal-width `.textarea` panes for text-in/text-out surfaces; the label lives in `.workbench__header` as a real `<label for>`, never a placeholder. A `.dash` BODY, not a sixth dash recipe — the five-recipe ceiling (§ Dashboards) stands. |
| "Pagination" | `.pagination` + `.pagination__gap`; `[aria-current=page]` marks the page; prev/next disable at ends. Counted, jumpable ranges only — unbounded sets use "load more". |
| "Persistent page banner" | `.banner` + `--info/attention/urgent/success` + `.banner__body`/`.banner__actions`. A standing layout band (read-only mode, degraded nodes), NOT the transient toast-tier `.notif`. Color encodes tier; texture never does. |
| "Footer / colophon / fine print / attribution" | **Three zones, in order — 1 and 3 optional, the spine always present.** (1) a `.grid-auto` of `.colophon__label` sections; (2) `.colophon__spine` — three POSITIONAL slots, **identity · sign-off · links** (first child starts, last ends, middle centres *on the page*, so a long identity can't shove the sign-off off-centre); (3) `.colophon__fine` for the legal tier. Every site uses the same primitive and differs only in which zones it fills. Any slot may be empty — keep the element to hold its column. In the links slot use `<a>` to navigate and `<button class="btn btn--link">` for a control that *acts* — never an `<a>` carrying a click handler, which makes the a11y tree announce a link that doesn't link. Prose auto-flips to `--font-body` even inside `.surface-tool`; `.surface-document` flips a prose island elsewhere back to `--font-body`. |
| "Selected card / selected row / active choice" | Mark it on the edge, not as a fill: `.card--active` (`background: var(--bg)` + `border-left: 2px solid var(--accent)`) for a card, the option-list `.is-active` treatment (`background: var(--bg-raised)`) for a row. NEVER `--accent-fill` as a large surface background — its only rated text color is `--on-accent`, so default body text on it fails contrast. |
| "File upload / dropzone" | `.file-field` (click-to-browse) → add `.file-field--drop` for a drag well; toggle `.is-dragover` on drag events. Color marks the drag state, not texture. |
| "Animation" | Only animate state changes. `transition: prop var(--dur-fast) var(--ease)`. Never invent durations. |
| "Live-spec / doc-page example container" | `<figure class="figure">` + `<figcaption class="meta">…</figcaption>`. Modifiers: `.figure--frame` (relative-positioned, padding 0), `.figure--flush` (padding 0, edge-to-edge). Captions reuse canonical `.meta`. |
| "Doc-page section header" | `<h2 class="section-title">` — mono, `--t-headline-md-size` (22px), uppercase, `--fg-secondary`, border-bottom rule. Doc/spec chrome; on tool surfaces prefer the structural `h2` already styled. |
| "Syntax-highlighted code block" | `.code-block` + the `.tok-*` roles. |
| "Tabular number" | `.num` utility — sets `font-variant-numeric: tabular-nums`. Drop on the cell, or on the parent for a whole table. |
| "Short hint paragraph under a figure or field" | `.note` — sister of `.meta`, smaller (label-sm). Inherits the body face — **mono on tool surfaces, sans on document surfaces** — so each surface's character carries through. Use for one-sentence asides; escalate to `.meta` when it grows past a sentence. |
| "Dashboard shell" | `.dash` + `.dash__topbar` (`.dash__title` + `.dash__actions`) — one frame, five recipes (§ Composition). |
| "Chart / sparkline / gauge" | `.chart` scaffold, `.sparkline`/`.sparkbars` (in tables, no axes), `.gauge`; series via `--series-1..5` (§ Charts). |
| "Architecture / flow diagram" | `.dia-node`/`.dia-edge` on inline SVG (§ Diagrams). |
| "User-defined fun element / celebration / long 'thinking' state / brand wordmark" | `.whimsy` + `artificer-whimsy.css` & `.js` — the ONE sanctioned exception to the motion + raw-color rules. **See § Whimsy.** Never reach for it on chrome, status, data, or errors. |
| "Make it fun / playful / celebratory / rainbow" | The **Whimsy** layer — see § Whimsy. `.whimsy` / `data-whimsy="wave"` / `Whimsy.celebrate()`. Don't hand-roll a one-off. |
| "Make it feel like paper / give it grain / material / texture / depth" | The **Texture** layer (`artificer-texture.css`) — see § Texture. `.tex-grain` / `.tex-dots` / `.tex-line--hatch` / `.tex-paper` / `.tex-raised`. Hueless + motionless; never on data/status/errors. |
| "HTML diagram node / React Flow node / boxes-and-arrows in DOM" | `.dia-box` — the HTML/CSS twin of the SVG `.dia-node`, reading the same `--dia-*` tokens. `--accent` (one per diagram), `--ghost` (planned/optional, dashed), `--tab` + `style="--dia-tab: var(--series-3)"` (any series token) for a colored type-edge. Inline SVG diagrams stay on `.dia-node`. |
| "Flow / pipeline / horizontal step-chain" | `.flow` (row) + `.flow__step` (each IS a `.dia-box`) + `.flow__link` (connector, mirrors `.dia-edge`; `--dashed` for async/return) + `.flow-frame` (dashed, labeled phase-group). Left-to-right chain — for a vertical numbered timeline of grouped steps use `.spine`/`.phase`. |
| "Phased timeline / numbered stages where each step is a set" | `.spine` (rail down the marker gutter) + `.phase` (`.phase__marker` numbered badge + `.phase__body` holding a `.stack` of `.dia-box` nodes) + `.phase--accent` (the pivotal station, accent marker + ring, one per timeline). Vertical + grouped — for a horizontal single-node chain use `.flow`. |

## Composition — dashboards, charts, diagrams

When you're past primitives and assembling product surfaces, three more rule-sets kick in. The full reference lives in `live-spec/composition.html`, `live-spec/charts.html`, `live-spec/diagrams.html`.

### Dashboards (`composition.html`)

- **One frame, five recipes — `.dash` + a density + a primitive body. Don't invent a sixth recipe.** The shell is `.dash` (framed surface) with `.dash__topbar` (`.dash__title` + `.dash__actions`); the body (1fr) is built from shipped primitives. The five: **KPI** = `.kpi-strip` over a chart · **ops console** = `.split-pane` + log + `.table` · **observability** = a chart grid (`.grid-2`/`.grid-auto`) · **table-first** = `.table` is the body · **split** = `.split-pane` (master/detail). They are recipes, **not** classes — there is no `.dash-kpi-strip`/`.dash-ops`/etc.
- **Density is a container choice.** Set `.density-compact|cozy|comfortable` on the page or panel. Compact for ops/log views, cozy default, comfortable for docs.
- **Filters live in one bar at the top — `.filter-bar`.** Time-range (`.timerange`), search, faceted chips (`.chip`), and the density toggle. Don't sprinkle filters into individual panels.
- **Live data uses `.live-tick` (pulsing dot) + `.last-updated` (timestamp) atoms.** No spinning refresh icons; the dot pulses and the timestamp updates. (No `.streaming`/`.live-dot` class — those names were doc drift.) Auto-updating regions still need an in-UI pause control — see the a11y checklist's pause rule; `prefers-reduced-motion` doesn't cover content updates.

### Charts (`charts.html`)

- **No new chart libraries without forwarding tokens.** ECharts, Recharts, Chart.js, vanilla SVG — all read `--chart-grid`, `--chart-axis`, `--series-1..5`. Snippets in `charts.html`.
- **Five series max.** If you need more, you have two charts or you have a sequential ramp problem. Use `--ramp-1..5` (single-hue sequential) for magnitude. *(The token is `--ramp-*`, not `--series-ramp-*`.)*
- **No pies/donuts above 3 slices.** Bar chart instead. Hard rule.
- **Sparklines have no axes** and use `.sparkline` / `.sparkbars`. They live in tables, not standalone.
- **Two gridlines max** — baseline and one mid. Bars start at zero; lines may use a fitted Y range.
- **Don't animate chart entry by default.** Honor `prefers-reduced-motion`. The data is the point, not the reveal.
- **The muted series palette is a stance, not an oversight.** Series slots stay aliases of semantic tokens — the system deliberately fails color-alone chroma/CVD validators. A **second channel** (direct label, shape, line style, or position) is mandatory on every multi-series categorical chart; color never carries series identity alone.
- **Light mode has fewer distinguishable channels than dark** — attention collapses toward the gold family. A surface combining categorical series with an attention-tier marker must let a glyph or label carry that distinction across the theme flip, not color alone.
- **Valenced scales with two charged ends use `--diverge-low|mid|high`.** `--ramp-*` is for magnitude, where one end is neutral — a 0–2 rubric where 0 is bad and 2 is good is a diverge, not a ramp.

### Diagrams (`diagrams.html`)

- **Use `.dia-node` / `.dia-edge` / `.dia-edge-label` on inline SVG.** They inherit theme; you don't restyle.
- **One accent node per diagram** (`.dia-node--accent`) — the thing the diagram is *about*. Everything else is the default surface.
- **Ghost nodes for "planned/optional"** (`.dia-node--ghost` — dashed border, transparent fill). No legend needed.
- **Edge weight encodes resolution, not importance.** `.dia-edge--strong` for the message that closes a flow; default for everything else; `.dia-edge--dashed` for async/return.
- **No more than 9 nodes per diagram.** Group into sub-systems and link out.
- **Mermaid:** call `mermaid.initialize({ theme: 'base', themeVariables })` once at boot, reading from CSS vars. Snippet in `diagrams.html`.
- **React Flow:** wrap in `.rf-artificer` — class-scoped overrides forward all tokens.
- **SVG `<defs>` ids are document-scoped, not component-scoped.** Define shared markers once at the app root, or namespace per instance (`arrow-<instance-id>`) when rendering N copies of one diagram component — never hard-code one id inside a repeated component.
- **Interactive nodes carry the same keyboard contract as any control.** `tabindex="0"` + `role="button"` + `aria-label` + Enter/Space handling; the focus ring comes free from the global `[role="button"]:focus-visible` catch-all.

## Voice & microcopy

- **Literal, not gestural.** "No runs yet" beats "Nothing to see here."
- **Name what's missing**, **why** (briefly), **what to do.** Three sentences max for empty states.
- **First-run empty states teach, not just describe.** State what the feature is *for*, not only that it's empty. When the system can infer the fix — a typo'd search, a filter that zeroed the results — surface it as a one-tap action above the prose, not buried in it.
- **Errors say what to do**, not just what went wrong. "Add a digit" beats "Invalid."
- **No loading verbs alone.** "Loading…" → "Indexing 1,247 of 8,300 files."
- **Tabular > narrative for data.** Tables before paragraphs.
- **Plain language, not average language.** Target a 6th–8th-grade reading level: short common words, subject-verb-object order, verbs over noun-piles ("delete the file" beats "perform file deletion"). Split any sentence that runs past ~25 words.

## Anti-patterns

```html
<!-- Don't -->
<div onclick="..." style="padding:12px;background:#3c4150">Click</div>
<input placeholder="Email" /> <!-- placeholder-as-label -->
<div class="my-stack">...</div> <!-- bespoke layout -->
<button style="border-radius:24px">Save</button> <!-- non-token radius -->
<span class="text-red-500"></span> <!-- color-only signal -->
<div class="row"><button>OK</button><button>Cancel</button></div> <!-- two primary CTAs -->

<!-- Do -->
<button class="btn btn--secondary">Click</button>
<div class="field">
  <label class="field__label" for="e">Email</label>
  <input class="input" id="e" type="email" />
</div>
<div class="stack">...</div>
<button class="btn btn--primary">Save</button>
<span class="badge badge--urgent"><span class="dot dot--urgent"></span>Failed</span>
<div class="cluster"><button class="btn btn--primary">Save</button><button class="btn btn--ghost">Cancel</button></div>
```

## Before shipping a UI change

1. Did you use existing tokens for every color/space/duration?
2. Did you add a new utility class only if no existing one fits?
3. Does the page work at 200% zoom without horizontal scroll?
4. Tab through — every interactive element reachable, focus order matches visual order?
5. Set OS to reduced-motion — does anything still animate?
6. Squint test — can you tell what's active without color?
7. Run axe DevTools — zero violations?
8. New live-spec page? Wire its inbound links — `README.html` nav card,
   `INDEX.md` tree, the skill file-map enumeration. A page nothing links to
   ships unreachable (the components-extended lesson).

---

## The 5 motion patterns

| # | Pattern | When | Spec |
|---|---|---|---|
| 01 | **State change** | Hover, focus, theme toggle, toggle/switch | `var(--dur-fast) var(--ease)` (160ms) |
| 02 | **Continuous translation** | Loading bars, scrubbers, progress | `var(--ease-linear)` (the one place linear is allowed); everything else stays on `--ease` |
| 03 | **Attention pulse** | **Urgent only.** Blocking errors. | `.pulse` class — 1.6s, low contrast, suppressed under reduced-motion |
| 04 | **Skeleton shimmer** | Wait states > 1s | `.skeleton` — 1.4s horizontal sweep |
| 05 | **Modal entry** | `.modal` opening | Slide-up 8px + fade, 160ms — already wired |

**Rules.** 300ms is the ceiling. One easing — don't invent `cubic-bezier`s, use `--ease`. No parallax, no auto-play, no looping decoration. Honor reduced-motion (already wired). Animate state, not arrival — never animate things appearing on page load. **The one sanctioned exception is Whimsy (§ Whimsy) — opt-in, user-defined fun only.**

---

## Brand — the wordmark

The mark is **`artificer.`** — lowercase, set in `--font-mono`, tight
tracking, closed by a **burnished full stop** (the period in `--accent`).
That stop is the signature; it's the same period that caps display page
titles ("Navigation."). Use `.wordmark` (core `artificer.css`):

`<a class="wordmark" href="/">artificer</a>`  → renders `artificer.`

Rules: lowercase always; mono always; never stretch the tracking; the stop
may recolor per surface but stays present. The wordmark is also a sanctioned
`.whimsy` home (§ Whimsy) — a flowing `artificer.` is on-brand; nothing else
in the chrome around it is. Prose may capitalize "Artificer" as a proper
noun; the *mark* is lowercase-with-stop.

**The period denotes a mark, and marks are lowercase.** That's the rule that
unifies the wordmark with the display page titles: a title that takes the
burnished full stop ("navigation.", "accessibility.", "data display.") is a
mark, so it's set lowercase. Section headers and labels that *don't* take the
stop are ordinary sentence-case/uppercase and stay as they are — the period
is the tell.

## Whimsy — the sanctioned exception

Whimsy is the **one** place Artificer relaxes "no looping decoration" and "no raw color": a flowing, burnished rainbow on text — the feeling of Claude Code's `ultrathink` shimmer. It exists for **user-defined fun elements** and **whimsical operations** — and nowhere else. Lives in `artificer-whimsy.css` + `artificer-whimsy.js` (in both `src/` and `live-spec/`); full interactive reference + playground at `live-spec/whimsy.html`.

**Load it (after `artificer.css`):**

```html
<link rel="stylesheet" href="artificer-whimsy.css" />
<script src="artificer-whimsy.js" defer></script>
```

### When to reach for it

- A **user-defined fun element** — a feature a person chose to light up, a brand wordmark, an easter egg.
- A **whimsical operation** — a celebration (deploy succeeded, streak hit), the `ultrathink` trigger-word gesture, a long "thinking" state.

That's the whole list. If it's not user-chosen delight, it doesn't get whimsy.

**Where whimsy goes.** This is the right home for *any* request to make
something "fun," "playful," "celebratory," or "rainbow." Don't invent a one-off
animation — point it here.

| Ask | Use |
|---|---|
| Flowing wordmark / feature name | `.whimsy` on short, large, bold text |
| Travelling sine wave (per-char bob) | `data-whimsy="wave"` + `Whimsy.hydrate()` |
| Rainbow divider / flourish | `.whimsy-rule` (or `--sm`) |
| "Type ultrathink…" trigger gesture | `Whimsy.watch(input, {triggers})` |
| One-shot "operation succeeded" joy | `Whimsy.celebrate(el)` — auto-clears |
| Long "thinking" state that should rest | `Whimsy.run(el, {loops, settle})` |
| Artificer colors, not full spectrum | `.whimsy--brand` |
| Metal sheen for a header (static) | `.whimsy--silver.whimsy--no-flow` |
| Focus ring on a control (on explicit request) | `.whimsy-focus` — spins *over* the focus outline, never replaces it |
| Flowing rainbow underline under a `.whimsy` link/wordmark | `.whimsy-underline` — tiling sine draws in on hover/focus, in lockstep with the mark's flow (the sanctioned replacement for a flat underline) |
| Brushed-metal gold fill (cousin of silver) | `.whimsy--gold` — slow (16s) near-static metal; add `.whimsy--no-flow` for a still gold fill |
| Your own palette | override `--whimsy-gradient` in one line |
| Maximum saturation (rare) | `.whimsy--vivid` |
| Whimsy in a static SVG (README card, OG image, email) | No DOM, no JS — `.whimsy--brand`'s CSS+JS mechanism doesn't port. See `docs/recipes/whimsy-static-svg.md` for the `<linearGradient>` + keyframed `stop-color` recipe. |

### The three effects (the whole motion vocabulary)

- **Flow** — the hue gradient slides sideways through the glyphs. On by default on every `.whimsy`. (Tiles seamlessly — never scrolls off / pops.)
- **Bob** — per-character sine bob; wave elements only (`data-whimsy="wave"`, hydrated into `.whimsy-char` spans).
- **Glow** — a static halo (`.whimsy--glow`). Not motion.

Toggle any layer off independently: `.whimsy--no-flow`, `.whimsy--no-bob`. Freezing a wave needs **both** off.

### Palettes (color, not motion)

- **Spectrum** (default) — burnished full-spectrum, generated in oklch at the palette's own chroma; hue stops land on Artificer's brand colors.
- **`.whimsy--brand`** — cycles the real semantic tokens (gold → rose → purple → steel → green); tracks light/dark for free.
- **`.whimsy--silver`** — near-neutral metal sheen: silver/grey on dark, warm graphite on cream. The most restrained variant — the only one calm enough to consider for headers (and only as a **static fill**: `.whimsy--silver.whimsy--no-flow`).
- **`.whimsy--gold`** — brushed-metal gold, silver's warm cousin. Slow (16s) so it reads as near-static metal; pairs best with a CHARACTER gradient (per-glyph = faceted). Add `.whimsy--no-flow` for a still gold fill.

Knobs are all custom properties (`--whimsy-c` chroma, `--whimsy-speed`, `--whimsy-angle`, `--whimsy-gradient`, …). Override on any scope — no new tokens, no hex.

### Settle — whimsy rests

Long-lived whimsy must not loop forever. After N hue-cycles it settles: **static** (motion off, gradient frozen) or **glacial** (one hue drift over `--whimsy-settle-speed` ≈ 2.5 min, all secondary motion off). `Whimsy.run(el, {loops, settle})`, `Whimsy.watch(input, {…, loops, settle})`, or `Whimsy.scheduleSettle(el, n, mode)`.

### API

```js
Whimsy.hydrate(root?)            // split [data-whimsy~="wave"] into bobbing chars
Whimsy.watch(input, opts)        // ignite a target when a trigger word is typed
Whimsy.celebrate(el, ms?)        // one-shot, auto-clears
Whimsy.run(el, {loops, settle})  // ignite, then settle after N loops
Whimsy.settle(el, mode) / .unsettle(el)   // mode: "static" | "glacial"
Whimsy.ignite(el) / .clear(el)   // manual toggle
```

### Doctrine — do not break

1. **Opt-in only.** Never on chrome, nav, or anything automatic.
2. **One whimsy moment per view.** Like one-primary-CTA. Whimsy everywhere is wallpaper. The API doesn't coordinate flowing slots for you — exclusivity is the caller's responsibility, same as one-primary-CTA.
3. **Never on load-bearing UI.** No whimsy on errors, destructive actions, status, or data. **One sanctioned exception:** the `.whimsy-focus` ring (artificer-whimsy.css) — a burnished ring that *augments* a control's standard `:focus-visible` outline on **hover or focus**, never replacing it (the outline still carries the WCAG focus signal). Opt-in, on explicit request only, one per view, reduced-motion holds it still-but-visible.
4. **Burnished by default.** `.whimsy--vivid` is a conscious choice, not a reflex.
5. **Display + bold only.** Gradient text drops contrast — keep it large. Never body copy.
6. **Reduced-motion is sacred.** Flow stops, burnish stays. Already wired — don't undo it.
7. **Whimsy rests.** Anything long-lived settles. A rainbow that never stops is just noise.

---

## Texture — the third (and ceiling) carve

Artificer's surfaces are **flat solid fills by doctrine**. Texture is the one
bounded place that relaxes that — **material honesty, not decoration**. It is the
**third carve** (after Whimsy and Editorial) and the system's **ceiling: no
fourth carve.** Lives in `src/artificer-texture.css` (+ `live-spec/` mirror);
full interactive reference at `live-spec/texture.html`.

**Load it (after `artificer.css`):**

```html
<link rel="stylesheet" href="artificer-texture.css" />
```

It adds **no hue** (grain is desaturated; lines are drawn from `--border`/`--fg`
only) and **no motion** (texture is static; page-grain travels with the page, it
does not animate). Opt-in only — **the class IS the switch**; a surface is flat
until you reach for a texture.

### The vocabulary

| Ask | Use |
|---|---|
| Engineered dot lattice for a **tool** surface | `.tex-dots` (pitch on `--tex-dot-gap`) |
| Irregular paper tooth for a **document** surface | `.tex-grain` (strength on `--tex-fiber-strength`) |
| Whole-page "printed on something" substrate | `.tex-paper` on the page wrapper (+ `.tex-paper--whisper` — the loudest that ships) |
| Deco line-texture (ink only, no color) | `.tex-line` + `--hatch` / `--cross` / `--flute` / `--pinstripe` |
| Raised tile (outer-glow depth, flat face) | `.tex-raised` |

### Bounds — do not break

1. **Never on data, status, or errors** — the same load-bearing exclusion as Whimsy.
2. **One texture per surface.** Don't stack grain + line + depth.
3. **Heroes stay flat + type-led.** The flowing wordmark IS the hero's texture; a
   grain/plate field behind a full-bleed hero fights it. (Page-grain is the one
   exception — a whole-page substrate, opt-in, capped at "whisper".)
4. **Web layer only.** The editor themes are generated from the palette and can't
   carry CSS texture — `build.mjs` never emits this file, and the editor themes
   don't consume it.

---

## The 12 form rules

Every task carries irreducible complexity (Tesler's Law). It moves into the
component — smart defaults, auto-fill, behavior modules — never onto the
person filling out the form.

1. **Label every field.** Placeholder is not a label — it disappears.
2. **Hint text explains constraints** ("2–32 chars") *before* the user types, not after.
3. **Error text says what to do**, not just what went wrong. "Add a digit" beats "Invalid."
4. **Wire `aria-invalid` + `aria-describedby`** to the error message id. Screen-reader users need this.
5. **Validate on blur**, not on every keystroke — except for password strength and async checks (e.g. username taken).
6. **One primary button per form.** If you need two, the secondary is "Cancel" or a ghost variant.
7. **Submit on `Enter`** from any text input. Multi-line forms: `⌘ Enter`.
8. **Don't reset the form on error.** Preserve everything the user typed.
9. **Never ask for the same information twice in a flow.** Carry answers forward — auto-fill or pick-list from what the user already gave, never re-type it (WCAG 2.2 SC 3.3.7).
10. **Authentication allows paste and passkeys.** Never demand puzzle-solving or memory gymnastics — no CAPTCHA, no cognitive-test gates (WCAG 2.2 SC 3.3.8).
11. **Anything drag-based offers a single-pointer alternative.** Reorder, slider, swipe — ship a click/tap path too, for tremor, trackball, and eye-gaze users (WCAG 2.2 SC 2.5.7).
12. **Destructive and committing actions prefer undo or a clearly-marked exit over confirm-alone.** This is a judgment call, not a mandate: where undo is genuinely impractical to implement, a confirm dialog naming the specific consequence is the documented fallback. Never demand what a backend can't feasibly support.

---

## The 13-point a11y shipping checklist

Design for the most-constrained user first — that constraint anchors the best default for everyone.

1. **One `<h1>` per page;** headings nest in order (no h2 → h4 jumps).
2. **Every form input has a `<label for>`.** Placeholder is not a label.
3. **Errors use `aria-invalid="true"` + `aria-describedby`** pointing to the error id.
4. **Color is not the only signal.** Status badges include a dot AND text. Required fields say "required."
5. **All interactive elements reachable by keyboard.** No `onclick` on bare divs. Every actionable element carries a perceptible actionable cue — gesture-only or hover-only interactions are a violation.
6. **Focus order matches visual order.** No CSS `order` tricks that desync Tab.
7. **Modals trap focus** via `artificer-focus.js`; Esc closes; focus returns to trigger.
8. **Touch targets ≥ 44 × 44 px in nav** — that rule stays as-is. Every other pointer target floors at ≥24 × 24 px or the WCAG spacing exception (SC 2.5.8); dense-table affordances are the audited exception below that. Sticky/fixed chrome must never cover the element that currently holds focus (SC 2.4.11).
9. **Images have `alt`** — empty `alt=""` for decorative, descriptive otherwise. Icons-as-labels need `aria-label` on the parent.
10. **Honor `prefers-reduced-motion`** — already wired; durations collapse to 0ms.
11. **Page works at 200% zoom** without horizontal scroll.
12. **Content readable without JavaScript.** Forms can require JS; content shouldn't.
13. **Auto-updating regions offer an in-UI pause.** Live ticks, refreshing values, log tails — `prefers-reduced-motion` doesn't cover content updates (SC 2.2.2). Expiring sessions autosave and warn-and-extend before timeout; never drop work to a silent expiry (SC 2.2.1).

**Test it.** Tab through. Turn off your mouse. Run axe DevTools (zero violations). VoiceOver/NVDA once per major view. Set OS reduced-motion, reload — nothing should jump.

---

## The 7-point voice & tone checklist

1. **Name the surface or object.** "No projects yet" beats "Nothing here."
2. **Front-load the verb.** The first word of a button is what it does.
3. **Three jobs for an error:** what broke · why · how to fix.
4. **No emoji** in product copy. (Wordmarks and avatars are fine.)
5. **No metaphor in failures.** "Gremlins" / "magic" / "sideways" are confusing under stress.
6. **Don't celebrate.** A success message is a receipt, not a parade.
7. **Read it back at 1.5× speed.** If anything feels like filler, cut it.

---

## Where to read more

- `README.md` (this folder) — system overview, install paths
- `docs/STATE.md` — maturity baseline (clay / materials / rooms / trust), re-assessed each minor version
- `reference/SKILL.md` — exhaustive token cheatsheet, recipe table, anti-patterns
- `live-spec/` — every HTML preview page, copied verbatim from the source project. Open any of them in a browser alongside `src/artificer.css`.
- `themes/` — Artificer ported to Claude Code, Ghostty, and VS Code. Same palette across all three; install paths in `themes/README.md`.
- `gradients/` — language-agnostic perceptual (OKLab) gradient primitive for terminal text. `SPEC.md` is the contract, `reference.mjs` the runnable proof + CLI (`npm run gradient -- --list`/`--swatch`), `presets.json` the data, `conformance.json` the cross-language test table. Repo-only — not part of the published `src/` bundle.
