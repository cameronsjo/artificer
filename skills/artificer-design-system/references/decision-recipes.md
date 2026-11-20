## Decision recipes

| User asks for… | Reach for… |
|---|---|
| App shell / full-viewport layout | `../../../live-spec/app-shell.html` — `.app-shell` + `.app-shell__content`; appbar + sidenav + content skeleton for tool surfaces, collapses to the drawer under `--bp-tablet` |
| Top app bar | `../../../live-spec/app-shell.html` — `.appbar` + `__brand`/`__search`/`__actions`/`__menu-btn`/`__spacer`; sticky tool chrome, clears the notch via `safe-area-inset` |
| Side navigation | `../../../live-spec/app-shell.html` — `.sidenav` + `.sidenav__group` (+ `.label`/`.count` slots); the section spine, one level deep, `.tree` for deeper |
| Mobile nav drawer | `../../../live-spec/app-shell.html` — `.nav-drawer` + `.nav-scrim`; takes over below `--bp-tablet` |
| Breadcrumb | `../../../live-spec/navigation.html` — `.crumb` + `.crumb__sep`; where-am-I, nav's first rung |
| Dashboard with file/agent list | `../../../live-spec/patterns.html` sidebar + tabs + content pane |
| Add a settings page | `../../../live-spec/forms-extended.html` `.field` blocks + fieldsets, grouped 3–5 per section |
| Form field / form (any kind) | `../../../live-spec/forms-extended.html` — label → input → hint/error, never placeholder-as-label |
| Confirmation dialog / modal | `../../../live-spec/overlay.html` — `.scrim` + `.modal`, wire `ArtificerFocus.trap()` |
| Tooltip / popover | `../../../live-spec/overlay.html` — `.tooltip` (label) or `.popover` (body content) |
| Page layout (sidebar/main) | `../../../live-spec/layout.html` — `.page-shell`, `.container` + `.container--{sm\|md\|lg}` (include the base class); add `.container--page` on a top-level `<main>` for page block padding |
| Blog / editorial / document top nav / masthead | `../../../live-spec/navigation.html` — `.masthead` (`artificer-editorial.css`), non-sticky document counterpart to `.appbar`; brand via `.wordmark`, toggle via `.theme-toggle--inline` |
| Stacking children | `../../../live-spec/layout.html` — `.stack` (vertical), `.cluster` (horizontal wrap) |
| Card grid | `../../../live-spec/layout.html` — `.grid-auto` with `--min: 240px`, never hand-rolled flexbox |
| Command palette / ⌘K / "search anything" | `../../../live-spec/components-extended.html` — `.palette` (= `.palette__search` combobox input + `.listbox` body) on a `.scrim`; `ArtificerOptions.combobox(input, list)` + `ArtificerFocus.trap()`, Esc closes; 5–7 results visible |
| Combobox / dropdown / palette | `../../../live-spec/components-extended.html` — one option-popover: `.menu` (actions) / `.listbox` (selection) + `__option`/`__label`/`__sep`/`__hint`/`--danger`; `.is-active` is the cursor; behavior via `data-options` / `ArtificerOptions.enhance()` |
| Tabs / view switcher | `../../../live-spec/patterns.html` — `.tabs` + `role=tablist`/`tab`/`tabpanel`; keyboard model via `ArtificerTabs.enhance()` (or `data-tabs` + `observe()`) |
| Segmented control / view-param switch | `../../../live-spec/navigation.html` — `.timerange` (time window, density) — NOT `.tabs` (tabs switch the whole view) |
| Accordion / disclosure | `../../../live-spec/components.html` — `.accordion` wrapping native `<details><summary>` + `.accordion__body` — keyboard + a11y for free, no JS |
| Chip / facet tag | `../../../live-spec/composition.html` — `.chip` (+ `.chip__count`); faceted filters in a `.filter-bar` or `.cluster` |
| Filter bar | `../../../live-spec/composition.html` — `.filter-bar` + `.grow`; ALL filters in one top bar, never sprinkled into panels |
| Search input | `../../../live-spec/forms-extended.html` — `.search`; the icon-slotted search box, `.appbar__search` in the bar |
| Toast / alert | `../../../live-spec/notifications.html` — pick tier by *action required*, not severity |
| Transient toast placement | `../../../live-spec/notifications.html` — mount the `.notif` in a `.toast-region` (fixed corner stack on `--z-toast`); roles set at INSERT: urgent → `alert`, attention/info → `status`, background → none |
| Tree / file explorer / nested nav | `../../../live-spec/components-extended.html` — `.tree` > `.tree__group` > `.tree__row` (+ `.tree__twisty`, `.tree__leaf`); keyboard ships via `data-tree` / `ArtificerTree.enhance()` |
| Static / no-JS tree (SSR, docs) | `../../../live-spec/components-extended.html` — `.tree--static` — nested `<details><summary class="tree__row">`; disclosure semantics, no JS |
| Pagination | `../../../live-spec/components-extended.html` — `.pagination` + `.pagination__gap`; `[aria-current=page]`; prev/next disable at ends; counted ranges only |
| Persistent page banner | `../../../live-spec/components-extended.html` — `.banner` + `--info/attention/urgent/success`; a standing layout band, NOT the transient `.notif` |
| Split pane / master-detail | `../../../live-spec/composition.html` — `.split-pane` + `.pane--active`/`.pane--inactive`; recession marks the unfocused pane |
| Text workbench / editor panes / paste target | `../../../live-spec/composition.html` — `.workbench` + `.workbench__pane` (`.workbench__header` + `.workbench__editor`); label lives in `.workbench__header` as a real `<label for>`, not a placeholder |
| Avatar | `../../../live-spec/components.html` — `.avatar` (image or initials) + `--sm`/`--lg`/`--xl`/`--square`; not `.dot` (8px status) or `.badge` (pill) |
| File upload / dropzone | `../../../live-spec/components.html` — `.file-field` (click-to-browse) → add `.file-field--drop` for a drag well; toggle `.is-dragover` on drag events |
| Live data indicator | `../../../live-spec/composition.html` — `.live-tick` (pulsing dot) + `.last-updated` (timestamp); auto-updating regions still need an in-UI pause |
| Key-value list | `../../../live-spec/data-display.html` — `.kv`; mono `<dl>` grid for metadata pairs, `.table` for real data |
| Properties / metadata block | `../../../live-spec/data-display.html#props` — `.kv.kv--props`; icon per key, divider per row, `.badge--steel` tags |
| Embedded diagram / media card | `../../../live-spec/diagrams.html#embed` — `.figure.figure--frame` + `.figure__bar` (`.eyebrow` + reset) + `.figure__body` |
| Syntax-highlighted code block | `../../../live-spec/components-extended.html` — `.code-block` + the `.tok-*` roles |
| Brand wordmark | `../../../live-spec/README.html` — `.wordmark` (renders `artificer.`) |
| Brand critter / mascot / Sploot | `../../../live-spec/sploot.html` — `<span data-sploot="pose">` + `artificer-sploot.js`; poses stand/droopy/sleep/sniff/mini, `.sploot--sm`/`--lg`, `data-sploot-helmet`; one per view, never on load-bearing UI |
| Theme toggle | empty `<button class="theme-toggle" data-theme-toggle aria-label="Toggle theme">` — the module injects the glyph |
| Tabular number | `.num` utility — sets `font-variant-numeric: tabular-nums`; drop on the cell, or the parent for a whole table |
| Short hint paragraph under a figure or field | `.note` — sister of `.meta`, smaller (label-sm); inherits the body face, mono on tool surfaces / sans on document surfaces |
| Eyebrow / overline label | `.eyebrow` (+ `.eyebrow--accent`) — uppercase label over a heading, block, or demo — `../../../live-spec/typography.html#doc-chrome` |
| Doc-page subsection header | `<h3 class="subsection-title">` — mono 700 body-md; sibling under `.section-title` — `../../../live-spec/typography.html#doc-chrome` |
| Callout / standing note | `.callout` + `.callout__title` (+ `--steel`/`--attention`/`--urgent`); the title names the tier in text — `../../../live-spec/typography.html#doc-chrome` |
| Doc-page section header | `<h2 class="section-title">` — mono 500, mixed case, `--fg`, border-bottom rule; doc/spec chrome |
| Live-spec / doc-page example container | `<figure class="figure">` + `<figcaption class="meta">…</figcaption>` — `.figure--frame`/`--flush` modifiers |
| Make it fun / playful / celebratory / rainbow | `../../../live-spec/whimsy.html` — the sanctioned `.whimsy` layer, opt-in, one per view; never on chrome/status/data/errors |
| Night sky behind a hero or header band | `../../../live-spec/whimsy.html` pattern 10 — `data-whimsy="sky"` / `.whimsy-sky` + `Whimsy.starfield()`; flowing brand field + seeded stars, dark only, rests with its wordmark on one timer; never behind data/status/errors/body copy |
| Make it feel like paper / give it grain / material / texture / depth | `../../../live-spec/texture.html` — `.tex-grain` / `.tex-dots` / `.tex-line` / `.tex-grid` / `.tex-ruled` / `.tex-perf` / `.tex-deboss` / `.tex-paper` / `.tex-raised`; hueless + motionless, never on data/status/errors |
| Footer / colophon / fine print / attribution | `../../../live-spec/layout.html` — `.colophon`: optional `.grid-auto` of `.colophon__label` sections, then the always-present `.colophon__spine` (three positional slots: identity · sign-off · links), then optional `.colophon__fine` (legal tier); prose auto-sans even inside `.surface-tool` — `.surface-document` flips any other prose island back |
| Selected card / selected row / active choice | `../../../live-spec/components.html` — `.card--active` (`background: var(--bg)` + a full 1px accent ring — never a `border-left` on a rounded box) for a card, `.is-active` (`background: var(--bg-raised)`) for a list row; never `--accent-fill` as a large surface bg — its only rated text color is `--on-accent` |
| Button | `../../../live-spec/components.html` — `.btn` + `--primary`/`--secondary`/`--ghost`/`--icon`; one primary per view |
| Status pill | `.badge--{tier}` with a `.dot--{tier}` inside — dot AND text, never color alone |
| Status indicator (bare, no count) | `.dot--{accent\|attention\|urgent\|success}` |
| Count indicator | `.badge--{accent\|attention\|urgent\|success}` with number |
| Dense table status / ✓✗~– cells | `../../../live-spec/data-display.html` — `.glyph--{success\|muted\|attention\|na}` tints ✓✗~– with a theme token; graphical (SC 1.4.11) so each pairs with `aria-label` — sparse/labeled status stays `.badge`+`.dot` |
| Icon inside button/link | `<i data-icon="search"></i>` — see `../../../live-spec/icons.html` for full set |
| Table of data | `../../../live-spec/data-display.html` — `.table`, right-align numerics, `font-variant-numeric: tabular-nums` |
| Stat card / KPI strip / headline numbers (KPIs) | `../../../live-spec/data-display.html` — `.stat` (`.stat__label` + `.stat__value` + `.stat__row` + `.stat__delta`), the cell of a `.kpi-strip`, max 4 per row |
| Chart / sparkline / gauge | `../../../live-spec/charts.html` — Artificer-styled chart patterns; `.sparkline`/`.sparkbars` (in tables, no axes), `.gauge` |
| Architecture / flow diagram | `../../../live-spec/diagrams.html` — system/architecture diagrams in the palette |
| HTML diagram node / React Flow node | `../../../live-spec/diagrams.html` — `.dia-box` (HTML twin of `.dia-node`) + `--accent`/`--ghost`/`--tab` (tint via `style="--dia-tab: var(--series-3)"`); reads the same `--dia-*` tokens |
| Flow / pipeline / horizontal step-chain | `../../../live-spec/diagrams.html` — `.flow` + `.flow__step` (a `.dia-box`) + `.flow__link` (`--dashed` for async) + `.flow-frame` (phase group) |
| Phased timeline / numbered stages, each a set | `../../../live-spec/diagrams.html` — `.spine` + `.phase` (`.phase__marker` badge + `.phase__body` `.stack` of `.dia-box`) + `.phase--accent` (one per timeline) |
| Dashboard shell / page composition | `../../../live-spec/composition.html` — `.dash` + `.dash__topbar` (`.dash__title` + `.dash__actions`); combining patterns into full pages |
| Empty state / error / loading copy | `../../../live-spec/voice-and-tone.html` — never improvise microcopy |
| Loading state / UI | `../../../live-spec/states.html` — pick by *duration*: nothing → disabled label → skeleton → progress → background |
| Horizontal bar / meter / usage bar | `../../../live-spec/charts.html` — `.bar` + `.bar__track` + `.bar__fill` (width inline; fill bg any semantic token); fill bakes `display:block;height:100%`. Determinate % → `.progress` |
| Hover/focus tooltip | `../../../live-spec/overlay.html` — wrap trigger + `.tooltip` in `.has-tooltip` (reveals on hover + `:focus-within`); place/arrow via `.tooltip--top/bottom/left/right`. Bare `.tooltip` stays static |
| Long wait, nothing to count | `../../../live-spec/states.html` — `.progress--indeterminate` + `role="progressbar"` + `aria-label` with concrete copy, NO `aria-valuenow/min/max` |
| Refreshing a value in place | `../../../live-spec/composition.html` — `.live-value[data-refreshing]` + `.live-value__dot`; NOT `.skeleton` (would blank it) |
| Animation / transition | `../../../live-spec/motion.html` — `--dur-fast` + `--ease`. Don't invent durations. |
| z-index | `../../../live-spec/overlay.html` — six rungs only: `--z-{base\|raised\|overlay\|popover\|modal\|toast}` |
| Pre-ship a11y check | `../../../live-spec/a11y.html` — a11y shipping checklist before merging |
| Token in non-CSS context | Read `../../../src/tokens.json` |
| PDF / print output | Add `<link rel="stylesheet" href="print.css" media="print">` |
| Hero/landing page | **Don't** — wrong system. Suggest a brand-marketing system instead. |
