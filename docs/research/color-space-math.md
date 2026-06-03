# Perceptually-uniform color spaces — evolution and adoption

> Modern design systems increasingly adopt perceptually-uniform color spaces (CIELAB, OKLab, OKLCH) to replace HSL. This research tracks why: what HSL gets wrong, why CIELAB was the 2011 standard, why OKLab emerged in 2020, how the ecosystem is shifting, and what it costs in designer mental models vs gains in programmatic reliability.

**Date:** 2026-05-18
**Lane:** 3 (research)
**Focus:** Tooling adoption, not recommendations — if Artificer moves to OKLCH someday, the evidence is here.

---

## Why HSL fails at palette work

HSL — Hue, Saturation, Lightness — is computationally simple: an RGB transformation that maps pure colors to a cylinder. Hue is intuitive (0°–360° color wheel). Lightness seems straightforward: `(max+min)/2`. The problem is that the human eye doesn't perceive brightness that way.

**The yellow-blue problem.** A yellow at HSL lightness 50% looks significantly brighter than a blue at the same `L=50%`. Yellow carries higher luminance to human vision; the HSL formula ignores this. You can't build a consistent palette by rotating hue at fixed lightness — muddy yellows will brighten or darken unpredictably against nearby hues. This is the single biggest friction point teams hit when trying to scale palettes from 8 to 16 to 26 colors: hue rotation breaks.

**Saturation-lightness coupling.** Adjusting lightness in HSL while preserving saturation often produces unexpected hue shifts, especially in dark or bright regions. A 40% lightness blue isn't perceptually "halfway between black and bright blue" — it's a different hue angle entirely. This makes it nearly impossible to generate systematic lightness ramps (dark, base, light variants of the same semantic color) by simply adjusting L.

**Non-uniformity in the mids.** HSL's middle grays (30–70% lightness) are the least perceptually uniform. A step from 40% to 45% appears larger in some hues than others. This breaks accessibility work: a 4.5:1 contrast ratio you measure against one hue won't transfer cleanly to another.

**Result.** Teams using HSL resort to hand-tuning. Catppuccin, Dracula, and Rosé Pine all hand-tuned their palettes despite beginning with systematic hue/saturation ideas, because HSL forced them into it.

---

## CIELAB — the 2011 standard (Solarized era)

CIELAB (CIE L\*, a\*, b\*) emerged in 1976 from the International Commission on Illumination as a *perceptually uniform* color space. Instead of cylindrical hue/saturation, it uses rectangular coordinates: L\* (perceptual lightness, 0–100), a\* (red-green axis), b\* (yellow-blue axis).

**What CIELAB solved.** Equal steps in CIELAB space roughly correspond to equal perceived differences, addressing HSL's core failure. L\* incorporates human luminance sensitivity (yellow brighter than blue), so a 50:50 split in L\* appears truly perceptually halfway.

**Historical impact.** Solarized (Ethan Schoonover, 2011) was designed in CIELAB from scratch — he published the canonical L\* values (base03: L=15, base02: L=20, base01: L=45, base00: L=50, base0: L=60, base1: L=65, base2: L=92, base3: L=97) and derived sRGB hex from them. This made Solarized's light/dark modes mathematically symmetric: inverting the palette swaps base03↔base3, and the contrast structure stays intact. Solarized remains the methodological anchor for theme portability.

**Why CIELAB persists.** It's the international standard for color measurement in manufacturing and printing. Every color-management system understands it. It's proven.

**Limitations CIELAB didn't fully solve:**

- **Hue non-linearity in blues.** The a\*-b\* plane distorts blue hues. A 10-unit step in a\* isn't perceptually equivalent to a 10-unit step in b\* for blue colors. Designers noticed this; some palettes began "blue-correcting" by hand.
- **Dark-region fuzziness.** Below L\*=10 (very dark), CIELAB's perceptual uniformity degrades. Dark mode design (critical for editor themes) hits this ceiling fast.
- **Computational friction.** CIELAB requires conversion from sRGB → XYZ → CIELAB (gamma decoding, matrix multiplication, nonlinear functions). Not heavy, but tooling overhead for 2000s hardware. The back-conversion (CIELAB → sRGB) requires numerical iteration in some implementations.

**Result.** Solarized remains the standard for documented, mathematically-grounded themes. But CIELAB's blues problem and dark-floor issues meant teams still hand-tuned.

---

## OKLab / OKLCH — Björn Ottosson, 2020

In 2020, Björn Ottosson published a deep dive on color space design, proposing OKLab as a response to CIELAB's shortcomings. Rather than deriving the space from CIE XYZ (the basis for CIELAB), he fitted the transformation matrix directly to empirical human color-discrimination data — 64,000+ human observations of color differences.

**What changed:**

1. **Better hue linearity, especially for blues.** OKLab's coordinate system handles blue hues with far less distortion. A blue at one chroma level looks like the same blue at higher/lower chroma, rather than shifting hue. This directly solves Solarized's long-standing ache.
2. **Improved dark-region uniformity.** OKLab pushes the perceptual-uniformity floor down; dark colors (L ≈ 5–15%) remain distinguishable by chroma and hue in a way CIELAB struggles with. For dark-mode editor themes, this is transformative — you can actually build a 5-step dark ramp instead of 2–3.
3. **Simpler computation.** OKLab's transformation is *faster* to compute than CIELAB (no iteration needed for back-conversion). This matters for real-time palette generation.
4. **Cylindrical flavor.** OKLCH is OKLab's polar form (like how LCH is CIELAB's polar form). OKLCH uses L (lightness), C (chroma, saturation equivalent), and h (hue, 0–360°). Designers find OKLCH more intuitive than rectangular OKLab for interactive color picking because hue is a dial.

**Historical moment.** Ottosson's blog post circulated quietly through 2020–2022. By 2023, CSS Color Module Level 4 standardized `oklch()` and `oklab()` functions. Browser support crossed 90% by Q2 2025.

**Why OKLab won over CIELAB for design tooling:**

- Adobe Leonardo (launched 2020, updated 2023) uses OKLab for contrast-based color generation — it can predict accessibility (WCAG contrast ratios) more reliably in OKLab space.
- Radix Colors v3 (2023) switched to OKLCH for palette generation.
- Tailwind CSS v4 (2024) made the bold move of rewriting its entire default color palette in OKLCH (Display P3 gamut), achieving visually even distribution and eliminating HSL's muddy-mid problem.

---

## Contrast prediction and palette generation

One of OKLab's practical advantages: you can predict WCAG contrast ratios more accurately by working in perceptual space than in sRGB.

**How it works.** Take two colors in OKLab. The Euclidean distance between them in OKLab space correlates with perceived brightness difference. For accessibility, you can:

1. Pick a base color (e.g., a brand blue).
2. In OKLab, rotate hue while incrementing lightness in even steps (L += 10, 20, 30...).
3. For each step, compute the contrast ratio against your backgrounds.
4. The steps will look evenly distributed; the contrast will be predictable.

**Compare to HSL.** In HSL, rotating hue while adjusting lightness produces uneven steps because the lightness formula doesn't track perception. You end up with some colors that feel too dark, others too bright, requiring hand-adjustment.

**Adobe Leonardo's approach.** Users specify a "key color" (starting point) and a target contrast ratio (e.g., 4.5:1 for WCAG AA). Leonardo generates an entire palette in OKLab space, stepping by fixed lightness increments, and displays the actual contrast ratios alongside. This eliminates the "I tuned this color, let me check contrast, oh no it's 3.2:1, back to tuning" loop. The tool does the geometry; the designer picks the semantic meaning.

**Result.** Teams using Leonardo (or building similar tools) reduce palette-generation cycles from hours to minutes. The payoff is frontloaded work (learning OKLab) paying off in sustained productivity.

---

## Modern adoption patterns

### Tailwind CSS v4

Tailwind v4 (2024) made a watershed decision: **rewrite the entire default color palette in OKLCH, expressed in Display P3 gamut (not sRGB).**

The motivation:

- HSL's yellow-blue problem was breaking Tailwind's palette consistency across hues.
- OKLCH's hue linearity meant equal lightness steps produce visually even distributions.
- Display P3 gamut opened new, brighter colors beyond sRGB's 8-bit ceiling.

The result: every Tailwind color name (`slate-50`, `blue-500`, etc.) now maps to an OKLCH value. When you use `bg-yellow-500`, the browser renders a brighter, more saturated yellow than sRGB could express. (sRGB fallbacks are automatic for older browsers.)

**Impact.** Tailwind users get significantly more vibrant, consistent palettes with no class-name changes. The underlying color math improved, the API stayed the same.

### Radix Colors v3

Radix Colors (Modulz/WorkOS) is a 12-step color system designed for data visualization and UI. v3 (2023) adopted OKLCH for palette generation.

**The system.** Users pick a starting hue and a base color. An algorithm generates 12 perceptually-even steps from black through the base color to white, all in OKLCH space. Each step is semantic (step 1 = almost-black background, step 6 = base color, step 12 = almost-white foreground).

**Advantage over HSL.** The algorithm guarantees visual evenness; designers don't hand-tune. A Radix palette in emerald-green will have the same step-to-step perceptual distance as the slate (grayscale) version.

### Adobe Leonardo

Leonardo is an open-source tool (Apache 2.0) for generating accessible color palettes:

1. User inputs a "key color" (brand color).
2. Leonardo finds nearby colors in OKLab space that achieve target contrast ratios (e.g., 3:1, 4.5:1, 7:1).
3. The tool returns a full palette with predicted WCAG compliance.

**Why OKLab matters here.** Contrast prediction in sRGB is non-linear and requires numerical methods. In OKLab, proximity in L (lightness) correlates directly with contrast. Leonardo's algorithm is orders of magnitude simpler in OKLab than it would be in sRGB.

**Current status (2025).** Leonardo supports CAM02, OKLab, and OKLCH. New design systems (especially accessibility-first ones) are adopting Leonardo for palette generation.

### Design system ecosystem

- **Open Props** (Google): Uses OKLCH for color token generation.
- **Huetone** (browser-based tool): OKLCH picker with gamut mapping and contrast visualization.
- **oklch.org, oklch.fyi, color.review:** Web-based tools for picking, converting, and testing OKLCH colors in context.
- **Figma plugins:** Community plugins for OKLCH color picking; official Figma support for `oklch()` in design tokens (via variables in 2024+).

---

## CSS support and browser reality

### Current status (Q2 2025)

- `oklch()` and `oklab()` functions: 92% global browser support (Chrome 111+, Safari 15.4+, Firefox 113+).
- `color()` function (for P3, Rec. 2020 gamuts): 88% support.
- `color-mix()` (mixing colors in a given space): 85% support (Chrome 111+, Safari 16.1+, Firefox 125+).
- `@supports` queries: detect space support before using.

### What this means

Modern CSS can express colors directly:

```css
:root {
  --accent: oklch(60% 0.15 240); /* L=60%, C=0.15, h=240° (blue) */
}

button {
  background: var(--accent);
  /* Automatically gamut-mapped for the display */
}
```

No hex-to-OKLCH conversion needed in the build step (though design systems still do it for clarity). The browser handles gamut mapping: if the display can't show P3, the browser automatically converts to sRGB-safe values.

### Where it gets complicated

- **Safari on iOS:** Color gamut detection is imperfect; some P3 colors may render as fallbacks unexpectedly.
- **Print and PDF:** Most PDF viewers don't understand `oklch()`. Print workflows still use sRGB or CMYK.
- **Design tools:** Figma added `oklch()` variable support in 2024; Adobe XD and Sketch are still catching up.

**Practical implication.** Web-first design systems (Tailwind, Radix, Open Props) can lean hard into OKLCH. Application themes (VS Code, Claude Code, terminal emulators) still need to generate sRGB hex, but the *generation* happens in OKLCH space, then converts to hex for deployment.

---

## Tooling ecosystem

### Color pickers and utilities

- **oklch.org**: Generates harmonious palettes using OKLCH's perceptual uniformity. Real-time lightness and chroma visualization.
- **oklch.net**: OKLCH color picker with hex/rgb/oklch conversion and gamut-safe fallbacks.
- **color.review**: Contrast testing with multiple color spaces and color-blind simulation.
- **Huetone**: Iterative palette builder with OKLCH support and gamut mapping.
- **Leonardo (Adobe)**: Full contrast-based generation tool; open source, embeddable.

### Build-time tools

- **ColorAide**: Python/JavaScript library for color space conversion, gamut mapping, and palette generation.
- **Style Dictionary plugins**: Generate design tokens in OKLCH; export to CSS, Swift, Kotlin, etc.
- **Figma API + tokens plugin**: Programmatically generate and sync OKLCH palettes between Figma and code.

### Editor/IDE integration

- **VS Code DevTools**: Native `oklch()` color picker (inline color swatch, opens picker).
- **Chrome DevTools**: `oklch()` in the color picker; can toggle between spaces.
- **Figma Variables**: `oklch()` color tokens (2024+); design-to-code sync.

---

## Trade-offs and criticisms

### Designer mental model

**The catch.** HSL's hue dial (0–360°) is intuitive. Designers *think* in hue rotations. OKLCH's coordinates (lightness, chroma, hue) are more abstract:

- Chroma isn't the same as saturation (it's absolute, not relative).
- Lightness requires calibration — what's a "light" color? (L=70? L=85?)
- Hue is the same (0–360°), but perceived evenly across the wheel now, so intuitions about complementary colors shift slightly.

**Reality.** Tools hide this. Designers don't write `oklch(60% 0.15 240)` by hand; they use a color picker. The picker abstracts the coordinates. But **comparing two OKLCH values by eye is harder than comparing two HSL values.** If you're reading a design token file, HSL is more immediately intuitive.

**Mitigation.** Design token documentation and naming solve this. Semantic names (primary, secondary, success, error) matter more than the underlying space. The transformation from HSL to OKLCH is largely invisible if the design system is well-named.

### Computational overhead

OKLCH conversion is faster than CIELAB but slower than HSL. For a modern build system (running 100s of palette generation tasks in parallel), the cost is negligible. For real-time tooling (interactive color picker updating 1000s of components live), it's still unnoticeable on modern hardware.

**Not a real bottleneck in 2025.**

### Ecosystem lag

- Figma support for `oklch()` in variables is new (2024); XD and Sketch still lack it.
- Some CSS-in-JS libraries (Emotion, Styled Components) have no built-in OKLCH support; you can use it, but you lose the type-safe token system.
- Print design tools (InDesign, Affinity Publisher) don't understand `oklch()`; print workflows are sRGB/CMYK only.

**Implication.** OKLCH is web-first. For print-inclusive systems, sRGB hex remains the lowest common denominator; OKLCH is a web-layer enhancement.

### What doesn't translate cleanly

- **Accessibility contrast predictions.** OKLCH proximity correlates with contrast, but it's not a perfect predictor. You still need to verify actual WCAG ratios. (Leonardo does this automatically; if you're hand-building, you need a tool.)
- **Color-blindness simulation.** CIELAB-based CVD simulations exist (e.g., Brettel's matrix). OKLab equivalents are emerging but not standardized. Teams still use Coblis (Brettel algorithm) or similar for CVD testing, not OKLCH-native tools.
- **Print color.** OKLCH is display-referred (optimized for screens). Print is scene-referred. The conversion is nontrivial. Teams publishing both digital and print experiences still need a separate print-color strategy.

---

## Solarized → Catppuccin → OKLCH timeline

| Year | System | Approach | Innovation | Cost |
|------|--------|----------|------------|------|
| 2011 | Solarized | CIELAB, hand-tuned | Documented math, light/dark symmetry, ANSI 16-color portability | Blog post is the spec; no tooling |
| 2018–2023 | Catppuccin | Hand-tuned after HSL starting point | Semantic layering, 4 flavors, 200+ ports | Heavy porting work; hand-tune per app |
| 2020 | OKLab emerges | Theory | Empirically fitted to 64k human observations | Requires new tooling |
| 2023 | CSS standardizes | Web platform | `oklch()` function, 90%+ browser support | Designers need new mental model |
| 2024 | Tailwind v4, Radix v3 | OKLCH + Display P3 | Automated palette generation, perceptually-even steps, brighter colors | Adopters get v4+ automatically |
| 2025 | Current state | Hybrid | Web-primary OKLCH; sRGB hex for compatibility | Web-first systems use OKLCH; print/legacy use hex |

---

## TL;DR — three findings most relevant to a CIELAB-aware reader

1. **OKLab solved CIELAB's hue-non-linearity (esp. blues) and dark-floor ceiling.** Solarized's CIELAB approach worked but required hand-tuning around blue distortion. OKLab's empirical fitting to 64k human color-discrimination observations means you can now generate clean 5–7 step dark ramps (vs 2–3 in CIELAB) and rotate hues without unexpected shifts. This directly addresses the "scaling Solarized beyond 16 colors" friction Catppuccin and others hit.

2. **OKLCH adoption is web-first and tooling-dependent.** Tailwind v4, Radix v3, and Adobe Leonardo moved to OKLCH in 2023–2024, but the payoff is *programmatic palette generation with zero hand-tuning* (visually even steps, predictable contrast). For application themes (Ghostty, VS Code, terminal emulators), the advantage is mainly in the *generation pipeline* — you author in OKLCH, emit sRGB hex for compatibility. The designer never sees OKLCH unless they open a color picker tool.

3. **The contrast-prediction win is measurable but requires explicit verification.** OKLab's perceptual uniformity lets tools like Leonardo predict WCAG contrast ratios algorithmically instead of numerically. This cuts palette-generation feedback loops from hours to minutes. But you still need to *verify* the actual ratio; proximity in OKLab correlates with contrast but isn't deterministic.

---

## Sources

- [The Ultimate OKLCH Guide: Modern CSS Color Redefined](https://oklch.org/posts/ultimate-oklch-guide)
- [About OKLCH — ANXNDSGN](https://www.anxndsgn.com/en/writing/oklch)
- [OKLCH in CSS: Why We Moved From RGB and HSL — Evil Martians](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [Design Systems Need a Colour Space — Bjango](https://bjango.com/articles/designsystemcolourspace/)
- [OKLCH, Explained for Designers — UX Collective](https://uxdesign.cc/oklch-explained-for-designers-dc6af4433611)
- [The Web Embraces OKLch/OKLab — Insights4Print](https://www.insights4print.ceo/2025/05/the-web-embraces-oklch-oklab/)
- [CIELAB Color Space — Wikipedia](https://en.wikipedia.org/wiki/CIELAB_color_space)
- [LAB Color Space: What is CIELAB + Practical Use Cases — RK Color](https://www.rkcolor.com/blog/cie-lab-color-space/)
- [Perceptual Color Spaces: Lab, LCH, Oklab, OKLCH — ColorFYI](https://colorfyi.com/blog/perceptual-color-spaces/)
- [LCH is the Best Color Space for UI — Atmos](https://atmos.style/blog/lch-color-space)
- [A Perceptual Color Space for Image Processing — Björn Ottosson](https://bottosson.github.io/posts/oklab/)
- [Perceptually Uniform Color Spaces — Programming Design Systems](https://programmingdesignsystems.com/color/perceptually-uniform-color-spaces/)
- [The Mystery of Tailwind Colors v4 — DEV Community](https://dev.to/matfrana/the-mystery-of-tailwind-colors-v4-hjh)
- [Colors — Tailwind CSS Core Concepts](https://tailwindcss.com/docs/colors)
- [OKLCH Explained: What It Is, Why Tailwind v4 Uses It](https://trypeek.app/blog/oklch-explained-what-it-is-why-tailwind-v4-uses-it-how-to-convert/)
- [Better Dynamic Themes in Tailwind With OKLCH Color Magic — Evil Martians](https://evilmartians.com/chronicles/better-dynamic-themes-in-tailwind-with-oklch-color-magic)
- [GitHub: Adobe Leonardo](https://github.com/adobe/leonardo)
- [Leonardo Color Generator](https://leonardocolor.io/)
- [Accessible Color for Design Systems — Medium](https://medium.com/@NateBaldwin/accessible-color-for-design-systems-40e8420a8371)
- [Leonardo: An Open Source Contrast-Based Color Generator — Medium](https://medium.com/@NateBaldwin/leonardo-an-open-source-contrast-based-color-generator-92d61b6521d2)
- [Solarized — Ethan Schoonover](https://ethanschoonover.com/solarized/)
- [Radix Colors](https://www.radix-ui.com/colors)
- [Radix Themes 3.0 — Radix UI Blog](https://www.radix-ui.com/blog/themes-3)
- [Color – Radix Themes](https://www.radix-ui.com/themes/docs/theme/color)
- [Interview With Björn Ottosson, Creator of the OKLab Color Space — Smashing Magazine](https://www.smashingmagazine.com/2024/10/interview-bjorn-ottosson-creator-oklab-color-space/)
- [Building Better Colour Scales for Design Systems: A Case for OKLab — Medium](https://medium.com/@yuliya.fedoro/building-better-colour-scales-for-design-systems-ec208b16bb67)
- [Oklab Color Space — Wikipedia](https://en.wikipedia.org/wiki/Oklab_color_space)
- [CSS color-mix() — Chrome for Developers](https://developer.chrome.com/docs/css-ui/css-color-mix)
- [CSS color-gamut Media Feature — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/color-gamut)
- [Migrate to HD CSS Color — Chrome for Developers](https://developer.chrome.com/docs/css-ui/migrate-hd-color)
- [sRGB vs Display P3: Wide Gamut Color Explained — ColorFYI](https://colorfyi.com/blog/srgb-vs-display-p3/)
- [oklch.org — OKLCH Color Tools](https://oklch.org/)
- [oklch.net — OKLCH Color Picker & Converter](https://oklch.net/)
- [Gamut Mapping — ColorAide Documentation](https://facelessuser.github.io/coloraide/gamut/)
