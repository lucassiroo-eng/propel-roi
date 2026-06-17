import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Check, X, Loader2, Download, Zap, Plus, RefreshCw,
  Save, AlertTriangle, ArrowLeft, ChevronRight,
} from "lucide-react";
import jsPDF from "jspdf";

// ── html2canvas lazy loader (same pattern as generateRoiDeck.ts) ─────────────
let h2cLoaded: Promise<any> | null = null;
function loadHtml2Canvas(): Promise<any> {
  if ((window as any).html2canvas) return Promise.resolve((window as any).html2canvas);
  if (h2cLoaded) return h2cLoaded;
  h2cLoaded = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => resolve((window as any).html2canvas);
    s.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.head.appendChild(s);
  });
  return h2cLoaded;
}
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────────────

type Step = "warning" | "input" | "loading" | "result";

interface StepEvent {
  step: string;
  status: "running" | "done" | "error";
  label: string;
  detail?: string;
}

interface ModuleOverride {
  include: boolean;
  note: string;
}

const STEP_ORDER = ["hubspot", "modjo", "transcripts", "claude", "roi", "html"];
const STEP_LABELS: Record<string, string> = {
  hubspot: "HubSpot", modjo: "Modjo", transcripts: "Transcripts",
  claude: "Claude IA", roi: "Cálculo ROI", html: "Documento",
};

const ALL_MODULES: Record<string, string> = {
  core: "Plataforma del Empleado / Core",
  time_off: "Gestión de Ausencias",
  time_tracking: "Control Horario",
  time_planning: "Planificación de Turnos",
  payroll: "Nómina",
  compensations: "Compensaciones",
  recruitment: "Selección de Personal",
  performance: "Evaluación del Desempeño",
  expenses: "Gestión de Gastos",
  trainings: "Formación",
  complaints: "Canal de Denuncias",
  engagement: "Clima Laboral",
  benefits_standard: "Beneficios para Empleados",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StepDot({ status }: { status?: "running" | "done" | "error" | "pending" }) {
  if (status === "done") return <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><Check className="h-2.5 w-2.5 text-white" /></div>;
  if (status === "error") return <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center shrink-0"><X className="h-2.5 w-2.5 text-white" /></div>;
  if (status === "running") return <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 animate-pulse"><div className="w-1.5 h-1.5 rounded-full bg-white" /></div>;
  return <div className="w-5 h-5 rounded-full bg-muted/50 border-2 border-muted shrink-0" />;
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MiniRoiPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>(sessionId ? "result" : "warning");
  const [url, setUrl] = useState("");
  const [annualCost, setAnnualCost] = useState("");
  const [pipelineSteps, setPipelineSteps] = useState<StepEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [hsData, setHsData] = useState<any>(null);
  const [roiData, setRoiData] = useState<any>(null);
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, ModuleOverride>>({});
  const [html, setHtml] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(sessionId ?? null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-resize iframe to its full content height
  function onIframeLoad() {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const h = iframe.contentDocument?.documentElement?.scrollHeight;
      if (h && h > 0) iframe.style.height = h + "px";
    } catch { /* cross-origin */ }
  }

  const stepMap = Object.fromEntries(pipelineSteps.map(s => [s.step, s]));
  const roiDone = !!stepMap["roi"] && stepMap["roi"].status === "done";
  const includedModules = Object.entries(moduleOverrides).filter(([, v]) => v.include).map(([id]) => id);
  const addableModules = Object.keys(ALL_MODULES).filter(id => !moduleOverrides[id]);

  // ── Load saved session ───────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data } = await supabase
        .from("roi_sessions")
        .select("mini_roi_data, total_annual_benefit_eur, roi_pct")
        .eq("id", sessionId)
        .single();
      if (data?.mini_roi_data) {
        const d = data.mini_roi_data as any;
        setHsData(d.hs_data ?? null);
        setAnalysis(d.analysis ?? null);
        setRoiData(d.roi_data ?? null);
        setHtml(d.html ?? null);
        setAnnualCost(d.annual_cost ? String(d.annual_cost) : "");
        if (d.module_overrides) setModuleOverrides(d.module_overrides);
        else if (d.analysis?.modules) {
          const ov: Record<string, ModuleOverride> = {};
          for (const m of d.analysis.modules) ov[m.id] = { include: true, note: "" };
          setModuleOverrides(ov);
        }
        setStep("result");
      }
    })();
  }, [sessionId]);

  // ── Edge function call ───────────────────────────────────────────────────
  async function callEdge(body: object, onEvent: (e: any) => void) {
    const { data: { session } } = await supabase.auth.getSession();
    const abort = new AbortController();
    abortRef.current = abort;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mini-roi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
      signal: abort.signal,
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try { onEvent(JSON.parse(line)); } catch { /* ignore */ }
      }
    }
  }

  // ── Analyse deal ─────────────────────────────────────────────────────────
  async function analyse() {
    if (!url.trim()) return;
    setPipelineSteps([]); setHtml(null); setAnalysis(null);
    setHsData(null); setRoiData(null); setModuleOverrides({});
    setError(null); setRunning(true); setStep("loading");
    try {
      await callEdge(
        { deal_url: url.trim(), language: "es", annual_cost_override: annualCost ? Number(annualCost) : undefined },
        (event) => {
          if (event.step === "result") {
            setAnalysis(event.analysis ?? null);
            setHsData(event.company ?? null);
            setRoiData(event.roi_data ?? null);
            setHtml(event.html ?? null);  // ← fix: capture the generated HTML
            const ov: Record<string, ModuleOverride> = {};
            for (const m of event.analysis?.modules ?? []) ov[m.id] = { include: true, note: "" };
            setModuleOverrides(ov);
            setIsDirty(false);
            setStep("result");
          } else if (event.step === "error") {
            setError(event.detail ?? "Error desconocido");
          } else {
            setPipelineSteps(prev => {
              const idx = prev.findIndex(s => s.step === event.step);
              if (idx >= 0) { const n = [...prev]; n[idx] = event; return n; }
              return [...prev, event];
            });
          }
        }
      );
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message ?? "Error de red");
    } finally {
      setRunning(false);
    }
  }

  // ── Regenerate with overrides ─────────────────────────────────────────────
  async function regenerate() {
    if (!analysis || !hsData) return;
    setRegenerating(true); setError(null);
    const selected_modules = includedModules;
    const module_notes: Record<string, string> = {};
    for (const [id, ov] of Object.entries(moduleOverrides)) {
      if (ov.include && ov.note.trim()) module_notes[id] = ov.note.trim();
    }
    try {
      await callEdge(
        { mode: "html_only", hs_data: hsData, existing_analysis: analysis, selected_modules, module_notes, annual_cost_override: annualCost ? Number(annualCost) : roiData?.annual_cost, language: "es" },
        (event) => {
          if (event.step === "result") {
            setHtml(event.html ?? null);
            if (event.roi_data) setRoiData(event.roi_data);
            if (event.analysis) setAnalysis(event.analysis);
            setIsDirty(false);
          } else if (event.step === "error") {
            setError(event.detail ?? "Error");
          }
        }
      );
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message ?? "Error");
    } finally {
      setRegenerating(false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function save() {
    if (!user || !hsData) return;
    setSaving(true);
    try {
      // Find or create prospect
      const { data: existing } = await supabase.from("prospects")
        .select("id").eq("company_name", hsData.company_name ?? "").limit(1).single();
      let prospectId = existing?.id;
      if (!prospectId) {
        const { data: created } = await supabase.from("prospects").insert({
          company_name: hsData.company_name ?? hsData.deal_name ?? "Desconocido",
          country: (hsData.country ?? "ES").substring(0, 2).toUpperCase(),
          seats: hsData.employees ?? 0,
          hubspot_deal_url: url || null,
        }).select("id").single();
        prospectId = created?.id;
      }

      const miniRoiData = {
        hs_data: hsData,
        analysis,
        roi_data: roiData,
        html,
        module_overrides: moduleOverrides,
        annual_cost: annualCost ? Number(annualCost) : roiData?.annual_cost,
      };

      const payload: any = {
        pae_id: user.id,
        prospect_id: prospectId,
        flow_type: "mini_roi",
        status: "generated",
        total_annual_benefit_eur: roiData?.total_savings ?? null,
        roi_eur: roiData ? roiData.total_savings - roiData.annual_cost : null,
        roi_pct: roiData?.roi_pct ?? null,
        payback_months: roiData?.payback_months ?? null,
        mini_roi_data: miniRoiData,
      };

      if (savedId) {
        await supabase.from("roi_sessions").update(payload).eq("id", savedId);
      } else {
        const { data: newSession } = await supabase.from("roi_sessions").insert(payload).select("id").single();
        if (newSession?.id) setSavedId(newSession.id);
      }
      toast.success("ROI guardado");
    } catch (err: any) {
      toast.error("Error al guardar: " + (err.message ?? ""));
    } finally {
      setSaving(false);
    }
  }

  // ── Download as PDF (html2canvas → jsPDF, A4 portrait) ───────────────────
  async function downloadPdf() {
    if (!html) return;
    setDownloadingPdf(true);
    try {
      const html2canvas = await loadHtml2Canvas();
      const company = hsData?.company_name ?? "roi";

      // Render HTML in a hidden iframe at A4 width (794px = 210mm @ 96dpi)
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1px;border:none;pointer-events:none;z-index:-1;";
      document.body.appendChild(iframe);

      try {
        await new Promise<void>(resolve => { iframe.onload = () => resolve(); iframe.srcdoc = html; });
        // Wait for fonts and layout
        await new Promise(r => setTimeout(r, 600));

        const pages = Array.from(iframe.contentDocument!.querySelectorAll(".page")) as HTMLElement[];
        if (pages.length === 0) throw new Error("No pages found");

        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const A4_W = 210; const A4_H = 297;

        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage("a4", "portrait");
          const page = pages[i];
          const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: 794,
          });
          const imgData = canvas.toDataURL("image/jpeg", 0.92);
          // Scale image to fill A4
          const canvasRatio = canvas.height / canvas.width;
          const imgH = Math.min(A4_W * canvasRatio, A4_H);
          pdf.addImage(imgData, "JPEG", 0, 0, A4_W, imgH);
        }

        pdf.save(`ROI-${company}.pdf`);
      } finally {
        document.body.removeChild(iframe);
      }
    } catch (err: any) {
      toast.error("Error generando PDF: " + (err.message ?? ""));
    } finally {
      setDownloadingPdf(false);
    }
  }

  function markDirty() { setIsDirty(true); }

  function toggleModule(id: string) {
    setModuleOverrides(prev => ({ ...prev, [id]: { ...prev[id], include: !prev[id].include } }));
    markDirty();
  }
  function setNote(id: string, note: string) {
    setModuleOverrides(prev => ({ ...prev, [id]: { ...prev[id], note } }));
    markDirty();
  }
  function addModule(id: string) {
    setModuleOverrides(prev => ({ ...prev, [id]: { include: true, note: "" } }));
    setShowAddModule(false);
    markDirty();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // WARNING — full-screen gate, no chrome
  if (step === "warning") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "oklch(97% 0.005 250)" }}>
        <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-sm border border-border">
          <div className="mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: "oklch(93% 0.03 60)", border: "1px solid oklch(86% 0.06 60)" }}>
              <AlertTriangle className="h-7 w-7" style={{ color: "oklch(58% 0.16 60)" }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-4" style={{ color: "oklch(14% 0.018 250)" }}>
              ROI basado en asunciones
            </h1>
            <p className="text-base leading-relaxed mb-3" style={{ color: "oklch(32% 0.012 250)" }}>
              Crear un ROI basado en asunciones no aportará el mismo valor que co-crearlo con el prospect. Aun así puede servir para demostrar el valor de Factorial basado en el Discovery de un deal, como punto de partida antes de una llamada.
            </p>
            <p className="text-sm" style={{ color: "oklch(58% 0.01 250)" }}>
              Los números generados son estimaciones conservadoras. Idealmente valídalos con el prospect.
            </p>
          </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => navigate("/")}
                className="flex-1 h-14 rounded-2xl font-semibold text-base transition-all border-2"
                style={{ borderColor: "oklch(88% 0.006 250)", color: "oklch(28% 0.013 250)", background: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background = "oklch(96% 0.004 250)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep("input")}
                className="flex-1 h-14 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-2"
                style={{ background: "oklch(14% 0.018 250)", color: "white" }}
                onMouseEnter={e => (e.currentTarget.style.background = "oklch(22% 0.018 250)")}
                onMouseLeave={e => (e.currentTarget.style.background = "oklch(14% 0.018 250)")}
              >
                Continuar <ChevronRight className="h-5 w-5" />
              </button>
          </div>
        </div>
      </div>
    );
  }

  // INPUT — clean, focused
  if (step === "input") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "oklch(98.5% 0.004 250)" }}>
        {/* Slim nav */}
        <div className="px-6 pt-5 pb-0">
          <button
            onClick={() => setStep("warning")}
            className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: "oklch(60% 0.01 250)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "oklch(30% 0.01 250)")}
            onMouseLeave={e => (e.currentTarget.style.color = "oklch(60% 0.01 250)")}
          >
            <ArrowLeft className="h-3 w-3" /> Inicio
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[520px]">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight mb-1.5" style={{ color: "oklch(14% 0.018 250)" }}>
                Analizar un deal
              </h1>
              <p className="text-sm" style={{ color: "oklch(54% 0.01 250)" }}>
                La IA descarga las llamadas del deal y construye el ROI automáticamente
              </p>
            </div>

            {/* Form */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                  style={{ color: "oklch(50% 0.01 250)" }}>
                  HubSpot Deal URL
                </label>
                <input
                  type="url"
                  placeholder="https://app-eu1.hubspot.com/contacts/.../record/0-3/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && url.trim() && analyse()}
                  autoFocus
                  className="w-full h-11 px-3.5 rounded-xl text-xs font-mono outline-none transition-all"
                  style={{
                    background: "oklch(100% 0 0)",
                    border: "1.5px solid oklch(88% 0.006 250)",
                    color: "oklch(20% 0.015 250)",
                  }}
                  onFocus={e => (e.currentTarget.style.border = "1.5px solid oklch(50% 0.22 15)")}
                  onBlur={e => (e.currentTarget.style.border = "1.5px solid oklch(88% 0.006 250)")}
                />
              </div>

              {/* Price — secondary, collapsible feel */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "oklch(91% 0.005 250)" }} />
                <span className="text-[10px] font-medium shrink-0" style={{ color: "oklch(68% 0.008 250)" }}>opcional</span>
                <div className="flex-1 h-px" style={{ background: "oklch(91% 0.005 250)" }} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "oklch(54% 0.01 250)" }}>
                    Precio Factorial (si lo sabes)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Auto"
                      value={annualCost}
                      onChange={e => setAnnualCost(e.target.value)}
                      className="w-36 h-9 px-3 rounded-lg text-sm text-center font-mono tabular-nums outline-none transition-all"
                      style={{
                        background: "oklch(100% 0 0)",
                        border: "1.5px solid oklch(88% 0.006 250)",
                        color: "oklch(20% 0.015 250)",
                      }}
                      onFocus={e => (e.currentTarget.style.border = "1.5px solid oklch(50% 0.22 15)")}
                      onBlur={e => (e.currentTarget.style.border = "1.5px solid oklch(88% 0.006 250)")}
                    />
                    <span className="text-sm" style={{ color: "oklch(60% 0.01 250)" }}>€/año</span>
                  </div>
                </div>
              </div>

              <button
                onClick={analyse}
                disabled={!url.trim()}
                className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "oklch(14% 0.018 250)", color: "white" }}
                onMouseEnter={e => { if (url.trim()) e.currentTarget.style.background = "oklch(22% 0.018 250)"; }}
                onMouseLeave={e => (e.currentTarget.style.background = "oklch(14% 0.018 250)")}
              >
                <Zap className="h-4 w-4" />
                Analizar deal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOADING — centered timeline
  if (step === "loading") {
    const doneCount = pipelineSteps.filter(s => s.status === "done").length;
    const progress = (doneCount / STEP_ORDER.length) * 100;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
        style={{ background: "oklch(98.5% 0.004 250)" }}>
        <div className="w-full max-w-sm">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex w-12 h-12 rounded-2xl items-center justify-center mb-4"
              style={{ background: "oklch(14% 0.018 250)" }}>
              <Zap className="h-5 w-5" style={{ color: "oklch(96% 0.005 250)" }} />
            </div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: "oklch(14% 0.018 250)" }}>
              Analizando el deal
            </h2>
            <p className="text-sm mt-1" style={{ color: "oklch(56% 0.01 250)" }}>
              20-30 segundos
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full mb-8 overflow-hidden" style={{ background: "oklch(91% 0.005 250)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: "oklch(50% 0.22 15)" }}
            />
          </div>

          {/* Timeline */}
          <div className="space-y-0">
            {STEP_ORDER.map((sk, idx) => {
              const ev = stepMap[sk];
              const isDone = ev?.status === "done";
              const isRunning = ev?.status === "running";
              const isPending = !ev;
              const isLast = idx === STEP_ORDER.length - 1;

              return (
                <div key={sk} className="flex gap-4">
                  {/* Connector + dot */}
                  <div className="flex flex-col items-center w-5 shrink-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                      isDone ? "scale-100" : isRunning ? "scale-110" : "scale-90"
                    }`} style={{
                      background: isDone ? "oklch(52% 0.18 145)" : isRunning ? "oklch(50% 0.22 15)" : "oklch(91% 0.005 250)",
                      boxShadow: isRunning ? "0 0 0 4px rgba(255,53,94,0.15)" : "none",
                    }}>
                      {isDone ? <Check className="h-2.5 w-2.5 text-white" /> :
                       isRunning ? <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> :
                       null}
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 my-0.5 transition-all duration-500"
                        style={{ background: isDone ? "rgba(74,180,120,0.3)" : "oklch(88% 0.005 250)", minHeight: 20 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 min-w-0 transition-opacity duration-300 ${isPending ? "opacity-35" : "opacity-100"}`}>
                    <p className={`text-sm font-semibold leading-tight ${isRunning ? "animate-pulse" : ""}`}
                      style={{ color: isDone ? "oklch(32% 0.012 250)" : isRunning ? "oklch(50% 0.22 15)" : "oklch(60% 0.01 250)" }}>
                      {STEP_LABELS[sk]}
                    </p>
                    {ev?.detail && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(62% 0.009 250)" }}>
                        {ev.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-6 rounded-xl px-4 py-3" style={{ background: "oklch(96% 0.02 15)", border: "1px solid oklch(88% 0.06 15)" }}>
              <p className="text-xs font-semibold" style={{ color: "oklch(45% 0.18 15)" }}>{error}</p>
              <button onClick={() => setStep("input")} className="text-xs mt-1 font-medium transition-colors"
                style={{ color: "oklch(60% 0.01 250)" }}>
                ← Volver a intentarlo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RESULT — split pane
  const fmtK = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `€${n}`;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "oklch(98.5% 0.004 250)" }}>
      <AppHeader />

      {/* Toolbar */}
      <div className="shrink-0 px-4 h-11 flex items-center justify-between gap-4"
        style={{ borderBottom: "1px solid oklch(90% 0.006 250)", background: "oklch(99% 0.003 250)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/")}
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors shrink-0"
            style={{ color: "oklch(60% 0.01 250)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(93% 0.005 250)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="h-4 w-px" style={{ background: "oklch(88% 0.006 250)" }} />
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-sm font-semibold truncate" style={{ color: "oklch(18% 0.015 250)" }}>
              {hsData?.company_name ?? "ROI"}
            </span>
            {hsData?.employees && (
              <span className="text-xs shrink-0" style={{ color: "oklch(58% 0.01 250)" }}>
                {hsData.employees} emp
              </span>
            )}
          </div>
          {roiData?.total_savings > 0 && (
            <>
              <div className="h-4 w-px shrink-0" style={{ background: "oklch(88% 0.006 250)" }} />
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-semibold tabular-nums" style={{ color: "oklch(50% 0.22 15)" }}>
                  {fmtK(roiData.total_savings)}/año
                </span>
                {roiData.roi_pct > 0 && (
                  <span className="text-xs font-semibold tabular-nums" style={{ color: "oklch(52% 0.18 145)" }}>
                    {roiData.roi_pct}% ROI
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {savedId && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ color: "oklch(48% 0.14 145)", background: "oklch(94% 0.04 145)", border: "1px solid oklch(86% 0.06 145)" }}>
              ✓ Guardado
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            style={{
              border: "1px solid oklch(86% 0.007 250)",
              color: "oklch(28% 0.015 250)",
              background: "transparent",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(95% 0.004 250)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Document preview */}
        <div className="flex-1 overflow-auto" style={{ background: "oklch(91% 0.007 250)" }}>
          <div className="flex justify-center items-start p-8 min-h-full">
            {html ? (
              <iframe
                ref={iframeRef}
                srcDoc={html}
                title="Preview"
                sandbox="allow-same-origin"
                onLoad={onIframeLoad}
                style={{
                  width: "210mm",
                  minHeight: "297mm",
                  display: "block",
                  border: "none",
                  background: "#fff",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
                  borderRadius: 3,
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3"
                style={{ width: "210mm", height: "297mm", background: "#fff", borderRadius: 3, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "oklch(72% 0.01 250)" }} />
                <p className="text-sm font-medium" style={{ color: "oklch(60% 0.01 250)" }}>Generando...</p>
              </div>
            )}
          </div>
        </div>

        {/* Control panel */}
        <div className="w-[480px] shrink-0 flex flex-col overflow-hidden"
          style={{ borderLeft: "1px solid oklch(90% 0.006 250)", background: "oklch(99% 0.003 250)" }}>
          <div className="flex-1 overflow-y-auto">

            {/* Price section */}
            <div className="px-4 pt-4 pb-3.5" style={{ borderBottom: "1px solid oklch(92% 0.005 250)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5"
                style={{ color: "oklch(58% 0.01 250)" }}>Precio Factorial</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={annualCost || (roiData?.annual_cost ? String(roiData.annual_cost) : "")}
                  onChange={e => { setAnnualCost(e.target.value); markDirty(); }}
                  placeholder={roiData?.annual_cost ? String(roiData.annual_cost) : "Auto"}
                  className="flex-1 h-8 px-2.5 rounded-lg text-sm font-bold tabular-nums text-center outline-none transition-all"
                  style={{
                    background: "oklch(97% 0.003 250)",
                    border: "1.5px solid oklch(88% 0.006 250)",
                    color: "oklch(18% 0.015 250)",
                  }}
                  onFocus={e => (e.currentTarget.style.border = "1.5px solid oklch(50% 0.22 15)")}
                  onBlur={e => (e.currentTarget.style.border = "1.5px solid oklch(88% 0.006 250)")}
                />
                <span className="text-xs font-medium shrink-0" style={{ color: "oklch(58% 0.01 250)" }}>€/año</span>
              </div>
            </div>

            {/* Modules section */}
            <div>
              <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "oklch(58% 0.01 250)" }}>
                  Módulos
                </p>
                <span className="text-[9px] tabular-nums" style={{ color: "oklch(68% 0.009 250)" }}>
                  {includedModules.length} activos
                </span>
              </div>

              <div>
                {Object.entries(moduleOverrides).map(([id, ov]) => (
                  <div key={id} style={{ borderTop: "1px solid oklch(93% 0.005 250)" }}>
                    <div className={`px-4 py-3 transition-opacity ${!ov.include ? "opacity-25" : ""}`}>
                      {/* Module row */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleModule(id)}
                          className="w-4.5 h-4.5 rounded-md flex items-center justify-center shrink-0 transition-all"
                          style={{
                            width: 18, height: 18,
                            background: ov.include ? "oklch(52% 0.18 145)" : "transparent",
                            border: ov.include ? "none" : "1.5px solid oklch(76% 0.01 250)",
                          }}
                        >
                          {ov.include && <Check className="h-2.5 w-2.5 text-white" />}
                        </button>
                        <span className="text-[12px] font-semibold flex-1 leading-tight"
                          style={{ color: "oklch(20% 0.015 250)" }}>
                          {ALL_MODULES[id] ?? id}
                        </span>
                      </div>
                      {/* Note field — always visible when included, compact */}
                      {ov.include && (
                        <div className="mt-2.5 ml-[30px]">
                          <textarea
                            placeholder='Nota opcional (ej: "reemplaza Bizneo", "HR dedica 8h no 4h"...)'
                            value={ov.note}
                            onChange={e => setNote(id, e.target.value)}
                            rows={ov.note ? 2 : 1}
                            className="w-full text-[11px] leading-snug px-3 py-2 rounded-lg resize-none outline-none transition-all"
                            style={{
                              background: ov.note ? "oklch(97% 0.004 250)" : "oklch(97.5% 0.003 250)",
                              border: `1px solid ${ov.note ? "oklch(84% 0.007 250)" : "oklch(91% 0.005 250)"}`,
                              color: "oklch(28% 0.013 250)",
                              minHeight: 32,
                            }}
                            onFocus={e => { e.currentTarget.rows = 2; e.currentTarget.style.border = "1px solid #FF355E"; e.currentTarget.style.background = "#fff"; }}
                            onBlur={e => { if (!e.currentTarget.value) { e.currentTarget.rows = 1; } e.currentTarget.style.border = "1px solid #e5e7eb"; e.currentTarget.style.background = "#f8f9fa"; }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add module */}
              <div className="px-4 py-3" style={{ borderTop: "1px solid oklch(93% 0.005 250)" }}>
                {showAddModule ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {addableModules.map(id => (
                        <button
                          key={id}
                          onClick={() => addModule(id)}
                          className="text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
                          style={{ background: "oklch(94% 0.005 250)", color: "oklch(36% 0.013 250)" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(92% 0.02 15)"; (e.currentTarget as HTMLElement).style.color = "oklch(50% 0.22 15)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "oklch(94% 0.005 250)"; (e.currentTarget as HTMLElement).style.color = "oklch(36% 0.013 250)"; }}
                        >
                          + {ALL_MODULES[id]}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setShowAddModule(false)} className="text-[10px] font-medium"
                      style={{ color: "oklch(66% 0.009 250)" }}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddModule(true)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold transition-colors"
                    style={{ color: "oklch(50% 0.22 15)" }}
                  >
                    <Plus className="h-3 w-3" /> Añadir módulo
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mx-4 mb-3 rounded-xl px-3 py-2.5"
                style={{ background: "oklch(96% 0.02 15)", border: "1px solid oklch(88% 0.06 15)" }}>
                <p className="text-[11px] font-semibold" style={{ color: "oklch(45% 0.18 15)" }}>{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 p-3 space-y-2" style={{ borderTop: "1px solid oklch(91% 0.006 250)" }}>
            {isDirty ? (
              <button
                onClick={regenerate}
                disabled={regenerating || includedModules.length === 0}
                className="w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: "oklch(50% 0.22 15)", color: "white" }}
                onMouseEnter={e => { if (!regenerating) (e.currentTarget as HTMLElement).style.background = "oklch(44% 0.22 15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "oklch(50% 0.22 15)"; }}
              >
                {regenerating
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Regenerando...</>
                  : <><RefreshCw className="h-3.5 w-3.5" />Regenerar</>
                }
              </button>
            ) : (
              <button
                onClick={downloadPdf}
                disabled={!html}
                className="w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: "oklch(14% 0.018 250)", color: "white" }}
                onMouseEnter={e => { if (html) (e.currentTarget as HTMLElement).style.background = "oklch(22% 0.018 250)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "oklch(14% 0.018 250)"; }}
              >
                <Download className="h-3.5 w-3.5" /> Descargar PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
