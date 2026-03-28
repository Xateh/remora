"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { ScopeCard } from "@/app/components/ui/ScopeCard";
import { getJobStatus } from "@/lib/api";
import type { JobStatus, Result } from "@/lib/api";

interface Props {
  sessionId: string;
  onReset: () => void;
}

export function Step3Processing({ sessionId, onReset }: Props) {
  const [status, setStatus] = useState<JobStatus>("DISCOVERING");
  const [results, setResults] = useState<Result[]>([]);
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
        <p className="text-sm text-zinc-500">
          Searching university repositories for lecture materials, assignments,
          and past papers…
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => (
            <ScopeCard key={result.scope} {...result} />
          ))}
        </div>
      )}

      {status === "COMPLETED" && results.length === 0 && (
        <p className="text-sm text-zinc-500">
          No materials were found. Try adjusting your scopes or objective.
        </p>
      )}
    </div>
  );
}
