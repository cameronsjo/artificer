# Theming iTerm2
> The 16-color ANSI palette plus special roles (foreground, background, cursor, selection) for terminal content — distributed as an `.itermcolors` plist preset or a Dynamic Profile JSON.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

iTerm2 theming touches terminal **content** colors only — the 16 ANSI palette plus special roles (foreground, background, bold, cursor, cursor text, cursor guide, selection, selected text). It does not theme app chrome (tab bar, title bar) beyond an optional Tab Color, and it is not a syntax highlighter — syntax color comes from whatever runs inside the terminal (vim, bat, ls) consuming the ANSI palette. A theme is distributed as an `.itermcolors` plist preset (GUI-imported) or as a Dynamic Profile JSON (auto-loaded from a watched directory). The core abstraction leak is color **space**: values are 0..1 NSColor components that mean nothing without a declared sRGB/Calibrated/P3 space.

## Theme format

There are two related formats.

**`.itermcolors`** is an Apple XML property list (plist) with the standard `<?xml?>` header and `<!DOCTYPE plist PUBLIC ...Apple//DTD PLIST 1.0...>` doctype, a root `<plist><dict>` holding up to ~23 color keys. Each key maps to a `<dict>` of `<real>` component values plus an optional `<string>` Color Space.

**Dynamic Profiles** are JSON with a top-level `{"Profiles":[ {...} ]}` array. Each profile object carries `Name`, `Guid`, optional `Dynamic Profile Parent Name`/`GUID`, and the same color keys as JSON objects of component floats.

The color model is the trap. Each color is **NSColor components as 0..1 floats, not hex**: a dict with `Red Component`, `Green Component`, `Blue Component`, and usually `Alpha Component` (= 1), each a `<real>` in `[0.0, 1.0]`. A sibling `Color Space` string key declares the space — `sRGB` (what hex maps to), `Calibrated` (legacy Apple Generic RGB), or `P3` (wide gamut). Converting Artificer hex: strip `#`, split into RR/GG/BB, `parseInt(base16)/255` → float, at **full precision** (e.g. `0.21176470588235294`, not rounded). Because hex is an sRGB concept, the dict **must** carry `Color Space: sRGB` or the values are misinterpreted.

Color key names: `Ansi 0 Color` … `Ansi 15 Color`, `Foreground Color`, `Background Color`, `Bold Color`, `Cursor Color`, `Cursor Text Color`, `Cursor Guide Color`, `Selection Color`, `Selected Text Color`. (Link/Badge/Tab/Underline colors exist in the app but are rarely in shared presets.)

## Distribution

Two shapes, mapping cleanly onto Artificer's distribution lanes.

**Cat 1 (full-file install):** `.itermcolors` presets are complete files the user imports through the GUI — Settings → Profiles → Colors → Color Presets → Import. This is the canonical, shareable form and matches Artificer's "theme primitive" lane.

**Cat 3 (templating/headless):** a Dynamic Profile JSON dropped into the watched DynamicProfiles directory via chezmoi templating, which iTerm2 auto-reloads with no GUI step — ideal for Cameron's headless/self-hosted setup.

There is **no `@import`/include mechanism**, so no true Cat 2. Symlinking works for the Dynamic Profile JSON because that directory is watched live; the `.itermcolors` preset cannot be symlinked into effect — it must be imported into the app's prefs.

Light/dark ships as **two files** — `Artificer-Dark.itermcolors` and `Artificer-Light.itermcolors`, each a complete standalone preset. iTerm2 3.x can hold separate light/dark sets on one profile that auto-follow the macOS appearance, but the `.itermcolors` format itself encodes only one set, so two files stay the cleanest distribution.

Install paths:

- `~/Library/Application Support/iTerm2/DynamicProfiles/` — watched directory; JSON dropped here is auto-loaded/reloaded live (primary headless install).
- Settings → Profiles → Colors → Color Presets → Import… — GUI import target for `.itermcolors` presets (no fixed on-disk path).
- `~/Library/Preferences/com.googlecode.iterm2.plist` — where imported presets ultimately live inside iTerm2 prefs.
- Artificer repo source: `themes/` + `themes/build.mjs` emits the two `.itermcolors` files and an optional DynamicProfiles JSON.

## build.mjs integration sketch

An iTerm2 generator reads `themes/_palette.json` semantic tokens (hex) and emits **two artifacts per variant**.

**(1) `.itermcolors` plist (primary):** build a JS object keyed by the 23 iTerm color names, then serialize to XML plist. Semantic → iTerm mapping:

- `bg` → Background Color; `fg` → Foreground Color
- `accent` → Cursor Color (optionally Cursor Guide Color at low alpha); `on-accent`/`bg` → Cursor Text Color
- a selection-tint of `bg`/`accent` → Selection Color; `fg` → Selected Text Color
- `fg` or a bold-bright `fg` → Bold Color
- ANSI block: comment-or-bg-tint → Ansi 0 (black), `urgent` → Ansi 1 (red), `success` → Ansi 2 (green), `attention` → Ansi 3 (yellow), a blue token → Ansi 4, keyword/magenta → Ansi 5, string-or-cyan → Ansi 6, fg-dim → Ansi 7 (white); Ansi 8–15 = brightened variants.

For each color: hex → `{Red,Green,Blue}` = `parseInt(channel,16)/255` as full-precision floats; `Alpha Component` = 1; **always** emit `Color Space: sRGB`.

**(2) Dynamic Profile JSON (optional convenience):** same 23 keys as a single JSON file with a stable `Guid` (uuidv5 from the theme name, so it's deterministic across rebuilds), `Name`, and identical component dicts with `"Color Space":"sRGB"`. The only difference from the plist is the envelope (XML vs JSON).

A shared **`hexToComponents(hex)`** helper is the single conversion seam, reused by both outputs. The 16-color ANSI block is identical to what a Ghostty/kitty generator needs, so factor the semantic→ANSI map into a shared module.

## Gotchas

- **[verified]** Omitting the `Color Space` key silently falls back to **Calibrated (Apple Generic RGB), not sRGB** — every color shifts. iTerm originally stored colors in `NSCalibratedRGBColorSpace`; sRGB support was added later, but for backward compat a dict with no Color Space key decodes as Calibrated. A generator emitting raw hex→float components without `Color Space: sRGB` produces a subtly wrong (often dimmer/shifted) theme. Confirmed independently by [mbadolato/iTerm2-Color-Schemes issue #106](https://github.com/mbadolato/iTerm2-Color-Schemes/issues/106), which cites the `ayu.termcolors` case where a sRGB-authored Sublime theme mismatches because iTerm's default is Generic RGB — "this includes the background color which is very noticeable." (One nuance: the runtime `it2setcolor` CLI defaults to sRGB, unlike the file format — but the claim is about file dicts, where the Calibrated fallback holds.)

- **[verified]** Tagging sRGB-derived components as `P3` washes the theme out — hex is an sRGB concept. Hex÷255 yields sRGB values; declaring `Color Space: P3` makes iTerm read those same numbers in the wider Display P3 gamut, stretching them into desaturated colors. Always emit `sRGB` for hex-sourced palettes. Confirmed by [mbadolato/iTerm2-Color-Schemes issue #539](https://github.com/mbadolato/iTerm2-Color-Schemes/issues/539) (different author/domain), which states "the existing presets use the color space sRGB while the newly saved ones use P3" and confirms identical numeric values are interpreted per the declared space. (Nuance: #539's immediate symptom is a tool-parsing crash, but it independently confirms the value/color-space decoupling and the sRGB-vs-P3 default mismatch.)

- **[verified]** The `Minimum Contrast` profile setting overrides the theme — at 100 all text is pure black/white. It's a per-profile slider, independent of the imported preset, that shifts text toward black/white when too close to the background. A user importing an Artificer preset onto a profile with nonzero Minimum Contrast sees wrong colors that aren't the theme's fault. Same applies to `Cursor Boost`, which dims everything except the cursor. Confirmed verbatim by the [official iTerm2 Colors preferences docs](https://iterm2.com/3.5/documentation-preferences-profiles-colors.html): "At 100, all text will be pure black or pure white. Minimum contrast never modifies background colors," and "Cursor Boost dims all colors other than the cursor colors." Document setting both to 0.

- **[verified]** Importing an `.itermcolors` preset does **not** appear in the Color Presets dropdown until iTerm2 is fully quit and restarted. The list in an already-open Preferences window doesn't refresh after import, so users assume the import failed. Confirmed by the [mbadolato/iTerm2-Color-Schemes README](https://github.com/mbadolato/iTerm2-Color-Schemes/blob/master/README.md) (different domain/author), which instructs for both GUI and script import: "Restart iTerm 2. (Need to quit iTerm 2 to reload the configuration file.)"

- **[verified]** Importing a preset does not **apply** it, and it applies to the **selected profile only**. After import you must explicitly select the preset from the dropdown, and ensure you're editing the profile your session actually uses (not Default). Users report clicking the preset "does nothing" because they're editing the wrong profile. Confirmed by the [TerminalColors tutorial](https://terminalcolors.com/tutorials/how-to-change-iterm2-color-scheme/) (independent domain), which documents import and apply as separate steps and notes "Select the profile you want to update."

- **[verified]** Dynamic Profile colors must be **component-dict objects, not hex strings**. The JSON looks like it should accept `"Foreground Color": "#ff0000"`, but iTerm requires the full `{Red/Green/Blue/Alpha Component, Color Space}` object; hex strings are silently ignored. Confirmed by [joshjohanning/dotfiles iterm2-profile.json](https://github.com/joshjohanning/dotfiles/blob/main/iterm2-profile.json), a real-world dynamic profile where `Foreground Color` is a component dict (`{"Red Component": 0.933..., "Color Space": "sRGB", ...}`), never a hex string.

- **[unconfirmed]** GUI edits to a Dynamic Profile do **not** write back to the JSON file — and each profile requires both `Name` and `Guid`. The Name+Guid half **is** independently confirmed (Shrey Banga's blog instructs `uuidgen` per profile and gives each a `Name` and `Guid`; iTerm source strings warn on missing/duplicate Guid or missing Name) — see [shreyb.dev](https://shreyb.dev/blog/2020/03/02/little-known-features-of-iterm2.html). But the load-bearing one-way assertion (Settings-UI edits never persist to the file) appears **only in the official iTerm2 docs** — no independent author corroborates it, and the docs themselves document a `"Rewritable": true` opt-in that *does* write edits back. So "GUI edits don't write back" holds only by default and is explicitly overridable; the compound claim lacks a second independent source.

## Tips & tricks

- Reuse one `hexToComponents(hex)` helper for both the plist and the Dynamic Profile JSON — the only difference is the XML vs JSON envelope, not the color math.
- Factor the semantic-token → 16-ANSI mapping into a shared module: it's identical to what a Ghostty/kitty/Alacritty generator needs, so Artificer's terminal targets can share the ANSI block.
- Ship both `.itermcolors` (GUI/shareable) **and** a Dynamic Profile JSON (headless, chezmoi-templated into the watched DynamicProfiles dir) — the JSON path auto-reloads with no GUI step, fitting the headless setup.
- Derive the Dynamic Profile `Guid` deterministically (uuidv5 from theme name) so rebuilds are idempotent and don't spawn duplicate or orphaned profiles.
- Emit full-precision floats (`channel/255`), not rounded — community schemes use values like `0.21176470588235294`; rounding introduces drift.
- Always write `Alpha Component: 1` and `Color Space: sRGB` on every color dict; never rely on the Calibrated fallback.
- `mbadolato/iTerm2-Color-Schemes` already has 450+ presets and a Ghostty port — crib their exact plist structure and consider contributing the Artificer preset upstream.
- Document the user-side traps in the README: set Minimum Contrast = 0 and Cursor Boost = 0, restart iTerm2 after import, and apply to the active profile.

## Fit assessment

**Low-to-medium effort, high fit — worth adding to the Artificer pipeline.** The plist/JSON emit is a thin serialization layer over the same hex→float + semantic→ANSI mapping the existing Ghostty target already needs, so most logic is reusable; the only iTerm-specific work is the XML plist envelope and the sRGB/Guid discipline. iTerm2 is a mainstream macOS terminal and the `.itermcolors` format is widely shareable, so it extends Artificer's terminal coverage cheaply.

## Where to get the authoritative docs

**Official spec/schema/API:**

- Colors preferences doc — https://iterm2.com/documentation-preferences-profiles-colors.html
- Dynamic Profiles doc (path, Guid/Name, parent inheritance) — https://iterm2.com/documentation-dynamic-profiles.html
- sRGB support PR (the Calibrated fallback origin) — https://github.com/gnachman/iTerm2/pull/149
- Python API Profile reference (full color property list) — https://iterm2.com/python-api/profile.html

**Community themes to crib from:**

- mbadolato/iTerm2-Color-Schemes (450+ real `.itermcolors` sources + Ghostty ports) — https://github.com/mbadolato/iTerm2-Color-Schemes
- Dracula.itermcolors (modern preset *with* Color Space + Cursor Guide) — https://raw.githubusercontent.com/mbadolato/iTerm2-Color-Schemes/master/schemes/Dracula.itermcolors
- Homebrew.itermcolors (legacy preset with *no* Color Space key — the Calibrated-fallback cautionary case) — https://raw.githubusercontent.com/mbadolato/iTerm2-Color-Schemes/master/schemes/Homebrew.itermcolors

## Sources

- https://iterm2.com/documentation-preferences-profiles-colors.html
- https://iterm2.com/documentation-dynamic-profiles.html
- https://github.com/gnachman/iTerm2/pull/149
- https://iterm2.com/python-api/profile.html
- https://github.com/mbadolato/iTerm2-Color-Schemes
- https://raw.githubusercontent.com/mbadolato/iTerm2-Color-Schemes/master/schemes/Homebrew.itermcolors
- https://raw.githubusercontent.com/mbadolato/iTerm2-Color-Schemes/master/schemes/Dracula.itermcolors
- https://gitlab.com/gnachman/iterm2/-/issues/2575
- https://github.com/mbadolato/iTerm2-Color-Schemes/issues/66
- https://github.com/mbadolato/iTerm2-Color-Schemes/issues/106
- https://github.com/mbadolato/iTerm2-Color-Schemes/issues/539
- https://cjohanaja.com/blog/iterm-color-fixes/
- https://iterm2.com/3.5/documentation-preferences-profiles-colors.html
- https://terminalcolors.com/tutorials/how-to-change-iterm2-color-scheme/
- https://gitlab.com/gnachman/iterm2/issues/5917
- https://github.com/joshjohanning/dotfiles/blob/main/iterm2-profile.json
- https://shreyb.dev/blog/2020/03/02/little-known-features-of-iterm2.html
- https://github.com/nyem69/iterm2-profile-editor
- https://iterm2.com/documentation-utilities.html
