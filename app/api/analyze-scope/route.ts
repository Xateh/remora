import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";
import openai from "@/lib/openai";

const AnalyzeScopeBody = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const parsed = AnalyzeScopeBody.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { sessionId } = parsed.data;

    const session = store.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an academic course analyzer. Given lecture content, identify:

1. **courseIdentity**: The specific academic course or sub-discipline these materials belong to. Be precise about the variant — e.g. "Real-Time Operating Systems" not just "Operating Systems", "Functional Programming in Haskell" not just "Programming", "Bayesian Machine Learning" not just "Machine Learning".

2. **scopes**: The key topics and sub-topics covered in the materials. These should be specific enough to search for comparable university resources. Each scope should be a concrete, searchable academic topic.

Return a JSON object with:
- "courseIdentity": a single string identifying the specific course variant
- "scopes": an array of specific topic strings`,
        },
        {
          role: "user",
          content: session.slidesContent,
        },
      ],
      response_format: { type: "json_object" },
    });

    const contentText = response.choices[0].message.content || '{"courseIdentity":"","scopes":[]}';
    let scopes: string[] = [];
    let courseIdentity = "";
    try {
      const result = JSON.parse(contentText);
      scopes = Array.isArray(result.scopes) ? result.scopes : [];
      courseIdentity = typeof result.courseIdentity === "string" ? result.courseIdentity : "";
    } catch {
      console.warn("Failed to parse scopes as JSON object.");
      scopes = [];
    }

    store.update(sessionId, { scopes, courseIdentity, status: "SCOPES_READY" });

    return NextResponse.json({ scopes, courseIdentity });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze scopes" }, { status: 500 });
  }
}
