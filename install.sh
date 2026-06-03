#!/usr/bin/env bash
# Installs Artificer themes for VS Code, Ghostty, Claude Code, tmux, gitmux, and Obsidian.
#
# Default mode: symlink. Edits to files in this repo propagate live —
# reload the app and the change shows up. Use --copy for one-shot copies
# if you want the installed theme to be independent of the repo.
#
# Existing non-symlink files at the target paths are backed up to
# <path>.bak.<timestamp> before being replaced. Existing symlinks are
# overwritten silently — re-running the script is idempotent.
#
# Obsidian vault path resolution: $ARTIFICER_OBSIDIAN_VAULT > ~/Documents/Obsidian.
# Skipped (with a warning) if no vault is found.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEMES="$REPO/themes"
COMMANDS="$REPO/commands"

VSCODE_EXT="$HOME/.vscode/extensions/cameron.artificer-theme-0.1.0"
GHOSTTY_DIR="$HOME/.config/ghostty/themes"
CLAUDE_DIR="$HOME/.claude/themes"
CLAUDE_COMMANDS_DIR="$HOME/.claude/commands"
TMUX_DIR="$HOME/.config/tmux"
GITMUX_DIR="$HOME/.config/tmux"
OBSIDIAN_VAULT="${ARTIFICER_OBSIDIAN_VAULT:-$HOME/Documents/Obsidian}"

mode="symlink"

usage() {
  cat <<'EOF'
install.sh — install Artificer themes

USAGE
  ./install.sh           Symlink themes (default; edits propagate live)
  ./install.sh --copy    Copy themes (independent of repo)
  ./install.sh --verify  Check installed themes are current
  ./install.sh --help    Show this message

TARGETS
  VS Code      ~/.vscode/extensions/cameron.artificer-theme-0.1.0
  Ghostty      ~/.config/ghostty/themes/{artificer-dark,artificer-light}
  Claude Code  ~/.claude/themes/{artificer-dark,artificer-light}.json
               ~/.claude/themes/{theme.schema.json,THEME-REFERENCE.md}
  Commands     ~/.claude/commands/*.md             (from repo's commands/)
  tmux         ~/.config/tmux/artificer-{dark,light}.conf
  gitmux       ~/.config/tmux/gitmux.yml
  Obsidian     <vault>/.obsidian/themes/Artificer/   (vault from
               $ARTIFICER_OBSIDIAN_VAULT or ~/Documents/Obsidian)

After install: reload VS Code, restart Ghostty (or cmd+shift+,), pick
"Artificer Dark" / "Artificer Light" from /theme inside Claude Code,
and enable Artificer in Obsidian → Settings → Appearance → Themes.
EOF
}

case "${1:-}" in
  --copy) mode="copy" ;;
  --verify) mode="verify" ;;
  --help|-h) usage; exit 0 ;;
  "") ;;
  *) echo "Unknown flag: $1" >&2; usage >&2; exit 2 ;;
esac

verify_target() {
  local label="$1" src="$2" dst="$3"
  if [[ ! -e "$dst" ]]; then
    echo "  MISSING  $dst"
    return 1
  elif [[ -L "$dst" ]]; then
    local actual
    actual="$(readlink "$dst")"
    if [[ "$actual" == "$src" ]]; then
      echo "  ok       $dst"
    else
      echo "  STALE    $dst -> $actual (expected $src)"
      return 1
    fi
  else
    if diff -q "$src" "$dst" >/dev/null 2>&1; then
      echo "  ok       $dst (copy, matches source)"
    else
      echo "  STALE    $dst (copy, differs from source)"
      return 1
    fi
  fi
}

if [[ "$mode" == "verify" ]]; then
  echo "Verifying installed themes..."
  fails=0

  echo "==> VS Code"
  verify_target "vscode" "$THEMES/vscode" "$VSCODE_EXT" || ((fails++))

  echo "==> Ghostty"
  verify_target "ghostty-dark" "$THEMES/ghostty/artificer-dark" "$GHOSTTY_DIR/artificer-dark" || ((fails++))
  verify_target "ghostty-light" "$THEMES/ghostty/artificer-light" "$GHOSTTY_DIR/artificer-light" || ((fails++))

  echo "==> Claude Code"
  verify_target "cc-dark" "$THEMES/claude-code/artificer-dark.json" "$CLAUDE_DIR/artificer-dark.json" || ((fails++))
  verify_target "cc-light" "$THEMES/claude-code/artificer-light.json" "$CLAUDE_DIR/artificer-light.json" || ((fails++))

  echo "==> tmux"
  verify_target "tmux-dark" "$THEMES/tmux/artificer-dark.conf" "$TMUX_DIR/artificer-dark.conf" || ((fails++))
  verify_target "tmux-light" "$THEMES/tmux/artificer-light.conf" "$TMUX_DIR/artificer-light.conf" || ((fails++))

  echo "==> gitmux"
  verify_target "gitmux" "$THEMES/gitmux/artificer.yml" "$GITMUX_DIR/gitmux.yml" || ((fails++))

  echo "==> Obsidian"
  if [[ -d "$OBSIDIAN_VAULT/.obsidian" ]]; then
    verify_target "obsidian" "$THEMES/obsidian/Artificer" "$OBSIDIAN_VAULT/.obsidian/themes/Artificer" || ((fails++))
  else
    echo "  skip    no vault at $OBSIDIAN_VAULT"
  fi

  if ((fails > 0)); then
    echo ""
    echo "$fails target(s) stale or missing. Run ./install.sh to fix."
    exit 1
  else
    echo ""
    echo "All targets current."
  fi
  exit 0
fi

place() {
  local src="$1" dst="$2"

  if [[ -L "$dst" ]]; then
    rm "$dst"
  elif [[ -e "$dst" ]]; then
    local bak="$dst.bak.$(date +%Y%m%d-%H%M%S)"
    echo "  backup  $dst -> $bak"
    mv "$dst" "$bak"
  fi

  if [[ "$mode" == "symlink" ]]; then
    ln -s "$src" "$dst"
    echo "  link    $dst -> $src"
  else
    if [[ -d "$src" ]]; then
      cp -R "$src" "$dst"
    else
      cp "$src" "$dst"
    fi
    echo "  copy    $dst"
  fi
}

echo "==> VS Code"
mkdir -p "$(dirname "$VSCODE_EXT")"
place "$THEMES/vscode" "$VSCODE_EXT"

echo "==> Ghostty"
mkdir -p "$GHOSTTY_DIR"
place "$THEMES/ghostty/artificer-dark"  "$GHOSTTY_DIR/artificer-dark"
place "$THEMES/ghostty/artificer-light" "$GHOSTTY_DIR/artificer-light"

echo "==> Claude Code"
mkdir -p "$CLAUDE_DIR"
place "$THEMES/claude-code/artificer-dark.json"  "$CLAUDE_DIR/artificer-dark.json"
place "$THEMES/claude-code/artificer-light.json" "$CLAUDE_DIR/artificer-light.json"
place "$THEMES/claude-code/theme.schema.json"    "$CLAUDE_DIR/theme.schema.json"
place "$THEMES/claude-code/THEME-REFERENCE.md"   "$CLAUDE_DIR/THEME-REFERENCE.md"

echo "==> Claude Code commands"
if [[ -d "$COMMANDS" ]]; then
  mkdir -p "$CLAUDE_COMMANDS_DIR"
  for cmd in "$COMMANDS"/*.md; do
    [[ -e "$cmd" ]] || continue
    place "$cmd" "$CLAUDE_COMMANDS_DIR/$(basename "$cmd")"
  done
else
  echo "  skip    no commands/ directory in repo"
fi

echo "==> tmux"
mkdir -p "$TMUX_DIR"
place "$THEMES/tmux/artificer-dark.conf"  "$TMUX_DIR/artificer-dark.conf"
place "$THEMES/tmux/artificer-light.conf" "$TMUX_DIR/artificer-light.conf"

echo "==> gitmux"
mkdir -p "$GITMUX_DIR"
place "$THEMES/gitmux/artificer.yml" "$GITMUX_DIR/gitmux.yml"

echo "==> Obsidian"
if [[ -d "$OBSIDIAN_VAULT/.obsidian" ]]; then
  mkdir -p "$OBSIDIAN_VAULT/.obsidian/themes"
  place "$THEMES/obsidian/Artificer" "$OBSIDIAN_VAULT/.obsidian/themes/Artificer"
else
  echo "  skip    no Obsidian vault at $OBSIDIAN_VAULT"
  echo "          set ARTIFICER_OBSIDIAN_VAULT to override, or skip Obsidian."
fi

cat <<'EOF'

Done. Activate:
  VS Code     reload window, pick from Cmd+K Cmd+T
  Ghostty     set 'theme = artificer-dark' in ~/.config/ghostty/config
              (or 'theme = light:artificer-light,dark:artificer-dark')
              reload with cmd+shift+,
  Claude Code /theme inside any session, or set "theme" in ~/.claude/settings.json
  Commands    /<command-name> inside any Claude Code session
  tmux        add 'source-file ~/.config/tmux/artificer-dark.conf' to ~/.tmux.conf
  gitmux      already referenced by gitmux.yml path convention
  Obsidian    Settings → Appearance → Themes → Artificer
EOF
