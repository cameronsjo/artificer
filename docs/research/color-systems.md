# Modern color systems — palette design at scale

> Modern design systems approach color as a generative rule-set, not a fixed palette — step ladders with semantic roles, accessibility baked into the algorithm, and light/dark pairing designed as a coherent unit.

**Date:** 2026-05-18
**Lane:** 3 (research)

---

## Radix Colors (WorkOS)

Radix Colors ships 30 color scales, each with 12 carefully calibrated steps. The semantic organization is the core innovation: **each step has an assigned role**, not just a position in a gradient.

Steps 1–2 serve app backgrounds and subtle component backgrounds — the least chromatic, most neutral. Steps 3–5 handle UI component backgrounds: step 3 for the normal interactive state, step 4 for hover, step 5 for pressed or selected. This creates a clear interaction ladder without relying on naming ambiguity.

Steps 6–8 are the border tier. Step 6 is for subtle borders on non-interactive surfaces (sidebars, cards, separators); step 7 steps up to subtle interactive borders; step 8 is stronger, used for focus rings and high-contrast borders on interactive components. The gradient here is about "prominence of boundary," not about lightness alone.

Steps 9–10 are solid backgrounds. Step 9 is designed to have the **highest chroma** of the entire scale — the purest, most saturated version of the hue, mixed with minimal white or black. It's the component's normal state. Step 10 is the hover state, deliberately separated from step 9. Most step 9 colors are designed to pair with white foreground text.

Steps 11–12 are text tiers. Step 11 is the primary text color, step 12 the secondary or disabled text, both guaranteed to hit APCA Lc 60 and Lc 90 contrast ratios on a step 2 background from the same scale — accessibility enforced by algorithm, not after-the-fact auditing.

Light and dark versions are designed as pairs, not mirror-images. The role assignments stay the same, but the actual hex values are calibrated separately for each mode to preserve visual density and hierarchy across the pair. Radix also ships alpha variants (color + opacity at each step) and offers P3 gamut expansions for saturated, wide-gamut displays.

The system is transport-agnostic: it lives in Figma, ships as JSON, and can be consumed by design systems (Radix Themes, shadcn) or implemented directly in CSS.

---

## Open Color (Mantine)

Open Color is simpler: 10 steps per hue, no roles specified by the system — just evenly distributed lightness. It's a Mantine primitive that works well for component backgrounds and text, but relies on the consuming system (Mantine's theming layer) to assign semantic meaning.

The original design in 2017 emphasized ratio consistency — each step moves by a predictable perceptual distance. This makes it easy to generate custom palettes: supply a single hue and let the generator interpolate the ten steps. No algorithm to learn, no design talk necessary.

Open Color succeeds because it's the "floor model" of color systems: extremely portable, easy to replicate in any medium (CSS, Canvas, native mobile), and requires no framework-specific knowledge. It's inherited by nearly every indie design system that doesn't want to build its own palette from scratch (Mantine, Chakra, and countless team systems).

---

## Tailwind CSS v3 → v4

Tailwind v3 shipped with **sRGB color palettes** defined in hex or rgb notation. The system was perceptually balanced and worked fine for screen-based UI, but it was constrained by sRGB's narrower gamut.

Tailwind v4 (2024) made a major shift: the entire default color palette moved to **OKLCH**. OKLCH is a perceptually uniform color space based on Oklab, where adjusting the L (lightness) or C (chroma) values produces predictable visual changes. Because OKLCH is device-independent, it can express colors beyond what sRGB hex codes can represent — specifically, colors in the Display P3 gamut for modern wide-gamut screens.

The practical impact: blues and greens are now more vivid where they were previously clipped. The team maintained backward compatibility by keeping the naming scheme (`slate-50` through `slate-950`) so existing code didn't break, but the underlying color values shifted.

v4 also introduced color interpolation in Tailwind's gradient system: you can now specify `bg-linear-to-r/oklch` to blend colors in OKLCH space (producing more saturated gradients) or `/srgb` to blend in the traditional space. This is the first mainstream CSS framework to give users control over interpolation.

The naming didn't change, only the perceptual fidelity. That decision was deliberate: Tailwind prioritizes non-breaking upgrades for users with large codebases. The color palette is fixed, not generative — it's a finished point in design space, not a rule-set.

---

## IBM Carbon

Carbon is built for enterprise: **WCAG 2.1 AA compliance is non-negotiable**, and the color system is named and structured to reflect that.

Instead of "gray-1 through gray-12," Carbon uses functional token names: `ui-01`, `ui-02`, `ui-03` for interactive UI backgrounds; `bg-ui-01`, `bg-ui-02` for backgrounds; `text-01`, `text-02` for text layers; and role-specific tokens like `danger-01` (danger backgrounds), `danger-02` (danger borders), and `danger-03` (danger text). This naming is explicit about *what the color is for*, not just where it falls in a lightness scale.

Carbon's accessibility commitment is enforced at the palette level. Every functional token is paired with a contrast-verified partner. For example, if `text-01` appears on `ui-01`, that combination is audited to meet 4.5:1 contrast (standard WCAG AA for body text) or 3:1 (large text). When you pick a color token in Carbon, you're not guessing whether it'll pass contrast — the system guarantees it.

State is handled through semantic pairing: `interactive-01` is the normal button background, `interactive-02` is hover, `interactive-03` is active (pressed). Unlike Radix's step numbers, these names tell you the state directly. No ambiguity.

Carbon ships four standard themes out of the box (light, dark, light high-contrast, dark high-contrast) and adds specialized themes for color vision deficiency (Protanopia, Deuteranopia, Tritanopia). Each theme is tested independently, so a user with color blindness gets a palette where functional distinctions remain clear even without hue variation.

The token structure is hierarchical: base colors feed into component tokens, which feed into functional tokens, which feed into theme tokens. Changes propagate through the hierarchy, so accessibility improvements (e.g., tightening a contrast ratio) can be made once at the base level and inherited everywhere. This is enterprise-grade maintainability.

---

## GitHub Primer

GitHub operates across **six distinct themes**: default (light), dimmed, high-contrast (light), dark, dark-dimmed, and dark-high-contrast, plus three colorblind variants for each mode. Managing this without explicit per-theme overrides for every color would be unmaintainable.

Primer solves this with a **functional color token** layer. The hierarchy is: base tokens (raw color scales) → functional tokens (semantic roles) → component tokens (specific UI pieces). Functional tokens like `bgColor-default`, `fgColor-muted`, `borderColor-emphasis` have names that describe their purpose, not their hex value.

The trick is **inversion**: light and dark themes aren't separate trees of tokens — they're the same tokens with inverted step indices. In light mode, `bgColor-default` points to the lightest step of a scale; in dark mode, it points to the darkest. The functional name stays the same, the underlying value swaps. This design move means a component developer doesn't need to write theme-aware CSS — they just use `bgColor-default` and it adapts.

For high-contrast variants, a few token overrides are applied on top (e.g., using a higher-contrast step). Colorblind themes adjust hue-based distinctions — for example, removing red/green boundaries and replacing them with luminance or hue-shift strategies that work for Protanopia users.

Primer publishes color tooling (the "Accelerating GitHub theme creation with color tooling" initiative) to help teams generate new themes that align with Primer's constraints. This democratizes theme creation: you don't need to know the internals — you can generate a new light/dark pair and verify it meets accessibility standards.

---

## Material Design 3 / Material You

Material 3 introduced **dynamic color**: the ability to extract a dominant color from a user's wallpaper (or system accent) and generate an entire, accessible color scheme from that single input.

The algorithm uses **HCT color space** (Hue-Chroma-Tone), where:

- **Hue** (0–360) is the color family: red, yellow, green, blue, magenta.
- **Chroma** (0–120) is colorfulness: how pure the color is. Gray has chroma 0; a vivid red has chroma 100+.
- **Tone** (0–100) is perceived lightness, derived from CIE-L\*, ensuring consistent visual brightness across hues. Tone 0 is black, tone 100 is white; tone 50 is neutral regardless of hue.

From a user's seed color, Material generates four additional key colors through hue-shifting and chroma adjustment, creating five color "axes." Each axis then generates a **tonal palette** — 13 tones (0, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95, 100) at constant hue and chroma. The result is 65 colors (5 axes × 13 tones) that are guaranteed to:

- Be perceptually uniform across hues (tone 50 looks equally bright in red, blue, or green).
- Maintain colorfulness where it matters (high chroma for key colors, lower for neutrals).
- Meet accessibility standards: specific tone combinations (e.g., tone 90 text on tone 10 background) are pre-verified to hit WCAG contrast targets.

The system is algorithmic, not hand-picked. When a user changes their wallpaper, a new seed color is extracted, the algorithm runs, and the palette updates — without designer intervention. This was a paradigm shift: Material 3 proved that generated color schemes could maintain visual coherence and accessibility at scale.

Light and dark modes are handled by remapping tone values (light mode: 90 text on 10 background; dark mode: 10 text on 90 background), not by inverting hues. This preserves the semantic meaning of the palette across modes.

---

## Apple system colors (iOS / macOS HIG)

Apple takes a **semantic-first, value-second** approach. Instead of shipping a palette (e.g., "blue step 5"), Apple defines color by *role*: `systemBlue`, `label`, `secondaryLabel`, `tertiarySystemBackground`, `systemGroupedBackground`.

Each semantic color is not a hex code — it's a dynamic reference that the OS resolves at runtime. When you use `systemBlue` in your app, the actual rendered color depends on:

- **Current appearance** (light or dark mode).
- **Accessibility settings** (increased contrast, etc.).
- **Platform** (iOS blue might be slightly different from macOS blue, reflecting platform conventions).

Apple ships two families of background colors:

- **System** (primary, secondary, tertiary) for regular views.
- **Grouped** (primary, secondary, tertiary) for grouped content (table views, forms).

This hierarchy lets the app convey information depth without inventing new colors. Same with foreground: `label` (primary text), `secondaryLabel` (secondary metadata), `tertiaryLabel` (very subtle), `quaternaryLabel` (barely visible, usually separators).

The semantic model means your code is resilient to OS updates. If Apple changes what "blue" means (e.g., a different hue for accessibility reasons), your app updates automatically. No palette migration, no token refactor.

Vibrancy (a semi-transparent material effect layered on top of semantic colors) is part of the system but not the core — most apps rely purely on the semantic colors. Vibrancy is used for depth cueing in specific contexts (widgets, lock screen, Always-On displays).

Apple's constraint: no custom color systems. Apps can tint semantic colors, but they can't ship their own "brand blue." This keeps the OS visually coherent and ensures accessibility is maintained across all apps.

---

## Synthesis

### Universal design moves

All seven systems (Radix, Open Color, Tailwind, Carbon, Primer, Material 3, Apple) share a core pattern:

1. **Step-based scales** — 10–13 tones per hue, evenly or semantically spaced.
2. **Semantic naming** — colors are named by role (`interactive-01`, `label`, `text-01`) rather than position alone (`gray-5`).
3. **Light/dark pairing** — every system ships both modes. The question is *how* they're paired (separate values, inverted indices, tone remapping).
4. **Accessibility hardcoded** — contrast verification is done at design time or algorithmically at generation time, not left to auditing afterward.
5. **Component-level defaults** — each system provides a small set of semantically clear tokens (primary background, secondary text, border, etc.) that cover 80% of UI needs.

### Where they meaningfully diverge

**Generative vs frozen:**

- Material 3 and (partly) Tailwind are *generative*: run an algorithm, get a palette.
- Radix, Open Color, Carbon, Primer, and Apple are *frozen*: the palette is authored once, then consumed.

**Color model:**

- Material 3 uses HCT (tone-based, perceptually uniform).
- Tailwind v4 uses OKLCH (perceptually uniform, wide-gamut).
- IBM Carbon uses custom steps (hand-calibrated for each hue).
- Apple uses semantic roles without publishing the underlying color model.
- Radix and Open Color use LCH-like thinking but don't mandate a specific space.

**Naming philosophy:**

- Apple and IBM Carbon — role-first (`label`, `interactive-01`).
- Radix, Tailwind, Open Color — numeric steps (1–12, 0–9, 50–950).
- Primer — hybrid (functional tokens like `bgColor-emphasis`).

**Target audience:**

- Material 3 — mobile-first, device-agnostic (any OS that can extract wallpaper).
- Apple — Apple ecosystem only.
- IBM Carbon — enterprise UI (dashboards, data tables, regulatory compliance).
- Tailwind — utility-first development (rapid prototyping, tailored themes).
- Radix — design system builders (component library authors who need to extend).

**Gamut expansion:**

- Tailwind v4 — Display P3 for modern screens.
- Material 3 — stays sRGB-bound algorithmically, but supports wide gamut output.
- Apple, IBM Carbon, Primer, Radix — sRGB is the constraint; wide gamut is a nice-to-have.

### "Color system" vs "theme"

This distinction matters for theme designers.

A **color system** is a generative rule-set: step algorithms, semantic role definitions, state progression rules (normal → hover → active), and light/dark pairing logic. Systems are usually documented and can be implemented in multiple media (CSS, Figma, native mobile, terminal).

A **theme** is a frozen point in that design space: specific hex values, a finished palette, implementation-ready. Catppuccin, Rosé Pine, and Tokyo Night are themes. They may *document* their design principles (e.g., "we use warm hues for accents"), but what ships is the palette, not the rule-set.

Most themes are inspired by systems (e.g., Catppuccin references Radix Colors' semantic layering) but don't expose the generative layer. The user installs the theme and gets exactly the colors the designer chose, not a parametrized system that adapts to their preferences.

### Patterns most relevant for theme designers to inherit

1. **Semantic role naming is more durable than position-based naming.** `text-primary`, `text-secondary`, `border-subtle` ages better than `gray-1`, `gray-5`, `gray-9` because the roles stay true even if the specific values shift for accessibility reasons.

2. **Light and dark should be designed as a coherent pair, not as inverted mirrors.** All systems that ship both modes design them independently: the dark step 5 isn't necessarily the inverse of the light step 5. Density, hue, and chroma may differ. Pair them by *role*, not by math.

3. **Accessibility is faster to build in at the palette level than to audit afterward.** Choose step values and pairings that hit contrast targets. Avoid relying on users to pick colors; provide clear, contrasted defaults.

4. **State progression (normal → hover → active) is clearer when defined by step increment, not by a separate "hover" palette.** Radix's step 3 → step 4 → step 5 approach is easier to teach than "use hover-color for the hover state" (which invites confusion about what hover-color is).

5. **Export to multiple formats unblocks adoption.** CSS custom properties are table-stakes, but JSON (for tool integration), Figma (for design), and WCAG-verified contrast tables (for accessibility review) lower friction. Primer's color tooling is instructive: generate new themes and get automatic accessibility verification.

6. **Tonal uniformity across hues matters for UX.** If tone 50 looks bright in blue but dim in yellow, the interface feels janky. Material 3's use of CIE-L\* (and HCT's tone dimension) ensures consistent perceived lightness. For hand-authored palettes, a tool that plots tones on a lightness axis catches this before shipping.

---

## TL;DR

- **All systems use semantic step scales (10–13 steps) with explicit roles** (backgrounds, borders, text) rather than generic gradients; light/dark are paired by design intent, not mathematical inversion. Material 3 and Tailwind v4 push into perceptually uniform color spaces (HCT, OKLCH) for consistency across hues.

- **The accessibility bet differs by context.** Apple and IBM Carbon enforce it through semantic defaults (you can't pick an inaccessible color without overriding); Material 3 algorithmically guarantees it (tone combinations are pre-verified); Radix and Primer do it through clear step progression (normal → hover → active is 1 step apart).

- **Frozen palettes (Catppuccin, Radix's shipped colors) vs generative systems (Material 3) solve different problems.** Themes ship a finished point; systems ship rules. Theme designers inherit *naming patterns* and *pairing logic* from systems, not algorithms. Semantic naming and tonal uniformity across hues are the two highest-ROI moves for any new theme.

---

## Sources

- [Radix Colors — Scales](https://www.radix-ui.com/colors/docs/palette-composition/scales)
- [Radix Colors — Understanding the Scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Tailwind CSS v4 Release Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [Material Design 3 — Color System](https://m3.material.io/styles/color/system/how-the-system-works)
- [Material Design 3 — Color Roles](https://m3.material.io/styles/color/roles)
- [GitHub Primer — Inclusive Design via Color System](https://github.blog/engineering/user-experience/unlocking-inclusive-design-how-primers-color-system-is-making-github-com-more-inclusive/)
- [GitHub Primer — Color Usage](https://primer.style/product/getting-started/foundations/color-usage/)
- [IBM Carbon — Color System](https://carbondesignsystem.com/guidelines/accessibility/color/)
- [IBM Carbon — Accessibility Standards](https://v10.carbondesignsystem.com/guidelines/accessibility/color/)
- [Apple HIG — Dark Mode](https://developers.apple.com/design/human-interface-guidelines/foundations/dark-mode/)
- [Apple HIG — Color](https://developers.apple.com/design/human-interface-guidelines/foundations/color/)
- [Mantine — Colors](https://mantine.dev/theming/colors/)
- [Material Design Color Utilities (GitHub)](https://github.com/material-foundation/material-color-utilities)
