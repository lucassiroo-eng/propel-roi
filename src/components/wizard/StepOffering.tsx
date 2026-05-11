import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check, X, Loader2, Plus, Presentation, FileDown,
  ExternalLink, Package, Star, TrendingUp, Save, Eye,
} from "lucide-react";
import { toast } from "sonner";
import type { SelectedOffering, PainOverride, AddonLine, RoiConfig, WizardState } from "@/hooks/useWizardSession";
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
  roiConfig?: RoiConfig;
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

const STAKEHOLDER_META: Record<Stakeholder, { label: string; color: string }> = {
  employee: { label: "Employees", color: "#3B82F6" },
  hr:       { label: "HR / Finance", color: "#10B981" },
  manager:  { label: "Managers", color: "#F59E0B" },
};

export function StepOffering({
  country, seats, offering, selectedPains, painOverrides = {},
  sector = "", selectedModules = [], roiConfig, onChange,
  onModulesChange, sessionId, state, onSave, onSaveAndExit,
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
  const netRoiValue = roiSavings.annual - (configuration?.totalAnnualCost ?? 0);
  const roiPositive = netRoiValue >= 0;

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
      {/* INVOICE: Cost + Savings + ROI              */}
      {/* ═══════════════════════════════════════════ */}
      {configuration && (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Cost section */}
          <div className="px-5 py-4 space-y-2 bg-white/50">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Annual Cost</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">{selectedAnalysis?.bundle.bundle_name}</span>
                <span className="font-medium tabular-nums">{fmtEur(selectedAnalysis?.bundleAnnual ?? 0)} EUR</span>
              </div>
              {configuration.addonLines.map(a => (
                <div key={a.module} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">+ {a.label}</span>
                  <span className="font-medium tabular-nums">{fmtEur(a.annual)} EUR</span>
                </div>
              ))}
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-sm font-bold">
              <span>Total cost</span>
              <span className="tabular-nums">{fmtEur(configuration.totalAnnualCost)} EUR/year</span>
            </div>
          </div>

          {/* Savings section */}
          <div className="px-5 py-4 space-y-2 bg-emerald-50/50 border-t border-border">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Annual Savings (time recovered)</p>
            <div className="space-y-1.5">
              {roiSavings.perModule.map(mod => (
                <div key={mod.moduleId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.color }} />
                    <span className="text-emerald-800">{mod.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-emerald-600/70 tabular-nums">{mod.monthlyHours.toFixed(0)}h/mo</span>
                    <span className="font-medium tabular-nums text-emerald-700 w-24 text-right">{fmtEur(mod.annualMoney)} EUR</span>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-2 bg-emerald-200" />
            <div className="flex justify-between text-sm font-bold text-emerald-700">
              <span>Total savings</span>
              <span className="tabular-nums">{fmtEur(roiSavings.annual)} EUR/year</span>
            </div>
          </div>

          {/* ROI section */}
          <div className={`px-5 py-4 border-t border-border ${roiPositive ? "bg-emerald-100/60" : "bg-amber-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className={`h-5 w-5 ${roiPositive ? "text-emerald-600" : "text-amber-600"}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Net ROI</p>
                  <p className={`text-xl font-bold tabular-nums ${roiPositive ? "text-emerald-600" : "text-amber-600"}`}>{fmtEur(netRoiValue)} EUR</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold tabular-nums ${roiPositive ? "text-emerald-600" : "text-amber-600"}`}>
                  {configuration.totalAnnualCost > 0 ? Math.round((roiSavings.annual / configuration.totalAnnualCost) * 100) : 0}%
                </p>
                <p className="text-[10px] text-muted-foreground">ROI</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* ACTION BUTTONS                             */}
      {/* ═══════════════════════════════════════════ */}
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" size="lg" onClick={() => setHypothesisOpen(true)} className="gap-2">
            <Eye className="h-4 w-4" />
            Hypothesis
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

      {/* Hypothesis dialog — detailed ROI breakdown */}
      <HypothesisDialog
        open={hypothesisOpen}
        onClose={() => setHypothesisOpen(false)}
        roiConfig={roiConfig}
        configModules={configuration?.configModules ?? []}
      />
    </div>
  );
}

// ── Hypothesis Dialog: detailed module × stakeholder breakdown ──
function HypothesisDialog({ open, onClose, roiConfig, configModules }: {
  open: boolean;
  onClose: () => void;
  roiConfig?: RoiConfig;
  configModules: string[];
}) {
  if (!roiConfig) return null;
  const { headcounts, hourly_costs } = roiConfig;

  const rows = configModules.map(moduleId => {
    const catalog = MODULE_CATALOG.find(m => m.id === moduleId);
    const hours = getHoursForModule(moduleId);
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
    return { moduleId, label, color, perStakeholder, monthlyHours, annualMoney };
  }).filter(r => r.monthlyHours > 0);

  const totals = {
    monthlyHours: rows.reduce((s, r) => s + r.monthlyHours, 0),
    annual: rows.reduce((s, r) => s + r.annualMoney, 0),
  };

  const fmt = (n: number) => n.toLocaleString("en", { maximumFractionDigits: 1 });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>ROI Hypothesis — Time & Cost Breakdown</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Assumptions */}
            <div className="grid grid-cols-3 gap-3">
              {(["employee", "hr", "manager"] as Stakeholder[]).map(s => (
                <div key={s} className="rounded-lg border border-border px-3 py-2 text-center">
                  <p className="text-xs font-semibold" style={{ color: STAKEHOLDER_META[s].color }}>{STAKEHOLDER_META[s].label}</p>
                  <p className="text-lg font-bold tabular-nums">{headcounts[s]}</p>
                  <p className="text-[10px] text-muted-foreground">@ €{hourly_costs[s]}/h</p>
                </div>
              ))}
            </div>

            {/* Detailed table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold text-foreground">Module</th>
                    {(["employee", "hr", "manager"] as Stakeholder[]).map(s => (
                      <th key={s} className="text-right px-2 py-2 font-semibold whitespace-nowrap" style={{ color: STAKEHOLDER_META[s].color }}>{STAKEHOLDER_META[s].label}</th>
                    ))}
                    <th className="text-right px-2 py-2 font-semibold">h/mo</th>
                    <th className="text-right px-3 py-2 font-semibold">€/year</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.moduleId} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="font-medium">{row.label}</span>
                        </div>
                      </td>
                      {row.perStakeholder.map(ps => (
                        <td key={ps.stakeholder} className="text-right px-2 py-2 tabular-nums text-muted-foreground">
                          {ps.hoursPerPerson > 0 ? `${fmt(ps.totalHours)}h` : <span className="opacity-30">—</span>}
                        </td>
                      ))}
                      <td className="text-right px-2 py-2 font-medium tabular-nums">{fmt(row.monthlyHours)}</td>
                      <td className="text-right px-3 py-2 font-semibold tabular-nums text-emerald-600">€{Math.round(row.annualMoney).toLocaleString("en")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50">
                    <td className="px-3 py-2.5 font-bold" colSpan={4}>Total</td>
                    <td className="text-right px-2 py-2.5 font-bold tabular-nums">{fmt(totals.monthlyHours)}</td>
                    <td className="text-right px-3 py-2.5 font-bold tabular-nums text-emerald-600">€{Math.round(totals.annual).toLocaleString("en")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
