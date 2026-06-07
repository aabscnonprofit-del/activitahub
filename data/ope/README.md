# OPE Data — Knowledge Modules

This folder holds the **structured OPE knowledge modules** — the production data that powers the
Organizer Planning Engine (OPE). It is **data, not documentation**.

## What lives here
- `modules/<category>/*.json` — structured module data (tasks, dependencies, milestones, cost drivers,
  risks, communication templates, etc.). Example: `modules/birthday/core.v1.json` (`MOD-BIRTHDAY-CORE`).
- Modules follow the composition model **Universal Core + Category Module + Venue Module + Risk Module
  + Optional Modules** (see the architecture docs).

## Where the rationale lives
- **`docs/`** contains the **architecture and rationale** — the *why* and the *shape*:
  - `docs/OPE_UNIVERSAL_ACTIVITY_ARCHITECTURE_V1.md` — the universal skeleton beneath all categories.
  - `docs/OPE_KB_BIRTHDAY_ARCHITECTURE_V1.md` — the Birthday category's module composition.
  - `docs/OPE_KB_BIRTHDAY_PARTY_V1.md` — the Birthday operational knowledge (human-readable source).
  - `docs/OPE_CORE_MVP_V1.md` — the minimal engine these modules feed.
- Keep `docs/` for architecture/explanation; keep this folder for **machine-consumable JSON modules**.

## Intended use
These JSON modules are **intended to be consumed by OPE Core** (when built): the engine selects and
composes the relevant modules per scenario, computes derived quantities and deterministic costs, and
produces an activity plan. They are not consumed by the app yet — this is the data layer being prepared
ahead of the engine.

## Conventions
- Versioned filenames: `*.v1.json` (bump the version for breaking changes; keep old versions for
  reproducibility).
- IDs are stable handles (e.g., `BC-T01` tasks, `BC-CD01` cost drivers) and map up to the universal
  model (`UM#` milestones, `UCD#` cost categories, `URK#` risks, `UCN#` communication needs).
- JSON only (no comments) — descriptive metadata goes in a `_meta` object.
