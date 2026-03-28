import { NextResponse } from "next/server";
import { z } from "zod";
import { store, SessionData } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";

const UploadBody = z.object({
  content: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = UploadBody.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { content } = parsed.data;
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
