# Artificer · Dark — fzf colours
# Source this from ~/.zshrc, then COMPOSE the options around it:
#
#   FZF_DEFAULT_OPTS="$ARTIFICER_FZF_COLORS${TMUX:+ --tmux 80%}"
#
# This fragment exports the colours only. Exporting FZF_DEFAULT_OPTS here would
# race your own assignment and drop one side or the other.
#
# Generated from themes/_palette.json — edit there + re-run build.mjs.
# No bg: slot, so the terminal canvas shows through (ADR 0036).

export ARTIFICER_FZF_COLORS="--color=fg:#e8e6e1,fg+:#e8e6e1,bg+:#3c4150,hl:#dbbb6f,hl+:#e3c885,pointer:#dbbb6f,marker:#4a8a5e,prompt:#b095e0,info:#5a7a8a,border:#4a4f5c,spinner:#dbbb6f,header:#7da6a4"