# Semantic tokens vs. a numbered tonal ramp — why Artificer has no `--gold-100…800`

> Artificer names its gold by *role*, not by *step*. There is no `--gold-100 … --gold-800` ramp and never has been — the numbered-ramp idea was researched and consciously declined in favour of three semantic tokens. This doc records that decision and the evidence behind it, so the question doesn't get re-litigated from scratch.

**Date:** 2026-05-23
**Lane:** 3 (decision record) — the underlying token *values* are Lane 1; this only documents the existing state and the escalation path.

---

## The question

A numbered tonal ramp — `--gold-100`, `--gold-200`, … `--gold-800` — is the dominant pattern in modern systems (Tailwind, Material, Radix). It's reasonable to expect Artificer to have one. It doesn't.

Searching the repo (working tree, full `git --all` history, palette, `artificer.css`) returns **zero** numbered color tokens. What exists instead is a small set of semantic gold roles.

## What actually ships

Gold is expressed as **roles, capped at ~3 steps**, not a gradient (`src/artificer.css`, dark block ~L114–140; light block ~L199–202):

| Token | Dark | Role |
|---|---|---|
| `--accent` | `#dbbb6f` | Burnished gold — interactive text/icons |
| `--accent-bright` | — | Hover / focus accent |
| `--accent-fill` | `#c4932a` | Deep gold — button/badge/selection fill only |
| `--on-accent` | `#20203e` | Indigo text *on* a gold fill |

Light mode re-tunes the same roles (`--accent #7a5a10` at AA 5.33 on ivory, etc.). The role names are stable across modes; only the values shift. This is enforced by **Hard rule #1** in `CLAUDE.md`: *"Colors — always semantic, never raw."*

## Why semantic, not numbered

The numbered-ramp option was studied in the theme-foundations research (landed in PR #16) and the conclusion pointed away from it:

- **Numbered ramps earn their keep when you need many *UI-state* steps.** Radix ships 12 steps *because each step has an assigned job* — app bg, component bg, hover, pressed, three border tiers, two solid-fill states, two text tiers (`color-systems.md`, Radix section). That's a generative system solving a generative problem.
- **Artificer is a frozen, hand-authored palette, not a generative system.** Per `color-systems.md:208`: *"Frozen palettes … vs generative systems … solve different problems. Themes ship a finished point; systems ship rules."* And the highest-ROI moves it calls out are **semantic naming** and **tonal uniformity across hues** — not an algorithmic ramp.
- **Gold only plays ~3 jobs here.** Interactive, hover, and fill. An 8-step ramp would be five empty rungs — tokens whose only meaning is a number, which is exactly what Hard rule #1 forbids.
- **The hard part of a ramp is perceptual, and we sidestep it.** `color-space-math.md:17` notes you can't build clean lightness ramps by nudging HSL `L` (hue drifts); `:52` and `:241` explain that *OKLab* makes 5–7 step ramps viable. So a real `--gold-*` ramp would mean adopting an OKLab generation step — infrastructure Artificer doesn't need to paint three roles.

In short: a numbered ramp is the right tool for a *system that generates themes*. Artificer is *one theme*, tuned by hand, where semantic roles carry the meaning a number can't.

## When this would be worth revisiting

Reopen the question only if a real need for graduated steps appears — e.g. a data-viz surface needing a magnitude ramp (note that already exists as `--series-ramp-*` for charts, per `CLAUDE.md`), or a component library needing Radix-style interaction tiers across many hues. At that point it stops being "rename gold" and becomes "add a generative layer."

**Lane note.** Token *values* and *new semantic roles* are Lane 1 (`claude.ai/design`). Introducing a `--gold-*` ramp would be a new-token decision → escalate to Lane 1 (or file a Lane 3 → Lane 1 proposal). This doc is Lane 3 documenting the current state; it does not itself change the palette.

## Sources

Internal (this repo):

- `docs/research/color-systems.md` — Radix 12-step roles; Material 3 tonal palettes (13 tones); "frozen vs generative"; semantic naming as highest-ROI (L92, L198, L208).
- `docs/research/color-space-math.md` — HSL lightness-ramp failure (L17); OKLab 5–7 step ramps (L52, L241).
- `src/artificer.css` — the semantic gold tokens (`--accent`, `--accent-bright`, `--accent-fill`, `--on-accent`).
- `CLAUDE.md` — Hard rule #1 (semantic, never raw); Token cheatsheet; `--series-ramp-*` for chart magnitude.

External (the ramp models the research drew on):

- [Radix Colors — Understanding the Scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Material Design 3 — How the system works](https://m3.material.io/styles/color/system/how-the-system-works)
- [Tailwind CSS v4 Release Blog](https://tailwindcss.com/blog/tailwindcss-v4)
