import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, Loader2, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STEP_KEYS = [
  "wizard.step.prospect",
  "wizard.step.ai_assist",
  "wizard.step.pains",
  "wizard.step.quantify",
  "wizard.step.offering",
  "wizard.step.review",
];

const LANG_FLAG: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
};

export interface WizardShellProps {
  step: number;
  saving: boolean;
  onBack: () => void;
  onNext?: () => void;
  canNext?: boolean;
  children: React.ReactNode;
  companyName?: string;
  totalSteps?: number;
  wide?: boolean;
}

export function WizardShell({ step, saving, onBack, onNext, canNext = true, children, companyName, totalSteps, wide }: WizardShellProps) {
  const { t, i18n } = useTranslation();
  const total = totalSteps ?? STEP_KEYS.length;
  const maxW = wide ? "max-w-5xl" : "max-w-2xl";

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("propel_locale", lng);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className={`${maxW} mx-auto space-y-3`}>
          {/* Company name + language + save indicator */}
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-foreground truncate max-w-[60%]">
              {companyName || t("wizard.new_session")}
            </h1>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t("wizard.saving")}
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {LANG_FLAG[i18n.language?.substring(0, 2)] ?? "🌐"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => changeLanguage("en")}>
                    🇬🇧 English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage("es")}>
                    🇪🇸 Español
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage("fr")}>
                    🇫🇷 Français
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEP_KEYS.map((key, i) => {
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center w-full gap-0.5">
                    <div
                      className={`
                        w-full h-1 rounded-full transition-colors
                        ${isActive ? "bg-primary" : isDone ? "bg-primary/40" : "bg-border"}
                      `}
                    />
                    <span
                      className={`
                        text-[9px] leading-tight text-center truncate w-full
                        ${isActive ? "text-primary font-semibold" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"}
                      `}
                    >
                      {t(key)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className={`flex-1 px-4 py-6 ${maxW} mx-auto w-full overflow-y-auto`}>
        {children}
      </main>

      {/* Footer nav */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-4 py-3">
        <div className={`flex gap-3 ${maxW} mx-auto`}>
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("wizard.back")}
          </Button>
          {onNext && (
            <Button onClick={onNext} disabled={!canNext} className="flex-1">
              {step === total - 1 ? (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  {t("wizard.finish")}
                </>
              ) : (
                <>
                  {t("wizard.next")}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
