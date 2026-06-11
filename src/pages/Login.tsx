import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import factorialLogo from "@/assets/factorial-logo-red.svg";

export default function Login() {
  const { signUp, signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@factorial.co")) {
      setError(t("login.invalid_user"));
      return;
    }
    if (password.length < 6) {
      setError(t("login.password_min"));
      return;
    }
    setLoading(true);

    if (fullName.trim()) {
      // Has name → sign up (new user)
      const { error: signUpErr } = await signUp(trimmed, password, fullName.trim());
      if (signUpErr) {
        if (signUpErr.message.includes("already registered")) {
          // Already exists → try sign in with same password
          const { error: signInErr } = await signIn(trimmed, password);
          if (signInErr) setError(t("login.wrong_password"));
        } else {
          setError(t("login.invalid_user"));
        }
      }
    } else {
      // No name → sign in (existing user)
      const { error: signInErr } = await signIn(trimmed, password);
      if (signInErr) {
        setError(t("login.wrong_password"));
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-xs space-y-6">
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
            type="text"
            placeholder={t("login.name_placeholder")}
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setError(null); }}
            className="h-11"
            autoComplete="name"
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
                {t("login.enter")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground/60">
          {t("login.hint")}
        </p>
      </div>
    </div>
  );
}
