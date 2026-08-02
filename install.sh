#!/usr/bin/env bash
# Installs Artificer themes for VS Code, Ghostty, Claude Code, Helix, tmux,
# gitmux, glamour, gum, and Obsidian.
#
# Default mode: copy. The installed theme is an independent file, so nothing
# else that manages these paths (chezmoi deploys most of them) is fighting a
# symlink it did not create. Use --symlink if you want repo edits to propagate
# live without reinstalling.
#
# Copy mode is CONTENT-AWARE, and that is what makes it safe to re-run: a
# target whose content already matches the repo is left alone entirely — no
# backup, no rewrite. A backup (<path>.bak.<timestamp>) is written only when
# the installed file DIFFERS, i.e. only when there is a local tweak that would
# otherwise be destroyed. So backups accumulate on real drift, never on a
# no-op re-run.
#
# --verify prints the actual diff for a drifted target (capped), so a tweak is
# visible as a change rather than merely reported as "differs". That is the
# thing that makes copy mode honest: staleness is loud, not silent.
#
# Existing symlinks (from an older --symlink install) are replaced without a
# backup — a link has no content of its own to preserve.
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
HELIX_DIR="$HOME/.config/helix/themes"
GLAMOUR_DIR="$HOME/.config/glamour"
GUM_DIR="$HOME/.config/gum"
TMUX_DIR="$HOME/.config/tmux"
GITMUX_DIR="$HOME/.config/tmux"
OBSIDIAN_VAULT="${ARTIFICER_OBSIDIAN_VAULT:-$HOME/Documents/Obsidian}"

mode="copy"

# How many lines of a drifted target's diff --verify prints before truncating.
# A drifted directory target (VS Code, Obsidian) can produce hundreds of lines,
# and burying the verdict is how a report stops being read.
DIFF_CAP=40

usage() {
  cat <<'EOF'
install.sh — install Artificer themes

USAGE
  ./install.sh            Copy themes (default; independent of the repo)
  ./install.sh --symlink  Symlink themes (repo edits propagate live)
  ./install.sh --verify   Check installed themes are current; prints the
                          diff for anything that drifted
  ./install.sh --help     Show this message

Re-running is a no-op for anything already current — copy mode compares
content first and only backs up a target it would otherwise overwrite.

TARGETS
  VS Code      ~/.vscode/extensions/cameron.artificer-theme-0.1.0
  Ghostty      ~/.config/ghostty/themes/{artificer-dark,artificer-light}
               ~/.config/ghostty/themes/Artificer {Dark,Light}   (for cmux)
  Claude Code  ~/.claude/themes/{artificer-dark,artificer-light}.json
               ~/.claude/themes/{theme.schema.json,THEME-REFERENCE.md}
  Commands     ~/.claude/commands/*.md             (from repo's commands/)
  Helix        ~/.config/helix/themes/artificer-{dark,light}.toml
               ~/.config/helix/themes/artificer-{dark,light}-opaque.toml
  glamour      ~/.config/glamour/artificer-{dark,light}.json
  gum          ~/.config/gum/artificer-{dark,light}.sh
  tmux         ~/.config/tmux/artificer-{dark,light}.conf
  gitmux       ~/.config/tmux/gitmux.yml
  Obsidian     <vault>/.obsidian/themes/Artificer/   (vault from
               $ARTIFICER_OBSIDIAN_VAULT or ~/Documents/Obsidian)

Not installed here, on purpose: cmux, lazygit, and gh-dash splice their
colors into a config file you also own, so installing the whole file would
clobber your own settings; flux installs into another repo's build output.

After install: reload VS Code, restart Ghostty (or cmd+shift+,), pick
"Artificer Dark" / "Artificer Light" from /theme inside Claude Code,
and enable Artificer in Obsidian → Settings → Appearance → Themes.
EOF
}

case "${1:-}" in
  # --copy is still accepted: it was the opt-in before copy became the default,
  # so scripts and docs in the wild still pass it. It now names the default.
  --copy) mode="copy" ;;
  --symlink) mode="symlink" ;;
  --verify) mode="verify" ;;
  --help|-h) usage; exit 0 ;;
  "") ;;
  *) echo "Unknown flag: $1" >&2; usage >&2; exit 2 ;;
esac

# True when dst already holds exactly what src would install. -r covers the
# directory targets (VS Code, Obsidian) as well as plain files.
same_content() {
  diff -rq "$1" "$2" >/dev/null 2>&1
}

# Prints a drifted target's actual diff, indented and capped at DIFF_CAP lines.
#
# Two traps this deliberately avoids:
#   - `diff` exits 1 when the inputs differ, which IS the expected path here —
#     its stdout is the payload and its exit code is not an error, so it is
#     explicitly tolerated rather than allowed to kill the script under `set -e`.
#   - the cap uses awk, not `head`. `head` closes the pipe early, which SIGPIPEs
#     the producer, and `pipefail` then promotes that to a fatal error on a
#     successful truncation. awk reads the whole stream, so there is no early
#     close to trip over.
print_capped_diff() {
  local src="$1" dst="$2" body lines
  if [[ -d "$src" ]]; then
    # Directory targets (VS Code, Obsidian) deliberately go UNLABELLED. `-L`
    # renames every file in a recursive diff to the same pair of labels, so
    # two drifted files become indistinguishable — the real paths are what
    # tell you which file moved.
    body="$(diff -ru "$src" "$dst" 2>&1 || true)"
  else
    body="$(diff -u -L repo "$src" -L installed "$dst" 2>&1 || true)"
  fi
  printf '%s\n' "$body" | awk -v cap="$DIFF_CAP" 'NR <= cap { print "    " $0 }'
  lines="$(printf '%s\n' "$body" | awk 'END { print NR }')"
  if ((lines > DIFF_CAP)); then
    printf '    (diff capped at %s of %s lines)\n' "$DIFF_CAP" "$lines"
  fi
}

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
    if same_content "$src" "$dst"; then
      echo "  ok       $dst (copy, matches source)"
    else
      echo "  STALE    $dst (copy, differs from source)"
      print_capped_diff "$src" "$dst"
      return 1
    fi
  fi
}

if [[ "$mode" == "verify" ]]; then
  echo "Verifying installed themes..."
  fails=0

  echo "==> VS Code"
  verify_target "vscode" "$THEMES/vscode" "$VSCODE_EXT" || ((++fails))

  echo "==> Ghostty"
  verify_target "ghostty-dark" "$THEMES/ghostty/artificer-dark" "$GHOSTTY_DIR/artificer-dark" || ((++fails))
  verify_target "ghostty-light" "$THEMES/ghostty/artificer-light" "$GHOSTTY_DIR/artificer-light" || ((++fails))
  verify_target "ghostty-dark-name" "$THEMES/ghostty/artificer-dark" "$GHOSTTY_DIR/Artificer Dark" || ((++fails))
  verify_target "ghostty-light-name" "$THEMES/ghostty/artificer-light" "$GHOSTTY_DIR/Artificer Light" || ((++fails))

  echo "==> Claude Code"
  verify_target "cc-dark" "$THEMES/claude-code/artificer-dark.json" "$CLAUDE_DIR/artificer-dark.json" || ((++fails))
  verify_target "cc-light" "$THEMES/claude-code/artificer-light.json" "$CLAUDE_DIR/artificer-light.json" || ((++fails))

  echo "==> Helix"
  verify_target "helix-dark" "$THEMES/helix/artificer-dark.toml" "$HELIX_DIR/artificer-dark.toml" || ((++fails))
  verify_target "helix-light" "$THEMES/helix/artificer-light.toml" "$HELIX_DIR/artificer-light.toml" || ((++fails))
  verify_target "helix-dark-opaque" "$THEMES/helix/artificer-dark-opaque.toml" "$HELIX_DIR/artificer-dark-opaque.toml" || ((++fails))
  verify_target "helix-light-opaque" "$THEMES/helix/artificer-light-opaque.toml" "$HELIX_DIR/artificer-light-opaque.toml" || ((++fails))

  echo "==> glamour"
  verify_target "glamour-dark" "$THEMES/glamour/artificer-dark.json" "$GLAMOUR_DIR/artificer-dark.json" || ((++fails))
  verify_target "glamour-light" "$THEMES/glamour/artificer-light.json" "$GLAMOUR_DIR/artificer-light.json" || ((++fails))

  echo "==> gum"
  verify_target "gum-dark" "$THEMES/gum/artificer-dark.sh" "$GUM_DIR/artificer-dark.sh" || ((++fails))
  verify_target "gum-light" "$THEMES/gum/artificer-light.sh" "$GUM_DIR/artificer-light.sh" || ((++fails))

  echo "==> tmux"
  verify_target "tmux-dark" "$THEMES/tmux/artificer-dark.conf" "$TMUX_DIR/artificer-dark.conf" || ((++fails))
  verify_target "tmux-light" "$THEMES/tmux/artificer-light.conf" "$TMUX_DIR/artificer-light.conf" || ((++fails))

  echo "==> gitmux"
  verify_target "gitmux" "$THEMES/gitmux/artificer.yml" "$GITMUX_DIR/gitmux.yml" || ((++fails))

  echo "==> Obsidian"
  if [[ -d "$OBSIDIAN_VAULT/.obsidian" ]]; then
    verify_target "obsidian" "$THEMES/obsidian/Artificer" "$OBSIDIAN_VAULT/.obsidian/themes/Artificer" || ((++fails))
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
    # A link carries no content of its own, so there is nothing a backup could
    # preserve — replace it outright.
    rm "$dst"
  elif [[ -e "$dst" ]]; then
    # The idempotency guard. Without it, copy mode backs up and rewrites on
    # every run, so a second `./install.sh` would litter a .bak per target for
    # no reason. Comparing first means a backup marks a REAL local tweak.
    if [[ "$mode" == "copy" ]] && same_content "$src" "$dst"; then
      echo "  ok      $dst (already current)"
      return 0
    fi
    local bak
    bak="$dst.bak.$(date +%Y%m%d-%H%M%S)"
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
# The same file lands twice on purpose: Ghostty itself resolves a theme by
# FILENAME ('theme = artificer-dark'), but cmux resolves the Ghostty theme it
# embeds by DISPLAY NAME ('Artificer Dark') — see themes/README.md § cmux. One
# naming scheme would break whichever consumer didn't get it.
place "$THEMES/ghostty/artificer-dark"  "$GHOSTTY_DIR/Artificer Dark"
place "$THEMES/ghostty/artificer-light" "$GHOSTTY_DIR/Artificer Light"

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

echo "==> Helix"
mkdir -p "$HELIX_DIR"
place "$THEMES/helix/artificer-dark.toml"         "$HELIX_DIR/artificer-dark.toml"
place "$THEMES/helix/artificer-light.toml"        "$HELIX_DIR/artificer-light.toml"
place "$THEMES/helix/artificer-dark-opaque.toml"  "$HELIX_DIR/artificer-dark-opaque.toml"
place "$THEMES/helix/artificer-light-opaque.toml" "$HELIX_DIR/artificer-light-opaque.toml"

echo "==> glamour"
mkdir -p "$GLAMOUR_DIR"
place "$THEMES/glamour/artificer-dark.json"  "$GLAMOUR_DIR/artificer-dark.json"
place "$THEMES/glamour/artificer-light.json" "$GLAMOUR_DIR/artificer-light.json"

echo "==> gum"
mkdir -p "$GUM_DIR"
place "$THEMES/gum/artificer-dark.sh"  "$GUM_DIR/artificer-dark.sh"
place "$THEMES/gum/artificer-light.sh" "$GUM_DIR/artificer-light.sh"

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
              cmux picks it up as "Artificer Dark" / "Artificer Light"
  Claude Code /theme inside any session, or set "theme" in ~/.claude/settings.json
  Commands    /<command-name> inside any Claude Code session
  Helix       theme = "artificer-dark" in ~/.config/helix/config.toml
              (:theme artificer-dark to reload live)
  glamour     export GLAMOUR_STYLE="$HOME/.config/glamour/artificer-dark.json"
  gum         add '. ~/.config/gum/artificer-dark.sh' to ~/.zshenv
  tmux        add 'source-file ~/.config/tmux/artificer-dark.conf' to ~/.tmux.conf
  gitmux      already referenced by gitmux.yml path convention
  Obsidian    Settings → Appearance → Themes → Artificer

These are copies, so a repo change does NOT reach them until you re-run
./install.sh. Run ./install.sh --verify to see what has drifted and how.
EOF
