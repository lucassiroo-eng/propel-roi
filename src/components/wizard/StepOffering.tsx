import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check, X, Loader2, Plus, Presentation, FileDown,
  ExternalLink, Package, Star, Save, Eye,
  ArrowLeft, ChevronDown, Info, Users, Shield, Briefcase, Quote,
} from "lucide-react";
import { toast } from "sonner";
import type { SelectedOffering, PainOverride, AddonLine, RoiConfig, WizardState, ModuleSuggestion } from "@/hooks/useWizardSession";
import {
  type BundleRow,
  type PricingLineItem,
  type PainModuleEntry,
  moduleLabel,
  deriveRequiredModules,
  analyzeBundle,
  findOptimalBundle,
  getAddonDetails,
  classifyPains,
  MODULES_INCLUDED_IN_CORE,
} from "@/lib/offeringEngine";
import { MODULE_CATALOG } from "@/lib/moduleCatalog";
import { getHoursForModule, type Stakeholder } from "@/lib/moduleHours";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  country: "ES" | "FR";
  seats: number;
  offering: SelectedOffering;
  selectedPains: string[];
  painOverrides?: Record<string, PainOverride>;
  sector?: string;
  selectedModules?: string[];
  moduleSuggestions?: ModuleSuggestion[];
  roiConfig?: RoiConfig;
  onRoiConfigChange?: (config: RoiConfig) => void;
  onChange: (o: Partial<SelectedOffering>) => void;
  onModulesChange?: (modules: string[]) => void;
  sessionId?: string | null;
  state?: WizardState;
  onSave?: () => void;
  onSaveAndExit?: () => void;
}

function fmtEur(n: number): string {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
}

function getModuleColor(moduleId: string): string {
  return MODULE_CATALOG.find(m => m.id === moduleId)?.color ?? "#94A3B8";
}

const STAKEHOLDER_META: Record<Stakeholder, { label: string; sublabel: string; icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { label: "Employees",    sublabel: "~80% of seats", icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)" },
  hr:       { label: "HR / Finance", sublabel: "~5% of seats",  icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.2)" },
  manager:  { label: "Managers",     sublabel: "~15% of seats", icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)" },
};

export function StepOffering({
  country, seats, offering, selectedPains, painOverrides = {},
  sector = "", selectedModules = [], moduleSuggestions = [], roiConfig,
  onRoiConfigChange, onChange, onModulesChange, sessionId, state,
  onSave, onSaveAndExit,
}: Props) {
  const [generatingPptx, setGeneratingPptx] = useState(false);
  const [pptxUrl, setPptxUrl] = useState<string | null>(null);
  const [hypothesisOpen, setHypothesisOpen] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);

  // ── Data fetching ──
  const { data: bundles, isLoading: bundlesLoading } = useQuery({
    queryKey: ["bundles", country],
    queryFn: async () => {
      const { data, error } = await supabase.from("bundles").select("*").eq("country", country);
      if (error) throw error;
      return data as BundleRow[];
    },
  });

  const { data: lineItems } = useQuery({
    queryKey: ["pricing_line_items", country],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing").select("*").eq("country", country).eq("sku_type", "line_item");
      if (error) throw error;
      return data as PricingLineItem[];
    },
  });

  const { data: painModules } = useQuery({
    queryKey: ["pain_modules_for_offering"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pain_library").select("pain_id, primary_module").eq("is_archived", false);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({ pain_id: d.pain_id, primary_module: d.primary_module ?? "" })) as PainModuleEntry[];
    },
  });

  // ── Pain benefits ──
  const painBenefits = useMemo(() => {
    const map: Record<string, number> = {};
    for (const painId of selectedPains) map[painId] = painOverrides[painId]?.annual_benefit ?? 0;
    return map;
  }, [selectedPains, painOverrides]);

  // ── Required modules ──
  const requiredModules = useMemo(() => {
    if (selectedModules.length > 0) {
      const mods: { module: string; label: string; painIds: string[]; totalBenefit: number }[] = [
        { module: "core", label: moduleLabel("core"), painIds: [], totalBenefit: 0 },
      ];
      for (const mod of selectedModules) {
        if (mod === "core") continue;
        mods.push({ module: mod, label: moduleLabel(mod), painIds: [], totalBenefit: 0 });
      }
      return mods;
    }
    if (!painModules) return [];
    return deriveRequiredModules(selectedPains, painModules, painBenefits);
  }, [selectedModules, selectedPains, painModules, painBenefits]);

  const requiredModuleKeys = useMemo(() => requiredModules.map(rm => rm.module), [requiredModules]);

  // ── Bundle analysis ──
  const starterBundle = useMemo(() => {
    if (!bundles) return null;
    return bundles.find(b => b.bundle_name.toLowerCase().includes("starter operations") || b.bundle_name.toLowerCase().includes("starter op")) ?? null;
  }, [bundles]);

  const recommendedBundle = useMemo(() => {
    if (!bundles || !lineItems || !painModules) return null;
    return findOptimalBundle(bundles, requiredModuleKeys, lineItems, offering.billing, offering.tier, seats, painModules, selectedPains, painBenefits);
  }, [bundles, lineItems, painModules, requiredModuleKeys, offering.billing, offering.tier, seats, selectedPains, painBenefits]);

  const starterAnalysis = useMemo(() => {
    if (!starterBundle || !lineItems || !painModules) return null;
    return analyzeBundle(starterBundle, requiredModuleKeys, lineItems, offering.billing, offering.tier, seats, painModules, selectedPains, painBenefits);
  }, [starterBundle, lineItems, painModules, requiredModuleKeys, offering.billing, offering.tier, seats, selectedPains, painBenefits]);

  const selectedBundleId = offering.bundle_id ?? recommendedBundle?.bundle.id ?? null;
  const isStarterSelected = selectedBundleId === starterBundle?.id;

  const selectedAnalysis = useMemo(() => {
    if (isStarterSelected && starterAnalysis) return starterAnalysis;
    return recommendedBundle;
  }, [isStarterSelected, starterAnalysis, recommendedBundle]);

  // ── Configuration ──
  const configuration = useMemo(() => {
    if (!selectedAnalysis || !lineItems || !painModules) return null;

    const uncoveredMods = selectedAnalysis.uncoveredRequired.filter(mod => !MODULES_INCLUDED_IN_CORE.has(mod));

    const addonLines: AddonLine[] = uncoveredMods.map(mod => {
      const details = getAddonDetails(mod, lineItems, offering.billing, offering.tier, selectedAnalysis.effectiveSeats);
      return {
        module: mod, label: moduleLabel(mod), architecture: details?.architecture ?? "Per seat",
        pepm: details?.pepm ?? 0, annual: details?.annual ?? 0, pains_solved: [], enabled: true,
      };
    });

    const addonAnnual = addonLines.reduce((s, a) => s + a.annual, 0);
    const totalAnnualCost = selectedAnalysis.bundleAnnual + addonAnnual;
    const configModules = [...selectedAnalysis.bundleModules, ...uncoveredMods];

    const { covered, uncovered } = classifyPains(selectedPains, painModules, configModules);
    const totalAnnualBenefit = covered.reduce((s, pid) => s + (painBenefits[pid] ?? 0), 0);
    const netRoi = totalAnnualBenefit - totalAnnualCost;
    const roiPct = totalAnnualCost > 0 ? (netRoi / totalAnnualCost) * 100 : 0;
    const paybackMonths = totalAnnualBenefit > 0 ? (totalAnnualCost / totalAnnualBenefit) * 12 : 0;

    return { bundleModules: selectedAnalysis.bundleModules, addonLines, totalAnnualCost, coveredPains: covered, uncoveredPains: uncovered, totalAnnualBenefit, netRoi, roiPct, paybackMonths, configModules };
  }, [selectedAnalysis, lineItems, painModules, offering.billing, offering.tier, selectedPains, painBenefits]);

  // ── ROI savings from module hours ──
  const roiSavings = useMemo(() => {
    if (!roiConfig || !configuration) return { annual: 0, monthly: 0, monthlyHours: 0, perModule: [] as { moduleId: string; label: string; color: string; monthlyHours: number; annualMoney: number }[] };
    const { headcounts, hourly_costs } = roiConfig;
    let monthlyMoney = 0;
    let monthlyHours = 0;
    const perModule: { moduleId: string; label: string; color: string; monthlyHours: number; annualMoney: number }[] = [];

    for (const modId of configuration.configModules) {
      const hours = getHoursForModule(modId);
      let modHours = 0;
      let modMoney = 0;
      for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
        const h = hours[s] * headcounts[s];
        modHours += h;
        modMoney += h * hourly_costs[s];
      }
      monthlyHours += modHours;
      monthlyMoney += modMoney;
      if (modHours > 0) {
        const catalog = MODULE_CATALOG.find(m => m.id === modId);
        perModule.push({ moduleId: modId, label: catalog?.label ?? moduleLabel(modId), color: catalog?.color ?? "#94A3B8", monthlyHours: modHours, annualMoney: modMoney * 12 });
      }
    }
    return { annual: monthlyMoney * 12, monthly: monthlyMoney, monthlyHours, perModule };
  }, [roiConfig, configuration]);

  // ── Sync to parent ──
  const configRef = useRef(configuration);
  const analysisRef = useRef(selectedAnalysis);
  configRef.current = configuration;
  analysisRef.current = selectedAnalysis;

  useEffect(() => {
    const cfg = configRef.current;
    const analysis = analysisRef.current;
    if (!analysis || !cfg) return;
    onChange({
      bundle_id: analysis.bundle.id, bundle_name: analysis.bundle.bundle_name,
      bundle_modules: analysis.bundleModules, bundle_pepm: analysis.bundlePepm, bundle_annual: analysis.bundleAnnual,
      addon_lines: cfg.addonLines, total_annual_cost: cfg.totalAnnualCost,
      covered_pains: cfg.coveredPains, uncovered_pains: cfg.uncoveredPains,
      total_annual_benefit: cfg.totalAnnualBenefit, net_roi: cfg.netRoi, roi_pct: cfg.roiPct, payback_months: cfg.paybackMonths,
    });
  }, [configuration, selectedAnalysis]);

  // ── Generate PPTX ──
  const handleGeneratePptx = async () => {
    if (!sessionId || sessionId === "new") { toast.error("Save the session first"); return; }
    setGeneratingPptx(true);
    try {
      const { error: roiErr } = await supabase.functions.invoke("roi-engine", { body: { session_id: sessionId } });
      if (roiErr) throw roiErr;
      const { data, error } = await supabase.functions.invoke("generate-pptx", { body: { session_id: sessionId } });
      if (error) throw error;
      if (data?.pptx_url) { setPptxUrl(data.pptx_url); toast.success("ROI slide generated!"); }
    } catch (err: any) { toast.error("Generation failed: " + err.message); }
    finally { setGeneratingPptx(false); }
  };

  function selectPack(bundleId: number) { onChange({ bundle_id: bundleId }); }

  function toggleModule(moduleId: string) {
    if (!onModulesChange) return;
    const next = selectedModules.includes(moduleId)
      ? selectedModules.filter(m => m !== moduleId)
      : [...selectedModules, moduleId];
    onModulesChange(next);
  }

  if (bundlesLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!bundles?.length) {
    return <div className="flex justify-center py-12 text-muted-foreground text-sm">No bundles available for this country.</div>;
  }

  const allBundleModules = selectedAnalysis?.bundleModules ?? [];

  if (hypothesisOpen) {
    return (
      <HypothesisView
        roiConfig={roiConfig ?? { headcounts: { employee: 40, hr: 3, manager: 8 }, hourly_costs: { employee: 25, hr: 35, manager: 30 } }}
        onRoiConfigChange={onRoiConfigChange ?? (() => {})}
        configModules={configuration?.configModules ?? []}
        moduleSuggestions={moduleSuggestions}
        onBack={() => setHypothesisOpen(false)}
        onSave={() => {
          if (onSave) onSave();
          setHypothesisOpen(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">ROI & Offering</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a pack, customize modules, and review the ROI</p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${offering.billing === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}`}>Monthly</span>
          <Switch checked={offering.billing === "yearly"} onCheckedChange={(v) => onChange({ billing: v ? "yearly" : "monthly" })} />
          <span className={`text-xs ${offering.billing === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"}`}>Yearly</span>
        </div>
        <div className="flex items-center gap-2">
          <button className={`text-xs px-2.5 py-1 rounded-md transition-colors ${offering.tier === "business" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => onChange({ tier: "business" })}>Business</button>
          <button className={`text-xs px-2.5 py-1 rounded-md transition-colors ${offering.tier === "enterprise" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => onChange({ tier: "enterprise" })}>Enterprise</button>
        </div>
      </div>

      {/* Two pack options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {starterAnalysis && (
          <button
            className={`text-left rounded-xl border-2 p-5 transition-all ${isStarterSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40 hover:shadow-sm"}`}
            onClick={() => selectPack(starterAnalysis.bundle.id)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isStarterSelected ? "bg-primary" : "bg-muted"}`}>
                <Package className={`h-5 w-5 ${isStarterSelected ? "text-white" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Starter Operations</p>
                <p className="text-[10px] text-muted-foreground">Core + Time essentials</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {starterAnalysis.bundleModules.map(m => <Badge key={m} variant="secondary" className="text-[10px] font-normal">{moduleLabel(m)}</Badge>)}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{fmtEur(starterAnalysis.bundleAnnual)}</span>
              <span className="text-xs text-muted-foreground">EUR/year</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{starterAnalysis.bundlePepm.toFixed(2)} EUR/employee/month</p>
          </button>
        )}
        {recommendedBundle && (
          <button
            className={`text-left rounded-xl border-2 p-5 transition-all relative ${!isStarterSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40 hover:shadow-sm"}`}
            onClick={() => selectPack(recommendedBundle.bundle.id)}
          >
            <div className="absolute -top-2.5 right-4">
              <Badge className="bg-emerald-500 text-white text-[10px] gap-1 border-0"><Star className="h-3 w-3" /> Recommended</Badge>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${!isStarterSelected ? "bg-primary" : "bg-muted"}`}>
                <Star className={`h-5 w-5 ${!isStarterSelected ? "text-white" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{recommendedBundle.bundle.bundle_name}</p>
                <p className="text-[10px] text-muted-foreground">All recommended modules</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {recommendedBundle.bundleModules.map(m => {
                const isReq = requiredModuleKeys.includes(m);
                return <Badge key={m} variant="secondary" className={`text-[10px] font-normal ${isReq ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}`}>{isReq && <Check className="h-2.5 w-2.5 mr-0.5" />}{moduleLabel(m)}</Badge>;
              })}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{fmtEur(recommendedBundle.bundleAnnual)}</span>
              <span className="text-xs text-muted-foreground">EUR/year</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{recommendedBundle.bundlePepm.toFixed(2)} EUR/employee/month</p>
          </button>
        )}
      </div>

      {/* Module pills */}
      {selectedAnalysis && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Included modules</p>
          <div className="flex flex-wrap gap-2">
            {allBundleModules.map(modId => (
              <div key={modId} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium bg-accent/80 text-foreground cursor-default" style={{ borderColor: getModuleColor(modId) + "40" }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getModuleColor(modId) }} />
                {moduleLabel(modId)}
                <Check className="h-3 w-3 text-emerald-500" />
              </div>
            ))}
            {selectedModules.filter(m => !allBundleModules.includes(m)).map(modId => (
              <button key={modId} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 transition-colors" onClick={() => toggleModule(modId)}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getModuleColor(modId) }} />
                {moduleLabel(modId)}
                <X className="h-3 w-3" />
              </button>
            ))}
            <Popover open={addModuleOpen} onOpenChange={setAddModuleOpen}>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <Plus className="h-3 w-3" /> Add
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 max-h-64 overflow-y-auto" align="start">
                {MODULE_CATALOG.filter(m => !selectedModules.includes(m.id) && !allBundleModules.includes(m.id)).map(m => (
                  <button key={m.id} className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2" onClick={() => { if (onModulesChange) onModulesChange([...selectedModules, m.id]); setAddModuleOpen(false); }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    {m.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* INVOICE: Unified Cost & Savings per Module  */}
      {/* ═══════════════════════════════════════════ */}
      {configuration && (() => {
        const allModuleRows = [
          ...allBundleModules.map(modId => ({
            moduleId: modId,
            label: moduleLabel(modId),
            color: getModuleColor(modId),
            cost: null as number | null,
            isBundle: true,
          })),
          ...configuration.addonLines.map(a => ({
            moduleId: a.module,
            label: a.label,
            color: getModuleColor(a.module),
            cost: a.annual,
            isBundle: false,
          })),
        ];

        return (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-2.5 bg-muted/50 gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Module</span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Cost/yr</span>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider text-right">h/mo</span>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider text-right">Savings/yr</span>
            </div>

            {/* Module rows */}
            {allModuleRows.map((row, i) => {
              const saving = roiSavings.perModule.find(m => m.moduleId === row.moduleId);
              return (
                <div key={row.moduleId} className={`grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-2 border-t border-border/30 gap-3 ${i % 2 === 0 ? "bg-white/50" : "bg-muted/10"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                    <span className="text-sm text-foreground truncate">{row.label}</span>
                    {row.isBundle && (
                      <span className="text-[9px] text-muted-foreground bg-muted rounded px-1 py-0.5 shrink-0">incl.</span>
                    )}
                  </div>
                  <span className="text-sm tabular-nums text-right text-muted-foreground">
                    {row.cost !== null ? `${fmtEur(row.cost)} €` : "—"}
                  </span>
                  <span className="text-xs tabular-nums text-right text-emerald-600/70">
                    {saving ? `${saving.monthlyHours.toFixed(0)}h` : "—"}
                  </span>
                  <span className="text-sm font-medium tabular-nums text-right text-emerald-600">
                    {saving ? `${fmtEur(saving.annualMoney)} €` : "—"}
                  </span>
                </div>
              );
            })}

            {/* Bundle base cost row */}
            <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-2 border-t border-border bg-muted/20 gap-3">
              <span className="text-sm text-foreground font-medium">{selectedAnalysis?.bundle.bundle_name}</span>
              <span className="text-sm font-medium tabular-nums text-right">{fmtEur(selectedAnalysis?.bundleAnnual ?? 0)} €</span>
              <span />
              <span />
            </div>

            {/* Totals */}
            <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-3 border-t-2 border-border bg-muted/40 gap-3">
              <span className="text-sm font-bold text-foreground">Total</span>
              <span className="text-sm font-bold tabular-nums text-right">{fmtEur(configuration.totalAnnualCost)} €/yr</span>
              <span className="text-xs font-semibold tabular-nums text-right text-emerald-600">{roiSavings.monthlyHours.toFixed(0)}h</span>
              <span className="text-sm font-bold tabular-nums text-right text-emerald-600">{fmtEur(roiSavings.annual)} €/yr</span>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════ */}
      {/* ACTION BUTTONS                             */}
      {/* ═══════════════════════════════════════════ */}
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" size="lg" onClick={() => setHypothesisOpen(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            Check Hypothesis
          </Button>
          <Button size="lg" onClick={handleGeneratePptx} disabled={generatingPptx} className="gap-2">
            {generatingPptx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
            1-Pager
          </Button>
          <Button variant="secondary" size="lg" onClick={onSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>

        {pptxUrl && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <a href={pptxUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> View</a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href={pptxUrl} download={`ROI-${state?.prospect.company_name || "report"}.pptx`}><FileDown className="h-4 w-4 mr-2" /> Download</a>
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Hypothesis View: full-screen module × stakeholder breakdown ──
function HypothesisView({
  roiConfig, onRoiConfigChange, configModules, moduleSuggestions, onBack, onSave,
}: {
  roiConfig: RoiConfig;
  onRoiConfigChange: (config: RoiConfig) => void;
  configModules: string[];
  moduleSuggestions: ModuleSuggestion[];
  onBack: () => void;
  onSave: () => void;
}) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const { headcounts, hourly_costs } = roiConfig;

  function setHeadcount(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, headcounts: { ...headcounts, [key]: Math.max(0, value) } });
  }
  function setHourlyCost(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, hourly_costs: { ...hourly_costs, [key]: Math.max(0, value) } });
  }

  const totalPeople = headcounts.employee + headcounts.hr + headcounts.manager;

  const moduleRows = configModules.map(moduleId => {
    const catalog = MODULE_CATALOG.find(m => m.id === moduleId);
    const hours = getHoursForModule(moduleId);
    const suggestion = moduleSuggestions.find(s => s.module_id === moduleId);
    const label = catalog?.label ?? moduleLabel(moduleId);
    const color = catalog?.color ?? "#94A3B8";
    const perStakeholder = (["employee", "hr", "manager"] as Stakeholder[]).map(s => ({
      stakeholder: s,
      hoursPerPerson: hours[s],
      totalHours: hours[s] * headcounts[s],
      totalMoney: hours[s] * headcounts[s] * hourly_costs[s],
    }));
    const monthlyHours = perStakeholder.reduce((sum, s) => sum + s.totalHours, 0);
    const annualMoney = perStakeholder.reduce((sum, s) => sum + s.totalMoney, 0) * 12;
    return { moduleId, label, color, suggestion, perStakeholder, monthlyHours, annualMoney };
  }).filter(r => r.monthlyHours > 0);

  const totals = {
    monthlyHours: moduleRows.reduce((s, r) => s + r.monthlyHours, 0),
    annual: moduleRows.reduce((s, r) => s + r.annualMoney, 0),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "linear-gradient(135deg, #fdf0f3 0%, #f5f0fd 40%, #f0f4fd 70%, #fdf0f7 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-white/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h2 className="text-base font-semibold text-foreground">Check Hypothesis</h2>
          <Button onClick={onSave} className="gap-1.5">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* (i) Stakeholder Assumptions */}
        <section className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Stakeholder Assumptions</p>
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
                      <p className="text-sm font-semibold text-foreground leading-tight">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground">{meta.sublabel}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">People</label>
                      <Input
                        type="number" min={0}
                        className="h-10 text-center text-lg font-bold tabular-nums bg-white/80"
                        value={headcounts[key]}
                        onChange={e => setHeadcount(key, parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">€/hour</label>
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
              <strong className="text-foreground">{totalPeople}</strong> people total
            </span>
            <span className="text-xs text-muted-foreground">
              Weighted avg: <strong className="text-foreground">
                €{totalPeople > 0 ? Math.round((headcounts.employee * hourly_costs.employee + headcounts.hr * hourly_costs.hr + headcounts.manager * hourly_costs.manager) / totalPeople) : 0}
              </strong>/h
            </span>
          </div>
        </section>

        {/* (ii) Module Breakdown */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Module Breakdown
              <span className="text-muted-foreground font-normal ml-2">{moduleRows.length} modules</span>
            </p>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{totals.monthlyHours.toFixed(0)}h/mo · <strong className="text-emerald-600">€{fmtEur(totals.annual)}/yr</strong></p>
            </div>
          </div>

          <div className="space-y-2">
            {moduleRows.map(row => {
              const isExpanded = expandedModule === row.moduleId;
              return (
                <div
                  key={row.moduleId}
                  className="rounded-xl border overflow-hidden transition-shadow hover:shadow-sm bg-white/60"
                  style={{ borderColor: row.color + "30", borderLeftWidth: 4, borderLeftColor: row.color }}
                >
                  {/* Condensed view */}
                  <button
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedModule(isExpanded ? null : row.moduleId)}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: row.color + "15" }}>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{row.label}</p>
                      {row.suggestion?.quote && (
                        <div className="flex items-start gap-1.5 mt-0.5">
                          <Quote className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/40" />
                          <p className="text-[11px] text-muted-foreground italic line-clamp-1">{row.suggestion.quote}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <p className="text-xs text-muted-foreground tabular-nums">{row.monthlyHours.toFixed(0)}h/mo</p>
                      <p className="text-sm font-bold tabular-nums text-emerald-600">€{fmtEur(row.annualMoney)}/yr</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {/* Expanded view — per-stakeholder rows */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-2 bg-muted/5" style={{ borderColor: row.color + "20" }}>
                      {row.perStakeholder.filter(ps => ps.hoursPerPerson > 0).map(ps => {
                        const meta = STAKEHOLDER_META[ps.stakeholder];
                        const Icon = meta.icon;
                        return (
                          <div key={ps.stakeholder} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: meta.bg }}>
                            <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: meta.color }}>
                              <Icon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-foreground flex-1">{meta.label}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/60 transition-colors shrink-0">
                                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-60 text-xs p-3" side="left">
                                <p className="font-semibold text-foreground mb-1.5">{row.label} × {meta.label}</p>
                                <p className="text-muted-foreground leading-relaxed">
                                  Saves <strong>{ps.hoursPerPerson}h</strong> per person per month.
                                  With <strong>{headcounts[ps.stakeholder]}</strong> {meta.label.toLowerCase()}: <strong>{ps.totalHours.toFixed(1)}h</strong>/month total.
                                </p>
                                <p className="text-muted-foreground mt-1.5">
                                  Annual value: <strong className="text-emerald-600">€{fmtEur(ps.totalMoney * 12)}</strong>
                                </p>
                              </PopoverContent>
                            </Popover>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">{ps.hoursPerPerson}h/pers/mo</span>
                              <span className="text-sm font-semibold tabular-nums text-foreground w-16 text-right">{ps.totalHours.toFixed(1)}h/mo</span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Module total */}
                      <div className="flex items-center justify-between px-3 pt-1 border-t" style={{ borderColor: row.color + "15" }}>
                        <span className="text-xs font-medium text-muted-foreground">Module total</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold tabular-nums">{row.monthlyHours.toFixed(0)}h/mo</span>
                          <span className="text-sm font-bold tabular-nums text-emerald-600">€{fmtEur(row.annualMoney)}/yr</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grand total */}
          <div className="rounded-xl border border-border bg-white/80 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Total savings</span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold tabular-nums">{totals.monthlyHours.toFixed(0)}h/mo</span>
              <span className="text-lg font-bold tabular-nums text-emerald-600">€{fmtEur(totals.annual)}/yr</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
