/**
 * Types for artificer-theme.js — a side-effect script that owns theme state:
 * three modes (dark / light / auto), persistence under `ArtificerTheme.KEY`,
 * canonical empty `[data-theme-toggle]` buttons hydrated with the half-circle
 * glyph, all instances kept in sync. Import for effect:
 *   import '@cameronsjo/artificer/theme.js';
 */
export type ArtificerThemeMode = 'dark' | 'light' | 'auto';

export interface ArtificerThemeApi {
  /** Apply + persist a mode ('auto' follows prefers-color-scheme live). */
  apply(mode: ArtificerThemeMode): void;
  /** Cycle dark → light → auto. */
  toggle(): void;
  /** Bind any unbound [data-theme-toggle] buttons now (idempotent). */
  bind(): void;
  /** bind() now, then watch `root` (default body) for inserted toggles. Returns a disconnect fn. */
  observe(root?: Element | null): () => void;
  /** The localStorage key ('artificer.theme') — the ONE source of truth; never re-hardcode it. */
  readonly KEY: string;
}

declare global {
  interface Window {
    ArtificerTheme?: ArtificerThemeApi;
  }
}
export {};
