/* ═══════════════════════════════════════════════════════════════════════════
   ARTIFICER · Whimsy helper · v0.18.1
   ─────────────────────────────────────────────────────────────────────────
   Tiny, dependency-free. Pairs with artificer-whimsy.css. Exposes window.Whimsy.

     Whimsy.hydrate(root?)          split [data-whimsy~="wave"] into bobbing
                                    .whimsy-char spans (staggered sine wave).
     Whimsy.watch(input, opts)      ignite a target when a trigger word is
                                    typed — the "ultrathink" gesture.
                                    opts = { triggers:[…], target?, onIgnite?,
                                             onClear?, loops?, settle? }
     Whimsy.celebrate(el, ms?)      one-shot: light el up for ms (default 2600)
                                    then remove. For whimsical operations
                                    (deploy succeeded, streak hit, etc).
     Whimsy.greeting(root?)         swap [data-whimsy-greeting] elements to the
                                    seasonal footer line — June → "happy pride"
                                    + vivid flow; off-season → the inline text
                                    + glacial flow. Graceful without JS.
     Whimsy.greetingFor(date?, opts) PURE — the greeting spec for a date
                                    (date defaults to today when omitted):
                                    { season, text, classes }. opts =
                                    { default?, defaultClass? }. Unit-tested.
     Whimsy.run(el, opts)           ignite el, then settle after opts.loops
                                    hue-cycles. For long "thinking" states.
                                    opts = { loops?, settle? }
     Whimsy.scheduleSettle(el, n, mode)  rest el after n loops; returns cancel().
     Whimsy.settle(el, mode) / .unsettle(el)   manual rest / wake.
                                    mode: "static" (default) | "glacial".
     Whimsy.ignite(el) / .clear(el) manual toggle.

   Doctrine (see CLAUDE.md § Whimsy): opt-in, one whimsy moment per view,
   never on errors / destructive actions / data. Reduced-motion is handled in
   CSS — this file adds no motion the stylesheet can't switch off.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  function igniteEl(el) { if (el) el.classList.add("whimsy"); }
  function clearEl(el)  { if (el) el.classList.remove("whimsy"); }

  /* ── Settle ── flow for N hue-cycles, then come to rest ────────────────── */

  /* One flow cycle, in seconds, read from the element's live --whimsy-speed. */
  function flowSeconds(el) {
    var s = (getComputedStyle(el).getPropertyValue("--whimsy-speed") || "7s").trim();
    var n = parseFloat(s) || 7;
    return /ms\s*$/.test(s) ? n / 1000 : n;
  }

  function unsettle(el) {
    if (el) el.classList.remove("whimsy--settled", "whimsy--glacial");
  }
  function settle(el, mode) {
    if (!el) return;
    unsettle(el);
    el.classList.add(mode === "glacial" ? "whimsy--glacial" : "whimsy--settled");
  }

  /* Rest `el` after `loops` hue-cycles. loops <= 0 / Infinity = never settle.
     mode: "static" (default) | "glacial". Returns a cancel() fn. */
  function scheduleSettle(el, loops, mode) {
    if (!el || !loops || loops === Infinity || loops <= 0) return function () {};
    var id = window.setTimeout(function () {
      settle(el, mode);
    }, flowSeconds(el) * loops * 1000);
    return function cancel() { window.clearTimeout(id); };
  }

  /* Ignite `el` and (optionally) settle it after a finite run. For whimsical
     operations and long "thinking" states without an input to watch.
     opts = { loops?, settle? }. Returns a cancel() fn for the settle timer. */
  function run(el, opts) {
    opts = opts || {};
    unsettle(el);
    igniteEl(el);
    return scheduleSettle(el, opts.loops, opts.settle);
  }

  /* Split an element's text into staggered .whimsy-char spans so the sine
     bob travels across the word. Idempotent — re-running skips done nodes. */
  function splitWave(el) {
    if (!el || el.dataset.whimsyHydrated === "1") return;
    var text = el.textContent;
    el.textContent = "";
    var n = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var span = document.createElement("span");
      span.className = "whimsy-char";
      span.textContent = ch;
      // stagger the bob + hue so the wave reads as travelling, not pulsing
      span.style.setProperty("--d", (n * -0.09).toFixed(2) + "s");
      el.appendChild(span);
      if (ch !== " ") n++;
    }
    el.dataset.whimsyHydrated = "1";
  }

  function hydrate(root) {
    root = root || document;
    var waves = root.querySelectorAll('[data-whimsy~="wave"]');
    for (var i = 0; i < waves.length; i++) {
      waves[i].classList.add("whimsy", "whimsy--wave");
      splitWave(waves[i]);
    }
    // plain [data-whimsy] (no "wave") just gets the flowing gradient
    var plain = root.querySelectorAll('[data-whimsy=""], [data-whimsy="whimsy"]');
    for (var j = 0; j < plain.length; j++) plain[j].classList.add("whimsy");
  }

  /* The "ultrathink" gesture. Watch a text input; when its value contains any
     trigger word, ignite the target (default: a sibling [data-whimsy-target],
     else the input itself via .is-whimsical). Fires onIgnite/onClear once per
     edge so callers can run a whimsical operation. */
  function watch(input, opts) {
    if (!input) return function () {};
    opts = opts || {};
    var triggers = (opts.triggers || ["ultrathink", "ultracode"])
      .map(function (t) { return String(t).toLowerCase(); });
    var target = opts.target ||
      (input.closest ? (input.closest("[data-whimsy-scope]") || document)
        .querySelector("[data-whimsy-target]") : null) ||
      input;
    var lit = false;
    var cancelSettle = null;

    function check() {
      var v = (input.value || input.textContent || "").toLowerCase();
      var hit = triggers.some(function (t) { return v.indexOf(t) !== -1; });
      if (hit && !lit) {
        lit = true;
        igniteEl(target);
        target.classList.add("is-whimsical");
        if (opts.loops) cancelSettle = scheduleSettle(target, opts.loops, opts.settle);
        if (opts.onIgnite) opts.onIgnite(target);
      } else if (!hit && lit) {
        lit = false;
        if (cancelSettle) { cancelSettle(); cancelSettle = null; }
        unsettle(target);
        clearEl(target);
        target.classList.remove("is-whimsical");
        if (opts.onClear) opts.onClear(target);
      }
    }
    input.addEventListener("input", check);
    check();
    return function off() { input.removeEventListener("input", check); };
  }

  /* One-shot whimsy for an operation that just succeeded. Auto-clears. */
  function celebrate(el, ms) {
    if (!el) return;
    igniteEl(el);
    var dur = typeof ms === "number" ? ms : 2600;
    window.setTimeout(function () { clearEl(el); }, dur);
  }

  /* ── Seasonal greeting ── pure spec + DOM application ──────────────────── */

  /* PURE — no DOM. Given a date, return the footer-greeting spec for its
     season. June (getMonth() === 5) is Pride: "happy pride" (no trailing
     period — explicit) with always-on vivid flow — intentionally the one view
     that does NOT settle, the single logged exception to Whimsy doctrine #7
     ("whimsy rests"); every other long-lived whimsy still settles. Off-season
     returns the caller's own line + class so every consumer keeps its voice.
     opts = { default?, defaultClass? }. */
  function greetingFor(date, opts) {
    opts = opts || {};
    var month = (date || new Date()).getMonth(); // 5 === June
    if (month === 5) {
      // Pride wears the FULL-ATTENTION treatment, latched on (the "clementine"
      // combo from Lane-1's whimsy exploration): a per-character faceted
      // gradient (--wave + splitWave), the bob frozen so it reads as flow not
      // bounce (--no-bob), vivid saturation (the "bloom"), and the rainbow
      // underline drawn in permanently (--on). The one view that never settles
      // — doctrine #7's single logged exception. greeting() runs splitWave.
      return { season: "pride", text: "happy pride",
               classes: ["whimsy", "whimsy--wave", "whimsy--no-bob",
                         "whimsy--vivid", "whimsy-underline",
                         "whimsy-underline--on"] };
    }
    // Off-season fallback. The line is the consumer's to set — via the
    // element's inline text or opts.default. Lines that fit the calm glacial
    // drift: "kindness is free" (default) or "abide no hatred".
    // (Future idea: rotate one per day/month via a modulus on the date; for
    // now it's a deliberately stable per-surface choice, not a slot machine.)
    return { season: "default",
             text: opts.default || "kindness is free",
             classes: ["whimsy", opts.defaultClass || "whimsy--glacial"] };
  }

  /* DOM — scan [data-whimsy-greeting]; the element's inline text IS the
     off-season line (so the markup renders gracefully with JS disabled). Swap
     in the seasonal text + apply the whimsy classes. Idempotent: a done flag
     keeps observe() re-scans from re-reading the swapped text. */
  function greeting(root) {
    root = root || document;
    var els = root.querySelectorAll("[data-whimsy-greeting]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.dataset.whimsyGreetingDone === "1") continue;
      var spec = greetingFor(new Date(), {
        default: el.textContent.trim(),
        defaultClass: el.dataset.whimsyGreetingClass
      });
      el.textContent = spec.text;
      for (var c = 0; c < spec.classes.length; c++) el.classList.add(spec.classes[c]);
      // A --wave spec needs its text shattered into staggered .whimsy-char
      // cells (per-char faceted gradient) — same hydration data-whimsy="wave"
      // gets. Run AFTER the text is set so splitWave reads the seasonal line.
      if (spec.classes.indexOf("whimsy--wave") !== -1) splitWave(el);
      el.dataset.whimsyGreetingDone = "1";
    }
  }

  // SPA lifecycle — auto-hydrate nodes inserted after first paint. Returns a
  // disconnect fn. Idempotent guards make the re-scan cheap (done nodes skip).
  function observe(root) {
    root = root || document.body;
    hydrate(root);
    greeting(root);
    if (typeof MutationObserver === 'undefined') return function () {};
    var schedule = window.requestAnimationFrame
      ? function (cb) { window.requestAnimationFrame(cb); }
      : function (cb) { window.setTimeout(cb, 0); };
    var scheduled = false;
    var mo = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      schedule(function () { scheduled = false; hydrate(root); greeting(root); });
    });
    mo.observe(root, { childList: true, subtree: true });
    return function () { mo.disconnect(); };
  }

  var api = {
    hydrate: hydrate,
    observe: observe,
    watch: watch,
    celebrate: celebrate,
    greeting: greeting,
    greetingFor: greetingFor,
    run: run,
    settle: settle,
    unsettle: unsettle,
    scheduleSettle: scheduleSettle,
    ignite: igniteEl,
    clear: clearEl
  };
  // globalThis === window in a browser (so window.Whimsy works); in Node it
  // lets the unit test import this file and exercise greetingFor.
  if (typeof window !== "undefined") window.Whimsy = api;
  else if (typeof globalThis !== "undefined") globalThis.Whimsy = api;

  // DOM auto-run — guarded so `import`ing the module in Node (the unit test)
  // doesn't touch a document that isn't there.
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { hydrate(); greeting(); });
    } else {
      hydrate();
      greeting();
    }
  }
})();
