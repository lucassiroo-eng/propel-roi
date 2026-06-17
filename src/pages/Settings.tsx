import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminAnalytics from "@/components/settings/AdminAnalytics";

const LANGUAGES = [
  { code: "en", labelKey: "settings.language_en" },
  { code: "es", labelKey: "settings.language_es" },
  { code: "fr", labelKey: "settings.language_fr" },
  { code: "pt", labelKey: "settings.language_pt" },
  { code: "it", labelKey: "settings.language_it" },
  { code: "de", labelKey: "settings.language_de" },
] as const;

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle()
      .then(({ data }) => setIsSuperAdmin(!!data));
  }, [user]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("propel_locale", lng);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.language")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={i18n.language?.substring(0, 2) ?? "en"}
              onValueChange={changeLanguage}
              className="space-y-3"
            >
              {LANGUAGES.map((lang) => (
                <div key={lang.code} className="flex items-center space-x-3">
                  <RadioGroupItem value={lang.code} id={`lang-${lang.code}`} />
                  <Label htmlFor={`lang-${lang.code}`} className="cursor-pointer">
                    {t(lang.labelKey)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.account")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div>
                <p className="text-sm text-muted-foreground">{t("settings.signed_in_as")}</p>
                <p className="text-sm font-medium text-foreground">{user.email}</p>
              </div>
            )}
            <Button variant="outline" onClick={signOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              {t("settings.sign_out")}
            </Button>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
