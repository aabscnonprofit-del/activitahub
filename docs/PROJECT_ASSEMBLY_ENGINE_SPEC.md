# Project Assembly Engine — Product Specification

> **Status: Product specification (product-level, not implementation).** Governed by, and consistent with,
> `ACTIVLIFE_HUB_PRODUCT_CANON.md` (§11 Planning, §12 Project Assembly, §4 Project, §13 Workspace, §14–§18,
> §20). It describes **what** the Project Assembly Engine is supposed to do — not how it is built. It
> introduces no new product direction. It contains no database, API, or code detail.
>
> **Guiding sentence (every section below supports this):** *The organizer should feel that the Project is
> already alive immediately after it is created.*

---

## Purpose

The Project Assembly Engine transforms an **approved EventPlanV2** into a **living Project**.

The organizer is not buying a plan. The organizer is buying help **making the activity happen** (Canon §3,
§12). So the plan is never the finished product. The moment the plan is approved, the plan becomes the
**beginning of the Project** — the permanent place where the activity now lives (Canon §4).

The Assembly Engine exists **only** to turn a plan into an operational Project. The Project remains the
center of the system; assembly is the step that makes that center come alive.

---

## 1. Why Project Assembly exists

A plan describes the event. A Project **runs** it. Between "here is a good plan" and "the event actually
happened" sits all the real work — preparation, sourcing, coordination, communication, decisions,
execution, memory. Assembly exists so the organizer never has to carry that work themselves from a blank
page: the plan is turned, in one step, into a Project that already contains the shape of everything that
must happen (Canon §12). Without assembly, the organizer would be handed a document and left to build the
Project by hand — exactly the operational load the platform exists to remove (Canon §1, §8-decision-rule).

## 2. Why EventPlanV2 is not enough

EventPlanV2 is a complete, approved description of the intended experience — its concept, itinerary,
logistics, resources, roles, safety and contingencies, and an honest cost estimate (Canon §11). But it is
still a **description**. It has no state, no responsibility, no timeline you can act on, no place for
vendors, participants, money, communication, or history to accumulate. It cannot be lived in. The organizer
was promised a real activity, not a description of one — so the plan must become a Project that can hold the
activity's entire life (Canon §4, §12).

## 3. What a Project becomes immediately after assembly

Immediately after assembly, the Project is **already alive** — not a stub waiting to be filled. It already
holds: the approved experience and concept; a timeline of what happens and when; the tasks that make each
part real; the resources and roles the event needs; a starting budget built from those needs; a draft
public page; and a Workspace that already knows what needs the organizer's attention next. Vendors,
participants, prices, and the final date are not yet chosen — but their **places already exist**, so filling
them feels like continuing a living thing, not starting from zero.

## 4. Which parts of EventPlanV2 become which parts of the Project

| Project facet | Comes from EventPlanV2 |
|---|---|
| **Project (identity & the event)** | The original intention, the approved experience design and concept, and the feasibility statement — these become what the Project *is*, the event the organizer sees. |
| **Timeline** | The itinerary (the sequence of moments) and its phases (preparation → the day → after) become the Project's timeline of what happens and when. |
| **Tasks** | The logistics — the things that must physically happen for each moment to be real — become the Project's tasks / work to be done. |
| **Resources** | The resource needs become the resources the Project must obtain. |
| **Roles** | The staffing / role needs become the roles the Project must fill. |
| **Budget** | The resources and roles, priced by the honest cost estimate, become the Project's starting budget — an estimate, never a final price. |
| **Vendors** | The resource and role needs define **what supply to source**; the vendors themselves are places the Project holds open until sourcing fills them. |
| **Participants** | The intended audience and scale define who the event is for and its expected size; actual participants are places held open until people are invited and register. |
| **Workspace** | The organizer's live view is assembled from all of the above — surfacing what needs a decision, what is next, what is missing (Canon §13). |
| **Public Space** | The public-safe description becomes a draft public activity page, ready to publish when the organizer decides (Canon §17). |
| **Notifications** | The reminders implied by the timeline, and the contingencies, become the reminders and alerts the Project will raise as its state changes (Canon §20-state model). |
| **History** | The original intention and the act of assembly itself become the Project's first history — the beginning of the story it will accumulate (Canon §4, §20). |

## 5. Which information is copied

Copied means **preserved faithfully, never re-invented** — because it is the client's approved intent and
the Assembly Engine has no authority to change it (Canon §11 "planning does not invent a different
activity"; §9 "no fabrication"):

- the client's original intention / request, in their own words;
- the approved experience, concept, and itinerary as designed;
- the safety and contingency considerations;
- the explicitly-marked assumptions;
- the honest cost estimate range and its basis.

## 6. Which information is transformed

Transformed means **carried into an operational form** the Project can act on, without changing its meaning:

- logistics → **tasks** to be done;
- resource needs → **resources to obtain**;
- role needs → **roles to fill** and supply to source;
- itinerary → a **timeline** with preparation / day-of / after phases;
- the cost estimate + needs → the **starting budget** (still an estimate, presented as scope to price, not a
  sale price).

## 7. Which information is derived automatically

Derived means **computed by the platform, never stored as truth, always recomputable** (consistent with the
Canon's rule that totals and projections are derived — §15, §24):

- the ordering and phasing of the timeline;
- the Workspace's attention view — what needs a decision, what is next, what is missing;
- the draft Public Space projection (a public-safe view of the Project);
- the initial reminders and operational checkpoints implied by the timeline;
- the budget totals (derived from the lines, never authoritative on their own).

## 8. Which information is intentionally left empty until humans or later AI fill it

Left empty on purpose — the **place exists, the value does not yet** — because these require sourcing, human
judgment, or events that have not happened (Canon §11 assumptions; §15 Commitment Gate; §20 after the
activity):

- the specific **vendors** (found later through sourcing);
- the specific **participants** (invited and registered later);
- final **prices, quotes, and selected vendors** (organizer and vendors decide);
- the **date / occurrence**, if the organizer has not set it;
- any **commitment** — spending money, signing, publishing (human-authorized only);
- **photos, videos, feedback, and outcomes** (they belong to the activity's after-life).

Empty places are a feature: they show the organizer exactly what is left to decide, so the Project guides
attention instead of demanding a blank form.

## 9. What the organizer should see immediately after assembly

The organizer sees **their event, already prepared** — never internal vocabulary (Invisible Architecture,
Canon §4). Not a document, not a blank workspace, but a place that is clearly alive: the experience
described back to them, a timeline of what will happen, a list of what needs doing, the resources and roles
the event needs, a starting budget, a draft page they could show the world, and a Workspace that already
answers *"what needs your attention next?"* (Canon §13). Their first feeling should be recognition and
relief — *"this is already moving"* — not the anxiety of starting from nothing.

## 10. What AI should continue doing after assembly

Assembly is not the end of AI's work; it is the point where the operational AI takes over (Canon §21). After
assembly, specialized AI keeps preparing: sourcing candidate vendors and resources against the Project's
needs; refining the budget as prices become known; preparing invitations, reminders, and updates;
continuously watching the Project's state and surfacing what needs attention or looks risky. AI keeps the
Project moving between the organizer's visits — so it feels alive even when no human is touching it. **AI
works; the human decides** (Canon §21).

## 11. What humans still decide

Everything that carries judgment, taste, relationships, money, or irreversibility stays with the human
(Canon §7-role, §15 Commitment Gate). The organizer decides: which vendor, at what price; when the date is
and when to publish; what to approve or adjust; and any commitment that spends money, creates an obligation,
or cannot be undone. AI may propose and prepare all of these, but **AI never authorizes a commitment**; a
proposal becomes a commitment only when the responsible human accepts it (Canon §9, §15). The client's own
acceptance remains the gate that turns a proposal into a commitment.

## 12. What happens when EventPlanV2 changes

Re-planning is a **change inside the same Project**, never a new Project and never a reset (Canon §4 — the
place persists; only its season changes). When the plan changes, the Project **reconciles**: new elements
appear as new tasks, resources, roles, and budget lines; removed elements fall away; but the human work
already done — selected vendors, entered prices, notes, invited participants, and the accumulated history —
is **preserved wherever it still applies**. Issued artifacts that were already sent stay immutable (Canon
§15). The Project accumulates and adjusts; it does not throw itself away. The organizer should feel the same
living Project responding to a change — not a fresh, empty start.

## 13. What never changes after assembly

Some things are permanent from the moment the Project is created:

- the Project's **identity and its one stable address** — it is the same place for its whole life (Canon §4);
- its **history** — append-only; nothing important disappears (Canon §4, §20);
- **issued / immutable artifacts** — once a proposal is sent or an invoice or payment issued, that record
  stands (Canon §15);
- the **client's original intention** — preserved for the life of the Project so the event never drifts from
  what was actually asked for (Canon §11).

Only the Project's state — its season — changes. Its existence does not.

---

## Verification — every section supports the guiding sentence

*The organizer should feel that the Project is already alive immediately after it is created.*

- **§1–§2** establish that a plan alone cannot feel alive, which is why assembly exists.
- **§3, §4, §9** describe a Project that arrives full — timeline, tasks, needs, budget, a page, and a
  Workspace that already knows what's next — so the organizer meets a living place, not a blank one.
- **§5–§8** ensure what is present is trustworthy (copied intent), actionable (transformed), effortless
  (derived), and honest about what's left (intentionally empty places that guide attention).
- **§10** keeps the Project moving between visits, so it stays alive without the human.
- **§11** keeps the human in the seat of judgment, so "alive" never means "out of control."
- **§12–§13** guarantee the Project keeps living through change and never loses its identity, history, or the
  client's intention — so it feels permanent, not disposable.

The Project is the center of the system. The Assembly Engine exists only to transform an approved plan into
an operational Project — the moment the activity stops being a description and starts being alive.
