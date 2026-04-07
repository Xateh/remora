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
  const [courseIdentity, setCourseIdentity] = useState("");

  function reset() {
    setStep(1);
    setContent("");
    setSessionId("");
    setScopes([]);
    setCourseIdentity("");
  }

  return (
    <div className="flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Research Canvas
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyze your materials and discover academic resources
          </p>
        </div>

        <StepIndicator currentStep={step} />

        {step === 1 && (
          <Step1Input
            onComplete={(c, sid, s, ci) => {
              setContent(c);
              setSessionId(sid);
              setScopes(s);
              setCourseIdentity(ci);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <Step2ScopeSelection
            scopes={scopes}
            courseIdentity={courseIdentity}
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
