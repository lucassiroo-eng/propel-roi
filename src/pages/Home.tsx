import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogOut, TrendingUp, Clock, Loader2, ChevronRight, ChevronDown, BarChart3, FileText, History, Zap, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { statusI18nKey } from "@/lib/i18nHelpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FLAG: Record<string, string> = { ES: "\u{1F1EA}\u{1F1F8}", FR: "\u{1F1EB}\u{1F1F7}" };
const LANG_FLAG: Record<string, string> = { en: "\u{1F1EC}\u{1F1E7}", es: "\u{1F1EA}\u{1F1F8}", fr: "\u{1F1EB}\u{1F1F7}" };

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-white/10 text-white/60",
  sent: "bg-blue-400/20 text-blue-300",
  accepted: "bg-emerald-400/20 text-emerald-300",
  declined: "bg-red-400/20 text-red-300",
  generated: "bg-violet-400/20 text-violet-300",
};

interface SessionEntry {
  id: string;
  status: string;
  roi_eur: number | null;
  roi_pct: number | null;
  payback_months: number | null;
  total_annual_benefit_eur: number | null;
  updated_at: string;
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

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["roi_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roi_sessions")
        .select("id, status, roi_eur, roi_pct, payback_months, total_annual_benefit_eur, updated_at, prospect_id, prospects(id, company_name, country, seats, sector, hubspot_deal_url)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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
        id: s.id, status: s.status, roi_eur: s.roi_eur,
        roi_pct: s.roi_pct, payback_months: s.payback_months,
        total_annual_benefit_eur: s.total_annual_benefit_eur,
        updated_at: s.updated_at,
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
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}>
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white text-base">Propel ROI</span>
        </div>
        <div className="flex items-center gap-1">
          {user?.email === "lucas.siroo@factorial.co" && (
            <button
              onClick={() => navigate("/admin")}
              className="h-11 w-11 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-11 w-11 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {LANG_FLAG[i18n.language?.substring(0, 2)] ?? "\u{1F310}"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[["en", "\u{1F1EC}\u{1F1E7} English"], ["es", "\u{1F1EA}\u{1F1F8} Español"], ["fr", "\u{1F1EB}\u{1F1F7} Français"]].map(([lng, label]) => (
                <DropdownMenuItem key={lng} onClick={() => { i18n.changeLanguage(lng); localStorage.setItem("propel_locale", lng); }}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={signOut}
            className="h-11 w-11 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 px-5 pt-8 pb-24 max-w-lg mx-auto space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            ROI Simulator
          </p>
          <h1 className="text-4xl font-extrabold leading-tight text-white">
            {t("home.greeting")}
          </h1>
          <p className="text-sm text-white/50">{user?.email}</p>
        </div>

        {/* Express CTA */}
        <button
          onClick={() => navigate("/express")}
          className="w-full rounded-2xl p-5 text-left bg-white/[0.07] border border-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.12] hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
              Express
            </span>
          </div>
          <p className="text-white font-bold text-lg leading-snug">ROI Express</p>
          <p className="text-white/50 text-sm mt-1 mb-3">Pega el deal link y genera el ROI en minutos</p>
          <div className="flex items-center gap-1 text-white font-semibold text-sm">
            {t("home.start", "Empezar")} <ChevronRight className="h-4 w-4" />
          </div>
        </button>

        {/* Companies list */}
        <div>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">{t("home.recent")}</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/30" />
            </div>
          ) : !companies.length ? (
            <div className="rounded-2xl bg-white/[0.05] border border-white/10 py-12 text-center">
              <TrendingUp className="mx-auto h-10 w-10 mb-3 text-white/20" />
              <p className="text-white/40 text-sm">{t("home.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companies.map((c) => {
                const latest = c.sessions[0];
                const isExpanded = expandedCompany === c.prospectId;
                const hasHistory = c.sessions.length > 1;

                return (
                  <div key={c.prospectId} className="rounded-2xl bg-white/[0.05] border border-white/10 overflow-hidden hover:bg-white/[0.08] transition-colors">
                    {/* Main card */}
                    <button
                      onClick={() => navigate(`/express?session=${latest.id}`)}
                      className="w-full p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{FLAG[c.country] ?? "\u{1F30D}"}</span>
                            <span className="font-semibold text-white truncate text-sm">
                              {c.companyName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {c.seats && (
                              <span className="text-[11px] text-white/40">{t("home.seats", { count: c.seats })}</span>
                            )}
                            {c.sector && (
                              <span className="text-[11px] text-white/40 truncate max-w-[140px]">{c.sector}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[latest.status] ?? "bg-white/10 text-white/50"}`}>
                            {t(statusI18nKey(latest.status))}
                          </span>
                          {c.hasDocument && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-300 bg-violet-400/20 px-1.5 py-0.5 rounded-full">
                              <FileText className="h-2.5 w-2.5" />
                              ROI
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ROI metrics row */}
                      {(latest.roi_eur != null || latest.roi_pct != null) && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
                          {latest.total_annual_benefit_eur != null && (
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Ahorro</p>
                              <p className="text-sm font-bold text-white tabular-nums">{fmtEur(latest.total_annual_benefit_eur)} €</p>
                            </div>
                          )}
                          {latest.roi_eur != null && (
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">ROI neto</p>
                              <p className="text-sm font-bold text-white tabular-nums">{fmtEur(latest.roi_eur)} €</p>
                            </div>
                          )}
                          {latest.roi_pct != null && latest.roi_pct > 0 && (
                            <div className="shrink-0">
                              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">ROI</p>
                              <p className="text-sm font-bold text-emerald-400 tabular-nums">{latest.roi_pct}%</p>
                            </div>
                          )}
                          {latest.payback_months != null && latest.payback_months > 0 && (
                            <div className="shrink-0">
                              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Payback</p>
                              <p className="text-sm font-bold text-white tabular-nums">{latest.payback_months}m</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-1 text-[11px] text-white/30">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(latest.updated_at), { addSuffix: true, locale })}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-white/20" />
                      </div>
                    </button>

                    {/* History toggle */}
                    {hasHistory && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCompany(isExpanded ? null : c.prospectId);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-white/10 text-[11px] font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <History className="h-3 w-3" />
                          {t("home.versions", { count: c.sessions.length })}
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-white/10 bg-white/[0.03]">
                            {c.sessions.map((sess, i) => (
                              <button
                                key={sess.id}
                                onClick={() => navigate(`/express?session=${sess.id}`)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${i > 0 ? "border-t border-white/[0.06]" : ""}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[sess.status] ?? "bg-white/10 text-white/50"}`}>
                                    {t(statusI18nKey(sess.status))}
                                  </span>
                                  <span className="text-[11px] text-white/30">
                                    {formatDistanceToNow(new Date(sess.updated_at), { addSuffix: true, locale })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {sess.roi_pct != null && sess.roi_pct > 0 && (
                                    <span className="text-xs font-bold text-emerald-400 tabular-nums">{sess.roi_pct}%</span>
                                  )}
                                  {sess.roi_eur != null && (
                                    <span className="text-xs font-semibold text-white tabular-nums">
                                      {fmtEur(sess.roi_eur)} €
                                    </span>
                                  )}
                                  <ChevronRight className="h-3 w-3 text-white/20" />
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
    </div>
  );
}
