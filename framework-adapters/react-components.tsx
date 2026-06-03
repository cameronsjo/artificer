/**
 * React component starters for Artificer.
 *
 * These are intentionally thin — they emit Artificer CSS classes; they don't reinvent the system.
 * Copy what you need into your component library; throw away what you don't.
 *
 * Setup once, in your app entry (e.g. main.tsx, app/layout.tsx):
 *
 *   import 'artificer/artificer.css';
 *   import 'artificer/artificer-theme.js';
 *   import 'artificer/artificer-focus.js';   // only if using <Modal>
 *   import 'artificer/artificer-icons.js';   // only if using <Icon>
 */

import * as React from 'react';

// ─── Layout ──────────────────────────────────────────────────────────────

type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export function Stack({ gap = 'md', as: As = 'div', className = '', ...rest }:
  React.HTMLAttributes<HTMLElement> & { gap?: StackGap; as?: React.ElementType }
) {
  return <As {...rest} className={`stack stack--${gap} ${className}`.trim()} />;
}

export function Cluster({
  gap = 'md', between, end, as: As = 'div', className = '', ...rest
}: React.HTMLAttributes<HTMLElement> & {
  gap?: 'sm' | 'md' | 'lg'; between?: boolean; end?: boolean; as?: React.ElementType
}) {
  const cls = ['cluster', `cluster--${gap}`, between && 'cluster--between', end && 'cluster--end', className]
    .filter(Boolean).join(' ');
  return <As {...rest} className={cls} />;
}

export function Container({
  size = 'md', as: As = 'div', className = '', ...rest
}: React.HTMLAttributes<HTMLElement> & { size?: 'sm' | 'md' | 'lg'; as?: React.ElementType }) {
  return <As {...rest} className={`container container--${size} ${className}`.trim()} />;
}

export function GridAuto({
  min = 240, className = '', style, ...rest
}: React.HTMLAttributes<HTMLDivElement> & { min?: number }) {
  return <div {...rest} style={{ ['--min' as any]: `${min}px`, ...style }}
              className={`grid-auto ${className}`.trim()} />;
}

// ─── Button ──────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export function Button({
  variant = 'secondary', size, className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: 'sm';
}) {
  const cls = ['btn', `btn--${variant}`, size && `btn--${size}`, className].filter(Boolean).join(' ');
  return <button {...rest} className={cls} />;
}

// ─── Form field ──────────────────────────────────────────────────────────
//
// Always: label → control → (hint OR error). Never placeholder-as-label.
// Pass `error` for invalid state; `hint` is suppressed when error is present.

export function Field({
  label, hint, error, id, className = '', children
}: {
  label: string; hint?: string; error?: string; id: string;
  className?: string; children: React.ReactElement;
}) {
  const errId = error ? `${id}-err` : undefined;
  const hintId = !error && hint ? `${id}-hint` : undefined;
  return (
    <div className={`field${error ? ' field--invalid' : ''} ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>{label}</label>
      {React.cloneElement(children, {
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': errId || hintId,
      })}
      {error  && <p className="field__error" id={errId}>{error}</p>}
      {!error && hint && <p className="field__hint" id={hintId}>{hint}</p>}
    </div>
  );
}

export const Input    = (p: React.InputHTMLAttributes<HTMLInputElement>)        => <input className={`input ${p.className||''}`.trim()} {...p} />;
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>)  => <textarea className={`textarea ${p.className||''}`.trim()} {...p} />;
export const Select   = (p: React.SelectHTMLAttributes<HTMLSelectElement>)      => <select className={`select ${p.className||''}`.trim()} {...p} />;

// ─── Notification ────────────────────────────────────────────────────────
//
// Tier by *action required*, not severity:
//   urgent      — blocking error, action needed NOW
//   attention   — needs action soon
//   info        — heads-up, no action needed
//   background  — silent log

type NotifTier = 'urgent' | 'attention' | 'info' | 'background';
export function Notification({
  tier = 'info', title, children, action
}: {
  tier?: NotifTier; title: string; children?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className={`notif notif--${tier}`} role={tier === 'urgent' ? 'alert' : 'status'}>
      <span className={`dot dot--${tier}`} aria-hidden="true" />
      <div className="notif__body">
        <p className="notif__title">{title}</p>
        {children && <p className="notif__msg">{children}</p>}
      </div>
      {action && <Button variant="ghost" size="sm" onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────
//
// Auto focus-traps via artificer-focus.js. Esc closes, scrim-click closes,
// focus restores to the trigger.

declare global {
  interface Window { ArtificerFocus?: { trap: (el: HTMLElement, opts?: { onEscape?: (e: Event) => void }) => { release: () => void } } }
}

export function Modal({
  open, onClose, title, children, footer, labelledBy
}: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode; labelledBy?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const titleId = labelledBy || React.useId();

  React.useEffect(() => {
    if (!open || !ref.current || !window.ArtificerFocus) return;
    const trap = window.ArtificerFocus.trap(ref.current, { onEscape: onClose });
    return () => trap.release();
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="scrim" role="presentation"
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="modal__title">{title}</h2>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Icon ────────────────────────────────────────────────────────────────
//
// Renders the <i data-icon> placeholder and hydrates it after mount via
// artificer-icons.js. The mount-time hydrate is what makes it work in a SPA
// (the global DOMContentLoaded pass only covers first paint). For a whole
// subtree of icons mounted at once, prefer useIcons(ref) on the container,
// or ArtificerIcons.observe(root) for streamed/async content.

export function Icon({ name, ...rest }: { name: string } & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    (window as any).ArtificerIcons?.hydrate(ref.current?.parentElement || document);
  });
  return <i ref={ref} data-icon={name} aria-hidden="true" {...rest} />;
}

// ─── Lifecycle hooks (SPA) ───────────────────────────────────────────────
//
// Hydrate Artificer's vanilla JS modules against React-managed DOM. Call in
// a component that renders [data-icon] / [data-whimsy] nodes; pass a ref to
// scope it, or omit to hydrate the whole document. For content that streams
// in after mount (lists, async), use the module's observe(root) instead.

export function useIcons(ref?: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    (window as any).ArtificerIcons?.hydrate(ref?.current || document);
  });
}

export function useWhimsy(ref?: React.RefObject<HTMLElement>) {
  React.useEffect(() => {
    (window as any).Whimsy?.hydrate(ref?.current || document);
  });
}

// ─── Theme hook (optional) ───────────────────────────────────────────────

export function useTheme(): ['dark' | 'light', (t: 'dark' | 'light') => void] {
  const [theme, setTheme] = React.useState<'dark' | 'light'>(
    () => (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') as any) || 'dark'
  );
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Key MUST match vanilla artificer-theme.js ('artificer.theme', a DOT) or
    // theme won't persist across the SPA <-> first-paint-script boundary.
    try { localStorage.setItem('artificer.theme', theme); } catch {}
  }, [theme]);
  return [theme, setTheme];
}

/* ─── Example usage ──────────────────────────────────────────────────────

import { Stack, Container, Field, Input, Button, Modal, Notification } from './artificer';

function Settings() {
  const [confirm, setConfirm] = React.useState(false);
  const [error, setError] = React.useState('');

  return (
    <Container size="md">
      <Stack gap="lg">
        <h1 className="t-headline-lg">Settings.</h1>
        <Field id="email" label="Email" hint="We'll only use this for security alerts.">
          <Input type="email" />
        </Field>
        <Field id="region" label="Region" error={error}>
          <Input />
        </Field>
        <Cluster end>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary" onClick={() => setConfirm(true)}>Save</Button>
        </Cluster>
      </Stack>

      <Modal open={confirm} onClose={() => setConfirm(false)}
             title="Save changes?"
             footer={<>
               <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
               <Button variant="primary" onClick={() => setConfirm(false)}>Save</Button>
             </>}>
        These changes apply to your account immediately.
      </Modal>
    </Container>
  );
}

──────────────────────────────────────────────────────────────────────── */
