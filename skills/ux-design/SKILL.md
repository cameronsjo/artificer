---
name: ux-design
description: "Use when designing or reviewing how an interface behaves — loading/empty/error states, notifications, microcopy, cognitive load, forms, motion, accessibility. Any stack. NOT visual styling/tokens/CSS (use artificer-design-system)."
license: Apache-2.0
user-invocable: true
metadata:
  author: cameronsjo
  version: "0.1.0"
---

# UX Design — the behavior layer

A design system has two halves wearing one coat. The **visual** half is tokens,
components, CSS, color, type — what it *looks* like. The **UX** half is what this
skill teaches: how an interface *behaves over time and reads under stress* — when
to show which state, how a user recovers from an error, which message interrupts
and which waits, how much a screen asks the reader to hold in their head.

That half is **portable**. It holds on any stack — React, Svelte, a terminal TUI,
plain HTML — with or without a specific component library. This skill teaches the
behavior; the [`artificer-design-system`](../artificer-design-system/SKILL.md)
skill is its **visual companion** (reach for it when you need the tokens and
classes that *realize* these behaviors). Artificer is this skill's worked
reference implementation, cited throughout — not a dependency.

**The unifying principle:** *reduce working-memory load, and key every decision to
user intent and the action required.* A person holds roughly **four** things in
working memory (Cowan's ~4 — not Miller's rhetorical "7±2"). Cognitive Load Theory
splits the budget into **intrinsic** load (the task's real difficulty — leave it
intact) and **extraneous** load (everything the design adds — strip it). Every rule
below is one of: remove extraneous load, or match the response to what the user is
actually trying to do.

**You already do most of this by instinct.** A capable model designs labels above
inputs, validates on blur, preserves input on error, picks a banner over a toast
for a consequential failure — unprompted. The value here is threefold: (1) the
**residual misses** instinct skips — reduced-motion, success-as-receipt, the
expected-duration tree; (2) the **canonical names** for what you already do, so it
becomes deliberate and consistent instead of rediscovered each screen; (3) the
**preference doctrine** — the specific, opinionated calls (deadpan voice, the
word-swaps, the duration thresholds) that a generic instinct won't reach.

Full citations for every claim: [references/grounding.md](references/grounding.md).

---

## 1. First decision — tool surface or document surface?

Before any flow, decide what the user *came to do*. The answer sets density,
default body font (when you have one), voice register, and whether power-user
accelerators belong.

| | **Tool surface** | **Document surface** |
|---|---|---|
| What | Dashboards, consoles, settings, logs, data tables, command palettes — came to *do something* | Writeups, READMEs, reports, onboarding, docs — came to *read something* |
| Density | Dense, scannable | Roomy, one idea per line |
| Voice | Terse, label-first | Explanatory, still plain |
| Accelerators | Keyboard shortcuts belong here (Shneiderman #2: serve novice *and* expert in one UI) | Rarely |

**Keep the look distinctive, the interaction conventional** (Jakob's Law). Users
arrive with mental models from every other app — forms, focus order, Esc/Enter,
arrow-key semantics should match what they expect, even when the styling is
unmistakably yours. Novelty belongs in aesthetics, not in interaction.

One project mixes both: a settings page is a tool; the README explaining it is a
document. Pick per page.

---

## 2. The cognitive-load budget

Spend the user's ~4 slots deliberately. Each rule strips extraneous load.

- **Cap visible lists at 5 (default) to 7 (max).** Past that: progressive
  disclosure, search, or grouping. The cap is *chunking + Cowan's ~4*, not "7±2".
- **Progressive disclosure** has two rules: the frequently-needed stays primary,
  and the route to "more" is *visibly obvious*. Decide what's primary by frequency,
  not by guess.
- **One primary action per view.** Decision time grows logarithmically with the
  number of choices (Hick's Law) — so minimize choices and *highlight the
  recommended one*. Everything else is secondary or quiet. Caveat: don't simplify
  to the point of abstraction; a too-clever minimal UI hides the path.
- **Recognition over recall** (heuristic #6). Make options visible rather than
  asking the user to remember them: surface recents and history, keep menus on
  screen, label icons with text, carry data from a prior step into the next so
  nothing must be re-derived.
- **Users scan, they do not read.** ~79% scan, ~16% read word-by-word; readers
  consume 20–28% of the text on a page. Put the conclusion first, one idea per
  paragraph, and bold a short scannable path through body content (Artificer:
  3–5 anchor words per paragraph). "Meaningless typography flourishes" are
  extraneous load — this is the empirical floor under animate-state-not-arrival.
- **Protect focus.** A non-urgent notification must not interrupt a task in
  progress (COGA Obj 5). Keep the critical path short.

---

## 3. State as a decision tree

Every screen state is an instance of **visibility of system status** (heuristic
#1) — the screen always says what the system is doing. **Silence reads as failure**
and provokes anxious double-submits, so a state is a *correctness* mechanism, not a
courtesy.

### Loading — choose by *expected* duration, not reflex

Reach for a spinner only when nothing better fits. Anchor the tree to the canonical
response-time limits (0.1s / 1s / 10s):

| Expected wait | Show | Why |
|---|---|---|
| < 100ms | **Nothing** | 0.1s = "instantaneous"; a flashed spinner reads as a glitch |
| 100–500ms | **Disabled control + label change** ("Saving…") | Under the 1s "flow of thought" limit — no skeleton needed |
| 500ms–2s | **Skeleton** of the real layout (no layout shift) | Long enough to perceive; structure beats a spinner |
| 2s–10s | **Progress** with *concrete* copy | Past 1s the user's attention wanders; give them a number |
| > 10s | **Background it** + notify on done | 10s is the attention-abandonment limit |

Add an anti-flicker floor: if you've started a skeleton/spinner, hold it ~400ms
even when the response beats it — appearing-then-vanishing is worse than waiting.

### The other states

- **Empty** = name what's missing + why (briefly) + **one** action. Optional third
  beat for a first-run empty: *educate* — teach what the feature does. "No runs
  yet" beats "Nothing here."
- **Error** = three jobs: **what** broke, **why** (the system, not the user), **how
  to fix**. When the system can *infer* the correction, surface it as a one-tap
  action *above* the prose — the lowest-effort recovery beats the best-worded
  instruction. Never show a raw error code as the whole message.
- **Refresh in place** = recede the stale value and mark it refreshing; never blank
  it to a skeleton (that destroys the value the user is reading). Fade the fresh
  value in.
- **Success** = a **receipt, not a parade.** Confirm quietly where the user's eyes
  already are; don't stack a green checkmark *and* a celebratory toast *and* an
  animation for a routine save. Feedback magnitude scales with action significance
  (Shneiderman #3/#4) — a small action earns a small acknowledgement.

---

## 4. Feedback urgency — tier by action required, not severity

Pick the channel by *what the user must do*, not by how bad it sounds. A "severe"
event the user can't act on right now is background; a trivial one that blocks the
next step is urgent.

| Tier | The user must… | Channel |
|---|---|---|
| **Urgent** | Act now; it blocks | Inline, anchored, persistent; `role="alert"` |
| **Attention** | Look when they can | Banner or badge; `role="status"` |
| **Info** | Nothing — just know | Quiet toast; polite live region |
| **Background** | Nothing now | Log it; no interruption |

- **Silent by default.** Notifications are visual-only; sound is a carve-out that
  must name its specific event class, be opt-in (or trivially disableable), and
  never be the sole carrier of meaning — the visual tier signal is always already
  present (sound augments, never substitutes; the 1.4.1 logic applied to audio).
- **Cap stacked notifications** (~3). Beyond that, collapse or summarize.
- **Set the ARIA role at insert time** — urgent → `alert` (assertive), attention/
  info → `status` (polite), background → none. A screen-reader user gets the same
  urgency tiering a sighted user does.
- **Defer the non-urgent.** Info-tier feedback never interrupts an in-progress task
  with a modal (COGA Obj 5) — that's focus protection, the same logic as the list
  cap.

---

## 5. Microcopy & voice

Plain, literal language is the documented canon — and high-literacy experts prefer
it *most* (one study: 80% including specialists chose clear English). Plain is the
default for tool *and* document surfaces; it is not dumbing-down.

The three pillars: **literal** (name the thing, don't gesture) · **direct**
(front-load the verb; the first ~2 words of a button or link say what it does) ·
**lightly deadpan** (wit lives in restraint — a palette showing exactly five things
is funnier than a joke). And: **do the hard work for the user** (GOV.UK) — the
governing maxim; the copy absorbs effort so the reader spends less.

Quick rules (the full glossary, word-swaps, and before/after copy live in
[references/microcopy.md](references/microcopy.md)):

- **Errors never blame.** Ban "invalid / illegal / incorrect"; the "why" explains
  the system, not the user. "Enter a valid email, like name@example.com" beats
  "Invalid input."
- **State consequences before commit** (COGA Obj 7) — name the outcome *and* the
  cost before the button, not after. Many readers can't anticipate "what happens if
  I press this."
- **A reading-level floor** (the AuDHD/dyslexia/ADHD audience this serves): aim 6th–
  8th grade. ~20-word average sentence, split anything over 25, ≤5 sentences per
  paragraph; keep subject-verb-object adjacent; verbs over nominalizations; one
  clause, one idea, no double negatives. Put the main point in the first line —
  readers who give up after a line still get it.
- **No emoji** in product copy; **no metaphor in failures** ("went sideways" is
  confusing under stress); **don't celebrate.**

**⚠ The contraction call (a deliberate choice, not an accident).** GOV.UK *bans*
negative contractions (can't, don't) because lowest-literacy readers misread "can't"
as "can". Artificer **overrides this**: contractions stay — they read natural and
deadpan, and the audience is high-literacy technical users. **The one exception:**
in a *blocking error or a destructive confirmation*, spell the negative out —
"cannot", "will not", "do not" — so the stakes can't be misread at the one moment
misreading is expensive.

---

## 6. Forms behavior

The throughline: **the system absorbs irreducible complexity** (Tesler's Law) and
prevents slips *before* validation ever fires. Don't design for an idealized
rational user — design for a tired one.

The 8 rules (expanded in [references/checklists.md](references/checklists.md)):

1. **Label every field.** A placeholder is not a label — it vanishes on focus and
   fails accessibility.
2. **Hint before typing.** State the constraint ("2–32 characters") up front. An
   error a hint could have prevented is a hint failure, not a copy problem.
3. **Errors say what to do**, not just what's wrong.
4. **Wire `aria-invalid` + `aria-describedby`** to the message id.
5. **Validate lazily, re-validate eagerly.** Flag on **blur** (never mid-keystroke
   — that scolds half-finished input); once a field is *already* in error, clear it
   live on the keystroke that fixes it. Async checks (username taken) and password
   strength are the exceptions that may check sooner.
6. **One primary button per form.** A second is "Cancel" or a ghost.
7. **Submit on Enter** from a text input (⌘/Ctrl+Enter in a multiline form).
8. **Never reset on error.** Preserve everything typed — input is sacred.

**Above validation — prevent the slip** (heuristic #5): forgiving formats (accept
any phone/date shape and reformat), constraints that disable invalid options, good
defaults. **Carry answers forward** across multi-step flows — never make a user
re-type what they already gave (Redundant Entry, WCAG 2.2 SC 3.3.7). **Don't gate
on memory or puzzles** (Accessible Authentication, SC 3.3.8): allow paste, support
password managers and passkeys, no CAPTCHA/cognitive-test gates. **Offer undo, not
just a confirm dialog** (heuristic #3) for destructive and committing actions —
reversibility lowers the stakes of exploration.

---

## 7. Motion communicates state

Animate **state changes, not arrivals.** A thing that transitions earns motion; a
thing appearing on load does not. Keep a duration ceiling (Artificer: 300ms), use
one easing curve, never loop decoration, no parallax or autoplay.

**Reduced-motion is a safety floor, not taste.** Non-essential motion causes real
vestibular harm — dizziness, nausea, migraine (WCAG 2.2 SC 2.3.3). Honor
`prefers-reduced-motion`: motion collapses, the burnished/static end-state stays.
This is the miss instinct most often skips — *every* spinner, draw-in, cross-fade,
and press-scale needs the reduced-motion branch, designed in from the start.

**The OS toggle is not enough** — it covers none of these, so design them
explicitly:

- **Auto-updating / refresh-in-place regions** need an in-UI **pause** control
  (WCAG 2.2.2).
- **Timed flows** must **autosave** and **warn-and-extend** before any session
  timeout (WCAG 2.2.1) — never drop work to a silent expiry.
- **No animated decoration adjacent to body text or an active field** — an ADHD
  focus rule, not only a vestibular one.

---

## 8. Accessibility as experience

Frame disability as a **mismatch the design creates or removes** (Microsoft
Inclusive Design), never a compliance tax. AuDHD-first is the *permanent* end of a
spectrum that also serves the temporarily overloaded — tired, multitasking, on a
phone in the sun. **Solve for the most-constrained user and you've built the best
default for everyone** — that is *why* the cognitive-load budget exists.

- **Keyboard parity.** Everything doable with a mouse is doable from the keyboard;
  no `onclick` on bare divs. Every drag/slider/reorder ships a single-pointer
  click path (WCAG 2.2 SC 2.5.7) for tremor, trackball, and eye-gaze users.
- **Focus order = visual order.** No CSS reordering that desyncs Tab.
- **Signifiers, not color alone** (Norman). Every actionable element carries a
  *perceptible* "I'm actionable" cue; every status pairs an icon or text with the
  color. Generalizes "color is never the only signal" from status to affordance —
  and forbids gesture-only interactions.
- **Trap focus in modals; Esc closes; focus returns** to the trigger.
- **Targets:** ≥24px for *all* pointer targets (WCAG 2.2 SC 2.5.8 AA, or the
  spacing exception); ≥44px in nav and for touch (Fitts's Law — and place
  high-frequency or destructive controls at edges/corners, which are "infinite"
  targets). Dense desktop tables may go below 44 but not below the 24px AA floor.
- **Focus never obscured** (SC 2.4.11) — sticky headers, toasts, and drawers must
  not cover the element being tabbed to; offset or scroll-pad it.
- **Consistent help** (SC 3.2.6) — help/contact/docs live in the same relative
  place on every view. Predictable placement *is* cognitive-load reduction.
- **Skip link** to main content; **one `<h1>`**; headings nest in order.

---

## 9. The UX review checklist

Reviewing behavior, not pixels. Run these against any surface:

1. **Surface named?** Is it clearly a tool or a document, and does density/voice match?
2. **Squint test** — can you tell what's active and what's primary without reading?
3. **Tab through** — every interactive element reachable, focus order = visual order?
4. **Mouse off** — can you complete the core task on the keyboard alone?
5. **Reduced-motion reload** — does anything still animate that shouldn't?
6. **Each state present?** loading (by duration), empty, error (what/why/how),
   success-as-receipt, refresh-in-place — none missing, none a bare spinner.
7. **Error copy** says what to do, blames the system not the user, shows no raw code?
8. **Input survives** a validation block and a server error — nothing reset?
9. **Notifications tiered** by action-required, ARIA role set, ≤3 stacked?
10. **Lists capped** at 5–7 before disclosure; one primary action per view?
11. **Verdict scannable in 5 seconds?** Conclusion first, scannable path, one idea
    per paragraph?

---

## 10. Companion & references

- **Visual companion:** [`artificer-design-system`](../artificer-design-system/SKILL.md)
  — the tokens, components, and classes that *realize* these behaviors. Use it when
  the question turns to color, type, spacing, or component markup.
- [references/microcopy.md](references/microcopy.md) — the three voice pillars, the
  full word-swap glossary, before/after copy for every state, the 7-point voice
  checklist.
- [references/checklists.md](references/checklists.md) — the 8 form rules expanded,
  the a11y checklist reframed as experience, the 5 motion patterns, the
  loading-by-duration and notification-tier tables.
- [references/grounding.md](references/grounding.md) — every principle above tied to
  its source (Nielsen, Shneiderman, Norman, CLT, WAI-COGA, WCAG 2.2, GOV.UK,
  Microsoft Inclusive Design), and the canonical-vocabulary map.

**Worked reference (Artificer's `live-spec/` pages, if present in the repo you're
in):** `voice-and-tone.html` · `states.html` · `notifications.html` ·
`forms-extended.html` · `motion.html` · `a11y.html` · `composition.html`. These
show the behaviors above rendered in a real system — read them as the worked
example, not as a required dependency.
