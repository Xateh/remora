import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";
import { processSession } from "@/lib/services";
import { after } from "next/server";

const SelectObjectiveBody = z.object({
  sessionId: z.string().uuid(),
  selectedScopes: z.array(z.string().min(1)).min(1),
  objective: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = SelectObjectiveBody.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { sessionId, selectedScopes, objective } = parsed.data;

    const session = store.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    store.update(sessionId, {
      scopes: selectedScopes,
      objective: objective || "Research materials from top universities related to these scopes.",
      status: "EXPANDING",
    });

    after(() => {
      processSession(sessionId);
    });

    return NextResponse.json({ status: "SCRAPING" });
  } catch (error) {
    console.error("Select objective error:", error);
    return NextResponse.json({ error: "Failed to set objective" }, { status: 500 });
  }
}
