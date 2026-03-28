"use client";

import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { uploadContent, uploadPDF, analyzeScope } from "@/lib/api";

interface Props {
  onComplete: (content: string, sessionId: string, scopes: string[], courseIdentity: string) => void;
}

export function Step1Input({ onComplete }: Props) {
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState<{ name: string; base64: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!text.trim() && !pdfFile) {
      setError("Please provide some lecture content.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let sessionId: string;
      if (pdfFile) {
        const result = await uploadPDF(pdfFile.base64, pdfFile.name);
        sessionId = result.sessionId;
      } else {
        const result = await uploadContent(text);
        sessionId = result.sessionId;
      }
      const { scopes, courseIdentity } = await analyzeScope(sessionId);
      onComplete(text || pdfFile?.name || "", sessionId, scopes, courseIdentity || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (result instanceof ArrayBuffer) {
          const bytes = new Uint8Array(result);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          setPdfFile({ name: file.name, base64 });
          setText("");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          setText(result);
          setPdfFile(null);
        }
      };
      reader.readAsText(file);
    }
  }

  const hasContent = text.trim().length > 0 || pdfFile !== null;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Lecture Content</CardTitle>
        <CardDescription>
          Paste your slides or notes, or upload a file (PDF, text). We&apos;ll identify
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
              onChange={(e) => {
                setText(e.target.value);
                setPdfFile(null);
              }}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-4 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full"
            >
              Choose file (.pdf, .txt, .md, .csv)
            </Button>
            {pdfFile && (
              <p className="text-xs text-zinc-500">
                PDF loaded: {pdfFile.name}
              </p>
            )}
            {text && !pdfFile && (
              <>
                <p className="text-xs text-zinc-500">
                  File loaded — {text.length.toLocaleString()} characters
                </p>
                <Textarea
                  readOnly
                  className="min-h-[120px] resize-none text-xs text-zinc-400"
                  value={text.slice(0, 500) + (text.length > 500 ? "\n…" : "")}
                />
              </>
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
          disabled={loading || !hasContent}
          onClick={handleSubmit}
        >
          {loading ? "Analyzing…" : "Identify Scopes →"}
        </Button>
      </CardContent>
    </Card>
  );
}
