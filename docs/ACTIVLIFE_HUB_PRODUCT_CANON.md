# ACTIVLIFE HUB PRODUCT CANON

Version 1.0

Status: APPROVED

Status: FROZEN

Architecture Authority

---

# Table of Contents

## PART I — FOUNDATION

1. **Why ActivLife Hub Exists** — the problem of missing organization and the mission to create more organizers and make existing ones far more capable.
2. **What ActivLife Hub Is** — the definition as an AI operating system for creating, finding, running, and remembering real-world activities.
3. **Who ActivLife Hub Serves and What They Buy** — the organizers, participants, clients, vendors, and workers it serves and the capability each is actually paying for.
4. **The Two Journeys** — the organizer's journey to create an activity and the participant's journey to find and join one, both first-class.
5. **Terminology and Internal Vocabulary** — the words the system uses internally and the rule that this vocabulary stays internal and never surfaces to the user.
6. **The ActivLife Hub Transformation** — the complete chain (Human Intent → AI Discovery → Statement of Understanding → Future Event Description → Planning → Project → Occurrence → Registration → Participation → Execution → Completion → Memories → Archive → Organizer Business) established as the reference model for the entire Canon.
7. **System Map** — a one-page architectural map of the whole platform showing how Artificial Intelligence, Project, Occurrence, Registration, Participant, the Organizer Platform, Platform Services, and the complete Project lifecycle relate, serving as the navigation map for the entire Product Canon.

## PART II — ARTIFICIAL INTELLIGENCE

8. **AI Philosophy** — the governing principle that AI does the operational work while the human holds all authority.
9. **Human Intent** — how a person arrives, whether with a finished plan, a vague desire, or an emotional result.
10. **Intent Understanding** — the AI reasoning process that interprets human intent, distinct from the input (Human Intent) and from the approved result (Statement of Understanding).
11. **The AI Organizer** — the single intelligence that understands the person and coordinates every specialized agent, before any deterministic system acts.
12. **Intent Discovery** — the adaptive, form-free process by which the system clarifies what the user wants to make real.
13. **Statement of Understanding** — the AI's approved verdict of what should happen, produced and confirmed before a Project can begin.
14. **AI Architecture and Specialized Agents** — the role-specialized agents the AI Organizer directs across the whole lifecycle, presented as one coordinated intelligence.
15. **AI Safety and Boundaries** — the hard limits on AI authority and the human-decision gates for anything that spends money or cannot be undone.

## PART III — PROJECT CREATION

16. **Future Event Description (FED)** — the user-approved description of the activity that should exist, bridging understanding and planning.
17. **Project Planning** — the reasoning that turns an approved FED and its creative concept into a structured operational model.
18. **Project Assembly** — the transformation that materializes the plan into an operational Project where every meaningful element becomes real.

## PART IV — PROJECT DOMAIN MODEL

19. **Project** — the central durable object: the digital life of one real-world activity, before, during, and after.
20. **Occurrence** — the dated instance people actually attend, owning date, place, capacity, and price.
21. **Registration** — the occurrence-bound admission record that makes a person a participant of one instance.
22. **Participant** — the role a person holds in relation to a Project and its Occurrences, distinct from account, ticket, and payment.
23. **Organizer** — the owner and operator of a Project and the party accountable for its commitments.
24. **Customer** — the client for whom a Project is delivered and the approvals they hold.
25. **Worker** — the people assigned to carry out parts of the activity and the scoped view they receive.
26. **Ticket** — the free / paid / donation participation model, as configuration rather than a person or an admission.
27. **Payment** — the financial record held on the Project and its external processing by Stripe.

## PART V — PROJECT OPERATION

28. **Project Workspace** — the organizer's live command center for one Project, surfacing what changed and what needs a decision.
29. **Resources** — the venues, staff, equipment, and supplies an activity depends on, carried on the Project and its plan.
30. **Vendor / Resource Marketplace** — sourcing those resources inside the Project, matched to real Project needs.
31. **Publication and the Public Space** — the public-facing projection of a Project and the organizer's control over when it becomes public.
32. **Activities Marketplace** — where people discover real activities to join, organized around human scenarios rather than abstract categories.
33. **Participant Experience** — what a participant sees, joins, and receives before, during, and after the activity.
34. **Client Experience** — how a client follows scope, proposals, approvals, payment status, and the final result.
35. **Vendor and Worker Experience** — what assigned vendors and workers see, confirm, and are responsible for.
36. **Execution** — running the live activity with AI support while the human remains responsible for judgment and commitments.
37. **Notifications** — the reminders and updates raised about a Project and its Occurrences and delivered to each role.
38. **Reviews** — the Project-owned written feedback left by approved participants of a completed public activity.
39. **Memories** — the photos and records preserved on the Project after the activity ends.
40. **Archive** — the durable record of the completed Project and the reusable model for repeating or improving the activity.

## PART VI — ORGANIZER PLATFORM

41. **The Organizer Business** — the second root entity that holds an organizer's assets across all of their Projects.
42. **The Project Portfolio** — the organizer's collection of Projects held and viewed across events.
43. **Templates and Reusable Models** — turning completed Projects into starting points for future activities.
44. **Academy and Organizer Development** — how the platform creates new organizers and grows existing ones.
45. **Certification and Trust** — the credentials that gate organizer access and the safety and trust standards they enforce.
46. **Billing and Monetization** — the organizer subscription, planning licenses, and the ways the platform earns without taxing organizer relationships.

## PART VII — PLATFORM SERVICES

47. **Localization** — the platform's supported languages maintained at parity on the surfaces that matter.
48. **Search and Local Activities** — how activities are found across the platform, by place and by human scenario.
49. **Communication Services** — the shared messaging layer through which people and AI exchange information around a Project.
50. **Administration** — platform-level oversight, support, and integrity operations.
51. **Shared Platform Services** — the cross-cutting services (identity, data, and infrastructure) every Project and organizer relies on.

## PART VIII — ARCHITECTURAL PRINCIPLES

52. **Business Principles** — earning in a way that supports the mission and keeps value with the organizer.
53. **Competition First** — studying proven products before inventing an alternative.
54. **Value First** — nothing enters the product unless it clearly makes the product better.
55. **The Product Rule for Every Decision** — the checklist every feature, document, or change must pass.
56. **Anti-goals: What ActivLife Hub Must Not Become** — the explicit anti-goals that keep the product on mission.
57. **Final Product Definition** — the single closing statement of what ActivLife Hub is and how success is measured.

## PART IX — FUTURE ARCHITECTURE

58. **The Organizer Business Root Entity** — making the second root entity a real, owned object rather than an implicit owner profile.
59. **Project Identity** — resolving where an activity's name and identity live as a first-class field.
60. **Attendance and Check-in** — the not-yet-built checked-in, attended, and no-show states.
61. **Occurrence-Scoped Registration and Cancellation** — completing the occurrence-bound model, including occurrence-scoped uniqueness and cancellation.
62. **System Evolution Rules** — architectural decisions already accepted but intentionally deferred until a future stage of the product.

---

# PART I — FOUNDATION

# 1. Why ActivLife Hub Exists

## The problem

A real-world activity does not occur on its own. Each one depends on a coordinating function that resolves date, place, cost, resources, roles, risk, communication, and execution into a single committed whole, and then carries that whole through to completion. That function is organization, and it is performed by an organizer.

The organizer is both the point of coordination and the point of failure. The number of real-world activities that happen is not limited by latent demand, by available venues, or by people willing to attend. It is limited by organizing capacity: how much organizing one person can carry, and how many people are capable of carrying it at all. When the coordinating function is absent or overloaded, the activity does not happen, independent of how much demand exists for it.

The objective problem ActivLife Hub addresses is this constraint. The scarce resource in the creation of real-world activities is organizing capacity, and the load of organization concentrates on a single accountable operator.

## Why existing solutions do not solve it

Existing categories of software each address a fragment of the organizing function and return the remainder to the organizer.

- Communication tools move messages between people. They do not hold the state of an activity, and they do not convert discussion into commitments.
- Social networks optimize attention and distribution. They surface interest but do not coordinate or execute the activity that interest points to.
- Ticketing systems handle admission and payment for an activity that has already been fully organized. They begin where organization has already ended.
- Planning and project-management software stores tasks and documents. It records intent but does not carry the operational reality of a live real-world activity, and it does not reduce the organizer's decision load.

Each of these is a point tool. Each assumes the organizing work has already been done, or handles one slice of it and hands the integration back to the operator. The organizer therefore remains the integration layer between disconnected systems. This is the shared failure mode: the tools exist, but the coordinating function they are supposed to support is left unowned.

## Why the missing capability is organization

Organization is a distinct capability, not a synonym for any of the categories above. It is the end-to-end function of converting an intention into a coordinated, executable, accountable activity, and operating that activity to completion. It spans understanding the intent, defining scope, sourcing resources, assigning roles, pricing, publishing, admitting participants, executing on the day, and preserving the result.

Communication, social distribution, ticketing, and planning are sub-functions inside organization. They are components of the capability, not replacements for it. The unmet need is not another instance of one of these components; it is a system that owns the whole function coherently, so that the components operate against one shared state rather than being reassembled by a person.

## Organizer leverage over participant leverage

Participants and organizers are not symmetric inputs. Participants are gated by the existence of activities to join; activities are gated by organizers. Adding participants to a system whose organizing capacity is fixed does not increase the number of activities that occur — it only increases unmet demand. Increasing organizing capacity increases the supply of activities directly, and that supply is what serves participants.

The organizer is therefore the multiplier in the system. One capable organizer enables many participants and many activities over time. Leverage sits on the coordination and supply side, not on participant volume. A system built to increase the number of real-world activities must optimize the capability and load of organizers, not the count of attendees. This is a statement about where the constraint is, and it determines what the architecture should be built around.

## Infrastructure rather than a marketplace

A marketplace matches existing supply to existing demand. It presumes that the organized activity already exists as inventory to be listed and joined. That presumption is exactly what fails here: the binding constraint is upstream of matching. The activity must be organized before it can be listed, priced, or attended.

A marketplace layer on its own leaves the organizing function unsolved and surfaces only the activities that happen to already exist. ActivLife Hub is therefore positioned as infrastructure for organizing real-world activities — the system in which organizing occurs and in which the operational state of each activity lives. Any marketplace function is a downstream projection of activities the infrastructure has already made real. Infrastructure owns the operational state; a marketplace only advertises it. The system is built at the layer where the constraint is, not at the layer above it.

## Engineering consequences

The mission fixes the constraint, and the constraint fixes the architecture. Four consequences follow directly.

**Organizer-first architecture.** The system is organized around the organizer as the primary operator and the point of accountability. The organizer's load is the quantity to be minimized, and every subsystem is evaluated by whether it reduces that coordination and decision load. Other roles — participant, client, vendor, worker — are served through the same structures under permission, not through separate systems.

**Project as the central business object.** An activity is a single coordinated whole that spans before, during, and after. The system therefore requires one durable object that holds that whole, so the operational state of one activity lives in one place. The Project is that object. Every persistent operational fact belongs to exactly one Project. Its subsystems are projections of it rather than independent stores, which keeps the activity coherent and prevents the organizer from becoming the integration layer between fragments.

**AI as an operational layer.** Reducing organizing load requires that work be performed, not merely stored. AI is positioned as an operational layer that carries out and coordinates organizing work under human authority, operating on the Project's state. AI performs operational work on behalf of the organizer while authority remains with the human organizer.

**Platform Services as shared infrastructure.** Capabilities that are not specific to a single activity — identity, communication, search, localization, administration — are shared services beneath all Projects and organizers, not features rebuilt inside each activity. This keeps the Project focused on the operational reality of one activity and keeps cross-cutting concerns consistent across the platform.

## Conclusion

The reason ActivLife Hub exists is a structural one: the limiting factor on real-world activities is organizing capacity, and that capacity concentrates on the organizer. This locates the system as infrastructure for organizing, built around the organizer, centered on the Project, operated by an AI layer, and supported by shared Platform Services. These consequences define the shape of the system. The next chapter specifies what that system is.

# 2. What ActivLife Hub Is

ActivLife Hub is an operating system for organizing real-world activities. In this document, *operating system* has a precise meaning: a system that holds the operational state of activities and coordinates the work performed against that state. It is not a tool that produces isolated artifacts and returns them to a person. The distinction from point tools, and the reason it matters, is established in Chapter 1 and is not repeated here.

The system is structured as four architectural layers. Each is defined once, here.

**The AI operational layer.** The layer that performs and coordinates organizing work under human authority. It acts on the operational state rather than producing advice or content beside it. Its role, agents, and boundaries are specified in Part II.

**The Project domain.** The durable domain model of a single activity. The Project is the central business object of this layer, and the governing rule from Chapter 1 applies: every persistent operational fact belongs to exactly one Project. The domain holds the objects an activity is composed of. It is specified in Part IV.

**The Organizer Platform.** The layer that spans multiple Projects and holds what belongs to an organizer across all of their activities rather than to any single one. It is specified in Part VI.

**Platform Services.** The shared, activity-agnostic infrastructure beneath all Projects and all organizers. It is specified in Part VII.

These are architectural layers, not deployment layers, software modules, or implementation boundaries.

The layers stand in a fixed relationship. The AI operational layer operates on the Project domain. The Project domain is bounded by one activity. The Organizer Platform holds only what is cross-Project and never re-owns what belongs to a single Project. Platform Services are shared and hold nothing specific to one activity. The complete composition of these layers into one model is presented in Chapter 7.

The system has an external boundary. Functions that the platform does not perform itself — the processing and movement of money chief among them — are delegated to external systems. Within its boundary the platform records operational and financial fact; the processing of that fact, where it lies outside the boundary, is performed elsewhere. Where this boundary sits for a given concern is stated in the chapter that specifies it.

The central process that runs through all four layers is the transformation of an intention into a completed, preserved activity. That process is named here and specified as the reference model in Chapter 6.

# 3. Who ActivLife Hub Serves and What They Buy

The system serves five roles. Each is defined here as an actor, together with the value that actor obtains. The value follows from the leverage argument in Chapter 1 and is not re-derived.

**Organizer.** The primary operator of an activity and its point of accountability. What the organizer obtains is organizing capacity: the ability to run more activities, and larger ones, at a lower coordination and decision load than would otherwise be possible. The organizer is the primary customer of the system because organizing capacity is the constrained resource.

The platform sells capability, not labor. What the organizer buys is the capacity to organize, not organizing performed for them as a service.

**Participant.** A person who takes part in an activity. What the participant obtains is access to real activities and a reliable way to find, join, and stay informed about them.

**Customer.** The party for whom an activity is organized, distinct from the organizer who runs it. What the customer obtains is a defined, agreed, and accountable delivery of a desired result, with a record of what was agreed.

**Vendor.** A supplier of resources or services that an activity requires. What the vendor obtains is access to specified, real demand rather than undefined leads.

**Worker.** A person assigned to carry out part of an activity. What the worker obtains is scoped, coordinated assignments with the timing, place, and instructions their part requires.

All five roles are served by the same system. They are not given separate products. A single structure is presented to each role through a permissioned view of it: **permissions create views, not separate systems.** This principle governs how every subsystem in this document exposes itself to different roles, and is referenced rather than restated thereafter.

The business model has an architectural boundary. The platform earns from the capability it adds — the licensing of that capability, subscription to it, certification, and marketplace services. It does not earn by taxing the relationships or the money that flow between an organizer and their own customers and participants. Money that belongs to those relationships remains with them; the platform monetizes the organizing capability it provides. This is stated here as a boundary; its mechanics are specified in Part VI.

# 4. The Two Journeys

The system has two primary journeys into it. Both are first-class, and both operate on the same domain.

**The Organizer Journey.** Entered by an organizer, or by a customer who needs something organized. It begins with an intention and proceeds through the transformation defined in Chapter 6 to a running and then completed activity. This journey produces activities.

**The Participant Journey.** Entered by a person looking for an activity to join. It begins with discovery, proceeds through registration and participation, and ends in that person's record of what they attended. This journey consumes activities.

The two journeys are connected by the supply relationship established in Chapter 1: the activities produced by the Organizer Journey are the inventory discovered in the Participant Journey. The meeting point between them is the public, discoverable projection of activities that have been organized; its role is specified in Part V. Because a marketplace only surfaces activities that already exist, the Participant Journey is downstream of the Organizer Journey, not symmetric with it.

The architectural consequence is that these are two journeys through one system, not two systems. Both resolve to the same Project through the permissioned views defined in Chapter 3. The Organizer Journey operates the Project; the Participant Journey views and joins its public projection. Neither is a separate store of activity state.

# 5. Terminology and Internal Vocabulary

The system uses a precise internal vocabulary. The terms below are the canonical names used throughout this document. This chapter is the authoritative definition of each term's *meaning*; where an object also has rules, relationships, and behavior, those are *specified* in the chapter noted in parentheses. Naming a term here and specifying its behavior later are distinct acts and are not duplication.

Internal vocabulary stays internal. These words are the names the system uses inside itself; they are not required to appear in any user-facing surface. If an internal term surfaces to a user, that is a defect in the interface, not an error by the user. The user reasons in terms of their idea, their activity, and its date.

- **Project** — the durable object that holds the operational state of one activity; the central business object. (Part IV.)
- **Occurrence** — a single dated instance of a Project's activity. (Part IV.)
- **Registration** — the record that admits one participant to one Occurrence. (Part IV.)
- **Participant** — the role a person holds in relation to a Project and its Occurrences. (Actor: Chapter 3. Object: Part IV.)
- **Organizer**, **Customer**, **Worker**, **Vendor** — the roles defined as actors in Chapter 3. (Objects, where applicable: Part IV.)
- **Ticket** — the participation model of an activity, free, paid, or by donation, as configuration rather than a person or an admission. (Part IV.)
- **Payment** — the financial record of an activity, whose processing lies outside the system boundary. (Part IV; Part VI.)
- **Public Space** — the public-facing projection of a Project. (Part V.)
- **Workspace** — a permissioned operational view of an entity. A Workspace never owns business data; it presents and operates on data owned by the underlying business object. There is a Project Workspace and an Organizer Business Workspace. (Part V; Part VI.)
- **Organizer Business** — the entity that holds an organizer's assets across all of their Projects; the cross-Project root. (Part VI.)
- **Portfolio** — the set of Projects held by an Organizer Business. (Part VI.)
- **Account / Profile** — a person's durable identity in the system, independent of any role they hold. (Part VII.)
- **AI Organizer** — the single coordinating intelligence of the AI operational layer. (Part II.)
- **Intent Discovery**, **Statement of Understanding**, **Future Event Description** — the named stages by which an intention is understood and approved. (Part II; Part III.)
- **The Transformation** — the ordered process defined in Chapter 6.

# 6. The ActivLife Hub Transformation

The transformation is the ordered process by which a human intention becomes a real, completed, and preserved activity, and in doing so contributes to the organizer's business. It is the reference model for the rest of this document: every later Part specifies one segment of it.

The chain is:

**Human Intent → Intent Understanding → AI Organizer → Intent Discovery → Statement of Understanding → Future Event Description → Project Planning → Project → Occurrence → Registration → Participation → Execution → Completion → Memories → Archive → Organizer Business.**

Each transition contributes one thing and is specified in the Part noted.

- **Human Intent → Intent Understanding.** An expressed intention becomes the subject of the AI's reasoning about what is meant. (Part II.)
- **Intent Understanding → AI Organizer.** That reasoning is held and directed by the single coordinating intelligence. (Part II.)
- **AI Organizer → Intent Discovery.** Where more is needed to proceed, the intelligence conducts discovery to clarify the intent. (Part II.)
- **Intent Discovery → Statement of Understanding.** Discovery resolves into an approved verdict of what should happen. (Part II.)
- **Statement of Understanding → Future Event Description.** The approved understanding becomes a description of the activity that should exist. (Part III.)
- **Future Event Description → Project Planning.** The description becomes a structured operational plan. (Part III.)
- **Project Planning → Project.** The plan is materialized into the durable operational object. This is the point at which an intention becomes a real activity in the system. (Part III into Part IV.)
- **Project → Occurrence → Registration → Participation.** The activity acquires dated instances, admissions to them, and the people who take part. (Part IV, operated through Part V.)
- **Participation → Execution → Completion.** The activity is run and reaches its end. (Part V.)
- **Completion → Memories → Archive.** The completed activity becomes a preserved record and a reusable model. (Part V.)
- **Archive → Organizer Business.** The preserved activity contributes to the organizer's assets across Projects. (Part VI.)

Two properties of the chain hold throughout. First, it defines dependency order, not a strict timeline: a stage may not begin before the stage it depends on, though later work may proceed in parallel where dependencies allow. Second, transitions that create commitments are gated by human authority, consistent with Chapter 1: the AI operational layer advances operational work along the chain, but a person authorizes any transition that spends money, creates an obligation, or cannot be undone.

# 7. System Map

The System Map presents the platform as a single architectural model and closes Part I. It composes the three things already defined — the four layers of Chapter 2, the roles of Chapter 3, and the transformation of Chapter 6 — into one structure, and states the boundaries between its regions. It does not redefine them.

The model has two axes. Along one axis stand the layers: the AI operational layer acting upon the Project domain, the Organizer Platform spanning across Projects above it, and Platform Services beneath all of them as shared infrastructure. Along the other axis runs the transformation, advancing from intent to archive and into the Organizer Business. A Project occupies the point where the transformation crosses the domain layer; the AI operational layer works on it from above; Platform Services support it from below; and once completed, its result rises into the Organizer Platform. The five roles attach to this structure through the permissioned views defined in Chapter 3.

The model is delimited by five boundaries.

- **The Project boundary.** A Project contains exactly one activity, and by the governing rule of Chapter 1 every persistent operational fact belongs to exactly one Project. Nothing operational about an activity lives outside its Project.
- **The Organizer Platform boundary.** This layer holds only what is cross-Project. It references Projects and holds assets that outlive any one of them, and it never re-owns a fact that belongs to a single Project.
- **The Platform Services boundary.** These services are activity-agnostic. They hold nothing specific to one activity and are shared identically beneath all Projects and organizers.
- **The external boundary.** Functions the platform does not perform itself are delegated outward. Within the boundary the platform holds operational and financial fact; the external processing of that fact occurs outside it.
- **The authority boundary.** The AI operational layer performs operational work; decision authority over commitments remains with the human organizer. Work and authority are separated across this boundary at every stage of the transformation.

This map is the navigation model for the document. Every chapter in this Product Canon belongs to exactly one region of this map. Each subsequent Part corresponds to a region of it: Part II is the AI operational layer, Part III is the segment of the transformation that creates a Project, Part IV is the Project domain, Part V is the operation of a Project through completion and archive, Part VI is the Organizer Platform, and Part VII is Platform Services. A reader can locate any chapter by the region of the map it occupies.

With the whole model established, the document proceeds to the layer where every activity begins. The first region of the map, and the first segment of the transformation, is the AI operational layer — the subject of Part II, Artificial Intelligence.

**PART I COMPLETE.** Part I — Foundation is declared complete. Future modifications to Part I are permitted only when required to resolve an architectural contradiction: no stylistic rewrites, no editorial improvements, and no additional content.

---

# PART II — ARTIFICIAL INTELLIGENCE

# 8. AI Philosophy

This chapter states the governing principles of the AI operational layer defined in Part I. It does not re-argue why the layer exists; Chapter 1 establishes that. It fixes the rules under which the layer operates, and those rules are authoritative for every AI concept that follows.

**AI exists to perform operational work.** The purpose of the layer is to carry out organizing work, not to advise beside it. Its output is progress in the operational state of an activity, not commentary about it.

**AI augments human capability.** The layer exists to increase what one organizer can carry. Its measure is the reduction of the organizer's coordination and decision load, the constraint identified in Chapter 1. It does not aim to remove the human from the activity.

**AI never replaces human authority.** Work and authority are separated, as established by the authority boundary in Chapter 7. The layer performs work; authority over decisions remains with the human. This separation is the first governing rule of the layer and is specified in full in Chapter 15.

**AI operates on Project state.** The layer acts on the operational state that the Project owns, under the governing rule of Chapter 1 that every persistent operational fact belongs to exactly one Project. Before a Project exists, the layer operates on the pre-Project intent and understanding defined in the chapters that follow; it does not maintain a separate persistent store of activity state of its own.

**AI is part of the operating system, not an external assistant.** The layer is one of the four architectural layers of Chapter 2, integrated with the domain it acts on. It is not a separate advisory product placed beside the system.

# 9. Human Intent

Human Intent is the input that enters the platform. It is the first element of the transformation defined in Chapter 6, and this chapter specifies what it is as an architectural object.

Intent exists before any Project. When intent enters the platform, no Project has been created, and no operational state exists yet for the activity it refers to. Intent is therefore unowned by the domain; it is raw input to the AI operational layer, not a fact held by a Project.

Intent is not yet structured. It may be vague, incomplete, or internally contradictory. It may express a finished plan, a desired result, or only a feeling. The platform accepts intent in any of these conditions; resolving them is the work of the stages that follow, not a precondition the person must satisfy first.

Intent is distinguished from three things it is not. It is not planning: it contains no operational model. It is not a Project: it is not the durable object of an activity. And it carries no commitments: nothing is spent, agreed, or made irreversible by the existence of intent. Intent is only the subject the AI operational layer begins to reason about.

# 10. Intent Understanding

Intent Understanding is the reasoning stage that acts on Human Intent. It is internal to the AI operational layer and produces no external artifact.

Its responsibilities are to interpret the meaning of the intent, to resolve ambiguity within it, to identify information that is missing, and to build an internal understanding of what the person means. This understanding is the layer's working model of the intent; it is held during the interaction and is not persisted as a domain fact.

Intent Understanding creates no commitments. It changes no operational state and authorizes nothing. Its result is internal reasoning only, not a decision and not a reviewable statement — the reviewable statement is defined separately in Chapter 13.

Where understanding determines that information is missing or an assumption is unvalidated, that determination is the condition that invokes Intent Discovery (Chapter 12). Where understanding is already sufficient, the layer proceeds without discovery. Which of these holds is decided within the coordinating intelligence defined next.

# 11. AI Organizer

The AI Organizer is the single coordinating intelligence of the AI operational layer, named as a term in Part I and specified here. It is the architectural entry point of the layer: everything entering or leaving the AI operational layer passes through it.

There is exactly one AI Organizer per interaction. The person interacts with one intelligence, never with more than one, and never with the internal responsibilities behind it. Users never interact with specialized agents directly; agents are internal to the layer and are defined in Chapter 14.

The AI Organizer owns orchestration. It sequences the stages of the layer — understanding, discovery, and the work of the internal agents — and it assembles their results into what the person sees. It delegates work internally but retains coordination; delegation never transfers coordination out of the AI Organizer.

The AI Organizer holds no authority over commitments, and neither do the agents it directs: specialized agents never own authority. The AI Organizer presents decisions to the human and carries approvals back into the layer; it does not authorize them itself. The boundary that fixes this is specified in Chapter 15.

# 12. Intent Discovery

Intent Discovery is the stage that closes the gaps identified during Intent Understanding. It is conducted by the AI Organizer and is invoked only when understanding is insufficient to proceed.

Its responsibilities are adaptive questioning that asks only for what is missing, collecting that missing information, validating assumptions that understanding has flagged, and converging toward a shared understanding between the person and the layer. Discovery is bounded by a sufficiency condition: it stops when enough understanding exists to describe responsibly what should happen. It does not continue past that point, and it does not gather information it does not need.

Intent Discovery produces no commitments. Its outcome is not itself a reviewable artifact but sufficient understanding to produce the artifact defined next. When the sufficiency condition is met, the layer proceeds to the Statement of Understanding.

# 13. Statement of Understanding

The Statement of Understanding is the first externally reviewable artifact of the transformation. Up to this point the layer's understanding has been internal reasoning (Chapters 10 and 12); the Statement is the point at which that reasoning becomes an explicit statement presented to the human.

The Statement requires human approval. It is an approval gate: the transformation does not advance past it without a human accepting it, consistent with the authority-gated transitions of Chapter 6. The person, not the layer, decides whether the Statement correctly captures what should happen.

Once approved, the Statement becomes immutable. It is a frozen record of what was agreed to be understood, and it does not change retroactively. The approved Statement becomes the input to the Future Event Description, specified in Part III.

If the Statement is not approved, control returns to Intent Discovery (Chapter 12) to refine understanding, and a new Statement is produced for review. The Statement of Understanding is the boundary artifact between the understanding of Part II and the Project creation of Part III; at this point no Project yet exists.

# 14. AI Architecture and Specialized Agents

Internally, the AI operational layer is organized as one coordinator and a set of specialized responsibilities. This chapter defines that shape as architecture, not as implementation.

A specialized agent is an architectural responsibility: a bounded area of organizing work within the layer, such as discovery, planning, budgeting, commercial preparation, resource sourcing, workspace monitoring, communication, execution support, and review. Each names a responsibility the layer must fulfill; none is a separate product or a user-facing system.

Four rules govern this internal architecture.

- **Specialization exists only internally.** From outside the layer there is one intelligence, the AI Organizer. The division into responsibilities is not visible externally and is not part of what any role interacts with.
- **Coordination belongs exclusively to the AI Organizer.** Agents do not coordinate as independent peers. The AI Organizer sequences their work and combines their results.
- **Agents perform work on behalf of the AI Organizer.** They are invoked by it and return their results to it. They act within the layer, not beside it.
- **Agents never communicate independently with users.** All external communication flows through the AI Organizer, and agents hold no authority, as fixed in Chapter 15.

This is the complete architectural description of the internal layer: a single coordinating intelligence directing many internal responsibilities, presented externally as one.

# 15. AI Safety and Boundaries

This chapter specifies the boundary of the AI operational layer. It makes the authority boundary of Chapter 7 concrete and applies it, without exception, to the entire layer — the AI Organizer and every specialized agent alike.

The AI operational layer may:

- reason;
- organize;
- recommend;
- coordinate;
- prepare;
- monitor.

The AI operational layer may not, independently:

- spend money;
- create legal commitments;
- authorize payments;
- approve contracts;
- override human decisions;
- violate permissions;
- bypass approval gates.

Two conditions frame these lists. The layer operates strictly within the permission model established in Chapter 3; it presents to each role only what that role's view permits, and it cannot widen its own access. And at every approval gate defined by the transformation in Chapter 6, the layer prepares work up to the gate and stops; it does not advance a commitment across the gate on its own.

Human authority remains final. The layer performs and coordinates work; the decision to spend, to commit, to approve, or to make anything irreversible is always a human act. This boundary is authoritative for the remainder of the Product Canon: wherever AI acts in any later Part, it acts within these limits.

PART II COMPLETE.

---

# PART III — PROJECT CREATION

This Part specifies how an approved Statement of Understanding (Chapter 13) becomes a Project. It covers three stages — Future Event Description, Project Planning, and Project Assembly — and stops at the moment a Project exists. Everything that follows a Project belongs to later Parts.

# 16. Future Event Description (FED)

The Future Event Description is the first description of the future activity. It states what should exist.

The FED is produced only from an approved Statement of Understanding. There is no FED without an approved Statement, and the FED carries the Statement forward as its sole source; it introduces nothing the approved understanding did not contain.

The FED describes the future activity itself — what it is, whom it is for, and the result it is meant to produce — and nothing operational. It contains, by boundary:

- no operational planning;
- no resources;
- no scheduling;
- no pricing;
- no staffing;
- no execution details;
- no implementation.

These exclusions are definitional. The FED is the description of the activity, not a description of how the activity will be carried out; the latter is the subject of Project Planning.

The FED is immutable after approval. It is a frozen description, consistent with the immutability of the Statement it derives from. It is not edited in place. A change to what the activity should be requires returning to the Statement of Understanding (Chapter 13), and a revised Statement produces a revised FED. The FED is still pre-Project and carries no commitments.

# 17. Project Planning

Project Planning transforms the approved FED into an operational model. Where the FED states what the activity is, planning determines how it will be carried out.

Planning determines:

- work structure;
- required resources;
- staffing;
- budget;
- vendors;
- timeline;
- dependencies;
- risks;
- operational decisions.

The result of these determinations is the operational model: the complete specification of how the activity is to be executed. The operational model is distinct from the FED and is defined here as the output of this stage.

Planning may iterate internally. The operational model is refined within the creation process until it is complete; this iteration occurs before any Project exists and produces no external, durable result on its own.

Planning produces no Project. Its output is a complete operational model ready for materialization, and nothing more. The model is still pre-Project: it holds no persistent business facts of the domain, and it materializes no commitments. Producing the model is bounded by the authority limits of Chapter 15; planning prepares the model up to any decision that requires human authority and does not cross those gates on its own.

# 18. Project Assembly

Project Assembly materializes the operational model into the Project domain. The Project is created here.

This stage is the architectural boundary between AI reasoning and the Project domain. Before Assembly, the artifacts of creation — the understanding, the FED, and the operational model — exist within the creation process of the AI operational layer and are held there as working inputs. At Assembly, they are materialized into a durable domain object. This is the single point at which the transformation crosses out of the AI operational layer and into the domain.

At this boundary, the Project becomes the owner of all persistent business facts, under the governing rule of Chapter 1 that every persistent operational fact belongs to exactly one Project. From this point forward, the operational state of the activity lives in the Project. Correspondingly, the AI operational layer no longer owns anything created before this point: ownership of the activity's facts rests with the Project, consistent with the principle in Part II that AI operates on Project state rather than holding a store of its own. All later lifecycle stages operate on the Project.

Project Assembly creates exactly the following:

- **Project** — the durable object of the activity, specified in Part IV.
- **Initial Project state** — the starting operational state derived from the operational model.
- **Ownership** — the Project's owner, established as defined in Part I.
- **Relationships** — the Project established as the anchor to which later objects and roles attach.
- **Identity** — the Project established as a distinct, identifiable durable object in the domain.

Project Assembly creates nothing beyond the Project and its initial state. It creates:

- no Occurrences;
- no Registrations;
- no Participants;
- no execution;
- no publication.

Those belong to later Parts — the domain objects to Part IV, and the operation of the Project to Part V.

# Boundary Rules

The creation of a Project follows one fixed path:

Human Intent
↓
Intent Understanding
↓
AI Organizer
↓
Intent Discovery
↓
Statement of Understanding
↓
Future Event Description
↓
Project Planning
↓
Project Assembly
↓
**Project**

The stages above Project Assembly are reasoning and description within the AI operational layer; they hold no persistent business facts and own nothing in the domain. Project Assembly is the transition. At this exact point, the Project becomes the central business object: it takes ownership of all persistent business facts, and everything afterwards belongs to the Project.

PART III COMPLETE.

---

# PART IV — PROJECT DOMAIN MODEL

This Part is the authoritative definition of every primary business object in ActivLife Hub. Each object is defined once, here. Every later Part references these definitions rather than restating them. The Project referenced throughout is the object created at Project Assembly (Part III).

# 19. Project

The Project is the central business object of the platform. It is the durable representation of one real-world activity, and it is the object all other domain objects are anchored to.

The foundational ownership rule of the domain is the governing rule of Chapter 1: every persistent business fact belongs to exactly one Project. No business fact of an activity exists outside a Project, and no fact belongs to two Projects.

Operational state is derived from Project business facts. The Project holds the durable facts; the operational state of the activity — what is ready, what is outstanding, what is happening — is a derivation of those facts, not a separate store.

The Project owns its lifecycle. It exists from Project Assembly onward and persists through preparation, execution, and completion into its preserved form. No later stage owns the Project; the Project owns its own progression through them.

The Project is the parent of every domain object defined in this Part, unless a chapter states otherwise. Objects attach to the Project directly or through another object that is itself anchored to the Project.

The Project exists independently of publication, execution, Registrations, and Payments. It is created before any of these and remains whole in their absence: an unpublished, unexecuted Project with no Registrations and no Payments is still a complete Project.

The Project is not the plan, not the operational model, not the public projection of the activity, not an Occurrence, not a marketplace listing, and not a Payment or financial artifact. Those are either inputs that precede it (Part III), objects it owns, or projections of it. The Project is the durable object itself.

# 20. Occurrence

An Occurrence is one scheduled realization of a Project. It is the dated instance at which the activity actually takes place.

One Project may have many Occurrences, and every Occurrence belongs to exactly one Project. The relationship is one Project to many Occurrences, and it does not cross Project boundaries.

The Occurrence owns date, time, place, capacity, and operational scheduling. These facts are specific to the single realization and are held by the Occurrence, not by the Project. What is specific to one realization lives on the Occurrence; what describes the activity as a whole lives on the Project.

Deleting an Occurrence never deletes its Project. Ownership runs from Project to Occurrence and not in reverse; the removal of a realization does not remove the activity it realized.

A recurring activity is multiple Occurrences of one Project, not multiple Projects. Repetition of an activity is expressed as additional Occurrences under the same Project, so the activity remains a single durable object across all of its realizations.

# 21. Registration

A Registration is the record of one Participant's admission to one Occurrence.

A Registration belongs to exactly one Occurrence, and through that Occurrence to exactly one Project. It links one Participant to one Occurrence; it is the single connection between a person and a dated realization of an activity.

A Registration is independent of Ticket and Payment. It is neither of them and is not owned by either: the participation model under which it was created and any financial fact associated with it are separate objects, defined in Chapters 26 and 27.

The Registration owns the admission state. The admission state is authoritative and is one of: pending, approved, declined, or cancelled. Whether a person is admitted to an Occurrence is determined solely by the Registration's admission state.

The Registration is the authoritative participation record. Roster membership and remaining capacity of an Occurrence are derived from its Registrations, and there is no other record of participation.

# 22. Participant

A Participant is a role: the role a person holds in relation to a Project through its Occurrences. It is defined by relationship, not by identity.

A person becomes a Participant only through Registration. There is no other path into the role. Absent a Registration, a person is not a Participant, regardless of any other relationship they hold to the platform.

A Participant belongs to a Project through Occurrences. The chain is fixed: a person holds the Participant role by way of a Registration to an Occurrence of the Project. The role is always scoped to the Occurrences a person is registered for.

A Participant is not an account type. The durable identity of a person is the Account defined in Part I; the Participant role is held by an Account for a specific Project and does not alter or classify the Account itself.

A Participant is not a Ticket. The Ticket is the participation model; the Participant is the person-in-role admitted under it.

# 23. Organizer

The Organizer is the owner of a Project.

The Organizer carries operational responsibility for the Project. The Organizer is the accountable operator of the activity and the party responsible for its commitments and outcomes.

An Organizer may own many Projects. Ownership is one Organizer to many Projects; each Project has exactly one Organizer as owner.

Organizer authority is defined separately from AI authority. The AI operational layer holds no authority over commitments, as fixed in Chapter 15; decision authority over the Project rests with the Organizer. The two are distinct: the AI layer performs and coordinates work, the Organizer decides.

The Organizer is the owner role at the level of a single Project. The Organizer Business — the entity that holds an organizer's assets across all of their Projects — is a separate concept defined in Part VI and is not the same object as the Organizer defined here.

# 24. Customer

The Customer is the party that requests or commissions a Project.

The Customer is distinct from the Organizer. The Customer is the party for whom the activity is delivered; the Organizer is the party who delivers it. A single person may hold both roles in different Projects, but the roles themselves are separate.

The Customer owns approvals. Decisions that require the commissioning party's acceptance — scope, proposal, and agreed result — are the Customer's to grant. These approvals are the Customer's authority within the Project.

The Customer does not own Project operations. Operational responsibility and ownership of the Project remain with the Organizer; the Customer approves what is agreed but does not operate the Project.

# 25. Worker

The Worker is a person who performs assigned work within a Project.

The Worker owns no Project decisions. The Worker carries out assignments but does not hold authority over the Project or its commitments.

The Worker operates under Organizer authority. Assignments, responsibilities, and their scope are granted by the Organizer, who remains accountable for the Project.

Worker visibility is permission-scoped. Under the principle established in Chapter 3, the Worker is presented only the portion of the Project their assignment requires — its timing, place, and instructions — and not the whole Project.

# 26. Ticket

A Ticket defines the participation conditions of a Project — whether joining is free, paid, or by donation, and the terms of that participation.

A Ticket is configuration. It specifies the model under which a person may be admitted; it is a property of the Project, not a person and not an event.

A Ticket is not admission. Admission is the state owned by the Registration (Chapter 21). The Ticket sets the conditions of participation; it does not itself admit anyone.

A Ticket is not a Registration. The Registration is the concrete participation record created under the Ticket's conditions; the Ticket is the standing configuration.

A Ticket is not a Payment. It may specify that participation carries a price or a donation, but it is not the financial fact of any transaction; that is the Payment (Chapter 27).

# 27. Payment

A Payment records a financial fact of a Project — that money was owed, collected, or associated with participation.

External payment processing is outside platform boundaries. The movement and processing of money are performed by external systems, as established by the external boundary in Chapter 2. The Payment is the platform's record of the financial fact; it is not the processing of the money.

A Payment never owns a Registration. Admission is owned by the Registration and is never conditioned on the Payment owning it; a financial fact is associated with a Registration but does not contain or control it.

A Payment never owns a Ticket. The participation model is configuration owned by the Project; the Payment references the financial terms without owning the Ticket.

A Payment belongs to exactly one Project. Every financial fact is anchored to a single Project, consistent with the domain ownership rule of Chapter 19.

# Relationship Rules

The domain is anchored to the Project. The structure of relationships is:

```
Project
│
├── Occurrence
│   └── Registration
│       └── Participant
│
├── Ticket
│
├── Payment
│
├── Organizer
├── Customer
└── Worker
```

Ownership for each relationship is stated explicitly below. The tree shows the Project as the anchor of relationships; it does not by itself imply the direction of ownership, which is given here for every edge.

- **Project → Occurrence.** The Project owns its Occurrences. One Project to many Occurrences.
- **Occurrence → Registration.** The Occurrence owns its Registrations. One Occurrence to many Registrations.
- **Registration → Participant.** The Registration owns the participation record; the Participant role exists only through the Registration. The Participant is not owned as an independent object.
- **Project → Ticket.** The Project owns its Ticket configuration.
- **Project → Payment.** The Project owns its Payment records.
- **Organizer → Project.** The Organizer owns the Project. This edge runs from role to Project: the Organizer is the owner, not a possession of the Project.
- **Customer → Project.** The Customer is related to the Project as the commissioning party and owns its approvals; the Customer does not own Project operations.
- **Worker → Project.** The Worker is related to the Project through assignments granted under Organizer authority, with permission-scoped visibility; the Worker owns no part of the Project.

Ownership is never inferred. Every relationship in the domain is explicitly owned by exactly one side, as stated above. No object assumes ownership of another by proximity, by containment in a view, or by participation in a shared Project. Where ownership is not explicitly stated, it does not exist.

PART IV COMPLETE.

---

# PART V — PROJECT OPERATION

This Part defines how an existing Project operates. The Project has already been created at Project Assembly (Part III), and the business objects it owns are defined in Part IV. No chapter here redefines the Project or any domain object; each defines one operational responsibility and how it acts on the Project that already exists.

Throughout this Part, a *projection* is an operational surface derived from Project-owned facts that owns no business data of its own. A projection presents and operates on facts the Project owns; it never holds them.

# 28. Project Workspace

The Project Workspace is the operational view through which the Organizer works a Project. It is a projection.

The Workspace never owns business data. It operates on Project-owned facts, presenting them and acting on them, and it holds no business state of its own. Every change made through the Workspace is a change to facts the Project owns.

The Workspace is permission-scoped, under the principle of Chapter 3. What it presents and what it permits are bounded by the role viewing it.

Multiple Workspaces may exist over the same Project. Different operators, and the same operator in different contexts, may hold distinct Workspace views of one Project. Because each is a projection, their multiplicity changes nothing about the underlying facts: the Project remains the single source of truth, and all Workspaces resolve to it.

# 29. Resources

Resources are the operational assets a Project depends on to be executed. They include venues, equipment, supplies, staff, and external services.

Resources belong to a Project. A Resource attached to a Project is owned by that Project; it is a business fact of the activity, not a projection.

Resources support execution. They are the assets the activity consumes or relies on when it is run, and they exist to make execution possible.

Resources are not Vendors. A Vendor is the supplier of a Resource; the Resource is the asset the Project holds. The distinction is ownership: once a Resource is part of a Project, it belongs to the Project, whereas a Vendor remains an external party related to it through what it supplies.

# 30. Vendor / Resource Marketplace

The Vendor / Resource Marketplace is the surface that connects Projects with external resources and the vendors who supply them.

The Marketplace never owns Project resources. It facilitates sourcing; it does not hold the Resources of any Project.

The Marketplace never owns Vendors. Vendors are external parties; the Marketplace connects Projects to them without owning them.

The Marketplace facilitates sourcing only. Its responsibility is to bring external supply into reach of a Project's needs, and nothing beyond that.

Selected resources become Project resources. At the point of selection, a sourced resource becomes a Resource owned by the Project, as defined in Chapter 29. Ownership passes into the Project; it never rests with the Marketplace.

# 31. Publication and Public Space

Publication is the act of making a Project publicly visible. The Public Space is the resulting public projection of the Project.

The Public Space never owns Project data. It is a projection that exposes only published information — the subset of the Project's facts the Organizer has chosen to make public. It holds none of them.

Unpublished Projects remain fully operational. Publication is not a precondition of existence or operation; consistent with Chapter 19, a Project exists and operates independently of publication. An unpublished Project is complete and operable.

Publication changes visibility only. It controls what of the Project is exposed through the Public Space; it does not alter the Project's facts or its operation.

# 32. Activities Marketplace

The Activities Marketplace is the discovery surface through which people find activities to join. It is the meeting point of the two journeys defined in Chapter 4.

The Activities Marketplace exposes Public Space. What it presents for any activity is that activity's Public Space (Chapter 31), never the Project behind it.

The Activities Marketplace contains only published Projects. A Project appears in it only through publication; unpublished Projects are absent from it.

The Activities Marketplace never owns activities. It supports discovery only — surfacing published activities to the people who might join them — and owns none of them. It is a projection layer over Public Spaces, not a store of activities.

# 33. Participant Experience

The Participant Experience is the operational surface through which a Participant engages with a Project. It is a permissioned projection.

Participants interact through Registrations. The Participant role and its connection to the Project are established solely through Registration, as defined in Part IV; the Experience presents and operates on that relationship and its associated facts.

The Experience never owns Project state. It presents Project-owned facts to the Participant within their permission scope and holds none of them.

The Participant Experience spans before, during, and after participation. It covers what the Participant sees and does across the whole arc of an activity — preparation, the Occurrence itself, and the record that follows — all as projections of Project-owned facts.

# 34. Client Experience

The Client Experience is the operational surface through which a Customer (Part IV) engages with a Project. It is a permissioned projection.

The Client observes Project progress. The Experience presents the state of the agreed activity — its scope, its progress, and its result — as a projection of Project-owned facts.

The Client owns approvals. The approvals that are the Customer's to grant, as defined in Chapter 24, are exercised through this Experience; they are the Client's authority within the Project.

The Client never owns operations. Operational ownership and responsibility remain with the Organizer; the Client approves what is agreed but does not operate the Project.

The Client view is permission-scoped, under the principle of Chapter 3.

# 35. Vendor and Worker Experience

The Vendor and Worker Experience is the operational surface through which vendors and workers engage with a Project. It is assignment-driven.

Visibility follows assignments. Under the principle of Chapter 3, each vendor and worker is presented only the portion of the Project their assignment requires, and nothing more.

Workers operate under Organizer authority. As defined in Part IV, workers carry out assignments granted by the Organizer and hold no Project decisions.

Vendors interact through supplied resources. A vendor's relationship to the Project is the Resource it supplies (Chapters 29 and 30); the Experience presents that relationship and its requirements, as a projection of Project-owned facts.

# 36. Execution

Execution is the operation of running an existing Project's activity.

Execution operates on an existing Project. It presupposes the Project and acts on it; it does not create one.

Execution changes operational state. Running the activity advances the Project's facts, and the operational state — which, per Chapter 19, is derived from those facts — moves accordingly. Execution acts through the facts, not beside them.

Execution never changes Project identity. It changes what is happening within the Project, not which Project it is; the durable identity established at Project Assembly is untouched by execution.

AI supports execution, as the AI operational layer (Part II) coordinating and preparing operational work. Human authority remains final: consistent with Chapter 15, every commitment and irreversible decision during execution is a human act.

# 37. Notifications

A Notification communicates a Project event to the roles concerned with it.

Notifications never own Project state. A Notification is a projection of a change in the Project; it reports a fact the Project owns and holds none itself.

Notifications are projections of Project changes. Their content is derived from what changed in the Project and its Occurrences; they add no business facts of their own.

Delivery is infrastructure. The mechanism that carries a Notification to a recipient is a shared Platform Service (Part VII), not a property of any Project.

Notification history belongs to the Project. While delivery is infrastructure, the record that a Notification was raised about an activity is a Project-owned fact and is held by the Project.

# 38. Reviews

A Review is written feedback on a completed Project.

Reviews belong to completed Projects. A Review exists only for a Project that has completed; it is part of the Project's historical record.

Reviews belong to Participants. A Review is authored by a Participant of the activity (Part IV) and by no other role. It is an owned historical record of the Project, contributed by a Participant.

Reviews never modify Project history. A Review is added to the record; it does not change any fact the Project already holds. It records a judgment about what happened, not an alteration of it.

Reviews are immutable historical records. Once made, a Review stands as a frozen part of the Project's history.

# 39. Memories

Memories are the preserved evidence of what a Project's activity was — its photos and records.

Memories preserve Project evidence. They are the durable record of the realized activity.

Memories belong to the Project. They are owned business facts of the Project, not a projection.

Memories survive completion. They persist after the activity has ended and are not discarded at completion.

Memories become historical assets. After completion they form part of the Project's lasting record and are available as material for its reuse.

# 40. Archive

The Archive is the preserved Project after completion. It is not a separate object; it is the Project itself in its completed, preserved form.

The Archive never changes historical facts. It holds the Project's facts as they stood at completion, and those facts are not altered thereafter.

The Archive remains reusable. The preserved Project serves as a starting point for repeating or improving the activity, retaining its structure for future use.

The Archive contributes to the Organizer Business. As the preserved outcome of an activity, it feeds the organizer's cross-Project assets, defined in Part VI. The Archive itself remains the preserved Project; its contribution to the Organizer Business is defined there.

# Relationship Rules

Operational ownership across a Project's lifecycle is fixed as follows:

```
Project
│
├── Workspace              (projection)
├── Public Space           (projection)
├── Participant Experience (projection)
├── Client Experience      (projection)
├── Vendor Experience      (projection)
├── Notifications          (projection)
├── Resources              (owned)
├── Reviews                (owned history)
├── Memories               (owned history)
└── Archive                (preserved Project)
```

The surfaces marked *projection* — the Workspace, the Public Space, the Participant, Client, and Vendor Experiences, and Notifications — own no business data. Each presents and operates on Project-owned facts within its permission scope. The items marked *owned* — Resources, Reviews, and Memories — are business facts held by the Project, and the Archive is the preserved Project itself.

Two operational surfaces do not appear in this tree because they own nothing attached to any Project. The Vendor / Resource Marketplace and the Activities Marketplace are facilitation surfaces: the first sources resources into Projects, the second exposes published Public Spaces for discovery. Execution likewise is not an owned attachment but an operation performed on the Project.

Operational views never own business data. Every operational surface is a projection of Project-owned facts. The Project remains the single source of truth throughout its entire lifecycle.

PART V COMPLETE.

---

# PART VI — ORGANIZER PLATFORM

This Part defines everything that exists above an individual Project. Part IV defines the Project and the facts it owns. This Part defines what belongs to an Organizer across many Projects. No chapter here redefines the Project or any object Part IV owns.

# 41. The Organizer Business

The Organizer Business is the cross-Project business entity. It is the business root that sits above Projects and holds what belongs to an organizer across all of them.

One Organizer Business owns many Projects. The relationship is one Organizer Business to many Projects; it is the durable parent that holds them as a set.

The Organizer Business never owns Project business facts. The facts of an activity belong to the Project, under the ownership rule of Chapter 19, and that ownership is never transferred upward. The Organizer Business holds Projects as members of a portfolio; it does not hold the operational facts inside them.

The Organizer Business owns only cross-Project assets — the assets that belong to the organizer across activities rather than to any single one. These are the subjects of the remaining chapters of this Part.

The Organizer Business survives individual Projects. Projects are created, completed, and archived; the Organizer Business persists across all of them and outlives each.

The distinction is fixed here: the Project is the operational unit, and the Organizer Business is the business unit. The Organizer defined in Part IV is the owner role of a single Project; the Organizer Business is the durable entity that holds that organizer's Projects and cross-Project assets together.

# 42. The Project Portfolio

The Project Portfolio is the collection of Projects belonging to one Organizer Business.

The Portfolio owns no Projects. It is an organizational projection over the Projects the Organizer Business holds; it presents them as a set and holds none of them as its own.

The Portfolio supports management across Projects. Its responsibility is to give the organizer a view across their activities — for oversight and coordination among Projects — without becoming a store of them.

The Portfolio never duplicates Project data. It references the Projects it lists; it does not copy their facts. Each Project remains the single source of truth for its own data, and the Portfolio is a projection of that set, consistent with the projection principle established in Part V.

# 43. Templates and Reusable Models

A Template is a reusable operational model derived from a completed Project.

Templates originate from completed Projects. A Template is abstracted from the preserved form of an activity — its Archive (Part V) — capturing the structure of how it was carried out for reuse.

Templates are reusable operational models. A Template is the reusable form of the operational model defined in Part III; it holds structure to be reused, not the facts of any activity.

Templates are not Projects. A Template is a cross-Project asset owned by the Organizer Business; it is not an operational unit and owns no activity's facts.

Creating from a Template always creates a new Project. A Template is applied through Project Assembly (Part III), which produces a new Project; the Template is the input, and the result is a distinct Project.

Templates never modify historical Projects. Deriving a Template from a completed Project, or creating a new Project from a Template, leaves every existing Project unchanged. A Template carries structure forward; it does not reach back into the Projects it came from.

# 44. Academy and Organizer Development

The Academy is the capability that develops organizers.

The Academy develops organizer capability. Its responsibility is to increase what an organizer is able to do — the organizing capability identified as the platform's constraint in Chapter 1.

The Academy is independent of Projects. It operates on the organizer, not on any activity; it neither reads nor changes the facts of a Project.

The Academy contributes to the Organizer Business. Organizer development is a cross-Project asset: what an organizer gains through the Academy belongs to the Organizer Business and applies across all of their Projects. Organizer development is a business capability, not a Project operation.

Training never changes Project history. Development of the organizer has no effect on any Project's facts, past or present; the two are separate domains.

# 45. Certification and Trust

Certification is the verification of organizer capability.

Certification verifies capability. It establishes, against objective evidence, that an organizer meets a defined standard.

Certification grants platform privileges. A certified organizer is granted privileges within the platform that an uncertified one does not hold; certification is the gate for those privileges.

Certification is independent of Projects. It is a property of the organizer, held at the Organizer Business level, and it is not derived from or attached to any single Project.

Trust is derived from objective evidence. Trust in an organizer follows from verifiable facts — certification and demonstrated standing — not from assertion.

Certification never guarantees Project outcomes. It attests to capability at the level of the organizer; it makes no claim about the result of any particular activity, whose outcome is a matter of the Project.

# 46. Billing and Monetization

Billing and Monetization define how the platform earns. This chapter specifies the business-model boundary referenced in Chapter 3.

The platform monetizes capability. It charges for the organizing capability it provides, consistent with the principle that the platform sells capability, not labor.

The platform does not tax the Organizer–Customer relationship. Money that flows between an organizer and their own customers and participants belongs to that relationship; the platform does not take a share of it as a condition of the relationship existing.

The platform earns through defined surfaces:

- **Organizer subscriptions** — recurring access to the platform's capability.
- **Planning licenses** — charges for the creation capability applied to an activity.
- **Certification** — charges associated with verifying organizer capability.
- **Marketplace services** — charges for services the platform provides through its marketplaces.

External payment processing remains outside platform boundaries. The movement of money is performed by external systems, as established in Chapter 2; the platform records the financial facts of billing and delegates their processing outward.

The boundary is fixed here: the platform sells organizing capability, not participation. It earns from the capability provided to organizers, not from the act of people taking part in activities.

# Relationship Rules

The Organizer Platform is anchored to the Organizer Business:

```
Organizer Business
│
├── Project Portfolio   (projection)
├── Templates
├── Academy
├── Certification
├── Billing
└── Projects
```

Ownership across this structure is fixed as follows.

- **Organizer Business → Project Portfolio.** The Portfolio is a projection over the Organizer Business's Projects. It owns nothing; it presents the set.
- **Organizer Business → Templates.** Templates are cross-Project assets owned by the Organizer Business.
- **Organizer Business → Academy.** What the organizer gains through the Academy is a cross-Project asset held at the Organizer Business.
- **Organizer Business → Certification.** Certification and the privileges it grants are held at the Organizer Business, not on any Project.
- **Organizer Business → Billing.** The billing relationship and its financial facts are held at the Organizer Business.
- **Organizer Business → Projects.** The Organizer Business holds the portfolio membership of its Projects — the relationship — and nothing more.

The Portfolio is a projection: it duplicates no Project data and holds no Project. Projects remain independent business objects, each the single source of truth for its own facts under Chapter 19. The Organizer Business never owns Project business facts; it owns only the cross-Project assets enumerated above and the membership of the Projects in its portfolio.

PART VI COMPLETE.

---

# PART VII — PLATFORM SERVICES

This Part defines the shared platform infrastructure. Unlike the previous Parts, it defines no business objects. Every service here operates beneath the Project domain and the Organizer Business, supports the whole platform, and owns no Project business facts. Each owns only its own infrastructure state.

# 47. Localization

Localization is the shared capability that presents the platform in its supported languages.

Localization applies consistently across the platform. It is a single capability used identically by every surface, not a feature rebuilt per Project or per Organizer Business.

Localization owns translations only. Its state is the translated presentation of text; that is the entirety of what it holds.

Localization never owns business facts. It presents facts owned elsewhere in the language required; it neither holds nor alters them.

Business objects remain language-independent. The objects of Part IV and the assets of Part VI carry no language of their own; Localization renders their presentation without changing the underlying facts. The same fact is one fact regardless of the language it is shown in.

# 48. Search and Local Activities

Search is the infrastructure that indexes published information and retrieves it.

Search indexes published information. It builds its index only from what has been made public; it does not read the unpublished facts of a Project.

Search operates on Public Space projections. Its input is the Public Space defined in Part V, not the Project behind it. It indexes projections, not domain facts.

Search returns references to Projects. A result is a reference to a Project through its Public Space; Search does not return, and does not hold, the Project's business facts.

Search never owns activities. It holds an index over published projections and owns no activity. Search is infrastructure, not a marketplace: it provides indexing and retrieval, whereas the Activities Marketplace (Part V) is the discovery surface that uses such retrieval. The two are distinct.

Local Activities is the discoverable result of published Projects — the set of published activities surfaced by place through Search. It is a result set, not an owned object; it references published Projects and holds none of them.

# 49. Communication Services

Communication Services are the shared infrastructure that delivers messages.

Communication delivers messages. Its responsibility is transport — carrying information from where it is produced to where it is received.

Communication never owns conversations. It moves messages; it does not hold the conversation as its own business record.

Communication never owns Project state. The content it carries — including the Notifications defined in Part V — is produced and owned elsewhere; Communication holds none of the Project's facts.

Communication transports information produced elsewhere. It is the delivery layer beneath surfaces that generate messages, such as Notifications, whose content is a projection of Project changes and whose historical record belongs to the Project. Communication carries that content; it does not originate or retain it.

# 50. Administration

Administration is the platform responsibility that governs platform integrity.

Administration operates above Projects. It acts at the level of the platform as a whole, across all Projects and Organizer Businesses, rather than within any single Project.

Administration never owns Project business facts. It governs the platform; it does not hold or alter the facts a Project owns under Chapter 19.

Administration manages platform-level concerns: policies, moderation, support, platform health, and operational governance. These are the responsibilities by which the platform maintains its integrity.

Administration is a platform responsibility, not a Project responsibility. Operational responsibility within an activity remains with the Organizer (Part IV); Administration governs the platform beneath and around all Projects, and does not operate any of them.

# 51. Shared Platform Services

Shared Platform Services are the common infrastructure the entire platform depends on. They comprise:

- **Identity** — the durable identification of a person, independent of any role they hold.
- **Authentication** — the verification that a person is who they claim to be.
- **Authorization** — the enforcement of the permission model established in Chapter 3.
- **Media** — the handling of media assets.
- **Storage** — the retention of data.
- **Audit** — the record of actions for integrity purposes.
- **Logging** — the record of system events.
- **Scheduling** — the timing of platform activity.
- **Background Processing** — the execution of work outside of direct interaction.

These services provide infrastructure. They own infrastructure state only — identities, credentials, permission grants, stored bytes, audit and log records, schedules, and queued work — and nothing more.

Shared Platform Services never own Project business facts. Identity and Authentication hold the durable identity of a person, distinct from the roles that person holds in the domain (Part IV); Authorization enforces permissions but owns no business object; Storage and Media retain data on behalf of the domain without owning the facts they hold. Business objects remain in the domain layer, where the Project is their single source of truth.

# Relationship Rules

Platform Services are organized beneath the rest of the platform:

```
Platform Services
│
├── Localization
├── Search
├── Communication
├── Administration
└── Shared Services
```

All Platform Services support the three layers above them: the AI Operational Layer (Part II), the Project Domain (Part IV), and the Organizer Business (Part VI). They serve these layers identically and hold nothing specific to any single Project or Organizer Business.

Ownership across Platform Services is fixed. Each service owns its own infrastructure state and nothing else: Localization owns translations, Search owns its index over published projections, Communication owns delivery, Administration owns platform-governance state, and Shared Services own identity, authorization, storage, audit, logging, scheduling, and processing state.

Platform Services own infrastructure. Platform Services never own business objects. Platform Services never become the source of truth for Project data; that remains the Project, throughout its entire lifecycle.

PART VII COMPLETE.

---

# PART VIII — ARCHITECTURAL PRINCIPLES

This Part defines the principles that govern architectural decisions. It introduces no business object, no platform capability, and no workflow. Each principle below is normative and is stated so that a proposed change can be tested against it.

# 52. Business Principles

The following principles are normative. Every architectural decision must conform to them, and a change that contradicts any of them is rejected regardless of its other merits.

**Organizing capability is the product.** A change is admissible only if it serves the delivery of organizing capability. A change whose purpose is something else — attention, volume, content — is out of scope by definition.

**The Project is the operational center.** All persistent business facts of an activity are owned by the Project (Chapter 19). No design may place an activity's operational facts anywhere other than its Project.

**The Organizer Business is the business center.** Cross-Project assets belong to the Organizer Business (Part VI). No design may attach a cross-Project asset to a single Project, and no design may attach a single Project's facts to the Organizer Business.

**AI performs operational work.** AI is assigned operational work, not authority (Part II). No design may give the AI operational layer ownership of a decision.

**Humans retain authority.** Every commitment and every irreversible action requires human authority (Chapter 15). No design may allow AI to cross an approval gate on its own.

**Platform Services remain infrastructure.** Shared services own infrastructure state only and never business facts (Part VII). No design may make a Platform Service the source of truth for Project data.

These principles are binding. They are the standing test applied to every subsequent principle and every proposed change in this Part.

# 53. Competition First

No capability may be invented until existing solutions to the same problem have been studied. The study of prior solutions is a precondition of design, not an optional step; a design produced without it is inadmissible.

Architecture follows understanding. The design of a capability must follow from an understanding of how the problem is already solved elsewhere. Where an existing solution is adequate, its pattern is adopted; where the product model requires a different approach, the departure must be justified against that understanding.

Novelty alone is never value. Difference from existing solutions is not a justification for a design. A capability may depart from a proven pattern only when the product model requires the departure, and the requirement must be stated.

Test: for any new capability, the record of the prior-solution study must exist, and the decision to adopt or depart must be justified against it. Absence of that study is grounds for rejection.

# 54. Value First

Every feature must create measurable value. A feature that cannot name the value it creates does not belong in the product.

The value must fall into one of the following categories:

- it reduces organizer load;
- it improves participant experience;
- it improves business capability;
- it strengthens platform integrity.

A feature that satisfies none of these categories is out of scope, regardless of its other properties.

Test: for any feature, the value category and the measure of that value must be stated. Absence of a nameable category or a nameable measure is grounds for rejection.

# 55. The Product Rule for Every Decision

Every proposed change is subject to a mandatory evaluation. The change must answer each of the following questions:

1. What business object changes?
2. What ownership changes?
3. What architectural boundary changes?
4. What user capability improves?
5. What existing complexity is removed?
6. Why does this belong inside ActivLife Hub?
7. Which existing Product Canon rule does this change rely on, and does it contradict any existing Product Canon rule?

These questions are the gate applied to every change. If any question cannot be answered, the change must not enter the product. The evaluation is required in every case; no change is exempt from it.

# 56. Anti-goals: What ActivLife Hub Must Not Become

ActivLife Hub must never become any of the following. Each anti-goal is stated with the architectural reason it is prohibited.

**Not a social network.** The success measure is real activities, not attention. A design that optimizes engagement contradicts the constraint identified in Chapter 1 and redirects the system away from organizing capability.

**Not a chat platform.** Communication is transport infrastructure (Part VII), subordinate to the domain. Making conversation the product would elevate infrastructure above the business objects it serves.

**Not a ticketing system.** Ticketing handles admission and payment for an already-organized activity. Ticket and Payment are domain objects owned by the Project (Part IV); treating them as the product inverts the ownership model and abandons the organizing function that precedes them.

**Not a project-management application.** Task-and-document tools store intent without carrying operational reality or reducing organizer load (Chapter 1). The Project is the operational center (Chapter 19), not a task list; reducing it to one removes the reason it exists.

**Not a marketplace without organizing.** A marketplace only surfaces existing supply. The platform is infrastructure that produces activities, and its marketplaces are downstream projections of that infrastructure (Part V). A marketplace without the organizing layer solves nothing the platform exists to solve.

**Not an AI chatbot.** AI is an operational layer that changes Project state under human authority (Part II). Advice that creates no operational reality contradicts the definition of the AI layer and produces none of the value the layer exists for.

**Not a collection of disconnected tools.** The failure mode of existing solutions is the point tool, with the organizer left as the integration layer (Chapter 1). The Project unifies operational state; a set of disconnected tools reintroduces the exact failure the architecture is built to remove.

# 57. Final Product Definition

This is the canonical architectural definition of ActivLife Hub, used by the entire Product Canon.

**What it is.** ActivLife Hub is an operating system for organizing real-world activities: a system that holds the operational state of activities and coordinates the work performed against that state, structured as four architectural layers — the AI operational layer, the Project domain, the Organizer Platform, and Platform Services (Part I).

**What it owns.** It owns the operational reality of activities. Each activity's persistent business facts are owned by its Project (Part IV); cross-Project assets are owned by the Organizer Business (Part VI); infrastructure state is owned by Platform Services (Part VII). It does not own the money it records; the processing of money is external (Chapter 2).

**What it does.** It transforms a human intention into a completed, preserved activity through the fixed chain from intent to archive, performs and coordinates the organizing work of that transformation through the AI operational layer under human authority, and preserves the result as a reusable asset of the Organizer Business (Parts II, III, V, VI).

**What it does not do.** It does not optimize attention, does not make conversation or ticketing its product, does not reduce the Project to a task list, does not operate as a marketplace without the organizing layer beneath it, and does not act as an advisory system that produces no operational reality (Chapter 56). It does not permit AI to hold authority over commitments (Chapter 15).

**Where its boundaries lie.** The Project boundary contains exactly one activity and owns its facts. The Organizer Platform boundary holds only cross-Project assets. The Platform Services boundary holds only infrastructure state and is never the source of truth for Project data. The external boundary places money processing outside the platform. The authority boundary separates AI operational work from human decision authority (Chapter 7).

This definition is canonical. Every part of the Product Canon is consistent with it, and any change to the product is measured against it.

## Product Canon Authority

Where implementation, documentation, repository structure, or production behavior contradict this Product Canon, the Product Canon is authoritative until explicitly revised through the Product Canon process. This rule establishes the Product Canon as the architectural source of truth for the platform.

**PART VIII FROZEN.** Part VIII — Architectural Principles is declared frozen. No further changes are permitted unless required to resolve an architectural contradiction.

PART VIII COMPLETE.

---

# PART IX — FUTURE ARCHITECTURE

This Part is the Architectural Decision Register. It is not a roadmap. Each chapter records an architectural decision that has already been accepted and whose realization is intentionally deferred. Nothing speculative or tentative appears here. Chapters 58 through 61 each contain exactly four sections — Decision, Current Status, Future Implementation Boundary, and Architectural Constraints. Chapter 62 defines the rules governing evolution of the Product Canon itself.

# 58. Organizer Business Root Entity

**Decision.** The Organizer Business becomes an explicit root business entity, as defined in Part VI. It is accepted as a first-class cross-Project root, distinct from the Organizer role (Part IV) and from the identity that presently carries ownership.

**Current Status.** The Organizer Business is defined architecturally in Part VI but is not yet established as a distinct realized root. The cross-Project ownership relationship is currently carried by the organizer's identity rather than by a separate business entity.

**Future Implementation Boundary.** The deferred realization establishes the Organizer Business as a distinct entity that holds the Project Portfolio and the cross-Project assets enumerated in Part VI. It does not extend into the business facts of any Project, and it does not alter the Project as the operational center.

**Architectural Constraints.** One Organizer Business owns many Projects. It never owns Project business facts (Chapter 41). It owns only cross-Project assets. The Project Portfolio remains a projection and duplicates no Project data.

# 59. Project Identity

**Decision.** Project Identity becomes a first-class business concept. A Project has an explicit, owned identity as a business fact of the Project.

**Current Status.** Identity exists at the level of the Project as a durable object; Project Assembly establishes the Project as a distinct identifiable object (Part III). The human-facing identity of the activity is not yet a first-class owned business fact and is presently derivable rather than owned.

**Future Implementation Boundary.** The deferred realization makes the activity's identity an explicit, owned business fact of the Project. It does not surface internal vocabulary to users, and it does not place ownership of identity outside the Project.

**Architectural Constraints.** Identity is owned by the Project (Chapter 19). Internal vocabulary stays internal (Chapter 5). Identity is distinct from ownership, which belongs to the Organizer (Part IV), and from the scheduling facts of any Occurrence (Chapter 20).

# 60. Attendance and Check-in

**Decision.** An attendance lifecycle is accepted. It introduces attendance states — checked-in, attended, and no-show — as a lifecycle distinct from admission.

**Current Status.** These attendance states are not part of the domain. The admission state — pending, approved, declined, cancelled — is owned by the Registration (Chapter 21). Completion of participation is presently derived from the Occurrence's date, not from an attendance record.

**Future Implementation Boundary.** The deferred realization introduces attendance as a lifecycle separate from admission. It does not replace or absorb the admission state, and it does not change the ownership of the Registration.

**Architectural Constraints.** Attendance states are distinct from admission states. Attendance is scoped to the Occurrence. The Registration remains the authoritative participation record (Chapter 21), and ownership remains Project → Occurrence → Registration (Part IV relationship rules).

# 61. Occurrence-Scoped Registration and Cancellation

**Decision.** Registration uniqueness and cancellation are scoped to the Occurrence: one Registration per Participant per Occurrence, and cancellation acting at the level of the Occurrence.

**Current Status.** The occurrence-scoped registration model is the accepted domain model (Chapter 21). The complete occurrence-scoped realization of registration uniqueness and of cancellation is accepted but deferred.

**Future Implementation Boundary.** The deferred realization scopes uniqueness and cancellation to the Occurrence. It does not change the ownership of a Registration by its Occurrence, and it does not introduce a registration scope broader than the Occurrence.

**Architectural Constraints.** A Participant holds at most one Registration per Occurrence. Cancellation frees the capacity of that Occurrence. The Registration owns the admission state (Chapter 21), and ownership runs Project → Occurrence → Registration (Part IV relationship rules).

# 62. System Evolution Rules

This chapter defines the rules governing the evolution of the platform's architecture. The rules are normative.

**Architecture changes only through Product Canon revisions.** No architectural change is valid except as a revision of the Product Canon. A change made outside the Product Canon has no architectural authority.

**The repository follows the Product Canon.** Repository structure conforms to the Product Canon. Where the two diverge, the repository is corrected to the Product Canon, not the reverse.

**Production follows the Product Canon.** Production behavior conforms to the Product Canon. Where the two diverge, production is corrected to the Product Canon.

**Documentation follows the Product Canon.** All other documentation conforms to the Product Canon and holds no authority against it.

**Deferred decisions are recorded here first.** Every accepted architectural decision whose realization is deferred is recorded in this register before it is implemented. Implementation of a deferred decision proceeds only from its record here.

**The Product Canon remains the architectural source of truth.** Consistent with the Product Canon Authority rule of Chapter 57, the Product Canon is authoritative over implementation, documentation, repository structure, and production behavior until explicitly revised through the Product Canon process. Every change is evaluated against the existing Product Canon under the rule of Chapter 55.

PART IX COMPLETE.

PRODUCT CANON VERSION 1.0 COMPLETE.
