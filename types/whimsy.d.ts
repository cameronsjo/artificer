/**
 * Types for artificer-whimsy.js — the sanctioned whimsy layer (burnished
 * sine-wave rainbow; opt-in, settles, reduced-motion-safe). Import for
 * effect: `import '@cameronsjo/artificer/whimsy.js';`
 */
export interface WhimsyApi {
  /** Split [data-whimsy~="wave"] elements under `root` into bobbing chars. */
  hydrate(root?: ParentNode | null): void;
  /** hydrate() now and watch `root` for inserted whimsy nodes (SPA). Returns a disconnect fn. */
  observe(root?: Element | null): () => void;
  /** Ignite a target when a trigger word is typed into `input`. Returns a teardown fn. */
  watch(
    input: HTMLElement | null,
    opts?: { triggers?: string[]; target?: Element | null; loops?: number; settle?: 'static' | 'glacial' },
  ): () => void;
  /** One-shot celebration — auto-clears. */
  celebrate(el: Element | null, opts?: number | { ms?: number }): void;
  /** Dissolve treatment (fade-through-whimsy) for a leaving element. */
  dissolve(el: Element | null, opts?: Record<string, unknown>): void;
  /** Pure: the dissolve keyframe timeline for `opts` under a reduced-motion flag. */
  dissolveTimeline(opts?: Record<string, unknown>, reducedMotion?: boolean): unknown;
  /** Pure: parse a CSS duration string to milliseconds (NaN for invalid input). */
  parseMs(value: string | null | undefined): number;
  /** Swap [data-whimsy-greeting] elements under `root` to their seasonal line (idempotent). */
  greeting(root?: ParentNode): void;
  /** Pure: the greeting line + class set for a date. */
  greetingFor(date?: Date | null, opts?: { default?: string; defaultClass?: string }): unknown;
  /** Ignite, then settle after N hue-cycles. Returns a cancel fn. */
  run(el: Element | null, opts?: { loops?: number; settle?: 'static' | 'glacial' }): () => void;
  /** Freeze long-lived whimsy: 'static' (motion off) or 'glacial' (one slow drift). */
  settle(el: Element | null, mode?: 'static' | 'glacial'): void;
  /** Undo a settle. */
  unsettle(el: Element | null): void;
  /** Arrange a settle after `loops` hue-cycles. */
  scheduleSettle(el: Element | null, loops?: number, mode?: 'static' | 'glacial'): void;
  /** Manually add the flowing-gradient state. */
  ignite(el: Element | null): void;
  /** Manually remove the flowing-gradient state. */
  clear(el: Element | null): void;
}

declare global {
  interface Window {
    Whimsy?: WhimsyApi;
  }
}
export {};
