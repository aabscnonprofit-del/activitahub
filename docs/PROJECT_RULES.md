# ActivLife Hub — Project Rules

**Status:** Approved
**Applies until:** First Public Launch

These are the working rules for the ActivLife Hub project. They govern architectural decisions, implementation, audits, and collaboration until the first public launch.

---

## 1. Product Canon is the Source of Truth

The approved **ActivLife Hub Product Canon v1.0** (`docs/ACTIVLIFE_HUB_PRODUCT_CANON.md`) is the single architectural source of truth.

If implementation, documentation, repository architecture, or production behavior contradict the Product Canon, the implementation is corrected — unless the Product Canon is explicitly revised.

---

## 2. Scope is Frozen

Until the first public launch:

- no new business entities;
- no new architectural subsystems;
- no new workflows;
- no scope expansion.

New architecture is introduced only after launch or by explicit architectural approval.

---

## 3. No Redesign

No redesign unless explicitly approved.

- Do not propose replacing existing architecture with a different architecture.
- Do not restart design from scratch.
- Do not introduce alternative architectural models unless explicitly requested.

The objective is to complete the existing product, not redesign it.

---

## 4. AI Output Must Be Verified

AI-generated conclusions are hypotheses until verified.

Every architectural or implementation claim must be supported by one or more of:

- the Product Canon;
- repository evidence;
- production evidence.

Unsupported conclusions must not be treated as facts.

---

## 5. Work Sequence

The project proceeds in the following order:

**Verify → Compare → Correct → Continue.**

1. **Verify** — establish the facts from Canon, repository, or production.
2. **Compare** — compare the current state against the Product Canon.
3. **Correct** — correct the implementation where it diverges.
4. **Continue** — proceed to the next launch task.

Not: Redesign → Expand → Rewrite.

---

## 6. Launch First

The primary objective is the successful public launch of ActivLife Hub.

Every proposed task must answer one question:

**Does this move the product closer to launch?**

If not, it is not a launch priority.

---

## 7. Finish Before Improve

Complete existing functionality before improving it.

Until launch:

- finish before optimizing;
- finish before expanding;
- finish before polishing.

Improvement follows completion.
