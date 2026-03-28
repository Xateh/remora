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
          content:
            "You are an academic analyzer. Identify key academic 'scopes' or topics from the provided lecture content. Return ONLY a JSON array of strings.",
        },
        {
          role: "user",
          content: session.slidesContent,
        },
      ],
      response_format: { type: "json_object" },
    });

    const contentText = response.choices[0].message.content || "[]";
    let scopes: string[] = [];
    try {
      const json = JSON.parse(contentText);
      scopes = Array.isArray(json) ? json : json.scopes || [];
    } catch {
      console.warn("Failed to parse scopes as JSON, splitting by lines instead.");
      scopes = contentText
        .split("\n")
        .map((s: string) => s.trim().replace(/^-\s*/, ""))
        .filter(Boolean);
    }

    store.update(sessionId, { scopes, status: "SCOPES_READY" });

    return NextResponse.json({ scopes });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze scopes" }, { status: 500 });
  }
}
