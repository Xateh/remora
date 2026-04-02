"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { selectObjective } from "@/lib/api";

interface ScopeItem {
  id: string;
  name: string;
  selected: boolean;
}

interface Props {
  scopes: string[];
  courseIdentity: string;
  sessionId: string;
  onComplete: (selectedScopes: string[], objective: string) => void;
  onBack: () => void;
}

let nextId = 0;
function makeId() {
  return `scope-${++nextId}`;
}

export function Step2ScopeSelection({ scopes, courseIdentity, sessionId, onComplete, onBack }: Props) {
  const [items, setItems] = useState<ScopeItem[]>(
    scopes.map((s) => ({ id: makeId(), name: s, selected: true }))
  );
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleItem(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  }

  function renameItem(id: string, name: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: makeId(), name: "", selected: true }]);
  }

  async function handleSubmit() {
    const selectedScopes = items
      .filter((item) => item.selected && item.name.trim())
      .map((item) => item.name.trim());

    if (selectedScopes.length === 0) {
      setError("Select at least one scope with a name.");
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
        <CardTitle>Refine Academic Scopes</CardTitle>
        <CardDescription>
          Edit, add, or remove topics. These will be used to search for comparable university resources.
        </CardDescription>
        {courseIdentity && (
          <div className="pt-2">
            <Badge variant="secondary" className="text-sm">
              Detected course: {courseIdentity}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={item.id}
                checked={item.selected}
                onCheckedChange={() => toggleItem(item.id)}
              />
              <Input
                value={item.name}
                onChange={(e) => renameItem(item.id, e.target.value)}
                placeholder="Enter a topic…"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
                className="text-zinc-500 hover:text-red-400 px-2"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={addItem}>
          + Add scope
        </Button>

        <div className="space-y-2">
          <label htmlFor="objective" className="text-sm text-zinc-400">
            Objective{" "}
            <span className="text-zinc-600 font-normal">(optional)</span>
          </label>
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
            disabled={loading || items.filter((i) => i.selected && i.name.trim()).length === 0}
          >
            {loading ? "Starting…" : "Find Resources →"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
