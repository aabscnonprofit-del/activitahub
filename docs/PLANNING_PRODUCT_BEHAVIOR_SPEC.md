# Planning — Product Behavior Specification

> **Status: AUTHORITATIVE product behavior specification** (created per Engineering Process Rule 9). It
> describes **only the observable product behavior** of Planning — not implementation, database, algorithms,
> UI, or technical architecture. Every behavior follows directly from `PLANNING_AXIOMS.md` and the accepted
> architecture (`FUTURE_EVENT_DESCRIPTION_SPEC.md`, `AI_ARTIFACT_OWNERSHIP_PRINCIPLE.md`, and the accepted
> pipeline). It introduces no new concept. Where this document and those disagree, those documents win.
>
> Axiom references (e.g. *Axiom 3*) point to `PLANNING_AXIOMS.md`.

---

## 1. Purpose of Planning

Planning transforms an approved Future Event Description into a **plan**: a determination of **what must become reality, and when** it must become reality, so that the approved event is realized (*Axiom 3*). Planning **realizes** the approved description — it never invents, extends, or redesigns it (*Axiom 2*). Time is the organizing axis: everything Planning determines is positioned by *when* it must become true (*Axiom 4*).

## 2. Inputs

Planning has one **defining input** and, during iteration, **additional planning inputs**:

- **Defining input — the approved Future Event Description.** It is the sole source of *what* the event is, and Planning's only defining input (*Axioms 1–2*).
- **Additional planning inputs — the organizer's constraints and corrections.** Introduced during iteration, they may **shape** the plan but **never redefine** the approved Future Event Description (*Axioms 9, 2*).

Planning draws the event from nowhere but the approved description.

## 3. Preconditions

An **approved Future Event Description must exist**. Planning cannot exist without it (*Axiom 1*): it does not begin, does not run in parallel with Discovery, and produces nothing before the description has been explicitly approved.

## 4. Automatic first Planning generation

Once the precondition holds, Planning **builds the first version automatically** (*Axiom 8*), produced by its **dedicated Planning intelligence** (*Axiom 7*). The first Planning version:

- determines what must become reality and when (*Axiom 3*), organized along time (*Axiom 4*);
- includes **only planned realities that are reachable within the available time and means** — feasibility is where finite means first constrain the plan (*Axiom 5*);
- carries traditional planning concepts (tasks, resources, budget, vendors, logistics, communications) **only** as they are **derived** from the plan to realize a planned reality; they never define it (*Axiom 6*).

The organizer never creates the initial Planning. The initial Planning is always generated automatically.

## 5. Organizer review

The organizer **reviews** the current Planning version. Planning is not complete upon generation; authority to shape it and to conclude it rests with the organizer — the AI works, the human decides (*Axiom 10*). If the version is acceptable, the organizer **approves** it; otherwise the organizer **introduces constraints and corrections**, and Planning generates the next version.

## 6. Organizer constraints and corrections

The organizer may introduce **constraints and corrections** to the plan (*Axiom 9*). These adjust **what the plan contains and when**, within the bounds of the approved event. They do **not** redefine the event: Planning stays faithful to the approved Future Event Description (*Axiom 2*). A change that alters the **underlying intent** is not a Planning correction — it returns the workflow to the most recent approved stage (*Axiom 12*).

## 7. Automatic Planning recalculation

After **each** constraint or correction the organizer introduces, Planning **automatically recalculates**, producing the next Planning version (*Axiom 9*). Recalculation re‑determines what must become reality and when, keeps only planned realities reachable within the available time and means (*Axiom 5*), and remains faithful to the approved description (*Axiom 2*). Every recalculated Planning version is produced by the dedicated Planning intelligence (*Axiom 7*); no other producer supplies it. Iteration repeats as often as the organizer introduces changes.

## 8. Planning approval

Planning **completes only after explicit organizer approval** (*Axiom 10*). Until the organizer approves, the plan is **provisional**, however many recalculations it has undergone. The AI performs the work of producing and recalculating; the organizer alone decides that the plan is complete.

## 9. Transfer to Project Workspace

**Only an approved Planning result may enter the Project Workspace** (*Axiom 11*). On approval, the plan becomes the **result handed to the Project Workspace**, which receives it as the authoritative Planning result. Planning's responsibility ends at delivering an approved plan; what the Workspace then does is outside this specification. An unapproved or draft plan never crosses this boundary.

## 10. Failure conditions

If the **dedicated Planning intelligence cannot produce a result** — it is unavailable, errors, returns invalid output, or produces content outside its remit — **the current Planning generation fails**. The failure is reported plainly, the workflow does not advance, and **no plan is fabricated** in its place; an absent plan is preferable to a fabricated one (*Axiom 7*). Planning **never fabricates a feasible solution**: if the approved event **cannot be realized within the available time and means**, Planning **reports that fact** rather than inventing a plan (*Axioms 5, 7*). A failed generation never yields a substitute produced by a fallback, another role, or a shortcut.

## 11. Explicit non‑responsibilities of Planning

- Planning does **not** invent, extend, or redesign the approved Future Event Description (*Axiom 2*).
- Planning is **not** defined by tasks, resources, budget, vendors, logistics, or communications; these are derived outputs, never its starting point (*Axiom 6*).
- Planning does **not** execute the project, monitor it, compare intended against actual reality, or make runtime decisions — those belong to the Project Workspace and Execution, not to Planning.
- Planning does **not** conclude itself: it never self‑approves; completion requires explicit organizer approval (*Axiom 10*).
- Planning does **not** hand an unapproved plan to the Project Workspace (*Axiom 11*).
- Planning does **not** silently absorb a change of underlying intent; such a change returns the workflow to the most recent approved stage (*Axiom 12*).
- Planning is **never** produced by a fallback, another AI role, or an implementation shortcut (*Axiom 7*; AI Artifact Ownership Principle).
