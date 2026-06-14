import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface TourStep {
  targetId?: string;          // element to spotlight + show tooltip near
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  ctaLabel?: string;          // button text (default: "Next →")
  onEnter?: () => void;       // called when this step becomes active (auto-fill, etc.)
}

interface Props {
  steps: TourStep[];
  onClose: () => void;
  onComplete: () => void;
}

const PAD = 12;
const TIP_W = 380;

function useRect(id?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!id) { setRect(null); return; }
    const update = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setRect(el.getBoundingClientRect());
      } else setRect(null);
    };
    // Small delay so scrollIntoView settles
    const t = setTimeout(update, 150);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [id]);
  return rect;
}

function getPlacement(rect: DOMRect | null, preferred?: string): "top" | "bottom" | "left" | "right" | "center" {
  if (!rect || preferred === "center") return "center";
  if (preferred) return preferred as any;
  const vh = window.innerHeight;
  if (rect.bottom + 240 < vh) return "bottom";
  if (rect.top - 240 > 0) return "top";
  if (rect.right + TIP_W + PAD < window.innerWidth) return "right";
  return "left";
}

function tooltipPos(rect: DOMRect | null, placement: string): React.CSSProperties {
  if (!rect || placement === "center") {
    return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999 };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0, left = 0;
  if (placement === "bottom") {
    top = Math.min(rect.bottom + PAD, vh - 220);
    left = Math.max(8, Math.min(rect.left + rect.width / 2 - TIP_W / 2, vw - TIP_W - 8));
  } else if (placement === "top") {
    top = Math.max(8, rect.top - 200 - PAD);
    left = Math.max(8, Math.min(rect.left + rect.width / 2 - TIP_W / 2, vw - TIP_W - 8));
  } else if (placement === "right") {
    top = Math.max(8, rect.top + rect.height / 2 - 100);
    left = Math.min(rect.right + PAD, vw - TIP_W - 8);
  } else {
    top = Math.max(8, rect.top + rect.height / 2 - 100);
    left = Math.max(8, rect.left - TIP_W - PAD);
  }
  return { position: "fixed", top, left, zIndex: 9999 };
}

export function GuidedTour({ steps, onClose, onComplete }: Props) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const step = steps[idx];
  const rect = useRect(step?.targetId);
  const placement = getPlacement(rect, step?.placement);
  const isLast = idx === steps.length - 1;

  // Call onEnter when step changes
  useEffect(() => {
    step?.onEnter?.();
  }, [idx]);

  const next = useCallback(() => {
    if (isLast) onComplete();
    else setIdx(i => i + 1);
  }, [isLast, onComplete]);

  const prev = useCallback(() => {
    if (idx > 0) setIdx(i => i - 1);
  }, [idx]);

  if (!step) return null;

  const showOverlay = !!step.targetId && !!rect;

  return (
    <>
      {/* Full-screen dark overlay with cutout */}
      <div className="fixed inset-0 z-[900]" style={{ pointerEvents: showOverlay ? "auto" : "none" }}>
        {showOverlay && rect && (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
            <defs>
              <mask id="gtmask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left - PAD}
                  y={rect.top - PAD}
                  width={rect.width + PAD * 2}
                  height={rect.height + PAD * 2}
                  rx="10"
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(15,15,25,0.72)" mask="url(#gtmask)" />
          </svg>
        )}
        {!showOverlay && (
          <div className="absolute inset-0 bg-black/60" style={{ pointerEvents: "none" }} />
        )}
      </div>

      {/* Spotlight ring */}
      {showOverlay && rect && (
        <div
          className="fixed z-[901] rounded-[10px] ring-2 ring-primary"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            pointerEvents: "none",
            boxShadow: "0 0 0 4px rgba(255,53,94,0.2)",
            animation: "pulseRing 2s ease-in-out infinite",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{ ...tooltipPos(rect, placement), width: TIP_W, pointerEvents: "auto" }}
        className="fixed z-[902] bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-border/40">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{idx + 1} / {steps.length}</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3 className="text-base font-bold text-foreground mb-2 leading-snug">{step.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">{step.body}</p>
        </div>

        <div className="px-5 pb-5 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={idx === 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" /> Back
          </button>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === idx ? "w-4 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          <button
            onClick={next}
            className="h-9 px-4 rounded-xl bg-foreground text-background text-sm font-semibold flex items-center gap-1.5 hover:bg-foreground/90 transition-colors"
          >
            {step.ctaLabel ?? (isLast ? "Finish" : "Next")}
            {!isLast && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulseRing {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  );
}
