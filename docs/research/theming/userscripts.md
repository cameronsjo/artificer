# Theming Userscript managers (Tampermonkey / Violentmonkey / Userscripts)
> Reskinning arbitrary web pages by injecting a CSS stylesheet via a JS userscript — per-site, not a global app theme.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Userscript managers don't have a theme format. They inject CSS via JavaScript into arbitrary web pages, so "theming" here means writing a userscript that adds a stylesheet to a target site. This touches the **content** lane — the page's own DOM and chrome — and, on developer-facing sites, the **syntax-highlighting** classes too. It is per-site, not a global application theme like Ghostty or VS Code.

The same script can target all four managers (Tampermonkey, Violentmonkey, Greasemonkey, Safari's Userscripts app), but each has subtly different `@grant`, sandbox, and injection-scope semantics — and those differences leak into whether your CSS actually lands. The bulk of the friction documented below is exactly that: the theme payload is trivial, the cross-manager delivery is not.

## Theme format

The unit is a JavaScript file (`*.user.js`) with a leading `==UserScript== … ==/UserScript==` metadata comment block — `@name`, `@match`/`@include`, `@version`, `@run-at`, `@grant`, `@resource`, `@require`, `@downloadURL`/`@updateURL`, plus Violentmonkey/Safari-specific `@inject-into`. The body is JS that injects CSS, either inline as a string via `GM_addStyle()` (or a manual `<style>` element) or pulled from an external file via `@resource` + `GM_getResourceText()`.

There is **no dedicated theme schema** — the theme *is* code. An optional companion is a plain `.css` file, used directly by Safari's Userscripts app or hosted and referenced via `@resource`.

**Color model:** native CSS color throughout — hex (`#rrggbb`), hex+alpha (`#rrggbbaa`), `rgb()`/`rgba()`, `hsl()`, and on modern engines `oklch()`/`light-dark()`. Artificer's hex tokens require **no conversion**: they drop straight into custom properties on `:root`. The one caveat is `light-dark()` — only Baseline "newly available" as of May 2024, not "widely available" until late 2026 — so prefer explicit `prefers-color-scheme` + a `data-theme` attribute over `light-dark()` for older or embedded browser contexts.

**Light/dark:** one file, two custom-property blocks. Default to OS preference via `@media (prefers-color-scheme: dark)` scoped to `:root:not([data-art-theme])`, and let an explicit `data-art-theme="dark|light"` attribute on `documentElement` override it. Persist the explicit choice with `GM_setValue`/`GM_getValue` (per-script storage, survives page loads, shared across `@match`'d tabs) and expose a toggle via `GM_registerMenuCommand` — userscript managers can't reliably bind a global hotkey, so the menu command is the portable affordance even though the Artificer keymap nominally wants `⌘⇧L`. Resolve order: saved value > system preference > dark default. Set the attribute and inject the `<style>` at `@run-at document-start` to minimize flash-of-wrong-theme.

## Distribution

This is primarily a **Category 3** (paste/templating) target with a Category 1 flavor available. There is no `@import`/include mechanism a host config pulls in — the unit of distribution is a complete `.user.js` file the user installs into their manager. Artificer ships the generated `.user.js` into the repo; users install by opening the raw URL (managers intercept `*.user.js` and show an install prompt) or by drag-drop.

For Cameron's chezmoi-first model this is closest to a **Category 1 selector-file**: the generated file is symlinked or copied into the manager's import flow, not spliced into another config. The real distribution channel is **auto-update** — `@version` plus `@downloadURL`/`@updateURL` pointing at the raw repo file (GitHub raw or `git.example.com` raw) lets the manager poll and pull new palette versions.

**Safari's Userscripts app is the exception.** It watches a user-chosen directory of `.js`/`.css` files (set in the app's settings — e.g. `~/Library/…/Userscripts` or an iCloud folder), so there a plain `.css` file with no metadata and no GM API is the simplest install. On Tampermonkey/Violentmonkey/Greasemonkey the script lives in the extension's IndexedDB, not on the filesystem — there's no path to symlink.

## build.mjs integration sketch

A userscript theme is not a declarative theme file but a JS-injected stylesheet, so `build.mjs` would emit a single self-contained `.user.js` (or a `.css` payload plus a thin `.user.js` loader). Mapping from `_palette.json`:

1. **Serialize tokens.** For each variant, emit a CSS custom-property block keeping the exact semantic role names so authors recognize them: `:root{--art-bg:#…;--art-fg:#…;--art-accent:#…;--art-success:#…;--art-keyword:#…; …}`.
2. **Wrap both variants.** `:root[data-art-theme=dark]{…}` and `:root[data-art-theme=light]{…}`, plus a `@media (prefers-color-scheme: dark) :root:not([data-art-theme]){…}` default.
3. **Concatenate the site-restyle rules** that consume those vars — the actual restyle of the target site's chrome/content/syntax DOM classes — below the token block.
4. **Emit the metadata header** from build config: `@name Artificer (<site>)`, `@version` synced to the palette version, `@match`/`@include` per target, `@run-at document-start`, `@grant GM_addStyle GM_getValue GM_setValue GM_registerMenuCommand`, plus `@downloadURL`/`@updateURL` at the raw repo file.

The build either inlines the CSS as a template string passed to a head-readiness-guarded `addStyle()` helper, or — for the `@resource` variant — hosts the generated `.css` and references it via `@resource artCss <url>?v=<version>` + `GM_getResourceText`. Hex tokens pass through verbatim; this is the web platform, so hex / hex+alpha / `rgb()` are all native values and no color-model conversion is needed.

## Gotchas

- **[verified]** `@grant none` removes the GM APIs entirely — calling `GM_addStyle` then throws *"GM_addStyle is not defined."* The script runs in page scope with no `GM_*` methods, so theme scripts must declare `@grant GM_addStyle` (and any of `GM_getResourceText`/`GM_getValue` they use) explicitly. Confirmed by Violentmonkey's official GM API docs (*"Sandboxing is enabled by default and disabled only if @grant none is specified, just like in Tampermonkey"* — https://violentmonkey.github.io/api/gm/), independent of the original Greasemonkey issue. The historical Greasemonkey bug where flipping `@grant none`→`@grant GM_addStyle` didn't take effect until uninstall/reinstall is also corroborated.

- **[verified]** `@resource` CSS is cached by URL and never re-fetched when the file content changes but the URL stays the same. Managers key the resource cache on the full URL, so editing the remote CSS doesn't propagate. The fix is a `?v=<version>` cache-buster on the `@resource` URL, bumped alongside `@version`. Confirmed by xjavascript.com (*"Userscript managers cache based on the full URL… changing the query parameter tricks the manager into treating it as a new file"* — https://www.xjavascript.com/blog/how-do-i-prevent-require-from-caching-external-js-scripts/), with the Greasemonkey wiki corroborating the same URL-keyed behavior. Nuance: in current Tampermonkey a `@version` bump plus reinstall generally *does* re-fetch, so that sub-detail is weaker than the solidly-verified URL-keyed core.

- **[verified]** At `@run-at document-start`, `GM_addStyle` returns null and applies no styles because `<head>` doesn't exist yet — it appends a `<style>` to `document.head`, which (along with `documentElement` sometimes) is null that early, so the call fails silently and only "works" intermittently when the site is slow enough that head already exists. Robust fix: append to `document.head || document.documentElement`, guarded by a retry/observer until the node appears. Confirmed by the greasemonkey-users thread *"GM_addStyle() with @run-at document-start fails silently"* (separate authors — https://groups.google.com/g/greasemonkey-users/c/rx2xc6HI2us), with Greasemonkey issues #2515/#2996 corroborating the null-documentElement detail.

- **[verified]** In Safari's Userscripts app, requesting any `@grant` forces injection into **content scope** (all GM methods available) and `@grant none` forces **page scope** (no GM methods) — you can't have both GM APIs and page-scope access. If a CSP blocks page-scope scripts, it auto-falls back to content. Independently reproduced in the wild by Vendicated/Vencord issue #1417 (https://github.com/Vendicated/Vencord/issues/1417), where Userscripts logged *"@inject-into value set to 'content' due to @grant values"* and the script then failed with *"Can't find variable: unsafeWindow."* Caveat: the specific CSP auto-fallback sub-detail is documented only in the quoid sources, not the independent one.

- **[verified]** Synchronous `GM_addStyle` was outright broken in Safari Userscripts 4.4.3 — only the promise-based `GM.addStyle` worked. Cross-manager theme scripts should prefer `GM.addStyle` on Safari or feature-detect, since the `GM.*` (dot, Greasemonkey-4 namespace) and `GM_*` (underscore) families are not interchangeable. Greasespot — Greasemonkey's official blog, fully independent — confirms the load-bearing architecture: GM4's `GM.*` APIs are Promise-based/async while legacy `GM_*` are synchronous, and GM4 initially shipped with *no* `GM_addStyle` at all (https://www.greasespot.net/2017/09/greasemonkey-4-for-script-authors.html). **Caveat:** the exact *"broken in 4.4.3"* version-specific regression remains single-sourced to quoid/userscripts issue #530 — the cross-manager guidance is verified, but that precise failure mode is plausible-but-not-independently-confirmed.

- **[verified]** On strict-CSP sites, manually-injected inline `<style>`/`<script>` get blocked; you must use `GM_addStyle` (privileged) to bypass — but Safari can't bypass CSP at all. `@grant none` + hand-rolled `createElement('style')` works on lax sites and is killed by CSP; `GM_addStyle` injects from the extension's privileged context and survives most CSPs on Tampermonkey/Violentmonkey. Confirmed by Apple's own developer forums, where a Frameworks Engineer states *"The page CSP does not apply to content scripts, which run in their own world"* and a developer shows script injection that works on Chrome/Firefox failing on Safari (https://developer.apple.com/forums/thread/651542); Tampermonkey issue #296 corroborates that the Safari build lacks the CSP-bypass option other browsers have.

- **[verified]** Without a `@version` (and matching `@downloadURL`/`@updateURL`), the manager never auto-updates the script — palette changes won't propagate. `@version` must start with a number, and managers only check when a version is present and the remote version is higher. Confirmed by Tampermonkey's official docs listing `@version`/`@updateURL`/`@downloadURL` as the update-control directives, plus Tampermonkey issue #527 (independent of the Violentmonkey original — https://github.com/Tampermonkey/tampermonkey/issues/527) reproducing the exact failure: both URLs set to a GitHub raw URL, `@version` bumped, raw link updated, yet no auto-update — fixed by a `?v=…` cache-buster against GitHub's raw-URL caching. The one sub-detail not independently quotable verbatim is *"@version must start with a number,"* though it's consistent with documented SemVer comparison.

- **[verified]** Default (no `@grant` line at all) is now a minimal sandbox, not legacy page-context — Violentmonkey changed this in 2.32.0 to match Tampermonkey. Previously, omitting `@grant` implied `@grant none` (page context); now absent `@grant` means a minimal sandbox exposing only `GM_info`/`GM.info`/`unsafeWindow`, so a theme script that relied on implicit page access can break after a manager update — be explicit. Confirmed by Violentmonkey issue #632 documenting the prior implicit-`@grant none` behavior and the Tampermonkey divergence (https://github.com/violentmonkey/violentmonkey/issues/632), with issue #2404 demonstrating the breakage. Nuance: the exact version (2.32.0) and the precise exposed-API list rest on first-party docs alone, but the substance and direction are independently confirmed.

## Tips & tricks

- **Prefer the inline-CSS pattern** — build emits the whole stylesheet as a JS template string — over `@resource`. It sidesteps the URL-keyed resource-cache staleness gotcha entirely and makes the `.user.js` fully self-contained for auto-update.
- **Emit custom properties on `:root` and have the site-restyle rules consume `var(--art-*)`.** A palette bump then only changes the token block; per-site selectors stay stable, and advanced users can override a single token without touching the rest.
- **Ship a tiny cross-manager `addStyle()` helper** that tries `GM_addStyle`, falls back to `GM.addStyle` (Safari), then to a head-readiness-guarded manual `<style>` — one function covering Tampermonkey/Violentmonkey/Greasemonkey/Safari plus CSP and document-start.
- **Use `GM_registerMenuCommand` for the dark/light toggle** instead of a fixed-position button — it's the portable affordance across all four managers and doesn't pollute the host page's DOM.
- **Persist the toggle with `GM_setValue`/`GM_getValue`** (per-script, cross-tab) rather than the page's `localStorage`, so the choice survives across every `@match`'d site and isn't wiped when the host clears its own storage.
- **For Safari, also ship a plain `.css` sibling** with no metadata — the Userscripts app loads `.css` natively with zero GM API, dodging the broken-`GM_addStyle` and CSP issues for static themes.
- **Always append `?v=<palette-version>`** to any `@resource`/`@require`/`@downloadURL` raw URL and bump it on release — it's the only reliable defeat of both the manager's resource cache and the browser HTTP cache.

## Fit assessment

Low-to-medium effort, worth adding. The build is just CSS-string emission wrapped in a stable `.user.js` template plus a metadata header — Artificer already produces palette-routed CSS, so this reuses it almost verbatim with no color conversion. The real cost is **per-site selector authoring**: deciding what DOM gets restyled is target-specific and not generalizable from the palette alone.

Best fit: ship one generic *CSS-variable bridge* userscript **per target site Cameron actually wants reskinned**, generated from `_palette.json`, rather than chasing a universal theme. The token block is free; the selectors are the work, and they only exist where there's a concrete site to restyle.

## Where to get the authoritative docs

**Official specs / API references**

- Violentmonkey — Metadata Block spec: https://violentmonkey.github.io/api/metadata-block/
- Violentmonkey — Privileged GM APIs (`GM_addStyle`/`GM_getResourceText`/`GM_setValue`): https://violentmonkey.github.io/api/gm/
- Tampermonkey — official documentation: https://www.tampermonkey.net/documentation.php?locale=en
- quoid/userscripts (Safari) — README + `@grant`/`@inject-into` docs: https://github.com/quoid/userscripts/blob/main/README.md
- Greasemonkey — `GM_addStyle` wiki: https://sourceforge.net/p/greasemonkey/wiki/GM_addStyle/

**Community themes to crib from**

- Greasemonkey 4 for script authors (the `GM.*` vs `GM_*` namespace bible): https://www.greasespot.net/2017/09/greasemonkey-4-for-script-authors.html
- Greasyfork — `GM_addStyle` + `@resource` loader pattern discussion: https://greasyfork.org/en/discussions/development/56824
- Mastodon BirdUI (real-world `GM_addStyle` site reskin, hosted on Greasyfork): https://greasyfork.org/en/scripts

## Sources

- https://www.tampermonkey.net/documentation.php?locale=en
- https://violentmonkey.github.io/api/gm/
- https://violentmonkey.github.io/api/metadata-block/
- https://sourceforge.net/p/greasemonkey/wiki/GM_addStyle/
- https://sourceforge.net/p/greasemonkey/wiki/GM_getResourceText/
- https://github.com/quoid/userscripts
- https://github.com/quoid/userscripts/blob/main/README.md
- https://github.com/quoid/userscripts/issues/530
- https://github.com/Tampermonkey/tampermonkey/issues/1310
- https://github.com/Tampermonkey/tampermonkey/issues/1714
- https://github.com/Tampermonkey/tampermonkey/issues/527
- https://github.com/greasemonkey/greasemonkey/issues/2316
- https://github.com/greasemonkey/greasemonkey/issues/1384
- https://github.com/greasemonkey/greasemonkey/issues/2545
- https://github.com/violentmonkey/violentmonkey/issues/1172
- https://github.com/violentmonkey/violentmonkey/issues/632
- https://github.com/violentmonkey/violentmonkey/issues/2162
- https://github.com/Vendicated/Vencord/issues/1417
- https://developer.apple.com/forums/thread/651542
- https://www.greasespot.net/2017/09/greasemonkey-4-for-script-authors.html
- https://www.xjavascript.com/blog/how-do-i-prevent-require-from-caching-external-js-scripts/
- https://groups.google.com/g/greasemonkey-users/c/rx2xc6HI2us
- https://greasyfork.org/en/discussions/development/56824-help-how-to-use-gm-addstyle-and-resource-with-chrome
- https://gear4.app/doc
