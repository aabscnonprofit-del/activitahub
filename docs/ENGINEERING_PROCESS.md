# Engineering Process — Mandatory Rules

> **Status: MANDATORY.** Binding process rules for any AI developer (or human) implementing a product
> feature in ActivLife Hub. These rules govern *how* implementation begins, not *what* is built. They sit
> under the Constitution (`ALH_PRODUCT_PHILOSOPHY.md`) and complement the Product Canon; they add no product
> direction.

## Rule 1 — Mandatory Product Context Review

Before starting implementation of **any** product feature, the developer **MUST** identify and read **every
authoritative product document related to that feature.**

**Implementation must never begin from existing code alone.**

The required reading order is:

1. **Product Philosophy / Constitution** (`ALH_PRODUCT_PHILOSOPHY.md`)
2. **Product Canon** (`ACTIVLIFE_HUB_PRODUCT_CANON.md`)
3. **Product Principles** (`PRODUCT_PRINCIPLES_INDEX.md` and the principles it lists)
4. **Feature Specifications** (the specs that govern the specific feature)
5. **Existing implementation** (the code)

**Code is the LAST source of truth, not the first.**

## Rule 2 — Implementation Report (required before writing any code)

Every implementation task **must begin** with an explicit report:

```
Product documents reviewed:
- ...
- ...
- ...

Architecture documents reviewed:
- ...
- ...

Existing implementation reviewed:
- ...
```

**Only after that report may implementation begin.**

## Rule 3 — Documentation wins

If **documentation and existing code disagree**: **documentation wins.**

The code is treated as a (possibly outdated) artifact of past decisions; it does not override the documented
architecture.

## Rule 4 — Incomplete documentation → stop

If the documentation needed to implement the feature is **incomplete**:

- **Stop implementation.**
- **Report the documentation gap.**
- **Do not invent architecture** to fill the gap.

## Rule 5 — Unsupported architectural assumption → stop

If the implementation would introduce **any architectural assumption not explicitly supported by
documentation**:

- **Stop.**
- **Report the assumption.**
- **Wait for a product decision.**

## Rule 6 — Knowledge Capture

If any discussion produces a **long-lived rule** — a product rule, an engineering rule, an architecture
rule, or an implementation rule — **implementation must pause** until that knowledge is **classified** and
**written into the appropriate permanent project document.**

**Conversation is never considered permanent storage.** Knowledge that exists only in a chat is treated as
lost. Nothing built on it may proceed until it is captured in the right document (Constitution, Product
Canon, Product Principle, feature spec, or this Engineering Process doc).

## Rule 7 — Engineering Decision

Every audit **must finish with exactly one** of the following decisions:

- **ACCEPT**
- **READY FOR IMPLEMENTATION**
- **BLOCKED**
- **REQUIRES PRODUCT DECISION**

No audit may end with "80% complete", "mostly ready", "almost there", or any similar hedged wording.

**Implementation may continue only if the decision explicitly allows it** (**ACCEPT** or **READY FOR
IMPLEMENTATION**). **BLOCKED** and **REQUIRES PRODUCT DECISION** halt implementation until resolved.

## Rule 8 — AI Product Acceptance Audit

Every **AI-facing module** must pass a **Product Acceptance Audit before merge.**

**Unit tests and typecheck are not enough.** For AI modules, acceptance means **realistic user scenarios
must be tested against product behavior** — not just that the code compiles and unit assertions pass.

The Product Acceptance Audit must report:

- **scenarios tested;**
- **failures found;**
- **whether the module behaves according to the Product Canon / Product Principles;**
- **final decision** (per Rule 7): **ACCEPT / READY FOR IMPLEMENTATION / BLOCKED / REQUIRES PRODUCT DECISION.**

**If the Product Acceptance Audit finds BLOCKER failures, the module cannot be merged.**

---

*These are mandatory Engineering Process rules. A task that skips the Mandatory Product Context Review,
proceeds past an unresolved documentation gap or an unsupported assumption, leaves a long-lived rule
uncaptured, ends an audit without one explicit decision, or merges an AI-facing module without a passing
Product Acceptance Audit, is out of process regardless of the quality of the resulting code.*
