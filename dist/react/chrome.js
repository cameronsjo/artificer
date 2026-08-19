import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * App chrome — the shared shell every Artificer tool-SPA composes: appbar,
 * nav drawer, sidenav (flat or collapsible sections), and the theme toggle.
 *
 * One implementation, canonical markup, behavior from the shipped vanilla
 * modules (artificer-theme.js, artificer-focus.js) — never re-implemented
 * here. Born from the 2026-08 mobile sweep, where hand-copied chrome drifted
 * into divergent bugs across consumers.
 */
import * as React from 'react';
import { cx, safeHref } from './primitives.js';
import { defaultSectionOpen, onNavigationActivates, onUserToggle, onViewportChange, } from './sidenav-sections.js';
// ─── ThemeToggle ─────────────────────────────────────────────────────────
//
// The canonical control is an EMPTY button — artificer-theme.js observes the
// DOM (v0.19.0+), injects the half-circle glyph, narrates state on
// aria-label/title, and keeps every instance on the page in sync. React must
// render it childless and never manage its state.
export function ThemeToggle({ inline = false, className, ...rest }) {
    return (_jsx("button", { type: "button", "data-theme-toggle": true, "aria-label": "Toggle theme", ...rest, className: cx('theme-toggle', inline && 'theme-toggle--inline', className) }));
}
/**
 * Reactive read of the applied theme ('dark' | 'light'). State is OWNED by
 * artificer-theme.js — this hook only observes `data-theme` on <html>; call
 * `toggle()` (which defers to the module) to change it. Replaces the removed
 * 2-state `useTheme`, which duplicated the module's persistence and predated
 * the canonical dark → light → auto cycle.
 */
export function useThemeMode() {
    const subscribe = React.useCallback((onChange) => {
        const mo = new MutationObserver(onChange);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => mo.disconnect();
    }, []);
    const theme = React.useSyncExternalStore(subscribe, () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'), () => 'dark');
    const toggle = React.useCallback(() => {
        window.ArtificerTheme?.toggle?.();
    }, []);
    return { theme, toggle };
}
// ─── AppShell ────────────────────────────────────────────────────────────
export function AppShell({ rail, gap, className, style, ...rest }) {
    const vars = {};
    if (rail)
        vars['--shell-rail'] = rail;
    if (gap)
        vars['--shell-gap'] = gap;
    return (_jsx("div", { ...rest, style: { ...vars, ...style }, className: cx('app-shell', className) }));
}
export function AppShellContent({ as: As = 'main', className, ...rest }) {
    return _jsx(As, { ...rest, className: cx('app-shell__content', className) });
}
// ─── Appbar ──────────────────────────────────────────────────────────────
export function Appbar({ brand, brandHref = '/', brandWhimsy = false, contained = false, sticky = true, search, actions, menu, className, children, ...rest }) {
    return (_jsxs("header", { ...rest, className: cx('appbar', contained && 'appbar--contained', !sticky && 'appbar--static', className), children: [menu && (_jsx("button", { type: "button", className: "btn btn--ghost btn--icon btn--icon-prominent appbar__menu-btn", "aria-controls": menu.controls, "aria-expanded": menu.open, "aria-label": menu.label ?? (menu.open ? 'Close navigation' : 'Open navigation'), onClick: menu.onClick, children: _jsx("i", { "data-icon": "menu", "aria-hidden": "true" }) })), _jsx("a", { className: "appbar__brand", href: safeHref(brandHref) ?? '/', children: _jsx("span", { className: cx('wordmark', brandWhimsy && 'whimsy'), children: brand }) }), search && _jsx("div", { className: "appbar__search", children: search }), _jsx("span", { className: "appbar__spacer" }), actions && _jsx("div", { className: "appbar__actions", children: actions }), children] }));
}
// ─── NavDrawer ───────────────────────────────────────────────────────────
//
// Off-canvas drawer + scrim. The `[data-nav-open]` CSS hook lives on a
// display:contents wrapper OWNED by the component, so consumers don't manage
// an ancestor attribute. Closed → `inert` (set via attribute for React 18
// compat); open → focus-trapped via artificer-focus.js, Esc and scrim-click
// close.
export function NavDrawer({ open, onClose, id, label = 'Navigation', className, children, }) {
    const ref = React.useRef(null);
    // Attribute toggle in a LAYOUT effect — synchronous before paint, so a
    // closed drawer is never focusable-while-aria-hidden for a visible frame.
    // The declarative prop can't serve both React majors: 18 renders only the
    // string form (`inert=""`) and warns on booleans; 19 types it boolean and
    // DROPS the falsy string. CSR contract: pre-hydration SSR markup carries
    // aria-hidden only (both current consumers are CSR SPAs).
    React.useLayoutEffect(() => {
        ref.current?.toggleAttribute('inert', !open);
    }, [open]);
    React.useEffect(() => {
        if (!open || !ref.current || !window.ArtificerFocus)
            return;
        const trap = window.ArtificerFocus.trap(ref.current, { onEscape: onClose });
        return () => trap.release();
    }, [open, onClose]);
    return (_jsxs("div", { style: { display: 'contents' }, ...(open ? { 'data-nav-open': '' } : {}), children: [_jsx("div", { className: "nav-scrim", onClick: onClose }), _jsx("aside", { ref: ref, id: id, className: cx('nav-drawer', className), "aria-label": label, "aria-hidden": !open, children: children })] }));
}
function SideNavRow({ item }) {
    const inner = (_jsxs(_Fragment, { children: [item.icon && _jsx("i", { "data-icon": item.icon, "aria-hidden": "true" }), _jsx("span", { className: "label", children: item.label }), item.count != null && _jsx("span", { className: "count", children: item.count })] }));
    const current = item.active ? { 'aria-current': 'page' } : {};
    // safeHref: a scheme-bearing href must be http/https/mailto/tel — a
    // javascript: URL from a dynamic nav source would execute on click.
    const href = safeHref(item.href);
    return href ? (_jsx("a", { href: href, ...current, onClick: item.onSelect, children: inner })) : (_jsx("button", { type: "button", ...current, onClick: item.onSelect, children: inner }));
}
const TABLET_QUERY = '(max-width: 800px)'; // literal mirror of --bp-tablet (CSS @media can't read tokens)
function currentViewport() {
    return typeof window !== 'undefined' && window.matchMedia(TABLET_QUERY).matches ? 'mobile' : 'desktop';
}
function groupIsActive(group) {
    return group.items.some((i) => i.active);
}
/**
 * The section spine. Flat groups by default; `sections` renders each group as
 * a collapsible `<details class="sidenav__section">` driven by the pure
 * open-state machine (desktop open, mobile collapsed-except-active,
 * force-open on navigation change, user toggles sticky, viewport changes
 * re-derive untouched sections only).
 */
export function SideNav({ groups, sections = false, sticky = false, footer, className, ...rest }) {
    // SSR-agnostic initial state: always the 'desktop' shape (every section
    // open), matching what a server render would have produced — a viewport
    // read here would hydration-mismatch on a mobile client (<details open>
    // disagreement). The mount effect below corrects to the real viewport.
    const [openMap, setOpenMap] = React.useState(() => Object.fromEntries(groups.map((g) => [g.key, { open: defaultSectionOpen('desktop', groupIsActive(g)), touched: false }])));
    // Track per-group active state so a navigation that ACTIVATES a section
    // force-opens it (false→true edge only — a deliberate collapse of the
    // already-active section is never fought).
    const prevActive = React.useRef({});
    React.useEffect(() => {
        if (!sections)
            return;
        setOpenMap((m) => {
            let next = m;
            for (const g of groups) {
                const active = groupIsActive(g);
                const was = prevActive.current[g.key] ?? false;
                prevActive.current[g.key] = active;
                const state = m[g.key] ?? { open: defaultSectionOpen(currentViewport(), active), touched: false };
                if (active && !was) {
                    if (next === m)
                        next = { ...m };
                    next[g.key] = onNavigationActivates(state);
                }
                else if (!(g.key in m)) {
                    if (next === m)
                        next = { ...m };
                    next[g.key] = state;
                }
            }
            return next;
        });
    }, [sections, groups]);
    // Viewport crossings re-derive defaults for untouched sections — and the
    // same correction runs ONCE at mount, because the initial state above is
    // deliberately the SSR-safe desktop shape rather than a viewport read.
    React.useEffect(() => {
        if (!sections || typeof window === 'undefined')
            return;
        const mq = window.matchMedia(TABLET_QUERY);
        const applyViewport = () => {
            const vp = mq.matches ? 'mobile' : 'desktop';
            setOpenMap((m) => Object.fromEntries(groups.map((g) => {
                const state = m[g.key] ?? { open: defaultSectionOpen(vp, groupIsActive(g)), touched: false };
                return [g.key, onViewportChange(state, vp, groupIsActive(g))];
            })));
        };
        applyViewport();
        mq.addEventListener('change', applyViewport);
        return () => mq.removeEventListener('change', applyViewport);
    }, [sections, groups]);
    return (_jsxs("nav", { ...rest, className: cx('sidenav', sticky && 'sidenav--sticky', className), children: [groups.map((g) => sections ? (_jsxs("details", { className: "sidenav__section", open: openMap[g.key]?.open ?? true, onToggle: (e) => {
                    const nextOpen = e.currentTarget.open;
                    setOpenMap((m) => {
                        const state = m[g.key];
                        if (state && state.open === nextOpen)
                            return m; // programmatic echo, not a user toggle
                        return { ...m, [g.key]: onUserToggle(nextOpen) };
                    });
                }, children: [_jsx("summary", { children: g.label }), g.items.map((item) => (_jsx(SideNavRow, { item: item }, item.key)))] }, g.key)) : (_jsxs(React.Fragment, { children: [_jsx("div", { className: "sidenav__group", children: g.label }), g.items.map((item) => (_jsx(SideNavRow, { item: item }, item.key)))] }, g.key))), footer] }));
}
/** Bottom-anchored settings row — the theme toggle's drawer seat. */
export function SideNavFooter({ label = 'Theme', className, children, ...rest }) {
    return (_jsxs("div", { ...rest, className: cx('sidenav__footer', className), children: [_jsx("span", { children: label }), children ?? _jsx(ThemeToggle, { inline: true })] }));
}
