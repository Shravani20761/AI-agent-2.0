# VoiceCRM — AI Voice Agent Development Plan

**Project:** Seagull Science Academy VoiceCRM  
**Goal:** Build a production-ready, cost-benchmarked AI voice agent platform with real-time cost tracking dashboard.  
**Architecture:** LiveKit WebRTC → AI Voice Agent (Gemini Live OR Sarvam+Deepseek) → MCP Tools → Neon/Prisma CRM  

---

## Current State (Baseline)

- ✅ CRM backend running (Express + Prisma + Neon) on port 3001
- ✅ CRM frontend running (React + Vite) on port 5173
- ✅ LiveKit agent running (Node.js, `@livekit/agents`) — currently wired to OpenAI Realtime
- ✅ VoiceCallWidget in CRM frontend (real LiveKit WebRTC connection)
- ✅ MCP server at `/mcp` with 25+ tools across 8 categories
- ✅ All three start with `npm run dev` from root
- ❌ OpenAI Realtime must be removed (too expensive — ₹43/min)
- ❌ Gemini Live API not integrated
- ❌ Sarvam + Deepseek pipeline not integrated
- ❌ No cost tracking models in DB
- ❌ No `/api/demo/*` routes
- ❌ No cost dashboard frontend

---

## Phase 0 — Remove OpenAI, Stabilise Agent

**Goal:** Clean up the agent so it no longer depends on OpenAI. Make it start without crashing. Confirm LiveKit connection still works end-to-end after removal.

---

### Task 0.1 — Remove OpenAI plugin from agent dependencies

**File:** `agent/package.json`

- Remove `"@livekit/agents-plugin-openai"` from `dependencies`
- Keep `"@livekit/agents"` and `"dotenv"`
- Do NOT add Gemini or Sarvam packages yet — that is Phase 2

---

### Task 0.2 — Remove OpenAI plugin from agent.js imports

**File:** `agent/agent.js`

- Delete the line: `import * as openai from '@livekit/agents-plugin-openai';`
- Delete `OPENAI_API_KEY` usage
- Replace the `AgentSession` body with a temporary stub that just logs "Agent connected, no AI model loaded yet"
- Keep `defineAgent`, `WorkerOptions`, `cli.runApp`, and `ctx.connect()` — the LiveKit worker registration must still work
- The agent should start, register with LiveKit, and accept room dispatch without crashing

---

### Task 0.3 — Remove OpenAI key from agent/.env

**File:** `agent/.env`

- Delete the `OPENAI_API_KEY=...` line
- Keep `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

---

### Task 0.4 — Remove OpenAI key from backend/.env

**File:** `backend/.env`

- Delete the `OPENAI_API_KEY=...` line (backend never used it directly, just stored for reference)

---

### Task 0.5 — Run npm install in agent/ to sync lockfile

**Command:** `npm install --prefix agent`

- This removes `@livekit/agents-plugin-openai` from `node_modules`
- Verify agent starts without import errors: `npm run dev --prefix agent`
- Confirm in logs: `registered worker` appears — LiveKit connection confirmed

---

### Task 0.6 — Verify end-to-end LiveKit room dispatch still works

**Manual test:**
- Run `npm run dev` from root
- Open browser at `http://localhost:5173`, log in as `admin@seagull.com / admin123`
- Widget auto-starts countdown → click Start Now
- Confirm in AGENT logs: `JobAssignment` received + `ctx.connect()` called
- The call will connect but no AI voice — that is expected at this stage

---

## Phase 1 — Backend: Schema + Demo Routes

**Goal:** Add two new Prisma models (`DemoCall`, `DemoToolCall`) and a full `/api/demo/*` route group to the existing backend. No new backend server needed.

---

### Task 1.1 — Add `DemoMode` enum to Prisma schema

**File:** `backend/prisma/schema.prisma`

Add after the existing enums block:

```prisma
enum DemoMode {
  GEMINI_LIVE
  SARVAM_PIPELINE
}
```

---

### Task 1.2 — Add `DemoCall` model to Prisma schema

**File:** `backend/prisma/schema.prisma`

Add at the bottom of the file:

```prisma
model DemoCall {
  id            String    @id @default(uuid())
  mode          DemoMode
  roomName      String    @map("room_name")
  contactName   String?   @map("contact_name")
  startedAt     DateTime  @default(now()) @map("started_at")
  endedAt       DateTime? @map("ended_at")
  durationSecs  Int?      @map("duration_secs")

  // Gemini Live usage
  audioInputTokens  Int? @map("audio_input_tokens")
  audioOutputTokens Int? @map("audio_output_tokens")

  // Sarvam Pipeline usage
  sttAudioSecs    Int?  @map("stt_audio_secs")
  ttsCharacters   Int?  @map("tts_characters")
  llmInputTokens  Int?  @map("llm_input_tokens")
  llmOutputTokens Int?  @map("llm_output_tokens")

  // Computed cost (stored for fast querying)
  totalCostInr  Float? @map("total_cost_inr")
  costPerMinInr Float? @map("cost_per_min_inr")

  toolCalls DemoToolCall[]

  @@index([mode])
  @@index([startedAt])
  @@map("demo_calls")
}
```

---

### Task 1.3 — Add `DemoToolCall` model to Prisma schema

**File:** `backend/prisma/schema.prisma`

Add after `DemoCall`:

```prisma
model DemoToolCall {
  id          String   @id @default(uuid())
  demoCallId  String   @map("demo_call_id")
  toolName    String   @map("tool_name")
  arguments   Json
  result      Json?
  durationMs  Int?     @map("duration_ms")
  calledAt    DateTime @default(now()) @map("called_at")

  demoCall DemoCall @relation(fields: [demoCallId], references: [id], onDelete: Cascade)

  @@index([demoCallId])
  @@map("demo_tool_calls")
}
```

---

### Task 1.4 — Run prisma db push and prisma generate

**Commands (run in order from `backend/` directory):**

```bash
npx prisma db push
npx prisma generate
```

- `db push` creates the two new tables in Neon without a migration file (fine for dev)
- `generate` regenerates the Prisma client so the new models are available in code
- Verify: no errors, Prisma client output mentions `DemoCall` and `DemoToolCall`

---

### Task 1.5 — Create the demo controller file

**File:** `backend/src/controllers/demo.controller.js` (new file)

Implement these exported functions:

**`getConfig(req, res)`**
- Returns: `{ activeMode, rates }` where rates contains all INR pricing constants
- `activeMode` reads from a module-level variable (in-memory, resets on restart — fine for demo)
- `rates` is a hardcoded object:
  ```js
  {
    inrPerUsd: 96,
    geminiLive: {
      audioInputPerMillionTokens: 67.20,
      audioOutputPerMillionTokens: 816.00,
      tokensPerSecond: 25,
    },
    sarvamPipeline: {
      sttPerMinute: 0.48,
      ttsPerMinute: 0.67,
      deepseekInputPerMillion: 25.92,
      deepseekOutputPerMillion: 105.60,
    },
  }
  ```

**`setMode(req, res)`**
- Body: `{ mode: 'GEMINI_LIVE' | 'SARVAM_PIPELINE' }`
- Updates the module-level `activeMode` variable
- Returns: `{ mode }`

**`startCall(req, res)`**
- Body: `{ contactName?, contactPhone?, contactCourse? }`
- Reads current `activeMode`
- Generates a unique `roomName` like `demo-${Date.now()}`
- Creates a `DemoCall` record in DB with `mode`, `roomName`, `contactName`
- Calls the existing `livekit-server-sdk` `AccessToken` logic (same as `voicekit.controller.js`) to generate a LiveKit JWT for this room — include `mode` in room metadata as JSON: `{ mode: activeMode }`
- Returns: `{ demoCallId, token, url, roomName, mode, contactName }`

**`updateUsage(req, res)`**
- Params: `:id` (demoCallId)
- Body: `{ audioInputTokens?, audioOutputTokens?, sttAudioSecs?, ttsCharacters?, llmInputTokens?, llmOutputTokens? }`
- Updates the `DemoCall` record (additive — adds to existing values, does not replace)
- Computes `totalCostInr` and `costPerMinInr` based on current usage + elapsed time
- Returns: `{ totalCostInr, costPerMinInr, durationSecs }`

**`endCall(req, res)`**
- Params: `:id` (demoCallId)
- Body: `{ finalUsage? }` (same shape as updateUsage body — optional final snapshot)
- Sets `endedAt`, `durationSecs`, final usage values
- Computes and stores final `totalCostInr` and `costPerMinInr`
- Returns: `{ demoCallId, totalCostInr, costPerMinInr, durationSecs, mode }`

**`listCalls(req, res)`**
- Query params: `?mode=GEMINI_LIVE` (optional filter), `?limit=50` (default 50)
- Returns all `DemoCall` records with their `toolCalls` count, ordered by `startedAt DESC`
- Returns: `{ calls: [...] }`

**`getCall(req, res)`**
- Params: `:id`
- Returns single `DemoCall` with all `DemoToolCall` records included
- Returns: `{ call }`

**`getSummary(req, res)`**
- No params
- Queries `DemoCall` table, groups by `mode`, computes:
  - `callCount`
  - `avgCostPerMin`
  - `avgTotalCost`
  - `avgDurationSecs`
  - `totalCostInr` (sum)
- Only includes completed calls (`endedAt IS NOT NULL`) in averages
- Returns: `{ GEMINI_LIVE: {...}, SARVAM_PIPELINE: {...} }`

**`logToolCall(req, res)`**
- Body: `{ demoCallId, toolName, arguments, result, durationMs }`
- Creates a `DemoToolCall` record
- This endpoint is called by the agent after every MCP tool invocation during a demo call
- Returns: `{ id }`

---

### Task 1.6 — Create the demo routes file

**File:** `backend/src/routes/demo.routes.js` (new file)

```js
import { Router } from 'express';
import {
  getConfig, setMode,
  startCall, updateUsage, endCall,
  listCalls, getCall, getSummary,
  logToolCall,
} from '../controllers/demo.controller.js';

const router = Router();

router.get('/config', getConfig);
router.post('/mode', setMode);
router.post('/call/start', startCall);
router.patch('/call/:id/usage', updateUsage);
router.post('/call/:id/end', endCall);
router.get('/calls', listCalls);
router.get('/calls/:id', getCall);
router.get('/summary', getSummary);
router.post('/tool-call', logToolCall);

export default router;
```

---

### Task 1.7 — Register demo routes in backend index.js

**File:** `backend/src/index.js`

- Add import: `import demoRoutes from './routes/demo.routes.js';`
- Add route: `app.use('/api/demo', demoRoutes);`
- Place it in the **public routes section** (before protected CRM routes, no auth middleware)
- Add a comment: `// Demo cost-tracking routes (internal, no auth required)`

---

### Task 1.8 — Test all demo endpoints manually

Use curl or any HTTP client to verify each endpoint responds correctly:

```
GET  http://localhost:3001/api/demo/config          → { activeMode, rates }
POST http://localhost:3001/api/demo/mode            → { mode }
POST http://localhost:3001/api/demo/call/start      → { demoCallId, token, url, roomName }
GET  http://localhost:3001/api/demo/calls           → { calls: [] }
GET  http://localhost:3001/api/demo/summary         → { GEMINI_LIVE: {}, SARVAM_PIPELINE: {} }
```

---

## Phase 2 — Agent: Multi-Mode Support (Gemini Live + Sarvam Pipeline)

**Goal:** Agent reads room metadata at dispatch time, loads either Gemini Live or Sarvam+Deepseek pipeline accordingly. Reports usage back to `/api/demo/call/:id/usage` after each turn.

---

### Task 2.1 — Get Gemini API key

**Manual step (no code):**
- Go to https://aistudio.google.com → API Keys → Create API key
- Ensure the key has access to `gemini-2.0-flash-live-001` (Multimodal Live API)
- Note the key — needed for Task 2.3

---

### Task 2.2 — Get Sarvam API key + verify Deepseek access

**Manual step (no code):**
- Go to https://www.sarvam.ai → Sign up → Dashboard → API Keys
- Create an API key
- Confirm access to: `saarika:v2` (STT) and `bulbul:v2` (TTS)
- For Deepseek: go to https://platform.deepseek.com → API Keys → note the key
- Verify billing is set up on both platforms

---

### Task 2.3 — Add new API keys to agent/.env

**File:** `agent/.env`

Add:
```
GEMINI_API_KEY=your-gemini-api-key-here
SARVAM_API_KEY=your-sarvam-api-key-here
DEEPSEEK_API_KEY=your-deepseek-api-key-here
DEMO_BACKEND_URL=http://localhost:3001
```

---

### Task 2.4 — Update agent/.env.example with new keys

**File:** `agent/.env.example`

Add the same keys with placeholder values and a comment explaining what each is for.

---

### Task 2.5 — Install Gemini plugin in agent

**File:** `agent/package.json` — add to dependencies:
```json
"@livekit/agents-plugin-google": "^1.0.0"
```

**Command:** `npm install --prefix agent`

Verify the package installs without errors.

---

### Task 2.6 — Research Sarvam + Deepseek LiveKit plugin availability

**Research task (no code):**
- Check if `@livekit/agents` has built-in STT/LLM/TTS slots and how to wire custom providers
- Check if there is a community plugin for Sarvam STT (`@livekit/agents-plugin-sarvam` or similar)
- Check if Deepseek can be used via the OpenAI-compatible endpoint with `@livekit/agents-plugin-openai` (Deepseek exposes an OpenAI-compatible API at `https://api.deepseek.com`)
- Document findings before writing code

---

### Task 2.7 — Install Sarvam + Deepseek dependencies in agent

Based on Task 2.6 findings — likely:

**File:** `agent/package.json` — add:
```json
"@livekit/agents-plugin-openai": "^1.0.0"  ← for Deepseek (OpenAI-compatible endpoint)
```

Custom Sarvam integration via `node-fetch` or `axios` since no official plugin exists:
```json
"node-fetch": "^3.3.2"
```

**Command:** `npm install --prefix agent`

---

### Task 2.8 — Write the Gemini Live agent module

**File:** `agent/modes/geminiLive.js` (new file)

This module exports a single function `startGeminiSession(ctx, demoCallId)`:

- Creates a `voice.AgentSession` using `@livekit/agents-plugin-google`:
  ```js
  import * as google from '@livekit/agents-plugin-google';
  const session = new voice.AgentSession({
    llm: new google.realtime.GeminiRealtimeModel({
      model: 'gemini-2.0-flash-live-001',
      voice: 'Aoede',   // or nearest to Indian English
      apiKey: process.env.GEMINI_API_KEY,
    }),
  });
  ```
- Starts session with the full Priya system prompt (same prompt as the removed OpenAI version)
- Triggers the opening greeting: `session.generateReply({ instructions: '...' })`
- Tracks token usage from session events — on each `response.done` event, reads `usage.input_tokens` and `usage.output_tokens`
- After each turn, POSTs to `${DEMO_BACKEND_URL}/api/demo/call/${demoCallId}/usage` with token counts
- Returns the session so `agent.js` can call `endCall` on disconnect

---

### Task 2.9 — Write the Sarvam Pipeline agent module

**File:** `agent/modes/sarvamPipeline.js` (new file)

This module exports `startSarvamSession(ctx, demoCallId)`:

- Uses `@livekit/agents` STT → LLM → TTS pipeline slots:
  ```js
  // STT: Sarvam Saarika (custom plugin or fetch-based)
  // LLM: Deepseek via OpenAI-compatible endpoint
  // TTS: Sarvam Bulbul (custom plugin or fetch-based)
  const session = new voice.AgentSession({
    stt: new SarvamSTT({ apiKey: process.env.SARVAM_API_KEY }),
    llm: new openai.LLM({
      model: 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    }),
    tts: new SarvamTTS({ apiKey: process.env.SARVAM_API_KEY }),
  });
  ```
- After each STT result: records `sttAudioSecs`
- After each LLM response: records `llmInputTokens`, `llmOutputTokens`
- After each TTS synthesis: records `ttsCharacters`
- POSTs usage snapshots to backend after each turn

Note: If `@livekit/agents` does not have built-in Sarvam plugin support, write thin wrapper classes that implement the expected `STT` and `TTS` interfaces of `@livekit/agents`.

---

### Task 2.10 — Rewrite agent.js to support multi-mode dispatch

**File:** `agent/agent.js` (full rewrite of entry function)

Logic:
```js
export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect();

    // Read mode and demoCallId from room metadata
    const metadata = JSON.parse(ctx.room.metadata || '{}');
    const mode = metadata.mode || 'GEMINI_LIVE';
    const demoCallId = metadata.demoCallId || null;

    if (mode === 'GEMINI_LIVE') {
      await startGeminiSession(ctx, demoCallId);
    } else if (mode === 'SARVAM_PIPELINE') {
      await startSarvamSession(ctx, demoCallId);
    } else {
      console.warn(`[Agent] Unknown mode: ${mode}, defaulting to Gemini Live`);
      await startGeminiSession(ctx, demoCallId);
    }
  },
});
```

---

### Task 2.11 — Update backend demo controller to include demoCallId in room metadata

**File:** `backend/src/controllers/demo.controller.js`

In `startCall`:
- After creating the `DemoCall` record, include `demoCallId` in the LiveKit room metadata:
  ```js
  const metadata = JSON.stringify({ mode: activeMode, demoCallId: demoCall.id });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, roomMetadata: metadata });
  ```
- This ensures the agent knows which DB record to update with usage

---

### Task 2.12 — Add Priya system prompt as shared constant

**File:** `agent/prompts/priya.js` (new file)

Extract the Priya persona system prompt from the old `agent.js` into this module. Both `geminiLive.js` and `sarvamPipeline.js` import from this file so the persona is consistent across modes.

The prompt should include:
- Priya's name and role at Seagull Science Academy
- Personality traits
- Academy knowledge (courses, fees, batch sizes, success stats)
- Call objectives (in order)
- Outcome guidelines
- Language instruction (clear Indian English)

---

### Task 2.13 — Test Gemini Live mode end-to-end

**Manual test:**
1. Restart `npm run dev`
2. Open demo dashboard at `http://localhost:5174` (Phase 3) OR test via curl:
   - `POST /api/demo/mode` `{ "mode": "GEMINI_LIVE" }`
   - `POST /api/demo/call/start` `{ "contactName": "Test User" }`
   - Connect browser to LiveKit using returned token
3. Speak into microphone — Priya should respond using Gemini voice
4. Verify in backend logs: usage updates being received
5. `POST /api/demo/call/:id/end` and verify `totalCostInr` computed

---

### Task 2.14 — Test Sarvam Pipeline mode end-to-end

Same as Task 2.13 but with `mode: "SARVAM_PIPELINE"`. Verify:
- Sarvam STT correctly transcribes speech
- Deepseek generates response
- Sarvam TTS speaks the response
- `sttAudioSecs`, `llmInputTokens`, `llmOutputTokens`, `ttsCharacters` are logged to DB

---

## Phase 3 — Cost Dashboard Frontend

**Goal:** Standalone React + Vite app at port 5174. No auth. Talks to existing backend at `/api/demo/*`. Allows starting calls, seeing live cost, seeing tool call feed, and comparing modes.

---

### Task 3.1 — Scaffold the cost dashboard

**Directory:** `cost-dashboard/` (at root level, sibling to `backend/`, `frontend/`, `agent/`)

Create the following file structure:
```
cost-dashboard/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api/
    │   └── demo.api.js
    ├── constants/
    │   └── rates.js
    ├── pages/
    │   ├── CallRoom.jsx
    │   └── History.jsx
    └── components/
        ├── ModeSwitch.jsx
        ├── LiveCostTicker.jsx
        ├── ToolCallFeed.jsx
        ├── CostComparisonTable.jsx
        └── CallControls.jsx
```

---

### Task 3.2 — Write cost-dashboard/package.json

Dependencies needed:
- `react`, `react-dom`
- `react-router-dom`
- `livekit-client` (for WebRTC room connection)
- `vite`, `@vitejs/plugin-react` (devDependencies)
- `tailwindcss`, `autoprefixer`, `postcss` (devDependencies)

Port: `5174` (configured in vite.config.js)

Proxy: All `/api/*` requests proxied to `http://localhost:3001` in vite.config.js so no CORS issues.

Scripts:
```json
"dev": "vite",
"build": "vite build",
"preview": "vite preview"
```

---

### Task 3.3 — Write vite.config.js for cost-dashboard

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

---

### Task 3.4 — Write cost-dashboard/src/constants/rates.js

Mirror the pricing constants from the backend controller. Same numbers, same structure. This file is used to compute live cost in the browser without waiting for a backend round-trip.

```js
export const RATES = {
  INR_PER_USD: 96,
  GEMINI_LIVE: {
    audioInputPerMillionTokens:  67.20,
    audioOutputPerMillionTokens: 816.00,
    tokensPerSecond: 25,
  },
  SARVAM_PIPELINE: {
    sttPerMinute: 0.48,
    ttsPerMinute: 0.67,
    deepseekInputPerMillion:  25.92,
    deepseekOutputPerMillion: 105.60,
  },
};

export function computeCostInr(mode, usage) { ... }  // pure function, no API calls
```

---

### Task 3.5 — Write cost-dashboard/src/api/demo.api.js

Thin wrappers around fetch calls to `/api/demo/*`:

```js
export const demoApi = {
  getConfig:    ()         => fetch('/api/demo/config').then(r => r.json()),
  setMode:      (mode)     => fetch('/api/demo/mode', { method: 'POST', ... }),
  startCall:    (body)     => fetch('/api/demo/call/start', { method: 'POST', ... }),
  endCall:      (id, body) => fetch(`/api/demo/call/${id}/end`, { method: 'POST', ... }),
  listCalls:    (params)   => fetch(`/api/demo/calls?${params}`).then(r => r.json()),
  getCall:      (id)       => fetch(`/api/demo/calls/${id}`).then(r => r.json()),
  getSummary:   ()         => fetch('/api/demo/summary').then(r => r.json()),
};
```

---

### Task 3.6 — Write ModeSwitch component

**File:** `cost-dashboard/src/components/ModeSwitch.jsx`

- Shows two large toggle buttons: "Gemini Live" and "Sarvam Pipeline"
- Clicking one calls `POST /api/demo/mode` immediately
- Shows current active mode with a green indicator
- Disabled while a call is active (can't switch mid-call)
- Shows estimated ₹/min for each mode below the button so user knows what they're picking:
  - Gemini Live: ~₹0.66/min
  - Sarvam Pipeline: ~₹1.26/min

---

### Task 3.7 — Write CallControls component

**File:** `cost-dashboard/src/components/CallControls.jsx`

Props: `{ onStart, onEnd, isActive, isConnecting }`

- Contact input fields: Name, Phone (optional), Course (optional)
- "Start Call" button → triggers `onStart` with contact details
- "End Call" button → triggers `onEnd` (shown only when call is active)
- Mic mute toggle (uses `room.localParticipant.setMicrophoneEnabled()`)
- Status badge: IDLE / CONNECTING / WAITING FOR AGENT / IN CALL / ENDED

---

### Task 3.8 — Write LiveCostTicker component

**File:** `cost-dashboard/src/components/LiveCostTicker.jsx`

Props: `{ mode, usage, startedAt, isActive }`

- Displays a grid of metrics that update in real time:
  - Duration (clock ticking up)
  - Total cost so far (₹X.XX) — computed client-side from `usage` using `computeCostInr()`
  - Cost per minute (₹X.XX/min)
  - Mode-specific metrics:
    - If Gemini Live: Input tokens, Output tokens
    - If Sarvam: STT seconds, TTS characters, LLM input tokens, LLM output tokens
- All numbers animate smoothly when they change
- When call ends, shows final values in green with a "✓ Call completed" badge

---

### Task 3.9 — Write ToolCallFeed component

**File:** `cost-dashboard/src/components/ToolCallFeed.jsx`

Props: `{ demoCallId, isActive }`

- Polls `GET /api/demo/calls/:id` every 2 seconds while call is active
- Displays a scrolling log of MCP tool calls in real time:
  ```
  11:24:01  lookup_contact
            → { found: true, name: "Rahul Sharma" }
  
  11:24:08  get_course_info  (iit-jee)
            → { fee: "₹8000/month", batches: [...] }
  
  11:24:22  schedule_appointment
            → { appointment_id: "abc123", stage: "DEMO_SCHEDULED" }
  ```
- Each tool call shows: timestamp, tool name, key argument (abbreviated), key result value
- Color coding: green for success, red for errors
- Auto-scrolls to bottom as new calls arrive
- When no calls yet: shows "No tool calls yet — start a conversation"

---

### Task 3.10 — Write CostComparisonTable component

**File:** `cost-dashboard/src/components/CostComparisonTable.jsx`

Props: `{ summary }` (from `GET /api/demo/summary`)

- Two-column comparison table:

  | Metric | Gemini Live | Sarvam Pipeline |
  |--------|------------|-----------------|
  | Calls completed | 8/10 | 3/10 |
  | Avg ₹/min | ₹0.66 | ₹1.26 |
  | Avg cost/call | ₹1.98 | ₹3.78 |
  | Avg duration | 2m 58s | 3m 01s |
  | Total spent | ₹15.84 | ₹11.34 |

- Progress bar showing "X/10 calls" for each mode
- When a mode hits 10 calls, its column gets a "✓ Benchmark complete" badge
- Refresh automatically when a call ends

---

### Task 3.11 — Write CallRoom page

**File:** `cost-dashboard/src/pages/CallRoom.jsx`

This is the main page. Composes all components:

```
┌─────────────────────────────────────────────────────────────┐
│  Priya AI · Cost Benchmark Dashboard                         │
│                                                              │
│  [ModeSwitch component]                                      │
│                                                              │
│  ┌─────────────────────────┐  ┌────────────────────────┐    │
│  │  LiveCostTicker         │  │  ToolCallFeed          │    │
│  │                         │  │                        │    │
│  │  Duration: 02:14        │  │  lookup_contact →      │    │
│  │  Cost: ₹1.47           │  │  get_course_info →     │    │
│  │  ₹/min: 0.66           │  │  schedule_appt →       │    │
│  │                         │  │                        │    │
│  │  Input tokens: 3,840    │  │                        │    │
│  │  Output tokens: 2,190   │  │                        │    │
│  └─────────────────────────┘  └────────────────────────┘    │
│                                                              │
│  [CallControls component]                                    │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [CostComparisonTable component]                             │
└─────────────────────────────────────────────────────────────┘
```

State managed in this page:
- `activeMode` — fetched from `/api/demo/config` on mount
- `currentCall` — `{ demoCallId, roomName, token, url }` — set on start, cleared on end
- `usage` — updated by polling `/api/demo/calls/:id` every 2s during call
- `room` — LiveKit `Room` instance (connect on start, disconnect on end)
- `summary` — fetched from `/api/demo/summary`, refreshed after each call ends

LiveKit flow (same as VoiceCallWidget in CRM):
1. `POST /api/demo/call/start` → get token + demoCallId
2. `room.connect(url, token)`
3. `room.localParticipant.setMicrophoneEnabled(true)`
4. Subscribe to agent audio track → auto-plays
5. Poll usage every 2s
6. On end: `room.disconnect()` + `POST /api/demo/call/:id/end`

---

### Task 3.12 — Write History page

**File:** `cost-dashboard/src/pages/History.jsx`

- Fetches `GET /api/demo/calls?limit=100`
- Shows a sortable table:
  - Call # | Mode | Contact | Duration | Cost (₹) | ₹/min | Tool Calls | Date
- Clicking a row expands to show the full `DemoToolCall` log for that call
- Filter buttons at top: All / Gemini Live / Sarvam Pipeline
- "Clear history" button (calls a DELETE endpoint — add to backend in Task 1.5)

---

### Task 3.13 — Wire App.jsx with routing

**File:** `cost-dashboard/src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import CallRoom from './pages/CallRoom';
import History from './pages/History';

export default function App() {
  return (
    <BrowserRouter>
      <nav>  {/* top bar with two nav links */}  </nav>
      <Routes>
        <Route path="/" element={<CallRoom />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

### Task 3.14 — Install cost-dashboard dependencies

**Command:** `npm install --prefix cost-dashboard`

Verify Vite starts on port 5174 without errors:
```
npm run dev --prefix cost-dashboard
```

---

### Task 3.15 — Manual end-to-end test of cost dashboard

**Test checklist:**
1. Open `http://localhost:5174`
2. Mode shows "Gemini Live" (default)
3. Switch to "Sarvam Pipeline" → verify `/api/demo/mode` called
4. Switch back to "Gemini Live"
5. Enter contact name "Test Rahul", click Start Call
6. Verify: LiveKit connection established, mic enabled, agent joins and speaks
7. Verify: cost ticker starts counting up
8. Ask agent "Tell me about IIT-JEE fees" → verify `get_course_info` appears in ToolCallFeed
9. Say "I'd like to attend a demo class tomorrow" → verify `schedule_appointment` fires
10. Click End Call → verify final cost displayed
11. Go to `/history` → verify call appears with correct cost and tool call count
12. Run 2-3 more calls → verify comparison table updates

---

## Phase 4 — Root Script Update + Git Push

**Goal:** Single `npm run dev` starts all 4 processes. Everything committed to GitHub.

---

### Task 4.1 — Update root package.json dev script

**File:** `package.json` (root)

Update `"dev"` script:
```json
"dev": "concurrently --names \"CRM-API,CRM-UI,AGENT,COST-UI\" --prefix-colors \"cyan,magenta,green,yellow\" \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\" \"npm run dev --prefix agent\" \"npm run dev --prefix cost-dashboard\""
```

Add individual dev script:
```json
"dev:cost": "npm run dev --prefix cost-dashboard"
```

---

### Task 4.2 — Update root package.json install:all script

**File:** `package.json` (root)

```json
"install:all": "npm install && npm install --prefix backend && npm install --prefix frontend && npm install --prefix agent && npm install --prefix cost-dashboard"
```

---

### Task 4.3 — Update root package.json setup script

**File:** `package.json` (root)

```json
"setup": "npm run install:all && npm run db:push && npm run db:seed"
```

Add:
```json
"db:push": "npx prisma db push --prefix backend"
```

---

### Task 4.4 — Verify single-command startup

**Test:**
```bash
cd "VoiceAgent-main (1)/VoiceAgent-main"
npm run dev
```

Confirm all 4 colored streams appear:
- **[CRM-API]** cyan — Backend on 3001
- **[CRM-UI]** magenta — Frontend on 5173
- **[AGENT]** green — Agent registered with LiveKit
- **[COST-UI]** yellow — Cost dashboard on 5174

---

### Task 4.5 — Update .env.example files

**File:** `backend/.env.example`
- Add `GEMINI_API_KEY=`, `SARVAM_API_KEY=`, `DEEPSEEK_API_KEY=` with comments

**File:** `agent/.env.example`
- Add `GEMINI_API_KEY=`, `SARVAM_API_KEY=`, `DEEPSEEK_API_KEY=`, `DEMO_BACKEND_URL=`

**File:** `cost-dashboard/.env.example` (new)
- `VITE_API_URL=http://localhost:3001`

---

### Task 4.6 — Add cost-dashboard to .gitignore

Verify root `.gitignore` covers `cost-dashboard/node_modules` and `cost-dashboard/.env` — it should since patterns `node_modules/` and `.env` are already there.

---

### Task 4.7 — Commit and push all Phase 0-4 changes

Stage all new and modified files — **excluding all `.env` files with real credentials**.

Files to stage:
- `agent/agent.js` (rewritten)
- `agent/package.json`
- `agent/package-lock.json`
- `agent/.env.example`
- `agent/modes/geminiLive.js`
- `agent/modes/sarvamPipeline.js`
- `agent/prompts/priya.js`
- `backend/prisma/schema.prisma`
- `backend/src/controllers/demo.controller.js`
- `backend/src/routes/demo.routes.js`
- `backend/src/index.js`
- `backend/.env.example`
- `cost-dashboard/` (entire directory except node_modules and .env)
- `package.json` (root)
- `package-lock.json` (root)

Commit message:
```
feat: multi-mode AI agent + cost benchmark dashboard

- Remove OpenAI Realtime (too expensive)
- Add Gemini Live mode (gemini-2.0-flash-live-001)
- Add Sarvam+Deepseek pipeline mode
- Agent reads room metadata to select mode at dispatch time
- New Prisma models: DemoCall, DemoToolCall
- New backend routes: /api/demo/* (8 endpoints)
- New cost-dashboard frontend (port 5174)
  - Mode switcher (Gemini Live / Sarvam Pipeline)
  - Live cost ticker in INR during calls
  - Real-time MCP tool call feed
  - 10-call benchmark comparison table
  - Full call history with tool call logs
- Root dev command now starts 4 processes
```

---

## Phase 5 — Self-Hosted LiveKit (VPS Deployment)

**Goal:** Move off LiveKit Cloud onto a self-hosted LiveKit server on a VPS. Zero code changes — only env vars and server setup.

---

### Task 5.1 — Choose and provision a VPS

**Manual step:**

Minimum spec for LiveKit + Express + Node agent:
- 2 vCPU, 2GB RAM, 50GB SSD
- Ubuntu 22.04 LTS
- Providers: DigitalOcean ($12/mo), Hetzner (€4.51/mo — best value), Vultr ($12/mo)
- Must have a **public IPv4 address** (LiveKit WebRTC needs it for UDP)
- Optional but recommended: point a domain to this IP (e.g. `voice.seagull.ai`)

---

### Task 5.2 — Install Docker and Docker Compose on VPS

**Commands to run on VPS:**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin
```

Verify: `docker --version` and `docker compose version`

---

### Task 5.3 — Write LiveKit server config file

**File:** `infra/livekit.yaml` (new directory in repo)

```yaml
port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true    # CRITICAL — tells LiveKit to advertise the VPS public IP
  enable_loopback_candidate: false
keys:
  seagull-key: seagull-secret-change-this-in-prod   # you define these — can be anything
logging:
  level: info
```

This replaces LiveKit Cloud entirely. The `keys` block is where you define your own API key and secret.

---

### Task 5.4 — Write docker-compose.yml for VPS deployment

**File:** `infra/docker-compose.yml`

```yaml
version: '3.8'
services:
  livekit:
    image: livekit/livekit-server:latest
    restart: unless-stopped
    ports:
      - "7880:7880"
      - "7881:7881/tcp"
      - "7882:7882/udp"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
    command: --config /etc/livekit.yaml

  backend:
    build: ../backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file: ../backend/.env
    depends_on:
      - livekit

  agent:
    build: ../agent
    restart: unless-stopped
    env_file: ../agent/.env
    depends_on:
      - livekit
      - backend
```

Note: Frontend is served as static files via Nginx (not in Docker — or add a frontend service). Decide at deployment time.

---

### Task 5.5 — Open VPS firewall ports

**On VPS:**
```bash
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw allow 7880/tcp     # LiveKit HTTP/WS
sudo ufw allow 7881/tcp     # LiveKit WebRTC TCP
sudo ufw allow 7882/udp     # LiveKit WebRTC UDP
sudo ufw allow 3001/tcp     # Backend API
sudo ufw enable
```

UDP 7882 is critical — WebRTC audio uses UDP. Without it, audio will not work.

---

### Task 5.6 — Update environment variables for self-hosted LiveKit

**File:** `backend/.env` (on VPS)
```
LIVEKIT_URL=wss://your-vps-ip-or-domain:7880
LIVEKIT_API_KEY=seagull-key
LIVEKIT_API_SECRET=seagull-secret-change-this-in-prod
```

**File:** `agent/.env` (on VPS)
```
LIVEKIT_URL=wss://your-vps-ip-or-domain:7880
LIVEKIT_API_KEY=seagull-key
LIVEKIT_API_SECRET=seagull-secret-change-this-in-prod
```

**File:** `frontend/.env` (rebuild needed after change)
```
VITE_LIVEKIT_URL=wss://your-vps-ip-or-domain:7880
```

**Exactly 3 env changes. Zero code changes.**

---

### Task 5.7 — Deploy and verify self-hosted LiveKit

**On VPS:**
```bash
cd infra
docker compose up -d
```

Verify:
- `docker compose logs livekit` shows "LiveKit server started"
- From local browser: open CRM → start a call → confirm agent registers and audio works
- Check AGENT logs: `connected to LiveKit server` at your VPS address (not livekit.cloud)

---

### Task 5.8 — Add HTTPS/TLS via Nginx reverse proxy (optional but recommended for production)

**Purpose:** Browsers require HTTPS for microphone access on non-localhost origins.

Install Nginx + Certbot on VPS:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Configure Nginx to proxy:
- `wss://voice.seagull.ai` → `ws://localhost:7880` (LiveKit)
- `https://voice.seagull.ai/api` → `http://localhost:3001` (Backend)
- `https://voice.seagull.ai` → static frontend build

Get SSL cert:
```bash
sudo certbot --nginx -d voice.seagull.ai
```

---

## Summary Table

| Phase | Goal | Key Deliverable | Estimated Effort |
|-------|------|-----------------|-----------------|
| 0 | Remove OpenAI | Agent starts without OpenAI | 1-2 hours |
| 1 | Backend schema + routes | `/api/demo/*` working, DB migrated | 3-4 hours |
| 2 | Agent multi-mode | Gemini Live + Sarvam Pipeline voice calls working | 4-6 hours |
| 3 | Cost dashboard frontend | Full benchmark UI at port 5174 | 4-5 hours |
| 4 | Root script + Git | Single `npm run dev`, everything committed | 1 hour |
| 5 | Self-hosted LiveKit | VPS running, cloud dependency removed | 2-3 hours |

**Total estimated effort: 15-21 hours of implementation work**

---

## Pricing Reference (INR at ₹96/USD)

| Stack | Per Minute | Per 3-min Call | 1000 Calls/Month |
|-------|-----------|----------------|-----------------|
| ~~OpenAI Realtime~~ (removed) | ~~₹43.20~~ | ~~₹129.60~~ | ~~₹1,29,600~~ |
| Gemini Live API | ₹0.66 | ₹1.98 | ₹1,980 |
| Sarvam + Deepseek | ₹1.26 | ₹3.78 | ₹3,780 |

> All pricing is approximate. Sarvam pricing requires account-level verification.  
> Gemini Live API is in preview — verify pricing at https://ai.google.dev/pricing  
> Deepseek pricing confirmed at https://platform.deepseek.com/docs  
> Rate: ₹96 per $1 USD as of October 2026  
