import { NextResponse } from "next/server";
import { store, SessionData } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const sessionId = uuidv4();
    const sessionData: SessionData = {
      id: sessionId,
      slidesContent: content,
      scopes: [],
      status: "IDENTIFYING",
    };

    store.set(sessionId, sessionData);

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload content" }, { status: 500 });
  }
}
