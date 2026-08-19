/**
 * Types for artificer-tabs.js — the WAI-ARIA tabs behavior for the `.tabs`
 * primitive. Frameworks that own selection state use the pure `nextIndex`
 * only (enhance/observe toggle panels via `hidden`, which fights conditional
 * rendering). Import for effect: `import '@cameronsjo/artificer/tabs.js';`
 */
export interface ArtificerTabsApi {
  /** Wire the APG keyboard model onto a tablist element. Returns a teardown fn. */
  enhance(el: Element | null, opts?: { onSelect?: (index: number, tab: Element) => void }): () => void;
  /** enhance() every [data-tabs] under `root` now and as inserted (SPA). Returns a disconnect fn. */
  observe(root?: Element | null): () => void;
  /** Pure state machine: the index focus/selection moves to for `key`, or null when not a tab-nav key. */
  nextIndex(
    key: string,
    current: number,
    count: number,
    opts?: { orientation?: 'horizontal' | 'vertical' },
  ): number | null;
}

declare global {
  interface Window {
    ArtificerTabs?: ArtificerTabsApi;
  }
}
export {};
