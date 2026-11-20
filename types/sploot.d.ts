/**
 * Types for artificer-sploot.js — Sploot, the system's corgi, drawn as
 * quadrant block glyphs. Hydrates `<span data-sploot="pose">` hosts; styles
 * are `.sploot` in artificer.css. Import for effect:
 * `import '@cameronsjo/artificer/sploot.js';`
 */
export type SplootPose = 'stand' | 'droopy' | 'sleep' | 'sniff' | 'mini';
export type SplootSize = 'mini' | 'sm' | 'lg';
export type SplootSeason = 'winter' | 'spring' | 'summer' | 'autumn';

export interface SplootOptions {
  /** Fishbowl space helmet over the head. */
  helmet?: boolean;
  /** aria-hidden instead of role="img" — when another element carries the meaning. */
  decorative?: boolean;
  /** Accessible name; defaults to a description of the pose. */
  label?: string;
  /** Size modifier (`.sploot--mini/--sm/--lg`); default size when omitted. `mini` pose defaults to `mini`. */
  size?: SplootSize;
  /** Extra class for the host (markup() only). */
  className?: string;
}

export interface ArtificerSplootApi {
  /** Pixel grids per pose — `#` is a pixel. The one source for every rendering. */
  readonly POSES: Readonly<Record<SplootPose, readonly string[]>>;
  /** Winter scarf overlay grid for `stand`. */
  readonly SCARF: readonly string[];
  /** Pixel grid → rows of quadrant block glyphs (2×2 px per character). */
  toGlyphs(grid: readonly string[]): string[];
  /** HTML string for server-side/build-time rendering; no DOM needed. */
  markup(pose?: SplootPose, opts?: SplootOptions): string;
  /** Fill `host` (or a new span) with Sploot's layers; returns the element. */
  build(pose?: SplootPose, opts?: SplootOptions, host?: HTMLElement): HTMLElement;
  /** One-shot hydrate of `[data-sploot]` hosts under `root` (default document). */
  hydrate(root?: ParentNode | null): void;
  /** Hydrate `root` now and watch for inserted or re-posed hosts (SPA). Returns a disconnect fn. */
  observe(root?: Element | null): () => void;
  /** Meteorological season (northern hemisphere) for `date` (default now). */
  season(date?: Date): SplootSeason;
}

declare global {
  interface Window {
    ArtificerSploot?: ArtificerSplootApi;
  }
}
export {};
