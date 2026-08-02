# Microcopy & voice — the reference

The words are part of the behavior. This file holds the full voice doctrine, the
word-swap glossary, before/after copy for every state, and the 7-point voice
checklist. The principles and their sources are in
[grounding.md](grounding.md) (§ microcopy-voice); the one-paragraph summary is in
[SKILL.md](../SKILL.md) § 5.

---

## The three pillars

1. **Literal.** Name the thing. Don't gesture. "No projects yet" beats "Nothing to
   see here." A reader under stress, or who reads literally, parses the literal
   sentence and stalls on the gesture.
2. **Direct.** Front-load the verb. The first ~2 words of a button or link are what
   it *does* — "Save changes", not "Click here to save". Vague labels ("here",
   "Learn more") are also useless in a screen-reader's link list, read out of
   context.
3. **Lightly deadpan.** Wit lives in restraint, not in jokes. A command palette
   that shows exactly five results is funnier than any pun. No sarcasm anywhere —
   it is ambiguous, and ambiguity is the thing this voice exists to remove.

**The governing maxim — "do the hard work for the user" (GOV.UK).** The copy
absorbs effort so the reader spends less. If a sentence makes the reader do work
the system could have done (compute a consequence, infer a next step, decode a
code), rewrite it.

**Plain is the default, not dumbing-down.** Research is consistent: clear language
is preferred by ~80% of readers *including domain experts*. Plain language wins on
tool surfaces and document surfaces alike. The expert is not insulted by clarity;
they're grateful for the saved second.

---

## Measurable caps (the reading-level floor)

This voice serves an AuDHD / dyslexia / ADHD audience first. That makes the
informal "keep it short" into measurable targets:

- **Reading level:** aim 6th–8th grade for product copy.
- **Sentences:** ~20-word average; split anything past 25.
- **Paragraphs:** ≤5 sentences; one idea each.
- **Structure:** keep subject-verb-object adjacent; prefer verbs over
  nominalizations ("decide" over "make a decision"); one clause, one idea; no
  double negatives; prefer positive phrasing.
- **Order:** main point in the *first line*. A "plow" reader who quits after two
  lines must still get the point.

---

## The word-swap glossary

Left is what tools reach for; right is the Artificer word. The reason is in the
third column — swap by reason, not by rote.

| Instead of… | Use… | Because |
|---|---|---|
| "Oops! Something went wrong" | "Couldn't save your changes." | Name the object and the action that failed; "oops" infantilizes and says nothing. |
| "Invalid input" / "Illegal value" | "Enter a date, like 2026-03-01." | Never blame; show the shape of a correct answer. "Invalid/illegal/incorrect" are banned. |
| "Error 500" (alone) | "Couldn't reach the server. Try again." | A raw code is never the whole message; say what it means and what to do. |
| "Are you sure?" | "Delete 3 files? This can't be undone." | State the object, the count, and the consequence — not a vague challenge. |
| "Please wait…" / "Loading…" | "Indexing 1,247 of 8,300 files." | A bare loading verb tells the user nothing; give the concrete progress. |
| "Success!" / "Done! 🎉" | "Saved." | A receipt, not a parade. No exclamation, no emoji. |
| "Click here" / "Learn more" | "Read the setup guide." | Front-load the verb+keyword; vague links fail screen-reader link lists. |
| "Nothing to see here" | "No runs yet. Start one to see history." | Literal: name what's missing and the one action. |
| "Whoops, that's not allowed" | "Names can't contain spaces." | State the rule, not a scold. |
| "Submit" | "Save changes" / "Send invite" | Name the real outcome, not the form mechanic. |
| "Utilize" / "Leverage" | "Use." | Plainest verb wins; nominalizations and inflated verbs add load. |

**⚠ Negative contractions — the deliberate call.** GOV.UK bans "can't / don't"
(lowest-literacy readers misread "can't" as "can"). Artificer **overrides** this:
contractions stay (natural, deadpan, high-literacy audience) — **except** in a
blocking error or a destructive confirmation, where you spell it out: "This
**cannot** be undone", "We **could not** save". At the one moment a misread is
expensive, remove the ambiguity.

---

## Before / after — every state

### Empty state

```
BEFORE                                   AFTER
┌──────────────────────────┐            ┌──────────────────────────┐
│   Nothing to see here!    │            │  No runs yet.            │
│                           │            │  Trigger a run to see    │
│                           │            │  its history here.       │
│                           │            │  [ Start a run ]         │
└──────────────────────────┘            └──────────────────────────┘
```
Name what's missing + why + **one** action. First-run only: add an *educate* beat
— one sentence on what the feature does.

### Error (the three jobs: what / why / how)

```
BEFORE                                   AFTER
"Oops! Something went wrong.             "Couldn't save your changes.      ← what
 Please try again later."                 The server didn't respond.       ← why
                                          Your edits are still here —      ← (reassure)
                                          try again in a moment."          ← how
                                          [ Try again ]                    ← offer the fix
```
When the system can *infer* the fix, surface it as a one-tap action above the prose.
Never make a raw code the whole message. The "why" explains the system, not the
user's mistake.

### Field validation

```
BEFORE                          AFTER
"Invalid email."                "Enter a valid email, like name@example.com."
"Required field."               "Add your display name."
"Password too weak."            "Add a number or symbol — 8 characters minimum."
```

### Success (receipt, not parade)

```
BEFORE                          AFTER
"🎉 Success! Your profile       "Saved."
 has been updated!"             (quiet, where their eyes already are; no toast +
                                 checkmark + animation stacked for a routine save)
```

### Loading

```
BEFORE              AFTER
"Loading…"          "Indexing 1,247 of 8,300 files."
"Please wait"       "Deploying to us-east-1…"        (concrete target, never bare)
```

### Confirmation / destructive

```
BEFORE                          AFTER
"Are you sure?"                 "Delete 'staging-db'? This cannot be undone."
[ Yes ] [ No ]                  [ Delete ] [ Cancel ]      (verb-first buttons;
                                 better still: offer Undo instead of a gate)
```
**State the consequence before the commit** (COGA Obj 7) — the outcome *and* its
cost, up front. And prefer **undo over a confirm dialog** where you can: reversibility
lowers the stakes of every action.

---

## The 7-point voice & tone checklist

1. **Name the surface or object.** "No projects yet" beats "Nothing here."
2. **Front-load the verb.** The first word of a button is what it does.
3. **Three jobs for an error:** what broke · why (the system) · how to fix.
4. **No emoji** in product copy. (Wordmarks and avatars are fine.)
5. **No metaphor in failures.** "Gremlins / magic / sideways" confuse under stress.
6. **Don't celebrate.** A success message is a receipt, not a parade.
7. **Read it back at 1.5× speed.** If anything feels like filler, cut it.
