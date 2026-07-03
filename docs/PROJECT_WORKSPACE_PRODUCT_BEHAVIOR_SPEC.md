# Project Workspace — Product Behavior Specification

> **Status: AUTHORITATIVE product behavior specification** (created per Engineering Process Rule 9). It
> describes **only the observable product behavior** of Project Workspace — not implementation, database,
> algorithms, UI, technical design, or internal system architecture. Every behavior follows from
> `PROJECT_WORKSPACE_AXIOMS.md` and the accepted architecture (`PLANNING_AXIOMS.md`,
> `PLANNING_PRODUCT_BEHAVIOR_SPEC.md`, the Discovery and Future Event Description specifications, and
> `ADR_009_EXECUTION_IS_A_WORKSPACE_PHASE.md`). It introduces no new concept. Where this document and those
> disagree, those documents win.
>
> Axiom references (e.g. *Axiom 6*) point to `PROJECT_WORKSPACE_AXIOMS.md`.

---

## 1. Purpose of Project Workspace

Project Workspace is where the approved plan is carried into actual reality. Its purpose is to **realize the approved Planning result** — to make the planned event actually happen — while maintaining a **truthful account of what is actually true**, until the event is realized or the project is archived (*Axioms 4, 6*; `ADR_009`). It is the home of the living project.

## 2. Inputs

- **Defining input — the approved Planning result** (*Axioms 1–2*), consumed as the authoritative baseline.
- **Ongoing input — actual reality as it occurs**: what actually happens is taken into the truthful account (*Axiom 4*).
- **Organizer input — the organizer's decisions** during the project's life (*Axiom 10*).

## 3. Preconditions

A Project Workspace begins only after an approved Planning result exists (*Axiom 1*). Nothing in the Workspace occurs before Planning has been approved.

## 4. Creation and baseline adoption

On creation, the Workspace adopts the approved Planning result as its **authoritative baseline** — the reference against which actual reality is understood (*Axiom 2*). The baseline is fixed: the Workspace **never rewrites the approved Planning result** (*Axiom 3*). Any change to the plan comes only from Planning, never from within the Workspace.

## 5. The truthful account of actual reality

Throughout the project's life, the Workspace maintains a **truthful account of what is actually true** (*Axiom 4*). Where something is not yet known, the account shows it as **absent** rather than inventing it; the Workspace **never fabricates actual reality** (*Axiom 5*). The account reflects the project's actual reality as it stands at any given moment, understood against the approved baseline.

## 6. Realization of the approved plan

The Workspace **drives realization of the approved plan** — coordinating the project so that the planned realities actually come true (*Axiom 6*). Realization is carried out over time and **includes the Execution phase** (the actual doing), which happens within the Workspace, not as a separate downstream stage (*Axiom 7*; `ADR_009`).

## 7. Organizer review and authority

The organizer is kept informed of the truthful account of the project's actual reality and how it stands against the approved plan. The AI performs the work — maintaining the account and coordinating realization — but **consequential decisions rest with the organizer** (*Axiom 10*). The system surfaces; the organizer decides.

## 8. Divergence and re‑planning

When actual reality diverges from the approved plan such that the plan can no longer be realized as approved, the Workspace **surfaces the divergence** to the organizer. If a changed plan is required, re‑planning takes place **in Planning** — the Workspace requests it but **never performs Planning itself** (*Axiom 8*). Any resulting new plan is approved through Planning and then becomes the Workspace's new authoritative baseline (consistent with the re‑planning behavior in `PLANNING_PRODUCT_BEHAVIOR_SPEC.md`).

## 9. Change of intent

If the **underlying intent** changes — what the client fundamentally wants is different — that is not resolved inside the Workspace. It returns to the most recent appropriate approved upstream stage (Discovery, Statement of Understanding, Future Event Description, or Planning) for revision and re‑approval (*Axiom 9*). The Workspace **never changes the project's intent**.

## 10. Completion and archival

The Workspace continues through the project's life until the event is **realized (Completed)** or the project is **Archived** (`ADR_009`). At that terminal point the Workspace's active life ends; its truthful account remains the record of what actually happened.

## 11. Failure conditions

If the truthful account of actuality cannot be established or maintained, the Workspace **reports the missing actuality as absent** rather than inventing it; it never fabricates actual reality (*Axiom 5*). If realization is blocked — the plan cannot be realized — the Workspace **surfaces this** rather than presenting false progress, and, where a changed plan is needed, routes to re‑planning (*Axioms 6, 8*). No failure produces a fabricated account or a Workspace‑produced plan.

## 12. Explicit non‑responsibilities of Project Workspace

- Project Workspace does **not** perform Planning; it never produces or rewrites a plan (*Axioms 3, 8*).
- Project Workspace does **not** change the project's intent; intent changes return upstream (*Axiom 9*).
- Project Workspace does **not** fabricate actual reality (*Axiom 5*).
- Project Workspace does **not** decide consequential matters on the organizer's behalf; the organizer decides (*Axiom 10*).
