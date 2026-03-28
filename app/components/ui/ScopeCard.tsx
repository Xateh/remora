import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResourceWithCommentary } from "@/lib/store";

export function ScopeCard({ scope, title, url, university, summary, commentary, error }: ResourceWithCommentary) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {title}
            </a>
          ) : (
            title
          )}
        </CardTitle>
        <p className="text-xs text-zinc-500">{scope}{university ? ` · ${university}` : ""}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : (
          <>
            {summary && (
              <p className="text-xs text-zinc-400 leading-relaxed">{summary}</p>
            )}
            {commentary && (
              <p className="text-xs text-zinc-300 leading-relaxed border-l-2 border-zinc-600 pl-3">
                {commentary}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
