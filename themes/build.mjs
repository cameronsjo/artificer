#!/usr/bin/env node
// Artificer · theme generator
// Reads themes/_palette.json and writes every theme file.
// Usage:  node themes/build.mjs
// Or:     npm run build:themes  (if you wire it up)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Shared with scripts/check-shell-fragments.mjs — see that module's header for
// why the grammar cannot live in this file.
import {
  shellHexValue,
  assertInertFragment,
  FZF_COLOR_GRAMMAR,
  LS_COLORS_GRAMMAR,
} from './_shell-guard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const palette = JSON.parse(readFileSync(join(__dirname, '_palette.json'), 'utf8'));

// Distribution version — stamped into category-3 fragment headers so a pasted
// block carries its provenance. Sourced from package.json (the distribution
// version), NOT _palette.json $version (Lane 1's palette cadence).
const { version } = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const D = palette.dark;
const L = palette.light;

// Hex → "r, g, b" tuple. Obsidian's callout system uses these inside
// rgba(var(--callout-foo), 0.1) so they MUST be tuples, not hex.
const rgb = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

// Perceptual (OKLab) mix between two palette tokens, for the handful of slots a
// foreign palette needs that Artificer doesn't carry. sRGB channel-averaging is
// wrong here: the naive midpoint between two burnished tokens passes through a
// muddier, more saturated colour — the opposite of the register we want.
//
// Self-contained rather than imported from gradients/reference.mjs, which has
// the same maths but pulls a runtime dependency; this generator is
// zero-dependency by convention.
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

const hexToOklab = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => srgbToLinear(parseInt(h.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
};

const oklabToHex = ([L, A, B]) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  const out = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return '#' + out.map((c) => {
    const v = Math.round(Math.min(1, Math.max(0, linearToSrgb(c))) * 255);
    return v.toString(16).padStart(2, '0');
  }).join('');
};

// mixOk(a, b, t) — t=0 returns a, t=1 returns b.
const mixOk = (a, b, t) => {
  const [A, B] = [hexToOklab(a), hexToOklab(b)];
  return oklabToHex(A.map((v, i) => v + (B[i] - v) * t));
};

// Hex → "R, G, B" with the spacing the CSSOM serializes to. Preact assigns inline
// styles through the CSSOM, which re-serializes a hex to `rgb(59, 130, 246)` —
// spec-defined, not one browser's whim — so an attribute selector can match it.
const cssomRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
};

// Syntax role → palette token name. $roles.syntax is mode-independent; only the
// token → hex resolution is per-mode, and each target does that its own way
// (VS Code derefs to a hex, Helix keeps the name for its [palette] table). One
// lookup so a third consumer never re-types the path into _palette.json.
const syntaxToken = (role) => palette.$roles.syntax[role];


const write = (relPath, content) => {
  const full = join(__dirname, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  console.log('wrote', relPath);
};

// ─────────────────────────────────────────────────────────────────────
// Claude Code — strict JSON, full token surface
// ─────────────────────────────────────────────────────────────────────

const claudeCodeTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const onAccent = P.ink; // ink in BOTH modes per $notes.onAccentDark/onAccentLight (ink 5.65:1 on accentFill, ivory 2.32)
  return {
    $schema: './theme.schema.json',
    name: mode === 'dark' ? 'Artificer Dark' : 'Artificer Light',
    base: mode === 'dark' ? 'dark-ansi' : 'light-ansi',
    overrides: {
      claude: P.accent,
      claudeShimmer: P.accentBright,
      claudeBlue_FOR_SYSTEM_SPINNER: P.steel,
      claudeBlueShimmer_FOR_SYSTEM_SPINNER: P.steelBright,

      text: P.fg,
      inverseText: onAccent,
      inactive: P.fgSecondary,
      inactiveShimmer: mode === 'dark' ? '#d5d8d6' : '#6a5a3f',
      subtle: P.fgDisabled,
      background: P.cyan,

      permission: P.steel,
      permissionShimmer: P.steelBright,
      remember: P.brandPurple,
      suggestion: P.brandPurple,

      success: P.success,
      error: P.urgent,
      warning: P.attention,
      warningShimmer: P.attentionAlt,
      merged: P.steel,

      promptBorder: P.border,
      promptBorderShimmer: P.borderLifted,
      planMode: P.brandPurple,
      autoAccept: P.success,
      bashBorder: P.accent,
      ide: P.steel,
      fastMode: P.attention,
      fastModeShimmer: P.attentionAlt,

      diffAdded: P.diffAddBg,
      diffRemoved: P.diffDelBg,
      diffAddedDimmed: P.diffAddDim,
      diffRemovedDimmed: P.diffDelDim,
      diffAddedWord: P.diffAddWord,
      diffRemovedWord: P.diffDelWord,

      // The canvas under this chip is terminalBg (ADR 0036), so the chip lifts a
      // rung: at bgRaised it would be identical to the canvas and vanish. Dark-only
      // — light's elevation inverts and stays as it was.
      userMessageBackground: mode === 'dark' ? P.bgOverlay : P.bgRaised,
      userMessageBackgroundHover: mode === 'dark' ? P.bgFloat : P.bgOverlay,
      messageActionsBackground: mode === 'dark' ? '#2a2d36' : '#e8d8b8',
      bashMessageBackgroundColor: mode === 'dark' ? '#2e2b25' : '#e4d4a8',
      memoryBackgroundColor: mode === 'dark' ? '#252a30' : '#dcc99c',
      selectionBg: P.accentFill,

      rate_limit_fill: P.accentFill,
      rate_limit_empty: mode === 'dark' ? '#2a2d36' : '#e0d0a8',

      briefLabelYou: P.steel,
      briefLabelClaude: P.accent,

      professionalBlue: P.steel,
      chromeYellow: P.accent,

      clawd_body: P.accent,
      clawd_background: P.terminalBg, // blends with the canvas Claude Code paints on (ADR 0036)

      red_FOR_SUBAGENTS_ONLY: P.urgent,
      blue_FOR_SUBAGENTS_ONLY: P.steel,
      green_FOR_SUBAGENTS_ONLY: P.success,
      yellow_FOR_SUBAGENTS_ONLY: P.accent,
      purple_FOR_SUBAGENTS_ONLY: P.brandPurple,
      orange_FOR_SUBAGENTS_ONLY: mode === 'dark' ? '#b87333' : '#a04500',
      pink_FOR_SUBAGENTS_ONLY: P.attention,
      cyan_FOR_SUBAGENTS_ONLY: P.cyan,

      rainbow_red: P.urgent,
      rainbow_orange: mode === 'dark' ? '#b87333' : '#a04500',
      rainbow_yellow: P.accent,
      rainbow_green: P.success,
      rainbow_blue: P.steel,
      rainbow_indigo: P.brandPurple,
      rainbow_violet: P.attention,
      rainbow_red_shimmer: P.urgentBright,
      rainbow_orange_shimmer: mode === 'dark' ? '#cc8845' : '#b85a18',
      rainbow_yellow_shimmer: P.accentBright,
      rainbow_green_shimmer: P.successBright,
      rainbow_blue_shimmer: P.steelBright,
      rainbow_indigo_shimmer: P.brandPurpleBright,
      rainbow_violet_shimmer: P.attentionAlt
    }
  };
};

write('claude-code/artificer-dark.json',  JSON.stringify(claudeCodeTheme('dark'),  null, 2) + '\n');
write('claude-code/artificer-light.json', JSON.stringify(claudeCodeTheme('light'), null, 2) + '\n');

// ─────────────────────────────────────────────────────────────────────
// Ghostty — INI-ish, supports # comments
// ─────────────────────────────────────────────────────────────────────

const ghosttyTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Artificer Dark' : 'Artificer Light';
  const subtitle = mode === 'dark' ? 'Ghostty-rooted spine, Jazz Age accents' : 'Ivory paper, midnight indigo ink';
  return `# ${title} — Ghostty theme
# ${subtitle}
# Drop in: ~/.config/ghostty/themes/artificer-${mode}
# Then in config:  theme = artificer-${mode}
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.

# background is terminalBg, NOT bg. The terminal is a RAISED surface — an app
# running on the desktop, not the desktop itself (ADR 0036). Do not "fix" this
# to P.bg; bg is the substrate (VS Code's editor, Obsidian's note surface).
background = ${P.terminalBg.replace('#','')}
foreground = ${P.fg.replace('#','')}

cursor-color = ${P.accent.replace('#','')}
cursor-text  = ${P.terminalBg.replace('#','')}

selection-background = ${P.selectionFill.replace('#','')}
selection-foreground = ${(mode === 'dark' ? P.fg : P.ink).replace('#','')}

# ANSI 0–7 (normal)
# Invariant: positions 4 (normal blue) and 12 (bright blue) must be a
# brightness pair on the same hue. Markdown renderers emit bright-blue
# for inline code; sibling hues (e.g. rose + peach) make inline code
# render a visibly different color than surrounding text.
#
# steelBright in slot 4 and steel in slot 12 is NOT a transposition — read
# the values, not the names. steel #b8cad4 is LIGHTER than steelBright
# #9fb6c4 on dark (relative luminance .572 vs .448), so this puts the dimmer
# hue in normal-blue and the lighter one in bright-blue, which is the right
# way round. Artificer's *Bright suffix names a ROLE ("more emphasis than
# base on the current surface"), not a lightness direction —
# $notes.brandPurpleBrightDirection says so for the purple, and the same
# holds here. Reasoning from the token name alone gets this backwards.
palette = 0=${P.ansiBlack.replace('#','')}
palette = 1=${P.urgent.replace('#','')}
palette = 2=${P.success.replace('#','')}
palette = 3=${P.accent.replace('#','')}
palette = 4=${P.steelBright.replace('#','')}
palette = 5=${P.brandPurple.replace('#','')}
palette = 6=${P.cyan.replace('#','')}
palette = 7=${P.fg.replace('#','')}

# ANSI 8–15 (bright)
# Invariant (ADR 0001, re-derived ADR 0036): slot 0 must read DIMMER than slot 8.
# Slot 8 is ansiBrightBlack, not fgDisabled — the lifted canvas compressed both
# ends, and fgDisabled is shared with VS Code + the web, so it can't move.
palette = 8=${P.ansiBrightBlack.replace('#','')}
palette = 9=${P.urgentBright.replace('#','')}
palette = 10=${P.successBright.replace('#','')}
palette = 11=${P.accentBright.replace('#','')}
palette = 12=${P.steel.replace('#','')}
palette = 13=${P.brandPurpleBright.replace('#','')}
palette = 14=${P.cyanBright.replace('#','')}
palette = 15=${(mode === 'dark' ? P.ivory : P.fg).replace('#','')}
`;
};

write('ghostty/artificer-dark',  ghosttyTheme('dark'));
write('ghostty/artificer-light', ghosttyTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// VS Code — JSON, dark + light variants
// ─────────────────────────────────────────────────────────────────────

const vscodeTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const onAccent = P.ink; // ink in BOTH modes per $notes.onAccentDark/onAccentLight (ink 5.65:1 on accentFill, ivory 2.32)
  // Syntax role resolver: syntaxToken() maps role → token name; P[tokenName]
  // resolves to the per-mode hex.
  const sx = (role) => P[syntaxToken(role)];
  return {
    name: mode === 'dark' ? 'Artificer Dark' : 'Artificer Light',
    type: mode,
    colors: {
      'editor.background': P.bg,
      'editor.foreground': P.fg,
      'editor.selectionBackground': P.accentFill + '55',
      'editor.lineHighlightBackground': P.bgRaised + '80',
      'editorCursor.foreground': P.accent,
      'editorWhitespace.foreground': P.fgDisabled + '40',
      'editorIndentGuide.background': P.border,
      'editorIndentGuide.activeBackground': P.borderLifted,
      'editorLineNumber.foreground': P.fgDisabled,
      'editorLineNumber.activeForeground': P.fg,

      'editorBracketMatch.background': P.accentFill + '30',
      'editorBracketMatch.border': P.accent,

      // Six distinct palette hues for nested-bracket depth (colorization is on by default).
      'editorBracketHighlight.foreground1': P.accent,
      'editorBracketHighlight.foreground2': P.steel,
      'editorBracketHighlight.foreground3': P.cyan,
      'editorBracketHighlight.foreground4': P.brandPurpleBright,
      'editorBracketHighlight.foreground5': P.success,
      'editorBracketHighlight.foreground6': P.attention,
      'editorBracketHighlight.unexpectedBracket.foreground': P.urgentBright,

      'editor.findMatchBackground': P.accentFill + '50',
      'editor.findMatchHighlightBackground': P.accentFill + '25',

      'editorGutter.modifiedBackground': P.attention,
      'editorGutter.addedBackground': P.success,
      'editorGutter.deletedBackground': P.urgent,

      'diffEditor.insertedTextBackground': P.diffAddWord + '40',
      'diffEditor.removedTextBackground': P.diffDelWord + '40',
      'diffEditor.insertedLineBackground': P.diffAddBg + '80',
      'diffEditor.removedLineBackground':  P.diffDelBg + '80',

      // current = "ours" (success/green), incoming = "theirs" (steel/blue).
      'merge.currentHeaderBackground':  P.success + '60',
      'merge.currentContentBackground': P.success + '25',
      'merge.incomingHeaderBackground':  P.steel + '60',
      'merge.incomingContentBackground': P.steel + '25',

      'editorError.foreground': P.urgent,
      'editorWarning.foreground': P.attention,
      'editorInfo.foreground': P.steel,
      'editorHint.foreground': P.steelBright,

      'editorInlayHint.foreground': P.fgMuted,
      'editorInlayHint.background': P.bgOverlay + '60',
      'editorInlayHint.typeForeground': P.accentBright,
      'editorInlayHint.parameterForeground': P.steel,

      'titleBar.activeBackground': P.bgRaised,
      'titleBar.activeForeground': P.fg,
      'titleBar.inactiveBackground': P.bgInactive,
      'titleBar.inactiveForeground': P.fgSecondary,

      // Rail joins the title-bar + sidebar as one raised paper-frame (was bgInactive,
      // a misuse of the "unfocused panes" token for always-present chrome). No border —
      // rail + sidebar are one continuous raised surface; the gold activeBorder and the
      // icons themselves carry the structure. inactiveForeground lifted from fgDisabled →
      // fgSecondary to clear the WCAG 1.4.11 3:1 non-text floor (fgDisabled was ~2.1:1 here).
      'activityBar.background': P.bgRaised,
      'activityBar.foreground': P.fg,
      'activityBar.inactiveForeground': P.fgSecondary,
      'activityBar.activeBorder': P.accent,
      'activityBarBadge.background': P.accentFill,
      'activityBarBadge.foreground': onAccent,

      'sideBar.background': P.bgRaised,
      'sideBar.foreground': P.fg,
      'sideBarSectionHeader.background': P.bgRaised,
      'sideBarSectionHeader.foreground': P.fgSecondary,
      'sideBarTitle.foreground': P.fg,

      'list.activeSelectionBackground': P.accentFill + '40',
      'list.activeSelectionForeground': P.fg,
      'list.inactiveSelectionBackground': P.bgOverlay,
      'list.hoverBackground': P.bgOverlay + '80',
      'list.focusBackground': P.bgOverlay,
      'list.highlightForeground': P.accent,
      'list.errorForeground': P.urgent,
      'list.warningForeground': P.attention,

      'tab.activeBackground': P.bg,
      'tab.activeForeground': P.fg,
      'tab.activeBorderTop': P.accent,
      'tab.inactiveBackground': P.bgRaised,
      'tab.inactiveForeground': P.fgSecondary,
      'tab.border': P.border,
      'editorGroupHeader.tabsBackground': P.bgRaised,

      'breadcrumb.foreground': P.fgSecondary,
      'breadcrumb.focusForeground': P.fg,
      'breadcrumb.activeSelectionForeground': P.fg,
      'breadcrumb.background': P.bg,

      'peekViewTitle.background': P.bgRaised,
      'peekViewEditor.background': P.bgRaised,
      'peekViewResult.background': P.bg,
      'peekView.border': P.accent,
      'peekViewResult.selectionBackground': P.bgOverlay,
      'peekViewResult.matchHighlightBackground': P.accentFill + '40',
      'peekViewEditor.matchHighlightBackground': P.accentFill + '40',

      'statusBar.background': P.brandPurpleDeep,
      'statusBar.foreground': P.ivory,
      'statusBar.debuggingBackground': P.urgent,
      'statusBar.debuggingForeground': P.ivory,
      'statusBar.noFolderBackground': P.bgInactive,
      'statusBarItem.remoteBackground': P.accentFill,
      'statusBarItem.remoteForeground': onAccent,

      'panel.background': P.bg,
      'panel.border': P.border,
      'panelTitle.activeBorder': P.accent,
      'panelTitle.activeForeground': P.fg,
      'panelTitle.inactiveForeground': P.fgSecondary,

      'terminal.background': P.bg,
      'terminal.foreground': P.fg,
      'terminal.ansiBlack': P.bg, // deliberate: ADR 0001 scoped the ANSI-0 lift to the Ghostty terminal; VS Code's integrated terminal stays on bg (same invisible-black, deferred)
      'terminal.ansiRed': P.urgent,
      'terminal.ansiGreen': P.success,
      'terminal.ansiYellow': P.accent,
      'terminal.ansiBlue': P.steelBright,
      'terminal.ansiMagenta': P.brandPurple,
      'terminal.ansiCyan': P.cyan,
      'terminal.ansiWhite': P.fg,
      'terminal.ansiBrightBlack': P.fgDisabled,
      'terminal.ansiBrightRed': P.urgentBright,
      'terminal.ansiBrightGreen': P.successBright,
      'terminal.ansiBrightYellow': P.accentBright,
      'terminal.ansiBrightBlue': P.steel,
      'terminal.ansiBrightMagenta': P.brandPurpleBright,
      'terminal.ansiBrightCyan': P.cyanBright,
      'terminal.ansiBrightWhite': mode === 'dark' ? P.ivory : P.fg,
      'terminalCursor.foreground': P.accent,
      'terminal.selectionBackground': P.accentFill + '55',

      'button.background': P.accentFill,
      'button.foreground': onAccent,
      'button.hoverBackground': P.accent,
      'button.secondaryBackground': P.bgRaised,
      'button.secondaryForeground': P.fg,
      'button.secondaryHoverBackground': P.bgOverlay,

      'input.background': P.bgRaised,
      'input.foreground': P.fg,
      'input.border': P.border,
      'input.placeholderForeground': P.fgDisabled,
      'inputOption.activeBackground': P.accentFill + '40',
      'inputOption.activeBorder': P.accent,
      'inputOption.activeForeground': P.fg,

      'dropdown.background': P.bgRaised,
      'dropdown.foreground': P.fg,
      'dropdown.border': P.border,

      'badge.background': P.accentFill,
      'badge.foreground': onAccent,

      'progressBar.background': P.accent,

      'scrollbarSlider.background': P.fgDisabled + '40',
      'scrollbarSlider.hoverBackground': P.fgDisabled + '80',
      'scrollbarSlider.activeBackground': P.fgDisabled,

      'focusBorder': P.accent,
      'foreground': P.fg,
      'descriptionForeground': P.fgSecondary,
      'errorForeground': P.urgent,
      'icon.foreground': P.fg,

      'gitDecoration.modifiedResourceForeground': P.attention,
      'gitDecoration.deletedResourceForeground': P.urgent,
      'gitDecoration.untrackedResourceForeground': P.success,
      'gitDecoration.ignoredResourceForeground': P.fgDisabled,
      'gitDecoration.conflictingResourceForeground': P.urgentBright,

      'notificationCenterHeader.background': P.bgRaised,
      'notifications.background': P.bgRaised,
      'notifications.foreground': P.fg,
      'notifications.border': P.border,
      'notificationLink.foreground': P.accent
    },
    semanticHighlighting: true,
    semanticTokenColors: {
      'namespace':          sx('namespace'),
      'class':              sx('type'),
      'enum':               sx('type'),
      'interface':          sx('type'),
      'struct':             sx('type'),
      'typeParameter':      sx('type'),
      'type':               sx('type'),
      'parameter':          { foreground: sx('parameter'), fontStyle: 'italic' },
      'variable':           sx('variable'),
      'property':           sx('variable'),
      'enumMember':         sx('constant'),
      'event':              sx('function'),
      'function':           sx('function'),
      'method':             sx('function'),
      'macro':              sx('keyword'),
      'label':              sx('variable'),
      'comment':            sx('comment'),
      'string':             sx('string'),
      'keyword':            sx('keyword'),
      'number':             sx('constant'),
      'regexp':             sx('string'),
      'operator':           sx('operator'),
      'decorator':          sx('function'),
      '*.declaration':      { bold: true },
      '*.readonly':         sx('constant'),
      '*.deprecated':       { strikethrough: true, foreground: sx('invalid') },
      '*.defaultLibrary':   { foreground: sx('function') },
      '*.async':            { italic: true },
      '*.abstract':         { italic: true },
      '*.static':           { bold: true },
      '*.mutable':          { underline: true }
    },
    tokenColors: [
      { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: sx('comment') } },
      { scope: ['string', 'string.quoted', 'string.template'], settings: { foreground: sx('string') } },
      { scope: ['string.regexp'], settings: { foreground: sx('string') } },
      { scope: ['constant.numeric', 'constant.language', 'constant.character', 'constant.other'], settings: { foreground: sx('constant') } },
      { scope: ['variable', 'variable.other'], settings: { foreground: sx('variable') } },
      { scope: ['variable.parameter'], settings: { foreground: sx('parameter'), fontStyle: 'italic' } },
      { scope: ['variable.language', 'variable.language.this', 'variable.language.self'], settings: { foreground: sx('keyword'), fontStyle: 'italic' } },
      { scope: ['keyword', 'keyword.control', 'storage', 'storage.type'], settings: { foreground: sx('keyword') } },
      { scope: ['storage.modifier'], settings: { foreground: sx('keyword'), fontStyle: 'italic' } },
      { scope: ['keyword.operator'], settings: { foreground: sx('operator') } },
      { scope: ['punctuation', 'meta.brace', 'meta.delimiter'], settings: { foreground: sx('operator') } },
      { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: sx('function') } },
      { scope: ['entity.name.class', 'entity.name.type', 'entity.name.interface', 'entity.name.enum', 'support.class', 'support.type'], settings: { foreground: sx('type') } },
      { scope: ['entity.name.namespace', 'entity.name.module', 'support.module', 'support.namespace'], settings: { foreground: sx('namespace') } },
      { scope: ['entity.name.tag', 'entity.other.attribute-name'], settings: { foreground: sx('tag') } },
      // Markdown treatment is sourced from the glamour (glow) target so prose
      // reads the same on every surface — that target was already the richest
      // markdown mapping in the system and vscode had drifted flat against it.
      // Heading LEVELS live in their own `heading.N.markdown` scope, a sibling
      // of markup.heading rather than a child, so they need explicit rules.
      // glamour differentiates h2 and h6 and lets h3-h5 inherit the base gold.
      { scope: ['markup.heading', 'entity.name.section'], settings: { foreground: P.accent, fontStyle: 'bold' } },
      // DESCENDANT selectors are required here, not bare `heading.N.markdown`.
      // The heading TEXT's innermost scope is entity.name.section.markdown, and
      // the rule above matches it directly — which out-specifies an ancestor
      // scope like heading.2.markdown, so a bare level rule silently loses and
      // every level renders identical gold. `heading.2 entity.name.section`
      // matches the same leaf with more context, so it wins.
      { scope: ['heading.2.markdown entity.name.section'], settings: { foreground: P.accentBright, fontStyle: 'bold' } },
      // glamour sets h6 bold:false. An omitted fontStyle INHERITS the bold from
      // the base rule, so clearing it takes an explicit empty style.
      { scope: ['heading.6.markdown entity.name.section'], settings: { foreground: P.fgSecondary, fontStyle: '' } },
      // Emphasis carries NO foreground on purpose: a TextMate rule with only a
      // fontStyle inherits its color from the next matching rule. Pinning these
      // to P.fg made `**bold**` INSIDE a heading win over markup.heading on
      // scope specificity and drop from accent to body-fg — emphasis that
      // visually de-emphasized. Unstyled, bold composes: gold in a heading,
      // body-fg in a paragraph, string-green in a code span.
      { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
      { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
      { scope: ['markup.strikethrough'], settings: { fontStyle: 'strikethrough' } },
      // Emphasis in PROSE takes a color; emphasis inside a heading keeps
      // inheriting the heading hue via the uncolored base rules above.
      //
      // The separator is meta.paragraph.markdown, which body and list-item
      // emphasis sit under and heading emphasis does not — measured stacks:
      //   heading  text.html > markup.heading > heading.N > entity.name.section > markup.bold
      //   body     text.html > meta.paragraph > markup.bold
      //   list     text.html > markup.list.unnumbered > meta.paragraph > markup.bold
      //
      // A `-markup.heading` EXCLUSION selector is the obvious way to write this
      // and silently matches nothing — vscode-textmate honors `-` in grammar
      // injection selectors but not in theme scope matching, so the rule is
      // dropped with no error and prose emphasis stays uncolored.
      //
      // Deliberate deviation from glamour, whose strong/emph carry no color:
      // markdown here uses `**Term** — description` as a label, and a label
      // reads better colored.
      { scope: ['meta.paragraph.markdown markup.bold'], settings: { foreground: P.accentBright, fontStyle: 'bold' } },
      { scope: ['meta.paragraph.markdown markup.italic'], settings: { foreground: P.steel, fontStyle: 'italic' } },
      { scope: ['markup.inserted'], settings: { foreground: P.success } },
      { scope: ['markup.deleted'], settings: { foreground: P.urgent } },
      { scope: ['markup.changed'], settings: { foreground: P.attention } },
      { scope: ['markup.quote'], settings: { foreground: P.fgSecondary, fontStyle: 'italic' } },
      // List markers carry the same structural gold as headings; without this
      // they fall through to the generic `punctuation` rule and read as noise.
      { scope: ['punctuation.definition.list.begin'], settings: { foreground: P.accent } },
      // glamour: link URL cyan + underline, link TEXT sand + bold, image purple.
      // markup.underline.link is a DIFFERENT subtree from markup.link — it is
      // where the grammar puts the URL itself, so a `markup.link`-only rule
      // leaves every URL unstyled.
      { scope: ['markup.link', 'markup.underline.link'], settings: { foreground: P.cyan, fontStyle: 'underline' } },
      { scope: ['string.other.link.title', 'string.other.link.description'], settings: { foreground: P.accentBright, fontStyle: 'bold' } },
      // More specific than markup.underline.link above, so images win their hue.
      { scope: ['markup.underline.link.image', 'meta.image'], settings: { foreground: P.brandPurpleBright, fontStyle: 'underline' } },
      // glamour splits these: inline `code` is string-green, but a fenced
      // code_block is document foreground — the embedded language grammar
      // colors its contents, so tinting the block itself fights that.
      { scope: ['markup.raw', 'markup.inline.raw'], settings: { foreground: sx('string') } },
      { scope: ['markup.fenced_code.block'], settings: { foreground: P.fg } },
      { scope: ['fenced_code.block.language'], settings: { foreground: P.fgSecondary } },
      { scope: ['meta.separator'], settings: { foreground: P.border } },
      { scope: ['invalid', 'invalid.illegal'], settings: { foreground: sx('invalid'), fontStyle: 'italic' } },
      { scope: ['invalid.deprecated'], settings: { foreground: sx('invalid'), fontStyle: 'italic' } }
    ]
  };
};

write('vscode/themes/artificer-dark-color-theme.json',  JSON.stringify(vscodeTheme('dark'),  null, 2) + '\n');
write('vscode/themes/artificer-light-color-theme.json', JSON.stringify(vscodeTheme('light'), null, 2) + '\n');

// ─────────────────────────────────────────────────────────────────────
// JetBrains (IntelliJ Platform) — a theme PLUGIN: two UI themes + two
// editor color schemes + the plugin manifest, side-loaded as one jar
// ─────────────────────────────────────────────────────────────────────
//
// Research + verified gotchas: docs/research/theming/jetbrains.md. The
// IntelliJ Platform splits theming across two files with different jobs and
// DIFFERENT hex encodings, and this emitter has to honour both:
//   · the UI theme (*.theme.json) paints IDE chrome. A value is a literal
//     colour iff it starts with "#"; anything else is a lookup into the file's
//     own `colors` map (UITheme.java branches on the prefix). So the `ui`
//     block below is written in PALETTE TOKEN NAMES — greppable, like Helix's
//     [palette] table and Neovim's tables — and `colors` carries every token
//     verbatim. The only literals are the #RRGGBBAA alpha blends, which have
//     no name.
//   · the editor scheme (*.xml) paints content — syntax, gutter, caret,
//     console — in BARE hex (no "#"); 8-digit means RGBA, alpha LAST, same as
//     the JSON side. A scheme is a diff against its parent_scheme (Darcula /
//     Default): every <option> omitted inherits, and an EMPTY value="" does
//     NOT inherit, it suppresses the fallback (jetbrains.md:61) — so a role
//     with no sensible binding is left out, never blanked.
//   · per-element override is all-or-nothing. VERIFIED 2026-08-20 from
//     EditorColorsSchemeImpl.getAttributes(): a directly-defined
//     TextAttributes object is returned WHOLE, there is no per-field merge
//     with the parent. Every <attributes> entry below therefore carries its
//     full intended set; a FOREGROUND-only entry deliberately means
//     "transparent background, plain font".
//
// Base: the 2025.2 "Islands" UI (parentTheme "Islands Dark" / "Islands
// Light", since-build 252 — the Islands theme dir exists on the 252 branch of
// intellij-community and not on 251). Every UI key inherits from Islands
// except the handful the SDK's Supporting-Islands page calls out:
// Island.borderColor (set equal to the island fill — islands have no visible
// border by design), MainWindow.background (the backdrop the islands float
// on), and the EditorTabs.*underlined* quartet.
//
// Surface model, and why the editor sits on `bg` not `bgRaised`: the Islands
// page recommends islands clear 1.20:1 against the backdrop. Islands on
// bgRaised over a bgInactive backdrop measure 1.35 (dark) / 1.21 (light) and
// would clear it — but the three 3.0-floor syntax roles (comment / operator /
// tag) measure 2.68 on bgRaised in dark against 3.05 on bg. WCAG wins over a
// layout recommendation: islands + editor canvas = bg, backdrop = bgInactive
// (1.18 dark — 0.02 under the recommendation; 1.36 light). Ratios measured
// with the same sRGB math as scripts/contrast.mjs; re-measure if the palette
// moves.
//
// Syntax routes through $roles.syntax via syntaxToken() like every other
// editor target, onto the DEFAULT_* fallback keys only — those paint every
// language at once (jetbrains.md:79). Punctuation binds the operator role, as
// VS Code's tokenColors and bat's plist do. EFFECT_TYPE integers come from
// AttributesFlyweight.fromEffectType() (NOT the EffectType enum, whose
// ordinals differ): 0 boxed · 1 line underscore · 2 wave · 3 strikeout ·
// 4 bold line · 5 bold dotted; FONT_TYPE is java.awt.Font: 0 plain · 1 bold ·
// 2 italic · 3 bold-italic.
//
// Deliberately unset, and why:
//   · language-specific keys (JAVA_KEYWORD, PY_STRING, KOTLIN_*, …) — the
//     DEFAULT_* fallbacks already paint them; a per-language copy would be
//     the same hex twice and would drift.
//   · DEFAULT_REASSIGNED_LOCAL_VARIABLE / _PARAMETER, DEFAULT_STATIC_*,
//     DEFAULT_GLOBAL_VARIABLE, DEFAULT_LABEL — no role distinguishes them from
//     their parent; they inherit through the fallback chain.
//   · INJECTED_LANGUAGE_FRAGMENT, TEMPLATE_VARIABLE_ATTRIBUTES, LIVE_TEMPLATE_*
//     — background tints the stock schemes tune per language; inherit.
//   · CONSOLE_*_OUTPUT *background* keys (the 16 ANSI bg slots) — inherit;
//     only foregrounds carry the Artificer terminal map.
//   · every non-Islands UI key — the point of parentTheme is that Islands
//     supplies the rest.
//
// Two themeProvider UUIDs identify the themes to the IDE and are generated
// ONCE and committed here (jetbrains.md:51,81) — parent/child theme
// inheritance keys off them, and the SDK warns against regenerating. They are
// constants, not build-time values.
//
// The plugin manifest carries <version>X.Y.Z</version> from package.json and
// is ALSO a sync-version.mjs stamp site — two writers, one line, byte-
// identical on purpose (scripts/jetbrains-theme.test.mjs asserts agreement).
// An IDE plugin needs a version (the plugin list shows it; update-from-disk
// keys on it), and an unregistered manifest is how themes/vscode/package.json
// came to sit at 0.7.2 against a 0.24.x repo.

const JETBRAINS_THEME_IDS = Object.freeze({
  dark:  '66d9b354-01e3-4533-b4d0-5217f2e71fdb',
  light: '8eabb434-0d08-4d9b-b433-1ec2dc1a249a',
});
const JETBRAINS_SINCE_BUILD = '252';
const JETBRAINS_PLUGIN_ID = 'lol.sjo.artificer.jetbrains';

// Per-mode guarded accessors, shared by the scheme + UI-theme emitters.
// _palette.json is Lane 1's artifact (CLAUDE.md § Encapsulation), and the
// scheme emitter hand-templates XML — a value of `#000"/><option name="X` would
// inject scheme structure. Same discipline as batTheme's hex()/t()/sx():
// validate at the emitter, because check:themes regenerates-and-diffs and a
// poisoned palette passes it green.
const jetbrainsPalette = (mode) => {
  const P = mode === 'dark' ? D : L;
  const hex = (value, what) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(value ?? '')) {
      throw new Error(
        `jetbrains(${mode}): ${what} resolved to ${JSON.stringify(value)}, which is `
        + 'not a six-digit hex colour. Refusing to emit it into a theme file.'
      );
    }
    return value.toLowerCase();
  };
  // hasOwn, not `in` — `in` walks the prototype chain ("constructor" in P is true).
  const t = (token) => {
    if (!Object.hasOwn(P, token)) throw new Error(`jetbrains(${mode}): unknown palette token "${token}"`);
    return hex(P[token], `token "${token}"`);
  };
  const sx = (role) => t(syntaxToken(role));
  const alpha = (aa) => {
    if (!/^[0-9a-f]{2}$/.test(aa)) throw new Error(`jetbrains(${mode}): alpha ${JSON.stringify(aa)} is not two lowercase hex digits`);
    return aa;
  };
  // ink in BOTH modes: _palette.json $notes.onAccentLight rules it (ink measures
  // 5.65:1 on accentFill in either mode; ivory 2.32). VS Code's emitter still
  // flips to ivory in light — that is the stale one, not this.
  const onAccent = 'ink';
  return { P, t, sx, alpha, onAccent };
};

// Editor color scheme — bare hex, RGBA alpha-last, diff against the parent.
const jetbrainsScheme = (mode) => {
  const { t, sx, alpha } = jetbrainsPalette(mode);
  const title = mode === 'dark' ? 'Artificer Dark' : 'Artificer Light';
  const parent = mode === 'dark' ? 'Darcula' : 'Default';
  const bare = (token) => t(token).slice(1);
  const bareA = (token, aa) => bare(token) + alpha(aa);
  const sxBare = (role) => sx(role).slice(1);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const color = (name, value) => `\t\t<option name="${esc(name)}" value="${value}" />`;
  // FONT_TYPE / EFFECT_TYPE are repo-authored small integers; EFFECT_COLOR rides
  // the same bare-hex guard as every colour slot.
  const attr = (name, { fg, bg, effect, effectColor, font } = {}) => {
    const opts = [
      fg ? `\t\t\t\t<option name="FOREGROUND" value="${fg}" />` : '',
      bg ? `\t\t\t\t<option name="BACKGROUND" value="${bg}" />` : '',
      font ? `\t\t\t\t<option name="FONT_TYPE" value="${font}" />` : '',
      effectColor ? `\t\t\t\t<option name="EFFECT_COLOR" value="${effectColor}" />` : '',
      effect ? `\t\t\t\t<option name="EFFECT_TYPE" value="${effect}" />` : '',
    ].filter(Boolean).join('\n');
    return `\t\t<option name="${esc(name)}">\n\t\t\t<value>\n${opts}\n\t\t\t</value>\n\t\t</option>`;
  };

  const ITALIC = 2, BOLD = 1;
  const LINE = 1, WAVE = 2, STRIKEOUT = 3;

  // The canonical 16-slot terminal map — VS Code's (build.mjs terminal.ansi*),
  // incl. its ANSI-0 = bg exemption (ADR 0001 scoped the lift to Ghostty).
  const ansi = [
    ['BLACK', 'bg'], ['RED', 'urgent'], ['GREEN', 'success'], ['YELLOW', 'accent'],
    ['BLUE', 'steelBright'], ['MAGENTA', 'brandPurple'], ['CYAN', 'cyan'], ['GRAY', 'fg'],
    ['DARKGRAY', 'fgDisabled'], ['RED_BRIGHT', 'urgentBright'], ['GREEN_BRIGHT', 'successBright'],
    ['YELLOW_BRIGHT', 'accentBright'], ['BLUE_BRIGHT', 'steel'], ['MAGENTA_BRIGHT', 'brandPurpleBright'],
    ['CYAN_BRIGHT', 'cyanBright'], ['WHITE', mode === 'dark' ? 'ivory' : 'fg'],
  ];

  const colors = [
    // editor canvas + chrome
    color('CARET_COLOR', bare('accent')),
    color('CARET_ROW_COLOR', bare('bgRaised')),
    color('SELECTION_BACKGROUND', bareA('accentFill', '55')),
    color('SELECTION_FOREGROUND', bare('fg')),
    color('GUTTER_BACKGROUND', bare('bg')),
    color('LINE_NUMBERS_COLOR', bare('fgDisabled')),
    color('LINE_NUMBER_ON_CARET_ROW_COLOR', bare('fg')),
    color('INDENT_GUIDE', bare('border')),
    color('SELECTED_INDENT_GUIDE', bare('borderLifted')),
    color('VISUAL_INDENT_GUIDE', bare('border')),
    color('WHITESPACES', bare('fgDisabled')),
    color('TEARLINE_COLOR', bare('border')),
    color('RIGHT_MARGIN_COLOR', bare('border')),
    color('FOLDED_TEXT_BORDER_COLOR', bare('border')),
    color('DOCUMENTATION_COLOR', bare('bgRaised')),
    // VCS gutter + diff
    color('ADDED_LINES_COLOR', bare('success')),
    color('MODIFIED_LINES_COLOR', bare('attention')),
    color('DELETED_LINES_COLOR', bare('urgent')),
    color('WHITESPACES_MODIFIED_LINES_COLOR', bare('attentionAlt')),
    color('DIFF_INSERTED', bare('diffAddBg')),
    color('DIFF_DELETED', bare('diffDelBg')),
    color('DIFF_MODIFIED', bareA('attentionFill', '40')),
    color('DIFF_CONFLICT', bareA('urgentBright', '40')),
    // file status (project tree)
    color('FILESTATUS_ADDED', bare('success')),
    color('FILESTATUS_UNKNOWN', bare('success')),
    color('FILESTATUS_MODIFIED', bare('attention')),
    color('FILESTATUS_DELETED', bare('urgent')),
    color('FILESTATUS_IGNORED', bare('fgDisabled')),
    color('FILESTATUS_MERGED_WITH_CONFLICTS', bare('urgentBright')),
    // console / terminal
    color('CONSOLE_BACKGROUND_KEY', bare('bg')),
    ...ansi.map(([slot, token]) => color(`CONSOLE_${slot}_OUTPUT`, bare(token))),
  ].join('\n');

  // The 2024.2+ "new" terminal reads its 16 ANSI slots from BLOCK_TERMINAL_*
  // text attributes (the classic console keeps the CONSOLE_*_OUTPUT colours
  // above); same map, second surface. Slot names differ from the console's:
  // BLACK/RED/…/WHITE + _BRIGHT, no GRAY/DARKGRAY aliases.
  const blockTerminal = [
    ['BLACK', 'bg'], ['RED', 'urgent'], ['GREEN', 'success'], ['YELLOW', 'accent'],
    ['BLUE', 'steelBright'], ['MAGENTA', 'brandPurple'], ['CYAN', 'cyan'], ['WHITE', 'fg'],
    ['BLACK_BRIGHT', 'fgDisabled'], ['RED_BRIGHT', 'urgentBright'], ['GREEN_BRIGHT', 'successBright'],
    ['YELLOW_BRIGHT', 'accentBright'], ['BLUE_BRIGHT', 'steel'], ['MAGENTA_BRIGHT', 'brandPurpleBright'],
    ['CYAN_BRIGHT', 'cyanBright'], ['WHITE_BRIGHT', mode === 'dark' ? 'ivory' : 'fg'],
  ];

  const attributes = [
    attr('TEXT', { fg: bare('fg'), bg: bare('bg') }),
    // the twelve roles, on the DEFAULT_* fallback keys
    attr('DEFAULT_KEYWORD', { fg: sxBare('keyword') }),
    attr('DEFAULT_STRING', { fg: sxBare('string') }),
    attr('DEFAULT_VALID_STRING_ESCAPE', { fg: sxBare('constant') }),
    attr('DEFAULT_INVALID_STRING_ESCAPE', { fg: sxBare('invalid'), effectColor: sxBare('invalid'), effect: WAVE }),
    attr('DEFAULT_NUMBER', { fg: sxBare('constant') }),
    attr('DEFAULT_CONSTANT', { fg: sxBare('constant') }),
    attr('DEFAULT_PREDEFINED_SYMBOL', { fg: sxBare('constant') }),
    attr('DEFAULT_LINE_COMMENT', { fg: sxBare('comment'), font: ITALIC }),
    attr('DEFAULT_BLOCK_COMMENT', { fg: sxBare('comment'), font: ITALIC }),
    attr('DEFAULT_DOC_COMMENT', { fg: sxBare('comment'), font: ITALIC }),
    attr('DEFAULT_DOC_COMMENT_TAG', { fg: sxBare('keyword'), font: ITALIC }),
    attr('DEFAULT_DOC_MARKUP', { fg: sxBare('comment'), font: ITALIC }),
    attr('DEFAULT_FUNCTION_DECLARATION', { fg: sxBare('function') }),
    attr('DEFAULT_FUNCTION_CALL', { fg: sxBare('function') }),
    attr('DEFAULT_CLASS_NAME', { fg: sxBare('type') }),
    attr('DEFAULT_CLASS_REFERENCE', { fg: sxBare('type') }),
    attr('DEFAULT_INTERFACE_NAME', { fg: sxBare('type') }),
    attr('DEFAULT_IDENTIFIER', { fg: sxBare('variable') }),
    attr('DEFAULT_LOCAL_VARIABLE', { fg: sxBare('variable') }),
    attr('DEFAULT_INSTANCE_FIELD', { fg: sxBare('variable') }),
    attr('DEFAULT_PARAMETER', { fg: sxBare('parameter'), font: ITALIC }),
    attr('DEFAULT_OPERATION_SIGN', { fg: sxBare('operator') }),
    attr('DEFAULT_BRACES', { fg: sxBare('operator') }),
    attr('DEFAULT_BRACKETS', { fg: sxBare('operator') }),
    attr('DEFAULT_PARENTHS', { fg: sxBare('operator') }),
    attr('DEFAULT_DOT', { fg: sxBare('operator') }),
    attr('DEFAULT_COMMA', { fg: sxBare('operator') }),
    attr('DEFAULT_SEMICOLON', { fg: sxBare('operator') }),
    attr('DEFAULT_TAG', { fg: sxBare('tag') }),
    attr('DEFAULT_ATTRIBUTE', { fg: sxBare('tag') }),
    attr('DEFAULT_ENTITY', { fg: sxBare('constant') }),
    // decorators / annotations read as the function role (VS Code parity)
    attr('DEFAULT_METADATA', { fg: sxBare('function') }),
    attr('DEFAULT_TEMPLATE_LANGUAGE_COLOR', { fg: sxBare('namespace') }),
    // diagnostics — the VS Code squiggle map: error urgent, warning attention,
    // weak/info steel, typo steelBright; deprecated = the invalid role, struck
    attr('ERRORS_ATTRIBUTES', { effectColor: bare('urgent'), effect: WAVE }),
    attr('WARNING_ATTRIBUTES', { effectColor: bare('attention'), effect: WAVE }),
    attr('WEAK_WARNING_ATTRIBUTES', { effectColor: bare('steel'), effect: LINE }),
    attr('INFO_ATTRIBUTES', { effectColor: bare('steel'), effect: LINE }),
    attr('TYPO', { effectColor: bare('steelBright'), effect: WAVE }),
    attr('DEPRECATED_ATTRIBUTES', { fg: sxBare('invalid'), effect: STRIKEOUT, effectColor: sxBare('invalid') }),
    attr('MARKED_FOR_REMOVAL_ATTRIBUTES', { fg: sxBare('invalid'), effect: STRIKEOUT, effectColor: sxBare('invalid') }),
    attr('NOT_USED_ELEMENT_ATTRIBUTES', { fg: bare('fgMuted') }),  // unused code is still code to read: the comment tier, not the disabled tier
    attr('WRONG_REFERENCES_ATTRIBUTES', { fg: bare('urgent') }),
    // editor affordances
    attr('MATCHED_BRACE_ATTRIBUTES', { fg: bare('accent'), bg: bareA('accentFill', '30'), font: BOLD }),
    attr('UNMATCHED_BRACE_ATTRIBUTES', { fg: bare('urgentBright'), font: BOLD }),
    attr('SEARCH_RESULT_ATTRIBUTES', { fg: bare('ink'), bg: bare('attentionFill') }),
    attr('TEXT_SEARCH_RESULT_ATTRIBUTES', { fg: bare('ink'), bg: bare('attentionFill') }),
    attr('WRITE_SEARCH_RESULT_ATTRIBUTES', { fg: bare('ink'), bg: bare('attentionFill'), font: BOLD }),
    attr('IDENTIFIER_UNDER_CARET_ATTRIBUTES', { bg: bare('bgRaised') }),
    attr('WRITE_IDENTIFIER_UNDER_CARET_ATTRIBUTES', { bg: bareA('attentionFill', '40') }),
    attr('TODO_DEFAULT_ATTRIBUTES', { fg: bare('ink'), bg: bare('attentionFill'), font: BOLD }),
    attr('FOLDED_TEXT_ATTRIBUTES', { fg: bare('fgSecondary'), bg: bare('bgRaised') }),
    attr('INLINE_PARAMETER_HINT', { fg: bare('fgMuted'), bg: bare('bgRaised') }),
    attr('INLINE_PARAMETER_HINT_HIGHLIGHTED', { fg: bare('fg'), bg: bare('bgOverlay') }),
    attr('INLAY_DEFAULT', { fg: bare('fgMuted'), bg: bare('bgRaised') }),
    attr('INLAY_TEXT_WITHOUT_BACKGROUND', { fg: bare('fgMuted') }),
    attr('BREAKPOINT_ATTRIBUTES', { bg: bare('diffDelBg') }),
    attr('EXECUTIONPOINT_ATTRIBUTES', { fg: bare('fg'), bg: bare('steelFill') }),
    attr('HYPERLINK_ATTRIBUTES', { fg: bare('accent'), effectColor: bare('accent'), effect: LINE }),
    attr('FOLLOWED_HYPERLINK_ATTRIBUTES', { fg: bare('accentBright'), effectColor: bare('accentBright'), effect: LINE }),
    attr('INACTIVE_HYPERLINK_ATTRIBUTES', { fg: bare('fgMuted'), effectColor: bare('fgMuted'), effect: LINE }),
    // console + log
    attr('CONSOLE_NORMAL_OUTPUT', { fg: bare('fg') }),
    attr('CONSOLE_ERROR_OUTPUT', { fg: bare('urgentText') }),
    attr('CONSOLE_SYSTEM_OUTPUT', { fg: bare('fgSecondary') }),
    attr('CONSOLE_USER_INPUT', { fg: bare('accent') }),
    attr('LOG_ERROR_OUTPUT', { fg: bare('urgent') }),
    attr('LOG_WARNING_OUTPUT', { fg: bare('attention') }),
    attr('LOG_INFO_OUTPUT', { fg: bare('steel') }),
    attr('LOG_DEBUG_OUTPUT', { fg: bare('fgMuted') }),
    attr('LOG_VERBOSE_OUTPUT', { fg: bare('fgDisabled') }),
    attr('LOG_EXPIRED_ENTRY', { fg: bare('fgDisabled') }),
    // diff hunk bodies. Same NAMES as the DIFF_* entries in <colors> above on
    // purpose: the platform registers both a ColorKey (gutter / VCS swatches)
    // and a TextAttributesKey (diff-viewer text) under each name, read from
    // different XML sections — not a duplicate.
    attr('DIFF_INSERTED', { bg: bare('diffAddBg') }),
    attr('DIFF_DELETED', { bg: bare('diffDelBg') }),
    attr('DIFF_MODIFIED', { bg: bareA('attentionFill', '40') }),
    attr('DIFF_CONFLICT', { bg: bareA('urgentBright', '40') }),
    ...blockTerminal.map(([slot, token]) => attr(`BLOCK_TERMINAL_${slot}`, { fg: bare(token) })),
  ].join('\n');

  // Language-specific keys (Java's CLASS_NAME_ATTRIBUTES, Markdown's
  // MARKDOWN_HEADER, …) are NOT re-declared here, and deliberately carry no
  // baseAttributes="1" marker either: a key this scheme does not define walks
  // its fallback chain INSIDE this scheme first (EditorColorsSchemeImpl.
  // getAttributes → getFallbackAttributes) and reaches the parent only when the
  // chain finds nothing — so the DEFAULT_* roles already win over the parent's
  // explicit language keys. Proven by A/B in IDEA CE 2025.2.5 (identical render
  // with and without 177 markers); the "String is red" that suggested otherwise
  // was the unresolved-reference highlight of a JDK-less project.

  // XML comments forbid a literal double hyphen anywhere in the body.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ${title}: IntelliJ Platform editor color scheme.
  Generated from themes/_palette.json by themes/build.mjs; edit there and rebuild.
  A diff against parent_scheme "${parent}": every option omitted inherits.
  Bare hex, RGBA alpha-last. Bound to the matching *.theme.json via editorScheme.
-->
<scheme name="${esc(title)}" version="142" parent_scheme="${parent}">
\t<metaInfo>
\t\t<property name="generated">themes/build.mjs</property>
\t\t<property name="pluginId">${JETBRAINS_PLUGIN_ID}</property>
\t</metaInfo>
\t<colors>
${colors}
\t</colors>
\t<attributes>
${attributes}
\t</attributes>
</scheme>
`;
};

// UI theme — palette token NAMES in `ui`, every token verbatim in `colors`,
// #RRGGBBAA literals only for alpha blends.
const jetbrainsUiTheme = (mode) => {
  const { P, t, alpha, onAccent } = jetbrainsPalette(mode);
  const name = mode === 'dark' ? 'Artificer Dark' : 'Artificer Light';
  // Every string-valued top-level palette token, verbatim. This is the one
  // emitter that walks the palette wholesale rather than naming tokens, so it
  // is load-bearing on the palette's shape: a string value that is not a
  // six-digit hex still throws (t() guards it — a typo'd colour must not ship),
  // but a non-string field Lane 1 might add later (a flag, a nested object) is
  // skipped here rather than failing all twenty generators at once.
  const colors = Object.fromEntries(
    Object.keys(P).filter((token) => typeof P[token] === 'string').map((token) => [token, t(token)])
  );
  // A literal with alpha — the one place a "#" value appears in `ui`.
  const a = (token, aa) => t(token) + alpha(aa);
  // A bare name is a lookup; guard it so a typo throws here, not silently
  // renders as "unresolved" in the IDE.
  const n = (token) => { t(token); return token; };

  const theme = {
    name,
    dark: mode === 'dark',
    author: 'Cameron Sjo',
    parentTheme: mode === 'dark' ? 'Islands Dark' : 'Islands Light',
    editorScheme: `/artificer-${mode}.xml`,
    colors,
    ui: {
      '*': {
        background: n('bg'),
        foreground: n('fg'),
        selectionBackground: n('selectionFill'),
        selectionForeground: n('fg'),
        selectionInactiveBackground: n('bgRaised'),
        borderColor: n('border'),
        separatorColor: n('border'),
        focusColor: n('accent'),
        focusedBorderColor: n('accent'),
        disabledForeground: n('fgDisabled'),
        infoForeground: n('fgSecondary'),
        lineSeparatorColor: n('border'),
      },
      // Islands: backdrop vs islands (see the surface-model note in the banner)
      'MainWindow.background': n('bgInactive'),
      'Island.borderColor': n('bg'),
      'Editor.background': n('bg'),
      'EditorPane.background': n('bg'),
      'ToolWindow.background': n('bg'),
      'ToolWindow.Header.background': n('bg'),
      'ToolWindow.Header.inactiveBackground': n('bg'),
      'ToolWindow.Header.borderColor': n('border'),
      'ToolWindow.HeaderTab.underlineColor': n('accent'),
      'ToolWindow.HeaderTab.inactiveUnderlineColor': n('fgDisabled'),
      'EditorTabs.background': n('bg'),
      'EditorTabs.underlinedTabBackground': n('bg'),
      'EditorTabs.inactiveUnderlinedTabBackground': n('bg'),
      'EditorTabs.underlinedBorderColor': n('accent'),
      'EditorTabs.inactiveUnderlinedTabBorderColor': n('fgDisabled'),
      'EditorTabs.underlineColor': n('accent'),
      'EditorTabs.inactiveUnderlineColor': n('fgDisabled'),
      'EditorTabs.underlinedTabForeground': n('fg'),
      'EditorTabs.inactiveColoredFileBackground': n('bgRaised'),
      'MainToolbar.background': n('bgInactive'),
      'MainToolbar.inactiveBackground': n('bgInactive'),
      'StatusBar.background': n('bgInactive'),
      'StatusBar.borderColor': n('border'),
      // lists, trees, tables
      'Tree.selectionBackground': a('accentFill', '55'),
      'Tree.selectionForeground': n('fg'),
      'Tree.selectionInactiveBackground': n('bgRaised'),
      'Tree.hoverBackground': a('bgOverlay', '80'),
      'List.selectionBackground': a('accentFill', '55'),
      'List.selectionForeground': n('fg'),
      'List.selectionInactiveBackground': n('bgRaised'),
      'List.hoverBackground': a('bgOverlay', '80'),
      'Table.selectionBackground': a('accentFill', '55'),
      'Table.selectionForeground': n('fg'),
      'Table.selectionInactiveBackground': n('bgRaised'),
      'Table.gridColor': n('border'),
      'Table.stripeColor': n('bgRaised'),
      'TableHeader.background': n('bgRaised'),
      // controls
      'Button.default.startBackground': n('accentFill'),
      'Button.default.endBackground': n('accentFill'),
      'Button.default.startBorderColor': n('accentFill'),
      'Button.default.endBorderColor': n('accentFill'),
      'Button.default.foreground': n(onAccent),
      'Button.default.focusedBorderColor': n('accentBright'),
      'Button.startBackground': n('bgRaised'),
      'Button.endBackground': n('bgRaised'),
      'Button.startBorderColor': n('border'),
      'Button.endBorderColor': n('border'),
      'Button.focusedBorderColor': n('accent'),
      'ActionButton.hoverBackground': n('bgRaised'),
      'ActionButton.hoverBorderColor': n('bgRaised'),
      'ActionButton.pressedBackground': n('bgOverlay'),
      'ActionButton.pressedBorderColor': n('bgOverlay'),
      'ComboBox.background': n('bgRaised'),
      'ComboBox.nonEditableBackground': n('bgRaised'),
      'TextField.background': n('bgRaised'),
      'TextArea.background': n('bgRaised'),
      'SearchField.background': n('bgRaised'),
      'Editor.SearchField.background': n('bgRaised'),
      'CheckBox.background': n('bg'),
      'Component.focusColor': n('accent'),
      'Component.focusedBorderColor': n('accent'),
      'Component.errorFocusColor': n('urgent'),
      'Component.inactiveErrorFocusColor': a('urgent', '80'),
      'Component.warningFocusColor': n('attention'),
      'Component.inactiveWarningFocusColor': a('attention', '80'),
      'Label.foreground': n('fg'),
      'Label.infoForeground': n('fgSecondary'),
      'Label.disabledForeground': n('fgDisabled'),
      'Link.activeForeground': n('accent'),
      'Link.hoverForeground': n('accentBright'),
      'Link.pressedForeground': n('accentBright'),
      'Link.visitedForeground': n('accent'),
      'TabbedPane.underlineColor': n('accent'),
      'TabbedPane.disabledUnderlineColor': n('fgDisabled'),
      'TabbedPane.hoverColor': a('bgOverlay', '80'),
      'ProgressBar.progressColor': n('accent'),
      'ProgressBar.indeterminateStartColor': n('accent'),
      'ProgressBar.indeterminateEndColor': n('accentBright'),
      'ProgressBar.trackColor': n('bgRaised'),
      'ProgressBar.passedColor': n('success'),
      'ProgressBar.failedColor': n('urgent'),
      'Counter.background': n('accentFill'),
      'Counter.foreground': n(onAccent),
      'ScrollBar.thumbColor': a('fgDisabled', '80'),
      'ScrollBar.thumbBorderColor': a('fgDisabled', '80'),
      'ScrollBar.hoverThumbColor': a('fgMuted', '80'),
      'ScrollBar.hoverThumbBorderColor': a('fgMuted', '80'),
      'ScrollBar.trackColor': a('bg', '00'),
      'ScrollBar.hoverTrackColor': a('bgRaised', '80'),
      // popups, menus, notifications
      'Popup.background': n('bgOverlay'),
      'Popup.borderColor': n('border'),
      'Popup.Header.activeBackground': n('bgOverlay'),
      'Popup.Header.inactiveBackground': n('bgOverlay'),
      'Popup.separatorColor': n('border'),
      'PopupMenu.background': n('bgOverlay'),
      'Menu.background': n('bgOverlay'),
      'Menu.borderColor': n('border'),
      'MenuItem.background': n('bgOverlay'),
      'MenuItem.selectionBackground': a('accentFill', '55'),
      'MenuItem.selectionForeground': n('fg'),
      'MenuBar.background': n('bgInactive'),
      'Notification.background': n('bgOverlay'),
      'Notification.borderColor': n('border'),
      'Notification.errorBackground': n('diffDelBg'),
      'Notification.errorBorderColor': n('urgent'),
      'Notification.errorForeground': n('fg'),
      'Notification.ToolWindow.informativeBackground': n('bgOverlay'),
      'Notification.ToolWindow.informativeBorderColor': n('steel'),
      'Notification.ToolWindow.warningBackground': a('attentionFill', '40'),
      'Notification.ToolWindow.warningBorderColor': n('attention'),
      'Notification.ToolWindow.errorBackground': n('diffDelBg'),
      'Notification.ToolWindow.errorBorderColor': n('urgent'),
      'ValidationTooltip.errorBackground': n('diffDelBg'),
      'ValidationTooltip.errorBorderColor': n('urgent'),
      'ValidationTooltip.warningBackground': a('attentionFill', '40'),
      'ValidationTooltip.warningBorderColor': n('attention'),
      'ToolTip.background': n('bgOverlay'),
      'ToolTip.borderColor': n('border'),
      'SearchEverywhere.Header.background': n('bgOverlay'),
      'SearchEverywhere.SearchField.background': n('bgOverlay'),
      'SearchEverywhere.Tab.selectedBackground': n('bgRaised'),
      'SearchEverywhere.List.separatorColor': n('border'),
      'Banner.infoBackground': a('steelFill', '40'),
      'Banner.infoBorderColor': n('steel'),
      'Banner.warningBackground': a('attentionFill', '40'),
      'Banner.warningBorderColor': n('attention'),
      'Banner.errorBackground': n('diffDelBg'),
      'Banner.errorBorderColor': n('urgent'),
      'Banner.successBackground': n('diffAddBg'),
      'Banner.successBorderColor': n('success'),
      'Borders.color': n('border'),
      'Borders.ContrastBorderColor': n('border'),
      // VCS log + diff
      'VersionControl.Log.Commit.currentBranchBackground': n('bgRaised'),
      'VersionControl.RefLabel.foreground': n('fg'),
      'VersionControl.FileHistory.Commit.selectedBranchBackground': n('bgRaised'),
      'VersionControl.GitLog.localBranchIconColor': n('success'),
      'VersionControl.GitLog.remoteBranchIconColor': n('steel'),
      'VersionControl.GitLog.tagIconColor': n('accent'),
      'VersionControl.GitLog.headIconColor': n('accentBright'),
    },
  };
  return JSON.stringify(theme, null, 2) + '\n';
};

const jetbrainsPluginXml = () => {
  // <version> byte shape is load-bearing: sync-version.mjs stamps exactly
  // `<version>X.Y.Z</version>`; any whitespace inside would desync the two writers.
  const provider = (mode) => `    <themeProvider id="${JETBRAINS_THEME_IDS[mode]}" path="/artificer-${mode}.theme.json" />`;
  return `<!--
  Artificer theme plugin for IntelliJ Platform IDEs (IntelliJ IDEA, PyCharm,
  WebStorm, GoLand, RustRover, ...). Generated from themes/_palette.json by
  themes/build.mjs; edit there and rebuild. Pack with "npm run pack:jetbrains"
  and install via Settings > Plugins > (gear) > Install Plugin from Disk.
-->
<idea-plugin>
  <id>${JETBRAINS_PLUGIN_ID}</id>
  <name>Artificer Theme</name>
  <vendor>Cameron Sjo</vendor>
  <version>${version}</version>
  <idea-version since-build="${JETBRAINS_SINCE_BUILD}" />
  <depends>com.intellij.modules.platform</depends>
  <description><![CDATA[
    Artificer &mdash; a Jazz Age palette for tool surfaces: burnished gold on
    slate in the dark, sienna on ivory paper in the light. Two UI themes on the
    Islands base, each bound to its own editor color scheme, generated from the
    same palette as the Artificer design system's other editor and terminal
    themes.
  ]]></description>
  <extensions defaultExtensionNs="com.intellij">
${provider('dark')}
${provider('light')}
  </extensions>
</idea-plugin>
`;
};

write('jetbrains/META-INF/plugin.xml', jetbrainsPluginXml());
write('jetbrains/artificer-dark.theme.json',  jetbrainsUiTheme('dark'));
write('jetbrains/artificer-light.theme.json', jetbrainsUiTheme('light'));
write('jetbrains/artificer-dark.xml',  jetbrainsScheme('dark'));
write('jetbrains/artificer-light.xml', jetbrainsScheme('light'));

// ─────────────────────────────────────────────────────────────────────
// Helix — TOML theme, dark + light variants
// ─────────────────────────────────────────────────────────────────────
//
// Third consumer of $roles.syntax (after vscodeTheme's semanticTokenColors and
// tokenColors) and the FIRST terminal target that paints syntax at all —
// tmux/gitmux/lazygit/gh-dash are chrome-only. So it is also the first target
// where the choice of CANVAS changes a contrast outcome, and ADR 0038 rules
// that owner-override: ship transparent (inherit Ghostty's terminalBg) and keep
// the floor-clearing surface one `:theme` away. Hence two variants per mode —
// the transparent default, and an `-opaque` twin that paints bg. They differ by
// exactly the ui.background line; everything else is generated identically, so
// the override never drifts from its own escape hatch.
//
// Scope authority is Helix's documented theme-scope list (book/src/themes.md at
// the pinned release), NOT a stock theme — a stock theme shows one author's
// choices and silently omits whatever they did not care about. A scope with no
// sensible binding among the twelve roles is LEFT UNSET so it inherits;
// stretching a role to cover a scope it was not designed for is how a coherent
// palette turns to mud. Deliberately unset, and why:
//   · type.builtin, tag.builtin, function.builtin, constant.numeric.*,
//     constant.character.escape, string.special.*, comment.line/block — no role
//     distinguishes these from their parent, and Helix resolves the longest
//     matching key, so an explicit child that lands on the parent's hex is
//     noise rather than design.
//   · special (Rust `derive`) and markup.list markers — nothing in the twelve
//     roles maps to them.
//   · diff.delta.moved — inherits diff.delta.
//   · ui.cursor.{normal,insert,select} and their .primary variants — mode is
//     already encoded twice (editor.cursor-shape in the consumer's config, plus
//     the ui.statusline.<mode> chips below); a third encoding is noise.
//   · ui.cursorline.secondary, ui.cursorcolumn.* — off by default upstream.
//
// Colors route through a [palette] table keyed by the EXACT _palette.json token
// names, so every hex in the output greps straight back to its source token.
// Helix requires [palette] LAST — it swallows every key after its header.

const helixTheme = (mode, { paintBackground = false } = {}) => {
  const P = mode === 'dark' ? D : L;
  const slug = `artificer-${mode}${paintBackground ? '-opaque' : ''}`;
  const title = (mode === 'dark' ? 'Artificer Dark' : 'Artificer Light') + (paintBackground ? ' (opaque)' : '');
  const subtitle = mode === 'dark' ? 'Ghostty-rooted spine, Jazz Age accents' : 'Ivory paper, midnight indigo ink';

  // Helix's [palette] indirection wants token NAMES, so this target stops at the
  // name and defers hex resolution to the emitted table — same syntaxToken()
  // lookup vscodeTheme uses, only the final deref differs. t() both records the
  // token for the [palette] table and is fail-fast: a mistyped name throws at
  // build time rather than emitting a color of "undefined" that Helix rejects
  // at load. Every token reference in the body MUST route through t()/sx(), or
  // it lands in the theme without a matching [palette] entry.
  const used = new Set();
  const t = (token) => {
    // hasOwn, not `in` — `in` walks the prototype chain, so `"constructor" in P`
    // is true for any object, and `constructor` is a live Helix scope name here.
    if (!Object.hasOwn(P, token)) throw new Error(`helixTheme(${mode}): unknown palette token "${token}"`);
    used.add(token);
    return token;
  };
  const sx = (role) => t(syntaxToken(role));

  // ink in BOTH modes per $notes.onAccentDark/onAccentLight — v0.19.0 (#122-A)
  // moved light off ivory because ivory on accentFill measures 2.32:1.
  // (claudeCodeTheme/vscodeTheme above still carry the pre-v0.19.0
  // dark ? ink : ivory ternary — a separate fix, out of scope here.)
  const onAccent = t('ink');
  // Statusline mode chips: brandPurpleBright and accent are light hues on dark
  // and dark hues on light, so their label flips with the mode (ink 6.15 / 8.49
  // dark; ivory 6.83 / 5.33 light). successFill is deep in BOTH modes, so
  // insert always takes ivory — 5.67 dark, 6.70 light ($notes.successFill).
  const onMode = t(mode === 'dark' ? 'ink' : 'ivory');

  // The one line that separates the two variants. Transparency in Helix is
  // achieved by OMITTING the key (59 of 172 stock themes do it, base16_terminal
  // among them) — "none" is not a valid Helix color.
  const backgroundBlock = paintBackground
    ? `# PAINTS the substrate instead of inheriting the terminal canvas. This is the
# floor-clearing surface: on bg every $roles.syntax binding passes (string 4.50,
# comment and operator 3.05, tag and invalid 3.08). Switch here with
# \`:theme ${slug}\` if the transparent default reads too dim.
"ui.background" = { bg = "${t('bg')}" }`
    : `# ui.background is deliberately UNSET, so Helix inherits Ghostty's canvas
# (terminalBg #313540) — a recorded exception (ADR 0038), not an oversight.
# Three roles sit under the repo's 3.0 hard floor there: comment and operator at
# 2.68, tag and invalid at 2.70; string is 3.95 against its 4.5 floor. The same
# ratios already ship as Ghostty ANSI 9/10 on the same canvas, so this surfaces a
# pre-existing terminal-wide condition rather than introducing one. Want the
# floors back? \`:theme artificer-${mode}-opaque\` — generated from this same
# source, differing only in this block.`;

  const body = `# ${title} — Helix theme
# ${subtitle}
# Drop in: ~/.config/helix/themes/${slug}.toml
# Then in config.toml:  theme = "${slug}"
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.
#
# Syntax resolves through $roles.syntax, the same editor-agnostic role layer VS
# Code consumes — a keyword is the same hue in both editors by construction.

# ── Syntax · $roles.syntax ────────────────────────────────────────────
"attribute" = "${sx('tag')}"  # attributes read as tag
"type" = "${sx('type')}"
"type.enum.variant" = "${sx('constant')}"  # matches vscode enumMember
"constructor" = "${sx('type')}"  # names the type it yields
"constant" = "${sx('constant')}"
"string" = "${sx('string')}"
"comment" = "${sx('comment')}"
"variable" = "${sx('variable')}"
"variable.parameter" = { fg = "${sx('parameter')}", modifiers = ["italic"] }
"variable.builtin" = { fg = "${sx('keyword')}", modifiers = ["italic"] }  # self/this
"label" = "${sx('variable')}"
"punctuation" = "${sx('operator')}"
"keyword" = "${sx('keyword')}"
"keyword.operator" = "${sx('operator')}"  # \`or\`, \`in\` — operators, not keywords
"keyword.storage.modifier" = { fg = "${sx('keyword')}", modifiers = ["italic"] }
"operator" = "${sx('operator')}"
"function" = "${sx('function')}"
"function.macro" = "${sx('keyword')}"  # matches vscode macro
"tag" = "${sx('tag')}"
"namespace" = "${sx('namespace')}"

# ── Markup ────────────────────────────────────────────────────────────
"markup.heading" = { fg = "${t('accent')}", modifiers = ["bold"] }
"markup.bold" = { fg = "${t('fg')}", modifiers = ["bold"] }
"markup.italic" = { fg = "${t('fg')}", modifiers = ["italic"] }
"markup.strikethrough" = { modifiers = ["crossed_out"] }
"markup.link.url" = { fg = "${t('accent')}", underline = { style = "line" } }
"markup.link.text" = "${t('accent')}"
"markup.link.label" = "${t('accent')}"
"markup.quote" = { fg = "${t('fgSecondary')}", modifiers = ["italic"] }
"markup.raw" = "${sx('string')}"

# ── Diff ──────────────────────────────────────────────────────────────
"diff.plus" = "${t('success')}"
"diff.minus" = "${t('urgent')}"
"diff.delta" = "${t('attention')}"
"diff.delta.conflict" = "${t('urgentBright')}"

# ── Diagnostics ───────────────────────────────────────────────────────
# Bare keys are the gutter indicators; diagnostic.* is the editing area, where
# an undercurl carries severity without recoloring the code underneath.
"error" = "${t('urgent')}"
"warning" = "${t('attention')}"
"info" = "${t('cyan')}"
"hint" = "${t('fgMuted')}"
"diagnostic" = { underline = { color = "${t('fgMuted')}", style = "curl" } }
"diagnostic.error" = { underline = { color = "${t('urgent')}", style = "curl" } }
"diagnostic.warning" = { underline = { color = "${t('attention')}", style = "curl" } }
"diagnostic.info" = { underline = { color = "${t('cyan')}", style = "curl" } }
"diagnostic.hint" = { underline = { color = "${t('fgMuted')}", style = "curl" } }
"diagnostic.unnecessary" = { fg = "${t('fgDisabled')}", modifiers = ["dim"] }
"diagnostic.deprecated" = { fg = "${sx('invalid')}", modifiers = ["crossed_out"] }

# ── Editor plane ──────────────────────────────────────────────────────
${backgroundBlock}
"ui.background.separator" = "${t('border')}"
"ui.text" = "${t('fg')}"
"ui.text.inactive" = "${t('fgDisabled')}"
"ui.text.info" = "${t('accent')}"
"ui.text.directory" = "${t('steel')}"
"ui.text.focus" = { fg = "${onAccent}", bg = "${t('accentFill')}", modifiers = ["bold"] }

"ui.cursor" = { fg = "${t('bg')}", bg = "${t('fgSecondary')}" }
"ui.cursor.primary" = { fg = "${t('bg')}", bg = "${t('accent')}" }
"ui.cursor.match" = { fg = "${t('accentBright')}", modifiers = ["bold"], underline = { color = "${t('accent')}", style = "line" } }

# Selection is a neutral surface tint, not a saturated fill: Ghostty can force
# selection-foreground (see ghosttyTheme above) but Helix cannot, so the dim
# syntax roles keep whatever hue they had. selectionFill would swamp them —
# comment on it measures 1.39 dark / 1.65 light, against 1.84 / 2.87 here.
# No opaque fill clears a floor; this is the least bad, and it is the
# convention every stock theme reaches for.
"ui.selection" = { bg = "${t('bgOverlay')}" }
"ui.selection.primary" = { bg = "${t('bgFloat')}" }
"ui.cursorline.primary" = { bg = "${t('bgRaised')}" }

# Line numbers recede on purpose (fgDisabled: 2.43 dark / 3.25 light) — with
# line-number = "relative" these are offsets you glance past, and the absolute
# number you actually read is the selected one at full fg. Same binding VS Code
# ships for editorLineNumber; ruleUsageSetsRatio.
"ui.linenr" = "${t('fgDisabled')}"
"ui.linenr.selected" = { fg = "${t('fg')}", modifiers = ["bold"] }

# ── Floating plane ────────────────────────────────────────────────────
# Popups need an opaque fill — text renders over whatever is behind them.
# Caveat worth knowing before touching this: a code block inside a hover doc
# paints syntax on bgOverlay, where comment measures 2.22 dark (3.13 light).
# Not gated by check:contrast, which scopes SURFACE to bg/ivory.
"ui.window" = "${t('border')}"
"ui.popup" = { fg = "${t('fg')}", bg = "${t('bgOverlay')}" }
"ui.popup.info" = { fg = "${t('fg')}", bg = "${t('bgOverlay')}" }
"ui.help" = { fg = "${t('fg')}", bg = "${t('bgOverlay')}" }
"ui.menu" = { fg = "${t('fg')}", bg = "${t('bgOverlay')}" }
"ui.menu.selected" = { fg = "${onAccent}", bg = "${t('accentFill')}", modifiers = ["bold"] }
"ui.menu.scroll" = { fg = "${t('borderLifted')}", bg = "${t('bgRaised')}" }
"ui.picker.header" = { fg = "${t('fgSecondary')}", bg = "${t('bgOverlay')}" }
"ui.picker.header.column" = "${t('fgSecondary')}"
# Gold rides the underline, not the label: accent as TEXT on bgOverlay is
# 4.35 light, under AA. As a rule it carries no text obligation (ruleUsageSetsRatio).
"ui.picker.header.column.active" = { fg = "${t('fg')}", modifiers = ["bold"], underline = { color = "${t('accent')}", style = "line" } }
"ui.highlight" = { bg = "${t('bgRaised')}" }
"ui.highlight.frameline" = { bg = "${t('bgFloat')}" }

# ── Statusline ────────────────────────────────────────────────────────
# bgOverlay so the bar reads as a band against the editor's bg, not a seam.
# Mode chips reuse the hues tmux and yazi already established: brandPurple*
# for the resting mode (tmux's colour13 accent), urgent-free so a red bar
# always means something is wrong.
"ui.statusline" = { fg = "${t('fg')}", bg = "${t('bgOverlay')}" }
"ui.statusline.inactive" = { fg = "${t('fgSecondary')}", bg = "${t('bgRaised')}" }
"ui.statusline.separator" = { fg = "${t('border')}", bg = "${t('bgOverlay')}" }
"ui.statusline.normal" = { fg = "${onMode}", bg = "${t('brandPurpleBright')}", modifiers = ["bold"] }
"ui.statusline.insert" = { fg = "${t('ivory')}", bg = "${t('successFill')}", modifiers = ["bold"] }
"ui.statusline.select" = { fg = "${onMode}", bg = "${t('accent')}", modifiers = ["bold"] }

"ui.bufferline" = { fg = "${t('fgSecondary')}", bg = "${t('bgRaised')}" }
"ui.bufferline.active" = { fg = "${t('fg')}", bg = "${t('bg')}", underline = { color = "${t('accent')}", style = "line" } }
"ui.bufferline.background" = { bg = "${t('bgRaised')}" }

# ── Virtual text & gutters ────────────────────────────────────────────
"ui.virtual.ruler" = { bg = "${t('bgRaised')}" }
"ui.virtual.whitespace" = "${t('fgDisabled')}"
"ui.virtual.indent-guide" = "${t('border')}"
"ui.virtual.inlay-hint" = "${t('fgMuted')}"
"ui.virtual.inlay-hint.parameter" = "${t('steel')}"
"ui.virtual.inlay-hint.type" = "${t('accentBright')}"
"ui.virtual.wrap" = "${t('fgDisabled')}"
"ui.virtual.jump-label" = { fg = "${t('urgentBright')}", modifiers = ["bold"] }

"ui.debug.breakpoint" = "${t('urgent')}"
"ui.debug.active" = "${t('attention')}"
"tabstop" = { bg = "${t('bgOverlay')}" }
`;

  const paletteTable = [...used]
    .sort()
    .map((token) => `${token} = "${P[token]}"`)
    .join('\n');

  return `${body}
# ── Palette · verbatim _palette.json token names ──────────────────────
[palette]
${paletteTable}
`;
};

write('helix/artificer-dark.toml',         helixTheme('dark'));
write('helix/artificer-light.toml',        helixTheme('light'));
write('helix/artificer-dark-opaque.toml',  helixTheme('dark',  { paintBackground: true }));
write('helix/artificer-light-opaque.toml', helixTheme('light', { paintBackground: true }));

// ─────────────────────────────────────────────────────────────────────
// Neovim — one Lua colorscheme, both modes
// ─────────────────────────────────────────────────────────────────────
//
// Fourth consumer of $roles.syntax, and the second terminal editor on the same
// canvas as Helix — so ADR 0038 governs here too rather than a new ruling:
// ship transparent (inherit Ghostty's terminalBg) and keep the floor-clearing
// opaque surface one command away. Helix expressed that as `-opaque` twins
// because its themes are static TOML; a Neovim colorscheme is EXECUTABLE, so
// the escape is a flag the file reads at load — `vim.g.artificer_opaque = true`
// before `:colorscheme artificer`. Same ruling, idiomatic mechanism, one file.
//
// One file for both modes for the same reason: the emitted Lua branches on
// vim.o.background, which plugins and `:set background=light` already read.
// Two colorschemes (artificer / artificer-light) would discard that.
//
// Group authority is Neovim's own documented set (`:help highlight-groups`,
// `:help treesitter-highlight-groups`, `:help lsp-semantic-highlight`), NOT a
// stock theme. Two Neovim-specific hazards shape what is emitted:
//
//   · `highlight clear` restores Neovim's BUILT-IN defaults, not nothing — so a
//     legacy group left unset keeps a stock color rather than inheriting an
//     Artificer one. Vim's "preferred groups" are therefore all defined
//     explicitly (vim/vim#4405: stale links survive a colorscheme switch, and
//     the upstream conclusion was to stop relying on them).
//   · nvim_set_hl REPLACES a group's whole definition — there is no merge — so
//     every spec below is complete on its own.
//
// A group with no sensible binding among the twelve roles is LEFT UNSET so it
// inherits through Neovim's own specific→generic @capture fallback. Deliberately
// unset, and why:
//   · @comment.documentation, @string.special.*, @function.builtin,
//     @constant.builtin, @type.builtin, @variable.member, @property — no role
//     distinguishes these from their parent, and an explicit child that lands on
//     the parent's hex is noise rather than design.
//   · language-specialized forms (@keyword.lua, @string.python, …) — the whole
//     point of the role layer is that a keyword is one hue everywhere.
//   · @markup.list markers and Vim's Character/Number/Boolean/Conditional/Repeat
//     — they default-link to a parent this file DOES define, so the cascade
//     already carries them.
//   · DiagnosticVirtualText* / DiagnosticSign* — Neovim default-links each to
//     its Diagnostic* parent, which is defined below.
//   · Statusline MODE chips (Helix's ui.statusline.normal/insert/select) — core
//     Neovim has no group for them; the mode indicator belongs to a statusline
//     plugin, and none is assumed here. Chrome parity stops there, on purpose.
//   · cterm* on every group — see the truecolor banner in the emitted header.
//
// Colors route through a `palette` table keyed by the EXACT _palette.json token
// names (the greppability Helix's [palette] table buys), and every reference in
// the body goes through t()/sx() so a mistyped token throws at build time
// instead of emitting a nil that Lua would silently pass to nvim_set_hl.

const neovimTheme = () => {
  // Both modes ship in one file, so a token has to exist in BOTH blocks — a
  // token present only in dark would emit `P.x` that resolves to nil under
  // `:set background=light`, which nvim_set_hl accepts and renders as "no color".
  const used = new Set();

  // This emitter's output is EXECUTED — a Lua script Neovim runs on every
  // `:colorscheme artificer`, not a data file it parses. That makes it the
  // highest-consequence sink in build.mjs, and _palette.json is by this repo's
  // own threat model not repo-authored: it is Lane 1's artifact, pulled over
  // DesignSync from an external project (CLAUDE.md § Encapsulation).
  //
  // A value of the shape `#000", x = os.execute("…") --` closes the Lua string
  // literal and becomes statements; a token NAME lands as a bare table key AND
  // as `P.<name>`, so it is the same hole twice. Both are guarded here, at the
  // emitter, for the reason batTheme's hex() states: check:themes regenerates
  // and diffs, so a poisoned palette and its faithful regeneration both pass
  // green. The test's parser catching a malformed value is a side effect, not
  // a control.
  const hex = (value, what) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(value ?? '')) {
      throw new Error(
        `neovimTheme: ${what} resolved to ${JSON.stringify(value)}, which is not a `
        + 'six-digit hex colour. Refusing to emit it into an executable Lua file.'
      );
    }
    return value;
  };

  // A Lua identifier, and nothing else — the name is emitted unquoted on both
  // sides of the table.
  const identifier = (token) => {
    if (!/^[A-Za-z_]\w*$/.test(token)) {
      throw new Error(
        `neovimTheme: palette token ${JSON.stringify(token)} is not a Lua identifier. `
        + 'Refusing to emit it as a table key.'
      );
    }
    return token;
  };

  const t = (token) => {
    // hasOwn, not `in` — `in` walks the prototype chain, so `"constructor" in P`
    // is true for any object.
    if (!Object.hasOwn(D, token) || !Object.hasOwn(L, token)) {
      throw new Error(`neovimTheme: token "${token}" is not in BOTH palette modes`);
    }
    identifier(token);
    hex(D[token], `dark token "${token}"`);
    hex(L[token], `light token "${token}"`);
    used.add(token);
    return `P.${token}`;
  };
  const sx = (role) => t(syntaxToken(role));

  // ink in BOTH modes per $notes.onAccentDark/onAccentLight — ivory on
  // accentFill measures 2.32:1 (v0.19.0 #122-A).
  const onAccent = t('ink');

  const paletteBlock = (P) => {
    const tokens = [...used].sort();
    const pad = Math.max(...tokens.map((token) => token.length));
    return tokens.map((token) => `    ${token.padEnd(pad)} = "${P[token]}",`).join('\n');
  };

  const body = `-- Artificer — Neovim colorscheme
-- Ghostty-rooted spine, Jazz Age accents · ivory paper, midnight indigo ink
--
-- Drop in: ~/.config/nvim/colors/artificer.lua
-- Then:    :colorscheme artificer
--
-- Generated from themes/_palette.json — edit there + re-run build.mjs.
--
-- Syntax resolves through $roles.syntax, the same editor-agnostic role layer VS
-- Code and Helix consume — a keyword is the same hue in all three editors by
-- construction, not coincidence.
--
-- TRUECOLOR REQUIRED. No ctermfg/ctermbg is emitted, so without
-- \`termguicolors\` this degrades to whatever 16 colors the terminal guesses —
-- a disposition, not an oversight. This file deliberately does NOT set
-- \`termguicolors\` itself: setting it from inside colors/ mutates a global the
-- user never gets back on switch-away, and it is redundant on Neovim >= 0.10.
-- Set it in your init.lua.
--
-- \`highlight clear\` below wipes EVERY highlight, including groups plugins
-- defined earlier — they vanish on each colorscheme switch. Personal overrides
-- belong in a ColorScheme autocommand created BEFORE \`:colorscheme\` runs.

vim.cmd('highlight clear')
if vim.fn.exists('syntax_on') == 1 then
  vim.cmd('syntax reset')
end
vim.g.colors_name = 'artificer'

-- ── Palette · verbatim _palette.json token names ─────────────────────
local palette = {
  dark = {
__DARK__
  },
  light = {
__LIGHT__
  },
}

-- \`background\` is read ONCE, here. Neovim fires OptionSet and nothing else on
-- \`:set background=light\`, so the flip does not re-source this file — re-run
-- \`:colorscheme artificer\` after changing it.
local P = palette[vim.o.background == 'light' and 'light' or 'dark']

-- ADR 0038's escape hatch. Default is transparent: the terminal canvas
-- (Ghostty's terminalBg) shows through, where comment and operator measure 2.68
-- against the repo's 3.0 floor — the same pre-existing terminal-wide condition
-- Ghostty's ANSI 9/10 already ship. Want the floors back?
--
--     vim.g.artificer_opaque = true
--     vim.cmd.colorscheme('artificer')
--
-- vim.g survives \`:colorscheme\`, and \`:colorscheme\` re-sources
-- unconditionally, so re-entry re-reads the flag. \`= 1\` is accepted too, for
-- \`:let g:artificer_opaque = 1\`.
local opaque = vim.g.artificer_opaque == true or vim.g.artificer_opaque == 1

local function hi(group, opts)
  vim.api.nvim_set_hl(0, group, opts)
end

-- ── Editor plane ─────────────────────────────────────────────────────
if opaque then
  -- PAINTS the substrate. On bg every $roles.syntax binding passes: string
  -- 4.50, comment and operator 3.05, tag and invalid 3.08.
  hi('Normal', { fg = ${t('fg')}, bg = ${t('bg')} })
else
  -- No bg key at all — that is how a Lua colorscheme is transparent; there is
  -- no "none" color to assign.
  hi('Normal', { fg = ${t('fg')} })
end

hi('Cursor', { fg = ${t('bg')}, bg = ${t('accent')} })
hi('CursorLine', { bg = ${t('bgRaised')} })
hi('CursorLineNr', { fg = ${t('fg')}, bold = true })
-- Line numbers recede on purpose (fgDisabled: 2.43 dark / 3.25 light) — with
-- relative numbering these are offsets you glance past, and the absolute number
-- you actually read is the selected one at full fg (ruleUsageSetsRatio).
hi('LineNr', { fg = ${t('fgDisabled')} })
-- No bg: the sign column inherits whichever canvas Normal settled on, so it
-- does not become an opaque stripe on the transparent default.
hi('SignColumn', { fg = ${t('fgDisabled')} })
hi('WinSeparator', { fg = ${t('border')} })
hi('Folded', { fg = ${t('fgSecondary')}, bg = ${t('bgRaised')} })
hi('ColorColumn', { bg = ${t('bgRaised')} })
hi('Title', { fg = ${t('accent')}, bold = true })
hi('Directory', { fg = ${t('steel')} })
hi('Conceal', { fg = ${t('fgDisabled')} })
hi('EndOfBuffer', { fg = ${t('fgDisabled')} })

-- Selection and search are surface TINTS, not saturated fills: Neovim cannot
-- force a selection foreground, so the syntax hues underneath keep whatever
-- color they had. An opaque accent slab would swamp them (comment on
-- selectionFill measures 1.39 dark / 1.65 light). CurSearch is the one that may
-- shout — it marks exactly one match, and it sets its own fg.
hi('Visual', { bg = ${t('bgOverlay')} })
hi('Search', { bg = ${t('bgFloat')} })
hi('CurSearch', { fg = ${onAccent}, bg = ${t('accentFill')}, bold = true })
hi('IncSearch', { link = 'CurSearch' })
hi('MatchParen', { fg = ${t('accentBright')}, bold = true, underline = true, sp = ${t('accent')} })

-- ── Floating plane ───────────────────────────────────────────────────
-- Popups need an opaque fill in both variants — text renders over whatever is
-- behind them. Worth knowing before touching this: a code block inside a hover
-- doc paints syntax on bgOverlay, where comment measures 2.22 dark (3.13
-- light). Not gated by check:contrast, which scopes SURFACE to bg/ivory.
hi('NormalFloat', { fg = ${t('fg')}, bg = ${t('bgOverlay')} })
hi('FloatBorder', { fg = ${t('border')}, bg = ${t('bgOverlay')} })
hi('FloatTitle', { fg = ${t('accent')}, bg = ${t('bgOverlay')}, bold = true })
hi('Pmenu', { fg = ${t('fg')}, bg = ${t('bgOverlay')} })
hi('PmenuSel', { fg = ${onAccent}, bg = ${t('accentFill')}, bold = true })
hi('PmenuSbar', { bg = ${t('bgRaised')} })
hi('PmenuThumb', { bg = ${t('borderLifted')} })
hi('WildMenu', { link = 'PmenuSel' })
hi('QuickFixLine', { bg = ${t('bgRaised')} })

-- ── Statusline & tabs ────────────────────────────────────────────────
-- bgOverlay so the bar reads as a band against the editor canvas, not a seam.
hi('StatusLine', { fg = ${t('fg')}, bg = ${t('bgOverlay')} })
hi('StatusLineNC', { fg = ${t('fgSecondary')}, bg = ${t('bgRaised')} })
hi('TabLine', { fg = ${t('fgSecondary')}, bg = ${t('bgRaised')} })
hi('TabLineSel', { fg = ${t('fg')}, bg = ${t('bg')}, bold = true })
hi('TabLineFill', { bg = ${t('bgRaised')} })
hi('MsgArea', { fg = ${t('fg')} })
hi('ModeMsg', { fg = ${t('fgSecondary')}, bold = true })
hi('MoreMsg', { fg = ${t('accent')} })
hi('Question', { fg = ${t('accent')} })
-- urgentText, not urgent: ErrorMsg is body text in the message area, and bare
-- urgent measures 2.27:1 on dark bg. urgentText exists for exactly this
-- (ADR 0016). WarningMsg keeps attention — the palette offers no lifted
-- attention-text token, and Helix binds warning the same way.
hi('ErrorMsg', { fg = ${t('urgentText')} })
hi('WarningMsg', { fg = ${t('attention')} })

-- ── Virtual text & whitespace ────────────────────────────────────────
hi('NonText', { fg = ${t('fgDisabled')} })
hi('Whitespace', { fg = ${t('fgDisabled')} })
hi('SpecialKey', { fg = ${t('fgDisabled')} })
hi('LspInlayHint', { fg = ${t('fgMuted')} })

-- ── Syntax · $roles.syntax ───────────────────────────────────────────
-- Vim's "preferred groups", all defined rather than left to the built-in
-- defaults \`highlight clear\` restores. Their documented children (Number,
-- Boolean, Conditional, Repeat, StorageClass, …) default-link here, so the
-- cascade carries them without a line each.
hi('Comment', { fg = ${sx('comment')} })
hi('Constant', { fg = ${sx('constant')} })
hi('String', { fg = ${sx('string')} })
hi('Identifier', { fg = ${sx('variable')} })
hi('Function', { fg = ${sx('function')} })
hi('Statement', { fg = ${sx('keyword')} })
hi('Keyword', { fg = ${sx('keyword')} })
hi('Operator', { fg = ${sx('operator')} })
hi('PreProc', { fg = ${sx('keyword')} })
hi('Type', { fg = ${sx('type')} })
hi('Special', { fg = ${sx('constant')} })
hi('Delimiter', { fg = ${sx('operator')} })
hi('Underlined', { fg = ${t('accent')}, underline = true })
hi('Error', { fg = ${sx('invalid')} })
-- The one place a fill is right: TODO is a marker, not prose. attentionFill
-- pairs with ink at 5.09:1 dark / 8.49:1 light ($notes.attentionFill).
hi('Todo', { fg = ${t('ink')}, bg = ${t('attentionFill')}, bold = true })

-- ── Treesitter @captures ─────────────────────────────────────────────
-- Mostly links, so one palette token cascades. Explicit fg only where the role
-- genuinely differs from every legacy group above.
hi('@comment', { link = 'Comment' })
hi('@string', { link = 'String' })
hi('@string.escape', { link = 'String' })
hi('@character', { link = 'Constant' })
hi('@number', { link = 'Constant' })
hi('@boolean', { link = 'Constant' })
hi('@constant', { link = 'Constant' })
hi('@variable', { link = 'Identifier' })
hi('@label', { link = 'Identifier' })
hi('@function', { link = 'Function' })
hi('@function.call', { link = 'Function' })
hi('@function.method', { link = 'Function' })
hi('@function.method.call', { link = 'Function' })
hi('@keyword', { link = 'Keyword' })
hi('@keyword.function', { link = 'Keyword' })
hi('@keyword.import', { link = 'Keyword' })
hi('@keyword.return', { link = 'Keyword' })
-- \`or\`, \`in\`, \`not\` — operators wearing a keyword's spelling.
hi('@keyword.operator', { link = 'Operator' })
hi('@type', { link = 'Type' })
hi('@type.definition', { link = 'Type' })
-- A constructor names the type it yields.
hi('@constructor', { link = 'Type' })
hi('@operator', { link = 'Operator' })
hi('@punctuation.delimiter', { link = 'Operator' })
hi('@punctuation.bracket', { link = 'Operator' })
hi('@punctuation.special', { link = 'Operator' })
hi('@tag.delimiter', { link = 'Operator' })

hi('@variable.parameter', { fg = ${sx('parameter')}, italic = true })
-- self / this — a keyword wearing a variable's spelling.
hi('@variable.builtin', { fg = ${sx('keyword')}, italic = true })
hi('@function.macro', { fg = ${sx('keyword')} })
hi('@module', { fg = ${sx('namespace')} })
-- @namespace is the pre-0.10 spelling of @module; both ship because a pinned
-- older parser set still emits it.
hi('@namespace', { fg = ${sx('namespace')} })
-- Neovim has no legacy Tag group to link to, so tag takes an explicit fg.
-- Attributes read as tag, the same call Helix and the tmTheme emitter make.
hi('@tag', { fg = ${sx('tag')} })
hi('@tag.attribute', { fg = ${sx('tag')} })
hi('@attribute', { fg = ${sx('tag')} })

-- ── Markup (markdown, docs) ──────────────────────────────────────────
hi('@markup.heading', { link = 'Title' })
hi('@markup.strong', { fg = ${t('fg')}, bold = true })
hi('@markup.italic', { fg = ${t('fg')}, italic = true })
hi('@markup.strikethrough', { strikethrough = true })
hi('@markup.raw', { link = 'String' })
hi('@markup.link.url', { fg = ${t('accent')}, underline = true })
hi('@markup.link.label', { fg = ${t('accent')} })
hi('@markup.quote', { fg = ${t('fgSecondary')}, italic = true })

-- ── Diagnostics ──────────────────────────────────────────────────────
-- info=cyan / hint=fgMuted follows Helix rather than VS Code's steel pair:
-- Neovim is a terminal editor on the same canvas, and cross-editor agreement
-- there is the point.
hi('DiagnosticError', { fg = ${t('urgent')} })
hi('DiagnosticWarn', { fg = ${t('attention')} })
hi('DiagnosticInfo', { fg = ${t('cyan')} })
hi('DiagnosticHint', { fg = ${t('fgMuted')} })
hi('DiagnosticOk', { fg = ${t('success')} })
-- An undercurl carries severity without recoloring the code underneath.
hi('DiagnosticUnderlineError', { undercurl = true, sp = ${t('urgent')} })
hi('DiagnosticUnderlineWarn', { undercurl = true, sp = ${t('attention')} })
hi('DiagnosticUnderlineInfo', { undercurl = true, sp = ${t('cyan')} })
hi('DiagnosticUnderlineHint', { undercurl = true, sp = ${t('fgMuted')} })
hi('DiagnosticUnderlineOk', { undercurl = true, sp = ${t('success')} })
hi('DiagnosticUnnecessary', { fg = ${t('fgDisabled')} })
-- The only place the \`invalid\` role lands besides Error.
hi('DiagnosticDeprecated', { fg = ${sx('invalid')}, strikethrough = true })

-- ── Diff ─────────────────────────────────────────────────────────────
-- Foreground, not the diffAddBg/diffDelBg line fills VS Code uses: on the
-- transparent default a painted line would be the only opaque band on the
-- canvas. Same call as Helix's diff.plus/minus/delta, and it is also what
-- gitsigns wants for gutter signs.
hi('DiffAdd', { fg = ${t('success')} })
hi('DiffChange', { fg = ${t('attention')} })
hi('DiffDelete', { fg = ${t('urgent')} })
hi('DiffText', { fg = ${t('urgentBright')}, bold = true })
hi('@diff.plus', { link = 'DiffAdd' })
hi('@diff.minus', { link = 'DiffDelete' })
hi('@diff.delta', { link = 'DiffChange' })

-- ── LSP semantic tokens ──────────────────────────────────────────────
-- Semantic tokens out-prioritize treesitter (125 vs 100), so a semantic-token
-- capable server repaints identifiers the @capture groups above already styled
-- — the "christmas tree". Clearing each override with an empty table hands the
-- decision back to treesitter, which is where $roles.syntax lives.
--
-- @lsp.type.* alone is not enough: servers also emit modifiers and typemods,
-- and those are separate groups with their own priority.
for _, group in ipairs({
  '@lsp.type.variable', '@lsp.type.parameter', '@lsp.type.property',
  '@lsp.type.function', '@lsp.type.method', '@lsp.type.namespace',
  '@lsp.type.class', '@lsp.type.enum', '@lsp.type.enumMember',
  '@lsp.type.type', '@lsp.type.typeParameter', '@lsp.type.keyword',
  '@lsp.type.comment', '@lsp.type.string', '@lsp.type.number',
  '@lsp.type.operator', '@lsp.type.macro', '@lsp.type.decorator',
  '@lsp.type.struct', '@lsp.type.interface',
  '@lsp.mod.readonly', '@lsp.mod.deprecated', '@lsp.mod.defaultLibrary',
  '@lsp.typemod.variable.defaultLibrary',
  '@lsp.typemod.function.defaultLibrary',
  '@lsp.typemod.variable.readonly',
}) do
  hi(group, {})
end

-- ── :terminal ANSI slots ─────────────────────────────────────────────
-- Slots 1-7 / 9-15 are Ghostty's semantic map verbatim, so a shell inside
-- Neovim matches the shell outside it. Slots 0 and 8 depend on the canvas,
-- which is exactly what the opaque flag changes:
--   transparent — the canvas IS Ghostty's terminalBg, so ADR 0001's lift
--                 applies and black comes from ansiBlack/ansiBrightBlack.
--   opaque      — the canvas is bg, the same substrate VS Code's integrated
--                 terminal paints, so VS Code's deferral applies instead.
if opaque then
  vim.g.terminal_color_0 = ${t('bg')}
  vim.g.terminal_color_8 = ${t('fgDisabled')}
else
  vim.g.terminal_color_0 = ${t('ansiBlack')}
  vim.g.terminal_color_8 = ${t('ansiBrightBlack')}
end

vim.g.terminal_color_1 = ${t('urgent')}
vim.g.terminal_color_2 = ${t('success')}
vim.g.terminal_color_3 = ${t('accent')}
-- Invariant: slots 4 and 12 must be a brightness pair on the same hue.
-- Markdown renderers emit bright-blue for inline code; sibling hues make it
-- render a visibly different color than the text around it. steelBright in 4
-- and steel in 12 is not a transposition: \`steel\` is the LIGHTER of the two
-- on dark (#b8cad4 vs #9fb6c4), because \`*Bright\` names a role, not a
-- lightness direction. Ghostty ships the same pairing.
vim.g.terminal_color_4 = ${t('steelBright')}
vim.g.terminal_color_5 = ${t('brandPurple')}
vim.g.terminal_color_6 = ${t('cyan')}
vim.g.terminal_color_7 = ${t('fg')}
vim.g.terminal_color_9 = ${t('urgentBright')}
vim.g.terminal_color_10 = ${t('successBright')}
vim.g.terminal_color_11 = ${t('accentBright')}
vim.g.terminal_color_12 = ${t('steel')}
vim.g.terminal_color_13 = ${t('brandPurpleBright')}
vim.g.terminal_color_14 = ${t('cyanBright')}
-- The one slot with no single token: ivory IS the light canvas, so bright
-- white has to flip to fg there or vanish (Ghostty makes the same flip).
vim.g.terminal_color_15 = vim.o.background == 'light' and ${t('fg')} or ${t('ivory')}
`;

  // Replacer FUNCTIONS, not strings: a string replacement interprets $&, $$ and
  // $1 as specials. The two guards above already make a `$` unreachable in a
  // token name or hex, so this is belt-and-braces — but it costs nothing and it
  // means loosening those regexes can never quietly resurrect the hazard.
  return body
    .replace('__DARK__', () => paletteBlock(D))
    .replace('__LIGHT__', () => paletteBlock(L));
};

write('neovim/colors/artificer.lua', neovimTheme());

// ─────────────────────────────────────────────────────────────────────
// bat / delta — legacy .tmTheme (XML plist), syntect's own theme format.
//
// syntect (the highlighting engine bat and delta both link) only reads the
// legacy TextMate .tmTheme plist, never the modern .sublime-color-scheme
// JSON docs/research/theming/sublime.md documents — there is no ST GUI on a
// build box to run "Convert Color Scheme", so this hand-emits the plist
// directly from the same syntaxToken() role layer every other editor target
// uses. Scope mapping mirrors sublime.md's table (comment→comment,
// string→string, keyword→keyword, type→storage.type + entity.name.type,
// function→entity.name.function + support.function, plus
// constant.numeric/variable/entity.name.tag), widened with the handful of
// scopes syntect's bundled grammars actually emit (keyword.operator,
// variable.parameter, variable.language, entity.name.namespace,
// entity.other.attribute-name, markup.*, invalid).
//
// Deliberately NO top-level "background" key in the global settings dict —
// the same choice Helix's non-opaque variant makes for ui.background (ADR
// 0038): omitting it lets bat/delta inherit whatever canvas the terminal
// already painted (Ghostty running the Artificer theme), rather than
// fighting it with a second, possibly-mismatched fill. bat's stock
// "base16"/"base16-256" themes reach the same terminal-following goal a
// different way — an #RRGGBBAA-encoded ANSI-index hack syntect special-cases
// — but that trades away per-role hues (everything renders in the terminal's
// flat ANSI palette). This theme keeps the real per-role Artificer colors
// (truecolor hex, like every other editor port) and only leaves the *fill*
// unset.
//
// "foreground" IS set (to fg), unlike background — syntect's highlighter
// falls back to pure black for any scope with no explicit match (plain
// text, most punctuation) when a theme carries no top-level foreground, which
// reads as invisible/wrong on a dark canvas. caret/selection/lineHighlight
// are unconditional overlays either way, independent of whether a base fill
// is painted underneath them.

// The same emitter serves a second consumer: the Codex CLI's TUI, which reads
// ~/.codex/themes/*.tmTheme and selects one by name from [tui] theme in
// ~/.codex/config.toml. Codex differs from bat/delta on exactly one axis —
// it paints its own pane rather than letting the terminal canvas show through
// — so it takes { paintBackground: true } and is otherwise byte-for-byte the
// same role mapping. Before this, ~/.codex/themes/artificer-dark.tmTheme was a
// hand-authored orphan in ~/.dotfiles whose header claimed it was generated
// from _palette.json while no generator for it existed; folding it in here
// makes that claim true and leaves install.sh the single owner of the file.

const batTheme = (mode, { paintBackground = false, consumer = 'bat/delta' } = {}) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Artificer Dark' : 'Artificer Light';

  // Every colour that reaches this plist goes through hex() first.
  //
  // _palette.json is NOT repo-authored — it is Lane 1's artifact, pulled over
  // DesignSync from an external claude.ai project (CLAUDE.md § Encapsulation).
  // Until this emitter, gum was the only target where a palette value landed
  // anywhere but a JSON.stringify() call, and its gumValue() guard carried the
  // whole invariant. A hand-templated XML plist breaks that: esc() below covers
  // the rule name and scope, which are repo-authored literals and can never
  // carry hostile content, while every colour slot interpolates raw. A value of
  // `#000</string><key>background</key><string>#f00` would inject plist
  // structure, and a bare `&` would emit malformed XML that install.sh's
  // `bat cache --build` then swallows — a silently dead theme, not a loud fail.
  //
  // check:themes structurally cannot catch this: it regenerates and diffs, so a
  // poisoned palette and its faithfully regenerated output both pass green. The
  // guard has to live at the emitter, exactly as gumValue() does.
  const hex = (value, what) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(value ?? '')) {
      throw new Error(
        `batTheme(${mode}): ${what} resolved to ${JSON.stringify(value)}, which is `
        + 'not a six-digit hex colour. Refusing to emit it into a theme plist.'
      );
    }
    return value;
  };

  // t()/sx() mirror helixTheme's: hasOwn, not `in` — `in` walks the prototype
  // chain, so `"constructor" in P` is true for any object and would interpolate
  // a stringified function body (full of < and &) into the XML.
  const t = (token) => {
    if (!Object.hasOwn(P, token)) throw new Error(`batTheme(${mode}): unknown palette token "${token}"`);
    return hex(P[token], `token "${token}"`);
  };
  const sx = (role) => t(syntaxToken(role));

  // XML-escape the handful of characters plist text nodes disallow bare.
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const rule = (name, scope, { foreground, background, fontStyle } = {}) => `\t\t<dict>
\t\t\t<key>name</key>
\t\t\t<string>${esc(name)}</string>
\t\t\t<key>scope</key>
\t\t\t<string>${esc(scope)}</string>
\t\t\t<key>settings</key>
\t\t\t<dict>${foreground ? `
\t\t\t\t<key>foreground</key>
\t\t\t\t<string>${foreground}</string>` : ''}${background ? `
\t\t\t\t<key>background</key>
\t\t\t\t<string>${background}</string>` : ''}${fontStyle ? `
\t\t\t\t<key>fontStyle</key>
\t\t\t\t<string>${fontStyle}</string>` : ''}
\t\t\t</dict>
\t\t</dict>`;

  const rules = [
    // punctuation.definition.comment is NOT a child of `comment` — TextMate
    // scope matching is prefix-based, so the alias is load-bearing, not noise.
    rule('Comment', 'comment, punctuation.definition.comment', { foreground: sx('comment'), fontStyle: 'italic' }),
    rule('String', 'string', { foreground: sx('string') }),
    rule('String Escape', 'constant.character.escape', { foreground: sx('constant') }),
    rule('Regexp', 'string.regexp', { foreground: sx('string') }),
    rule('Number', 'constant.numeric', { foreground: sx('constant') }),
    rule('Constant / Language', 'constant.language, constant.other, constant.character', { foreground: sx('constant') }),
    rule('Keyword', 'keyword', { foreground: sx('keyword') }),
    rule('Keyword · Operator', 'keyword.operator', { foreground: sx('operator') }),
    rule('Punctuation', 'punctuation, meta.brace, meta.delimiter', { foreground: sx('operator') }),
    rule('Storage', 'storage', { foreground: sx('keyword') }),
    rule('Storage · Type', 'storage.type', { foreground: sx('type') }),
    rule('Storage · Modifier', 'storage.modifier', { foreground: sx('keyword'), fontStyle: 'italic' }),
    // self/this reads as a keyword role (matches Helix's variable.builtin binding).
    rule('Variable · Language', 'variable.language', { foreground: sx('keyword'), fontStyle: 'italic' }),
    rule('Variable · Parameter', 'variable.parameter', { foreground: sx('parameter'), fontStyle: 'italic' }),
    rule('Variable', 'variable', { foreground: sx('variable') }),
    rule('Function / Support Function', 'entity.name.function, support.function, meta.function-call', { foreground: sx('function') }),
    rule('Type / Class', 'entity.name.type, entity.name.class, entity.name.interface, entity.name.enum, support.type, support.class', { foreground: sx('type') }),
    // Attributes route through the tag role, same call Helix's "attribute" binding makes.
    rule('Tag', 'entity.name.tag', { foreground: sx('tag') }),
    rule('Attribute Name', 'entity.other.attribute-name', { foreground: sx('tag') }),
    rule('Namespace', 'entity.name.namespace, entity.name.module, support.module, support.other.namespace', { foreground: sx('namespace') }),
    rule('Markup · Heading', 'markup.heading, entity.name.section', { foreground: t('accent'), fontStyle: 'bold' }),
    rule('Markup · Bold', 'markup.bold', { foreground: t('fg'), fontStyle: 'bold' }),
    rule('Markup · Italic', 'markup.italic', { foreground: t('fg'), fontStyle: 'italic' }),
    rule('Markup · Link', 'markup.link, markup.underline.link, string.other.link', { foreground: t('accent'), fontStyle: 'underline' }),
    rule('Markup · Raw', 'markup.raw, markup.inline.raw', { foreground: sx('string') }),
    rule('Markup · Quote', 'markup.quote', { foreground: t('fgSecondary'), fontStyle: 'italic' }),
    // The diff triple is why delta wants this theme at all — delta renders its
    // own +/- gutters, but the hunk bodies highlight through these scopes.
    rule('Markup · Inserted', 'markup.inserted', { foreground: t('success'), background: t('diffAddBg') }),
    rule('Markup · Deleted', 'markup.deleted', { foreground: t('urgent'), background: t('diffDelBg') }),
    rule('Markup · Changed', 'markup.changed', { foreground: t('attention') }),
    rule('Invalid', 'invalid', { foreground: sx('invalid') }),
    rule('Invalid · Deprecated', 'invalid.deprecated', { foreground: sx('invalid'), fontStyle: 'underline' }),
  ].join('\n');

  const backgroundNote = paintBackground
    ? `  Paints its own background: this variant targets a TUI pane that composites
  over the terminal rather than sharing its canvas, so the fill is explicit.`
    : `  No top-level background override: this theme inherits the terminal's own
  canvas (Ghostty running Artificer already) instead of painting over it.
  foreground IS set, so unscoped text and punctuation render in Artificer fg
  rather than syntect's black fallback.`;

  // XML comments forbid a literal double hyphen anywhere in their body (not
  // just "-->"), so the header below is written without one — no CLI flags
  // spelled out inline. Install steps live in themes/README.md instead.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<!--
  ${title}: ${consumer} syntax theme (syntect .tmTheme).
  Generated from themes/_palette.json; edit there and re-run node themes/build.mjs.
  Install steps and the delta wiring live in themes/README.md.

${backgroundNote}
-->
<plist version="1.0">
<dict>
\t<key>name</key>
\t<string>${title}</string>
\t<key>settings</key>
\t<array>
\t\t<dict>
\t\t\t<key>settings</key>
\t\t\t<dict>
\t\t\t\t<key>foreground</key>
\t\t\t\t<string>${t('fg')}</string>${paintBackground ? `
\t\t\t\t<key>background</key>
\t\t\t\t<string>${t('bgRaised')}</string>` : ''}
\t\t\t\t<key>caret</key>
\t\t\t\t<string>${t('accent')}</string>
\t\t\t\t<key>selection</key>
\t\t\t\t<string>${t('selectionFill')}</string>
\t\t\t\t<key>lineHighlight</key>
\t\t\t\t<string>${t('bgRaised')}</string>
\t\t\t\t<key>invisibles</key>
\t\t\t\t<string>${t('fgDisabled')}</string>
\t\t\t\t<key>gutterForeground</key>
\t\t\t\t<string>${t('fgDisabled')}</string>
\t\t\t\t<key>findHighlight</key>
\t\t\t\t<string>${t('attentionFill')}</string>
\t\t\t\t<key>findHighlightForeground</key>
\t\t\t\t<string>${t(mode === 'dark' ? 'ink' : 'ivory')}</string>
\t\t\t</dict>
\t\t</dict>
${rules}
\t</array>
\t<key>uuid</key>
\t<!-- The suffix names the VARIANT, not the filename: "opaque" is this repo's
\t     established word for a painted-background twin (see helix/*-opaque.toml).
\t     Codex's file is artificer-dark.tmTheme, so the two do not match on
\t     purpose; a tmTheme uuid identifies the theme, and these are two. -->
\t<string>artificer-${mode}${paintBackground ? '-opaque' : ''}-tmtheme-v1</string>
</dict>
</plist>
`;
};

write('bat/artificer-dark.tmTheme',  batTheme('dark'));
write('bat/artificer-light.tmTheme', batTheme('light'));

write('codex/artificer-dark.tmTheme',  batTheme('dark',  { paintBackground: true, consumer: 'Codex CLI TUI' }));
write('codex/artificer-light.tmTheme', batTheme('light', { paintBackground: true, consumer: 'Codex CLI TUI' }));

// ─────────────────────────────────────────────────────────────────────
// tmux — styles-only fragment, source-file from tmux.conf
// ─────────────────────────────────────────────────────────────────────

const tmuxTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Artificer Dark' : 'Artificer Light';
  return `# ${title} — tmux styles
# Drop in: ~/.config/tmux/artificer-${mode}.conf
# Then in tmux.conf:  source-file ~/.config/tmux/artificer-${mode}.conf
#
# Hybrid color strategy: ANSI colour13 for accents (routes through
# Ghostty's loaded palette → brandPurpleBright), hex for design-system
# greys not present in the ANSI 16.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.

set -g status-style "bg=${P.terminalBg},fg=${P.fg}"
set -g status-left-style "fg=colour13,bold"
set -g status-right-style "fg=${P.fgSecondary}"

setw -g window-status-style "fg=${P.fgSecondary}"
setw -g window-status-current-style "fg=colour13,bold"

set -g pane-border-style "fg=${P.border}"
set -g pane-active-border-style "fg=colour13"

set -g message-style "bg=${P.terminalBg},fg=colour13,bold"
`;
};

write('tmux/artificer-dark.conf',  tmuxTheme('dark'));
write('tmux/artificer-light.conf', tmuxTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// gitmux — full YAML drop-in, mode-independent (styles route through ANSI)
// ─────────────────────────────────────────────────────────────────────

const gitmuxTheme = () => `# Artificer v${version} · gitmux config
# Symlink in: ~/.config/tmux/gitmux.yml
#
# Mode-independent: state colors route through ANSI names (red/green/...)
# which Ghostty resolves to the active Artificer palette. Brand accent
# uses colour13 → brandPurpleBright. No hex anywhere; no rebuild needed
# when the palette mutates.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.

tmux:
  symbols:
    branch: " "
    hashprefix: ":"
    ahead: "↑"
    behind: "↓"
    staged: "+"
    conflict: "!"
    modified: "~"
    untracked: "?"
    stashed: "*"
    clean: ""
  styles:
    clear: "#[fg=default]"
    state: "#[fg=red,bold]"
    branch: "#[fg=colour13,bold]"
    remote: "#[fg=cyan]"
    divergence: "#[fg=green]"
    staged: "#[fg=default]"
    conflict: "#[fg=red]"
    modified: "#[fg=yellow]"
    untracked: "#[fg=default]"
    stashed: "#[fg=blue]"
    clean: "#[fg=green]"
  layout: [branch, divergence, " ", flags]
  options:
    branch_max_len: 20
    branch_trim: right
    ellipsis: "…"
`;

write('gitmux/artificer.yml', gitmuxTheme());

// ─────────────────────────────────────────────────────────────────────
// cmux — workspaceColors partial, flat single values (graphical tab swatches)
// ─────────────────────────────────────────────────────────────────────
//
// cmux (Manaflow's native macOS agent terminal) reads ~/.config/cmux/cmux.json.
// Its TERMINAL is libghostty, which resolves Ghostty themes BY NAME — so the
// terminal PANE background is carried by our Ghostty theme (themes/ghostty/
// artificer-*), and now sits at terminalBg (ADR 0036).
//
// The SIDEBAR is NOT. Corrected 2026-07-12 by pixel-sampling a live cmux window:
// the pane read #313540 (our theme) while the sidebar read #25272A — cmux's own
// chrome, tracking neither our bg nor our Ghostty theme. The prior claim here
// (sidebar carried by the Ghostty theme) and its companion (cmux's default dark
// sidebar is "~#292c33") were BOTH false; the swatch ratios below had been measured
// against a background cmux never painted.
//
// So we PIN it: sidebarAppearance below sets the sidebar to bg (#292c33) — the
// SUBSTRATE. That is the elevation model made literal, and it is the whole point of
// ADR 0036: cmux chrome is the desktop, the terminal pane is raised on it, the
// Claude Code message chip is raised on that. It also makes the "~#292c33" the swatch
// math has always assumed true for the first time.
//
// tintOpacity: 1 is LOAD-BEARING. It defaults to 0.03 — darkModeTintColor is a tint
// composited over cmux's chrome, not a fill, so at the default NO color you set lands.
//
// cmux workspaceColors has NO per-mode variant (unlike sidebarAppearance's
// lightMode/darkMode tint) — colors/selectionColor/notificationBadgeColor are flat
// single hexes. So one value set serves both appearances; we tune for the pinned dark
// sidebar (#292c33), Artificer being dark-first.
//
// Swatches are the categorical series-1..5 (accent/steel/brandPurple/success/
// attention) — the canonical mutually-distinguishable theme scale. Measured vs the
// real ghostty backgrounds (scripts/contrast.mjs, non-text 1.4.11 floor 3:1): all
// five clear on the dark sidebar; on a cream sidebar the lighter ones (gold 1.55,
// steel 1.41, rose 2.58) recede toward the bg — a soft degradation (a text label
// co-identifies the workspace, and the user assigns the swatch). Only purple
// (3.60/3.24) and sage (3.39/3.45) clear both. We keep the canonical series rather
// than swap hues — that would break series-1..5 or import off-palette (Hard rule #1).
//
// selectionColor = steel: the active-workspace row fill. cmux derives the selected
// row's TEXT from the fill luminance, so the cool light steel flips the title to ink
// (white-on-steel 1.69 < cmux's 2.75 threshold → auto ink, 9.30:1 crisp). Steel is
// the calmest swatch — a desaturated cool neutral that recedes rather than grabs,
// where warm gold and the lifted purple both read too loud as a full-row fill
// (owner call). Like the swatches it is dark-tuned: 8.28 visible on the default
// dark sidebar, receding to 1.41 on a cream one (the left rail + text label still
// mark the active row). notificationBadgeColor = urgentBright, not urgent: bare
// urgent (#a04540) is 2.28:1 on the DEFAULT dark sidebar (fails 3:1); urgentBright
// (#b85a55) clears both (3.08/3.79).
//
// One surface stays stock: cmux's sidebar/app accent (the blue "needs input" links)
// is HARDCODED (SidebarAppearanceSupport.swift cmuxAccentNSColor → rgb(0,145,255)),
// unreachable by config or the Ghostty theme — same tier-3 fork concern as the
// diff-viewer accent (#239).
//
// `colors` is cmux's canonical key — its own settings template writes this exact
// shape — so the picker becomes Artificer-only. Strict JSON (no JSONC banner) so
// `jq .` validates it, same as the claude-code/vscode targets. Provenance lives
// here + themes/README.md. Generated from themes/_palette.json — re-run build.mjs.

const cmuxConfig = () => JSON.stringify({
  $schema: 'https://raw.githubusercontent.com/manaflow-ai/cmux/main/web/data/cmux.schema.json',
  sidebarAppearance: {
    matchTerminalBackground: false, // the sidebar is app chrome, NOT the terminal canvas (ADR 0036)
    darkModeTintColor: D.bg,        // #292c33 — the substrate the terminal is raised on
    tintOpacity: 1                  // REQUIRED: defaults to 0.03 (a tint, not a fill) — no color lands without it
  },
  workspaceColors: {
    indicatorStyle: 'leftRail',
    selectionColor: D.steel,                // active-row fill; calm cool neutral, cmux auto-renders ink text (9.30); owner override
    notificationBadgeColor: D.urgentBright, // 3.08/3.79 on both; bare urgent is 2.28 on the default dark sidebar
    colors: {                               // categorical series-1..5 — dark-tuned (see header); a label co-identifies
      'Artificer Gold':   D.accent,         // series-1
      'Artificer Steel':  D.steel,          // series-2
      'Artificer Purple': D.brandPurple,    // series-3
      'Artificer Sage':   D.success,        // series-4
      'Artificer Rose':   D.attention       // series-5
    }
  }
}, null, 2) + '\n';

write('cmux/cmux.json', cmuxConfig());

// ─────────────────────────────────────────────────────────────────────
// lazygit — gui.theme: block fragment (paste into config.yml or template)
// ─────────────────────────────────────────────────────────────────────

const lazygitTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Dark' : 'Light';
  return `# Artificer v${version} · ${title} — lazygit theme block
# lazygit has no @import mechanism. Two install paths:
#
#   1. Paste this block under \`gui:\` in your ~/.config/lazygit/config.yml
#   2. Splice in via chezmoi templating — see themes/README.md
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.

theme:
  activeBorderColor:
    - "${P.brandPurpleBright}"
    - bold
  inactiveBorderColor:
    - "${P.fgDisabled}"
  searchingActiveBorderColor:
    - "${P.accent}"
    - bold
  optionsTextColor:
    - "${P.brandPurpleBright}"
  selectedLineBgColor:
    - "${P.bgOverlay}"
  cherryPickedCommitBgColor:
    - "${P.diffAddBg}"
  cherryPickedCommitFgColor:
    - "${P.success}"
  unstagedChangesColor:
    - "${P.urgent}"
  defaultFgColor:
    - "${P.fgSecondary}"
`;
};

write('lazygit/artificer-dark.yml',  lazygitTheme('dark'));
write('lazygit/artificer-light.yml', lazygitTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// gh-dash — theme.colors: block fragment
// ─────────────────────────────────────────────────────────────────────

const ghDashTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Dark' : 'Light';
  return `# Artificer v${version} · ${title} — gh-dash theme block
# gh-dash has no @import mechanism. Two install paths:
#
#   1. Paste this block under \`theme:\` in your ~/.config/gh-dash/config.yml
#   2. Splice in via chezmoi templating — see themes/README.md
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.

colors:
  text:
    primary:   "${P.fgSecondary}"
    secondary: "${P.fgDisabled}"
    inverted:  "${P.bg}"
    faint:     "${P.fgDisabled}"
    warning:   "${P.accent}"
    success:   "${P.success}"
  background:
    selected:  "${P.bgOverlay}"
  border:
    primary:   "${P.border}"
    secondary: "${P.borderLifted}"
    faint:     "${P.bgInactive}"
`;
};

write('gh-dash/artificer-dark.yml',  ghDashTheme('dark'));
write('gh-dash/artificer-light.yml', ghDashTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// herdr — [theme] + [theme.custom] block fragment
// ─────────────────────────────────────────────────────────────────────
//
// herdr (herdrdev/herdr, Apache-2.0) is a Rust agent multiplexer whose UI theme
// lives in ~/.config/herdr/config.toml. It has NO external theme-file mechanism:
// `[theme] name` only accepts a list of theme names compiled into the binary,
// and there is no ~/.config/herdr/themes/ lookup (verified against the 0.7.5
// binary — no such path constant exists). Custom color therefore has exactly one
// door, `[theme.custom]`, which sits inside the user's own config alongside
// their keybindings and UI layout. That makes herdr a CATEGORY-3 target: the
// fragment is pasted or spliced, never symlinked, because a whole-file install
// would clobber the rest of the user's config. Same disposition as cmux,
// lazygit, and gh-dash — install recipes in themes/README.md. (This file is
// exported publicly, so it points at the exported README rather than the
// workshop-only research doc that carries the underlying ruling.)
//
// The token set is herdr's CustomThemeColors struct — 18 of its 19 fields, in
// the binary's own declaration order. `sidebar_bg` is deliberately left unset so
// the sidebar keeps inheriting whatever substrate the user's terminal or base
// preset supplies. Overriding the rest means the base `name`
// only governs surfaces herdr does not expose; we still pin it to the
// Catppuccin pair because these token names ARE Catppuccin's palette roles
// (surface0/1, overlay0/1, subtext0, mauve/peach), so any unexposed internal
// resolves against the flavor the naming was lifted from.
//
// That naming is load-bearing for the mapping, and it is where the obvious
// reading goes wrong: `overlay0`/`overlay1` look like border tokens but are
// Catppuccin's DIM TEXT roles (comments, inactive labels). Mapping them to
// --border (1.71:1) would have put unreadable text on the panel; they map to
// the foreground dim ladder instead. Ratios below are vs panel_bg, computed
// with scripts/contrast.mjs — dark first, light second.
//
// Every one of the seven named hues clears text-AA (4.5:1) in BOTH modes, which
// is why no entry needs a per-mode ternary. Two documented exceptions, both
// deliberate and both consistent with the rest of the system:
//   · overlay0 = fgDisabled (2.43 / 4.80) — the disabled tier, exempt under
//     WCAG 1.4.3's inactive-control carve-out, same as everywhere else.
//   · overlay1 = fgMuted (3.05 / 3.83) — the muted meta/comment role, above the
//     3:1 graphical floor and below text-AA by design.
// Two more are worth naming so a future reader does not "fix" them. First,
// `accent` and `yellow` resolve to the SAME token. Artificer's accent IS gold,
// so herdr's navigation accent and its yellow state marker legitimately
// coincide; forcing them apart would mean importing an off-palette hue
// (Hard rule #1). Second, `active_row_bg` and `surface1` both resolve to
// `bgOverlay`. herdr's focused row and its generic selected row are the same
// elevation in the ADR 0036 ladder, and only one is ever visible at a time —
// `surface1` marks a selected row in a list, `active_row_bg` the focused pane's
// sidebar row. Splitting them would spend a distinct rung on a distinction the
// user never sees side by side.
//
// Surfaces do not carry the text ratios, so they are listed without one: the
// bg → bgRaised → bgOverlay ladder is the ADR 0036 elevation model, with
// panel_bg on the substrate exactly as the cmux sidebar is pinned above.
//
// Generated from themes/_palette.json — edit there + re-run build.mjs.

// [herdrKey, paletteToken, note]. One table, so the emitted file and the ratio
// commentary above cannot drift apart. Order mirrors CustomThemeColors.
const HERDR_TOKENS = [
  ['accent',        'accent',            'highlights, borders, navigation UI'],
  ['panel_bg',      'bg',                'the substrate (ADR 0036)'],
  ['active_row_bg', 'bgOverlay',         'focused agent / active workspace row — same token as surface1'],
  ['selection_bg',  'bgFloat',           'Navigate-mode cursor row'],
  ['surface0',      'bgRaised',          'raised panel'],
  ['surface1',      'bgOverlay',         'selected row — same token as active_row_bg'],
  ['surface_dim',   'bgInactive',        'unfocused pane'],
  ['overlay0',      'fgDisabled',        'dim text — disabled tier (2.43 / 4.80)'],
  ['overlay1',      'fgMuted',           'muted meta/comment (3.05 / 3.83)'],
  ['text',          'fg',                '11.21 / 13.13'],
  ['subtext0',      'fgSecondary',       '8.29 / 8.63'],
  ['mauve',         'brandPurpleBright', '5.47 / 6.83'],
  ['green',         'successBright',     '4.50 / 4.86'],
  ['yellow',        'accent',            '7.55 / 5.33 — same token as accent; Artificer accent IS gold'],
  ['red',           'urgentText',        '6.98 / 7.49 — the text-tier red; bare urgent is 2.28 on dark'],
  ['blue',          'steel',             '8.28 / 7.83'],
  ['teal',          'cyan',              '5.23 / 5.10'],
  ['peach',         'attentionAlt',      '5.49 / 5.25'],
];

// Alignment is a property of the table, not of the mode — derive it once here
// rather than recomputing the same value inside every herdrTheme() call.
const HERDR_KEY_PAD = Math.max(...HERDR_TOKENS.map(([key]) => key.length));

const herdrTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Dark' : 'Light';
  const base = mode === 'dark' ? 'catppuccin' : 'catppuccin-latte';

  const rows = HERDR_TOKENS.map(([key, token, note]) => {
    // Fail fast on a renamed palette token: emitting `key = "undefined"` would
    // sail through the build and only surface as a herdr config parse error.
    if (!Object.hasOwn(P, token)) {
      throw new Error(`herdrTheme(${mode}): unknown palette token "${token}" for "${key}"`);
    }
    return `${key.padEnd(HERDR_KEY_PAD)} = "${P[token]}"  # ${token} — ${note}`;
  }).join('\n');

  return `# Artificer v${version} · ${title} — herdr theme block
# herdr has no external theme-file mechanism; [theme.custom] lives inside your
# own ~/.config/herdr/config.toml. Two install paths:
#
#   1. Paste these two tables into ~/.config/herdr/config.toml,
#      then: herdr server reload-config
#   2. Splice in via chezmoi templating — see themes/README.md
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.

[theme]
# Base only governs surfaces herdr does not expose; [theme.custom] below
# overrides 18 of the 19 CustomThemeColors fields (sidebar_bg is left unset).
name = "${base}"

[theme.custom]
${rows}
`;
};

write('herdr/artificer-dark.toml',  herdrTheme('dark'));
write('herdr/artificer-light.toml', herdrTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// glamour — strict JSON stylesheet, consumed by glow (and anything else
// built on glamour: gh's markdown rendering, mods, …)
// ─────────────────────────────────────────────────────────────────────
//
// Shape is glamour v1's ansi.StyleConfig serialization — snake_case keys,
// mirroring styles/dark.json in charmbracelet/glamour v1.0.0. NOT v2
// (charm.land/glamour/v2): glow 2.1.2 links v1, and the two disagree.
// Unrecognized keys are silently ignored, so this file cannot be validated by
// reading it — render a fixture and inspect the escape sequences. Piping glow
// to a file proves nothing: glamour switches to its `notty` style off a tty and
// strips all color, which reads as a dead theme. Use `script -q /dev/null`.
//
// The SHAPE is upstream's; the STRUCTURE is ours. Three things no style file can
// reach — code-block syntax quantized to 256 colors, no paintable block canvas,
// no table color — are recorded in themes/README.md § glow. Read that before
// re-chasing any of them from a palette pass. Note the first is GLOW's gap, not
// glamour's: glamour ships WithChromaFormatter and glow never calls it.

const glamourTheme = (mode) => {
  const P = mode === 'dark' ? D : L;

  // The plate behind INLINE `code` — the fenced block ships unpainted
  // (ceiling 2 below), so inline code is the sole consumer and the lift below
  // is load-bearing for it, not vestigial. Dark's bgRaised IS terminalBg (both
  // #313540, ADR 0036), so a plate painted at bgRaised sits at 1.00:1 against
  // its own background and vanishes — the same trap the Claude Code message
  // chip works around above, fixed the same way: lift a rung. Light inverts
  // elevation (bgRaised is darker than bg) and needs no lift.
  const codeBg = mode === 'dark' ? P.bgOverlay : P.bgRaised;

  // $roles.syntax is mode-independent; resolve the token per mode.
  const syn = (role) => P[syntaxToken(role)];

  return {
    // document is the inheritance root — every unmapped element falls back to
    // it. It MUST be full-strength fg: fgMuted here (2.68:1 on terminalBg,
    // below the 3.0 hard floor) would bleed a sub-floor color system-wide.
    document: { block_prefix: '\n', block_suffix: '\n', color: P.fg, margin: 2 },

    block_quote: { color: P.fgSecondary, indent: 1, indent_token: '│ ' },
    paragraph: {},
    list: { level_indent: 2 },

    heading: { block_suffix: '\n', color: P.accent, bold: true },
    // Inverts correctly in both modes without a ternary: dark accent is light
    // brass over a dark bg, light accent is dark brown over a cream bg.
    h1: { prefix: ' ', suffix: ' ', color: P.bg, background_color: P.accent, bold: true },
    // Depth reads as a graded glyph run rather than the literal '## '/'### '
    // prefixes stock dark.json ships. glamour gives h3–h5 the same inherited
    // style, so without a glyph the three levels are indistinguishable; the
    // bar run also echoes h1's gold plate instead of leaking markdown syntax
    // into rendered output.
    h2: { prefix: '▌ ', color: P.accentBright },
    h3: { prefix: '▎ ' },
    h4: { prefix: '▏ ' },
    h5: { prefix: '· ' },
    h6: { prefix: '· ', color: P.fgSecondary, bold: false },

    text: {},
    strikethrough: { crossed_out: true },
    // Format-only, deliberately uncolored. $notes.attentionNotTextRole (ADR
    // 0015): attention is a fill/border/dot hue, never a body-text color —
    // and upstream glamour leaves both uncolored too, so this is also parity.
    emph: { italic: true },
    strong: { bold: true },

    // Box-drawing rule instead of stock's ASCII '--------'. glamour's `format`
    // is a text/template over {{.text}} with no width variable exposed, so the
    // run is a fixed literal and will wrap below ~76 columns. Accepted
    // knowingly: ~/.config/glow/glow.yml pins width 100.
    hr: { color: P.border, format: `\n${'─'.repeat(72)}\n` },
    item: { block_prefix: '• ' },
    enumeration: { block_prefix: '. ' },
    task: { ticked: '[✓] ', unticked: '[ ] ' },

    link: { color: P.cyan, underline: true },
    link_text: { color: P.accentBright, bold: true },
    image: { color: P.brandPurpleBright, underline: true },
    image_text: { color: P.fgSecondary, format: 'Image: {{.text}} →' },

    code: { prefix: ' ', suffix: ' ', color: syn('string'), background_color: codeBg },

    code_block: {
      color: P.fg,
      margin: 2,
      // Bound to $roles.syntax — the same bindings claude-code and vscode
      // consume, so a palette retune moves all three together. glamour's
      // chroma vocabulary is finer than the 12 roles, so several tokens share
      // a role rather than introducing colors the palette hasn't ratified.
      chroma: {
        text:                  { color: syn('variable') },
        error:                 { color: syn('invalid') },
        comment:               { color: syn('comment') },
        comment_preproc:       { color: syn('keyword') },
        keyword:               { color: syn('keyword') },
        keyword_reserved:      { color: syn('keyword') },
        keyword_namespace:     { color: syn('namespace') },
        keyword_type:          { color: syn('type') },
        operator:              { color: syn('operator') },
        punctuation:           { color: syn('operator') },
        name:                  { color: syn('variable') },
        name_builtin:          { color: syn('function') },
        name_tag:              { color: syn('tag') },
        name_attribute:        { color: syn('parameter') },
        name_class:            { color: syn('type'), bold: true },
        name_constant:         { color: syn('constant') },
        name_decorator:        { color: syn('function') },
        name_exception:        { color: syn('invalid') },
        name_function:         { color: syn('function') },
        name_other:            { color: syn('variable') },
        literal:               { color: syn('constant') },
        literal_number:        { color: syn('constant') },
        literal_date:          { color: syn('constant') },
        literal_string:        { color: syn('string') },
        literal_string_escape: { color: syn('constant') },
        generic_deleted:       { color: P.diffDelWord },
        generic_inserted:      { color: P.diffAddWord },
        generic_emph:          { italic: true },
        generic_strong:        { bold: true },
        generic_subheading:    { color: P.fgSecondary },
        // NO canvas entry — and be precise about why, because an earlier
        // comment here got it wrong in the other direction. glamour DOES read
        // the key: codeblock.go wires `Chroma.Background` through chromaStyle
        // into a `bg:<hex>` on chroma's Background token. It dead-ends one
        // layer down — chroma's terminal256 formatter paints per token, and
        // nothing carries that token's bg onto the block's whitespace, so a
        // pty render emits zero `48;` sequences. The block ships unpainted on
        // purpose; derivation in themes/README.md § glow, ceiling 2.
      },
    },

    // Glyphs only — table color is UNREACHABLE in glamour v1 (themes/README.md
    // § glow, ceiling 3). These match what `table: {}` inherited, so the render
    // is unchanged; setting them makes the glyphs a ratified decision rather
    // than an upstream default. All three MUST stay set together: setBorders
    // dereferences CenterSeparator unguarded once the other two are present.
    table: { center_separator: '┼', column_separator: '│', row_separator: '─' },
    definition_list: {},
    definition_term: {},
    definition_description: { block_prefix: '\n→ ' },
    html_block: {},
    html_span: {},
  };
};

write('glamour/artificer-dark.json',  JSON.stringify(glamourTheme('dark'),  null, 2) + '\n');
write('glamour/artificer-light.json', JSON.stringify(glamourTheme('light'), null, 2) + '\n');

// ─────────────────────────────────────────────────────────────────────
// gum — sourceable export fragment (gum has no config file)
// ─────────────────────────────────────────────────────────────────────
//
// charmbracelet/gum#991 tracks a config file; until it lands, upstream's own
// documented answer is a shell file of GUM_* exports. So this fragment is the
// supported path, not a workaround we invented.
//
// Var names are GUM_<COMMAND>_<GROUP>_<PROPERTY> — gum's dotted style flags
// expand to two segments (--prompt.foreground → GUM_CONFIRM_PROMPT_FOREGROUND).
// They are LITERALS here, transcribed from `gum <cmd> --help`. build.mjs must
// never shell out to gum: check-themes.mjs re-runs this generator inside a
// temp tree with no guarantee gum is on PATH, and a nondeterministic generator
// cannot be drift-gated.
//
// Deliberately NOT version-stamped. gitmux/lazygit/gh-dash stamp a version
// header; a stamped file inside check-themes' TARGETS would red-light the gate
// on every package.json bump, which no current TARGETS member does.

// [group, foreground token, background token]. '' means "leave unset" — the
// terminal default shows through, which is what you want everywhere except a
// deliberate highlight (cursor, selection, search match).
const GUM_GROUPS = {
  choose:  [['CURSOR', 'accent', ''], ['HEADER', 'fgSecondary', ''],
            ['ITEM', 'fg', ''], ['SELECTED', 'accentBright', '']],
  confirm: [['PROMPT', 'fg', ''], ['SELECTED', 'bg', 'accent'],
            ['UNSELECTED', 'fgSecondary', '']],
  file:    [['CURSOR', 'accent', ''], ['DIRECTORY', 'cyan', ''],
            ['FILE', 'fg', ''], ['FILE_SIZE', 'fgMuted', ''],
            ['HEADER', 'fgSecondary', ''], ['PERMISSIONS', 'fgMuted', ''],
            ['SELECTED', 'accentBright', ''], ['SYMLINK', 'brandPurpleBright', '']],
  filter:  [['CURSOR_TEXT', 'accent', ''], ['HEADER', 'fgSecondary', ''],
            ['INDICATOR', 'accent', ''], ['MATCH', 'accentBright', ''],
            ['PLACEHOLDER', 'fgMuted', ''], ['PROMPT', 'accent', ''],
            ['SELECTED_PREFIX', 'accent', ''], ['TEXT', 'fg', ''],
            ['UNSELECTED_PREFIX', 'fgMuted', '']],
  input:   [['CURSOR', 'accent', ''], ['HEADER', 'fgSecondary', ''],
            ['PLACEHOLDER', 'fgMuted', ''], ['PROMPT', 'accent', '']],
  log:     [['KEY', 'accentBright', ''], ['LEVEL', 'attention', ''],
            ['MESSAGE', 'fg', ''], ['PREFIX', 'fgSecondary', ''],
            ['SEPARATOR', 'fgMuted', ''], ['TIME', 'fgMuted', ''],
            ['VALUE', 'fg', '']],
  pager:   [['', 'fg', ''], ['HELP', 'fgMuted', ''],
            ['LINE_NUMBER', 'fgMuted', ''], ['MATCH', 'accentBright', ''],
            ['MATCH_HIGH', 'bg', 'accent']],
  spin:    [['SPINNER', 'accent', ''], ['TITLE', 'fg', '']],
  table:   [['BORDER', 'border', ''], ['CELL', 'fg', ''],
            ['HEADER', 'accentBright', ''], ['SELECTED', 'bg', 'accent']],
  write:   [['BASE', 'fg', ''], ['CURSOR', 'accent', ''],
            ['CURSOR_LINE', 'fg', ''], ['CURSOR_LINE_NUMBER', 'accent', ''],
            ['END_OF_BUFFER', 'fgMuted', ''], ['HEADER', 'fgSecondary', ''],
            ['LINE_NUMBER', 'fgMuted', ''], ['PLACEHOLDER', 'fgMuted', ''],
            ['PROMPT', 'accent', '']],
};

const gumTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Dark' : 'Light';
  const lines = [];

  for (const [cmd, groups] of Object.entries(GUM_GROUPS)) {
    lines.push(`# gum ${cmd}`);
    for (const [group, fgTok, bgTok] of groups) {
      // pager's top-level style has no group segment: GUM_PAGER_FOREGROUND.
      const stem = group ? `GUM_${cmd.toUpperCase()}_${group}` : `GUM_${cmd.toUpperCase()}`;
      lines.push(`export ${stem}_FOREGROUND="${shellHexValue(fgTok, `${stem}_FOREGROUND`, P, 'gumTheme')}"`);
      lines.push(`export ${stem}_BACKGROUND="${shellHexValue(bgTok, `${stem}_BACKGROUND`, P, 'gumTheme')}"`);
    }
    lines.push('');
  }

  return assertInertFragment(`# Artificer · ${title} — gum style environment
# gum has no config file (charmbracelet/gum#991). Source this fragment from a
# shell rc, or from a script that calls gum outside an interactive shell.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.
# Every value is a hex; gum needs a truecolor-capable terminal to render them
# exactly, and degrades to the nearest 256 colour otherwise.

${lines.join('\n')}`, 'gumTheme');
};

write('gum/artificer-dark.sh',  gumTheme('dark'));
write('gum/artificer-light.sh', gumTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// fzf — a --color= string, sourced from a shell rc
// ─────────────────────────────────────────────────────────────────────
//
// Lands in ~/.zshrc (interactive shells only), NOT ~/.zshenv like gum. Same
// guard either way — see themes/_shell-guard.mjs on why blast radius does not
// get to relax the grammar.
//
// The fragment exports ARTIFICER_FZF_COLORS — the --color= string ALONE — and
// the rc composes the rest:
//
//   FZF_DEFAULT_OPTS="$ARTIFICER_FZF_COLORS${TMUX:+ --tmux 80%}"
//
// Exporting FZF_DEFAULT_OPTS from here instead would race the rc's own
// assignment and silently drop either the colours or --tmux, depending on
// source order. The fragment owns the colours; the rc owns the options.
//
// fzf is a SECOND INTERPRETER behind the shell, which is the part that is easy
// to miss. It re-parses FZF_DEFAULT_OPTS and honours --preview, --bind
// …execute(…), --listen and --history out of it — so a hex-clean, grammatically
// perfect export line can still be a command-execution vector at fzf runtime,
// after the shell has already blessed it. Two invariants, not a division of
// labour: the value is asserted against an anchored --color= grammar (no space,
// so no second flag can ride along), and the fragment ASSIGNS, never composes
// (`export X="$X …"` would let an attacker-controlled prefix survive an
// assertion that only saw the suffix).
//
// No `bg:` slot. The terminal canvas shows through — the same call yazi's rule
// 2 and bat's theme make (ADR 0036: a terminal is a raised surface, and
// repainting it punches a visible hole).

const FZF_SLOTS = [
  // [fzf slot, token, what it is]
  ['fg',      'fg',                'unselected row text'],
  ['fg+',     'fg',                'selected row text — the bar carries the signal, not a text hue'],
  ['bg+',     'bgOverlay',         'the selected row bar'],
  ['hl',      'accent',            'matched substring'],
  ['hl+',     'accentBright',      'matched substring on the selected row'],
  ['pointer', 'accent',            'the ▌ cursor'],
  ['marker',  'success',           'multi-select mark'],
  ['prompt',  'brandPurpleBright', 'the > prompt'],
  ['info',    'fgMuted',           'the match counter'],
  ['border',  'border',            'quiet chrome, never gold'],
  ['spinner', 'accent',            'the loading spinner'],
  ['header',  'cyan',              'header lines'],
];

const fzfTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Dark' : 'Light';

  const pairs = FZF_SLOTS.map(([slot, token]) =>
    `${slot}:${shellHexValue(token, `fzf --color ${slot}`, P, 'fzfTheme')}`);
  const value = `--color=${pairs.join(',')}`;

  // Grammar imported, not re-typed — a security control copied into two places
  // drifts, which is the whole reason _shell-guard.mjs exists.
  if (!FZF_COLOR_GRAMMAR.test(value)) {
    throw new Error(
      `fzfTheme: assembled value is not a bare --color= list: ${JSON.stringify(value)}`
    );
  }

  return assertInertFragment(`# Artificer · ${title} — fzf colours
# Source this from ~/.zshrc, then COMPOSE the options around it:
#
#   FZF_DEFAULT_OPTS="$ARTIFICER_FZF_COLORS\${TMUX:+ --tmux 80%}"
#
# This fragment exports the colours only. Exporting FZF_DEFAULT_OPTS here would
# race your own assignment and drop one side or the other.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.
# No bg: slot, so the terminal canvas shows through (ADR 0036).

export ARTIFICER_FZF_COLORS="${value}"`, 'fzfTheme');
};

write('fzf/artificer-dark.sh',  fzfTheme('dark'));
write('fzf/artificer-light.sh', fzfTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// eza — EZA_COLORS, which is LS_COLORS grammar, not hex
// ─────────────────────────────────────────────────────────────────────
//
// This is exactly where the hex guard stops describing what reaches the file.
// EZA_COLORS is `di=38;2;219;187;111:ex=…` — SGR parameters, not colours — so
// the instant we convert, shellHexValue's regex no longer matches the emitted
// text. Three rules follow, and they are the whole reason this generator reads
// the way it does:
//
//   1. Validate at the PALETTE READ (shellHexValue), then convert to integers
//      with parseInt(). Palette *text* is never interpolated into the SGR
//      string — only numbers derived from an already-validated hex.
//   2. Re-assert the assembled value against a closed grammar before emission,
//      since the thing being emitted is no longer the thing that was validated.
//   3. The KEY half comes from the hard-coded table below, never from a palette
//      key. Palette VALUES pass a guard; palette KEYS are unvalidated today.
//
// Permission slots deliberately match yazi's ([status] perm_read / perm_write /
// perm_exec), so the two file listers agree on what r/w/x look like. Read from
// _palette.json directly rather than from yaziTheme's output — a build-order
// dependency between two generators would be a worse coupling than a repeated
// token name.

const EZA_SLOTS = [
  // [LS_COLORS key, token, what it is] — keys are literals, never palette-derived.
  ['di', 'steelBright',  'directory'],
  ['ex', 'success',      'executable'],
  ['ln', 'cyan',         'symlink'],
  ['or', 'urgent',       'orphaned symlink'],
  ['pi', 'attentionAlt', 'fifo'],
  ['so', 'brandPurpleBright', 'socket'],
  ['bd', 'attentionAlt', 'block device'],
  ['cd', 'attentionAlt', 'char device'],
  ['ur', 'accent',       'user read      — matches yazi [status] perm_read'],
  ['uw', 'attentionAlt', 'user write     — matches yazi perm_write'],
  ['ux', 'success',      'user execute   — matches yazi perm_exec'],
  ['ue', 'success',      'user execute on a file it owns'],
  ['gr', 'accent',       'group read'],
  ['gw', 'attentionAlt', 'group write'],
  ['gx', 'success',      'group execute'],
  ['tr', 'accent',       'other read'],
  ['tw', 'attentionAlt', 'other write'],
  ['tx', 'success',      'other execute'],
  ['su', 'urgent',       'setuid'],
  ['sf', 'urgent',       'setgid'],
  ['xa', 'fgMuted',      'extended attribute marker'],
  ['sn', 'fg',           'size number'],
  ['sb', 'fgMuted',      'size unit'],
  ['uu', 'accent',       'your own user name'],
  ['un', 'fgMuted',      'someone else\'s user name'],
  ['gu', 'accent',       'a group you belong to'],
  ['gn', 'fgMuted',      'a group you do not'],
  ['da', 'fgMuted',      'timestamp'],
  ['ga', 'success',      'git new'],
  ['gm', 'attentionAlt', 'git modified'],
  ['gd', 'urgent',       'git deleted'],
  ['gv', 'brandPurpleBright', 'git renamed'],
  ['gt', 'cyan',         'git type-changed'],
  ['xx', 'border',       'punctuation between columns'],
];

// Same shape as cssomRgb() above, but returning the SGR triple rather than a
// CSS list. Takes an ALREADY-VALIDATED hex — never a raw palette read.
const sgrTruecolor = (hex) => {
  const h = hex.replace('#', '');
  return '38;2;' + [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(';');
};

const ezaTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Dark' : 'Light';

  const value = EZA_SLOTS
    .map(([key, token]) => `${key}=${sgrTruecolor(shellHexValue(token, `EZA_COLORS ${key}`, P, 'ezaTheme'))}`)
    .join(':');

  // The assembled string is not what shellHexValue validated, so it gets its
  // own closed grammar — imported, for the same no-second-copy reason as fzf's.
  if (!LS_COLORS_GRAMMAR.test(value)) {
    throw new Error(
      `ezaTheme: assembled EZA_COLORS is not a bare LS_COLORS list: ${JSON.stringify(value)}`
    );
  }

  return assertInertFragment(`# Artificer · ${title} — eza colours
# Source this from ~/.zshrc. eza reads EZA_COLORS on every invocation, so no
# reload step is needed beyond starting a new shell.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.
# This is LS_COLORS grammar, not hex: 38;2;R;G;B is an SGR truecolor escape.
# Permission slots match yazi's [status] perm_read / perm_write / perm_exec so
# the two file listers agree.

export EZA_COLORS="${value}"`, 'ezaTheme');
};

write('eza/artificer-dark.sh',  ezaTheme('dark'));
write('eza/artificer-light.sh', ezaTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// starship — a [palettes.*] table, merged into the user's own config
// ─────────────────────────────────────────────────────────────────────
//
// Not sourced by a shell, so no .sh guard applies — this is a TOML fragment
// starship parses, and it is inert by format.
//
// A tradeoff worth stating rather than burying, because it is a real cost and
// the owner took it with eyes open: the config this replaces used bare ANSI
// names ("bold cyan", "bold yellow"), which already resolve through Ghostty's
// Artificer palette AND adapt to any other terminal the prompt appears in — an
// ssh session, a CI log, someone else's machine. Hex pins the prompt to
// Artificer specifically. Selected anyway (2026-08-08).
//
// What ships here is a palette DEFINITION plus the one line that activates it.
// Rewriting each module's `style = "bold cyan"` to `style = "bold steel"` is
// the dotfiles-side follow-up — starship resolves palette names inside style
// strings, so the two halves are independent and this file is inert until the
// module lines change.
//
// Names are chosen to read as roles in a style string, not as hues: `style =
// "bold accent"` says what it means where `style = "bold gold"` does not.

const STARSHIP_COLORS = [
  // [palette name, token, what it is for]
  ['accent',      'accent',            'the thing wanting attention — cwd, prompt char'],
  ['accent-lift', 'accentBright',      'accent one rung up, for a hover/active twin'],
  ['fg',          'fg',                'ordinary prompt text'],
  ['muted',       'fgMuted',           'timings, counts, anything you read second'],
  ['border',      'border',            'separators and quiet chrome'],
  ['steel',       'steelBright',       'paths and directories'],
  ['brand',       'brandPurpleBright', 'the language/runtime modules'],
  ['cyan',        'cyan',              'vcs branch'],
  ['success',     'success',           'clean state, exit 0'],
  ['attention',   'attentionAlt',      'dirty state, staged-but-uncommitted'],
  ['urgent',      'urgent',            'exit non-zero, conflict'],
];

const starshipTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Dark' : 'Light';

  // No shell guard here (TOML, not sourced), but the same hex assertion —
  // a typo'd token would otherwise emit the literal string "undefined" as a
  // colour, which starship accepts silently as an unknown name.
  const rows = STARSHIP_COLORS.map(([name, token, why]) => {
    const hex = shellHexValue(token, `[palettes.artificer] ${name}`, P, 'starshipTheme');
    return `${name.padEnd(12)}= "${hex}"  # ${why}`;
  });

  return `# Artificer · ${title} — starship palette
# starship has no @import. Merge this into ~/.config/starship.toml:
#
#   1. paste the [palettes.artificer] table below
#   2. keep the top-level \`palette = "artificer"\` line — it activates the table
#   3. rewrite module styles from ANSI names to these role names,
#      e.g. style = "bold cyan"  ->  style = "bold steel"
#
# Step 3 is what actually changes the prompt; steps 1 and 2 are inert without
# it. Names read as ROLES on purpose — "bold accent" says what it means where
# "bold gold" does not.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.

palette = "artificer"

[palettes.artificer]
${rows.join('\n')}
`;
};

write('starship/artificer-dark.toml',  starshipTheme('dark'));
write('starship/artificer-light.toml', starshipTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// yazi — theme.toml, third merge layer over preset → flavor
// ─────────────────────────────────────────────────────────────────────
//
// Ported from a hand-authored ~/.dotfiles/private_dot_config/yazi/theme.toml
// whose COLOURS were already correct — every one of its fifteen literals
// resolves to a palette token — but whose SOURCE was wrong: hexes inlined by
// hand, with a header admitting "re-derive by hand if the palette moves".
// That is the defect this fixes. Cameron's ruling: yazi's colour must live in
// Artificer.
//
// The prose is carried through DELIBERATELY, not summarised. It is trap
// knowledge, and the traps are the expensive part:
//
//   · yazi validates theme VALUES but not KEY NAMES — a misspelled key loads
//     cleanly and silently never applies. Half the annotations exist to record
//     which keys were verified against the binary's embedded preset.
//   · `text` is REQUIRED in an [icon] cond, and satisfying that error with
//     text = "" parses cleanly while misaligning every icon column.
//   · prepend_rules / prepend_conds are first-match-wins and sit AHEAD of the
//     preset, so a lone catch-all silently shadows preset rules above it.
//
// A mechanical port that dropped those comments would look identical and be
// worth much less. So the template below is prose-first, values interpolated.
//
// Rule 2 (set no background) is why terminalBg appears where an instinct would
// reach for bg: a terminal is a RAISED surface (ADR 0036), and dropping to the
// substrate punches a visible hole through Ghostty's canvas.

const yaziTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const title = mode === 'dark' ? 'Dark' : 'Light';

  // Same discipline as the shell emitters even though TOML is inert: a typo'd
  // token would emit the literal "undefined", which yazi rejects as a colour
  // and — because it discards the ENTIRE theme on a parse error — would fall
  // the whole file back to presets.
  const t = (token) => shellHexValue(token, `yazi ${token}`, P, 'yaziTheme');

  const accent      = t('accent');
  const accentLift  = t('accentBright');
  const canvas      = t('terminalBg');
  const chrome      = t('border');
  const raised      = t('bgOverlay');
  const text        = t('fg');
  const muted       = t('fgMuted');
  const dim         = t('fgDisabled');
  const dirs        = t('steelBright');
  const purple      = t('brandPurple');
  const purpleLift  = t('brandPurpleBright');
  const bad         = t('urgent');
  const good        = t('success');
  const warn        = t('attentionAlt');
  const info        = t('cyan');

  return `# Artificer theme overrides for yazi (${title}).
#
# Third merge layer only (preset -> flavor -> theme.toml, later winning), so
# this states just the tokens that differ. Stating only the delta is what keeps
# this file readable against yazi's preset; the case against shipping a full
# flavor package instead is that a flavor would have to restate every token and
# would then drift from this generator on every palette change.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.
# The values below were hand-authored first and ported verbatim; every literal
# already resolved to a palette token, so this changes their SOURCE, not their
# colour.
#
# Three rules, before you edit anything here:
#
#   1. VERIFY EVERY KEY. yazi validates theme *values* but NOT *key names* — a
#      misspelled key loads cleanly and silently never applies. Check against
#      the preset embedded in the installed binary:
#        strings "$(readlink -f "$(command -v yazi)")" | grep -n 'border_style'
#      Counter-intuitive keys are annotated where they appear below.
#   2. SET NO BACKGROUND. The terminal canvas shows through. Do NOT reach down
#      to the Artificer \`bg\` token — a terminal is a *raised* surface
#      (ADR 0036) and Ghostty paints ${canvas}; going a rung lower punches a
#      visible hole through the canvas.
#   3. SPEND GOLD SPARINGLY. ${accent} marks only what momentarily demands
#      input: the cwd, the hovered row, input/pick/confirm borders, which-key
#      candidates. Persistent chrome stays on ${chrome}, directories on
#      ${dirs}. The scarcity is what makes gold read as focus.

#:schema https://yazi-rs.github.io/schemas/theme.json

# : Manager {{{
[mgr]
cwd = { fg = "${accent}" }

# Search state is transient and wants to out-shout the gold cwd, so it takes
# the brighter accent rather than a second use of the same token.
find_keyword  = { fg = "${accentLift}", bold = true, italic = true, underline = true }
find_position = { fg = "${accent}", bg = "reset", bold = true, italic = true }

# Persistent chrome: quiet, never gold.
border_style = { fg = "${chrome}" }

# Syntax colours for the file preview, borrowed from the bat tmTheme this same
# installer places at \$HOME/.config/bat/themes/. Without it the preview falls
# back to syntect's default, which is not Artificer and clashes hard with the
# chrome above.
#
# \`\$HOME\` is deliberate and is the ONLY portable spelling. yazi's
# \`expand_variables\` (yazi-fs/src/path/expand.rs) substitutes \`\$VAR\` and
# \`\${VAR}\` and nothing else — there is NO tilde branch — and \`sanitize_path\`
# then rejects any result that is not absolute. So \`~/...\` fails, and a path
# relative to the config dir is refused outright with
# "syntect_theme must be either empty or an absolute path".
syntect_theme = "\$HOME/.config/bat/themes/artificer-${mode}.tmTheme"
# }}}

# : Indicator of the hovered file {{{
# This is the hovered row. There is NO \`[mgr] hovered\` key in yazi 26.5.6 —
# writing one is silently ignored. \`[mgr]\`'s full key set is: overall, cwd,
# find_keyword, find_position, symlink_target, marker_*, count_*, border_symbol,
# border_style, syntect_theme.
#
# The preset uses \`reversed = true\`, which inverts each row against its own
# filetype color — so the hovered bar changes hue depending on what you land on.
# Stating fg/bg explicitly instead gives one uniform gold bar regardless of file
# type, which is the single strongest focus signal available here.
[indicator]
current = { fg = "${canvas}", bg = "${accent}", bold = true }
# }}}

# : Tabs {{{
# Deliberately NOT a gold fill. Tabs are persistent chrome — a gold tab would
# compete with the hovered row for the eye and dilute both.
[tabs]
active   = { fg = "${text}", bg = "${raised}", bold = true }
inactive = { fg = "${muted}" }
# }}}

# : Mode {{{
# Keys are \`*_main\` / \`*_alt\`, not bare \`normal\` / \`select\` / \`unset\`.
# \`_main\` is the pill body; \`_alt\` is the trailing separator wedge that blends
# the pill into the status bar, so it carries the pill color as *foreground*.
[mode]
normal_main = { fg = "${canvas}", bg = "${purple}", bold = true }
normal_alt  = { fg = "${purple}", bg = "${raised}" }

select_main = { fg = "${canvas}", bg = "${purpleLift}", bold = true }
select_alt  = { fg = "${purpleLift}", bg = "${raised}" }

unset_main = { fg = "${canvas}", bg = "${bad}", bold = true }
unset_alt  = { fg = "${bad}", bg = "${raised}" }
# }}}

# : Status bar {{{
# The permission triple is shared with eza's ur/uw/ux slots, so the two file
# listers agree on what r/w/x look like.
[status]
perm_sep   = { fg = "${chrome}" }
perm_type  = { fg = "${info}" }
perm_read  = { fg = "${accent}" }
perm_write = { fg = "${warn}" }
perm_exec  = { fg = "${good}" }

progress_label  = { fg = "${text}", bold = true }
progress_normal = { fg = "${good}", bg = "${raised}" }
progress_error  = { fg = "${bad}", bg = "${raised}" }
# }}}

# : Gold borders — surfaces that momentarily demand input {{{
[input]
border   = { fg = "${accent}" }
title    = { fg = "${accent}" }
value    = { fg = "${text}" }
selected = { fg = "${canvas}", bg = "${accent}" }

[pick]
border   = { fg = "${accent}" }
active   = { fg = "${accent}", bold = true }
inactive = { fg = "${text}" }

[confirm]
border  = { fg = "${accent}" }
title   = { fg = "${accent}" }
btn_yes = { fg = "${canvas}", bg = "${accent}", bold = true }
btn_no  = { fg = "${text}" }
# }}}

# : Quiet borders — panels you read rather than answer {{{
[tasks]
border  = { fg = "${chrome}" }
title   = { fg = "${text}" }
hovered = { fg = "${accent}", bold = true }

[cmp]
border   = { fg = "${chrome}" }
active   = { fg = "${canvas}", bg = "${accent}" }
inactive = { fg = "${text}" }

[spot]
border   = { fg = "${chrome}" }
title    = { fg = "${text}" }
tbl_col  = { fg = "${dirs}" }
tbl_cell = { fg = "${canvas}", bg = "${accent}" }
# }}}

# : Which-key {{{
# There is NO \`border\` key in this section — its full key set is cols, mask,
# cand, rest, desc, separator, separator_style. \`separator_style\` is this
# panel's equivalent chrome. \`mask\` (the dimming scrim) is left at the preset.
#
# The candidate keys take gold: the which-key panel only appears while a prefix
# is held, which is precisely "momentarily demanding input".
[which]
cand            = { fg = "${accent}" }
rest            = { fg = "${muted}" }
desc            = { fg = "${text}" }
separator_style = { fg = "${chrome}" }
# }}}

# : Git status column {{{
# Keys read by the git.yazi plugin — see the \`setup\` function in
# plugins/git.yazi/main.lua for the authoritative list. All six visible states
# are stated so none falls back to a preset color that clashes with the palette.
#
# \`updated\` (unmerged / conflicted) is the one gold outside the chrome rule.
# The plugin defaults it to the same yellow as \`modified\`, which hides the most
# action-demanding state in the list behind the most common one. Gold separates
# them and matches the "demands input" semantic. \`unknown\` and \`clean\` are left
# unset — the plugin renders them as empty signs, so they have nothing to color.
[git]
added     = { fg = "${good}" }
modified  = { fg = "${warn}" }
deleted   = { fg = "${bad}" }
updated   = { fg = "${accent}" }
untracked = { fg = "${info}" }
ignored   = { fg = "${dim}" }
# }}}

# : File-specific styles {{{
# \`prepend_rules\` is used rather than \`rules\`: a bare \`rules\` list REPLACES the
# preset's mime-based coloring for images, archives, documents, and video
# wholesale.
#
# Directories match on \`url = "*/"\` — the preset's own idiom, where \`*\` is
# files only and \`*/\` is directories only. \`is = "dir"\` is NOT used: \`is\`
# accepts any string without validation, so a wrong value there fails silently
# rather than erroring.
#
# ORDER MATTERS. Rules are first-match-wins and this whole block sits ahead of
# the preset, so a lone \`{ url = "*/" }\` would shadow the two preset rules that
# also match directories and sit above its own \`*/\` fallback — silently
# stripping the warning from stale and broken directories. Both are re-stated
# here, in palette colors, to preserve that signal.
[filetype]
prepend_rules = [
	# Stale or absent virtual-filesystem entries (inside archives, mounts).
	{ mime = "vfs/{absent,stale}", fg = "${muted}" },
	# Broken directory entries.
	{ url = "*/", is = "dummy", bg = "${bad}" },
	# Every other directory.
	{ url = "*/", fg = "${dirs}" },
]
# }}}

# : Icons {{{
# Only the *generic* folder glyph is recolored. Named folders (.git, .config,
# Documents, …) come from the preset's \`dirs\` table, which yazi consults before
# \`conds\`, so they keep their own colors — this does not flatten them.
#
# Both conds are re-stated because \`prepend_conds\` is first-match-wins: a lone
# \`{ if = "dir" }\` would shadow the preset's \`dir & hovered\` rule and the folder
# would stop switching to its open glyph on hover.
#
# \`text\` is a REQUIRED field — a cond without it hard-errors with "missing field
# \`text\`" and yazi discards the ENTIRE theme, falling back to presets. Do not
# satisfy that error with \`text = ""\`: it parses cleanly but renders a
# zero-width glyph and misaligns every icon column. The glyphs below are carried
# verbatim from the preset: U+E5FE (open folder) and U+E5FF (closed folder).
[icon]
prepend_conds = [
	{ if = "dir & hovered", text = "", fg = "${dirs}" },
	{ if = "dir", text = "", fg = "${dirs}" },
]
# }}}
`;
};

write('yazi/artificer-dark.toml',  yaziTheme('dark'));
write('yazi/artificer-light.toml', yaziTheme('light'));

// ─────────────────────────────────────────────────────────────────────
// flux — daisyUI override sheet for an upstream board we don't own
// ─────────────────────────────────────────────────────────────────────
//
// flux (sirsjg/flux) is Preact + Tailwind v4 + daisyUI 5, and its own
// index.css is bare: `@import "tailwindcss"; @plugin "daisyui";`. So the built
// stylesheet carries daisyUI's DEFAULT palette as custom properties scoped
// under [data-theme=dark] and [data-theme=light]. Redefining those same
// properties under those same selectors reskins the whole board through
// daisyUI's own token layer, without touching a Tailwind utility class or a
// single tracked file in a repo we can't push to.
//
// ONE file carrying BOTH modes, unlike ghostty/claude-code/vscode. Those hosts
// PICK a theme file; flux switches at runtime from a localStorage key, so a
// per-mode split would leave whichever mode wasn't linked on stock daisyUI
// lavender. First target in themes/ where that's true — a category, not a
// one-off.
//
// Surface mapping reads how flux USES each slot, not what the slot is named:
// Board.tsx renders `min-h-screen bg-base-200` while navbar/cards are
// bg-base-100, so base-200 is the page and base-100 is what sits raised on it.
// base-300 binds to `border` because 11 of its 14 uses in flux are
// border-base-300.

const FLUX_SLOTS = [
  // [slot, dark token, light token]
  ['base-100',  'bgRaised', 'bgRaised'],   // navbar, cards, task cards
  ['base-200',  'bg',       'bg'],         // the page itself
  ['base-300',  'border',   'border'],     // dividers, and a hover fill
  ['primary',   'accent',            'accent'],
  ['secondary', 'brandPurpleBright', 'brandPurple'],
  ['accent',    'cyan',              'cyan'],
  ['neutral',   'bgFloat',           'bgFloat'],
  ['info',      'steel',             'steel'],
  ['success',   'successBright',     'success'],
  ['warning',   'attentionAlt',      'attentionAlt'],
  ['error',     'urgentText',        'urgent'],
];

// daisyUI conflates a fill and a text role — `primary` paints btn-primary's
// background AND text-primary's glyphs. Artificer splits exactly these
// (accent vs accentFill, success vs successFill), so each slot above takes the
// value that clears AA as text on the page AND as a fill under its *-content
// pair. Three slots therefore take a non-bare token, each a measurement:
// dark secondary can't be brandPurple (3.60/3.24), dark success can't be bare
// success (3.45), dark error can't be urgentBright (3.08/3.79).

// flux's hardcoded hex → the Artificer token that replaces it. Keyed by flux's
// own hex because that hex IS the identity: in_progress and epic-1 genuinely
// share #3b82f6, so one upstream hex maps to one Artificer value and the
// upstream collapse is preserved rather than reinvented.
const FLUX_DOTS = [
  // [flux hex, what it is upstream, dark token-or-mix, light token-or-mix]
  ['#a855f7', 'status planning',       'brandPurpleBright', 'brandPurple'],
  ['#6b7280', 'status todo / prio low', 'MIX_GRAY',         'MIX_GRAY'],
  ['#3b82f6', 'status in_progress + epic 1', 'steel',       'steel'],
  ['#22c55e', 'status done + epic 2',  'successBright',     'success'],
  ['#f59e0b', 'epic 3 / prio medium',  'accent',            'accent'],
  ['#8b5cf6', 'epic 4',                'brandPurple',       'brandPurpleBright'],
  ['#ef4444', 'epic 5 / prio high',    'urgentText',        'urgent'],
  ['#06b6d4', 'epic 6',                'cyan',              'cyan'],
  ['#ec4899', 'epic 7',                'MIX_PINK',          'MIX_PINK'],
  ['#84cc16', 'epic 8',                'MIX_LIME',          'MIX_LIME'],
  // Not an epic hue — the "Unassigned" default. DraggableTaskCard defaults
  // epicColor to this and Board passes it explicitly for any task with no
  // epic, so on a board with no epics defined it is EVERY card. Takes the same
  // neutral as `todo` on purpose: neither scale has a neutral member, so the
  // grey reads as absence in both, and the two never appear in the same slot.
  ['#9ca3af', 'epic unassigned',       'MIX_GRAY',          'MIX_GRAY'],
];

// Three values the palette doesn't carry, derived rather than hand-written so
// they re-derive on any palette change. Each is a mix because no token fits:
// the light palette has no rose at all (light `attention` is gold), there is no
// yellow-green between sage and gold, and every muted token measures under the
// 3:1 graphical floor ON bgRaised — which is the surface that binds, because a
// task-card dot sits on a card, not on the page.
const fluxDerived = (P) => ({
  MIX_PINK: mixOk(P.urgentBright, P.brandPurpleBright, 0.4),
  MIX_LIME: mixOk(P.successBright, P.accent, 0.5),
  MIX_GRAY: mixOk(P.fgMuted, P.fg, 0.15),
});

const fluxTheme = () => {
  const block = (mode) => {
    const P = mode === 'dark' ? D : L;
    const derived = fluxDerived(P);
    const val = (tok) => derived[tok] ?? P[tok];
    const idx = mode === 'dark' ? 2 : 3;

    // A chromatic fill reads light-on-dark and dark-on-light, so its label is
    // ink in dark mode and ivory in light. Only neutral inverts: bgFloat tracks
    // the surface ramp rather than the chroma, so it carries fg in both.
    const contentFor = (slot) =>
      slot === 'neutral' ? P.fg : (mode === 'dark' ? P.ink : P.ivory);

    const vars = FLUX_SLOTS.map(([slot, dTok, lTok]) => {
      const v = mode === 'dark' ? P[dTok] : P[lTok];
      const line = `  --color-${slot}: ${v};`;
      // Surfaces carry no per-slot *-content pair — base-content is emitted
      // once for the whole block below, since all three base steps share it.
      if (slot.startsWith('base-')) return line;
      return `${line}\n  --color-${slot}-content: ${contentFor(slot)};`;
    }).join('\n');

    const dots = FLUX_DOTS.map(([hex, what, dTok, lTok]) =>
      `[data-theme=${mode}] [style*="background-color: rgb(${cssomRgb(hex)})"] {\n` +
      `  background-color: ${val(mode === 'dark' ? dTok : lTok)} !important;  /* ${what} */\n` +
      `}`
    ).join('\n');

    return `[data-theme=${mode}] {\n${vars}\n  --color-base-content: ${P.fg};\n}\n\n${dots}`;
  };

  return `/* Artificer · flux — daisyUI override sheet
 *
 * Generated from themes/_palette.json — edit there + re-run build.mjs.
 *
 * flux is upstream code we don't own and can't push to, so this reskins a
 * RUNNING board without editing a tracked file in it. Install writes only into
 * packages/web/dist, which is gitignored upstream: symlink this sheet in, then
 * add a <link> to dist/index.html AFTER the hashed /assets/index-*.css so it
 * wins on cascade order. ~/bin/flux-skin does both idempotently.
 *
 * TWO FAILURE MODES THAT LOOK LIKE THIS FILE NOT WORKING:
 *   1. A rebuild un-themes the board and exits 0. Vite's emptyOutDir defaults
 *      true, so any \`bun run build\` in packages/web empties dist/ and
 *      regenerates index.html with new asset hashes, taking both edits with it.
 *      The board keeps serving, just unthemed. Nothing surfaces the loss.
 *   2. flux caches index.html at boot. Static assets are re-read per request;
 *      index.html is read ONCE at daemon start and served from memory. A fresh
 *      symlink lands on reload, a fresh <link> does NOT until the daemon is
 *      kicked — indistinguishable from broken CSS.
 *
 * The dot rules match the CSSOM's serialization of Preact's inline styles,
 * INCLUDING the property name, so a rule can never fire on an element that
 * merely uses the same colour for text or a border. !important is load-bearing:
 * an inline style beats any selector on specificity, so an author declaration
 * wins only by being important.
 *
 * Dots are held to the 3:1 graphical floor (WCAG SC 1.4.11), not text-AA — each
 * sits beside its own text label. The binding surface is bgRaised, not the
 * page: urgentBright (2.70), fgMuted (2.68) and ansiBrightBlack (2.86) all pass
 * on bg and FAIL on a card.
 */

${block('dark')}

${block('light')}
`;
};

write('flux/artificer-flux.css', fluxTheme());

// ─────────────────────────────────────────────────────────────────────
// Browsers — Chrome / Edge (Chromium) + Firefox
// ─────────────────────────────────────────────────────────────────────
//
// Three artifacts, five store listings. The split is forced by the formats,
// not chosen:
//
//   · Firefox takes hex strings AND a sibling `dark_theme` manifest key, so
//     ONE package carries both modes and follows the OS.
//   · Chromium accepts only RGB arrays and has no dark/light switch, so one
//     package is one mode — hence artificer-dark/ and artificer-light/.
//   · Edge takes the Chromium package unchanged (learn.microsoft.com): a
//     second listing, not a third artifact.
//
// The key sets are NOT a subset relation, which is why the shared table below
// tags every row with the browsers that accept it. Chromium's accepted keys are
// `kOverwritableColorTable` in chrome/browser/themes/browser_theme_pack.cc —
// Chrome does not publish the list, and an unrecognized key parses fine and is
// then silently ignored, so a guessed name fails invisibly. Chromium says
// `omnibox_background` / `omnibox_text` / `toolbar_button_icon` where Firefox
// says `toolbar_field` / `toolbar_field_text` / `icons`, and has no popup,
// sidebar, separator or focus keys at all.
//
// Chromium's kTintTable (`background_tab`, `buttons`, `frame`, …) takes HSL
// float triples rather than colours. Nothing is emitted into it: the one thing
// a tint would buy — legible text on an inactive tab over a dark frame — is
// bought directly and exactly by the `background_tab` / `tab_background_text`
// COLOUR rows below, and a guessed HSL shift is worse than no shift.

// [key, token, accepted-by, what it is]
//   'both'     — the literal key string is in Chromium's table AND Firefox's
//   'chromium' — Chromium only
//   'firefox'  — Firefox only
const BROWSER_SLOTS = [
  // the window frame: the browser's own backdrop
  ['frame',                                 'bg',            'both',     'the window frame'],
  ['frame_inactive',                        'bgInactive',    'both',     'frame of an unfocused window — Rule #6 recession'],
  ['frame_incognito',                       'bgInactive',    'chromium', 'incognito frame'],
  ['frame_incognito_inactive',              'bgInactive',    'chromium', 'unfocused incognito frame'],
  ['ntp_background',                        'bg',            'both',     'the new-tab page — its own surface, not the toolbar\'s'],

  // the toolbar strip and the selected tab sit one rung up, as raised chrome
  ['toolbar',                               'bgRaised',      'both',     'the toolbar strip and the selected tab'],
  ['tab_selected',                          'bgRaised',      'firefox',  'selected tab (Chromium derives it from `toolbar`)'],
  ['sidebar',                               'bgRaised',      'firefox',  'sidebar panel background'],
  ['ntp_card_background',                   'bgRaised',      'firefox',  'new-tab-page cards'],
  ['ntp_header',                            'bgRaised',      'chromium', 'new-tab-page header band'],
  ['button_background',                     'bgRaised',      'chromium', 'frame caption buttons'],

  // inactive tabs ride on the frame, so they take the frame's surface
  ['background_tab',                        'bg',            'chromium', 'an unselected tab'],
  ['background_tab_inactive',               'bgInactive',    'chromium', 'unselected tab in an unfocused window'],
  ['background_tab_incognito',              'bg',            'chromium', 'unselected incognito tab'],
  ['background_tab_incognito_inactive',     'bgInactive',    'chromium', 'unselected incognito tab, unfocused window'],

  // the URL bar and popups are the overlay rung
  ['toolbar_field',                         'bgOverlay',     'firefox',  'the URL bar'],
  ['toolbar_field_focus',                   'bgOverlay',     'firefox',  'the URL bar while focused'],
  ['omnibox_background',                    'bgOverlay',     'chromium', 'the URL bar (Chromium spelling)'],
  ['popup',                                 'bgOverlay',     'firefox',  'autocomplete + doorhanger panels'],
  ['button_background_hover',               'bgOverlay',     'firefox',  'toolbar button hover'],

  // primary text, everywhere it lands on bg / bgRaised / bgOverlay
  ['tab_text',                              'fg',            'both',     'selected-tab text'],
  ['toolbar_text',                          'fg',            'both',     'toolbar text'],
  ['bookmark_text',                         'fg',            'both',     'bookmarks-bar text'],
  ['ntp_text',                              'fg',            'both',     'new-tab-page text'],
  ['toolbar_field_text',                    'fg',            'firefox',  'URL-bar text'],
  ['toolbar_field_text_focus',              'fg',            'firefox',  'URL-bar text while focused'],
  ['omnibox_text',                          'fg',            'chromium', 'URL-bar text (Chromium spelling)'],
  ['popup_text',                            'fg',            'firefox',  'popup-panel text'],
  ['sidebar_text',                          'fg',            'firefox',  'sidebar text'],

  // secondary text and icons — the quiet tier
  ['tab_background_text',                   'fgSecondary',   'both',     'unselected-tab text'],
  ['tab_background_text_inactive',          'fgSecondary',   'chromium', 'unselected-tab text, unfocused window'],
  ['tab_background_text_incognito',         'fgSecondary',   'chromium', 'unselected incognito-tab text'],
  ['tab_background_text_incognito_inactive','fgSecondary',   'chromium', 'unselected incognito-tab text, unfocused window'],
  ['icons',                                 'fgSecondary',   'firefox',  'toolbar icons'],
  ['toolbar_button_icon',                   'fgSecondary',   'chromium', 'toolbar icons (Chromium spelling)'],

  // accent — the one interactive hue
  //
  // ntp_link is bound deliberately: leave it out and new-tab-page links render
  // at Chrome's default blue on an Artificer surface.
  ['ntp_link',                              'accent',        'chromium', 'new-tab-page links'],
  ['tab_line',                              'accent',        'firefox',  'the selected-tab indicator line'],
  ['icons_attention',                       'accent',        'firefox',  'an icon wanting attention'],
  ['toolbar_field_border_focus',            'accent',        'firefox',  'URL-bar border while focused'],

  // selection fills, and the text rated against them
  ['popup_highlight',                       'selectionFill', 'firefox',  'highlighted autocomplete row'],
  ['popup_highlight_text',                  'fg',            'firefox',  'text on the highlighted row'],
  ['sidebar_highlight',                     'selectionFill', 'firefox',  'selected sidebar row'],
  ['sidebar_highlight_text',                'fg',            'firefox',  'text on the selected sidebar row'],
  ['toolbar_field_highlight',               'selectionFill', 'firefox',  'selected text inside the URL bar'],
  ['button_background_active',              'selectionFill', 'firefox',  'a pressed toolbar button'],

  // quiet chrome — dividers and borders are never gold
  ['toolbar_field_border',                  'border',        'firefox',  'URL-bar border'],
  ['toolbar_top_separator',                 'border',        'firefox',  'rule above the toolbar'],
  ['toolbar_bottom_separator',              'border',        'firefox',  'rule below the toolbar'],
  ['toolbar_vertical_separator',            'border',        'firefox',  'in-toolbar dividers'],
  ['popup_border',                          'border',        'firefox',  'popup-panel border'],
  ['sidebar_border',                        'border',        'firefox',  'sidebar border'],
];

const browserSlotsFor = (browser) =>
  BROWSER_SLOTS.filter(([, , accepts]) => accepts === 'both' || accepts === browser);

// Resolved once per browser, not once per mode: the key set does not vary with
// mode, and hoisting it makes that invariant visible instead of leaving it
// implicit in two identical filter calls.
const CHROMIUM_SLOTS = browserSlotsFor('chromium');
const FIREFOX_SLOTS = browserSlotsFor('firefox');

// Hex → [r, g, b]. Chromium's theme.colors takes ONLY RGB arrays; a hex string
// there parses and is then ignored. Deliberately NOT an overload of rgb()
// above — Obsidian's callout system depends on that helper's "r, g, b" string
// shape inside rgba(var(--callout-foo), 0.1).
const rgbArray = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const BROWSER_BLURB =
  'Artificer — a Jazz Age palette for tool surfaces: burnished gold on slate in '
  + 'the dark, sienna on ivory paper in the light. Generated from the same '
  + 'palette as the Artificer design system\'s editor and terminal themes.';

// The 128×128 mark committed in every package directory (rendered from
// src/assets/favicon.svg). Both manifests must NAME it: pack-browser.mjs puts
// the file in the zip, but an undeclared PNG is inert — Chrome falls back to
// the grey puzzle piece on chrome://extensions and AMO shows a generic icon.
const BROWSER_ICONS = { 128: 'icon-128.png' };

// manifest_version 3: the Chrome Web Store and Microsoft Partner Center both
// reject MV2 submissions.
const chromiumTheme = (mode) => {
  const P = mode === 'dark' ? D : L;
  const colors = Object.fromEntries(
    CHROMIUM_SLOTS.map(([key, token]) => [key, rgbArray(P[token])])
  );
  return JSON.stringify({
    manifest_version: 3,
    name: mode === 'dark' ? 'Artificer Dark' : 'Artificer Light',
    version,
    description: BROWSER_BLURB,
    icons: BROWSER_ICONS,
    theme: { colors },
  }, null, 2) + '\n';
};

// The add-on id is IDENTITY and permanent, the same lesson JETBRAINS_THEME_IDS
// carries: leave it unset and AMO mints one at first submission, making the
// listing's identity a store artifact rather than a repo fact — and changing it
// later mints a DIFFERENT add-on that existing users never receive.
//
// The brace-UUID form rather than the email-shaped one Gecko also accepts: an
// email-shaped id publishes a domain, permanently and unchangeably once AMO
// takes the first submission, in a file the public export ships. A UUID depends
// on no domain and discloses nothing, at no cost — the id is an opaque string
// to Gecko, never resolved or fetched.
const FIREFOX_ADDON_ID = '{b91a29e8-5147-4076-8bda-1b1f5c5e12d9}';

// dark_theme landed in Firefox 68 (mdn/browser-compat-data). On anything older
// the key is ignored and the theme renders light-only, silently — hence the
// floor rather than a comment.
const FIREFOX_MIN_VERSION = '68.0';

// manifest_version 2: Mozilla's own current static-theme documentation ships
// MV2 as the canonical example and has stated no plan to deprecate it
// (extensionworkshop.com/documentation/themes/static-themes/). Themes carry no
// background-script surface, so the MV3 split that matters for extensions does
// not reach them.
const firefoxTheme = () => {
  const colorsFor = (P) => Object.fromEntries(FIREFOX_SLOTS.map(([key, token]) => [key, P[token]]));
  return JSON.stringify({
    manifest_version: 2,
    name: 'Artificer',
    version,
    description: BROWSER_BLURB,
    icons: BROWSER_ICONS,
    browser_specific_settings: {
      gecko: { id: FIREFOX_ADDON_ID, strict_min_version: FIREFOX_MIN_VERSION },
    },
    // `theme` is the default; `dark_theme` takes over when the OS is dark.
    theme: { colors: colorsFor(L) },
    dark_theme: { colors: colorsFor(D) },
  }, null, 2) + '\n';
};

// Literal single-quoted paths, never a template literal: emittedTargets() in
// scripts/check-install-coverage.mjs scans this file for write() calls with a
// single-quoted string literal argument, so interpolating the mode makes both
// targets invisible to the meta-gate — check:install would stay green while
// dispositioning nothing. (The regex is why this note does not quote a sample
// call: the sample would itself parse as a phantom emitted target.)
write('chromium/artificer-dark/manifest.json',  chromiumTheme('dark'));
write('chromium/artificer-light/manifest.json', chromiumTheme('light'));
write('firefox/artificer/manifest.json',        firefoxTheme());

// ─────────────────────────────────────────────────────────────────────
// Obsidian fonts — base64-inline woff2 into the distributed theme.css
// ─────────────────────────────────────────────────────────────────────
//
// Obsidian blocks local file access in theme CSS (CVE-2023-2110
// mitigation), so url('fonts/x.woff2') never resolves — the only way to
// ship bundled fonts is base64 data URIs embedded in src:. See
// docs/research/obsidian-custom-fonts.md.
//
// theme.src.css is hand-authored (Lane 2) and keeps the readable
// url('fonts/x.woff2') refs. This pass reads it, swaps each ref for the
// base64 of the matching fonts/*.woff2, and writes the generated
// theme.css (Lane 3 artifact) that the Obsidian community picker pulls.
// Unlike the palette surfaces above, the source here is hand-authored
// CSS rather than _palette.json — only the inlining is generated.

// woff2 filename → OS font-family name. Emitted as a local() entry ahead
// of the embedded base64 so an OS-installed copy wins first and the
// ~90 KB data URI is only decoded when the font is absent. The @font-face
// font-weight/font-style descriptors pick the right instance of the family.
const localFamily = (file) => ({
  'jetbrains-mono':      'JetBrains Mono',
  'ia-writer-quattro':   'iA Writer Quattro',
  'ia-writer-quattro-s': 'iA Writer Quattro S',
  'ia-writer-quattro-v': 'iA Writer Quattro V',
}[file.replace(/-\d+(-italic)?\.woff2$/, '')]);

const buildObsidianFonts = () => {
  const base = join(__dirname, 'obsidian/Artificer');
  const src = readFileSync(join(base, 'theme.src.css'), 'utf8');

  let count = 0;
  const inlined = src.replace(
    /url\('fonts\/([^']+\.woff2)'\)/g,
    (_, file) => {
      const b64 = readFileSync(join(base, 'fonts', file)).toString('base64');
      count++;
      const fam = localFamily(file);
      const local = fam ? `local('${fam}'), ` : '';
      return `${local}url('data:font/woff2;base64,${b64}')`;
    }
  );

  const banner =
    '/* GENERATED FILE — DO NOT EDIT.\n' +
    '   Source: theme.src.css (+ fonts/*.woff2, base64-inlined).\n' +
    '   Regenerate: node themes/build.mjs\n' +
    '   Edit theme.src.css for CSS changes; replace fonts/ for font changes. */\n';

  writeFileSync(join(base, 'theme.css'), banner + inlined);
  console.log(`wrote obsidian/Artificer/theme.css (${count} fonts inlined)`);
};

buildObsidianFonts();

console.log('\nObsidian CSS is hand-authored — edit theme.src.css; --art-* tokens checked manually.');
console.log('\nDone.');
