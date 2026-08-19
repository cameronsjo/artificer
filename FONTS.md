# Fonts

Artificer uses three free, OFL-licensed font faces (two typeface families). All are commercial-use safe. The CSS references them by name; you ship them however your project ships fonts.

| Face | Role | Weights | License | Where to get it |
|---|---|---|---|---|
| **JetBrains Mono** (with ligatures) | Body face on **tool surfaces** (dashboards, terminals, data tables, settings panels). Code/identifiers/numerals everywhere — including inside documents. | 400 / 500 / 700 | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono), [official](https://www.jetbrains.com/lp/mono/), [Fontsource](https://fontsource.org/fonts/jetbrains-mono) |
| **iA Writer Quattro S** | `--font-interface` — labels, controls, badges, form fields, nav, tabular UI numerals. | 400 / 700 (+ italics) | SIL OFL 1.1 | [iaolo/iA-Fonts](https://github.com/iaolo/iA-Fonts) on GitHub |
| **iA Writer Quattro V** | `--font-body` — document prose: `.meta`, headline/body type utilities, `.colophon`, editorial pages. | 400 only (+ italic) | SIL OFL 1.1 | [iaolo/iA-Fonts](https://github.com/iaolo/iA-Fonts) on GitHub |

**Why this pair.** Quattro is humanist sans designed by Bold Monday for iA, tuned to share rhythm with monospace work. It pairs with JetBrains Mono more naturally than Inter or Source Sans because they were designed to live side-by-side in the same kind of writing/code surface. Quattro also has matching italics, which Inter lacks at lower weights.

**Why two faces, not one.** iA ships Quattro as a family of role-tuned variants — S (tabular numerals, tuned for UI density) and V (slightly tighter, more contrast, tuned for reading). Artificer used to ship a third, undifferentiated "iA Writer Quattro" face alongside S and V; it was a duplicate of their own glyph set with no role of its own, so it's retired. Body prose reads V, interface chrome reads S — pick the token by what you're building (`--font-body` vs `--font-interface`), not by name.

> Quattro is **not** on Google Fonts. You self-host it. The CSS fallback chains are `'iA Writer Quattro V' → 'Iowan Old Style' → 'Charter' → 'Source Sans 3' → system-ui → -apple-system → sans-serif` (`--font-body`) and `'iA Writer Quattro S' → 'Iowan Old Style' → 'Charter' → 'Source Sans 3' → system-ui → -apple-system → sans-serif` (`--font-interface`), so the page still renders correctly if Quattro hasn't loaded. `--font-sans` is a legacy alias of `--font-body`, kept resolvable for consumers pinned to the old token name.

## Weight coverage and the Windows bold disposition

**Quattro V ships 400 (regular) only** — no bold face exists upstream. A bold body run
(`.t-headline-lg`/`.t-headline-md`, or any consumer CSS setting `font-weight: 700` on
`--font-body` text) synthesizes faux-bold in the browser, the same as any face missing a
weight. This is expected and matches how Quattro V shipped before the role split.

**Quattro S ships both 400 and 700**, so interface chrome (`.btn`, `.badge`, `.field`
labels, and the rest of `--font-interface`) gets a real bold face — on most platforms.
**On Windows, the shipped Quattro S 700 face carries an incorrect/missing `usWeightClass`
in its font metadata**, an upstream packaging defect in the vendored OFL files, not an
Artificer bug. Windows text-shaping engines that trust `usWeightClass` for weight matching
can fail to select the true bold face and fall back to synthesizing bold from the 400
weight instead — interface bold on Windows renders slightly heavier/less-refined than on
macOS/Linux.

**Disposition (owner-ruled): accept the degraded Windows bold, do not patch or fork the
font.** iA Writer Quattro's license carries a Reserved Font Name, so a binary patch
(correcting the metadata table with a tool like fontTools) could not ship under the same
family name, and a public fork would need to rename the family everywhere — a breaking
change to every consumer's `@font-face` and CSS for a cosmetic, non-blocking defect. This
follows the same reasoning as the standing RFN-fork verdict recorded in
`docs/research/forking-ia-writer-quattro-single-glyph.md`: switch the typeface first if a
defect becomes load-bearing, and reserve a private (never public) binary patch for a
defect that's actually blocking. This one isn't — the fallback (synthesized bold) is
legible and passes contrast; it just isn't the *designed* bold. See ADR 0039 for the full
ruling.

---

## Recommended — Fontsource for JetBrains Mono, direct WOFF2 for Quattro

JetBrains Mono ships on Fontsource. **Quattro does not** — neither the bare face nor S/V
have a Fontsource package (`@fontsource/ia-writers-quattro` doesn't exist; the earlier
version of this doc named a package that was never published). Self-host Quattro S and V
via direct WOFF2 download instead.

```sh
npm i @fontsource/jetbrains-mono
```

```ts
// app entry
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
// Quattro S/V: see "Direct WOFF2 download" below — no npm package exists.

import 'artificer/artificer.css';
```

## CDN — JetBrains Mono via Google Fonts

JetBrains Mono is already imported by `artificer.css` over Google Fonts — you don't need
to do anything for it. Quattro has no CDN distribution; use the direct-download path below.

## Direct WOFF2 download

The only self-hosting path for Quattro S and V. Grab both families from the same
[iaolo/iA-Fonts](https://github.com/iaolo/iA-Fonts) repo — S and V are sibling families
in the `iA Writer Quattro S/Static` and `iA Writer Quattro V/Static` directories, distinct
from the bare (undifferentiated) `iA Writer Quattro/Static` directory Artificer no longer
uses.

1. **Interface chrome (`--font-interface`) — Quattro S, both weights:** grab
   `iAWriterQuattroS-{Regular,Italic,Bold,BoldItalic}.woff2`.
2. **Body prose (`--font-body`) — Quattro V, regular only** (V has no bold upstream; see
   § Weight coverage above): grab `iAWriterQuattroV-{Regular,Italic}.woff2`.
3. Drop them in your `public/fonts/` (or wherever you serve static assets).
4. Add this `@font-face` block somewhere your CSS will see it, *before* `artificer.css`:

```css
@font-face {
  font-family: 'iA Writer Quattro S';
  src: url('/fonts/iAWriterQuattroS-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'iA Writer Quattro S';
  src: url('/fonts/iAWriterQuattroS-Italic.woff2') format('woff2');
  font-weight: 400; font-style: italic; font-display: swap;
}
@font-face {
  font-family: 'iA Writer Quattro S';
  src: url('/fonts/iAWriterQuattroS-Bold.woff2') format('woff2');
  font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'iA Writer Quattro S';
  src: url('/fonts/iAWriterQuattroS-BoldItalic.woff2') format('woff2');
  font-weight: 700; font-style: italic; font-display: swap;
}
@font-face {
  font-family: 'iA Writer Quattro V';
  src: url('/fonts/iAWriterQuattroV-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'iA Writer Quattro V';
  src: url('/fonts/iAWriterQuattroV-Italic.woff2') format('woff2');
  font-weight: 400; font-style: italic; font-display: swap;
}
```

## next/font (Next.js App Router)

`next/font/google` covers JetBrains Mono. For Quattro, use `next/font/local` — two loaders, one per role:

```ts
// app/fonts.ts
import { JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

export const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-loader' });

export const interface_ = localFont({
  variable: '--font-interface-loader',
  src: [
    { path: './iAWriterQuattroS-Regular.woff2',    weight: '400', style: 'normal' },
    { path: './iAWriterQuattroS-Italic.woff2',      weight: '400', style: 'italic' },
    { path: './iAWriterQuattroS-Bold.woff2',        weight: '700', style: 'normal' },
    { path: './iAWriterQuattroS-BoldItalic.woff2',  weight: '700', style: 'italic' },
  ],
});

export const body = localFont({
  variable: '--font-body-loader',
  src: [
    { path: './iAWriterQuattroV-Regular.woff2', weight: '400', style: 'normal' },
    { path: './iAWriterQuattroV-Italic.woff2',  weight: '400', style: 'italic' },
  ],
});
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
  --font-interface: var(--font-interface-loader), 'Iowan Old Style', 'Charter', system-ui, sans-serif;
  --font-body:      var(--font-body-loader), 'Iowan Old Style', 'Charter', system-ui, sans-serif;
}
```

---

## Fallback behavior

`artificer.css` ships with fallback chains that produce a near-correct render even if Quattro fails to load:

```
--font-body:      'iA Writer Quattro V', 'Iowan Old Style', 'Charter', 'Source Sans 3', system-ui, -apple-system, sans-serif
--font-interface: 'iA Writer Quattro S', 'Iowan Old Style', 'Charter', 'Source Sans 3', system-ui, -apple-system, sans-serif
```

You can ship without web fonts entirely; just don't override the variables. The system stays usable, just less distinctive.
