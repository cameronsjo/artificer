# Artificer × frameworks — the adapter contract

Artificer ships its interactive behavior as **pure state machines** plus thin
vanilla DOM glue. This doc is the one rule for using that behavior from React,
Vue, Svelte, or any framework that owns its own DOM.

> **State machines come from the module; the framework owns the DOM.**
> A framework consumer **imports** the pure function (side-effect-free,
> tree-shakeable) and drives its own elements with the result. `enhance()` /
> `observe()` are for **non-framework** DOM only — hand-rolling the arrow math a
> module already ships is a *custom implementation*, and the uniformity bar
> applies (see the root `CLAUDE.md` § "Behavior comes from the modules").

## Import vs copy

- **Import** (never re-implement): the pure functions below, and the canonical
  theme key `window.ArtificerTheme.KEY` (`'artificer.theme'`). One definition
  lives in the vanilla runtime; read it, don't re-hardcode the string.
- **Copy** (a starting point, edit freely): the adapter *shape* — the hooks /
  composables in [`react-components.tsx`](./react-components.tsx) and
  [`vue-components.md`](./vue-components.md) (`useTheme`, `useIcons`,
  `useWhimsy`, `Icon`). These emit Artificer classes; they don't reinvent the
  system. Take what you need, throw away the rest.

## The pure state machines

Each module attaches its API to the global (`window.ArtificerTabs`, …) for
vanilla use, and the same object is importable in Node for testing. In a
framework you call the pure function and apply its result to your own refs;
you never mount `enhance()`/`observe()` on framework-rendered nodes.

| Module | Pure export(s) | ARIA contract | You own (DOM) | You import (state) |
|---|---|---|---|---|
| `artificer-tabs.js` | `nextIndex(key, current, count, opts)` | WAI-ARIA APG **tabs** — roving `tabindex`, ←/→ (or ↑/↓ per `aria-orientation`), Home/End | Render the `[role=tablist]`/`tab`/`tabpanel`, hold the selected index in state, move focus | `nextIndex` — the next index for a keydown (or `null` = do nothing) |
| `artificer-options.js` | `nextOption(key, current, count, opts)`, `matchOption(labels, buffer, current)` | APG **listbox** / **menu** — clamped or wrapping arrows, Home/End, type-to-select, disabled-but-focusable | Render the `.menu`/`.listbox` + options, own the active index and the type-ahead buffer | `nextOption` (cursor move), `matchOption` (type-ahead target) |
| `artificer-tree.js` | `nextVisible(key, current, count)`, `treeAction(key, state)` | APG **tree** — ↑/↓ over visible rows (never wraps), Home/End, →/← expand/collapse/parent, Enter/Space activate | Render the `[role=tree]`/`treeitem`/`group`, own expanded + selected state | `nextVisible` (roving move), `treeAction` (`{type, ...}` — expand/collapse/activate/move) |

**Shape of the wiring (React, tabs):** on the tablist's `onKeyDown`, call
`const i = ArtificerTabs.nextIndex(e.key, selected, tabs.length, { orientation })`;
if `i != null`, `e.preventDefault()`, `setSelected(i)`, and focus that tab's ref.
That is the whole integration — no `enhance()`, no MutationObserver.

## SPA lifecycle — what auto-hydrates and what doesn't

Artificer's DOM-owning helpers arm a `MutationObserver` so nodes mounted after
first paint still hydrate. Two of them do it for you; **Whimsy does not.**

- **Icons + theme self-arm.** `artificer-icons.js` and `artificer-theme.js`
  each call `observe()` on DOM ready, so SPA-mounted `[data-icon]` and
  `[data-theme-toggle]` nodes hydrate with no manual call.
- **Whimsy is opt-in and you drive it.** The distinction is *which* hydrate
  runs: the **global auto-hydrate at DOM-ready misses SPA nodes mounted later**
  (the exact gap #36 hit). An **explicit** `Whimsy.hydrate(ref.current)` /
  `Whimsy.celebrate(ref.current)` inside an effect runs *after* render, so it
  **does** see the mounted subtree. Two patterns:
  - **Explicit-in-effect (what the shipped hook does).** After render, call a
    Whimsy method on your ref's subtree. `useWhimsy(ref?)` in
    `react-components.tsx` is a **declarative `hydrate` wrapper**: it runs
    `Whimsy.hydrate(ref?.current || document)` in a `useEffect`, hydrating the
    `[data-whimsy]` markup you rendered inside the mounted node. (Re-running is
    safe — `hydrate` is idempotent: wave nodes carry a `data-whimsy-hydrated`
    guard and the class adds are no-ops.) For a **one-shot moment** (celebrate on
    a "deploy succeeded" transition), call `Whimsy.celebrate(ref.current)` /
    `Whimsy.run(ref.current)` / `Whimsy.ignite(ref.current)` directly in an
    effect — no dedicated imperative React helper ships; keeping the
    one-whimsy-moment-per-view rule the caller's responsibility.
  - **Observer (for markup mounted continuously).** Arm `Whimsy.observe(root)`
    once so inserted `[data-whimsy]` nodes hydrate like the vanilla page. Returns
    a disconnect fn — clean it up on unmount.

## The theme key — one source, no drift

`window.ArtificerTheme.KEY` is the single definition of the persistence key
(`'artificer.theme'`, a **dot**). The `useTheme` hooks read it with a literal
fallback for SSR / pre-load:

```ts
const KEY = (typeof window !== 'undefined' && (window as any).ArtificerTheme?.KEY) || 'artificer.theme';
localStorage.setItem(KEY, theme);
```

Both agree by construction, so the SPA hook and the first-paint bootstrap script
can never persist to diverging keys (the misfit #36 item 1 reported, now
drift-proofed rather than merely re-aligned).
