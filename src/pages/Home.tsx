import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, TrendingUp, Clock, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { formatDistanceToNow } from "date-fns";
import { es, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { statusI18nKey } from "@/lib/i18nHelpers";

const FLAG: Record<string, string> = { ES: "🇪🇸", FR: "🇫🇷" };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "default",
  accepted: "default",
  declined: "destructive",
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

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-foreground">Propel ROI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("home.greeting")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user?.email}
          </p>
        </div>

        {/* New Session CTA */}
        <Button className="w-full" size="lg" onClick={() => navigate("/session/new")}>
          <Plus className="h-5 w-5 mr-2" />
          {t("home.new_session")}
        </Button>

        {/* Sessions List */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("home.recent")}</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !sessions?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">{t("home.empty")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((s: any) => {
                const prospect = s.prospects;
                const country = prospect?.country ?? "";
                return (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => navigate(`/session/${s.id}`)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{FLAG[country] ?? "🌍"}</span>
                            <span className="font-medium text-foreground truncate">
                              {prospect?.company_name ?? t("home.untitled")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {prospect?.seats && <span>{t("home.seats", { count: prospect.seats })}</span>}
                            {prospect?.sector && <span>{prospect.sector}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={STATUS_VARIANT[s.status] ?? "secondary"} className="text-xs">
                            {t(statusI18nKey(s.status))}
                          </Badge>
                          {s.roi_eur != null && (
                            <span className="text-sm font-semibold text-foreground">
                              €{Number(s.roi_eur).toLocaleString("es-ES", { maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true, locale: i18n.language.startsWith("es") ? es : i18n.language.startsWith("fr") ? fr : undefined })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
