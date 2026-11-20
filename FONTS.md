# Fonts

Artificer uses three free, OFL-licensed font families. All are commercial-use safe. The CSS references them by name; you ship them however your project ships fonts.

| Face | Role | Weights | License | Where to get it |
|---|---|---|---|---|
| **JetBrains Mono** (with ligatures) | `--font-mono` — body face on **tool surfaces** (dashboards, terminals, data tables, settings panels). Code/identifiers/numerals everywhere — including inside documents. | 400 / 500 / 700 | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono), [official](https://www.jetbrains.com/lp/mono/), [Fontsource](https://fontsource.org/fonts/jetbrains-mono) |
| **Recursive** | `--font-interface` — labels, controls, badges, form fields, nav, tabular UI numerals. | Variable 300–1000, slant 0–15° | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/Recursive), [arrowtype/recursive](https://github.com/arrowtype/recursive), [Fontsource](https://fontsource.org/fonts/recursive) |
| **Bricolage Grotesque** | `--font-body` — document prose: `.meta`, headline/body type utilities, `.colophon`, editorial pages. | Variable 200–800, optical size 12–96 | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/Bricolage+Grotesque), [ateliertriay/bricolage](https://github.com/ateliertriay/bricolage), [Fontsource](https://fontsource.org/fonts/bricolage-grotesque) |

**Why this pair.** Owner pick (ADR 0046), chosen from a side-by-side of fifteen candidates. Recursive was drawn by Arrow Type for code-adjacent UI: its Sans Linear default sits close to JetBrains Mono in rhythm, and its figures are fixed-width out of the box, so it keeps the tabular-numeral job Quattro S did. Bricolage Grotesque gives prose more character than Quattro V did. Its optical-size axis means headlines get the tighter display cut and body text the calmer text cut, with no extra classes.

**Why two faces, not one.** The role split from ADR 0039 stands. Body prose reads `--font-body`, interface chrome reads `--font-interface`. Pick the token by what you're building, not by font name.

**What changed from iA Writer Quattro.** Both faces are variable fonts, one WOFF2 file each, so every weight is real: no faux-bold headlines (Quattro V had no bold) and no Windows weight-metadata bug (Quattro S 700). Two trade-offs: Bricolage Grotesque ships no italic, so italic prose is a synthesized slant; Recursive's italic is its slant axis (a true oblique, not a cursive italic).

> The bundled files are **Latin subsets** from Fontsource (`@fontsource-variable/recursive` `recursive-latin-standard`, axes wght + slnt; `@fontsource-variable/bricolage-grotesque` `bricolage-grotesque-latin-opsz`, axes wght + opsz). Content outside Latin falls back to the next face in the stack. Fallback chains: `'Bricolage Grotesque' → 'Source Sans 3' → system-ui → -apple-system → sans-serif` (`--font-body`) and `'Recursive' → 'Source Sans 3' → system-ui → -apple-system → sans-serif` (`--font-interface`). `--font-sans` is a legacy alias of `--font-body`, kept resolvable for consumers pinned to the old token name.

---

## Block glyphs for text art

The bundled JetBrains Mono weights are Latin subsets. A fourth file,
`src/assets/fonts/jetbrains-mono-blocks.woff2` (3.4 KB), carries **box drawing,
block elements, and geometric shapes (U+2500–25FF)** and extends the same family
by `unicode-range`, so `├──` trees, `╭─╮` boxes, `●` dot matrices and Sploot the
corgi render in JetBrains Mono instead of whatever mono the OS falls back to.
Block geometry doesn't change with weight, so one Regular-cut file is declared
under all three shipped weights. Regenerate from the upstream TTF (OFL; the
release zip on github.com/JetBrains/JetBrainsMono):

```bash
pyftsubset JetBrainsMono-Regular.ttf --unicodes='U+2500-25FF' \
  --flavor=woff2 --layout-features='' --no-hinting --desubroutinize \
  --output-file=src/assets/fonts/jetbrains-mono-blocks.woff2
```

If you self-host JetBrains Mono from Fontsource or Google Fonts instead of the
bundled files, check that your subset includes U+2500–25FF; the `latin` subsets
don't.

## Recommended — Fontsource

All three families ship on Fontsource. Use the `-variable` packages for Recursive and Bricolage Grotesque so one file covers every weight.

```sh
npm i @fontsource/jetbrains-mono @fontsource-variable/recursive @fontsource-variable/bricolage-grotesque
```

```ts
// app entry
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource-variable/recursive/standard.css';          // wght + slnt
import '@fontsource-variable/bricolage-grotesque/opsz.css';    // wght + opsz

import 'artificer/artificer.css';
```

Fontsource registers the variable families as `'Recursive Variable'` and `'Bricolage Grotesque Variable'`. Point the tokens at those names after `artificer.css`:

```css
:root {
  --font-interface: 'Recursive Variable', 'Recursive', 'Source Sans 3', system-ui, sans-serif;
  --font-body:      'Bricolage Grotesque Variable', 'Bricolage Grotesque', 'Source Sans 3', system-ui, sans-serif;
}
```

## CDN — Google Fonts

JetBrains Mono is already imported by `artificer.css` over Google Fonts. Recursive and Bricolage Grotesque are on Google Fonts too, under the exact family names the tokens use, so no token override is needed:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Recursive:slnt,wght@-15..0,300..1000&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap">
```

## Bundled WOFF2

`artificer.css` already declares both families against the bundled files in `src/assets/fonts/` (`recursive-variable.woff2`, `bricolage-grotesque-variable.woff2`). Ship that folder next to the CSS and you're done. To self-host from your own path instead:

```css
@font-face {
  font-family: 'Recursive';
  src: url('/fonts/recursive-variable.woff2') format('woff2');
  font-weight: 300 1000; font-style: oblique 0deg 15deg; font-display: swap;
}
@font-face {
  font-family: 'Bricolage Grotesque';
  src: url('/fonts/bricolage-grotesque-variable.woff2') format('woff2');
  font-weight: 200 800; font-style: normal; font-display: swap;
}
```

The weight and slant ranges matter: without them the browser treats the file as a single 400 face and synthesizes bold again. Recursive takes **one** face whose oblique range starts at 0deg, which serves upright text too.

## next/font (Next.js App Router)

All three are on `next/font/google`:

```ts
// app/fonts.ts
import { JetBrains_Mono, Recursive, Bricolage_Grotesque } from 'next/font/google';

export const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-loader' });
export const interface_ = Recursive({ subsets: ['latin'], axes: ['slnt'], variable: '--font-interface-loader' });
export const body = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-body-loader' });
```

```tsx
// app/layout.tsx
import { mono, interface_, body } from './fonts';
export default function Layout({ children }) {
  return (
    <html lang="en" className={`${mono.variable} ${interface_.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

```css
/* globals.css, after artificer.css */
:root {
  --font-mono:      var(--font-mono-loader), ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-interface: var(--font-interface-loader), 'Source Sans 3', system-ui, sans-serif;
  --font-body:      var(--font-body-loader), 'Source Sans 3', system-ui, sans-serif;
}
```

---

## Fallback behavior

`artificer.css` ships with fallback chains that produce a near-correct render even if the custom faces fail to load:

```
--font-body:      'Bricolage Grotesque', 'Source Sans 3', system-ui, -apple-system, sans-serif
--font-interface: 'Recursive', 'Source Sans 3', system-ui, -apple-system, sans-serif
```

You can ship without web fonts entirely; just don't override the variables. The system stays usable, just less distinctive.

## Obsidian theme

The Obsidian theme (`themes/obsidian/Artificer/`) keeps the previous faces (iA Writer Quattro) for now. Its fonts move in a separate change.
