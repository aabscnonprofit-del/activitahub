# AI Artifact Ownership Principle

> **Status: AUTHORITATIVE product principle.** It extends `MULTI_AGENT_ARCHITECTURE_PRINCIPLE.md` (which
> separates AI *roles*) with the rule of artifact *ownership*. It sits under the Constitution
> (`ALH_PRODUCT_PHILOSOPHY.md`) and complements `ACTIVLIFE_HUB_PRODUCT_CANON.md` and
> `AI_PROJECT_MODELING_PRINCIPLE.md`. It introduces no new product concept — it names a rule already implied
> by those documents and made explicit when a handwritten fallback tried to produce a Future Event
> Description. It changes no code. Where it and those documents disagree, those documents win.

---

## 1. Purpose

Artifact ownership exists so that **every major product artifact has a single, authoritative source** — the
one AI role responsible for that stage. When ownership is clear, an artifact is trustworthy: whoever reads it
knows *who* produced it, *from what*, and that nothing else silently created, replaced, or edited it.

The principle became explicit during Future Event Description Slice 1: a handwritten fallback attempted to
produce a Future Event Description when the dedicated FED AI was unavailable. That was rejected. A Future
Event Description may come **only** from the Future Event Description AI. This rule is broader than the FED —
it governs the whole pipeline.

---

## 2. Principle

Each major product stage owns exactly:

- **one AI role** — the single intelligence responsible for that stage;
- **one product artifact** — the single output that stage produces;
- **one responsibility** — the single job that role performs.

An artifact is produced **only** by its owning AI role. It must **never** be silently created, replaced, or
modified by:

- handwritten fallback logic;
- another AI role;
- a later pipeline stage;
- an implementation shortcut.

"Silently" is the operative word: no path may fabricate an artifact and present it as if the owner produced
it.

---

## 3. Artifact Ownership

Each artifact has **exactly one** authoritative AI owner — one AI role that may produce it, and no other
producer (human-coded or AI) may stand in for that owner. For example:

| Artifact | Authoritative AI owner |
|---|---|
| Statement of Understanding | Intent Discovery AI |
| Future Event Description | Future Event Description AI |
| Project Plan | Planning AI |
| Budget | Budget AI |
| Timeline | Timeline AI |

Ownership is **independent per artifact** — it is not bundled. A Project Plan, a Budget, and a Timeline are
owned by **distinct** AI roles, not by one planning role.

**Implementation status:** only the **Intent Discovery AI** (Statement of Understanding) and the **Future
Event Description AI** (Future Event Description) exist today. **Planning AI, Budget AI, and Timeline AI are
illustrative** — they show how the ownership rule applies to artifacts not yet implemented. Listing them here
does **not** define, schedule, or commit to their internal design or any future architecture; they appear
only to demonstrate the principle.

This is not a claim about *how many* agents exist (that is `MULTI_AGENT_ARCHITECTURE_PRINCIPLE.md`). It is a
claim about *who is allowed to author each artifact*.

---

## 4. Failure

If the responsible AI cannot produce its artifact — it is unavailable, disabled, errors, returns invalid
output, or produces content outside its remit:

- **the stage fails;**
- **the workflow does not advance;**
- **no handwritten replacement is generated;**
- **another AI role must not silently create the artifact.**

A failed stage is reported as a failure, plainly, so it is never mistaken for a produced artifact. An absent
artifact is preferable to a fabricated one: downstream stages depend on the artifact being genuinely the
owner's work.

---

## 5. Approval

Once an artifact is **approved**:

- it becomes **authoritative** for the stages that follow;
- later stages **consume** it as given;
- later stages **do not silently rewrite** it.

If the client changes the underlying intent, the workflow **explicitly returns** to the correct earlier stage
so the owning AI can revise its artifact and the client can re-approve it. Change is always explicit and
owner-driven — never a quiet downstream edit. (This mirrors the pipeline's approval gates and revision
principle.)

---

## 6. Benefits

Single, authoritative artifact ownership gives ActivLife Hub:

- **Deterministic workflow** — each stage has one producer and one output; the flow advances only on real,
  approved artifacts.
- **Isolated responsibilities** — a role does one job and cannot absorb another's, so behavior stays
  predictable.
- **Replaceable AI implementations** — an owner's model or prompt can be swapped without touching other
  stages, because the artifact contract is stable and singly-owned.
- **Independent testing** — each stage can be validated in isolation against its artifact, without another
  stage or a fallback masking its behavior.
- **Reliable approval gates** — the client approves exactly what the owner produced; nothing else could have
  altered it.
- **Product integrity** — every artifact is genuinely the work of its owner, so trust in one artifact does
  not depend on the honesty of unrelated code paths.

---

## Relationship to existing documentation

- `MULTI_AGENT_ARCHITECTURE_PRINCIPLE.md` — establishes **role separation** (specialized agents by role,
  Project as shared center). This document **extends** it with **artifact ownership** and the failure/approval
  rules; it does not restate the agent catalog.
- `ACTIVLIFE_HUB_PRODUCT_CANON.md` (§8–§11) — defines the stages and their artifacts and the "AI works, human
  decides" approval rule; this document names the ownership invariant those stages already imply.
- `AI_PROJECT_MODELING_PRINCIPLE.md` — the same model is progressively enriched stage by stage; ownership says
  **who** may enrich each layer.
- `ALH_PRODUCT_PHILOSOPHY.md` — the Constitution; this document serves the organizer journey and defers to it
  on any conflict.

This document defines **artifact ownership** only. It does not define multi-agent architecture in general, and
it must not be read to contradict the documents above.
