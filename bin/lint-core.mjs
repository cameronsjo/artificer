// Artificer Hard rule #1 lint engine — the single source of the discipline,
// shared by the workshop gate (scripts/lint-css-tokens.mjs, a thin wrapper) and
// the consumer `artificer lint` subcommand (bin/artificer.mjs). It lives in
// bin/ because that dir rides BOTH the npm payload (package.json files) and the
// public export ({ dir: 'bin' }); scripts/ ships to the public repo but not to
// npm, so the engine cannot live there.
//
// Flags raw values in hand-authored CSS that have a token equivalent:
//   - raw hex colors (any), and
//   - on-scale spacing/radius px that maps to a token, and
//   - near-scale font-size px (within ±2px of a --t-*-size token),
// OUTSIDE custom-property definitions and comments. A trailing `/* tuned */`
// exempts a line (component-internal optical values). Off-scale px is skipped.
//
// The token maps are the WORKSHOP's scale by default (the built-ins below), so
// the wrapper's behavior is unchanged. The consumer subcommand projects the
// maps from a vendored tokens.json instead (buildTokenMaps), version-locking the
// lint to whatever the consumer vendored.

// ── Built-in maps (the workshop scale; the last-resort consumer fallback) ────
export const BUILTIN_SPACING = { 4: '--s-xs', 8: '--s-sm', 16: '--s-md', 24: '--s-lg', 32: '--s-xl', 48: '--s-2xl', 96: '--s-3xl' };
export const BUILTIN_RADIUS = { 4: '--radius-sm', 8: '--radius-md', 12: '--radius-lg' };
// Repo type scale in px (artificer.css --t-*-size definitions).
export const BUILTIN_TYPE_PX = [
  [28, '--t-headline-lg-size'], [22, '--t-headline-md-size'], [16, '--t-body-lg-size'],
  [14, '--t-body-md-size'], [13, '--t-label-md-size'], [12, '--t-label-sm-size'],
  [11, '--t-label-xs-size'],
];

const HEX = /#[0-9a-fA-F]{3,8}\b/;
// property declaration → captures prop name and its value (single declaration, no braces)
const DECL = /\b(gap|padding|margin|border-radius)\b[^;{}]*?:\s*([^;{}]+)/g;
const FONT_DECL = /\bfont-size\b\s*:\s*([^;{}]+)/g;
// Sheets whose type contract is NOT the repo scale — the Lane 2 Obsidian sister.
export const FONT_SCALE_EXEMPT = /theme\.src\.css$/;

// camelCase scale key → CSS var stem: headlineLg → headline-lg, labelSm → label-sm.
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const pxOf = (v) => {
  const m = /^(\d+(?:\.\d+)?)px$/.exec(String(v).trim());
  return m ? Number(m[1]) : null;
};
// rem/px size → px (1rem = 16px at the default root, which is never overridden).
const sizePx = (v) => {
  const s = String(v).trim();
  let m = /^(\d+(?:\.\d+)?)rem$/.exec(s);
  if (m) return Math.round(Number(m[1]) * 16);
  m = /^(\d+(?:\.\d+)?)px$/.exec(s);
  return m ? Math.round(Number(m[1])) : null;
};

// Project a parsed tokens.json into lint maps. The merge is PER-KEY, not
// per-section: the built-in map is the FLOOR (never lint weaker than the
// workshop scale — even against a tokens.json whose section OMITS a key the
// built-ins have, e.g. src/tokens.json's spacing has no `3xl` while
// artificer.css defines --s-3xl), and the projection overlays on top (it wins
// on shared px — that is the version-lock; the floor fills the gaps).
export function buildTokenMaps(tokens) {
  const spacing = { ...BUILTIN_SPACING };
  for (const [k, v] of Object.entries(tokens?.spacing ?? {})) {
    if (k.startsWith('$')) continue;
    const px = pxOf(v);
    if (px != null) spacing[px] = `--s-${k}`;
  }
  const radius = { ...BUILTIN_RADIUS };
  for (const [k, v] of Object.entries(tokens?.radius ?? {})) {
    if (k.startsWith('$')) continue;
    const px = pxOf(v?.value ?? v);
    if (px != null) radius[px] = `--radius-${k}`;
  }
  // px → token, seeded with the built-in floor, projection overlaid.
  const typeByPx = new Map(BUILTIN_TYPE_PX);
  for (const [k, v] of Object.entries(tokens?.typography?.scale ?? {})) {
    if (k.startsWith('$')) continue;
    const px = sizePx(v?.size ?? v);
    if (px != null) typeByPx.set(px, `--t-${kebab(k)}-size`);
  }
  return { spacing, radius, typePx: [...typeByPx.entries()] };
}

function nearestTypeToken(px, typePx) {
  let best = null;
  for (const [tpx, tok] of typePx) {
    const d = Math.abs(px - tpx);
    if (d <= 2 && (!best || d < best.d)) best = { d, tok, tpx };
  }
  return best;
}

export function lintText(text, { fontScale = true, tokens } = {}) {
  const spacingMap = tokens?.spacing ?? BUILTIN_SPACING;
  const radiusMap = tokens?.radius ?? BUILTIN_RADIUS;
  const typePx = tokens?.typePx ?? BUILTIN_TYPE_PX;
  const out = [];
  let inComment = false;

  text.split('\n').forEach((line, i) => {
    // Rule #1 escape valve: explicit /* tuned */ marker exempts a line from
    // scale-token enforcement (component-internal padding, tuned optical values).
    if (line.includes('/* tuned */')) return;
    let scan = line;
    if (inComment) {
      const end = scan.indexOf('*/');
      if (end === -1) return;
      scan = scan.slice(end + 2);
      inComment = false;
    }
    scan = scan.replace(/\/\*.*?\*\//g, '');
    const open = scan.indexOf('/*');
    if (open !== -1) { inComment = true; scan = scan.slice(0, open); }

    // custom-property DEFINITIONS are where raw values belong — skip
    if (/^\s*--[\w-]+\s*:/.test(scan)) return;

    // raw hex in a value (declarations only)
    if (scan.includes(':')) {
      const hex = scan.slice(scan.indexOf(':') + 1).match(HEX);
      if (hex) out.push({ n: i + 1, msg: `raw hex ${hex[0]} → define/use a color token`, src: line.trim() });
    }

    // on-scale spacing/radius px → suggest the token
    for (const m of scan.matchAll(DECL)) {
      const prop = m[1];
      const map = prop === 'border-radius' ? radiusMap : spacingMap;
      for (const px of m[2].matchAll(/(\d+)px/g)) {
        const tok = map[Number(px[1])];
        if (tok) out.push({ n: i + 1, msg: `${px[1]}px in ${prop} → var(${tok})`, src: line.trim() });
      }
    }

    // near-scale font-size px → suggest the nearest type token (#187)
    if (fontScale) {
      for (const m of scan.matchAll(FONT_DECL)) {
        for (const px of m[1].matchAll(/(\d+(?:\.\d+)?)px/g)) {
          const hit = nearestTypeToken(Number(px[1]), typePx);
          if (hit) {
            const off = hit.d ? ` (${hit.tpx}px scale, ${hit.d}px off)` : '';
            out.push({ n: i + 1, msg: `${px[1]}px in font-size → var(${hit.tok})${off}`, src: line.trim() });
          }
        }
      }
    }
  });
  return out;
}

export function report(label, v, err = console.error) {
  err(`⚠ Artificer Hard rule #1 — raw values in ${label} (use tokens; see CLAUDE.md "Token cheatsheet"):`);
  for (const x of v.slice(0, 10)) err(`    L${x.n}  ${x.msg}\t${x.src}`);
  if (v.length > 10) err(`    …and ${v.length - 10} more`);
}
