"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { selectObjective } from "@/lib/api";

interface Props {
  scopes: string[];
  sessionId: string;
  onComplete: (selectedScopes: string[], objective: string) => void;
  onBack: () => void;
}

export function Step2ScopeSelection({ scopes, sessionId, onComplete, onBack }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(scopes));
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(scope: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  async function handleSubmit() {
    const selectedScopes = [...selected];
    if (selectedScopes.length === 0) {
      setError("Select at least one scope.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await selectObjective(sessionId, selectedScopes, objective);
      onComplete(selectedScopes, objective);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Select Academic Scopes</CardTitle>
        <CardDescription>
          Choose which topics to search for resources. All are selected by
          default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {scopes.map((scope) => (
            <div key={scope} className="flex items-center gap-3">
              <Checkbox
                id={scope}
                checked={selected.has(scope)}
                onCheckedChange={() => toggle(scope)}
              />
              <Label htmlFor={scope} className="cursor-pointer font-normal">
                {scope}
              </Label>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="objective" className="text-zinc-400">
            Objective{" "}
            <span className="text-zinc-600 font-normal">(optional)</span>
          </Label>
          <Input
            id="objective"
            placeholder="e.g. Find assignment sheets and past exam papers"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            ← Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading || selected.size === 0}
          >
            {loading ? "Starting…" : "Find Resources →"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
