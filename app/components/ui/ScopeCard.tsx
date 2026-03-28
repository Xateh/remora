import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Result } from "@/lib/api";

export function ScopeCard({ scope, materials }: Result) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{scope}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap break-words text-xs text-zinc-400 font-mono leading-relaxed">
          {materials || "No materials found."}
        </pre>
      </CardContent>
    </Card>
  );
}
