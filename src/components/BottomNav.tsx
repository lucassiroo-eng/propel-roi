import { useNavigate, useLocation } from "react-router-dom";
import { Home, HelpCircle, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: isAdmin } = useQuery({
    queryKey: ["user_role_admin_nav", user?.id],
    queryFn: async () => {
      if (!user) return false;
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

  const tabs = [
    { path: "/", label: t("nav.home"), icon: Home },
    { path: "/help", label: t("nav.help"), icon: HelpCircle },
    ...(isAdmin ? [{ path: "/admin", label: t("nav.admin"), icon: ShieldCheck }] : []),
    { path: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-background/90 backdrop-blur border-t">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.path) && (t.path !== "/" || pathname === "/");
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
