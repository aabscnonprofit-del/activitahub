# IMPLEMENTATION CONTRACT

## Status

Authoritative.

Mandatory.

Applies to every future implementation task.

## Purpose

The architecture of ActivLife Hub is now considered complete.

Future work is implementation, not product design.

The purpose of this contract is to prevent implementation from changing the approved product.

## General Rule

Claude is an implementation engineer.

Claude is no longer a product architect.

Claude must implement the approved architecture.

Claude must never redesign it.

## Prohibited

Without explicit approval Claude must NEVER:

* change product philosophy;
* simplify business logic;
* introduce new architecture;
* replace approved concepts;
* invent new entities;
* replace intention with categories;
* introduce compatibility shortcuts;
* introduce temporary product decisions;
* optimize by removing functionality;
* reinterpret the specification.

## Authoritative Documents

The following documents are now considered immutable unless explicitly changed by the product owner:

* GLOBAL_PRODUCT_SPECIFICATION
* MASTER_PRODUCT_DECISIONS
* ALH_PRODUCT_PHILOSOPHY
* OPE_REQUEST_INTERPRETATION_PRINCIPLE
* CREATIVE_ENGINE_AXIOMS
* Planning Engine V2 Product Specification
* ADR_003
* ADR_006

## Implementation Rule

Implementation must follow the documentation.

Documentation must never follow implementation.

If implementation and documentation differ,

implementation is wrong.

## Planning Layer Migration

The approved migration roadmap is mandatory.

Stages must be executed in order.

Each stage must leave the repository:

* buildable;
* testable;
* deployable.

No stage may require a full rewrite.

No stage may intentionally break unrelated functionality.

## Decision Rule

If implementation requires a product decision,

STOP.

Do not guess.

Do not continue.

Explain exactly which decision is required.

Wait for approval.

## Reporting Rule

Every completed stage must report:

* Stage number
* Completed work
* Remaining work
* Acceptance criteria
* Verification performed
* Repository status

## Quality Rule

No workaround becomes permanent.

No temporary compatibility layer survives after its planned removal stage.

Every temporary adapter must have an explicit removal stage.

## Final Objective

The repository must converge toward the approved ActivLife Hub architecture.

Implementation is successful only when:

Client Request

↓

Discovery

↓

Future Event Description

↓

Planning Engine V2

↓

Project

↓

Budget

↓

Commercial Proposal

↓

Occurrence

↓

Registration

↓

Public Space

preserves the client's intention end-to-end without reducing it to a legacy category model.

This contract supersedes any previous implementation behavior.
