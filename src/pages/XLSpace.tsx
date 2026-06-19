import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Clock, Loader2, ChevronRight, ChevronDown, History, MessageSquare, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { statusI18nKey } from "@/lib/i18nHelpers";
import { AppHeader } from "@/components/AppHeader";
import { FeedbackButton } from "@/components/FeedbackButton";

const FLAG: Record<string, string> = { ES: "🇪🇸", FR: "🇫🇷", IT: "🇮🇹", DE: "🇩🇪" };

function emailToShortName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(".");
  if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + " " + parts[1].charAt(0).toUpperCase() + ".";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-600",
  accepted: "bg-emerald-50 text-emerald-600",
  declined: "bg-red-50 text-red-600",
  generated: "bg-violet-50 text-violet-600",
  co_created: "bg-indigo-50 text-indigo-600",
  xl_co_created: "bg-violet-50 text-violet-700",
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
  hubspotUrl: string | null;
  sessions: SessionEntry[];
}

export default function XLSpace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["xl_roi_sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roi_sessions")
        .select("id, status, flow_type, roi_eur, roi_pct, payback_months, total_annual_benefit_eur, updated_at, pae_id, prospect_id, prospects(id, company_name, country, seats, hubspot_deal_url)")
        .eq("flow_type", "xl_co_created")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const sessionPaeIds = sessions?.length
    ? [...new Set((sessions as any[]).map((s: any) => s.pae_id).filter(Boolean))].sort().join(",")
    : "";

  const { data: ownerEmailMap } = useQuery({
    queryKey: ["xl_owner_emails", sessionPaeIds],
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
        id: s.id, status: s.status, flow_type: s.flow_type ?? "xl_co_created",
        roi_eur: s.roi_eur, roi_pct: s.roi_pct, payback_months: s.payback_months,
        total_annual_benefit_eur: s.total_annual_benefit_eur,
        updated_at: s.updated_at, pae_id: s.pae_id ?? "",
      };
      if (!map.has(key)) {
        map.set(key, {
          prospectId: prospect.id ?? s.prospect_id,
          companyName: prospect.company_name ?? "Untitled",
          country: prospect.country ?? "",
          seats: prospect.seats ?? null,
          hubspotUrl: prospect.hubspot_deal_url ?? null,
          sessions: [entry],
        });
      } else {
        const group = map.get(key)!;
        group.sessions.push(entry);
      }
    }
    return Array.from(map.values());
  })();

  const locale = i18n.language.startsWith("es") ? es : i18n.language.startsWith("fr") ? fr : undefined;
  const fmtEur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background">
      <AppHeader />

      <main className="relative z-10 px-6 pt-8 pb-16 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">XL Space</span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight text-foreground">
              Co-creación avanzada
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Acceso restringido · ROI co-creado</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/xl-co-creation")}
          className="w-full rounded-2xl p-5 text-left bg-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-background/15 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-background" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-background font-bold text-base">Nueva sesión co-creada</p>
              <p className="text-background/55 text-xs mt-0.5">Con el prospect, en tiempo real · XL Flow</p>
            </div>
            <div className="flex items-center gap-1 text-background/70 font-semibold text-xs shrink-0">
              Empezar <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </button>

        {/* Sessions list */}
        <div>
          <button
            onClick={() => setListOpen(o => !o)}
            className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 hover:text-foreground transition-colors"
          >
            <span>Sesiones XL {companies.length > 0 && `(${companies.length})`}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${listOpen ? "" : "-rotate-90"}`} />
          </button>

          {listOpen && (isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !companies.length ? (
            <div className="rounded-2xl bg-card border border-border py-12 text-center">
              <Zap className="mx-auto h-10 w-10 mb-3 text-violet-300" />
              <p className="text-muted-foreground text-sm">Todavía no hay sesiones XL</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companies.map((c) => {
                const latest = c.sessions[0];
                const isExpanded = expandedCompany === c.prospectId;
                const hasHistory = c.sessions.length > 1;
                const ownerEmail = ownerEmailMap?.get(latest.pae_id) ?? "";
                const ownerName = ownerEmail ? emailToShortName(ownerEmail) : "";
                const savings = latest.total_annual_benefit_eur;
                const roiPct = latest.roi_pct;
                const payback = latest.payback_months;

                return (
                  <div key={c.prospectId} className="rounded-xl bg-card border border-border overflow-hidden hover:border-violet-300 hover:shadow-sm transition-all">
                    <button
                      onClick={() => navigate(`/xl-co-creation?session=${latest.id}`)}
                      className="w-full px-5 py-4 text-left hover:bg-muted/20 transition-colors focus-visible:outline-none"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg leading-none">{FLAG[c.country] ?? "🌍"}</span>
                          <span className="font-bold text-foreground text-base truncate">{c.companyName}</span>
                          {c.seats && <span className="text-xs text-muted-foreground shrink-0">{c.seats} seats</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ownerName && (
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{ownerName}</span>
                          )}
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[latest.status] ?? "bg-gray-100 text-gray-500"}`}>
                            {t(statusI18nKey(latest.status))}
                          </span>
                        </div>
                      </div>

                      {savings != null && savings > 0 ? (
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
                      ) : (
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
                          onClick={(e) => { e.stopPropagation(); setExpandedCompany(isExpanded ? null : c.prospectId); }}
                          className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none"
                        >
                          <History className="h-3 w-3" />
                          {c.sessions.length} versiones
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border bg-muted/30">
                            {c.sessions.map((sess, i) => (
                              <button
                                key={sess.id}
                                onClick={() => navigate(`/xl-co-creation?session=${sess.id}`)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors focus-visible:outline-none ${i > 0 ? "border-t border-border/60" : ""}`}
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
          ))}
        </div>
      </main>
      <FeedbackButton page="xl-space" />
    </div>
  );
}
