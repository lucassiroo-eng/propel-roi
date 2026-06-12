import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ArrowRight, ChevronRight, Target, Handshake, GitBranch, Calculator, Compass } from "lucide-react";

const LANGUAGES = [
  { code: "es", flag: "\u{1F1EA}\u{1F1F8}", label: "Español" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
  { code: "fr", flag: "\u{1F1EB}\u{1F1F7}", label: "Français" },
  { code: "it", flag: "\u{1F1EE}\u{1F1F9}", label: "Italiano" },
  { code: "de", flag: "\u{1F1E9}\u{1F1EA}", label: "Deutsch" },
];

interface Props {
  mode?: "full" | "slides";
  onComplete: () => void;
  onStartTour?: () => void;
  onCreateRoi?: () => void;
}

export default function OnboardingModal({ mode = "full", onComplete, onStartTour, onCreateRoi }: Props) {
  const { t, i18n } = useTranslation();
  const showLang = mode === "full";
  const [phase, setPhase] = useState<"lang" | "slides">(showLang ? "lang" : "slides");
  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedLang, setSelectedLang] = useState(i18n.language?.slice(0, 2) || "en");

  const TOTAL_SLIDES = 5;

  function pickLang(code: string) {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem("propel_locale", code);
  }

  function finish() {
    if (mode === "full") localStorage.setItem("propel_onboarded", "true");
    onComplete();
  }

  function handleStartTour() {
    if (mode === "full") localStorage.setItem("propel_onboarded", "true");
    onComplete();
    if (onStartTour) setTimeout(() => onStartTour(), 200);
  }

  function handleStartDirect() {
    if (mode === "full") localStorage.setItem("propel_onboarded", "true");
    onComplete();
    if (onCreateRoi) setTimeout(() => onCreateRoi(), 100);
  }

  // Slide 1: The Problem + Solution
  function Slide1() {
    return (
      <div>
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
          <Target className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground text-center mb-6">{t("onboarding.s1_title")}</h2>
        <div className="space-y-4 text-left">
          <div className="rounded-xl bg-red-50/60 border border-red-100 p-5">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">{t("onboarding.s1_problem_label")}</p>
            <p className="text-sm text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("onboarding.s1_problem") }} />
          </div>
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-5">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">{t("onboarding.s1_solution_label")}</p>
            <p className="text-sm text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t("onboarding.s1_solution") }} />
          </div>
        </div>
      </div>
    );
  }

  // Slide 2: Co-creation value
  function Slide2() {
    return (
      <div>
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-6">
          <Handshake className="h-8 w-8 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground text-center mb-6">{t("onboarding.s2_title")}</h2>
        <div className="space-y-3">
          {["s2_point1", "s2_point2", "s2_point3"].map(k => (
            <div key={k} className="flex items-start gap-3 rounded-xl bg-violet-50/40 p-4">
              <span className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <p className="text-sm text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: t(`onboarding.${k}`) }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Slide 3: Process stages
  function Slide3() {
    const stages = ["s3_stage1", "s3_stage2", "s3_stage3", "s3_stage4"];
    const colors = ["#F59E0B", "#8B5CF6", "#0EA5E9", "#059669"];
    const nums = ["1", "2", "3", "4"];
    return (
      <div>
        <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-6">
          <GitBranch className="h-8 w-8 text-sky-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground text-center mb-6">{t("onboarding.s3_title")}</h2>
        <div className="space-y-3">
          {stages.map((key, i) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ backgroundColor: colors[i] }}>
                {nums[i]}
              </div>
              <div className="flex-1 rounded-lg border border-border/60 px-4 py-2.5">
                <p className="text-[13px] font-semibold text-foreground">{t(`onboarding.${key}_title`)}</p>
                <p className="text-[11px] text-muted-foreground">{t(`onboarding.${key}_sub`)}</p>
              </div>
              {i < stages.length - 1 && <div className="hidden" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Slide 4: ROI calculation logic
  function Slide4() {
    return (
      <div>
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <Calculator className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground text-center mb-4">{t("onboarding.s4_title")}</h2>
        <p className="text-[13px] text-muted-foreground text-center mb-6">{t("onboarding.s4_intro")}</p>
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { label: t("onboarding.s4_hours"), color: "#F59E0B", bg: "#FFFBEB" },
            { label: "×" },
            { label: t("onboarding.s4_people"), color: "#8B5CF6", bg: "#F3F0FF" },
            { label: "×" },
            { label: t("onboarding.s4_cost"), color: "#0EA5E9", bg: "#EFF6FF" },
            { label: "×" },
            { label: "12", color: "#059669", bg: "#ECFDF5" },
          ].map((item, i) =>
            item.color ? (
              <div key={i} className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: item.bg }}>
                <p className="text-[11px] font-bold" style={{ color: item.color }}>{item.label}</p>
              </div>
            ) : (
              <span key={i} className="text-lg font-bold text-muted-foreground">{item.label}</span>
            )
          )}
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/60 p-4 text-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{t("onboarding.s4_example_label")}</p>
          <p className="text-[13px] text-foreground leading-relaxed">{t("onboarding.s4_example")}</p>
        </div>
      </div>
    );
  }

  // Slide 5: Start
  function Slide5() {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Compass className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">{t("onboarding.s5_title")}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-8">{t("onboarding.s5_body")}</p>
        <div className="space-y-3">
          {onStartTour && (
            <button
              onClick={handleStartTour}
              className="w-full h-12 rounded-xl border-2 border-foreground text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground hover:text-background transition-colors"
            >
              <Compass className="h-4 w-4" /> {t("onboarding.guided_tour")}
            </button>
          )}
          <button
            onClick={handleStartDirect}
            className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
          >
            {t("onboarding.go_create")} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const slideComponents = [Slide1, Slide2, Slide3, Slide4, Slide5];

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">

        {phase === "lang" && (
          <div className="p-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Globe className="h-7 w-7 text-primary" />
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
              className="w-full mt-6 h-12 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
            >
              {t("onboarding.continue")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {phase === "slides" && (
          <div className="p-8">
            {(() => {
              const SlideComponent = slideComponents[slideIdx];
              return <SlideComponent />;
            })()}

            {slideIdx < TOTAL_SLIDES - 1 && (
              <>
                <div className="flex items-center justify-center gap-1.5 mt-8 mb-6">
                  {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === slideIdx ? "w-8 bg-foreground" : "w-2 bg-border"}`} />
                  ))}
                </div>
                <button
                  onClick={() => setSlideIdx(i => i + 1)}
                  className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors"
                >
                  {t("onboarding.next")} <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
