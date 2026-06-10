# State of the System

> The maturity baseline. Re-assessed at each minor version; the thing to
> re-read when the system feels worse than it is (or better than it is).
> Born from the 2026-05-31 reassessment after mobile and wide-screen bugs
> shipped (`docs/plans/2026-05-31-trust-layer-and-maturity-baseline.md`).

**Last assessed:** 2026-06-09 · v0.15.x · trust layer landed; A1 conformance
gate + the Workstream-E mints shipped; the v0.15.0 review wave (#173–#197) is
being paid down by the hardening train

## The scale

The reference points: **Tailwind** hands you bricks (tokens, utilities — go
build). **Bootstrap** hands you rooms (prebuilt components — arrange them).
Artificer's target sits past both: **rooms, plus the materials to build a
custom room, plus the clay to take to a platform that doesn't exist yet.**

| Layer | Placement | What it means |
|---|---|---|
| **The clay** — decisions | ★★★★★ at target | Palette with measured ratios + versioned reasoning, 12 syntax roles, motion/spacing/focus rules, 8-platform generator. A new platform (iOS, VS Code 2.0, next thing) ingests `_palette.json` + `tokens.json` + the principles and starts from decisions, not from scratch. |
| **The materials** — tokens & utilities | ★★★★ | `.stack`/`.cluster`/`.grid-*`/`.container`, density modes, type scale, z-rungs, motion tokens. Solid; gaps are at the edges (no container queries — deliberate). |
| **The rooms** — components | ★★★★ | ~275 classes in the canonical sheet. Tables/forms/modals/data-display at Bootstrap parity or beyond; the v0.15.0 Workstream-E mints closed the old absent-list (option-popover `.menu`/`.listbox`, command palette, tree, pagination, banner, toast-region, `.stat`, the loading-feedback pair). Still absent: `.alert` in CSS (React-only), button groups, list groups, carousel (deliberately never). "Facade" rooms — style without behavior — are closed structurally: interactive mints ship behavior modules (focus, tabs, options, tree) and the A1 phantom/orphan gate makes doc-vs-CSS drift a red X. |
| **The trust** — verification | ★★★★ | Landed: Playwright matrix (pages × viewports × themes × engines), 44px touch floor, axe WCAG scan with a per-selector allowlist, keyboard behavior specs, named regression guards, the A1 conformance gate, and the export content gate. The named debt: rendered-contrast rulings beyond syntax roles (#122). |

## What the trust layer is

Two CI lanes (see README § Quality gates):

1. **Data gates** (`npm test` + `check:*`) — palette hexes, contrast math on
   syntax roles, version stamps, mirror parity. Zero dependencies, instant.
2. **Browser gates** (`npm run test:browser`) — live-spec pages loaded in
   Chromium + WebKit (Safari's engine — on iOS *every* browser is WebKit):
   no horizontal overflow, 44px touch floor, axe WCAG scan, keyboard behavior.

The principle: **the data gates check what the system says; the browser gates
check what it does.** Every bug class that shipped (overflow, style-only
components, sub-44px targets, unowned wide screens) now has a named test.

## Known gaps (the honest list)

**Component gaps (Bootstrap parity):** `.alert` in CSS (React-only),
button groups, list groups, carousel (deliberately never). *(Dropdown/
combobox and pagination shipped in v0.15.0 — `.menu`/`.listbox` and
`.pagination`.)*

**Verification gaps:** rendered-contrast rulings beyond syntax roles (#122 —
the axe sweep's palette findings await the palette ruling; tracked per-selector
in `tests/axe-allowlist.mjs`, every entry owned by that issue).

**Latent findings filed:** #122 (palette contrast rulings); the
v0.15.0 six-lens review filed #173–#197 (2 P0 a11y, 9 P1), being paid down by
the v0.15.x hardening train.

**Portability gaps (acceptable):** component behavior specs are CSS-encoded,
not platform-neutral; a native port re-implements components from the
live-spec reference (~70% of port effort, inherent to platform porting).

## Backlog policy

The trust gate the old pause waited for is **operative** — this is now the
shipping pathway, not a freeze: a new component arrives through
the mint process, lands with the suite verifying it on arrival (overflow, touch,
axe, keyboard), and the A1 conformance gate keeps its docs honest. The
v0.15.0 Workstream-E mints (9 components) shipped through exactly this
pathway. `triage:promote` items are worked through it in mint batches; the
owner may still escalate specific items — his call, logged when it happens.

Rationale unchanged: a room that ships without verification is the exact
pattern that produced the bugs that prompted this baseline. The gate didn't
lift — it became the road.

## Update cadence

Re-assess and update this file at each **minor** version (palette/value
changes), or when a layer's placement materially changes. The placement table
should never silently disagree with reality — if it does, fixing this file is
part of the PR that changed reality.
