import test from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Alert,
  ButtonGroup,
  ListGroup,
  ListGroupItem,
  Button,
  Tabs,
  Listbox,
  Menu,
  Tree,
} from '../../dist/react/index.js';

const h = React.createElement;

test('Alert, ButtonGroup, ListGroup emit canonical Artificer classes', () => {
  const alertHtml = renderToStaticMarkup(h(Alert, { tier: 'urgent', title: 'Disk full' }, 'Free 2 GB to continue.'));
  assert.match(alertHtml, /class="alert alert--urgent"/);
  assert.match(alertHtml, /role="alert"/);
  assert.match(alertHtml, /class="alert__title"/);

  const bgHtml = renderToStaticMarkup(
    h(ButtonGroup, { label: 'View' }, h(Button, null, 'List'), h(Button, null, 'Grid')),
  );
  assert.match(bgHtml, /class="btn-group"/);
  assert.match(bgHtml, /role="group"/);

  const lgHtml = renderToStaticMarkup(
    h(ListGroup, null, h(ListGroupItem, { active: true }, 'Alpha'), h(ListGroupItem, null, 'Beta')),
  );
  assert.match(lgHtml, /class="list-group"/);
  assert.match(lgHtml, /class="list-group__item list-group__item--active"/);
});

test('Tabs renders APG tablist/tab/tabpanel roles and hidden inactive panels', () => {
  const html = renderToStaticMarkup(
    h(Tabs, {
      label: 'Views',
      items: [
        { id: 'a', label: 'Overview', content: 'A' },
        { id: 'b', label: 'Logs', content: 'B' },
      ],
    }),
  );
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tab"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /role="tabpanel"[^>]*hidden=""/);
});

test('Listbox and Menu render canonical roles and classes', () => {
  const lb = renderToStaticMarkup(
    h(Listbox, {
      label: 'Environments',
      selectedId: 'prod',
      items: [
        { id: 'dev', label: 'Dev' },
        { id: 'prod', label: 'Prod' },
      ],
    }),
  );
  assert.match(lb, /role="listbox"/);
  assert.match(lb, /class="listbox__option"/);
  assert.match(lb, /aria-selected="true"/);

  const menu = renderToStaticMarkup(
    h(Menu, {
      label: 'Actions',
      items: [{ id: 'del', label: 'Delete', danger: true }],
    }),
  );
  assert.match(menu, /role="menu"/);
  assert.match(menu, /class="menu__option menu__option--danger"/);
});

test('Tree renders APG tree/treeitem/group roles with expanded children', () => {
  const html = renderToStaticMarkup(
    h(Tree, {
      label: 'Files',
      defaultExpandedIds: ['src'],
      selectedId: 'index',
      nodes: [
        { id: 'src', label: 'src', children: [{ id: 'index', label: 'index.ts' }] },
      ],
    }),
  );
  assert.match(html, /role="tree"/);
  assert.match(html, /role="treeitem"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /role="group"/);
  assert.match(html, /aria-selected="true"/);
});
