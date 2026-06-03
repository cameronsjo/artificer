# Artificer feedback prompt — paste into a consumer session

The canonical trigger for the **external** Artificer feedback loop. Paste this at
the end of a downstream session that consumed Artificer and pivoted, to capture
the design decisions back upstream as a GitHub issue.

If the consuming project has the `artificer-design-system` plugin installed, the
`artificer-feedback` skill supersedes this prompt — invoking the skill carries the
same structure plus the lane primer and the issue-template wiring. **This prompt
is the fallback** for sessions without the plugin; keep the two in sync when the
skill's capture fields change.

---

```text
We're back — from the future. This session made real design decisions adapting
the Artificer design system, and we pivoted (Cameron signed off). Time to feed
that back upstream as a GitHub issue against cameronsjo/artificer-design-system.

If the `artificer-feedback` skill is available, invoke it. Otherwise, do this
manually:

First, answer the three questions that matter most — be specific, name files and
tokens:
  1. Where did Artificer FIGHT us? Every place a rule, token, or pattern made us
     work around it.
  2. What did we WISH existed? Name the gaps — the token, component, or pattern
     that should have been there and wasn't.
  3. What would we NOT want upstreamed? Separate the product-specific hacks from
     the genuinely reusable ideas, so we don't pollute the core.

Then log each deviation we made, classified:
  - type: gap (nothing existed) · override (existed but wrong for us) ·
    misfit (a hard rule fought the product) · extension (we built a reusable new
    thing on top) · confusion (couldn't tell what the system wanted)
  - surface: tool (do-something UI) or document (read-something UI)
  - token/rule/pattern involved (or "none existed")
  - what we did, and the one-line WHY
  - upstream? yes / no / maybe
  - the lane question (below)

The lane question — the ONE thing the maintainer must formally ratify:
  Did we add or change a color VALUE, or mint or rename a semantic role NAME? If
  yes, flag it Lane 1 (needs ratification). Everything else — which token paints what, new
  compositions, bug reports, friction — is just integration feedback, Lane 3,
  shipped freely. When unsure, mark it "maybe" and let the maintainer triage.

Finally, write a short narrative in the Artificer field-report voice: problem-
framed, "what did the build reveal?" — not a victory lap. The homepage session's
"unowned editorial layer" finding is the model: surface the layer the system has
no home for.

Assemble all of this into one issue titled `feedback(<project>): <one-line pivot>`
and file it to cameronsjo/artificer-design-system using whatever issue-filing
convention this session already has (the creating-issue skill, or `gh issue
create -R cameronsjo/artificer-design-system`). One issue per pivot — not one per
micro-decision.
```
