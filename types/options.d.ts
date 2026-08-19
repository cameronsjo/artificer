/**
 * Types for artificer-options.js — option-navigation behavior for the
 * `.menu`/`.listbox` primitive (roving tabindex or aria-activedescendant).
 * Import for effect: `import '@cameronsjo/artificer/options.js';`
 */
export interface ArtificerOptionsApi {
  /** Roving-tabindex keyboard model on a standalone listbox/menu. Returns a teardown fn. */
  enhance(
    el: Element | null,
    opts?: { onSelect?: (index: number, option: Element) => void; wrap?: boolean },
  ): () => void;
  /** aria-activedescendant cursor for the palette/combobox recipe; focus stays
   * on the input; printable keys and Escape are never consumed. The handle's
   * refresh() re-reads options after the consumer filters the list. */
  combobox(
    input: HTMLInputElement | null,
    list: Element | null,
    opts?: { onSelect?: (index: number, option: Element) => void },
  ): { refresh(): void; teardown(): void };
  /** enhance() every [data-options] / [data-combobox] under `root` (SPA). Returns a disconnect fn. */
  observe(root?: Element | null): () => void;
  /** Pure: next option index for `key` (clamped for listboxes, wrapping for menus), or null. */
  nextOption(key: string, current: number, count: number, opts?: { wrap?: boolean }): number | null;
  /** Pure: type-to-select match — index of the option matching `buffer`, or null. */
  matchOption(labels: string[], buffer: string, current: number): number | null;
}

declare global {
  interface Window {
    ArtificerOptions?: ArtificerOptionsApi;
  }
}
export {};
