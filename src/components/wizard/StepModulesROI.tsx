import { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Sparkles, Check, Plus, Search, Quote } from "lucide-react";
import { MODULE_CATALOG, CATEGORY_COLORS, buildModulePromptBlock } from "@/lib/moduleCatalog";
import { moduleLabel } from "@/lib/offeringEngine";
import { getHoursForModule, type Stakeholder } from "@/lib/moduleHours";
import type { ProspectData, ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";

const WORKER = "https://noshow.lucassiroo.workers.dev";

const AI_TOOL = {
  name: "recommend_modules",
  description: "Recommend Factorial HR modules based on deal content analysis",
  input_schema: {
    type: "object" as const,
    properties: {
      recommendations: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            module_id: { type: "string" as const, enum: MODULE_CATALOG.map(m => m.id) },
            confidence: { type: "string" as const, enum: ["strong", "possible"] },
            quote: { type: "string" as const, description: "1-2 sentence quote from the deal content in its original language that justifies why this module is relevant. Must be a real passage, not invented." },
          },
          required: ["module_id", "confidence", "quote"],
        },
      },
    },
    required: ["recommendations"],
  },
};

const SYSTEM_PROMPT = `You analyze sales conversations for Factorial HR software. Given deal content (emails, calls, notes), identify which Factorial modules would benefit this prospect.

Rules:
1. "strong" = the module or its core functionality is explicitly requested, named, or shows unmistakable buying signals (e.g. "we need a shift scheduler" -> time_planning is strong)
2. "possible" = implicit need inferred from context -- company size, industry, pain described indirectly, or related discussion (e.g. "we have 200 employees across 3 offices" -> space is possible)
3. For each module, include a 1-2 sentence quote from the deal content IN ITS ORIGINAL LANGUAGE that justifies the recommendation. This should be a real passage from the emails, calls, or notes -- enough context for the reader to understand why the module fits.
4. Do NOT hallucinate quotes. If you cannot find a verbatim passage, paraphrase the closest relevant section and prefix with "~".
5. Only recommend modules with real evidence in the content. Do not pad with speculative recommendations.

Available Factorial modules with buying signals and value propositions:
${buildModulePromptBlock()}`;

interface Props {
  data: ProspectData;
  selectedModules: string[];
  moduleSuggestions: ModuleSuggestion[];
  onSelectionChange: (modules: string[], suggestions: ModuleSuggestion[]) => void;
  roiConfig: RoiConfig;
  onRoiConfigChange: (config: RoiConfig) => void;
  seats: number;
}

function buildDealContent(data: ProspectData): string {
  const parts: string[] = [];
  for (const e of (data.airtable_emails ?? []).slice(0, 15)) {
    parts.push(`[Email ${e.date}] From: ${e.from} | ${e.subject}\n${e.body.slice(0, 500)}`);
  }
  for (const c of (data.airtable_calls ?? []).slice(0, 5)) {
    parts.push(`[Call ${c.date}] ${c.owner} (${Math.round(c.duration_seconds / 60)} min)\n${c.transcript.slice(0, 2000)}`);
  }
  for (const n of (data.hubspot_notes ?? []).slice(0, 15)) {
    parts.push(`[Note ${n.created_at}]\n${n.body.replace(/<[^>]*>/g, "").slice(0, 1000)}`);
  }
  return parts.join("\n\n");
}

function fmt(n: number): string {
  return n.toLocaleString("en", { maximumFractionDigits: 1 });
}

function fmtMoney(n: number): string {
  return "€" + Math.round(n).toLocaleString("en");
}

const STAKEHOLDER_META: Record<Stakeholder, { label: string; color: string }> = {
  employee: { label: "Employees", color: "#3B82F6" },
  hr:       { label: "HR / Finance", color: "#10B981" },
  manager:  { label: "Managers", color: "#F59E0B" },
};

export function StepModulesROI({ data, selectedModules, moduleSuggestions, onSelectionChange, roiConfig, onRoiConfigChange, seats }: Props) {
  const { headcounts, hourly_costs } = roiConfig;
  const hasContent =
    (data.airtable_emails?.length ?? 0) > 0 ||
    (data.airtable_calls?.length ?? 0) > 0 ||
    (data.hubspot_notes?.length ?? 0) > 0;

  const needsAnalysis = moduleSuggestions.length === 0 && hasContent;
  const [analyzing, setAnalyzing] = useState(needsAnalysis);
  const [addOpen, setAddOpen] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (needsAnalysis && !started.current) {
      started.current = true;
      analyze();
    }
  }, []);

  async function analyze() {
    setAnalyzing(true);
    try {
      const content = buildDealContent(data);
      if (!content.trim()) throw new Error("No deal content to analyze");

      const res = await fetch(`${WORKER}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 4096,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: `Company: ${data.company_name} | Sector: ${data.sector} | Country: ${data.country} | Employees: ${data.seats}\n\nDeal content:\n\n${content}`,
          }],
          tools: [AI_TOOL],
          tool_choice: { type: "tool", name: "recommend_modules" },
        }),
      });

      const aiData = await res.json();
      if (!res.ok) throw new Error(aiData?.error ?? `AI error ${res.status}`);
      const toolBlock = aiData.content?.find((b: any) => b.type === "tool_use");
      const recs: ModuleSuggestion[] = toolBlock?.input?.recommendations ?? [];

      const validIds = new Set(MODULE_CATALOG.map(m => m.id));
      const seen = new Set<string>();
      const valid = recs.filter(r => {
        if (!validIds.has(r.module_id) || seen.has(r.module_id)) return false;
        seen.add(r.module_id);
        return true;
      });

      const strong = valid.filter(r => r.confidence === "strong").map(r => r.module_id);
      onSelectionChange(strong, valid);
      toast.success(`${valid.length} modules identified`);
    } catch (err: any) {
      toast.error(err.message ?? "Module analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function toggle(moduleId: string) {
    const next = selectedModules.includes(moduleId)
      ? selectedModules.filter(m => m !== moduleId)
      : [...selectedModules, moduleId];
    onSelectionChange(next, moduleSuggestions);
  }

  function addModule(moduleId: string) {
    onSelectionChange(
      [...selectedModules, moduleId],
      [...moduleSuggestions, { module_id: moduleId, confidence: "possible", quote: "" }],
    );
    setAddOpen(false);
  }

  const strong = useMemo(() => moduleSuggestions.filter(s => s.confidence === "strong"), [moduleSuggestions]);
  const possible = useMemo(() => moduleSuggestions.filter(s => s.confidence === "possible"), [moduleSuggestions]);
  const availableToAdd = useMemo(() => {
    const used = new Set([...moduleSuggestions.map(s => s.module_id), ...selectedModules]);
    return MODULE_CATALOG.filter(m => !used.has(m.id));
  }, [moduleSuggestions, selectedModules]);

  // ROI savings calculations for selected modules
  const rows = useMemo(() => {
    return selectedModules.map(moduleId => {
      const catalog = MODULE_CATALOG.find(m => m.id === moduleId);
      const hours = getHoursForModule(moduleId);
      const label = catalog?.label ?? moduleLabel(moduleId);
      const color = catalog?.color ?? "#94A3B8";

      const perStakeholder = (["employee", "hr", "manager"] as Stakeholder[]).map(s => {
        const h = hours[s];
        const totalHours = h * headcounts[s];
        const totalMoney = totalHours * hourly_costs[s];
        return { stakeholder: s, hoursPerPerson: h, totalHours, totalMoney };
      });

      const monthlyHours = perStakeholder.reduce((sum, s) => sum + s.totalHours, 0);
      const monthlyMoney = perStakeholder.reduce((sum, s) => sum + s.totalMoney, 0);

      return { moduleId, label, color, perStakeholder, monthlyHours, monthlyMoney, annualMoney: monthlyMoney * 12 };
    });
  }, [selectedModules, headcounts, hourly_costs]);

  const totals = useMemo(() => {
    const monthly = rows.reduce((s, r) => s + r.monthlyMoney, 0);
    const annual = rows.reduce((s, r) => s + r.annualMoney, 0);
    const monthlyHours = rows.reduce((s, r) => s + r.monthlyHours, 0);
    return { monthly, annual, monthlyHours };
  }, [rows]);

  if (analyzing) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Module Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">Analyzing deal content to identify relevant modules...</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="border border-border rounded-lg px-4 py-4 animate-pulse" style={{ borderLeftWidth: 4, borderLeftColor: ["#3B82F6","#8B5CF6","#F59E0B","#10B981","#EC4899"][i] }}>
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Processing with Claude...</span>
        </div>
      </div>
    );
  }

  if (!hasContent && moduleSuggestions.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Module Selection</h2>
          <p className="text-sm text-muted-foreground mt-1">
            No deal content available for AI analysis. Add modules manually.
          </p>
        </div>
        <Button variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add module
        </Button>
        <AddModuleDialog open={addOpen} onOpenChange={setAddOpen} modules={availableToAdd} onAdd={addModule} />

        {/* ROI table if modules were added */}
        {selectedModules.length > 0 && <RoiTable rows={rows} totals={totals} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Module recommendations */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Modules & ROI</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedModules.length} module{selectedModules.length !== 1 ? "s" : ""} selected
          </p>
        </div>
        {hasContent && (
          <Button variant="ghost" size="sm" onClick={analyze} disabled={analyzing}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Re-analyze
          </Button>
        )}
      </div>

      {strong.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Strong matches
            <Badge variant="secondary" className="text-[10px]">{strong.length}</Badge>
          </h3>
          {strong.map(s => (
            <ModuleCard
              key={s.module_id}
              suggestion={s}
              isSelected={selectedModules.includes(s.module_id)}
              onToggle={() => toggle(s.module_id)}
            />
          ))}
        </section>
      )}

      {possible.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Possible matches
            <Badge variant="secondary" className="text-[10px]">{possible.length}</Badge>
          </h3>
          {possible.map(s => (
            <ModuleCard
              key={s.module_id}
              suggestion={s}
              isSelected={selectedModules.includes(s.module_id)}
              onToggle={() => toggle(s.module_id)}
            />
          ))}
        </section>
      )}

      <Button variant="outline" className="w-full" onClick={() => setAddOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Add module
      </Button>

      <AddModuleDialog open={addOpen} onOpenChange={setAddOpen} modules={availableToAdd} onAdd={addModule} />

      {/* ROI savings table */}
      {selectedModules.length > 0 && <RoiTable rows={rows} totals={totals} />}
    </div>
  );
}

// ── ROI Table ──

interface RoiRow {
  moduleId: string;
  label: string;
  color: string;
  perStakeholder: { stakeholder: Stakeholder; hoursPerPerson: number; totalHours: number; totalMoney: number }[];
  monthlyHours: number;
  monthlyMoney: number;
  annualMoney: number;
}

function RoiTable({ rows, totals }: { rows: RoiRow[]; totals: { monthly: number; annual: number; monthlyHours: number } }) {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time & Cost Savings</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Module</th>
                {(["employee", "hr", "manager"] as Stakeholder[]).map(s => (
                  <th key={s} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: STAKEHOLDER_META[s].color }}>
                    {STAKEHOLDER_META[s].label}
                  </th>
                ))}
                <th className="text-right px-3 py-2.5 font-semibold text-foreground">h/month</th>
                <th className="text-right px-4 py-2.5 font-semibold text-foreground">€/year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.moduleId} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="font-medium text-foreground">{row.label}</span>
                    </div>
                  </td>
                  {row.perStakeholder.map(ps => (
                    <td key={ps.stakeholder} className="text-right px-3 py-2.5 tabular-nums">
                      {ps.hoursPerPerson > 0 ? (
                        <span className="text-muted-foreground">
                          {fmt(ps.totalHours)}<span className="text-[10px] ml-0.5">h</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">&mdash;</span>
                      )}
                    </td>
                  ))}
                  <td className="text-right px-3 py-2.5 font-medium tabular-nums text-foreground">
                    {fmt(row.monthlyHours)}
                  </td>
                  <td className="text-right px-4 py-2.5 font-semibold tabular-nums text-emerald-600">
                    {fmtMoney(row.annualMoney)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/50">
                <td className="px-4 py-3 font-bold text-foreground">Total</td>
                <td colSpan={3} />
                <td className="text-right px-3 py-3 font-bold tabular-nums text-foreground">
                  {fmt(totals.monthlyHours)}
                </td>
                <td className="text-right px-4 py-3 font-bold tabular-nums text-emerald-600 text-base">
                  {fmtMoney(totals.annual)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{fmt(totals.monthlyHours)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">hours saved / month</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{fmtMoney(totals.monthly)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">saved / month</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-600">{fmtMoney(totals.annual)}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">saved / year</p>
        </div>
      </div>
    </div>
  );
}

// ── Module Card ──

function ModuleCard({ suggestion, isSelected, onToggle }: {
  suggestion: ModuleSuggestion;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const catalog = MODULE_CATALOG.find(m => m.id === suggestion.module_id);
  const label = catalog?.label ?? moduleLabel(suggestion.module_id);
  const color = catalog?.color ?? "#94A3B8";
  const hasQuote = suggestion.quote && suggestion.quote !== "Manually added";

  return (
    <button
      className={`w-full text-left rounded-lg border transition-all ${
        isSelected
          ? "bg-accent/50 border-border shadow-sm"
          : "bg-card hover:bg-muted/30 border-border/50 opacity-60"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      onClick={onToggle}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected ? "text-white" : "border-muted-foreground/30 bg-transparent"
          }`} style={isSelected ? { backgroundColor: color, borderColor: color } : undefined}>
            {isSelected && <Check className="h-3 w-3" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <span
                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {catalog?.category}
              </span>
            </div>
            {hasQuote && (
              <div className="mt-2 flex gap-2">
                <Quote className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/40" />
                <p className="text-[13px] text-muted-foreground leading-relaxed italic">
                  {suggestion.quote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Add Module Dialog ──

function AddModuleDialog({ open, onOpenChange, modules, onAdd }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: typeof MODULE_CATALOG;
  onAdd: (moduleId: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return modules;
    const q = search.toLowerCase();
    return modules.filter(m =>
      m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    );
  }, [modules, search]);

  const grouped = useMemo(() =>
    filtered.reduce<Record<string, typeof MODULE_CATALOG>>((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    }, {}),
  [filtered]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSearch(""); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Module</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-5 pr-2">
            {Object.entries(grouped).map(([category, mods]) => {
              const catColor = CATEGORY_COLORS[category] ?? "#94A3B8";
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {mods.map(m => (
                      <button
                        key={m.id}
                        className="text-left px-3 py-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 transition-all group"
                        style={{ borderLeftWidth: 3, borderLeftColor: m.color }}
                        onClick={() => onAdd(m.id)}
                      >
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{m.signals[0]}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {modules.length === 0 ? "All modules already added" : "No matches"}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
