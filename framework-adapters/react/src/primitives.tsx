/**
 * React primitives for Artificer — thin wrappers that emit the canonical CSS
 * classes; they don't reinvent the system.
 *
 * Setup once, in your app entry (e.g. main.tsx):
 *
 *   import '@cameronsjo/artificer/artificer.css';
 *   import '@cameronsjo/artificer/theme.js';
 *   import '@cameronsjo/artificer/focus.js';   // only if using <Modal> / <NavDrawer>
 *   import '@cameronsjo/artificer/icons.js';   // only if using <Icon>
 */

import * as React from 'react';

/** Join class names, dropping falsy segments. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Nav-href guard — the chrome components are the first place Artificer
 * renders consumer-supplied strings into <a href>, so the scheme check lives
 * here once instead of in every consumer. React renders `javascript:` URLs
 * (dev-warning only), which would execute in the app origin on click.
 * Allowed: relative paths, fragments, queries, and http/https/mailto/tel.
 * Anything else returns undefined — the caller drops the attribute.
 */
export function safeHref(href: string | undefined): string | undefined {
  if (href == null) return undefined;
  // Scheme-detect on what the BROWSER will parse, not the raw string: URL
  // parsers strip ASCII tab/LF/CR anywhere and C0 controls at the edges, so
  // `java\tscript:` is javascript: to the browser while a naive regex sees no
  // scheme at all (verified live — the bypass a consumer's security review
  // caught). The original href is what gets rendered; only the DECISION uses
  // the control-stripped view.
  const parsed = href.replace(/[\u0000-\u001f\u007f]/g, '').trimStart();
  if (/^(?:[a-z][a-z0-9+.-]*):/i.test(parsed)) {
    return /^(?:https?|mailto|tel):/i.test(parsed) ? href : undefined;
  }
  return href; // relative / fragment / query — no scheme to abuse
}

// ─── Layout ──────────────────────────────────────────────────────────────

type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export function Stack({
  gap = 'md',
  as: As = 'div',
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLElement> & { gap?: StackGap; as?: React.ElementType }) {
  return <As {...rest} className={cx('stack', `stack--${gap}`, className)} />;
}

export function Cluster({
  gap = 'md',
  between,
  end,
  as: As = 'div',
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  gap?: 'sm' | 'md' | 'lg';
  between?: boolean;
  end?: boolean;
  as?: React.ElementType;
}) {
  return (
    <As
      {...rest}
      className={cx('cluster', `cluster--${gap}`, between && 'cluster--between', end && 'cluster--end', className)}
    />
  );
}

export function Container({
  size = 'md',
  as: As = 'div',
  className = '',
  ...rest
}: React.HTMLAttributes<HTMLElement> & { size?: 'sm' | 'md' | 'lg'; as?: React.ElementType }) {
  return <As {...rest} className={cx('container', `container--${size}`, className)} />;
}

export function GridAuto({
  min = 240,
  className = '',
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { min?: number }) {
  const vars = { '--min': `${min}px` } as React.CSSProperties;
  return <div {...rest} style={{ ...vars, ...style }} className={cx('grid-auto', className)} />;
}

// ─── Button ──────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export function Button({
  variant = 'secondary',
  size,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' }) {
  return <button {...rest} className={cx('btn', `btn--${variant}`, size && `btn--${size}`, className)} />;
}

// ─── Form field ──────────────────────────────────────────────────────────
//
// Always: label → control → (hint OR error). Never placeholder-as-label.
// Pass `error` for invalid state; `hint` is suppressed when error is present.

interface FieldControlProps {
  id?: string;
  'aria-invalid'?: 'true';
  'aria-describedby'?: string;
}

export function Field({
  label,
  hint,
  error,
  id,
  className = '',
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  className?: string;
  children: React.ReactElement<FieldControlProps>;
}) {
  const errId = error ? `${id}-err` : undefined;
  const hintId = !error && hint ? `${id}-hint` : undefined;
  const extra: FieldControlProps = { id };
  if (error) extra['aria-invalid'] = 'true';
  const describedBy = errId ?? hintId;
  if (describedBy) extra['aria-describedby'] = describedBy;
  return (
    <div className={cx('field', error && 'field--invalid', className)}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {React.cloneElement(children, extra)}
      {error && (
        <p className="field__error" id={errId}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
}

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cx('input', p.className)} />
);
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx('textarea', p.className)} />
);
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx('select', p.className)} />
);

// ─── Notification ────────────────────────────────────────────────────────
//
// Tier by *action required*, not severity:
//   urgent      — blocking error, action needed NOW
//   attention   — needs action soon
//   info        — heads-up, no action needed
//   background  — silent log

type NotifTier = 'urgent' | 'attention' | 'info' | 'background';
export function Notification({
  tier = 'info',
  title,
  children,
  action,
}: {
  tier?: NotifTier;
  title: string;
  children?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  // Live-region contract: urgent → alert (assertive) · attention/info →
  // status (polite) · background → NO role — a silent badge, never announced.
  const role = tier === 'urgent' ? 'alert' : tier === 'background' ? undefined : 'status';
  return (
    <div className={`notif notif--${tier}`} {...(role ? { role } : {})}>
      <span className={`dot dot--${tier}`} aria-hidden="true" />
      <div className="notif__body">
        <p className="notif__title">{title}</p>
        {children && <p className="notif__msg">{children}</p>}
      </div>
      {action && (
        <Button variant="ghost" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────
//
// Auto focus-traps via artificer-focus.js. Esc closes, scrim-click closes,
// focus restores to the trigger.

// No local `declare global` here — the canonical Window.ArtificerFocus shape
// is single-homed in types/focus.d.ts (shipped via the ./focus.js export's
// types condition). A second, narrower declaration in this file merged into
// consumer type graphs and WON at their call sites (#407).
import type {} from '../../../types/focus.js';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  labelledBy?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  // useId is called unconditionally — `labelledBy || useId()` would make the
  // hook conditional on the prop, which React forbids.
  const autoId = React.useId();
  const titleId = labelledBy ?? autoId;

  React.useEffect(() => {
    if (!open || !ref.current || !window.ArtificerFocus) return;
    const trap = window.ArtificerFocus.trap(ref.current, { onEscape: onClose });
    return () => trap.release();
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="scrim"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="modal__title">
          {title}
        </h2>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Icon ────────────────────────────────────────────────────────────────
//
// Renders the <i data-icon> placeholder and hydrates it after mount via
// artificer-icons.js. For a whole subtree of icons mounted at once, prefer
// useIcons(ref) on the container, or ArtificerIcons.observe(root).

export function Icon({ name, ...rest }: { name: string } & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    (window as unknown as { ArtificerIcons?: { hydrate: (root: Node) => void } }).ArtificerIcons?.hydrate(
      ref.current?.parentElement ?? document,
    );
  }, [name]);
  return <i ref={ref} data-icon={name} aria-hidden="true" {...rest} />;
}

// ─── Lifecycle hooks (SPA) ───────────────────────────────────────────────

export function useIcons(ref?: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    (window as unknown as { ArtificerIcons?: { hydrate: (root: Node) => void } }).ArtificerIcons?.hydrate(
      ref?.current ?? document,
    );
  });
}

export function useWhimsy(ref?: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const scope = ref?.current ?? document;
    const w = window as unknown as {
      Whimsy?: { hydrate: (root: Node) => void; greeting?: (root: Node) => void };
    };
    w.Whimsy?.hydrate(scope);
    w.Whimsy?.greeting?.(scope);
  });
}
