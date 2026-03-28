import { store } from "./store";
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

    const courseContext = session.courseIdentity
      ? `This is a course on "${session.courseIdentity}". `
      : "";
    const objectiveContext = session.objective
      ? `The user's objective is: "${session.objective}". `
      : "";

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an educational gap analyst. ${courseContext}${objectiveContext}

Your job: compare the user's lecture slides against what top universities cover for the same course, and output a concise bullet-point list of **concepts or perspectives NOT covered** in the user's slides.

Rules:
- Each bullet should be a single, specific gap — e.g. "Geometric intuition behind L1 vs L2 norms (your slides cover the formulas but not why L1 produces sparsity)"
- Be concrete: name the missing concept and briefly say what the slides do cover nearby, so the gap is clear
- At the end of each bullet, add a short "Further reading:" pointer (a textbook chapter, lecture series, or keyword to search)
- Keep it short — no filler, no praise, no summaries of what the slides already do well
- Order by importance (biggest gaps first)`,
        },
        {
          role: "user",
          content: `Original Slides:
${session.slidesContent}

Discovered Materials from Top Universities:
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

    await dumpSession(sessionId);
    console.log(`[Processor] Completed session analysis: ${sessionId}`);
  } catch (error) {
    console.error(`[Processor] Error in session ${sessionId}:`, error);
    store.update(sessionId, { status: "FAILED" });
  }
}
