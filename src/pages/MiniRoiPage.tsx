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
  const [savedId, setSavedId] = useState<string | null>(sessionId ?? null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  // ── Download as PDF (via browser print dialog) ───────────────────────────
  function downloadPdf() {
    if (!html) return;
    const win = window.open("", "_blank");
    if (!win) { alert("Permite ventanas emergentes para descargar el PDF"); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.addEventListener("load", () => {
      setTimeout(() => { win.focus(); win.print(); }, 300);
    });
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

  // WARNING step
  if (step === "warning") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 space-y-6 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">ROI basado en asunciones</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Crear un ROI basado en asunciones no aportará el mismo valor que co-crearlo con el prospect. Aun así puede servir para demostrar el valor de Factorial basado en el Discovery de un deal, como punto de partida antes de una llamada.
              </p>
              <p className="text-xs text-muted-foreground/70 pt-1">
                Los números generados son estimaciones conservadoras. Idealmente valídalos con el prospect.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate("/")} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button onClick={() => setStep("input")} className="flex-1 rounded-xl bg-foreground text-background hover:bg-foreground/90">
                Continuar <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // INPUT step
  if (step === "input") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full space-y-6">
            <div>
              <button onClick={() => setStep("warning")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ArrowLeft className="h-3.5 w-3.5" /> Volver
              </button>
              <h1 className="text-2xl font-extrabold text-foreground">ROI basado en asunciones</h1>
              <p className="text-sm text-muted-foreground mt-1">Pega el link del deal y deja que la IA haga el análisis</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HubSpot Deal URL</Label>
                <Input
                  placeholder="https://app-eu1.hubspot.com/contacts/4960096/record/0-3/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="font-mono text-xs h-10"
                  onKeyDown={e => e.key === "Enter" && analyse()}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Precio Factorial <span className="font-normal normal-case text-muted-foreground/60">(opcional — se calcula automáticamente)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Auto"
                    value={annualCost}
                    onChange={e => setAnnualCost(e.target.value)}
                    className="h-10 w-36 text-center font-mono"
                  />
                  <span className="text-sm text-muted-foreground">€/año</span>
                </div>
              </div>
              <Button
                onClick={analyse}
                disabled={!url.trim()}
                className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2"
              >
                <Zap className="h-4 w-4" /> Analizar deal
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOADING step
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-foreground">Analizando el deal...</h2>
              <p className="text-sm text-muted-foreground mt-1">Esto puede tardar 20-30 segundos</p>
            </div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pipeline</p>
              </div>
              <div className="divide-y divide-border">
                {STEP_ORDER.map(sk => {
                  const ev = stepMap[sk];
                  return (
                    <div key={sk} className="flex items-start gap-3 px-4 py-3">
                      <StepDot status={ev?.status ?? "pending"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-semibold ${ev?.status === "done" ? "text-foreground" : ev?.status === "running" ? "text-primary" : "text-muted-foreground/40"}`}>
                            {STEP_LABELS[sk]}
                          </span>
                          {ev?.status === "running" && <span className="text-[10px] text-primary animate-pulse">{ev.label}</span>}
                        </div>
                        {ev?.detail && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{ev.detail}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-xs font-semibold text-destructive">{error}</p>
                <button onClick={() => setStep("input")} className="text-xs text-muted-foreground hover:text-foreground mt-1">← Volver a intentarlo</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RESULT step
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <AppHeader />

      {/* Top bar */}
      <div className="border-b border-border bg-card/80 backdrop-blur px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/")}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{hsData?.company_name ?? "ROI basado en asunciones"}</p>
            <p className="text-[11px] text-muted-foreground">
              {hsData?.employees ? `${hsData.employees} emp` : ""}
              {hsData?.country ? ` · ${hsData.country}` : ""}
              {roiData?.total_savings ? ` · Ahorro: €${roiData.total_savings.toLocaleString("es-ES")}/año` : ""}
              {roiData?.roi_pct > 0 ? ` · ROI ${roiData.roi_pct}%` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedId && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Guardado</span>}
          <Button variant="outline" size="sm" onClick={save} disabled={saving} className="h-8 rounded-lg text-xs gap-1.5 font-semibold">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Left: A4 preview */}
        <div className="flex-1 bg-[#DADAE4] overflow-auto">
          <div className="flex items-start justify-center p-6 min-h-full">
            {html ? (
              <iframe
                srcDoc={html}
                style={{ width: "210mm", minHeight: "297mm", display: "block", border: "none", background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", borderRadius: 2 }}
                title="Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground" style={{ width: "210mm", height: "297mm" }}>
                <Loader2 className="h-8 w-8 animate-spin opacity-40" />
                <p className="text-sm font-medium">Generando documento...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: editor panel */}
        <div className="w-72 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto divide-y divide-border">

            {/* Price */}
            <div className="px-4 py-4">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Precio Factorial</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={annualCost || (roiData?.annual_cost ? String(roiData.annual_cost) : "")}
                  onChange={e => { setAnnualCost(e.target.value); markDirty(); }}
                  placeholder={roiData?.annual_cost ? String(roiData.annual_cost) : "Auto"}
                  className="h-9 text-center font-bold text-sm tabular-nums"
                />
                <span className="text-xs text-muted-foreground shrink-0 font-medium">€/año</span>
              </div>
            </div>

            {/* Modules */}
            <div>
              <div className="px-4 py-3">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Módulos incluidos</p>
              </div>
              <div className="divide-y divide-border/60">
                {Object.entries(moduleOverrides).map(([id, ov]) => (
                  <div key={id} className={`px-4 py-2.5 transition-opacity ${!ov.include ? "opacity-35" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleModule(id)}
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors border ${ov.include ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"}`}
                      >
                        {ov.include && <Check className="h-2.5 w-2.5 text-white" />}
                      </button>
                      <span className="text-[11.5px] font-semibold text-foreground flex-1 leading-tight">{ALL_MODULES[id] ?? id}</span>
                    </div>
                    {ov.include && (
                      <div className="mt-2 pl-[26px]">
                        <Textarea
                          placeholder='Nota para Claude (ej: "ahorro = dejar de pagar Cegid"...)'
                          value={ov.note}
                          onChange={e => setNote(id, e.target.value)}
                          className="text-[10.5px] min-h-[40px] resize-none bg-muted/30 border-muted/50 leading-snug placeholder:text-muted-foreground/50"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-4 py-3">
                {showAddModule ? (
                  <div className="flex flex-wrap gap-1.5">
                    {addableModules.map(id => (
                      <button key={id} onClick={() => addModule(id)} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary transition-colors">
                        + {ALL_MODULES[id]}
                      </button>
                    ))}
                    <button onClick={() => setShowAddModule(false)} className="text-[10px] text-muted-foreground px-1 py-1 hover:text-foreground">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowAddModule(true)} className="flex items-center gap-1.5 text-[11px] font-semibold text-primary/80 hover:text-primary transition-colors">
                    <Plus className="h-3 w-3" /> Añadir módulo
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mx-4 mt-3 mb-2 rounded-xl bg-destructive/8 border border-destructive/20 px-3 py-2">
                <p className="text-[11px] font-semibold text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Bottom buttons */}
          <div className="shrink-0 p-3 border-t border-border space-y-2 bg-card/50">
            {isDirty ? (
              <Button
                onClick={regenerate}
                disabled={regenerating || includedModules.length === 0}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm gap-2"
              >
                {regenerating
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Regenerando...</>
                  : <><RefreshCw className="h-3.5 w-3.5" />Regenerar documento</>
                }
              </Button>
            ) : (
              <Button
                onClick={downloadPdf}
                disabled={!html}
                className="w-full h-10 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm gap-2"
              >
                <Download className="h-3.5 w-3.5" /> Descargar PDF
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
