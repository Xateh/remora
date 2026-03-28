import { cn } from "@/lib/utils";

const STEPS = ["Upload Content", "Select Scopes", "Results"];

export function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isActive && "bg-zinc-50 text-zinc-900",
                  isDone && "bg-zinc-600 text-zinc-50",
                  !isActive && !isDone && "bg-zinc-800 text-zinc-400"
                )}
              >
                {isDone ? "✓" : step}
              </div>
              <span
                className={cn(
                  "text-sm",
                  isActive ? "text-zinc-50 font-medium" : "text-zinc-500"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-px w-8 bg-zinc-700" />
            )}
          </div>
        );
      })}
    </div>
  );
}
