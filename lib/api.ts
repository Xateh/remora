export type JobStatus =
  | "IDENTIFYING"
  | "DISCOVERING"
  | "SCRAPING"
  | "COMPLETED"
  | "FAILED";

export interface Result {
  scope: string;
  materials: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function uploadContent(
  content: string
): Promise<{ sessionId: string }> {
  return apiFetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function analyzeScope(content: string): Promise<{ scopes: string[] }> {
  return apiFetch("/api/analyze-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function selectObjective(
  sessionId: string,
  selectedScopes: string[],
  objective: string
): Promise<{ status: string }> {
  return apiFetch("/api/select-objective", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, selectedScopes, objective }),
  });
}

export function getJobStatus(sessionId: string): Promise<{
  status: JobStatus;
  scopes: string[];
  results?: Result[];
}> {
  return apiFetch(`/api/job-status/${sessionId}`);
}
