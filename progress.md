# Academic & Student Support — Build Plan

> **Goal:** Give the academy a GUI to maintain academic data (timetable, teacher
> availability, test schedule, FAQ) so the **inbound Student Support voice agent**
> can answer routine student/parent questions automatically — freeing the human
> receptionist for higher-value work.
>
> **Timetable granularity:** BATCH-WISE (one timetable per batch, not per student).
> **Rule:** Every checkbox = one atomic unit. Mark `[ ]` → `[x]` when done.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN GUI  (/admin/academics → new "Academic Setup" tabs)   │
│  Timetable · Teacher Availability · Test Schedule · FAQ      │
│         ↓ writes to DB via REST                              │
├─────────────────────────────────────────────────────────────┤
│  DB (4 new models): TimetableEntry · TeacherAvailability ·   │
│                     TestSchedule · Faq                       │
│         ↑ read by MCP tools                                 │
├─────────────────────────────────────────────────────────────┤
│  MCP TOOLS (new, read-only): get_timetable · get_test_       │
│  schedule · get_teacher_status · answer_faq                 │
│         ↑ called during call                                │
├─────────────────────────────────────────────────────────────┤
│  INBOUND SUPPORT AGENT (Dograh) answers caller live          │
│  Can't answer → log_support_ticket (escalate to human)      │
├─────────────────────────────────────────────────────────────┤
│  SUPPORT PAGE (/admin/support): Call Logs tab (audit) +     │
│  Escalated Tickets tab (existing)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 0 — Unified Student Base & Bulk Upload

> **Why first:** the support agent resolves a caller's batch *through* their
> Student record (phone → Person → Student → Batch). Timetable, tests, and fees
> all hang off `Student`. So a clean, populated student base with correct phone
> numbers and batch assignments is the prerequisite for everything else.
>
> **Unified ID rule:** `Student.id` is the single source of truth. `FeePlan`
> already references `studentId` (1:1). Pre-fetch already resolves caller →
> Person → Student. No schema change to the relationships — we just need the
> data-entry + bulk paths to populate them correctly.

- [x] **0.1** Backend `students.controller.createStudent` — create Person (or reuse by phone) + Student + batch assignment in one call. Fields: name, phone, email?, batchId, rollNumber? *(via shared `upsertStudent` helper)*
- [x] **0.2** Backend `students.controller.bulkImport` — array of `{name, phone, batch (name or id), rollNumber?, email?, totalFee?, dueDate?}`. Dedup by phone (reuse Person if exists). Auto-resolve batch by name (case-insensitive). Returns created/updated/skipped counts.
- [x] **0.3** Backend `students.controller.assignBatch` — `PATCH /:id/batch`, keeps `Batch.currentSeats` in sync on move.
- [x] **0.4** Fee in one shot — `upsertStudent` also creates a `FeePlan` (totalAmount, installments, nextDueDate) when `totalFee` is present. Used by both single + bulk.
- [x] **0.5** Routes: `POST /api/students`, `POST /api/students/bulk`, `PATCH /api/students/:id/batch`
- [x] **0.6** Frontend `students.api.js` — added create, bulkImport, assignBatch, batches
- [x] **0.7** `Academics.jsx` — "Add Student" modal + "Bulk Upload" modal (paste/CSV: name, phone, batch, rollNumber, [fee, dueDate]) + per-row batch dropdown to reassign inline
- [x] **0.8** Verified pre-fetch returns correct batch/student/fee for an uploaded student's phone (smoke-tested: role=STUDENT, batch + fee populated)

**Bulk upload format (paste/CSV):**
```
name, phone, batch, rollNumber, [totalFee], [dueDate]
Rahul Sharma, 9209568974, JEE-2026-A, R001, 45000, 2026-07-10
```

---

## Phase 0.5 — Role-Based Pre-Fetch Routing (Unified Contact Base)

> **Key realization:** `Person` is ALREADY the unified contact table.
> `phone @unique` = one number → one person. A marketing lead and a student are
> the SAME row at different `lifecycleStage` values — a lead converts by gaining
> a `Student` record + stage flip to `STUDENT`, keeping the same `Person.id` and
> phone. No table split needed. Fees/timetable/support all hang off `Person.id`.
>
> **What's missing:** a deterministic `role` the inbound pre-fetch hands to Dograh
> so a single inbound number can route to the right sub-flow (student vs lead).
>
> **Design decision:** DERIVE the role (don't store as authority). A stored column
> drifts out of sync; compute it from `student` + `lifecycleStage` at read time.
> Optional `Person.contactType` cached mirror only for reporting — never the source
> of truth.

**Role derivation:**
```
person.student exists                              → "STUDENT"
stage in [INTERESTED, DEMO_SCHEDULED, DEMO_ATTENDED,
          VISIT_SCHEDULED, ADMISSION_PENDING]      → "HOT_LEAD"
stage == LEAD                                      → "LEAD"
not found                                          → "UNKNOWN"
```

**Inbound routing flow (single number):**
```
Caller dials inbound number
  → POST /api/calls/pre-fetch { from_number }
  → backend finds Person by phone, computes role + context
  → returns dynamic_variables incl. single `route` field
  → Dograh Start Call node branches on {{role}}:
       STUDENT  → Student Support sub-flow
       HOT_LEAD → Sales / nurture sub-flow
       LEAD     → Enquiry capture sub-flow
       UNKNOWN  → New enquiry capture sub-flow
```

**Marketing vs student stay unmixed WITHOUT separate tables:**
- Marketing/cold contact = `Person` with `source=COLD_CALL/META_ADS…`, `stage=LEAD`, NO `Student`
- Becomes student only when `Admission → Student` row created
- Pages already filter by this (ColdCalling: source=COLD_CALL · Students: student exists · Fees: FeePlan)

- [x] **0.5.1** `src/lib/role.js` — `computeRole(person)` → STUDENT / HOT_LEAD / LEAD / UNKNOWN + `routeForRole(role)` → sub-flow name
- [x] **0.5.2** Pre-fetch (`src/index.js`) returns `role` + `route` in `dynamic_variables`
- [x] **0.5.3** Pre-fetch returns role-appropriate context (student: batch + batch_id + roll + course + fee; lead: last enquiry/notes + follow-ups)
- [x] **0.5.4** Pre-fetch returns `is_known_contact:false, role:"UNKNOWN", route:"enquiry_capture"` for new numbers + no-phone payloads
- [ ] **0.5.5** (Optional, deferred) `Person.contactType` cached column — not needed; derivation is cheap and drift-free
- [ ] **0.5.6** Dograh Start Call node: edge conditions on `{{role}}` → 3–4 sub-flows (Dograh UI, by you)
- [x] **0.5.7** Verified: student phone → role=STUDENT/student_support · DEMO_SCHEDULED lead → HOT_LEAD/sales_nurture · new number → UNKNOWN/enquiry_capture

---

## Phase A — Data Layer (Schema + Migration)

New Prisma models. All batch-scoped where relevant.

- [x] **A.1** `TimetableEntry` model (`timetable_entries`) — batchId, dayOfWeek, startTime/endTime "HH:MM", subject, facultyName?, room?, isActive · idx `[batchId]`
- [x] **A.2** `TeacherAvailability` model (`teacher_availability`) — facultyName, date, status enum (AVAILABLE|ON_LEAVE|PARTIAL), note? · idx `[facultyName]`,`[date]`
- [x] **A.3** `TestSchedule` model (`test_schedules`) — batchId, subject, testDate, syllabus?, maxMarks?, isActive · idx `[batchId]`,`[testDate]`
- [x] **A.4** `Faq` model (`faqs`) — question, answer, category?, isActive · idx `[category]`,`[isActive]`
- [x] **A.5** Back-relations on `Batch` (timetableEntries, testSchedules) + `TeacherAvailabilityStatus` enum
- [x] **A.6** Migration `prisma/migrations/20260608000003_academic_models/migration.sql`
- [x] **A.7** `prisma migrate deploy` (applied to Supabase) + `prisma generate` (client v7.8.0)

---

## Phase B — Backend CRUD (Controllers + Routes)

New controller `academics.controller.js`, mounted at `/api/academics`.

- [x] **B.1** Timetable: `listTimetable(?batchId)`, `upsertTimetableEntry` (create+update), `deleteTimetableEntry`
- [x] **B.2** Teacher availability: `listAvailability(?facultyName,?date,?from,?to)`, `setAvailability`, `deleteAvailability`
- [x] **B.3** Test schedule: `listTests(?batchId,?upcoming)`, `createTest`, `updateTest`, `deleteTest`
- [x] **B.4** FAQ: `listFaqs(?category,?search)`, `createFaq`, `updateFaq`, `deleteFaq`
- [x] **B.5** `academics.routes.js` — all `requireAuth`, mounted at `/api/academics` in `src/index.js`
- [x] **B.6** Helper `getBatchByPhone(phone)` in `src/lib/academics.js` — Person → Student → Batch (ready for Phase C MCP tools)

---

## Phase C — MCP Tools (read-only, for the support agent)

Added to `src/mcp/tools/` (new file `academic.js`, registered in `mcp/server.js`).
All resolve the caller's batch from their phone via `get_student_info` pattern.

- [x] **C.1** `get_timetable` — args: `phone`, optional `day` ("today"/"tomorrow"/weekday/0–6). Returns caller's batch class schedule. *(`src/mcp/tools/academic.js`)*
- [x] **C.2** `get_test_schedule` — args: `phone`, optional `include_past`. Returns upcoming tests for the caller's batch.
- [x] **C.3** `get_teacher_status` — args: `faculty_name`, `date?`. Returns availability; no leave record ⇒ assumed available (`has_record:false`).
- [x] **C.4** `answer_faq` — args: `query`, optional `category`. Keyword-scored match over active FAQs; no-match returns escalation hint.
- [x] **C.5** Smoke-tested all 4 via `POST /mcp` with a seeded student phone (timetable full+day, upcoming test, on-leave vs assumed-available, FAQ match + miss). All 4 appear in `tools/list`.

---

## Phase D — Admin GUI (Academic Setup)

New page section. Either extend `Academics.jsx` with a top-level toggle
(Students | Academic Setup) or add a new route `/admin/academic-setup`.
Decision: **add a second tab inside Academics.jsx** to keep nav clean.

- [x] **D.1** `frontend/src/api/academics.api.js` — all CRUD calls (timetable, availability, tests, faqs)
- [x] **D.2** Timetable tab — batch selector + weekly grid (7 day cards, Mon→Sun), add/edit/delete classes per day
- [x] **D.3** Teacher Availability tab — faculty filter + mark leave/available modal (date, status, note), table + delete
- [x] **D.4** Test Schedule tab — batch selector + list, add/edit test (date, syllabus, max marks), delete
- [x] **D.5** FAQ tab — debounced search, add/edit/delete, category chips
- [x] **D.6** Reused Material tokens + modal patterns. Surfaced as a 2nd top-level toggle in `Academics.jsx` (Students | Academic Setup) → `AcademicSetup.jsx` with 4 sub-tabs

---

## Phase E — Support Page: Call Logs

Make `/admin/support` show what the agent handled, not just tickets.

- [x] **E.1** Backend: `support.controller.listCallLogs` — `Communication where agentType=STUDENT_SUPPORT`, person join, search, pagination + stats
- [x] **E.2** Route `GET /api/support/call-logs` (mounted before `/` to avoid param clash)
- [x] **E.3** `Support.jsx` — **Call Logs** tab (caller, question/notes, outcome, duration, recording link) + tab switcher alongside **Escalated Tickets**
- [x] **E.4** KPI row: calls handled today · escalated today · avg duration

---

## Phase F — Dograh: Student Support Inbound Agent (Phase 4.5)

Wire the agent that uses all of the above. (Config/UI work in Dograh.)

- [ ] **F.1** Enable pre-call fetch URL in Start Call node
- [ ] **F.2** Attach MCP tools: `lookup_contact`, `get_student_info`, `get_timetable`, `get_test_schedule`, `get_teacher_status`, `answer_faq`, `log_support_ticket`, `log_communication`
- [ ] **F.3** Prompt: answer from tools; if unknown → `log_support_ticket` + promise human callback
- [ ] **F.4** Ensure `log_communication` passes `agent_type=STUDENT_SUPPORT`, `call_id={{workflow_run_id}}`, `outcome`
- [ ] **F.5** Set `.env` workflow UUID/ID once built; test with a real student number

---

## Use Cases (what the agent answers)

| Caller asks | Tool used | Source |
|---|---|---|
| "What time is my batch tomorrow?" | `get_timetable` | TimetableEntry (batch) |
| "Is the physics test still Friday?" | `get_test_schedule` | TestSchedule (batch) |
| "Is Sharma sir in today?" | `get_teacher_status` | TeacherAvailability |
| "What's the fee due date?" | `get_fee_status` (existing) | FeePlan |
| "How do I apply for a scholarship?" | `answer_faq` | Faq |
| Anything unanswerable | `log_support_ticket` | → human callback |

---

## Build Order

```
Phase 0    Unified student base + bulk upload  ← prerequisite for all
Phase 0.5  Role-based pre-fetch routing        ← depends on 0
Phase A    Data layer (schema + migrate)       ← foundation
Phase B    Backend CRUD                        ← depends on A
Phase C    MCP read tools                      ← depends on 0 + A
Phase D    Admin GUI                           ← depends on B
Phase E    Support call logs                   ← independent, can parallel
Phase F    Dograh agent wiring                 ← depends on 0.5 + C (last)
```

**Suggested execution:** 0 → 0.5 → A → B → C → D → E → F.
Phases 0–E are all code we own. Phases 0.5.6 and F are Dograh UI config done by you.

---

## Status

**Last updated:** 2026-06-08
**Scope this cycle:** Academic data layer + Support call logs + support MCP tools.
**Timetable:** batch-wise.

```
Phase 0    [x] Unified Student Base + Bulk Upload
Phase 0.5  [x] Role-Based Pre-Fetch Routing  (0.5.6 = Dograh UI, by you)
Phase A    [x] Data Layer
Phase B    [x] Backend CRUD
Phase C    [x] MCP Tools
Phase D    [x] Admin GUI
Phase E    [x] Support Call Logs
Phase F    [ ] Dograh Support Agent
```
