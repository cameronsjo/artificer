-- Artificer — Neovim colorscheme
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
-- `termguicolors` this degrades to whatever 16 colors the terminal guesses —
-- a disposition, not an oversight. This file deliberately does NOT set
-- `termguicolors` itself: setting it from inside colors/ mutates a global the
-- user never gets back on switch-away, and it is redundant on Neovim >= 0.10.
-- Set it in your init.lua.
--
-- `highlight clear` below wipes EVERY highlight, including groups plugins
-- defined earlier — they vanish on each colorscheme switch. Personal overrides
-- belong in a ColorScheme autocommand created BEFORE `:colorscheme` runs.

vim.cmd('highlight clear')
if vim.fn.exists('syntax_on') == 1 then
  vim.cmd('syntax reset')
end
vim.g.colors_name = 'artificer'

-- ── Palette · verbatim _palette.json token names ─────────────────────
local palette = {
  dark = {
    accent            = "#dbbb6f",
    accentBright      = "#e3c885",
    accentFill        = "#c4932a",
    ansiBlack         = "#5f6576",
    ansiBrightBlack   = "#737a8d",
    attention         = "#c4808a",
    attentionAlt      = "#d6936a",
    attentionFill     = "#c4808a",
    bg                = "#292c33",
    bgFloat           = "#474d60",
    bgOverlay         = "#3c4150",
    bgRaised          = "#313540",
    border            = "#4a4f5c",
    borderLifted      = "#5a606e",
    brandPurple       = "#9070d0",
    brandPurpleBright = "#b095e0",
    cyan              = "#7da6a4",
    cyanBright        = "#9bc1bf",
    fg                = "#e8e6e1",
    fgDisabled        = "#666666",
    fgMuted           = "#5a7a8a",
    fgSecondary       = "#c5c8c6",
    ink               = "#20203e",
    ivory             = "#f5ead0",
    steel             = "#b8cad4",
    steelBright       = "#9fb6c4",
    success           = "#4a8a5e",
    successBright     = "#5fa073",
    urgent            = "#a04540",
    urgentBright      = "#b85a55",
    urgentText        = "#e6a8a2",
  },
  light = {
    accent            = "#7a5a10",
    accentBright      = "#866010",
    accentFill        = "#c4932a",
    ansiBlack         = "#f5ead0",
    ansiBrightBlack   = "#8a8070",
    attention         = "#8a6618",
    attentionAlt      = "#a04500",
    attentionFill     = "#dbbb6f",
    bg                = "#f5ead0",
    bgFloat           = "#dbcca0",
    bgOverlay         = "#e4d4b0",
    bgRaised          = "#eddcc0",
    border            = "#cbb88a",
    borderLifted      = "#b8a674",
    brandPurple       = "#4a25a0",
    brandPurpleBright = "#5a35b0",
    cyan              = "#3a6a68",
    cyanBright        = "#4a8280",
    fg                = "#20203e",
    fgDisabled        = "#8a8070",
    fgMuted           = "#5a7a8a",
    fgSecondary       = "#4a3f2a",
    ink               = "#20203e",
    ivory             = "#f5ead0",
    steel             = "#2e4a5a",
    steelBright       = "#406278",
    success           = "#2a5a3a",
    successBright     = "#3a7050",
    urgent            = "#8a2418",
    urgentBright      = "#a04540",
    urgentText        = "#8a2418",
  },
}

-- `background` is read ONCE, here. Neovim fires OptionSet and nothing else on
-- `:set background=light`, so the flip does not re-source this file — re-run
-- `:colorscheme artificer` after changing it.
local P = palette[vim.o.background == 'light' and 'light' or 'dark']

-- ADR 0038's escape hatch. Default is transparent: the terminal canvas
-- (Ghostty's terminalBg) shows through, where comment and operator measure 2.68
-- against the repo's 3.0 floor — the same pre-existing terminal-wide condition
-- Ghostty's ANSI 9/10 already ship. Want the floors back?
--
--     vim.g.artificer_opaque = true
--     vim.cmd.colorscheme('artificer')
--
-- vim.g survives `:colorscheme`, and `:colorscheme` re-sources
-- unconditionally, so re-entry re-reads the flag. `= 1` is accepted too, for
-- `:let g:artificer_opaque = 1`.
local opaque = vim.g.artificer_opaque == true or vim.g.artificer_opaque == 1

local function hi(group, opts)
  vim.api.nvim_set_hl(0, group, opts)
end

-- ── Editor plane ─────────────────────────────────────────────────────
if opaque then
  -- PAINTS the substrate. On bg every $roles.syntax binding passes: string
  -- 4.50, comment and operator 3.05, tag and invalid 3.08.
  hi('Normal', { fg = P.fg, bg = P.bg })
else
  -- No bg key at all — that is how a Lua colorscheme is transparent; there is
  -- no "none" color to assign.
  hi('Normal', { fg = P.fg })
end

hi('Cursor', { fg = P.bg, bg = P.accent })
hi('CursorLine', { bg = P.bgRaised })
hi('CursorLineNr', { fg = P.fg, bold = true })
-- Line numbers recede on purpose (fgDisabled: 2.43 dark / 3.25 light) — with
-- relative numbering these are offsets you glance past, and the absolute number
-- you actually read is the selected one at full fg (ruleUsageSetsRatio).
hi('LineNr', { fg = P.fgDisabled })
-- No bg: the sign column inherits whichever canvas Normal settled on, so it
-- does not become an opaque stripe on the transparent default.
hi('SignColumn', { fg = P.fgDisabled })
hi('WinSeparator', { fg = P.border })
hi('Folded', { fg = P.fgSecondary, bg = P.bgRaised })
hi('ColorColumn', { bg = P.bgRaised })
hi('Title', { fg = P.accent, bold = true })
hi('Directory', { fg = P.steel })
hi('Conceal', { fg = P.fgDisabled })
hi('EndOfBuffer', { fg = P.fgDisabled })

-- Selection and search are surface TINTS, not saturated fills: Neovim cannot
-- force a selection foreground, so the syntax hues underneath keep whatever
-- color they had. An opaque accent slab would swamp them (comment on
-- selectionFill measures 1.39 dark / 1.65 light). CurSearch is the one that may
-- shout — it marks exactly one match, and it sets its own fg.
hi('Visual', { bg = P.bgOverlay })
hi('Search', { bg = P.bgFloat })
hi('CurSearch', { fg = P.ink, bg = P.accentFill, bold = true })
hi('IncSearch', { link = 'CurSearch' })
hi('MatchParen', { fg = P.accentBright, bold = true, underline = true, sp = P.accent })

-- ── Floating plane ───────────────────────────────────────────────────
-- Popups need an opaque fill in both variants — text renders over whatever is
-- behind them. Worth knowing before touching this: a code block inside a hover
-- doc paints syntax on bgOverlay, where comment measures 2.22 dark (3.13
-- light). Not gated by check:contrast, which scopes SURFACE to bg/ivory.
hi('NormalFloat', { fg = P.fg, bg = P.bgOverlay })
hi('FloatBorder', { fg = P.border, bg = P.bgOverlay })
hi('FloatTitle', { fg = P.accent, bg = P.bgOverlay, bold = true })
hi('Pmenu', { fg = P.fg, bg = P.bgOverlay })
hi('PmenuSel', { fg = P.ink, bg = P.accentFill, bold = true })
hi('PmenuSbar', { bg = P.bgRaised })
hi('PmenuThumb', { bg = P.borderLifted })
hi('WildMenu', { link = 'PmenuSel' })
hi('QuickFixLine', { bg = P.bgRaised })

-- ── Statusline & tabs ────────────────────────────────────────────────
-- bgOverlay so the bar reads as a band against the editor canvas, not a seam.
hi('StatusLine', { fg = P.fg, bg = P.bgOverlay })
hi('StatusLineNC', { fg = P.fgSecondary, bg = P.bgRaised })
hi('TabLine', { fg = P.fgSecondary, bg = P.bgRaised })
hi('TabLineSel', { fg = P.fg, bg = P.bg, bold = true })
hi('TabLineFill', { bg = P.bgRaised })
hi('MsgArea', { fg = P.fg })
hi('ModeMsg', { fg = P.fgSecondary, bold = true })
hi('MoreMsg', { fg = P.accent })
hi('Question', { fg = P.accent })
-- urgentText, not urgent: ErrorMsg is body text in the message area, and bare
-- urgent measures 2.27:1 on dark bg. urgentText exists for exactly this
-- (ADR 0016). WarningMsg keeps attention — the palette offers no lifted
-- attention-text token, and Helix binds warning the same way.
hi('ErrorMsg', { fg = P.urgentText })
hi('WarningMsg', { fg = P.attention })

-- ── Virtual text & whitespace ────────────────────────────────────────
hi('NonText', { fg = P.fgDisabled })
hi('Whitespace', { fg = P.fgDisabled })
hi('SpecialKey', { fg = P.fgDisabled })
hi('LspInlayHint', { fg = P.fgMuted })

-- ── Syntax · $roles.syntax ───────────────────────────────────────────
-- Vim's "preferred groups", all defined rather than left to the built-in
-- defaults `highlight clear` restores. Their documented children (Number,
-- Boolean, Conditional, Repeat, StorageClass, …) default-link here, so the
-- cascade carries them without a line each.
hi('Comment', { fg = P.fgMuted })
hi('Constant', { fg = P.attentionAlt })
hi('String', { fg = P.successBright })
hi('Identifier', { fg = P.fg })
hi('Function', { fg = P.accent })
hi('Statement', { fg = P.brandPurpleBright })
hi('Keyword', { fg = P.brandPurpleBright })
hi('Operator', { fg = P.fgMuted })
hi('PreProc', { fg = P.brandPurpleBright })
hi('Type', { fg = P.accentBright })
hi('Special', { fg = P.attentionAlt })
hi('Delimiter', { fg = P.fgMuted })
hi('Underlined', { fg = P.accent, underline = true })
hi('Error', { fg = P.urgentBright })
-- The one place a fill is right: TODO is a marker, not prose. attentionFill
-- pairs with ink at 5.09:1 dark / 8.49:1 light ($notes.attentionFill).
hi('Todo', { fg = P.ink, bg = P.attentionFill, bold = true })

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
-- `or`, `in`, `not` — operators wearing a keyword's spelling.
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

hi('@variable.parameter', { fg = P.steel, italic = true })
-- self / this — a keyword wearing a variable's spelling.
hi('@variable.builtin', { fg = P.brandPurpleBright, italic = true })
hi('@function.macro', { fg = P.brandPurpleBright })
hi('@module', { fg = P.cyan })
-- @namespace is the pre-0.10 spelling of @module; both ship because a pinned
-- older parser set still emits it.
hi('@namespace', { fg = P.cyan })
-- Neovim has no legacy Tag group to link to, so tag takes an explicit fg.
-- Attributes read as tag, the same call Helix and the tmTheme emitter make.
hi('@tag', { fg = P.urgentBright })
hi('@tag.attribute', { fg = P.urgentBright })
hi('@attribute', { fg = P.urgentBright })

-- ── Markup (markdown, docs) ──────────────────────────────────────────
hi('@markup.heading', { link = 'Title' })
hi('@markup.strong', { fg = P.fg, bold = true })
hi('@markup.italic', { fg = P.fg, italic = true })
hi('@markup.strikethrough', { strikethrough = true })
hi('@markup.raw', { link = 'String' })
hi('@markup.link.url', { fg = P.accent, underline = true })
hi('@markup.link.label', { fg = P.accent })
hi('@markup.quote', { fg = P.fgSecondary, italic = true })

-- ── Diagnostics ──────────────────────────────────────────────────────
-- info=cyan / hint=fgMuted follows Helix rather than VS Code's steel pair:
-- Neovim is a terminal editor on the same canvas, and cross-editor agreement
-- there is the point.
hi('DiagnosticError', { fg = P.urgent })
hi('DiagnosticWarn', { fg = P.attention })
hi('DiagnosticInfo', { fg = P.cyan })
hi('DiagnosticHint', { fg = P.fgMuted })
hi('DiagnosticOk', { fg = P.success })
-- An undercurl carries severity without recoloring the code underneath.
hi('DiagnosticUnderlineError', { undercurl = true, sp = P.urgent })
hi('DiagnosticUnderlineWarn', { undercurl = true, sp = P.attention })
hi('DiagnosticUnderlineInfo', { undercurl = true, sp = P.cyan })
hi('DiagnosticUnderlineHint', { undercurl = true, sp = P.fgMuted })
hi('DiagnosticUnderlineOk', { undercurl = true, sp = P.success })
hi('DiagnosticUnnecessary', { fg = P.fgDisabled })
-- The only place the `invalid` role lands besides Error.
hi('DiagnosticDeprecated', { fg = P.urgentBright, strikethrough = true })

-- ── Diff ─────────────────────────────────────────────────────────────
-- Foreground, not the diffAddBg/diffDelBg line fills VS Code uses: on the
-- transparent default a painted line would be the only opaque band on the
-- canvas. Same call as Helix's diff.plus/minus/delta, and it is also what
-- gitsigns wants for gutter signs.
hi('DiffAdd', { fg = P.success })
hi('DiffChange', { fg = P.attention })
hi('DiffDelete', { fg = P.urgent })
hi('DiffText', { fg = P.urgentBright, bold = true })
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
  vim.g.terminal_color_0 = P.bg
  vim.g.terminal_color_8 = P.fgDisabled
else
  vim.g.terminal_color_0 = P.ansiBlack
  vim.g.terminal_color_8 = P.ansiBrightBlack
end

vim.g.terminal_color_1 = P.urgent
vim.g.terminal_color_2 = P.success
vim.g.terminal_color_3 = P.accent
-- Invariant: slots 4 and 12 must be a brightness pair on the same hue.
-- Markdown renderers emit bright-blue for inline code; sibling hues make it
-- render a visibly different color than the text around it. steelBright in 4
-- and steel in 12 is not a transposition: `steel` is the LIGHTER of the two
-- on dark (#b8cad4 vs #9fb6c4), because `*Bright` names a role, not a
-- lightness direction. Ghostty ships the same pairing.
vim.g.terminal_color_4 = P.steelBright
vim.g.terminal_color_5 = P.brandPurple
vim.g.terminal_color_6 = P.cyan
vim.g.terminal_color_7 = P.fg
vim.g.terminal_color_9 = P.urgentBright
vim.g.terminal_color_10 = P.successBright
vim.g.terminal_color_11 = P.accentBright
vim.g.terminal_color_12 = P.steel
vim.g.terminal_color_13 = P.brandPurpleBright
vim.g.terminal_color_14 = P.cyanBright
-- The one slot with no single token: ivory IS the light canvas, so bright
-- white has to flip to fg there or vanish (Ghostty makes the same flip).
vim.g.terminal_color_15 = vim.o.background == 'light' and P.fg or P.ivory
