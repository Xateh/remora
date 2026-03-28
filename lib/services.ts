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
  const fallback = Object.values(parsed)[0];
  const raw: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(fallback) ? (fallback as unknown[]) : [];

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
  const fallback = parsed.annotations ?? parsed.resources ?? parsed.result ?? Object.values(parsed)[0];
  const annotations: Array<{ index: number; commentary: string }> = Array.isArray(parsed)
    ? parsed
    : Array.isArray(fallback) ? (fallback as Array<{ index: number; commentary: string }>) : [];

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

    const blankCommentaries = resources.filter((r) => !r.error && !r.commentary);
    if (blankCommentaries.length > 0) {
      addLog(sessionId, "system", `${blankCommentaries.length} resource(s) have blank commentary (OpenAI may have skipped indices)`, "ERROR");
    }

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
