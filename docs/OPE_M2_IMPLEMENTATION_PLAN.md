# OPE M2 — Implementation Plan: Recurring Modifier

> **Scope (строго):** добавить **только модификатор Recurring** поверх существующего движка M1.
> **НЕ входит:** Community, Vendor Network, Crew Network, Marketplace, payments, organizer onboarding,
> per-session attendance/roster, обучение/learning.
> **Авторитет:** `docs/OPE_IMPLEMENTATION_READY.md` (Recurring отложен из M1 в M2),
> `docs/OPE_PATTERN_LIBRARY.md` (Recurring = модификатор), `docs/OPE_KNOWLEDGE_MODEL.md`
> (Schedule & Cadence block), `docs/OPE_PLANNING_WORKFLOW.md`.
> **Дата:** 2026-06-10.

---

## 0. Что такое Recurring в M2 (концептуально)

Recurring — это **модификатор**: та же базовая активность, повторяемая по расписанию (weekly /
biweekly / monthly), с **per-session экономикой** и **серийным расписанием**. Это НЕ контейнер с
участниками (это Community — исключено) и НЕ новый паттерн.

**Где применяется в текущем контенте M1.** По таксономии **Celebration = Recurring: No** (день рождения
не бывает «еженедельным»), **Meetup = Recurring: Yes**. Поэтому в M2 модификатор включается **только для
паттерна Meetup** (в M1-контенте это `networking`). M2 строит **механизм** модификатора (типы,
детектирование, cadence, per-session budget, вывод), который позже бесплатно наследуют будущие
recurring-capable паттерны (Class и т.д.). Это честно и не навязывает recurrence «торжествам».

**Главный инвариант:** recurrence — **opt-in**. Если его нет во входе, движок ведёт себя как M1
**байт-в-байт**. Все новые поля вывода **опциональны** и **отсутствуют** для one-time (в JSON
`undefined` не сериализуется) → M1-планы не меняются.

---

## 1. Новые типы (`lib/ope/types.ts`)

```
export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly'

/** sessions: null = ongoing (без конца); число = ограниченная серия. */
export interface Recurrence {
  frequency: RecurrenceFrequency
  sessions?: number | null
}
```

- `PlannerInput.recurrence?: Recurrence | null` — опциональный вход.
- `Scenario.recurrence: Recurrence | null` — внутреннее поле (не сериализуется напрямую).
- **Дополнения вывода (все опциональные, ставятся ТОЛЬКО при recurrence):**
  - `section_b_your_plan.recurrence?: { frequency; sessions: number | null; cadence_label: string;
    per_session_reminder: string }` — описание серии (например, «Repeats weekly», напоминание за 2 дня
    до каждой сессии).
  - `BudgetResult.per_session?: boolean` — флаг, что `estimate` относится к **одной сессии**.
  - `BudgetResult.series_total?: BudgetBand | null` — итог по серии (`estimate × sessions`), если
    `sessions` известно; иначе `null` (ongoing).
- `ActivityDef.recurringCapable?: boolean` (в `activities.ts`) — какие content labels могут повторяться.

> Никаких новых обязательных полей. Опциональность гарантирует M1-совместимость сериализации.

---

## 2. Какие файлы менять

| Файл | Изменение | Зачем |
|---|---|---|
| `lib/ope/types.ts` | новые типы (см. §1) | контракт модификатора |
| `lib/ope/activities.ts` | `recurringCapable: true` для `networking` (Meetup); остальные `false`/undefined | разрешить recurrence только там, где это осмысленно |
| `lib/ope/modifiers.ts` **(новый)** | `applyRecurring(output, recurrence)` + `applyModifiers(output, scenario)` | изолированная логика модификаторов (расширяемо под будущее) |
| `lib/ope/engine.ts` | в `runEngine` финальным шагом вызвать `applyModifiers(output, scenario)` | применить Recurring как пост-обработку one-time плана |
| `lib/ope/index.ts` | прокинуть `recurrence` в `Scenario`; (опц.) учесть в clarification | связать вход с движком |
| `lib/ope/coverage.ts` | сузить recurring-keyword-правило до `club\|class`; modifier-aware allow | recurrence на supported-паттерне больше не отказ |
| `lib/ope/clarification.ts` | (опц.) если в тексте есть «weekly/monthly», но structured recurrence пуст → спросить «one-time или recurring?» | UNKNOWN → ASK |
| `lib/actions/planner.ts` | zod: опциональный `recurrence` объект | валидация входа |
| `components/planner/PlannerClient.tsx` | контрол «Repeats?» (one-time/weekly/biweekly/monthly + число сессий), показывать ТОЛЬКО для recurring-capable категорий | ввод recurrence |
| `components/planner/PlanResult.tsx` | рендер cadence-бейджа + per-session/series budget, если `recurrence` присутствует | вывод серии |
| `messages/{en,es,fr,ru,de,pt}.json` | ключи UI recurrence (parity) | i18n |
| `scripts/ope-snapshot-test.mts` + fixture | новые recurring-кейсы; сохранить старые | тесты |

**НЕ трогаем (для байт-совместимости one-time):** `budget.ts`, `assembly.ts`, `resources.ts`,
`risk.ts`, `output.ts`, `communication.ts`. Recurring реализуется **поверх** их результата, а не внутри.

---

## 3. Логика Coverage Gate (с гарантией совместимости)

Сейчас правило отказа: `/\b(recurring|weekly|monthly|biweekly|fortnightly|series|ongoing|club)\b|\bclass\b/`
→ `unsupported`.

**Меняем на:** `/\b(club)\b|\bclass\b/` (только Community/Class, которых в M2 нет) — **с тем же reason/
confidence/missing/next**. Чистые cadence-слова (weekly/monthly/recurring/series/…) больше не дают
автоматический отказ; recurrence приходит через **structured-поле**.

**Почему M1-refusals не меняются (проверено по фикстуре):**
- `yoga` → ловится правилом FITNESS (`yoga`) раньше — без изменений.
- `hiking club` → правило OUTDOOR (`hiking/trail`) раньше — без изменений.
- `book club` → слово `club` остаётся в правиле → тот же rule, тот же reason — байт-в-байт.
- `workshop`, `soccer`, `wedding`, `fundraiser`, `cleanup` — свои правила, не затронуты.

**Modifier-aware allow (новая ветка поддержки):**
- supported pattern (`meetup`) + `recurrence != null` → `plan_ready` (recurring). Reason можно оставить
  прежним «Simple networking event…» либо добавить опциональный recurring-вариант (см. §6 о совместимости
  reason-строк).
- `celebration` + `recurrence != null` (через API, не из формы) → **defensive:** recurrence игнорируется,
  план строится one-time (Celebration = Recurring No). Документируем; в форме контрол не показывается.
- Пороговые гейты (guests > 60, budget > 5000, kids > 30) считаются **per-session** — без изменений.

---

## 4. Per-session / series budget (в `modifiers.ts`, НЕ в `budget.ts`)

Базовый `budget` уже считается на **одну сессию** (один ивент). `applyRecurring`:
- ставит `per_session = true`;
- если `recurrence.sessions` задано → `series_total = { low×n, likely×n, high×n }`; иначе `series_total = null`.
- `estimate`, `breakdown`, `currency`, `fallback_note` — **без изменений** (per-session значения те же,
  что в M1). Никакого пересчёта цен.

> Это «per-session economics» из Knowledge Model в минимальном виде. Цены остаются per-session; серия —
> простое умножение, явно подписанное в выводе.

---

## 5. Cadence / Schedule (в `modifiers.ts`)

`applyRecurring` добавляет `section_b.recurrence`:
- `cadence_label`: «Repeats weekly» / «every 2 weeks» / «monthly».
- `sessions`: число или null (ongoing).
- `per_session_reminder`: «Send a reminder ~2 days before each session» (расширение Schedule-block
  cadence, см. Knowledge Model D5).

Сам per-event timeline (prep/day-of/after) **не меняется** — он описывает одну сессию.

---

## 6. Output additions и совместимость reason-строк

- Все новые поля (`section_b.recurrence`, `budget.per_session`, `budget.series_total`) **ставятся только
  при recurrence**. Для one-time они `undefined` → не сериализуются → M1-байты сохранены.
- **Reason-строки coverage:** чтобы не ломать байт-совместимость существующих кейсов, для `networking`
  **без** recurrence оставляем reason M1 без изменений. Для recurring можно вернуть отдельный reason
  (например, «Recurring networking series — supported (per-session estimate).»). Это **новые** кейсы, не
  затрагивающие старые.

---

## 7. UI

`PlannerClient.tsx`:
- Контрол **«Repeats?»** показывается только если `ACTIVITIES[category].recurringCapable` (в M1 — только
  `networking`): варианты one-time / weekly / biweekly / monthly + опциональное число сессий.
- `buildInput()` добавляет `recurrence` (или `undefined`, если one-time).
- Для не-recurring категорий контрол скрыт → их вход не меняется → их вывод не меняется.

`PlanResult.tsx`:
- Если `plan.section_b.recurrence` есть — бейдж «Repeats weekly» рядом с заголовком + блок бюджета
  показывает «per session» и, при наличии, «series total (N sessions)».
- Если нет — рендер ровно как в M1.

`messages/*` (6 локалей, parity): `planner.form.repeats`, `oneTime`, `weekly`, `biweekly`, `monthly`,
`sessions`; `planner.result.perSession`, `seriesTotal`, `repeatsBadge`. Тексты вопросов/cadence из движка
остаются английскими (как весь generated content).

---

## 8. Тесты (`scripts/ope-snapshot-test.mts`)

**A. Совместимость (обязательно):** все **18 существующих кейсов** M1 (one-time supported + clarify +
refusals) остаются **байт-в-байт** (фикстура для них не меняется). Это и есть доказательство, что
Recurring аддитивен.

**B. Новые recurring-кейсы (expect: `supported`):**
1. `networking + recurrence{weekly}` + budget → `plan_ready`; `section_b.recurrence` присутствует;
   `budget.per_session === true`; `series_total === null` (ongoing).
2. `networking + recurrence{weekly, sessions:10}` + budget → `series_total = estimate × 10`.
3. `networking + recurrence{monthly}` + budget → cadence_label корректный.

**C. Клар/гейт-кейсы:**
4. `networking + recurrence{weekly}` **без budget** → `needs_clarification` (спросить budget) — старая
   логика clarification сохраняется поверх recurrence.
5. (опц.) `networking`, текст «weekly», structured recurrence пуст → `needs_clarification`
   («one-time или recurring?»), если реализуем §1-clarification.

**D. Defensive / негатив:**
6. `birthday + recurrence{weekly}` (через API) → план строится **one-time**, `section_b.recurrence`
   ОТСУТСТВУЕТ (recurrence проигнорирован) — assert, что Celebration не ломается и не повторяется.
7. Регресс: `book club`, `yoga`, `hiking` остаются `unsupported` и **байт-в-байт** (проверка, что сужение
   recurring-правила ничего не сломало).

**Инвариант:** one-time → нет recurrence-полей; recurring → есть. Refusal → `plan === null`.
Обновить фикстуру `--update` только из-за **добавленных** кейсов; существующие строки не должны измениться
(если изменились — это регресс, разобраться).

---

## 9. Как сохраняется совместимость с M1 (сводно)

1. **Opt-in вход:** нет `recurrence` → поведение M1 без изменений.
2. **Аддитивный вывод:** новые поля опциональны и отсутствуют для one-time → сериализация M1 не меняется.
3. **Модификатор — пост-обработка:** `budget/assembly/risk/output/communication` не трогаются; Recurring
   применяется к готовому one-time плану.
4. **Сужение gate-правила** до `club|class` сохраняет все существующие refusals байт-в-байт (проверено по
   правилам-предшественникам).
5. **Reason-строки** для не-recurring веток остаются прежними; recurring получает свои (новые кейсы).
6. **Снапшот-тест** оставляет 18 кейсов нетронутыми; добавляет recurring-кейсы.
7. **i18n parity** поддерживается (+ключи во все 6 локалей).
8. Контрол recurrence в UI скрыт для не-recurring категорий → их форма/вывод не меняются.

---

## 10. Краевые случаи и риски

- **Celebration + recurrence** — игнорируем (one-time), т.к. таксономия Recurring=No; альтернатива —
  мягкая clarification «это разовое событие?». Решение: игнорировать + не показывать контрол в форме.
- **sessions = огромное число** → ограничить (zod `max`, напр. 365) во избежание абсурдного series_total.
- **ongoing (sessions=null)** → `series_total=null`, показываем только per-session.
- **Free-text «weekly» без structured-поля** → не парсим как recurrence (out of scope); опционально
  ловим clarification (§8.5). Не инвентим серию из текста (UNKNOWN→ASK).
- **Пороговые гейты** трактуем per-session — задокументировать (большая серия маленьких сессий остаётся
  supported).

---

## 11. Acceptance (Definition of Done для M2)

- `npm run test:ope` — зелёный; 18 M1-кейсов байт-в-байт + новые recurring-кейсы проходят инварианты.
- `tsc --noEmit` — чисто.
- `npm run build` — компилируется.
- one-time планы (любая M1-категория без recurrence) — **байт-в-байт** как до M2 (доказать before/after).
- recurring networking даёт план с cadence + per-session budget (+ series_total при sessions).
- i18n parity сохранён во всех 6 локалях.
- Не добавлено: Community/Vendor/Crew/Marketplace/payments/onboarding/roster/learning.

---

## 12. Порядок работ (предлагаемый)

1. Типы (`types.ts`) + `activities.ts recurringCapable`.
2. `modifiers.ts` (`applyRecurring` + `applyModifiers`) + вызов в `engine.ts`.
3. `index.ts` (recurrence → Scenario) + `coverage.ts` (сужение правила + modifier-aware allow).
4. `planner.ts` zod.
5. Снапшот-тест: сперва прогнать **без** изменения теста → доказать 18 кейсов не изменились; затем добавить
   recurring-кейсы + `--update`.
6. UI (`PlannerClient` контрол + `PlanResult` рендер) + i18n (6 локалей).
7. Верификация: `test:ope`, `tsc`, `build`. Не коммитить.

_План. Кода не написано, ничего не изменено и не закоммичено._
