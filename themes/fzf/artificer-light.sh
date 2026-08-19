# Artificer · Light — fzf colours
# Source this from ~/.zshrc, then COMPOSE the options around it:
#
#   FZF_DEFAULT_OPTS="$ARTIFICER_FZF_COLORS${TMUX:+ --tmux 80%}"
#
# This fragment exports the colours only. Exporting FZF_DEFAULT_OPTS here would
# race your own assignment and drop one side or the other.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.
# No bg: slot, so the terminal canvas shows through (ADR 0036).

export ARTIFICER_FZF_COLORS="--color=fg:#20203e,fg+:#20203e,bg+:#e4d4b0,hl:#7a5a10,hl+:#866010,pointer:#7a5a10,marker:#2a5a3a,prompt:#5a35b0,info:#5a7a8a,border:#cbb88a,spinner:#7a5a10,header:#3a6a68"