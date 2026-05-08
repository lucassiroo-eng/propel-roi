import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, SkipForward, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getPersonaConfig } from "@/lib/personaConfig";
import type { HubSpotNote, AirtableSuggestion } from "@/hooks/useWizardSession";

interface Suggestion {
  pain_id: string;
  rationale: string;
}

interface PainInfo {
  pain_id: string;
  pain_statement: string;
  persona: string;
}

interface Props {
  country: "ES" | "FR";
  sector: string;
  hubspotNotes: HubSpotNote[];
  companyName: string;
  airtableSuggestions?: AirtableSuggestion[];
  airtableStats?: { email_count: number; call_count: number };
  onSuggest: (painIds: string[], suggestions: Suggestion[]) => void;
  onSkip: () => void;
}

export function StepAiAssist({
  country, sector, hubspotNotes, companyName,
  airtableSuggestions, airtableStats,
  onSuggest, onSkip,
}: Props) {
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [painMap, setPainMap] = useState<Record<string, PainInfo>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Load pain display names
  useEffect(() => {
    supabase
      .from("pain_library")
      .select("pain_id, pain_statement, persona")
      .eq("is_archived", false)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, PainInfo> = {};
          data.forEach((p: any) => { map[p.pain_id] = p; });
          setPainMap(map);
        }
      });
  }, []);

  // Pre-select all Airtable suggestions when they arrive
  useEffect(() => {
    if (airtableSuggestions?.length) {
      setSelected(new Set(airtableSuggestions.map(s => s.pain_id)));
    }
  }, [airtableSuggestions]);

  function toggle(painId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(painId)) next.delete(painId);
      else next.add(painId);
      return next;
    });
  }

  function handleValidate() {
    const suggestions = (airtableSuggestions ?? []).filter(s => selected.has(s.pain_id));
    onSuggest(Array.from(selected), suggestions);
  }

  async function handleManualSuggest() {
    if (!notes.trim()) {
      toast.error(t("prospect.hubspot_paste_first"));
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist-pain-mapping", {
        body: { notes, country, sector, language: i18n.language?.substring(0, 2) ?? "en" },
      });
      if (error) throw error;
      const suggs: Suggestion[] = data?.suggestions ?? [];
      onSuggest(suggs.map(s => s.pain_id), suggs);
    } catch {
      toast.error(t("ai_assist.error"));
      onSkip();
    } finally {
      setLoading(false);
    }
  }

  // ── Airtable mode: show pre-detected pains for validation ──────────────────
  if (airtableSuggestions && airtableSuggestions.length > 0) {
    const grouped: Record<string, AirtableSuggestion[]> = {};
    airtableSuggestions.forEach(s => {
      const persona = painMap[s.pain_id]?.persona ?? "Other";
      if (!grouped[persona]) grouped[persona] = [];
      grouped[persona].push(s);
    });

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("pains.detected")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {airtableStats
              ? `Based on ${airtableStats.email_count} emails and ${airtableStats.call_count} calls · uncheck pains that don't apply`
              : t("ai_assist.hubspot_summary")}
          </p>
        </div>

        <div className="space-y-4">
          {Object.entries(grouped).map(([persona, items]) => {
            const { color, Icon } = getPersonaConfig(persona);
            return (
              <div key={persona} className="space-y-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  <Icon className="h-3 w-3" /> {persona}
                </span>
                {items.map(s => {
                  const isSelected = selected.has(s.pain_id);
                  const pain = painMap[s.pain_id];
                  return (
                    <Card
                      key={s.pain_id}
                      className={`cursor-pointer transition-colors ${isSelected ? "border-primary/50 bg-accent/50" : "opacity-50"}`}
                      style={{ borderLeft: `3px solid ${color}` }}
                      onClick={() => toggle(s.pain_id)}
                    >
                      <CardContent className="py-3 px-4 flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`}>
                          {isSelected ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          {pain && <p className="text-sm font-medium text-foreground mb-1">{pain.pain_statement}</p>}
                          <p className="text-xs text-muted-foreground italic">{s.rationale}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleValidate} disabled={selected.size === 0}>
            <Sparkles className="h-4 w-4 mr-2" />
            {selected.size === 1 ? t("ai_assist.apply", { count: selected.size }) : t("ai_assist.apply_plural", { count: selected.size })}
          </Button>
          <Button variant="outline" onClick={onSkip}>
            <SkipForward className="h-4 w-4 mr-1" /> {t("ai_assist.skip")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Manual mode: paste notes (fallback when no Airtable data) ──────────────
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("pains.detected")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("ai_assist.subtitle")}</p>
      </div>

      <Textarea
        placeholder={t("ai_assist.placeholder")}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="min-h-[200px]"
      />

      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleManualSuggest} disabled={loading || !notes.trim()}>
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("ai_assist.analyzing")}</>
            : <><Sparkles className="h-4 w-4 mr-2" /> {t("ai_assist.suggest")}</>}
        </Button>
        <Button variant="outline" onClick={onSkip}>
          <SkipForward className="h-4 w-4 mr-1" /> {t("ai_assist.skip")}
        </Button>
      </div>
    </div>
  );
}
