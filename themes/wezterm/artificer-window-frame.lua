-- Artificer — WezTerm window_frame (the fancy tab bar + titlebar)
-- Generated from themes/_palette.json — edit there + re-run build.mjs.
--
-- Why this is separate from the colour scheme: use_fancy_tab_bar defaults to
-- true, and the fancy bar ignores [colors.tab_bar] entirely, reading these
-- window_frame keys instead. A scheme file cannot reach them at any value, so
-- the TOML deliberately emits no tab_bar block rather than one that paints
-- nothing.
--
-- Drop this next to your wezterm.lua, then:
--
--   local frame = require 'artificer-window-frame'
--   config.window_frame = frame.dark          -- or frame.light
--
-- To follow the OS, guard the appearance call — wezterm.gui is nil when the
-- MUX SERVER evaluates the config, and an unguarded call breaks config load
-- entirely rather than falling back:
--
--   local wezterm = require 'wezterm'
--   local dark = not wezterm.gui or wezterm.gui.get_appearance():find 'Dark'
--   config.window_frame = dark and frame.dark or frame.light

local M = {}

M.dark = {
  active_titlebar_bg   = '#313540',
  inactive_titlebar_bg = '#292c33',
}

M.light = {
  active_titlebar_bg   = '#eddcc0',
  inactive_titlebar_bg = '#f5ead0',
}

return M
