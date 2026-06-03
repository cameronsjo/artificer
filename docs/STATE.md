# State of the System

> The maturity baseline. Re-assessed at each minor version; the thing to
> re-read when the system feels worse than it is (or better than it is).
> Born from the 2026-05-31 reassessment after mobile and wide-screen bugs
> shipped (`docs/plans/2026-05-31-trust-layer-and-maturity-baseline.md`).

**Last assessed:** 2026-05-31 · v0.12.x · trust layer T1–T2 landed, T3–T4 in flight

## The scale

The reference points: **Tailwind** hands you bricks (tokens, utilities — go
build). **Bootstrap** hands you rooms (prebuilt components — arrange them).
Artificer's target sits past both: **rooms, plus the materials to build a
custom room, plus the clay to take to a platform that doesn't exist yet.**

| Layer | Placement | What it means |
|---|---|---|
| **The clay** — decisions | ★★★★★ at target | Palette with measured ratios + versioned reasoning, 12 syntax roles, motion/spacing/focus rules, 8-platform generator. A new platform (iOS, VS Code 2.0, next thing) ingests `_palette.json` + `tokens.json` + the principles and starts from decisions, not from scratch. |
| **The materials** — tokens & utilities | ★★★★ | `.stack`/`.cluster`/`.grid-*`/`.container`, density modes, type scale, z-rungs, motion tokens. Solid; gaps are at the edges (no container queries — deliberate). |
| **The rooms** — components | ★★★½ | ~165 class families. Tables/forms/modals/data-display at Bootstrap parity or beyond. Known absent: dropdown/combobox, pagination, alerts-as-CSS, button groups, list groups (see § Gaps). History of "facade" rooms — style without behavior — now closed by the trust layer. |
| **The trust** — verification | ★★ → ★★★★ in flight | Was: 100% data gates, zero behavioral coverage (the root cause of every shipped mobile/wide-screen bug). Now: Playwright matrix (pages × viewports × themes × engines) + touch + axe gates landing as PRs #119/#121/T3/T4. |

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

**Component gaps (Bootstrap parity):** dropdown/combobox (deferred for the
unified option-popover design), pagination, `.alert` in CSS (React-only),
button groups, list groups, carousel (deliberately never).

**Verification gaps (closing in T3/T4):** rendered-contrast coverage beyond
syntax roles (#122 — first axe sweep found light-mode primary-CTA contrast
failure), keyboard behavior on shipped JS, the 5 named regression guards.

**Latent findings filed:** #120 (`.tabs` has no narrow-width overflow answer),
#122 (palette contrast rulings).

**Portability gaps (acceptable):** component behavior specs are CSS-encoded,
not platform-neutral; a native port re-implements components from the
live-spec reference (~70% of port effort, inherent to platform porting).

## Backlog policy

The `triage:promote` backlog (~22 issues — rooms consumers asked for) is
**paused behind the trust gate**: no new component ships until the suite can
verify it (overflow, touch, axe, keyboard) on arrival. The owner may escalate
specific items past the pause — that's his call, logged when it happens.

Rationale: every paused issue is a room that would have shipped without
verification, which is the exact pattern that produced the bugs that prompted
this baseline.

## Update cadence

Re-assess and update this file at each **minor** version (palette/value
changes), or when a layer's placement materially changes. The placement table
should never silently disagree with reality — if it does, fixing this file is
part of the PR that changed reality.
