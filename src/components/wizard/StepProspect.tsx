import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProspectData } from "@/hooks/useWizardSession";

/**
 * Logarithmic slider mapping: 0-100 slider → ~10-5000 seats.
 * Gives fine control in the 10-200 range where most prospects sit.
 */
const SEATS_MIN = 10;
const SEATS_MAX = 5000;
function sliderToSeats(s: number): number {
  if (s <= 0) return SEATS_MIN;
  if (s >= 100) return SEATS_MAX;
  const v = SEATS_MIN * Math.pow(SEATS_MAX / SEATS_MIN, s / 100);
  // Round to nice steps: 1s below 50, 5s below 200, 10s below 500, 50s above
  if (v < 50) return Math.round(v);
  if (v < 200) return Math.round(v / 5) * 5;
  if (v < 500) return Math.round(v / 10) * 10;
  return Math.round(v / 50) * 50;
}
function seatsToSlider(seats: number): number {
  if (seats <= SEATS_MIN) return 0;
  if (seats >= SEATS_MAX) return 100;
  return 100 * Math.log(seats / SEATS_MIN) / Math.log(SEATS_MAX / SEATS_MIN);
}

const SECTORS = [
  { value: "Agriculture", key: "sector.agriculture" },
  { value: "Automobiles & Components", key: "sector.automobiles" },
  { value: "Banking & Insurance", key: "sector.banking" },
  { value: "Chemicals", key: "sector.chemicals" },
  { value: "Commercial & Professional Services", key: "sector.commercial_services" },
  { value: "Construction & Engineering", key: "sector.construction" },
  { value: "Consumer Durables & Apparel", key: "sector.consumer_durables" },
  { value: "Consumer Services", key: "sector.consumer_services" },
  { value: "Containers & Packaging", key: "sector.containers" },
  { value: "Education", key: "sector.education" },
  { value: "Energy", key: "sector.energy" },
  { value: "Food, Beverage & Tobacco", key: "sector.food" },
  { value: "Health Care Equipment & Services", key: "sector.healthcare" },
  { value: "Hospitality", key: "sector.hospitality" },
  { value: "Legal Services", key: "sector.legal" },
  { value: "Machinery", key: "sector.machinery" },
  { value: "Media & Entertainment", key: "sector.media" },
  { value: "Non-Profit Organisation", key: "sector.nonprofit" },
  { value: "Real Estate", key: "sector.real_estate" },
  { value: "Research & Consulting Services", key: "sector.research" },
  { value: "Retailing", key: "sector.retailing" },
  { value: "Software & IT Services", key: "sector.software" },
  { value: "Technology Hardware & Equipment", key: "sector.tech_hardware" },
  { value: "Trading Companies & Distributors", key: "sector.trading" },
  { value: "Transportation", key: "sector.transportation" },
  { value: "Utilities", key: "sector.utilities" },
];

function mapCountry(raw: string): "ES" | "FR" {
  const lower = (raw ?? "").toLowerCase();
  if (lower.includes("spain") || lower === "es") return "ES";
  if (lower.includes("france") || lower === "fr") return "FR";
  return "ES";
}

function mapSector(industry: string): { value: string; approximate: boolean } {
  if (!industry) return { value: "", approximate: false };
  const lower = industry.toLowerCase();

  // Exact substring match first
  const exact = SECTORS.find(s => s.value.toLowerCase().includes(lower) || lower.includes(s.value.toLowerCase()));
  if (exact) return { value: exact.value, approximate: false };

  // Fuzzy: find the sector with the most overlapping words
  const words = lower.split(/[\s,&/]+/).filter(w => w.length > 2);
  let bestScore = 0;
  let bestSector = "";
  for (const s of SECTORS) {
    const sWords = s.value.toLowerCase().split(/[\s,&/]+/).filter(w => w.length > 2);
    const score = words.filter(w => sWords.some(sw => sw.includes(w) || w.includes(sw))).length;
    if (score > bestScore) {
      bestScore = score;
      bestSector = s.value;
    }
  }
  if (bestScore > 0) return { value: bestSector, approximate: true };

  // Keyword mapping as last resort
  const keywordMap: Record<string, string> = {
    tech: "Software & IT Services",
    saas: "Software & IT Services",
    software: "Software & IT Services",
    hotel: "Hospitality",
    restaurant: "Hospitality",
    hospital: "Health Care Equipment & Services",
    pharma: "Health Care Equipment & Services",
    bank: "Banking & Insurance",
    insurance: "Banking & Insurance",
    fintech: "Banking & Insurance",
    retail: "Retailing",
    ecommerce: "Retailing",
    logistics: "Transportation",
    shipping: "Transportation",
    manufacture: "Machinery",
    industrial: "Machinery",
    food: "Food, Beverage & Tobacco",
    media: "Media & Entertainment",
    entertainment: "Media & Entertainment",
    education: "Education",
    school: "Education",
    university: "Education",
    energy: "Energy",
    oil: "Energy",
    gas: "Energy",
    construction: "Construction & Engineering",
    building: "Construction & Engineering",
    legal: "Legal Services",
    law: "Legal Services",
    consult: "Research & Consulting Services",
    ngo: "Non-Profit Organisation",
    nonprofit: "Non-Profit Organisation",
    automotive: "Automobiles & Components",
    car: "Automobiles & Components",
    real_estate: "Real Estate",
    property: "Real Estate",
  };
  for (const [kw, sector] of Object.entries(keywordMap)) {
    if (lower.includes(kw)) return { value: sector, approximate: true };
  }

  return { value: "", approximate: false };
}

interface Props {
  data: ProspectData;
  onChange: (d: Partial<ProspectData>) => void;
}

export function StepProspect({ data, onChange }: Props) {
  const { t } = useTranslation();
  const [fetching, setFetching] = useState(false);
  const [sectorApproximate, setSectorApproximate] = useState(false);

  async function handlePrefill() {
    if (!data.hubspot_deal_url) {
      toast.error(t("prospect.hubspot_paste_first"));
      return;
    }
    setFetching(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("hubspot-deal", {
        body: { deal_url: data.hubspot_deal_url },
      });
      if (error) throw error;
      if (result.error) throw new Error(result.error);

      const updates: Partial<ProspectData> = {};
      if (result.company_name) updates.company_name = result.company_name;
      if (result.deal_name) updates.deal_name = result.deal_name;
      if (result.country) updates.country = mapCountry(result.country);
      if (result.employees) updates.seats = Math.max(10, Math.min(5000, Number(result.employees) || 50));
      if (result.industry) {
        const mapped = mapSector(result.industry);
        updates.sector = mapped.value;
        setSectorApproximate(mapped.approximate);
      }
      if (result.contact_name) updates.contact_name = result.contact_name;
      if (result.contact_email) updates.contact_email = result.contact_email;
      if (result.notes && Array.isArray(result.notes)) updates.hubspot_notes = result.notes;

      onChange(updates);
      toast.success(t("prospect.hubspot_success"));
    } catch (err: any) {
      toast.error(t("prospect.hubspot_error", { message: err.message ?? "Unknown" }));
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("prospect.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("prospect.subtitle")}</p>
      </div>

      {/* HubSpot prefill */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          {t("prospect.hubspot_import")}
        </p>
        <div className="flex gap-2">
          <Input
            id="hubspot"
            placeholder={t("prospect.hubspot_placeholder")}
            value={data.hubspot_deal_url}
            onChange={e => onChange({ hubspot_deal_url: e.target.value })}
            className="flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrefill}
            disabled={fetching || !data.hubspot_deal_url}
          >
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("prospect.fetch")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {data.deal_name && (
          <div className="md:col-span-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("prospect.deal")}</span> {data.deal_name}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center min-h-[24px]">
            <Label htmlFor="company">{t("prospect.company_name")}</Label>
          </div>
          <Input
            id="company"
            placeholder={t("prospect.company_placeholder")}
            value={data.company_name}
            onChange={e => onChange({ company_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 min-h-[24px]">
            <Label>{t("prospect.sector")}</Label>
            {sectorApproximate && data.sector && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 bg-amber-50">
                {t("prospect.sector_approximate", "Approximate match")}
              </Badge>
            )}
          </div>
          <Select value={data.sector} onValueChange={v => { onChange({ sector: v }); setSectorApproximate(false); }}>
            <SelectTrigger>
              <SelectValue placeholder={t("prospect.sector_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map(s => (
                <SelectItem key={s.value} value={s.value}>{t(s.key)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("prospect.country")}</Label>
          <Select value={data.country} onValueChange={v => onChange({ country: v as "ES" | "FR" })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ES">🇪🇸 {t("prospect.country_es")}</SelectItem>
              <SelectItem value="FR">🇫🇷 {t("prospect.country_fr")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("prospect.seats", { count: data.seats })}</Label>
          <div className="flex items-center gap-3">
            <Slider
              min={0}
              max={100}
              step={1}
              value={[seatsToSlider(data.seats)]}
              onValueChange={([v]) => onChange({ seats: sliderToSeats(v) })}
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              max={10000}
              className="w-20 h-8 text-sm text-right font-medium tabular-nums"
              value={data.seats}
              onChange={e => {
                const v = Math.max(1, Math.min(10000, parseInt(e.target.value) || 1));
                onChange({ seats: v });
              }}
            />
          </div>
          <div className="flex items-start gap-3 -mt-1">
            <div className="relative h-4 text-[10px] text-muted-foreground flex-1">
              {[10, 50, 100, 250, 500, 1000, 2500, 5000].map(v => (
                <span
                  key={v}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${seatsToSlider(v)}%` }}
                >
                  {v >= 1000 ? `${v / 1000}k` : v}
                </span>
              ))}
            </div>
            <div className="w-20 shrink-0" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_name">{t("prospect.contact_name")}</Label>
          <Input
            id="contact_name"
            placeholder={t("prospect.contact_name_placeholder")}
            value={data.contact_name}
            onChange={e => onChange({ contact_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">{t("prospect.contact_email")}</Label>
          <Input
            id="contact_email"
            type="email"
            placeholder="maria@acme.es"
            value={data.contact_email}
            onChange={e => onChange({ contact_email: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
