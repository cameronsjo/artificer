---
name: artificer-design-system
description: "Use when designing UI for Cameron's tools, dashboards, agent UIs, terminals, or settings panels (Artificer design system — AuDHD-friendly, dark-first). NOT for marketing sites, kid-facing UI, hero/landing pages, or e-commerce."
license: Apache-2.0
user-invocable: true
metadata:
  author: cameronsjo
  version: "0.4.1"
---

# Artificer · v0.29.1

Design calm, scannable tools and documents for Cameron using Artificer's tokens,
components, and interaction patterns. The system is dark-first, Ghostty-rooted,
with paper-stock light mode and a Jazz Age Deco palette. Use it for dashboards,
agent interfaces, terminals, settings, and personal sites whose goal is calm
focus. Marketing, kid-facing entertainment, and e-commerce need a different
system; the optional whimsy layer does not change that scope. Personal use: no
license step for Cameron's projects. Palette from Jazz Age Deco screen prints,
surface scale from Ghostty terminal defaults.

## Choose the surface

Choose per page before writing CSS; one project may contain both kinds.

| Surface | Body | Size | Other text |
|---|---|---|---|
| Tool: dashboards, consoles, settings, tables | `--font-mono` (JetBrains Mono) | 14px | Labels and controls use `--font-interface` (Recursive) |
| Document: reports, READMEs, onboarding, prose | `--font-body` (Bricolage Grotesque) | 15–16px | Code, paths, identifiers, and numerals stay mono |

If a prose page needs repeated overrides from mono back to sans, change its body
face. Match the existing color, type, interaction states, density, and shadows
before adding to an established UI; explain any deliberate departure.

For open-ended design, use the supplied context and ask only for missing choices:
surface, references, number of variations, and whether to vary layout,
interaction, copy, or visuals. Explore at least three distinct variations unless
Cameron specifies otherwise, including familiar Artificer patterns and options
that stretch layout or rhythm. Keep every option within the system. Use a labeled
placeholder for missing assets and ask for the needed asset; do not fake imagery
with hand-drawn SVG. New color values or semantic role names require maintainer
approval; reusing existing tokens does not.

## Essential constraints

- Default to dark, with light as the paper alternative. Use existing tokens for
  color, space, and duration; never substitute hexes without computing contrast.
- Budget two semantic colors for decoration. Brand purple + gold form one
  Cameron signal, exempt from that semantic-color budget. Status-dense data may carry more: use low-saturation dot + text
  chips; reserve filled treatment for urgent status and connection loss.
- Use **at most one primary action** per view; zero is valid for read-only
  surfaces. Other actions use secondary or ghost buttons.
- Limit lists, menus, and palettes to 5–7 items before grouping, search, or
  disclosure. Primary data tables follow table recipes; detail panels use no
  more than five items per labeled group.
- Bold 3–5 anchor words per paragraph with `.anchor` or `<b>` so the bold path
  makes sense alone.
- No pure black; the system's darkest value is `#1D1F21`. Do not mix rounded and
  sharp corners in one view.
- Body text floor is WCAG AA (4.5:1). Honor `prefers-reduced-motion`; nonessential
  motion collapses to the static state. Status and interaction must be apparent
  without color alone.
- Write literal, direct, lightly deadpan copy. Lead with the action, name the
  thing, avoid sarcasm, metaphor, and emoji in product copy (wordmarks
  and avatars are exempt). Success is a quiet receipt.

## Load the relevant detail

All paths are relative to this skill in `skills/artificer-design-system/`.
Load only the references needed for the current surface.

- [Decision recipes](references/decision-recipes.md): find the shipped component
  for a concrete request, then read its linked live specification. Includes
  shells, navigation, forms, tables, charts, diagrams, loading states, whimsy,
  texture, and print. Reuse existing primitives before inventing layout code.
- [Boilerplate](references/boilerplate.md): new-page HTML, theme bootstrap before
  first paint, runtime modules, print, and social metadata. In chat-only
  artifacts, inline `artificer.css` rather than linking an unavailable file.
- [Cheatsheet](references/cheatsheet.md): token namespaces, utility classes, and
  examples for anchor words, color competition, labels, and list grouping.
- [Live spec](../../live-spec/index.html): visual foundations and behavior.
  [Colors](../../live-spec/colors.html) and [tokens](../../src/tokens.json) carry
  the actual values and contrast pairings.
- [Source](../../src/): CSS, theme persistence, icons, focus, and other behavior
  modules. The theme key is `artificer.theme`; use the shipped module contract.
- [Framework adapters](../../framework-adapters/) and [fonts](../../FONTS.md):
  Tailwind, React, Vue, and font loading. Recursive and Bricolage Grotesque ship
  as bundled variable WOFF2 files.
- [Bundle index](../../INDEX.md), [README](../../README.md), and
  [offline preview](../../system-preview-offline.html): distribution and read order.
- [Single-file handoff](../../reference/SKILL.md): standalone reference; this skill
  is canonical where they differ.
  [Theme exports](../../themes/) include the
  [Obsidian theme](../../themes/obsidian/Artificer/).

## Wire and verify

Vendor into the consumer project with
`npx @cameronsjo/artificer vendor --dest public/artificer`; if registry access is
unavailable, copy the system's `src/` into that destination. Wire CSS and modules
using the boilerplate, adjusting URLs to the destination.

Use the **consumer bundle's** `CLAUDE.md` for project rules. The maintainer repo's
root `CLAUDE.md` includes internal ownership instructions and is not a drop-in
consumer file. Preserve an existing project instruction file; integrate the
relevant consumer rules instead of overwriting it.

Before delivery, verify tokens and utility reuse, 200% zoom/reflow, keyboard
reachability and focus order, reduced motion, non-color status cues, and an axe
accessibility check. Use the live spec's accessibility, motion, form, and voice
checklists for the surface under review. State what was actually exercised.

## Downstream feedback

When Artificer is used outside its own source repo, invoke
[artificer-feedback](../artificer-feedback/SKILL.md) when a coherent pivot settles,
at conversation lulls, and at session end. In Cameron's own projects, file
without asking; elsewhere, show the payload and ask. Skip it for work inside
`artificer-design-system` itself or when the user declines.

Invoke before drafting or deduplicating the report; the feedback skill assembles
and files one issue per pivot at `cameronsjo/artificer-design-system`. Prefer a
background agent when available so the build continues. Preserve the issue URL
as the filing receipt; invocation alone is not proof that an issue exists.
