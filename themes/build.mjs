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
      background: P.bg,

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

      userMessageBackground: P.bgRaised,
      userMessageBackgroundHover: P.bgOverlay,
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
      clawd_background: P.bg,

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

background = ${P.bg.replace('#','')}
foreground = ${P.fg.replace('#','')}

cursor-color = ${P.accent.replace('#','')}
cursor-text  = ${P.bg.replace('#','')}

selection-background = ${P.accentFill.replace('#','')}
selection-foreground = ${(mode === 'dark' ? P.ink : P.ivory).replace('#','')}

# ANSI 0–7 (normal)
# Invariant: positions 4 (normal blue) and 12 (bright blue) must be a
# brightness pair on the same hue. Markdown renderers emit bright-blue
# for inline code; sibling hues (e.g. rose + peach) make inline code
# render a visibly different color than surrounding text.
palette = 0=${P.bg.replace('#','')}
palette = 1=${P.urgent.replace('#','')}
palette = 2=${P.success.replace('#','')}
palette = 3=${P.accent.replace('#','')}
palette = 4=${P.steelBright.replace('#','')}
palette = 5=${P.brandPurple.replace('#','')}
palette = 6=${P.cyan.replace('#','')}
palette = 7=${P.fg.replace('#','')}

# ANSI 8–15 (bright)
palette = 8=${P.fgDisabled.replace('#','')}
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
  // Syntax role resolver: $roles.syntax maps role → token name (mode-independent);
  // P[tokenName] resolves to the per-mode hex.
  const sx = (role) => P[palette.$roles.syntax[role]];
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
      'terminal.ansiBlack': P.bg,
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

set -g status-style "bg=${P.bg},fg=${P.fg}"
set -g status-left-style "fg=colour13,bold"
set -g status-right-style "fg=${P.fgSecondary}"

setw -g window-status-style "fg=${P.fgSecondary}"
setw -g window-status-current-style "fg=colour13,bold"

set -g pane-border-style "fg=${P.border}"
set -g pane-active-border-style "fg=colour13"

set -g message-style "bg=${P.bg},fg=colour13,bold"
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
