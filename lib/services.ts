import { store, ScopeResult } from "./store";
import tinyfish from "./tinyfish";

// Narrowed type for TinyFish stream events (SDK doesn't export its own types)
type TinyFishEvent = string | { content?: string };

async function processScope(sessionId: string, scope: string): Promise<ScopeResult> {
  const stream = await (tinyfish.agent.stream as (opts: { url: string; goal: string }) => AsyncIterable<TinyFishEvent>)({
    url: "https://www.google.com/search?q=" + encodeURIComponent(`top universities ${scope} lecture materials slides assignments pyp`),
    goal: `Identify top universities globally for the academic topic "${scope}". Search for their public lecture slides, assignments, and past year papers (pyp). Return a concise summary of found materials and direct links if possible.`,
  });

  let materials = "";
  for await (const event of stream) {
    if (typeof event === "string") {
      materials += event;
    } else if (event.content) {
      materials += event.content;
    }
  }

  return { scope, materials };
}

export async function processSession(sessionId: string) {
  const session = store.get(sessionId);
  if (!session) return;

  store.update(sessionId, { status: "DISCOVERING" });
  console.log(`[Tinyfish] Processing ${session.scopes.length} scopes in parallel for session: ${sessionId}`);

  const settled = await Promise.allSettled(
    session.scopes.map((scope) => {
      console.log(`[Tinyfish] Starting scope: ${scope}`);
      return processScope(sessionId, scope);
    })
  );

  const results: ScopeResult[] = settled.map((r, i) => {
    if (r.status === "fulfilled") {
      return r.value;
    }
    const message = r.reason instanceof Error ? r.reason.message : "Unknown error";
    console.error(`[Tinyfish] Scope failed: ${session.scopes[i]} — ${message}`);
    return { scope: session.scopes[i], materials: "", error: message };
  });

  const allFailed = results.every((r) => r.error !== undefined);

  store.update(sessionId, {
    status: allFailed ? "FAILED" : "COMPLETED",
    results,
    ...(allFailed ? { error: "All scopes failed to process" } : {}),
  });

  console.log(`[Tinyfish] Completed session: ${sessionId} — status: ${allFailed ? "FAILED" : "COMPLETED"}`);
}
