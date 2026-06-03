# Theming Stylus / UserCSS
> Author-origin CSS injected into matched web pages — one `.user.css` per target site, restyling a site's DOM (not browser chrome) from a shared semantic palette.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Stylus/UserCSS theming targets **web page content**, not browser chrome — it injects author-or-user-origin CSS into matched sites. A "theme" here is a CSS-with-metadata file (`.user.css`) that restyles a target site's DOM, and optionally its syntax-highlight blocks if that site renders code. There is no syntax-highlighting model of its own: you restyle whatever DOM the target exposes (e.g. `.hljs-keyword`), so every code-token mapping is per-target wiring, not generic.

Scope is governed by `@-moz-document` matching functions. Omit them and the style applies to *every* site you visit — the single most consequential default in the format. Unlike app themes (Ghostty, VS Code) that produce one reusable artifact, each Stylus theme is bound to a specific target domain. Artificer would ship **one `.user.css` per site** — a self-hosted dashboard, Gitea, and so on — each mapping the same semantic palette onto that site's selectors.

## Theme format

A single `*.user.css` text file: plain CSS preceded by a mandatory metadata comment block.

```css
/* ==UserStyle==
@name        Artificer — Gitea
@namespace   artificer
@version     2026.5.29
@updateURL   https://git.example.com/.../gitea.user.css
@preprocessor default
@var select  accentColor "Accent" ["gold:Gold*", "sienna:Sienna"]
==/UserStyle== */

@-moz-document domain("git.example.com") { /* ... */ }
```

`@name`, `@namespace`, `@version` are mandatory; `@description`, `@author`, `@license`, `@homepageURL`, `@supportURL`, `@updateURL`, `@preprocessor` are optional. Zero-or-more `@var <type> <name> "<label>" <default>` lines define user-configurable knobs. The body is normal CSS, usually wrapped in `@-moz-document <function>(...)` blocks. `@preprocessor default|uso|less|stylus` decides how `@var` tokens compile into the body — `default` emits a plain `:root { --name: value }` block.

There is **no JSON schema**. The grammar lives in the wiki and in the official parser, `usercss-meta` (openstyles/usercss-meta), which is the canonical validator.

**Color model.** Hex works throughout the body (3/4/6/8-digit, plus rgb/hsl/named). The catch is the `@var color` type: a hex default is normalized to `rgb()`/`rgba()` at compile time, so hex-append alpha tricks break. Artificer's hex tokens map 1:1 into the body directly, so keep them as literal `:root` custom properties and reserve `@var color` for genuine user knobs. For per-token alpha, use native `#RRGGBBAA` literals (always full 6-digit base) or, under `@preprocessor less`, `fade(@token, 50%)`.

**Light/dark.** No native OS switch. The standards-compliant route is two `@media (prefers-color-scheme: dark|light)` sub-blocks inside the `@-moz-document` block, each setting `:root` properties from the dark/light token sets — pure CSS, honors the OS, and reuses the split already in `_palette.json`. Optionally add a `@var select` accent picker (Catppuccin's model) for user-driven flavor on top.

## Distribution

This is **Category 3** (paste/templating) primarily, with a **Category 1** self-host variant. Stylus has no `@import`/include of external files, so it is *not* Cat 2.

- **Self-hosted raw `.user.css` at a stable URL** ending in `.user.css` — Stylus intercepts the suffix and prompts to install, then auto-updates via `@updateURL` + `@version` bump. This is the Cat-1-like complete-file path and the recommended shape for Artificer.
- **Paste into Stylus' "Add new style" editor** — the Cat 3 fallback; loses auto-update.
- **userstyles.world (USw)** — the modern UserCSS registry, install endpoint `https://userstyles.world/api/style/:id.user.css`. **Not** userstyles.org (USO), the defunct Stylish-era site whose install button has been broken for years and whose styles can't self-host.

**Install paths:**

- Self-hosted raw URL ending in `.user.css` (e.g. `https://git.example.com/cameron/artificer/raw/main/themes/stylus/<site>.user.css`) — install prompt on visit.
- Stylus UI: Manage → Write new style, paste body (Cat 3 fallback, no auto-update).
- userstyles.world: `https://userstyles.world/api/style/:id.user.css` (sets the update endpoint on install).

**Browser availability:** Chrome/Chromium (Edge, Brave, Opera, Vivaldi) and Firefox via the Stylus WebExtension. **No Safari** — see the Gotchas and Tips for the fallback story.

## build.mjs integration sketch

`build.mjs` reads `_palette.json` (dark + light blocks of semantic hex tokens). For each target site, emit a `<site>.user.css`:

1. **Header** — write the `==UserStyle==` block: `@name "Artificer — <site>"`, `@namespace artificer`, `@version` from the shared root version (CalVer or semver — **must** bump for auto-update), `@updateURL` at the served raw file, `@preprocessor default` unless alpha math forces `less`.
2. **Vars** — optionally emit `@var select accentColor [...]` from the palette's accent options. Keep core hex tokens as literal `:root` custom properties (or `default`-preprocessor vars), **not** `@var color`, to dodge the hex→rgb() normalization.
3. **Body** — one `@-moz-document domain("<site>")` block; inside it, two `@media (prefers-color-scheme: dark|light)` sub-blocks setting `:root` properties from the dark/light token sets, then site-selector rules consuming `var(--bg)` etc. Map syntax roles (keyword/string/comment/type/function) onto the target site's code-block selectors — site-specific per-target wiring.
4. **Validate** — run every generated file through `usercss-meta` in CI before serving; a header that fails to parse degrades to a silent "No updates found" for users.

## Gotchas

- **[unconfirmed] `@var color` with a hex default is silently converted to `rgb()`/`rgba()`, breaking 8-digit-hex alpha tricks.** Stylus is reported to normalize a `@var color foo #4f8cc9` default to `rgb(79,140,201)` at compile time, so `/*[[foo]]*/80` (intended `#4f8cc980`) yields invalid CSS; the workaround is a `text` var (loses the picker) or plain `:root` custom properties. This rests on a *single* primary source — openstyles/stylus issue #995 — and every "confirmation" quotes it verbatim. What *is* independently confirmed is the broader CSS reality (hex-append only works on a 6-digit base, per Bence Szabo and Jim Nielsen), not Stylus's specific `@var color` normalization. **Missing:** a genuinely independent second source asserting this exact Stylus behavior; the wiki documents accepted *input* formats but is silent on compile-time *output*. Treat as plausible but unverified — which is moot anyway, since Artificer keeps hex as literal `:root` properties.

- **[verified] Omitting `@-moz-document` makes the style apply to EVERY site, not "do nothing."** A UserCSS with no `@-moz-document` block is a global style injected on all pages, and authors routinely ship a "global" style by accident. Confirmed by the userstyles.world FAQ (different domain/author from the openstyles wiki), which states broken styles "apply globally (in other words, on all sites)" and that ~25% of submissions arrive with this exact mistake. Every per-site Artificer theme **must** be wrapped in `domain()`/`url-prefix()` or it bleeds onto the whole web. Source: <https://github.com/openstyles/stylus/wiki/Writing-styles> + <https://userstyles.world/docs/faq>.

- **[verified] GitHub raw URLs (`raw.githubusercontent.com`) auto-update unreliably, especially in Firefox.** GitHub serves raw files as `text/plain`, not `text/css`; Chromium tolerates it but Firefox treats it strictly and may refuse to recognize the `.user.css` for update detection. The mechanism is independently confirmed by the Thirld Word Blog ("Don't Use CSS Files from raw.github.com"), which documents that browsers reject `text/plain` stylesheets and that GitHub does this intentionally. (Provenance note: the substance actually originates in openstyles/stylus issue **#259**, not the cited #1667, which is about USw failing to set the update URL.) A self-hosted server sending proper `Content-Type` is the reliable `@updateURL`. Source: <https://github.com/openstyles/stylus/issues/1667> + <https://thirld.com/blog/2012/08/28/do-not-use-css-from-raw-github/>.

- **[verified] Editing an installed style locally blocks auto-updates until a destructive manual update.** Stylus flags locally-modified styles and a forced manual update overwrites *all* local edits with no merge. An independent third-party guide (thatoneunoriginal.github.io) confirms the destructive overwrite ("Stylus will overwrite any local edits made to the Stylus theme"). The precise "auto-update is disabled until you manually update" mechanism and the "companion style" workaround rest on the openstyles FAQ alone, but the load-bearing risk for Cameron — tweak a shipped theme in-browser and a future update silently wipes it — is verified. Source: <https://github.com/openstyles/stylus/wiki/FAQ> + <https://thatoneunoriginal.github.io/Help.html>.

- **[unconfirmed] A parse error in a newer version makes Stylus report "No updates found" instead of surfacing the error.** If the updated `.user.css` fails to parse, the update check is reported to silently say no update (red fail marker only on hover); fix is often uninstall+reinstall. The specific symptom-to-message mapping appears *only* in openstyles/stylus issue #891. Independently confirmed *adjacent* facts: `usercss-meta` throws a `ParseError` on bad metadata/`@var` and exposes programmatic validation (substantiating the CI-validation recommendation), and the USw FAQ confirms the `@version`-bump requirement. **Missing:** a second independent source for the exact "parse error → 'No updates found'" behavior. Plausible and uncontradicted, but unverified — so validate with `usercss-meta` in CI regardless.

- **[refuted] Safari is unsupported and has no equivalent of the `.user.css` format.** The first half is true — Stylus ships only for Chromium and Firefox (issue #299 sits open). But the load-bearing technical claim is **false**: Cascadea explicitly "can import and export styles using the UserCSS standard," supports the `@var` config UI ("Both @var (UserCSS) and @advanced (xStyle) formats are supported"), and handles `@-moz-document` import/export. So a single Artificer `.user.css` *is* portable to Cascadea by design, not "without rework." The only narrowly-true sub-point is that the generic Userscripts app is a plain injector, not a full UserCSS manager. Source: <https://github.com/openstyles/stylus/issues/299>, refuted by <https://apps.apple.com/us/app/cascadea/id1432182561>.

- **[verified] `regexp()` must match the ENTIRE URL, double-escapes through CSS, and case is significant.** `regexp('example')` matches nothing because the pattern must span the whole URL (`^`/`$` are added automatically); a literal dot is `\\.` (escaped for regex then again for CSS); all URL matching is case-sensitive; and `url-prefix('http://www.x.com')` won't match `https://` or the apex domain. Confirmed by MDN's `@document` reference ("The expression must match the entire URL"; the `\\.` double-escape verbatim) and the openstyles wiki ("all letters in URLs are case sensitive, without exception"). Prefer `domain()`. Source: <https://github.com/stylish-userstyles/stylish/wiki/Valid-@-moz-document-rules> + <https://developer.mozilla.org/en-US/docs/Web/CSS/@document> + <https://github.com/openstyles/stylus/wiki/Writing-styles>.

- **[verified] userstyles.org (USO) is effectively dead for Stylus; only userstyles.world (USw) does clean UserCSS install/auto-update.** USO's install button has been broken for years (a cluster of independent Stylus issues — #379, #523, #195 — plus USO's own forum threads) because it was tied to the now-removed Stylish extension; its "traditional" styles can't self-host or auto-update. USw is the modern UserCSS registry (install endpoint `/api/style/:id.user.css`), endorsed by the third-party tobimori/awesome-userstyles. *Nuance:* USw **overrides** the author's `@updateURL` with its own infra rather than honoring it — net effect (auto-update works) matches the claim. Publishing to the wrong site means no auto-update. Source: <https://github.com/openstyles/stylus/issues/1422> + <https://github.com/tobimori/awesome-userstyles>.

- **[verified] Stylus-preprocessor `rgba(var(--x), .5)` fails at compile time.** Under `@preprocessor stylus`, passing a CSS `var()` (or a bare ident) into `rgba()` throws `expected rgba or hsla, but got call:var(--...)` because Stylus evaluates the color at compile time rather than emitting it. Independently reproduced by lightrun.com ("Stylus cannot expand `var(--color)` at compile time") and corroborated across years on the tracker (#1705 with a bare ident, #2259 with a string). Use Less `fade(@token, X%)` or inline native `#RRGGBBAA` instead — the inline-literal fix is fully corroborated; the specific Less `fade()` recommendation is sound but not separately source-verified. Source: <https://github.com/stylus/stylus/issues/2380> + <https://lightrun.com/answers/stylus-stylus-expected-rgba-or-hsla-but-got-callvar--color-bar-error>.

## Tips & tricks

- **Use `@preprocessor default`.** It compiles `@var` into a plain `:root { --name: value }` block, lining up exactly with Artificer's existing custom-property token model — no LESS/Stylus dependency unless you need alpha math.
- **Keep hex tokens as literal `:root` custom properties, not `@var color`,** to sidestep the hex→rgb() normalization entirely. Reserve `@var` for genuinely user-facing knobs (accent picker, density).
- **Mirror Catppuccin's accent pattern:** one `@var select accentColor ["gold:Gold*", "sienna:Sienna", ...]` lets users repaint `--accent` without forking the file. The `value:Label` + trailing `*` (default) syntax is the established idiom.
- **Drive light/dark from `prefers-color-scheme` media blocks** inside the `@-moz-document` block — pure CSS, no JS, honors the OS, reuses the dark/light split already in `_palette.json`.
- **Self-host the `.user.css` with a stable `@updateURL`** on the self-hosted server (proper `text/css`), and bump `@version` (CalVer like Catppuccin's `2000.01.01`, or semver) on every palette change. That's the entire auto-update contract.
- **Run every generated file through `usercss-meta` in CI.** A header that fails to parse turns auto-update into a silent "No updates found."
- **Prefer `domain()` over `url-prefix()`/`regexp()`** for site scoping — it covers subdomains, is case/protocol-tolerant where the others aren't, and is the least error-prone to template per-site.
- **Note the Safari gap in `themes/README.md`:** the `.user.css` is Chromium+Firefox native; a Safari user needs Cascadea (which *does* consume the UserCSS format) or the generic Userscripts app with a hand-ported plain-CSS variant.

## Fit assessment

**Med effort — worth adding, but as a secondary, site-specific lane, not a flagship target.** The `build.mjs` mapping is trivial (semantic hex → `:root` custom properties under `@preprocessor default`), but each theme is bound to a specific target DOM, so the real work is per-site selector mapping — there's no single reusable artifact like the Ghostty or VS Code themes. Best value: theme Cameron's self-hosted server surfaces (Gitea, dashboards) where he controls the DOM and can serve a clean `@updateURL`. The Safari gap and the per-site coupling cap its breadth. Include it as an opt-in target, not a core deliverable alongside the terminal/editor themes.

## Where to get the authoritative docs

**Official spec / schema / parser:**

- Writing UserCSS (metadata + `@var` spec) — <https://github.com/openstyles/stylus/wiki/Writing-UserCSS>
- Writing styles (global vs. scoped, `@-moz-document`) — <https://github.com/openstyles/stylus/wiki/Writing-styles>
- `usercss-meta` (official parser/grammar, the canonical validator) — <https://github.com/openstyles/usercss-meta>
- `@-moz-document` matching-function reference — <https://github.com/stylish-userstyles/stylish/wiki/Valid-@-moz-document-rules>
- MDN `@document` at-rule (browser support / non-standard status) — <https://developer.mozilla.org/en-US/docs/Web/CSS/@document>
- UserStyles.world FAQ (modern registry mechanics) — <https://userstyles.world/docs/faq>

**Community themes to crib from:**

- Catppuccin Userstyles — "Writing a userstyle" tutorial (the canonical `@var select` flavor/accent pattern) — <https://userstyles.catppuccin.com/contributing/tutorials/writing-a-userstyle/>
- tobimori/awesome-userstyles (curated index of well-structured UserCSS themes) — <https://github.com/tobimori/awesome-userstyles>

## Sources

- <https://github.com/openstyles/stylus/wiki/Writing-UserCSS>
- <https://github.com/openstyles/stylus/wiki/Writing-styles>
- <https://github.com/openstyles/stylus/wiki/FAQ>
- <https://github.com/openstyles/usercss-meta>
- <https://github.com/stylish-userstyles/stylish/wiki/Valid-@-moz-document-rules>
- <https://developer.mozilla.org/en-US/docs/Web/CSS/@document>
- <https://userstyles.catppuccin.com/contributing/tutorials/writing-a-userstyle/>
- <https://userstyles.world/docs/faq>
- <https://github.com/openstyles/stylus/issues/995>
- <https://github.com/openstyles/stylus/issues/1667>
- <https://github.com/openstyles/stylus/issues/891>
- <https://github.com/openstyles/stylus/issues/299>
- <https://github.com/openstyles/stylus/issues/1422>
- <https://github.com/stylus/stylus/issues/2380>
- <https://news.ycombinator.com/item?id=17450306>
