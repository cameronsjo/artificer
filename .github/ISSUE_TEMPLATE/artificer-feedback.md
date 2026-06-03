---
name: Artificer feedback — adaptation report
about: A downstream project that consumed Artificer reports how it adapted the system
labels: feedback
---

> This is the external feedback loop. You consumed Artificer, you bent it to fit
> a real product — tell me where it held up and where it fought back. Filed by the
> `artificer-feedback` skill, or by hand from `docs/artificer-feedback-prompt.md`.

## Project

- Consumer project:
- Artificer version consumed: `v0.x.0`
- Install path: A (vanilla copy) · B (bundler) · C (Tailwind)
- Surface kind: tool · document · both

## The pivot in one line

(What changed direction this session, and why. Cameron-approved.)

## Deviations

| Type | Surface | Token / Rule | What we did + why | Upstream? | Lane |
|---|---|---|---|---|---|
| gap\|override\|misfit\|extension\|confusion | tool\|document | `--art-...` / rule # / `none existed` | … (one-line why) | yes\|no\|maybe | 1\|3 |

Type legend — **gap** (nothing existed) · **override** (existed but wrong for us) ·
**misfit** (a hard rule fought the product) · **extension** (reusable new thing
built on top) · **confusion** (couldn't tell what the system wanted).

## Where Artificer fought us / what we wished existed

(The friction section — the highest-signal part. Be specific.)

## What we'd NOT want upstreamed

(Product-specific hacks that should stay out of the core. The pollution filter.)

## Lane note (for the maintainer)

> Only one thing here needs formal ratification: a **new or changed color value**
> or a **new or renamed semantic role name**. Everything else is integration
> feedback that ships freely.

- [ ] Touches a palette value or semantic role name — **Lane 1** ratification needed
- [ ] Integration / usage / bug / composition only — **Lane 3**

## Narrative

(Field-report voice: "what did the build reveal?" — problem-framed, not a victory
lap. Name the seam the system doesn't yet own.)
