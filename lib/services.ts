import { store } from "./store";
import tinyfish from "./tinyfish";

export async function processSession(sessionId: string) {
  const session = store.get(sessionId);
  if (!session) return;

  try {
    const results: any[] = [];
    
    // Iterate through selected scopes
    for (const scope of session.scopes) {
      console.log(`[Tinyfish] Processing scope: ${scope}`);
      
      // Update status to DISCOVERING for this particular scope
      store.update(sessionId, { status: "DISCOVERING" });

      const stream = await (tinyfish.agent as any).stream({
        url: "https://www.google.com/search?q=" + encodeURIComponent(`top universities ${scope} lecture materials slides assignments pyp`),
        goal: `Identify top universities globally for the academic topic "${scope}". Search for their public lecture slides, assignments, and past year papers (pyp). Return a concise summary of found materials and direct links if possible.`,
      });

      let scopeAnalysis = "";
      for await (const event of stream) {
        // Collect stream events
        if (typeof event === 'string') {
          scopeAnalysis += event;
        } else if (event.content) {
          scopeAnalysis += event.content;
        }
      }
      
      results.push({
        scope,
        materials: scopeAnalysis,
      });
    }

    // Final status update
    store.update(sessionId, { 
      status: "COMPLETED",
      results
    });
    
    console.log(`[Tinyfish] Completed session: ${sessionId}`);
  } catch (error) {
    console.error(`[Tinyfish] Error processing session ${sessionId}:`, error);
    store.update(sessionId, { status: "FAILED" });
  }
}
