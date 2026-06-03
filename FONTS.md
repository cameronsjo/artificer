# Fonts

Artificer uses two free, OFL-licensed typefaces. Both are commercial-use safe. The CSS references them by name; you ship them however your project ships fonts.

| Face | Use | License | Where to get it |
|---|---|---|---|
| **JetBrains Mono** (with ligatures) | Body face on **tool surfaces** (dashboards, terminals, data tables, settings panels). Code/identifiers/numerals everywhere — including inside documents. | SIL OFL 1.1 | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono), [official](https://www.jetbrains.com/lp/mono/), [Fontsource](https://fontsource.org/fonts/jetbrains-mono) |
| **iA Writer Quattro** | Body face on **document surfaces** (writeups, READMEs, reports, design docs). Labels/hints/microcopy on tool surfaces. | SIL OFL 1.1 | [iaolo/iA-Fonts](https://github.com/iaolo/iA-Fonts) on GitHub, [Fontsource](https://fontsource.org/fonts/ia-writers-quattro) |

**Why this pair.** Quattro is humanist sans designed by Bold Monday for iA, tuned to share rhythm with monospace work. It pairs with JetBrains Mono more naturally than Inter or Source Sans because they were designed to live side-by-side in the same kind of writing/code surface. Quattro also has matching italics, which Inter lacks at lower weights.

> Quattro is **not** on Google Fonts. You self-host it. The CSS fallback chain is `'iA Writer Quattro' → 'Iowan Old Style' → 'Charter' → 'Source Sans 3' → system-ui`, so the page still renders correctly if Quattro hasn't loaded.

---

## Recommended — Fontsource (self-hosted, npm)

```sh
npm i @fontsource/jetbrains-mono @fontsource/ia-writers-quattro
```

```ts
// app entry
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/ia-writers-quattro/400.css';
import '@fontsource/ia-writers-quattro/700.css';
import '@fontsource/ia-writers-quattro/400-italic.css';

import 'artificer/artificer.css';
```

## CDN — JetBrains Mono via Google Fonts, Quattro via unpkg/jsDelivr

JetBrains Mono is already imported by `artificer.css` over Google Fonts — you don't need to do anything for it. For Quattro, add this to `<head>` *before* `artificer.css`:

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/ia-writers-quattro@5/400.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/ia-writers-quattro@5/700.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/ia-writers-quattro@5/400-italic.css">
```

## Direct WOFF2 download

If you'd rather host the files yourself (no npm, no CDN):

1. Grab `iAWriterQuattroS-{Regular,Italic,Bold,BoldItalic}.woff2` from <https://github.com/iaolo/iA-Fonts/tree/master/iA%20Writer%20Quattro/Static>.
2. Drop them in your `public/fonts/` (or wherever you serve static assets).
3. Add this `@font-face` block somewhere your CSS will see it, *before* `artificer.css`:

```css
@font-face {
  font-family: 'iA Writer Quattro';
  src: url('/fonts/iAWriterQuattroS-Regular.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'iA Writer Quattro';
  src: url('/fonts/iAWriterQuattroS-Italic.woff2') format('woff2');
  font-weight: 400; font-style: italic; font-display: swap;
}
@font-face {
  font-family: 'iA Writer Quattro';
  src: url('/fonts/iAWriterQuattroS-Bold.woff2') format('woff2');
  font-weight: 700; font-style: normal; font-display: swap;
}
@font-face {
  font-family: 'iA Writer Quattro';
  src: url('/fonts/iAWriterQuattroS-BoldItalic.woff2') format('woff2');
  font-weight: 700; font-style: italic; font-display: swap;
}
```

## next/font (Next.js App Router)

`next/font/google` covers JetBrains Mono. For Quattro, use `next/font/local`:

```ts
// app/fonts.ts
import { JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

export const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-loader' });

export const sans = localFont({
  variable: '--font-sans-loader',
  src: [
    { path: './iAWriterQuattroS-Regular.woff2', weight: '400', style: 'normal' },
    { path: './iAWriterQuattroS-Italic.woff2',  weight: '400', style: 'italic' },
    { path: './iAWriterQuattroS-Bold.woff2',    weight: '700', style: 'normal' },
    { path: './iAWriterQuattroS-BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
});
```

```tsx
// app/layout.tsx
import { mono, sans } from './fonts';
export default function Layout({ children }) {
  return <html lang="en" className={`${mono.variable} ${sans.variable}`}><body>{children}</body></html>;
}
```

```css
/* globals.css, after artificer.css */
:root {
  --font-mono: var(--font-mono-loader), ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-sans: var(--font-sans-loader), 'Iowan Old Style', 'Charter', system-ui, sans-serif;
}
```

---

## Fallback behavior

`artificer.css` ships with a fallback chain that produces a near-correct render even if Quattro fails to load:

```
'iA Writer Quattro', 'Iowan Old Style', 'Charter', 'Source Sans 3', system-ui
```

You can ship without web fonts entirely; just don't override the variables. The system stays usable, just less distinctive.
