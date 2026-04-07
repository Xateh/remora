import { NextResponse } from "next/server";
import { z } from "zod";
import { store, SessionData } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";
import openai from "@/lib/openai";

const UploadBody = z.union([
  z.object({ content: z.string().min(1) }),
  z.object({ file: z.string().min(1), fileName: z.string().min(1) }),
]);

async function extractTextFromPDF(base64: string): Promise<string> {
  try {
    const pdf = (await import('pdf-parse-fork')).default
    const buffer = Buffer.from(base64, 'base64')
    const data = await pdf(buffer)
    return data.text || ""
  } catch (err) {
    console.error('PDF extraction error:', err)
    return ""
  }
}

export async function POST(request: Request) {
  try {
    const parsed = UploadBody.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let slidesContent: string;

    if ("file" in parsed.data) {
      slidesContent = await extractTextFromPDF(parsed.data.file);
      if (!slidesContent.trim()) {
        return NextResponse.json(
          { error: "Could not extract text from PDF" },
          { status: 422 }
        );
      }
    } else {
      slidesContent = parsed.data.content;
    }

    const sessionId = uuidv4();
    const sessionData: SessionData = {
      id: sessionId,
      slidesContent,
      scopes: [],
      status: "IDENTIFYING",
      logs: [],
      streamingUrls: {},
    };

    store.set(sessionId, sessionData);

    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload content" },
      { status: 500 }
    );
  }
}
