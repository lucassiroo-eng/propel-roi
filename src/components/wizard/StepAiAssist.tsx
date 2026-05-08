import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

import { Loader2, Sparkles, SkipForward, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getPersonaConfig } from "@/lib/personaConfig";
import type { HubSpotNote } from "@/hooks/useWizardSession";

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
  onSuggest: (painIds: string[], suggestions: Suggestion[]) => void;
  onSkip: () => void;
}

// Build a stable cache key from company + notes length to avoid re-summarizing the same deal
function getSummaryCacheKey(companyName: string, hubspotNotes: HubSpotNote[]): string {
  const notesHash = hubspotNotes.map(n => n.id).sort().join(",");
  return `ai_summary_${companyName}_${notesHash}`;
}

function getCachedSummary(key: string): string | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { summary, timestamp } = JSON.parse(raw);
    // Cache valid for 24h
    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) return summary;
    sessionStorage.removeItem(key);
  } catch { /* ignore */ }
  return null;
}

function setCachedSummary(key: string, summary: string) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ summary, timestamp: Date.now() }));
  } catch { /* quota exceeded, ignore */ }
}

export function StepAiAssist({ country, sector, hubspotNotes, companyName, onSuggest, onSkip }: Props) {
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [painMap, setPainMap] = useState<Record<string, PainInfo>>({});

  // Fetch pain library for display names
  useEffect(() => {
    supabase
      .from("pain_library")
      .select("pain_id, pain_statement, persona")
      .eq("is_archived", false)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, PainInfo> = {};
          data.forEach((p: any) => {
            map[p.pain_id] = p;
          });
          setPainMap(map);
        }
      });
  }, []);

  // Auto-summarize notes from HubSpot when they exist — with session cache
  useEffect(() => {
    if (!hubspotNotes || hubspotNotes.length === 0) return;
    if (notes) return; // don't overwrite if user already has content

    const cacheKey = getSummaryCacheKey(companyName, hubspotNotes);
    const cached = getCachedSummary(cacheKey);
    if (cached) {
      setNotes(cached);
      return;
    }

    const combinedNotes = hubspotNotes
      .map((n, i) => {
        const plainText = n.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        return `Note ${i + 1} (${new Date(n.created_at).toLocaleDateString()}):\n${plainText}`;
      })
      .join("\n\n");

    setSummarizing(true);
    supabase.functions
      .invoke("ai-summarize-pains", {
        body: { notes: combinedNotes, company_name: companyName },
      })
      .then(({ data, error }) => {
        if (!error && data?.summary) {
          setNotes(data.summary);
          setCachedSummary(cacheKey, data.summary);
        } else {
          setNotes(combinedNotes);
          setCachedSummary(cacheKey, combinedNotes);
        }
      })
      .catch(() => {
        setNotes(combinedNotes);
      })
      .finally(() => setSummarizing(false));
  }, [hubspotNotes, companyName]);

  const handleSuggest = async () => {
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
      const suggs = data?.suggestions ?? [];
      // Auto-apply all suggestions and move to Pains step
      onSuggest(suggs.map((s: Suggestion) => s.pain_id), suggs);
    } catch (err: any) {
      toast.error(t("ai_assist.error"));
      onSkip();
    } finally {
      setLoading(false);
    }
  };

  const toggleSuggestion = (painId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(painId)) next.delete(painId);
      else next.add(painId);
      return next;
    });
  };

  const handleApply = () => {
    const selectedSuggs = (suggestions ?? []).filter(s => selected.has(s.pain_id));
    onSuggest(Array.from(selected), selectedSuggs);
  };

  const applyLabel = selected.size === 1
    ? t("ai_assist.apply", { count: selected.size })
    : t("ai_assist.apply_plural", { count: selected.size });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("pains.detected")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {hubspotNotes.length > 0
            ? t("ai_assist.hubspot_summary")
            : t("ai_assist.subtitle")}
        </p>
      </div>

      {!suggestions ? (
        <>
          {summarizing ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">{t("ai_assist.analyzing_notes")}</span>
            </div>
          ) : (
            <Textarea
              placeholder={t("ai_assist.placeholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[200px]"
            />
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleSuggest}
              disabled={loading || summarizing || !notes.trim()}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("ai_assist.analyzing")}</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> {t("ai_assist.suggest")}</>
              )}
            </Button>
            <Button variant="outline" onClick={onSkip}>
              <SkipForward className="h-4 w-4 mr-1" /> {t("ai_assist.skip")}
            </Button>
          </div>
        </>
      ) : (
        <>
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("ai_assist.no_pains")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {(() => {
                const grouped: Record<string, Suggestion[]> = {};
                suggestions.forEach((s) => {
                  const persona = painMap[s.pain_id]?.persona ?? "Other";
                  if (!grouped[persona]) grouped[persona] = [];
                  grouped[persona].push(s);
                });
                return Object.entries(grouped).map(([persona, items]) => {
                  const { color, Icon } = getPersonaConfig(persona);
                  return (
                    <div key={persona} className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                          style={{ backgroundColor: color }}
                        >
                          <Icon className="h-3 w-3" />
                          {persona}
                        </span>
                      </h3>
                      {items.map((s) => {
                        const isSelected = selected.has(s.pain_id);
                        const pain = painMap[s.pain_id];
                        return (
                          <Card
                            key={s.pain_id}
                            className={`cursor-pointer transition-colors ${isSelected ? "border-primary/50 bg-accent/50" : ""}`}
                            style={{ borderLeft: `3px solid ${color}` }}
                            onClick={() => toggleSuggestion(s.pain_id)}
                          >
                            <CardContent className="py-3 px-4 flex items-start gap-3">
                              <div className={`mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`}>
                                <CheckCircle className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                {pain && (
                                  <p className="text-sm font-medium text-foreground mb-1">
                                    {pain.pain_statement}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground italic">{s.rationale}</p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleApply} disabled={selected.size === 0}>
              {applyLabel}
            </Button>
            <Button variant="outline" onClick={onSkip}>
              {t("ai_assist.skip")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
