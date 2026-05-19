import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, MousePointerClick } from "lucide-react";

interface TutStep {
  target: string;
  title: string;
  body: string;
  action: "click" | "next" | "done";
  position?: "above" | "below";
}

const STEPS: TutStep[] = [
  {
    target: "[data-tut='import-section']",
    title: "Welcome to ROI Express",
    body: "Paste a HubSpot deal link here. We've pre-filled a demo URL for you.",
    action: "next",
    position: "below",
  },
  {
    target: "[data-tut='fetch-btn']",
    title: "Import the deal",
    body: "Click this button to fetch deal data from HubSpot.",
    action: "click",
    position: "below",
  },
  {
    target: "[data-tut='modules-continue']",
    title: "Modules pre-selected",
    body: "5 modules were identified from the deal context. Browse the catalog on the left or pick a bundle. Click Continue when ready.",
    action: "click",
    position: "above",
  },
  {
    target: "[data-tut='config-section']",
    title: "Set your inputs",
    body: "Adjust employees, HR FTEs, managers, hourly costs, onboardings/year, and the annual Factorial price. Demo values are pre-filled.",
    action: "next",
    position: "below",
  },
  {
    target: "[data-tut='config-continue']",
    title: "Generate the ROI",
    body: "Click the highlighted button to calculate the final ROI.",
    action: "click",
    position: "above",
  },
  {
    target: "[data-tut='hypothesis-section']",
    title: "Fine-tune hypotheses",
    body: "Open this panel to adjust saved hours per module and stakeholder, or switch a module to tool-replacement mode.",
    action: "next",
    position: "below",
  },
  {
    target: "[data-tut='download-section']",
    title: "Download & share",
    body: "Export a 1-page summary or a detailed PDF. Save the session or share a direct link with your team.",
    action: "done",
    position: "above",
  },
];

export function TutorialGuide({ onDismiss, onSubStep }: { onDismiss: () => void; onSubStep?: (idx: number) => void }) {
  const [sub, setSub] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  const currentStep = STEPS[sub];

  const findTarget = useCallback(() => {
    if (!currentStep) return null;
    return document.querySelector(currentStep.target) as HTMLElement | null;
  }, [currentStep]);

  useEffect(() => {
    const update = () => {
      const el = findTarget();
      if (el) setRect(el.getBoundingClientRect());
      else setRect(null);
    };

    update();
    const iv = setInterval(update, 300);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    observerRef.current = new MutationObserver(update);
    observerRef.current.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearInterval(iv);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observerRef.current?.disconnect();
    };
  }, [findTarget, sub]);

  useEffect(() => {
    onSubStep?.(sub);
  }, [sub, onSubStep]);

  const advance = useCallback(() => {
    if (sub >= STEPS.length - 1) {
      onDismiss();
    } else {
      setSub(s => s + 1);
    }
  }, [sub, onDismiss]);

  const handleSpotlightClick = useCallback(() => {
    const el = findTarget();
    if (el) el.click();
    setTimeout(() => advance(), 150);
  }, [findTarget, advance]);

  if (!currentStep || !rect) return null;

  const pad = 10;
  const scrollY = window.scrollY;
  const r = {
    top: rect.top - pad + scrollY,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };

  const pageH = Math.max(document.documentElement.scrollHeight, window.innerHeight);
  const pos = currentStep.position ?? "below";
  const tooltipAbove = pos === "above";

  return (
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: "none" }}>
      {/* Dark overlay with cutout */}
      <svg
        className="absolute inset-0"
        style={{ width: "100%", height: pageH, top: -scrollY, pointerEvents: "auto" }}
      >
        <defs>
          <mask id="tut-guide-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={r.left} y={r.top} width={r.width} height={r.height} rx="16" fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tut-guide-mask)" />
      </svg>

      {/* Spotlight ring — forwards click to the real element */}
      <div
        className="absolute rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-transparent"
        onClick={currentStep.action === "click" ? handleSpotlightClick : undefined}
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          pointerEvents: currentStep.action === "click" ? "auto" : "none",
          cursor: currentStep.action === "click" ? "pointer" : "default",
          animation: "pulse 2s ease-in-out infinite",
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute left-0 right-0 px-5"
        style={{
          top: tooltipAbove ? rect.top - pad - 12 : rect.bottom + pad + 12,
          transform: tooltipAbove ? "translateY(-100%)" : "none",
          pointerEvents: "auto",
        }}
      >
        <div className="max-w-sm mx-auto">
          {/* Arrow */}
          {!tooltipAbove && (
            <div className="flex justify-center mb-[-1px]">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] border-b-white" />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-bold text-slate-900">{currentStep.title}</p>
                <button onClick={onDismiss} className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{currentStep.body}</p>
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">{sub + 1} / {STEPS.length}</span>
              <div className="flex items-center gap-2">
                <button onClick={onDismiss} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                  Skip
                </button>
                {currentStep.action === "click" ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <MousePointerClick className="h-3 w-3" /> Click to continue
                  </span>
                ) : (
                  <button
                    onClick={advance}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {currentStep.action === "done" ? "Finish" : "Next"}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Arrow below */}
          {tooltipAbove && (
            <div className="flex justify-center mt-[-1px]">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-white" />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(244,63,94,0); }
        }
      `}</style>
    </div>
  );
}

export const TUTORIAL_STORAGE_KEY = "propel_tutorial_active";
