import { store, KeywordSet, DiscoveredResource, ResourceWithCommentary, SessionData, ProgressLog } from "./store";
import tinyfish from "./tinyfish";
import openai from "./openai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function dumpSession(sessionId: string) {
  const session = store.get(sessionId);
  if (!session) return;
  const dir = path.join(process.cwd(), "data", "sessions");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${sessionId}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2));
  console.log(`[Dump] Session written to ${filePath}`);
}

// Narrowed type for TinyFish stream events (SDK doesn't export its own types)
type TinyFishEvent =
  | { type: "STREAMING_URL"; streaming_url: string; timestamp: string }
  | { type: "PROGRESS"; purpose: string; timestamp: string }
  | { type: "COMPLETE"; result?: unknown; error?: { message: string }; timestamp: string }
  | { type: string; [key: string]: unknown; purpose?: string; error?: { message: string }; streaming_url?: string };

// Per-session pending log buffer — prevents concurrent read-modify-write races
const pendingLogs = new Map<string, ProgressLog[]>();

function addLog(
  sessionId: string,
  scope: string,
  message: string,
  type: "PROGRESS" | "SYSTEM" | "ERROR"
) {
  const entry: ProgressLog = { timestamp: new Date().toISOString(), scope, message, type };
  const buffer = pendingLogs.get(sessionId) ?? [];
  buffer.push(entry);
  pendingLogs.set(sessionId, buffer);
}

function flushLogs(sessionId: string) {
  const buffer = pendingLogs.get(sessionId);
  if (!buffer || buffer.length === 0) return;
  pendingLogs.delete(sessionId);
  const current = store.get(sessionId);
  if (!current) return;
  store.update(sessionId, { logs: [...current.logs, ...buffer] });
}

// ── Phase 1: Keyword Expansion ────────────────────────────────────────────────
// One OpenAI call — generates 3-5 search query variants per scope.
async function expandKeywords(sessionId: string): Promise<KeywordSet[]> {
  const session = store.get(sessionId);
  if (!session || !session.scopes?.length) {
    console.warn(`[Pipeline] No scopes found for session ${sessionId}`);
    return [];
  }
  
  const scopeList = session.scopes.join(", ");
  const objective = session.objective ?? "find lecture materials and past year papers";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an academic search strategist. Given a list of course topics (scopes) and a research objective, generate the 3 most effective and specific Google search queries for each scope. These queries should aim to find university-level lecture slides, assignments, and past exam papers from top institutions (e.g., 'MIT course-name lecture pdf').",
        },
        {
          role: "user",
          content: `Objective: ${objective}\n\nScopes: ${scopeList}\n\nReturn your response as a JSON object with a single root key "results" containing an array of objects. Each object must have:\n- "scope": string (the exact scope provided)\n- "keywords": string[] (EXACTLY 3 search queries)\n\nExample Output:\n{"results":[{"scope":"Linear Algebra","keywords":["MIT linear algebra slides","Stanford 18.06 assignments","open courseware linear algebra exams"]}]}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const text = response.choices[0].message.content ?? '{"results":[]}';
    const parsed = JSON.parse(text);
    const raw = Array.isArray(parsed.results) ? parsed.results : (Object.values(parsed)[0] as any[]);
    
    if (!Array.isArray(raw)) {
      throw new Error("Parsed results is not an array");
    }

    const keywordSets: KeywordSet[] = raw.map((item: any) => ({
      scope: typeof item.scope === 'string' ? item.scope : 'Unknown',
      keywords: Array.isArray(item.keywords) ? item.keywords : []
    })).filter(ks => ks.keywords.length > 0);

    for (const ks of keywordSets) {
      addLog(sessionId, ks.scope, `Expanded search queries: ${ks.keywords.join(" | ")}`, "SYSTEM");
    }

    return keywordSets;
  } catch (err) {
    console.error("[Pipeline] Keyword expansion failed:", err);
    addLog(sessionId, "System", "Failed to expand keywords, using scopes directly.", "ERROR");
    // Fallback: use each scope as its own single keyword
    return session.scopes.map(s => ({ scope: s, keywords: [s] }));
  }
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

      const stream = await (tinyfish.agent.stream as unknown as (opts: { url: string; goal: string }) => Promise<AsyncIterable<TinyFishEvent>>)({
        url: "https://www.google.com",
        goal: `1. Search for university lecture materials, slides, assignments, and past year papers for: "${keyword}".
2. If blocked by a CAPTCHA, try a different search engine like DuckDuckGo or Bing.
3. Extract EXACTLY 3 high-quality direct resource links from major universities (.edu or similar).
4. Return a JSON array of objects with: title (string), url (string), university (string), query (string).
Return ONLY the JSON array.`,
      });

      let rawResult = "";
      for await (const event of stream) {
        if (event.type === "STREAMING_URL" && event.streaming_url) {
          const urls = store.get(session.id)!.streamingUrls ?? {};
          store.update(session.id, { streamingUrls: { ...urls, [keyword]: event.streaming_url } });
        } else if (event.type === "PROGRESS" && event.purpose) {
          addLog(session.id, ks.scope, event.purpose, "PROGRESS");
        } else if (event.type === "COMPLETE") {
          // Check both result and resultJson for flexibility
          const res = (event as any).resultJson || (event as any).result || "";
          rawResult = typeof res === "string" ? res : JSON.stringify(res);
          
          if (event.error) {
            addLog(session.id, ks.scope, `Discovery error for "${keyword}": ${event.error.message}`, "ERROR");
          }
        }
      }

      // Parse agent output into DiscoveredResource[]
      try {
        if (!rawResult || rawResult === "[]" || rawResult === "{}") {
           console.warn(`[Pipeline] Wave-1 empty result for "${keyword}"`);
           return [];
        }

        console.log(`[Pipeline] Wave-1 Raw Result for "${keyword}":`, rawResult.slice(0, 300));
        const jsonMatch = rawResult.match(/\[[\s\S]*\]/);
        const parsedText = jsonMatch ? jsonMatch[0] : rawResult;
        
        const items = JSON.parse(parsedText) as Array<{
          title?: string;
          url?: string;
          university?: string;
          query?: string;
        }>;

        if (!Array.isArray(items) || items.length === 0) {
          console.warn(`[Pipeline] No valid items parsed for "${keyword}"`);
          return [];
        }

        // Limit to top 3 resources per search query to keep the pipeline efficient
        return items.slice(0, 3).map((item) => ({
          scope: ks.scope,
          title: item.title ?? keyword,
          url: item.url ?? undefined,
          university: item.university ?? undefined,
          query: item.query ?? keyword,
        })).filter(r => r.url); // Ensure we have a URL to follow
      } catch (err) {
        console.error(`[Pipeline] Wave-1 Parse Failed for "${keyword}":`, err);
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
      const stream = await (tinyfish.agent.stream as unknown as (opts: { url: string; goal: string }) => Promise<AsyncIterable<TinyFishEvent>>)({
        url: target,
        goal: `Retrieve and summarise the academic content at this URL or from the top search result. Focus on: topics covered, depth of coverage, exercises included, and any past year papers. Return a plain-text summary of 100-200 words.`,
      });

      let summary = "";
      for await (const event of stream) {
        if (event.type === "PROGRESS" && event.purpose) {
          addLog(session.id, resource.scope, event.purpose, "PROGRESS");
        } else if (event.type === "COMPLETE") {
          const res = (event as any).resultJson || (event as any).result;
          if (res) {
            if (typeof res === "string") {
              summary = res;
            } else if (typeof res === "object") {
              // Extract the most likely text field from the result object
              summary = res.result || res.summary || res.text || JSON.stringify(res);
            }
          } else if (event.error) {
            throw new Error(event.error.message);
          }
        }
      }

      console.log(`[Pipeline] Wave-2 Summary for "${resource.title}":`, summary.slice(0, 100));
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

  const failedWithPlaceholder: ResourceWithCommentary[] = failed.map((r) => ({
    scope: r.scope,
    title: r.title,
    url: r.url,
    university: r.university,
    summary: "",
    commentary: "",
    error: r.retrievalError,
  }));

  if (withContent.length === 0) {
    return failedWithPlaceholder;
  }

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

  return [...annotated, ...failedWithPlaceholder];
}

// ── Phase 5: Synthesis ───────────────────────────────────────────────────────
// Final OpenAI call — produces a global gap analysis (overall comparison).
async function generateGapAnalysis(
  resources: ResourceWithCommentary[],
  slidesContent: string
): Promise<string> {
  const summarizedList = resources
    .filter((r) => r.summary)
    .map((r) => `- ${r.title} (${r.university ?? "unknown"}): ${r.summary.slice(0, 300)}...`)
    .join("\n\n");

  if (!summarizedList) {
    return "No comparable research materials were found to analyze against your original resources.";
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are an academic consultant. Your goal is to synthesize the relationship between a student's original course materials (slides) and a set of newly discovered external resources. Compare them at a high level. Identify what the slides already cover well and highlight exactly what the new materials add (e.g. more depth, practice problems, different perspectives). Use professional, encouraging language and Markdown for structure.",
      },
      {
        role: "user",
        content: `Original Slides Content:\n${slidesContent}\n\n---\n\nNewly Found External Resources:\n${summarizedList}\n\nProvide a "Gap Analysis" that highlights the top 3-4 key takeaways of how these new resources supplement the original ones. Use Markdown bullet points.`,
      },
    ],
  });

  return response.choices[0].message.content ?? "";
}

// ── Orchestrator ──────────────────────────────────────────────────────────────
export async function processSession(sessionId: string) {
  const session = store.get(sessionId);
  if (!session) return;

  try {
    // Phase 1 — Keyword Expansion
    store.update(sessionId, { status: "EXPANDING", logs: [], streamingUrls: {} });
    console.log(`[Pipeline] EXPANDING — session ${sessionId}`);
    const keywordSets = await expandKeywords(sessionId);
    flushLogs(sessionId);

    // Phase 2 — Wave-1 Discovery
    store.update(sessionId, { status: "DISCOVERING" });
    console.log(`[Pipeline] DISCOVERING — ${keywordSets.flatMap((k) => k.keywords).length} queries`);
    const discovered = await discoverResources(store.get(sessionId)!, keywordSets);
    flushLogs(sessionId);
    addLog(sessionId, "system", `Discovered ${discovered.length} resources`, "SYSTEM");
    flushLogs(sessionId);

    // Phase 3 — Wave-2 Retrieval
    store.update(sessionId, { status: "RETRIEVING" });
    console.log(`[Pipeline] RETRIEVING — ${discovered.length} resources`);
    const retrieved = await retrieveResources(store.get(sessionId)!, discovered);
    flushLogs(sessionId);

    // Phase 4 — Annotation
    store.update(sessionId, { status: "ANALYZING" });
    console.log(`[Pipeline] ANALYZING`);
    const currentSession = store.get(sessionId)!;
    const resources = await annotateResources(retrieved, currentSession.slidesContent);

    const blankCommentaries = resources.filter((r) => !r.error && !r.commentary);
    if (blankCommentaries.length > 0) {
      addLog(sessionId, "system", `${blankCommentaries.length} resource(s) have blank commentary (OpenAI may have skipped indices)`, "ERROR");
    }

    // Phase 5 — Synthesis (Global Gap Analysis)
    console.log(`[Pipeline] SYNTHESIZING`);
    const gapAnalysis = await generateGapAnalysis(resources, currentSession.slidesContent);

    store.update(sessionId, {
      status: "COMPLETED",
      results: { resources, gapAnalysis },
    });

    console.log(`[Pipeline] COMPLETED — session ${sessionId}, ${resources.length} resources`);
  } catch (error) {
    flushLogs(sessionId);
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Pipeline] FAILED — session ${sessionId}:`, message);
    store.update(sessionId, { status: "FAILED", error: message });
  }
}
