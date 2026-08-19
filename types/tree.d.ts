/**
 * Types for artificer-tree.js — the APG tree behavior for the `.tree`
 * primitive (inert on `.tree--static` by design). Import for effect:
 * `import '@cameronsjo/artificer/tree.js';`
 */
export interface ArtificerTreeApi {
  /** Wire roving tabindex + arrow-key model onto a [role=tree] element. Returns a teardown fn. */
  enhance(
    treeEl: Element | null,
    opts?: {
      onSelect?: (item: Element) => void;
      onToggle?: (item: Element, expanded: boolean) => void;
    },
  ): () => void;
  /** enhance() every [data-tree] under `root` (SPA). Returns a disconnect fn. */
  observe(root?: Element | null): () => void;
  /** Pure: next visible item index for `key` (a tree never wraps), or null. */
  nextVisible(key: string, current: number, count: number): number | null;
  /** Pure: the action for `key` given item state — expand / collapse / activate / move, or null. */
  treeAction(
    key: string,
    state: { expanded?: boolean; isParent?: boolean },
  ): string | null;
}

declare global {
  interface Window {
    ArtificerTree?: ArtificerTreeApi;
  }
}
export {};
