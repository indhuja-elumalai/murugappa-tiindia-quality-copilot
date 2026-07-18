"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const demoWalkthrough = process.env.NEXT_PUBLIC_ENABLE_DEMO_ONBOARDING === "true";

const walkthroughSteps = [
  { eyebrow: "Quality pulse", title: "See operational risk at a glance", copy: "Start with live quality indicators for open NCRs, closure performance, supplier PPM, and repeat-defect rate.", motif: "metrics" },
  { eyebrow: "Prioritized work", title: "Move from signal to investigation", copy: "Filter non-conformances by severity, search across suppliers and components, then open the case that needs attention.", motif: "incidents" },
  { eyebrow: "Evidence first", title: "Investigate with grounded AI", copy: "The 8D Copilot links its checklist to approved procedures and similar closed cases. Every suggestion remains a reviewable draft.", motif: "copilot" },
  { eyebrow: "Ready to begin", title: "Create your first quality record", copy: "Use New NCR to capture the deviation, source, component, and immediate observation before starting containment.", motif: "create" },
] as const;

export function ProductWalkthrough() {
  if (!clerkConfigured && !demoWalkthrough) return null;
  return clerkConfigured ? <ClerkWalkthrough /> : <DemoWalkthrough />;
}

function ClerkWalkthrough() {
  const { isLoaded, isSignedIn, user } = useUser();
  const completed = user?.publicMetadata?.qualityCopilotOnboarded === true;
  return <WalkthroughDialog ready={isLoaded && Boolean(isSignedIn) && !completed} onPersist={async () => {
    const response = await fetch("/api/onboarding", { method: "POST" });
    if (!response.ok) throw new Error("Unable to save onboarding progress");
    await user?.reload();
  }} />;
}

function DemoWalkthrough() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setReady(window.localStorage.getItem("quality-copilot-tour") !== "complete"));
  }, []);
  return <WalkthroughDialog ready={ready} onPersist={async () => {
    window.localStorage.setItem("quality-copilot-tour", "complete");
    setReady(false);
  }} />;
}

function WalkthroughDialog({ ready, onPersist }: { ready: boolean; onPersist: () => Promise<void> }) {
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nextButton = useRef<HTMLButtonElement>(null);

  const open = ready && !dismissed;
  useEffect(() => { if (open) nextButton.current?.focus(); }, [open, step]);

  const finish = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      await onPersist();
      setDismissed(true);
    } catch {
      setError("We could not save your progress. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [onPersist]);

  if (!open) return null;
  const current = walkthroughSteps[step];

  return (
    <div className="walkthrough-backdrop" role="presentation">
      <section className="walkthrough" role="dialog" aria-modal="true" aria-labelledby="walkthrough-title">
        <div className="walkthrough-visual" aria-hidden="true">
          <div className={`tour-motif ${current.motif}`}><span className="tour-chip">{step + 1} / {walkthroughSteps.length}</span><div className="motif-window"><i /><i /><i /></div><div className="motif-lines"><i /><i /><i /><i /></div></div>
          <div className="walkthrough-brand"><span className="brand-mark">TI</span><span>Quality Copilot</span></div>
        </div>
        <div className="walkthrough-content">
          <div className="walkthrough-top"><span className="walkthrough-step">Product tour</span><button className="walkthrough-skip" onClick={finish} disabled={saving}>Skip tour</button></div>
          <p className="eyebrow">{current.eyebrow}</p>
          <h2 id="walkthrough-title">{current.title}</h2>
          <p className="walkthrough-copy">{current.copy}</p>
          {error && <p className="walkthrough-error" role="alert">{error}</p>}
          <div className="walkthrough-footer">
            <div className="tour-dots" aria-label={`Step ${step + 1} of ${walkthroughSteps.length}`}>{walkthroughSteps.map((_, index) => <span className={index === step ? "active" : ""} key={index} />)}</div>
            <div className="walkthrough-actions">{step > 0 && <button className="secondary" onClick={() => setStep((value) => value - 1)}>Back</button>}<button ref={nextButton} className="primary" disabled={saving} onClick={() => step === walkthroughSteps.length - 1 ? finish() : setStep((value) => value + 1)}>{saving ? "Saving…" : step === walkthroughSteps.length - 1 ? "Enter workspace" : "Next"}</button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
