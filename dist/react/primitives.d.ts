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
export declare function cx(...parts: Array<string | false | null | undefined>): string;
/**
 * Nav-href guard — the chrome components are the first place Artificer
 * renders consumer-supplied strings into <a href>, so the scheme check lives
 * here once instead of in every consumer. React renders `javascript:` URLs
 * (dev-warning only), which would execute in the app origin on click.
 * Allowed: relative paths, fragments, queries, and http/https/mailto/tel.
 * Anything else returns undefined — the caller drops the attribute.
 */
export declare function safeHref(href: string | undefined): string | undefined;
type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export declare function Stack({ gap, as: As, className, ...rest }: React.HTMLAttributes<HTMLElement> & {
    gap?: StackGap;
    as?: React.ElementType;
}): React.JSX.Element;
export declare function Cluster({ gap, between, end, as: As, className, ...rest }: React.HTMLAttributes<HTMLElement> & {
    gap?: 'sm' | 'md' | 'lg';
    between?: boolean;
    end?: boolean;
    as?: React.ElementType;
}): React.JSX.Element;
export declare function Container({ size, as: As, className, ...rest }: React.HTMLAttributes<HTMLElement> & {
    size?: 'sm' | 'md' | 'lg';
    as?: React.ElementType;
}): React.JSX.Element;
export declare function GridAuto({ min, className, style, ...rest }: React.HTMLAttributes<HTMLDivElement> & {
    min?: number;
}): React.JSX.Element;
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export declare function Button({ variant, size, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: 'sm';
}): React.JSX.Element;
interface FieldControlProps {
    id?: string;
    'aria-invalid'?: 'true';
    'aria-describedby'?: string;
}
export declare function Field({ label, hint, error, id, className, children, }: {
    label: string;
    hint?: string;
    error?: string;
    id: string;
    className?: string;
    children: React.ReactElement<FieldControlProps>;
}): React.JSX.Element;
export declare const Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => React.JSX.Element;
export declare const Textarea: (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => React.JSX.Element;
export declare const Select: (p: React.SelectHTMLAttributes<HTMLSelectElement>) => React.JSX.Element;
type NotifTier = 'urgent' | 'attention' | 'info' | 'background';
export declare function Notification({ tier, title, children, action, }: {
    tier?: NotifTier;
    title: string;
    children?: React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
}): React.JSX.Element;
declare global {
    interface Window {
        ArtificerFocus?: {
            trap: (el: HTMLElement, opts?: {
                onEscape?: (e: Event) => void;
            }) => {
                release: () => void;
            };
        };
    }
}
export declare function Modal({ open, onClose, title, children, footer, labelledBy, }: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    labelledBy?: string;
}): React.JSX.Element | null;
export declare function Icon({ name, ...rest }: {
    name: string;
} & React.HTMLAttributes<HTMLElement>): React.JSX.Element;
export declare function useIcons(ref?: React.RefObject<HTMLElement | null>): void;
export declare function useWhimsy(ref?: React.RefObject<HTMLElement | null>): void;
export {};
//# sourceMappingURL=primitives.d.ts.map