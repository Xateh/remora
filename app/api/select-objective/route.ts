import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { processSession } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const { sessionId, selectedScopes, objective } = await request.json();

    if (!sessionId || !selectedScopes) {
      return NextResponse.json({ error: "Session ID and selected scopes are required" }, { status: 400 });
    }

    const session = store.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update session with user selection
    store.update(sessionId, { 
      scopes: selectedScopes, 
      objective: objective || "Research materials from top universities related to these scopes.",
      status: "DISCOVERING"
    });

    // Start background processing (Discovery & Scraping)
    // Non-awaiting to return early
    processSession(sessionId);

    return NextResponse.json({ status: "DISCOVERING" });
  } catch (error) {
    console.error("Select objective error:", error);
    return NextResponse.json({ error: "Failed to set objective" }, { status: 500 });
  }
}
