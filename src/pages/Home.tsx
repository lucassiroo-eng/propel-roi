import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogOut, TrendingUp, Clock, Loader2, ChevronRight, ChevronDown, BarChart3, FileText, History, ShieldCheck, HelpCircle, X, MessageSquare, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { statusI18nKey } from "@/lib/i18nHelpers";
import OnboardingModal from "@/components/OnboardingModal";
import { AppHeader } from "@/components/AppHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FLAG: Record<string, string> = { ES: "\u{1F1EA}\u{1F1F8}", FR: "\u{1F1EB}\u{1F1F7}", IT: "\u{1F1EE}\u{1F1F9}", DE: "\u{1F1E9}\u{1F1EA}" };

function emailToShortName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(".");
  if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " + parts[1].charAt(0).toUpperCase() + ".";
  return local.charAt(0).toUpperCase() + local.slice(1);
}
const LANG_FLAG: Record<string, string> = { en: "\u{1F1EC}\u{1F1E7}", es: "\u{1F1EA}\u{1F1F8}", fr: "\u{1F1EB}\u{1F1F7}", it: "\u{1F1EE}\u{1F1F9}", de: "\u{1F1E9}\u{1F1EA}" };

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-600",
  accepted: "bg-emerald-50 text-emerald-600",
  declined: "bg-red-50 text-red-600",
  generated: "bg-violet-50 text-violet-600",
  co_created: "bg-indigo-50 text-indigo-600",
  pre_call: "bg-amber-50 text-amber-600",
  during_call: "bg-sky-50 text-sky-600",
  post_call: "bg-emerald-50 text-emerald-600",
};

interface SessionEntry {
  id: string;
  status: string;
  flow_type: string;
  roi_eur: number | null;
  roi_pct: number | null;
  payback_months: number | null;
  total_annual_benefit_eur: number | null;
  updated_at: string;
  pae_id: string;
}

interface CompanyGroup {
  prospectId: string;
  companyName: string;
  country: string;
  seats: number | null;
  sector: string | null;
  hubspotUrl: string | null;
  sessions: SessionEntry[];
  hasDocument: boolean;
}

/* ─── Home page ─── */
export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("propel_onboarded"));
  const [listOpen, setListOpen] = useState(true);


  const { data: isAdmin, isSuccess: isAdminResolved } = useQuery({
    queryKey: ["user_role_home", user?.id],
    queryFn: async () => {
      if (!user) return false;
      if (user.email === "lucas.siroo@factorial.co") return true;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["strategy_admin", "super_admin"]);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user,
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["roi_sessions", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("roi_sessions")
        .select("id, status, flow_type, roi_eur, roi_pct, payback_months, total_annual_benefit_eur, updated_at, pae_id, prospect_id, prospects(id, company_name, country, seats, sector, hubspot_deal_url)")
        .order("updated_at", { ascending: false });
      // Only filter by pae_id for non-admins — wait for isAdmin to resolve first
      if (!isAdmin) query = query.eq("pae_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    // Wait for isAdmin to resolve before firing — prevents non-admins seeing all sessions
    enabled: !!user && isAdminResolved,
  });

  const sessionPaeIds = isAdmin && sessions?.length
    ? [...new Set((sessions as any[]).map((s: any) => s.pae_id).filter(Boolean))].sort().join(",")
    : "";

  const { data: ownerEmailMap } = useQuery({
    queryKey: ["owner_emails_home", sessionPaeIds],
    queryFn: async () => {
      if (!sessionPaeIds) return new Map<string, string>();
      const paeIds = sessionPaeIds.split(",");
      try {
        const { data } = await supabase.rpc("get_user_emails", { _user_ids: paeIds });
        return new Map<string, string>((data || []).map((r: any) => [r.user_id, r.email]));
      } catch { return new Map<string, string>(); }
    },
    enabled: !!sessionPaeIds,
  });

  const companies = (() => {
    if (!sessions?.length) return [];
    const map = new Map<string, CompanyGroup>();
    for (const s of sessions as any[]) {
      const prospect = s.prospects;
      if (!prospect) continue;
      const name = (prospect.company_name ?? "").trim().toLowerCase();
      const key = name || s.prospect_id;
      const entry: SessionEntry = {
        id: s.id, status: s.status, flow_type: s.flow_type ?? "co_created", roi_eur: s.roi_eur,
        roi_pct: s.roi_pct, payback_months: s.payback_months,
        total_annual_benefit_eur: s.total_annual_benefit_eur,
        updated_at: s.updated_at,
        pae_id: s.pae_id ?? "",
      };
      if (!map.has(key)) {
        map.set(key, {
          prospectId: prospect.id ?? s.prospect_id,
          companyName: prospect.company_name ?? "Untitled",
          country: prospect.country ?? "",
          seats: prospect.seats ?? null,
          sector: prospect.sector ?? null,
          hubspotUrl: prospect.hubspot_deal_url ?? null,
          sessions: [entry],
          hasDocument: s.status === "generated",
        });
      } else {
        const group = map.get(key)!;
        group.sessions.push(entry);
        if (s.status === "generated") group.hasDocument = true;
        if (prospect.seats && (!group.seats || prospect.seats > group.seats)) {
          group.seats = prospect.seats;
        }
        if (prospect.hubspot_deal_url && !group.hubspotUrl) {
          group.hubspotUrl = prospect.hubspot_deal_url;
        }
      }
    }
    return Array.from(map.values());
  })();

  const locale = i18n.language.startsWith("es") ? es : i18n.language.startsWith("fr") ? fr : undefined;
  const fmtEur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background">
      {showOnboarding && (
        <OnboardingModal
          mode={localStorage.getItem("propel_onboarded") ? "slides" : "full"}
          onComplete={() => setShowOnboarding(false)}
          onStartTour={() => { setShowOnboarding(false); navigate("/co-creation?demo=true"); }}
          onCreateRoi={() => navigate("/co-creation")}
        />
      )}

      <AppHeader />

      <main className="relative z-10 px-6 pt-8 pb-16 max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight text-foreground">
              {t("home.greeting")}{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">ROI Simulator</p>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={t("tutorial.help")}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Two CTAs */}
        <div className="grid grid-cols-2 gap-3">
          {/* Co-creation — primary */}
          <button
            onClick={() => navigate("/co-creation")}
            className="rounded-2xl p-5 text-left bg-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="w-10 h-10 rounded-xl bg-background/15 flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 text-background" />
            </div>
            <p className="text-background font-bold text-base leading-snug">{t("home.cocreate_title", "Co-crea un ROI")}</p>
            <p className="text-background/55 text-xs mt-1 mb-3 leading-relaxed">{t("home.cocreate_sub", "Con el prospect, en tiempo real")}</p>
            <div className="flex items-center gap-1 text-background/80 font-semibold text-xs">
              {t("home.start", "Empezar")} <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>

          {/* Assumptions ROI — secondary */}
          <button
            onClick={() => navigate("/mini-roi")}
            className="rounded-2xl p-5 text-left bg-card border-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-foreground font-bold text-base leading-snug">ROI basado en asunciones</p>
            <p className="text-muted-foreground text-xs mt-1 mb-3 leading-relaxed">{t("home.mini_roi_sub", "IA genera el análisis automáticamente")}</p>
            <div className="flex items-center gap-1 text-primary font-semibold text-xs">
              {t("home.start", "Empezar")} <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>

        {/* Companies list — collapsible */}
        <div>
          <button
            onClick={() => setListOpen(o => !o)}
            className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 hover:text-foreground transition-colors"
          >
            <span>{t("home.recent")} {companies.length > 0 && `(${companies.length})`}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${listOpen ? "" : "-rotate-90"}`} />
          </button>
          {listOpen && isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !companies.length ? (
            <div className="rounded-2xl bg-card border border-border py-12 text-center">
              <TrendingUp className="mx-auto h-10 w-10 mb-3 text-primary/30" />
              <p className="text-muted-foreground text-sm">{t("home.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companies.map((c) => {
                const latest = c.sessions[0];
                const isExpanded = expandedCompany === c.prospectId;
                const hasHistory = c.sessions.length > 1;
                const ownerEmail = isAdmin ? (ownerEmailMap?.get(latest.pae_id) ?? "") : "";
                const ownerName = ownerEmail ? emailToShortName(ownerEmail) : "";
                const savings = latest.total_annual_benefit_eur;
                const roiPct = latest.roi_pct;
                const payback = latest.payback_months;

                return (
                  <div key={c.prospectId} className="rounded-xl bg-card border border-border overflow-hidden hover:border-foreground/20 hover:shadow-sm transition-all">
                    <button
                      onClick={() => latest.flow_type === "mini_roi"
                        ? navigate(`/mini-roi/${latest.id}`)
                        : navigate(`/co-creation?session=${latest.id}`)
                      }
                      className="w-full px-5 py-4 text-left hover:bg-muted/20 transition-colors focus-visible:outline-none"
                    >
                      {/* Top row: company + badges */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg leading-none">{FLAG[c.country] ?? "\u{1F30D}"}</span>
                          <span className="font-bold text-foreground text-base truncate">{c.companyName}</span>
                          {c.seats && <span className="text-xs text-muted-foreground shrink-0">{c.seats} seats</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {latest.flow_type === "mini_roi" && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">Asunciones</span>
                          )}
                          {ownerName && (
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{ownerName}</span>
                          )}
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[latest.status] ?? "bg-gray-100 text-gray-500"}`}>
                            {t(statusI18nKey(latest.status))}
                          </span>
                        </div>
                      </div>

                      {/* Metrics row */}
                      {savings != null && savings > 0 && (
                        <div className="flex items-end gap-6 mt-4 pt-3.5 border-t border-border/50">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Ahorro anual</p>
                            <p className="text-xl font-extrabold text-foreground tabular-nums leading-none">{fmtEur(savings)} €</p>
                          </div>
                          {roiPct != null && roiPct > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">ROI</p>
                              <p className="text-xl font-extrabold text-emerald-600 tabular-nums leading-none">+{roiPct}%</p>
                            </div>
                          )}
                          {payback != null && payback > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Payback</p>
                              <p className="text-xl font-extrabold text-foreground tabular-nums leading-none">{payback}m</p>
                            </div>
                          )}
                          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(latest.updated_at), { addSuffix: true, locale })}
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-1" />
                          </div>
                        </div>
                      )}
                      {(savings == null || savings === 0) && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(latest.updated_at), { addSuffix: true, locale })}
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </div>
                      )}
                    </button>

                    {hasHistory && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCompany(isExpanded ? null : c.prospectId);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <History className="h-3 w-3" />
                          {t("home.versions", { count: c.sessions.length })}
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border bg-muted/30">
                            {c.sessions.map((sess, i) => (
                              <button
                                key={sess.id}
                                onClick={() => navigate(`/co-creation?session=${sess.id}`)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${i > 0 ? "border-t border-border/60" : ""}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[sess.status] ?? "bg-gray-100 text-gray-500"}`}>
                                    {t(statusI18nKey(sess.status))}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(sess.updated_at), { addSuffix: true, locale })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {sess.roi_pct != null && sess.roi_pct > 0 && (
                                    <span className="text-xs font-bold text-emerald-600 tabular-nums">{sess.roi_pct}%</span>
                                  )}
                                  {sess.roi_eur != null && (
                                    <span className="text-xs font-semibold text-foreground tabular-nums">
                                      {fmtEur(sess.roi_eur)} €
                                    </span>
                                  )}
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <FeedbackButton page="home" />
    </div>
  );
}
