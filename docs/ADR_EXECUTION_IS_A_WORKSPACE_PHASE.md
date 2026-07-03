# ADR — Execution is a phase of Project Workspace, not an independent module

> **Status: ACCEPTED** · **Date: 2026‑07‑02** · **Type: Architecture Decision Record.**
> This document records an architectural decision and its reasoning. It introduces no behavior,
> implementation, UI, or algorithm, and modifies no other document. It concerns module boundaries only.

---

## 1. The original pipeline assumption

The accepted pipeline listed Execution as a distinct stage following Project Workspace:

```
Discovery
→ Statement of Understanding
→ Future Event Description
→ Planning
→ Project Workspace
→ Execution
```

This placement was inherited as a working assumption. It was never established from first principles that Execution is a separate architectural module — only that "runtime" work belonged to "the Project Workspace and Execution," leaving the boundary between the two undefined.

## 2. The investigation that questioned it

While preparing the Project Workspace architecture, the undefined Workspace↔Execution boundary was surfaced as a gating question: *Does Execution deserve to exist as an independent architectural module, or is it one phase of Project Workspace?* Rather than preserve the pipeline by default, the question was investigated from first principles, applying the same test used throughout the Planning work: a stage is a genuinely separate module only if it owns a responsibility — and, under the AI Artifact Ownership Principle, a distinct artifact and owner — that the neighbouring module can never own.

## 3. Reasoning from first principles

Two lenses decided the question.

**Controller vs actuator.** Any control system has a *controller* (observes actual reality, compares it to the intended result, decides, and steers) and an *actuator* (actually performs the change). Project Workspace is the controller: it holds the approved plan as baseline, represents actual reality, compares actual against planned, surfaces divergence, and supports runtime decisions. "Execution," if it is anything, is the actuator — the actual performing of the work.

**Where the actuator lives.** For an event, the actual doing — the work before the event and the live run‑of‑show on the day — is performed by **people and vendors in the real world**, not by software. The actuator is therefore *external to the entire system*. Every remaining execution‑time responsibility that *is* software (coordinating and dispatching approved actions, prompting the right people at the right time, recording what actually happened, tracking actual‑vs‑planned, supporting runtime decisions) is exactly the Workspace's runtime role. No software responsibility remains that is exclusively Execution's, and Execution has no distinct artifact or owner of its own — the record of what actually happened is the terminal value of the Workspace's actual‑reality artifact.

## 4. Decision

**Execution is not an independent architectural module. Execution is a lifecycle phase of Project Workspace.** The genuine boundary is not a Workspace→Execution seam between two software modules; it is the **system ↔ real‑world interface**, which Project Workspace already straddles.

## 5. Why

- **Project Workspace owns the approved Planning result** — it receives the approved plan as the authoritative baseline and never silently rewrites it.
- **Project Workspace owns actual reality** — the representation of what is actually true as it unfolds, distinct from the planned reality, lives here.
- **Project Workspace owns runtime coordination** — tracking, comparing actual against planned, surfacing divergence, and supporting the organizer's runtime decisions are all Workspace responsibilities.
- **Physical execution is performed by people and the real world, not by software** — the actuator that performs the work is external to the entire system, so it cannot be housed in any software module.
- **Therefore no independent software responsibility remains for a separate Execution module** — everything the *system* does during execution is Workspace work, and everything Execution *uniquely* is happens outside the software.

## 6. Resulting architectural model

```
Discovery
→ Statement of Understanding
→ Future Event Description
→ Planning
→ Project Workspace
    (includes Execution)
→ Completed / Archived
```

Execution is understood as the Workspace's terminal operating phase; the pipeline's former standalone Execution box is replaced by a Completed / Archived terminal state.

## 7. How this decision was reached

This decision was reached **through architectural investigation from first principles, not by preserving the original pipeline.** The prior placement of Execution as a separate stage was treated as an assumption to be tested, and the investigation concluded — on the controller/actuator distinction and the system/real‑world interface — that the assumption did not hold. The pipeline was changed to follow the reasoning, rather than the reasoning being bent to defend the pipeline.

### Caveat (recorded, not defended)

The decision rests on two current principles: that the actuator is the real world, and that "AI works, the human decides" forbids the system from autonomously performing consequential actions. If the product later deliberately defines Execution as something the Workspace provably will not do — for example, autonomous agentic action without a human in the loop, or a distinct post‑event/learning module with its own artifact and owner — that could re‑earn independent‑module status and warrant revisiting this ADR. Nothing established today requires it.
