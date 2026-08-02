# Grounding — canonical UX literature behind the skill

This is the **`ux-design` skill's evidence file**: every principle the skill
teaches, tied to the section it validates or extends, with sources. It exists so
the skill is *grounded* in the field (Nielsen, Shneiderman, Norman, cognitive-load
theory, WAI-COGA, WCAG 2.2, GOV.UK content design, Microsoft Inclusive Design), not
self-referential to Artificer.

Read the legend as: **➕** the literature *extends* what the skill already says
(adopt it) · **⚠** a *tension* to resolve deliberately · unmarked entries *validate*
an existing rule and give it its textbook name. The section headings below match the
skill's sections one-to-one.

> Provenance: produced by a fan-out research harness (5 source-body researchers →
> section-mapped synthesis → fact-check critic; 54 findings, no hard errors found —
> Nielsen's heuristic numbering, Shneiderman's 8 rules, the Miller-vs-Cowan
> distinction, and every WCAG 2.2 criterion number/name independently verified).
> Written here verbatim.

---

## External UX grounding (mapped to the skill)

### surface-decision (tool vs document surface)

The literature splits cleanly: **novelty belongs in aesthetics, conventions in interaction.** Surface choice also governs body typography defaults and whether expert accelerators are appropriate.

- ⚠ **Jakob's Law** (lawsofux.com) — users carry mental models from other sites; keep forms, nav, focus, and keyboard behavior *conventional* even while the look (dark-first, mono) stays distinctive. This is consistency-with-the-world, distinct from Artificer's internal uniformity doctrine.
- ➕ **Flexibility & efficiency / universal usability** (NN/g #7 + Shneiderman #2) — tool surfaces are exactly where keyboard accelerators belong; treat "novice + expert in one UI" as a surface-decision input, not just keyboard parity.
- ⚠ **Dyslexia-readable typography** (BDA Style Guide 2023) — document prose set ragged-right, ≥1.5 line-height, bold (not italic/caps) for emphasis; tension is BDA's dark-on-light/cream preference vs. Artificer dark-first — the survivable principle is *avoid luminance extremes* (off-black surfaces, off-white text).
- **Predictable, consistent placement** (NN/g #4 + COGA Obj 1) — a control never relocates or changes behavior between views; cross-surface consistency is itself an AuDHD accommodation.

### cognitive-load-budget (list caps, progressive disclosure, one primary action, recognition over recall, anchor scanning)

Working memory is small (~4 pure chunks, not Miller's rhetorical 7); good design strips **extraneous** load while leaving **intrinsic** task complexity intact.

- ➕ **Cowan's ~4 (Miller misapplied)** (Cowan 2001; Miller 1956) — justify the list cap by *chunking* + ~4 pure chunks (default-5/max-7 already brackets it), never "7±2"; 7 was rhetorical.
- ➕ **Hick's Law** (lawsofux.com) — decision time grows *logarithmically*; minimize choices and highlight the recommended option (= one-primary-CTA). Caveat Artificer lacks: don't simplify to the point of abstraction.
- ➕ **Cognitive Load Theory (intrinsic/extraneous/germane)** (Sweller; NN/g) — frame the whole budget as "remove extraneous, preserve intrinsic"; NN/g names "meaningless typography flourishes" as extraneous, directly licensing anchor-words-only and animate-state-not-arrival.
- ➕ **Progressive disclosure** (NN/g) — two hard rules: frequently-needed items *stay primary*, and the route to "more" must be visibly obvious (decided by frequency, not guesswork).
- ➕ **Recognition over recall** (NN/g #6) — make it concrete: surface recents/history, keep menus visible, label icons, keep cross-step data on screen.
- **Aesthetic & minimalist design** (NN/g #8) — every extra unit of content competes for attention; the named floor under list caps + anchor scanning.
- **Users scan, not read** (NN/g, How Users Read) — ~79% scan, ~16% read word-by-word, consuming 20–28% of text; the empirical floor under anchor-word scanning — conclusion first, one idea per paragraph.
- **Protect focus / limit interruptions** (COGA Obj 5) — keep the critical path short; non-urgent notifications must not interrupt an in-progress task.

### state-trees (loading-by-duration, empty, error, refresh-in-place, success-as-receipt)

Every state is an instance of **visibility of system status**; the duration tree should be anchored to the canonical response-time limits, not preference.

- **Visibility of system status** (NN/g #1) — the WHY behind state-trees: every state (loading, refresh-in-place, empty, success) tells the user what the system is doing.
- ➕ **Three response-time limits (0.1/1/10s)** (NN/g, after Miller 1968) — the <100ms "nothing" rung IS 0.1s instantaneous; >10s "background" IS the attention-abandonment limit; add the missing 1-second "flow of thought" rationale for why 100–500ms gets only a disabled label, not a skeleton.
- **Silence reads as failure** (COGA Obj 4; NN/g #1) — the success-receipt is a *correctness* mechanism (prevents anxious duplicate submissions), not a courtesy.
- ➕ **Empty states have THREE jobs** (NN/g, Kaplan) — Artificer's (name-what's-missing + one-action) is missing the third: educate about the feature — add it as an optional beat for first-run empties.
- ➕ **Offer the fix, don't just describe it** (NN/g Error-Message Guidelines) — when the system can infer the correction, surface it as a one-tap action above prose; lowest-effort recovery beats the best-worded instruction.
- ➕ **Chunk multi-step tasks** (COGA Obj 1/3/4) — one step visible at a time, a concrete progress indicator, one instruction per line (never compound).

### feedback-urgency (notify by action-required not severity, tiers, stacking limits)

Action-required tiering is sound; the literature adds an orthogonal **magnitude** axis and a focus-protection rule.

- ➕ **Feedback proportional to action + closure** (Shneiderman #3/#4) — feedback magnitude should scale with action significance; success-receipt is the *closure* that ends a sequence — let small actions get small acknowledgements, not the same notif weight.
- **Defer non-urgent notifications** (COGA Obj 5) — info-tier feedback must never interrupt an in-progress task with a modal; reinforces tier-by-action-required as focus protection.

### microcopy-voice (literal/direct/deadpan, three-jobs error, plain language, word-swaps)

Plain, literal language is the documented canon — and high-literacy experts prefer it *most*. The biggest gaps are measurable caps and a reading-level floor.

- **Recognize/diagnose/recover (#9)** (NN/g) — three-jobs error almost verbatim; tighten it to forbid raw error *codes* explicitly.
- **Error messages never blame** (NN/g Error-Message Guidelines) — ban "invalid/illegal/incorrect"; the "why" explains the system, not the user's mistake.
- **Match system & real world (#2)** (NN/g) — user's language and real-world ordering/grouping, not database/system structure.
- ➕ **Plain language benefits experts most** (GOV.UK; NN/g) — research: 80% incl. specialists preferred clear English; plain language is the default for tool AND document surfaces, not dumbing-down.
- ➕ **6th–8th grade reading level** (NN/g, Lower-Literacy) — adopt an explicit a11y floor for product copy; directly serves the AuDHD/dyslexia/ADHD audience.
- ➕ **Concrete sentence/paragraph caps** (plainlanguage.gov; GOV.UK) — ~20-word average, split >25, ≤5 sentences/paragraph, keep subject-verb-object adjacent, verbs over nominalizations.
- ➕ **State consequences before commit** (COGA Obj 7) — name the outcome AND the cost/drawback up front; many ND users cannot anticipate "what happens if I press this."
- ➕ **No double negatives / nested clauses** (COGA Obj 3) — one clause, one idea; prefer positive phrasing.
- ➕ **Main point at the very top** (NN/g, Lower-Literacy) — narrow-field "plow" readers who give up after a few lines must still get the point in the first line.
- **Front-load labels (first ~2 words)** (NN/g, Better Link Labels) — verb+keyword first; vague labels ("here", "Learn more") are also useless to screen-reader link-lists.
- **Do the hard work for the user** (GOV.UK) — the governing maxim and philosophical parent of Artificer's effort-shifting voice; adopt "must" as the canonical word for required actions.
- ⚠ **Word-swaps / negative contractions** (GOV.UK A-Z) — supports the word-swap discipline, but GOV.UK *bans* negative contractions (can't/don't) — decide explicitly whether the deadpan voice adopts or overrides this.

### forms-behavior (label not placeholder, hint before typing, validate on blur, preserve on error, submit on Enter)

The throughline: **the system absorbs irreducible complexity** and prevents slips *before* validation fires; WCAG 2.2 adds three new, high-value forms criteria.

- ➕ **Tesler's Law (conservation of complexity)** (lawsofux.com) — the component/system absorbs complexity (smart defaults, auto-populated fields, behavior modules); don't design for an idealized rational user.
- ➕ **Error prevention — slips vs. mistakes** (NN/g #5) — a tier *above* validate-on-blur: forgiving formatting (accept any phone/date and reformat), constraints that disable invalid options, good defaults.
- **Constraints up front** (NN/g forms guidelines) — backs hint-before-typing; an error the hint could have prevented is a hint failure, not an error-copy problem.
- ➕ **Reversibility / user control & freedom** (NN/g #3; COGA Obj 4) — destructive/committing actions offer undo or an exit (a "cancel within N seconds"), not just a confirm dialog.
- ➕ **Redundant Entry / never gate on memory** (WCAG 2.2 SC 3.3.7; COGA Obj 6) — extend preserve-on-error to multi-step flows: carry prior answers forward (auto-fill or pick-list); never re-type.
- ➕ **Accessible Authentication** (WCAG 2.2 SC 3.3.8) — no cognitive-test/CAPTCHA gates; never block paste, mark fields for password managers, offer passkey/biometric paths.
- ➕ **Dragging movements need a single-pointer alternative** (WCAG 2.2 SC 2.5.7) — every slider/reorder/carousel ships a click/tap/button path for tremor, trackball, and eye-gaze users.

### motion-communicates-state (animate state not arrival, duration ceiling, honor reduced-motion)

Reduced-motion is a **safety floor, not taste**; the OS-level toggle doesn't cover auto-updating content or session timeouts.

- **Animation from interactions** (WCAG 2.2 SC 2.3.3) — confirms reduced-motion + no-parallax; sharpen the WHY: non-essential motion causes vestibular harm (dizziness, nausea, migraine).
- ➕ **Control over moving/updating content + timeouts** (WCAG 2.2.1/2.2.2; COGA Obj 8) — live/refresh-in-place regions need an in-UI *pause*; timed flows must autosave + warn-and-extend before any timeout. prefers-reduced-motion alone covers none of this.
- **No distraction near focus targets** (COGA Obj 5; WCAG 2.2.2) — reframe as an ADHD focus rule: no moving/animated decoration adjacent to body text or active form fields.

### accessibility-as-experience (keyboard parity, focus order, color+text not color-alone, focus trap, skip link)

Disability is a **mismatch the design creates or removes**; designing for the most-constrained user is the best default for everyone, not an a11y tax.

- ➕ **Recognize exclusion (mismatch, not deficit)** (Microsoft Inclusive Design) — failures read as "the surface excluded someone" (a fixable bug), keeping a11y as experience, not compliance.
- ➕ **Persona Spectrum** (Microsoft Inclusive Design) — frame AuDHD-first as the *permanent* end of a continuum that also serves the temporarily/situationally overloaded (tired, multitasking, in a terminal).
- ➕ **Solve for one, extend to many** (Microsoft Inclusive Design) — choose the option that solves for the most-constrained user; it is also the best default — this is WHY the cognitive-load budget exists.
- ➕ **Signifiers, not affordances** (Don Norman) — every actionable element needs a *perceptible* "I'm actionable" cue; generalizes "color is never the only signal" from status to affordance, and forbids gesture-only interactions.
- ➕ **Fitts's Law** (NN/g) — beyond the 44px nav floor: edge/corner placement for high-frequency or destructive controls (edges are "infinite" targets), and minimum spacing between adjacent targets — size AND distance reduce error.
- ⚠ **Target Size (Minimum)** (WCAG 2.2 SC 2.5.8, AA) — "dense desktop controls" must add a hard **24px AA floor** for all pointer targets (or lean on the spacing exception); below 24px with tight neighbors is a real AA failure, not a non-AAA choice.
- ➕ **Focus Not Obscured** (WCAG 2.2 SC 2.4.11, AA) — sticky `.appbar`/toast/drawer must not cover the keyboard-focused element when tabbing (offset / scroll-padding it). The 2px tokenized ring already meets 2.4.13 geometry/contrast.
- **Consistent Help** (WCAG 2.2 SC 3.2.6; COGA Obj 7) — place help/contact/docs in the same relative location across every view; predictable placement is cognitive-load reduction, same logic as the list cap.
- **External consistency & standards (#4)** (NN/g #4; Shneiderman #1) — honor platform conventions: native focus rings, OS reduced-motion, expected Esc/Enter/arrow semantics — don't invent novel ones.

---

### What the literature says Artificer should ADD

1. **A reading-level floor + measurable copy caps** — 6th–8th grade target; ~20-word average / split >25 / ≤5 sentences per paragraph; SVO kept adjacent; verbs over nominalizations. (NN/g Lower-Literacy + Legibility; plainlanguage.gov; GOV.UK clear-language.) Directly serves the AuDHD mission.
2. **Tesler's Law as a stated principle** — the component/system absorbs irreducible complexity (smart defaults, auto-fill, behavior modules); don't design for an idealized rational user. (lawsofux.com)
3. **The three new WCAG 2.2 forms criteria** — Redundant Entry (3.3.7: carry prior answers across steps), Accessible Authentication (3.3.8: no CAPTCHA/cognitive-test gates, allow paste + passkeys), Dragging Movements (2.5.7: single-pointer alternative for every drag). (w3.org/WAI/WCAG22)
4. **An undo / emergency-exit doctrine** — destructive and committing actions offer undo or an exit, not just a confirm dialog; reversibility lowers the stakes of exploration. (NN/g #3; COGA Obj 4)
5. **Empty-state "educate" beat + offer-the-fix recovery** — add the third empty-state job (teach the feature) and a recovery tier above "how to fix": surface the inferred correction as a one-tap action. (NN/g empty-states + error-message guidelines)
6. **A 24px AA target floor + Focus Not Obscured** — all pointer targets ≥24px (or spacing exception); sticky chrome must not cover the focused element. (WCAG 2.2 SC 2.5.8, 2.4.11)
7. **In-UI control over auto-updating content + timeouts** — pause controls for live/refresh-in-place regions; autosave + warn-and-extend before session expiry. prefers-reduced-motion does not cover these. (WCAG 2.2.1/2.2.2; COGA Obj 8)
8. **Signifiers as a stated rule + the mismatch/spectrum framing** — every actionable element needs a perceptible "actionable" cue (no gesture-only); cast a11y as solving for the most-constrained user, who anchors the best default for all. (Norman; Microsoft Inclusive Design)

### Canonical vocabulary

| Artificer instinct | Canonical name (source) |
|---|---|
| loading-by-duration tree | Visibility of System Status (NN/g #1) + 0.1 / 1 / 10s response-time limits (Nielsen) |
| list cap ~5/7 | chunking + Cowan's ~4 (not Miller 7±2); Hick's Law |
| one primary CTA | Hick's Law "highlight the recommended option" + Aesthetic & Minimalist (#8) |
| recognition over recall | Heuristic #6 / Shneiderman Golden Rule #8 |
| progressive disclosure | Progressive Disclosure (Nielsen) |
| success-as-receipt | Visibility of System Status / "design dialogs to yield closure" (Shneiderman #4) |
| preserve input on error | Redundant Entry (WCAG 2.2 SC 3.3.7) |
| three-jobs error (what/why/how) | Help Users Recognize, Diagnose, Recover (Heuristic #9) |
| literal/plain/deadpan voice | "Do the hard work for the user" (GOV.UK) / Match the Real World (#2) |
| system absorbs complexity | Tesler's Law (Conservation of Complexity) |
| color + text, not color-alone | Signifiers, Not Affordances (Norman) — extended status → affordance |
| 44px nav targets | Fitts's Law + Target Size Minimum (WCAG 2.2 SC 2.5.8) |
| honor reduced-motion | Animation from Interactions (WCAG 2.2 SC 2.3.3) — vestibular safety |
| uniformity doctrine | Consistency & Standards (#4) / Consistent Help (3.2.6) / Jakob's Law (external) |
| anchor-word scanning | "Users scan, not read" — 79% scan, 20–28% consumed (NN/g) |

### Key sources

**Laws of UX & cognitive science**
- https://lawsofux.com/millers-law/ · /hicks-law/ · /teslers-law/ · /jakobs-law/
- Cowan 2001 "magical number 4" (cambridge.org PDF); Sweller CLT (link.springer.com/10.1007/s10648-010-9128-5)

**Nielsen Norman Group**
- ten-usability-heuristics · response-times-3-important-limits · recognition-and-recall · progressive-disclosure · fitts-law · minimize-cognitive-load · visibility-system-status · slips · error-message-guidelines · errors-forms-design-guidelines · empty-state-interface-design · better-link-labels · writing-links · how-users-read-on-the-web · writing-for-lower-literacy-users · legibility-readability-comprehension (all under nngroup.com/articles/)

**W3C — WCAG 2.2 & COGA**
- https://www.w3.org/TR/coga-usable/ · https://www.w3.org/TR/WCAG22/ · /WAI/standards-guidelines/wcag/new-in-22/
- Understanding: target-size-minimum · dragging-movements · accessible-authentication-minimum · redundant-entry · animation-from-interactions · focus-appearance · consistent-help

**GOV.UK & plain language**
- gov.uk/guidance/content-design (writing-for-gov-uk, what-is-content-design) · gov.uk/guidance/style-guide/a-to-z
- guidance.publishing.service.gov.uk/…/clear-language · plainlanguage.gov/guidelines/concise/ (+ keep-subject-verb-object-close)

**Microsoft Inclusive Design**
- https://inclusive.microsoft.design/ · /articles/inclusive-activity-cards · /tools-and-activities/InclusiveActivityCards.pdf

**Shneiderman & BDA**
- https://www.cs.umd.edu/~ben/goldenrules.html · BDA Dyslexia Style Guide 2023 (cdn.bdadyslexia.org.uk)