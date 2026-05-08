import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon, Mail, Phone, CheckCircle, Circle, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPersonaConfig } from "@/lib/personaConfig";
import type { ProspectData, AirtableSuggestion, AirtableEmail, AirtableCall } from "@/hooks/useWizardSession";

const SEATS_MIN = 10;
const SEATS_MAX = 5000;
function sliderToSeats(s: number): number {
  if (s <= 0) return SEATS_MIN;
  if (s >= 100) return SEATS_MAX;
  const v = SEATS_MIN * Math.pow(SEATS_MAX / SEATS_MIN, s / 100);
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

interface PainInfo { pain_id: string; pain_statement: string; persona: string; }

interface Props {
  data: ProspectData;
  onChange: (d: Partial<ProspectData>) => void;
  selectedPains: string[];
  onTogglePain: (painId: string) => void;
  onPainsAutoSelected: (painIds: string[], suggestions: AirtableSuggestion[]) => void;
}

function EmailCard({ email }: { email: AirtableEmail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{email.subject || "(no subject)"}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {email.from} · {email.date?.slice(0, 10)}
          </p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-border bg-muted/20">
          <p className="text-sm text-foreground whitespace-pre-wrap mt-2 leading-relaxed">{email.body || "(empty)"}</p>
        </div>
      )}
    </div>
  );
}

function CallCard({ call }: { call: AirtableCall }) {
  const [open, setOpen] = useState(false);
  const mins = Math.round((call.duration_seconds ?? 0) / 60);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{call.owner || "Call"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {call.date?.slice(0, 10)}{mins > 0 ? ` · ${mins} min` : ""}
          </p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-border bg-muted/20">
          <p className="text-sm text-foreground whitespace-pre-wrap mt-2 leading-relaxed">{call.transcript || "(no transcript)"}</p>
        </div>
      )}
    </div>
  );
}

export function StepProspect({ data, onChange, selectedPains, onTogglePain, onPainsAutoSelected }: Props) {
  const { t, i18n } = useTranslation();
  const [fetching, setFetching] = useState(false);
  const [sectorApproximate, setSectorApproximate] = useState(false);
  const [painMap, setPainMap] = useState<Record<string, PainInfo>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"emails" | "calls">("emails");

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

  async function handleFetch() {
    if (!data.hubspot_deal_url) {
      toast.error(t("prospect.hubspot_paste_first"));
      return;
    }
    setFetching(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("airtable-deal-fetch", {
        body: {
          deal_url: data.hubspot_deal_url,
          country: data.country,
          sector: data.sector,
          language: i18n.language?.substring(0, 2) ?? "en",
        },
      });
      if (error) throw error;
      if (result.error) throw new Error(result.error);

      const updates: Partial<ProspectData> = {};
      if (result.deal?.name) updates.deal_name = result.deal.name;
      if (result.deal?.company_name && !data.company_name) updates.company_name = result.deal.company_name;
      if (result.deal?.contacts_info) {
        const ci = result.deal.contacts_info;
        const nameMatch = ci.match(/([A-ZÀ-ÿ][a-zà-ÿ]+ [A-ZÀ-ÿ][a-zà-ÿ]+)/);
        const emailMatch = ci.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
        if (nameMatch && !data.contact_name) updates.contact_name = nameMatch[1];
        if (emailMatch && !data.contact_email) updates.contact_email = emailMatch[0];
      }
      if (result.stats) updates.airtable_stats = result.stats;
      if (result.emails?.length) updates.airtable_emails = result.emails;
      if (result.calls?.length) updates.airtable_calls = result.calls;
      if (result.suggestions?.length) {
        updates.airtable_suggestions = result.suggestions;
        onPainsAutoSelected(
          result.suggestions.map((s: any) => s.pain_id),
          result.suggestions,
        );
      }

      onChange(updates);

      const ec = result.stats?.email_count ?? 0;
      const cc = result.stats?.call_count ?? 0;
      const pc = result.suggestions?.length ?? 0;
      toast.success(`${ec} emails, ${cc} calls · ${pc} pains detected`);
    } catch (err: any) {
      toast.error(t("prospect.hubspot_error", { message: err.message ?? "Unknown" }));
    } finally {
      setFetching(false);
    }
  }

  const stats = data.airtable_stats;
  const emails = data.airtable_emails ?? [];
  const calls = data.airtable_calls ?? [];
  const suggestions = data.airtable_suggestions ?? [];

  const grouped: Record<string, AirtableSuggestion[]> = {};
  suggestions.forEach(s => {
    const persona = painMap[s.pain_id]?.persona ?? "Other";
    if (!grouped[persona]) grouped[persona] = [];
    grouped[persona].push(s);
  });

  const hasContent = emails.length > 0 || calls.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("prospect.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("prospect.subtitle")}</p>
      </div>

      {/* Fetch from Airtable */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          {t("prospect.hubspot_import")}
        </p>
        <div className="flex gap-2">
          <Input
            placeholder={t("prospect.hubspot_placeholder")}
            value={data.hubspot_deal_url}
            onChange={e => onChange({ hubspot_deal_url: e.target.value })}
            className="flex-1"
          />
          <Button variant="secondary" size="sm" onClick={handleFetch} disabled={fetching || !data.hubspot_deal_url}>
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("prospect.fetch")}
          </Button>
        </div>
        {stats && (
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1 text-xs">
              <Mail className="h-3 w-3" /> {stats.email_count} emails
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Phone className="h-3 w-3" /> {stats.call_count} calls
            </Badge>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {data.deal_name && (
          <div className="md:col-span-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("prospect.deal")}</span> {data.deal_name}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="company">{t("prospect.company_name")}</Label>
          <Input
            id="company"
            placeholder={t("prospect.company_placeholder")}
            value={data.company_name}
            onChange={e => onChange({ company_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>{t("prospect.sector")}</Label>
            {sectorApproximate && data.sector && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 bg-amber-50">
                {t("prospect.sector_approximate", "Approximate match")}
              </Badge>
            )}
          </div>
          <Select value={data.sector} onValueChange={v => { onChange({ sector: v }); setSectorApproximate(false); }}>
            <SelectTrigger><SelectValue placeholder={t("prospect.sector_placeholder")} /></SelectTrigger>
            <SelectContent>
              {SECTORS.map(s => <SelectItem key={s.value} value={s.value}>{t(s.key)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("prospect.country")}</Label>
          <Select value={data.country} onValueChange={v => onChange({ country: v as "ES" | "FR" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
              min={0} max={100} step={1}
              value={[seatsToSlider(data.seats)]}
              onValueChange={([v]) => onChange({ seats: sliderToSeats(v) })}
              className="flex-1"
            />
            <Input
              type="number" min={1} max={10000}
              className="w-20 h-8 text-sm text-right font-medium tabular-nums"
              value={data.seats}
              onChange={e => onChange({ seats: Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)) })}
            />
          </div>
          <div className="flex items-start gap-3 -mt-1">
            <div className="relative h-4 text-[10px] text-muted-foreground flex-1">
              {[10, 50, 100, 250, 500, 1000, 2500, 5000].map(v => (
                <span key={v} className="absolute -translate-x-1/2" style={{ left: `${seatsToSlider(v)}%` }}>
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
            id="contact_email" type="email" placeholder="maria@acme.es"
            value={data.contact_email}
            onChange={e => onChange({ contact_email: e.target.value })}
          />
        </div>
      </div>

      {/* ── Emails & Calls viewer button ─────────────────────────────── */}
      {hasContent && (
        <div className="flex gap-2">
          {emails.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => { setDialogTab("emails"); setDialogOpen(true); }}
            >
              <Eye className="h-3.5 w-3.5" />
              <Mail className="h-3.5 w-3.5" /> {emails.length} emails
            </Button>
          )}
          {calls.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => { setDialogTab("calls"); setDialogOpen(true); }}
            >
              <Eye className="h-3.5 w-3.5" />
              <Phone className="h-3.5 w-3.5" /> {calls.length} calls
            </Button>
          )}
        </div>
      )}

      {/* ── Inline pain detection ────────────────────────────────────── */}
      {suggestions.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{t("pains.detected")}</h3>
            <span className="text-xs text-muted-foreground">
              {selectedPains.filter(id => suggestions.some(s => s.pain_id === id)).length}/{suggestions.length} selected
            </span>
          </div>
          <div className="space-y-3">
            {Object.entries(grouped).map(([persona, items]) => {
              const { color, Icon } = getPersonaConfig(persona);
              return (
                <div key={persona} className="space-y-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="h-3 w-3" /> {persona}
                  </span>
                  {items.map(s => {
                    const isSelected = selectedPains.includes(s.pain_id);
                    const pain = painMap[s.pain_id];
                    return (
                      <Card
                        key={s.pain_id}
                        className={`cursor-pointer transition-colors ${isSelected ? "border-primary/50 bg-accent/50" : "opacity-50"}`}
                        style={{ borderLeft: `3px solid ${color}` }}
                        onClick={() => onTogglePain(s.pain_id)}
                      >
                        <CardContent className="py-2.5 px-4 flex items-start gap-3">
                          <div className={`mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`}>
                            {isSelected ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            {pain && <p className="text-sm font-medium text-foreground mb-0.5">{pain.pain_statement}</p>}
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
        </div>
      )}

      {/* ── Emails & Calls dialog ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{data.company_name || "Deal"} — Discovery content</span>
              <div className="flex gap-1.5 ml-auto">
                <button
                  onClick={() => setDialogTab("emails")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    dialogTab === "emails"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Mail className="h-3 w-3" /> {emails.length} emails
                </button>
                <button
                  onClick={() => setDialogTab("calls")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    dialogTab === "calls"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Phone className="h-3 w-3" /> {calls.length} calls
                </button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-2 pb-2">
              {dialogTab === "emails"
                ? emails.map((e, i) => <EmailCard key={i} email={e} />)
                : calls.map((c, i) => <CallCard key={i} call={c} />)
              }
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
