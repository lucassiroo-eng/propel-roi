import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, LogOut, TrendingUp, Clock, Loader2, Sparkles, ChevronRight, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { statusI18nKey } from "@/lib/i18nHelpers";

const FLAG: Record<string, string> = { ES: "🇪🇸", FR: "🇫🇷" };

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-600",
  accepted: "bg-emerald-50 text-emerald-600",
  declined: "bg-red-50 text-red-600",
};

export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["roi_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roi_sessions")
        .select("id, status, roi_eur, total_annual_benefit_eur, updated_at, prospect_id, prospects(company_name, country, seats, sector)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const locale = i18n.language.startsWith("es") ? es : i18n.language.startsWith("fr") ? fr : undefined;

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "linear-gradient(135deg, #fdf0f3 0%, #f5f0fd 40%, #f0f4fd 70%, #fdf0f7 100%)" }}>
      {/* Soft blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30" style={{ background: "radial-gradient(circle, #f9a8b8 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #c4b5fd 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #fbcfe8 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #e05c75, #c94f9e)" }}>
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-800 text-base">Propel ROI</span>
        </div>
        <button
          onClick={signOut}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="relative z-10 px-5 pt-8 pb-24 max-w-lg mx-auto space-y-6">
        {/* Hero title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ background: "rgba(224,92,117,0.1)", color: "#e05c75" }}>
            <Sparkles className="h-3 w-3" />
            ROI Simulator
          </div>
          <h1 className="text-4xl font-extrabold leading-tight" style={{ color: "#e05c75" }}>
            {t("home.greeting")}
          </h1>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>

        {/* New Session CTA — featured card */}
        <button
          onClick={() => navigate("/session/new")}
          className="w-full rounded-2xl p-5 text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg, #e05c75 0%, #c94f9e 100%)" }}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
              {t("home.new_session")}
            </span>
          </div>
          <p className="text-white font-bold text-lg leading-snug">{t("home.new_session_desc", "Calcula el ROI de un prospect")}</p>
          <p className="text-white/70 text-sm mt-1 mb-3">{t("home.new_session_sub", "Emails + llamadas + cuantificación en minutos")}</p>
          <div className="flex items-center gap-1 text-white font-semibold text-sm">
            {t("home.start", "Empezar")} <ChevronRight className="h-4 w-4" />
          </div>
        </button>

        {/* Recent sessions */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t("home.recent")}</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
            </div>
          ) : !sessions?.length ? (
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white py-12 text-center">
              <TrendingUp className="mx-auto h-10 w-10 mb-3" style={{ color: "#e05c75", opacity: 0.3 }} />
              <p className="text-gray-400 text-sm">{t("home.empty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s: any) => {
                const prospect = s.prospects;
                const country = prospect?.country ?? "";
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/session/${s.id}`)}
                    className="w-full rounded-2xl bg-white/80 backdrop-blur-sm border border-white/80 p-4 text-left hover:bg-white transition-colors hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{FLAG[country] ?? "🌍"}</span>
                          <span className="font-semibold text-gray-800 truncate text-sm">
                            {prospect?.company_name ?? t("home.untitled")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {prospect?.seats && (
                            <span className="text-[11px] text-gray-400">{t("home.seats", { count: prospect.seats })}</span>
                          )}
                          {prospect?.sector && (
                            <span className="text-[11px] text-gray-400 truncate max-w-[140px]">{prospect.sector}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {t(statusI18nKey(s.status))}
                        </span>
                        {s.roi_eur != null && (
                          <span className="text-sm font-bold" style={{ color: "#e05c75" }}>
                            €{Number(s.roi_eur).toLocaleString("es-ES", { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2.5 text-[11px] text-gray-300">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true, locale })}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
