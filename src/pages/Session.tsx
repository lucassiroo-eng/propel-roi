import { useParams, useNavigate } from "react-router-dom";
import { useWizardSession } from "@/hooks/useWizardSession";
import { WizardShell } from "@/components/wizard/WizardShell";
import { StepProspect } from "@/components/wizard/StepProspect";
import { StepAiAssist } from "@/components/wizard/StepAiAssist";
import { StepPains } from "@/components/wizard/StepPains";
import { StepQuantify } from "@/components/wizard/StepQuantify";
import { StepOffering } from "@/components/wizard/StepOffering";
import { StepReview } from "@/components/wizard/StepReview";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// Steps: 0=Prospect, 1=AI Assist (manual fallback), 2=Pains, 3=Quantify, 4=Offering, 5=Review
const TOTAL_STEPS = 5;

export default function Session() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    step, setStep, state, updateState, save,
    goNext, goBack, loading, saving,
    currentSessionId,
  } = useWizardSession(id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canNext =
    step === 0 ? !!state.prospect.company_name :
    step === 1 ? false :
    step === 2 ? !!state.selectedPains.length :
    true;

  const handleNext = async () => {
    if (step === 0) {
      // If pains were detected via Airtable, skip AI Assist → go straight to Quantify
      if (state.prospect.airtable_suggestions?.length) {
        await save();
        setStep(3);
      } else {
        // No Airtable data — go to manual AI Assist
        await save();
        setStep(1);
      }
      return;
    }
    if (step === 4) {
      await save();
      toast.success(t("toast.session_saved"));
      navigate("/");
      return;
    }
    goNext();
  };

  return (
    <WizardShell
      step={step}
      saving={saving}
      onBack={step === 0 ? () => navigate("/") : goBack}
      onNext={step === 1 ? undefined : handleNext}
      canNext={canNext}
      companyName={state.prospect.company_name}
      totalSteps={TOTAL_STEPS}
      wide
    >
      {step === 0 && (
        <StepProspect
          data={state.prospect}
          onChange={(partial) =>
            updateState(prev => ({
              ...prev,
              prospect: { ...prev.prospect, ...partial },
            }))
          }
          selectedPains={state.selectedPains}
          onTogglePain={(painId) =>
            updateState(prev => ({
              ...prev,
              selectedPains: prev.selectedPains.includes(painId)
                ? prev.selectedPains.filter(p => p !== painId)
                : [...prev.selectedPains, painId],
            }))
          }
          onPainsAutoSelected={(painIds, suggestions) =>
            updateState(prev => ({
              ...prev,
              selectedPains: [...new Set([...prev.selectedPains, ...painIds])],
              aiSuggestions: suggestions,
            }))
          }
        />
      )}
      {step === 1 && (
        <StepAiAssist
          country={state.prospect.country}
          sector={state.prospect.sector}
          hubspotNotes={state.prospect.hubspot_notes}
          companyName={state.prospect.company_name}
          airtableSuggestions={state.prospect.airtable_suggestions}
          airtableStats={state.prospect.airtable_stats}
          onSuggest={(painIds, suggestions) => {
            updateState(prev => ({
              ...prev,
              selectedPains: [...new Set([...prev.selectedPains, ...painIds])],
              aiSuggestions: suggestions,
            }));
            setStep(3);
          }}
          onSkip={() => setStep(3)}
        />
      )}
      {step === 2 && (
        <StepPains
          selectedPains={state.selectedPains}
          aiSuggestions={state.aiSuggestions}
          onToggle={(painId) =>
            updateState(prev => ({
              ...prev,
              selectedPains: prev.selectedPains.includes(painId)
                ? prev.selectedPains.filter(p => p !== painId)
                : [...prev.selectedPains, painId],
            }))
          }
        />
      )}
      {step === 3 && (
        <StepQuantify
          hubspotNotes={state.prospect.hubspot_notes}
          selectedPains={state.selectedPains}
          painOverrides={state.painOverrides}
          country={state.prospect.country}
          seats={state.prospect.seats}
          onOverride={(painId, override) =>
            updateState(prev => ({
              ...prev,
              painOverrides: { ...prev.painOverrides, [painId]: override },
            }))
          }
          customPains={state.customPains}
          onAddCustomPain={(pain) =>
            updateState(prev => ({
              ...prev,
              customPains: [...prev.customPains, pain],
            }))
          }
          onRemoveCustomPain={(id) =>
            updateState(prev => ({
              ...prev,
              customPains: prev.customPains.filter(p => p.id !== id),
            }))
          }
        />
      )}
      {step === 4 && (
        <StepOffering
          country={state.prospect.country}
          seats={state.prospect.seats}
          offering={state.offering}
          selectedPains={state.selectedPains}
          painOverrides={state.painOverrides}
          sector={state.prospect.sector}
          onChange={(partial) =>
            updateState(prev => ({
              ...prev,
              offering: { ...prev.offering, ...partial },
            }))
          }
        />
      )}
      {step === 5 && (
        <StepReview state={state} sessionId={currentSessionId} />
      )}
    </WizardShell>
  );
}
