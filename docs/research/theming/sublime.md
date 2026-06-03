# Theming Sublime Text
> The editor color scheme (`.sublime-color-scheme`) — a palette-routed simple target like Ghostty and VS Code, distinct from the heavier `.sublime-theme` UI chrome.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Sublime theming splits into two orthogonal artifacts, and only one of them is in Artificer's lane. A **color scheme** (`.sublime-color-scheme`, JSON) controls only the editor content area — syntax colors for code/markup/prose plus the editing-pane chrome: caret, selection, gutter, rulers, guides, diff bars, minimap border. A **UI theme** (`.sublime-theme`) controls the surrounding app chrome — sidebar, tabs, status bar, buttons, panels — and is a completely separate, far more involved format.

Artificer's pipeline targets the color scheme, because that is the palette-routed surface that behaves exactly like the other simple targets. Matching the full UI theme is a much larger, optional second effort that most users never need — the default Adaptive UI already follows the active color scheme's mood.

## Theme format

The modern format is `.sublime-color-scheme`: a single JSON document with four load-bearing keys.

- **`name`** / **`author`** — string metadata.
- **`variables`** — named color values, referenced elsewhere as CSS-style `var(name)`.
- **`globals`** — un-scoped editor-area settings (`background`, `foreground`, `caret`, `selection`, `gutter`, diff bars, and so on).
- **`rules`** — an array of `{scope, foreground, background, foreground_adjust, selection_foreground, font_style}` objects, matched against TextMate scopes.

It was introduced in ST3 build 3149, and every new feature lands here. The legacy format is `.tmTheme` — an Apple plist/XML document (`<dict>`/`<key>`/`<string>`) inherited from TextMate, frozen for backwards-compat only. The legacy form has no `var()`, no `color()` adjuster functions, no `blend()`. If you ever need to start from a `.tmTheme`, the command palette's **Convert Color Scheme** migrates it to the modern JSON.

The color model is the easy part: **hex in, hex out, zero conversion.** The format natively accepts seven-plus encodings — `#RRGGBB`, `#RGB`, `#RRGGBBAA`, `#RGBA`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `hwb()`, plus CSS named colors. Artificer's hex tokens drop straight into `variables`. Translucent variants don't need precomputing: the in-format `color()` mod function takes adjusters (`alpha()`/`a()`, `saturation()`/`s()`, `lightness()`/`l()`, `blend()`, `blenda()`, and `min-contrast(bg ratio)`), so one base token yields every tinted selection/highlight/guide color.

## Distribution

This is a **Category 1 (selector-file) target**, like the other simple themes. Ship full `.sublime-color-scheme` files; the file is the unit of distribution, dropped into `Packages/User/`, and the user selects it via Preferences → Select Color Scheme. No `@import`, no paste-templating for the scheme itself.

The one Category-3-flavored splice is a small `Preferences.sublime-settings` patch that wires OS-following light/dark — it merges into the user's existing settings JSON rather than replacing it.

- **Cameron's dotfiles:** symlink the two scheme files from the repo into `Packages/User/`, same hardlink/symlink pattern as the other simple targets.
- **Public reach:** Package Control, via a forked `package_control_channel` entry (label `"color scheme"`, semver git tags with `"tags": true`, and a `sublime_text` build selector).

Install paths:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Sublime Text/Packages/User/Artificer Dark.sublime-color-scheme` (and `…Light…`) |
| Linux | `~/.config/sublime-text/Packages/User/` |
| Windows | `%APPDATA%\Sublime Text\Packages\User\` |
| Preferences patch | `<Packages/User>/Preferences.sublime-settings` (`color_scheme: auto` + `dark_color_scheme`/`light_color_scheme`) |
| Package Control | fork of `github.com/sublimehq/package_control_channel` → `repository/a.json` |

## build.mjs integration sketch

The generator emits **two files** — one per variant — by running twice against the `dark` and `light` blocks of `_palette.json`. There is no single-file light/dark flag; the variants are wired at the app level instead (see the auto-wiring gotcha below).

1. **Top level** — `{ "name", "author", "variables": {}, "globals": {}, "rules": [] }`.
2. **`variables`** — a 1:1 dump of every Artificer hex token keyed by its semantic name (`"bg": "#1a1b21"`, `"fg"`, `"accent"`, `"success"`, plus syntax roles `"keyword"`, `"string"`, `"comment"`, `"type"`, `"function"`). Hex passes through verbatim — no conversion.
3. **`globals`** — map editor-chrome tokens onto the fixed global keys: `background: var(bg)`, `foreground: var(fg)`, `caret: var(accent)`, `selection: color(var(accent) alpha(0.30))`, `line_highlight: color(var(fg) alpha(0.06))`, `gutter: var(bg)`, `gutter_foreground: var(fg-secondary)`, `accent: var(accent)`, `find_highlight: var(attention)`, and the diff bars `line_diff_added/modified/deleted` = `success`/`attention`/`urgent`. Derive every translucent value with the `color(… alpha(x))` adjuster rather than minting separate tokens.
4. **`rules`** — one rule per syntax role, `{ "name", "scope", "foreground": "var(<role>)", "font_style"? }`. Map Artificer syntax tokens onto broad TextMate prefix scopes, ordered least-to-most-specific: `comment → comment`, `string → string`, `keyword → keyword`, `type → storage.type, entity.name.type`, `function → entity.name.function, support.function`, plus `constant.numeric`, `variable`, `entity.name.tag`. Use prefix scopes (the first one or two dotted labels), not syntax-specific tails.
5. **Variant wiring** — the install step injects `color_scheme: auto` plus `dark_color_scheme`/`light_color_scheme` into the user's `Preferences.sublime-settings` so ST follows the OS appearance.

## Gotchas

- **[verified]** Color-scheme rules resolve by scope-selector **specificity**, not document order — "last match wins" is false here. The most-specific matching selector wins, and equal-specificity selectors (e.g. two stacked `meta.*` scopes) produce an unresolvable tie where one color leaks onto the other token. People arriving from CSS, or from `.sublime-theme` (which *is* genuinely ordered last-wins), get this backwards. Confirmed by the official UI-theme docs, which state verbatim that a `.sublime-theme` "does not do specificity matching… Subsequent rules that match will override properties from previous rules" — the explicit contrast the claim draws — corroborated by sublimehq issue #2152 on `score_selector` specificity ([sublimetext.com/docs/themes.html](https://www.sublimetext.com/docs/themes.html)). One overstatement to ignore: the claim's "no descendant/child combinator" is wrong — `selectors.html` documents both a `>` child operator and space-separated descendant matching; the `meta.*` tie is from equal *scoring*, not absent combinators.

- **[unconfirmed]** A `background` global with non-zero alpha once hid the minimap viewport control behind the minimap body (regression ~build 4147, fixed in 4148; even a near-opaque `#23232301` triggered it, `#23232300` was the workaround). It's the canonical argument for keeping the `background` global fully opaque and tinting via separate keys. The upstream issue (#5796) documents every detail verbatim, and a second author independently hit the same symptom (#5818) — but both live on the same `github.com/sublimehq` tracker, and #5818 doesn't mention the alpha mechanism. **Missing:** an off-domain source (forum thread or blog) confirming the non-zero-alpha cause, so it falls short of the independent-second-source bar.

- **[verified]** Color schemes are referenced by **filename only**, never a package path, and any same-named file in `Packages/User/` silently merges into the base — `variables`/`globals` keys merge with the user copy overwriting, while `rules` are **appended**, not replaced. So a stray partial with the same basename layers onto the shipped scheme, and two same-basename files anywhere on the resource path collide. Confirmed independently on the Sublime forum by third-party dev FichteFoll: "create a file with the same name and the `.sublime-color-scheme` in your User folder… ST merges all color schemes with the same name in the usual order of precedence" ([forum.sublimetext.com/t/…/46285](https://forum.sublimetext.com/t/is-there-a-standard-way-to-extend-override-color-schemes/46285)). The mitigation — ship a unique basename — is a sound deduction from the documented merge behavior, not a directly-quoted warning.

- **[refuted]** *Claim was:* the `.sublime-color-scheme` must be strict JSON with **no comments**, or it silently fails to load. This is wrong. A Sublime developer (jps) states on the official forum that "Sublime Text's configuration files deviate from the JSON spec in a few ways, such as allowing trailing commas as well as comments," and the official color-scheme docs' own example uses a trailing comma — proof the loader is lenient ([forum.sublimetext.com/t/…/22989](https://forum.sublimetext.com/t/why-does-sublime-text-3-allow-comments-in-json-configuration-files/22989)). The real source of "comments not allowed" errors is a *schema validator / LSP-json language server*, not Sublime's own loader. A header comment from build.mjs will load fine in Sublime itself (though strict validators may complain, and GUI rewrites may strip it). Putting metadata in `name`/`author` is harmless but solves a non-problem. Note the cited origin (nordtheme PR #24) never actually makes this claim.

- **[verified]** There is **no light/dark flag inside one scheme file** — variants are two files wired at the app level via `color_scheme: auto` plus `dark_color_scheme`/`light_color_scheme` in `Preferences.sublime-settings`, with the parallel `theme: auto` / `dark_theme` / `light_theme` for the UI theme. An install that ships two files but forgets the Preferences patch leaves the user stuck on whichever single scheme was last selected. Confirmed by the official docs showing the working `{"color_scheme": "auto", "light_color_scheme": "Breakers…", "dark_color_scheme": "Mariana…"}` config, with the auto feature pinned to ST4 build 4095 via sublimehq issue #3236 ([sublimetext.com/docs/color_schemes.html](https://www.sublimetext.com/docs/color_schemes.html)).

- **[verified]** There is **no dedicated key for selection color as it renders on the minimap.** A scheme sets `selection`, `selection_border`, and `inactive_selection` for the text area, but minimap occurrence/selection marks render white-ish with no scheme control — so authors relying on an alpha selection color are surprised it "doesn't work" on the minimap. It's a missing key, not a bug in their file. The official color-scheme docs exhaustively list every key and contain only `minimap_border` (the viewport rectangle), with no minimap-selection key ([sublimetext.com/docs/color_schemes.html](https://www.sublimetext.com/docs/color_schemes.html)).

- **[verified]** Package Control requires **semver git tags** with `"tags": true`; branch-based releases are deprecated and rejected for new packages. Each release also needs a `sublime_text` build selector, the tag name must be valid semver, and you must strip `.pyc` files and any `package-metadata.json` before submitting; filenames must avoid the Windows-illegal characters `< > : " / \ | ? *`. Confirmed by the official Package Control site, which states "branch-based releases have been deprecated and no new packages will be accepted that utilize that feature," shows the `"tags": true` + build-selector config, and lists the exact illegal characters and cleanup steps ([packagecontrol.io/docs/submitting_a_package](https://packagecontrol.io/docs/submitting_a_package)). One sub-detail — that lightweight-vs-annotated tags don't matter — neither source positively addresses, but it's immaterial since the crawler reads tag names regardless of object type.

- **[unconfirmed]** `foreground_adjust` is only valid on a rule that **also sets `background`** — it adapts the inherited foreground against that background, and without a `background` on the same rule it is ignored, so a build.mjs that emits `foreground_adjust` on a background-less rule produces a silent no-op. The official docs state this plainly twice ("only valid with 'background'… It is only supported when the 'background' key is also specified"). **Missing:** an independent second source — both community docs (docs.sublimetext.io and the readthedocs "Unofficial Documentation") omit `foreground_adjust` entirely and defer to the official page, and every search hit paraphrases that one official source. Plausibly correct and matches the original wording, but uncorroborated.

## Tips & tricks

- Dump every Artificer hex token straight into `variables` and reference with `var(name)` — no color conversion; 6- and 8-digit hex both pass through.
- Derive all translucent colors (selection, `line_highlight`, indent guides, `minimap_border`) in-format with `color(var(token) alpha(0.x))` instead of precomputing tinted hexes in build.mjs — fewer tokens to maintain.
- Use the `min-contrast(var(bg) 4.5)` adjuster to enforce a WCAG AA floor on syntax foregrounds directly in the scheme, matching Artificer's contrast rule.
- Keep scopes to the first one or two dotted labels (prefix matching) so one rule paints across all syntaxes; reserve syntax-name tails for deliberate per-language overrides only.
- Map diff bars to Artificer status tokens via globals `line_diff_added/modified/deleted` = `success`/`attention`/`urgent` — the same semantic mapping used for the gitmux and lazygit targets.
- Ship a unique basename (`Artificer Dark`) to dodge the `Packages/User` same-filename merge trap, and use `.gitattributes export-ignore` to keep preview images out of the Package Control archive.

## Fit assessment

**Low-to-medium effort, worth adding.** The color scheme is a thin palette wrapper exactly like Ghostty, VS Code, and Claude Code — hex tokens flow into `variables` with zero conversion, and build.mjs only needs scope-role mapping plus a Preferences patch for auto light/dark. The UI theme (`.sublime-theme`) is the heavy part and should be deferred or skipped: most users keep the default Adaptive UI and swap only the color scheme. This fits the simple-target pattern cleanly.

## Where to get the authoritative docs

**Official spec / schema / API reference**

- Color scheme spec — globals, color formats, `color()` adjusters, `var()`, merge-by-filename: https://www.sublimetext.com/docs/color_schemes.html
- Legacy `.tmTheme` spec (the frozen plist format): https://www.sublimetext.com/docs/color_schemes_tmtheme.html
- UI theme spec — the *other* artifact, `.sublime-theme`: https://www.sublimetext.com/docs/themes.html
- Community docs — color-scheme customization + auto light/dark wiring: https://docs.sublimetext.io/guide/customization/color_schemes.html
- Package Control submission guide — tags, labels, cleanup: https://docs.sublimetext.io/guide/package-control/submitting.html

**Community themes to crib from**

- Nord (JSON migration PR — real `variables` + `globals` + `rules` source): https://github.com/nordtheme/sublime-text/pull/24
- Material Color Scheme (Package Control entry pattern): https://packagecontrol.io/packages/Material%20Color%20Scheme
- Solarized — `braver/Solarized`, a clean Package Control channel-entry example: https://packagecontrol.io/packages/Solarized%20Color%20Scheme

## Sources

- https://www.sublimetext.com/docs/color_schemes.html
- https://www.sublimetext.com/docs/color_schemes_tmtheme.html
- https://www.sublimetext.com/docs/themes.html
- https://docs.sublimetext.io/guide/customization/color_schemes.html
- https://docs.sublimetext.io/reference/color_schemes_legacy.html
- https://docs.sublimetext.io/guide/package-control/submitting.html
- https://docs.sublimetext.io/reference/package-control/repository.html
- https://github.com/sublimehq/sublime_text/issues/5796
- https://github.com/sublimehq/sublime_text/issues/5818
- https://github.com/sublimehq/sublime_text/issues/2152
- https://github.com/sublimehq/sublime_text/issues/3236
- https://forum.sublimetext.com/t/color-scheme-scope-specificity/34280
- https://forum.sublimetext.com/t/inactive-selection-border-selection-color-on-minimap/19348
- https://forum.sublimetext.com/t/is-there-a-standard-way-to-extend-override-color-schemes/46285
- https://forum.sublimetext.com/t/why-does-sublime-text-3-allow-comments-in-json-configuration-files/22989
- https://github.com/nordtheme/sublime-text/pull/24
- https://raw.githubusercontent.com/nordtheme/sublime-text/develop/Nord.sublime-color-scheme
- https://packagecontrol.io/packages/Material%20Color%20Scheme
- https://packagecontrol.io/docs/submitting_a_package
