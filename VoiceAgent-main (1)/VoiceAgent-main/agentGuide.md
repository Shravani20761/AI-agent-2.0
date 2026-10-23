# Dograh Agent Build Guide — Seagull Science Academy CRM

> This is your reference for building every Dograh workflow. For each agent you get:
> - What to inject (initial_context for outbound / pre-call-fetch response for inbound)
> - What to extract (extraction_variables to define in agentNode)
> - What disposition codes to configure
> - What our MCP server does with each outcome
>
> **MCP Server URL:** `http://localhost:3001/mcp` (or your deployed backend URL)
> **Pre-Call Fetch URL:** `POST http://localhost:3001/api/calls/pre-fetch`

---

## SECTION A — Pre-Call Fetch: Complete Setup Guide

### What is Pre-Call Fetch?

Pre-Call Fetch runs only on **inbound calls**. When someone calls your Dograh number, before the agent says a single word, Dograh fires a POST to your backend URL. You return customer data, and the agent starts the call knowing exactly who is calling and their full history.

### Which agents need it?

| Agent | Direction | Pre-Call Fetch? | Why |
|---|---|---|---|
| 1 · Cold Calling | Outbound | ❌ NO | You inject context at trigger time via `initial_context` |
| 2 · Enquiry Handler | Inbound | ✅ YES | Need to know if caller has enquired before |
| 3 · Hot Lead Follow-Up | Outbound | ❌ NO | You inject context at trigger time |
| 4 · Admission Conversion | Outbound | ❌ NO | You inject context at trigger time |
| 5 · Student Support | Inbound | ✅ YES | Need to know if caller is a student + their batch |
| 6 · Fee & Accounts | Inbound | ✅ YES | Need to know their fee status before they ask |
| 7 · Fee Recovery | Outbound | ❌ NO | You inject context at trigger time |
| 8 · Student Engagement | Outbound | ❌ NO | You inject context at trigger time |
| 9 · Review & Referral | Outbound | ❌ NO | You inject context at trigger time |

**Rule: Outbound = NO pre-call fetch. Inbound = YES pre-call fetch.**

---

### How to Enable Pre-Call Fetch in Dograh (step by step)

Do this for Agents 2, 5, and 6 (every inbound workflow):

```
1. Open your workflow in the Dograh dashboard
2. Click on the "Start Call" node
3. Look for "Advanced Settings" or a gear/settings icon inside that node
4. Find the field: "Pre-Call Fetch URL" or "Pre-Call Data Fetch"
5. Toggle it ON
6. Paste this URL:
   http://localhost:3001/api/calls/pre-fetch
   (Replace with your public backend URL when deployed)
7. Save the node
```

That's it. Dograh will now POST to this URL before every call and your backend returns the customer's full history automatically.

---

### Exact URL Your Backend Exposes

```
POST http://localhost:3001/api/calls/pre-fetch

No auth headers needed — this is a public endpoint.

Dograh sends:
{
  "event": "call_inbound",
  "call_inbound": {
    "agent_id": 123,
    "from_number": "+919172008630",   ← caller's phone
    "to_number": "+918071582722"      ← your Dograh number
  }
}

Your backend looks up the caller → returns:
{
  "call_inbound": {
    "dynamic_variables": {
      "customer_name": "Rahul Sharma",
      "is_known_contact": true,
      "lifecycle_stage": "INTERESTED",
      "course_interested": "IIT-JEE Preparation",
      "is_student": false,
      "is_active_student": false,
      "batch_name": "",
      "batch_timings": "",
      "faculty_name": "",
      "fee_outstanding": 0,
      "next_fee_due": "",
      "open_follow_ups": 2,
      "last_contact_date": "2026-06-01",
      "last_enquiry_notes": "Interested in morning batch"
    }
  }
}
```

If caller is unknown, backend returns:
```json
{ "call_inbound": { "dynamic_variables": { "is_known_contact": false, "customer_name": "there" } } }
```

---

### How to Use These Variables in Your Prompt

Once pre-call fetch is configured, ALL variables from `dynamic_variables` are available directly by name (no prefix needed):

```
You are Priya from Seagull Science Academy.

{% if is_known_contact %}
  The caller is {{customer_name}}.
  They have previously shown interest in {{course_interested | our courses}}.
  {% if lifecycle_stage == "STUDENT" %}
    They are an enrolled student in {{batch_name}}.
    Their outstanding fee is ₹{{fee_outstanding}}.
  {% endif %}
  {% if open_follow_ups > 0 %}
    There are {{open_follow_ups}} pending follow-ups for this contact.
  {% endif %}
{% else %}
  This is a new caller. Greet warmly and gather their details.
{% endif %}
```

**Fallback syntax** — if a variable might be empty:
```
Hello {{customer_name | there}}, this is Priya from Seagull Science Academy.
```
If `customer_name` is empty or missing, it says "Hello there" instead of "Hello ,".

---

---

## SECTION B — Extraction Variables: Complete Setup Guide

### What are Extraction Variables?

Extraction variables are fields you define in Dograh so the AI agent listens for specific information during the conversation and captures it in a structured format. After the call ends, these captured values land in `gathered_context` — which your backend reads to decide what CRM action to take.

**Without extraction variables:** You only get `call_disposition` (e.g., "user_hangup").
**With extraction variables:** You get `call_disposition` + `callback_time: "Saturday 5pm"` + `preferred_course: "NEET-UG"` + etc.

---

### Where to Add Extraction Variables in Dograh

Extraction variables are added **inside the main Agent node** (not the Start Call or End Call nodes). Here's where to find them:

```
1. Open your workflow in Dograh dashboard
2. Click on the main Agent node (usually called "Main Agenda" or your agent's core node)
3. Scroll down inside the node settings panel
4. Look for a section called "Extraction Variables" or "Extract from Conversation"
5. Click "+ Add Variable" or "+ Add Extraction"
6. For each variable, fill in three fields:
   a. Name   → the key you want in gathered_context (e.g., preferred_course)
   b. Type   → string / number / boolean
   c. Prompt → instruction for the AI on what to listen for
7. Save the node after adding all variables
```

---

### The Three Fields — Exactly What to Write

#### `name`
- Use snake_case (lowercase with underscores)
- Keep it short and specific
- This becomes the key in `gathered_context` after the call
- Examples: `preferred_course`, `callback_time`, `payment_promised`

#### `type`
Only three options:
- `string` — for text values like course names, dates in natural language, reasons
- `number` — for amounts (fee amount, scholarship percent)
- `boolean` — for yes/no decisions (demo confirmed, payment promised)

When in doubt, use `string`. Even for dates like "Saturday morning", use string — don't try to parse them to ISO format in the extraction prompt.

#### `prompt`
This is the instruction the AI uses to decide what to capture. Write it as a clear question or instruction:

**Good prompts:**
```
"What course did the caller express interest in, if any? Use the exact name they said."
"By what date did the caller promise to make the payment? Write exactly what they said, e.g. 'by Friday', 'end of the month'."
"Did the caller confirm they will attend the demo class? true or false only."
```

**Bad prompts (too vague):**
```
"Course"                          ← too short, no context
"Did they say yes?"               ← ambiguous — yes to what?
"Extract the callback time"       ← doesn't say what format
```

---

### How Extraction Variables Appear After the Call

After every call, Dograh fills `gathered_context` with both built-in fields and your extraction variables:

```json
{
  "call_disposition": "interested",
  "nodes_visited": ["Start Call", "Main Agenda", "End Call"],
  "call_tags": ["interested", "user_speech"],
  "provider": "vobiz",
  "call_id": "ccff9931-...",

  "preferred_course": "IIT-JEE Preparation",
  "callback_time": "",
  "interest_level": "very_interested",
  "student_class": "10th standard",
  "has_sibling_enrolled": false
}
```

Your dialer worker reads this after polling `GET /api/v1/workflow/{id}/runs/{run_id}`.
The backend uses `gathered_context.preferred_course` to pre-fill the Hot Lead record, etc.

---

### Extraction Variable Rules & Tips

**Only extract what you'll actually use in the CRM.** Don't add variables just because they sound useful — each one adds a small LLM cost per call.

**Boolean extraction tip:** The AI is good at yes/no. If you ask "Did they confirm?" and they said something ambiguous, it defaults to false. This is the right behavior.

**String extraction with options:** If you want the AI to pick from a fixed set, tell it:
```
"How interested was the caller? Answer with one of: very_interested, somewhat_interested, not_interested, wrong_number"
```
This makes post-processing reliable — you can do `if interest_level === 'very_interested'` in your code.

**Extraction happens after the call, not during.** The AI doesn't stop to fill in the variable mid-conversation. It listens throughout the call and extracts at the end based on everything said.

**Empty extractions:** If the caller never mentioned a course, `preferred_course` will be `""` (empty string) or `null`. Your backend handles this — always check before using.

---

### Full Extraction Variable Checklist per Agent Type

#### For every OUTBOUND agent — add these to End Call node:
```
All outbound agents share call_disposition (built-in).
Add agent-specific extras per the agent section below.
```

#### For every INBOUND agent — add these to the main Agent node:
```
The caller's details come from pre-call fetch (already available).
You're extracting what they SAID during the call, not who they are.
```

---

---

## SECTION C — Overall Workflow Build Checklist

Use this checklist every time you build a new Dograh workflow:

```
□ 1. Create the workflow and name it: "Seagull — [Agent Name]"

□ 2. Set workflow type:
     Outbound → for Cold Calling, Hot Lead, Admission, Fee Recovery, Engagement, Review
     Inbound  → for Enquiry Handler, Student Support, Fee & Accounts

□ 3. Add the Global Node (system prompt):
     - Set persona: "You are Priya from Seagull Science Academy..."
     - Language: Hinglish (Hindi + English, switch based on caller)
     - Tone: warm, professional, brief
     - Role boundaries: only discuss Seagull Academy topics

□ 4. Configure Start Call node:
     INBOUND ONLY → Enable Pre-Call Fetch → paste URL:
       http://localhost:3001/api/calls/pre-fetch
     OUTBOUND → leave Pre-Call Fetch OFF

□ 5. Add main Agent node:
     - Write the agent prompt using {{variable_name}} syntax
     - Reference initial_context variables (outbound) or dynamic_variables (inbound)
     - Add all extraction variables for this agent (see each agent's section)

□ 6. Add disposition codes:
     - Add ONLY the codes listed for this agent (don't add extra)
     - Each code maps to a specific CRM action in the backend

□ 7. Connect MCP tools:
     - Add MCP server: http://localhost:3001/mcp
     - Enable only the tools listed for this agent
     - Test each tool with a dummy call

□ 8. Wire edges:
     Global Node → Start Call → Agent Node → End Call
     Agent Node has conditional edges per disposition code

□ 9. Note the workflow UUID and ID:
     - UUID: visible in Dograh URL or workflow list
     - ID: the numeric ID (1, 2, 3...)
     - For outbound: paste both into backend/.env

□ 10. Test with a real phone number before going live
```

---

---

## How Dograh Context Works — Quick Reference

```
OUTBOUND CALLS
  You send → initial_context at trigger time (from dialer worker)
  Agent uses → {{customer_name}}, {{course_interested}}, etc.
  Agent extracts → extraction_variables (lands in gathered_context after call)
  You poll → gathered_context.call_disposition + extracted fields
  Pre-Call Fetch → NOT needed (context comes from initial_context)

INBOUND CALLS
  Caller dials → Dograh captures from_number automatically
  Dograh calls → POST /api/calls/pre-fetch (before agent speaks)
  You return → dynamic_variables (customer history from DB)
  Agent uses → {{customer_name}}, {{lifecycle_stage}}, etc.
  Agent extracts → extraction_variables during conversation
  You receive → gathered_context after call ends
  Pre-Call Fetch → REQUIRED (see Section A)
```

> For the full pre-call fetch setup guide → **Section A** above  
> For the full extraction variable setup guide → **Section B** above  
> For the per-agent build checklist → **Section C** above

**Variable syntax in prompts:**
- Simple: `{{customer_name}}`
- Fallback if missing: `{{customer_name | there}}`
- Built-in telephony: `{{caller_number}}`, `{{called_number}}`, `{{current_time}}`, `{{current_weekday}}`

**Extraction variable field spec (add inside the Agent node):**
```json
{
  "name": "preferred_course",
  "type": "string",
  "prompt": "What course did the customer express interest in? Write the exact name they said."
}
```
Types: `string` · `number` · `boolean`

**gathered_context after a call (what your backend reads):**
```json
{
  "call_disposition": "interested",
  "nodes_visited": ["Start Call", "Main Agenda", "End Call"],
  "call_tags": ["interested", "user_speech"],
  "preferred_course": "IIT-JEE Preparation",
  "callback_time": "",
  "interest_level": "very_interested"
}
```

---

## Agent 1 — Cold Calling Agent
**Direction:** Outbound  
**Category:** Acquisition / Marketing  
**Trigger:** Dialer worker calls Dograh trigger API per contact from uploaded list

### initial_context (you send at trigger time)
```json
{
  "customer_name": "Rahul Sharma",
  "customer_phone": "+919172008630",
  "course_interested": "IIT-JEE Preparation",
  "prior_contact": "first_time",
  "notes": "10th standard student, board exams in March",
  "crm_queue_item_id": "uuid-here"
}
```
| Field | Source | Required |
|---|---|---|
| `customer_name` | ColdCallQueueItem.name | If available |
| `customer_phone` | ColdCallQueueItem.phone | Yes |
| `course_interested` | ColdCallQueueItem.courseHint | If available |
| `prior_contact` | Always "first_time" for cold | Yes |
| `notes` | ColdCallQueueItem.notes | If available |
| `crm_queue_item_id` | ColdCallQueueItem.id | Yes (for webhook correlation) |

### Extraction Variables (define in End Call node)
```json
[
  { "name": "interest_level", "type": "string", "prompt": "How interested was the caller? Options: very_interested, somewhat_interested, not_interested, wrong_number" },
  { "name": "preferred_course", "type": "string", "prompt": "Which course did the caller express interest in, if any?" },
  { "name": "callback_time", "type": "string", "prompt": "If caller requested a callback, what time/day did they mention? e.g. 'Saturday morning', 'tomorrow 5pm'" },
  { "name": "student_class", "type": "string", "prompt": "What class/grade is the student in, if mentioned?" },
  { "name": "has_sibling_enrolled", "type": "boolean", "prompt": "Did they mention any sibling or family member already enrolled at Seagull?" }
]
```

### Disposition Codes
| Code | When to use |
|---|---|
| `interested` | Caller wants more info, demo, or visit |
| `callback_requested` | Caller asked to be called again at a specific time |
| `not_interested` | Clear refusal |
| `wrong_number` | Number doesn't match a valid person |

### CRM Actions (executed by MCP tools during the call)
| Agent Action / Event | MCP Tool to Call | CRM Effect |
|---|---|---|
| Customer is interested | `create_warm_lead({ phone, qualification_score, notes })` | Promotes person to `INTERESTED` lifecycle, creates a `WarmLead` record, and automatically schedules a `DEMO_SCHEDULING` follow-up task due in 24 hours. |
| Customer asks for callback | `create_follow_up({ phone, type: "CALLBACK", due_at })` | Schedules a callback follow-up task for the customer. |
| Customer is not interested | `log_cold_call({ phone, outcome: "NOT_INTERESTED", notes })` | Creates a `ColdCall` history record with `NOT_INTERESTED` outcome. |
| Wrong number / DNC | `log_cold_call({ phone, outcome: "INVALID_NUMBER" })` or `log_cold_call({ phone, outcome: "DO_NOT_CALL" })` | Creates a `ColdCall` history record and automatically marks any queued outbound calls for this number as `DNC`. |
| General call logging | `log_communication({ phone, agent_type: "COLD_CALLING", content: transcript, direction: "OUTBOUND" })` | Log the full transcript or conversation notes to the contact's timeline. **Call this as the last step in every call.** |

### MCP Tools to Call
1. `lookup_contact({ phone })`
   → Check if the contact exists in the CRM.
2. `log_cold_call({ phone, name, campaign, outcome, duration_secs, notes })`
   → Log call outcome. Flags invalid numbers/DNC immediately.
3. `create_warm_lead({ phone, qualification_score, notes })`
   → Call when user shows interest to promote to warm lead and schedule demo booking.
4. `create_follow_up({ phone, type: "CALLBACK", due_at, notes, agent_type: "COLD_CALLING" })`
   → Book a callback task if requested.
5. `log_communication({ phone, agent_type: "COLD_CALLING", content, direction: "OUTBOUND" })`
   → Always call at the end of the call to log the transcript.

---

## Agent 2 — Enquiry Handler Agent
**Direction:** Inbound  
**Category:** Acquisition / Sales  
**Trigger:** Someone dials your Dograh phone number (enquiry line)

### Pre-Call Fetch Response (your backend returns this)
```json
{
  "customer_name": "Priya Patil",
  "is_known_contact": true,
  "lifecycle_stage": "LEAD",
  "course_interested": "NEET-UG Preparation",
  "last_contact_date": "2026-05-28",
  "last_enquiry_notes": "Asked about hostel facility",
  "open_follow_ups": 0
}
```

### Extraction Variables (define in End Call / agent nodes)
```json
[
  { "name": "enquiry_course", "type": "string", "prompt": "Which course is the caller enquiring about?" },
  { "name": "student_class", "type": "string", "prompt": "What class or grade is the student currently in?" },
  { "name": "demo_requested", "type": "boolean", "prompt": "Did the caller agree to attend a demo class?" },
  { "name": "preferred_demo_time", "type": "string", "prompt": "What date/time did the caller prefer for the demo?" },
  { "name": "parent_or_student", "type": "string", "prompt": "Is the caller a parent or the student themselves?" },
  { "name": "location", "type": "string", "prompt": "Which area or locality is the caller calling from?" }
]
```

### MCP Tools to Call
```
1. lookup_contact({ phone: "{{caller_number}}" })
   → Check if this caller is already in our CRM

2. create_enquiry({ name, phone, course_interested, source: "VOICE_AGENT", notes })
   → Create the enquiry record (even if already in DB — updates existing)

3. schedule_appointment({ person_id, type: "DEMO", scheduled_at, notes })
   → Book demo if caller agreed

4. create_follow_up({ person_id, type: "CALLBACK", due_at, notes })
   → Schedule callback if needed

5. log_communication({ person_id, type: "CALL", direction: "INBOUND", content: transcript, agent_type: "ENQUIRY" })
   → Always call this last — saves transcript
```

### Disposition Codes
| Code | When to use |
|---|---|
| `demo_scheduled` | Demo appointment was booked |
| `callback_requested` | Will call back to decide |
| `enquiry_logged` | Got their info, no demo yet |
| `not_interested` | Decided not to proceed |

---

## Agent 3 — Hot Lead Follow-Up Agent
**Direction:** Outbound  
**Category:** Sales / Nurturing  
**Trigger:** FollowUp is due (type=DEMO_SCHEDULING or CALLBACK) · Agent auto-calls from follow-up queue

### initial_context
```json
{
  "customer_name": "Rahul Sharma",
  "customer_phone": "+919172008630",
  "course_interested": "IIT-JEE Preparation",
  "lifecycle_stage": "HOT_LEAD",
  "last_contact_date": "2026-06-01",
  "last_contact_notes": "Said he is interested, will call back Saturday",
  "demo_offered": false,
  "crm_person_id": "uuid",
  "crm_follow_up_id": "uuid"
}
```

### Extraction Variables
```json
[
  { "name": "demo_confirmed", "type": "boolean", "prompt": "Did the caller confirm they will attend the demo class?" },
  { "name": "demo_datetime", "type": "string", "prompt": "What date and time did they confirm for the demo?" },
  { "name": "objection_raised", "type": "string", "prompt": "What concern or objection did the caller raise, if any? e.g. fee, distance, timing" },
  { "name": "next_callback_time", "type": "string", "prompt": "If they asked for another callback, when?" },
  { "name": "final_decision", "type": "string", "prompt": "Did the caller express a final decision? Options: will_attend_demo, needs_more_time, not_interested" }
]
```

### MCP Tools to Call
```
1. lookup_contact({ phone })
2. update_warm_lead({ lead_id, qualification_notes, demo_status })
3. schedule_appointment({ person_id, type: "DEMO", scheduled_at }) ← if demo confirmed
4. create_follow_up({ person_id, type: "CALLBACK", due_at }) ← if needs more time
5. log_communication({ ... agent_type: "WARM_LEAD" })
```

### Disposition Codes
| Code | When to use |
|---|---|
| `demo_confirmed` | Committed to attending demo |
| `visit_confirmed` | Will visit academy instead |
| `needs_more_time` | Not ready, wants callback |
| `not_interested` | Declined |

---

## Agent 4 — Admission Conversion Agent
**Direction:** Outbound  
**Category:** Sales / Closing  
**Trigger:** Person attended demo/visit but hasn't confirmed admission after 48–72 hours

### initial_context
```json
{
  "customer_name": "Rahul Sharma",
  "customer_phone": "+919172008630",
  "course_interested": "IIT-JEE Preparation",
  "demo_attended_date": "2026-06-02",
  "faculty_met": "Vikram Sir",
  "fee_monthly": 8000,
  "scholarship_eligible": true,
  "max_scholarship_percent": 15,
  "batch_seats_remaining": 4,
  "crm_person_id": "uuid"
}
```

### Extraction Variables
```json
[
  { "name": "admission_confirmed", "type": "boolean", "prompt": "Did the caller agree to confirm their admission?" },
  { "name": "scholarship_accepted", "type": "boolean", "prompt": "Did they accept the scholarship offer?" },
  { "name": "scholarship_percent", "type": "number", "prompt": "What scholarship percentage was agreed upon, if any?" },
  { "name": "payment_mode", "type": "string", "prompt": "What payment mode did they mention? e.g. cash, UPI, bank transfer, installments" },
  { "name": "objection", "type": "string", "prompt": "What was the main reason for hesitation, if any?" }
]
```

### MCP Tools to Call
```
1. lookup_contact({ phone })
2. offer_scholarship({ person_id, discount_percent, reason }) ← if needed to close
3. confirm_admission({ person_id, course_id, batch_id, scholarship_amount })
4. create_follow_up({ ... type: "FEE_PAYMENT" }) ← if fee pending
5. log_communication({ ... agent_type: "ADMISSION_CONVERSION" })
```

### Disposition Codes
| Code | When to use |
|---|---|
| `admission_confirmed` | Seat booked |
| `scholarship_offered` | Offered discount, awaiting confirmation |
| `needs_parent_approval` | Will confirm after parent discussion |
| `not_interested` | Chose another institute |

---

## Agent 5 — Student Support Agent
**Direction:** Inbound  
**Category:** Operations / Support  
**Trigger:** Enrolled student or parent calls the support number

### Pre-Call Fetch Response
```json
{
  "customer_name": "Rahul Sharma",
  "is_known_contact": true,
  "is_student": true,
  "is_active_student": true,
  "lifecycle_stage": "STUDENT",
  "batch_name": "IIT-JEE 2027 — Batch A",
  "batch_timings": "Monday-Saturday 7–9 AM",
  "faculty_name": "Vikram Sharma",
  "fee_outstanding": 8000,
  "next_fee_due": "2026-07-01",
  "open_support_tickets": 0,
  "last_contact_date": "2026-05-15"
}
```

### Extraction Variables
```json
[
  { "name": "issue_type", "type": "string", "prompt": "What type of issue did the student report? e.g. timetable_change, faculty_query, attendance, test_schedule, fee, material, other" },
  { "name": "issue_description", "type": "string", "prompt": "Brief description of the issue raised by the caller" },
  { "name": "resolved_on_call", "type": "boolean", "prompt": "Was the issue resolved during this call?" },
  { "name": "escalation_needed", "type": "boolean", "prompt": "Does this need escalation to a human staff member?" }
]
```

### MCP Tools to Call
```
1. lookup_contact({ phone: "{{caller_number}}" })
2. get_student_info({ phone }) ← gets batch, schedule, fee status
3. log_support_ticket({ person_id, type, description, status: resolved_on_call ? "RESOLVED" : "OPEN" })
4. log_communication({ ... agent_type: "STUDENT_SUPPORT" })
```

### Disposition Codes
| Code | When to use |
|---|---|
| `resolved` | Issue handled on call |
| `ticket_created` | Ticket logged, staff will follow up |
| `escalated` | Transferred to human |
| `fee_query` | Fee-related, may transfer to Fee Agent |

---

## Agent 6 — Fee & Accounts Agent
**Direction:** Inbound  
**Category:** Finance  
**Trigger:** Student/parent calls about fees, payments, receipts

### Pre-Call Fetch Response
```json
{
  "customer_name": "Rahul Sharma",
  "is_known_contact": true,
  "is_student": true,
  "batch_name": "IIT-JEE 2027 — Batch A",
  "fee_total": 96000,
  "fee_paid": 24000,
  "fee_outstanding": 72000,
  "next_due_date": "2026-07-01",
  "next_due_amount": 8000,
  "installments_remaining": 9,
  "payment_mode_on_file": "UPI"
}
```

### Extraction Variables
```json
[
  { "name": "payment_confirmed", "type": "boolean", "prompt": "Did the caller confirm they have made or will make a payment?" },
  { "name": "payment_amount", "type": "number", "prompt": "What payment amount did the caller mention?" },
  { "name": "payment_mode", "type": "string", "prompt": "What mode of payment: UPI, cash, NEFT, cheque?" },
  { "name": "payment_reference", "type": "string", "prompt": "Did they provide a transaction ID or cheque number?" },
  { "name": "query_type", "type": "string", "prompt": "What was the caller's main query? e.g. receipt, outstanding, installment_plan, late_fee_waiver" }
]
```

### MCP Tools to Call
```
1. lookup_contact({ phone: "{{caller_number}}" })
2. get_fee_status({ phone }) ← returns full fee plan
3. log_payment_received({ student_id, amount, method, reference }) ← if payment confirmed
4. log_communication({ ... agent_type: "FEE_ACCOUNTS" })
```

---

## Agent 7 — Fee Recovery Agent
**Direction:** Outbound  
**Category:** Finance / Collections  
**Trigger:** Fee installment overdue by X days (auto-trigger from fee system)

### initial_context
```json
{
  "customer_name": "Rahul Sharma",
  "customer_phone": "+919172008630",
  "batch_name": "IIT-JEE 2027 — Batch A",
  "fee_outstanding": 8000,
  "overdue_since": "2026-06-01",
  "days_overdue": 4,
  "next_installment_amount": 8000,
  "total_outstanding": 72000,
  "crm_person_id": "uuid",
  "crm_student_id": "uuid"
}
```

### Extraction Variables
```json
[
  { "name": "payment_promise_date", "type": "string", "prompt": "By what date did the student/parent promise to pay? e.g. 'by Friday', 'next Monday'" },
  { "name": "payment_amount_promised", "type": "number", "prompt": "What amount did they promise to pay?" },
  { "name": "hardship_reason", "type": "string", "prompt": "What reason did they give for delayed payment, if any?" },
  { "name": "emi_plan_requested", "type": "boolean", "prompt": "Did they ask to restructure installments or request an EMI plan?" },
  { "name": "escalate_to_management", "type": "boolean", "prompt": "Does this case need management review (very large outstanding, disputed amount)?" }
]
```

### MCP Tools to Call
```
1. lookup_contact({ phone })
2. get_fee_status({ phone })
3. record_payment_promise({ student_id, promise_date, amount, notes })
4. create_follow_up({ person_id, type: "FEE_FOLLOW_UP", due_at: promise_date, notes })
5. log_communication({ ... agent_type: "FEE_RECOVERY" })
```

### Disposition Codes
| Code | When to use |
|---|---|
| `payment_promised` | Committed to paying by a date |
| `hardship_case` | Genuine difficulty, needs review |
| `disputed` | Denies owing the amount |
| `paid_already` | Claims they already paid (check receipts) |
| `no_answer` | Did not pick up |

---

## Agent 8 — Student Engagement Agent
**Direction:** Outbound  
**Category:** Retention / Operations  
**Trigger:** Student absent for 3+ consecutive days · Low test score alert · Admin batch check

### initial_context
```json
{
  "customer_name": "Rahul Sharma",
  "customer_phone": "+919172008630",
  "batch_name": "IIT-JEE 2027 — Batch A",
  "consecutive_absences": 3,
  "last_attendance_date": "2026-06-01",
  "last_test_score": 45,
  "average_score": 62,
  "faculty_name": "Vikram Sir",
  "crm_student_id": "uuid"
}
```

### Extraction Variables
```json
[
  { "name": "absence_reason", "type": "string", "prompt": "Why has the student been absent? e.g. illness, family_issue, exam_prep, lost_motivation, other" },
  { "name": "will_return", "type": "boolean", "prompt": "Did the student confirm they will return to class?" },
  { "name": "return_date", "type": "string", "prompt": "When did they say they will return?" },
  { "name": "needs_counseling", "type": "boolean", "prompt": "Does the student sound demotivated or at risk of dropout?" },
  { "name": "special_request", "type": "string", "prompt": "Did they make any special request e.g. batch change, extra sessions, recorded lectures?" }
]
```

### MCP Tools to Call
```
1. lookup_contact({ phone })
2. get_student_info({ phone })
3. log_support_ticket({ person_id, type: "ENGAGEMENT", description }) ← if counseling needed
4. create_follow_up({ person_id, type: "CALLBACK", due_at: return_date }) ← to check if they returned
5. log_communication({ ... agent_type: "STUDENT_ENGAGEMENT" })
```

---

## Agent 9 — Review & Referral Agent
**Direction:** Outbound  
**Category:** Growth / Marketing  
**Trigger:** Student completes batch milestone · Exam result is good · Admin triggers batch-wise

### initial_context
```json
{
  "customer_name": "Rahul Sharma",
  "customer_phone": "+919172008630",
  "batch_name": "IIT-JEE 2027 — Batch A",
  "enrollment_months": 6,
  "recent_achievement": "Scored 85% in mock test",
  "review_platforms": "Google Maps and JustDial",
  "google_review_link": "https://g.page/r/...",
  "crm_student_id": "uuid"
}
```

### Extraction Variables
```json
[
  { "name": "review_agreed", "type": "boolean", "prompt": "Did the student/parent agree to leave a review?" },
  { "name": "review_platform", "type": "string", "prompt": "Which platform did they agree to review on? Google, JustDial, both?" },
  { "name": "referral_name", "type": "string", "prompt": "Did they mention a friend or sibling who might be interested? What is their name?" },
  { "name": "referral_phone", "type": "string", "prompt": "Did they provide the referred person's phone number?" },
  { "name": "referral_course", "type": "string", "prompt": "What course is the referred person likely interested in?" }
]
```

### MCP Tools to Call
```
1. lookup_contact({ phone })
2. request_review({ person_id, platform: "GOOGLE", notes })
3. log_referral({ referrer_id, referred_name, referred_phone, referred_course })
   ← This auto-creates a new Enquiry for the referred person
4. log_communication({ ... agent_type: "REVIEW_REFERRAL" })
```

### Disposition Codes
| Code | When to use |
|---|---|
| `review_promised` | Will leave a review |
| `referral_given` | Gave a friend's contact |
| `both` | Review + referral |
| `declined` | Not comfortable with reviews |
| `no_answer` | Did not pick up |

---

## Variable Naming Convention (use consistently across all agents)

### initial_context (outbound — you send)
| Variable | Type | Description |
|---|---|---|
| `customer_name` | string | Person's full name |
| `customer_phone` | string | Phone with country code |
| `course_interested` | string | Course name or slug |
| `lifecycle_stage` | string | CRM stage: LEAD, HOT_LEAD, ENQUIRY, STUDENT |
| `prior_contact` | string | "first_time", "follow_up", "reminder" |
| `notes` | string | Any relevant context from last interaction |
| `crm_person_id` | string | UUID for MCP tool correlation |
| `crm_follow_up_id` | string | Which follow-up triggered this call |

### Pre-call fetch dynamic_variables (inbound — you return)
| Variable | Type | Description |
|---|---|---|
| `customer_name` | string | Full name (or "there" if unknown) |
| `is_known_contact` | boolean | True if person exists in CRM |
| `lifecycle_stage` | string | Current CRM stage |
| `course_interested` | string | Last enquired course |
| `is_student` | boolean | Enrolled student |
| `is_active_student` | boolean | Currently active enrollment |
| `batch_name` | string | Student's batch |
| `batch_timings` | string | Class schedule |
| `faculty_name` | string | Assigned faculty |
| `fee_outstanding` | number | Amount due |
| `next_fee_due` | string | Date of next payment |
| `open_follow_ups` | number | Count of pending follow-ups |
| `last_contact_date` | string | ISO date of last interaction |
| `last_enquiry_notes` | string | Notes from last enquiry |

### Consistent extraction variable names (use same names across agents)
| Variable | Type | Used by |
|---|---|---|
| `preferred_course` | string | Cold Calling, Enquiry, Hot Lead |
| `callback_time` | string | Cold Calling, Hot Lead |
| `demo_confirmed` | boolean | Hot Lead, Enquiry |
| `demo_datetime` | string | Hot Lead, Enquiry |
| `interest_level` | string | Cold Calling |
| `payment_confirmed` | boolean | Fee & Accounts |
| `payment_amount` | number | Fee & Accounts, Fee Recovery |
| `payment_promise_date` | string | Fee Recovery |
| `referral_name` | string | Review & Referral |
| `referral_phone` | string | Review & Referral |
| `issue_type` | string | Student Support |
| `resolved_on_call` | boolean | Student Support |
| `absence_reason` | string | Engagement |
| `will_return` | boolean | Engagement |
