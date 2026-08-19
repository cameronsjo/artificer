/**
 * Types for artificer-icons.js — Lucide-rooted icon hydration for
 * `<i data-icon="name">` placeholders (unknown names render a dashed
 * placeholder, never a silent blank). Import for effect:
 * `import '@cameronsjo/artificer/icons.js';`
 */
export interface ArtificerIconsApi {
  /** Build one icon SVG element for `name`, or null for an unknown name. */
  build(name: string): SVGSVGElement | null;
  /** One-shot hydrate of `root` (default document). */
  hydrate(root?: ParentNode | null): void;
  /** Hydrate `root` now and watch for inserted icons (SPA). Returns a disconnect fn. */
  observe(root?: Element | null): () => void;
  /** Canonical icon names. */
  list(): string[];
}

declare global {
  interface Window {
    ArtificerIcons?: ArtificerIconsApi;
  }
}
export {};
