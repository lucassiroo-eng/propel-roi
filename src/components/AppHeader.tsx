import { useNavigate, useLocation } from "react-router-dom";
import { Home, Settings, ShieldCheck, BarChart3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const LANG_FLAG: Record<string, string> = {
  en: "\u{1F1EC}\u{1F1E7}", es: "\u{1F1EA}\u{1F1F8}", fr: "\u{1F1EB}\u{1F1F7}",
  it: "\u{1F1EE}\u{1F1F9}", de: "\u{1F1E9}\u{1F1EA}",
};

export function AppHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  const { data: isAdmin } = useQuery({
    queryKey: ["user_role_header", user?.id],
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
    staleTime: 60_000,
  });

  const links = [
    { path: "/", label: t("nav.home"), icon: Home },
    ...(isAdmin ? [{ path: "/admin", label: t("nav.admin"), icon: ShieldCheck }] : []),
    { path: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/60">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary">
              <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">Propel ROI</span>
          </button>

          <nav className="flex items-center gap-1">
            {links.map(l => {
              const active = pathname === l.path || (l.path !== "/" && pathname.startsWith(l.path));
              return (
                <button
                  key={l.path}
                  onClick={() => navigate(l.path)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    active ? "bg-foreground/8 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <l.icon className="h-3.5 w-3.5" />
                  {l.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
          <span className="text-sm">{LANG_FLAG[i18n.language?.substring(0, 2)] ?? "\u{1F310}"}</span>
          <button
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={t("settings.sign_out")}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
