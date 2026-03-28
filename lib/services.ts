import { store } from "./store";
import tinyfish from "./tinyfish";
import openai from "./openai";

export async function processSession(sessionId: string) {
  const session = store.get(sessionId);
  if (!session) return;

  try {
    console.log(`[Processor] Starting parallel agents for session: ${sessionId}`);
    store.update(sessionId, { status: "SCRAPING", logs: [], streamingUrls: {} });

    // Step 1: Run Tinyfish agents in parallel for each scope
    const agentPromises = session.scopes.map(async (scope) => {
      console.log(`[Tinyfish] Launching agent for scope: ${scope}`);

      const stream = await tinyfish.agent.stream({
        url: "https://www.google.com/search?q=" + encodeURIComponent(`top universities ${scope} lecture materials slides assignments pyp`),
        goal: `Identify top universities globally for the academic topic "${scope}". Search for their public lecture slides, assignments, and past year papers (pyp). Return a concise summary of found materials and direct links if possible.`,
      });

      let scopeAnalysis = "";
      for await (const event of (stream as any)) {
        if (event.type === "STREAMING_URL") {
          const currentUrls = store.get(sessionId)?.streamingUrls || {};
          store.update(sessionId, {
            streamingUrls: { ...currentUrls, [scope]: event.streaming_url },
          });
        } else if (event.type === "PROGRESS") {
          console.log(`[Tinyfish] ${scope}: ${event.purpose}`);
          const currentLogs = store.get(sessionId)?.logs || [];
          store.update(sessionId, {
            logs: [
              ...currentLogs,
              {
                timestamp: event.timestamp,
                scope,
                message: event.purpose,
                type: "PROGRESS" as const,
              },
            ],
          });
        } else if (event.type === "COMPLETE") {
          if (event.result) {
            scopeAnalysis =
              typeof event.result === "string"
                ? event.result
                : JSON.stringify(event.result, null, 2);
          } else if (event.error) {
            console.error(`[Tinyfish] Agent failed for ${scope}:`, event.error.message);
            const currentLogs = store.get(sessionId)?.logs || [];
            store.update(sessionId, {
              logs: [
                ...currentLogs,
                {
                  timestamp: event.timestamp,
                  scope,
                  message: `Error: ${event.error.message}`,
                  type: "ERROR" as const,
                },
              ],
            });
          }
        }
      }

      return { scope, materials: scopeAnalysis };
    });

    const results = await Promise.all(agentPromises);
    store.update(sessionId, {
      results: { rawMaterials: results, gapAnalysis: "" },
      status: "ANALYZING",
    });

    // Step 2: Final gap analysis with GPT
    console.log(`[OpenAI] Performing final gap analysis...`);
    const aggregatedMaterials = results
      .map((r) => `Scope: ${r.scope}\nDiscovered Materials: ${r.materials}`)
      .join("\n\n---\n\n");

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an educational assistant comparing lecture slides with top university materials to find gaps.",
        },
        {
          role: "user",
          content: `Compare the following discovered materials with the original lecture content.
Identify exactly what is LACKING in the original slides (missed concepts, shallow depth, missing exercises/pyp examples) based on what top universities include.

Original Content:
${session.slidesContent}

Discovered Materials:
${aggregatedMaterials}`,
        },
      ],
    });

    store.update(sessionId, {
      status: "COMPLETED",
      results: {
        rawMaterials: results,
        gapAnalysis:
          analysisResponse.choices[0].message.content || "No analysis generated.",
      },
    });

    console.log(`[Processor] Completed session analysis: ${sessionId}`);
  } catch (error) {
    console.error(`[Processor] Error in session ${sessionId}:`, error);
    store.update(sessionId, { status: "FAILED" });
  }
}
