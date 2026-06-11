import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ArrowRight, ChevronRight, Link, Layers, Phone, FileDown } from "lucide-react";

const LANGUAGES = [
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", label: "Español" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", label: "Français" },
  { code: "it", flag: "\u{1F1EE}\u{1F1F9}", label: "Italiano" },
  { code: "de", flag: "\u{1F1E9}\u{1F1EA}", label: "Deutsch" },
];

const SLIDES = [
  { icon: Link, title: "onboarding.slide1_title", body: "onboarding.slide1_body" },
  { icon: Layers, title: "onboarding.slide2_title", body: "onboarding.slide2_body" },
  { icon: Phone, title: "onboarding.slide3_title", body: "onboarding.slide3_body" },
  { icon: FileDown, title: "onboarding.slide4_title", body: "onboarding.slide4_body" },
];

export default function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<"lang" | "tutorial">("lang");
  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedLang, setSelectedLang] = useState(i18n.language?.slice(0, 2) || "en");

  function pickLang(code: string) {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem("propel_locale", code);
  }

  function goToTutorial() {
    setPhase("tutorial");
  }

  function finish() {
    localStorage.setItem("propel_onboarded", "true");
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {phase === "lang" && (
          <div className="p-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-center text-foreground mb-1">{t("onboarding.lang_title", "Choose your language")}</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{t("onboarding.lang_sub", "You can change this later in Settings")}</p>

            <div className="grid grid-cols-1 gap-2">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => pickLang(l.code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    selectedLang === l.code
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/20"
                  }`}
                >
                  <span className="text-2xl">{l.flag}</span>
                  <span className="text-sm font-semibold text-foreground">{l.label}</span>
                  {selectedLang === l.code && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={goToTutorial}
              className="w-full mt-6 h-11 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
            >
              {t("onboarding.continue", "Continue")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === "tutorial" && (
          <div className="p-8">
            {(() => {
              const slide = SLIDES[slideIdx];
              const Icon = slide.icon;
              return (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2">{t(slide.title)}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-8">{t(slide.body)}</p>
                </div>
              );
            })()}

            <div className="flex items-center justify-center gap-1.5 mb-6">
              {SLIDES.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === slideIdx ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
              ))}
            </div>

            <div className="flex gap-3">
              {slideIdx < SLIDES.length - 1 ? (
                <>
                  <button onClick={finish} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    {t("onboarding.skip", "Skip")}
                  </button>
                  <button
                    onClick={() => setSlideIdx(i => i + 1)}
                    className="flex-1 h-11 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
                  >
                    {t("onboarding.next", "Next")} <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={finish}
                  className="w-full h-11 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
                >
                  {t("onboarding.start", "Start using Propel ROI")} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
