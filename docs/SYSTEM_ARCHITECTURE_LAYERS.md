# System Architecture Layers

> **Status: LIVING.** This document describes the independent architectural layers of ActivLife Hub. It is
> **intentionally incomplete** and will remain so until the core product architecture is finished. Entries
> below are candidate layers; each will be filled in (and may be added, split, or removed) as the architecture
> settles. Where a layer is already defined by an authoritative document, that document remains the source of
> truth; this page only maps the layers, it does not redefine them.

---

## Purpose

Describe the **independent architectural layers** of ActivLife Hub — the distinct concerns from which the
system is composed — so that each layer can be reasoned about, owned, and evolved separately from the others.

---

## Candidate layers

1. **Product Architecture** — the pipeline and its stages (Discovery → Statement of Understanding → Future
   Event Description → Planning → Project Workspace → Completed / Archived) and their axioms. *(In progress.)*
2. **Artifact Ownership** — which artifact each stage produces and owns. *(Defined: `AI_ARTIFACT_OWNERSHIP_PRINCIPLE.md`.)*
3. **AI Ownership** — which AI role owns each stage. *(Related: `MULTI_AGENT_ARCHITECTURE_PRINCIPLE.md`, `AI_ARTIFACT_OWNERSHIP_PRINCIPLE.md`.)*
4. **Human Roles** — the roles of client and organizer, and where authority rests. *(To be defined.)*
5. **External World** — the real world that performs physical execution, external to the system. *(Related: `ADR_009_EXECUTION_IS_A_WORKSPACE_PHASE.md`.)*
6. **Infrastructure** *(if needed)* — the technical substrate. *(To be defined; may not be needed as a product‑architecture layer.)*

---

*This document intentionally remains incomplete until the core product architecture is finished.*
