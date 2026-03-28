import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { processSession } from "@/lib/services";
import { after } from "next/server";

export async function POST(request: Request) {
  try {
    const { sessionId, selectedScopes, objective } = await request.json();

    if (!sessionId || !Array.isArray(selectedScopes) || selectedScopes.length === 0) {
      return NextResponse.json({ error: "Session ID and a non-empty array of selected scopes are required" }, { status: 400 });
    }

    const session = store.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update session with user selection
    store.update(sessionId, { 
      scopes: selectedScopes, 
      objective: objective || "Research materials from top universities related to these scopes.",
      status: "SCRAPING"
    });

    // Start background processing (Discovery & Scraping) safely on Vercel
    after(() => {
      processSession(sessionId);
    });

    return NextResponse.json({ status: "SCRAPING" });
  } catch (error) {
    console.error("Select objective error:", error);
    return NextResponse.json({ error: "Failed to set objective" }, { status: 500 });
  }
}
