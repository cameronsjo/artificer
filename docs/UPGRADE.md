# Upgrading Artificer — the consumer contract

This is the versioning contract for consuming `@cameronsjo/artificer` from npm or
the jsDelivr CDN. It exists so a downstream property (a blog, a dashboard, an
agent harness) can pin a version and know exactly what an upgrade can and can't
change.

> **Cameron-first, no support.** This package is published so I can reuse the
> system across my own projects without hand-vendoring `src/` and watching the
> copies drift. It's Apache-2.0-licensed — use it freely — but it's **unsupported** and
> Cameron-first: no support, no contributions, no stability promise beyond what's
> written here. If you're not me: pin a version deliberately and treat any bump as
> a thing you read the diff for.

## What the version number means

Artificer is a design system, so "breaking" is about **tokens, roles, and
component class contracts** — not a JS API. SemVer maps onto that like this:

| Change | Bump | Example |
|---|---|---|
| Remove or rename a token or semantic role; remove or rename a component class; change a token's *meaning* | **major** | `--accent` retired, `.btn--primary` renamed, `--bg-raised` repurposed |
| Add a new token, role, component class, or theme surface; re-tune a color *value* within an existing role | **minor** | new `--attention-bright`, new `.dash-split` shell, gold shifted one step |
| Fix a bug, a contrast floor, a typo, a generated-file regression — no surface change | **patch** | focus ring offset fix, a WCAG nudge, a build-pipeline correction |

Two deliberate calls worth knowing:

- **Re-tuning a color *value* is a minor, not a major.** A pinned consumer keeps
  the old hex until they choose to pull; the *role* (`--accent`) is the stable
  contract, the exact hex is allowed to move under it. (This is looser than the
  old README line that called any value change a minor and a *removal* a major —
  same spirit, stated as a matrix.)
- **Renaming a role is always major**, even if the value is identical — because
  your CSS references the name.

Pre-1.0 caveat: while Artificer is `0.x`, treat **minor** (`0.MINOR.x`) as the
"could break" line — that's standard SemVer for `0.x`. The matrix above is how
the system *intends* to behave once it reaches `1.0`; until then, read the
`CHANGELOG` on any `0.x` minor.

## Safe to auto-pull?

| Pin you wrote | npm/CDN resolves to | Safe to leave un-watched? |
|---|---|---|
| `0.9.0` (exact) | exactly `0.9.0` | **Yes** — frozen. Nothing moves until you edit the pin. |
| `~0.9.0` | `>=0.9.0 <0.10.0` (patches only) | **Yes** — only fixes flow in. Recommended default. |
| `^0.9.0` | `>=0.9.0 <0.10.0` while `0.x` | Same as `~` pre-1.0. Post-1.0 it widens to all minors — re-evaluate at `1.0`. |
| `latest` / no pin | whatever's newest | **No.** A minor can re-tune colors or add surfaces under you. Don't. |

## What to actually pin

- **Production surfaces:** exact (`0.9.0`) or tilde (`~0.9.0`). Exact if you want
  zero surprises; tilde if you want fixes without watching.
- **CDN `<link>`:** pin the exact version *in the URL* and use the SRI hash —
  `…/@cameronsjo/artificer@0.9.0/src/artificer.css`. A floating
  `@latest` URL defeats both the pin and the integrity hash (the hash won't
  match the new bytes and the stylesheet silently fails to load). See README
  "Path D · CDN (pinned)".
- **Never** consume an unpinned `main` tarball for anything you care about — that
  was the original drift problem (tokens at one version, whimsy at another)
  this package exists to end.

## Find the version you're on

Before migrating, know your starting point. Three ways, most reliable first:

| Source | How to read it | Example |
|---|---|---|
| Runtime token | `getComputedStyle(document.documentElement).getPropertyValue('--art-version')` | `"0.10.1"` |
| npm package | `package.json` → `@cameronsjo/artificer` `version` | `0.10.1` |
| Source banner | comment block at the top of `src/artificer.css` | `Artificer v0.10.1` |

If `--art-version` is **absent**, you're on a copy from **before v0.9.0** — the
token was minted in the v0.9.0 baseline contract. Treat "no `--art-version`" as
"0.8.x or earlier." The `/artificer-upgrade` skill automates this detection and
walks you through the relevant deltas.

## Version-by-version migration

Each row splits changes into **Mechanical** (drop-in, low risk) and **Manual**
(you must decide — where regressions hide).

| Version pair | Mechanical (drop-in) | Manual (decide / can regress) |
|---|---|---|
| **0.7.x → 0.8.0** | Add the **Whimsy layer** (`artificer-whimsy.css` + `.js`) if you want it — additive, opt-in, loads *after* `artificer.css`. Palette: `fgMuted` minted; syntax map moved to `$roles.syntax`; `comment`/`operator` rebound to `fgMuted`. | None forced — Whimsy is opt-in, nothing existing changes. |
| **0.8.0 → 0.9.0** | Adopt the **baseline contract** (define the required tokens — see below), `--art-version`, the FOUC bootstrap (`src/theme-bootstrap.html`), the `.whimsy--brand` literal-hex fallbacks. Adopt `artificer-editorial.css` for a reading surface. New: `--t-label-xs` micro tier, `--s-3xl` page-gutter rung. | The **precision pass** re-tokenized values — if you forked `artificer.css`, re-diff your overrides. Skip the bootstrap and you re-introduce a theme flash on load. |
| **0.9.0 → 0.10.0** | Adopt nav primitives (`.crumb`, `.sidenav`, `.appbar`, `.tabs`, `.nav-drawer`/`.nav-scrim`, `.btn--icon`), `.avatar`, `.accordion`, focus-ring tokens (`--focus-*`), breakpoint tokens (`--bp-mobile/tablet/wide`), `.wordmark`, `--ease-linear`, completed `--shadow-popover`. SPA: `window.ArtificerTheme = { apply, toggle, bind, observe }` + `observe()` auto-hydration; React `Icon`/`useIcons`/`useWhimsy`. | **`px → rem` type scale** — convert any `px` `--t-*-size` override to `rem` or it fights the scale (and breaks browser zoom). **`localStorage` key → `'artificer.theme'`** (a **dot**, was `'artificer-theme'`) — update any custom toggle/React adapter or persisted theme desyncs. Touch escalation grows controls to ≥44px on `pointer: coarse`. |
| **0.10.0 → 0.10.1** | Mint `--brand-purple-bright` (dark `#b095e0`, light `#5a35b0`); rebind `.code-block .tok-keyword` from bare `--brand-purple` to it. `npm run build:themes` to regenerate editor/terminal themes. | **None — strict fix.** But a copy on the old value renders syntax keywords at **1.67:1 (illegible)**; take this even if you take nothing else. |
| **0.10.1 → 0.11.0** | Adopt `ArtificerTabs.enhance()` / `.observe()` if you hand-rolled `.tabs` keyboard handling — finishes the WAI-ARIA tabs behavior (roving `tabindex`, arrows, `Home`/`End`, panel toggle) the primitive shipped style-only for. `.sidenav__group` gains sticky headers + dividers automatically (CSS only, no action needed) for long spines. No new tokens. | None forced — if you already wired custom tab keyboard handling, confirm it doesn't double-handle events once `ArtificerTabs` is dropped in. |
| **0.11.0 → 0.12.0** | Mint `.app-shell` — the responsive page scaffold (sidebar+content, collapses to `.nav-drawer` at `--bp-tablet`). Adopt it if you hand-rolled the same shell. Also mints `.full-bleed` (unified marker), `.media-fit`, `.measure-grid`, `.cq`. | The overflow-safe track fix (`1fr` → `minmax(0,1fr)` on `.split-pane`/`.grid-2`/`.grid-3`) ships automatically — if one of those held a wide fixed-size child (a `<pre>`, an SVG, a wide table), re-check it now shrinks instead of blowing out the page. |
| **0.12.0 → 0.13.0** | Mint `.figure`, `.note`, `.section-title` (doc-page chrome) and `.scroll-x` (wide-content escape hatch — the `.table`/`.code-block` overflow answer between 640px reflow and full width). Load `artificer-texture.css` for the opt-in **Texture** carve (`.tex-dots` / `.tex-grain` / `.tex-line--*` / `.tex-paper` / `.tex-raised`). | None forced — all four mints are additive, and Texture is opt-in (the class IS the switch). |
| **0.13.0 → 0.14.0** | Mint `.notif` + the four `.notif--{urgent,attention,info,background}` tier modifiers (BEM: `__body`/`__title`/`__msg`) — adopt if you hand-rolled toast/inline notifications. Tier by action-required, not severity (Hard rule #6). | None forced — additive. |
| **0.14.0 → 0.15.0** | The **component-mints minor** — eight land in one release, all additive, no new tokens. Adopt `.menu` / `.listbox` (the option-popover keystone — one floating option list for dropdown/select) if you hand-rolled one; `.palette` for a ⌘K command palette; `.tree` for nested file-explorer nav; `.pagination`; `.banner` for persistent page-level notices (not toast-tier — that's `.notif`); `.stat` for KPI cards; `.toast-region` for transient toast placement. Loading feedback: `.live-value[data-refreshing]` (in-place refresh) and `.progress--indeterminate` (long unbounded waits). | Keyboard behavior for `.menu`/`.listbox`/`.tree` ships **next** release (0.16.0) — if you adopt these components here, wire your own keyboard handling in the meantime or wait a step. |
| **0.15.0 → 0.16.0** | Adopt `artificer-options.js` (`ArtificerOptions.enhance()` for menu/listbox roving-tabindex, `.combobox()` for the palette's `aria-activedescendant` cursor) and `artificer-tree.js` (`ArtificerTree.enhance()`) — same "ship the unavoidable a11y JS" precedent as `artificer-tabs.js`. Replaces any hand-rolled keyboard handling for the 0.15.0 component mints. | If you already wired custom keyboard handling for menu/listbox/tree, remove it before dropping in the behavior module — otherwise the two handlers double up on the same keys. |
| **0.16.0 → 0.17.0** | Mint `--radius-pill` (999px) — rebind any hand-rolled fully-rounded pill (`.toggle` track, `.chip`) to it. CDN SRI manifest now derives from `package.json` exports (no consumer action). | None forced — additive/tooling. (The type-scale finding this release surfaced — #211 — ships as the *fix* in the next row, not here.) |
| **0.17.0 → 0.18.0** | Nothing to opt into — the fix is automatic. | **The re-true (#211) — take this even if you take nothing else.** `html { font-size: 100% }` replaces a silent 87.5% root that under-rendered every `--t-*-size` (body labeled 14px was rendering at 12.25px). Every token-bound size now renders at its **true, labeled value** — a **~14.3% growth** across the whole type scale. Re-check dense layouts (tables, toolbars, compact lists) for new wrapping/overflow, and any `px` assumptions built against the old under-rendered sizes. |
| **0.18.0 → 0.18.1** | Take the fix — no action needed. `prefers-reduced-motion` now actually stops the Whimsy **glacial settle** drift (previously it kept drifting even under reduced-motion). | **None — strict fix.** |
| **0.18.1 → 0.19.0** | Mint `.glyph` + `.glyph--{success,muted,attention,na}` — the themeable anti-emoji for dense-table status cells (✓✗~–), tinted by token instead of OS-rendered emoji. Each pairs with `role="img"` + `aria-label` (graphical status object, WCAG 1.4.11) — meaning never rests on the mark alone. | None forced for web consumers — additive. (This train also unifies the Obsidian theme onto the system version; not a web-consumer concern.) |
| **0.19.0 → 0.20.0** | Mint `.masthead` (editorial document top nav) + `.colophon` (footer / fine print). Re-vendor to pick up `primitives.json` — the machine-readable mint ledger the `artificer-upgrade` skill now walks (per-version minted/breaking history + adoption sweep; the `ARTIFICER-CHEATSHEET.md` ride-along is retired, delete an old vendored copy freely). | None forced — additive. Upgrades from here on are ledger-driven: the skill reads `primitives.json` instead of a hand-maintained matrix. |
| **0.20.0 → 0.21.0** | Nothing to opt into — no primitives are minted. This train carries four new generated theme targets (herdr, flux, glamour, gum) and a gated `install.sh`, neither of which is a web-consumer concern. | **None forced.** One text change reaches rendered output: the Whimsy off-season greeting's *last-resort fallback* is now `kindness is a choice` (was `kindness is free`). It only applies where neither `opts.default` nor the element's inline text supplies a line — a footer whose markup reads `<span data-whimsy-greeting>kindness is free</span>` keeps the old line until you edit it yourself. |
| **0.21.0 → 0.22.0** | Mint `.colophon__spine` — the colophon's identity · sign-off · links row. If you hand-rolled a three-slot footer row (a `space-between` flex, or your own `1fr auto 1fr` grid), rebind it: the slots are positional, so first child starts, last child ends, and the middle centres **on the page** rather than in the space the outer two leave over. Any slot may be empty — keep the element to hold its column. Composes as zone 2 of a colophon; zones 1 (`.grid-auto` of `.colophon__label` sections) and 3 (`.colophon__fine`) stay optional. | None forced — additive. Worth taking if your footer's centre slot drifts off-centre when the side content grows; that is the bug `space-between` produces and the grid fixes. |

### The three values that bite

- **`--brand-purple-bright` (dark)** moved `#7050b8` → **`#b095e0`** (≈2.35:1 → **5.47:1**, AA). Old value = illegible keywords. *Take this fix.*
- **Type scale is `rem`, not `px`** (0.10.0). `--t-body-md-size: 14px` override → `0.875rem`, or text stops respecting browser zoom.
- **Theme key is `'artificer.theme'`** (dot, 0.10.0). Grep for the old hyphenated `'artificer-theme'` and update, or persistence breaks across the bootstrap/runtime boundary.

## Three upgrade paths

**A — All-in (0.7.x → 0.19.0) · rip the bandaid.** Take one larger diff, test once.
(1) Replace `artificer.css` (+ whimsy/editorial if used) wholesale. (2) Define the
baseline tokens — absence fails *silently*, so this is the skipped-and-regretted
step. (3) Add the FOUC bootstrap inline in `<head>` before first paint. (4) Run the
`px → rem` migration on your `--t-*-size` overrides. (5) Update the theme key
everywhere. (6) Confirm `--art-version`, re-run visual/a11y checks. (7) Re-check
dense layouts against the 0.18.0 **re-true** (#211) — every `--t-*-size` now
renders ~14.3% larger than before. 0.11.0–0.19.0 are otherwise additive mints;
adopt what you need from the matrix rows above as you go.

**B — Stepped (0.7 → 0.8 → 0.9 → 0.10.x → … → 0.19.0) · smaller diffs.** Walk the
matrix rows in order, testing after each. The 0.9.0 (baseline), 0.10.0 (rem +
theme-key), and 0.18.0 (re-true, #211) steps carry the manual work; every other
row — 0.8.0, 0.10.1, and the whole 0.11.0–0.19.0 run — is additive or a strict
fix.

**C — Cherry-pick the contrast fix only · can't take the jump yet.** For a consumer
stuck on 0.7.x–0.8.0 who needs legibility now:

```css
:root                     { --brand-purple-bright: #b095e0; } /* dark · 5.47:1 */
:root[data-theme="light"] { --brand-purple-bright: #5a35b0; } /* light · 6.83:1 */
.code-block .tok-keyword  { color: var(--brand-purple-bright); }
```

Leave bare `--brand-purple` alone — it's the chart `series-3` + `.whimsy--brand`
gradient stop, not a foreground role. A contained graft; no structural work needed.

## The baseline contract (required tokens)

A vendored subset is "complete enough" only if it defines the **baseline**.
Absence fails *silently*. **Required:** `--bg`, `--bg-raised`, `--bg-overlay`,
`--bg-inactive`; `--fg`, `--fg-secondary`, `--fg-disabled`; `--border`; `--accent`,
`--accent-bright`, `--accent-fill`, `--on-accent`; `--success`, `--attention`,
`--urgent`, `--steel`; `--brand`, `--ease`. **Invariant:** `html[data-theme]` set
**before first paint** (`src/theme-bootstrap.html`). Using `.whimsy--brand`? Also
`--brand-purple` / `--brand-purple-bright`. Machine-checkable at `src/tokens.json`
`$baseline`. **Recommended** (degrade gracefully): `--dur-instant/fast/max`,
`--cyan`, the `*-bright` variants, the z-index rungs.

## When you do upgrade

1. Read the `CHANGELOG` entry for the target version.
2. If it's a **major** (or a `0.x` **minor**): grep your codebase for any token
   or class the entry says it removed/renamed.
3. If you consume via CDN, regenerate the SRI hash for the new version
   (`npm run sri` in this repo emits `dist-meta/cdn-snippet.html`, or copy the
   block from the GitHub release notes) and update both the URL and the
   `integrity=` attribute together.
4. Re-run your own visual check. Artificer keeps a WCAG floor, but your
   *composition* is yours to verify.

## Provenance — knowing what you're running

- **npm / CDN:** the version is in the install record and the URL.
- **Pasted category-3 fragments** (lazygit, gh-dash, gitmux): each block's first
  comment line is stamped `# Artificer v<x> · <Title>`. If a pasted block and
  your installed package disagree, the fragment is stale — re-paste from the
  matching version.

## After upgrading — verify

1. `--art-version` reports the version you intended.
2. Theme toggle persists across reload (correct `'artificer.theme'` key).
3. No flash of wrong theme on load (bootstrap present, set before first paint).
4. Syntax keywords legible (brandPurpleBright `#b095e0`, not old `#7050b8`/bare).
5. Text scales with browser zoom (type scale in `rem`, not `px`).
6. Focus rings visible on every interactive element (focus-ring tokens defined).

---

*Per-version migration guide closes #63. A migration recommendation that cites a
hex without a contrast ratio is incomplete — the same cultural rule applies here
as in the palette.*
