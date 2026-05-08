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

// Steps: 0=Prospect, 1=AI Assist, 2=Pains, 3=Quantify, 4=Offering, 5=Benchmarks, 6=Review
const TOTAL_STEPS = 6;

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

  const canNext = step === 0 ? !!state.prospect.company_name : step === 1 ? false : true;

  const handleNext = async () => {
    if (step === TOTAL_STEPS - 1) {
      await save();
      toast.success(t("toast.session_saved"));
      navigate("/");
    } else if (step === 0 && state.prospect.airtable_suggestions?.length) {
      // Skip AI Assist: apply Airtable suggestions directly and go to Pains
      updateState(prev => ({
        ...prev,
        selectedPains: [...new Set([...prev.selectedPains, ...state.prospect.airtable_suggestions!.map(s => s.pain_id)])],
        aiSuggestions: state.prospect.airtable_suggestions!,
      }));
      setStep(2);
    } else {
      goNext();
    }
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
        />
      )}
      {step === 1 && (
        <StepAiAssist
          country={state.prospect.country}
          sector={state.prospect.sector}
          hubspotNotes={state.prospect.hubspot_notes}
          companyName={state.prospect.company_name}
          onSuggest={(painIds, suggestions) => {
            updateState(prev => ({
              ...prev,
              selectedPains: [...new Set([...prev.selectedPains, ...painIds])],
              aiSuggestions: suggestions,
            }));
            goNext();
          }}
          onSkip={() => goNext()}
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
