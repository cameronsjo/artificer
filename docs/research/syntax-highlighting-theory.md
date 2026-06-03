# Syntax highlighting theory — TextMate to Treesitter to semantic tokens

> Syntax highlighting has evolved from regex-based TextMate scopes through parse-tree-aware Treesitter to LSP-driven semantic tokens, each layer addressing a previous generation's blindness to language structure. Understanding this lineage explains why durable modern themes layer all three, and why italics, bold, and underline remain an underexploited semantic channel.

**Date:** 2026-05-18
**Lane:** 3 (research)

---

## Historical lineage — TextMate's tmLanguage scopes (early 2000s)

TextMate (released 2004) introduced `tmLanguage` — an XML-based grammar format using named regular expressions to tokenize code into hierarchical scopes. A scope like `comment.line.double-slash.js` told a theme "this is a double-slash comment in JavaScript." The genius wasn't the regex engine; it was the scope *naming convention*.

TextMate's scopes are dot-separated paths that grow more specific left-to-right. The root categories — `comment`, `string`, `keyword`, `storage`, `entity`, `constant`, `meta`, `invalid`, `variable`, `punctuation`, `markup` — became a shared vocabulary across editors. A theme written for TextMate scopes could port to Sublime Text, Atom, VS Code, and dozens of others without rewriting.

This portability was economic gold. A theme author invests effort once; the theme ships to every editor at zero marginal cost. Themes became *more valuable than the editors themselves* — Monokai, released in 2006, outlived the original TextMate's development pace and became the industry standard. By 2010, Sublime Text and Atom had adopted TextMate grammars wholesale. VS Code shipped TextMate grammar support as the foundation layer in 2015. Today, Cursor, Zed, and most other editors still use TextMate scopes as their baseline highlighting layer.

The trade-off: TextMate grammars are **context-blind**. They match regex patterns, not parse trees. A regex can't distinguish a variable declaration from a variable use. It can't know whether `foo()` is calling a method, a local function, or an imported symbol. This limitation shaped decades of theme design — every theme learned to work with insufficient information, using color saturation and font style as proxies for semantic meaning.

## Scope naming conventions

The TextMate scope hierarchy follows a strict convention: `source.language` or `text.markup.language` at the root, with increasingly specific branches. A JavaScript variable inside an object destructuring gets a scope like `meta.object-binding.js > variable.other.readwrite.js`, encoding both location (inside object binding) and semantic role (readwrite variable).

Themes don't target every leaf scope — there are thousands. Instead, they target *middle layers*. A theme rule for `variable.other.js` catches all "other" variables in JavaScript regardless of context. A rule for `meta.object-binding.js variable` catches variables specifically within destructuring. This hierarchical targeting lets theme authors write 20–30 rules and have them cascade across thousands of scopes.

The 11 root categories create broad groupings that language designers reuse:

- **`comment`** — single-line, block, documentation
- **`string`** — double-quoted, single-quoted, template, regex
- **`keyword`** — language keywords: `if`, `class`, `return`
- **`storage`** — type keywords: `int`, `const`, `var`, `function`
- **`entity`** — names with semantic weight: function names, class names, tag names
- **`constant`** — `true`, `false`, `nil`, numeric literals, language constants
- **`variable`** — local/global variables, parameters, properties
- **`meta`** — structural groupings: imports, function signatures, object literals
- **`invalid`** — syntax errors
- **`markup`** — for text formats (Markdown, HTML, XML)
- **`punctuation`** — delimiters, operators, braces

Most themes target 5–8 of these roots, leaving the rest to cascade from parent rules. This convention explains why a single theme can partially support dozens of languages: the scopes are designed to be reused.

The tension: broad scopes (targeting `keyword` everywhere) are portable but crude. Specific scopes (targeting `keyword.control.flow.js`) are precise but fragile — if a language designer uses `keyword.control` instead, the rule misses. Durable themes learn to target middle layers, betting that the most common naming patterns are stable.

## Treesitter — the parse-tree revolution

In 2018, Max Brunsfeld at GitHub (then maintaining Atom) released Tree-sitter, a parsing library that generates syntax trees instead of token streams. Instead of regex matching character-by-character, Tree-sitter builds a tree representing the code's structure: a program contains statements, statements contain expressions, expressions contain variables. This tree can be *queried*.

The distinction is fundamental. A regex-based highlighter for JavaScript knows `foo()` matches the pattern `identifier ( args )`. It doesn't know whether `foo` is a local, a parameter, a method, or an import. A Tree-sitter parse tree knows — it has a binding for `foo`, knows its declaration site, knows its scope. A query like "highlight all variable references that shadow a parameter" becomes possible.

Regex grammars fail on three fronts:

1. **Multiline context.** A comment spanning 50 lines breaks regex state machines. Tree-sitter parses the whole file into one tree.
2. **Error recovery.** When code is incomplete (the developer is typing), regex engines hit backtracking walls. Tree-sitter includes error nodes — partial subtrees representing what *would* parse if the code were complete. Editors stay responsive.
3. **Incremental update.** Editing one line in a 10,000-line file re-parses the whole file with regex grammars. Tree-sitter updates only the affected subtree in milliseconds.

Adoption accelerated after 2020. Neovim integrated Tree-sitter for highlighting and code navigation. Helix (released 2021) used Tree-sitter as the foundation. GitHub's Zed editor (2023) was built on Tree-sitter. By 2024, VS Code began shipping Tree-sitter via extensions, and theme authors started writing query-based highlighting rules alongside TextMate scopes.

The trade-off: each language needs a per-language grammar. TextMate grammars are often ad-hoc regex collections that "work well enough." Tree-sitter grammars must be carefully engineered to produce correct parse trees. Fewer languages have first-class Tree-sitter support than TextMate support. But for major languages (JavaScript, Python, Rust, Go, C, C++), Tree-sitter grammars are now the standard, and they're only getting more complete.

## LSP semantic tokens — language-aware highlighting

The Language Server Protocol, drafted by Microsoft in 2016, defined a standard way for a language server (a process that understands the language deeply — type checker, symbol resolver, formatter) to communicate with an editor. One capability: semantic tokens.

When you open a file, VS Code can ask the language server: "For every token in this file, tell me its type (variable, parameter, class, namespace) and modifiers (readonly, static, deprecated, declaration)." The server responds with a list of ranges and classifications. This is fundamentally different from syntax highlighting: it's based on *semantic analysis*, not pattern matching.

A semantic token request looks like: `tokens[0] = (line 5, char 12, length 3, type='variable', modifiers=['readonly'])`. The language server has parsed the whole project, resolved imports, built symbol tables. It *knows* that `foo` at line 5 is a read-only variable, even if no regex could figure that out.

VS Code's standard semantic token types include roughly 20 categories: `namespace`, `class`, `enum`, `interface`, `function`, `variable`, `parameter`, `property`, `decorator`, `event`, `type`, `keyword`, `comment`, `string`, `number`, and others. Each can carry modifiers: `declaration`, `readonly`, `static`, `deprecated`, `async`, `modification`, `documentation`, and more.

Why this matters: a TextMate grammar can't distinguish a class declaration from a class reference. Tree-sitter can, via queries. But LSP semantic tokens *know* — the language server has resolved type information that's invisible to the parser. A TypeScript server knows `User` is a class, `UserService` is a service, and `user` is an instance. It can style each differently.

## Modern theme layering — how durable themes handle all three

Catppuccin, Tokyo Night, Rosé Pine, and other modern themes ship three layers of styling rules:

1. **`tokenColors`** — TextMate scope rules for regex-based highlighting (fallback for all editors and all languages)
2. **`semanticTokenColors`** — LSP semantic token rules for language servers that provide them (VS Code, Helix, Zed)
3. **Tree-sitter query overrides** (for editors like Neovim) — via editor-specific theme formats

This layering ensures the theme works everywhere: an editor without semantic token support falls back to TextMate scopes. An editor with no language server falls back further to regex grammars. The theme gracefully degrades.

The same theme file can define both `tokenColors: { "string": {...} }` (catch all strings via TextMate scope) and `semanticTokenColors: { "string:regex": {...} }` (override regex strings specifically when the language server provides semantic data). For users with full LSP support, the semantic layer wins. For older editors, the TextMate layer catches the highlights.

This pattern explains why theme adoption is sticky. Once a theme works across VS Code, Sublime, Atom, and a dozen other editors, users rely on it. A theme has value outside any single editor ecosystem — which is why Monokai, Solarized, and Dracula are still in widespread use 15+ years later.

## Italics, bold, underline conventions

Monokai (2006) made italics famous: keywords in *italic* green, a visual flourish that became the theme's signature. Solarized (2011) used italics for comments — a de-emphasis technique that lets comments recede without going grey or becoming unreadable. The font caveat arrived quietly: many editors shipped monospace fonts that lacked italic glyphs. Fira Code didn't add italic support until v3 (2021). JetBrains Mono skipped italics entirely until pressure from theme authors. Fonts like Comic Code have no italic form at all.

Italics work for two roles: **de-emphasis** (comments, whitespace) and **distinction** (keywords, declarations). The key is: italics don't reduce readability like color desaturation does. A grey `#666` comment is hard to scan. A slanted comment at full color is still scannable — the slant is a visual cue without losing contrast.

Modern themes use italics as a *third semantic channel* alongside color and boldness:

- **Color** — category (type, variable, constant, comment)
- **Bold** — weight/importance (declaration, definition, emphasis)
- **Italic** — style/role (parameter, deprecation, documentation, comment)

Emerging conventions from semantic-token-aware themes:

- **Italic for parameters** — distinguishes function parameters from local variables
- **Italic for comments** — de-emphasis without losing contrast
- **Bold for declarations** — `const x = ...`, `class Foo:`, `function bar()`
- **Bold + italic for deprecated** — signals "this is changing"
- **Underline for unresolved references** — `foo` is undefined

The caveat remains binding: a theme targeting users who might not have italic-capable fonts must make italics optional or test across fonts. The `fontStyle: "italic"` rule in VS Code themes is straightforward, but it assumes the user's font supports it.

## The "rainbow vs subdued" debate

Monokai era (2006–2014) pushed saturation everywhere: bright magenta for keywords, bright cyan for strings, bright green for comments. The visual theory: more color means more information. The visual outcome: syntax soup — everything screaming, nothing standing out.

Dmitry Tonsky's essay *"I am sorry, but everyone is getting syntax highlighting wrong"* crystallized the counter-argument: **if everything is highlighted, nothing is highlighted**. The human eye adapts to high-saturation chaos and considers it a new norm — contrast is lost.

Minimalist themes (Nord, 2016; Catppuccin, 2021; Rosé Pine, 2021) took the opposite stance: desaturate everything except critical elements. Nord uses a muted blue-grey palette with touches of frost-blue and snow-white for accents. Catppuccin uses pastel, low-saturation colors. The visual theory: restraint creates signal. The visual outcome: critical code elements pop.

Tonsky's specific recommendations:

- Use only 3–4 colors, memorable without conscious effort.
- Highlight only elements that appear *infrequently*: constants, top-level definitions, uncommon keywords.
- Don't highlight *ubiquitous* elements: variable names, function calls, common keywords like `if` and `return`.
- Brighten comments (yellow, for example) instead of greying them out — good documentation has real semantic value.
- Use background color on light themes to achieve vibrant accents without contrast loss.

Current consensus: subdued palettes win for sustained reading (code review, debugging, long sessions). High-saturation themes still have use for initial scanning of unfamiliar codebases (quick orientation in a new project). The trade-off is real, not one-sided — but the saturation era is clearly over.

Adoption data supports this: the most-downloaded VS Code themes in 2024 (Catppuccin, Dracula, Nord variants, Tokyo Night) are all subdued-palette themes. Monokai, still iconic, is less universal than it once was — its variants tend toward the muted side (Monokai Pro toned down from the original).

## VS Code's theming model — practical bits

VS Code ships three layers of theming, each with different entry points:

**Layer 1: `tokenColors`** — TextMate scope rules. Define a rule like:

```json
{
  "scope": "comment.line",
  "settings": {
    "foreground": "#888",
    "fontStyle": "italic"
  }
}
```

This catches all line comments across all languages. The `fontStyle` property accepts `"italic"`, `"bold"`, `"underline"`, `"strikethrough"`, and combinations (e.g., `"bold italic"`).

**Layer 2: `semanticTokenColors`** — LSP token rules. Define a rule like:

```json
{
  "variable.readonly:declaration": {
    "foreground": "#4FC1FF",
    "fontStyle": "bold"
  }
}
```

This targets semantic tokens of type `variable` with modifiers `readonly` and `declaration`. Syntax: `type:modifier1:modifier2...`. If the language server provides semantic tokens, this rule takes precedence over `tokenColors`.

**Layer 3: `colors`** — General editor colors (background, foreground, UI chrome, selection, breadcrumbs, minimap). Less relevant to code highlighting but critical for editor feel.

**Debugging which rule is winning.** VS Code has a Scope Inspector. Press `Cmd+Shift+P` on macOS (or `Ctrl+Shift+P` on Linux/Windows), type "Inspect Scope," and hover over code. The inspector shows the TextMate scopes at the cursor, the semantic tokens (if a language server is active), and which theme rules match. This is the fastest way to debug why highlighting looks wrong.

**Common gotchas:**

- A semantic token rule wins over a TextMate rule. If both define a color for the same element, semantic tokens take precedence.
- Scope names vary by language. `punctuation.definition.string.begin.js` vs `punctuation.definition.string.begin.py` — if you target only `.js`, Python won't match.
- Modifiers are optional. A token can have zero modifiers, one, or many. A rule for `variable.readonly` matches readonly variables; a rule for `variable` matches all variables.
- `fontStyle` is cumulative within a rule. `"bold italic"` combines both. But it *overrides* completely — if a parent rule set italic and a child rule sets only bold, the italic is lost. Write explicit combinations.

**Testing across languages.** Durable themes test at least three languages — Python, JavaScript, and a compiled language like Rust or C — to catch scope-fragmentation bugs. A rule that works in Python's TextMate grammar may not exist in JavaScript's grammar. Themes that only test one language often ship partial highlighting.

---

## TL;DR for a theme designer auditing VS Code grammar mappings

1. **TextMate scopes are the fallback everywhere; semantic tokens (if the language server provides them) take precedence.** Test by opening the Scope Inspector — it tells you which rule is firing. Define both `tokenColors` for coverage and `semanticTokenColors` for overrides on languages with servers.

2. **Italics, bold, and underline are underexploited semantic channels.** Modern themes should treat `fontStyle` as a third dimension alongside color: italics for parameters/documentation, bold for declarations, combinations for deprecation warnings. This requires testing with fonts that support italics (JetBrains Mono, Fira Code 3+).

3. **Subdued palettes (3–5 colors) beat saturation for sustained reading; test across Python, JavaScript, and a compiled language to catch scope mismatches.** Use the Scope Inspector to verify that every language's grammar is being hit by intended rules, and define semantic token overrides for types like `variable:declaration` and `variable:readonly` to handle the information TextMate scopes can't express.

---

## Sources

- [TextMate Language Grammars Manual](https://manual.macromates.com/en/language_grammars) — foundational TextMate scope reference
- [TextMate Scope Names and Conventions](https://github.com/dunstontc/textmate/blob/master/scopes.md) — detailed scope hierarchy and naming patterns
- [VS Code Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide) — TextMate scopes in VS Code
- [VS Code Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide) — LSP semantic tokens in VS Code
- [Tree-Sitter Syntax Highlighting](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html) — Tree-sitter query-based highlighting
- [Syntactic vs Semantic Highlighting](https://tomassetti.me/syntactic-vs-semantic-highlighting/) — distinction between syntax and semantic approaches
- [Incremental Parsing Using Tree-sitter](https://tomassetti.me/incremental-parsing-using-tree-sitter/) — Tree-sitter incremental update performance
- [Dmitry Tonsky: "I am sorry, but everyone is getting syntax highlighting wrong"](https://tonsky.me/blog/syntax-highlighting/) — minimalist color theory and the saturation debate
- [Monokai Pro](https://monokai.pro/) — the iconic theme (2006 original, modern variants)
