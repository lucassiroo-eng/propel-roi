import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LogOut, TrendingUp, Clock, Loader2, ChevronRight, ChevronDown, BarChart3, FileText, History, Zap, ShieldCheck, HelpCircle, X, MessageSquare } from "lucide-react";
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
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-600",
  accepted: "bg-emerald-50 text-emerald-600",
  declined: "bg-red-50 text-red-600",
  generated: "bg-violet-50 text-violet-600",
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

/* ─── Tutorial overlay (both highlights at once) ─── */
function TutorialOverlay({
  expressRef,
  sessionsRef,
  onClickExpress,
  onClose,
}: {
  expressRef: React.RefObject<HTMLElement | null>;
  sessionsRef: React.RefObject<HTMLElement | null>;
  onClickExpress: () => void;
  onClose: () => void;
}) {
  const [rects, setRects] = useState<{ express: DOMRect | null; sessions: DOMRect | null }>({ express: null, sessions: null });

  useEffect(() => {
    const update = () => {
      setRects({
        express: expressRef.current?.getBoundingClientRect() ?? null,
        sessions: sessionsRef.current?.getBoundingClientRect() ?? null,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [expressRef, sessionsRef]);

  if (!rects.express) return null;

  const pad = 8;
  const scrollY = window.scrollY;

  const ex = {
    top: rects.express.top - pad + scrollY,
    left: rects.express.left - pad,
    width: rects.express.width + pad * 2,
    height: rects.express.height + pad * 2,
  };

  const seMaxH = 180;
  const se = rects.sessions ? {
    top: rects.sessions.top - pad + scrollY,
    left: rects.sessions.left - pad,
    width: rects.sessions.width + pad * 2,
    height: Math.min(rects.sessions.height + pad * 2, seMaxH),
  } : null;

  const pageH = document.documentElement.scrollHeight;

  const exCenterX = ex.left + ex.width / 2;
  const seCenterX = se ? se.left + se.width / 2 : 0;

  return (
    <div className="absolute inset-0 z-50" style={{ height: pageH, pointerEvents: "auto" }}>
      {/* Backdrop with two cutouts */}
      <svg className="absolute inset-0 w-full" style={{ height: pageH }}>
        <defs>
          <mask id="tut-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={ex.left} y={ex.top} width={ex.width} height={ex.height} rx="16" fill="black" />
            {se && <rect x={se.left} y={se.top} width={se.width} height={se.height} rx="16" fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tut-mask)" />
      </svg>

      {/* Express highlight ring — clickable */}
      <button
        onClick={onClickExpress}
        className="absolute rounded-2xl ring-2 ring-primary animate-pulse cursor-pointer"
        style={{ top: ex.top, left: ex.left, width: ex.width, height: ex.height }}
      />

      {/* Express tooltip (above the card) */}
      <div
        className="absolute"
        style={{ top: ex.top - 16, left: Math.max(20, exCenterX - 160), width: Math.min(320, window.innerWidth - 40), transform: "translateY(-100%)", pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <div className="bg-white rounded-xl shadow-lg px-4 py-3 border border-border">
            <p className="text-sm font-semibold text-foreground">Create an ROI</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click here to start an Express ROI analysis. Paste a HubSpot deal link and get the result in minutes.</p>
          </div>
          <div className="mt-[-1px]" style={{ paddingLeft: Math.max(16, Math.min(exCenterX - Math.max(20, exCenterX - 160) - 8, Math.min(320, window.innerWidth - 40) - 24)) }}>
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
          </div>
        </div>
      </div>

      {/* Sessions highlight ring */}
      {se && (
        <div
          className="absolute rounded-2xl ring-2 ring-blue-400 animate-pulse"
          style={{ top: se.top, left: se.left, width: se.width, height: se.height, pointerEvents: "none" }}
        />
      )}

      {/* Sessions tooltip (below cutout, in dark zone) */}
      {se && (
        <div
          className="absolute"
          style={{ top: se.top + se.height + 14, left: Math.max(20, seCenterX - 160), width: Math.min(320, window.innerWidth - 40), pointerEvents: "none" }}
        >
          <div style={{ pointerEvents: "auto" }}>
            <div className="mb-[-1px]" style={{ paddingLeft: Math.max(16, Math.min(seCenterX - Math.max(20, seCenterX - 160) - 8, Math.min(320, window.innerWidth - 40) - 24)) }}>
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white" />
            </div>
            <div className="bg-white rounded-xl shadow-lg px-4 py-3 border border-border">
              <p className="text-sm font-semibold text-foreground">Your sessions</p>
              <p className="text-xs text-muted-foreground mt-0.5">All your ROI analyses live here. Click any to view, edit, or share.</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar: skip + CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/80 to-transparent" style={{ pointerEvents: "auto" }}>
        <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
          <p className="text-white text-sm font-medium text-center">Click ROI Express to start the guided tour</p>
          <button onClick={onClose} className="text-white/60 text-xs hover:text-white transition-colors">
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Home page ─── */
export default function Home() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const expressRef = useRef<HTMLButtonElement | null>(null);
  const sessionsRef = useRef<HTMLDivElement | null>(null);

  const tutorialKey = `propel_tutorial_seen_${user?.id ?? "anon"}`;

  const startTutorial = useCallback(() => {
    i18n.changeLanguage("en");
    localStorage.setItem("propel_locale", "en");
    setShowTutorial(true);
  }, [i18n]);
  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem(tutorialKey, "1");
    localStorage.removeItem("propel_tutorial_active");
  }, [tutorialKey]);

  const handleExpressClick = useCallback(() => {
    if (showTutorial) {
      localStorage.setItem("propel_tutorial_active", "1");
      localStorage.setItem(tutorialKey, "1");
      setShowTutorial(false);
    }
    navigate("/express");
  }, [showTutorial, navigate, tutorialKey]);

  useEffect(() => {
    if (user && !localStorage.getItem(tutorialKey)) {
      i18n.changeLanguage("en");
      localStorage.setItem("propel_locale", "en");
      const timer = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(timer);
    }
  }, [user, tutorialKey, i18n]);

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
    <div className="min-h-screen relative overflow-x-hidden bg-background">
      {/* Tutorial overlay */}
      {showTutorial && (
        <TutorialOverlay
          expressRef={expressRef}
          sessionsRef={sessionsRef}
          onClickExpress={handleExpressClick}
          onClose={closeTutorial}
        />
      )}

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-base">Propel ROI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={startTutorial}
            className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={t("tutorial.help")}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          {user?.email === "lucas.siroo@factorial.co" && (
            <button
              onClick={() => navigate("/admin")}
              className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
            className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="relative z-10 px-5 pt-8 pb-24 max-w-lg mx-auto space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            ROI Simulator
          </p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-800">
            {t("home.greeting")}
          </h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Express CTA */}
        <button
          ref={expressRef}
          onClick={handleExpressClick}
          className="w-full rounded-2xl p-5 text-left bg-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-background/15 flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-background" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-background/50 bg-background/10 px-2 py-0.5 rounded-full">
              Express
            </span>
          </div>
          <p className="text-background font-bold text-lg leading-snug">ROI Express</p>
          <p className="text-background/60 text-sm mt-1 mb-3">Pega el deal link y genera el ROI en minutos</p>
          <div className="flex items-center gap-1 text-background font-semibold text-sm">
            {t("home.start", "Empezar")} <ChevronRight className="h-4 w-4" />
          </div>
        </button>

        {/* Co-creation CTA */}
        <button
          onClick={() => navigate("/co-creation")}
          className="w-full rounded-2xl p-5 text-left border-2 border-foreground/10 bg-card transition-transform hover:scale-[1.01] active:scale-[0.99] hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-foreground/10 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-foreground" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Co-creation
            </span>
          </div>
          <p className="text-foreground font-bold text-lg leading-snug">ROI Co-creation</p>
          <p className="text-muted-foreground text-sm mt-1 mb-3">Build the ROI live during a discovery call</p>
          <div className="flex items-center gap-1 text-foreground font-semibold text-sm">
            {t("home.start", "Empezar")} <ChevronRight className="h-4 w-4" />
          </div>
        </button>

        {/* Companies list */}
        <div ref={sessionsRef}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{t("home.recent")}</h2>

          {isLoading ? (
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

                return (
                  <div key={c.prospectId} className="rounded-2xl bg-card border border-border overflow-hidden hover:shadow-sm transition-shadow">
                    <button
                      onClick={() => navigate(`/express?session=${latest.id}`)}
                      className="w-full p-4 text-left hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{FLAG[c.country] ?? "\u{1F30D}"}</span>
                            <span className="font-semibold text-foreground truncate text-sm">
                              {c.companyName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {c.seats && (
                              <span className="text-[11px] text-muted-foreground">{t("home.seats", { count: c.seats })}</span>
                            )}
                            {c.sector && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">{c.sector}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[latest.status] ?? "bg-gray-100 text-gray-500"}`}>
                            {t(statusI18nKey(latest.status))}
                          </span>
                          {c.hasDocument && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full">
                              <FileText className="h-2.5 w-2.5" />
                              ROI
                            </span>
                          )}
                        </div>
                      </div>

                      {(latest.roi_eur != null || latest.roi_pct != null) && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/60">
                          {latest.total_annual_benefit_eur != null && (
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Ahorro</p>
                              <p className="text-sm font-bold text-foreground tabular-nums">{fmtEur(latest.total_annual_benefit_eur)} €</p>
                            </div>
                          )}
                          {latest.roi_eur != null && (
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ROI neto</p>
                              <p className="text-sm font-bold text-foreground tabular-nums">{fmtEur(latest.roi_eur)} €</p>
                            </div>
                          )}
                          {latest.roi_pct != null && latest.roi_pct > 0 && (
                            <div className="shrink-0">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ROI</p>
                              <p className="text-sm font-bold text-emerald-600 tabular-nums">{latest.roi_pct}%</p>
                            </div>
                          )}
                          {latest.payback_months != null && latest.payback_months > 0 && (
                            <div className="shrink-0">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Payback</p>
                              <p className="text-sm font-bold text-foreground tabular-nums">{latest.payback_months}m</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(latest.updated_at), { addSuffix: true, locale })}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </div>
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
                                onClick={() => navigate(`/express?session=${sess.id}`)}
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
    </div>
  );
}
