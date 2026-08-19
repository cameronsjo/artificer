/**
 * Types for artificer-focus.js — the modal/drawer focus trap. Import for
 * effect: `import '@cameronsjo/artificer/focus.js';`
 */
export interface ArtificerFocusApi {
  /** Trap focus inside `el` (Tab cycles; focusables recomputed every Tab).
   * `onEscape` fires on Esc; `release()` untraps and restores focus to the
   * previously-focused element. */
  trap(el: Element | null, opts?: { onEscape?: (e: KeyboardEvent) => void }): { release(): void };
}

declare global {
  interface Window {
    ArtificerFocus?: ArtificerFocusApi;
  }
}
export {};
