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
    const response = await (openai as any).responses.create({
      model: "gpt-5.4",
      input: `Analyze the following lecture content and identify the key academic "scopes" or topics covered. Return the result as a JSON array of strings:
      
      Content:
      ${session.slidesContent}`,
    });

    // Parse keywords from response.output_text
    // The model is expected to return a JSON array string.
    let scopes: string[] = [];
    try {
      // Basic extraction if it returns markdown or plain text
      const contentText = response.output_text;
      const jsonMatch = contentText.match(/\[.*\]/s);
      scopes = JSON.parse(jsonMatch ? jsonMatch[0] : contentText);
    } catch (e) {
      console.warn("Failed to parse scopes as JSON, splitting by lines instead.");
      scopes = response.output_text.split("\n").map((s: string) => s.trim().replace(/^-\s*/, "")).filter(Boolean);
    }

    store.update(sessionId, { 
      scopes, 
      status: "IDENTIFYING" // Transitioning or state update
    });

    return NextResponse.json({ scopes });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze scopes" }, { status: 500 });
  }
}
