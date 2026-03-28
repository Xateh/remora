"use client";

import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { uploadContent, analyzeScope } from "@/lib/api";

interface Props {
  onComplete: (content: string, sessionId: string, scopes: string[]) => void;
}

export function Step1Input({ onComplete }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(content: string) {
    if (!content.trim()) {
      setError("Please provide some lecture content.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { sessionId } = await uploadContent(content);
      const { scopes } = await analyzeScope(sessionId);
      onComplete(content, sessionId, scopes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setText(result);
    };
    reader.readAsText(file);
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Lecture Content</CardTitle>
        <CardDescription>
          Paste your slides or notes, or upload a text file. We&apos;ll identify
          the key academic topics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="paste">
          <TabsList>
            <TabsTrigger value="paste">Paste text</TabsTrigger>
            <TabsTrigger value="upload">Upload file</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-4">
            <Textarea
              placeholder="Paste your lecture notes or slide content here…"
              className="min-h-[200px] resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-4 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full"
            >
              Choose file (.txt, .md, .csv)
            </Button>
            {text && (
              <p className="text-xs text-zinc-500">
                File loaded — {text.length.toLocaleString()} characters
              </p>
            )}
            {text && (
              <Textarea
                readOnly
                className="min-h-[120px] resize-none text-xs text-zinc-400"
                value={text.slice(0, 500) + (text.length > 500 ? "\n…" : "")}
              />
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full"
          disabled={loading || !text.trim()}
          onClick={() => handleSubmit(text)}
        >
          {loading ? "Analyzing…" : "Identify Scopes →"}
        </Button>
      </CardContent>
    </Card>
  );
}
