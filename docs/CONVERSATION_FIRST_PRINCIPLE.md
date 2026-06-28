# Conversation First — Product Principle

> **Status: Foundational Product Principle.**
>
> Records the design principle that **conversation and Decision Screens have different responsibilities**.
> This is a product-design document — **not** implementation, **not** UI, **not** architecture. The
> **Constitution** (`docs/ALH_PRODUCT_PHILOSOPHY.md`) remains the highest authority; this document refines
> how *Conversation First* and *Decision Screens* divide their work.

---

## Core Principle

> **Conversation exists for decisions that are naturally expressed in words.
> Decision Screens exist for decisions that are naturally expressed visually.**
>
> Neither replaces the other. Each is used where it is strongest.

A conversation is not a verbal form, and a screen is not a faster questionnaire. They are two different
instruments for two different kinds of decision. The product chooses between them by asking: *is this
decision more natural to say, or to see?*

---

## Why — Conversation is best for the things people say

Conversation is the strongest interface for:

- **intentions**
- **goals**
- **feelings**
- **preferences**
- **priorities**
- **constraints**
- **human judgement**

These live in language. They are how a person expresses *what they want and why*, and they resist being
captured by a grid of options.

*Examples:*
- "I want something relaxing."
- "I don't want children."
- "I'd like to keep it under $500."
- "I want people to leave inspired."

None of these is a field to fill in — each is a human judgement best spoken, then understood.

---

## Why — Decision Screens are best for the things people see

A Decision Screen is the strongest interface for:

- **maps**
- **calendars**
- **timelines**
- **comparisons**
- **visual layouts**
- **multiple alternatives**
- anything **spatial**
- anything **easier to understand by looking than by describing**

These resist language. Describing a place, a date among many, or a set of alternatives in words is slower
and less certain than simply showing them.

*Examples:*
- Choose the location on a map.
- Choose the first Sunday on a calendar.
- Compare three participation models.
- Review the proposed schedule.

---

## Important Principle — Not every unknown requires a question

An unknown is not automatically a question. If a decision is easier to make **visually**, it does not
belong in the conversation — it belongs on the Decision Screen.

> **Never ask in conversation what can be decided more naturally by looking.**

Turning a visual decision into a verbal question makes the organizer work harder, not less — the exact
opposite of the product's purpose.

---

## Examples — verbal question vs. prepared-and-shown

| ✗ Bad (a verbal question) | ✓ Good (AI prepares; the organizer sees) |
|---|---|
| "What beach?" | "I'll propose a location on the map." |
| "What date?" | "I'll suggest the first available Sunday." |
| "What pricing model?" | "I'll prepare three participation options for you." |

In each "Bad" case the organizer is asked to translate a visual or business decision into words. In each
"Good" case the AI does the preparation and the organizer simply **looks and chooses**.

---

## Relationship to the Organizer Journey

Conversation collects **only** the decisions that truly belong in conversation — the intentions,
preferences, and judgements only the human can voice. **Everything else is prepared by AI and reviewed
visually.** The journey therefore narrows to its smallest natural shape: a few words that genuinely need
saying, then a proposal to look at — never a verbal interrogation standing in for a screen.

---

## Relationship to the Constitution

This principle supports:

- **Conversation First** — words are the default; screens are the exception, used only where sight beats speech.
- **Organizer Journey** — the path is shaped by which decisions are verbal vs. visual, not by pages.
- **AI Works. Human Decides.** — AI prepares every visual/derivable decision; the human decides among prepared options.
- **Decision Screens** — a screen earns its place only for *visualize / compare / choose / confirm / pay*, never for gathering information.
- **Reality Before Screens** — fewer questions and fewer screens move the organizer faster toward a real gathering.
- **Invisible Architecture** — the split is about *verbal vs. visual decisions*, never about exposing internal entities; the machinery stays hidden either way.

---

## Checklist — before adding a new conversational question

Ask, in order:

1. **Can AI infer this safely?** — if yes, don't ask; assume it and let the organizer adjust later.
2. **Can AI prepare a recommendation?** — if yes, prepare options instead of asking an open question.
3. **Would this be easier to decide visually?** — if yes, defer it to the Decision Screen.
4. **Is this genuinely a human decision?** — if no, AI should handle it.
5. **Does asking this make the organizer work more?** — if yes, that is a reason to remove it.

> **If any answer suggests the question is unnecessary, remove it.**

The default is *not* to ask. A conversational question must earn its place by being a genuine human
decision that is more natural to say than to see.

---

*Foundational Product Principle. Conversation carries what is best said; Decision Screens carry what is
best seen; AI prepares the rest. Subordinate to the Constitution — if the two ever conflict, the
Constitution wins.*
