import { useParams, useNavigate } from "react-router-dom";
import { useWizardSession } from "@/hooks/useWizardSession";
import { WizardShell } from "@/components/wizard/WizardShell";
import { StepSetup } from "@/components/wizard/StepSetup";
import { StepModulesROI } from "@/components/wizard/StepModulesROI";
import { StepOffering } from "@/components/wizard/StepOffering";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const TOTAL_STEPS = 3;

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
    if (step === TOTAL_STEPS - 1) {
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
        <StepSetup
          data={state.prospect}
          roiConfig={state.roiConfig}
          onChange={(partial) =>
            updateState(prev => ({
              ...prev,
              prospect: { ...prev.prospect, ...partial },
            }))
          }
          onRoiConfigChange={(config) =>
            updateState(prev => ({ ...prev, roiConfig: config }))
          }
          seats={state.prospect.seats}
        />
      )}
      {step === 1 && (
        <StepModulesROI
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
          roiConfig={state.roiConfig}
          onRoiConfigChange={(config) =>
            updateState(prev => ({ ...prev, roiConfig: config }))
          }
          seats={state.prospect.seats}
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
          roiConfig={state.roiConfig}
          onChange={(partial) =>
            updateState(prev => ({
              ...prev,
              offering: { ...prev.offering, ...partial },
            }))
          }
          onModulesChange={(modules) =>
            updateState(prev => ({ ...prev, selectedModules: modules }))
          }
          sessionId={currentSessionId}
          state={state}
        />
      )}
    </WizardShell>
  );
}
