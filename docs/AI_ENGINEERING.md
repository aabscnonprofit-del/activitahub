# AI in Modern Work Systems — Engineering Knowledge Extraction (Part 9)

> **Purpose:** reconstruct how AI has been integrated into work systems (rules/expert systems →
> ML → LLMs → copilots/agents → RAG → tool-use), determine with engineering rigor where AI
> *creates value* vs *causes problems*, and define the decision boundary — where AI should
> **advise**, where it may **decide with human confirmation**, and where it must **never decide** —
> then map that boundary precisely onto each ALH module (M1–M8).
> **Status:** research / writing only. No code, no architecture redesign, no implementation. This
> document maps onto the **existing** ALH architecture; it does not propose to rebuild it.
> **Method:** study the *evolution* of the idea, not the products. Origin → problem → why it
> changed → whether it improved. Independent judgment; challenge hype; credit ALH where its
> existing posture is already stronger; flag uncertainty rather than overstate AI capability.
> **Scope boundary:** engineering knowledge extraction only — NOT competitor analysis, feature
> comparison, market sizing, or UI design.
> **ALH facts this rests on (from existing docs):** `OPE_AI_ORGANIZER_ARCHITECTURE_V1.md`
> (AI-first verdict + understanding, deterministic-after, WSH/FED approval, degraded-mode
> deterministic fail-safe), `MULTI_AGENT_ARCHITECTURE_PRINCIPLE.md` (role-separated agents on a
> shared Project), `OPE_MODULAR_PIPELINE_PRINCIPLE.md` (replaceable modules behind interfaces),
> `OPE_OUTPUT_CONTRACT_V1.md` (`_meta: { deterministic: true }`, deterministic numbers, explicit
> provenance), `TRUST_AND_VERIFICATION_ARCHITECTURE.md` (signals not proof; patterns over events).
> **Provider grounding note:** AI-capability claims below are grounded against current
> Claude/Anthropic platform behavior (the swappable AI provider seam ALH describes). Where a
> capability is genuinely uncertain or model-dependent, it is FLAGGED rather than asserted.

---

## 1. How AI got integrated into work systems — the evolution

This is the reconstruction the benchmark asks for: not "AI is here now," but *how* each layer
arrived, what problem it solved, and what new problem it created. Each layer did not replace the
last so much as wrap it — and crucially, **none of the later layers removed the engineering need
for the earliest one** (deterministic, verifiable computation). That continuity is the whole
argument for ALH's shape.

### 1.1 Rule engines / expert systems (1970s–1990s)
- **Origin / problem.** Encode an expert's decision procedure so a machine can apply it
  consistently, at scale, without the expert in the loop. MYCIN, XCON, business rule engines.
- **What it gave us.** **Determinism and auditability.** A rule fires or it doesn't; you can
  point at *why*. Same input → same output. This is exactly the property ALH's deterministic
  engine (M2 frozen core, M3) preserves.
- **What broke it.** Rules don't scale to messy natural-language reality. Every edge case is a
  new rule; the rule base becomes unmaintainable ("knowledge acquisition bottleneck"). It cannot
  read "I want the best day of my life" — it can only match patterns it was told about.
- **Verdict on the *idea*:** the determinism/auditability property is **permanent and correct**;
  the brittleness on open input is what later layers exist to fix. ALH did not throw this away —
  it kept the deterministic core and put intelligence *in front of* it, not *inside* it.

### 1.2 Classical machine learning (1990s–2015)
- **Origin / problem.** Stop hand-writing rules; *learn* the decision boundary from labeled data.
  Spam filters, credit scoring, recommenders.
- **What it gave us.** Handles fuzziness and scale that rules can't; improves with data.
- **What broke it.** Non-determinism and opacity enter the system. A model outputs a *score*, not
  a traceable reason. Drift, bias, and silent failure become real. You can no longer always point
  at *why* — only at *how often it's right on average*. This is the first place "verify, don't
  trust" becomes an engineering requirement rather than a slogan.
- **Verdict:** value is real for classification/ranking/anomaly-surfacing; the cost is the loss of
  per-decision traceability. The right response (which ALH applies) is to keep ML/AI on
  **advisory/ranking** surfaces and keep **binding decisions** on verifiable rails.

### 1.3 Deep learning + foundation models → LLMs (2015–2022)
- **Origin / problem.** Learn general representations; then generate, not just classify. LLMs can
  read and produce free-form natural language — the thing rule engines never could.
- **What it gave us.** The single capability ALH actually needs at the front door:
  **extracting structure from messy human input** and **drafting plausible language**. "Birthday
  party for 12 kids in our backyard Saturday, $300" → structured intent. This is genuine,
  load-bearing value.
- **What broke it.** **Hallucination, non-determinism, unverifiable output, no inherent provenance.**
  An LLM will confidently assert a price, a vendor, a fact that is simply invented. It does not
  know what it doesn't know. Output is fluent regardless of correctness — which makes silent error
  *more* dangerous than in classical ML, because the failure looks like success.
- **Verdict:** transformative for *understanding and drafting*, disqualifying for *binding
  computation* (money, quantities, contracts) unless the output is validated against something
  deterministic. This is the exact line ALH draws.

### 1.4 Copilots / assistants (2022–2023)
- **Origin / problem.** Put the LLM beside the human in their existing workflow — suggest, draft,
  autocomplete — with the human always in the loop.
- **What it gave us.** High value at low risk *when the human reviews every output before it
  binds*. Drafting comms, summarizing state, suggesting next steps.
- **What broke it.** **Automation bias and over-trust.** Humans rubber-stamp confident output;
  the "human in the loop" degrades into a "human on the loop" who approves without reading.
  Copilots bolted onto **mutable application state** can also silently mutate that state — and
  then the audit trail records the AI's edit as if it were the human's intent.
- **Verdict:** the copilot *pattern* is correct (advise, human confirms); the common
  *implementation* (AI writing directly to live, mutable state) is where it goes wrong. ALH's
  answer — AI proposes a draft, the human approves *intent*, deterministic systems execute — is
  the disciplined version of the copilot pattern.

### 1.5 RAG — retrieval-augmented generation (2023–)
- **Origin / problem.** Ground the LLM in real, current, source documents instead of its
  parametric memory, to cut hallucination and add citations.
- **What it gave us.** Better factuality *and* provenance — the model can show *where* an answer
  came from. Strong fit for search/retrieval and "explain the current state from the record."
- **What broke it.** RAG reduces but does not eliminate hallucination — the model can still
  misread, over-generalize, or cite a retrieved passage that doesn't actually support the claim.
  Retrieval quality becomes a new failure surface. Provenance is only as good as the
  verify-the-citation step (which is frequently skipped).
- **Verdict:** the right tool for ALH's PSA ("what's happening with this project?") and evidence
  summarization (M7) — **but only with citations back to the Project record, and only as a
  reading of state, never as a writer of state.**

### 1.6 Agents + tool-use (2023–)
- **Origin / problem.** Let the model *act* — call tools, take multi-step trajectories, pursue a
  goal autonomously rather than answer one prompt.
- **What it gave us.** Real leverage on multi-step, hard-to-fully-specify tasks (research,
  drafting, fan-out reads).
- **What broke it.** The cost-of-error explodes. An agent that can *act* can take irreversible,
  unverifiable actions (send a message, contract a vendor, mutate the plan) on the basis of a
  hallucinated intermediate step — and bury the error several tool calls deep where no human ever
  sees it. **Erosion of auditability** is the systemic risk: the system "did something" and nobody
  can reconstruct why.
- **Verdict — and the key engineering principle this benchmark should adopt:** an agent is the
  right tier *only* when (a) the task is genuinely multi-step and underspecified, (b) the value
  justifies the cost, (c) the model is actually capable at it, and **(d) errors are catchable and
  recoverable** (review, rollback, tests). When (d) fails — irreversible binding actions on
  external parties or money — agents must be gated behind explicit human confirmation, or kept off
  the decision entirely. ALH's "AI is the decider of *meaning*, never the executor of *action*"
  is precisely this rule, drawn correctly.

**Through-line.** Every layer added reach and subtracted verifiability. The mature engineering
response is not "use the newest layer everywhere" — it is to put each layer **only where its
verifiability profile fits the cost of error.** ALH's architecture is an explicit encoding of that
response, predating the hype cycle's tendency to bolt agents onto everything.

---

## 2. Where AI creates value vs causes problems (engineering, not hype)

### 2.1 Where AI genuinely creates value
| Capability | Why it's real | ALH surface |
|---|---|---|
| **Extracting structure from messy human input** | The one thing rules/ML couldn't do; LLMs do it well | M1 Discovery (raw text → understood intent) |
| **Drafting language** | Cheap, reviewable, human approves before it binds | M1 (WSH/FED draft), M4 (comms drafts), M7/M8 (summaries) |
| **Summarizing state** | Compresses a large record into a human-readable read | M4 (PSA: project status), M7/M8 |
| **Suggesting options / surfacing directions** | Hypotheses for a human to choose, not selections | M1 (`possibleDirections`), M4 (next steps), M5 (candidate ranking) |
| **Surfacing risk / anomalies** | Pattern-spotting over signals; flags for human review | M4 (risk surfacing), M6 (anomaly surfacing) |
| **Search / retrieval (RAG)** | Grounded, cited reading of the record | M4 PSA, M7 evidence retrieval |

The common shape: **AI produces a proposal or a reading; a human or a deterministic system makes
the binding decision.** Every value cell above is non-binding by construction.

### 2.2 Where AI causes problems
| Failure mode | Mechanism | Where it would hurt ALH most |
|---|---|---|
| **Hallucination** | Fluent invented facts/figures | Any binding number → M2/M3 (must stay deterministic) |
| **Non-determinism** | Same input → different output | Anything requiring reproducibility/audit → M2/M3 |
| **Unverifiable output** | No traceable "why" | IR that can't be validated → violates M2 contract |
| **Automation bias / over-trust** | Humans approve confident output unread | M1 FED approval, M5 selection, M4 plan changes |
| **Silent error** | Failure looks like success | Agentic M4/M6 if allowed to act unsupervised |
| **Eroded auditability** | Multi-step agent action with no reconstructable trace | M4–M6 if AI writes state directly |
| **Prompt injection** | Input treated as instruction | Any module that lets free text steer privileged action |

### 2.3 The non-obvious ones (challenging the hype)
- **"Human in the loop" is not a safeguard by itself.** It degrades into rubber-stamping under
  confident output. The real safeguard is making the human approve *intent* (something they can
  actually judge) rather than *output* (something they can't fully verify) — which is exactly what
  ALH's WSH/FED approval does: the human approves "what should happen," not the engine's numbers.
- **Determinism ≠ correctness, but it ≠ optional either.** A deterministic engine can be wrong;
  but it is *reproducibly, inspectably, fixably* wrong. A non-deterministic one is wrong in a way
  you cannot reconstruct. For money/quantities/contracts, reconstructability is the requirement.
- **RAG does not "solve" hallucination** — it reduces it and adds citations *that still must be
  verified*. Treating RAG output as ground truth is the new over-trust.

---

## 3. The decision boundary — advise / decide-with-confirmation / never

The central engineering output of this part. Three tiers, by the **cost and reversibility of being
wrong** crossed with the **verifiability of the AI output**:

- **AI ADVISES** — AI output is a proposal/draft/ranking/summary. Nothing binds without a separate
  human or deterministic step. Use wherever error is cheap, caught, and reversible.
- **AI DECIDES WITH HUMAN CONFIRMATION** — AI proposes a *specific* binding outcome, but a human
  must explicitly confirm before it takes effect. Use for consequential-but-reversible decisions,
  and for *all irreversible actions on external parties or money*. The confirmation must be of a
  thing the human can actually judge (intent, a named candidate) — not a wall of generated detail.
- **AI MUST NEVER DECIDE** — the decision must be deterministic and verifiable, full stop. Use for
  binding computation (money, quantities, schedules, contractual terms) and for anything that must
  be reproducible and audited. AI may *feed* these systems (as a validated provider) but may not
  *be* them.

### 3.1 Engineering guardrails that make the boundary hold
1. **Verifiability over trust.** AI output that crosses into a deciding/feeding role must be
   validatable against a deterministic contract (e.g., M2's IR validated against the frozen
   engine's expectations). If it can't be validated, it stays advisory.
2. **Provenance / traceability.** Every AI-influenced artifact carries where it came from (which
   agent, which inputs, draft vs approved). ALH's `_meta`/explicit-provenance discipline extends to
   AI: a drafted field is marked drafted; an approved FED is marked human-approved.
3. **Confirmation of irreversible actions.** Anything that can't be undone (contracting, sending,
   executing, accepting results) requires explicit human confirmation — never auto-fired by an
   agent. Reversibility is the deciding criterion for "dedicated gated action vs free action."
4. **Keep AI out of deterministic transforms.** The frozen engine (M2 core) and M3 assembly must
   not have an LLM in the path of the number/structure. AI can suggest *inputs*; it cannot *be* the
   transform.
5. **Fail safe, not fail silent.** When AI is unavailable or returns invalid output, fall back to a
   conservative deterministic behavior that does **not** fabricate (ALH degraded mode: bias to
   `discovery_required`, never invent a WSH/plan). The fallback is for safety, not simulation.
6. **Inputs are data, never instructions.** No free-text field may steer a privileged action
   (anti–prompt-injection). The AI layer reads inputs and emits proposals; it triggers no side
   effects itself.
7. **Confirm the judgeable thing.** Put the human approval on *intent* (FED/WSH) and on *named
   selections* (a chosen candidate), where a person can exercise real judgment — not on raw model
   output they will rubber-stamp.

---

## 4. Per-module classification — advise / decide-with-confirmation / never

The benchmark's required table. "AI today" reflects the existing ALH posture from the cited docs;
"AI never" lists what must stay deterministic/human in that module.

| Module | AI ADVISES | AI DECIDES w/ human confirmation | AI MUST NEVER decide | Existing-doc basis & guardrails |
|---|---|---|---|---|
| **M1 Discovery → FED** | Interpret meaning; surface `possibleDirections`; name missing info; ask real discovery questions; **draft** the WSH/FED | Propose a *specific* FED/verdict that the **human must approve** (approval = of intent, not output) | Decide that intent is "final"; fabricate a FED; assert an unstated outcome as fact | `OPE_AI_ORGANIZER_ARCHITECTURE_V1.md`: AI is sole judge of *meaning/readiness*, emits verdict; human approves WSH/FED; degraded mode → `discovery_required`, never invents; inputs-as-data, no side effects |
| **M2 OPE / IR** | Be **one swappable provider** that emits IR | — (an AI provider's IR is *accepted* only after it **validates against the deterministic contract**; validation is the decision, not the AI) | Bypass verification; produce binding numbers/structure that aren't validated; *be* the transform | Provider seam + "AI-first with deterministic fallback"; frozen deterministic engine; `_meta:{deterministic:true}`; hard/unsafe cases routed to **certified humans** |
| **M3 Assembly** | — | — | **Anything.** M3 is pure deterministic — no AI in the path | `OPE_MODULAR_PIPELINE_PRINCIPLE.md` / `OPE_OUTPUT_CONTRACT_V1.md`: deterministic assembly, reproducible output |
| **M4 Workspace** | Draft comms; summarize project state (PSA, RAG-cited); suggest next steps; surface risk | Propose a next step / comm the organizer **confirms before it sends or binds** | Auto-change the plan; auto-accept results; auto-send external comms; mutate Project state unsupervised | `MULTI_AGENT_ARCHITECTURE_PRINCIPLE.md`: PSA explains state to organizer, does not run planning/sourcing; human working environment |
| **M5 Marketplace** | Rank/match candidate vendors/workers/resources | Present a ranked shortlist; **human selects**; selection confirmed before any commitment | Auto-contract; auto-commit money; treat a ranking as a binding choice | Marketplace maps requirements → real supply; selection is human; contracting is irreversible → confirmation tier |
| **M6 Execution** | Reminders; surface anomalies/risks against plan | Propose a corrective action the human **confirms** | Auto-execute; auto-mutate delivery state; act on a hallucinated anomaly | Execution *tracks* actual delivery; AI observes/flags, never acts |
| **M7 Evidence** | Summarize evidence; retrieve with citations (RAG) | — | Decide what counts as proof; alter/curate the evidence record; assert uncited conclusions | Evidence is the verifiable record; AI reads/summons, never authors the truth |
| **M8 Closure** | Summarize learnings/outcomes | — | Decide closure/outcomes as fact; fabricate a result not in the record | Closure summarizes from the record; trust signals are **patterns not single events** (`TRUST_AND_VERIFICATION_ARCHITECTURE.md`) |

**Reading of the table.** AI is broad on M1 and M4 (understanding, drafting, summarizing,
surfacing — all reviewable, all cheap to be wrong about), narrow and gated on M5/M6 (because the
binding actions are irreversible), an *accepted-only-after-validation provider* on M2, and entirely
absent from the path of M3's deterministic transform. This is a coherent, defensible mapping — the
AI footprint shrinks exactly as the cost-of-error and irreversibility rise.

---

## 5. Extraction matrix

Each idea answered against the eight required questions, compressed into the matrix the benchmark
specifies (problem · origin · universal? · ALH today · owning module · verdict). Conceptual
solution and ALH-better judgment are folded into the verdict cell.

| Idea | Problem it solves | Origin | Universal? | ALH today | Owning module | Verdict (+ trade-off) |
|---|---|---|---|---|---|---|
| **Rule/expert determinism** | Consistent, auditable decisions | 1970s expert systems | Yes — every system needs a verifiable core | Frozen deterministic engine; `_meta.deterministic` | M2 core, M3 | **ALREADY SOLVED BETTER** — ALH keeps it as the core, not a legacy artifact. Trade-off: brittle on open input → fixed by M1 AI front door |
| **ML ranking/classification** | Fuzzy matching at scale | 1990s–2010s ML | Yes for matching/anomaly | Candidate ranking, signal patterns | M5, M6, trust | **ADOPT (advisory only)** — ranking yes; binding no. Trade-off: opacity, so humans select |
| **LLM structure extraction** | Read messy human language | LLMs 2018– | Yes for any NL intake | M1 understands raw text → verdict + understanding | M1 | **ALREADY SOLVED BETTER** — AI judges *meaning*, deterministic-after. Trade-off: model dependency → degraded fail-safe |
| **LLM drafting** | Produce reviewable language cheaply | LLMs | Yes | WSH/FED draft, comms, summaries | M1, M4, M7, M8 | **ADOPT** — always human/deterministic-confirmed before binding |
| **Copilot (advise, human confirms)** | Keep human in loop | 2022– | Yes | PSA + workspace assists | M4 | **ALREADY SOLVED BETTER** — confirm *intent*, not output; never auto-mutate state. Trade-off: automation bias → mitigated by intent-level approval |
| **RAG (grounded retrieval + citations)** | Cut hallucination; add provenance | 2023– | Yes for "explain the record" | PSA-style status reading | M4 | **INVESTIGATE FURTHER** — strong fit for M4/M7 PSA & evidence reads, **iff citations point to Project record and it never writes state**. Trade-off: retrieval-quality failure surface |
| **Agents / tool-use** | Multi-step autonomous action | 2023– | No — only where errors are recoverable | AI decides meaning; deterministic executes; multi-agent on Project | cross-module | **INVESTIGATE FURTHER** — bounded, role-separated, never irreversible-without-confirmation. Trade-off: auditability erosion → forbidden on binding actions |
| **AI behind a verified deterministic contract** | Get AI value without losing verifiability | ALH's own posture | Should be | M2 provider seam: AI emits IR, validated against frozen contract | M2 | **ALREADY SOLVED BETTER** — this is the strongest idea in the set and ALH already holds it |
| **Human approval of intent (FED/WSH)** | Beat automation bias | ALH | Should be | Human approves the FED, not the numbers | M1 | **ALREADY SOLVED BETTER** — approve the judgeable thing |
| **Degraded-mode deterministic fail-safe** | AI outage must fail safe | ALH | Should be | Bias to `discovery_required`; never fabricate | M1 (pattern reusable M2) | **ADOPT (extend)** — generalize the "fail safe, never simulate" pattern to every AI surface |
| **Role-separated agents on shared aggregate** | Avoid one opaque "AI brain" | ALH | Should be | Discovery/OPE/PSA/Marketplace on the Project | cross-module | **ALREADY SOLVED BETTER** — scoping shrinks each agent's blast radius and lets each be tuned/swapped |
| **Inputs-as-data (anti-injection)** | Stop free text steering privileged action | security practice | Yes | Organizer treats inputs as data, no side effects | M1 (all AI surfaces) | **ADOPT (enforce everywhere)** — must hold on every module that accepts free text |
| **AI auto-decision on money/contract/result** | (tempting "automation") | hype | — | Forbidden | M2/M3/M5/M6/M7 | **REJECT** — irreversible/binding, non-reproducible. Never |

---

## 6. Challenges to conventional wisdom / AI hype

- **"Put AI everywhere / replace the deterministic core."** Rejected. The deterministic core is
  the *only* part that is reproducible and auditable; AI's job is to feed and front it, not replace
  it. ALH's frozen engine is a feature, not technical debt.
- **"Agents will automate the whole workflow."** Overstated. Agents are the right tier only where
  errors are catchable and reversible. Binding actions on money, contracts, and external parties
  fail that test and must be gated by human confirmation — ALH's "decider of meaning, never
  executor of action" is the correct, unglamorous answer.
- **"Human in the loop solves safety."** Largely false in practice — it collapses into
  rubber-stamping. The engineering fix is to make the human approve *intent* (judgeable) rather
  than *output* (un-verifiable), which ALH's FED/WSH approval already does.
- **"RAG eliminates hallucination."** No — it reduces it and *adds a citation that must itself be
  verified*. The unverified citation is the new over-trust.
- **"More autonomy = more value."** Value tracks the *task's* fit (multi-step + underspecified +
  recoverable errors), not the autonomy level. Most ALH surfaces are better served by advise +
  confirm than by autonomous action.
- **"AI provider swap = drop an LLM into M2."** Only if it emits IR that *validates against the
  deterministic contract*. The seam is swappable; the **verification is not**. An AI provider that
  can't produce verifiable IR is not a valid provider for M2.
- **Credit where due:** ALH's posture — *AI behind verified deterministic contracts + human
  approval of intent + a deterministic core + fail-safe degraded mode* — is a **stronger
  AI-engineering posture than the typical "AI copilot bolted onto mutable state."** The typical
  copilot lets confident AI output mutate the live record and then records the AI's edit as the
  human's intent, destroying both verifiability and the audit trail. ALH structurally prevents
  that: AI proposes, the human approves intent, deterministic systems execute, and provenance marks
  every artifact's origin. This is the disciplined form of the copilot pattern, not a weaker one.

---

## 7. Top ideas for ALH (ranked, with module + verdict)

Ranked by engineering leverage. Most of the top entries are things ALH **already does** — the
extraction confirms the posture is sound; the actionable items are lower-numbered as
*reinforcements*, not redirections.

1. **Keep AI behind a verified deterministic contract (M2).** `ALREADY SOLVED BETTER` — strongest
   idea in the set; protect it. Any AI provider must emit IR that validates against the frozen
   contract; never relax the verification to fit a model.
2. **Human approves intent, not output (M1).** `ALREADY SOLVED BETTER` — the real defense against
   automation bias. Keep approval on the FED/WSH.
3. **Deterministic core untouched by AI (M2 core, M3).** `ALREADY SOLVED BETTER` — no LLM in the
   path of any number/structure. Hold this line absolutely.
4. **Generalize "fail safe, never simulate" to every AI surface (M1 → M2/M4/M6).**
   `ADOPT / INVESTIGATE FURTHER` — the degraded-mode discipline (bias to discovery, never
   fabricate) should be the documented default for *every* module that calls AI, not just M1.
5. **Enforce inputs-as-data everywhere (all AI modules).** `ADOPT` — anti–prompt-injection must
   hold on M4/M5/M6 free-text surfaces, not only M1.
6. **RAG-with-citations for PSA & evidence reads (M4, M7).** `INVESTIGATE FURTHER` — adopt only if
   citations point to the Project record and the AI reads state but never writes it; verify the
   citation, don't trust it.
7. **Advisory ML ranking with human selection (M5).** `ADOPT (advisory only)` — rank candidates,
   never auto-contract; selection and commitment stay human + confirmed.
8. **Anomaly/risk surfacing, never auto-action (M4, M6).** `ADOPT (advisory only)` — surface for
   human review; corrective actions require confirmation; act on patterns, not single signals.
9. **Role-separated agents on the Project (cross-module).** `ALREADY SOLVED BETTER` — keep each
   agent scoped to one job; it shrinks blast radius and keeps each independently tunable/swappable.
10. **Never let AI decide money/contracts/results/closure (M2/M3/M5/M6/M7/M8).** `REJECT` (of the
    hype) — these are binding, irreversible, must-be-reproducible. Permanent prohibition.

---

*End of Part 9. Research and writing only — this document maps AI-integration knowledge onto the
existing ALH architecture and proposes no code, schema, or redesign.*
