"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"UPLOAD" | "SELECT">("UPLOAD");

  const handleUpload = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const { sessionId } = await res.json();
      setSessionId(sessionId);

      const resAnalyze = await fetch("/api/analyze-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const { scopes } = await resAnalyze.json();
      setScopes(scopes);
      setSelectedScopes(scopes);
      setStep("SELECT");
    } catch (err) {
      console.error(err);
      alert("Failed to process content");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!sessionId || selectedScopes.length === 0) return;
    setLoading(true);
    try {
      await fetch("/api/select-objective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, selectedScopes }),
      });
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to start research");
      setLoading(false);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black font-sans text-zinc-900 dark:text-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tighter mb-4 bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-600 bg-clip-text text-transparent">
            Remora
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            Deep academic research with parallel browser agents.
          </p>
        </header>

        <main className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl">
          {step === "UPLOAD" ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 opacity-70">Lecture Content / Slides Text</label>
                <textarea
                  className="w-full h-64 p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm leading-relaxed"
                  placeholder="Paste your slide content or lecture notes here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <button
                disabled={loading || !content.trim()}
                onClick={handleUpload}
                className="w-full py-4 bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Analyzing Content...
                  </>
                ) : (
                  "Identify Research Scopes"
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h2 className="text-xl font-bold mb-2">Select Research Scopes</h2>
                <p className="text-sm text-zinc-500 mb-6">We've identified these key topics. Choose which ones to research.</p>
                <div className="flex flex-wrap gap-2">
                  {scopes.map((scope) => (
                    <button
                      key={scope}
                      onClick={() => toggleScope(scope)}
                      className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                        selectedScopes.includes(scope)
                          ? "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
                          : "bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
              <button
                disabled={loading || selectedScopes.length === 0}
                onClick={handleStart}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Launching Agents...
                  </>
                ) : (
                  "Start Parallel Research"
                )}
              </button>
              <button 
                onClick={() => setStep("UPLOAD")}
                className="w-full py-2 text-zinc-400 text-sm hover:text-zinc-600 transition-colors"
              >
                Back to Upload
              </button>
            </div>
          )}
        </main>

        <footer className="mt-12 text-center text-xs text-zinc-400 font-medium tracking-widest uppercase">
          Powered by TinyFish & GPT-4o
        </footer>
      </div>
    </div>
  );
}
