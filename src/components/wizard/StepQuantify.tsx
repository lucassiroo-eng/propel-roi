import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, ChevronDown, ChevronRight, Plus, X, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { evaluateFormula, extractFormulaVarKeys } from "@/lib/painFormulas";
import { getPersonaConfig, getSubGroupConfig, SUB_GROUP_ORDER } from "@/lib/personaConfig";
import { getLocalizedPainStatement } from "@/lib/i18nHelpers";
import type { PainOverride } from "@/hooks/useWizardSession";
import type { CustomPain, HubSpotNote } from "@/hooks/useWizardSession";

interface Props {
  selectedPains: string[];
  painOverrides: Record<string, PainOverride>;
  country: string;
  seats: number;
  onOverride: (painId: string, override: PainOverride) => void;
  customPains?: CustomPain[];
  onAddCustomPain?: (pain: CustomPain) => void;
  onRemoveCustomPain?: (id: string) => void;
  hubspotNotes?: HubSpotNote[];
}

function getLangKey(lang: string): "label_en" | "label_es" | "label_fr" {
  if (lang.startsWith("es")) return "label_es";
  if (lang.startsWith("fr")) return "label_fr";
  return "label_en";
}

const OPERATOR_SYMBOL: Record<string, string> = {
  "*": "×",
  "/": "÷",
  "+": "+",
  "-": "−",
};

/** Variable source type for color coding */
type VarSource = "automatic" | "notes" | "manual";

interface NotesMatch {
  value: number;
  sentence: string;
}

export function StepQuantify({ selectedPains, painOverrides, country, seats, onOverride, customPains = [], onAddCustomPain, onRemoveCustomPain, hubspotNotes = [] }: Props) {
  const { t, i18n } = useTranslation();
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [showAddPain, setShowAddPain] = useState(false);
  const [newPainTitle, setNewPainTitle] = useState("");
  const [newPainSavings, setNewPainSavings] = useState("");
  const [newPainModules, setNewPainModules] = useState("");
  const [notesMatches, setNotesMatches] = useState<Record<string, NotesMatch>>({});
  const [notesLoading, setNotesLoading] = useState(false);
  const notesAnalysedRef = useRef(false);

  const langKey = getLangKey(i18n.language);

  const { data: pains, isLoading: painsLoading } = useQuery({
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

  const { data: formulaVars, isLoading: varsLoading } = useQuery({
    queryKey: ["pain_formula_vars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pain_formula_vars")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Global var map keyed by var_key (cross-pain lookup)
  const allVarsMap = useMemo(() => {
    const map: Record<string, (typeof formulaVars extends (infer T)[] | null | undefined ? T : never)> = {};
    for (const v of formulaVars ?? []) {
      map[v.var_key] = v;
    }
    return map;
  }, [formulaVars]);

  // Keep varsByPain for expanded card rendering (shows vars owned by this pain)
  const varsByPain = useMemo(() => {
    const map: Record<string, typeof formulaVars> = {};
    for (const v of formulaVars ?? []) {
      if (!map[v.pain_id]) map[v.pain_id] = [];
      map[v.pain_id]!.push(v);
    }
    return map;
  }, [formulaVars]);

  const selected = (pains ?? []).filter(p => selectedPains.includes(p.pain_id));

  // Collect all manual variables used by selected pains for notes analysis
  const manualVarsForNotes = useMemo(() => {
    if (!formulaVars || selected.length === 0) return [];
    const allKeys = new Set<string>();
    for (const pain of selected) {
      const keys = extractFormulaVarKeys(pain.formula_expression ?? "");
      keys.forEach(k => allKeys.add(k));
    }
    return Array.from(allKeys)
      .map(k => allVarsMap[k])
      .filter(v => v && v.auto_manual === "manual" && v.source !== "prospect")
      .map(v => ({
        var_key: v!.var_key,
        label: v![langKey],
        unit: v!.unit,
      }));
  }, [formulaVars, selected, allVarsMap, langKey]);

  // Analyse notes when entering the step
  useEffect(() => {
    if (notesAnalysedRef.current) return;
    if (!hubspotNotes || hubspotNotes.length === 0) return;
    if (manualVarsForNotes.length === 0) return;

    notesAnalysedRef.current = true;
    const notesText = hubspotNotes.map(n => n.body).join("\n\n");

    setNotesLoading(true);
    supabase.functions
      .invoke("ai-extract-notes-variables", {
        body: {
          notes: notesText,
          variables: manualVarsForNotes,
          language: i18n.language.slice(0, 2),
        },
      })
      .then(({ data, error }) => {
        if (error) {
          console.error("Notes extraction error:", error);
          return;
        }
        const matches: Record<string, NotesMatch> = {};
        for (const m of data?.matches ?? []) {
          if (m.var_key && typeof m.value === "number" && m.sentence) {
            matches[m.var_key] = { value: m.value, sentence: m.sentence };
          }
        }
        setNotesMatches(matches);
      })
      .finally(() => setNotesLoading(false));
  }, [hubspotNotes, manualVarsForNotes, i18n.language]);

  // Group pains by persona → sub_group
  const PERSONA_ORDER = ["people_ops", "hr_director", "finance", "c_level"];
  const groupedPains = useMemo(() => {
    const map: Record<string, Record<string, typeof selected>> = {};
    for (const p of selected) {
      const persona = p.persona || "other";
      const subGroup = (p as any).sub_group || "other";
      if (!map[persona]) map[persona] = {};
      if (!map[persona][subGroup]) map[persona][subGroup] = [];
      map[persona][subGroup].push(p);
    }
    return map;
  }, [selected]);

  if (painsLoading || varsLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  function getCountryDefault(v: any): number {
    if (country === "FR") return v.default_value_fr ?? v.default_value_other ?? 0;
    if (country === "ES") return v.default_value_es ?? v.default_value_other ?? 0;
    return v.default_value_other ?? v.default_value_es ?? 0;
  }

  /** Determine the source type for a variable */
  function getVarSource(varKey: string): VarSource {
    const varDef = allVarsMap[varKey];
    if (!varDef) return "manual";
    if (varDef.auto_manual === "automatic" || varDef.source === "prospect") return "automatic";
    if (notesMatches[varKey]) return "notes";
    return "manual";
  }

  /** Get the default value for a variable following the waterfall: user override > notes > country default */
  function getWaterfallDefault(varKey: string): number {
    const varDef = allVarsMap[varKey];
    if (!varDef) return 0;
    // For prospect-sourced vars, always use seats
    if (varDef.source === "prospect") return seats;
    // For automatic vars, use country default
    if (varDef.auto_manual === "automatic") return getCountryDefault(varDef);
    // For manual vars, check notes first
    if (notesMatches[varKey]) return notesMatches[varKey].value;
    // Fallback to country default
    return getCountryDefault(varDef);
  }

  /** Resolve all variables referenced in a pain's formula using global lookup */
  function resolveVars(painId: string, pain: any): Record<string, number> {
    const expr = pain.formula_expression ?? "";
    const varKeys = extractFormulaVarKeys(expr);
    const override = painOverrides[painId];
    const resolved: Record<string, number> = {};

    for (const key of varKeys) {
      // 1. User override from expandedVars
      if (override?.expandedVars?.[key] !== undefined) {
        resolved[key] = override.expandedVars[key];
        continue;
      }
      // 2. Headline override from slider
      const varDef = allVarsMap[key];
      if (varDef?.is_headline && override?.value !== undefined) {
        const painOwnVars = varsByPain[painId] ?? [];
        const isOwnHeadline = painOwnVars.some(v => v.var_key === key && v.is_headline);
        if (isOwnHeadline) {
          resolved[key] = override.value;
          continue;
        }
      }
      // 3. Waterfall default
      resolved[key] = getWaterfallDefault(key);
    }
    return resolved;
  }

  /** Find the correct headline var for a pain */
  function findHeadlineVar(painId: string, pain: any) {
    const expr = pain.formula_expression ?? "";
    const varKeys = extractFormulaVarKeys(expr);
    const painOwnVars = varsByPain[painId] ?? [];
    for (const key of varKeys) {
      const v = painOwnVars.find(pv => pv.var_key === key);
      if (v?.is_headline && v.source !== "prospect") return v;
    }
    for (const key of varKeys) {
      const v = painOwnVars.find(pv => pv.var_key === key);
      if (v?.is_headline) return v;
    }
    return painOwnVars[0] ?? null;
  }

  function computeBenefit(pain: any): number {
    const expr = pain.formula_expression;
    if (!expr) return 0;
    const vars = resolveVars(pain.pain_id, pain);
    return evaluateFormula(expr, vars);
  }

  const totalFromPains = selected.reduce((sum, pain) => sum + computeBenefit(pain), 0);
  const totalFromCustom = customPains.reduce((sum, cp) => sum + cp.annual_savings, 0);
  const totalBenefit = totalFromPains + totalFromCustom;

  function handleHeadlineChange(pain: any, newVal: number) {
    const headlineVar = findHeadlineVar(pain.pain_id, pain);
    const headlineKey = headlineVar?.var_key ?? "var_a";
    const benefit = (() => {
      const expr = pain.formula_expression;
      if (!expr) return newVal * seats;
      const resolved = resolveVars(pain.pain_id, pain);
      resolved[headlineKey] = newVal;
      return evaluateFormula(expr, resolved);
    })();
    const existing = painOverrides[pain.pain_id];
    onOverride(pain.pain_id, {
      value: newVal,
      annual_benefit: benefit,
      expandedVars: existing?.expandedVars ? { ...existing.expandedVars, [headlineKey]: newVal } : undefined,
    });
  }

  function handleExpandedVarChange(pain: any, varKey: string, newVal: number) {
    const existing = painOverrides[pain.pain_id];
    const currentVars = resolveVars(pain.pain_id, pain);
    const updatedVars = { ...currentVars, [varKey]: newVal };
    const expr = pain.formula_expression ?? "";
    const benefit = evaluateFormula(expr, updatedVars);
    const headlineVar = findHeadlineVar(pain.pain_id, pain);
    const headlineKey = headlineVar?.var_key ?? "var_a";
    onOverride(pain.pain_id, {
      value: updatedVars[headlineKey] ?? existing?.value ?? 0,
      annual_benefit: benefit,
      expandedVars: updatedVars,
    });

    // Propagate to all other pains whose formula references this var_key
    for (const otherPain of selected) {
      if (otherPain.pain_id === pain.pain_id) continue;
      const otherFormulaKeys = extractFormulaVarKeys(otherPain.formula_expression ?? "");
      if (!otherFormulaKeys.includes(varKey)) continue;
      const otherExisting = painOverrides[otherPain.pain_id];
      const otherResolved = resolveVars(otherPain.pain_id, otherPain);
      const otherUpdated = { ...otherResolved, [varKey]: newVal };
      if (otherExisting?.expandedVars) {
        Object.assign(otherUpdated, otherExisting.expandedVars, { [varKey]: newVal });
      }
      const otherExpr = otherPain.formula_expression ?? "";
      const otherBenefit = evaluateFormula(otherExpr, otherUpdated);
      const otherHeadline = findHeadlineVar(otherPain.pain_id, otherPain);
      const otherHeadlineKey = otherHeadline?.var_key ?? "var_a";
      onOverride(otherPain.pain_id, {
        value: otherUpdated[otherHeadlineKey] ?? otherExisting?.value ?? 0,
        annual_benefit: otherBenefit,
        expandedVars: otherUpdated,
      });
    }
  }

  function ensureExpandedVars(pain: any) {
    const existing = painOverrides[pain.pain_id];
    if (!existing?.expandedVars) {
      const resolved = resolveVars(pain.pain_id, pain);
      const expr = pain.formula_expression ?? "";
      const benefit = evaluateFormula(expr, resolved);
      const headlineVar = findHeadlineVar(pain.pain_id, pain);
      const headlineKey = headlineVar?.var_key ?? "var_a";
      onOverride(pain.pain_id, {
        value: resolved[headlineKey] ?? existing?.value ?? 0,
        annual_benefit: benefit,
        expandedVars: resolved,
      });
    }
  }

  function handleAddCustomPain() {
    if (!newPainTitle.trim() || !newPainSavings) return;
    onAddCustomPain?.({
      id: `custom_${Date.now()}`,
      title: newPainTitle.trim(),
      annual_savings: parseFloat(newPainSavings) || 0,
      modules: newPainModules.split(",").map(m => m.trim()).filter(Boolean),
    });
    setNewPainTitle("");
    setNewPainSavings("");
    setNewPainModules("");
    setShowAddPain(false);
  }

  /** Get input styling based on variable source */
  function getInputStyle(source: VarSource): string {
    switch (source) {
      case "automatic":
        return "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200";
      case "notes":
        return "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-800 dark:text-green-200";
      case "manual":
      default:
        return "";
    }
  }

  const locale = i18n.language.startsWith("es") ? "es-ES" : i18n.language.startsWith("fr") ? "fr-FR" : "en-GB";

  return (
    <div className="space-y-6">
      {/* Header with total benefit */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("quantify.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("quantify.subtitle")}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("quantify.total_annual")}</p>
          <p className="text-3xl font-bold text-primary leading-none mt-0.5">
            &euro;{totalBenefit.toLocaleString(locale, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
          <span className="text-[11px] text-muted-foreground">{t("quantify.legend_automatic")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
          <span className="text-[11px] text-muted-foreground">{t("quantify.legend_from_notes")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-background border border-border" />
          <span className="text-[11px] text-muted-foreground">{t("quantify.legend_manual")}</span>
        </div>
        {notesLoading && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[11px]">{t("quantify.analysing_notes")}</span>
          </div>
        )}
      </div>

      {/* Pain cards grouped by persona → sub_group */}
      <div className="space-y-5">
        {Object.keys(groupedPains)
          .sort((a, b) => (PERSONA_ORDER.indexOf(a) === -1 ? 99 : PERSONA_ORDER.indexOf(a)) - (PERSONA_ORDER.indexOf(b) === -1 ? 99 : PERSONA_ORDER.indexOf(b)))
          .map(persona => {
          const { color, Icon, i18nKey } = getPersonaConfig(persona);
          const subGroups = groupedPains[persona];
          const sortedSubs = Object.keys(subGroups).sort(
            (a, b) => (SUB_GROUP_ORDER.indexOf(a) === -1 ? 99 : SUB_GROUP_ORDER.indexOf(a)) - (SUB_GROUP_ORDER.indexOf(b) === -1 ? 99 : SUB_GROUP_ORDER.indexOf(b))
          );

          return (
            <div key={persona} className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: color, color: "#fff" }}
                >
                  <Icon className="h-3 w-3" />
                  {t(i18nKey)}
                </span>
              </div>

              {sortedSubs.map(subGroup => {
                const { Icon: SubIcon, i18nKey: subI18n } = getSubGroupConfig(subGroup);
                const subItems = subGroups[subGroup];

                return (
                  <div key={subGroup} className="space-y-1.5">
                    <div className="flex items-center gap-1.5 pl-1">
                      <SubIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t(subI18n)}
                      </span>
                    </div>

                    {subItems.map(pain => {
                const hlVar = findHeadlineVar(pain.pain_id, pain);
                const headlineDefault = hlVar ? getWaterfallDefault(hlVar.var_key) : 0;
                const currentVal = painOverrides[pain.pain_id]?.value ?? headlineDefault;
                const annualBenefit = computeBenefit(pain);
                const isOpen = openCards[pain.pain_id] || false;
                const resolvedVars = resolveVars(pain.pain_id, pain);
                const hlSource = hlVar ? getVarSource(hlVar.var_key) : "manual";

                return (
                  <Collapsible
                    key={pain.pain_id}
                    open={isOpen}
                    onOpenChange={(open) => {
                      if (open) ensureExpandedVars(pain);
                      setOpenCards(prev => ({ ...prev, [pain.pain_id]: open }));
                    }}
                  >
                    <Card
                      className="overflow-hidden"
                      style={{ borderLeft: `4px solid ${color}` }}
                    >
                      <CardContent className="py-0 px-0">
                        <CollapsibleTrigger asChild>
                          <button className="w-full px-4 py-2.5 text-left hover:bg-muted/30 transition-colors">
                            <div className="grid items-center gap-2" style={{ gridTemplateColumns: "minmax(0, 1fr) 7rem minmax(0, 15rem) auto" }}>
                              {/* Title */}
                              <p className="text-sm font-medium text-foreground leading-snug min-w-0 truncate">
                                {getLocalizedPainStatement(pain, i18n.language)}
                              </p>
                              {/* Input with unit inside + color coding */}
                              {(() => {
                                const unit = hlVar?.unit ?? "";
                                return (
                                  <div className="relative inline-flex items-center">
                                    <Input
                                      type="number"
                                      className={`h-7 text-sm font-medium w-full text-right pr-12 ${getInputStyle(hlSource)}`}
                                      value={currentVal}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={e => { e.stopPropagation(); handleHeadlineChange(pain, parseFloat(e.target.value) || 0); }}
                                    />
                                    {unit && (
                                      <span className="absolute right-2 text-[10px] text-muted-foreground pointer-events-none select-none">
                                        {unit}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                              {/* Metric label */}
                              {!isOpen && (() => {
                                const label = hlVar ? hlVar[langKey] : "";
                                return <span className="text-[11px] text-muted-foreground truncate hidden md:block">{label}</span>;
                              })()}
                              {isOpen && <span className="hidden md:block" />}
                              {/* Cost + chevron */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold text-primary whitespace-nowrap min-w-[70px] text-right">
                                  &euro;{annualBenefit.toLocaleString(locale, { maximumFractionDigits: 0 })}
                                </span>
                                {isOpen
                                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                              </div>
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border/50">
                            <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                              {(() => {
                                const formulaKeys = extractFormulaVarKeys(pain.formula_expression ?? "");
                                const formulaVarDefs = formulaKeys.map(k => allVarsMap[k]).filter(Boolean);
                                return formulaVarDefs.map((v, idx) => {
                                  const val = resolvedVars[v.var_key] ?? 0;
                                  const expr = pain.formula_expression ?? "";
                                  let operatorBefore: string | null = null;
                                  if (idx > 0 && formulaVarDefs[idx - 1]) {
                                    const prevKey = formulaVarDefs[idx - 1].var_key;
                                    const regex = new RegExp(`${prevKey}\\s*([+\\-*/])\\s*(?:${v.var_key}|\\d)`);
                                    const match = expr.match(regex);
                                    if (match) operatorBefore = match[1];
                                  }
                                  const isHeadlineRow = hlVar?.var_key === v.var_key;
                                  const varSource = getVarSource(v.var_key);
                                  const notesMatch = notesMatches[v.var_key];

                                  return (
                                    <div key={v.var_key}>
                                      {operatorBefore && (
                                        <div className="flex justify-center -my-1 relative z-10">
                                          <span className="text-[10px] font-mono text-muted-foreground bg-background border border-border rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                                            {OPERATOR_SYMBOL[operatorBefore] ?? operatorBefore}
                                          </span>
                                        </div>
                                      )}
                                      <div
                                        className={`flex items-center gap-3 px-3 py-2.5 ${
                                          idx > 0 && !operatorBefore ? "border-t border-border/40" : ""
                                        } ${isHeadlineRow ? "bg-primary/5" : ""}`}
                                      >
                                        <span className="text-[10px] font-bold text-muted-foreground bg-background border border-border rounded w-5 h-5 flex items-center justify-center shrink-0">
                                          {String.fromCharCode(65 + idx)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-medium text-foreground leading-tight block">
                                            {v[langKey]}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <Input
                                            type="number"
                                            className={`w-24 h-7 text-xs text-right font-medium tabular-nums ${getInputStyle(varSource)}`}
                                            value={val}
                                            onChange={e => handleExpandedVarChange(pain, v.var_key, parseFloat(e.target.value) || 0)}
                                          />
                                          {/* Info button for notes-matched variables */}
                                          {varSource === "notes" && notesMatch && (
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <button
                                                  type="button"
                                                  className="text-green-600 hover:text-green-700 shrink-0"
                                                  onClick={e => e.stopPropagation()}
                                                >
                                                  <Info className="h-3.5 w-3.5" />
                                                </button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-72 text-xs" side="left">
                                                <p className="font-semibold text-foreground mb-1">{t("quantify.notes_popover_title")}</p>
                                                <p className="text-muted-foreground italic">"{notesMatch.sentence}"</p>
                                              </PopoverContent>
                                            </Popover>
                                          )}
                                          {v.unit && (
                                            <Badge variant="outline" className="text-[9px] font-normal px-1.5 py-0 h-5 whitespace-nowrap">
                                              {v.unit}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}

                              {extractFormulaVarKeys(pain.formula_expression ?? "").length === 0 && (varsByPain[pain.pain_id] ?? []).length === 0 && (
                                <div className="flex items-center gap-3 px-3 py-2.5">
                                  <span className="text-xs text-muted-foreground flex-1">{pain.default_kpi}</span>
                                  <Input
                                    type="number"
                                    className="w-24 h-7 text-xs text-right font-medium"
                                    value={currentVal}
                                    onChange={e => handleHeadlineChange(pain, parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between px-1">
                              <span className="text-xs font-semibold text-foreground tracking-wide uppercase">{t("quantify.per_year")}</span>
                              <span className="text-base font-bold text-primary">
                                &euro;{annualBenefit.toLocaleString(locale, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                );
              })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Custom pains list */}
      {customPains.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("quantify.custom_pains")}</h3>
          {customPains.map(cp => (
            <Card key={cp.id} className="border-l-4 border-l-muted-foreground/30">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{cp.title}</p>
                  {cp.modules.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {cp.modules.map(m => (
                        <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-primary">
                    &euro;{cp.annual_savings.toLocaleString(locale, { maximumFractionDigits: 0 })}
                  </span>
                  <button onClick={() => onRemoveCustomPain?.(cp.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add custom pain section */}
      <div className="border-t border-border pt-4">
        {!showAddPain ? (
          <Button variant="outline" className="w-full" onClick={() => setShowAddPain(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("quantify.add_pain")}
          </Button>
        ) : (
          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t("quantify.add_pain")}</h4>
              <div className="space-y-2">
                <Input
                  placeholder={t("quantify.pain_title_placeholder")}
                  value={newPainTitle}
                  onChange={e => setNewPainTitle(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder={t("quantify.savings_placeholder")}
                  value={newPainSavings}
                  onChange={e => setNewPainSavings(e.target.value)}
                />
                <Input
                  placeholder={t("quantify.modules_placeholder")}
                  value={newPainModules}
                  onChange={e => setNewPainModules(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCustomPain} disabled={!newPainTitle.trim() || !newPainSavings}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t("quantify.add")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddPain(false)}>
                  {t("wizard.back")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export { evaluateFormula as computeAnnualBenefit } from "@/lib/painFormulas";
