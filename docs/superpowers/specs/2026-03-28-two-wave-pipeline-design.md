# Two-Wave Discovery Pipeline Design

**Date:** 2026-03-28
**Status:** Approved

## Context

The current pipeline does a single TinyFish wave to find university materials, then one OpenAI call for a gap analysis. The fuller vision is a four-phase pipeline that:
1. Expands each scope into keyword variants before searching
2. Runs a true second wave of TinyFish agents to retrieve and digest each discovered resource
3. Produces a per-resource commentary: what each resource adds beyond the user's existing slides

Output format: **resource list with commentary** — curated links/references with a note on what each adds beyond the uploaded content.

---

## Pipeline

```
Upload → Analyze Scopes (existing, unchanged)
                ↓
         EXPANDING
         OpenAI generates 3-5 keyword variants per scope
                ↓
         DISCOVERING  (TinyFish wave 1)
         One agent per keyword set — finds university names + direct links
                ↓
         RETRIEVING   (TinyFish wave 2)
         One agent per discovered resource — retrieves and digests content
                ↓
         ANALYZING
         OpenAI produces per-resource commentary vs. original slides
                ↓
         COMPLETED
         FinalResults: ResourceWithCommentary[]
```

**Status flow:** `IDENTIFYING → SCOPES_READY → EXPANDING → DISCOVERING → RETRIEVING → ANALYZING → COMPLETED`

---

## Data Structures

### New types (add to `lib/store.ts`)

```ts
interface KeywordSet {
  scope: string;
  keywords: string[];  // 3-5 search query variants
}

interface DiscoveredResource {
  scope: string;
  title: string;
  url?: string;          // direct link if wave 1 found one
  university?: string;   // fallback identifier
  query?: string;        // search query for wave 2 if no direct URL
}

interface ResourceWithCommentary {
  scope: string;
  title: string;
  url?: string;
  university?: string;
  summary: string;       // what the resource covers (from wave 2 TinyFish)
  commentary: string;    // what it adds beyond the user's slides (from OpenAI)
  error?: string;        // set if wave 2 retrieval failed; resource still included
}
```

### Updated type

```ts
// Replaces current FinalResults
interface FinalResults {
  resources: ResourceWithCommentary[];
}
```

### Updated status union

```ts
status: "IDENTIFYING" | "SCOPES_READY" | "EXPANDING" | "DISCOVERING"
       | "RETRIEVING" | "ANALYZING" | "COMPLETED" | "FAILED"
```

---

## Implementation

### Files changed

| File | Change |
|------|--------|
| `lib/store.ts` | Add 4 new interfaces; update `FinalResults`; add `EXPANDING`, `RETRIEVING` to status union |
| `lib/services.ts` | Replace two-step `processSession` with four-phase implementation |
| `lib/api.ts` | Update `JobStatus` type to include `EXPANDING`, `RETRIEVING` |

No new files. No new routes. No new dependencies.

### Phase functions in `lib/services.ts`

**`expandKeywords(session): Promise<KeywordSet[]>`**
- One OpenAI structured-JSON call
- Input: scope names + optional objective
- Output: 3-5 keyword search query variants per scope
- Logs: one SYSTEM entry per scope showing generated keywords

**`discoverResources(session, keywordSets): Promise<DiscoveredResource[]>`**
- `Promise.allSettled` across all keyword sets (total agents = scopes × keyword variants per scope, e.g. 3 scopes × 4 keywords = 12 wave-1 agents)
- Each TinyFish wave-1 agent searches Google with one keyword set
- Goal: find university names + direct links to slides/assignments/PYPs
- Parses agent output into `DiscoveredResource[]`
- Failed agents log an ERROR entry; others continue

**`retrieveResources(session, discovered): Promise<RetrievedResource[]>`**
- `Promise.allSettled` across all discovered resources
- Each TinyFish wave-2 agent:
  - If `url`: scrape and digest that URL
  - If `university + query`: search `"{university} {query} lecture slides"` and digest top result
- Returns plain-text summary of resource content
- Failed retrievals set `error` on the resource; still passed to annotation phase

**`annotateResources(session, retrieved, slidesContent): Promise<ResourceWithCommentary[]>`**
- One OpenAI call with all retrieved summaries + original slides content
- Structured JSON output: array of per-resource commentary objects
- Each entry: `{ title, url, university, scope, summary, commentary }`
- Commentary focuses on what the resource adds beyond or reinforces from the existing slides

### Error handling

- Both TinyFish phases use `Promise.allSettled` — one failed agent never blocks others
- A failed wave-2 retrieval: `error` is set on that resource; `summary` and `commentary` are empty strings; resource is still included in final output
- If `expandKeywords` fails: session goes to `FAILED` (can't proceed without keywords)
- If `annotateResources` fails: session goes to `FAILED` (output would be incomplete)
- Top-level catch in `processSession` sets `status: "FAILED"` and logs the error message

---

## Verification

1. Start dev server (`npm run dev`)
2. Upload slide content → get `sessionId`
3. Call `/api/analyze-scope` → get scopes array
4. Call `/api/select-objective` with selected scopes → status becomes `SCRAPING`
5. Poll `/api/job-status/{id}` — watch status advance through `EXPANDING → DISCOVERING → RETRIEVING → ANALYZING → COMPLETED`
6. Poll `session.logs` to verify per-phase progress entries appear
7. Final `results.resources` should be an array of `ResourceWithCommentary` objects, each with non-empty `summary` and `commentary`
8. Simulate wave-2 failure for one resource: verify that resource has `error` set but others complete normally
