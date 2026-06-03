# Theming JetBrains (IntelliJ Platform)
> The two-file theming surface for any IntelliJ-based IDE — a JSON UI theme that paints IDE chrome plus an XML editor color scheme that paints syntax, shipped together as a standalone plugin.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

JetBrains/IntelliJ Platform theming splits across **two files with different jobs**. The UI theme (`*.theme.json`) paints IDE **chrome** — toolbars, tool windows, dialogs, buttons, lists — by overriding Look-and-Feel keys on top of a base Light or Darcula theme. The editor color scheme (`.icls`, an XML file you rename to `.xml` to ship) paints **content** — syntax highlighting, gutter, caret, selection, VCS file-status colors. The theme JSON links to its scheme via the `editorScheme` key; together they ship as a standalone plugin (`theme.json` + `scheme.xml` + `plugin.xml` `themeProvider`). A bare `.icls` alone themes only the editor and appears under Color Scheme, not the Appearance picker.

The split matters for a palette-routed pipeline: the same Artificer semantic tokens have to be emitted in **two encodings** (bare hex in the XML, `#`-prefixed or named-reference in the JSON), and light/dark are **two separate file pairs** — there's no single-file auto-detection.

## Theme format

**UI theme** — JSON (`*.theme.json`): a flat-ish object with `name`, `dark` (bool), `author`, `editorScheme` (path string), `colors` (a named-color map), and `ui` (a nested map of `Component.property` keys, plus a `"*"` wildcard for cross-component properties). Values in `ui` may be literal hex, named-color references, or OS-conditional maps like `{os.mac, os.windows, os.default}`.

**Editor scheme** — XML: a `<scheme name parent_scheme version>` root containing a `<colors>` block (flat `<option name value>` for editor chrome) and an `<attributes>` block (per-token-type `<option name>` wrapping `<value><option name="FOREGROUND" .../>...</value>` for syntax roles).

**Plugin manifest** — `META-INF/plugin.xml` with `<idea-version since-build>`, `<depends>com.intellij.modules.platform</depends>`, and one `<themeProvider id="<uuid>" path="/x.theme.json"/>` per variant.

**Light/dark.** No auto-detection from a single file. Each variant is a separate `theme.json` with its own `dark` boolean (true → Darcula-based, false → Light/IntelliJ-Light-based) and its own editor scheme XML whose root `parent_scheme` is `Darcula` (dark) or `Default` (light). A multi-variant plugin registers one `themeProvider` per variant in the same `plugin.xml` (One Dark ships four). The IDE keeps two independent selectors — Appearance theme and Editor color scheme — and changing the UI theme does not always auto-switch the editor scheme.

## Distribution

Two viable shapes; pick based on whether picker integration is wanted.

**Editor-scheme-only (Category 1, paste/symlink).** The `.icls` alone. Rename to drop the `.icls` extension and drop it into the IDE per-version config `colors/` directory, or — more robustly — Import via **Settings → Editor → Color Scheme → gear → Import Scheme**. This themes only the editor, shows up under Color Scheme (not Appearance), and the drop-in path is fragile: the folder may not exist, the path is product+version+OS specific, and settings-sync redirects it.

**Packaged plugin (recommended for full theming).** A UI theme is a standalone IntelliJ **platform plugin** — `theme.json` + editor `.xml` + `META-INF/plugin.xml` with a `themeProvider` extension. Distribute by building the plugin zip and side-loading via **Settings → Plugins → Install from Disk**, or by publishing to JetBrains Marketplace. This is the only way to get the theme into the Appearance picker *and* auto-bind the editor scheme. Standalone theme plugins install without an IDE restart; don't bundle other functionality.

For the Artificer pipeline, treat it like the VS Code target: generate the plugin source tree, optionally side-load for dogfooding (analogous to the `~/.vscode/extensions` symlink pattern), Marketplace publish optional.

## build.mjs integration sketch

A `build.mjs` target reads `themes/_palette.json` (dark + light blocks of semantic hex tokens) and emits, per variant, a coordinated **pair** of files plus shared plugin scaffolding.

**1) Editor color scheme XML** (`artificer-dark.xml` / `artificer-light.xml`, the renamed `.icls`):

- Root: `<scheme name="Artificer Dark" parent_scheme="Darcula" version="142">` (light → `parent_scheme="Default"`). Pick the parent by the variant's `dark` flag.
- `<colors>` block: map editor-chrome tokens to named options — `bg` → `GUTTER_BACKGROUND` / `CONSOLE_BACKGROUND_KEY`, `fg` → line-number proxies, `accent` → `CARET_COLOR`/selection, `border` → `INDENT_GUIDE`, etc. Emit **bare hex without `#`** (`value: token.slice(1)`). Pad to 6 digits and don't drop a leading zero.
- `<attributes>` block: map syntax roles to `DEFAULT_*` fallback keys with nested `<value><option name="FOREGROUND" value="rrggbb"/></value>`: `keyword`→`DEFAULT_KEYWORD`, `string`→`DEFAULT_STRING`, `comment`→`DEFAULT_LINE_COMMENT`/`DEFAULT_BLOCK_COMMENT`, `type`→`DEFAULT_CLASS_NAME`, `function`→`DEFAULT_FUNCTION_DECLARATION`/`CALL`, `number`→`DEFAULT_NUMBER`. **Skip** any role you don't want to override so it inherits — do *not* write `value=""`.

**2) UI theme JSON** (`Artificer Dark.theme.json`):

- `{ name, dark: <variant.dark>, author, editorScheme: "/artificer-dark.xml", colors: {...}, ui: {...} }`
- `colors` map: lower the semantic tokens verbatim as named colors **with `#`** (`{ bg: token, accent: token, ... }`).
- `ui`: a `"*"` wildcard sets `background`→`"bg"`, `foreground`→`"fg"`, selection colors, `borderColor`→`"border"`, `focusedBorderColor`→`"accent"` **by name** (no `#`). Component-specific overrides (`Button.*`, `ActionButton.*`) reference the same names. Inline literals use `#RRGGBB` or `#RRGGBBAA` (alpha last, with `#`).

**3) `plugin.xml` scaffold:** `<idea-version since-build="...">`, `<depends>com.intellij.modules.platform</depends>`, one `<themeProvider id="<stable-uuid>" path="/Artificer Dark.theme.json"/>` per variant — **UUIDs generated once and committed, never regenerated per build.**

The key model split the generator must encode: **editor XML = bare hex, no `#`; theme JSON = `#`-prefixed hex OR bare named-color reference.** Same palette, two encodings.

## Gotchas

- **[verified]** `.icls` files are **diffs against `parent_scheme`** — colors you see in the editor may not exist in your XML. Export writes only attributes that differ from the parent (e.g. Darcula), so a token you want to control can be silently inherited at runtime and absent from the file; you must explicitly override roles you care about. Confirmed independently by the JetBrains Platform Blog ([Export IntelliJ editor themes as plugins](https://blog.jetbrains.com/platform/2017/12/export-intellij-editor-themes-as-plugins/)): "only the changed colors are included in the file… the root scheme element has a `parent_scheme` attribute pointing to Darcula."

- **[unconfirmed]** Per-element override is **all-or-nothing**: setting any one attribute on an `<option>` element disables inheritance of the rest — set `FOREGROUND` and you also drop the inherited `BACKGROUND`/`FONT_TYPE` to defaults, so plan each token's full attribute set. The rule is verbatim in the original SDK doc ([color-scheme-management](https://plugins.jetbrains.com/docs/intellij/color-scheme-management.html)) and is consistent with every real-world `.icls` examined, *but* no genuinely **independent** (different-author) source restates it — all apparent second sources are verbatim mirrors/translations of the same JetBrains doc, and third-party articles that might confirm it returned 403. Missing confirmation: a clean independent textual restatement of the "base attributes ignored" rule.

- **[verified]** `value=""` is **not** the same as the attribute being absent — an empty value suppresses the fallback chain and yields a wrong/blank color, so to inherit a default you must **omit** the option entirely rather than write an empty value. Confirmed via the SDK DevGuide mirror ([gavincook.gitbooks.io](https://gavincook.gitbooks.io/intellij-platform-sdk-devguide/content/reference_guide/color_scheme_management.html)) on the fallback mechanism, and by decoding One Dark's real `one_dark.xml`, which ships exactly these deliberate empty entries (`CONSOLE_BACKGROUND_KEY`, `FOLDED_TEXT_BORDER_COLOR`).

- **[verified]** Editor XML hex is **bare** (no `#`); theme.json hex needs `#` — and the parser branches on `startsWith('#')`. In `theme.json` a value is a literal color iff it starts with `#`; otherwise it's a lookup into the `colors` palette. So a palette *reference* must **not** have `#` and a *literal* **must**; mixing them up leaves colors silently wrong or unresolved. Confirmed against a real third-party scheme ([darekkay tomorrow-evening.icls](https://github.com/darekkay/config-files/blob/master/intellij-idea/config/colors/tomorrow-evening.icls), bare hex throughout) and against JetBrains' own `UITheme.java` parser, which branches on the `#` prefix and resolves no-`#` values through `theme.colors.get()`.

- **[verified]** 8-digit hex is **RGBA (alpha last)**, not AARRGGBB — both editor XML (`FFFFFFBE`) and theme.json (`#0273EB33`) put alpha at the end. Palettes authored Android-style as AARRGGBB will produce wrong opacity/hue unless the alpha byte is moved from front to back. Confirmed by JetBrains' own canonical [`HighContrast.theme.json`](https://github.com/JetBrains/intellij-community/blob/master/platform/platform-resources/src/themes/HighContrast.theme.json), whose partial-alpha values (`#000000C8`, `#E6E6E65A`) only make sense with the alpha byte trailing.

- **[verified]** A bare `.icls` **only themes the editor** — it does not appear in the Appearance theme picker; it lands under Editor → Color Scheme. Full IDE-chrome theming requires a packaged plugin with a `theme.json` + `themeProvider`, and users routinely expect the `.icls` to "be the theme." Confirmed by JetBrains' official [user-interface-themes help](https://www.jetbrains.com/help/idea/user-interface-themes.html): "The interface theme is not the same as the color scheme," and custom UI themes install as plugins, not `.icls` files.

- **[verified]** Drop-in `colors/` folder install is **fragile and version/OS/settings-sync dependent** — the directory may not exist, the path embeds the exact product+version, and settings-sync redirects it; the documented version-agnostic route is **Import Scheme** via the gear menu, so don't hardwire a single `~/.config/JetBrains/.../colors` path in install tooling. Confirmed by the independent [ayu-jetbrains](https://github.com/jesse-c/ayu-jetbrains) project ("the `colors` subdirectory — create it if it doesn't exist") plus varying product/version paths across third-party themes; only the literal `settingsRepository/colors` redirect string is unquoted, though the sync-redirect behavior is corroborated by YouTrack tickets.

- **[verified]** Switching the UI theme does **not reliably auto-switch its `editorScheme`** — two independent selectors are linked by a suppressible "change LaF on editor theme change" dialog; if a user ticked "don't ask again," the fix is editing `options.xml` (remove `change.laf.on.editor.theme.change`) while the IDE is closed. So a theme's `editorScheme` can appear ignored even when correctly declared. The two-selector + suppressible-coupling behavior is confirmed independently by the [Material Theme UI docs](https://material-theme.com/docs/faq-troubleshooting/); the precise property name and `options.xml` remedy remain single-domain (intellij-support).

- **[verified]** "Save as…" / duplicating a scheme **bakes plugin-default attributes into the copy**, breaking inheritance — copying a scheme copies *all* attributes including extension-provided defaults, so a derived scheme picks up colors you never set. Authoring from a near-empty diff against `parent_scheme` beats duplicating a populated scheme. The underlying parent_scheme inheritance model and "author a minimal diff" recommendation are confirmed independently by the JetBrains Platform [blog](https://blog.jetbrains.com/platform/2017/12/export-intellij-editor-themes-as-plugins/); the precise "plugin-default attribute baking" wording is single-origin but follows directly from the confirmed all-or-nothing rule.

## Tips & tricks

- **Delegate via `colors` + `"*"`.** Define `accent`/`bg`/`fg`/`border` once in the `colors` map, set `"*": { background, foreground, borderColor, ... }` by name, then override only the components that deviate. One Dark does exactly this and keeps its `ui` block small.
- **Lean on editor-scheme inheritance.** Keep `parent_scheme=Darcula`/`Default` and emit *only* the `DEFAULT_*` syntax roles Artificer actually owns (keyword/string/comment/type/function/number). Everything omitted inherits — smaller and more forward-compatible.
- **Target the `DEFAULT_*` fallback keys**, not language-specific ones (`DEFAULT_KEYWORD`, `DEFAULT_STRING`, `DEFAULT_LINE_COMMENT`, `DEFAULT_CLASS_NAME`, `DEFAULT_FUNCTION_DECLARATION`, `DEFAULT_NUMBER`) — those fallbacks paint every language at once.
- **Author interactively, then export.** Build the scheme in the IDE, Export to `.icls`, rename to `.xml` — far easier than hand-writing option names. The UI Inspector (Cmd+Opt+Click) and the LaF Defaults window reveal the exact `ui` keys for chrome.
- **Generate `themeProvider` UUIDs once and commit them** — never regenerate per build; the SDK warns against changing them, and parent-theme inheritance keys off the `id`.
- **Leave `until-build` unset** (or use strict-until-build only when publishing per-major-version) so one theme plugin works across future IDE builds — themes rarely break on platform bumps.
- **Reuse one editor scheme across variants** when only chrome differs (One Dark's standard + islands share `one_dark.xml`) — cuts maintenance.

## Fit assessment

**Medium effort, worth adding.** The hard work is one-time: a `build.mjs` target that emits the `theme.json` + editor `.xml` + `plugin.xml` scaffold from `_palette.json`, plus generate-once committed UUIDs. It parallels the existing VS Code target (semantic-hex → JSON) closely, so palette routing is straightforward; the only real complexity is the two-encoding split (bare hex in XML, `#`-hex/named in JSON) and the editor-scheme `<attributes>` block. Distribution can mirror VS Code: side-load the plugin for dogfooding, Marketplace optional. The payoff is a broad, frequently-used surface — any IntelliJ-based IDE — for modest incremental pipeline cost.

## Where to get the authoritative docs

**Official spec / schema / API reference:**

- IntelliJ Plugin SDK — Theme Structure (`theme.json` keys): https://plugins.jetbrains.com/docs/intellij/theme-structure.html
- IntelliJ Plugin SDK — Customizing Themes (named-color map + `ui` wildcard): https://plugins.jetbrains.com/docs/intellij/themes-customize.html
- IntelliJ Plugin SDK — Editor Schemes & Background Images (`editorScheme` key, `.icls`→`.xml`, hex format): https://plugins.jetbrains.com/docs/intellij/themes-extras.html
- IntelliJ Plugin SDK — Color Scheme Management (`parent_scheme`, fallback keys, all-or-nothing rule): https://plugins.jetbrains.com/docs/intellij/color-scheme-management.html
- IntelliJ Plugin SDK — Platform Theme Colors (standard color key catalog): https://plugins.jetbrains.com/docs/intellij/platform-theme-colors.html
- JetBrains blog — Creating Custom Themes for IntelliJ Platform IDEs: https://blog.jetbrains.com/platform/2019/03/creating-custom-themes-for-intellij-platform-ides/

**Community themes to crib from:**

- One Dark (`theme.json` + `one_dark.xml` + `plugin.xml`, multi-variant): https://github.com/one-dark/jetbrains-one-dark-theme/tree/main/src/main/resources
- JetBrains `colorSchemeTool` (official scheme-conversion reference): https://github.com/JetBrains/colorSchemeTool
- darekkay config-files (real `.icls` editor schemes, bare-hex reference): https://github.com/darekkay/config-files/tree/master/intellij-idea/config/colors

## Sources

- https://plugins.jetbrains.com/docs/intellij/theme-structure.html
- https://plugins.jetbrains.com/docs/intellij/themes-customize.html
- https://plugins.jetbrains.com/docs/intellij/themes-extras.html
- https://plugins.jetbrains.com/docs/intellij/color-scheme-management.html
- https://plugins.jetbrains.com/docs/intellij/platform-theme-colors.html
- https://blog.jetbrains.com/platform/2019/03/creating-custom-themes-for-intellij-platform-ides/
- https://blog.jetbrains.com/platform/2017/12/export-intellij-editor-themes-as-plugins/
- https://github.com/one-dark/jetbrains-one-dark-theme/tree/main/src/main/resources
- https://github.com/JetBrains/colorSchemeTool
- https://github.com/JetBrains/intellij-community/blob/master/platform/platform-resources/src/themes/HighContrast.theme.json
- https://github.com/darekkay/config-files/blob/master/intellij-idea/config/colors/tomorrow-evening.icls
- https://github.com/jesse-c/ayu-jetbrains
- https://gavincook.gitbooks.io/intellij-platform-sdk-devguide/content/reference_guide/color_scheme_management.html
- https://material-theme.com/docs/faq-troubleshooting/
- https://www.jetbrains.com/help/idea/user-interface-themes.html
- https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000452590-IntelliJ-not-able-to-find-icls-files-Renaming-them-to-xml-allows-them-to-be-found-Is-this-good
- https://intellij-support.jetbrains.com/hc/en-us/community/posts/207201075-Unable-to-install-custom-colors-fonts-theme
- https://intellij-support.jetbrains.com/hc/en-us/community/posts/360003100039-2018-3-4-Community-Edition-editor-color-scheme-not-working
