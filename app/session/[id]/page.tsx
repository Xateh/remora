"use client";

import { useEffect, useState, use } from "react";
import { ProgressLog, FinalResults } from "@/lib/store";

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}`);
        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();
        setSession(data);
        
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          clearInterval(interval);
        }
      } catch (err: any) {
        setError(err.message);
        clearInterval(interval);
      }
    };

    fetchSession();
    interval = setInterval(fetchSession, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!session) return <div className="p-8 text-zinc-500 italic">Connecting to session...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-50 p-6 md:p-12">
      <header className="mb-12 max-w-6xl mx-auto flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Research Canvas</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Session ID: <code className="bg-zinc-200 dark:bg-zinc-800 px-1 rounded">{sessionId}</code></p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            session.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
            session.status === "FAILED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse"
          }`}>
            {session.status}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Logs & Scopes */}
        <div className="lg:col-span-1 space-y-8">
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm overflow-hidden">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Active Scopes
            </h2>
            <div className="space-y-3">
              {session.scopes.map((scope: string) => (
                <div key={scope} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 text-sm">
                  {scope}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col h-[500px]">
            <h2 className="text-lg font-semibold mb-4">Event Stream</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              {session.logs.slice().reverse().map((log: ProgressLog, i: number) => (
                <div key={i} className={`p-3 rounded-xl text-xs border ${
                  log.type === "ERROR" ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400" :
                  "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}>
                  <div className="flex justify-between mb-1 opacity-70">
                    <span className="font-bold">{log.scope}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p>{log.message}</p>
                </div>
              ))}
              {session.logs.length === 0 && (
                <p className="text-zinc-400 italic text-sm text-center py-12">Waiting for agent events...</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Visualization & Results */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Agent Live View</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(session.streamingUrls).map(([scope, url]: [string, any]) => (
                <div key={scope} className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                   <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur px-2 py-1 rounded text-[10px] text-white font-mono">
                    {scope}
                  </div>
                  <iframe 
                    src={url} 
                    className="w-full h-full border-0 pointer-events-none" 
                    title={`Stream for ${scope}`}
                  />
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 bg-white/10 hover:bg-white/20 backdrop-blur p-1 rounded transition-colors"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ))}
              {Object.keys(session.streamingUrls).length === 0 && (
                <div className="md:col-span-2 aspect-[3/1] flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 italic text-sm">
                  Waiting for browser streams...
                </div>
              )}
            </div>
          </section>

          {session.results && (
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-lg font-semibold mb-6">Final Gap Analysis</h2>
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed p-6 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  {session.results.gapAnalysis || "Processing analysis..."}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
