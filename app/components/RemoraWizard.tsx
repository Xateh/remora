"use client";

import { useState } from "react";
import { StepIndicator } from "@/app/components/ui/StepIndicator";
import { Step1Input } from "@/app/components/steps/Step1Input";
import { Step2ScopeSelection } from "@/app/components/steps/Step2ScopeSelection";
import { Step3Processing } from "@/app/components/steps/Step3Processing";

export function RemoraWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [content, setContent] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);

  function reset() {
    setStep(1);
    setContent("");
    setSessionId("");
    setScopes([]);
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Remora
          </h1>
          <p className="text-sm text-zinc-500">
            Academic resource discovery from your lecture content
          </p>
        </div>

        <StepIndicator currentStep={step} />

        {step === 1 && (
          <Step1Input
            onComplete={(c, sid, s) => {
              setContent(c);
              setSessionId(sid);
              setScopes(s);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <Step2ScopeSelection
            scopes={scopes}
            sessionId={sessionId}
            onComplete={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <Step3Processing sessionId={sessionId} onReset={reset} />
        )}
      </div>
    </div>
  );
}
