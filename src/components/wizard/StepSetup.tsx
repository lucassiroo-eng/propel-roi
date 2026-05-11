import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2, Link as LinkIcon, Mail, Phone, FileText,
  Database, Cloud, CheckCircle2, Users, Briefcase, Shield,
  Sparkles, Check, Plus, Search, Quote, ChevronDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProspectData, HubSpotNote, ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { defaultHeadcounts, type Stakeholder } from "@/lib/moduleHours";
import { MODULE_CATALOG, CATEGORY_COLORS, buildModulePromptBlock } from "@/lib/moduleCatalog";
import { moduleLabel } from "@/lib/offeringEngine";

const WORKER = "https://noshow.lucassiroo.workers.dev";
const SEATS_MIN = 10;
const SEATS_MAX = 5000;

function sliderToSeats(s: number): number {
  if (s <= 0) return SEATS_MIN;
  if (s >= 100) return SEATS_MAX;
  const v = SEATS_MIN * Math.pow(SEATS_MAX / SEATS_MIN, s / 100);
  if (v < 50) return Math.round(v);
  if (v < 200) return Math.round(v / 5) * 5;
  if (v < 500) return Math.round(v / 10) * 10;
  return Math.round(v / 50) * 50;
}
function seatsToSlider(seats: number): number {
  if (seats <= SEATS_MIN) return 0;
  if (seats >= SEATS_MAX) return 100;
  return 100 * Math.log(seats / SEATS_MIN) / Math.log(SEATS_MAX / SEATS_MIN);
}

function mapCountry(raw: string): "ES" | "FR" | null {
  const lower = (raw ?? "").toLowerCase().trim();
  if (["es", "spain", "españa", "espagne"].includes(lower)) return "ES";
  if (["fr", "france", "francia"].includes(lower)) return "FR";
  return null;
}

function mapIndustry(raw: string): string {
  const lower = (raw ?? "").toLowerCase();
  const map: Record<string, string> = {
    technology: "Software & IT Services", software: "Software & IT Services",
    retail: "Retailing", healthcare: "Health Care Equipment & Services",
    education: "Education", construction: "Construction & Engineering",
    hospitality: "Hospitality", food: "Food, Beverage & Tobacco",
    energy: "Energy", transportation: "Transportation",
    media: "Media & Entertainment", banking: "Banking & Insurance",
    insurance: "Banking & Insurance", legal: "Legal Services",
  };
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return "";
}

const STAKEHOLDER_META: Record<Stakeholder, { labelKey: string; sublabelKey: string; icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { labelKey: "stakeholder.employee",    sublabelKey: "stakeholder.employee_sub", icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)" },
  hr:       { labelKey: "stakeholder.hr", sublabelKey: "stakeholder.hr_sub",  icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.2)" },
  manager:  { labelKey: "stakeholder.manager",     sublabelKey: "stakeholder.manager_sub", icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)" },
};

// ── AI module analysis ──
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
            quote: { type: "string" as const, description: "1-2 sentence quote from the deal content in its original language. Must be a real passage, not invented." },
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
1. "strong" = explicitly requested or unmistakable buying signals
2. "possible" = implicit need inferred from context
3. Include a 1-2 sentence quote IN ITS ORIGINAL LANGUAGE from the content
4. Do NOT hallucinate quotes. Prefix paraphrases with "~"
5. Only recommend modules with real evidence

Available modules:
${buildModulePromptBlock()}`;

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
  const [fetchPhase, setFetchPhase] = useState<"idle" | "airtable" | "hubspot" | "done">("idle");
  const { headcounts, hourly_costs } = roiConfig;

  // Module analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const analysisStarted = useRef(false);
  const [contentPopup, setContentPopup] = useState<"emails" | "calls" | "notes" | null>(null);

  const hasContent =
    (data.airtable_emails?.length ?? 0) > 0 ||
    (data.airtable_calls?.length ?? 0) > 0 ||
    (data.hubspot_notes?.length ?? 0) > 0;

  const needsAnalysis = moduleSuggestions.length === 0 && hasContent;

  // Init headcounts on first render if default
  useEffect(() => {
    const isDefault = headcounts.employee === 40 && headcounts.hr === 3 && headcounts.manager === 8;
    const isEmpty = headcounts.employee + headcounts.hr + headcounts.manager === 0;
    if (isEmpty || isDefault) {
      onRoiConfigChange({ ...roiConfig, headcounts: defaultHeadcounts(seats) });
    }
  }, []);

  // Auto-trigger AI analysis when content becomes available
  useEffect(() => {
    if (needsAnalysis && !analysisStarted.current && !analyzing) {
      analysisStarted.current = true;
      runAnalysis();
    }
  }, [needsAnalysis]);

  function setHeadcount(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, headcounts: { ...headcounts, [key]: Math.max(0, value) } });
  }
  function setHourlyCost(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, hourly_costs: { ...hourly_costs, [key]: Math.max(0, value) } });
  }
  function handleSeatsChange(newSeats: number) {
    onChange({ seats: newSeats });
    onRoiConfigChange({ ...roiConfig, headcounts: defaultHeadcounts(newSeats) });
  }

  // ── Deal fetch ──
  async function handleFetch() {
    const url = data.hubspot_deal_url?.trim();
    if (!url) { toast.error(t("prospect.hubspot_paste_first")); return; }
    setFetching(true);
    setFetchPhase("airtable");
    try {
      let found = false;
      try {
        const atRes = await fetch(`${WORKER}/airtable`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deal_url: url }),
        });
        const atResult = atRes.ok ? await atRes.json() : null;
        if (atResult && !atResult.error) {
          const emails = atResult.emails ?? [];
          const calls = atResult.calls ?? [];
          if (emails.length > 0 || calls.length > 0) {
            found = true;
            const updates: Partial<ProspectData> = { fetch_source: "airtable", airtable_emails: emails, airtable_calls: calls, airtable_stats: { email_count: emails.length, call_count: calls.length } };
            if (atResult.deal?.company_name) updates.company_name = atResult.deal.company_name;
            if (atResult.deal?.name) updates.deal_name = atResult.deal.name;
            if (atResult.deal?.contacts_info) {
              const ci = atResult.deal.contacts_info;
              const nameMatch = ci.match(/([A-ZÀ-ÿ][a-zà-ÿ]+ [A-ZÀ-ÿ][a-zà-ÿ]+)/);
              const emailMatch = ci.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
              if (nameMatch) updates.contact_name = nameMatch[1];
              if (emailMatch) updates.contact_email = emailMatch[0];
            }
            onChange(updates);
            toast.success(t("toast.airtable_success", { emails: emails.length, calls: calls.length }));
          }
        }
      } catch { /* fallback */ }

      if (!found) {
        setFetchPhase("hubspot");
        const hsRes = await fetch(`${WORKER}/hubspot`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deal_url: url }),
        });
        const hs = await hsRes.json();
        if (!hsRes.ok || hs?.error) throw new Error(hs?.error ?? "HubSpot fetch failed");

        const updates: Partial<ProspectData> = { fetch_source: "hubspot" };
        if (hs.deal_name) updates.deal_name = hs.deal_name;
        if (hs.company_name) updates.company_name = hs.company_name;
        if (hs.contact_name) updates.contact_name = hs.contact_name;
        if (hs.contact_email) updates.contact_email = hs.contact_email;
        const mappedCountry = mapCountry(hs.country ?? "");
        if (mappedCountry) updates.country = mappedCountry;
        const mappedIndustry = mapIndustry(hs.industry ?? "");
        if (mappedIndustry) updates.sector = mappedIndustry;
        const empCount = parseInt(hs.employees);
        if (empCount > 0) {
          const clamped = Math.min(Math.max(empCount, SEATS_MIN), SEATS_MAX);
          updates.seats = clamped;
        }
        const notes: HubSpotNote[] = hs.notes ?? [];
        if (notes.length > 0) updates.hubspot_notes = notes;
        onChange(updates);

        if (empCount > 0) {
          onRoiConfigChange({ ...roiConfig, headcounts: defaultHeadcounts(Math.min(Math.max(empCount, SEATS_MIN), SEATS_MAX)) });
        }

        const parts = [];
        if (notes.length) parts.push(`${notes.length} notes`);
        toast.success(`HubSpot: ${hs.company_name ?? "Deal found"}${parts.length ? ` · ${parts.join(", ")}` : ""}`);
      }
      setFetchPhase("done");
    } catch (err: any) {
      setFetchPhase("idle");
      toast.error(err.message ?? t("toast.fetch_failed"));
    } finally {
      setFetching(false);
    }
  }

  // ── AI module analysis ──
  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const content = buildDealContent(data);
      if (!content.trim()) throw new Error("No deal content to analyze");

      const res = await fetch(`${WORKER}/ai`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-6", max_tokens: 4096, temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Company: ${data.company_name} | Sector: ${data.sector} | Country: ${data.country} | Employees: ${data.seats}\n\nDeal content:\n\n${content}` }],
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
      toast.success(t("toast.modules_identified", { count: valid.length }));
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

  const emails = data.airtable_emails ?? [];
  const calls = data.airtable_calls ?? [];
  const notes = data.hubspot_notes ?? [];
  const source = data.fetch_source;
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
                {fetchPhase === "airtable" ? <Database className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                {fetchPhase === "airtable" ? t("setup.searching_airtable") : t("setup.fetching_hubspot")}
              </Badge>
            )}
            {source && !fetching && (
              <>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  {source === "airtable" ? <Database className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {source === "airtable" ? "Airtable" : "HubSpot"}
                </Badge>
                {emails.length > 0 && (
                  <button onClick={() => setContentPopup("emails")}>
                    <Badge variant="outline" className="gap-1 text-xs hover:bg-accent cursor-pointer transition-colors">
                      <Mail className="h-3 w-3" /> {emails.length} {t("content.emails").toLowerCase()}
                    </Badge>
                  </button>
                )}
                {calls.length > 0 && (
                  <button onClick={() => setContentPopup("calls")}>
                    <Badge variant="outline" className="gap-1 text-xs hover:bg-accent cursor-pointer transition-colors">
                      <Phone className="h-3 w-3" /> {calls.length} {t("content.calls").toLowerCase()}
                    </Badge>
                  </button>
                )}
                {notes.length > 0 && (
                  <button onClick={() => setContentPopup("notes")}>
                    <Badge variant="outline" className="gap-1 text-xs hover:bg-accent cursor-pointer transition-colors">
                      <FileText className="h-3 w-3" /> {notes.length} {t("content.notes").toLowerCase()}
                    </Badge>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Deal info card */}
        {data.deal_name && (
          <div className="rounded-lg bg-white/60 border border-border/50 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{data.company_name || data.deal_name}</p>
            {data.company_name && data.deal_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.deal_name}</p>
            )}
            {data.contact_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.contact_name}{data.contact_email ? ` — ${data.contact_email}` : ""}</p>
            )}
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
        emails={emails}
        calls={calls}
        notes={notes}
        onClose={() => setContentPopup(null)}
      />

      {/* ═══════════════════════════════════════════════════ */}
      {/* BLOCK (ii): Employees + Stakeholder Breakdown      */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-foreground">{t("setup.employees")}</p>

        {/* Slider + input */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-6 text-right">{SEATS_MIN}</span>
          <Slider
            min={0} max={100} step={1}
            value={[seatsToSlider(data.seats)]}
            onValueChange={([v]) => handleSeatsChange(sliderToSeats(v))}
            className="flex-1"
          />
          <Input
            type="number" min={1} max={10000}
            className="w-20 h-9 text-sm text-right font-semibold tabular-nums"
            value={data.seats}
            onChange={e => handleSeatsChange(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
          />
        </div>

        {/* Stakeholder cards */}
        <p className="text-xs font-medium text-muted-foreground mt-2">{t("setup.team_breakdown")}</p>
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
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{t(meta.labelKey)}</p>
                    <p className="text-[10px] text-muted-foreground">{t(meta.sublabelKey)}</p>
                  </div>
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
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{totalPeople}</strong> {t("stakeholder.people_total")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("stakeholder.weighted_avg")} <strong className="text-foreground">
              €{totalPeople > 0 ? Math.round((headcounts.employee * hourly_costs.employee + headcounts.hr * hourly_costs.hr + headcounts.manager * hourly_costs.manager) / totalPeople) : 0}
            </strong>{t("stakeholder.per_hour")}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BLOCK (iii): Module Recommendations                */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="space-y-4">
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

// ── Content Dialog (emails, calls, notes) ──
function ContentDialog({ type, emails, calls, notes, onClose }: {
  type: "emails" | "calls" | "notes" | null;
  emails: ProspectData["airtable_emails"];
  calls: ProspectData["airtable_calls"];
  notes: ProspectData["hubspot_notes"];
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { t } = useTranslation();

  const title = type === "emails" ? t("content.emails") : type === "calls" ? t("content.calls") : t("content.notes");
  const items = type === "emails" ? (emails ?? []).map((e, i) => ({
    id: i,
    header: `${e.date} — ${e.subject}`,
    sub: `From: ${e.from}${e.direction ? ` (${e.direction})` : ""}`,
    body: e.body,
  })) : type === "calls" ? (calls ?? []).map((c, i) => ({
    id: i,
    header: `${c.date} — ${c.owner}`,
    sub: `${Math.round(c.duration_seconds / 60)} min`,
    body: c.transcript,
  })) : type === "notes" ? (notes ?? []).map((n, i) => ({
    id: i,
    header: n.created_at,
    sub: "",
    body: n.body.replace(/<[^>]*>/g, ""),
  })) : [];

  return (
    <Dialog open={!!type} onOpenChange={(v) => { if (!v) { onClose(); setExpanded(null); } }}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "emails" ? <Mail className="h-4 w-4" /> : type === "calls" ? <Phone className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {title} ({items.length})
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="border border-border/50 rounded-lg overflow-hidden">
                <button
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors flex items-center justify-between"
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{item.header}</p>
                    {item.sub && <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>}
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2 transition-transform ${expanded === item.id ? "rotate-180" : ""}`} />
                </button>
                {expanded === item.id && (
                  <div className="px-3 pb-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mt-2 max-h-60 overflow-y-auto">
                      {item.body.slice(0, 2000)}
                      {item.body.length > 2000 && "..."}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && (
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
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{m.signals[0]}</p>
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
