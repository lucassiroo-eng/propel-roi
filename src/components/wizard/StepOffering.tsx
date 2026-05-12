import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check, X, Loader2, Plus, Presentation, FileDown, FileText,
  ExternalLink, Package, Star, Save, Eye, Globe,
  ArrowLeft, ChevronDown, ChevronRight, Users, Shield, Briefcase, Quote, Percent, Search,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
import { MODULE_CATALOG, CATEGORY_COLORS } from "@/lib/moduleCatalog";
import { getHoursForModule, getEffectiveHours, SAVINGS_DESCRIPTIONS, type Stakeholder } from "@/lib/moduleHours";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const STAKEHOLDER_META: Record<Stakeholder, { labelKey: string; icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { labelKey: "stakeholder.employee", icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)" },
  hr:       { labelKey: "stakeholder.hr",       icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.2)" },
  manager:  { labelKey: "stakeholder.manager",  icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)" },
};

export function StepOffering({
  country, seats, offering, selectedPains, painOverrides = {},
  sector = "", selectedModules = [], moduleSuggestions = [], roiConfig,
  onRoiConfigChange, onChange, onModulesChange, sessionId, state,
  onSave, onSaveAndExit,
}: Props) {
  const { t } = useTranslation();
  const [generatingPptx, setGeneratingPptx] = useState(false);
  const [pptxUrl, setPptxUrl] = useState<string | null>(null);
  const [hypothesisOpen, setHypothesisOpen] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  // ── Configuration (for the selected bundle) ──
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
      const hours = getEffectiveHours(modId, roiConfig.hours_overrides);
      let modHours = 0;
      let modMoney = 0;
      for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
        const count = (modId === "expenses" && s === "employee" && roiConfig.expense_submitters)
          ? roiConfig.expense_submitters
          : headcounts[s];
        const h = hours[s] * count;
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
    const disc = offering.discount_pct ?? 0;
    const discountedCost = cfg.totalAnnualCost * (1 - disc / 100);
    const netRoi = cfg.totalAnnualBenefit - discountedCost;
    const roiPct = discountedCost > 0 ? (netRoi / discountedCost) * 100 : 0;
    const paybackMonths = cfg.totalAnnualBenefit > 0 ? (discountedCost / cfg.totalAnnualBenefit) * 12 : 0;
    onChange({
      bundle_id: analysis.bundle.id, bundle_name: analysis.bundle.bundle_name,
      bundle_modules: analysis.bundleModules, bundle_pepm: analysis.bundlePepm, bundle_annual: analysis.bundleAnnual,
      addon_lines: cfg.addonLines, total_annual_cost: discountedCost,
      covered_pains: cfg.coveredPains, uncovered_pains: cfg.uncoveredPains,
      total_annual_benefit: cfg.totalAnnualBenefit, net_roi: netRoi, roi_pct: roiPct, payback_months: paybackMonths,
    });
  }, [configuration, selectedAnalysis, offering.discount_pct]);

  // ── Generate PPTX ──
  const handleGeneratePptx = async () => {
    if (!sessionId || sessionId === "new") { toast.error(t("toast.save_session_first")); return; }
    setGeneratingPptx(true);
    try {
      const { error: roiErr } = await supabase.functions.invoke("roi-engine", { body: { session_id: sessionId } });
      if (roiErr) throw roiErr;
      const { data, error } = await supabase.functions.invoke("generate-pptx", { body: { session_id: sessionId } });
      if (error) throw error;
      if (data?.pptx_url) { setPptxUrl(data.pptx_url); toast.success(t("toast.pptx_generated")); }
    } catch (err: any) { toast.error(t("toast.generation_failed", { message: err.message })); }
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
    return <div className="flex justify-center py-12 text-muted-foreground text-sm">{t("offering.no_bundles")}</div>;
  }

  const allBundleModules = selectedAnalysis?.bundleModules ?? [];
  const teamFilled = roiConfig && roiConfig.headcounts.employee > 0 && roiConfig.headcounts.hr > 0 && roiConfig.headcounts.manager > 0;
  const discPct = offering.discount_pct ?? 0;

  if (hypothesisOpen) {
    return (
      <HypothesisView
        roiConfig={roiConfig ?? { headcounts: { employee: 0, hr: 0, manager: 0 }, hourly_costs: { employee: 20, hr: 30, manager: 25 } }}
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
      {/* ═══════════════════════════════════════════ */}
      {/* 1. FILTER BAR: billing + tier + discount   */}
      {/* ═══════════════════════════════════════════ */}
      <div className="rounded-xl border border-border bg-muted/20 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Billing toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5">
              <button
                className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${offering.billing === "yearly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => onChange({ billing: "yearly" })}
              >{t("offering.yearly")}</button>
              <button
                className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${offering.billing === "monthly" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => onChange({ billing: "monthly" })}
              >{t("offering.monthly")}</button>
            </div>

            <div className="w-px h-5 bg-border" />

            {/* Tier toggle */}
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5">
              <button
                className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${offering.tier === "enterprise" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => onChange({ tier: "enterprise" })}
              >{t("offering.tier_enterprise")}</button>
              <button
                className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${offering.tier === "business" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => onChange({ tier: "business" })}
              >{t("offering.tier_business")}</button>
            </div>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t("offering.discount")}</span>
            <div className="flex items-center gap-1 bg-muted/60 rounded-lg px-2 py-0.5">
              <Input
                type="number" min={0} max={100} step={1}
                className="w-12 h-7 text-center text-xs tabular-nums border-0 bg-transparent p-0"
                placeholder="0"
                value={offering.discount_pct || ""}
                onChange={e => onChange({ discount_pct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
              />
              <Percent className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* 2. MODULE SELECTOR                         */}
      {/* ═══════════════════════════════════════════ */}
      {selectedAnalysis && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("offering.included_modules")}</p>
            <Button variant="outline" size="sm" onClick={() => setAddModuleOpen(true)} className="h-7 text-xs gap-1">
              <Plus className="h-3 w-3" /> {t("offering.add")}
            </Button>
          </div>
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
          </div>
        </div>
      )}

      {/* Add module dialog */}
      <AddModuleDialog
        open={addModuleOpen}
        onOpenChange={setAddModuleOpen}
        modules={MODULE_CATALOG.filter(m => !selectedModules.includes(m.id) && !allBundleModules.includes(m.id))}
        onAdd={(moduleId) => {
          if (onModulesChange) onModulesChange([...selectedModules, moduleId]);
          setAddModuleOpen(false);
        }}
      />

      {/* ═══════════════════════════════════════════ */}
      {/* 3. TWO PACK OPTIONS                        */}
      {/* ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {starterAnalysis && (() => {
          const total = discPct > 0 ? starterAnalysis.totalAnnual * (1 - discPct / 100) : starterAnalysis.totalAnnual;
          return (
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
                  <p className="text-[10px] text-muted-foreground">
                    + {starterAnalysis.uncoveredRequired.length} {t("offering.addons").toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                {discPct > 0 && (
                  <span className="text-sm text-muted-foreground line-through mr-1">{fmtEur(starterAnalysis.totalAnnual)}</span>
                )}
                <span className="text-2xl font-bold text-foreground">{fmtEur(total)}</span>
                <span className="text-xs text-muted-foreground">{t("offering.eur_year")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{starterAnalysis.bundlePepm.toFixed(2)} {t("offering.eur_emp_month")}</p>
            </button>
          );
        })()}
        {recommendedBundle && (() => {
          const total = discPct > 0 ? recommendedBundle.totalAnnual * (1 - discPct / 100) : recommendedBundle.totalAnnual;
          return (
            <button
              className={`text-left rounded-xl border-2 p-5 transition-all relative ${!isStarterSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40 hover:shadow-sm"}`}
              onClick={() => selectPack(recommendedBundle.bundle.id)}
            >
              <div className="absolute -top-2.5 right-4">
                <Badge className="bg-emerald-500 text-white text-[10px] gap-1 border-0"><Star className="h-3 w-3" /> {t("offering.recommended")}</Badge>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${!isStarterSelected ? "bg-primary" : "bg-muted"}`}>
                  <Star className={`h-5 w-5 ${!isStarterSelected ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{recommendedBundle.bundle.bundle_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {recommendedBundle.uncoveredRequired.length > 0
                      ? `+ ${recommendedBundle.uncoveredRequired.length} ${t("offering.addons").toLowerCase()}`
                      : t("offering.all_recommended")}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                {discPct > 0 && (
                  <span className="text-sm text-muted-foreground line-through mr-1">{fmtEur(recommendedBundle.totalAnnual)}</span>
                )}
                <span className="text-2xl font-bold text-foreground">{fmtEur(total)}</span>
                <span className="text-xs text-muted-foreground">{t("offering.eur_year")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{recommendedBundle.bundlePepm.toFixed(2)} {t("offering.eur_emp_month")}</p>
            </button>
          );
        })()}
      </div>

      {/* Team breakdown warning */}
      {!teamFilled && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">{t("setup.fill_team")}</p>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 4. DETAILS (collapsible)                   */}
      {/* ═══════════════════════════════════════════ */}
      {teamFilled && configuration && (() => {
        const discountedCost = configuration.totalAnnualCost * (1 - discPct / 100);
        const bundleSavings = allBundleModules.reduce((acc, modId) => {
          const s = roiSavings.perModule.find(m => m.moduleId === modId);
          return { hours: acc.hours + (s?.monthlyHours ?? 0), money: acc.money + (s?.annualMoney ?? 0) };
        }, { hours: 0, money: 0 });

        return (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Summary row — always visible */}
            <button
              className="w-full flex items-center justify-between px-5 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <ChevronRight className={`h-4 w-4 transition-transform ${showDetails ? "rotate-90" : ""}`} />
                {t("offering.show_details")}
              </span>
              <div className="flex items-center gap-4 text-sm tabular-nums">
                <span className="text-muted-foreground">{t("offering.cost_yr")}: <strong className="text-foreground">{fmtEur(discPct > 0 ? discountedCost : configuration.totalAnnualCost)} €</strong></span>
                <span className="text-emerald-600">{t("offering.savings_yr")}: <strong>{roiSavings.monthlyHours.toFixed(0)}h/mo → {fmtEur(roiSavings.annual)} €</strong></span>
              </div>
            </button>

            {/* Expanded detail */}
            {showDetails && (<>
              {/* Table header */}
              <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-2 bg-muted/30 border-t border-border gap-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("offering.module_header")}</span>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">{t("offering.cost_yr")}</span>
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider text-right">{t("offering.h_mo")}</span>
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider text-right">{t("offering.savings_yr")}</span>
              </div>

              {/* Bundle group header */}
              <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-2.5 border-t border-border bg-muted/20 gap-3">
                <span className="text-sm font-semibold text-foreground">{selectedAnalysis?.bundle.bundle_name}</span>
                <span className="text-sm font-semibold tabular-nums text-right">{fmtEur(selectedAnalysis?.bundleAnnual ?? 0)} €</span>
                <span className="text-xs font-semibold tabular-nums text-right text-emerald-600/70">{bundleSavings.hours.toFixed(0)}h</span>
                <span className="text-sm font-semibold tabular-nums text-right text-emerald-600">{fmtEur(bundleSavings.money)} €</span>
              </div>

              {/* Bundle module rows */}
              {allBundleModules.map((modId, i) => {
                const saving = roiSavings.perModule.find(m => m.moduleId === modId);
                const color = getModuleColor(modId);
                const quote = moduleSuggestions.find(s => s.module_id === modId)?.quote;
                return (
                  <div key={modId} className={`border-t border-border/20 ${i % 2 === 0 ? "bg-white/40" : "bg-muted/5"}`}>
                    <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center pl-8 pr-5 py-1.5 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs text-muted-foreground truncate">{moduleLabel(modId)}</span>
                      </div>
                      <span className="text-xs tabular-nums text-right text-muted-foreground/50">{t("offering.incl")}</span>
                      <span className="text-xs tabular-nums text-right text-emerald-600/50">{saving ? `${saving.monthlyHours.toFixed(0)}h` : "—"}</span>
                      <span className="text-xs tabular-nums text-right text-emerald-600/50">{saving ? `${fmtEur(saving.annualMoney)} €` : "—"}</span>
                    </div>
                    {quote && (
                      <div className="pl-11 pr-5 pb-1.5 flex items-start gap-1.5">
                        <Quote className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/30" />
                        <p className="text-[10px] text-muted-foreground/60 italic line-clamp-1">&ldquo;{quote}&rdquo;</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add-on module rows */}
              {configuration.addonLines.map((a, i) => {
                const saving = roiSavings.perModule.find(m => m.moduleId === a.module);
                const color = getModuleColor(a.module);
                const quote = moduleSuggestions.find(s => s.module_id === a.module)?.quote;
                return (
                  <div key={a.module} className={`border-t border-border/30 ${i % 2 === 0 ? "bg-white/50" : "bg-muted/10"}`}>
                    <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-2 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm text-foreground truncate">{a.label}</span>
                      </div>
                      <span className="text-sm tabular-nums text-right text-muted-foreground">{fmtEur(a.annual)} €</span>
                      <span className="text-xs tabular-nums text-right text-emerald-600/70">{saving ? `${saving.monthlyHours.toFixed(0)}h` : "—"}</span>
                      <span className="text-sm font-medium tabular-nums text-right text-emerald-600">{saving ? `${fmtEur(saving.annualMoney)} €` : "—"}</span>
                    </div>
                    {quote && (
                      <div className="pl-8 pr-5 pb-1.5 flex items-start gap-1.5">
                        <Quote className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/30" />
                        <p className="text-[10px] text-muted-foreground/60 italic line-clamp-1">&ldquo;{quote}&rdquo;</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Discount rows */}
              {discPct > 0 && (<>
                <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-2 border-t-2 border-border bg-muted/30 gap-3">
                  <span className="text-sm text-muted-foreground">{t("offering.subtotal")}</span>
                  <span className="text-sm tabular-nums text-right text-muted-foreground">{fmtEur(configuration.totalAnnualCost)} €</span>
                  <span /><span />
                </div>
                <div className="grid grid-cols-[1fr,minmax(90px,auto),minmax(60px,auto),minmax(100px,auto)] items-center px-5 py-1.5 bg-muted/30 gap-3">
                  <span className="text-sm text-rose-600">{t("offering.discount")} {discPct}%</span>
                  <span className="text-sm font-medium tabular-nums text-right text-rose-600">−{fmtEur(configuration.totalAnnualCost * discPct / 100)} €</span>
                  <span /><span />
                </div>
              </>)}

              {/* ROI summary */}
              {roiSavings.annual > 0 && (
                <div className="grid grid-cols-3 gap-4 px-5 py-3 border-t-2 border-border bg-emerald-50/50">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ROI</p>
                    <p className="text-lg font-bold text-emerald-600 tabular-nums">
                      {((roiSavings.annual / (discPct > 0 ? discountedCost : configuration.totalAnnualCost)) * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("offering.savings_yr")}</p>
                    <p className="text-lg font-bold text-emerald-600 tabular-nums">{fmtEur(roiSavings.annual)} €</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("offering.payback")}</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {roiSavings.annual > 0 ? ((discPct > 0 ? discountedCost : configuration.totalAnnualCost) / roiSavings.annual * 12).toFixed(0) : "—"} {t("offering.months")}
                    </p>
                  </div>
                </div>
              )}
            </>)}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════ */}
      {/* 5. ACTION BUTTONS                          */}
      {/* ═══════════════════════════════════════════ */}
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-4 gap-3">
          <Button variant="outline" size="lg" onClick={() => setHypothesisOpen(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            {t("offering.check_hypothesis")}
          </Button>
          <Button size="lg" onClick={handleGeneratePptx} disabled={generatingPptx} className="gap-2">
            {generatingPptx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
            {t("offering.one_pager")}
          </Button>
          <Button variant="outline" size="lg" onClick={handleGeneratePptx} disabled={generatingPptx} className="gap-2">
            <FileText className="h-4 w-4" />
            {t("offering.detailed_doc")}
          </Button>
          <Button variant="secondary" size="lg" onClick={onSave} className="gap-2">
            <Save className="h-4 w-4" />
            {t("offering.save")}
          </Button>
        </div>

        {pptxUrl && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <a href={pptxUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> {t("offering.view_link")}</a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href={pptxUrl} download={`ROI-${state?.prospect.company_name || "report"}.pptx`}><FileDown className="h-4 w-4 mr-2" /> {t("offering.download")}</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Module Dialog (same style as Page 1) ──
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

// ── Hypothesis View: full-screen module × stakeholder breakdown ──
const LANG_FLAG: Record<string, string> = { en: "\u{1F1EC}\u{1F1E7}", es: "\u{1F1EA}\u{1F1F8}", fr: "\u{1F1EB}\u{1F1F7}" };

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
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const { headcounts, hourly_costs } = roiConfig;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("propel_locale", lng);
  };

  function setHeadcount(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, headcounts: { ...headcounts, [key]: Math.max(0, value) } });
  }
  function setHourlyCost(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, hourly_costs: { ...hourly_costs, [key]: Math.max(0, value) } });
  }

  function setHoursOverride(moduleId: string, stakeholder: Stakeholder, value: number) {
    const prev = roiConfig.hours_overrides ?? {};
    const modPrev = prev[moduleId] ?? {};
    onRoiConfigChange({
      ...roiConfig,
      hours_overrides: { ...prev, [moduleId]: { ...modPrev, [stakeholder]: Math.max(0, value) } },
    });
  }

  const moduleRows = configModules.map(moduleId => {
    const catalog = MODULE_CATALOG.find(m => m.id === moduleId);
    const hours = getEffectiveHours(moduleId, roiConfig.hours_overrides);
    const suggestion = moduleSuggestions.find(s => s.module_id === moduleId);
    const label = catalog?.label ?? moduleLabel(moduleId);
    const color = catalog?.color ?? "#94A3B8";
    const perStakeholder = (["employee", "hr", "manager"] as Stakeholder[]).map(s => {
      const count = (moduleId === "expenses" && s === "employee" && roiConfig.expense_submitters)
        ? roiConfig.expense_submitters
        : headcounts[s];
      return {
        stakeholder: s,
        hoursPerPerson: hours[s],
        totalHours: hours[s] * count,
        totalMoney: hours[s] * count * hourly_costs[s],
      };
    });
    const monthlyHours = perStakeholder.reduce((sum, s) => sum + s.totalHours, 0);
    const annualMoney = perStakeholder.reduce((sum, s) => sum + s.totalMoney, 0) * 12;
    return { moduleId, label, color, suggestion, perStakeholder, monthlyHours, annualMoney };
  }).filter(r => r.monthlyHours > 0);

  const totals = {
    monthlyHours: moduleRows.reduce((s, r) => s + r.monthlyHours, 0),
    annual: moduleRows.reduce((s, r) => s + r.annualMoney, 0),
  };

  const selectedRow = moduleRows.find(r => r.moduleId === selectedModuleId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "linear-gradient(135deg, #fdf0f3 0%, #f5f0fd 40%, #f0f4fd 70%, #fdf0f7 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-white/60 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {t("hyp.back")}
          </Button>
          <h2 className="text-base font-semibold text-foreground">{t("hyp.title")}</h2>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {LANG_FLAG[i18n.language?.substring(0, 2)] ?? "\u{1F310}"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1" align="end">
                <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors" onClick={() => changeLanguage("en")}>{"\u{1F1EC}\u{1F1E7}"} English</button>
                <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors" onClick={() => changeLanguage("es")}>{"\u{1F1EA}\u{1F1F8}"} Español</button>
                <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors" onClick={() => changeLanguage("fr")}>{"\u{1F1EB}\u{1F1F7}"} Français</button>
              </PopoverContent>
            </Popover>
            <Button onClick={onSave} className="gap-1.5">
              <Save className="h-4 w-4" />
              {t("hyp.save")}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* (i) Stakeholder Assumptions */}
        <section className="space-y-3">
          <p className="text-sm font-semibold text-foreground">{t("hyp.stakeholder_assumptions")}</p>
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
        </section>

        {/* (ii) Module Breakdown */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              {t("hyp.module_breakdown")}
              <span className="text-muted-foreground font-normal ml-2">{t("hyp.modules_count", { count: moduleRows.length })}</span>
            </p>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{totals.monthlyHours.toFixed(0)}h/mo · <strong className="text-emerald-600">€{fmtEur(totals.annual)}/yr</strong></p>
            </div>
          </div>

          <div className="space-y-2">
            {moduleRows.map(row => (
              <button
                key={row.moduleId}
                className="w-full text-left rounded-xl border overflow-hidden transition-shadow hover:shadow-sm bg-white/60"
                style={{ borderColor: row.color + "30", borderLeftWidth: 4, borderLeftColor: row.color }}
                onClick={() => setSelectedModuleId(row.moduleId)}
              >
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: row.color + "15" }}>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{row.label}</p>
                    {row.suggestion?.quote && (
                      <div className="flex items-start gap-1.5 mt-0.5">
                        <Quote className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/40" />
                        <p className="text-[11px] text-muted-foreground italic line-clamp-1">&ldquo;{row.suggestion.quote}&rdquo;</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {row.perStakeholder.filter(ps => ps.totalHours > 0).map(ps => {
                        const meta = STAKEHOLDER_META[ps.stakeholder];
                        const Icon = meta.icon;
                        return (
                          <span key={ps.stakeholder} className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Icon className="h-3 w-3" style={{ color: meta.color }} />
                            {ps.totalHours.toFixed(0)}h/mo
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground tabular-nums">{row.monthlyHours.toFixed(0)}h/mo</p>
                    <p className="text-sm font-bold tabular-nums text-emerald-600">€{fmtEur(row.annualMoney)}/yr</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Grand total */}
          <div className="rounded-xl border border-border bg-white/80 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{t("hyp.total_savings")}</span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold tabular-nums">{totals.monthlyHours.toFixed(0)}h/mo</span>
              <span className="text-lg font-bold tabular-nums text-emerald-600">€{fmtEur(totals.annual)}/yr</span>
            </div>
          </div>
        </section>
      </main>

      {/* Module detail popup */}
      <Dialog open={!!selectedRow} onOpenChange={(v) => { if (!v) setSelectedModuleId(null); }}>
        {selectedRow && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: selectedRow.color }} />
                {selectedRow.label}
              </DialogTitle>
            </DialogHeader>
            {selectedRow.suggestion?.quote && (
              <div className="flex items-start gap-2 px-1 -mt-1">
                <Quote className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground italic leading-relaxed">&ldquo;{selectedRow.suggestion.quote}&rdquo;</p>
              </div>
            )}
            <div className="space-y-3">
              {selectedRow.perStakeholder.filter(ps => ps.hoursPerPerson > 0).map(ps => {
                const meta = STAKEHOLDER_META[ps.stakeholder];
                const Icon = meta.icon;
                const desc = SAVINGS_DESCRIPTIONS[selectedRow.moduleId]?.[ps.stakeholder] ?? "";
                return (
                  <div key={ps.stakeholder} className="rounded-lg px-3 py-3" style={{ backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.color }}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-foreground">{t(meta.labelKey)}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" min={0} step={0.1}
                            className="w-16 h-8 text-center text-sm font-bold tabular-nums bg-white/80 border-border"
                            value={ps.hoursPerPerson}
                            onChange={e => setHoursOverride(selectedRow.moduleId, ps.stakeholder, parseFloat(e.target.value) || 0)}
                          />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t("hyp.h_pers_mo")}</span>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-emerald-600 w-24 text-right">€{fmtEur(ps.totalMoney * 12)}/yr</span>
                      </div>
                    </div>
                    {desc && (
                      <p className="text-[11px] text-muted-foreground mt-2 ml-10 leading-relaxed">{desc}</p>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-3 pt-2 border-t" style={{ borderColor: selectedRow.color + "15" }}>
                <span className="text-xs font-medium text-muted-foreground">{t("hyp.module_total")}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold tabular-nums">{selectedRow.monthlyHours.toFixed(0)}h/mo</span>
                  <span className="text-sm font-bold tabular-nums text-emerald-600">€{fmtEur(selectedRow.annualMoney)}/yr</span>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
