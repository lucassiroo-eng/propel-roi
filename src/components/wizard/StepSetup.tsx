import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Loader2, Link as LinkIcon, Mail, Phone, FileText,
  Database, Cloud, CheckCircle2, Users, Briefcase, Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProspectData, HubSpotNote } from "@/hooks/useWizardSession";
import type { RoiConfig } from "@/hooks/useWizardSession";
import { defaultHeadcounts, type Stakeholder } from "@/lib/moduleHours";

const WORKER = "https://noshow.lucassiroo.workers.dev";
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

function mapCountry(raw: string): "ES" | "FR" | null {
  const lower = (raw ?? "").toLowerCase().trim();
  if (["es", "spain", "españa", "espagne"].includes(lower)) return "ES";
  if (["fr", "france", "francia"].includes(lower)) return "FR";
  return null;
}

function mapIndustry(raw: string): string {
  const lower = (raw ?? "").toLowerCase();
  const map: Record<string, string> = {
    technology: "Software & IT Services", software: "Software & IT Services",
    retail: "Retailing", healthcare: "Health Care Equipment & Services",
    education: "Education", construction: "Construction & Engineering",
    hospitality: "Hospitality", food: "Food, Beverage & Tobacco",
    energy: "Energy", transportation: "Transportation",
    media: "Media & Entertainment", banking: "Banking & Insurance",
    insurance: "Banking & Insurance", legal: "Legal Services",
  };
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return "";
}

const STAKEHOLDER_META: Record<Stakeholder, { label: string; sublabel: string; icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { label: "Employees",    sublabel: "~80% of seats", icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)" },
  hr:       { label: "HR / Finance", sublabel: "~5% of seats",  icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.2)" },
  manager:  { label: "Managers",     sublabel: "~15% of seats", icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)" },
};

interface Props {
  data: ProspectData;
  roiConfig: RoiConfig;
  onChange: (d: Partial<ProspectData>) => void;
  onRoiConfigChange: (config: RoiConfig) => void;
  seats: number;
}

export function StepSetup({ data, roiConfig, onChange, onRoiConfigChange, seats }: Props) {
  const { t } = useTranslation();
  const [fetching, setFetching] = useState(false);
  const [fetchPhase, setFetchPhase] = useState<"idle" | "airtable" | "hubspot" | "done">("idle");
  const { headcounts, hourly_costs } = roiConfig;

  useEffect(() => {
    const isDefault = headcounts.employee === 40 && headcounts.hr === 3 && headcounts.manager === 8;
    const isEmpty = headcounts.employee + headcounts.hr + headcounts.manager === 0;
    if (isEmpty || isDefault) {
      onRoiConfigChange({ ...roiConfig, headcounts: defaultHeadcounts(seats) });
    }
  }, []);

  function setHeadcount(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, headcounts: { ...headcounts, [key]: Math.max(0, value) } });
  }
  function setHourlyCost(key: Stakeholder, value: number) {
    onRoiConfigChange({ ...roiConfig, hourly_costs: { ...hourly_costs, [key]: Math.max(0, value) } });
  }
  function handleSeatsChange(newSeats: number) {
    onChange({ seats: newSeats });
    onRoiConfigChange({ ...roiConfig, headcounts: defaultHeadcounts(newSeats) });
  }

  async function handleFetch() {
    const url = data.hubspot_deal_url?.trim();
    if (!url) { toast.error(t("prospect.hubspot_paste_first")); return; }

    setFetching(true);
    setFetchPhase("airtable");

    try {
      let found = false;

      // Try Airtable first
      try {
        const atRes = await fetch(`${WORKER}/airtable`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deal_url: url }),
        });
        const atResult = atRes.ok ? await atRes.json() : null;
        if (atResult && !atResult.error) {
          const emails = atResult.emails ?? [];
          const calls = atResult.calls ?? [];
          if (emails.length > 0 || calls.length > 0) {
            found = true;
            const updates: Partial<ProspectData> = { fetch_source: "airtable", airtable_emails: emails, airtable_calls: calls, airtable_stats: { email_count: emails.length, call_count: calls.length } };
            if (atResult.deal?.company_name) updates.company_name = atResult.deal.company_name;
            if (atResult.deal?.name) updates.deal_name = atResult.deal.name;
            if (atResult.deal?.contacts_info) {
              const ci = atResult.deal.contacts_info;
              const nameMatch = ci.match(/([A-ZÀ-ÿ][a-zà-ÿ]+ [A-ZÀ-ÿ][a-zà-ÿ]+)/);
              const emailMatch = ci.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
              if (nameMatch) updates.contact_name = nameMatch[1];
              if (emailMatch) updates.contact_email = emailMatch[0];
            }
            onChange(updates);
            toast.success(`Airtable: ${emails.length} emails, ${calls.length} calls`);
          }
        }
      } catch { /* fallback */ }

      // Fallback to HubSpot
      if (!found) {
        setFetchPhase("hubspot");
        const hsRes = await fetch(`${WORKER}/hubspot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deal_url: url }),
        });
        const hs = await hsRes.json();
        if (!hsRes.ok || hs?.error) throw new Error(hs?.error ?? "HubSpot fetch failed");

        const updates: Partial<ProspectData> = { fetch_source: "hubspot" };
        if (hs.deal_name) updates.deal_name = hs.deal_name;
        if (hs.company_name) updates.company_name = hs.company_name;
        if (hs.contact_name) updates.contact_name = hs.contact_name;
        if (hs.contact_email) updates.contact_email = hs.contact_email;
        const mappedCountry = mapCountry(hs.country ?? "");
        if (mappedCountry) updates.country = mappedCountry;
        const mappedIndustry = mapIndustry(hs.industry ?? "");
        if (mappedIndustry) updates.sector = mappedIndustry;
        const empCount = parseInt(hs.employees);
        if (empCount > 0) {
          const clamped = Math.min(Math.max(empCount, SEATS_MIN), SEATS_MAX);
          updates.seats = clamped;
        }
        const notes: HubSpotNote[] = hs.notes ?? [];
        if (notes.length > 0) updates.hubspot_notes = notes;
        onChange(updates);

        if (empCount > 0) {
          onRoiConfigChange({ ...roiConfig, headcounts: defaultHeadcounts(Math.min(Math.max(empCount, SEATS_MIN), SEATS_MAX)) });
        }

        const parts = [];
        if (notes.length) parts.push(`${notes.length} notes`);
        toast.success(`HubSpot: ${hs.company_name ?? "Deal found"}${parts.length ? ` · ${parts.join(", ")}` : ""}`);
      }

      setFetchPhase("done");
    } catch (err: any) {
      setFetchPhase("idle");
      toast.error(err.message ?? "Failed to fetch deal");
    } finally {
      setFetching(false);
    }
  }

  const emails = data.airtable_emails ?? [];
  const calls = data.airtable_calls ?? [];
  const notes = data.hubspot_notes ?? [];
  const source = data.fetch_source;
  const totalPeople = headcounts.employee + headcounts.hr + headcounts.manager;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Quick ROI Setup</h2>
        <p className="text-sm text-muted-foreground mt-1">Import a deal and configure your team structure</p>
      </div>

      {/* Fetch section */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          Import Deal
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="https://app.hubspot.com/contacts/.../deal/..."
            value={data.hubspot_deal_url}
            onChange={e => onChange({ hubspot_deal_url: e.target.value })}
            className="flex-1"
          />
          <Button variant="secondary" onClick={handleFetch} disabled={fetching || !data.hubspot_deal_url}>
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
          </Button>
        </div>

        {/* Status badges */}
        {(source || fetching) && (
          <div className="flex gap-2 flex-wrap items-center">
            {fetching && (
              <Badge variant="outline" className="gap-1.5 text-xs animate-pulse">
                {fetchPhase === "airtable" ? <Database className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                {fetchPhase === "airtable" ? "Searching Airtable..." : "Fetching HubSpot..."}
              </Badge>
            )}
            {source && !fetching && (
              <>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  {source === "airtable" ? <Database className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {source === "airtable" ? "Airtable" : "HubSpot"}
                </Badge>
                {emails.length > 0 && <Badge variant="outline" className="gap-1 text-xs"><Mail className="h-3 w-3" /> {emails.length}</Badge>}
                {calls.length > 0 && <Badge variant="outline" className="gap-1 text-xs"><Phone className="h-3 w-3" /> {calls.length}</Badge>}
                {notes.length > 0 && <Badge variant="outline" className="gap-1 text-xs"><FileText className="h-3 w-3" /> {notes.length}</Badge>}
              </>
            )}
          </div>
        )}

        {/* Deal info */}
        {data.deal_name && (
          <div className="rounded-lg bg-white/60 border border-border/50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{data.company_name || data.deal_name}</p>
              {data.company_name && data.deal_name && (
                <p className="text-xs text-muted-foreground mt-0.5">{data.deal_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Company name + seats if no deal fetched */}
        {!data.deal_name && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company name *</Label>
              <Input
                placeholder="Acme SL"
                value={data.company_name}
                onChange={e => onChange({ company_name: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Employees slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Employees: {data.seats}</Label>
        </div>
        <div className="flex items-center gap-3">
          <Slider
            min={0} max={100} step={1}
            value={[seatsToSlider(data.seats)]}
            onValueChange={([v]) => handleSeatsChange(sliderToSeats(v))}
            className="flex-1"
          />
          <Input
            type="number" min={1} max={10000}
            className="w-20 h-9 text-sm text-right font-semibold tabular-nums"
            value={data.seats}
            onChange={e => handleSeatsChange(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
          />
        </div>
      </div>

      {/* Stakeholder cards */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Team breakdown</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["employee", "hr", "manager"] as Stakeholder[]).map(key => {
            const meta = STAKEHOLDER_META[key];
            const Icon = meta.icon;
            return (
              <div
                key={key}
                className="rounded-xl p-4 space-y-4 transition-shadow hover:shadow-sm"
                style={{ backgroundColor: meta.bg, border: `1.5px solid ${meta.border}` }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.color }}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{meta.label}</p>
                    <p className="text-[10px] text-muted-foreground">{meta.sublabel}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">People</label>
                    <Input
                      type="number" min={0}
                      className="h-10 text-center text-lg font-bold tabular-nums bg-white/80"
                      value={headcounts[key]}
                      onChange={e => setHeadcount(key, parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">€/hour</label>
                    <Input
                      type="number" min={0} step={5}
                      className="h-10 text-center text-lg font-bold tabular-nums bg-white/80"
                      value={hourly_costs[key]}
                      onChange={e => setHourlyCost(key, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{totalPeople}</strong> people total
          </span>
          <span className="text-xs text-muted-foreground">
            Weighted avg: <strong className="text-foreground">
              €{totalPeople > 0 ? Math.round((headcounts.employee * hourly_costs.employee + headcounts.hr * hourly_costs.hr + headcounts.manager * hourly_costs.manager) / totalPeople) : 0}
            </strong>/h
          </span>
        </div>
      </div>
    </div>
  );
}
