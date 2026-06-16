import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, Download, Zap, FlaskConical } from "lucide-react";

interface StepEvent {
  step: string;
  status: "running" | "done" | "error";
  label: string;
  detail?: string;
}

const STEP_ORDER = ["hubspot", "modjo", "transcripts", "claude", "roi", "html"];
const STEP_LABELS: Record<string, string> = {
  hubspot: "HubSpot",
  modjo: "Modjo",
  transcripts: "Transcripts",
  claude: "Claude IA",
  roi: "Cálculo ROI",
  html: "Documento",
};

function StepDot({ status }: { status?: "running" | "done" | "error" | "pending" }) {
  if (status === "done") {
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
        <Check className="h-3 w-3 text-white" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center shrink-0">
        <X className="h-3 w-3 text-white" />
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-white" />
      </div>
    );
  }
  return <div className="w-6 h-6 rounded-full bg-muted/50 border-2 border-muted shrink-0" />;
}

export function MiniRoiTestSpace() {
  const [url, setUrl] = useState("");
  const [annualCost, setAnnualCost] = useState<string>("");
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stepMap = Object.fromEntries(steps.map(s => [s.step, s]));

  async function run() {
    if (!url.trim()) return;
    setSteps([]);
    setHtml(null);
    setError(null);
    setRunning(true);

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/mini-roi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          deal_url: url.trim(),
          language: "es",
          annual_cost_override: annualCost ? Number(annualCost) : undefined,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Error ${res.status}: ${err}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.step === "result") {
              setHtml(event.html ?? null);
            } else if (event.step === "error") {
              setError(event.detail ?? "Error desconocido");
            } else {
              setSteps(prev => {
                const idx = prev.findIndex(s => s.step === event.step);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = event;
                  return next;
                }
                return [...prev, event];
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message ?? "Error de red");
    } finally {
      setRunning(false);
    }
  }

  function downloadHtml() {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mini-roi-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const hasSteps = steps.length > 0;
  const isComplete = !running && html;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Mini ROI</h3>
            <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wide">Beta</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">ROI automático desde HubSpot + Modjo + Claude</p>
        </div>
      </div>

      {/* Input */}
      <div className="px-6 py-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HubSpot Deal URL</Label>
          <Input
            placeholder="https://app-eu1.hubspot.com/contacts/4960096/record/0-3/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={running}
            className="font-mono text-xs h-10"
            onKeyDown={e => e.key === "Enter" && run()}
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Precio Factorial <span className="font-normal normal-case">(opcional, auto si no)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Auto"
                value={annualCost}
                onChange={e => setAnnualCost(e.target.value)}
                disabled={running}
                className="h-10 w-36 text-center font-mono text-sm"
              />
              <span className="text-sm text-muted-foreground">€/año</span>
            </div>
          </div>
          <Button
            onClick={run}
            disabled={running || !url.trim()}
            className="h-10 px-5 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm shrink-0"
          >
            {running ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generando...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" />Generar Mini ROI</>
            )}
          </Button>
        </div>
      </div>

      {/* Pipeline */}
      {(hasSteps || running) && (
        <div className="px-6 pb-5">
          <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pipeline</p>
            </div>
            <div className="divide-y divide-border">
              {STEP_ORDER.map(stepKey => {
                const ev = stepMap[stepKey];
                const status = ev?.status ?? (running && steps.length > 0 && !stepMap[stepKey] ? "pending" : "pending");
                return (
                  <div key={stepKey} className="flex items-start gap-3 px-4 py-3">
                    <StepDot status={ev?.status ?? "pending"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold ${ev?.status === "done" ? "text-foreground" : ev?.status === "running" ? "text-primary" : "text-muted-foreground/50"}`}>
                          {STEP_LABELS[stepKey]}
                        </span>
                        {ev?.status === "running" && (
                          <span className="text-[10px] text-primary animate-pulse">{ev.label}</span>
                        )}
                      </div>
                      {ev?.detail && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{ev.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-xs font-semibold text-destructive">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {isComplete && html && (
        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documento generado</p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadHtml}
              className="h-8 rounded-lg text-xs font-semibold gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar HTML
            </Button>
          </div>
          {/* A4 ratio preview: 210mm × 297mm = 1:1.414. At ~700px wide → ~990px tall */}
          <div className="rounded-xl border border-border overflow-auto bg-[#E4E4EC]" style={{ maxHeight: 900 }}>
            <iframe
              srcDoc={html}
              style={{ width: "210mm", minHeight: "297mm", display: "block", border: "none" }}
              title="Mini ROI Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
