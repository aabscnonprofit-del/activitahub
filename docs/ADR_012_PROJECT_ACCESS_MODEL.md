# ADR — Project Access Model

> **Status: ACCEPTED (AUTHORITATIVE)** · **Date: 2026‑07‑05** · **Type: Architecture Decision Record.**
> This ADR defines how a person is **granted access to a specific Project View**: access is a **per‑Project
> relationship**, never a permanent global user type. It builds directly on
> `ADR_011_PROJECT_VIEW_ARCHITECTURE.md` (one Project, many role‑based Views) and on
> `ADR_003_ENTITY_OWNERSHIP.md`. It introduces no new entity, root, or Project model, and does **not** implement
> or redesign access control — it is documentation only. Governed by `ALH_PRODUCT_PHILOSOPHY.md`; current
> architecture in `CURRENT_ARCHITECTURE.md`. Where this ADR and the axioms/specifications disagree, those
> documents win.

---

## Purpose

Define how a person receives access to a specific Project View in ActivLife Hub.

ADR_011 defines that there is one Project and multiple role-based Views.

This decision defines how access to those Views is granted.

---

## Core Principle

Access is granted per Project.

A person does not receive access because of a permanent global user type.

A person receives access because they have a specific relationship to a specific Project.

---

## Access Types

### Public Access

No authentication required.

Grants access to the Public View.

Used for browsing the Activity Marketplace and public activity pages.

---

### Participant Access

Granted after registration, ticket purchase, reservation, invitation, or organizer approval.

Grants access to the Participant View.

---

### Organizer Access

Granted to the project owner, assigned Lead Organizer, or authorized organizer collaborators.

Grants access to the Organizer View.

---

### Client Access

Granted when the organizer attaches a Client to the Project.

Client may be attached by:

* secure invitation link;
* email;
* phone number;
* existing account.

Registration is optional until the Client chooses to claim an account.

Grants access to the Client View.

---

### Worker Access

Granted when a person or provider is assigned to perform work on the Project.

Examples:

* waiter;
* photographer;
* driver;
* performer;
* coordinator;
* vendor;
* equipment provider.

Grants access to the Worker View.

Authentication may be required or optional depending on the worker type and risk level.

---

### Emergency / Safety Access

Granted through secure scoped links.

No registration required.

Used by:

* fire department;
* police;
* emergency medical services;
* venue security;
* technical inspectors;
* safety inspectors.

Grants access to the Emergency / Safety View only.

Emergency and safety personnel must never be forced to register before accessing critical project information.

---

## Access Link Rules

Access links must be:

* scoped to one Project;
* scoped to one View;
* revocable;
* optionally time-limited;
* non-authoritative for ownership;
* unable to expose organizer-only or financial data unless explicitly permitted by the View.

---

## Architectural Consequences

Views do not own data.

Access grants do not create new Project models.

Access determines which Project View may be rendered.

The same person may have different access relationships across different Projects.

Emergency access is intentionally lower-friction than account-based access, but narrower in scope.

---

## Design Principle

**Access belongs to a Project relationship, not to a global user type.**
