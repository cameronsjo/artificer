/* ═══════════════════════════════════════════════════════════════════════════
   ARTIFICER · Sploot
   The system's critter: a Pembroke corgi, named for the flat-out,
   back-legs-behind lounge corgis are known for. Drawn as real text — quadrant
   block glyphs, 2×2 pixels per character — so it renders in JetBrains Mono
   and copy-pastes into a terminal intact. Gold (--accent), single-tone,
   static. Styles live in artificer.css (.sploot); doctrine in CLAUDE.md
   § Brand; reference page live-spec/sploot.html.

   The pixel grids below are the ONE source for every pose. Everything else
   (text layers here, SVG rects on a stats card, a favicon) derives from them.
   Quadrant pixels render tall (about 0.3 × 0.65 em), so a grid reads about
   twice as wide as it looks in source: keep the body ~3× longer than tall,
   the ears wide-based triangles, the legs one row.

   Hook:  <span data-sploot="stand"></span>
            data-sploot            stand | droopy | sleep | sniff | mini
            data-sploot-helmet     fishbowl space helmet over the head
            data-sploot-decorative aria-hidden (another element carries the meaning)
            class="sploot--sm"     size (--mini / --sm / default / --lg)
   API:   window.ArtificerSploot = { POSES, SCARF, toGlyphs, markup, build,
                                     hydrate, observe, season }
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // `#` is a pixel; anything else is empty. Every pose but `mini` is 30×8, so
  // poses swap in place without the layout moving.
  var POSES = {
    // Ears up, fox snout, eye, long loaf, fluffy rump, four stubby legs.
    stand: [
      '....................#...#.....',
      '...................###.###....',
      '...................#######....',
      '.####################.######..',
      '##############################',
      '##########################....',
      '.#######################......',
      '...##..##..........##..##.....',
    ],
    // Ears flopped forward, a little lower in the shoulders.
    droopy: [
      '..............................',
      '..............................',
      '....................##..##....',
      '...................#######....',
      '.####################.######..',
      '##############################',
      '#########################.....',
      '...##..##..........##..##.....',
    ],
    // The namesake: belly down, eyes shut, back legs stretched out behind.
    sleep: [
      '..............................',
      '..............................',
      '....................#...#.....',
      '...................###.###....',
      '...########################...',
      '..##########################..',
      '..#########################...',
      '############################..',
    ],
    // Nose down: the standing body with the head lowered two rows, tail up.
    sniff: [
      '..............................',
      '..............................',
      '.##.................#...#.....',
      '.#####################.###....',
      '##########################....',
      '#####################.######..',
      '.#############################',
      '...##..##...........##..##....',
    ],
    // Two text rows — a marker (e.g. beside the current table-of-contents
    // entry). Pair with .sploot--mini.
    mini: [
      '...........#.#..',
      '..........#####.',
      '.###########.###',
      '..#..#.....#..#.',
    ],
  };

  // Winter scarf for `stand`: a band around the neck, the end flying back
  // over the shoulders. Its own layer so it can take --brand-purple.
  var SCARF = [
    '..............................',
    '..............................',
    '............#######...........',
    '..................###.........',
    '..................###.........',
    '..................###.........',
    '..............................',
    '..............................',
  ];

  // Text overlays, already in glyph rows (they're characters, not pixels).
  var TEXT_OVERLAYS = {
    sleep: { cls: 'sploot__zzz', rows: ['              z', '                z'] },
    sniff: { cls: 'sploot__scent', rows: [' ', ' ', ' ', '               · ·'] },
  };

  var HELMET = [
    '        ╭──────╮',
    '        │      │',
    '        │      │',
    '        ╰──────╯',
  ];

  var DESCRIBE = {
    stand: 'Sploot the corgi',
    droopy: 'Sploot the corgi, ears drooping',
    sleep: 'Sploot the corgi, asleep',
    sniff: 'Sploot the corgi, sniffing the ground',
    mini: 'Sploot the corgi',
  };

  // Index = TL | TR<<1 | BL<<2 | BR<<3 over each 2×2 pixel block.
  var GLYPH = [' ', '▘', '▝', '▀', '▖', '▌', '▞', '▛',
               '▗', '▚', '▐', '▜', '▄', '▙', '▟', '█'];

  // Pixel grid → rows of quadrant glyphs. Trailing blanks are trimmed; an
  // all-blank row becomes one space so the row keeps its line box.
  function toGlyphs(grid) {
    var width = 0;
    grid.forEach(function (row) { if (row.length > width) width = row.length; });
    var at = function (x, y) { return grid[y] && grid[y].charAt(x) === '#' ? 1 : 0; };
    var rows = [];
    for (var y = 0; y < grid.length; y += 2) {
      var line = '';
      for (var x = 0; x < width; x += 2) {
        line += GLYPH[at(x, y) | (at(x + 1, y) << 1) | (at(x, y + 1) << 2) | (at(x + 1, y + 1) << 3)];
      }
      rows.push(line.replace(/\s+$/, '') || ' ');
    }
    return rows;
  }

  // Northern-hemisphere meteorological seasons, from a Date (default: now).
  function season(date) {
    var m = (date || new Date()).getMonth();
    if (m === 11 || m <= 1) return 'winter';
    if (m <= 4) return 'spring';
    if (m <= 7) return 'summer';
    return 'autumn';
  }

  var warned = {};
  function resolvePose(pose) {
    if (pose && Object.prototype.hasOwnProperty.call(POSES, pose)) return pose;
    if (pose && !warned[pose] && typeof console !== 'undefined') {
      warned[pose] = true;
      console.warn('[ArtificerSploot] unknown pose "' + pose + '"; drawing "stand"');
    }
    return 'stand';
  }

  // The layers for a pose, in paint order: body, then pose overlay, then
  // helmet. With a helmet every layer drops one row to make room for the dome.
  function layers(pose, opts) {
    var helmet = !!(opts && opts.helmet);
    var lift = function (rows) { return helmet ? [' '].concat(rows) : rows; };
    var out = [{ cls: 'sploot__body', rows: lift(toGlyphs(POSES[pose])) }];
    if (pose === 'stand') out.push({ cls: 'sploot__scarf', rows: lift(toGlyphs(SCARF)) });
    if (TEXT_OVERLAYS[pose]) out.push({ cls: TEXT_OVERLAYS[pose].cls, rows: lift(TEXT_OVERLAYS[pose].rows) });
    if (helmet) out.push({ cls: 'sploot__helmet', rows: HELMET });
    return out;
  }

  function describe(pose, opts) {
    return DESCRIBE[pose] + (opts && opts.helmet ? ', in a fishbowl space helmet' : '') + ', drawn in block characters';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Server-side / build-time rendering: the same element build() makes, as an
  // HTML string. Needs no DOM, so a static-site build can import this module
  // for effect and render Sploot with JavaScript off in the browser.
  function markup(pose, opts) {
    opts = opts || {};
    var p = resolvePose(pose);
    var cls = ['sploot'];
    if (opts.size) cls.push('sploot--' + escapeHtml(opts.size));
    else if (p === 'mini') cls.push('sploot--mini');
    if (opts.className) cls.push(escapeHtml(opts.className));
    var a11y = opts.decorative
      ? ' aria-hidden="true"'
      : ' role="img" aria-label="' + escapeHtml(opts.label || describe(p, opts)) + '"';
    var inner = layers(p, opts).map(function (l) {
      return '<span class="sploot__layer ' + l.cls + '">' + escapeHtml(l.rows.join('\n')) + '</span>';
    }).join('');
    return '<span class="' + cls.join(' ') + '"' + a11y + '>' + inner + '</span>';
  }

  // Fill an existing host element (the data-sploot hook) or a fresh span.
  function build(pose, opts, host) {
    opts = opts || {};
    var p = resolvePose(pose);
    var el = host || document.createElement('span');
    el.classList.add('sploot');
    if (opts.size) el.classList.add('sploot--' + opts.size);
    else if (p === 'mini' && !/\bsploot--/.test(el.className)) el.classList.add('sploot--mini');
    if (opts.decorative) {
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('role');
    } else {
      el.removeAttribute('aria-hidden');
      el.setAttribute('role', 'img');
      // Keep an author's label; refresh one we generated, so a re-posed
      // Sploot never announces its previous pose.
      if (opts.label) {
        el.setAttribute('aria-label', opts.label);
        el.removeAttribute('data-sploot-auto-label');
      } else if (!el.hasAttribute('aria-label') || el.hasAttribute('data-sploot-auto-label')) {
        el.setAttribute('aria-label', describe(p, opts));
        el.setAttribute('data-sploot-auto-label', '');
      }
    }
    el.replaceChildren();
    layers(p, opts).forEach(function (l) {
      var span = document.createElement('span');
      span.className = 'sploot__layer ' + l.cls;
      span.textContent = l.rows.join('\n');
      el.appendChild(span);
    });
    return el;
  }

  function hydrate(root) {
    var scope = root || document;
    if (!scope.querySelectorAll) return;
    var hosts = scope.querySelectorAll('[data-sploot]:not([data-sploot-hydrated])');
    Array.prototype.forEach.call(hosts, function (el) {
      build(el.getAttribute('data-sploot'), {
        helmet: el.hasAttribute('data-sploot-helmet'),
        decorative: el.hasAttribute('data-sploot-decorative'),
      }, el);
      el.setAttribute('data-sploot-hydrated', '');
    });
  }

  // Hydrate now, then watch for inserted or re-posed hosts (SPA). Returns a
  // disconnect fn.
  function observe(root) {
    var target = root || document.body;
    hydrate(target);
    if (typeof MutationObserver === 'undefined') return function () {};
    var scheduled = false;
    // rAF must be called as a method — a detached reference throws "Illegal
    // invocation" — so wrap it rather than pick the function by ||.
    var schedule = typeof window.requestAnimationFrame === 'function'
      ? function (fn) { window.requestAnimationFrame(fn); }
      : function (fn) { setTimeout(fn, 16); };
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === 'attributes') m.target.removeAttribute('data-sploot-hydrated');
      });
      if (scheduled) return;
      scheduled = true;
      schedule(function () { scheduled = false; hydrate(target); });
    });
    mo.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-sploot', 'data-sploot-helmet', 'data-sploot-decorative'],
    });
    return function () { mo.disconnect(); };
  }

  var api = {
    POSES: POSES,
    SCARF: SCARF,
    toGlyphs: toGlyphs,
    markup: markup,
    build: build,
    hydrate: hydrate,
    observe: observe,
    season: season,
  };
  // globalThis === window in a browser; in Node it lets a unit test or a
  // static-site build import this file and call toGlyphs()/markup().
  if (typeof window !== 'undefined') window.ArtificerSploot = api;
  else if (typeof globalThis !== 'undefined') globalThis.ArtificerSploot = api;

  if (typeof document === 'undefined') return;

  // Stamp the season once, unless the page already did (a pre-paint script
  // can set it to avoid any flash; Sploot itself hydrates after load anyway).
  function autoInit() {
    var html = document.documentElement;
    if (!html.hasAttribute('data-season')) html.setAttribute('data-season', season());
    observe(document.body);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
