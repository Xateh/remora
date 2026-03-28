import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import openai from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const session = store.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Use OpenAI to identify scopes from slides content
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o as standard stable model
      messages: [
        {
          role: "system",
          content: "You are an academic analyzer. Identify key academic 'scopes' or topics from the provided lecture content. Return ONLY a JSON array of strings."
        },
        {
          role: "user",
          content: session.slidesContent
        }
      ],
      response_format: { type: "json_object" }
    });

    const contentText = response.choices[0].message.content || "[]";
    let scopes: string[] = [];
    try {
      const parsed = JSON.parse(contentText);
      scopes = Array.isArray(parsed) ? parsed : (parsed.scopes || []);
    } catch {
      console.warn("Failed to parse scopes as JSON, splitting by lines instead.");
      scopes = contentText.split("\n").map((s: string) => s.trim().replace(/^-\s*/, "")).filter(Boolean);
    }

    store.update(sessionId, { 
      scopes, 
      status: "SCOPES_READY" 
    });

    return NextResponse.json({ scopes });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze scopes" }, { status: 500 });
  }
}
