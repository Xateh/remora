"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { ScopeCard } from "@/app/components/ui/ScopeCard";
import { getJobStatus } from "@/lib/api";
import type { JobStatus, FinalResults } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import { FishTank } from "@/app/components/ui/FishTank";

interface Props {
  sessionId: string;
  onReset: () => void;
}

export function Step3Processing({ sessionId, onReset }: Props) {
  const [status, setStatus] = useState<JobStatus>("SCRAPING");
  const [results, setResults] = useState<FinalResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const data = await getJobStatus(sessionId);
        setStatus(data.status);
        if (data.results) setResults(data.results);
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          clearInterval(intervalRef.current);
          if (data.status === "FAILED") {
            setError("The discovery process failed. Please try again.");
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch status.");
        clearInterval(intervalRef.current);
      }
    }, 2500);

    return () => clearInterval(intervalRef.current);
  }, [sessionId]);

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />
        <Button variant="ghost" size="sm" onClick={onReset}>
          Start Over
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status !== "COMPLETED" && status !== "FAILED" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Searching university repositories for lecture materials, assignments,
            and past papers…
          </p>
          <FishTank />
        </div>
      )}

      {results?.gapAnalysis && status === "COMPLETED" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-3">
          <h3 className="text-lg font-semibold text-zinc-50">Gap Analysis</h3>
          <div className="text-zinc-100 prose prose-sm prose-invert max-w-none [&_*]:text-zinc-100 [&_strong]:text-white [&_li]:mb-4">
            <ReactMarkdown>{results.gapAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}

      {results?.rawMaterials && results.rawMaterials.length > 0 && (
        <div className="space-y-4">
          {results.rawMaterials.map((result) => (
            <ScopeCard key={result.scope} {...result} />
          ))}
        </div>
      )}

      {status === "COMPLETED" && !results?.rawMaterials?.length && !results?.gapAnalysis && (
        <p className="text-sm text-zinc-500">
          No materials were found. Try adjusting your scopes or objective.
        </p>
      )}
    </div>
  );
}
