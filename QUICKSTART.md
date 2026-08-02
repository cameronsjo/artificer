# QUICKSTART — Artificer

From "I have the files" to a working, themed button. ~5 minutes.

**Artificer is a tool/document design system** — dark-first, monospace-first,
burnished. Great for dashboards, consoles, editors, docs. **Not** for
marketing/landing pages (wrong system — use something else).

---

## 1 · Pick an install path

| | Path | When |
|---|---|---|
| **A** | **Vendor the files** — copy `src/artificer.css` (+ the JS you need) into your project, link them. | Most apps. You control versioning. |
| **B** | **Inline** — paste the contents of `artificer.css` into a `<style>` block. | Chat artifacts / single-file HTML with no file system. |
| **C** | **Tailwind** — point `tailwind.config.js` at `framework-adapters/tailwind.config.js` and read tokens from `tokens.json`. | You're already on Tailwind. |

You need, at minimum: **`artificer.css`**. Add `artificer-theme.js` (toggle),
`artificer-icons.js` (icons), `artificer-whimsy.css`+`.js` (opt-in fun),
`print.css` (paper) as needed.

---

## 2 · Minimal working page (copy this)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1, viewport-fit=cover" />

  <!-- Theme bootstrap — MUST be first, BEFORE any CSS. Sets data-theme before
       first paint so a dark page never flashes light (FOUC). The deferred
       artificer-theme.js alone is too late. Mirrors the vanilla script:
       dark-first, light only if the OS prefers light. Key is 'artificer.theme'. -->
  <script>
    (function () {
      try {
        var saved = localStorage.getItem('artificer.theme');
        var pinned = saved === 'light' || saved === 'dark';
        var prefersLight = window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: light)').matches;
        document.documentElement.setAttribute(
          'data-theme', pinned ? saved : (prefersLight ? 'light' : 'dark'));
      } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark'); /* fail-safe to dark, never light */
      }
    })();
  </script>

  <link rel="stylesheet" href="artificer.css" />
  <link rel="stylesheet" href="print.css" media="print" />
  <script src="artificer-theme.js" defer></script>
  <script src="artificer-icons.js" defer></script>
  <title>My Artificer page</title>
</head>
<body>
  <!-- Leave the button EMPTY — artificer-theme.js injects the glyph and
       narrates state (dark → light → auto) on aria-label/title. -->
  <button class="theme-toggle" data-theme-toggle aria-label="Toggle theme"></button>
  <main class="container container--md" style="padding:48px 24px">
    <h1 class="t-headline-lg">It works.</h1>
    <p class="t-body-md" style="color:var(--fg-secondary)">A first surface, themed.</p>
    <button class="btn btn--primary">Primary action</button>
  </main>
</body>
</html>
```

---

## 3 · Verify (squint test)

You should see, with **zero flash on load**:

- [ ] **Dark, slightly-warm background** (`#292c33`) — not pure black, not white.
- [ ] A **burnished-gold** primary button (`.btn--primary`).
- [ ] The **theme toggle** (top-right) cycles **dark → cream → auto** (auto
      follows the OS; gold glyph = pinned) and **persists on reload**.
- [ ] If you added icons: `<i data-icon="search"></i>` renders an inline SVG.

If all four pass, you're set.

---

## 4 · SPA / SSR notes

- **SSR / no-FOUC:** the bootstrap above is the whole trick — it runs
  synchronously in `<head>` before paint. On a server-rendered page, either
  inline it (as shown) or set `data-theme` on `<html>` from a cookie during
  SSR. **Never** ship the page with no `data-theme` — the module corrects it
  only after first paint, so the wrong-theme frame flashes. The persistence
  key is **`'artificer.theme'`** (a dot, values `dark`/`light`/`auto`) —
  vanilla JS and any React `useTheme` must agree on it.
- **SPA (nodes mount after first paint):** the JS modules hydrate once on load.
  For dynamically-mounted content call `ArtificerIcons.observe(root)` /
  `Whimsy.observe(root)` (a `MutationObserver` auto-hydrates inserted nodes), or
  in React use the `useIcons(ref)` / `useWhimsy(ref)` hooks. See CLAUDE.md
  § "Where the system lives" → SPA lifecycle.

---

## 5 · Where next

1. **`CLAUDE.md` § Hard rules** + the token cheatsheet — your actual contract
   (10 rules; tokens only; one primary CTA; anchor-word bolding; …).
2. **`live-spec/`** — open `index.html`; every page is a live, copy-able spec
   (components, forms, data display, navigation, composition, charts, whimsy).
3. **`reference/SKILL.md`** — the recipe table ("user asks for X → reach for Y").
4. **First decision on any page:** *tool surface or document surface?* It sets
   the body font (mono vs sans). CLAUDE.md § "First decision" has the table.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **Flash of light on load** | The bootstrap script isn't **first** in `<head>`, or runs after the CSS. Move it above every `<link>`. |
| **Theme doesn't persist** | The key must be **`'artificer.theme'`** (dot) everywhere — bootstrap, `useTheme`, vanilla. |
| **Icons don't render** | Load `artificer-icons.js` (it arms its own observer — SPA-mounted icons hydrate automatically). A dashed box means the name is unknown: check it against `icons.html` or `ArtificerIcons.list()` (names are Lucide-canonical). |
| **Everything is monospace** | You're on a tool surface by default. For prose, use sans (`var(--font-sans)`) — see § "First decision". |
| **Colors look off / invented** | You hardcoded a hex. Use the semantic tokens (`var(--accent)`, etc.); never raw hex. |
