import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import factorialLogo from "@/assets/factorial-logo-red.svg";

export default function Login() {
  const { signUp, signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("login.placeholder"));
      return;
    }
    setResetting(true);
    setError(null);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      });
      if (resetErr) {
        setError(resetErr.message);
      } else {
        toast.success(t("login.reset_sent"));
      }
    } catch (err: any) {
      setError(err.message ?? t("login.reset_error"));
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.endsWith("@factorial.co")) {
      setError(t("login.domain_error"));
      return;
    }
    if (password.length < 6) {
      setError(t("login.password_min"));
      return;
    }
    setLoading(true);
    const signInResult = await signIn(trimmedEmail, password);
    if (signInResult.error) {
      const msg = signInResult.error.message;
      if (msg === "Invalid login credentials") {
        const signUpResult = await signUp(trimmedEmail, password);
        if (signUpResult.error) {
          setError(signUpResult.error.message);
        } else {
          setSignUpSuccess(true);
        }
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-xs text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <p
            className="text-sm text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: t("login.check_inbox", { email }) }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-xs space-y-8">
        <div className="text-center space-y-1">
          <img src={factorialLogo} alt="Factorial" className="mx-auto h-7 mb-4" />
          <h1 className="text-lg font-semibold tracking-tight">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.description")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder={t("login.placeholder")}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            className="h-11"
            autoComplete="email"
            autoFocus
          />
          <Input
            type="password"
            placeholder={t("login.password_placeholder")}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            className="h-11"
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-11 font-semibold"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t("login.sign_in")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleForgotPassword}
            disabled={resetting}
          >
            {resetting ? <Loader2 className="inline h-3 w-3 animate-spin" /> : t("login.forgot_password")}
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60">
          {t("login.auto_signup")}
        </p>
      </div>
    </div>
  );
}
