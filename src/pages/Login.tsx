import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, LogIn, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import factorialLogo from "@/assets/factorial-logo-red.svg";

export default function Login() {
  const { signUp, signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
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
    if (!email.trim().toLowerCase().endsWith("@factorial.co")) {
      setError(t("login.domain_error"));
      return;
    }
    if (password.length < 6) {
      setError(t("login.password_min"));
      return;
    }
    setLoading(true);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (isSignUp) {
      setSignUpSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-sm border border-border shadow-sm rounded-2xl">
        <CardHeader className="text-center space-y-3">
          <img src={factorialLogo} alt="Factorial" className="mx-auto h-8" />
          <CardTitle className="text-xl font-bold text-primary">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {signUpSuccess ? (
            <div className="text-center space-y-3">
              <CheckCircle className="mx-auto h-10 w-10 text-success" />
              <p
                className="text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: t("login.check_inbox", { email }) }}
              />
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder={t("login.placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder={t("login.password_placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("login.sign_up")}
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      {t("login.sign_in")}
                    </>
                  )}
                </Button>
              </form>

              {!isSignUp && (
                <div className="text-center">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={handleForgotPassword}
                    disabled={resetting}
                  >
                    {resetting ? <Loader2 className="inline h-3 w-3 animate-spin" /> : t("login.forgot_password")}
                  </button>
                </div>
              )}

              <p className="text-center text-sm text-muted-foreground">
                {isSignUp ? t("login.have_account") : t("login.no_account")}{" "}
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                >
                  {isSignUp ? t("login.sign_in") : t("login.sign_up")}
                </button>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
