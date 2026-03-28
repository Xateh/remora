import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const session = store.get(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Return only necessary data for the frontend
  return NextResponse.json({
    id: session.id,
    status: session.status,
    scopes: session.scopes,
    logs: session.logs,
    streamingUrls: session.streamingUrls,
    results: session.results,
    objective: session.objective,
  });
}
