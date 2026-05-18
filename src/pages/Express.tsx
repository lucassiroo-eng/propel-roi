import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Download,
  FileText, Loader2, Search, Send, Users, Shield,
  Briefcase, X, Zap, ChevronRight, ChevronDown, Package,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  extractDealIdFromUrl, fetchDealByHubspotId, fetchAtlasCompany,
} from "@/lib/atlasClient";
import {
  MODULE_CATALOG, CATEGORY_COLORS, buildModulePromptBlock,
} from "@/lib/moduleCatalog";
import {
  moduleLabel, parseModulesFromBundle, getBundlePepm, type BundleRow,
} from "@/lib/offeringEngine";
import {
  getEffectiveHours, getCountForEntry, MODULE_HOURS,
  type Stakeholder, type RoiMultipliers,
} from "@/lib/moduleHours";
import {
  buildRoiSlideData, generateRoiSlidePdf, generateMultiSlidePdf,
  type RoiSlideInput,
} from "@/lib/generateRoiSlide";
import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";

const STEPS = ["Importar", "Módulos", "Configurar", "Resultado"];
const MODULE_REF = buildModulePromptBlock();

const STAKE_META: Record<Stakeholder, { label: string; icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { label: "Empleados",  icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.05)",  border: "rgba(59,130,246,0.15)" },
  hr:       { label: "FTEs HR",    icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.05)",  border: "rgba(16,185,129,0.15)" },
  manager:  { label: "Managers",   icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.05)",  border: "rgba(245,158,11,0.15)" },
};

interface Msg { text: string; done: boolean }

export default function Express() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState(0);

  // Step 0
  const [hubspotUrl, setHubspotUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [dealName, setDealName] = useState("");
  const [dealContext, setDealContext] = useState("");
  const [country, setCountry] = useState<"ES" | "FR">("ES");

  // Step 1
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleSuggestions, setModuleSuggestions] = useState<ModuleSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [selectedBundle, setSelectedBundle] = useState<BundleRow | null>(null);
  const [bundlesOpen, setBundlesOpen] = useState(false);

  // Step 2
  const [roiConfig, setRoiConfig] = useState<RoiConfig>({
    headcounts: { employee: 50, hr: 2, manager: 5 },
    hourly_costs: { employee: 20, hr: 35, manager: 45 },
  });
  const [annualCost, setAnnualCost] = useState(0);

  // Step 3
  const [dlPdf, setDlPdf] = useState<string | null>(null);

  // ── Bundles ────────────────────────────────────────────
  const { data: bundles } = useQuery({
    queryKey: ["express_bundles", country],
    queryFn: async () => {
      const { data, error } = await supabase.from("bundles").select("*").eq("country", country);
      if (error) throw error;
      return data as BundleRow[];
    },
  });

  const validBundles = useMemo(() => {
    if (!bundles) return [];
    return bundles.filter(b => {
      const mods = parseModulesFromBundle(b);
      return mods.length >= 2;
    });
  }, [bundles]);

  // ── Fetch deal ──────────────────────────────────────────
  async function handleFetch() {
    const url = hubspotUrl.trim();
    if (!url) return;
    const dealId = extractDealIdFromUrl(url);
    if (!dealId) { toast.error("URL de HubSpot no válida"); return; }

    setFetching(true);
    setMsgs([{ text: "Buscando deal...", done: false }]);

    try {
      const deal = await fetchDealByHubspotId(dealId);
      if (!deal) {
        setMsgs([{ text: "Deal no encontrado", done: true }]);
        toast.error("Deal no encontrado");
        return;
      }

      if (deal.deal_name) setDealName(deal.deal_name);
      if (deal.deal_context) setDealContext(deal.deal_context);

      const s = { notes: deal.numero_de_notas ?? 0, emails: deal.numero_de_emails ?? 0, calls: deal.numero_de_calls ?? 0 };
      const parts: string[] = [];
      if (s.emails > 0) parts.push(`${s.emails} emails`);
      if (s.calls > 0) parts.push(`${s.calls} llamadas`);
      if (s.notes > 0) parts.push(`${s.notes} notas`);

      const next: Msg[] = [{ text: `Deal: ${deal.deal_name ?? dealId}`, done: true }];
      if (parts.length) next.push({ text: parts.join(" · ") + " procesados", done: true });
      setMsgs(next);

      if (deal.atlas_id) {
        setMsgs(prev => [...prev, { text: "Buscando empresa...", done: false }]);
        const co = await fetchAtlasCompany(deal.atlas_id);
        if (co?.company_name) {
          setCompanyName(co.company_name);
          setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: `Empresa: ${co.company_name}`, done: true }; return u; });
        } else {
          setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: "Empresa no encontrada", done: true }; return u; });
        }
      }

      const content = deal.deal_context?.slice(0, 6000) ?? "";
      if (content.trim()) {
        setMsgs(prev => [...prev, { text: "Analizando contenido...", done: false }]);
        setAnalyzing(true);

        const progressHints = [
          "Leyendo emails y notas...",
          "Detectando pain points...",
          "Evaluando módulos relevantes...",
          "Calculando encaje por stakeholder...",
        ];
        let hintIdx = 0;
        const hintTimer = setInterval(() => {
          if (hintIdx < progressHints.length) {
            const hint = progressHints[hintIdx++];
            setMsgs(prev => {
              const u = [...prev];
              u[u.length - 1] = { text: hint, done: false };
              return u;
            });
          }
        }, 2200);

        try {
          const { data: res, error } = await supabase.functions.invoke("ai-unified-analysis", {
            body: { content, country, modules_ref: MODULE_REF },
          });
          clearInterval(hintTimer);
          if (error) throw error;
          const valid = new Set(MODULE_CATALOG.map(c => c.id));
          const seen = new Set<string>();
          const deduped: ModuleSuggestion[] = (res?.modules ?? [])
            .filter((m: any) => valid.has(m.module_id))
            .map((m: any) => ({ module_id: m.module_id, confidence: m.confidence as "strong" | "possible", quote: m.quote || "" }))
            .filter((sg: ModuleSuggestion) => { if (seen.has(sg.module_id)) return false; seen.add(sg.module_id); return true; });

          setModuleSuggestions(deduped);
          setSelectedModules(deduped.map(x => x.module_id));
          setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: `${deduped.length} módulos identificados`, done: true }; return u; });
        } catch {
          clearInterval(hintTimer);
          setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: "Análisis no disponible", done: true }; return u; });
        }
        setAnalyzing(false);
      }

      setTimeout(() => setStep(1), 1000);
    } catch (err: any) {
      toast.error(err.message ?? "Error");
      setMsgs(prev => [...prev, { text: "Error en la importación", done: true }]);
    } finally {
      setFetching(false);
    }
  }

  // ── Module toggle / bundle add ─────────────────────────
  function toggle(id: string) {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  }

  function selectBundle(b: BundleRow) {
    const prev = selectedBundle ? parseModulesFromBundle(selectedBundle) : [];
    const next = parseModulesFromBundle(b);
    setSelectedModules(cur => {
      const withoutPrev = cur.filter(m => !prev.includes(m));
      return Array.from(new Set([...withoutPrev, ...next]));
    });
    setSelectedBundle(b);
    setBundlesOpen(false);
    toast.success(`${b.bundle_name} seleccionado`);
  }

  function clearBundle() {
    if (!selectedBundle) return;
    const bundleMods = parseModulesFromBundle(selectedBundle);
    setSelectedModules(cur => cur.filter(m => !bundleMods.includes(m)));
    setSelectedBundle(null);
  }

  const bundleModuleIds = useMemo(() => {
    if (!selectedBundle) return new Set<string>();
    return new Set(parseModulesFromBundle(selectedBundle));
  }, [selectedBundle]);

  const addonModules = useMemo(() => {
    return selectedModules.filter(id => !bundleModuleIds.has(id));
  }, [selectedModules, bundleModuleIds]);

  const bundlePepm = useMemo(() => {
    if (!selectedBundle) return 0;
    return getBundlePepm(selectedBundle, "yearly", "business");
  }, [selectedBundle]);

  // ── Grouped catalog ────────────────────────────────────
  const grouped = useMemo(() => {
    const q = catSearch.toLowerCase();
    const f = q ? MODULE_CATALOG.filter(m => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) : MODULE_CATALOG;
    const g: Record<string, typeof MODULE_CATALOG> = {};
    for (const m of f) { if (!g[m.category]) g[m.category] = []; g[m.category].push(m); }
    return g;
  }, [catSearch]);

  // ── ROI calc ───────────────────────────────────────────
  const roi = useMemo(() => {
    if (!selectedModules.length) return null;
    const { headcounts, hourly_costs } = roiConfig;
    const mul: RoiMultipliers = { headcounts, onboardings_per_year: roiConfig.onboardings_per_year, expense_submitters: roiConfig.expense_submitters };
    let mHrs = 0, mMon = 0;
    for (const modId of selectedModules) {
      const hrs = getEffectiveHours(modId);
      for (const sk of ["employee", "hr", "manager"] as Stakeholder[]) {
        const e = MODULE_HOURS.find(x => x.module_id === modId && x.stakeholder === sk);
        const cnt = e ? getCountForEntry(e, mul) : headcounts[sk];
        const h = hrs[sk] * cnt;
        mHrs += h; mMon += h * hourly_costs[sk];
      }
    }
    const ann = mMon * 12;
    const c = annualCost;
    return { savings: ann, cost: c, pct: c > 0 ? ((ann - c) / c * 100) : 0, payback: ann > 0 ? (c / ann * 12) : 0, hrs: mHrs };
  }, [selectedModules, roiConfig, annualCost]);

  // ── PDF ────────────────────────────────────────────────
  async function downloadPdf(type: "summary" | "detail") {
    setDlPdf(type);
    try {
      const lang = country === "FR" ? "fr" : "es";
      const input: RoiSlideInput = {
        companyName: companyName || dealName || "Company",
        country, language: lang,
        configModules: selectedModules,
        bundleName: selectedBundle?.bundle_name ?? "Factorial",
        bundleModules: selectedBundle ? [...bundleModuleIds] : selectedModules,
        roiConfig, annualCost,
      };
      const data = buildRoiSlideData(input);
      if (type === "summary") await generateRoiSlidePdf(data);
      else await generateMultiSlidePdf(data, input);
      toast.success("PDF descargado");
    } catch (err: any) { toast.error(err.message ?? "Error"); }
    finally { setDlPdf(null); }
  }

  const fmtEur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
  const totalPeople = roiConfig.headcounts.employee + roiConfig.headcounts.hr + roiConfig.headcounts.manager;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Progress rail */}
      <div className="h-0.5 bg-border">
        <div className="h-full bg-foreground transition-all duration-500 ease-out" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => step === 0 ? navigate("/") : setStep(s => s - 1)} className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center transition-colors ${i <= step ? "bg-foreground text-background" : "bg-border text-muted-foreground"}`}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                {i < STEPS.length - 1 && <div className="w-3 h-px bg-border hidden sm:block" />}
              </div>
            ))}
          </div>
          <div className="w-9" />
        </div>
      </header>

      {/* ──────────── STEP 0: Import ──────────── */}
      {step === 0 && (
        <main className="flex-1 flex items-center justify-center px-5 pb-16">
          <div className="max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-6">
              <Zap className="h-7 w-7 text-background" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">ROI Express</h1>
            <p className="text-sm text-muted-foreground mb-8">Pega el link del deal y genera el ROI en minutos</p>

            <div className="flex gap-2 mb-6">
              <Input
                placeholder="https://app.hubspot.com/contacts/.../deal/..."
                value={hubspotUrl}
                onChange={e => setHubspotUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !fetching && handleFetch()}
                className="flex-1 h-11"
                disabled={fetching}
                autoFocus
              />
              <Button onClick={handleFetch} disabled={fetching || !hubspotUrl.trim()} className="h-11 px-5 bg-foreground text-background hover:bg-foreground/90">
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {msgs.length > 0 && (
              <div className="text-left space-y-2.5 rounded-xl border border-border bg-card p-4">
                {msgs.map((m, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm" style={{ animation: "fadeIn 0.3s ease-out both", animationDelay: `${i * 60}ms` }}>
                    {m.done ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><Check className="h-2.5 w-2.5 text-white" /></div>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    )}
                    <span className={m.done ? "text-foreground" : "text-muted-foreground"}>{m.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ──────────── STEP 1: Modules ──────────── */}
      {step === 1 && (
        <>
          <main className="flex-1 overflow-hidden">
            <div className="max-w-5xl mx-auto w-full px-5 py-5 h-full flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 overflow-hidden min-h-0">
                {/* Left: Catalog */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">Catálogo</h2>
                    <span className="text-[11px] text-muted-foreground">{MODULE_CATALOG.length} módulos</span>
                  </div>

                  {/* Bundle selector (collapsible) */}
                  {!catSearch && validBundles.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setBundlesOpen(o => !o)}
                        className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {selectedBundle ? selectedBundle.bundle_name : "Elegir bundle"}
                          </span>
                          {selectedBundle && bundlePepm > 0 && (
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {bundlePepm.toFixed(2)} €/pers/mes
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedBundle && (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {parseModulesFromBundle(selectedBundle).length} mods
                            </span>
                          )}
                          {bundlesOpen
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>
                      {bundlesOpen && (
                        <div className="mt-1.5 rounded-lg border border-border bg-card overflow-hidden">
                          {selectedBundle && (
                            <button
                              onClick={clearBundle}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors border-b border-border"
                            >
                              <X className="h-3.5 w-3.5" />
                              Sin bundle
                            </button>
                          )}
                          {validBundles.map((b, i) => {
                            const mods = parseModulesFromBundle(b);
                            const pepm = getBundlePepm(b, "yearly", "business");
                            const active = selectedBundle?.id === b.id;
                            return (
                              <button
                                key={b.id}
                                onClick={() => selectBundle(b)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                                  active ? "bg-foreground/5" : "hover:bg-muted/50"
                                } ${i > 0 || selectedBundle ? "border-t border-border" : ""}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    active ? "border-foreground" : "border-border"
                                  }`}>
                                    {active && <div className="w-2 h-2 rounded-full bg-foreground" />}
                                  </div>
                                  <span className={`text-sm truncate ${active ? "font-semibold text-foreground" : "text-foreground"}`}>
                                    {b.bundle_name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">{mods.length} mods</span>
                                </div>
                                {pepm > 0 && (
                                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                                    {pepm.toFixed(2)} €
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Buscar módulo..." value={catSearch} onChange={e => setCatSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-2 pb-4">
                      {Object.entries(grouped).map(([cat, mods]) => (
                        <div key={cat}>
                          <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-background py-1">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#94A3B8" }} />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</span>
                            <span className="text-[10px] text-muted-foreground">({mods.length})</span>
                          </div>
                          {mods.map(m => {
                            const sel = selectedModules.includes(m.id);
                            const inBundle = bundleModuleIds.has(m.id);
                            return (
                              <button
                                key={m.id}
                                onClick={() => !inBundle && toggle(m.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${
                                  inBundle
                                    ? "bg-foreground/5 text-muted-foreground cursor-default"
                                    : sel
                                      ? "bg-foreground/5 text-foreground font-medium"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {m.label}
                                  {inBundle && <span className="text-[10px] text-muted-foreground/60">bundle</span>}
                                </span>
                                {inBundle
                                  ? <Check className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                  : sel
                                    ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    : <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right: Selected */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">Seleccionados</h2>
                    <span className="text-[11px] font-semibold text-foreground tabular-nums bg-foreground/10 px-2 py-0.5 rounded-full">{selectedModules.length}</span>
                  </div>
                  {selectedModules.length === 0 ? (
                    <div className="flex-1 border border-dashed border-border rounded-xl flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Selecciona módulos del catálogo</p>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-2 pb-4">
                        {/* Bundle group */}
                        {selectedBundle && parseModulesFromBundle(selectedBundle).filter(id => selectedModules.includes(id)).length > 0 && (
                          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5" style={{ animation: "fadeIn 0.25s ease-out" }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5 text-foreground" />
                                <span className="text-xs font-semibold text-foreground">{selectedBundle.bundle_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {bundlePepm > 0 && (
                                  <span className="text-[10px] tabular-nums text-muted-foreground">{bundlePepm.toFixed(2)} €/pers/mes</span>
                                )}
                                <button onClick={clearBundle} className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            {parseModulesFromBundle(selectedBundle).filter(id => selectedModules.includes(id)).map(id => {
                              const cat = MODULE_CATALOG.find(m => m.id === id);
                              return (
                                <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/60 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#94A3B8" }} />
                                  <span className="text-foreground/80">{cat?.label ?? moduleLabel(id)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add-on modules */}
                        {addonModules.map(id => {
                          const cat = MODULE_CATALOG.find(m => m.id === id);
                          const sug = moduleSuggestions.find(sg => sg.module_id === id);
                          return (
                            <div key={id} className="rounded-lg border border-border bg-card p-3 flex items-start gap-3 group hover:shadow-sm transition-shadow" style={{ animation: "fadeIn 0.25s ease-out" }}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#94A3B8" }} />
                                  <span className="text-sm font-medium text-foreground">{cat?.label ?? moduleLabel(id)}</span>
                                  {sug?.confidence === "strong" && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">AI</span>}
                                  {sug?.confidence === "possible" && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Posible</span>}
                                </div>
                                {sug?.quote && <p className="text-xs text-muted-foreground mt-1 italic leading-relaxed line-clamp-2">&ldquo;{sug.quote}&rdquo;</p>}
                              </div>
                              <button onClick={() => toggle(id)} className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          </main>
          <footer className="sticky bottom-0 z-10 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedBundle ? `${selectedBundle.bundle_name} + ${addonModules.length} add-ons` : `${selectedModules.length} módulos`}
              </span>
              <Button onClick={() => setStep(2)} disabled={!selectedModules.length} className="bg-foreground text-background hover:bg-foreground/90">
                Continuar <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </footer>
        </>
      )}

      {/* ──────────── STEP 2: Config ──────────── */}
      {step === 2 && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
              {/* Company + Country row */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Empresa</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={dealName || "Nombre de la empresa"} className="h-10 font-semibold text-base" />
                </div>
                <div className="w-[170px] space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">País</Label>
                  <Select value={country} onValueChange={v => setCountry(v as "ES" | "FR")}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">{"\u{1F1EA}\u{1F1F8}"} España</SelectItem>
                      <SelectItem value="FR">{"\u{1F1EB}\u{1F1F7}"} France</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{selectedModules.length} módulos seleccionados</p>

              {/* Stakeholders */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["employee", "hr", "manager"] as Stakeholder[]).map(key => {
                  const m = STAKE_META[key];
                  const Icon = m.icon;
                  return (
                    <div key={key} className="rounded-xl p-4 space-y-3" style={{ backgroundColor: m.bg, border: `1.5px solid ${m.border}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.color }}><Icon className="h-3.5 w-3.5 text-white" /></div>
                        <span className="text-sm font-semibold text-foreground">{m.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Personas</label>
                          <Input type="number" min={0} className="h-9 text-center font-bold tabular-nums bg-white/80" value={roiConfig.headcounts[key]} onChange={e => setRoiConfig(p => ({ ...p, headcounts: { ...p.headcounts, [key]: Math.max(0, parseInt(e.target.value) || 0) } }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">€/hora</label>
                          <Input type="number" min={0} step={5} className="h-9 text-center font-bold tabular-nums bg-white/80" value={roiConfig.hourly_costs[key]} onChange={e => setRoiConfig(p => ({ ...p, hourly_costs: { ...p.hourly_costs, [key]: Math.max(0, parseFloat(e.target.value) || 0) } }))} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra inputs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border px-4 py-3 space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Altas/año</Label>
                  <Input type="number" min={0} className="h-9 text-center font-bold tabular-nums" placeholder="0" value={roiConfig.onboardings_per_year || ""} onChange={e => setRoiConfig(p => ({ ...p, onboardings_per_year: Math.max(0, parseInt(e.target.value) || 0) }))} />
                </div>
                <div className="rounded-lg border border-border px-4 py-3 space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Coste Factorial €/año</Label>
                  <Input type="number" min={0} className="h-9 text-center font-bold tabular-nums" placeholder="0" value={annualCost || ""} onChange={e => setAnnualCost(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                {selectedModules.includes("expenses") && (
                  <div className="rounded-lg border border-border px-4 py-3 space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Submitters gastos</Label>
                    <Input type="number" min={0} className="h-9 text-center font-bold tabular-nums" placeholder="0" value={roiConfig.expense_submitters || ""} onChange={e => setRoiConfig(p => ({ ...p, expense_submitters: Math.max(0, parseInt(e.target.value) || 0) }))} />
                  </div>
                )}
              </div>

              {/* ROI preview */}
              {roi && roi.savings > 0 && (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div><p className="text-[11px] text-muted-foreground mb-0.5">Ahorro/año</p><p className="text-lg font-bold text-foreground tabular-nums">{fmtEur(roi.savings)} €</p></div>
                    <div><p className="text-[11px] text-muted-foreground mb-0.5">Coste/año</p><p className="text-lg font-bold text-foreground tabular-nums">{fmtEur(roi.cost)} €</p></div>
                    <div><p className="text-[11px] text-muted-foreground mb-0.5">ROI</p><p className="text-lg font-bold text-emerald-600 tabular-nums">{roi.cost > 0 ? `${roi.pct.toFixed(0)}%` : "—"}</p></div>
                    <div><p className="text-[11px] text-muted-foreground mb-0.5">Payback</p><p className="text-lg font-bold text-foreground tabular-nums">{roi.savings > 0 ? `${roi.payback.toFixed(0)} m` : "—"}</p></div>
                  </div>
                </div>
              )}
            </div>
          </main>
          <footer className="sticky bottom-0 z-10 bg-card/95 backdrop-blur-sm border-t border-border px-4 py-3">
            <div className="max-w-2xl mx-auto flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
              </Button>
              <Button onClick={() => setStep(3)} disabled={roiConfig.headcounts.employee === 0} className="bg-foreground text-background hover:bg-foreground/90">
                Ver resultado <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </footer>
        </>
      )}

      {/* ──────────── STEP 3: Results ──────────── */}
      {step === 3 && roi && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">{companyName || dealName || "Empresa"}</h2>
              <p className="text-sm text-muted-foreground mt-1">{selectedModules.length} módulos · {totalPeople} personas</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Ahorro anual", val: `${fmtEur(roi.savings)} €`, cls: "text-foreground" },
                { label: "Coste anual", val: `${fmtEur(roi.cost)} €`, cls: "text-foreground" },
                { label: "ROI", val: roi.cost > 0 ? `${roi.pct.toFixed(0)}%` : "—", cls: roi.pct > 0 ? "text-emerald-600" : "text-foreground" },
                { label: "Payback", val: roi.savings > 0 ? `${roi.payback.toFixed(0)} meses` : "—", cls: "text-foreground" },
              ].map(k => (
                <div key={k.label} className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-[11px] text-muted-foreground mb-1">{k.label}</p>
                  <p className={`text-xl font-bold tabular-nums ${k.cls}`}>{k.val}</p>
                </div>
              ))}
            </div>

            {/* PDF downloads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => downloadPdf("summary")} disabled={!!dlPdf} className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center"><FileText className="h-5 w-5 text-background" /></div>
                  <div><p className="text-sm font-semibold text-foreground">1 Slide</p><p className="text-xs text-muted-foreground">Resumen ejecutivo</p></div>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {dlPdf === "summary" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Descargar PDF
                </span>
              </button>

              <button onClick={() => downloadPdf("detail")} disabled={!!dlPdf} className="rounded-xl border border-border bg-card p-5 text-left hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center"><FileText className="h-5 w-5 text-background" /></div>
                  <div><p className="text-sm font-semibold text-foreground">Detalle</p><p className="text-xs text-muted-foreground">Módulo por módulo</p></div>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {dlPdf === "detail" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Descargar PDF
                </span>
              </button>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Editar config
              </Button>
              <Button variant="outline" onClick={() => { setStep(0); setMsgs([]); setHubspotUrl(""); setSelectedModules([]); setModuleSuggestions([]); setSelectedBundle(null); setCompanyName(""); setDealName(""); }}>
                Nuevo análisis
              </Button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
