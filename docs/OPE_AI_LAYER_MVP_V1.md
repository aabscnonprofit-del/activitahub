# OPE AI Layer — MVP v1

> **Goal:** define the **thin AI personalization layer** that sits on top of the OPE Output Builder.
> It takes a finished, deterministic plan and writes the **human copy** — and *only* the copy. It never
> touches a number, quantity, task, risk, timeline, safety warning, or price.
> **Position in the pipeline:** `Composer → Cost Engine → Output Builder → **AI Layer** → customer`.
> **Builds on:** `ACTIVITY_PLANNER_OUTPUTS_V1.md` (the customer format), `OPE_COST_ENGINE_MVP_V1.md`
> (numbers), `scripts/build-ope-output.mjs` (the exact input structure).
> **Scope (MVP):** Honolulu · Birthday + BBQ, matching the rest of the OPE MVP. No code, API, UI here.
> **Date:** 2026-06-06
>
> **One-line contract:** *the AI fills `null` text slots and changes nothing else.* Every non-text field
> in the input must be byte-identical in the output (enforced by the diff guard, §4.2).

---

## 0. The core principle

The deterministic layers already decided **what** happens, **how much** of it, **when**, **how much it
costs**, and **what could go wrong**. Those are facts. The AI's job is purely **voice**: turn the facts
into warm, clear, ready-to-use language a stressed host actually wants to read.

> **Facts are frozen. Only voice is generated.**

If the AI ever needs a number, a quantity, a date, a vendor, or a risk, it must **reuse one already
present in the input** — never originate one.

---

## 1. What the AI is allowed to generate

The AI may write **only** these fields (the "writable allowlist"). Each is `null` (or has a `placeholder`)
in the Output Builder result and is filled by the AI.

| # | Field path | What the AI writes | Must reuse from input |
|---|---|---|---|
| 1 | `section_b_your_plan.summary` | A short, friendly 2–4 sentence overview of the plan | activity_type, guest_count, venue, age_group, duration cues |
| 2 | `section_b_your_plan.timeline[i].note` *(new, optional)* | A friendly one-line gloss on a phase | the phase's existing `when` + `goal` (unchanged) |
| 3 | `section_b_your_plan.*_checklist[i].explanation` *(new, optional)* | A brief "why this matters" for a task | the task title (unchanged) |
| 4 | `section_c_budget.levers_note` | Prose explaining how to move toward Low / High | `key_cost_drivers` + each `lever` flag; existing low/likely/high |
| 5 | `section_d_key_risks.risks[i].explanation` *(new, optional)* | A warm restatement of why the risk matters | the risk `name` + `mitigation` (unchanged, never softened) |
| 6 | `section_e_ready_messages.{slot}.text` | The actual message copy (invitation / reminder / thank-you / feedback) | only the template `variables`; keep unbound ones as `[Bracketed]` |
| 7 | `section_f_upgrade_path.text` | The upgrade-path wording ("you can run this yourself; consider a pro if…") | `current_scale`, composer-set `threshold_hint` |

**Notes on the optional sibling fields (2, 3, 5):** the AI may *add* an `explanation` / `note` string
**next to** a structured item — it may never edit the structured item itself. These are additive voice,
not replacements.

"Friendly explanations" = items 1–3, 5. "Message text" = item 6. "Budget explanation" = item 4.
"Upgrade path wording" = item 7.

---

## 2. What the AI is NOT allowed to change (frozen fields)

Everything not in the §1 allowlist is **read-only**. Explicitly frozen:

| Category | Frozen field paths | Rule |
|---|---|---|
| **Budget numbers** | `section_c_budget.{low,likely,high}`, `contingency.*`, `category_rollups.*`, `breakdown[].line.*` | never altered, rounded, or re-expressed as different figures |
| **Quantities** | `section_a.guest_count`, `guest_breakdown`, `breakdown[].quantity`, any derived count | never changed; never invented in prose |
| **Tasks** | `*_checklist[].id`, `*_checklist[].task`, the set/order of tasks | no add, drop, reword, reorder, or merge |
| **Risks** | `section_d.risks[].{id,name,severity,never_drop,mitigation}`, the risk set, `excluded_conditional` | no removal, no severity change, no reordering to bury, no weakened mitigation |
| **Timelines** | `section_b.timeline[].{phase,when,goal}`, phase windows | dates/windows/goals unchanged |
| **Safety warnings** | every `never_drop: true` risk and all safety mitigations (allergy, supervision, food-safety, choking, safe pickup) | conveyed with **equal or greater** clarity; never softened, hedged, or omitted |
| **Pricing** | the `$9.99` platform price; all event-cost figures | unchanged; AI restates them verbatim if it mentions them |
| **Scenario echo** | all of `section_a_what_you_told_us` | mirror only; never edited |
| **Metadata/IDs** | `_meta.*` (except `ai_layer`), every `id`, `template_id`, `module`, `ucd` | unchanged |

The AI may **reference** any frozen value in its prose (e.g. "around $635") but only by **copying** it
exactly. It may never compute, adjust, or approximate it differently.

---

## 3. Input contract

The AI Layer consumes **one OPE Output Builder result** — the JSON emitted by `build-ope-output.mjs`:

```jsonc
{
  "_meta": { "kind": "activity-planner-output", "format": "ACTIVITY_PLANNER_OUTPUTS_V1",
             "ai_layer": "not-run (message text + summaries are placeholders)" },
  "section_a_what_you_told_us": { ... },          // scenario echo (frozen)
  "section_b_your_plan": { "summary": null, "timeline": [...], "*_checklist": [...] },
  "section_c_budget": { "low": ..., "likely": ..., "high": ..., "key_cost_drivers": [...],
                        "levers_note": null, ... },
  "section_d_key_risks": { "risks": [...], "excluded_conditional": [...] },
  "section_e_ready_messages": { "invitation": { "variables": [...], "text": null, "placeholder": "..." }, ... },
  "section_f_upgrade_path": { "current_scale": ..., "threshold_hint": ..., "text": null }
}
```

**Locale:** the input is already localized (en/es/fr/ru). The AI **writes in the same language** as the
input copy; it must not switch languages or mix them.

**Preconditions the AI may rely on:** budget `is_priced: true` (if `false`, the AI leaves budget prose
null and writes a neutral "estimate coming soon" only if a slot exists); all risks already filtered;
all quantities already computed.

---

## 4. Output contract

### 4.1 Shape
The output is the **same JSON object**, same keys, same order, with:
- the §1 writable fields filled (text strings; optional sibling `explanation`/`note` added where useful),
- `placeholder` strings on message slots **removed or left** (recommended: keep `text` and drop reliance
  on `placeholder`; `placeholder` may remain for traceability),
- `_meta.ai_layer` updated to record the run, e.g.:
  ```json
  "_meta": { "ai_layer": "filled", "ai_model": "<model-id>", "ai_layer_version": "ai-mvp-1" }
  ```

### 4.2 The diff guard (hard requirement)
Before the output is accepted, a **deterministic comparison** runs:

```
freeze(input)  == freeze(output)
   where freeze(x) = x with all §1 writable paths removed
```

If any frozen field differs (added, removed, or changed value) → **reject** the AI output and fall back to
the deterministic result with empty text. This is the mechanical guarantee behind "facts are frozen": the
AI physically cannot ship a changed number/task/risk, because such an output is discarded.

### 4.3 Per-field acceptance checks
- **Messages (item 6):** every `{{token}}` the AI emits must be either a real template `variable` or a
  human `[Bracketed placeholder]`; no free-form invented specifics (no invented address, price, or date).
  If the template has an `allergy_ask` / `dietary_ask` variable, the message **must** include that ask.
- **Budget note (item 4):** any number in the text must string-match `low`/`likely`/`high` (or a
  `key_cost_drivers` value). Lever direction must match the `lever` flag.
- **Risk/safety explanations (items 5):** must not contain negation/softening of a `never_drop` risk
  (lint list: "don't worry", "optional", "probably fine", "no need to", etc., applied to safety items).

---

## 5. Safety rules

1. **No invented numbers.** Every figure in AI text already exists in the input. The AI never estimates,
   rounds differently, sums, or introduces a new amount, count, date, or percentage.
2. **No invented vendors / brands / places.** No specific bakery, store, park, caterer, entertainer, or
   product name. Generic nouns only ("a local bakery", "the park") unless the value is in the input.
3. **No removed risks.** Every risk in `section_d.risks` survives into the customer-facing voice; the AI
   may make a risk *clearer*, never make it disappear or look optional.
4. **No softened safety warnings.** `never_drop` items (allergy, supervision, food-safety, choking, safe
   pickup) keep **at least** their original urgency. The AI may strengthen, never weaken. Mitigation steps
   are preserved in substance.
5. **No medical/legal/financial advice** beyond restating the provided mitigations.
6. **Stay in scope & locale.** Same language as input; no claims about features, timelines, or guarantees
   not present in the data; no mention of competitors.
7. **Fail safe.** On any uncertainty or guard failure, prefer the deterministic text (empty/placeholder)
   over a risky generation. A blank summary is acceptable; a wrong number is not.

---

## 6. Example — Birthday (Young Kids), Honolulu

Using the real Output Builder result (`tmp/ope-output/birthday-young-kids.output.json`:
25 guests / 15 kids, backyard, **$365 / $635 / $1,175**, nut allergy).

### 6.1 Before AI (deterministic — text slots null)
```jsonc
{
  "section_b_your_plan": { "summary": null, "timeline": [ /* when+goal set */ ], "preparation_checklist": [ /* 24 tasks */ ] },
  "section_c_budget": { "low": 365, "likely": 635, "high": 1175,
    "key_cost_drivers": [ {"item_key":"party_food_per_head","likely":225,"lever":"down"},
                          {"item_key":"favors_per_kid","likely":75,"lever":"down"} ],
    "levers_note": null },
  "section_d_key_risks": { "risks": [
    {"id":"BC-RK01","name":"Food allergy / dietary","severity":"high","never_drop":true,
     "mitigation":"Capture at RSVP …; separate & label at service …; keep an action plan."},
    {"id":"ST1-RK01","name":"Child supervision lapse","severity":"high","never_drop":true,
     "mitigation":"Maintain ratio …; active supervision + headcounts …"} ] },
  "section_e_ready_messages": { "invitation": {
     "variables": ["honoree_name","date","time","location","rsvp_deadline","allergy_ask"],
     "text": null,
     "placeholder": "[invitation — to be generated by AI using: honoree_name, date, time, location, rsvp_deadline, allergy_ask]" } },
  "section_f_upgrade_path": { "current_scale": 25, "threshold_hint": null, "text": null },
  "_meta": { "ai_layer": "not-run …" }
}
```

### 6.2 After AI (only the §1 slots filled — every number/risk identical)
```jsonc
{
  "section_b_your_plan": {
    "summary": "A relaxed backyard birthday for about 25 guests — 15 little ones plus the grown-ups. The plan keeps the day short and well-paced for young kids, with simple games, easy food, and a calm wind-down, so you can run it with a helper or two.",
    "timeline": [ /* unchanged: phase/when/goal identical */ ],
    "preparation_checklist": [ /* unchanged tasks; optional .explanation added on a few */ ]
  },
  "section_c_budget": {
    "low": 365, "likely": 635, "high": 1175,           // ← identical
    "key_cost_drivers": [ /* identical */ ],
    "levers_note": "Most of the budget is food and party favors. Keeping the food simple moves you toward the low end (around $365); a fuller spread and add-ons push toward the high end (around $1,175). A typical plan lands near $635."
  },
  "section_d_key_risks": { "risks": [
    {"id":"BC-RK01","name":"Food allergy / dietary","severity":"high","never_drop":true,
     "mitigation":"Capture at RSVP …; separate & label at service …; keep an action plan.",   // ← unchanged
     "explanation":"One guest has a nut allergy — confirm the cake and snacks are nut-free, keep allergy-safe food separate and clearly labeled, tell your helpers, and keep an action plan within reach."},
    {"id":"ST1-RK01","name":"Child supervision lapse","severity":"high","never_drop":true,
     "mitigation":"Maintain ratio …; active supervision + headcounts …",                       // ← unchanged
     "explanation":"With 15 young kids, keep at least 2–3 adults actively watching, mind the yard's edges and any water, and do quick head-counts."} ] },
  "section_e_ready_messages": { "invitation": {
     "variables": ["honoree_name","date","time","location","rsvp_deadline","allergy_ask"],
     "text": "🦸 You're invited to [honoree_name]'s superhero birthday! Join us [date] at [time], at [location]. Please RSVP by [rsvp_deadline] — and let us know about any food allergies so we can keep everyone safe. Can't wait to celebrate!" } },
  "section_f_upgrade_path": { "current_scale": 25, "threshold_hint": null,
     "text": "You can absolutely run this yourself. If the guest list grows past ~25–30 kids or you'd rather have it fully hosted, one tap turns this plan into a request local certified organizers can quote on — you keep the plan either way." },
  "_meta": { "ai_layer": "filled", "ai_model": "<model-id>", "ai_layer_version": "ai-mvp-1" }
}
```

### 6.3 Why this passes the guards
- `low/likely/high` (365/635/1175), every risk, every task, every quantity, and the timeline are
  **byte-identical** → diff guard passes.
- The budget note's numbers (365, 635, 1175) all string-match the frozen figures; lever direction ("simple
  food → low") matches `lever:"down"`.
- The invitation keeps `[bracketed]` tokens for unbound variables, **includes the allergy ask** (template
  has `allergy_ask`), and invents no address/date/price. The "superhero" flavor comes from
  `section_a.special_requirements` — input data, not invented.
- The allergy and supervision explanations **strengthen** clarity and keep every mitigation step → no
  softened safety warning.

---

## 7. Out of scope for MVP

- Generating or changing any structured field (covered by §2 — that's the whole point).
- Regions/categories beyond Honolulu · Birthday/BBQ.
- Tone/length personalization knobs, A/B copy variants, multi-variant generation.
- Image/asset generation, translations (the input is already localized).
- Any persistence, prompt engineering specifics, model selection, API, UI, or code — this is the
  **contract** the implementation must satisfy, not the implementation.

_Specification only. No code, API, UI, or database._
