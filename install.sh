#!/usr/bin/env bash
# Installs Artificer themes for VS Code, Ghostty, Claude Code, Helix, Neovim,
# tmux, gitmux, glamour, gum, fzf, eza, bat, codex, and Obsidian.
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

# VS Code rejects a sideloaded extension when the directory suffix disagrees
# with the extension manifest's version. Derive the destination from the
# manifest so a routine version bump cannot silently make the theme disappear.
VSCODE_VERSION="$(sed -nE 's/^[[:space:]]*"version":[[:space:]]*"([^"]+)".*/\1/p' "$THEMES/vscode/package.json")"
if [[ -z "$VSCODE_VERSION" || "$VSCODE_VERSION" == *$'\n'* ]]; then
  echo "Could not read one VS Code extension version from $THEMES/vscode/package.json" >&2
  exit 2
fi
VSCODE_EXT="$HOME/.vscode/extensions/cameron.artificer-theme-$VSCODE_VERSION"
GHOSTTY_DIR="$HOME/.config/ghostty/themes"
CLAUDE_DIR="$HOME/.claude/themes"
CLAUDE_COMMANDS_DIR="$HOME/.claude/commands"
HELIX_DIR="$HOME/.config/helix/themes"
NVIM_DIR="$HOME/.config/nvim/colors"
GLAMOUR_DIR="$HOME/.config/glamour"
GUM_DIR="$HOME/.config/gum"
FZF_DIR="$HOME/.config/fzf"
EZA_DIR="$HOME/.config/eza"
BAT_DIR="$HOME/.config/bat/themes"
CODEX_DIR="$HOME/.codex/themes"
TMUX_DIR="$HOME/.config/tmux"
GITMUX_DIR="$HOME/.config/tmux"
OBSIDIAN_VAULT="${ARTIFICER_OBSIDIAN_VAULT:-$HOME/Documents/Obsidian}"

# Advisory activation probe for --verify: "label:file:pattern" triples. A
# target lands on disk once install.sh runs, but most targets also need a
# line added to a dotfile the user owns (source a fragment, set a theme key)
# before the install actually takes effect — install.sh cannot make that edit
# itself (it would be clobbering a config file it does not own), so this only
# REPORTS whether the activation line is present. Each pattern is drawn from
# the exact advice the install-mode footer prints below — if the footer's
# wording changes, update the matching pattern here.
#
# delta is deliberately absent: it rides bat's tmTheme registry (the footer's
# own delta line points at the [delta] section of ~/.gitconfig, a file this
# probe doesn't reach) rather than a fragment of its own, so there's no
# independent activation line for it to check.
ACTIVATIONS=(
  "helix:$HOME/.config/helix/config.toml:theme = \"artificer"
  "glamour:$HOME/.zshenv:GLAMOUR_STYLE"
  "gum:$HOME/.zshenv:gum/artificer"
  "fzf:$HOME/.zshrc:fzf/artificer"
  "eza:$HOME/.zshrc:eza/artificer"
  "bat:$HOME/.config/bat/config:theme = \"artificer"
  "codex:$HOME/.codex/config.toml:theme = \"artificer"
  # Anchored to an UNcommented source-file line — a bare "tmux/artificer"
  # substring also lives in this repo's own path (~/Projects/.../tmux/...),
  # which a looser pattern would false-match on some checkouts.
  "tmux:$HOME/.tmux.conf:^[^#]*source-file.*tmux/artificer"
  "ghostty:$HOME/.config/ghostty/config:theme = artificer"
  # Anchored to the "theme" key specifically — a bare "artificer" substring
  # false-matches any unrelated settings.json value that happens to mention
  # the word (e.g. a permissions path under ~/Projects/artificer/).
  "claude-code:$HOME/.claude/settings.json:\"theme\".*artificer"
)

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
                          diff for anything that drifted, and reports
                          whether each target's activation line is present
                          (advisory — never fails the check)
  ./install.sh --help     Show this message

Re-running is a no-op for anything already current — copy mode compares
content first and only backs up a target it would otherwise overwrite.

TARGETS
  VS Code      ~/.vscode/extensions/cameron.artificer-theme-<manifest-version>
  Ghostty      ~/.config/ghostty/themes/{artificer-dark,artificer-light}
               ~/.config/ghostty/themes/Artificer {Dark,Light}   (for cmux)
  Claude Code  ~/.claude/themes/{artificer-dark,artificer-light}.json
               ~/.claude/themes/{theme.schema.json,THEME-REFERENCE.md}
  Commands     ~/.claude/commands/*.md             (from repo's commands/)
  Helix        ~/.config/helix/themes/artificer-{dark,light}.toml
               ~/.config/helix/themes/artificer-{dark,light}-opaque.toml
  Neovim       ~/.config/nvim/colors/artificer.lua   (one file, both modes)
  glamour      ~/.config/glamour/artificer-{dark,light}.json
  gum          ~/.config/gum/artificer-{dark,light}.sh
  fzf          ~/.config/fzf/artificer-{dark,light}.sh
  eza          ~/.config/eza/artificer-{dark,light}.sh
  bat          ~/.config/bat/themes/artificer-{dark,light}.tmTheme  (also read by delta)
  codex        ~/.codex/themes/artificer-{dark,light}.tmTheme
  tmux         ~/.config/tmux/artificer-{dark,light}.conf
  gitmux       ~/.config/tmux/gitmux.yml
  Obsidian     <vault>/.obsidian/themes/Artificer/   (vault from
               $ARTIFICER_OBSIDIAN_VAULT or ~/Documents/Obsidian)

Not installed here, on purpose: cmux, lazygit, and gh-dash splice their
colors into a config file you also own, so installing the whole file would
clobber your own settings; flux installs into another repo's build output;
JetBrains is an IDE plugin, installed from the packed jar (npm run pack:jetbrains).

Chrome, Edge and Firefox are browser extensions, not config files: load them
unpacked from themes/chromium/artificer-{dark,light}/ and themes/firefox/artificer/,
or pack them for the stores with npm run pack:browser.

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
  # shellcheck disable=SC2034 # label is the caller-facing name; kept for
  # call-site readability even though this function body doesn't echo it.
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

  echo "==> Neovim"
  verify_target "neovim" "$THEMES/neovim/colors/artificer.lua" "$NVIM_DIR/artificer.lua" || ((++fails))

  echo "==> glamour"
  verify_target "glamour-dark" "$THEMES/glamour/artificer-dark.json" "$GLAMOUR_DIR/artificer-dark.json" || ((++fails))
  verify_target "glamour-light" "$THEMES/glamour/artificer-light.json" "$GLAMOUR_DIR/artificer-light.json" || ((++fails))

  echo "==> gum"
  verify_target "gum-dark" "$THEMES/gum/artificer-dark.sh" "$GUM_DIR/artificer-dark.sh" || ((++fails))
  verify_target "gum-light" "$THEMES/gum/artificer-light.sh" "$GUM_DIR/artificer-light.sh" || ((++fails))

  echo "==> fzf"
  verify_target "fzf-dark" "$THEMES/fzf/artificer-dark.sh" "$FZF_DIR/artificer-dark.sh" || ((++fails))
  verify_target "fzf-light" "$THEMES/fzf/artificer-light.sh" "$FZF_DIR/artificer-light.sh" || ((++fails))

  echo "==> eza"
  verify_target "eza-dark" "$THEMES/eza/artificer-dark.sh" "$EZA_DIR/artificer-dark.sh" || ((++fails))
  verify_target "eza-light" "$THEMES/eza/artificer-light.sh" "$EZA_DIR/artificer-light.sh" || ((++fails))

  echo "==> bat"
  verify_target "bat-dark" "$THEMES/bat/artificer-dark.tmTheme" "$BAT_DIR/artificer-dark.tmTheme" || ((++fails))
  verify_target "bat-light" "$THEMES/bat/artificer-light.tmTheme" "$BAT_DIR/artificer-light.tmTheme" || ((++fails))

  echo "==> codex"
  verify_target "codex-dark" "$THEMES/codex/artificer-dark.tmTheme" "$CODEX_DIR/artificer-dark.tmTheme" || ((++fails))
  verify_target "codex-light" "$THEMES/codex/artificer-light.tmTheme" "$CODEX_DIR/artificer-light.tmTheme" || ((++fails))

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

  echo "==> activation"
  for act_entry in "${ACTIVATIONS[@]}"; do
    act_label="${act_entry%%:*}"
    act_rest="${act_entry#*:}"
    act_file="${act_rest%%:*}"
    act_pattern="${act_rest#*:}"

    if [[ ! -f "$act_file" ]]; then
      echo "  inert    $act_label — add: $act_pattern in $act_file (file not found)"
      continue
    fi

    # "not activated yet" is the common, expected case here, not an error —
    # `|| true` keeps grep's no-match exit (1) from aborting the script under
    # `set -e`. Captured to a variable rather than piped, so there is no
    # SIGPIPE hazard for `pipefail` to promote either.
    act_hit="$(grep -E -m1 "$act_pattern" "$act_file" 2>/dev/null || true)"
    if [[ -n "$act_hit" ]]; then
      echo "  active   $act_label"
    else
      echo "  inert    $act_label — add: $act_pattern in $act_file"
    fi
  done

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

echo "==> Neovim"
# The mkdir is load-bearing on a green-field machine: ~/.config/nvim/colors is
# a brand-new subtree, and place()'s cp would fail under `set -euo pipefail`
# and abort the whole install.
mkdir -p "$NVIM_DIR"
place "$THEMES/neovim/colors/artificer.lua" "$NVIM_DIR/artificer.lua"

echo "==> glamour"
mkdir -p "$GLAMOUR_DIR"
place "$THEMES/glamour/artificer-dark.json"  "$GLAMOUR_DIR/artificer-dark.json"
place "$THEMES/glamour/artificer-light.json" "$GLAMOUR_DIR/artificer-light.json"

echo "==> gum"
mkdir -p "$GUM_DIR"
place "$THEMES/gum/artificer-dark.sh"  "$GUM_DIR/artificer-dark.sh"
place "$THEMES/gum/artificer-light.sh" "$GUM_DIR/artificer-light.sh"

echo "==> fzf"
mkdir -p "$FZF_DIR"
place "$THEMES/fzf/artificer-dark.sh"  "$FZF_DIR/artificer-dark.sh"
place "$THEMES/fzf/artificer-light.sh" "$FZF_DIR/artificer-light.sh"

echo "==> eza"
mkdir -p "$EZA_DIR"
place "$THEMES/eza/artificer-dark.sh"  "$EZA_DIR/artificer-dark.sh"
place "$THEMES/eza/artificer-light.sh" "$EZA_DIR/artificer-light.sh"

echo "==> bat"
mkdir -p "$BAT_DIR"
place "$THEMES/bat/artificer-dark.tmTheme"  "$BAT_DIR/artificer-dark.tmTheme"
place "$THEMES/bat/artificer-light.tmTheme" "$BAT_DIR/artificer-light.tmTheme"
# bat/delta (syntect) compile themes into a binary cache at install time, not
# at load time, so a fresh drop-in is invisible until this runs.
if command -v bat >/dev/null 2>&1; then
  # stdout only — stderr carries the parse error when a theme is rejected, and
  # swallowing it turns a broken plist into a bare "warn" with no reason.
  bat cache --build >/dev/null || echo "  warn    'bat cache' failed to rebuild — run it manually"
else
  echo "  skip    bat not installed — run 'bat cache' after installing it"
fi

echo "==> codex"
mkdir -p "$CODEX_DIR"
place "$THEMES/codex/artificer-dark.tmTheme"  "$CODEX_DIR/artificer-dark.tmTheme"
place "$THEMES/codex/artificer-light.tmTheme" "$CODEX_DIR/artificer-light.tmTheme"

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
  VS Code     fully quit and relaunch, then pick from Cmd+K Cmd+T
  Ghostty     set 'theme = artificer-dark' in ~/.config/ghostty/config
              (or 'theme = light:artificer-light,dark:artificer-dark')
              reload with cmd+shift+,
              cmux picks it up as "Artificer Dark" / "Artificer Light"
  Claude Code /theme inside any session, or set "theme" in ~/.claude/settings.json
  Commands    /<command-name> inside any Claude Code session
  Helix       theme = "artificer-dark" in ~/.config/helix/config.toml
              (:theme artificer-dark to reload live)
  neovim      :colorscheme artificer  (needs termguicolors; set background
              BEFORE the colorscheme, and re-run it after changing background)
  glamour     export GLAMOUR_STYLE="$HOME/.config/glamour/artificer-dark.json"
  gum         add '. ~/.config/gum/artificer-dark.sh' to ~/.zshenv
  fzf         add '. ~/.config/fzf/artificer-dark.sh' to ~/.zshrc, then compose
              FZF_DEFAULT_OPTS="$ARTIFICER_FZF_COLORS" (the fragment exports the
              colours only, so your own options survive)
  eza         add '. ~/.config/eza/artificer-dark.sh' to ~/.zshrc
  bat         --theme=artificer-dark, or 'theme = "artificer-dark"' in
              ~/.config/bat/config; confirm with 'bat --list-themes'
  delta       'syntax-theme = artificer-dark' in the [delta] section of
              ~/.gitconfig (delta reads bat's theme registry, same cache)
  codex       'theme = "artificer-dark"' under [tui] in ~/.codex/config.toml
  tmux        add 'source-file ~/.config/tmux/artificer-dark.conf' to ~/.tmux.conf
  gitmux      already referenced by gitmux.yml path convention
  Obsidian    Settings → Appearance → Themes → Artificer

These are copies, so a repo change does NOT reach them until you re-run
./install.sh. Run ./install.sh --verify to see what has drifted and how.
EOF
