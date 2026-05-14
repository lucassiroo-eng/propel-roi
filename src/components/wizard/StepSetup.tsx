import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2, Link as LinkIcon, Mail, Phone, FileText,
  Database, CheckCircle2, Users, Briefcase, Shield,
  Sparkles, Check, Plus, Search, Quote, ChevronDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { ProspectData, ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { type Stakeholder } from "@/lib/moduleHours";
import { MODULE_CATALOG, CATEGORY_COLORS, buildModulePromptBlock } from "@/lib/moduleCatalog";
import { moduleLabel } from "@/lib/offeringEngine";
import { extractDealIdFromUrl, fetchDealByHubspotId } from "@/lib/atlasClient";


const STAKEHOLDER_META: Record<Stakeholder, { labelKey: string; sublabelKey: string; icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { labelKey: "stakeholder.employee",    sublabelKey: "stakeholder.employee_sub", icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)" },
  hr:       { labelKey: "stakeholder.hr", sublabelKey: "stakeholder.hr_sub",  icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.2)" },
  manager:  { labelKey: "stakeholder.manager",     sublabelKey: "stakeholder.manager_sub", icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)" },
};

// Module reference block sent to the unified analysis edge function
const MODULE_REF_BLOCK = buildModulePromptBlock();

function buildDealContent(data: ProspectData): string {
  const sections: string[] = [];

  if (data.deal_context) {
    sections.push(data.deal_context.slice(0, 6000));
  }

  if (data.company_context) {
    sections.push("=== COMPANY CONTEXT ===\n" + data.company_context.slice(0, 3000));
  }

  const notes = (data.hubspot_notes ?? []).slice(0, 3);
  if (notes.length > 0) {
    sections.push("=== NOTES ===");
    for (const n of notes) {
      sections.push(`[${n.created_at}]\n${n.body.replace(/<[^>]*>/g, "").slice(0, 400)}`);
    }
  }

  return sections.join("\n\n");
}

interface Props {
  data: ProspectData;
  roiConfig: RoiConfig;
  onChange: (d: Partial<ProspectData>) => void;
  onRoiConfigChange: (config: RoiConfig) => void;
  seats: number;
  selectedModules: string[];
  moduleSuggestions: ModuleSuggestion[];
  onSelectionChange: (modules: string[], suggestions: ModuleSuggestion[]) => void;
}

export function StepSetup({ data, roiConfig, onChange, onRoiConfigChange, seats, selectedModules, moduleSuggestions, onSelectionChange }: Props) {
  const { t } = useTranslation();
  const [fetching, setFetching] = useState(false);
  const [fetchPhase, setFetchPhase] = useState<"idle" | "atlas" | "done">("idle");
  const { headcounts, hourly_costs } = roiConfig;

  // Module analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const analysisStarted = useRef(false);
  const [contentPopup, setContentPopup] = useState<"notes" | null>(null);

  const hasContent =
    !!data.deal_context ||
    (data.hubspot_notes?.length ?? 0) > 0;

  const needsAnalysis = moduleSuggestions.length === 0 && hasContent;
  const contentFingerprint = (data.deal_context?.length ?? 0) + (data.hubspot_notes?.length ?? 0);

  // Sync seats from headcount sum
  useEffect(() => {
    const total = headcounts.employee + headcounts.hr + headcounts.manager;
    if (total > 0 && total !== data.seats) {
      onChange({ seats: total });
    }
  }, [headcounts.employee, headcounts.hr, headcounts.manager]);

  // Auto-trigger AI analysis when content becomes available
  useEffect(() => {
    if (needsAnalysis && !analyzing) {
      analysisStarted.current = true;
      runAnalysis();
    }
  }, [contentFingerprint]);

  function setHeadcount(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, headcounts: { ...headcounts, [key]: Math.max(0, value) } });
  }
  function setHourlyCost(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, hourly_costs: { ...hourly_costs, [key]: Math.max(0, value) } });
  }

  // ── Deal fetch: Supabase deals table only ──
  async function handleFetch() {
    const url = data.hubspot_deal_url?.trim();
    if (!url) { toast.error(t("prospect.hubspot_paste_first")); return; }
    const dealId = extractDealIdFromUrl(url);
    if (!dealId) { toast.error("Could not extract deal ID from URL"); return; }

    setFetching(true);
    setFetchPhase("atlas");

    try {
      const deal = await fetchDealByHubspotId(dealId);
      if (!deal) { toast.error(t("toast.fetch_failed")); setFetchPhase("idle"); return; }

      const updates: Partial<ProspectData> = { fetch_source: "atlas" };
      if (deal.deal_name) updates.deal_name = deal.deal_name;
      if (deal.deal_context) updates.deal_context = deal.deal_context;
      updates.atlas_stats = {
        notes: deal.numero_de_notas ?? 0,
        emails: deal.numero_de_emails ?? 0,
        calls: deal.numero_de_calls ?? 0,
      };
      if (deal.contacts_info) {
        const nameMatch = deal.contacts_info.match(/([A-ZÀ-ÿ][a-zà-ÿ]+ [A-ZÀ-ÿ][a-zà-ÿ]+)/);
        const emailMatch = deal.contacts_info.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
        if (nameMatch) updates.contact_name = nameMatch[1];
        if (emailMatch) updates.contact_email = emailMatch[0];
      }

      onChange(updates);
      setFetchPhase("done");
      toast.success(`Deal: ${deal.deal_name ?? dealId}`);
    } catch (err: any) {
      setFetchPhase("idle");
      toast.error(err.message ?? t("toast.fetch_failed"));
    } finally {
      setFetching(false);
    }
  }

  // ── Unified AI analysis (single call → modules + pains) ──
  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const content = buildDealContent(data);
      if (!content.trim()) throw new Error("No deal content to analyze");

      const { data: result, error } = await supabase.functions.invoke("ai-unified-analysis", {
        body: {
          content,
          country: data.country,
          sector: data.sector,
          seats: data.seats,
          modules_ref: MODULE_REF_BLOCK,
        },
      });
      if (error) throw error;

      const moduleSugs: ModuleSuggestion[] = (result?.modules ?? [])
        .filter((m: any) => {
          const validIds = new Set(MODULE_CATALOG.map(c => c.id));
          return validIds.has(m.module_id);
        })
        .map((m: any) => ({
          module_id: m.module_id,
          confidence: m.confidence as "strong" | "possible",
          quote: m.quote || "",
        }));

      const seen = new Set<string>();
      const deduped = moduleSugs.filter(s => {
        if (seen.has(s.module_id)) return false;
        seen.add(s.module_id);
        return true;
      });

      const strongIds = deduped.filter(r => r.confidence === "strong").map(r => r.module_id);
      onSelectionChange(strongIds, deduped);
      toast.success(t("toast.modules_identified", { count: deduped.length }));
    } catch (err: any) {
      toast.error(err.message ?? t("toast.analysis_failed"));
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleModule(moduleId: string) {
    const next = selectedModules.includes(moduleId)
      ? selectedModules.filter(m => m !== moduleId)
      : [...selectedModules, moduleId];
    onSelectionChange(next, moduleSuggestions);
  }

  function addModule(moduleId: string) {
    onSelectionChange(
      [...selectedModules, moduleId],
      [...moduleSuggestions, { module_id: moduleId, confidence: "possible" as const, quote: "" }],
    );
    setAddOpen(false);
  }

  const strong = useMemo(() => moduleSuggestions.filter(s => s.confidence === "strong"), [moduleSuggestions]);
  const possible = useMemo(() => moduleSuggestions.filter(s => s.confidence === "possible"), [moduleSuggestions]);
  const availableToAdd = useMemo(() => {
    const used = new Set([...moduleSuggestions.map(s => s.module_id), ...selectedModules]);
    return MODULE_CATALOG.filter(m => !used.has(m.id));
  }, [moduleSuggestions, selectedModules]);

  const notes = data.hubspot_notes ?? [];
  const source = data.fetch_source;
  const stats = data.atlas_stats;
  const totalPeople = headcounts.employee + headcounts.hr + headcounts.manager;

  return (
    <div className="space-y-8">
      {/* CSS for module slide-in animation */}
      <style>{`
        @keyframes moduleSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BLOCK (i): Deal Import + Provenance + Content      */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          {t("setup.import_deal")}
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="https://app.hubspot.com/contacts/.../deal/..."
            value={data.hubspot_deal_url}
            onChange={e => onChange({ hubspot_deal_url: e.target.value })}
            className="flex-1"
          />
          <Button variant="secondary" onClick={handleFetch} disabled={fetching || !data.hubspot_deal_url}>
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("setup.fetch")}
          </Button>
        </div>

        {/* Status / source badges */}
        {(source || fetching) && (
          <div className="flex gap-2 flex-wrap items-center">
            {fetching && (
              <Badge variant="outline" className="gap-1.5 text-xs animate-pulse">
                <Database className="h-3 w-3" />
                Searching deals...
              </Badge>
            )}
            {source && !fetching && (
              <>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <Database className="h-3 w-3" />
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Deals
                </Badge>
                {stats && stats.emails > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Mail className="h-3 w-3" /> {stats.emails} emails
                  </Badge>
                )}
                {stats && stats.calls > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Phone className="h-3 w-3" /> {stats.calls} calls
                  </Badge>
                )}
                {stats && stats.notes > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <FileText className="h-3 w-3" /> {stats.notes} notes
                  </Badge>
                )}
                {notes.length > 0 && (
                  <button onClick={() => setContentPopup("notes")}>
                    <Badge variant="outline" className="gap-1 text-xs hover:bg-accent cursor-pointer transition-colors">
                      <FileText className="h-3 w-3" /> {notes.length} HubSpot notes
                    </Badge>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Deal info card */}
        {data.deal_name && (
          <div className="rounded-lg bg-white/60 border border-border/50 px-4 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{data.company_name || data.deal_name}</p>
              {data.company_name && data.deal_name && (
                <p className="text-xs text-muted-foreground mt-0.5">{data.deal_name}</p>
              )}
              {data.contact_name && (
                <p className="text-xs text-muted-foreground mt-0.5">{data.contact_name}{data.contact_email ? ` — ${data.contact_email}` : ""}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {data.seats > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-sm font-semibold tabular-nums">{data.seats}</span>
                </div>
              )}
              {data.hubspot_deal_url && (
                <a
                  href={data.hubspot_deal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img src="/hubspot-logo.png" alt="HubSpot" className="h-6 w-6" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Manual company name if no deal */}
        {!data.deal_name && (
          <div className="space-y-1.5">
            <Label className="text-xs">{t("setup.company_name_label")}</Label>
            <Input
              placeholder={t("prospect.company_placeholder")}
              value={data.company_name}
              onChange={e => onChange({ company_name: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Content popups */}
      <ContentDialog
        type={contentPopup}
        notes={notes}
        dealContext={data.deal_context}
        onClose={() => setContentPopup(null)}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* BLOCK (ii): Stakeholder Breakdown                  */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">{t("setup.team_breakdown")}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["employee", "hr", "manager"] as Stakeholder[]).map(key => {
            const meta = STAKEHOLDER_META[key];
            const Icon = meta.icon;
            return (
              <div
                key={key}
                className="rounded-xl p-4 space-y-4 transition-shadow hover:shadow-sm"
                style={{ backgroundColor: meta.bg, border: `1.5px solid ${meta.border}` }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.color }}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{t(meta.labelKey)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("stakeholder.people")}</label>
                    <Input
                      type="number" min={0}
                      className="h-10 text-center text-lg font-bold tabular-nums bg-white/80"
                      value={headcounts[key]}
                      onChange={e => setHeadcount(key, parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("stakeholder.eur_hour")}</label>
                    <Input
                      type="number" min={0} step={5}
                      className="h-10 text-center text-lg font-bold tabular-nums bg-white/80"
                      value={hourly_costs[key]}
                      onChange={e => setHourlyCost(key, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Extra variables */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border px-4 py-3 space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("setup.onboardings_per_year")}</label>
            <Input
              type="number" min={0}
              className="h-9 text-center text-base font-bold tabular-nums"
              placeholder="0"
              value={roiConfig.onboardings_per_year || ""}
              onChange={e => onRoiConfigChange({ ...roiConfig, onboardings_per_year: Math.max(0, parseInt(e.target.value) || 0) })}
            />
          </div>
          {selectedModules.includes("expenses") && (
            <div className="rounded-lg border border-border px-4 py-3 space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("setup.expense_submitters")}</label>
              <Input
                type="number" min={0}
                className="h-9 text-center text-base font-bold tabular-nums"
                placeholder="0"
                value={roiConfig.expense_submitters || ""}
                onChange={e => onRoiConfigChange({ ...roiConfig, expense_submitters: Math.max(0, parseInt(e.target.value) || 0) })}
              />
              <p className="text-[10px] text-muted-foreground">{t("setup.expense_submitters_hint")}</p>
            </div>
          )}
        </div>

        {totalPeople === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{t("setup.fill_team")}</p>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BLOCK (iii): Module Recommendations                */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("setup.recommended_modules")}
              {selectedModules.length > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
                  {t("setup.selected_count", { count: selectedModules.length })}
                </span>
              )}
            </p>
            {!hasContent && moduleSuggestions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{t("setup.no_content_hint")}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasContent && (
              <Button variant="ghost" size="sm" onClick={() => { analysisStarted.current = false; runAnalysis(); }} disabled={analyzing} className="h-7 text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> {t("setup.reanalyze")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="h-7 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> {t("setup.add")}
            </Button>
          </div>
        </div>

        {/* Analyzing skeleton */}
        {analyzing && (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="border border-border rounded-lg px-4 py-3 animate-pulse" style={{ borderLeftWidth: 4, borderLeftColor: ["#3B82F6","#10B981","#F59E0B","#E05C75"][i] }}>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">{t("setup.analyzing")}</span>
            </div>
          </div>
        )}

        {/* Module cards — strong matches */}
        {!analyzing && strong.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t("setup.strong_matches")}
              <Badge variant="secondary" className="text-[10px]">{strong.length}</Badge>
            </h3>
            {strong.map((s, i) => (
              <div key={s.module_id} style={{ animation: "moduleSlideIn 0.4s ease-out forwards", animationDelay: `${i * 80}ms`, opacity: 0 }}>
                <ModuleCard
                  suggestion={s}
                  isSelected={selectedModules.includes(s.module_id)}
                  onToggle={() => toggleModule(s.module_id)}
                />
              </div>
            ))}
          </section>
        )}

        {/* Possible matches */}
        {!analyzing && possible.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t("setup.possible_matches")}
              <Badge variant="secondary" className="text-[10px]">{possible.length}</Badge>
            </h3>
            {possible.map((s, i) => (
              <div key={s.module_id} style={{ animation: "moduleSlideIn 0.4s ease-out forwards", animationDelay: `${(strong.length + i) * 80}ms`, opacity: 0 }}>
                <ModuleCard
                  suggestion={s}
                  isSelected={selectedModules.includes(s.module_id)}
                  onToggle={() => toggleModule(s.module_id)}
                />
              </div>
            ))}
          </section>
        )}

        {/* Manually added modules (no suggestion) */}
        {!analyzing && selectedModules.filter(m => !moduleSuggestions.find(s => s.module_id === m)).length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">{t("setup.manually_added")}</h3>
            {selectedModules.filter(m => !moduleSuggestions.find(s => s.module_id === m)).map(modId => {
              const catalog = MODULE_CATALOG.find(c => c.id === modId);
              return (
                <div key={modId} className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5" style={{ borderLeftWidth: 4, borderLeftColor: catalog?.color ?? "#94A3B8" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{catalog?.label ?? moduleLabel(modId)}</span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: catalog?.color ?? "#94A3B8" }}>{catalog?.category}</span>
                  </div>
                  <button onClick={() => toggleModule(modId)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <span className="text-xs">{t("setup.remove")}</span>
                  </button>
                </div>
              );
            })}
          </section>
        )}

        <AddModuleDialog open={addOpen} onOpenChange={setAddOpen} modules={availableToAdd} onAdd={addModule} />

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
        isSelected ? "bg-accent/50 border-border shadow-sm" : "bg-card hover:bg-muted/30 border-border/50 opacity-60"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      onClick={onToggle}
    >
      <div className="px-4 py-2.5">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected ? "text-white" : "border-muted-foreground/30 bg-transparent"
          }`} style={isSelected ? { backgroundColor: color, borderColor: color } : undefined}>
            {isSelected && <Check className="h-3 w-3" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white" style={{ backgroundColor: color }}>
                {catalog?.category}
              </span>
            </div>
            {hasQuote && (
              <div className="mt-1.5 flex gap-2">
                <Quote className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/40" />
                <p className="text-[12px] text-muted-foreground leading-relaxed italic">{suggestion.quote}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Content Dialog (notes / deal context) ──
function ContentDialog({ type, notes, dealContext, onClose }: {
  type: "notes" | null;
  notes: ProspectData["hubspot_notes"];
  dealContext?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!type} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("content.notes")}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-3">
            {dealContext && (
              <div className="border border-border/50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Deal Context</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {dealContext.slice(0, 4000)}
                  {dealContext.length > 4000 && "..."}
                </p>
              </div>
            )}
            {(notes ?? []).map((n, i) => (
              <div key={i} className="border border-border/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">{n.created_at}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {n.body.replace(/<[^>]*>/g, "").slice(0, 1000)}
                </p>
              </div>
            ))}
            {!dealContext && (notes ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">{t("setup.no_items")}</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
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
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    if (!search.trim()) return modules;
    const q = search.toLowerCase();
    return modules.filter(m => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
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
          <DialogTitle>{t("setup.add_module")}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("setup.search_modules")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
                      <button key={m.id} className="text-left px-3 py-2.5 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 transition-all group" style={{ borderLeftWidth: 3, borderLeftColor: m.color }} onClick={() => onAdd(m.id)}>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{m.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{modules.length === 0 ? t("setup.all_added") : t("setup.no_matches")}</p>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
