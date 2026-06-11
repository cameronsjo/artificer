---
name: artificer-feedback
description: "Use when a project that consumed the Artificer design system made adaptation or pivot decisions this session and wants to report them back to the design system as a GitHub issue. Triggers on 'artificer feedback', 'report design decisions back', 'we adapted Artificer', 'feed this back to the design system', 'dogfood Artificer', 'file design feedback upstream'."
license: Apache-2.0
user-invocable: true
metadata:
  author: cameronsjo
  version: "0.2.1"
---

# Artificer Feedback · v0.2

You're in a **downstream** project — one that consumed the Artificer design
system and then bent it to fit a real product. This skill turns the design
decisions made this session into **one structured GitHub issue** filed against
the design system, so the maintainer learns where Artificer held up and where it
fought back.

This is the *external* feedback loop. The design system already tracks its own
internal feedback (Lane 1/Lane 2 docs); this skill is for **consumers** reporting
how they adapted Artificer in the wild. Friction you hit under real constraints is
the highest-signal feedback the system can get — it's where a new pattern gets
born or a rule learns its boundary.

**Run this early and often — and fire-and-forget.** Filing is a **standing
directive from Cameron**, automatic; you **MUST NOT** stop to ask permission. The
moment a design decision or pivot crystallizes, file it; sweep again at every
conversation **lull** and **always** at `cadence:outro`. (Let a decision *settle*
before reporting it — but a settled decision mid-session is ripe *now*; don't hold
it for the end.)

- **Fire-and-forget.** You **MUST NOT** batch, triage, de-dupe, check for existing
  issues, or maintain feedback after sending — that's a *different* session's
  problem (de-duping *before* you file is the trap that eats the session). Surface
  the signal and move on.
- **No asking.** You **MUST NOT** pause to request permission — standing
  pre-approval already covers it. You **SHOULD** invoke via a fork / subagent so
  filing never interrupts the build. If `git-guardrails` is installed it permits
  the upstream `gh` write without extra approval; the fixed target is the literal
  repo `cameronsjo/artificer-design-system`.
- **One issue per pivot** — fire when a coherent decision crystallizes, not for
  every micro-edit (see Doctrine).
- **Two exceptions only:** you **MUST NOT** file inside the
  `artificer-design-system` repo itself (internal work — an invocation here is
  almost always accidental); and the directive is waived **only** on Cameron's
  *unprompted* decline (never solicited). Absent that waiver, file.

---

## The lane question (read this first — it's the only governance you need)

The design system has an internal ownership model, but you only need **one**
distinction from it:

> **Did you add or change a color VALUE, or mint or rename a semantic role NAME?**
> If yes, that's the one thing the maintainer must formally ratify — flag it
> **Lane 1**. Everything else — which existing token paints which element, a new
> composition you built on top, a bug you hit, a rule that fought you — is just
> integration feedback, **Lane 3**, and ships freely. When you're unsure, mark it
> **maybe** and let the maintainer triage. Don't agonize over the boundary; that's
> their job, not yours.

That's the whole model, for your purposes. You do not need to understand the
three-lane saga to file a good report.

---

## The interview

Ask the session these in order. **Lead with friction** — it surfaces the real
signal before the session settles into justifying its workarounds. Be specific:
name files, tokens, rules, line numbers.

1. **Where did Artificer fight you?** Every place a rule, token, or pattern made
   you work *around* it instead of *with* it. This is the most valuable answer —
   dig for it.
2. **What did you wish existed?** Name the gaps — the token, component, shell, or
   pattern that should have been there and wasn't, so you had to invent or copy it.
3. **What would you NOT want upstreamed?** Separate the product-specific hacks
   from the genuinely reusable ideas. This is the pollution filter — without it,
   every one-off hack reads as a system gap and the core bloats.

Then walk each concrete decision through the capture loop below.

---

## Per-deviation capture

For every adaptation the session made, record these fields. The **type** is the
load-bearing one — it tells the maintainer what action the deviation implies.

- **`type`** — one of:
  - **gap** — no token/pattern existed; you invented one. → *candidate new pattern.*
  - **override** — a token/rule existed but was wrong for your context; you
    overrode it. → *candidate to relax or contextualize the rule.*
  - **misfit** — a hard rule actively fought the product (e.g. mono-body on a
    doc-heavy surface). → *candidate rule-boundary refinement.*
  - **extension** — you built a reusable new composition on top (a new shell, a
    new component). → *candidate to upstream into `live-spec/`.*
  - **confusion** — you couldn't tell what the system wanted. → *docs/clarity gap.*
- **`surface`** — `tool` (the user came to *do* something) or `document` (the user
  came to *read* something). Artificer's own first decision; it picks the body font.
- **`token / rule / pattern`** — what was involved, or literally `none existed`.
- **`what we did + why`** — the change, and the **one-line** why. Terse.
- **`upstream?`** — `yes` (generalizable) / `no` (product-specific, keep out of
  the core) / `maybe`.
- **`lane`** — `1` (a palette value or semantic role name) or `3` (everything
  else). Default to `3`; reach for `1` only when you added/changed a color value
  or minted/renamed a role name.

---

## The narrative

After the table, write a **short** prose section in the Artificer field-report
voice: problem-framed, *"what did the build reveal?"* — **not** a victory lap.
The model is the homepage session's finding that the editorial layer had become a
two-consumer pattern with **no canonical home** — an *unowned layer* surfaced by
real use. That's the genre: name the seam the system doesn't yet own. Literal,
direct, lightly deadpan. No celebration, no metaphor.

---

## Assemble + file

1. **Assemble** the captured fields into the `artificer-feedback` issue template
   shape (Project · the pivot in one line · the deviations table · friction ·
   don't-upstream · lane note · narrative). Title convention:
   `feedback(<project>): <one-line pivot>`.
2. **File it** using whatever issue-filing convention **this session already
   has** — prefer the `creating-issue` skill if it's available; otherwise
   `gh issue create -R cameronsjo/artificer-design-system`. Apply the `feedback`
   label.

This skill **assembles and hands off** — it does not force a `gh` call of its own.
Present the finished payload and let the session's own convention file it. The one
fixed target is the literal repo `cameronsjo/artificer-design-system`.

---

## Downstream decision log

Also keep a local record in the **consumer** repo so the project remembers how it
adapted Artificer. Append the same decisions to `docs/artificer-adaptations.md`
in the current working tree (create it with a one-line header if absent):

```markdown
# Artificer adaptations

How this project bends the Artificer design system, and why. Each entry mirrors a
feedback issue filed upstream.
```

**Per-divergence entry template** (the uniformity doctrine's "receipts" — every
kept divergence carries one; a divergence not worth filing is not worth keeping):

```markdown
## A{N} — {short title}

- **Dated:** YYYY-MM-DD · app @ {version} · Artificer @ {--art-version}
- **What diverges:** {the custom implementation, one sentence}
- **Why necessary:** {what the primitive/token couldn't do}
- **Upstream issue:** #{NNN} (filed via this skill — required; no issue, no divergence)
- **Retire when:** {the upstream change that obsoletes this entry}
```

This path is the **consumer's** working tree — not the design-system repo. It's a
memory aid for the next person in *this* project, and a paper trail if the issue
gets closed.

---

## Doctrine — do not break

1. **One issue per pivot**, not one per micro-decision. A session that touched ten
   tokens for one coherent reason is one issue.
2. **Friction is the highest-signal field.** If the report has no "where it fought
   us" content, you didn't dig hard enough.
3. **Separate product-specific from generalizable.** The "don't upstream" section
   is mandatory, not optional — it's what keeps the core lean.
4. **Don't over-classify lanes.** Unsure is `maybe`. Default is Lane 3. A new or
   changed color value, or a new or renamed role name, is the only thing that
   earns Lane 1.
5. **Report, don't redesign.** This skill captures what happened — it doesn't
   propose the upstream fix. That's the maintainer's call.
6. **Early and often beats complete.** A filed issue mid-session is worth more
   than a perfect one that never ships because the session ended first. Fire when
   a pivot crystallizes; never sit on settled signal waiting for outro.

---

## Versioning

- **v0.2.1** · 2026 · sharpened to **invoke-don't-curate + no-ask**: invoking the
  skill *is* filing; never draft/de-dupe before invoking, never pause to ask
  permission.
- **v0.2** · 2026 · posture shift to **early-and-often, fire-and-forget**: file
  proactively as pivots crystallize (lulls + `cadence:outro`), pre-approved to use
  forks/subagents, with the in-repo guard. Standing directive from Cameron.
- **v0.1** · 2026 · part of the `artificer-design-system` plugin. Ships alongside
  the `artificer-design-system` design skill — that one builds UI, this one
  reports back how the build went.
