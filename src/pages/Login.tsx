import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import factorialLogo from "@/assets/factorial-logo-red.svg";

export default function Login() {
  const { signUp, signIn } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() { setError(null); }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@factorial.co")) { setError(t("login.invalid_user")); return; }
    if (password.length < 6) { setError(t("login.password_min")); return; }
    setLoading(true);
    const { error: err } = await signIn(trimmed, password);
    if (err) setError(t("login.wrong_credentials"));
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@factorial.co")) { setError(t("login.invalid_user")); return; }
    if (!fullName.trim()) { setError(t("login.name_required")); return; }
    if (password.length < 6) { setError(t("login.password_min")); return; }
    setLoading(true);
    const { error: err } = await signUp(trimmed, password, fullName.trim());
    if (err) {
      if (err.message.includes("already registered")) {
        setError(t("login.already_exists"));
      } else {
        setError(t("login.invalid_user"));
      }
    }
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@factorial.co")) { setError(t("login.invalid_user")); return; }
    if (newPassword.length < 6) { setError(t("login.password_min")); return; }
    setLoading(true);
    const { error: err } = await supabase.functions.invoke("reset-password", {
      body: { email: trimmed, new_password: newPassword },
    });
    setLoading(false);
    if (err) { setError(t("login.reset_failed")); return; }
    toast.success(t("login.password_changed"));
    setNewPassword("");
    setMode("login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center space-y-1">
          <img src={factorialLogo} alt="Factorial" className="mx-auto h-7 mb-4" />
          <h1 className="text-lg font-semibold tracking-tight">{t("login.title")}</h1>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <Input type="email" placeholder={t("login.placeholder")} value={email} onChange={e => { setEmail(e.target.value); clearError(); }} className="h-11" autoComplete="email" autoFocus />
            <Input type="password" placeholder={t("login.password_placeholder")} value={password} onChange={e => { setPassword(e.target.value); clearError(); }} className="h-11" autoComplete="current-password" />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading || !email || !password}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("login.log_in")} <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
            <div className="flex justify-between">
              <button type="button" onClick={() => { setMode("register"); clearError(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {t("login.no_account")}
              </button>
              <button type="button" onClick={() => { setMode("reset"); clearError(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {t("login.forgot_password")}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <Input type="text" placeholder={t("login.name_placeholder")} value={fullName} onChange={e => { setFullName(e.target.value); clearError(); }} className="h-11" autoComplete="name" autoFocus />
            <Input type="email" placeholder={t("login.placeholder")} value={email} onChange={e => { setEmail(e.target.value); clearError(); }} className="h-11" autoComplete="email" />
            <Input type="password" placeholder={t("login.password_placeholder")} value={password} onChange={e => { setPassword(e.target.value); clearError(); }} className="h-11" autoComplete="new-password" />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading || !email || !password || !fullName}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("login.create_account")} <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
            <button type="button" onClick={() => { setMode("login"); clearError(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center">
              {t("login.have_account")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3">
            <Input type="email" placeholder={t("login.placeholder")} value={email} onChange={e => { setEmail(e.target.value); clearError(); }} className="h-11" autoComplete="email" autoFocus />
            <Input type="password" placeholder={t("login.new_password_placeholder")} value={newPassword} onChange={e => { setNewPassword(e.target.value); clearError(); }} className="h-11" autoComplete="new-password" />
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading || !email || !newPassword}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("login.change_password")} <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
            <button type="button" onClick={() => { setMode("login"); clearError(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center">
              {t("login.back_to_login")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
