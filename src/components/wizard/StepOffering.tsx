import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Loader2,
  Plus,
  Presentation,
  FileDown,
  ExternalLink,
  Package,
  Star,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
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
}

function fmtEur(n: number): string {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
}

function getModuleColor(moduleId: string): string {
  return MODULE_CATALOG.find(m => m.id === moduleId)?.color ?? "#94A3B8";
}

export function StepOffering({
  country,
  seats,
  offering,
  selectedPains,
  painOverrides = {},
  sector = "",
  selectedModules = [],
  roiConfig,
  onChange,
  onModulesChange,
  sessionId,
  state,
}: Props) {
  const { t, i18n } = useTranslation();
  const [generatingPptx, setGeneratingPptx] = useState(false);
  const [pptxUrl, setPptxUrl] = useState<string | null>(null);

  // ── Data fetching ──
  const { data: bundles, isLoading: bundlesLoading } = useQuery({
    queryKey: ["bundles", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select("*")
        .eq("country", country);
      if (error) throw error;
      return data as BundleRow[];
    },
  });

  const { data: lineItems } = useQuery({
    queryKey: ["pricing_line_items", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing")
        .select("*")
        .eq("country", country)
        .eq("sku_type", "line_item");
      if (error) throw error;
      return data as PricingLineItem[];
    },
  });

  const { data: painModules } = useQuery({
    queryKey: ["pain_modules_for_offering"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pain_library")
        .select("pain_id, primary_module")
        .eq("is_archived", false);
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        pain_id: d.pain_id,
        primary_module: d.primary_module ?? "",
      })) as PainModuleEntry[];
    },
  });

  // ── Pain benefits map ──
  const painBenefits = useMemo(() => {
    const map: Record<string, number> = {};
    for (const painId of selectedPains) {
      map[painId] = painOverrides[painId]?.annual_benefit ?? 0;
    }
    return map;
  }, [selectedPains, painOverrides]);

  // ── Required modules from selection ──
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

  const requiredModuleKeys = useMemo(
    () => requiredModules.map(rm => rm.module),
    [requiredModules]
  );

  // ── Find Starter Operations and Recommended bundles ──
  const starterBundle = useMemo(() => {
    if (!bundles) return null;
    return bundles.find(b =>
      b.bundle_name.toLowerCase().includes("starter operations") ||
      b.bundle_name.toLowerCase().includes("starter op")
    ) ?? null;
  }, [bundles]);

  const recommendedBundle = useMemo(() => {
    if (!bundles || !lineItems || !painModules) return null;
    return findOptimalBundle(
      bundles, requiredModuleKeys, lineItems, offering.billing, offering.tier,
      seats, painModules, selectedPains, painBenefits
    );
  }, [bundles, lineItems, painModules, requiredModuleKeys, offering.billing, offering.tier, seats, selectedPains, painBenefits]);

  const starterAnalysis = useMemo(() => {
    if (!starterBundle || !lineItems || !painModules) return null;
    return analyzeBundle(
      starterBundle, requiredModuleKeys, lineItems, offering.billing, offering.tier,
      seats, painModules, selectedPains, painBenefits
    );
  }, [starterBundle, lineItems, painModules, requiredModuleKeys, offering.billing, offering.tier, seats, selectedPains, painBenefits]);

  // ── Selected pack state ──
  const selectedBundleId = offering.bundle_id ?? recommendedBundle?.bundle.id ?? null;
  const isStarterSelected = selectedBundleId === starterBundle?.id;

  const selectedAnalysis = useMemo(() => {
    if (isStarterSelected && starterAnalysis) return starterAnalysis;
    return recommendedBundle;
  }, [isStarterSelected, starterAnalysis, recommendedBundle]);

  // ── Add-on toggles for extra modules not in bundle ──
  const [addonToggles, setAddonToggles] = useState<Record<string, boolean>>({});
  const [addModuleOpen, setAddModuleOpen] = useState(false);

  useEffect(() => {
    if (!selectedAnalysis) return;
    const toggles: Record<string, boolean> = {};
    for (const mod of selectedAnalysis.uncoveredRequired) {
      toggles[mod] = offering.addon_lines?.find(a => a.module === mod)?.enabled ?? true;
    }
    setAddonToggles(toggles);
  }, [selectedAnalysis?.bundle.id]);

  // ── Compute full configuration ──
  const configuration = useMemo(() => {
    if (!selectedAnalysis || !lineItems || !painModules) return null;

    const painUncovered = selectedAnalysis.uncoveredRequired.filter(
      mod => !MODULES_INCLUDED_IN_CORE.has(mod)
    );

    const enabledAddons = painUncovered.filter(mod => addonToggles[mod] !== false);

    const addonLines: AddonLine[] = painUncovered.map(mod => {
      const details = getAddonDetails(mod, lineItems, offering.billing, offering.tier, selectedAnalysis.effectiveSeats);
      return {
        module: mod,
        label: moduleLabel(mod),
        architecture: details?.architecture ?? "Per seat",
        pepm: details?.pepm ?? 0,
        annual: details?.annual ?? 0,
        pains_solved: [],
        enabled: addonToggles[mod] !== false,
      };
    });

    const enabledAddonAnnual = addonLines.filter(a => a.enabled).reduce((s, a) => s + a.annual, 0);
    const totalAnnualCost = selectedAnalysis.bundleAnnual + enabledAddonAnnual;

    const configModules = [
      ...selectedAnalysis.bundleModules,
      ...enabledAddons,
    ];

    const { covered, uncovered } = classifyPains(selectedPains, painModules, configModules);
    const totalAnnualBenefit = covered.reduce((s, pid) => s + (painBenefits[pid] ?? 0), 0);
    const netRoi = totalAnnualBenefit - totalAnnualCost;
    const roiPct = totalAnnualCost > 0 ? (netRoi / totalAnnualCost) * 100 : 0;
    const paybackMonths = totalAnnualBenefit > 0 ? (totalAnnualCost / totalAnnualBenefit) * 12 : 0;

    return {
      bundleModules: selectedAnalysis.bundleModules,
      addonLines,
      totalAnnualCost,
      coveredPains: covered,
      uncoveredPains: uncovered,
      totalAnnualBenefit,
      netRoi,
      roiPct,
      paybackMonths,
      configModules,
    };
  }, [selectedAnalysis, addonToggles, lineItems, painModules, offering.billing, offering.tier, selectedPains, painBenefits]);

  // ── ROI savings from module hours (using roiConfig) ──
  const roiSavings = useMemo(() => {
    if (!roiConfig || !configuration) return { annual: 0, monthly: 0, monthlyHours: 0 };
    const { headcounts, hourly_costs } = roiConfig;
    let monthlyMoney = 0;
    let monthlyHours = 0;
    for (const modId of configuration.configModules) {
      const hours = getHoursForModule(modId);
      for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
        const h = hours[s] * headcounts[s];
        monthlyHours += h;
        monthlyMoney += h * hourly_costs[s];
      }
    }
    return { annual: monthlyMoney * 12, monthly: monthlyMoney, monthlyHours };
  }, [roiConfig, configuration]);

  // ── Write configuration to wizard state ──
  const configRef = useRef(configuration);
  const analysisRef = useRef(selectedAnalysis);
  configRef.current = configuration;
  analysisRef.current = selectedAnalysis;

  useEffect(() => {
    const cfg = configRef.current;
    const analysis = analysisRef.current;
    if (!analysis || !cfg) return;
    onChange({
      bundle_id: analysis.bundle.id,
      bundle_name: analysis.bundle.bundle_name,
      bundle_modules: analysis.bundleModules,
      bundle_pepm: analysis.bundlePepm,
      bundle_annual: analysis.bundleAnnual,
      addon_lines: cfg.addonLines,
      total_annual_cost: cfg.totalAnnualCost,
      covered_pains: cfg.coveredPains,
      uncovered_pains: cfg.uncoveredPains,
      total_annual_benefit: cfg.totalAnnualBenefit,
      net_roi: cfg.netRoi,
      roi_pct: cfg.roiPct,
      payback_months: cfg.paybackMonths,
    });
  }, [configuration, selectedAnalysis]);

  // ── Generate PPTX (1-pager ROI slide) ──
  const handleGeneratePptx = async () => {
    if (!sessionId || sessionId === "new") {
      toast.error("Please save the session first");
      return;
    }
    setGeneratingPptx(true);
    try {
      const { error: roiErr } = await supabase.functions.invoke("roi-engine", { body: { session_id: sessionId } });
      if (roiErr) throw roiErr;
      const { data, error } = await supabase.functions.invoke("generate-pptx", { body: { session_id: sessionId } });
      if (error) throw error;
      if (data?.pptx_url) {
        setPptxUrl(data.pptx_url);
        toast.success("ROI slide generated!");
      }
    } catch (err: any) {
      toast.error("Generation failed: " + err.message);
    } finally {
      setGeneratingPptx(false);
    }
  };

  function selectPack(bundleId: number) {
    onChange({ bundle_id: bundleId });
    setAddonToggles({});
  }

  function toggleModule(moduleId: string) {
    if (!onModulesChange) return;
    const next = selectedModules.includes(moduleId)
      ? selectedModules.filter(m => m !== moduleId)
      : [...selectedModules, moduleId];
    onModulesChange(next);
  }

  if (bundlesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bundles?.length) {
    return (
      <div className="flex justify-center py-12 text-muted-foreground text-sm">
        No bundles available for this country.
      </div>
    );
  }

  const allBundleModules = selectedAnalysis?.bundleModules ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Choose Your Pack</h2>
        <p className="text-sm text-muted-foreground mt-1">Select a pack and customize modules</p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${offering.billing === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Monthly
          </span>
          <Switch
            checked={offering.billing === "yearly"}
            onCheckedChange={(v) => onChange({ billing: v ? "yearly" : "monthly" })}
          />
          <span className={`text-xs ${offering.billing === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Yearly
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${offering.tier === "business" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => onChange({ tier: "business" })}
          >
            Business
          </button>
          <button
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${offering.tier === "enterprise" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => onChange({ tier: "enterprise" })}
          >
            Enterprise
          </button>
        </div>
      </div>

      {/* Two pack options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Starter Operations */}
        {starterAnalysis && (
          <button
            className={`text-left rounded-xl border-2 p-5 transition-all ${
              isStarterSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/40 hover:shadow-sm"
            }`}
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
              {starterAnalysis.bundleModules.map(m => (
                <Badge key={m} variant="secondary" className="text-[10px] font-normal">
                  {moduleLabel(m)}
                </Badge>
              ))}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{fmtEur(starterAnalysis.bundleAnnual)}</span>
              <span className="text-xs text-muted-foreground">EUR/year</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {starterAnalysis.bundlePepm.toFixed(2)} EUR/employee/month
            </p>
          </button>
        )}

        {/* Recommended Pack */}
        {recommendedBundle && (
          <button
            className={`text-left rounded-xl border-2 p-5 transition-all relative ${
              !isStarterSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/40 hover:shadow-sm"
            }`}
            onClick={() => selectPack(recommendedBundle.bundle.id)}
          >
            <div className="absolute -top-2.5 right-4">
              <Badge className="bg-emerald-500 text-white text-[10px] gap-1 border-0">
                <Star className="h-3 w-3" /> Recommended
              </Badge>
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
                const isRequired = requiredModuleKeys.includes(m);
                return (
                  <Badge
                    key={m}
                    variant="secondary"
                    className={`text-[10px] font-normal ${isRequired ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}`}
                  >
                    {isRequired && <Check className="h-2.5 w-2.5 mr-0.5" />}
                    {moduleLabel(m)}
                  </Badge>
                );
              })}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{fmtEur(recommendedBundle.bundleAnnual)}</span>
              <span className="text-xs text-muted-foreground">EUR/year</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {recommendedBundle.bundlePepm.toFixed(2)} EUR/employee/month
            </p>
          </button>
        )}
      </div>

      {/* Module toggles */}
      {selectedAnalysis && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Included Modules</p>
              <p className="text-xs text-muted-foreground">Click modules to add or remove them</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Bundle modules (always included, shown as active) */}
            {allBundleModules.map(modId => {
              const color = getModuleColor(modId);
              return (
                <div
                  key={modId}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium bg-accent/80 text-foreground cursor-default"
                  style={{ borderColor: color + "40" }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {moduleLabel(modId)}
                  <Check className="h-3 w-3 text-emerald-500" />
                </div>
              );
            })}

            {/* Selected modules not in bundle (toggleable) */}
            {selectedModules
              .filter(m => !allBundleModules.includes(m))
              .map(modId => {
                const color = getModuleColor(modId);
                const isInAddon = configuration?.addonLines.some(a => a.module === modId && a.enabled);
                return (
                  <button
                    key={modId}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 transition-colors"
                    onClick={() => toggleModule(modId)}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    {moduleLabel(modId)}
                    <X className="h-3 w-3" />
                  </button>
                );
              })}

            {/* Add more modules */}
            <Popover open={addModuleOpen} onOpenChange={setAddModuleOpen}>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  <Plus className="h-3 w-3" /> Add module
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 max-h-64 overflow-y-auto" align="start">
                <p className="text-[10px] text-muted-foreground px-2 py-1 mb-1">Click to add a module</p>
                {MODULE_CATALOG
                  .filter(m => !selectedModules.includes(m.id) && !allBundleModules.includes(m.id))
                  .map(m => (
                    <button
                      key={m.id}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2"
                      onClick={() => {
                        if (onModulesChange) {
                          onModulesChange([...selectedModules, m.id]);
                        }
                        setAddModuleOpen(false);
                      }}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </button>
                  ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Add-on pricing for modules not in bundle */}
          {configuration && configuration.addonLines.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Add-on pricing</p>
              {configuration.addonLines.map(addon => (
                <div key={addon.module} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={addon.enabled}
                      onCheckedChange={(v) => setAddonToggles(prev => ({ ...prev, [addon.module]: v }))}
                      className="scale-75"
                    />
                    <span className={addon.enabled ? "text-foreground" : "text-muted-foreground"}>{addon.label}</span>
                  </div>
                  <span className="font-medium tabular-nums">{fmtEur(addon.annual)} EUR/yr</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cost vs Savings comparison */}
      {configuration && (
        <>
          <Separator />
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Cost vs. Savings</p>

            <div className="grid grid-cols-2 gap-4">
              {/* Cost side */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Annual Cost</p>
                <p className="text-2xl font-bold tabular-nums text-foreground">{fmtEur(configuration.totalAnnualCost)} EUR</p>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{selectedAnalysis?.bundle.bundle_name}</span>
                    <span className="tabular-nums">{fmtEur(selectedAnalysis?.bundleAnnual ?? 0)}</span>
                  </div>
                  {configuration.addonLines.filter(a => a.enabled).map(a => (
                    <div key={a.module} className="flex justify-between">
                      <span>{a.label}</span>
                      <span className="tabular-nums">{fmtEur(a.annual)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Savings side */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Annual Savings</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600">{fmtEur(roiSavings.annual)} EUR</p>
                <div className="space-y-1 text-[11px] text-emerald-700/80">
                  <div className="flex justify-between">
                    <span>{roiSavings.monthlyHours.toFixed(0)} hours/month saved</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Across {configuration.configModules.length} modules</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net ROI bar */}
            {roiSavings.annual > 0 && (
              <div className={`rounded-lg px-4 py-3 flex items-center justify-between ${
                roiSavings.annual > configuration.totalAnnualCost
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-amber-50 border border-amber-200"
              }`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${
                    roiSavings.annual > configuration.totalAnnualCost ? "text-emerald-600" : "text-amber-600"
                  }`} />
                  <span className="text-sm font-semibold text-foreground">Net ROI</span>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold tabular-nums ${
                    roiSavings.annual > configuration.totalAnnualCost ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {fmtEur(roiSavings.annual - configuration.totalAnnualCost)} EUR
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({((roiSavings.annual - configuration.totalAnnualCost) / Math.max(configuration.totalAnnualCost, 1) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Generate 1-pager ROI slide */}
      <Separator />
      <div className="space-y-3">
        <Button
          className="w-full"
          size="lg"
          onClick={handleGeneratePptx}
          disabled={generatingPptx}
        >
          {generatingPptx ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
          ) : (
            <><Presentation className="h-4 w-4 mr-2" /> Generate 1-Pager ROI Slide</>
          )}
        </Button>

        {pptxUrl && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" size="lg" asChild>
              <a href={pptxUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> View
              </a>
            </Button>
            <Button variant="outline" className="flex-1" size="lg" asChild>
              <a href={pptxUrl} download={`ROI-${state?.prospect.company_name || "report"}.pptx`}>
                <FileDown className="h-4 w-4 mr-2" /> Download PPTX
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
