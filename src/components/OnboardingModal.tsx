import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ArrowRight, ChevronRight, Target, Handshake, GitBranch, Calculator, Link, Layers, Phone, FileDown, Compass } from "lucide-react";

const LANGUAGES = [
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", label: "Español" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", label: "Français" },
  { code: "it", flag: "\u{1F1EE}\u{1F1F9}", label: "Italiano" },
  { code: "de", flag: "\u{1F1E9}\u{1F1EA}", label: "Deutsch" },
];

const WHY_SLIDES = [
  { icon: Target, color: "#FF355E", bg: "#FFF1F3", title: "onboarding.s1_title", body: "onboarding.s1_body" },
  { icon: Handshake, color: "#7C3AED", bg: "#F3F0FF", title: "onboarding.s2_title", body: "onboarding.s2_body" },
  { icon: GitBranch, color: "#0EA5E9", bg: "#EFF6FF", title: "onboarding.s3_title", body: "onboarding.s3_body" },
  { icon: Calculator, color: "#059669", bg: "#ECFDF5", title: "onboarding.s4_title", body: "onboarding.s4_body" },
];

const HOW_SLIDES = [
  { icon: Link, color: "#F59E0B", bg: "#FFFBEB", title: "onboarding.h1_title", body: "onboarding.h1_body" },
  { icon: Layers, color: "#8B5CF6", bg: "#F3F0FF", title: "onboarding.h2_title", body: "onboarding.h2_body" },
  { icon: Phone, color: "#0EA5E9", bg: "#EFF6FF", title: "onboarding.h3_title", body: "onboarding.h3_body" },
  { icon: FileDown, color: "#059669", bg: "#ECFDF5", title: "onboarding.h4_title", body: "onboarding.h4_body" },
];

interface Props {
  mode?: "full" | "why" | "how";
  onComplete: () => void;
  onStartTour?: () => void;
}

export default function OnboardingModal({ mode = "full", onComplete, onStartTour }: Props) {
  const { t, i18n } = useTranslation();
  const showLang = mode === "full";
  const [phase, setPhase] = useState<"lang" | "slides">(showLang ? "lang" : "slides");
  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedLang, setSelectedLang] = useState(i18n.language?.slice(0, 2) || "en");

  const slides = mode === "how" ? HOW_SLIDES : [...WHY_SLIDES, ...HOW_SLIDES];

  function pickLang(code: string) {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem("propel_locale", code);
  }

  function finish() {
    if (mode === "full") localStorage.setItem("propel_onboarded", "true");
    onComplete();
  }

  function handleLast() {
    if (onStartTour) {
      onComplete();
      setTimeout(() => onStartTour(), 200);
    } else {
      finish();
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {phase === "lang" && (
          <div className="p-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-center text-foreground mb-1">{t("onboarding.lang_title")}</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{t("onboarding.lang_sub")}</p>

            <div className="grid grid-cols-1 gap-2">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => pickLang(l.code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    selectedLang === l.code ? "border-primary bg-primary/5" : "border-border hover:border-foreground/20"
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
              onClick={() => setPhase("slides")}
              className="w-full mt-6 h-11 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
            >
              {t("onboarding.continue")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === "slides" && (
          <div className="p-8">
            {(() => {
              const isLastSlide = slideIdx === slides.length - 1;
              const showTourPrompt = isLastSlide && onStartTour;

              if (showTourPrompt) {
                return (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                      <Compass className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground mb-3">{t("onboarding.tour_title")}</h2>
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-8">{t("onboarding.tour_body")}</p>
                  </div>
                );
              }

              const slide = slides[slideIdx];
              const Icon = slide.icon;
              return (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: slide.bg }}>
                    <Icon className="h-7 w-7" style={{ color: slide.color }} />
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-3">{t(slide.title)}</h2>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-8 text-left whitespace-pre-line">{t(slide.body)}</p>
                </div>
              );
            })()}

            <div className="flex items-center justify-center gap-1.5 mb-6">
              {slides.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === slideIdx ? "w-6 bg-foreground" : "w-1.5 bg-border"}`} />
              ))}
            </div>

            <div className="flex gap-3">
              {slideIdx < slides.length - 1 ? (
                <>
                  <button onClick={finish} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    {t("onboarding.skip")}
                  </button>
                  <button
                    onClick={() => setSlideIdx(i => i + 1)}
                    className="flex-1 h-11 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
                  >
                    {t("onboarding.next")} <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : onStartTour ? (
                <>
                  <button onClick={finish} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    {t("onboarding.skip")}
                  </button>
                  <button
                    onClick={handleLast}
                    className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                  >
                    {t("onboarding.start_tour")} <Compass className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={finish}
                  className="w-full h-11 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
                >
                  {t("onboarding.start")} <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
