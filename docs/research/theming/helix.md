# Theming Helix
> A terminal-bound editor theme: a single TOML file that colors both editor chrome (statusline, gutter, menus, selections, cursor) and content (tree-sitter syntax, markup, diff scopes).

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Helix themes color both editor chrome — the UI: statusline, gutter, line numbers, menus, popups, pickers, selections, cursor, virtual text — and content: tree-sitter syntax scopes plus markup and diff scopes. A single TOML file maps style keys to colors; there is no separate syntax-vs-UI file. Theming is purely color and modifier — no layout, no fonts. Because Helix is terminal-bound, colors are always drawn solid (no alpha), and named colors fall back to the terminal's 16-color palette.

## Theme format

A TOML file with a `.toml` extension. Top-level keys are style scopes. Each value is either a bare color string (`key = "#fff"`, which sets the foreground only) or an inline table: `key = { fg = "...", bg = "...", underline = { color = "...", style = "curl" }, modifiers = ["bold","italic"] }`. Dotted scope names **must** be quoted (`"ui.selection.primary"`). An optional top-of-file `inherits = "theme_name"` extends another theme, and a trailing `[palette]` table defines named colors. There is no published JSON schema — validation happens at load time in the Rust loader.

**Color model.** Hex RGB strings only: `#RRGGBB` (3-digit `#RGB` is also accepted). There is **no alpha channel** — Helix has no transparency or opacity support at all. Any `#RRGGBBAA` tokens in `_palette.json` (diff backgrounds, scrim/overlay alphas) must be flattened to 6-digit hex — drop the `AA` or pre-composite over `bg` — before emission. Colors may also be one of the 16 named terminal colors, but Artificer should ignore those and always emit hex via `[palette]`. Transparency is achieved only by unsetting a key (`"ui.background" = {}`), never by an alpha value.

**Light/dark.** Two completely separate `.toml` files — Helix has no light/dark flag inside a theme and no in-file conditional. The user selects one via `theme = "artificer-dark"` in `config.toml` or `:theme artificer-light` at runtime. Helix has experimental OS-appearance auto-switching (Discussion #10281) for syncing two themes to the OS setting, but the canonical, portable approach is two files. Artificer ships both `artificer-dark.toml` and `artificer-light.toml`, generated from the `dark`/`light` blocks of `_palette.json`.

## Distribution

This is a **Category 1 — selector-file** target. Each theme is a standalone `.toml` dropped into the themes directory, then selected by name (filename minus `.toml`) in `config.toml` (`theme = "artificer-dark"`) or at runtime (`:theme artificer-dark`). No `@import`, no include, no fragment splicing — it is a whole file the user installs. Distribute by symlink (Artificer's preferred pattern) or by copy. The themes directory must exist first; Helix won't create it. Reserved names `default` and `base16_default` cannot be used as filenames.

Install paths:

- `~/.config/helix/themes/artificer-dark.toml` (Linux/macOS)
- `~/.config/helix/themes/artificer-light.toml`
- `%AppData%\helix\themes\artificer-dark.toml` (Windows)
- Built-in themes ship in the Helix runtime dir (`<helix-runtime>/themes/`); a user theme in `~/.config` overrides a runtime theme of the same name.
- Selected via `theme = "artificer-dark"` in `~/.config/helix/config.toml`.

## build.mjs integration sketch

A `helixTheme(mode)` generator in `build.mjs`, mirroring the existing `claudeCodeTheme(mode)` and `vscodeTheme(mode)` functions. It picks `P = mode === 'dark' ? D : L`, then emits a TOML string in this order (order matters — see the `[palette]` gotcha):

1. **Header** — skip `inherits` entirely. Artificer ships a full standalone theme (see the inherit-fragility gotchas).
2. **UI scopes** — string-key = palette-name pairs, dotted keys quoted: `"ui.background" = "bg"`, `"ui.text" = "fg"`, `"ui.statusline" = { fg = "fg", bg = "bgRaised" }`, `"ui.selection" = { bg = "border" }`, `"ui.selection.primary" = { bg = "borderLifted" }`, `"ui.cursor.primary" = { fg = "bg", bg = "accent" }`, plus gutter/linenr/menu/popup/virtual.* etc.
3. **Diagnostics** — `error`/`warning`/`info`/`hint` and `diagnostic.*` mapped to urgent/attention/cyan/fgMuted, with `underline = { color = "...", style = "curl" }`.
4. **Syntax scopes** — drive directly from `_palette.json` `$roles.syntax`: `keyword`→brandPurpleBright, `string`→successBright, `comment`→fgMuted (+ `modifiers=["italic"]`), `type`→accentBright, `constant`→attentionAlt, `function`→accent, `namespace`→cyan, `variable.parameter`→steel, `tag`→urgentBright, `operator`→fgMuted, `variable`→fg. Add `constructor`, `constant.numeric`, `punctuation`, `keyword.control.*`, `function.macro`, `markup.heading`/`markup.bold` (modifiers)/`markup.link.url` (underline), `diff.plus`/`diff.minus`/`diff.delta`.
5. **`[palette]` table LAST** — emit every used semantic token as `name = "#hex"`, e.g. `bg = "#292c33"`. Build a Set of referenced token names and dump only those (or all). Each name maps 1:1 to a `_palette.json` key, hex passed through verbatim minus alpha.

Write to `themes/helix/artificer-dark.toml` and `themes/helix/artificer-light.toml`. The role-name indirection in `$roles.syntax` already matches Helix's model exactly (semantic name → palette color), so the mapping is nearly an identity transform.

## Gotchas

- **[verified]** The `[palette]` table must be the **last** table in the file — every key after the `[palette]` header is parsed as a palette color, not a scope. This rests on standard TOML table-header semantics, confirmed independently by the [TOML v1.0.0 spec](https://toml.io/en/v1.0.0): "Under that, and until the next header or EOF, are the key/values of that table." Because a Helix theme has no other table headers below `[palette]`, any scope key placed after it (e.g. `"keyword" = ...`) is silently absorbed as a palette color. Generators must emit all scope keys first, then the single `[palette]` table at the very end.

- **[refuted]** The claim that `ui.selection` and `ui.selection.primary` *must* have different backgrounds or the theme is rejected is **false**. Helix does not validate distinctness, and a theme with equal selection backgrounds loads fine — the shipped default theme itself sets **both** to `{ bg = "#540099" }` and loads. Independent corroboration in [issue #3842](https://github.com/helix-editor/helix/issues/3842) confirms "many built-in themes do not have a separate highlight color for the primary selection" and they load without rejection; the concern is purely visual distinguishability for multi-cursor work. The actual `ui.selection` rejection trigger is the key being **missing** or a TOML syntax error elsewhere — never equality. Artificer is free to reuse one token; using `border` vs `borderLifted` is a reasonable aesthetic choice, not a requirement.

- **[verified]** The `ui.selection` error is a misleading catch-all — it fires for unrelated TOML syntax errors. The Qiita tutorial by GreasySlug ([qiita.com](https://qiita.com/GreasySlug/items/b25ce9d37c4371960b81)) warns that "syntax errors and the like are ALL displayed as `ui.selection`," and issue #10509 shows a real case where bare (unquoted) dotted keys surfaced as a spurious "ui.selection is missing." Treat any `ui.selection` error as a generic "something is wrong" signal and grep the TOML for typos first.

- **[verified]** No alpha channel anywhere — transparency only via unsetting `ui.background`, and results are terminal-dependent. The official [theme docs](https://docs.helix-editor.com/themes.html) document only 6-digit hex (no rgba, no `#RRGGBBAA`); discussion #4092 confirms the only transparency mechanism is removing/unsetting `ui.background` (`= {}`), as `base16_transparent` does; and issue #13899 confirms the terminal dependency — Helix honors terminal opacity only with `bg = "#000000"` and even then only in kitty, not reliably in alacritty. Any alpha in `_palette.json` must be flattened to 6-digit hex.

- **[verified]** `inherits` cannot **unset** a key the parent defined — only override it. There is no `key = {}`-to-remove semantics for inherited keys, confirmed independently by [issue #12740](https://github.com/helix-editor/helix/issues/12740) (a different reporter than the original #5053): modifying any property of an inherited style overrides the parent wholesale, and there is no syntax to selectively clear an inherited value. This argues for shipping fully self-contained themes rather than inheriting.

- **[verified]** Inheriting from base16/terminal-color themes historically broke with a cascade of "missing fg/bg" errors. `base16_default` derives colors from the terminal rather than defining concrete hex, so inheriting from it left required keys (`ui.text`, `ui.background`, `ui.selection`) undefined and the theme failed validation. Corroborated by [DeepWiki's theming-system page](https://deepwiki.com/helix-editor/helix/3.3-theming-system) (independent domain) on the merge/inheritance mechanics; fixed via PR #5218, but it underscores that inheriting from terminal-derived bases is fragile — define explicit colors. (Nuance: the "base16" name is ambiguous — some base16 variants use hex; the #5156 failure also involved a non-reserved `base16_theme` name-resolution bug — but the headline gotcha holds.)

- **[verified]** The `underlined` modifier is deprecated; use the underline table with an explicit style. `modifiers = ["underlined"]` still works for back-compat and equals `underline = { style = "line" }`, but the modern form is `underline = { color = "...", style = "line|curl|dashed|dotted|double_line" }`. Confirmed by [PR #4061](https://github.com/helix-editor/helix/pull/4061) (pascalkuthe), which introduced the change because underline styles are mutually exclusive and misbehave as modifiers. For diagnostics, use the underline table to control both color and squiggle style.

- **[verified]** Reserved theme names: a file named `default.toml` or `base16_default.toml` is silently ignored. Those two names are reserved for built-ins. The Helix source ([helix-view/src/theme.rs](https://raw.githubusercontent.com/helix-editor/helix/master/helix-view/src/theme.rs)) confirms the loader short-circuits on both names before any filesystem lookup, so a user file of that name is never read. Artificer's filenames avoid this, but a generator must never emit those reserved names.

## Tips & tricks

- Helix's scope model is already a semantic-name → palette-color indirection, identical to Artificer's `$roles.syntax` map. The conversion is nearly an identity transform: emit each role's hex into `[palette]` under a stable name, reference it by name in the scope. Minimal logic in `build.mjs`.
- Longest-matching-key wins: define broad scopes (`keyword`, `function`, `type`) and only add narrower ones (`keyword.control.return`, `function.macro`) where Artificer wants a distinct color. You don't have to enumerate every tree-sitter subscope.
- Use the `[palette]` indirection rather than inlining hex per scope — one token change in `_palette.json` then propagates to every scope that references it, matching how the rest of the pipeline behaves.
- Map the four diagnostics underline colors to urgent/attention/cyan/fgMuted and pick `style = "curl"` for errors so squiggles read as Artificer even in monochrome terminals.
- Ship standalone themes (no `inherits`) — given the unset/base16 inherit bugs, a self-contained file is more portable and predictable across Helix versions.
- Validate by loading: open `hx`, then `:theme artificer-dark` surfaces load errors immediately. Treat any `ui.selection` error as a generic "something is wrong" signal and grep the TOML for typos.

## Fit assessment

Low-to-medium effort, high fit — worth adding to the Artificer pipeline. Helix's scope model is a near-perfect match for Artificer's existing `$roles.syntax` indirection, so a `helixTheme(mode)` generator parallels the existing `claudeCodeTheme`/`vscodeTheme` functions with mostly mechanical mapping. The only real work is flattening alpha tokens to 6-digit hex and ensuring `ui.selection` ≠ `ui.selection.primary` (an aesthetic nicety, not a hard requirement); both are one-liners.

## Where to get the authoritative docs

- **Official theme docs (spec/reference):** https://docs.helix-editor.com/themes.html
- **Authoritative source (master, fuller scope list):** https://github.com/helix-editor/helix/blob/master/book/src/themes.md
- **Default theme source (required-key set):** https://github.com/helix-editor/helix/blob/master/theme.toml
- **Community theme — Gruvbox (built-in reference):** https://github.com/helix-editor/helix/blob/master/runtime/themes/gruvbox.toml
- **Community theme — Catppuccin (palette-driven structure to crib):** https://github.com/catppuccin/helix

## Sources

- https://docs.helix-editor.com/themes.html
- https://github.com/helix-editor/helix/blob/master/book/src/themes.md
- https://github.com/helix-editor/helix/blob/master/runtime/themes/gruvbox.toml
- https://github.com/catppuccin/helix
- https://github.com/helix-editor/helix/issues/5053
- https://github.com/helix-editor/helix/issues/5156
- https://github.com/helix-editor/helix/issues/12601
- https://github.com/helix-editor/helix/issues/2247
- https://github.com/helix-editor/helix/issues/4740
- https://github.com/helix-editor/helix/issues/11456
- https://github.com/helix-editor/helix/discussions/10281
- https://github.com/helix-editor/helix/pull/5218
- https://toml.io/en/v1.0.0
- https://github.com/helix-editor/helix/issues/3842
- https://qiita.com/GreasySlug/items/b25ce9d37c4371960b81
- https://github.com/helix-editor/helix/issues/12740
- https://deepwiki.com/helix-editor/helix/3.3-theming-system
- https://github.com/helix-editor/helix/pull/4061
- https://raw.githubusercontent.com/helix-editor/helix/master/helix-view/src/theme.rs
