import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Link as LinkIcon, Mail, Phone, FileText,
  ChevronDown, ChevronRight, Eye, Database, Cloud,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProspectData, AirtableSuggestion, AirtableEmail, AirtableCall, HubSpotNote } from "@/hooks/useWizardSession";

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

// ── Unified fetched item type ──────────────────────────────────────
type FetchedItem =
  | { kind: "email"; data: AirtableEmail }
  | { kind: "call"; data: AirtableCall }
  | { kind: "note"; data: HubSpotNote };

// ── Country / industry mapping helpers ─────────────────────────────
function mapCountry(raw: string): "ES" | "FR" | null {
  const lower = (raw ?? "").toLowerCase().trim();
  if (["es", "spain", "españa", "espagne"].includes(lower)) return "ES";
  if (["fr", "france", "francia"].includes(lower)) return "FR";
  return null;
}

function mapIndustry(raw: string): string {
  const lower = (raw ?? "").toLowerCase();
  const map: Record<string, string> = {
    technology: "Software & IT Services",
    software: "Software & IT Services",
    retail: "Retailing",
    healthcare: "Health Care Equipment & Services",
    health: "Health Care Equipment & Services",
    education: "Education",
    construction: "Construction & Engineering",
    hospitality: "Hospitality",
    food: "Food, Beverage & Tobacco",
    energy: "Energy",
    transportation: "Transportation",
    media: "Media & Entertainment",
    banking: "Banking & Insurance",
    insurance: "Banking & Insurance",
    legal: "Legal Services",
    agriculture: "Agriculture",
    real_estate: "Real Estate",
    consulting: "Research & Consulting Services",
    manufacturing: "Machinery",
    automotive: "Automobiles & Components",
    nonprofit: "Non-Profit Organisation",
  };
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v;
  }
  return "";
}

// ── Collapsible item cards ─────────────────────────────────────────
function EmailCard({ email }: { email: AirtableEmail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <Mail className="h-4 w-4 shrink-0 text-blue-500" />
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
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <Phone className="h-4 w-4 shrink-0 text-green-500" />
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

function NoteCard({ note }: { note: HubSpotNote }) {
  const [open, setOpen] = useState(false);
  const preview = (note.body ?? "").replace(/<[^>]*>/g, "").slice(0, 120);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <FileText className="h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{preview || "(empty note)"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {note.created_at?.slice(0, 10)}
          </p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-border bg-muted/20">
          <div
            className="text-sm text-foreground mt-2 leading-relaxed [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
            dangerouslySetInnerHTML={{ __html: note.body || "(empty)" }}
          />
        </div>
      )}
    </div>
  );
}

// ── Skeleton pulse for loading ─────────────────────────────────────
function ItemSkeleton({ icon: Icon, color }: { icon: typeof Mail; color: string }) {
  return (
    <div className="border border-border rounded-lg px-4 py-3 flex items-center gap-3 animate-pulse">
      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-3/4" />
        <div className="h-2.5 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────
interface Props {
  data: ProspectData;
  onChange: (d: Partial<ProspectData>) => void;
  selectedPains: string[];
  onTogglePain: (painId: string) => void;
  onPainsAutoSelected: (painIds: string[], suggestions: AirtableSuggestion[]) => void;
}

export function StepProspect({ data, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const [fetching, setFetching] = useState(false);
  const [fetchPhase, setFetchPhase] = useState<"idle" | "airtable" | "hubspot" | "done">("idle");
  const [fetchItems, setFetchItems] = useState<FetchedItem[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"emails" | "calls" | "notes">("emails");
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Progressive reveal animation
  useEffect(() => {
    if (fetchItems.length === 0 || revealedCount >= fetchItems.length) {
      if (revealTimer.current) clearInterval(revealTimer.current);
      return;
    }
    revealTimer.current = setInterval(() => {
      setRevealedCount(c => {
        if (c >= fetchItems.length) {
          if (revealTimer.current) clearInterval(revealTimer.current);
          return c;
        }
        return c + 1;
      });
    }, 180);
    return () => { if (revealTimer.current) clearInterval(revealTimer.current); };
  }, [fetchItems, revealedCount]);

  async function handleFetch() {
    const url = data.hubspot_deal_url?.trim();
    if (!url) {
      toast.error(t("prospect.hubspot_paste_first"));
      return;
    }

    setFetching(true);
    setFetchItems([]);
    setRevealedCount(0);
    setFetchPhase("airtable");

    let usedSource: "airtable" | "hubspot" = "airtable";
    let allItems: FetchedItem[] = [];

    try {
      // ── Step 1: Try Airtable ──
      let airtableOk = false;
      try {
        const { data: atResult, error: atError } = await supabase.functions.invoke("airtable-deal-fetch", {
          body: {
            deal_url: url,
            country: data.country,
            sector: data.sector,
            language: i18n.language?.substring(0, 2) ?? "en",
          },
        });

        if (!atError && atResult && !atResult.error) {
          const emails: AirtableEmail[] = atResult.emails ?? [];
          const calls: AirtableCall[] = atResult.calls ?? [];

          if (emails.length > 0 || calls.length > 0) {
            airtableOk = true;
            usedSource = "airtable";

            // Fill form fields from Airtable
            const updates: Partial<ProspectData> = { fetch_source: "airtable" };
            if (atResult.deal?.company_name && !data.company_name) updates.company_name = atResult.deal.company_name;
            if (atResult.deal?.name) updates.deal_name = atResult.deal.name;
            if (atResult.deal?.contacts_info) {
              const ci = atResult.deal.contacts_info;
              const nameMatch = ci.match(/([A-ZÀ-ÿ][a-zà-ÿ]+ [A-ZÀ-ÿ][a-zà-ÿ]+)/);
              const emailMatch = ci.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
              if (nameMatch && !data.contact_name) updates.contact_name = nameMatch[1];
              if (emailMatch && !data.contact_email) updates.contact_email = emailMatch[0];
            }
            updates.airtable_emails = emails;
            updates.airtable_calls = calls;
            updates.airtable_stats = { email_count: emails.length, call_count: calls.length };

            onChange(updates);

            // Build unified items sorted by date
            const emailItems: FetchedItem[] = emails.map(e => ({ kind: "email" as const, data: e }));
            const callItems: FetchedItem[] = calls.map(c => ({ kind: "call" as const, data: c }));
            allItems = [...emailItems, ...callItems].sort((a, b) => {
              const dateA = a.kind === "email" ? a.data.date : a.data.date;
              const dateB = b.kind === "email" ? b.data.date : b.data.date;
              return (dateA ?? "").localeCompare(dateB ?? "");
            });
          }
        }
      } catch {
        // Airtable failed silently — will fallback
      }

      // ── Step 2: Fallback to HubSpot ──
      if (!airtableOk) {
        setFetchPhase("hubspot");
        usedSource = "hubspot";

        const { data: hsResult, error: hsError } = await supabase.functions.invoke("hubspot-deal", {
          body: { deal_url: url },
        });

        if (hsError) throw new Error(hsError.message ?? "HubSpot fetch failed");
        if (hsResult?.error) throw new Error(hsResult.error);

        // Fill form fields from HubSpot
        const updates: Partial<ProspectData> = { fetch_source: "hubspot" };
        if (hsResult.deal_name) updates.deal_name = hsResult.deal_name;
        if (hsResult.company_name && !data.company_name) updates.company_name = hsResult.company_name;
        if (hsResult.contact_name && !data.contact_name) updates.contact_name = hsResult.contact_name;
        if (hsResult.contact_email && !data.contact_email) updates.contact_email = hsResult.contact_email;

        const mappedCountry = mapCountry(hsResult.country ?? "");
        if (mappedCountry) updates.country = mappedCountry;

        const mappedIndustry = mapIndustry(hsResult.industry ?? "");
        if (mappedIndustry && !data.sector) updates.sector = mappedIndustry;

        const empCount = parseInt(hsResult.employees);
        if (empCount > 0) updates.seats = Math.min(Math.max(empCount, SEATS_MIN), SEATS_MAX);

        const notes: HubSpotNote[] = hsResult.notes ?? [];
        if (notes.length > 0) updates.hubspot_notes = notes;

        onChange(updates);

        allItems = notes.map(n => ({ kind: "note" as const, data: n }));
      }

      // Start progressive reveal
      setFetchItems(allItems);
      setRevealedCount(0);
      setFetchPhase("done");

      const counts = {
        emails: allItems.filter(i => i.kind === "email").length,
        calls: allItems.filter(i => i.kind === "call").length,
        notes: allItems.filter(i => i.kind === "note").length,
      };
      const parts = [];
      if (counts.emails) parts.push(`${counts.emails} emails`);
      if (counts.calls) parts.push(`${counts.calls} calls`);
      if (counts.notes) parts.push(`${counts.notes} notes`);
      toast.success(`${usedSource === "airtable" ? "Airtable" : "HubSpot"}: ${parts.join(", ") || "No content found"}`);
    } catch (err: any) {
      setFetchPhase("idle");
      toast.error(err.message ?? "Failed to fetch deal");
    } finally {
      setFetching(false);
    }
  }

  // Derived counts for dialog tabs
  const emails = data.airtable_emails ?? [];
  const calls = data.airtable_calls ?? [];
  const notes = data.hubspot_notes ?? [];
  const hasContent = emails.length > 0 || calls.length > 0 || notes.length > 0;
  const source = data.fetch_source;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("prospect.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("prospect.subtitle")}</p>
      </div>

      {/* ── Fetch section ──────────────────────────────────────────── */}
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

        {/* Source + stats badges */}
        {(source || fetching) && (
          <div className="flex gap-2 flex-wrap items-center">
            {fetchPhase === "airtable" && (
              <Badge variant="outline" className="gap-1.5 text-xs animate-pulse">
                <Database className="h-3 w-3" /> Searching Airtable...
              </Badge>
            )}
            {fetchPhase === "hubspot" && (
              <Badge variant="outline" className="gap-1.5 text-xs animate-pulse">
                <Cloud className="h-3 w-3" /> Fetching from HubSpot...
              </Badge>
            )}
            {source && !fetching && (
              <Badge variant="outline" className="gap-1.5 text-xs">
                {source === "airtable" ? <Database className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {source === "airtable" ? "Airtable" : "HubSpot"}
              </Badge>
            )}
            {!fetching && emails.length > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Mail className="h-3 w-3" /> {emails.length} emails
              </Badge>
            )}
            {!fetching && calls.length > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Phone className="h-3 w-3" /> {calls.length} calls
              </Badge>
            )}
            {!fetching && notes.length > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <FileText className="h-3 w-3" /> {notes.length} notes
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ── Progressive loading feed ───────────────────────────────── */}
      {(fetching || fetchItems.length > 0) && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-foreground">
              {fetching ? "Loading discovery content..." : "Discovery content"}
            </p>
            {!fetching && fetchItems.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {revealedCount}/{fetchItems.length} items
              </span>
            )}
          </div>

          {/* Loading skeletons while waiting for API */}
          {fetching && fetchItems.length === 0 && (
            <div className="space-y-2">
              <ItemSkeleton icon={Mail} color="text-blue-400" />
              <ItemSkeleton icon={Phone} color="text-green-400" />
              <ItemSkeleton icon={Mail} color="text-blue-400" />
            </div>
          )}

          {/* Progressively revealed items */}
          <ScrollArea className={fetchItems.length > 6 ? "max-h-[340px]" : ""}>
            <div className="space-y-2 pr-2">
              {fetchItems.slice(0, revealedCount).map((item, i) => (
                <div
                  key={i}
                  className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {item.kind === "email" && <EmailCard email={item.data} />}
                  {item.kind === "call" && <CallCard call={item.data} />}
                  {item.kind === "note" && <NoteCard note={item.data} />}
                </div>
              ))}

              {/* Still revealing — show next skeleton */}
              {!fetching && revealedCount < fetchItems.length && (
                <ItemSkeleton
                  icon={fetchItems[revealedCount]?.kind === "call" ? Phone : fetchItems[revealedCount]?.kind === "note" ? FileText : Mail}
                  color={fetchItems[revealedCount]?.kind === "call" ? "text-green-400" : fetchItems[revealedCount]?.kind === "note" ? "text-amber-400" : "text-blue-400"}
                />
              )}
            </div>
          </ScrollArea>

          {/* View all button */}
          {!fetching && revealedCount >= fetchItems.length && fetchItems.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-xs text-muted-foreground"
              onClick={() => {
                setDialogTab(emails.length > 0 ? "emails" : calls.length > 0 ? "calls" : "notes");
                setDialogOpen(true);
              }}
            >
              <Eye className="h-3.5 w-3.5" /> View all in expanded view
            </Button>
          )}
        </div>
      )}

      {/* ── Form fields ────────────────────────────────────────────── */}
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
          <Label>{t("prospect.sector")}</Label>
          <Select value={data.sector} onValueChange={v => onChange({ sector: v })}>
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

      {/* ── Full content dialog ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{data.company_name || "Deal"} — Discovery content</span>
              <div className="flex gap-1.5 ml-auto">
                {emails.length > 0 && (
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
                )}
                {calls.length > 0 && (
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
                )}
                {notes.length > 0 && (
                  <button
                    onClick={() => setDialogTab("notes")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      dialogTab === "notes"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <FileText className="h-3 w-3" /> {notes.length} notes
                  </button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-2 pb-2">
              {dialogTab === "emails" && emails.map((e, i) => <EmailCard key={i} email={e} />)}
              {dialogTab === "calls" && calls.map((c, i) => <CallCard key={i} call={c} />)}
              {dialogTab === "notes" && notes.map((n, i) => <NoteCard key={i} note={n} />)}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
