# Theming Emacs
> Editor chrome plus the full font-lock syntax family, expressed as executable Elisp face data — one file (or two) that must serve GUI true-color, 256-color, and 16-color terminals from a single source.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

An Emacs theme targets editor chrome and syntax at once: the frame and `default` background, mode-line, fringe/gutter, cursor, region/selection, line numbers, tab-bar, plus the full `font-lock-*` family — keyword, string, comment, type, function, constant, builtin, variable. Themes are pure Elisp data files (`<name>-theme.el`) that register face overrides via `custom-theme-set-faces` and package variable overrides via `custom-theme-set-variables`.

Because faces carry display-conditional specs, one theme file can serve GUI true-color, 256-color tty, and 16-color tty from a single source — but only if the author writes those branches explicitly. That conditional-branch discipline is exactly where most themes fall down, and it is the bulk of the real work in adopting Artificer here.

## Theme format

An Emacs theme is an Elisp source file named `<name>-theme.el`. The `-theme.el` suffix is mandatory, and the symbol before it must equal the `deftheme` name. Structure:

- First line carries the file-local cookie: `-*- lexical-binding: t; no-byte-compile: t; -*-`.
- First form MUST be `(deftheme name "docstring")`.
- Body is one `(custom-theme-set-faces 'name SPEC...)` and optionally `(custom-theme-set-variables 'name VAR...)`.
- Last form MUST be `(provide-theme 'name)`; MELPA packages also add `(provide 'name-theme)`.

There is no JSON or schema — it is executable code, loaded with `load-theme`. Each face SPEC is `(face-symbol ((DISPLAY . ATTRS) ...))`, where DISPLAY is `t` (all displays) or a display-condition alist like `((class color) (min-colors 256))`. The idiomatic shape wraps everything in a `let` that binds the palette to symbols, then reuses them with backquote/comma across the face list.

**Color model.** Strings only — there is no native color struct. Every color attribute (`:foreground`, `:background`, `:underline (:color ...)`) is a hex string (`"#rrggbb"` or 48-bit `"#rrrrggggbbbb"`), an X11 name (`"grey55"`), or a terminal index/name (`"color-22"`, `"brightwhite"`). Artificer's hex tokens map 1:1 to GUI `:foreground`/`:background` strings with zero conversion. The only conversion needed is for terminal branches: a 24-bit hex like `#B0B9F9` must be quantized to a 256-color cube index for the `(min-colors 256)` branch and to one of the 16 ANSI names for the 16-color branch. The doom-themes palette format encodes this explicitly as `(name "#guihex" "256term" "16term")` triples.

**Light/dark.** Two separate files/symbols — `artificer-dark-theme.el` and `artificer-light-theme.el` — is the dominant pattern (modus-operandi/modus-vivendi, doom-one/doom-one-light) and matches how Artificer already emits dark and light blocks. Emacs has no built-in "variant" concept inside one `deftheme`; the `:background-mode` property is advisory metadata, not a switch. A single file *can* serve both by branching every face on `((background light) ...)` vs `((background dark) ...)`, but it is rare and verbose. Runtime switching is additive, so it requires `(mapc #'disable-theme custom-enabled-themes)` before `(load-theme 'other t)`.

## Distribution

This is a **Category 1 — selector file** target. The theme ships as one or two self-contained `.el` files the user drops into a directory on `custom-theme-load-path` and activates with `(load-theme 'artificer-dark t)`. No `@import`/include mechanism exists, so it is not Category 2.

For Cameron's dotfiles, distribution is symlink/copy into `~/.emacs.d/themes/` plus a one-line load in init. Common install locations:

- `~/.emacs.d/themes/` via `(add-to-list 'custom-theme-load-path "~/.emacs.d/themes/")`
- `~/.config/emacs/themes/` (XDG layout, Emacs 27+)
- `~/.doom.d/themes/` or `~/.config/doom/themes/` (Doom convention, then `(setq doom-theme 'artificer-dark)`)
- `~/.emacs.d/elpa/artificer-themes-<version>/` (package.el auto-adds it to `custom-theme-load-path`)
- Any dir on `custom-theme-load-path`; the `custom-theme-directory` symbol is also honored

For public reach it becomes a MELPA package: add the default `:files`, header cookies, `Package-Requires`, push to a tagged Git repo, and submit a recipe `(artificer-themes :fetcher github :repo "cameronsjo/...")` as a PR. MELPA generates the `-pkg.el` — do **not** commit one — and reviewers prefer forge fetchers and reject README-in-package.

## build.mjs integration sketch

`build.mjs` reads `themes/_palette.json` (dark + light blocks of semantic hex tokens: `bg`, `bg-raised`→`bg-alt`, `fg`, `fg-secondary`→`fg-alt`, `accent`, `success`, `attention`, `urgent`, `border`, plus syntax roles keyword/string/comment/type/function/constant/builtin/variable). For each mode it emits one `<name>-theme.el` string:

1. Header line with the `lexical-binding` + `no-byte-compile` cookie.
2. `(deftheme artificer-dark "...")`.
3. A `(let (...))` binding the palette tokens to symbols (their hex strings) plus a `class` symbol bound to `'((class color) (min-colors 256))`.
4. A backquoted `(custom-theme-set-faces 'artificer-dark FACE...)` where the generator iterates a static face→token map: `bg`→`default :background`, `fg`→`default :foreground`, `accent`→`link`/`button`/`minibuffer-prompt`, `urgent`→`error`, `attention`→`warning`, `success`→`success`, `border`→`vertical-border`/`fringe`, and the syntax roles to `font-lock-keyword/string/comment/type/function/constant/builtin/variable-name-face`, plus `region`/`highlight`/`cursor`/`mode-line`/`line-number`.
5. Optional `custom-theme-set-variables` for package color-var lists (e.g. ansi-color, hl-todo).
6. `(provide-theme 'artificer-dark)` and `(provide 'artificer-dark-theme)`.

For tty support the generator emits, per face, a second display branch `(((class color) (min-colors 256)) ...)` carrying a 256-quantized version of each hex (a small hex→xterm256 index function in `build.mjs`), falling to `(((class color)) ...)` with the nearest ANSI-16 name. **The face→token table is the only hand-curated artifact; everything else is mechanical string templating.**

## Gotchas

- **[verified]** A theme is additive, never replacing — loading a new theme over an old one layers faces and leaves residue. `load-theme` only *adds* settings; switching without `(mapc #'disable-theme custom-enabled-themes)` first leaves stale mode-line/region/syntax colors bleeding through, and even `disable-theme` reverts a face to its previous *layered* value, not the pristine default, so deep stacks can need a fresh session. Confirmed independently by Greg Hendershott's "Emacs Themes" post (greghendershott.com), which documents `custom-enabled-themes` as a stack ("layer this theme on top of those already enabled"), the Solarized-with-Material-org-headings bleed-through symptom, and the exact `mapc #'disable-theme` remedy.

- **[verified]** 24-bit hex specced under `t` renders as garbage on a 256-color terminal — colors silently quantize wrong. A tty Emacs (or `emacsclient -nw` attaching to a GUI daemon) maps hex into its limited cube and produces unusable results; the fix is explicit ordered display branches gated by `(min-colors 256)`/`(min-colors 16)`, most-capable first, since `min-colors` is a top-down minimum threshold. Confirmed by Protesilaos's "Notes for aspiring Emacs theme developers" (protesilaos.com, four years before the original genehack source), which documents the conditionalized display-class mechanism, the `t` catch-all fallback, and sequential cond-like evaluation; the Autothemer docs corroborate the "sub par in the terminal" symptom and the exact min-colors tiers.

- **[verified]** The `default` face MUST set both `:foreground` and `:background` — it is the universal fallback and the frame background. Every other face inherits unspecified attributes from `default`, and its `:background` becomes the frame background; leaving either unset produces white-through or invisible text. Confirmed by the EmacsWiki UnspecifiedBackground page (community-authored, separate domain), which documents the terminal-background-shows-through failure and the `"unspecified-bg"` workaround. Note: the corollary that hard-setting `default` via `set-face-attribute` in init "breaks theme loading entirely" is *overstated* — independent sources describe it as an ordering/layering conflict (set the *font* there, let the theme own colors), not a hard break.

- **[verified]** First-load triggers a "theme is not safe" confirmation prompt unless hash-allowlisted or loaded with no-confirm. Because themes are arbitrary code, `load-theme` prompts before first load; `(load-theme 'artificer-dark t)` passes `no-confirm=t`, and trust-by-content requires the SHA-256 in `custom-safe-themes` — set *before* the `load-theme` call or the prompt still fires. Confirmed by GNU bug#8720 (David Engster), which pins the ordering trap: during startup "the customize section simply hasn't been read yet," so the saved hash isn't in effect and the prompt fires anyway. Unattended/dotfile installs that omit the `t` arg hang on the prompt.

- **[verified]** Theme files must NOT be byte-compiled — ship the `no-byte-compile: t` cookie. Emacs deliberately loads themes from source (so it can display them for the safety prompt), and a stale or present `.elc` can shadow source edits, causing "I changed the colors but nothing updated." Confirmed by the GNU Elisp Reference Manual: "themes are not ordinarily byte-compiled, and source files usually take precedence"; the `require-theme` path searches `.elc` before `.el`, so an outdated `.elc` shadows edited source. MELPA's auto-generated `-pkg.el` descriptors ship exactly this cookie.

- **[verified]** Package color *variables* (not faces) are invisible until you know they exist, and need `custom-theme-set-variables`. Some packages color themselves through Lisp variables holding color lists/plists (`hl-todo-keyword-faces`, `ansi-color-names-vector`, `org-todo-keyword-faces`); `custom-theme-set-faces` cannot reach these, there is no discovery mechanism, and a face-only generator silently leaves these surfaces unthemed. Confirmed by Dracula theme issue #75 (github.com/dracula/emacs), where a user requests `ansi-color-names-vector` be set via `custom-theme-set-variables` so shell/comint colors match. Caveat: `ansi-color-names-vector` specifically is obsolete in Emacs 28+; `hl-todo-keyword-faces` and `org-todo-keyword-faces` remain live examples.

- **[verified]** `(min-colors 89)` vs `(min-colors 256)` is a real fork — 88-color terminals and the 89 cutoff are a legacy trap. The classic community spec uses `(min-colors 89)` (just above old 88-color rxvt); doom/modern themes use 256. Picking the wrong threshold dumps a capable display to the 16-color fallback or hands it a branch it can't render. Confirmed by the GNU emacs-devel thread "Why min-colors 88?" (2006), where Stefan Monnier states the 88 threshold exists because "there's an 88-color xterm whose color set is rich enough." Order branches high→low and test in `-nw`, not just GUI.

- **[verified]** doom-themes' base depends on `base0`–`base8` + `bg`/`bg-alt`/`fg`/`fg-alt` being defined — omit one and the base theme errors. If you target the doom-themes framework instead of raw `deftheme`, `def-doom-theme` requires the full base ramp because `doom-themes-base` references those symbols as bare unbound variables. Confirmed by `doom-themes-base.el` (an independent file from the original `doom-one-theme.el` source), which references e.g. `(highlight :background highlight :foreground base0 :distant-foreground base8)` — any missing rung raises void-variable at apply. Mapping Artificer's flat semantic palette onto the 9-step ramp is non-trivial; **raw `deftheme` avoids this coupling entirely.**

- **[verified]** MELPA rejects committed `-pkg.el`, README-in-package, and `:url` on forge fetchers. The `-pkg.el` is auto-generated from the main file's headers; forge fetchers (github/gitlab/codeberg/sourcehut) require `:repo "user/name"` and forbid `:url`. Confirmed by MELPA's `package-build/package-recipe.el` enforcement code, which asserts `:repo` is present and `:url` is redundant (a hard rejection), plus GNU ELPA conventions that the `-pkg.el` is auto-generated and not committed. Minor mislabel in the original: the `:url`/`-pkg.el` rejections happen at the recipe-build layer, not `package-lint` (which lints the `.el` headers) — net effect (recipe bounced) is unchanged.

## Tips & tricks

- **Bind the palette once** in a `let` (plus a `class` symbol for the display condition) and reference via backquote/comma — this eliminates copy-paste hex drift across hundreds of faces, the single biggest maintenance win.
- **Lean on `:inherit` to delegate.** Theme a small set of base faces (`font-lock-keyword-face`, `error`, `warning`, `success`) and let dozens of package faces inherit them — fewer faces to generate, automatic consistency.
- **Derive shades, don't add palette entries.** doom-themes ships `doom-darken`/`doom-lighten`/`doom-blend`; if targeting that framework, derive `bg-alt`/`border`/hover shades from base tokens, mirroring Artificer's `accent-bright`/`bg-raised` derivation intent.
- **Reuse the terminal's own ANSI palette.** Set `ansi-color-names-vector` / the 16 term color names from Artificer's syntax roles so tty Emacs and the surrounding Ghostty/tmux Artificer theme agree, rather than fighting the cube.
- **Author dark+light as two files sharing a generated palette include**, matching modus-operandi/modus-vivendi — keeps each file a clean Cat-1 selector and lets users `load-theme` either independently.
- **Pre-empt the trust prompt.** Ship `(load-theme 'artificer-dark t)` (no-confirm) snippets in install docs, or publish the SHA-256 for `custom-safe-themes` — never leave users to hit the prompt on a headless/daemon start.
- **Discover the real face universe.** Run `M-x list-faces-display` in a live session loaded with the user's actual packages before locking the generator's face→token map; the built-in face list is incomplete.

## Fit assessment

**Medium effort, worth adding.** The core — dark+light raw-`deftheme` files generated from the existing semantic palette via string templating — is low effort and maps cleanly to `build.mjs`, since Emacs faces are just hex strings identical to the GUI case Artificer already produces. The added cost is the tty branches: a hex→xterm256 quantizer plus an ANSI-16 fallback, and the one-time hand-curation of the face→token map (`font-lock-*`, mode-line, region, line-number, etc.).

Skipping tty support entirely (GUI-only, `t` specs) makes it trivial but ships a theme that breaks for terminal/daemon Emacs users — and Cameron runs headless/tty Emacs, so the tty branch is **not optional** for his own use. Recommendation: ship as a Cat-1 dual-file target in the pipeline; defer MELPA submission until the palette is stable.

## Where to get the authoritative docs

**Official spec / reference:**

- Elisp manual — Custom Themes (`deftheme`/`custom-theme-set-faces`/`-variables`/`provide-theme`/`load-theme`/`custom-theme-load-path`): https://www.gnu.org/software/emacs/manual/html_node/elisp/Custom-Themes.html
- Elisp manual — Defining Faces (defface spec, display conditions, `min-colors`/`class`/`type`/`background`): https://www.gnu.org/software/emacs/manual/html_node/elisp/Defining-Faces.html
- MELPA CONTRIBUTING.org — recipe format, fetchers, header/lint requirements, no committed `-pkg.el`: https://github.com/melpa/melpa/blob/master/CONTRIBUTING.org

**Community themes to crib from:**

- modus-themes (modus-operandi) — exemplary dual-file + accessible display-condition discipline: https://raw.githubusercontent.com/protesilaos/modus-themes/main/modus-operandi-theme.el
- doomemacs/themes (doom-one) — `def-doom-theme` palette format with GUI/256/16 triples: https://github.com/doomemacs/themes/blob/master/themes/doom-one-theme.el
- base16-emacs — generated-theme reference pattern (palette-driven templating): https://github.com/tinted-theming/base16-emacs

## Sources

- https://www.gnu.org/software/emacs/manual/html_node/elisp/Custom-Themes.html
- https://www.gnu.org/software/emacs/manual/html_node/elisp/Defining-Faces.html
- https://www.gnu.org/software/emacs/manual/html_node/emacs/Faces.html
- https://protesilaos.com/codelog/2020-08-28-notes-emacs-theme-devs/
- https://emacsredux.com/blog/2026/03/30/creating-emacs-color-themes/
- https://genehack.blog/2024/07/i-have-this-thing-where-i-get-older-but-just-never-wiser/
- https://www.greghendershott.com/2017/02/emacs-themes.html
- https://github.com/doomemacs/themes/blob/master/themes/doom-one-theme.el
- https://github.com/doomemacs/themes/blob/master/doom-themes-base.el
- https://github.com/suvayu/.emacs.d/blob/master/themes/dark-emacs-theme.el
- https://raw.githubusercontent.com/protesilaos/modus-themes/main/modus-operandi-theme.el
- https://github.com/tinted-theming/base16-emacs
- https://github.com/MArpogaus/base16-doom
- https://github.com/dracula/emacs/issues/75
- https://www.emacswiki.org/emacs/UnspecifiedBackground
- https://gnu.emacs.bug.narkive.com/0QWryLRA/bug-8720-24-0-50-load-theme-in-emacs-makes-it-easy-to-inadvertently-delete-custom-set-variables
- https://lists.gnu.org/archive/html/emacs-devel/2006-02/msg00177.html
- https://github.com/melpa/melpa/blob/master/CONTRIBUTING.org
- https://www.emacswiki.org/emacs/CompiledFile
- https://emacsgifs.github.io/Autothemer
