import { useParams, useNavigate } from "react-router-dom";
import { useWizardSession } from "@/hooks/useWizardSession";
import { WizardShell } from "@/components/wizard/WizardShell";
import { StepProspect } from "@/components/wizard/StepProspect";
import { StepModules } from "@/components/wizard/StepModules";
import { StepOffering } from "@/components/wizard/StepOffering";
import { StepReview } from "@/components/wizard/StepReview";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// Steps: 0=Prospect, 1=Modules, 2=Offering, 3=Review
const TOTAL_STEPS = 4;

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
    step === 1 ? state.selectedModules.length > 0 :
    true;

  const handleNext = async () => {
    if (step === 2) {
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
      onNext={handleNext}
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
        <StepModules
          data={state.prospect}
          selectedModules={state.selectedModules}
          moduleSuggestions={state.moduleSuggestions}
          onSelectionChange={(modules, suggestions) =>
            updateState(prev => ({
              ...prev,
              selectedModules: modules,
              moduleSuggestions: suggestions,
            }))
          }
        />
      )}
      {step === 2 && (
        <StepOffering
          country={state.prospect.country}
          seats={state.prospect.seats}
          offering={state.offering}
          selectedPains={state.selectedPains}
          painOverrides={state.painOverrides}
          sector={state.prospect.sector}
          selectedModules={state.selectedModules}
          onChange={(partial) =>
            updateState(prev => ({
              ...prev,
              offering: { ...prev.offering, ...partial },
            }))
          }
        />
      )}
      {step === 3 && (
        <StepReview state={state} sessionId={currentSessionId} />
      )}
    </WizardShell>
  );
}
