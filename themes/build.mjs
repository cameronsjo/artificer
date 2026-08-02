#!/usr/bin/env node
// Artificer · theme generator
// Reads themes/_palette.json and writes every theme file.
// Usage:  node themes/build.mjs
// Or:     npm run build:themes  (if you wire it up)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const onAccent = mode === 'dark' ? P.ink : P.ivory;
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
  const onAccent = mode === 'dark' ? P.ink : P.ivory;
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
      { scope: ['markup.heading'], settings: { foreground: P.accent, fontStyle: 'bold' } },
      { scope: ['markup.bold'], settings: { fontStyle: 'bold', foreground: P.fg } },
      { scope: ['markup.italic'], settings: { fontStyle: 'italic', foreground: P.fg } },
      { scope: ['markup.inserted'], settings: { foreground: P.success } },
      { scope: ['markup.deleted'], settings: { foreground: P.urgent } },
      { scope: ['markup.changed'], settings: { foreground: P.attention } },
      { scope: ['markup.quote'], settings: { foreground: P.fgSecondary, fontStyle: 'italic' } },
      { scope: ['markup.link'], settings: { foreground: P.accent } },
      { scope: ['markup.raw', 'markup.inline.raw'], settings: { foreground: sx('string') } },
      { scope: ['invalid', 'invalid.illegal'], settings: { foreground: sx('invalid'), fontStyle: 'italic' } },
      { scope: ['invalid.deprecated'], settings: { foreground: sx('invalid'), fontStyle: 'italic' } }
    ]
  };
};

write('vscode/themes/artificer-dark-color-theme.json',  JSON.stringify(vscodeTheme('dark'),  null, 2) + '\n');
write('vscode/themes/artificer-light-color-theme.json', JSON.stringify(vscodeTheme('light'), null, 2) + '\n');

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
    selectionColor: D.steel,                // active-row fill; calm cool neutral, cmux auto-renders ink text (9.30); owner
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
// The token set is herdr's CustomThemeColors struct — all 16 fields, in the
// binary's own declaration order. Overriding every field means the base `name`
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
// A third is worth naming so a future reader does not "fix" it: `accent` and
// `yellow` resolve to the SAME token. Artificer's accent IS gold, so herdr's
// navigation accent and its yellow state marker legitimately coincide; forcing
// them apart would mean importing an off-palette hue (Hard rule #1).
//
// Surfaces do not carry the text ratios, so they are listed without one: the
// bg → bgRaised → bgOverlay ladder is the ADR 0036 elevation model, with
// panel_bg on the substrate exactly as the cmux sidebar is pinned above.
//
// Generated from themes/_palette.json — edit there + re-run build.mjs.

// [herdrKey, paletteToken, note]. One table, so the emitted file and the ratio
// commentary above cannot drift apart. Order mirrors CustomThemeColors.
const HERDR_TOKENS = [
  ['accent',      'accent',            'highlights, borders, navigation UI'],
  ['panel_bg',    'bg',                'the substrate (ADR 0036)'],
  ['surface0',    'bgRaised',          'raised panel'],
  ['surface1',    'bgOverlay',         'selected row'],
  ['surface_dim', 'bgInactive',        'unfocused pane'],
  ['overlay0',    'fgDisabled',        'dim text — disabled tier (2.43 / 4.80)'],
  ['overlay1',    'fgMuted',           'muted meta/comment (3.05 / 3.83)'],
  ['text',        'fg',                '11.21 / 13.13'],
  ['subtext0',    'fgSecondary',       '8.29 / 8.63'],
  ['mauve',       'brandPurpleBright', '5.47 / 6.83'],
  ['green',       'successBright',     '4.50 / 4.86'],
  ['yellow',      'accent',            '7.55 / 5.33 — same token as accent; Artificer accent IS gold'],
  ['red',         'urgentText',        '6.98 / 7.49 — the text-tier red; bare urgent is 2.28 on dark'],
  ['blue',        'steel',             '8.28 / 7.83'],
  ['teal',        'cyan',              '5.23 / 5.10'],
  ['peach',       'attentionAlt',      '5.49 / 5.25'],
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
# overrides all 16 CustomThemeColors fields.
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
// reading it — render a fixture and inspect the escape sequences.

const glamourTheme = (mode) => {
  const P = mode === 'dark' ? D : L;

  // The code-block canvas. Dark's bgRaised IS terminalBg (both #313540, ADR
  // 0036), so a block painted at bgRaised sits at 1.00:1 against its own
  // background and vanishes — the same trap the Claude Code message chip
  // works around above, fixed the same way: lift a rung. Light inverts
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
    h2: { prefix: '## ', color: P.accentBright },
    h3: { prefix: '### ' },
    h4: { prefix: '#### ' },
    h5: { prefix: '##### ' },
    h6: { prefix: '###### ', color: P.fgSecondary, bold: false },

    text: {},
    strikethrough: { crossed_out: true },
    // Format-only, deliberately uncolored. $notes.attentionNotTextRole (ADR
    // 0015): attention is a fill/border/dot hue, never a body-text color —
    // and upstream glamour leaves both uncolored too, so this is also parity.
    emph: { italic: true },
    strong: { bold: true },

    hr: { color: P.border, format: '\n--------\n' },
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
        // The block's own canvas. glamour paints the background here, not at
        // code_block.background_color — stock dark.json leaves that unset.
        background:            { background_color: codeBg },
      },
    },

    table: {},
    definition_list: {},
    definition_term: {},
    definition_description: { block_prefix: '\n🠶 ' },
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

// gum is the ONLY target where a palette value lands somewhere executable —
// every other target is JSON.stringify'd and inert. Shell double quotes do NOT
// suppress $(...) or backticks, so a palette value of `#dbb$(cmd)` would run
// cmd on every source: in each zsh invocation via ~/.zshenv, in the cmux
// launcher, and at login under the LaunchAgent. No quote breakout required.
//
// check-themes cannot catch this. It verifies the fragment matches the
// generator, so a poisoned palette AND its regenerated fragment pass green.
// The guard therefore has to live at the emitter.
//
// It also catches a typo'd token, which today silently emits "undefined".
const gumValue = (token, tokenName, palette) => {
  if (!token) return '';
  const value = palette[token];
  if (!/^#[0-9a-fA-F]{6}$/.test(value ?? '')) {
    throw new Error(
      `gumTheme: ${tokenName} → "${token}" resolved to ${JSON.stringify(value)}, ` +
      'which is not a six-digit hex colour. Refusing to emit it into a sourced ' +
      'shell fragment.'
    );
  }
  return value;
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
      lines.push(`export ${stem}_FOREGROUND="${gumValue(fgTok, `${stem}_FOREGROUND`, P)}"`);
      lines.push(`export ${stem}_BACKGROUND="${gumValue(bgTok, `${stem}_BACKGROUND`, P)}"`);
    }
    lines.push('');
  }

  // Every line must be a comment, an export, or blank. ~/.zshenv sources this
  // for EVERY zsh invocation, and a non-login non-interactive shell is what
  // scp, sftp, git-over-ssh and mosh get — any byte on stdout during startup
  // corrupts their protocol handshake and breaks remote access, not just
  // colour. A future banner or deprecation notice added here would do exactly
  // that, and check-themes would green-light it, so assert the shape now.
  const assertInert = (body) => {
    const offender = body.split('\n').find((l) => !/^(#|export |$)/.test(l));
    if (offender !== undefined) {
      throw new Error(
        `gumTheme: refusing to emit a line that is neither a comment, an export, ` +
        `nor blank: ${JSON.stringify(offender)}. This fragment is sourced by ` +
        `every zsh invocation; anything that prints breaks git-over-ssh.`
      );
    }
    return body;
  };

  return assertInert(`# Artificer · ${title} — gum style environment
# gum has no config file (charmbracelet/gum#991). Source this fragment from a
# shell rc, or from a script that calls gum outside an interactive shell.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.
# Every value is a hex; gum needs a truecolor-capable terminal to render them
# exactly, and degrades to the nearest 256 colour otherwise.

${lines.join('\n')}`);
};

write('gum/artificer-dark.sh',  gumTheme('dark'));
write('gum/artificer-light.sh', gumTheme('light'));

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
