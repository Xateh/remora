import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/api";

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; className: string }
> = {
  IDENTIFYING: {
    label: "Identifying scopes…",
    className: "bg-blue-900/40 text-blue-300 border-blue-700",
  },
  SCOPES_READY: {
    label: "Scopes ready",
    className: "bg-blue-900/40 text-blue-300 border-blue-700",
  },
  EXPANDING: {
    label: "Expanding keywords…",
    className: "bg-purple-900/40 text-purple-300 border-purple-700",
  },
  DISCOVERING: {
    label: "Discovering resources…",
    className: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  },
  RETRIEVING: {
    label: "Retrieving materials…",
    className: "bg-orange-900/40 text-orange-300 border-orange-700",
  },
  ANALYZING: {
    label: "Analyzing…",
    className: "bg-indigo-900/40 text-indigo-300 border-indigo-700",
  },
  COMPLETED: {
    label: "Complete",
    className: "bg-green-900/40 text-green-300 border-green-700",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-900/40 text-red-300 border-red-700",
  },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  const isPending = status !== "COMPLETED" && status !== "FAILED";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        className
      )}
    >
      {isPending && (
        <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
      )}
      {label}
    </span>
  );
}
