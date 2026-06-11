import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, ArrowRight, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import factorialLogo from "@/assets/factorial-logo-red.svg";

export default function Login() {
  const { signInWithOtp } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith("@factorial.co")) {
      setError(t("login.domain_error"));
      return;
    }
    setLoading(true);
    const { error: otpError } = await signInWithOtp(trimmed);
    if (otpError) {
      setError(otpError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
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
          <button
            onClick={() => { setSent(false); setEmail(""); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("login.try_another")}
          </button>
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
          <p className="text-sm text-muted-foreground">{t("login.magic_description")}</p>
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

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-11 font-semibold"
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                {t("login.send_link")}
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground/60">
          {t("login.magic_hint")}
        </p>
      </div>
    </div>
  );
}
