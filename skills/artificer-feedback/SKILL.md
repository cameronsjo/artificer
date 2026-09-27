---
name: artificer-feedback
description: "Use when a project that consumed the Artificer design system made adaptation or pivot decisions this session and wants to report them back to the design system as a GitHub issue. Triggers on 'artificer feedback', 'report design decisions back', 'we adapted Artificer', 'feed this back to the design system', 'dogfood Artificer', 'file design feedback upstream'."
license: Apache-2.0
user-invocable: true
metadata:
  author: cameronsjo
  version: "0.2.1"
---

# Artificer Feedback

Report a settled design adaptation from a downstream consumer as one GitHub issue
at `cameronsjo/artificer-design-system`, and keep the rationale in the consumer's
`docs/artificer-adaptations.md`. Capture what happened so the maintainer can decide
what belongs upstream; do not redesign the system while filing.

## When to file

File when a coherent pivot settles, sweep at conversation lulls, and invoke at
session end. In Cameron's own projects (repos owned by `cameronsjo`), file
without asking. Elsewhere, show the
payload and ask before filing. Prefer a background agent when available so
filing does not interrupt the build.

Two exceptions: do not file from inside `artificer-design-system` itself, and
respect the user's unprompted decline. One issue covers one pivot, even when it
changed many tokens. Do not delay settled feedback to batch, triage, or search
existing issues; later feedback maintenance belongs to another task. If there is
no new settled decision to report, say so rather than inventing one.

## Recover the decision from the session

Use the available conversation and files. Lead with observed friction:

1. Where did a rule, token, or pattern make the consumer work around the system?
2. What was missing, forcing the consumer to invent or copy a component?
3. Which adaptations are product-specific and should **not** be upstreamed?

Name the files, tokens, rules, or line numbers that support the account. An
adaptation may have worked without friction; report that honestly. Do not invent
a gap to satisfy a template or turn this retrospective into an unnecessary user
interview.

For each adaptation record:

| Field | Content |
|---|---|
| `type` | `gap` (missing pattern), `override` (existing rule needed a local exception), `misfit` (rule fought this product), `extension` (reusable composition), or `confusion` (unclear instruction) |
| `surface` | `tool` (doing work) or `document` (reading) |
| `token / rule / pattern` | Exact name, or `none existed` |
| `what we did + why` | Concrete change and a short explanation |
| `upstream?` | `yes`, `no`, or `maybe` |
| `lane` | `1` for a new/changed color value or new/renamed semantic role; `3` for integration using existing roles; uncertainty may be `maybe` |

Default to Lane 3. Lane 1 flags the one decision that needs maintainer
approval; it does not require the consumer to master the internal ownership model.
Keep the distinction between reusable improvements and local workarounds.

## Assemble and file

Use the `artificer-feedback` issue-template shape: project, pivot in one line,
deviations table, friction, don't-upstream section, lane note, and a short
narrative explaining what the build revealed. Keep the don't-upstream section even
when its answer is `none`. Write plainly, without a victory lap or metaphor.

Title: `feedback(<project>): <one-line pivot>`. Apply the `feedback` label.
Use the session's issue-filing convention (`creating-issue` when available), or
`gh issue create -R cameronsjo/artificer-design-system` with the prepared body.
File it when the session's convention permits an upstream write. When the convention does not permit the write, present the payload and say
filing is still owed. Presenting a payload is not completion: the receipt is the
returned issue URL. If filing fails, preserve the payload and report the failure
instead of claiming it filed.

## Keep the consumer's decision log

Append the same decisions to `docs/artificer-adaptations.md` in the **consumer**
working tree. Create it with this header if absent:

```markdown
# Artificer adaptations

How this project bends the Artificer design system, and why.
```

Each kept divergence has a receipt in this form:

```markdown
## A{N} — {short title}

- **Dated:** YYYY-MM-DD · app @ {version} · Artificer @ {--art-version}
- **What diverges:** {the custom implementation}
- **Why necessary:** {what the primitive/token could not do}
- **Upstream issue:** cameronsjo/artificer-design-system#{NNN}
- **Retire when:** {the upstream change that obsoletes this entry}
```

The issue reference is cross-repository because this record lives in the consumer.
Use the verified URL or qualified issue number; if filing failed, mark it pending
and retain the payload rather than inventing a receipt. The local log preserves
why the consumer diverged even if the upstream issue later closes.
