# Theming Microsoft Edge
> A code-less Chromium theme extension that recolors only the browser chrome — frame, toolbar, tab text, and a near-dead New Tab Page — with content and DevTools handled out-of-band.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Edge is Chromium, so a "theme" is a code-less extension — a `manifest.json` with a top-level `theme` key and no JS or HTML. It recolors only the browser chrome: window frame, toolbar/tab bar, tab text, and the legacy New Tab Page surfaces. It touches almost no page content and no DevTools.

Two facts dominate the design space. First, Chromium has **no `userChrome.css` equivalent** — chrome theming is hard-capped at the small set of keys Chromium exposes. You cannot restyle menus, the omnibox dropdown, settings pages, or arbitrary WebUI. Second, page-content theming is a separate concern entirely, handled by a userstyle manager (Stylus) injecting CSS into web pages, and DevTools carries its own independent built-in dark theme.

Artificer would therefore ship as up to three uncoupled artifacts: a chrome theme extension, a Stylus userstyle bundle for content, and a one-line DevTools setting. Most of the palette — accent, status roles, syntax roles — has nowhere to land in the chrome theme.

## Theme format

A Chromium extension package: `manifest.json` with `manifest_version` (2 or 3), `name`, `version`, and a top-level `theme` object. `theme` has four optional subsections — `colors`, `tints`, `images`, `properties`. No JS/HTML is allowed; themes are code-less by definition.

The color model is the sharp edge. `colors` values are **RGB integer arrays `[R,G,B]`, each channel 0–255 — not hex**. A few keys (`toolbar`, `button_background`, `ntp_section`) accept an optional 4th float alpha `0..1`: `[R,G,B,A]`. `tints` are a different model entirely: **HSL float triples `[H,S,L]` in `0..1.0`** (hue absolute; `-1.0` means "no change"), applied to images and buttons, not solid fills. Mixing the two models silently produces wrong colors. So Artificer hex tokens convert hex → RGB triple (parse the pairs, no alpha unless a key supports it); tints only matter if you ship theme images, otherwise omit them or neutralize with `[-1,-1,-1]`.

**Critical limitation: a manifest is a single static color set.** There is no `color_scheme` / light-dark key in the Chromium theme format — the only `color_scheme` constructs that exist are the unrelated PWA web-manifest `theme_color` and the HTML meta tag. A theme overrides chrome colors outright and does **not** follow Edge's Light/Dark "Overall appearance" toggle. To ship Artificer dark + light you must build **two separate theme extensions** ("Artificer Dark" / "Artificer Cream"); the user picks one swatch. (InPrivate gets its own forced styling via `frame_incognito*` keys and a default dark tint — more on that below.)

## Distribution

This splits across the repo's distribution categories:

- **Category 1 (full-file install)** — the chrome theme is a self-contained extension directory loaded unpacked or installed from the Edge Add-ons store. It ships whole; it is **not** spliced into another config. The light variant is a second Cat-1 extension.
- **Category 3 (paste/templating)** — the content layer is a Stylus UserCSS bundle pasted into or imported by the Stylus extension. It lives in Stylus's own storage, not on the filesystem, and can't be a managed config fragment.
- **Neither** — DevTools is a manual one-click preference, not a file.

Distribution is package/zip (or load-unpacked dir), never symlink — Edge copies extension files into the profile on install. Install paths:

- `edge://extensions` (Developer mode → Load unpacked → theme dir) — dev install
- `edge://settings/appearance` — the swatch appears near the end of the swatch list after install; select to activate
- Edge Add-ons store via Partner Center (`https://partner.microsoft.com`) — production, ~7-business-day certification
- Stylus extension storage — content userstyles, pasted/imported
- `F12 → Settings → Preferences → Theme: Dark` — DevTools, manual

## build.mjs integration sketch

A `build.mjs` target reads `_palette.json` semantic tokens and emits `manifest.json` via a `hexToRgb(hex) -> [r,g,b]` converter. The mapping is small because most semantic roles have no chrome key:

- `bg` → `frame` + `toolbar` + `ntp_background`
- `bg-raised` / `bg-overlay` → **no key** (Chromium exposes no menu/popup surface) — drop
- `fg` → `tab_text` + `bookmark_text` + `ntp_text`
- `fg-secondary` → `tab_background_text` (inactive tab title)
- `accent` → `ntp_link` / `ntp_section_link` only (legacy NTP links); there is no first-class chrome accent key — Edge's own accent is user-picked
- `border` → **no key**
- `success` / `attention` / `urgent` → **no chrome target** — content/syntax roles, irrelevant here
- syntax roles (`keyword` / `string` / `comment` / `type` / `function`) → **nothing** — they belong to a separate Stylus userstyle and the DevTools theme, neither of which the manifest can carry

Emit `colors{}` with only the ~10 keys that paint. Build **two** manifests (dark, light) since there's no in-file mode switch. Increment `version` per build; keep `manifest_version` pinned to MV3 (now required for new store submissions).

## Gotchas

- **[verified]** *No `userChrome.css` in Chromium — chrome theming is hard-capped at the manifest's fixed key set.* Firefox exposes its UI as restyleable CSS; Chromium/Edge does not. You can only set the colors/tints/images Chromium enumerates (`frame`, `toolbar`, `tab_text`, `ntp_*`, etc.); menus, the omnibox dropdown, settings pages, the sidebar, and most modern WebUI are unreachable short of patching the browser. Confirmed by Google's official theme docs (`https://developer.chrome.com/docs/extensions/develop/ui/themes`), which note themes "don't contain JavaScript or HTML code" and cap customization at `kOverwritableColorTable` + `kPersistingImages` + a fixed tint/property set. Minor phrasing nit only: the table exposes more than "a dozen" keys; the structural claim holds.

- **[verified]** *A theme manifest is a single static color set — no light/dark variant key exists.* No `color_scheme`/`dark_theme` member; a theme overrides chrome outright and ignores Edge's Light/Dark toggle, so dark+light means two extensions. Confirmed by `https://developer.chrome.com/docs/extensions/mv2/themes`, which documents only flat `colors`/`tints`/`images`/`properties`. Nuance: Firefox WebExtensions *do* support `color_scheme`/`dark_theme`, but those are explicitly unimplemented in Chromium/Edge, so they don't contradict the Edge-scoped claim.

- **[verified]** *`colors` are RGB integer arrays, not hex; only a few keys accept alpha, and `tints` are a different HSL model.* Each color is `[R,G,B]` 0–255; `toolbar`/`button_background`/`ntp_section` take an optional 4th float alpha; `tints` are HSL floats `0..1.0` with `-1.0` = no change. A naive hex→4-tuple everywhere is wrong. Confirmed by `https://developer.chrome.com/docs/extensions/develop/ui/themes`, which states colors are RGB (e.g. `"frame": [71,105,91]`), tints are HSL floats with the `-1.0` sentinel, and shows `"toolbar": [0,0,0,0.0]` as the alpha special case.

- **[verified]** *The modern New Tab Page is WebUI and largely ignores `ntp_*` color keys.* `ntp_background`/`ntp_text`/`ntp_link` were designed for the legacy NTP; the current NTP renders via WebUI with its own color pipeline, and Edge's NTP is an MSN-backed surface even less responsive than Chrome's — setting `ntp_background` often does nothing visible. Confirmed by Chromium source (`https://chromium.googlesource.com/chromium/src/+/78b96e46be9beb08496c3afd8ed7958eaebac224%5E!/`), where the WebUI NTP derives color from a Mojo theme object and `--ntp-theme-*` CSS vars rather than consuming legacy `ntp_background`; Microsoft support docs corroborate the MSN NTP overriding standard theme keys. (The `kColorNewTabPageBackground` symbol name and the realbox-feature-flag specifics weren't surfaced verbatim, but the load-bearing claim holds.)

- **[verified]** *Incognito/InPrivate ignores your normal frame color and applies a default dark tint.* Chromium dark-tints the incognito frame unless you set `frame_incognito*` and neutralize the tint, and Edge additionally enforces a distinct dark InPrivate appearance for recognizability — so an Artificer cream theme can look broken/dark in private windows. Confirmed by `https://github.com/Patrick-Batenburg/GoogleChromeThemeCreationGuide/blob/master/README.md` (incognito frame "gets a dark tint by default") and Microsoft's own InPrivate-theming guidance (Edge renders the InPrivate frame dark regardless of the normal theme). Caveat: the specific `frame_incognito` tint `[-1,-1,-1]` neutralization is plausible per the documented "-1.0 = no change" convention but not independently confirmed to suppress the default tint.

- **[unconfirmed]** *`button_background` appears unused, and `theme_tab_background_incognito` is unsupported on macOS — platform/dead keys.* Community reverse-engineering claims `button_background` has no observable effect in current builds and the incognito tab-background image key is a no-op on macOS, with behavior drifting silently across releases. This wording appears **only** in the original source (`sambostock/chrome-theme-guide`); the independent Patrick-Batenburg guide and the canonical Google reference describe both keys as functional with no "unused" or "macOS no-op" qualifier, and no source addresses Edge specifically. Missing: a second independent source corroborating that these keys are dead/platform-broken. Not refuted, but treat as unconfirmed — and don't spend palette budget on them regardless.

- **[verified]** *Stylus cannot style `edge://` internal pages or DevTools without rebuilding the extension.* Content userstyles work on web pages, but injecting into `edge://`/`chrome://` requires the `extensions-on-edge-urls` flag, `--test-type`, and editing+rebuilding Stylus's manifest match list and URL regex — and even then extension pages and Shadow-DOM-based DevTools UI stay unstyleable. So Artificer can't theme Edge's settings/NTP via userstyle either. Confirmed by `https://add0n.com/stylus.html`: "the user interface of the browser and internet pages cannot be restyled with Stylus due to the security restrictions in the WebExtensions platform," with Chromium primary sources corroborating the content-script block on privileged URLs. (The exact rebuild recipe is single-sourced from the original discussion but mechanically consistent with Chrome docs.)

- **[unconfirmed]** *DevTools theming is a separate built-in setting, not part of the theme extension or any CSS file.* The structural half is confirmed by two independent sources (`devtoolstips.org`, `pureinfotech.com`): Edge DevTools has its own Theme preference (F12 → Settings → Preferences) independent of the browser theme. But the detail "you get Dark or Light only / no supported way to push custom syntax colors" is **contradicted** — Edge ships ~10 VS Code themes (Monokai, Solarized, etc.) beyond Light/Dark, and a sanctioned (if experimental) `devtools_page` extension can override DevTools' own CSS selectors behind a Settings → Experiments flag. Missing: the original claim is mis-cited (the Microsoft Learn URL is about emulating a page's `prefers-color-scheme`, not DevTools chrome) and overstated. Net: DevTools theming is a separate preference, but a custom-stylesheet extension *could* carry Artificer's syntax colors as a distinct artifact.

- **[verified]** *Edge enterprise policy / Windows High Contrast can silently override or lock the theme.* On managed devices, Intune/Group Policy can grey out or revert the appearance setting so a theme installs but never applies, and Windows High Contrast / forced-colors overrides Edge UI colors entirely. The theme isn't broken — an external layer is winning, invisibly from the manifest. Confirmed by `https://learn.microsoft.com/en-us/deployedge/configure-microsoft-edge`: "Mandatory policies override user preferences and prevent the user from changing the policy settings," plus the Edge Dev Blog on forced-colors mode converting author colors into the OS-set palette (with a documented Oct 2025 incident forcing high-contrast UI). No dedicated "theme lock" policy exists — the lock rides the generic mandatory-policy mechanism, which doesn't refute the claim.

## Tips & tricks

- Ship two thin extensions (Artificer Dark, Artificer Cream) generated from the same `_palette.json`. There is no in-file mode switch, so a build matrix is the clean answer.
- Convert hex → `[R,G,B]` 0–255 and emit only the ~10 keys that actually paint: `frame`, `frame_inactive`, `toolbar`, `tab_text`, `tab_background_text`, `bookmark_text`, `ntp_background`, `ntp_text`, `ntp_link`. Skip `success`/`attention`/`urgent`/`border`/syntax — no chrome target.
- Set `frame_incognito` plus a `[-1,-1,-1]` `frame_incognito` tint so a light theme isn't auto-darkened in InPrivate.
- Treat content + DevTools as separate deliverables: a Stylus UserCSS bundle carries the syntax roles onto code-on-web surfaces (GitHub, view-source), plus a doc line telling users to flip DevTools to Dark. Don't force them through the manifest.
- Pin MV3 for any store submission and bump only `manifest.version` per build; keep the manifest tiny — fewer keys means fewer cross-version surprises.
- Don't waste palette budget on `button_background` or incognito tab-background images (unused / macOS-unsupported); validate the rendered chrome visually since keys drift silently across Chromium releases.

## Fit assessment

**Low-to-medium effort, marginal value — add it but scope it tightly.** The chrome theme itself is a trivial build target (~10 RGB keys, two manifests for dark/cream) that slots cleanly into `themes/build.mjs`. The catch is honesty about reach: a Chromium theme paints only frame/toolbar/tab text and a near-dead NTP, so Artificer's accent, status, and syntax roles have no chrome home. The high-value parts (content + syntax) live in a separate, fragile Stylus userstyle (needs flags for internal pages) and a manual DevTools setting.

Worth shipping the chrome theme as a low-cost brand-consistency win — but document loudly that Edge cannot be deeply themed the way Ghostty or VS Code can. Most of the palette has nowhere to land.

## Where to get the authoritative docs

- **Official MV3 theme docs (spec/schema, color + tint model)** — https://developer.chrome.com/docs/extensions/develop/ui/themes
- **Official MV2 theme docs (verbatim manifest example, format notes)** — https://developer.chrome.com/docs/extensions/mv2/themes
- **Edge Add-ons store publish + policy docs** — https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- **Community key reference (descriptions, alpha-supporting keys)** — https://github.com/Patrick-Batenburg/GoogleChromeThemeCreationGuide/blob/master/README.md
- **Community key/gotcha guide (platform diffs, dead keys)** — https://github.com/sambostock/chrome-theme-guide/blob/master/README.md
- **Real incognito-aware theme to crib (`frame_incognito` + tint neutralization pattern)** — https://github.com/zhang-kai/incognito-mode-theme-for-chrome/blob/master/manifest.json

## Sources

- https://developer.chrome.com/docs/extensions/develop/ui/themes
- https://developer.chrome.com/docs/extensions/mv2/themes
- https://github.com/sambostock/chrome-theme-guide/blob/master/README.md
- https://github.com/Patrick-Batenburg/GoogleChromeThemeCreationGuide/blob/master/README.md
- https://github.com/zhang-kai/incognito-mode-theme-for-chrome/blob/master/manifest.json
- https://chromium.googlesource.com/chromium/src/+/78b96e46be9beb08496c3afd8ed7958eaebac224%5E!/
- https://groups.google.com/a/chromium.org/g/chromium-reviews/c/3Cx8aU6iJrM
- https://support.mozilla.org/en-US/kb/contributors-guide-firefox-advanced-customization
- https://github.com/w3c/manifest/issues/975
- https://github.com/openstyles/stylus/discussions/1768
- https://add0n.com/stylus.html
- https://learn.microsoft.com/en-us/microsoft-edge/devtools/accessibility/test-dark-mode
- https://devtoolstips.org/tips/en/change-color-theme/
- https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/store-policies/developer-policies
- https://learn.microsoft.com/en-us/deployedge/configure-microsoft-edge
- https://draculatheme.com/microsoft-edge
- https://www.microsoft.com/en-us/edge/learning-center/browser-themes
