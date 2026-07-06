# ADR — Safety View

> **Status: ACCEPTED (AUTHORITATIVE)** · **Date: 2026‑07‑05** · **Type: Architecture Decision Record.**
> This ADR defines the **Safety View** — the Project View used exclusively for safety, emergency response,
> inspections, and venue safety operations. It **extends** `ADR_011_PROJECT_VIEW_ARCHITECTURE.md` (one Project,
> role‑based Views) and `ADR_012_PROJECT_ACCESS_MODEL.md` (access is a per‑Project relationship via scoped
> links); it does not redesign them. It introduces no new entity, root, or Project model, and does **not**
> implement code or migrations — it is documentation only. Governed by `ALH_PRODUCT_PHILOSOPHY.md`; current
> architecture in `CURRENT_ARCHITECTURE.md`. Where this ADR and the axioms/specifications disagree, those
> documents win.

---

## Purpose

Define the Project View used exclusively for safety, emergency response, inspections, and venue safety operations.

Safety View extends ADR_011 (Project View Architecture) and ADR_012 (Project Access Model).

---

## Core Principle

Safety View exists to protect people, not to expose project information.

Only information required for safety planning, emergency response, inspections, or incident management may be visible.

Everything else remains hidden.

---

## Access

Safety View is accessed through a secure project-scoped Safety Link.

Registration is not required.

Authentication is intentionally minimized because emergency situations must not be delayed by account creation.

Safety Links are:

* project-scoped;
* revocable;
* optionally time-limited;
* auditable;
* least-privilege.

---

## Intended Users

Examples include:

* fire department;
* police;
* emergency medical services;
* venue security;
* safety coordinator;
* technical inspector;
* fire inspector;
* venue management;
* government inspectors performing official duties.

The platform does not attempt to verify organizational identity.

Instead, organizers are responsible for distributing Safety Links only to appropriate personnel.

---

## Legal Notice

Safety Links are intended exclusively for authorized public safety personnel and other individuals performing official duties related to the event.

Unauthorized use may violate applicable law, the organizer's rights, or the event's privacy requirements.

This notice is presented whenever a Safety Link is opened.

---

## Information Visible

Safety View may include:

### Event Information

* event title;
* short description;
* event type;
* event schedule.

---

### Location

* venue;
* address;
* GPS coordinates;
* venue map;
* entrances;
* exits;
* emergency assembly points.

---

### Scale

* expected attendance;
* worker count;
* estimated occupancy.

---

### Safety Profile

Examples:

* open flames;
* fireworks;
* pyrotechnics;
* generators;
* gas cylinders;
* temporary structures;
* water activities;
* animals;
* heavy equipment;
* elevated platforms;
* hazardous materials.

These are structured safety indicators rather than free-text descriptions whenever possible.

---

### Contacts

* Organizer contact;
* Lead Organizer;
* Safety Coordinator (if assigned).

---

### Documents

Optional attachments:

* evacuation plans;
* venue maps;
* permits;
* safety certificates;
* inspection documents.

---

## Information Never Visible

Safety View must never expose:

* budgets;
* financial information;
* internal organizer notes;
* Delivery;
* Team;
* Resource Network;
* worker assignments;
* participant lists;
* participant contact information;
* contracts;
* commercial information.

Additional information may only be released through lawful requests outside the Safety View.

---

## Design Principle

Safety View is a projection of the Project.

It is not an emergency management system.

It provides only the information necessary to help protect people during preparation, inspection, and emergency response.

Its guiding principle is:

**Maximum safety. Minimum information exposure.**
