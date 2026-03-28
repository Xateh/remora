# Two-Wave Discovery Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the backend pipeline from a single TinyFish + OpenAI pass into a four-phase pipeline: keyword expansion → wave-1 discovery → wave-2 retrieval → per-resource annotation.

**Architecture:** `processSession()` in `lib/services.ts` is split into four named async phase functions called sequentially. Types live in `lib/store.ts`. The client-facing `JobStatus` type in `lib/api.ts` is updated to match. No new files, no new routes, no new dependencies.

**Tech Stack:** TypeScript, Next.js 16 App Router, OpenAI SDK (`openai.chat.completions.create`), TinyFish SDK (`tinyfish.agent.stream`), in-memory LRU session store.

---

## File Map

| File | What changes |
|------|-------------|
| `lib/store.ts` | Add `KeywordSet`, `DiscoveredResource`, `ResourceWithCommentary` interfaces; replace `FinalResults` body; add `EXPANDING` + `RETRIEVING` to status union; remove now-unused `AnalysisResult` |
| `lib/services.ts` | Replace entire file: four phase functions + updated `processSession` |
| `lib/api.ts` | Add `EXPANDING`, `RETRIEVING`, `SCOPES_READY` to `JobStatus`; update `getJobStatus` return type to use `ResourceWithCommentary[]` |

---

## Task 1: Create the feature branch

**Files:** none (git only)

- [ ] **Step 1: Create and switch to branch**

```bash
git checkout -b feat/two-wave-pipeline
```

Expected output: `Switched to a new branch 'feat/two-wave-pipeline'`

---

## Task 2: Update `lib/store.ts` — types and status union

**Files:**
- Modify: `lib/store.ts`

- [ ] **Step 1: Replace the file with the updated types**

Replace the entire contents of `lib/store.ts` with:

```ts
import { LRUCache } from "lru-cache";

// Simple in-memory store for session-based data.
// In a serverless environment like Vercel, this won't persist across requests properly
// but it works for local development and single-session ephemeral processing.

export interface KeywordSet {
  scope: string;
  keywords: string[]; // 3-5 search query variants
}

export interface DiscoveredResource {
  scope: string;
  title: string;
  url?: string;        // direct link if wave 1 found one
  university?: string; // fallback identifier
  query?: string;      // search query for wave 2 if no direct URL
}

export interface ResourceWithCommentary {
  scope: string;
  title: string;
  url?: string;
  university?: string;
  summary: string;     // what the resource covers (from wave-2 TinyFish)
  commentary: string;  // what it adds beyond the user's slides (from OpenAI)
  error?: string;      // set if wave-2 retrieval failed; resource still included
}

export interface FinalResults {
  resources: ResourceWithCommentary[];
}

export interface ProgressLog {
  timestamp: string;
  scope: string;
  message: string;
  type: "PROGRESS" | "SYSTEM" | "ERROR";
}

export interface SessionData {
  id: string;
  slidesContent: string;
  scopes: string[];
  objective?: string;
  status:
    | "IDENTIFYING"
    | "SCOPES_READY"
    | "EXPANDING"
    | "DISCOVERING"
    | "RETRIEVING"
    | "ANALYZING"
    | "COMPLETED"
    | "FAILED";
  results?: FinalResults;
  logs: ProgressLog[];
  streamingUrls: Record<string, string>;
  error?: string;
}

const options = {
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour
};

const cache = new LRUCache<string, SessionData>(options);

export const store = {
  set: (id: string, data: SessionData) => cache.set(id, data),
  get: (id: string) => cache.get(id),
  update: (id: string, data: Partial<SessionData>) => {
    const current = cache.get(id);
    if (current) {
      cache.set(id, { ...current, ...data });
    }
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/store.ts
git commit -m "feat: update store types for two-wave pipeline"
```

---

## Task 3: Update `lib/api.ts` — client-facing types

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `lib/api.ts` with:

```ts
import { ResourceWithCommentary } from "./store";

export type JobStatus =
  | "IDENTIFYING"
  | "SCOPES_READY"
  | "EXPANDING"
  | "DISCOVERING"
  | "RETRIEVING"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function uploadContent(
  content: string
): Promise<{ sessionId: string }> {
  return apiFetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function analyzeScope(sessionId: string): Promise<{ scopes: string[] }> {
  return apiFetch("/api/analyze-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

export function selectObjective(
  sessionId: string,
  selectedScopes: string[],
  objective: string
): Promise<{ status: string }> {
  return apiFetch("/api/select-objective", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, selectedScopes, objective }),
  });
}

export function getJobStatus(sessionId: string): Promise<{
  status: JobStatus;
  scopes: string[];
  results?: { resources: ResourceWithCommentary[] };
  error?: string;
}> {
  return apiFetch(`/api/job-status/${sessionId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api.ts
git commit -m "feat: update api.ts JobStatus and result types for two-wave pipeline"
```

---

## Task 4: Rewrite `lib/services.ts` — four-phase pipeline

**Files:**
- Modify: `lib/services.ts`

This is the core change. The file is replaced entirely with four phase functions and an updated `processSession`.

- [ ] **Step 1: Replace `lib/services.ts`**

```ts
import { store, KeywordSet, DiscoveredResource, ResourceWithCommentary, SessionData } from "./store";
import tinyfish from "./tinyfish";
import openai from "./openai";

// Narrowed type for TinyFish stream events (SDK doesn't export its own types)
type TinyFishEvent =
  | { type: "STREAMING_URL"; streaming_url: string; timestamp: string }
  | { type: "PROGRESS"; purpose: string; timestamp: string }
  | { type: "COMPLETE"; result?: unknown; error?: { message: string }; timestamp: string }
  | { type: string; [key: string]: unknown };

function addLog(
  sessionId: string,
  scope: string,
  message: string,
  type: "PROGRESS" | "SYSTEM" | "ERROR"
) {
  const current = store.get(sessionId);
  if (!current) return;
  store.update(sessionId, {
    logs: [
      ...current.logs,
      { timestamp: new Date().toISOString(), scope, message, type },
    ],
  });
}

// ── Phase 1: Keyword Expansion ────────────────────────────────────────────────
// One OpenAI call — generates 3-5 search query variants per scope.
async function expandKeywords(session: SessionData): Promise<KeywordSet[]> {
  const scopeList = session.scopes.join(", ");
  const objective = session.objective ?? "find lecture materials and past year papers";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an academic search strategist. For each scope, generate 3-5 Google search query strings that will find lecture slides, assignments, and past year papers from top universities. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Objective: ${objective}\n\nScopes: ${scopeList}\n\nReturn a JSON array where each element has:\n- "scope": string (exact scope name)\n- "keywords": string[] (3-5 search queries)\n\nExample: [{"scope":"Linear Algebra","keywords":["MIT linear algebra lecture slides","Stanford 18.06 assignments pdf","linear algebra past year papers top university"]}]`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(text);
  // Model may return { keywordSets: [...] } or a bare array wrapped in a key
  const raw: unknown[] = Array.isArray(parsed)
    ? parsed
    : (parsed.keywordSets ?? parsed.scopes ?? parsed.result ?? Object.values(parsed)[0]);

  const keywordSets: KeywordSet[] = (raw as Array<{ scope: string; keywords: string[] }>).map(
    (item) => ({ scope: item.scope, keywords: item.keywords })
  );

  for (const ks of keywordSets) {
    addLog(session.id, ks.scope, `Keywords: ${ks.keywords.join(" | ")}`, "SYSTEM");
  }

  return keywordSets;
}

// ── Phase 2: Wave-1 Discovery ─────────────────────────────────────────────────
// One TinyFish agent per keyword set. Finds university names + direct links.
async function discoverResources(
  session: SessionData,
  keywordSets: KeywordSet[]
): Promise<DiscoveredResource[]> {
  const allDiscovered: DiscoveredResource[] = [];

  const tasks = keywordSets.flatMap((ks) =>
    ks.keywords.map(async (keyword) => {
      addLog(session.id, ks.scope, `Discovering: "${keyword}"`, "PROGRESS");

      const stream = (tinyfish.agent.stream as (opts: { url: string; goal: string }) => AsyncIterable<TinyFishEvent>)({
        url: "https://www.google.com/search?q=" + encodeURIComponent(keyword),
        goal: `Search for university lecture materials, slides, assignments, and past year papers about "${keyword}". Return a JSON array of objects, each with: title (string), url (string or null), university (string or null), query (string — what to search if no direct URL).`,
      });

      let rawResult = "";
      for await (const event of stream) {
        if (event.type === "STREAMING_URL") {
          const urls = store.get(session.id)?.streamingUrls ?? {};
          store.update(session.id, { streamingUrls: { ...urls, [keyword]: event.streaming_url } });
        } else if (event.type === "PROGRESS") {
          addLog(session.id, ks.scope, event.purpose, "PROGRESS");
        } else if (event.type === "COMPLETE") {
          if (event.result) {
            rawResult = typeof event.result === "string" ? event.result : JSON.stringify(event.result);
          } else if (event.error) {
            addLog(session.id, ks.scope, `Wave-1 error for "${keyword}": ${event.error.message}`, "ERROR");
          }
        }
      }

      // Parse agent output into DiscoveredResource[]
      try {
        const jsonMatch = rawResult.match(/\[[\s\S]*\]/);
        const items = JSON.parse(jsonMatch ? jsonMatch[0] : rawResult) as Array<{
          title?: string;
          url?: string;
          university?: string;
          query?: string;
        }>;
        return items.map((item) => ({
          scope: ks.scope,
          title: item.title ?? keyword,
          url: item.url ?? undefined,
          university: item.university ?? undefined,
          query: item.query ?? keyword,
        }));
      } catch {
        addLog(session.id, ks.scope, `Failed to parse wave-1 output for "${keyword}"`, "ERROR");
        return [];
      }
    })
  );

  const settled = await Promise.allSettled(tasks);
  for (const r of settled) {
    if (r.status === "fulfilled") {
      allDiscovered.push(...r.value);
    }
  }

  return allDiscovered;
}

// ── Phase 3: Wave-2 Retrieval ─────────────────────────────────────────────────
// One TinyFish agent per discovered resource. Retrieves and digests content.
async function retrieveResources(
  session: SessionData,
  discovered: DiscoveredResource[]
): Promise<Array<DiscoveredResource & { summary: string; retrievalError?: string }>> {
  const tasks = discovered.map(async (resource) => {
    const target = resource.url
      ? resource.url
      : "https://www.google.com/search?q=" +
        encodeURIComponent(`${resource.university ?? ""} ${resource.query ?? resource.title} lecture slides`);

    addLog(session.id, resource.scope, `Retrieving: ${resource.title}`, "PROGRESS");

    try {
      const stream = (tinyfish.agent.stream as (opts: { url: string; goal: string }) => AsyncIterable<TinyFishEvent>)({
        url: target,
        goal: `Retrieve and summarise the academic content at this URL or from the top search result. Focus on: topics covered, depth of coverage, exercises included, and any past year papers. Return a plain-text summary of 100-200 words.`,
      });

      let summary = "";
      for await (const event of stream) {
        if (event.type === "PROGRESS") {
          addLog(session.id, resource.scope, event.purpose, "PROGRESS");
        } else if (event.type === "COMPLETE") {
          if (event.result) {
            summary = typeof event.result === "string" ? event.result : JSON.stringify(event.result);
          } else if (event.error) {
            throw new Error(event.error.message);
          }
        }
      }

      return { ...resource, summary };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown retrieval error";
      addLog(session.id, resource.scope, `Retrieval failed for "${resource.title}": ${message}`, "ERROR");
      return { ...resource, summary: "", retrievalError: message };
    }
  });

  const settled = await Promise.allSettled(tasks);
  return settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const message = r.reason instanceof Error ? r.reason.message : "Unknown error";
    return { ...discovered[i], summary: "", retrievalError: message };
  });
}

// ── Phase 4: Annotation ───────────────────────────────────────────────────────
// One OpenAI call — produces per-resource commentary vs. original slides.
async function annotateResources(
  retrieved: Array<DiscoveredResource & { summary: string; retrievalError?: string }>,
  slidesContent: string
): Promise<ResourceWithCommentary[]> {
  // Resources that failed retrieval get a placeholder commentary
  const withContent = retrieved.filter((r) => r.summary);
  const failed = retrieved.filter((r) => !r.summary);

  const resourceList = withContent
    .map((r, i) => `[${i}] Title: ${r.title}\nScope: ${r.scope}\nUniversity: ${r.university ?? "unknown"}\nSummary: ${r.summary}`)
    .join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an educational assistant. For each resource, write a short commentary (2-3 sentences) explaining what it adds to or reinforces from the student's existing slides. Be specific about concepts, depth, or exercises. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Original Slides Content:\n${slidesContent}\n\n---\n\nResources to annotate:\n${resourceList}\n\nReturn a JSON array with one object per resource (same order as input), each with:\n- "index": number (matching [N] above)\n- "commentary": string`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const text = response.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(text);
  const annotations: Array<{ index: number; commentary: string }> = Array.isArray(parsed)
    ? parsed
    : (parsed.annotations ?? parsed.resources ?? parsed.result ?? Object.values(parsed)[0]);

  const commentaryMap = new Map(annotations.map((a) => [a.index, a.commentary]));

  const annotated: ResourceWithCommentary[] = withContent.map((r, i) => ({
    scope: r.scope,
    title: r.title,
    url: r.url,
    university: r.university,
    summary: r.summary,
    commentary: commentaryMap.get(i) ?? "",
  }));

  const failedWithPlaceholder: ResourceWithCommentary[] = failed.map((r) => ({
    scope: r.scope,
    title: r.title,
    url: r.url,
    university: r.university,
    summary: "",
    commentary: "",
    error: r.retrievalError,
  }));

  return [...annotated, ...failedWithPlaceholder];
}

// ── Orchestrator ──────────────────────────────────────────────────────────────
export async function processSession(sessionId: string) {
  const session = store.get(sessionId);
  if (!session) return;

  try {
    // Phase 1 — Keyword Expansion
    store.update(sessionId, { status: "EXPANDING", logs: [], streamingUrls: {} });
    console.log(`[Pipeline] EXPANDING — session ${sessionId}`);
    const keywordSets = await expandKeywords(session);

    // Phase 2 — Wave-1 Discovery
    store.update(sessionId, { status: "DISCOVERING" });
    console.log(`[Pipeline] DISCOVERING — ${keywordSets.flatMap((k) => k.keywords).length} queries`);
    const discovered = await discoverResources(store.get(sessionId)!, keywordSets);
    addLog(sessionId, "system", `Discovered ${discovered.length} resources`, "SYSTEM");

    // Phase 3 — Wave-2 Retrieval
    store.update(sessionId, { status: "RETRIEVING" });
    console.log(`[Pipeline] RETRIEVING — ${discovered.length} resources`);
    const retrieved = await retrieveResources(store.get(sessionId)!, discovered);

    // Phase 4 — Annotation
    store.update(sessionId, { status: "ANALYZING" });
    console.log(`[Pipeline] ANALYZING`);
    const currentSession = store.get(sessionId)!;
    const resources = await annotateResources(retrieved, currentSession.slidesContent);

    store.update(sessionId, {
      status: "COMPLETED",
      results: { resources },
    });

    console.log(`[Pipeline] COMPLETED — session ${sessionId}, ${resources.length} resources`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Pipeline] FAILED — session ${sessionId}:`, message);
    store.update(sessionId, { status: "FAILED", error: message });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/services.ts
git commit -m "feat: implement four-phase two-wave discovery pipeline"
```

---

## Task 5: Verify TypeScript compiles

**Files:** none (verification only)

- [ ] **Step 1: Run Next.js build to catch type errors**

```bash
npm run build 2>&1 | head -40
```

If you see type errors, fix them before proceeding. Common issues:
- `store.get(sessionId)!` — use the non-null assertion only where you've already checked the session exists at the start of the function
- `Object.values(parsed)[0]` — TypeScript may complain; cast as `unknown[]` if needed

- [ ] **Step 2: If build fails due to Node.js version, check for errors only**

The project requires Node ≥ 20 but the environment may have Node 18. In that case, check for type errors by looking only at TypeScript diagnostics:

```bash
npm run build 2>&1 | grep -E "error TS|Type error" | head -20
```

If no `error TS` lines appear, the types are clean.

---

## Task 6: Smoke test the pipeline manually

**Files:** none (runtime verification)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Note: requires Node ≥ 20. If the environment has Node 18, this step is blocked — skip to verifying types only.

- [ ] **Step 2: Upload content and walk the pipeline**

```bash
# Upload
curl -s -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{"content":"This lecture covers linear algebra: vectors, matrices, eigenvalues, and linear transformations."}' | jq .

# Note the sessionId, then analyze scopes
SESSION_ID=<sessionId from above>
curl -s -X POST http://localhost:3000/api/analyze-scope \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}" | jq .

# Select all scopes and trigger processing
curl -s -X POST http://localhost:3000/api/select-objective \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"selectedScopes\":[\"Linear Algebra\"],\"objective\":\"Find supplementary materials\"}" | jq .

# Poll status until COMPLETED
curl -s http://localhost:3000/api/job-status/$SESSION_ID | jq '{status:.status, resourceCount:(.results.resources | length)}'
```

Expected final output:
```json
{
  "status": "COMPLETED",
  "resourceCount": <number >= 1>
}
```

- [ ] **Step 3: Verify logs show phase progression**

```bash
curl -s http://localhost:3000/api/job-status/$SESSION_ID | jq '.results.resources[0]'
```

Expected shape:
```json
{
  "scope": "Linear Algebra",
  "title": "...",
  "url": "...",
  "university": "...",
  "summary": "...",
  "commentary": "..."
}
```

---

## Self-Review Notes

- All four spec phases are covered: Task 2 (types), Task 4 phases 1-4 (`expandKeywords`, `discoverResources`, `retrieveResources`, `annotateResources`)
- `KeywordSet`, `DiscoveredResource`, `ResourceWithCommentary` defined in Task 2, used in Task 4 — names match exactly
- `EXPANDING` and `RETRIEVING` added to both `store.ts` (Task 2) and `api.ts` (Task 3)
- `Promise.allSettled` used in both TinyFish phases — spec requirement met
- Failed wave-2 resources included with `error` field — spec requirement met
- `expandKeywords` failure → `FAILED` via top-level catch — spec requirement met
- `FinalResults.resources` replaces `rawMaterials + gapAnalysis` — spec requirement met
