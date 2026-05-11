import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Check,
  X,
  Loader2,
  AlertTriangle,
  Lock,
  Info,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLocalizedPainStatement } from "@/lib/i18nHelpers";
import type { SelectedOffering, PainOverride, AddonLine } from "@/hooks/useWizardSession";
import {
  type BundleRow,
  type PricingLineItem,
  type PainModuleEntry,
  type AddonDetailsResult,
  canonicalModule,
  moduleLabel,
  parseModulesFromBundle,
  deriveRequiredModules,
  analyzeBundle,
  findOptimalBundle,
  validateConfiguration,
  getAddonDetails,
  classifyPains,
  getLineItemPrice,
  listAvailableAddonModules,
  MODULES_INCLUDED_IN_CORE,
} from "@/lib/offeringEngine";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
  onChange: (o: Partial<SelectedOffering>) => void;
}

export function StepOffering({
  country,
  seats,
  offering,
  selectedPains,
  painOverrides = {},
  sector = "",
  selectedModules = [],
  onChange,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) ?? "en";

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

  const { data: painLibraryFull } = useQuery({
    queryKey: ["pain_library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pain_library")
        .select("*")
        .eq("is_archived", false)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // ── Build pain benefits map from painOverrides (single source of truth from Quantify) ──
  const painBenefits = useMemo(() => {
    const map: Record<string, number> = {};
    for (const painId of selectedPains) {
      map[painId] = painOverrides[painId]?.annual_benefit ?? 0;
    }
    return map;
  }, [selectedPains, painOverrides]);

  // ── Required modules ──
  const requiredModules = useMemo(() => {
    if (selectedModules.length > 0) {
      const mods: ReturnType<typeof deriveRequiredModules> = [
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

  // ── Bundle analyses ──
  const bundleAnalyses = useMemo(() => {
    if (!bundles || !lineItems || !painModules) return [];
    return bundles
      .filter(b => {
        const pepm = offering.billing === "yearly"
          ? (offering.tier === "enterprise" ? b.enterprise_pepm_yearly : b.business_pepm_yearly)
          : (offering.tier === "enterprise" ? b.enterprise_pepm_monthly : b.business_pepm_monthly);
        return (pepm ?? 0) > 0;
      })
      .map(b =>
        analyzeBundle(
          b, requiredModuleKeys, lineItems, offering.billing, offering.tier,
          seats, painModules, selectedPains, painBenefits
        )
      )
      .sort((a, b) => a.bundlePepm - b.bundlePepm);
  }, [bundles, lineItems, painModules, requiredModuleKeys, offering.billing, offering.tier, seats, selectedPains, painBenefits]);

  // ── Optimal bundle (auto-select on first load) ──
  const optimalAnalysis = useMemo(() => {
    if (!bundles || !lineItems || !painModules) return null;
    return findOptimalBundle(
      bundles, requiredModuleKeys, lineItems, offering.billing, offering.tier,
      seats, painModules, selectedPains, painBenefits
    );
  }, [bundles, lineItems, painModules, requiredModuleKeys, offering.billing, offering.tier, seats, selectedPains, painBenefits]);

  // ── Selected bundle state ──
  const selectedBundleId = offering.bundle_id ?? optimalAnalysis?.bundle.id ?? null;

  const selectedAnalysis = useMemo(
    () => bundleAnalyses.find(a => a.bundle.id === selectedBundleId) ?? optimalAnalysis,
    [bundleAnalyses, selectedBundleId, optimalAnalysis]
  );

  // ── Add-on toggles ──
  const [addonToggles, setAddonToggles] = useState<Record<string, boolean>>({});
  // Extra modules added by seller (not pain-derived)
  const [extraModules, setExtraModules] = useState<string[]>([]);
  const [addModuleOpen, setAddModuleOpen] = useState(false);

  // Initialize addon toggles when selected bundle changes
  useEffect(() => {
    if (!selectedAnalysis) return;
    const toggles: Record<string, boolean> = {};
    for (const mod of selectedAnalysis.uncoveredRequired) {
      toggles[mod] = offering.addon_lines?.find(a => a.module === mod)?.enabled ?? true;
    }
    // Keep extra module toggles
    for (const mod of extraModules) {
      toggles[mod] = addonToggles[mod] ?? true;
    }
    setAddonToggles(toggles);
  }, [selectedAnalysis?.bundle.id]);

  // ── Compute full configuration ──
  const configuration = useMemo(() => {
    if (!selectedAnalysis || !lineItems || !painModules) return null;

    // Pain-required uncovered modules (not in bundle, not included-in-core)
    const painUncovered = selectedAnalysis.uncoveredRequired.filter(
      mod => !MODULES_INCLUDED_IN_CORE.has(mod)
    );
    // Combine with seller-added extra modules (exclude those already in bundle)
    const allAddonModules = [
      ...painUncovered,
      ...extraModules.filter(m =>
        !painUncovered.includes(m) && !selectedAnalysis.bundleModules.includes(m)
      ),
    ];

    const enabledAddons = allAddonModules.filter(
      mod => addonToggles[mod] !== false
    );

    const addonDetailsMap: Record<string, AddonDetailsResult> = {};
    const addonLines: AddonLine[] = allAddonModules.map(mod => {
      const details = getAddonDetails(mod, lineItems, offering.billing, offering.tier, selectedAnalysis.effectiveSeats);
      if (details) addonDetailsMap[mod] = details;
      const isPainRequired = painUncovered.includes(mod);
      return {
        module: mod,
        label: moduleLabel(mod),
        architecture: details?.architecture ?? "Per seat",
        pepm: details?.pepm ?? 0,
        annual: details?.annual ?? 0,
        pains_solved: isPainRequired ? (requiredModules.find(rm => rm.module === mod)?.painIds ?? []) : [],
        enabled: addonToggles[mod] !== false,
      };
    });

    const enabledAddonAnnual = addonLines.filter(a => a.enabled).reduce((s, a) => s + a.annual, 0);
    const totalAnnualCost = selectedAnalysis.bundleAnnual + enabledAddonAnnual;

    // All modules in configuration (bundle + core-included + enabled addons)
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
      addonDetailsMap,
      totalAnnualCost,
      coveredPains: covered,
      uncoveredPains: uncovered,
      totalAnnualBenefit,
      netRoi,
      roiPct,
      paybackMonths,
      configModules,
    };
  }, [selectedAnalysis, addonToggles, extraModules, lineItems, painModules, offering.billing, offering.tier, selectedPains, painBenefits, requiredModules]);

  // ── Constraint violations ──
  const violations = useMemo(() => {
    if (!selectedAnalysis || !lineItems || !configuration) return [];
    const enabledAddons = configuration.addonLines.filter(a => a.enabled).map(a => a.module);
    return validateConfiguration({
      bundleModules: selectedAnalysis.bundleModules,
      addonModules: enabledAddons,
      tier: offering.tier,
      seats,
      totalPepm: selectedAnalysis.bundlePepm + configuration.addonLines.filter(a => a.enabled).reduce((s, a) => s + a.pepm, 0),
      lineItems,
    });
  }, [selectedAnalysis, configuration, lineItems, offering.tier, seats]);

  // ── Write configuration to wizard state (ref-based to avoid stale closures) ──
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
  }, [configuration, selectedAnalysis, onChange]);

  const fmt = (n: number) =>
    n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
  const fmtDec = (n: number) =>
    n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

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
        {t("offering.no_bundles")}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("offering.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("offering.subtitle")}</p>
        </div>

        {/* Controls bar */}
        <div className="sticky top-14 z-10 bg-background/95 backdrop-blur py-3 -mx-4 px-4 border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${offering.billing === "monthly" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {t("offering.monthly")}
              </span>
              <Switch
                checked={offering.billing === "yearly"}
                onCheckedChange={(v) => onChange({ billing: v ? "yearly" : "monthly" })}
              />
              <span className={`text-xs ${offering.billing === "yearly" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {t("offering.yearly")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                className={`text-xs px-2 py-1 rounded ${offering.tier === "business" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => onChange({ tier: "business" })}
              >
                {t("offering.tier_business")}
              </button>
              <button
                className={`text-xs px-2 py-1 rounded ${offering.tier === "enterprise" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => onChange({ tier: "enterprise" })}
              >
                {t("offering.tier_enterprise")}
              </button>
            </div>
          </div>
        </div>

        {/* Constraint warnings */}
        {violations.length > 0 && (
          <div className="space-y-1.5">
            {violations.map((v, i) => (
              <div key={i} className={`flex items-start gap-2 rounded px-3 py-2 text-xs ${v.type === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"}`}>
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{v.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Section 1: Required modules */}
        <Card>
          <CardContent className="py-4 px-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("offering.required_modules")}</h3>
            <div className="flex flex-wrap gap-2">
              {requiredModules.map(rm => {
                const includedInCore = MODULES_INCLUDED_IN_CORE.has(rm.module);
                return (
                  <Tooltip key={rm.module}>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium bg-accent text-foreground cursor-default">
                        <span>{rm.label}</span>
                        {includedInCore && (
                          <span className="text-[10px] text-muted-foreground">(in Core)</span>
                        )}
                        {rm.totalBenefit > 0 && (
                          <span className="text-emerald-600 font-semibold">{fmt(rm.totalBenefit)} EUR</span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        {rm.painIds.length > 0
                          ? `Solves ${rm.painIds.length} pain${rm.painIds.length > 1 ? "s" : ""}: ${rm.painIds.join(", ")}`
                          : "Core module (mandatory)"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Bundle picker */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">{t("offering.pick_bundle")}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">{t("offering.bundle_name")}</TableHead>
                  <TableHead className="text-center">{t("offering.pepm")}</TableHead>
                  <TableHead className="text-center">{t("offering.annual_cost")}</TableHead>
                  <TableHead className="text-center">{t("offering.modules_covered")}</TableHead>
                  <TableHead className="text-center">{t("offering.missing_modules")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundleAnalyses.map(analysis => {
                  const isSelected = analysis.bundle.id === selectedBundleId;
                  const isOptimal = analysis.bundle.id === optimalAnalysis?.bundle.id;
                  return (
                    <TableRow
                      key={analysis.bundle.id}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"}`}
                      onClick={() => {
                        onChange({ bundle_id: analysis.bundle.id, bundle_name: analysis.bundle.bundle_name });
                        setAddonToggles({});
                      }}
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {analysis.bundle.bundle_name}
                          </span>
                          {isOptimal && (
                            <Badge variant="secondary" className="text-[9px] bg-emerald-100 text-emerald-700 border-0">
                              {t("offering.recommended")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-xs font-medium">{fmtDec(analysis.bundlePepm)} EUR</span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-xs">{fmt(analysis.bundleAnnual)} EUR</span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <div className="flex flex-wrap justify-center gap-0.5">
                          {requiredModuleKeys.filter(m => analysis.bundleModules.includes(m)).map(m => (
                            <span key={m} className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                              <Check className="h-3 w-3" />
                              {moduleLabel(m)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {analysis.uncoveredRequired.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground">--</span>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-0.5">
                            {analysis.uncoveredRequired.map(m => (
                              <span key={m} className="text-[10px] text-amber-600">{moduleLabel(m)}</span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 3: Additional modules (add-ons + extra) */}
        {selectedAnalysis && configuration && (
          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t("offering.addons")}</h3>
                  <p className="text-xs text-muted-foreground">{t("offering.addons_subtitle")}</p>
                </div>
                <Popover open={addModuleOpen} onOpenChange={setAddModuleOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                      <Plus className="h-3.5 w-3.5" />
                      {t("offering.add_module")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2 max-h-64 overflow-y-auto" align="end">
                    <p className="text-[10px] text-muted-foreground px-2 py-1 mb-1">{t("offering.add_module_hint")}</p>
                    {lineItems && (() => {
                      const currentModules = [
                        ...(selectedAnalysis?.bundleModules ?? []),
                        ...configuration.addonLines.map(a => a.module),
                      ];
                      const available = listAvailableAddonModules(lineItems, currentModules);
                      if (available.length === 0) {
                        return <p className="text-xs text-muted-foreground px-2 py-1">No additional modules available</p>;
                      }
                      return available.map(m => (
                        <button
                          key={m.module}
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                          onClick={() => {
                            setExtraModules(prev => [...prev, m.module]);
                            setAddonToggles(prev => ({ ...prev, [m.module]: true }));
                            setAddModuleOpen(false);
                          }}
                        >
                          {m.label}
                        </button>
                      ));
                    })()}
                  </PopoverContent>
                </Popover>
              </div>

              {configuration.addonLines.length > 0 && (
                <div className="space-y-2">
                  {configuration.addonLines.map(addon => {
                    const painNames = addon.pains_solved
                      .map(pid => {
                        const p = painLibraryFull?.find((pl: any) => pl.pain_id === pid);
                        return p ? getLocalizedPainStatement(p, lang) : pid;
                      })
                      .map(s => s.length > 40 ? s.slice(0, 37) + "..." : s);
                    const benefit = addon.pains_solved.reduce((s, pid) => s + (painBenefits[pid] ?? 0), 0);
                    const isExtra = extraModules.includes(addon.module);
                    const isCostOnly = addon.pains_solved.length === 0;
                    const details = configuration.addonDetailsMap[addon.module];

                    return (
                      <div
                        key={addon.module}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${addon.enabled ? "bg-background border-border" : "bg-muted/30 border-border/50 opacity-60"}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Switch
                            checked={addon.enabled}
                            onCheckedChange={(v) => setAddonToggles(prev => ({ ...prev, [addon.module]: v }))}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">{addon.label}</span>
                              <span className="text-[10px] text-muted-foreground">{addon.architecture}</span>
                              {isExtra && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1">
                                  {t("offering.extra")}
                                </Badge>
                              )}
                            </div>
                            {painNames.length > 0 ? (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                Solves: {painNames.join(", ")}
                              </p>
                            ) : isCostOnly && (
                              <p className="text-[10px] text-amber-600 mt-0.5">
                                {t("offering.cost_only")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right shrink-0">
                            {details?.isTiered ? (
                              <>
                                <p className="text-xs font-medium">{fmt(details.fixedFeeAnnual ?? 0)} EUR/yr + {fmtDec(details.userPepm ?? 0)} EUR/user/mo</p>
                                <p className="text-[10px] text-muted-foreground">{fmt(addon.annual)} EUR{t("offering.per_year")}</p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-medium">{fmtDec(addon.pepm)} EUR {t("offering.pepm")}</p>
                                <p className="text-[10px] text-muted-foreground">{fmt(addon.annual)} EUR{t("offering.per_year")}</p>
                              </>
                            )}
                            {benefit > 0 && (
                              <p className="text-[10px] text-emerald-600 font-medium">+{fmt(benefit)} EUR benefit</p>
                            )}
                          </div>
                          {isExtra && (
                            <button
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => {
                                setExtraModules(prev => prev.filter(m => m !== addon.module));
                                setAddonToggles(prev => {
                                  const next = { ...prev };
                                  delete next[addon.module];
                                  return next;
                                });
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {configuration.addonLines.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">{t("offering.no_addons_needed")}</p>
              )}

              {/* Warning for disabled add-ons */}
              {configuration.uncoveredPains.length > 0 && (
                <div className="flex items-start gap-2 rounded px-3 py-2 text-xs bg-amber-50 text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {configuration.uncoveredPains.length} pain{configuration.uncoveredPains.length > 1 ? "s" : ""} not covered by this configuration. Their benefit is not counted.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 4: Summary bar */}
        {configuration && (
          <>
            <Separator />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="py-3 px-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("offering.annual_cost")}</p>
                  <p className="text-sm font-bold text-foreground">{fmt(configuration.totalAnnualCost)} EUR</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("review.total_benefit")}</p>
                  <p className="text-sm font-bold text-emerald-600">{fmt(configuration.totalAnnualBenefit)} EUR</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("review.net_roi")}</p>
                  <p className={`text-sm font-bold ${configuration.netRoi >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {fmt(configuration.netRoi)} EUR
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-3 text-center">
                  <p className="text-[10px] text-muted-foreground">{t("offering.payback")}</p>
                  <p className="text-sm font-bold text-foreground">
                    {configuration.paybackMonths > 0 ? `${configuration.paybackMonths.toFixed(1)} ${t("offering.months")}` : "--"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ROI % highlight */}
            <div className="flex items-center justify-center gap-2 text-center">
              <span className="text-xs text-muted-foreground">{t("review.roi_pct")}:</span>
              <span className={`text-lg font-bold ${configuration.roiPct >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {configuration.roiPct.toFixed(0)}%
              </span>
            </div>
          </>
        )}

        {/* Module breakdown: bundle modules + included extras */}
        {selectedAnalysis && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {selectedAnalysis.bundle.bundle_name} -- {t("offering.modules_included")}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedAnalysis.bundleModules.map(m => {
                  const isRequired = requiredModuleKeys.includes(m);
                  return (
                    <Badge
                      key={m}
                      variant="secondary"
                      className={`text-[10px] font-normal ${isRequired ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "opacity-60"}`}
                    >
                      {isRequired && <Check className="h-2.5 w-2.5 mr-0.5" />}
                      {moduleLabel(m)}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
