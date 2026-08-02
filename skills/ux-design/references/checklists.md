# Checklists & tables — the reference

The reusable tables and expanded rules behind [SKILL.md](../SKILL.md). Sources for
every principle: [grounding.md](grounding.md). Nothing here is framework-specific —
the tables hold on any stack.

---

## The loading-by-duration table

Choose by the **expected** wait, not by reflex. Anchored to the canonical
response-time limits (0.1s instantaneous · 1s flow-of-thought · 10s
attention-abandonment).

| Expected wait | Show | Copy | Why |
|---|---|---|---|
| **< 100ms** | Nothing | — | 0.1s reads as instantaneous; a flashed spinner is a glitch |
| **100–500ms** | Disabled control, label change | "Saving…" | Under the 1s limit; no skeleton |
| **500ms–2s** | Skeleton of the real layout | — | Long enough to perceive; structure beats a spinner; no layout shift |
| **2s–10s** | Progress (determinate if you can) | "Indexing 1,247 of 8,300…" | Past 1s attention wanders — give a number |
| **> 10s** | Background it; notify on done | "We'll email you when it's ready." | 10s is the abandonment limit |

- **Anti-flicker floor:** once a skeleton/spinner is up, hold ~400ms even if the
  response beats it. Appearing-then-vanishing is worse than a brief wait.
- **Refresh-in-place ≠ loading.** To update a value already on screen, recede it and
  mark it refreshing; never blank it to a skeleton (that destroys what the user is
  reading). Fresh value fades in.
- **Indeterminate** (long wait, nothing to count): a progress indicator with
  *concrete* copy ("Deploying to us-east-1…"), never a bare "Deploying…".

---

## The notification-tier table

Tier by **what the user must do**, not by how severe it sounds.

| Tier | The user must… | Channel | ARIA role (set at insert) | Example |
|---|---|---|---|---|
| **Urgent** | Act now; it blocks | Inline, anchored, persistent | `alert` (assertive) | "Build failed — fix line 214 to deploy." |
| **Attention** | Look when they can | Banner or badge | `status` (polite) | "2 nodes degraded." |
| **Info** | Nothing — just know | Quiet toast | polite live region | "Saved." |
| **Background** | Nothing now | Log; no interruption | none | "Synced at 14:02." |

- **Cap stacked notifications at ~3.** Beyond that, collapse or summarize.
- **Defer the non-urgent.** Info never interrupts an in-progress task with a modal
  (COGA Obj 5) — that's focus protection.
- **Severity ≠ urgency.** A catastrophic event the user can't act on right now is
  background; a trivial one blocking the next step is urgent.

---

## The 8 form rules (expanded)

1. **Label every field.** A placeholder is not a label — it disappears on focus,
   strands the user mid-entry, and fails accessibility. Label sits above or beside,
   always visible.
2. **Hint before typing.** State the constraint ("2–32 characters", "we'll never
   share this") *before* they type. An error a hint could have prevented is a hint
   failure, not a copy problem.
3. **Errors say what to do**, not just what's wrong. "Add a digit" beats "Invalid".
   Never blame; the "why" describes the system, not the user.
4. **Wire `aria-invalid="true"` + `aria-describedby`** to the error message id, so a
   screen-reader user hears the error tied to the field.
5. **Validate lazily, re-validate eagerly.** Flag on **blur** — never mid-keystroke
   (that scolds half-typed input). Once a field is *already* in error, clear it on
   the keystroke that fixes it, so the user isn't told to blur again. Exceptions
   that may check sooner: password strength, async "username taken".
6. **One primary button per form.** A second is "Cancel" or a ghost variant.
7. **Submit on Enter** from any single-line text input. Multi-line forms:
   ⌘/Ctrl + Enter.
8. **Never reset on error.** Preserve everything the user typed — on a validation
   block *and* on a server failure. Input is sacred.

**Above validation — prevent the slip** (heuristic #5, error prevention):

- **Forgiving formats** — accept any phone/date/card shape and reformat it; don't
  reject what you can parse.
- **Constraints that disable** invalid options instead of letting the user pick then
  scolding them.
- **Good defaults** — the system absorbs the complexity (Tesler's Law); design for a
  tired user, not an idealized rational one.
- **Carry answers forward** across multi-step flows — never re-type what was already
  given (Redundant Entry, WCAG 2.2 SC 3.3.7). Auto-fill or pick-list from the prior
  step.
- **Don't gate on memory or puzzles** (Accessible Authentication, SC 3.3.8): allow
  paste, support password managers and passkeys, no CAPTCHA / cognitive-test gates.
- **Offer undo, not just a confirm** (heuristic #3) for destructive and committing
  actions. Reversibility lowers the stakes of exploration.

---

## The 5 motion patterns

Animate **state changes, not arrivals.** One easing curve, a duration ceiling
(Artificer: 300ms), no looping decoration, no parallax, no autoplay.

| # | Pattern | When | Note |
|---|---|---|---|
| 01 | **State change** | Hover, focus, toggle, theme switch | The default — fast (~160ms), one curve |
| 02 | **Continuous translation** | Loading bars, scrubbers, progress | The one place a linear curve belongs |
| 03 | **Attention pulse** | Urgent / blocking only | Low-contrast, slow; suppressed under reduced-motion |
| 04 | **Skeleton shimmer** | Waits > ~1s | Horizontal sweep; not for refresh-in-place |
| 05 | **Modal entry** | An overlay opening | Small slide + fade; a state change, not an arrival |

**Reduced-motion is a safety floor, not taste.** Non-essential motion causes
vestibular harm — dizziness, nausea, migraine (WCAG 2.2 SC 2.3.3). Honor
`prefers-reduced-motion`: motion collapses to 0, the static end-state stays. *Every*
spinner, draw-in, cross-fade, and press-scale needs the reduced-motion branch,
designed in from the start — it is the miss instinct most often skips.

**The OS toggle covers none of these — design them explicitly:**

- **Auto-updating / refresh regions** ship an in-UI **pause** (WCAG 2.2.2).
- **Timed flows** autosave and **warn-and-extend** before any session timeout (WCAG
  2.2.1) — never drop work to a silent expiry.
- **No animated decoration next to body text or an active field** — an ADHD focus
  rule as much as a vestibular one.

---

## Accessibility as experience (the 12-point check)

Disability is a **mismatch the design creates or removes**, not a deficit. Solve for
the most-constrained user and you've built the best default for everyone.

1. **One `<h1>` per page;** headings nest in order (no h2 → h4 jump).
2. **Every input has a `<label>`.** Placeholder is not a label.
3. **Errors wire `aria-invalid` + `aria-describedby`** to the message id.
4. **Color is never the only signal** — status pairs a dot/icon *and* text; required
   fields say "required". Every actionable element carries a perceptible "I'm
   actionable" cue (signifiers, not affordances — Norman).
5. **Everything reachable by keyboard.** No `onclick` on bare divs. Every
   drag/slider/reorder ships a single-pointer click path (WCAG 2.2 SC 2.5.7).
6. **Focus order = visual order.** No CSS reordering that desyncs Tab.
7. **Modals trap focus**, Esc closes, focus returns to the trigger.
8. **Targets ≥ 24px** for all pointer targets (WCAG 2.2 SC 2.5.8 AA, or the spacing
   exception); **≥ 44px** in nav and for touch. Place high-frequency or destructive
   controls at edges/corners (Fitts's Law — "infinite" targets).
9. **Focus never obscured** (SC 2.4.11) — sticky chrome, toasts, drawers don't cover
   the tabbed-to element; offset or scroll-pad it.
10. **Consistent help** (SC 3.2.6) — help/contact/docs in the same relative place on
    every view. Predictable placement *is* cognitive-load reduction.
11. **Honor reduced-motion** — nothing non-essential animates.
12. **Page works at 200% zoom** with no horizontal scroll; **content readable
    without JS** (forms may require JS; content shouldn't).

**Test it.** Tab through. Turn off the mouse. Run axe (zero violations). Drive one
view with a screen reader. Set OS reduced-motion and reload — nothing should jump.
