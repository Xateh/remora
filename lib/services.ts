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

    const rawResults = await Promise.all(agentPromises);

    // Normalize TinyFish output into a consistent schema
    const results = await Promise.all(
      rawResults.map(async ({ scope, materials }) => {
        if (!materials) return { scope, materials };
        try {
          const normalized = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You normalize raw university resource data into a consistent JSON schema. Return ONLY valid JSON matching this exact shape:
{
  "universities": [
    {
      "university": "Full University Name",
      "course": "Course Code - Course Name",
      "description": "Brief description of available materials",
      "resources": {
        "lecture_slides": "https://...",
        "assignments": "https://...",
        "exams": "https://..."
      },
      "main_link": "https://..."
    }
  ]
}

Rules:
- "university" is always the full name
- "resources" is always an object with descriptive snake_case keys and URL values
- Only include keys in "resources" that have valid URLs
- "main_link" is the primary course page URL
- Omit fields that have no data rather than using empty strings`,
              },
              { role: "user", content: materials },
            ],
            response_format: { type: "json_object" },
          });
          return {
            scope,
            materials: normalized.choices[0].message.content || materials,
          };
        } catch (e) {
          console.warn(`[Normalize] Failed for ${scope}, using raw data`, e);
          return { scope, materials };
        }
      })
    );
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

Your job: compare the user's course against equivalent courses at top universities, and output a concise bullet-point list of **topics or concepts that other university courses cover but the user's course does not**.

You are comparing COURSE to COURSE — not course to textbook. Look at what other universities actually teach in their lectures, assignments, and exams for this subject, and identify topics present in their syllabi that are absent or shallow in the user's slides.

Rules:
- Each bullet should name a specific topic that other courses cover, and cite which university/course includes it — e.g. "**Lock-free data structures** — covered in Berkeley CS162 lectures and CMU 15-410 assignments, but absent from your slides (which stop at semaphores)"
- Be concrete: say what the user's slides do cover nearby, so the gap is clear
- At the end of each bullet, add "See: [University Course]" pointing to the specific course that covers it
- Do NOT compare against general textbook knowledge or what an ideal course "should" cover — only flag gaps that are evidenced by what the discovered university courses actually teach
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
