import { LRUCache } from "lru-cache";

// Simple in-memory store for session-based data.
// In a serverless environment like Vercel, this won't persist across requests properly
// but it works for local development and single-session ephemeral processing.

export interface KeywordSet {
  scope: string;
  keywords: string[]; // 3-5 search query variants
}

export interface DiscoveredResource {
  scope: string;
  title: string;
  url?: string;        // direct link if wave 1 found one
  university?: string; // fallback identifier
  query?: string;      // search query for wave 2 if no direct URL
}

export interface ResourceWithCommentary {
  scope: string;
  title: string;
  url?: string;
  university?: string;
  summary: string;     // what the resource covers (from wave-2 TinyFish)
  commentary: string;  // what it adds beyond the user's slides (from OpenAI)
  error?: string;      // set if wave-2 retrieval failed; resource still included
}

export interface FinalResults {
  resources: ResourceWithCommentary[];
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
  status:
    | "IDENTIFYING"
    | "SCOPES_READY"
    | "EXPANDING"
    | "DISCOVERING"
    | "RETRIEVING"
    | "ANALYZING"
    | "COMPLETED"
    | "FAILED";
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
