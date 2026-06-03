# Claude Code Theme Reference

A complete reference for the `~/.claude/themes/*.json` schema, including all 69 reachable tokens. Pairs with [`theme.schema.json`](./theme.schema.json) for editor validation and autocomplete.

> Custom themes require Claude Code v2.1.118 or later.

> **Verifying your theme:** [`cc-theme-check`](https://github.com/cameronsjo/cc-theme-check) renders a mock conversation in your terminal using the same chalk pipeline Claude Code uses internally, then audits every token for WCAG AA contrast. Use it instead of restarting Claude Code 50 times to find broken colors.

## Quick start

```jsonc
// ~/.claude/themes/my-theme.json
{
  "$schema": "./theme.schema.json",
  "name": "My Theme",
  "base": "dark",
  "overrides": {
    "claude": "#a89278",
    "error": "#e8836f",
    "success": "#b7bd73"
  }
}
```

Selecting the theme via `/theme` stores `custom:<filename-slug>` as the preference. Claude Code watches the directory and reloads on file change.

## Top-level fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `$schema` | string | No | Editor hint for autocomplete/validation. Ignored by Claude Code. |
| `name` | string | No | Display label in `/theme`. Defaults to filename slug. |
| `base` | enum | No | Built-in preset to inherit from. Defaults to `dark`. |
| `overrides` | object | No | Sparse map of token → color. Tokens not listed fall through to `base`. |

## Base presets

| `base` value | Notes |
| :--- | :--- |
| `dark` | Default; standard dark theme. |
| `light` | Standard light theme. |
| `dark-daltonized` | Dark variant tuned for color-vision-deficiency safety. |
| `light-daltonized` | Light daltonized variant. |
| `dark-ansi` | Uses 16-color ANSI palette only — best for terminals with custom palettes. |
| `light-ansi` | ANSI light variant. |

## Color value formats

| Form | Pattern | Example |
| :--- | :--- | :--- |
| Hex RGB | `#rrggbb` | `#a89278` |
| Short hex | `#rgb` | `#a87` |
| Functional RGB | `rgb(r,g,b)` | `rgb(168, 146, 120)` |
| 256-color | `ansi256(n)` (0–255) | `ansi256(180)` |
| Named ANSI | `ansi:<name>` | `ansi:cyanBright` |

The 16 valid ANSI names: `red`, `green`, `blue`, `yellow`, `magenta`, `cyan`, `white`, `black`, plus a `Bright` suffix on each (`redBright`, `greenBright`, …).

## Failure mode

Per the official docs: **"Unknown tokens and invalid color values are ignored, so a typo cannot break rendering."** Strict validation in [`theme.schema.json`](./theme.schema.json) catches typos in your editor — runtime is forgiving either way.

## Token catalog

Badges:
- **Documented** — listed in the [official color token reference](https://code.claude.com/docs/en/terminal-config#color-token-reference)
- **Internal** — present in the binary's preset object, reachable via `overrides`, but not in the public docs (descriptions inferred from naming and surrounding code)

### Brand and accent

| Token | Status | Controls |
| :--- | :--- | :--- |
| `claude` | Documented | Primary brand accent — spinner, assistant label |
| `claudeShimmer` | Documented | Lighter color paired with `claude` in animated gradients |
| `claudeBlue_FOR_SYSTEM_SPINNER` | Internal | Blue brand variant for the system spinner |
| `claudeBlueShimmer_FOR_SYSTEM_SPINNER` | Internal | Shimmer paired with `claudeBlue_FOR_SYSTEM_SPINNER` |
| `professionalBlue` | Internal | Anthropic-blue marketing accent (login, billing) |
| `chromeYellow` | Internal | Yellow marketing accent |

### Foreground text

| Token | Status | Controls |
| :--- | :--- | :--- |
| `text` | Documented | Default foreground text (under `dark-ansi`: input chrome only — see notes below) |
| `inverseText` | Documented | Text on top of colored backgrounds (badges) |
| `inactive` | Documented | Hints, timestamps, disabled items |
| `inactiveShimmer` | Internal | Shimmer paired with `inactive` |
| `subtle` | Documented | Faint borders and de-emphasized text |
| `suggestion` | Internal | Autocomplete highlights, focused items in QuickOpen, selected file paths, TagTabs resume label, AssistantTextMessage dot |
| `remember` | Documented | Memory and `CLAUDE.md` indicators |
| `background` | Internal | Foreground accent for status labels, diamond icons, dialog borders — **not** a canvas fill despite the name |

### Status

| Token | Status | Controls |
| :--- | :--- | :--- |
| `success` | Documented | Success messages and passing checks |
| `error` | Documented | Errors and failures |
| `warning` | Documented | Warnings, cautions, auto-mode border |
| `warningShimmer` | Documented | Shimmer paired with `warning` |
| `merged` | Documented | Merged pull request status |

### Input box and mode indicators

| Token | Status | Controls |
| :--- | :--- | :--- |
| `promptBorder` | Documented | Input box border (default mode) |
| `promptBorderShimmer` | Internal | Shimmer paired with `promptBorder` |
| `permission` | Documented | Permission prompts and pickers. Also colors inline code (codespan markdown — see [Methodology](#methodology)) |
| `permissionShimmer` | Internal | Shimmer paired with `permission` |
| `planMode` | Documented | Plan mode accent — used in spinner/status line context, not input border |
| `autoAccept` | Documented | Accept-edits mode accent — used in spinner/status line context, not input border |
| `bashBorder` | Documented | Input border when entering `!` shell command |
| `ide` | Documented | IDE connection indicator |
| `fastMode` | Documented | Fast mode indicator |
| `fastModeShimmer` | Internal | Shimmer paired with `fastMode` |

### Diff rendering

| Token | Status | Controls |
| :--- | :--- | :--- |
| `diffAdded` | Documented | Background of added lines |
| `diffRemoved` | Documented | Background of removed lines |
| `diffAddedDimmed` | Documented | Unchanged context near added lines |
| `diffRemovedDimmed` | Documented | Unchanged context near removed lines |
| `diffAddedWord` | Documented | Word-level highlight in added lines |
| `diffRemovedWord` | Documented | Word-level highlight in removed lines |

### Fullscreen mode (background fills)

These apply only when `/tui fullscreen` rendering is active.

| Token | Status | Controls |
| :--- | :--- | :--- |
| `userMessageBackground` | Documented | Background behind user messages |
| `userMessageBackgroundHover` | Internal | Hover variant of `userMessageBackground` |
| `messageActionsBackground` | Internal | Per-message action affordance backgrounds |
| `bashMessageBackgroundColor` | Internal | Background for shell-command messages |
| `memoryBackgroundColor` | Internal | Background for memory / `CLAUDE.md` annotations |
| `selectionBg` | Documented | Mouse-selection background (terminal text selection highlight) |

### Subagent palette

Subagents declared with `color: <name>` in their YAML frontmatter draw using the matching token. Override these to recolor your agent transcripts.

| Token | Status |
| :--- | :--- |
| `red_FOR_SUBAGENTS_ONLY` | Documented |
| `blue_FOR_SUBAGENTS_ONLY` | Documented |
| `green_FOR_SUBAGENTS_ONLY` | Documented |
| `yellow_FOR_SUBAGENTS_ONLY` | Documented |
| `purple_FOR_SUBAGENTS_ONLY` | Documented |
| `orange_FOR_SUBAGENTS_ONLY` | Documented |
| `pink_FOR_SUBAGENTS_ONLY` | Documented |
| `cyan_FOR_SUBAGENTS_ONLY` | Documented |

### Rate-limit indicator

| Token | Status | Controls |
| :--- | :--- | :--- |
| `rate_limit_fill` | Internal | Filled portion of the usage bar |
| `rate_limit_empty` | Internal | Empty portion of the usage bar |

### Brief mode

| Token | Status | Controls |
| :--- | :--- | :--- |
| `briefLabelYou` | Internal | "You" label in compact transcript mode |
| `briefLabelClaude` | Internal | "Claude" label in compact transcript mode |

### Mascot easter egg

| Token | Status | Controls |
| :--- | :--- | :--- |
| `clawd_body` | Internal | Body color for the Clawd mascot art |
| `clawd_background` | Internal | Background behind the Clawd mascot art |

### Rainbow palette (animated celebration sequences)

Each color has a `*_shimmer` partner for gradient animation.

| Pair | Status |
| :--- | :--- |
| `rainbow_red` / `rainbow_red_shimmer` | Internal |
| `rainbow_orange` / `rainbow_orange_shimmer` | Internal |
| `rainbow_yellow` / `rainbow_yellow_shimmer` | Internal |
| `rainbow_green` / `rainbow_green_shimmer` | Internal |
| `rainbow_blue` / `rainbow_blue_shimmer` | Internal |
| `rainbow_indigo` / `rainbow_indigo_shimmer` | Internal |
| `rainbow_violet` / `rainbow_violet_shimmer` | Internal |

## Methodology

The 35 documented tokens come from the official docs at <https://code.claude.com/docs/en/terminal-config#color-token-reference>. The remaining internal tokens were extracted from the canonical preset object inside the Claude Code binary. The codespan binding on `permission` was sourced the same way — `grep` for `case"codespan"` in the strings dump and you'll find `Oq("permission",_)(H.text)`.

The v2.1.140 minifier renamed the preset variables, so the original `YD4=` awk recipe no longer matches. The recipe below replaces it — it anchors on the `claudeShimmer:` literal instead of a variable name, so it survives further renames:

```bash
BIN="$(readlink -f "$(command -v claude)")"
strings -n 4 "$BIN" > /tmp/cc-strings.txt

# Extract one preset's token names (the six presets share an identical key set)
grep -oE '\{[^{}]*claudeShimmer:"[^"]+",[^{}]*\}' /tmp/cc-strings.txt \
  | sed -n '1p' \
  | grep -oE '[a-zA-Z_][a-zA-Z0-9_]*:"[^"]*"' \
  | grep -oE '^[a-zA-Z_][a-zA-Z0-9_]*' \
  | sort -u > /tmp/preset-tokens.txt

# Diff against the schema for new/removed tokens
jq -r '.properties.overrides.properties | keys[]' \
  themes/claude-code/theme.schema.json | sort -u > /tmp/schema-tokens.txt

comm -23 /tmp/preset-tokens.txt /tmp/schema-tokens.txt  # new in binary
comm -13 /tmp/preset-tokens.txt /tmp/schema-tokens.txt  # gone from binary
```

Any future token added by Anthropic will appear in those preset literals first; rerun this extraction against a newer binary to refresh the catalog.

**Last verified against v2.1.140 — 68 preset keys, identical across all six presets.** Our schema lists 69; the extra (`messageActionsBackground`) was present in v2.1.126 but dropped in v2.1.140. Runtime silently ignores unknown tokens, so we continue to emit it harmlessly.

## Artificer-specific notes

### Base preset: `dark-ansi` required

Artificer uses `dark-ansi` / `light-ansi` as the base preset. Switching to
`dark` or `light` causes **lavender bloom** — widespread purple tinting across
response text, list rendering, and chrome surfaces. This happens because:

- `dark-ansi` falls unmapped tokens through to the terminal's ANSI palette
  (Ghostty's theme, which Artificer controls)
- `dark` falls unmapped tokens through to Claude Code's stock preset, which
  uses Anthropic's brand purples

Artificer's `overrides` block is intentionally sparse — it relies on the
ANSI fallthrough to the Ghostty palette for coherence. Against `dark`'s
full token list, the sparse overrides leave most surfaces on stock purple.

### `text` token scope under `dark-ansi`

The `text` override only paints the input box, "You:" label, and minor
chrome. Claude Code's **response body** is emitted as ANSI default text,
which Ghostty resolves via its `foreground` setting — not the Claude Code
`text` token.

The actual lever for response body color:

```ini
# themes/ghostty/artificer-dark
foreground = e8e6e1   # ← paints Claude's response body and ALL terminal text
```

**Tradeoff:** Ghostty `foreground` is global — it colors every terminal
program's default text. There is no way to color Claude's response body
in isolation while `dark-ansi` is the base.

### `background` token is a foreground accent

Despite the name, `background` is used as a **foreground/accent color**
in Claude Code — it paints "running" status text, diamond icons, and
dialog borders. The default dark preset uses bright cyan (`rgb(0,204,204)`).

Setting this to a canvas-colored value (e.g. `#292c33`) makes status
labels invisible. Artificer maps it to `P.cyan` — a muted teal that
serves as a visible foreground accent.

### Failure recovery — lavender bloom state

Two conditions produce identical lavender bloom:

1. Setting `base: "dark"` instead of `"dark-ansi"`
2. Deleting a theme file while `settings.json` still references it

Both likely share a fallback code path in Claude Code.

**Recovery:**

The `/theme` picker can leave you on a broken value if the file is missing.
Edit `~/.claude/settings.json` directly to restore a valid theme reference.

**Safe theme file deletion order:**

1. Switch to a known-good theme via `/theme` or `settings.json`
2. Verify the switch took effect (check for lavender)
3. Then delete the old theme file

Reversing this order triggers the lavender state with no in-app recovery path.

## See also

- [`theme.schema.json`](./theme.schema.json) — JSON Schema for editor validation
- [`artificer.json`](./artificer.json) — example custom theme
- [Official theme docs](https://code.claude.com/docs/en/terminal-config#color-token-reference)
- [Plugins reference: themes](https://code.claude.com/docs/en/plugins-reference#themes) — for shipping themes via plugins
