/**
 * Interactive React wrappers wired to Artificer's pure keyboard state machines
 * (ArtificerTabs.nextIndex, ArtificerOptions.nextOption/matchOption,
 * ArtificerTree.nextVisible/treeAction). React owns the DOM; the vanilla
 * modules own the WAI-ARIA APG keyboard math (with inline fallback when the
 * module script hasn't attached to window yet).
 */
import * as React from 'react';
export interface TabItem {
    id: string;
    label: React.ReactNode;
    content: React.ReactNode;
    disabled?: boolean;
}
export declare function Tabs({ items, selectedId, defaultSelectedId, onSelect, orientation, label, className, }: {
    items: TabItem[];
    selectedId?: string;
    defaultSelectedId?: string;
    onSelect?: (id: string) => void;
    orientation?: 'horizontal' | 'vertical';
    label: string;
    className?: string;
}): React.JSX.Element;
export interface OptionItem {
    id: string;
    label: string;
    disabled?: boolean;
    danger?: boolean;
}
export declare function Listbox({ items, selectedId, onSelect, variant, label, className, }: {
    items: OptionItem[];
    selectedId?: string;
    onSelect?: (item: OptionItem) => void;
    variant?: 'listbox' | 'menu';
    label: string;
    className?: string;
}): React.JSX.Element;
export declare function Menu(props: Omit<React.ComponentProps<typeof Listbox>, 'variant'>): React.JSX.Element;
export interface TreeNode {
    id: string;
    label: string;
    children?: TreeNode[];
}
export declare function Tree({ nodes, selectedId, defaultExpandedIds, onSelect, label, className, }: {
    nodes: TreeNode[];
    selectedId?: string;
    defaultExpandedIds?: string[];
    onSelect?: (node: TreeNode) => void;
    label: string;
    className?: string;
}): React.JSX.Element;
//# sourceMappingURL=interactive.d.ts.map