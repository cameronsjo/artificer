import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export function cx(...parts) {
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
export function safeHref(href) {
    if (href == null)
        return undefined;
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
export function Stack({ gap = 'md', as: As = 'div', className = '', ...rest }) {
    return _jsx(As, { ...rest, className: cx('stack', `stack--${gap}`, className) });
}
export function Cluster({ gap = 'md', between, end, as: As = 'div', className = '', ...rest }) {
    return (_jsx(As, { ...rest, className: cx('cluster', `cluster--${gap}`, between && 'cluster--between', end && 'cluster--end', className) }));
}
export function Container({ size = 'md', as: As = 'div', className = '', ...rest }) {
    return _jsx(As, { ...rest, className: cx('container', `container--${size}`, className) });
}
export function GridAuto({ min = 240, className = '', style, ...rest }) {
    const vars = { '--min': `${min}px` };
    return _jsx("div", { ...rest, style: { ...vars, ...style }, className: cx('grid-auto', className) });
}
export function Button({ variant = 'secondary', size, className = '', ...rest }) {
    return _jsx("button", { ...rest, className: cx('btn', `btn--${variant}`, size && `btn--${size}`, className) });
}
export function Field({ label, hint, error, id, className = '', children, }) {
    const errId = error ? `${id}-err` : undefined;
    const hintId = !error && hint ? `${id}-hint` : undefined;
    const extra = { id };
    if (error)
        extra['aria-invalid'] = 'true';
    const describedBy = errId ?? hintId;
    if (describedBy)
        extra['aria-describedby'] = describedBy;
    return (_jsxs("div", { className: cx('field', error && 'field--invalid', className), children: [_jsx("label", { className: "field__label", htmlFor: id, children: label }), React.cloneElement(children, extra), error && (_jsx("p", { className: "field__error", id: errId, children: error })), !error && hint && (_jsx("p", { className: "field__hint", id: hintId, children: hint }))] }));
}
export const Input = (p) => (_jsx("input", { ...p, className: cx('input', p.className) }));
export const Textarea = (p) => (_jsx("textarea", { ...p, className: cx('textarea', p.className) }));
export const Select = (p) => (_jsx("select", { ...p, className: cx('select', p.className) }));
export function Notification({ tier = 'info', title, children, action, }) {
    // Live-region contract: urgent → alert (assertive) · attention/info →
    // status (polite) · background → NO role — a silent badge, never announced.
    const role = tier === 'urgent' ? 'alert' : tier === 'background' ? undefined : 'status';
    return (_jsxs("div", { className: `notif notif--${tier}`, ...(role ? { role } : {}), children: [_jsx("span", { className: `dot dot--${tier}`, "aria-hidden": "true" }), _jsxs("div", { className: "notif__body", children: [_jsx("p", { className: "notif__title", children: title }), children && _jsx("p", { className: "notif__msg", children: children })] }), action && (_jsx(Button, { variant: "ghost", size: "sm", onClick: action.onClick, children: action.label }))] }));
}
export function Modal({ open, onClose, title, children, footer, labelledBy, }) {
    const ref = React.useRef(null);
    // useId is called unconditionally — `labelledBy || useId()` would make the
    // hook conditional on the prop, which React forbids.
    const autoId = React.useId();
    const titleId = labelledBy ?? autoId;
    React.useEffect(() => {
        if (!open || !ref.current || !window.ArtificerFocus)
            return;
        const trap = window.ArtificerFocus.trap(ref.current, { onEscape: onClose });
        return () => trap.release();
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsx("div", { className: "scrim", role: "presentation", onClick: (e) => {
            if (e.target === e.currentTarget)
                onClose();
        }, children: _jsxs("div", { ref: ref, className: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, children: [_jsx("h2", { id: titleId, className: "modal__title", children: title }), _jsx("div", { className: "modal__body", children: children }), footer && _jsx("div", { className: "modal__footer", children: footer })] }) }));
}
// ─── Icon ────────────────────────────────────────────────────────────────
//
// Renders the <i data-icon> placeholder and hydrates it after mount via
// artificer-icons.js. For a whole subtree of icons mounted at once, prefer
// useIcons(ref) on the container, or ArtificerIcons.observe(root).
export function Icon({ name, ...rest }) {
    const ref = React.useRef(null);
    React.useEffect(() => {
        window.ArtificerIcons?.hydrate(ref.current?.parentElement ?? document);
    }, [name]);
    return _jsx("i", { ref: ref, "data-icon": name, "aria-hidden": "true", ...rest });
}
// ─── Lifecycle hooks (SPA) ───────────────────────────────────────────────
export function useIcons(ref) {
    React.useEffect(() => {
        window.ArtificerIcons?.hydrate(ref?.current ?? document);
    });
}
export function useWhimsy(ref) {
    React.useEffect(() => {
        const scope = ref?.current ?? document;
        const w = window;
        w.Whimsy?.hydrate(scope);
        w.Whimsy?.greeting?.(scope);
    });
}
