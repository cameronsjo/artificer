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
export declare function ThemeToggle({ inline, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    inline?: boolean;
}): React.JSX.Element;
/**
 * Reactive read of the applied theme ('dark' | 'light'). State is OWNED by
 * artificer-theme.js — this hook only observes `data-theme` on <html>; call
 * `toggle()` (which defers to the module) to change it. Replaces the removed
 * 2-state `useTheme`, which duplicated the module's persistence and predated
 * the canonical dark → light → auto cycle.
 */
export declare function useThemeMode(): {
    theme: 'dark' | 'light';
    toggle: () => void;
};
export declare function AppShell({ rail, gap, className, style, ...rest }: React.HTMLAttributes<HTMLDivElement> & {
    /** Rail column width — sets --shell-rail (default 240px). */
    rail?: string;
    /** Rail↔content column gap — sets --shell-gap (default 0). */
    gap?: string;
}): React.JSX.Element;
export declare function AppShellContent({ as: As, className, ...rest }: React.HTMLAttributes<HTMLElement> & {
    as?: React.ElementType;
}): React.JSX.Element;
export declare function Appbar({ brand, brandHref, brandWhimsy, contained, sticky, search, actions, menu, className, children, ...rest }: React.HTMLAttributes<HTMLElement> & {
    /** Brand text/node — rendered inside the canonical `.appbar__brand > .wordmark` composition. */
    brand: React.ReactNode;
    brandHref?: string;
    /** Adds `.whimsy` to the wordmark (the brand is the sanctioned whimsy home in the bar). */
    brandWhimsy?: boolean;
    /** `.appbar--contained` — zero inline padding when the bar sits inside a padded container. */
    contained?: boolean;
    /** false → `.appbar--static` (opts out of sticky positioning). */
    sticky?: boolean;
    search?: React.ReactNode;
    actions?: React.ReactNode;
    /** Hamburger — appears below --bp-tablet via the `.appbar__menu-btn` rule. */
    menu?: {
        controls: string;
        open: boolean;
        onClick: () => void;
        label?: string;
    };
}): React.JSX.Element;
export declare function NavDrawer({ open, onClose, id, label, className, children, }: {
    open: boolean;
    onClose: () => void;
    /** Matches the Appbar menu's aria-controls. */
    id: string;
    label?: string;
    className?: string;
    children: React.ReactNode;
}): React.JSX.Element;
export interface SideNavItem {
    key: string;
    label: React.ReactNode;
    /** Rendered as <a href> when present, else a <button> (SPA state switch). */
    href?: string;
    onSelect?: () => void;
    active?: boolean;
    /** Lucide-canonical icon name, rendered as `<i data-icon>`. */
    icon?: string;
    count?: React.ReactNode;
}
export interface SideNavGroup {
    key: string;
    label: React.ReactNode;
    items: SideNavItem[];
}
/**
 * The section spine. Flat groups by default; `sections` renders each group as
 * a collapsible `<details class="sidenav__section">` driven by the pure
 * open-state machine (desktop open, mobile collapsed-except-active,
 * force-open on navigation change, user toggles sticky, viewport changes
 * re-derive untouched sections only).
 */
export declare function SideNav({ groups, sections, sticky, footer, className, ...rest }: React.HTMLAttributes<HTMLElement> & {
    groups: SideNavGroup[];
    sections?: boolean;
    /** `.sidenav--sticky` — the pinned rail (set --sidenav-sticky-top to clear sticky chrome). */
    sticky?: boolean;
    /** Bottom-anchored row (SideNavFooter) — the theme toggle's drawer seat. */
    footer?: React.ReactNode;
}): React.JSX.Element;
/** Bottom-anchored settings row — the theme toggle's drawer seat. */
export declare function SideNavFooter({ label, className, children, ...rest }: React.HTMLAttributes<HTMLDivElement> & {
    label?: React.ReactNode;
}): React.JSX.Element;
//# sourceMappingURL=chrome.d.ts.map