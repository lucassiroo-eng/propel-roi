import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

import { CheckCircle, Circle, Loader2, Info, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { getPersonaConfig, getSubGroupConfig, SUB_GROUP_ORDER } from "@/lib/personaConfig";
import { getLocalizedPainStatement } from "@/lib/i18nHelpers";
import type { AiSuggestion } from "@/hooks/useWizardSession";

interface Props {
  selectedPains: string[];
  aiSuggestions?: AiSuggestion[];
  onToggle: (painId: string) => void;
}

const PERSONA_ORDER = ["people_ops", "hr_director", "finance", "c_level"];

export function StepPains({ selectedPains, aiSuggestions = [], onToggle }: Props) {
  const { t, i18n } = useTranslation();

  const { data: pains, isLoading } = useQuery({
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

  const suggestedPainIds = useMemo(() => new Set(aiSuggestions.map(s => s.pain_id)), [aiSuggestions]);
  const rationaleMap = useMemo(() => {
    const map: Record<string, string> = {};
    aiSuggestions.forEach(s => { map[s.pain_id] = s.rationale; });
    return map;
  }, [aiSuggestions]);

  // Group detected pains by persona
  const detectedGrouped = useMemo(() => {
    if (!pains || aiSuggestions.length === 0) return {};
    const map: Record<string, typeof pains> = {};
    for (const p of pains) {
      if (!suggestedPainIds.has(p.pain_id)) continue;
      const persona = p.persona || "other";
      if (!map[persona]) map[persona] = [];
      map[persona].push(p);
    }
    return map;
  }, [pains, suggestedPainIds, aiSuggestions]);

  // Group remaining pains by persona > sub_group
  const remainingGrouped = useMemo(() => {
    const map: Record<string, Record<string, typeof pains>> = {};
    for (const p of pains ?? []) {
      if (suggestedPainIds.has(p.pain_id)) continue;
      const persona = p.persona || "other";
      const subGroup = (p as any).sub_group || "other";
      if (!map[persona]) map[persona] = {};
      if (!map[persona][subGroup]) map[persona][subGroup] = [];
      map[persona][subGroup].push(p);
    }
    return map;
  }, [pains, suggestedPainIds]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const sortedDetectedPersonas = Object.keys(detectedGrouped).sort(
    (a, b) => (PERSONA_ORDER.indexOf(a) === -1 ? 99 : PERSONA_ORDER.indexOf(a)) - (PERSONA_ORDER.indexOf(b) === -1 ? 99 : PERSONA_ORDER.indexOf(b))
  );

  const sortedRemainingPersonas = Object.keys(remainingGrouped).sort(
    (a, b) => (PERSONA_ORDER.indexOf(a) === -1 ? 99 : PERSONA_ORDER.indexOf(a)) - (PERSONA_ORDER.indexOf(b) === -1 ? 99 : PERSONA_ORDER.indexOf(b))
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("pains.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("pains.subtitle", { count: selectedPains.length })}
          </p>
        </div>

        {/* AI-detected pains section */}
        {aiSuggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{t("pains.detected")}</span>
            </div>

            {sortedDetectedPersonas.map(persona => {
              const { color, Icon: PersonaIcon, i18nKey } = getPersonaConfig(persona);
              const items = detectedGrouped[persona]!;

              return (
                <div key={persona} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: color }}
                    >
                      <PersonaIcon className="h-3 w-3" />
                      {t(i18nKey)}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {items.map(pain => {
                      const selected = selectedPains.includes(pain.pain_id);
                      const rationale = rationaleMap[pain.pain_id];
                      return (
                        <Card
                          key={pain.pain_id}
                          className={`cursor-pointer transition-colors ${selected ? "border-primary/50 bg-accent/50" : "hover:border-primary/30"}`}
                          style={{ borderLeft: `3px solid ${color}` }}
                          onClick={() => onToggle(pain.pain_id)}
                        >
                          <CardContent className="py-3 px-4 flex items-start gap-3">
                            {selected ? (
                              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground leading-snug break-words" style={{ overflowWrap: 'anywhere' }}>
                                {getLocalizedPainStatement(pain, i18n.language)}
                              </p>
                              {rationale && (
                                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                                  {rationale}
                                </p>
                              )}
                            </div>
                            {rationale && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="shrink-0 mt-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs text-xs">
                                  <p className="font-semibold mb-1">{t("pains.quote_tooltip")}</p>
                                  <p className="italic">"{rationale}"</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Separator if we have both sections */}
        {aiSuggestions.length > 0 && sortedRemainingPersonas.length > 0 && (
          <div className="border-t border-border pt-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("pains.other_pains", "Other pains")}
            </span>
          </div>
        )}

        {/* Remaining pains */}
        {sortedRemainingPersonas.map(persona => {
          const { color, Icon: PersonaIcon, i18nKey } = getPersonaConfig(persona);
          const subGroups = remainingGrouped[persona];
          const sortedSubs = Object.keys(subGroups).sort(
            (a, b) => (SUB_GROUP_ORDER.indexOf(a) === -1 ? 99 : SUB_GROUP_ORDER.indexOf(a)) - (SUB_GROUP_ORDER.indexOf(b) === -1 ? 99 : SUB_GROUP_ORDER.indexOf(b))
          );

          return (
            <div key={persona} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  <PersonaIcon className="h-3 w-3" />
                  {t(i18nKey)}
                </span>
              </h3>

              {sortedSubs.map(subGroup => {
                const { Icon: SubIcon, i18nKey: subI18n } = getSubGroupConfig(subGroup);
                const items = subGroups[subGroup]!;

                return (
                  <div key={subGroup} className="space-y-2">
                    <div className="flex items-center gap-1.5 pl-1">
                      <SubIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t(subI18n)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {items.map(pain => {
                        const selected = selectedPains.includes(pain.pain_id);

                        return (
                          <Card
                            key={pain.pain_id}
                            className={`cursor-pointer transition-colors ${
                              selected ? "border-primary bg-accent" : "hover:border-primary/30"
                            }`}
                            style={{ borderLeft: `3px solid ${color}` }}
                            onClick={() => onToggle(pain.pain_id)}
                          >
                            <CardContent className="py-3 px-4 flex items-start gap-3">
                              {selected ? (
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground leading-snug break-words" style={{ overflowWrap: 'anywhere' }}>
                                  {getLocalizedPainStatement(pain, i18n.language)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
