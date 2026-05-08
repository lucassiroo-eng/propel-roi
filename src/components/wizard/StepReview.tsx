import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, DollarSign, Clock, Loader2, FileDown, ExternalLink, Presentation, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { WizardState } from "@/hooks/useWizardSession";
import { getPersonaConfig } from "@/lib/personaConfig";
import { getLocalizedPainStatement } from "@/lib/i18nHelpers";
import { moduleLabel } from "@/lib/offeringEngine";

interface Props {
  state: WizardState;
  sessionId?: string | null;
}

const FLAG: Record<string, string> = { ES: "🇪🇸", FR: "🇫🇷" };

export function StepReview({ state, sessionId }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) ?? "en";
  const { prospect, selectedPains, painOverrides, offering } = state;
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pptxUrl, setPptxUrl] = useState<string | null>(null);
  const [generatingPptx, setGeneratingPptx] = useState(false);

  const { data: pains } = useQuery({
    queryKey: ["pain_library"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pain_library").select("*").eq("is_archived", false).order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const locale = "es-ES";
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 0 });

  // Read ALL numbers from the offering object (single source of truth from Offering step)
  const totalAnnualCost = offering.total_annual_cost ?? 0;
  const totalAnnualBenefit = offering.total_annual_benefit ?? 0;
  const netRoi = offering.net_roi ?? (totalAnnualBenefit - totalAnnualCost);
  const roiPct = offering.roi_pct ?? (totalAnnualCost > 0 ? (netRoi / totalAnnualCost) * 100 : 0);
  const paybackMonths = offering.payback_months ?? (totalAnnualBenefit > 0 ? (totalAnnualCost / totalAnnualBenefit) * 12 : 0);

  const coveredPains = new Set(offering.covered_pains ?? []);
  const selectedPainData = (pains ?? []).filter(p => selectedPains.includes(p.pain_id));

  // Group pains by persona
  const groupedPains = useMemo(() => {
    const map: Record<string, { pains: typeof selectedPainData; subtotal: number }> = {};
    for (const pain of selectedPainData) {
      const g = pain.persona || "Other";
      if (!map[g]) map[g] = { pains: [], subtotal: 0 };
      const isCovered = coveredPains.has(pain.pain_id);
      const benefit = isCovered ? (painOverrides[pain.pain_id]?.annual_benefit ?? 0) : 0;
      map[g].pains.push(pain);
      map[g].subtotal += benefit;
    }
    return map;
  }, [selectedPainData, painOverrides, coveredPains]);

  const [roiResult, setRoiResult] = useState<any>(null);

  const handleCalculateRoi = async () => {
    if (!sessionId || sessionId === "new") { toast.error(t("toast.save_session_first")); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("roi-engine", { body: { session_id: sessionId } });
      if (error) throw error;
      setRoiResult(data);
      toast.success(t("review.pdf_success").replace("PDF", "ROI"));
    } catch (err: any) {
      toast.error(t("review.pdf_error") + ": " + err.message);
    } finally { setGenerating(false); }
  };

  const handleGeneratePdf = async () => {
    if (!sessionId || sessionId === "new") { toast.error(t("toast.save_session_first")); return; }
    setGenerating(true);
    try {
      const { error: roiErr } = await supabase.functions.invoke("roi-engine", { body: { session_id: sessionId } });
      if (roiErr) throw roiErr;
      const { data, error } = await supabase.functions.invoke("generate-pdf", { body: { session_id: sessionId } });
      if (error) throw error;
      if (data?.pdf_url) { setPdfUrl(data.pdf_url); toast.success(t("review.pdf_success")); }
    } catch (err: any) {
      toast.error(t("review.pdf_error") + ": " + err.message);
    } finally { setGenerating(false); }
  };

  const handleGeneratePptx = async () => {
    if (!sessionId || sessionId === "new") { toast.error(t("toast.save_session_first")); return; }
    setGeneratingPptx(true);
    try {
      const { error: roiErr } = await supabase.functions.invoke("roi-engine", { body: { session_id: sessionId } });
      if (roiErr) throw roiErr;
      const { data, error } = await supabase.functions.invoke("generate-pptx", { body: { session_id: sessionId } });
      if (error) throw error;
      if (data?.pptx_url) { setPptxUrl(data.pptx_url); toast.success(t("review.pptx_success")); }
    } catch (err: any) {
      toast.error(t("review.pptx_error") + ": " + err.message);
    } finally { setGeneratingPptx(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("review.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{prospect.company_name || "--"}</p>
      </div>

      {/* Prospect summary */}
      <Card>
        <CardContent className="py-4 px-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            {FLAG[prospect.country]} {prospect.company_name}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>{prospect.seats} seats</span>
            <span>{prospect.sector}</span>
            <span>{offering.billing === "yearly" ? t("offering.yearly") : t("offering.monthly")} / {offering.tier === "enterprise" ? t("offering.tier_enterprise") : t("offering.tier_business")}</span>
            {prospect.contact_name && <span>{prospect.contact_name}</span>}
          </div>
        </CardContent>
      </Card>

      {/* ROI KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-accent">
          <CardContent className="py-4 px-3 text-center">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className={`text-lg font-bold ${netRoi >= 0 ? "text-foreground" : "text-destructive"}`}>
              EUR {fmt(netRoi)}
            </p>
            <p className="text-[10px] text-muted-foreground">{t("review.net_roi")}</p>
          </CardContent>
        </Card>
        <Card className="bg-accent">
          <CardContent className="py-4 px-3 text-center">
            <DollarSign className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className={`text-lg font-bold ${roiPct >= 0 ? "text-foreground" : "text-destructive"}`}>
              {roiPct.toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">{t("review.roi_pct")}</p>
          </CardContent>
        </Card>
        <Card className="bg-accent">
          <CardContent className="py-4 px-3 text-center">
            <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{paybackMonths > 0 ? paybackMonths.toFixed(1) : "--"}</p>
            <p className="text-[10px] text-muted-foreground">{t("review.payback")} ({t("review.months")})</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Offering breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("review.offering_section")}</h3>

        {/* Bundle */}
        {offering.bundle_name && (
          <div className="flex justify-between items-center text-sm">
            <div>
              <span className="font-medium text-foreground">{offering.bundle_name}</span>
              {offering.bundle_modules && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {offering.bundle_modules.map(m => (
                    <Badge key={m} variant="secondary" className="text-[9px] font-normal">{moduleLabel(m)}</Badge>
                  ))}
                </div>
              )}
            </div>
            <span className="font-medium text-foreground shrink-0 ml-4">
              EUR {fmt(offering.bundle_annual ?? 0)}{t("offering.per_year")}
            </span>
          </div>
        )}

        {/* Add-on lines */}
        {offering.addon_lines && offering.addon_lines.filter(a => a.enabled).length > 0 && (
          <div className="space-y-1.5 pl-2 border-l-2 border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("offering.addons")}</span>
            {offering.addon_lines.filter(a => a.enabled).map(addon => (
              <div key={addon.module} className="flex justify-between text-xs">
                <span className="text-foreground">{addon.label} <span className="text-muted-foreground">({addon.architecture})</span></span>
                <span className="font-medium">EUR {fmt(addon.annual)}{t("offering.per_year")}</span>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-1" />
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-foreground">{t("review.annual_cost")}</span>
          <span className="text-foreground">EUR {fmt(totalAnnualCost)}</span>
        </div>
      </div>

      <Separator />

      {/* Benefit breakdown grouped by persona */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("review.pains_section")}</h3>

        {Object.entries(groupedPains).map(([persona, { pains: personaPains, subtotal }]) => {
          const { color, Icon, i18nKey } = getPersonaConfig(persona);
          return (
            <div key={persona} className="space-y-1">
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: color, color: "#fff" }}
                >
                  <Icon className="h-3 w-3" />
                  {t(i18nKey)}
                </span>
                <span className="text-sm font-semibold text-foreground">EUR {fmt(subtotal)}</span>
              </div>
              {/* Individual pains */}
              {personaPains.map(pain => {
                const isCovered = coveredPains.has(pain.pain_id);
                const benefit = isCovered ? (painOverrides[pain.pain_id]?.annual_benefit ?? 0) : 0;
                const statement = getLocalizedPainStatement(pain, lang);
                return (
                  <div key={pain.pain_id} className="flex items-center justify-between pl-4 text-xs">
                    <span className={`truncate flex-1 ${isCovered ? "text-foreground" : "text-muted-foreground line-through"}`}>
                      {statement}
                      {!isCovered && (
                        <Badge variant="outline" className="ml-1.5 text-[8px] text-amber-600 border-amber-300">
                          module not included
                        </Badge>
                      )}
                    </span>
                    <span className={`font-medium ml-2 shrink-0 ${isCovered ? "text-foreground" : "text-muted-foreground"}`}>
                      EUR {fmt(benefit)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Custom pains */}
        {(state.customPains ?? []).length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">{t("quantify.custom_pains")}</span>
            {(state.customPains ?? []).map(cp => (
              <div key={cp.id} className="flex items-center justify-between text-sm pl-4">
                <span className="text-foreground truncate flex-1">{cp.title}</span>
                <span className="font-medium text-foreground ml-2">EUR {fmt(cp.annual_savings)}</span>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-1" />
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-foreground">{t("review.total_benefit")}</span>
          <span className="text-primary">EUR {fmt(totalAnnualBenefit + (state.customPains ?? []).reduce((s, cp) => s + cp.annual_savings, 0))}</span>
        </div>

        {/* Uncovered pains warning */}
        {(offering.uncovered_pains ?? []).length > 0 && (
          <div className="flex items-start gap-2 rounded px-3 py-2 text-xs bg-amber-50 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {(offering.uncovered_pains ?? []).length} pain{(offering.uncovered_pains ?? []).length > 1 ? "s" : ""} are not covered -- their modules are not in the selected configuration. Benefit not counted.
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Server-side ROI result */}
      {roiResult && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">{t("review.net_roi")} ({t("review.verified")})</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">{t("review.net_roi")}</span>
                  <p className="font-bold text-foreground">EUR {roiResult.roi_eur?.toLocaleString(locale, { maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("review.roi_pct")}</span>
                  <p className="font-bold text-foreground">{roiResult.roi_pct?.toFixed(0)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("review.payback")}</span>
                  <p className="font-bold text-foreground">{roiResult.payback_months?.toFixed(1)} {t("review.months")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Separator />
        </>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button className="flex-1" size="lg" variant="outline" onClick={handleCalculateRoi} disabled={generating}>
            {generating && !pdfUrl ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("review.generating")}</>
            ) : (
              <><TrendingUp className="h-4 w-4 mr-2" /> ROI</>
            )}
          </Button>
          <Button className="flex-1" size="lg" onClick={handleGeneratePdf} disabled={generating || generatingPptx}>
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("review.generating")}</>
            ) : (
              <><FileDown className="h-4 w-4 mr-2" /> {t("review.generate_pdf")}</>
            )}
          </Button>
          <Button className="flex-1" size="lg" variant="outline" onClick={handleGeneratePptx} disabled={generating || generatingPptx}>
            {generatingPptx ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("review.generating")}</>
            ) : (
              <><Presentation className="h-4 w-4 mr-2" /> {t("review.generate_pptx")}</>
            )}
          </Button>
        </div>

        {pdfUrl && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" size="lg" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> {t("review.view")}
              </a>
            </Button>
            <Button variant="outline" className="flex-1" size="lg" asChild>
              <a href={pdfUrl} download={`ROI-${state.prospect.company_name || "report"}.pdf`}>
                <FileDown className="h-4 w-4 mr-2" /> {t("review.download_pdf")}
              </a>
            </Button>
          </div>
        )}

        {pptxUrl && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" size="lg" asChild>
              <a href={pptxUrl} download={`ROI-${state.prospect.company_name || "report"}.pptx`}>
                <FileDown className="h-4 w-4 mr-2" /> {t("review.download_pptx")}
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
