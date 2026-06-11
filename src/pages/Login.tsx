import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import factorialLogo from "@/assets/factorial-logo-red.svg";

export default function Login() {
  const { signUp, signIn } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpDone, setSignUpDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@factorial.co")) {
      setError(t("login.domain_error"));
      return;
    }
    if (password.length < 6) {
      setError(t("login.password_min"));
      return;
    }
    setLoading(true);

    if (mode === "signup") {
      if (!fullName.trim()) {
        setError(t("login.name_required"));
        setLoading(false);
        return;
      }
      const { error: err } = await signUp(trimmed, password, fullName.trim());
      if (err) {
        if (err.message.includes("already registered")) {
          setError(t("login.already_registered"));
        } else {
          setError(err.message);
        }
      } else {
        setSignUpDone(true);
      }
    } else {
      const { error: err } = await signIn(trimmed, password);
      if (err) {
        if (err.message === "Invalid login credentials") {
          setError(t("login.invalid_credentials"));
        } else {
          setError(err.message);
        }
      }
    }
    setLoading(false);
  };

  if (signUpDone) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">{t("login.check_title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("login.check_body", { email })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center space-y-1">
          <img src={factorialLogo} alt="Factorial" className="mx-auto h-7 mb-4" />
          <h1 className="text-lg font-semibold tracking-tight">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signup" ? t("login.signup_description") : t("login.signin_description")}
          </p>
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

          {mode === "signup" && (
            <Input
              type="text"
              placeholder={t("login.name_placeholder")}
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(null); }}
              className="h-11"
              autoComplete="name"
            />
          )}

          <Input
            type="password"
            placeholder={t("login.password_placeholder")}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            className="h-11"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
                {mode === "signup" ? t("login.create_account") : t("login.sign_in")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          {mode === "signin" ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setMode("signup"); setError(null); }}
            >
              {t("login.no_account")}
            </button>
          ) : (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setMode("signin"); setError(null); }}
            >
              {t("login.have_account")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
