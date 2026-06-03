# Theming Windows Terminal
> A flat 16-color ANSI scheme (plus bg/fg/cursor/selection) applied per-profile and shipped as an auto-discovered JSON fragment — terminal content only, not window chrome.

**Date:** 2026-05-29
**Lane:** 3 (research)

---

## Overview

Windows Terminal theming is split across three places, none of which is a single self-contained theme file. (1) Color **schemes** — the 16-color ANSI palette plus `background`/`foreground`/`cursorColor`/`selectionBackground` — live in a `schemes` array and are what most people mean by "theme." (2) A scheme is applied **per-profile** (or in `defaults`) via the `colorScheme` property; a scheme defined but never referenced does nothing. (3) Window **chrome** — tab bar, title bar, tab row — is a separate `theme` object entirely, not part of a color scheme.

So an Artificer color theme touches terminal *content* (ANSI text/bg) and cursor/selection, but leaves tab/title chrome alone unless we also author a `theme`. That maps cleanly to how the existing Ghostty and tmux targets already think: a palette-to-ANSI table. The catch is everything *around* the table — distribution, light-mode defaults, and the bold-text trap — which is where the effort actually lives.

## Theme format

JSON. Either (a) a scheme object inside the `schemes` array of `settings.json`, or (b) a standalone JSON Fragment Extension file with a top-level `schemes` array (and optionally `profiles` with `updates` entries). A scheme object is flat: `name` + the 16 ANSI color keys (`black`..`brightWhite`) + optional `background`, `foreground`, `cursorColor`, `selectionBackground`.

**Color model:** hex strings only — `#rgb` or `#rrggbb`, no alpha. WT applies selection/cursor transparency internally, so `selectionBackground` and `cursorColor` take opaque hex and WT decides the overlay. Artificer's palette is already opaque 6-digit hex, so adoption is a 1:1 copy with **key renaming, no color conversion**.

**The load-bearing naming quirk:** WT's ANSI slot names diverge from CSS/X11. Slot 5 is `purple` (the magenta slot), slot 6 is `cyan`; brights are `bright` + Capitalized name (`brightPurple`, not `brightMagenta`). There is **no** `magenta` or `aqua` key — using them silently breaks the scheme (see Gotchas).

**Light/dark:** a single scheme object is always one fixed mode, so Artificer ships **two** scheme objects ("Artificer Dark", "Artificer Light"). Auto-switching is a *profile* property: `"colorScheme": { "light": "Artificer Light", "dark": "Artificer Dark" }`, which WT follows off `theme.applicationTheme` (or the OS theme when that is `system`).

There is a published JSON schema for `settings.json` (the `$schema` key points at `aka.ms/terminal-profiles-schema`); fragments validate against the same scheme-object shape.

## Distribution

This is **Category 3 (paste/templating)** for the broad case with a clean **Category 1 (selector-file)** path on Windows. A scheme is just an object the user can paste into the `schemes` array of their own `settings.json` (Cat 3). The native mechanism, though, is a **JSON Fragment Extension**: a standalone `.json` file dropped into a Fragments directory that WT auto-discovers — no `@import`, no edits to the user's `settings.json`, and it survives a settings reset.

For Artificer's chezmoi-first model, the fragment file is the natural fit: chezmoi templates it to the per-user AppData Fragments path. The file is small and static, so a managed copy is simpler than a symlink. Store/package fragments need an appxmanifest app-extension declaration — out of scope for a dotfiles theme.

Install paths:

- **User-only (chezmoi-friendly):** `%LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments\Artificer\artificer.json`
- **System-wide:** `C:\ProgramData\Microsoft\Windows Terminal\Fragments\Artificer\artificer.json`
- **Unpackaged/portable WT:** `<install dir>\settings\Fragments\Artificer\artificer.json`
- **Direct-paste target (no fragment):** the `schemes` array inside `settings.json` — packaged path `%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`

Key limitation that shapes the install docs: a fragment makes a scheme **available** but cannot apply it globally — it can `updates` only the built-in Cmd/PowerShell profiles and dynamic (WSL) profiles by GUID, never the user's `defaults` block (see Gotchas). So a Cat-1 fragment install is not turnkey for arbitrary custom profiles; the docs must tell the user to set `colorScheme` themselves there.

## build.mjs integration sketch

A `build.mjs` generator emits a Windows Terminal JSON fragment with a top-level `schemes` array holding two scheme objects (one per mode), since WT schemes are flat tables with no in-scheme light/dark switching.

Per mode, map `_palette.json` tokens onto the 16-slot ANSI table plus the four extras:

- `name` ← `"Artificer (Dark)"` / `"Artificer (Light)"`
- `background` ← `bg`; `foreground` ← `fg`
- `cursorColor` ← `accentBright` — a distinct gold/sienna, **never** equal to `fg` or `bg` (dodges the invisible-cursor collapse)
- `selectionBackground` ← `bgOverlay` or a mid steel; for **light** mode this MUST be set explicitly or WT's poor default shows
- `black` ← `bgInactive`; `brightBlack` ← `fgMuted` (the `comment` role)
- `red` ← `urgent`; `brightRed` ← `urgentBright`
- `green` ← `success`; `brightGreen` ← `successBright` (`string` role)
- `yellow` ← `accentFill`/`accent`; `brightYellow` ← `accentBright` (`function`/`constant`)
- `blue` ← `steelFill`/`brandPurple`; `brightBlue` ← `steelBright`/`brandPurpleBright` (`parameter`)
- `purple` ← `brandPurple`; `brightPurple` ← `brandPurpleBright` (`keyword` → WT's slot-5 magenta)
- `cyan` ← `cyan`; `brightCyan` ← `cyanBright` (`namespace`)
- `white` ← `fgSecondary`; `brightWhite` ← `fg`

The 12 Artificer syntax `$roles` are **advisory only** — WT can't honor per-token syntax colors, so they collapse into the 16 ANSI slots above. The generator picks the closest slot per role and accepts the loss. Wrap the two schemes (plus optional `profiles.updates` blocks keyed by the built-in Cmd/PowerShell GUIDs) into the fragment. Emit **UTF-8, no BOM**. Use WT's names `purple` and `cyan` for slots 5 and 6 — never `magenta`/`aqua`.

## Gotchas

- **[verified]** An incomplete scheme is reported as *nonexistent*, not as *incomplete* — a single missing or misnamed color key silently voids the whole scheme. The classic trap is `magenta`/`aqua` instead of WT's `purple`/`cyan`, or a `brightPurple` typo; WT then tells the user the named scheme "doesn't exist." Second source: [Microsoft Learn color-schemes doc](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes) (author mattwojo, distinct from the issue reporter) confirms the required-key set and the purple/cyan naming. Nuance: the exact "reported as nonexistent rather than found-but-incomplete" *message* framing is attested only for the fragment code path by the original [issue #11457](https://github.com/microsoft/terminal/issues/11457); the integration-relevant core (all 16 keys required, bad key invalidates the scheme) is fully independent.
- **[verified]** WT's ANSI slot names are nonstandard — slot 5 is `purple` (magenta), slot 6 is `cyan`, and `magenta`/`aqua` are not valid keys. A generator copying a standard palette by conventional names produces a scheme WT silently rejects. Second source: the [Dracula Windows Terminal scheme](https://draculatheme.com/windows-terminal) uses `purple`/`brightPurple` and `cyan`/`brightCyan` with no `magenta`/`aqua` keys. **Correction to the original claim:** the "historically calls bright-black `gray`" aside is *not* supported — Microsoft's format uses `brightBlack`; that detail appears to conflate the legacy ColorTool naming.
- **[verified]** `foreground` and `white` are independent — the default text color is *not* ANSI white (index 7), and conflating them breaks both regular and reverse-video output. `foreground` is SGR 39 (unstyled); `white` is the index-7 palette slot, and reverse video (SGR 7) swaps the *active* foreground/background, pulling from `foreground`, not white. Second source: [Reverse video (Wikipedia)](https://en.wikipedia.org/wiki/Reverse_video) plus Term::ANSIColor docs establish this as standard cross-terminal behavior, not a WT quirk; [issue #13342](https://github.com/microsoft/terminal/issues/13342) asserts the same intended separation. Set both keys deliberately.
- **[verified]** Bold/intense text renders as **bright** by default (`intenseTextStyle: "bright"`), so on a light scheme with near-white bright colors, bold text vanishes — and the fix lives on the *profile*, not the scheme. The remedy is `intenseTextStyle: "bold"` (or `"all"`), which a distributed scheme/fragment can't carry; install docs must instruct it, or the fragment must `updates` each profile. Second source: [Microsoft Learn profile-appearance doc](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-appearance) (MicrosoftDocs/terminal team, independent of community-filed [issue #3781](https://github.com/microsoft/terminal/issues/3781)) confirms the default is `bright`, the trigger is SGR 1, and the setting is profile-level.
- **[verified]** A fragment cannot apply a scheme to all profiles — it can `updates` only Cmd, PowerShell, and dynamic (WSL) profiles, never the user's `defaults` block. Shipping a scheme via fragment makes it *available* but not *active*; a Cat-1 install leaves the user to set `colorScheme` on their custom profiles. Second source: [microsoft/terminal discussion #19081](https://github.com/microsoft/terminal/discussions/19081), where a maintainer confirms a fragment cannot override `profiles.defaults` (referencing #10790) — an independent surface from the [Microsoft Learn fragment docs](https://learn.microsoft.com/en-us/windows/terminal/json-fragment-extensions).
- **[verified]** `cursorColor` is a single value that paints the cursor fill and effectively occludes the glyph under it — pick a value equal to `fg` or `bg` and either the cursor or the character beneath it becomes invisible. Over varied syntax colors (Vim) some chars always vanish; `cursorTextColor` controls the glyph separately but is poorly documented and is a profile/appearance setting, not a scheme key. Set `cursorColor` to a distinct high-contrast accent. Second source: [issue #15766](https://github.com/microsoft/terminal/issues/15766) (independent of [#7118](https://github.com/microsoft/terminal/issues/7118)) confirms the single-color occlusion, the Vim failure mode, and that `cursorTextColor` exists only at profile level.
- **[verified]** Light schemes get a bad **default** selection-highlight color (white), so omitting `selectionBackground` looks broken in light mode — selected text becomes near-illegible. A light Artificer scheme MUST set an explicit `selectionBackground`. Second source: [issue #14859](https://github.com/microsoft/terminal/issues/14859) (different author from the original [#8716](https://github.com/microsoft/terminal/issues/8716)) reproduces white-on-light selection with the shipped One Half Light theme.
- **[verified]** Fragment files must be UTF-8 (no BOM); PowerShell's default `Out-File` (and `>`/`>>`) writes UTF-16LE on Windows PowerShell 5.1, and WT silently ignores the file. Second source: [ss64.com Out-File reference](https://ss64.com/ps/out-file.html) confirms 5.1 defaults to UTF-16LE while PowerShell 7+ defaults to BOM-less UTF-8. Refinement: on 5.1, `-Encoding Utf8` itself emits a BOM — truly BOM-less output needs PowerShell 7+ (`utf8NoBOM`) or a .NET `UTF8Encoding($false)` call. The exact "WT silently dropped my UTF-16 fragment" end-to-end symptom rests on the Microsoft original; the actionable core (UTF-8 required, 5.1 `Out-File` → UTF-16LE) is independently confirmed.
- **[verified]** Auto light/dark switching is a **profile** property (a `colorScheme` pair), not a scheme capability — one scheme object is always one fixed mode. `colorScheme` accepts `{ "light": "...", "dark": "..." }` and follows `theme.applicationTheme` (or OS theme when `system`). Artificer must ship two scheme objects and document the pair syntax; the switch fires only off app/OS theme, not an arbitrary toggle. Second source: [AutoDarkMode discussion #781](https://github.com/AutoDarkMode/Windows-Auto-Night-Mode/discussions/781) (community author, independent of the [Microsoft Learn page](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes)) shows the per-profile pair object driven by OS theme.

No claims were **refuted** outright; two `[verified]` claims carried *sub-detail corrections* (the "bright-black `gray`" aside and the 5.1 `-Encoding Utf8` BOM nuance), noted inline above.

## Tips & tricks

- Ship the scheme as a **JSON Fragment Extension** (Cat 1) rather than asking users to hand-edit `settings.json` — it survives settings resets and is chezmoi-templatable to the AppData Fragments path.
- Reuse Artificer's existing ANSI-ish roles directly: `cyan`→cyan, `urgent`→red, `success`→green, `accent` (gold/sienna)→yellow, `brandPurple`→purple, `steel`→blue. The palette already thinks in these terms, so the 16-slot map is near-mechanical.
- Put `intenseTextStyle: "bold"` (or `"all"`) in the install instructions / `updates` block for light mode — the scheme alone can't keep bold text readable.
- Always set explicit `cursorColor` and `selectionBackground`, especially for light mode. Never rely on WT defaults.
- The 12 Artificer syntax roles collapse into 16 ANSI slots — WT can't do per-token syntax colors. Accept the loss, pick closest slots, and document that syntax fidelity comes from the shell/app (bat, lazygit), not the terminal scheme.
- During development, add the `$schema` (`aka.ms/terminal-profiles-schema`) reference and lint the fragment in VS Code before shipping — it catches the magenta/purple key trap early.
- For auto light/dark, emit both scheme names and document the `colorScheme: {light, dark}` pair so users on `theme.applicationTheme: system` get OS-driven switching for free.

## Fit assessment

**Low-to-medium effort, worth adding to the pipeline.** The scheme is a flat 16-slot ANSI table that Artificer's palette already maps to almost 1:1 — the same ANSI-role thinking as the existing Ghostty and tmux targets — so the `build.mjs` work is small. It rates medium rather than low only because of the fragment-distribution, UTF-8/BOM, and light-mode bold/selection caveats that need real install docs. Strong fit as a Windows-side companion to the existing Ghostty theme.

## Where to get the authoritative docs

**Official spec / schema / reference:**

- Color schemes (keys, names, light/dark pair) — https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes
- JSON Fragment Extensions (install paths, schemes/profiles, `updates`, GUID, UTF-8) — https://learn.microsoft.com/en-us/windows/terminal/json-fragment-extensions
- Profile appearance (`colorScheme`, `cursorColor`, `selectionBackground`, `intenseTextStyle`) — https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-appearance
- `settings.json` JSON schema — https://aka.ms/terminal-profiles-schema

**Community themes to crib from:**

- Dracula for Windows Terminal (bare scheme object, real key set incl. `cursorColor`/`selectionBackground`) — https://github.com/dracula/windows-terminal/blob/master/dracula.json
- Microsoft custom-schemes gallery (structure reference) — https://learn.microsoft.com/en-us/windows/terminal/custom-terminal-gallery/custom-schemes

## Sources

- https://learn.microsoft.com/en-us/windows/terminal/customize-settings/color-schemes
- https://learn.microsoft.com/en-us/windows/terminal/json-fragment-extensions
- https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-appearance
- https://aka.ms/terminal-profiles-schema
- https://github.com/microsoft/terminal/issues/11457
- https://github.com/microsoft/terminal/issues/3781
- https://github.com/microsoft/terminal/issues/13342
- https://github.com/microsoft/terminal/issues/7118
- https://github.com/microsoft/terminal/issues/15766
- https://github.com/microsoft/terminal/issues/8716
- https://github.com/microsoft/terminal/issues/14859
- https://github.com/microsoft/terminal/discussions/19081
- https://github.com/AutoDarkMode/Windows-Auto-Night-Mode/discussions/781
- https://en.wikipedia.org/wiki/Reverse_video
- https://ss64.com/ps/out-file.html
- https://draculatheme.com/windows-terminal
- https://github.com/dracula/windows-terminal/blob/master/dracula.json
- https://learn.microsoft.com/en-us/windows/terminal/custom-terminal-gallery/custom-schemes
