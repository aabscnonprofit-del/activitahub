# ActivLife Hub — Main Product Document v1.0

## Status

This is the main product document for ActivLife Hub.

It defines what ActivLife Hub is, what it exists to do, how people use it, what the Project means, how AI participates, how Marketplace works, and what rules govern future development.

This document has higher priority than older product, architecture, roadmap, migration, or implementation documents when they contradict the product model described here.

This version also incorporates established product decisions already accepted elsewhere in the repository; it introduces no new product direction.

ActivLife Hub is not a CRM, not an event planner, not a marketplace, not a booking tool, and not a document-management system.

Those may exist inside it.

ActivLife Hub is an AI operating system for creating real-world activities.

---

# 1. Why ActivLife Hub exists

Modern life makes passive consumption easy and real participation hard.

It is easy to scroll, watch, order, and stay home.

It is harder to gather people, move, learn, celebrate, walk, run, play, cook, dance, build, travel, meet neighbors, or create a shared experience.

The missing piece is not demand.

People want to do things.

The missing piece is organization.

Every real activity exists because someone organized it.

Someone chose the date, place, people, cost, materials, risks, communication, reminders, and execution.

That person is the organizer.

ActivLife Hub exists to create more organizers and make existing organizers far more capable.

The platform’s success is measured by real activities that happen in the world.

Not screen time.

Not documents created.

Not dashboards opened.

Not fees collected.

The product succeeds when more real gatherings happen because ActivLife Hub made them easier to create, easier to find, easier to join, and easier to repeat.

---

# 2. What ActivLife Hub actually is

ActivLife Hub is an AI operating system for active human life.

Its core transformation is:

```
idea → understood future activity → executable Project → real-world activity → preserved memory / repeatable model
```

A person may come with a clear plan:

> “I need to organize a birthday party for 20 kids next Saturday.”

Or with a vague desire:

> “I want to surprise my wife.”

Or with an emotional target:

> “I want my friend to feel like a movie star for one evening.”

Or with a standard already-prepared plan:

> “Here is the conference program. Help me execute it.”

ActivLife Hub must support all of these.

The system should not force everyone through the same questionnaire.

If the user already knows what they want, ActivLife Hub accepts the plan and helps execute it.

If the user only knows the feeling, result, or experience they want, AI Discovery helps them clarify it.

The goal is not to make the user fill forms.

The goal is to make the real activity happen.

---

# 3. What people actually buy

People do not buy “planning software.”

They buy capability.

They buy the ability to organize something they otherwise could not organize, or could organize only with too much stress, time, risk, or money.

An organizer buys:

* the ability to take on larger or more complex projects;
* relief from operational overload;
* a working AI team instead of an empty dashboard;
* a complete business operating environment for their event work;
* the ability to look professional from day one;
* the ability to run more activities without hiring a back office.

A participant buys:

* access to real activities;
* a reason to leave the house;
* a clear place to see what is happening;
* a trusted way to join;
* communication, reminders, updates, photos, and history connected to the activity.

A client buys:

* confidence that their desired result will become a real event;
* a clear proposal;
* a transparent budget;
* one place to see what is being prepared;
* a record of what was agreed and delivered.

Vendors and workers buy or receive access to real demand:

* actual projects needing services;
* clear requirements;
* structured coordination;
* less chaotic communication.

ActivLife Hub sells the transformation from intent to reality.

---

# 4. The central object: Project

The Project is the center of the system.

Not the plan.

Not the marketplace listing.

Not the budget.

Not the invoice.

Not the chat.

The Project.

A Project is the digital life of a real-world activity.

It exists before the activity, during the activity, and after the activity.

Before the activity, the Project contains:

* the idea;
* the approved future activity description;
* plan;
* tasks;
* resources;
* roles;
* budget;
* commercial proposal;
* vendors;
* workers;
* participants;
* documents;
* reminders;
* notifications;
* messages;
* updates;
* preparation status.

During the activity, the Project becomes the operational center:

* what is happening now;
* what changed;
* who is responsible;
* what is blocked;
* what must be confirmed;
* what participants need to know;
* what the organizer must decide.

After the activity, the Project does not disappear.

It becomes:

* history;
* photos;
* videos;
* documents;
* outcomes;
* feedback;
* communication archive;
* proof of what happened;
* reusable model for future similar activities.

A completed Project can become the starting point for repeating or improving the activity.

The Project is not only an internal database entity.

It is the persistent place where the life of the activity is stored.

Different users see different sides of the same Project:

* organizer sees the whole Project;
* client sees agreed scope, progress, proposal, updates, and deliverables;
* participants see the public/activity side;
* vendors see their assignments and requirements;
* workers see tasks, time, place, instructions;
* AI sees the full operational state it is allowed to use.

The Project is one place.

Permissions create views.

They do not create separate systems.

The Project is the center of the product. But it is not the only durable entity.

ActivLife Hub has exactly two durable root entities:

* the Organizer Business — the organizer's business itself, which exists between and across all of their activities;
* the Project — one activity.

Nothing else is a root entity.

The Organizer Business owns a portfolio of Projects. Each Project remains the root entity of one activity; the Organizer Business is the durable parent that holds them all.

Each root entity is seen through a workspace. A workspace is a user-facing projection of an entity — never the entity itself:

* the Organizer Business is seen through the Organizer Business Workspace;
* the Project is seen through the Project Workspace.

The Project stays the center of event execution. The Organizer Business is where the organizer's business lives between events.

The internal vocabulary stays internal.

The user never has to see the words the system uses inside itself — Project, Occurrence, Registration, Budget, Public Space.

The user thinks in terms of their idea, their activity, their event, and the date.

The Project is real, but its name is scaffolding.

If an internal concept surfaces in the experience, that is a failure of the product, not of the user.

---

# 5. Two equal user journeys

ActivLife Hub has two primary user journeys.

Both are first-class.

## Journey A — “I want to organize something”

The user wants to create an activity.

They may be:

* a beginner organizer;
* an experienced independent organizer;
* a small event company;
* a teacher, guide, instructor, artist, community leader, parent, or entrepreneur;
* a client who needs something organized.

The system helps them clarify, plan, price, publish, manage, execute, and preserve the activity.

## Journey B — “I want to find something to do”

The user wants to participate.

They may search for:

* beach yoga;
* running group;
* dog walk;
* BBQ;
* neighborhood gathering;
* workshop;
* children’s activity;
* birthday party;
* picnic;
* concert;
* class;
* hike;
* conference;
* community event;
* any other real-world activity.

This is not secondary.

The activities marketplace is one of the main entry points into ActivLife Hub.

The platform exists both to help organizers create activities and to help people find real activities worth joining.

---

# 6. Activities Marketplace

The Marketplace is not only a vendor marketplace.

It is also a marketplace of real activities.

This is essential.

Activities Marketplace is where people discover what is happening, what they can join, what is being prepared, and what may happen if enough people are interested.

Activities can include:

* yoga;
* beach yoga;
* running groups;
* walking groups;
* dog walks;
* BBQs;
* picnics;
* neighborhood parties;
* family events;
* birthday parties;
* weddings;
* conferences;
* workshops;
* concerts;
* classes;
* games;
* trips;
* masterclasses;
* community meetings;
* immigrant community gatherings;
* hobby clubs;
* sports fan events;
* alumni events;
* cultural gatherings.

The marketplace should be organized around human scenarios, not generic abstract categories.

People do not think:

> “I need category 17.”

They think:

> “What can I do this weekend?”

> “Where can I meet people like me?”

> “What can I do with my child?”

> “Where can I go with my dog?”

> “What is happening near me?”

> “Can I join something interesting?”

Activities Marketplace creates demand.

Organizer Workspace and AI Project tools help supply meet that demand.

The Activities Marketplace and the rest of the platform are presented in the platform's supported languages — English, Spanish, French, Russian, German, and Portuguese — maintained at parity on the surfaces that matter.

---

# 7. Vendor / Resource Marketplace

ActivLife Hub also needs a supply marketplace.

Activities require resources.

A real activity may need:

* venue;
* instructor;
* photographer;
* musician;
* entertainer;
* catering;
* equipment rental;
* temporary workers;
* transportation;
* decorations;
* printed materials;
* insurance;
* permits;
* supplies;
* food;
* safety staff;
* cleaning;
* security;
* technical support.

The organizer should not have to rebuild a supply chain from scratch every time.

When the Project knows what must happen, it should also know what resources are needed.

The platform should help source those resources inside the Project.

The vendor/resource marketplace exists to serve Projects.

It is not a separate marketplace bolted onto the side.

It is supply matched to real Project needs.

---

# 8. Discovery

Discovery is not a form.

Discovery is the process by which ActivLife Hub understands what the user wants to make real.

Discovery adapts to the person.

If the user already knows exactly what they want, Discovery should ask as few questions as possible.

If the user provides an existing plan, contract, program, schedule, or event description, the system should accept it and move toward execution.

If the user only knows the desired emotion, result, atmosphere, or memory, Discovery becomes a conversation.

The goal of Discovery is to understand:

* what should happen;
* who it is for;
* what emotion or result matters;
* what constraints exist;
* what must not happen;
* how real-world execution should feel;
* whether the idea is an event, an activity, a project, a fantasy scenario, or out of scope.

Discovery must never ask unnecessary questions.

Discovery must never force the user to become a data-entry clerk.

Discovery must not create fake certainty.

If the system does not know enough, it asks.

If it knows enough, it proceeds.

The AI Organizer makes this decision — whether Discovery is needed at all, or whether enough is already known to go straight to planning.

Screens follow the same rule.

A screen exists only when the user must compare, choose, confirm, visualize, or pay.

Everything else — especially gathering information — belongs to conversation, or to the AI.

A screen that exists only to collect data is wrong.

---

# 9. AI Organizer

The AI Organizer is the first intelligence layer.

The AI Organizer is the primary interface of ActivLife Hub.

The organizer primarily works with the AI Organizer — not with internal modules. Discovery, Planning, Assembly, Runtime, Budget, Marketplace, Communication, and Workspace are services the AI Organizer coordinates on the organizer's behalf; they are not independent systems the organizer must operate one by one.

The AI Organizer's role does not end at the first request. It orchestrates the specialized AI agents throughout the entire life of the Project, and brings their results back to the organizer as decisions to make.

Its job is to understand the person before deterministic systems act.

The required flow is:

```
User → AI Organizer → Understanding → Verdict → Deterministic execution
```

Not:

```
User → form → classifier → category → template → plan
```

The AI Organizer decides:

* what the user probably means;
* what information is missing;
* whether discovery is needed;
* whether interpretation is needed;
* whether a plan can start;
* whether the request is infeasible;
* whether the request is out of scope.

In particular, the AI Organizer decides whether Discovery is needed at all, or whether enough is already known to proceed directly to planning. The organizer is never sent through Discovery unnecessarily.

The AI Organizer does not price, schedule, source vendors, charge money, or make commitments.

It understands and routes.

The deterministic systems execute only after the AI Organizer has produced a verdict.

The AI Organizer may propose “what should happen,” but the user must approve it before planning begins.

No plan before approved intent.

Across the whole lifecycle, the AI Organizer coordinates the work but never owns the outcome: the human remains responsible for every commitment and every irreversible decision.

---

# 10. Future Event Description

Future Event Description is the approved description of the future activity.

It is the bridge between Discovery and Planning.

It should contain enough information for the system to plan responsibly:

* what the activity is;
* what should happen;
* who it is for;
* expected scale;
* location or location needs;
* timing if known;
* desired result;
* emotional tone;
* constraints;
* resources already known;
* things the user cares about;
* things the user wants to avoid.

FED is not a category.

FED is not a template.

FED is not a form.

FED is the user-approved description of the activity that should exist.

---

# 11. Planning

Planning does not invent a different activity.

Planning transforms the approved Future Event Description into a structured operational model.

Planning is preceded by the creative work that gives the activity its meaning.

The creative stage reasons from the client's material to a concept to a narrative, and conceives the concept from the desired experience — not from a catalog.

It does not offer ready-made venues, packages, or templates as the concept, and it is not constrained by budget; budget is a later production concern, never a creative gate.

Once the concept and the Future Event Description are approved, planning turns them into the operational model.

The Planning Engine should produce EventPlanV2:

* experience design;
* itinerary;
* logistics;
* resources;
* roles;
* staffing;
* risks;
* safety considerations;
* contingencies;
* cost estimate;
* feasibility statement;
* assumptions;
* public-safe description.

Planning is intention-first.

It should not depend on category templates as the source of truth.

If the user wants a standard birthday, the system may use known patterns.

If the user wants something unusual, the system should still reason from the desired experience.

The output of planning is not “a document.”

It is a model from which the Project can be built.

---

# 12. Project Assembly

EventPlanV2 must become a Project.

This means the system must transform the plan into operational reality.

From EventPlanV2, the system should derive:

* requirements;
* work packages;
* tasks;
* resources;
* roles;
* staffing needs;
* budget lines;
* vendor needs;
* documents;
* reminders;
* participant-facing information;
* public activity page;
* operational checkpoints;
* execution status;
* post-activity history.

This is one of the most important product rules:

A plan is not enough.

The user is not buying a plan.

The user is buying help making the activity happen.

Therefore, every meaningful element of the plan must become part of the Project.

---

# 13. Organizer Workspace

Organizer Workspace is the organizer’s command center.

It is not a dashboard of unrelated modules.

It is the live working view of the Project.

When the organizer opens it, the first question should be:

> What changed since I was here last?

The workspace should surface:

* what needs a decision;
* what is waiting;
* what is blocked;
* what changed;
* what is risky;
* what is due soon;
* who needs an answer;
* what AI has prepared;
* what can be approved;
* what can be delegated;
* what participants need to know;
* what vendors need to confirm.

The organizer should not hunt across screens.

The system should bring the next important thing to them.

The Workspace exists to reduce organizer load.

This is the Project Workspace — the organizer's view of one Project. It is a projection of the Project, not the Project itself.

The organizer's business has its own workspace: the Organizer Business Workspace — the organizer's view of the Organizer Business, holding the leads, clients, templates, calendar, and the money across all their Projects. The same principle holds: a workspace is a projection of an entity, never the entity itself. Both are used through the one AI Organizer.

---

# 14. Participant Experience

Participants do not need to understand the internal architecture.

They should see:

* what the activity is;
* when it happens;
* where it happens;
* what to expect;
* what to bring;
* who is organizing it;
* price if applicable;
* capacity if applicable;
* reminders;
* updates;
* changes;
* communication;
* photos and memories after the activity.

Before the activity, participants see what is being prepared and what they need to know.

During the activity, they receive updates if needed.

After the activity, they can return to the Project’s public side to see photos, videos, memories, feedback, and future related activities.

The participant experience is part of the Project.

It is not a separate product.

---

# 15. Client Experience

Some Projects are ordered by a client.

The client may be a parent, couple, company, community group, school, nonprofit, or individual.

The client sees the Project differently from the organizer.

They need:

* clear understanding of what will happen;
* proposal;
* budget;
* decisions requiring approval;
* progress updates;
* payment status;
* important documents;
* history of agreed decisions;
* final result.

If a decision is made in the Project, it is recorded in the Project.

External calls and messages may happen, but commitments should be confirmed inside the Project so the Project remains the source of truth.

Commitments require explicit human authorization.

Anything that spends money, creates a legal obligation, or cannot be undone requires a human to authorize it.

AI may prepare and propose, but AI never authorizes a commitment.

A proposal becomes a commitment only when the client accepts it (and pays any required deposit) — the system never marks that gate as approved on its own.

Issued artifacts are immutable.

Once a proposal is sent, or an invoice or payment is issued, that artifact is a frozen record.

The live Project keeps evolving, but issued documents do not change retroactively — they stand as the record of what was agreed.

---

# 16. Vendor and Worker Experience

Vendors and workers participate in the Project only where relevant.

They should see:

* what they are responsible for;
* timing;
* location;
* requirements;
* documents;
* payment or quote status where relevant;
* messages related to their work;
* changes affecting them.

They should not see the whole Project unless they have permission.

Their view is a projection of the same Project.

---

# 17. Public Space

Public Space is the public-facing side of a Project.

It may show:

* activity description;
* date and time;
* location;
* organizer;
* photos or visual material;
* registration;
* capacity;
* price;
* updates;
* future occurrences;
* related activities.

Public Space is not the Project.

It is a projection of the Project.

The organizer controls when a Project becomes public.

---

# 18. Occurrences

A Project can have one or many occurrences.

For example:

* one birthday party;
* weekly yoga class;
* monthly workshop;
* recurring running group;
* conference with multiple sessions;
* seasonal community event.

An occurrence is a concrete dated instance of the Project.

The Project is the larger container.

Occurrences are dates or instances inside it.

---

# 19. Execution

Execution is the stage where the Project is no longer preparation.

It is happening.

During execution, the system should support:

* real-time coordination;
* status tracking;
* issue handling;
* reminders;
* last-minute changes;
* participant communication;
* vendor coordination;
* staff coordination;
* safety checks;
* contingency activation.

AI should assist.

The human remains responsible for commitments and judgment.

The system must help the organizer run larger events without personally tracking every moving part.

---

# 20. After the Activity

Completion is not deletion.

After an activity, the Project continues.

It may contain:

* photos;
* videos;
* attendee memories;
* messages;
* documents;
* feedback;
* organizer notes;
* financial summary;
* vendor performance;
* lessons learned;
* what worked;
* what should be changed;
* repeat option;
* template for similar activity.

This matters because real life does not end at checkout.

People return to memories.

Organizers reuse experience.

Communities grow through repeated occasions.

ActivLife Hub should preserve the life of the activity, not just the transaction.

---

# 21. AI Architecture

ActivLife Hub should not rely on one universal AI brain.

It should use specialized AI agents by role.

Examples:

* Discovery Agent — understands the person and clarifies intent;
* Planning Agent — transforms FED into EventPlanV2;
* Budget Agent — prices scope and options;
* Commercial Agent — creates proposal and client-facing materials;
* Marketplace Agent — helps source vendors, workers, venues, and resources;
* Workspace Agent — monitors Project state and surfaces what needs attention;
* Communication Agent — prepares messages, reminders, updates;
* Execution Agent — helps during the live activity;
* Review / Memory Agent — helps after completion.

These agents are not independent products the organizer operates. The AI Organizer orchestrates them across the entire life of the Project. Discovery, Planning, Assembly, Runtime, Budget, Marketplace, Communication, and Workspace are services the AI Organizer coordinates on the organizer's behalf — not independent, user-facing systems. The organizer works with one intelligence, the AI Organizer, and it directs the rest.

This one AI Organizer operates across both root entities — the Organizer Business and the Project — surfacing what needs attention in each. There is no second, separate "Business AI."

AI agents must not override human authority.

The human remains responsible for every commitment and every irreversible decision. The AI Organizer prepares and coordinates; it never authorizes them.

AI works.

Human decides.

---

# 22. Organizer Business System

ActivLife Hub must eventually provide everything an independent organizer needs to operate an event business.

This includes functionality similar to what tools like HoneyBook provide when useful:

* client management;
* project pipeline;
* proposals;
* contracts;
* invoices;
* payments;
* scheduling;
* documents;
* communication;
* file storage;
* workflow automation;
* business visibility.

But ActivLife Hub is not a HoneyBook clone.

HoneyBook-like functionality exists only because it supports the organizer journey from idea to completed real-world activity.

The goal is not to become a generic CRM.

The goal is that an organizer should not need to leave ActivLife Hub to run their event business.

The Organizer Business is the root entity that owns these business-level assets:

* CRM;
* leads;
* clients;
* templates;
* the business calendar;
* the subscription;
* certification;
* the Academy;
* AI business guidance;
* Stripe Connect (optional — see below);
* the portfolio of Projects.

The Project owns what belongs to one activity: its Runtime, timeline, budget, participants, tasks, registration, Public Space, event history, and the Completed Project. The Organizer Business never re-owns these; it holds the portfolio and the cross-Project assets.

Stripe Connect is optional. It is required only for organizers who want to accept payments through ActivLife Hub. Free activities do not require Stripe Connect.

---

# 23. Academy and Organizer Development

ActivLife Hub also helps create new organizers.

The platform should support:

* beginners who want to organize their first activity;
* people who need training;
* certification;
* organizer standards;
* practical education;
* business readiness;
* safety and trust;
* professional growth.

The world needs more organizers.

Academy and certification exist to increase the number and quality of organizers.

They are not separate from the product.

They feed the supply side of the Activities Marketplace.

Certification gates organizer access.

An organizer can plan, but the professional organizer platform — publishing and running activities as a business — is unlocked only after certification.

Certification both protects participants and defines who may operate as an organizer.

Two credentials exist, and they stack.

Verified proves identity. Certified proves craft. An organizer may hold either or both.

Trust and safety are the most protected principles.

Organizers create trust, and that trust is shared across the platform — one organizer's conduct affects the standing of all.

The organizer standard is built on prevention over recovery: organizers are taught to prevent problems, not only to react to them.

When any decision conflicts with safety or trust, safety and trust win.

---

# 24. Business Principles

ActivLife Hub must make money in a way that supports the mission.

The platform should not punish organizers for creating value.

Organizer/client money should remain primarily between the client and the organizer unless ActivLife Hub is providing a specific paid service.

The platform can earn through:

* one-event planning license;
* organizer subscription;
* certification;
* marketplace services;
* optional platform-brokered resources;
* premium tools;
* other value-creating services.

ActivLife Hub should not become a tax on organizer-owned relationships.

If the organizer creates value, the platform should help them keep and grow that value.

The product boundary is complexity, not event size.

A single organizer running one large activity stays inside the core product.

The line where an Enterprise offering begins is the complexity of running an organization's entire event operation — many organizers, teams, and ongoing operations — not the headcount of any single event.

The size of an individual activity is never artificially limited.

---

# 25. Competition First Principle

Before adding any significant capability, ActivLife Hub should study how leading products solve the same problem.

If a competitor has already solved a problem well, the platform should learn from it.

If HoneyBook, Eventbrite, Meetup, Airbnb Experiences, Partiful, Peerspace, Thumbtack, Upwork, Calendly, Notion, Monday, Asana, or another relevant product has a proven pattern, ActivLife Hub should understand it before inventing an alternative.

The platform should copy nothing blindly.

It should either:

* use a proven pattern because it works;
* or design something better because ActivLife Hub’s product model requires it.

No invention for ego.

No novelty without value.

---

# 26. Value First Principle

Nothing enters ActivLife Hub unless it makes the product better.

Every feature, document, module, screen, workflow, AI agent, table, or process must answer:

> What value does this create?

The value may be:

* reducing organizer workload;
* helping participants find activities;
* increasing trust;
* improving execution;
* reducing risk;
* improving communication;
* making pricing clearer;
* making activity creation faster;
* making the Project more complete;
* removing confusion;
* simplifying architecture.

If the value is not clear, the thing should not be added.

If a document no longer helps the product, it should be archived or removed.

If a feature adds work for the organizer, it is suspect by default.

---

# 27. What ActivLife Hub must not become

ActivLife Hub must not become:

* a generic CRM;
* a generic event-management dashboard;
* a marketplace without operational support;
* a ticketing site only;
* a social network that optimizes attention;
* a form-heavy planner;
* a template checklist library;
* a vendor directory;
* a project-management tool with event branding;
* an AI chatbot that gives advice but does not create operational reality.

The product must always return to the same question:

> Does this help a real activity happen?

If not, it does not belong.

---

# 28. The product rule for every future decision

Every future decision must pass these checks:

1. Does it help create, find, run, or preserve real-world activities?
2. Does it reduce organizer intellectual or operational load?
3. Does it keep the human in authority?
4. Does it support Project as the center?
5. Does it improve the journey from idea to real activity?
6. Does it respect participants as first-class users?
7. Does it improve the Activities Marketplace or the organizer’s ability to supply it?
8. Does it avoid unnecessary forms and screens?
9. Does it follow Competition First?
10. Does it follow Value First?

If the answer is no, the feature, document, or architecture change should not proceed.

---

# 29. Final definition

ActivLife Hub is the operating system that helps people create, find, join, run, and remember real-world activities.

It creates more organizers.

It makes existing organizers stronger.

It turns ideas into Projects.

It turns Projects into real activities.

It turns completed activities into memory, knowledge, and repeatable community life.

AI does the operational work.

Humans decide.

The Project is the center.

Real activities are the measure of success.
