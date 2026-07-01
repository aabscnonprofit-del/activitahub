# AI Project Modeling Principle

> **Status: Product principle.** Records one core principle discovered during architecture work.
> Consistent with `ACTIVLIFE_HUB_PRODUCT_CANON.md` (§2, §9, §11, §12), `PROJECT_ASSEMBLY_ENGINE_SPEC.md`,
> and `PROJECT_RUNTIME_SPEC.md`. Product-level; no implementation.

## What ActivLife Hub is not

ActivLife Hub is **not an AI text generator**, and it is **not a checklist builder**. It does not exist to
produce a nicely worded plan, a document, or a to-do list and then stop. A generated paragraph or a list of
tasks is a by-product, never the product.

## The core principle

> **ActivLife Hub progressively transforms a human idea into an executable digital model of a future event.**

The idea does not become text. It becomes a **model** — a living, structured representation of the future
event that the system can price, coordinate, publish, and eventually run. Each step in the journey **enriches
the same model**; it does not create a new, unrelated document.

## The transformation

The idea is refined, stage by stage, into one continuous model:

```
Idea
  → Discovery              (understand what should happen)
    → Future Event Description   (the approved description)
      → Project Assembly    (turn the plan into an operational Project)
        → Resources         (what the event needs)
          → Budget          (what it costs)
            → Timeline       (when things happen)
              → Runtime      (the operating life of the Project)
                → Completed Project   (memory, outcomes, reuse)
```

Every stage adds to the **same future project model** — the Living Project. Discovery does not hand off a
document to Planning; it enriches the model. Planning does not produce a separate artifact for Assembly;
Assembly builds on the model Planning left. Budget, Timeline, and Runtime are not side documents — they are
deeper layers of the one model. Nothing in this chain produces an isolated file that the next stage has to
re-read and reinterpret.

## The AI keeps building

The AI does **not stop after generating text**. Generating a description, a plan, or a proposal is one moment
in a much longer job: the AI **continuously builds and refines the executable project model** — the model
that later **drives project execution**. Understanding, planning, decomposing, costing, sequencing, and
coordinating are all the same work on the same model, carried forward by the AI Organizer across the whole
life of the Project.

## Why it matters

If a feature ends at "here is some generated text" or "here is a checklist," it has stopped short of the
product. The test for any capability is: **does it enrich the executable model of the future event, and does
that model carry forward to drive real execution?** If not, it is a text generator or a checklist — which is
exactly what ActivLife Hub is not.
