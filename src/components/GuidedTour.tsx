import { useEffect, useRef, useState } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface TourStep {
  targetId?: string;         // DOM element to highlight (by id)
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  spotlight?: boolean;       // dim everything else
  action?: string;           // label for primary action (default: Next)
  skippable?: boolean;
}

interface Props {
  steps: TourStep[];
  onClose: () => void;
  onComplete: () => void;
  currentAppStep: number;    // which wizard step we're on
}

function useTargetRect(targetId?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetId) { setRect(null); return; }
    const update = () => {
      const el = document.getElementById(targetId);
      setRect(el?.getBoundingClientRect() ?? null);
    };
    update();
    const obs = new ResizeObserver(update);
    const el = document.getElementById(targetId);
    if (el) obs.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return rect;
}

export function GuidedTour({ steps, onClose, onComplete, currentAppStep }: Props) {
  const { t } = useTranslation();
  const [tourStep, setTourStep] = useState(0);
  const step = steps[tourStep];
  const rect = useTargetRect(step?.targetId);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isLast = tourStep === steps.length - 1;
  const pad = 10;

  function next() {
    if (isLast) { onComplete(); } else { setTourStep(s => s + 1); }
  }
  function prev() {
    if (tourStep > 0) setTourStep(s => s - 1);
  }

  // Compute tooltip position
  function getTooltipStyle(): React.CSSProperties {
    if (!rect || step?.placement === "center") {
      return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000 };
    }
    const placement = step?.placement ?? inferPlacement(rect);
    const tipW = 320;
    const tipH = 200;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0, left = 0;
    if (placement === "bottom") {
      top = rect.bottom + pad;
      left = Math.max(16, Math.min(rect.left + rect.width / 2 - tipW / 2, vw - tipW - 16));
    } else if (placement === "top") {
      top = rect.top - tipH - pad;
      left = Math.max(16, Math.min(rect.left + rect.width / 2 - tipW / 2, vw - tipW - 16));
    } else if (placement === "right") {
      top = Math.max(16, Math.min(rect.top + rect.height / 2 - tipH / 2, vh - tipH - 16));
      left = rect.right + pad;
    } else {
      top = Math.max(16, Math.min(rect.top + rect.height / 2 - tipH / 2, vh - tipH - 16));
      left = rect.left - tipW - pad;
    }
    return { position: "fixed", top, left, zIndex: 1000 };
  }

  function inferPlacement(r: DOMRect): "top" | "bottom" | "right" | "left" {
    const vh = window.innerHeight;
    if (r.bottom + 220 < vh) return "bottom";
    if (r.top - 220 > 0) return "top";
    if (r.right + 340 < window.innerWidth) return "right";
    return "left";
  }

  if (!step) return null;

  const showSpotlight = step.spotlight && rect;

  return (
    <div className="fixed inset-0 z-[500]" style={{ pointerEvents: "none" }}>
      {/* Spotlight backdrop */}
      {showSpotlight && rect && (
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - pad}
                y={rect.top - pad}
                width={rect.width + pad * 2}
                height={rect.height + pad * 2}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
        </svg>
      )}

      {/* Highlight ring */}
      {showSpotlight && rect && (
        <div
          className="absolute rounded-xl ring-2 ring-primary ring-offset-2 animate-pulse"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={{ ...getTooltipStyle(), pointerEvents: "auto" }}
        className="w-80 bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-border/40">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((tourStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {tourStep + 1} / {steps.length}
              </span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-foreground mb-2 leading-tight">{step.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">{step.body}</p>
        </div>

        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <button
            onClick={prev}
            disabled={tourStep === 0}
            className="h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5 inline mr-0.5" />
            {t("onboarding.prev", "Back")}
          </button>
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === tourStep ? "w-4 bg-foreground" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          <button
            onClick={next}
            className="h-8 px-4 rounded-lg bg-foreground text-background text-xs font-semibold flex items-center gap-1.5 hover:bg-foreground/90 transition-colors"
          >
            {step.action ?? (isLast ? t("onboarding.start", "Start") : t("onboarding.next", "Next"))}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            {isLast && <Zap className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
