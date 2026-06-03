# Theming Safari
> A content-only CSS skin — Safari touches the page, never the browser chrome.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Safari is the genuinely hard browser: it touches only **content**, never **chrome**. There is no `userChrome.css` equivalent, no native theme/appearance file, and Safari does not implement the WebExtensions `theme` manifest key or the `browser.theme` JS API — those are Firefox-only, and Safari follows the Chromium model. An Artificer "Safari theme" is therefore a web-page CSS skin delivered one of three ways: Safari's legacy native custom style sheet (Settings > Advanced), the open-source Userscripts.app extension injecting CSS, or the Cascadea app. None of these can recolor the toolbar, tab bar, or address bar. Syntax-role tokens only apply on code-rendering sites; the browser frame stays whatever macOS Dark/Light mode dictates.

Set expectations explicitly so this isn't measured against the Ghostty/VS Code full-chrome themes — it is a different category of artifact.

## Theme format

There is **no first-class theme format**. Every viable route consumes ordinary CSS:

- **Native global stylesheet** — a single `.css` file selected via Settings > Advanced > Style Sheet.
- **UserCSS** — CSS with a `==UserStyle==` metadata header (`@name`, `@match`/`@-moz-document domain(...)`, `@var color` entries) for Userscripts.app / Cascadea / Stylus-compatible tools.
- **Extension-injected CSS** — content scripts or `tabs.insertCSS`.

The Firefox `theme` manifest format is unsupported.

**Color model:** hex throughout. Safari has no proprietary color model — every route consumes ordinary CSS color values, so Artificer's hex tokens pass through verbatim as `#rrggbb` or `#rrggbbaa`. No conversion needed; you may optionally emit `rgb()`/`hsl()` or wrap in custom properties. The only non-CSS color surface is the per-site `<meta name="theme-color">` tab tint — itself a CSS color string, but set by the *site author*, not addressable by an installed theme.

**Light/dark:** there is no theme-level switch because there is no theme format. For the native global stylesheet (single file, no toggle), light and dark must both live in one file split by `@media (prefers-color-scheme: dark)` / `light`, following OS appearance. Cascadea can tie a style's on/off state to macOS system appearance. Userscripts.app has no appearance binding of its own — use `prefers-color-scheme` in the CSS. Safari's own chrome already auto-switches with macOS Dark Mode independent of any of this, and you cannot influence it.

## Distribution

**Category 3** (paste/templating) for the content-CSS routes. There is **no Cat 1/Cat 2 path** — Safari has no selector-file install and no `@import`-able theme directory.

- **Native custom style sheet** — Cat-1-ish: a single `.css` file the user points Safari at via Settings > Advanced > Style Sheet (one global file, manual GUI selection, restart to apply). chezmoi can drop the file; selecting it is a manual GUI step, not reliably scriptable via a stable `defaults` key.
- **Userscripts.app / Cascadea** — Cat 3: ship UserCSS text the user imports/pastes, or write the `.css` into the app's container directory for Userscripts. The App Store app must be installed first.
- **A real packaged extension** (theme-color style) — Cat-app, and not worth it: it requires an Xcode wrapper app plus Developer ID + notarization that *still* won't load outside the App Store without per-launch "Allow Unsigned Extensions." For personal/dotfile distribution, skip it. No symlink/package/paste path produces a chrome theme.

**Install paths:**

- Native global stylesheet: any path, selected via Safari > Settings > Advanced > Style Sheet > Other… — e.g. `~/.config/artificer/artificer-safari.css`
- Userscripts.app default script dir: `~/Library/Containers/Userscripts/Data/Documents/scripts` (and `require/` for `@require` resources)
- Userscripts.app alternate: a user-chosen directory for external-editor/iCloud workflows
- Cascadea: styles live inside the app DB / iCloud, imported from `.user.css`/`.user.styl` — no stable on-disk path to write directly
- Reader CSS: not separately installable — Reader is styled only by injecting CSS via an extension/Cascadea targeting the Reader DOM

## build.mjs integration sketch

There is no native theme file to generate, so an Artificer `build.mjs` Safari target produces a CSS user-stylesheet, **not a chrome theme**. Map `_palette.json` semantic tokens to a flat `:root` block of custom properties, then bind them to page surfaces. Two output shapes are worth generating:

1. **`artificer-safari.css`** (native Advanced > Style Sheet target) — a single global stylesheet. Emit `:root { --af-bg: #…; --af-fg: #…; --af-accent: #…; … }` then a dark/light split via `@media (prefers-color-scheme: dark)`. Because the native feature is global with **no** per-site scoping and **no** mode switch, both modes live in the one file. Body/content selectors (`body`, `a`, generic prose) get the tokens — expect this to fight site CSS, so emit with high specificity or `!important`.

2. **`artificer.user.css`** (UserCSS for Userscripts.app / Cascadea) — the same token block plus a `==UserStyle==` header. Per-domain scoping is available here, so fan out `@match` blocks per target site. Syntax-role tokens (keyword/string/comment/type/function) only matter on code-rendering sites (GitHub, docs) — emit them as a scoped block mapping to those domains' `.pl-k`, `.pl-s`, etc. classes, since there is no terminal/editor surface in the browser chrome.

**Drop all chrome-role tokens for this target** — there is no way to map any token to Safari's toolbar, tab bar, or address bar.

## Gotchas

- **[verified]** Safari does NOT support the WebExtensions `theme` manifest key or `browser.theme` JS API — there is no extension route to recolor the chrome. Theming via the manifest `theme` key and the dynamic `browser.theme`/`theme.update()` API are Firefox-only; an extension can only inject CSS into page content. Feature-detect `browser.theme` and it returns `undefined`. Confirmed by [mdn/browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/theme.json) — every subfeature has `"version_added": false` for `safari` and `safari_ios`, and the same for the manifest key. (One imprecision in the original framing: the static `theme` *manifest* key *is* supported in Chrome, so Safari is actually stricter than Chromium here, not merely "following" it — but the load-bearing conclusion holds.)

- **[verified]** A Safari **Web** Extension won't load even when properly signed with Developer ID and notarized — Apple says it MUST come from the App Store. Apple DTS confirmed this is by design; outside the store, extensions only load with "Allow Unsigned Extensions" enabled, which **resets every time Safari quits**. Confirmed by [josStorer/chatGPTBox#46](https://github.com/josStorer/chatGPTBox/issues/46) (reset-on-quit) and corroborated by [apuokenas/allow-unsigned-extensions](https://github.com/apuokenas/allow-unsigned-extensions), a launch-agent tool that exists solely to re-enable the setting on every launch. Note: this gate applies to the newer **Web** Extensions, not the older App Extensions — the claim is correctly scoped.

- **[verified]** The native custom style sheet (Settings > Advanced > Style Sheet) is **global-only** — no per-site scoping and no light/dark toggle. It applies one CSS file to every page, light/dark must be hand-split via `prefers-color-scheme`, and it requires a Safari restart to take effect. Confirmed by [MacMost](https://macmost.com/change-how-web-pages-look-with-safari-custom-style-sheets.html) (Gary Rosenzweig): the sheet changes "another site as well," per-site styling is "not built into Safari," and you must "Quit Safari and then launch it again." (The "legacy feature Apple may remove" sub-point appears only in community commentary, not the second source.)

- **[verified]** Injected CSS cannot bypass a site's Content-Security-Policy in Safari. Userscripts.app notes there is "no way to allow extension content scripts to bypass CSPs in Safari" — a token-skin relying on an injected `<style>` block can silently fail on CSP-strict sites; the workaround is `@inject-into: content` plus `tabs.insertCSS`. Confirmed by [Apple Developer Forums thread 651542](https://developer.apple.com/forums/thread/651542), where an Apple engineer states the page CSP applies to DOM-injected styles/scripts but **not** content scripts running in their own world — which is exactly why the `content` workaround helps.

- **[verified]** Safari Reader mode strips **all** page CSS, so you cannot pre-style it from the page; it has its own opaque DOM and is hard to target via JS. Reader builds a fresh document and discards site styles, including `::before` pseudo-content; it is not an iframe and runs under a separate `safari-reader://` origin, so page-context JS can't reach it. Confirmed by [Sara Soueidan](https://www.sarasoueidan.com/blog/tips-for-reader-modes/) (CSS-stripping, `::before` loss) and corroborated by Payatu (separate origin, scripts/iframes stripped). The exact DOM selectors (`#article`/`.page`) are version-specific, but the substantive claims hold.

- **[verified]** Cascadea is built on the deprecated **Safari App Extension** model — a different, older mechanism than Web Extensions. Apple steers developers off it toward Web Extensions via `safari-web-extension-converter`; betting an Artificer pipeline on a specific app's extension type risks future-Safari breakage. Confirmed by [seungwoochoe.com](https://www.seungwoochoe.com/blog/safari-app-extensions-vs-safari-web-extensions/) ("an older framework… built on the standard macOS app extension model") and corroborated by a WWDC23 framing that web extensions are "the future." (Precise wording: App Extensions are being *phased out / positioned as fallback* rather than formally deprecated — the genuinely deprecated tech is the even-older `.safariextz` builder — but the substance, an older superseded mechanism, is accurate.)

- **[verified]** Safari 12+ blocks locally-installed fonts, so a theme cannot use system/local fonts — only `@font-face` webfonts. This is an anti-fingerprinting measure restricting pages to a system-font whitelist; an Artificer skin wanting JetBrains Mono on pages must ship it as an `@font-face` webfont, not reference the installed family. Confirmed by [dev.to / masakudamatsu](https://dev.to/masakudamatsu/don-t-locally-host-google-fonts-for-the-sake-of-safari-bkg) (Safari "only renders the default system fonts and web fonts" since v12) and the W3C CSS Fonts Level 4 spec. Precise scope: it's `local()`/user-installed references that are blocked — `@font-face` via `url()` (self-hosted or remote) still works, which is exactly the recommended path.

- **[verified]** The per-site tab tint (theme-color) is **author-controlled**, not user/theme-controllable. Safari 15+ tints the tab/toolbar area from the page's `background-color` or `<meta name="theme-color">`, set by the website — an Artificer theme cannot force its accent into the tab tint of arbitrary sites; the only user lever is a global on/off toggle. Confirmed by [Use Your Loaf](https://useyourloaf.com/blog/safari-15-theme-color/) and corroborated by Amit Merchant and Arkido. Nuance (not a refutation): as of Safari/iOS 26 the `theme-color` meta is ignored and the tint is derived from actual page CSS — the source mechanism shifts but the tint stays page-derived and still unreachable by an installed theme.

- **[unconfirmed]** Externally-edited Userscripts CSS won't inject until the extension popup is opened and fully loaded. If you write the `.css` into the container dir (the dotfile-friendly workflow), Userscripts requires the popup to be opened and finish loading before injection — so a freshly chezmoi-applied style silently does nothing until that manual step, easy to mistake for a broken theme. The claim matches the [quoid/userscripts README](https://github.com/quoid/userscripts/blob/main/README.md) verbatim, but **no independent confirmation was found** — every apparent corroboration traced back to verbatim README forks by the same author, and no third-party blog, Q&A answer, or user report describes the behavior. Plausibly true and documented, but single-source. *Missing: a second-author confirmation (or a direct repro) of the open-the-popup-once requirement.*

## Tips & tricks

- **Treat Safari as content-only in the pipeline.** Drop every chrome/toolbar/tab token; emit only `bg`/`fg`/`accent`/`border`/syntax bound to page elements. The frame follows macOS Dark/Light and is not yours to set.
- **Emit one shared `:root` block and reuse it across all three delivery shapes** (native global `.css`, UserCSS, injected CSS). The only difference is the wrapper — media query vs. `==UserStyle==` header vs. `insertCSS` — not the values.
- **For dotfiles, the most reliable personal route is Userscripts.app** writing into its container `scripts/` dir (chezmoi-managed) — but document the "open the popup once" gotcha in the install notes.
- **Use UserCSS `@var color` entries** so Cascadea/Userscripts expose the Artificer tokens as adjustable color pickers — a near-free "theme settings" UI.
- **Scope syntax tokens to code-rendering sites.** A separate `@match github.com` block mapping keyword/string/comment/type/function to GitHub's `.pl-*` classes earns its keep; emitting them globally does not.
- **Prefer high-specificity selectors or `!important` for the native global stylesheet.** Safari is fussy about specificity, and your skin competes with site CSS with no scoping to lean on.
- **Don't package a signed extension for distribution.** The App-Store-only gate plus the per-launch "Allow Unsigned Extensions" reset makes it a worse experience than a pasted UserCSS for a personal design system.

## Fit assessment

**Effort: medium** to build a content-CSS generator — low if reusing the existing token `:root` emitter, since the real work is selector mapping, not color conversion. Worth adding to the Artificer pipeline only as a clearly-labeled **content skin, not a chrome theme**: Safari structurally cannot do chrome theming. Ship it as a UserCSS fragment (Cat 3) for Userscripts.app/Cascadea, with the native global-stylesheet file as a secondary artifact. Set expectations explicitly so it isn't measured against the Ghostty/VS Code full-chrome themes.

## Where to get the authoritative docs

**Official spec / reference:**

- Apple — Safari Web Extensions: https://developer.apple.com/documentation/safariservices/safari-web-extensions
- Apple — Assessing your Safari web extension's browser compatibility (which APIs/keys are unsupported): https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility
- Apple — Converting a Safari App Extension to a Safari Web Extension: https://developer.apple.com/documentation/safariservices/converting-a-safari-app-extension-to-a-safari-web-extension
- MDN — `theme` API (Firefox-only; confirms it's absent from the Chromium/Safari model): https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/theme
- Apple Support — Change Advanced settings in Safari on Mac (native Style Sheet feature): https://support.apple.com/guide/safari/ibrw1075/mac

**Community themes to crib from:**

- Userscripts.app (quoid) — open-source CSS-injection extension, metadata keys, container dir: https://github.com/quoid/userscripts
- PBBB / Theme-Color — Safari Web Extension reference for the tab-tint approach: https://github.com/PBBB/Theme-Color
- charleyramm — Safari Reader.css gist (Reader-DOM styling): https://gist.github.com/charleyramm/a10a3386489fbbeb0d4f

## Sources

- https://developer.apple.com/documentation/safariservices/safari-web-extensions
- https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility
- https://developer.apple.com/documentation/safariservices/converting-a-safari-app-extension-to-a-safari-web-extension
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/theme
- https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/theme.json
- https://support.apple.com/guide/safari/ibrw1075/mac
- https://blog.jim-nielsen.com/2021/custom-style-sheet-in-safari/
- https://macmost.com/change-how-web-pages-look-with-safari-custom-style-sheets.html
- https://github.com/quoid/userscripts
- https://github.com/quoid/userscripts/blob/main/README.md
- https://developer.apple.com/forums/thread/651542
- https://cascadea.app/
- https://apps.apple.com/us/app/cascadea/id1432182561
- https://www.seungwoochoe.com/blog/safari-app-extensions-vs-safari-web-extensions/
- https://mathiasbynens.be/notes/safari-reader-html
- https://www.sarasoueidan.com/blog/tips-for-reader-modes/
- https://dev.to/masakudamatsu/don-t-locally-host-google-fonts-for-the-sake-of-safari-bkg
- https://developer.apple.com/forums/thread/667859
- https://github.com/josStorer/chatGPTBox/issues/46
- https://github.com/apuokenas/allow-unsigned-extensions
- https://developer.apple.com/forums/thread/683403
- https://useyourloaf.com/blog/safari-15-theme-color/
- https://github.com/PBBB/Theme-Color
- https://gist.github.com/charleyramm/a10a3386489fbbeb0d4f
