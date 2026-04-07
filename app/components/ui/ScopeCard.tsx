import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResourceWithCommentary } from "@/lib/api";
import { ExternalLinkIcon, AlertCircleIcon, BookOpenIcon } from "lucide-react";

export function ScopeCard({ 
  scope, 
  title, 
  url, 
  university, 
  summary, 
  commentary, 
  error 
}: ResourceWithCommentary) {
  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-900/40">
      <CardHeader className="pb-3 border-b border-zinc-800 bg-zinc-900/20">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                {scope}
              </span>
              {university && (
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-tight">
                  {university}
                </span>
              )}
            </div>
            <CardTitle className="text-base text-zinc-100">{title}</CardTitle>
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
              title="Open Resource"
            >
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {error ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/10 border border-red-900/20 text-red-400 text-xs">
            <AlertCircleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>Retrival failed: {error}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                <BookOpenIcon className="h-3 w-3" />
                Resource Summary
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed italic">
                &ldquo;{summary}&rdquo;
              </p>
            </div>

            {commentary && (
              <div className="space-y-2 p-3 rounded-lg bg-blue-900/10 border border-blue-900/20">
                <div className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
                  AI Commentary vs. Your Slides
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {commentary}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
