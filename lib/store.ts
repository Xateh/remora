import { LRUCache } from "lru-cache";

// Simple in-memory store for session-based data.
// In a serverless environment like Vercel, this won't persist across requests properly
// but it works for local development and single-session ephemeral processing.

export interface AnalysisResult {
  scope: string;
  materials: string;
}

export interface FinalResults {
  rawMaterials: AnalysisResult[];
  gapAnalysis: string;
}

export interface ProgressLog {
  timestamp: string;
  scope: string;
  message: string;
  type: "PROGRESS" | "SYSTEM" | "ERROR";
}

export interface SessionData {
  id: string;
  slidesContent: string;
  scopes: string[];
  courseIdentity?: string;
  objective?: string;
  status: "IDENTIFYING" | "SCOPES_READY" | "DISCOVERING" | "SCRAPING" | "ANALYZING" | "COMPLETED" | "FAILED";
  results?: FinalResults;
  logs: ProgressLog[];
  streamingUrls: Record<string, string>;
  error?: string;
}

const options = {
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour
};

const cache = new LRUCache<string, SessionData>(options);

export const store = {
  set: (id: string, data: SessionData) => cache.set(id, data),
  get: (id: string) => cache.get(id),
  update: (id: string, data: Partial<SessionData>) => {
    const current = cache.get(id);
    if (current) {
      cache.set(id, { ...current, ...data });
    }
  },
};
