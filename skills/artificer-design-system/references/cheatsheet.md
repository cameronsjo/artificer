# Artificer · Cheatsheet

Token surface, utility classes, and anti-pattern → pattern transforms. Extracted from SKILL.md for progressive disclosure. Open this when you need the full surface area; SKILL.md keeps the decision tables and rules.

For the full token values (hex, AAA contrast pairings, light/dark variants), read `src/tokens.json` or `live-spec/colors.html` directly.

---

## Token cheatsheet

```
SURFACES   --bg / --bg-raised / --bg-overlay / --bg-inactive
TEXT       --fg / --fg-secondary / --fg-disabled / --border

INTERACTIVE --accent gold text (AAA) — links, focus, secondary buttons
            --accent-bright hover state
            --accent-fill gold background — SMALL controls only (buttons, badges);
                 never a selected-card/surface bg, pairs only with --on-accent

ATTENTION  --attention rose text (AAA) — "look when you can"
            --attention-fill rose background

URGENT     --urgent terracotta red text — errors, blocking
            --urgent-fill terracotta red background

SUCCESS    --success apothecary green — completed
META       --steel / --steel-fill — chrome, secondary UI

BRAND      --brand-purple / --brand-purple-fill — wordmarks, masthead, NOT semantic

TYPE       --font-mono JetBrains Mono
                · BODY FACE for tool surfaces (dashboards, terminals,
                  data tables, settings panels)
                · ALWAYS for code, identifiers, file paths, numerals —
                  including inside documents
           --font-body iA Writer Quattro V
                · BODY FACE for document surfaces (writeups, READMEs,
                  reports, design docs)
           --font-interface iA Writer Quattro S
                · Labels, controls, badges, form fields, nav —
                  on both tool AND document surfaces
                · --font-sans is a legacy alias of --font-body

           Decision rule. >3 paragraphs of running prose → document → --font-body.
           Mostly chrome around data → tool → mono body. Same project can mix.
           Anti-pattern: setting prose in mono and then overriding `.meta`,
           headings, tables back to --font-body. If you're escaping the body
           face, the body face is wrong — flip it.

SPACING    --s-xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48)
RADII      --radius-sm(4 · buttons) md(8 · cards) lg(12 · overlays only)
MOTION     --dur-instant(80) fast(160) max(300) · ease cubic-bezier(.2,.7,.3,1)
Z-INDEX    --z-{base|raised|overlay|popover|modal|toast} — six rungs, never improvise
```

---

## Utility classes

```
TYPE       .t-headline-lg .t-headline-md .t-body-lg .t-body-md
           .t-label-md .t-label-sm .t-code
           .anchor (bold anchor word) · .meta (secondary color)

BUTTONS    .btn + .btn--primary | --secondary | --ghost | --destructive
           [disabled] for inactive

CARDS      .card + .card--active | --attention | --urgent

FORMS      .field > label + .input | .select | .textarea + .hint | .error

BADGES     .badge + .badge--accent | --attention | --urgent | --success | --ghost
DOTS       .dot + .dot--accent | --attention | --urgent | --success

PANES      .pane--active (gold left border) · .pane--inactive (55% opacity, desaturated)

KBD        <kbd>⌘ ↵</kbd>
THEME      <button class="theme-toggle" data-theme-toggle><span class="dot"></span><span data-theme-label>Dark</span></button>
```

---

## Anti-patterns vs patterns

### Color competition — one primary, others demoted

```html
<!-- ANTI: three semantic colors competing -->
<div>
  <button class="btn btn--primary">Save</button>
  <button class="btn btn--destructive">Delete</button>
  <span class="badge badge--attention">2 reviews</span>
</div>

<!-- PATTERN: one primary, others demoted -->
<div>
  <button class="btn btn--primary">Save</button>
  <button class="btn btn--ghost">Delete</button>
  <span class="badge badge--ghost">2 reviews</span>
</div>
```

### Anchor words — give the eye something to grab

```html
<!-- ANTI: prose with no anchors. Nothing to scan. -->
<p>The agent finished writing the section and is now waiting for the editor to review the changes before continuing.</p>

<!-- PATTERN: 3 anchor words. Bolded path makes sense alone. -->
<p>The <b>writer agent</b> finished the section. <b>Waiting on editor</b> to review before <b>continuing</b>.</p>
```

### Form fields — persistent label, specific remediation

```html
<!-- ANTI: placeholder-only label, vague error -->
<input class="input" placeholder="API key" aria-invalid="true" />
<span class="error">Invalid input</span>

<!-- PATTERN: persistent label, specific remediation -->
<div class="field">
  <label for="k">API key</label>
  <input id="k" class="input" aria-invalid="true" />
  <span class="error">Missing <code>sk-</code> prefix. Paste the full key from console.</span>
</div>
```

### Selected card — border, not fill

```html
<!-- ANTI: --accent-fill as a large surface bg; default-colored body text fails contrast -->
<div class="card" style="background: var(--accent-fill)">
  <p>Pro: fast. Con: pricier.</p>
</div>

<!-- PATTERN: .card--active — background stays put, accent marks the edge -->
<div class="card card--active">
  <p>Pro: fast. Con: pricier.</p>
</div>
```

### List length — 5 + show more, or grouped

```html
<!-- ANTI: 12 items in a flat list -->
<ul><li>...</li>... 12 items ...</ul>

<!-- PATTERN: 5 + "show more", or grouped with labeled dividers -->
<ul><li>...</li>... 5 items ...</ul>
<button class="btn btn--ghost">Show 7 more</button>
```
