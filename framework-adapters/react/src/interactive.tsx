/**
 * Interactive React wrappers wired to Artificer's pure keyboard state machines
 * (ArtificerTabs.nextIndex, ArtificerOptions.nextOption/matchOption,
 * ArtificerTree.nextVisible/treeAction). React owns the DOM; the vanilla
 * modules own the WAI-ARIA APG keyboard math (with inline fallback when the
 * module script hasn't attached to window yet).
 */

import * as React from 'react';
import { cx } from './primitives.js';
import type {} from '../../../types/tabs.js';
import type {} from '../../../types/options.js';
import type {} from '../../../types/tree.js';

// ─── Tabs ────────────────────────────────────────────────────────────────

export interface TabItem {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

export function Tabs({
  items,
  selectedId,
  defaultSelectedId,
  onSelect,
  orientation = 'horizontal',
  label,
  className = '',
}: {
  items: TabItem[];
  selectedId?: string;
  defaultSelectedId?: string;
  onSelect?: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
  label: string;
  className?: string;
}) {
  const baseId = React.useId();
  const [uncontrolled, setUncontrolled] = React.useState(
    () => defaultSelectedId ?? items[0]?.id ?? '',
  );
  const activeId = selectedId ?? uncontrolled;
  const activeIndex = Math.max(0, items.findIndex((t) => t.id === activeId));
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const selectIndex = (idx: number) => {
    const item = items[idx];
    if (!item || item.disabled) return;
    if (selectedId === undefined) setUncontrolled(item.id);
    onSelect?.(item.id);
    tabRefs.current[idx]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const next = window.ArtificerTabs?.nextIndex(e.key, activeIndex, items.length, { orientation })
      ?? fallbackNextIndex(e.key, activeIndex, items.length, orientation);
    if (next == null) return;
    e.preventDefault();
    selectIndex(next);
  };

  return (
    <div className={className || undefined}>
      <div
        className="tabs"
        role="tablist"
        aria-label={label}
        aria-orientation={orientation}
        onKeyDown={onKeyDown}
      >
        {items.map((item, i) => {
          const selected = i === activeIndex;
          const tabId = `${baseId}-tab-${item.id}`;
          const panelId = `${baseId}-panel-${item.id}`;
          return (
            <button
              key={item.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => selectIndex(i)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, i) => {
        const selected = i === activeIndex;
        const tabId = `${baseId}-tab-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;
        return (
          <div
            key={item.id}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            hidden={!selected}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}

function fallbackNextIndex(key: string, current: number, count: number, orientation: 'horizontal' | 'vertical'): number | null {
  if (count <= 0) return null;
  const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  if (key === nextKey) return (current + 1) % count;
  if (key === prevKey) return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

// ─── Listbox / Menu ──────────────────────────────────────────────────────

export interface OptionItem {
  id: string;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}

export function Listbox({
  items,
  selectedId,
  onSelect,
  variant = 'listbox',
  label,
  className = '',
}: {
  items: OptionItem[];
  selectedId?: string;
  onSelect?: (item: OptionItem) => void;
  variant?: 'listbox' | 'menu';
  label: string;
  className?: string;
}) {
  const isMenu = variant === 'menu';
  const [cursor, setCursor] = React.useState(() =>
    Math.max(0, items.findIndex((it) => it.id === selectedId)),
  );
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const bufferRef = React.useRef('');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const move = (idx: number) => {
    setCursor(idx);
    refs.current[idx]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const next = window.ArtificerOptions?.nextOption(e.key, cursor, items.length, { wrap: isMenu })
      ?? fallbackNextOption(e.key, cursor, items.length, isMenu);
    if (next != null) {
      e.preventDefault();
      move(next);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const item = items[cursor];
      if (item && !item.disabled) {
        e.preventDefault();
        onSelect?.(item);
      }
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      bufferRef.current += e.key;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { bufferRef.current = ''; }, 500);
      const hit = window.ArtificerOptions?.matchOption(
        items.map((it) => it.label),
        bufferRef.current,
        cursor,
      );
      if (hit != null && hit >= 0) {
        e.preventDefault();
        move(hit);
      }
    }
  };

  const optCls = isMenu ? 'menu__option' : 'listbox__option';

  return (
    <div
      role={isMenu ? 'menu' : 'listbox'}
      aria-label={label}
      className={cx(isMenu ? 'menu' : 'listbox', className)}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role={isMenu ? 'menuitem' : 'option'}
          aria-selected={isMenu ? undefined : item.id === selectedId}
          aria-disabled={item.disabled || undefined}
          tabIndex={i === cursor ? 0 : -1}
          className={cx(optCls, item.danger && isMenu && 'menu__option--danger')}
          onClick={() => {
            setCursor(i);
            if (!item.disabled) onSelect?.(item);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Menu(props: Omit<React.ComponentProps<typeof Listbox>, 'variant'>) {
  return <Listbox {...props} variant="menu" />;
}

function fallbackNextOption(key: string, current: number, count: number, wrap: boolean): number | null {
  if (count <= 0) return null;
  if (key === 'ArrowDown') return wrap ? (current + 1) % count : Math.min(count - 1, current + 1);
  if (key === 'ArrowUp') return wrap ? (current - 1 + count) % count : Math.max(0, current - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

// ─── Tree ────────────────────────────────────────────────────────────────

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

export function Tree({
  nodes,
  selectedId,
  defaultExpandedIds = [],
  onSelect,
  label,
  className = '',
}: {
  nodes: TreeNode[];
  selectedId?: string;
  defaultExpandedIds?: string[];
  onSelect?: (node: TreeNode) => void;
  label: string;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(defaultExpandedIds));
  const [focusedId, setFocusedId] = React.useState<string>(() => selectedId ?? nodes[0]?.id ?? '');
  const refs = React.useRef<Map<string, HTMLLIElement | null>>(new Map());

  const visible: Array<{ node: TreeNode; parentId: string | null }> = [];
  const walk = (list: TreeNode[], parentId: string | null) => {
    for (const node of list) {
      visible.push({ node, parentId });
      if (node.children?.length && expanded.has(node.id)) walk(node.children, node.id);
    }
  };
  walk(nodes, null);

  const focusNode = (id: string) => {
    setFocusedId(id);
    refs.current.get(id)?.focus();
  };

  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const idx = Math.max(0, visible.findIndex((v) => v.node.id === focusedId));
    const entry = visible[idx];
    if (!entry) return;
    const isParent = Boolean(entry.node.children?.length);
    const isExpanded = expanded.has(entry.node.id);

    const moved = window.ArtificerTree?.nextVisible(e.key, idx, visible.length)
      ?? fallbackNextOption(e.key, idx, visible.length, false);
    if (moved != null) {
      const target = visible[moved];
      if (target) {
        e.preventDefault();
        focusNode(target.node.id);
      }
      return;
    }
    const action = window.ArtificerTree?.treeAction(e.key, { expanded: isExpanded, isParent })
      ?? fallbackTreeAction(e.key, isExpanded, isParent);
    if (!action) return;
    e.preventDefault();
    const firstChild = entry.node.children?.[0];
    if (action === 'expand' && isParent && !isExpanded) toggleNode(entry.node.id);
    else if (action === 'collapse' && isParent && isExpanded) toggleNode(entry.node.id);
    else if (action === 'first-child' && firstChild) focusNode(firstChild.id);
    else if (action === 'parent' && entry.parentId) focusNode(entry.parentId);
    else if (action === 'activate') {
      if (isParent) toggleNode(entry.node.id);
      else onSelect?.(entry.node);
    }
  };

  const renderNodes = (list: TreeNode[]) =>
    list.map((node) => {
      const isParent = Boolean(node.children?.length);
      const isExpanded = expanded.has(node.id);
      const isFocused = node.id === focusedId;
      return (
        <li
          key={node.id}
          ref={(el) => { refs.current.set(node.id, el); }}
          role="treeitem"
          aria-expanded={isParent ? isExpanded : undefined}
          aria-selected={node.id === selectedId}
          tabIndex={isFocused ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            focusNode(node.id);
            if (isParent) toggleNode(node.id);
            else onSelect?.(node);
          }}
        >
          <span className="tree__row">
            {isParent && <span className="tree__twisty" aria-hidden="true" />}
            <span>{node.label}</span>
          </span>
          {isParent && isExpanded && (
            <ul role="group">{renderNodes(node.children!)}</ul>
          )}
        </li>
      );
    });

  return (
    <ul role="tree" aria-label={label} className={cx('tree', className)} onKeyDown={onKeyDown}>
      {renderNodes(nodes)}
    </ul>
  );
}

function fallbackTreeAction(key: string, expanded: boolean, isParent: boolean): string | null {
  if (key === 'ArrowRight') return isParent ? (expanded ? 'first-child' : 'expand') : null;
  if (key === 'ArrowLeft') return isParent && expanded ? 'collapse' : 'parent';
  if (key === 'Enter' || key === ' ') return 'activate';
  return null;
}
