// Render the pinned Hermes build, with synthetic data and no live backend.
// Usage: node scripts/hermes-preview.mjs /path/to/hermes_cli/web_dist /path/to/output
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const [distArg, outArg] = process.argv.slice(2);
assert.ok(distArg && outArg, 'expected web_dist and output directory');
const dist = resolve(distArg), out = resolve(outArg);
mkdirSync(out, { recursive: true });
const theme = JSON.parse(readFileSync(new URL('../themes/hermes/artificer-dark.yaml', import.meta.url)));
const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
const jobs = [
  { id: 'preview-1', name: 'Morning infrastructure summary', prompt: 'Summarize service health and overnight changes.', state: 'scheduled', schedule: '0 8 * * *', next_run_at: '2026-09-08T13:00:00Z', last_run_at: '2026-09-07T13:00:00Z', deliver: 'local' },
  { id: 'preview-2', name: 'Weekly maintenance review', prompt: 'Review pending updates and prepare a maintenance checklist.', state: 'paused', schedule: '0 10 * * 6', deliver: 'local' },
  { id: 'preview-3', name: 'Evening digest', prompt: 'Collect the day’s notes and open follow-ups.', state: 'scheduled', schedule: '0 18 * * *', last_error: 'Delivery unavailable — retry scheduled', deliver: 'local' },
].map(j => ({ ...j, profile: 'default', enabled: true, skills: [], repeat: null }));

const fixtures = {
  '/api/dashboard/themes': { active: theme.name, themes: [{ name: 'default', label: 'Hermes Teal', description: 'Built-in' }, { name: theme.name, label: theme.label, description: theme.description, definition: theme }] },
  '/api/dashboard/font': { font: 'theme' },
  '/api/status': { version: '0.20.1', gateway_running: true, active_sessions: 2, platform: 'linux', model: 'preview', memory: {} },
  '/api/profiles': { profiles: [{ name: 'default', active: true }] },
  '/api/profiles/active': { active: 'default', name: 'default' },
  '/api/cron/jobs': jobs,
  '/api/cron/delivery-targets': { targets: [{ id: 'local', name: 'Local', home_target_set: true }] },
  '/api/cron/blueprints': { blueprints: [] },
  '/api/skills': [], '/api/tools/toolsets': [],
  '/api/model/options': { providers: [], models: [] },
  '/api/dashboard/theme': { ok: true },
  '/api/dashboard/plugins': [],
  '/api/config': {},
  '/api/auth/me': { authenticated: false },
};
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://hermes-preview.test') return route.abort();
    if (url.pathname.startsWith('/api/')) {
      const body = fixtures[url.pathname];
      if (body === undefined) console.error(`Unmocked API: ${url.pathname}`);
      return route.fulfill({ status: body === undefined ? 404 : 200, contentType: 'application/json', body: JSON.stringify(body ?? { detail: 'Synthetic preview has no fixture for this endpoint' }) });
    }
    const file = url.pathname.startsWith('/assets/') ? join(dist, url.pathname) : join(dist, 'index.html');
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
    return route.fulfill({ body: readFileSync(file), contentType: types[extname(file)] ?? 'text/html' });
  });
  await page.goto('http://hermes-preview.test/cron');
  await page.getByText('Morning infrastructure summary', { exact: true }).waitFor({ timeout: 10000 }).catch(async error => {
    console.error(await page.locator('body').innerText());
    await page.screenshot({ path: join(out, 'debug.png'), fullPage: true });
    throw error;
  });
  await page.waitForFunction(() => document.getElementById('hermes-theme-custom-css'));
  assert.deepEqual(errors, [], 'actual pinned dashboard must render without JS errors');
  const computed = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return { canvas: css.getPropertyValue('--background-base').trim(), text: css.getPropertyValue('--midground-base').trim(), secondary: css.getPropertyValue('--text-secondary').trim(), font: getComputedStyle(document.body).fontFamily, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  assert.equal(computed.canvas, theme.palette.background.hex);
  assert.equal(computed.text, theme.palette.midground.hex);
  assert.equal(computed.overflow, false);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  const card = await page.getByText('Morning infrastructure summary', { exact: true }).evaluate(el =>
    getComputedStyle(el.closest('[style*="--component-card-background"]')).backgroundColor);
  assert.equal(card, rgb(theme.componentStyles.card.background), 'actual card must use the canonical raised surface');
  const action = await page.getByRole('button', { name: 'Create', exact: true }).evaluate(el => ({
    background: getComputedStyle(el).backgroundColor, foreground: getComputedStyle(el).color,
  }));
  assert.equal(action.background, rgb(theme.colorOverrides.primary), 'primary action must use canonical gold fill');
  assert.equal(action.foreground, rgb(theme.colorOverrides.primaryForeground), 'primary action must use canonical ink');
  await page.screenshot({ path: join(out, 'hermes-artificer-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
  assert.equal(await page.getByRole('listbox').evaluate(el => getComputedStyle(el).backgroundColor), rgb(theme.colorOverrides.popover));
  await page.screenshot({ path: join(out, 'hermes-artificer-picker.png'), fullPage: true });
  await page.getByRole('option', { name: /Hermes Teal/ }).click();
  assert.equal(await page.locator('#hermes-theme-custom-css').count(), 0, 'native switch removes theme CSS');
  const upstreamAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
  await page.getByRole('option', { name: /Artificer Dark/ }).click();
  await page.setViewportSize({ width: 720, height: 900 });
  await page.screenshot({ path: join(out, 'hermes-artificer-narrow.png'), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log(JSON.stringify({ computed, card, action, errors,
    accessibility: accessibility.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })),
    upstreamAccessibility: upstreamAccessibility.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })),
    screenshots: out, themeSwitchCleanup: true, narrowOverflow: false }, null, 2));
} finally {
  await browser.close();
}
