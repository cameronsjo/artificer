# Large- and wide-screen layout — the top of Artificer's responsive range

> Artificer's responsive range is well-handled at the bottom (touch escalation,
> card reflow, split-pane/appbar collapse) and undefined at the top. It has zero
> `min-width` media queries, and `--bp-wide: 1200px` is a token with a stated
> intent and no implementation. This surveys modern large/wide-screen doctrine
> and ends with a concrete direction for what `--bp-wide` should drive.

**Date:** 2026-05-31
**Lane:** 3 (research)

---

## Overview

Two facts frame this research, both confirmed against the source:

- **Every `@media` rule in `src/artificer.css` is `max-width` (640px, 800px) or
  a preference/pointer query.** There is not a single `min-width` *media query*
  — `min-width` appears only as a flex/sizing property (`min-width: 44px`,
  `min-width: 0`). The system is purely mobile-first-*down*: it starts from a
  desktop baseline and collapses as the viewport narrows.
- **`--bp-wide: 1200px` is dangling.** It is declared once in `:root`
  (`artificer.css:1228`) and in `tokens.json` (`breakpoint.wide`, intent
  *"Wide desktop — opt-in max content width"*), and referenced nowhere in CSS.
  The largest container, `.container--lg`, caps at **1120px** — already *below*
  1200px, so even the one place a wide cap could bite sits under the breakpoint.

The question is not "add big-screen breakpoints" reflexively. It is: **is the
max-width-only stance a problem, what should the wide token actually do, and how
should that coexist with container queries** — framed as inputs to a Lane 1
decision, not a mint.

## 1. The `min-width` gap — problem, or defensible stance?

Mainstream responsive doctrine is mobile-first-*up*: a small-screen baseline,
then `min-width` media queries that *add* complexity as the viewport grows.
Artificer inverts this — a desktop/tool baseline that `max-width` queries
*simplify* downward.

The honest finding from the literature is that **this is a stance, not a bug.**
Practitioner surveys of breakpoint strategy treat mobile-first (`min-width`) as
the *recommended default* but explicitly hold desktop-first (`max-width`) as an
*equally valid* choice rather than a problem
([LogRocket, "CSS breakpoints for responsive design"](https://blog.logrocket.com/css-breakpoints-responsive-design/)).
The choice tracks the product: a design system whose primary surfaces are
dashboards, consoles, IDE-adjacent tools — things a person opens *on a desktop
to do work* — has a defensible reason to author from a desktop baseline and
collapse down. Artificer's own `CLAUDE.md` first-decision ("tool surface vs
document surface") confirms the center of gravity is tool UI.

**Where the stance leaks** is not the direction (down vs up) — it is that the
range simply *stops* at the desktop baseline. There is no rule that fires
*above* it. A mobile-first-up system gets ultrawide handling "for free" because
its largest `min-width` tier is where wide rules live; a max-width-down system
has to add a deliberate wide tier or it renders a 1120px column centered in a
3440px void. The gap is **the missing top**, not the inverted polarity.

> **Reconciliation, not conversion.** The recommendation below keeps the
> max-width-down authoring model (rewriting 1,348 lines to `min-width` is a
> non-starter and gains nothing) and adds *one* `min-width`-gated wide behavior
> hung off `--bp-wide`. Mixing a single `min-width` rule into a max-width-down
> sheet is not a contradiction — it is the standard way a desktop-first system
> handles the one direction its baseline doesn't cover.

## 2. Max-content-width strategy

The strongest, best-sourced finding in this whole survey is the reading-measure
cap, and it cuts cleanly along Artificer's existing tool/document split.

**Document surfaces must cap line length.** Optimal body-text measure is
**50–75 characters per line**, with **50–60** as the core optimum (Emil Ruder)
and ~66 the widely-cited sweet spot; WCAG **SC 1.4.8 (Visual Presentation)**
sets a soft ceiling of **80 characters or fewer**, and readers are observed to
fatigue past ~100
([Baymard, "Line Length Readability"](https://baymard.com/blog/line-length-readability) — *primary* [verified];
[UXPin](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/)).
The canonical CSS technique is a font-relative cap — `max-width` "around **70ch
or 34em**" per Baymard [verified] — rather than letting prose stretch to fill the
viewport. **Artificer already does exactly this**: `--editorial-measure: 66ch`
caps `.editorial`/`.entries`. That token is the system's correct answer for
document surfaces and needs no change; it just needs to be *named as the rule*
rather than living only in the editorial carve.

**Tool surfaces are the opposite case.** Tables, dashboards, log views, and
consoles *want* horizontal room — a measure cap on a data grid wastes the
monitor the user bought to see more rows. So a wide-screen content cap is **not
universal**; it is surface-conditional:

| Surface | Wide-viewport behavior |
|---|---|
| Document (prose) | Cap at the reading measure (`66ch` today). Center; let margins grow. |
| Contained tool UI | Cap at a layout max (e.g. `--bp-wide`); center the shell. |
| Full-bleed tool UI | Go edge-to-edge (data grids, canvases, terminals) — *don't* cap. |

The relationship to the three `.container` sizes: `--sm` (560px), `--md`
(820px), `--lg` (1120px) are *content* caps that already encode "don't stretch."
What's missing is the **page-shell** cap — the outer frame that keeps a
*whole tool layout* from sprawling on a 1440px+ monitor — and a sanctioned
**full-bleed escape** for the surfaces that should ignore it. The full-bleed
breakout is a known CSS-only pattern (`width: 100vw; margin-left: 50%;
transform: translateX(-50%)`, or a 3-column grid with a spanning middle)
([CSS-Tricks, "Full-Bleed Layout Using CSS Grid"](https://css-tricks.com/full-bleed/)).

## 3. What `--bp-wide` should concretely drive

The token's stated intent — *"opt-in max content width"* — is the right
instinct but under-specified. Concretely, `--bp-wide` (1200px) should anchor a
small, bounded set of *above*-the-baseline behaviors, all opt-in:

1. **A page-shell max-width.** A `.page-shell` / `.container--page` that centers
   the whole tool frame and stops it growing past a wide cap, so a dashboard on
   a 2560px ultrawide reads as a centered workspace, not a stretched one.
   This is the literal "opt-in max content width" the token already promises.
2. **A `min-width: var(--bp-wide)`-gated multi-column step.** The one sanctioned
   `min-width` query: at ≥1200px, grids that are 2-up at desktop may go 3-up;
   a split-pane may reveal a third (detail/inspector) column. See §4.
3. **A wide-only density opportunity.** Wide viewports can afford the
   `comfortable` end of the existing `.density-*` scale for docs, or more
   simultaneously-visible panels for ops — *not* bigger fonts (type is `rem`
   and must honor the user's preference; never scale the root).

Critically — and this is a **token-system constraint, not a style choice** —
`tokens.json` already documents that *"CSS `@media` cannot read custom
properties, so the literal `@media` widths in `artificer.css` MUST be kept equal
to these."* So any `--bp-wide`-driven rule lands as a **literal `@media
(min-width: 1200px)`** kept in lockstep with the token, exactly as the existing
640/800 max-width rules already are. The token stays the source of truth for
JS/Tailwind/Figma; the CSS mirrors its value. This is an existing, accepted
pattern — the wide tier just extends it in the one direction it doesn't yet go.

## 4. Multi-column / grid expansion, dashboards, and the stretched-column trap

The wide-screen failure mode the literature names repeatedly is the
**stretched single column**: content that scales to fill 1920–3440px produces
over-long measures and an eye that has to travel too far from line-end to
line-start, hurting reading speed and comprehension
([martech.zone, "Optimal Web Page Width"](https://martech.zone/optimal-web-page-width/);
[CSS-Tricks, "Optimizing for Large-Scale Displays"](https://css-tricks.com/optimizing-large-scale-displays/)).
The recommended responses are consistent across sources:

- **Cap the text column; spend the extra width on *more columns or panels*, not
  a wider one.** A 1920px screen is better split into zones than scaled as one
  ([martech.zone](https://martech.zone/optimal-web-page-width/)). For a tool
  system this means: at wide sizes, reveal a sidebar/inspector, go from 2-up to
  3-up grids, or surface a second pane — Artificer's `.split-pane`,
  `.grid-2/3`, `.grid-auto`, and `.sidenav` are already the right primitives;
  they just lack a wide *trigger*.
- **Prefer proportional/auto layout over hard pixel jumps.** CSS Grid
  `repeat(auto-fit, minmax(<min>, 1fr))` lets column *count* grow with available
  width without a breakpoint at all — the column stays readable and the grid
  reflows itself. This is the lightest-touch wide behavior and should be the
  default for card grids; an explicit `--bp-wide` step is for the cases where
  the *layout structure* (not just column count) should change.
- **Dashboards: density over magnification.** On a large monitor an ops console
  should show *more* (compact density, more panels, more rows), not the same
  content enlarged. Artificer's `.density-compact|cozy|comfortable` already
  models this; the wide tier is a place to default ops surfaces to `compact` and
  let docs breathe.

The trap to avoid: a single `.split-pane` master/detail that simply *widens*
both panes on a 32" monitor. Past `--bp-wide`, the better move is a third column
or a capped, centered two-pane shell.

## 5. Container queries (`@container`) — complement, not replacement

Container queries are the most consequential platform shift for a
*component-oriented* design system, and they are **production-ready now**:
caniuse reports **93.3%** global support, with size queries shipped in
**Chrome/Edge 106, Safari 16.0, Firefox 110** (baseline since 2023)
([caniuse, "CSS Container Queries (Size)"](https://caniuse.com/css-container-queries) — *primary* [verified]).
No polyfill is required for a 2025/2026 system.

The settled doctrine across recent sources is **division of labor, not
substitution**:

- **Media queries own the page skeleton** — the macro layout: the overall grid
  structure, the nav/drawer swap, full-page breakpoints, plus the things
  `@container` can't do (print, orientation, `prefers-*`).
- **Container queries own the component** — a card, a stat block, a filter bar
  adapts to *its own* allotted width, not the viewport's, so the same component
  renders correctly in a narrow sidebar and a wide main column without the page
  having to know
  ([LogRocket, "Container queries in 2026"](https://blog.logrocket.com/container-queries-2026/);
  [usuallycorrect.com, "CSS Container Queries in 2026"](https://usuallycorrect.com/blog/css-container-queries-2026)).

For Artificer this is a strong fit: a token-and-component system whose primitives
(`.card`, `.kpi-strip`, `.stat`, `.filter-bar`) are dropped into wildly different
contexts is *exactly* the case container queries solve. They also coexist cleanly
with the breakpoint tokens — the `--bp-*` values can seed container `@container`
thresholds just as they seed `@media` widths, keeping one source of truth.
The realistic caveat is authoring cost (a `container-type` must be set on the
parent, which establishes containment and can affect sizing), so this is a
*new-pattern* adoption stance, not a retrofit of existing components.

## Recommended direction for Artificer

Framed as inputs to a Lane 1 decision — **nothing minted here.**

1. **Keep the max-width-down authoring model. Add exactly one `min-width`
   tier.** Don't convert the sheet to mobile-first-up; that's pure churn. Hang a
   single `@media (min-width: 1200px)` (literal, kept equal to `--bp-wide` per
   the existing token-mirror rule) for wide-only behavior. This closes "the
   missing top" without inverting the system.

2. **Give `--bp-wide` a job: a page-shell max-width.** Mint (later, if greenlit)
   a `.page-shell`/`.container--page` capped at `--bp-wide` that centers the
   whole tool frame on ultrawide monitors. This is the token's own stated intent
   and retires its dangling status.

3. **Name the reading-measure cap as doctrine, not just an editorial carve.**
   `--editorial-measure: 66ch` is already correct for document surfaces; promote
   it from "the editorial mint" to "the document-surface measure rule," and
   sanction a **full-bleed escape** for tool surfaces (data grids, terminals,
   canvases) that must ignore the cap.

4. **Default card grids to `auto-fit minmax()` so column count grows without a
   breakpoint;** reserve the explicit `--bp-wide` step for *structural* changes
   (2-up → 3-up, reveal a third pane, sidebar density).

5. **Adopt container queries for components, media queries for the skeleton —
   as a forward stance, not a retrofit.** They're production-safe (93.3%,
   baseline since 2023). Seed `@container` thresholds from the same `--bp-*`
   tokens so there's still one source of truth. This is the highest-leverage
   item but also the largest authoring change; stage it.

**Open questions for Lane 1:** Should the page-shell cap be `--bp-wide` (1200px)
or a larger wide cap (1440px) so it only bites on genuinely-wide monitors? Is
the wide multi-column step worth a token, or is `auto-fit minmax()` enough that
`--bp-wide` only ever drives the page-shell cap? Does the full-bleed escape want
a utility class (`.full-bleed`) or stay a documented pattern?

## Sources

Fetched and used (claim count in parentheses); quality as rated by the research
harness. Spot-checked links are marked **[verified]**.

- [caniuse — CSS Container Queries (Size)](https://caniuse.com/css-container-queries) — *primary* (3) **[verified: 93.3%; Chrome/Edge 106, Safari 16.0, Firefox 110]**
- [Baymard — Line Length Readability](https://baymard.com/blog/line-length-readability) — *primary* (4) **[verified: 50–75 CPL; WCAG 1.4.8 ≤80; ~70ch/34em cap]**
- [LogRocket — CSS breakpoints for responsive design](https://blog.logrocket.com/css-breakpoints-responsive-design/) — *blog* (3)
- [LogRocket — Container queries in 2026](https://blog.logrocket.com/container-queries-2026/) — *blog* (5)
- [usuallycorrect.com — CSS Container Queries in 2026](https://usuallycorrect.com/blog/css-container-queries-2026) — *blog* (5)
- [martech.zone — Optimal Web Page Width](https://martech.zone/optimal-web-page-width/) — *secondary* (5)
- [UXPin — Optimal Line Length for Readability](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/) — *blog* (5)
- [CSS-Tricks — Optimizing for Large-Scale Displays](https://css-tricks.com/optimizing-large-scale-displays/) — *blog* (4)
- [CSS-Tricks — Full-Bleed Layout Using CSS Grid](https://css-tricks.com/full-bleed/) — *blog* (4)

**Method note.** This report was produced by the `deep-research` harness
(5 search angles → 19 sources fetched → 38 claims extracted). The harness's
adversarial-verification phase failed under rate limits (every verifier
abstained — votes recorded `0-0`, not genuine refutations), so the synthesis
relies on the extracted claims plus four manual `WebFetch` spot-checks of the
load-bearing claims (marked **[verified]** above). Several high-value sources
(Josh Comeau, Brad Frost, MUI, Carbon, Polaris) failed to fetch and are **not**
cited.
