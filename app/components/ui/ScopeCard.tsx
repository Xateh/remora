import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Result } from "@/lib/api";

interface UniversityResource {
  university?: string;
  course?: string;
  description?: string;
  resources?: Record<string, string>;
  main_link?: string;
}

function tryParseUniversities(materials: string): UniversityResource[] | null {
  try {
    const parsed = JSON.parse(materials);
    const list = parsed.universities ?? parsed;
    if (Array.isArray(list) && list.length > 0 && list[0].university) {
      return list;
    }
  } catch {
    // not JSON
  }
  return null;
}

function formatResourceLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ScopeCard({ scope, materials }: Result) {
  const universities = tryParseUniversities(materials);

  if (!universities) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{scope}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-zinc-400 leading-relaxed">
            {materials || "No materials found."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{scope}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {universities.map((uni, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="font-medium text-white text-sm">{uni.university}</h4>
              {uni.course && (
                <span className="text-xs text-zinc-300 shrink-0">{uni.course}</span>
              )}
            </div>
            {uni.description && (
              <p className="text-xs text-zinc-200 leading-relaxed">{uni.description}</p>
            )}
            {uni.resources && Object.keys(uni.resources).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(uni.resources).map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors"
                  >
                    {formatResourceLabel(key)} ↗
                  </a>
                ))}
              </div>
            )}
            {uni.main_link && (
              <a
                href={uni.main_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Course page ↗
              </a>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
