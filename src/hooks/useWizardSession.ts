import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface HubSpotNote {
  id: string;
  body: string;
  created_at: string;
}

export interface AirtableSuggestion {
  pain_id: string;
  rationale: string;
}

export interface AirtableEmail {
  date: string;
  subject: string;
  body: string;
  direction: string;
  from: string;
}

export interface AirtableCall {
  date: string;
  transcript: string;
  duration_seconds: number;
  owner: string;
}

export interface ProspectData {
  company_name: string;
  deal_name: string;
  country: "ES" | "FR";
  seats: number;
  sector: string;
  hubspot_deal_url: string;
  contact_name: string;
  contact_email: string;
  hubspot_notes: HubSpotNote[];
  airtable_suggestions?: AirtableSuggestion[];
  airtable_stats?: { email_count: number; call_count: number };
  airtable_emails?: AirtableEmail[];
  airtable_calls?: AirtableCall[];
  fetch_source?: "airtable" | "hubspot";
}

export interface PainOverride {
  value: number;
  annual_benefit: number;
  expandedVars?: Record<string, number>;
}

export interface AddonLine {
  module: string;
  label: string;
  architecture: string;
  pepm: number;
  annual: number;
  pains_solved: string[];
  enabled: boolean;
}

export interface SelectedOffering {
  billing: "monthly" | "yearly";
  tier: "business" | "enterprise";
  // Bundle info
  bundle_id?: number;
  bundle_name?: string;
  bundle_modules?: string[];
  bundle_pepm?: number;
  bundle_annual?: number;
  // Add-on lines
  addon_lines?: AddonLine[];
  // Computed totals (written by Offering, read by Review)
  total_annual_cost?: number;
  covered_pains?: string[];
  uncovered_pains?: string[];
  total_annual_benefit?: number;
  net_roi?: number;
  roi_pct?: number;
  payback_months?: number;
  // Legacy fields (kept for backward compat)
  addon_modules?: string[];
  selectedBase?: "best" | "better" | "good" | "alacarte";
  customModules?: string[];
  isCustomised?: boolean;
  effectiveBundleId?: number;
  effectiveBundleName?: string;
  totalPepm?: number;
  totalAnnual?: number;
  totalRoi?: number;
}

export interface CustomPain {
  id: string;
  title: string;
  annual_savings: number;
  modules: string[];
}

export interface AiSuggestion {
  pain_id: string;
  rationale: string;
}

export interface ModuleSuggestion {
  module_id: string;
  confidence: "strong" | "possible";
  quote: string;
}

export interface RoiConfig {
  headcounts: { employee: number; hr: number; manager: number };
  hourly_costs: { employee: number; hr: number; manager: number };
}

export interface WizardState {
  prospect: ProspectData;
  selectedPains: string[];
  painOverrides: Record<string, PainOverride>;
  offering: SelectedOffering;
  customPains: CustomPain[];
  aiSuggestions: AiSuggestion[];
  selectedModules: string[];
  moduleSuggestions: ModuleSuggestion[];
  roiConfig: RoiConfig;
}

const defaultProspect: ProspectData = {
  company_name: "",
  deal_name: "",
  country: "ES",
  seats: 50,
  sector: "",
  hubspot_deal_url: "",
  contact_name: "",
  contact_email: "",
  hubspot_notes: [],
};

const defaultOffering: SelectedOffering = {
  billing: "yearly",
  tier: "business",
  addon_modules: [],
};

export function useWizardSession(sessionId?: string) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(!!sessionId);
  const [saving, setSaving] = useState(false);
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId ?? null);

  const [state, setState] = useState<WizardState>({
    prospect: { ...defaultProspect },
    selectedPains: [],
    painOverrides: {},
    offering: { ...defaultOffering },
    customPains: [],
    aiSuggestions: [],
    selectedModules: [],
    moduleSuggestions: [],
    roiConfig: { headcounts: { employee: 40, hr: 3, manager: 8 }, hourly_costs: { employee: 25, hr: 35, manager: 30 } },
  });

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing session
  useEffect(() => {
    if (!sessionId || sessionId === "new") {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: session } = await supabase
        .from("roi_sessions")
        .select("*, prospects(*)")
        .eq("id", sessionId)
        .single();
      if (session) {
        setCurrentSessionId(session.id);
        setProspectId(session.prospect_id);
        const p = session.prospects as any;
        setState({
          prospect: {
            company_name: p?.company_name ?? "",
            deal_name: p?.deal_name ?? "",
            country: (p?.country as "ES" | "FR") ?? "ES",
            seats: p?.seats ?? 50,
            sector: p?.sector ?? "",
            hubspot_deal_url: p?.hubspot_deal_url ?? "",
            contact_name: p?.contact_name ?? "",
            contact_email: p?.contact_email ?? "",
            hubspot_notes: [],
          },
          selectedPains: session.selected_pains ?? [],
          painOverrides: (session.pain_overrides as unknown as Record<string, PainOverride>) ?? {},
          offering: (session.selected_offering as unknown as SelectedOffering) ?? { ...defaultOffering },
          customPains: (session as any).custom_pains ?? [],
          aiSuggestions: [],
          selectedModules: (session as any).selected_modules ?? [],
          moduleSuggestions: (session as any).module_suggestions ?? [],
          roiConfig: (session as any).roi_config ?? { headcounts: { employee: 40, hr: 3, manager: 8 }, hourly_costs: { employee: 25, hr: 35, manager: 30 } },
        });
      }
      setLoading(false);
    })();
  }, [sessionId]);

  const save = useCallback(async (s: WizardState = state) => {
    if (!user) return;
    setSaving(true);
    try {
      // Upsert prospect
      let pid = prospectId;
      if (!pid) {
        const { data: newP, error: pErr } = await supabase
          .from("prospects")
          .insert({
            pae_id: user.id,
            company_name: s.prospect.company_name || "Untitled",
            country: s.prospect.country,
            seats: s.prospect.seats,
            sector: s.prospect.sector || null,
            hubspot_deal_url: s.prospect.hubspot_deal_url || null,
            contact_name: s.prospect.contact_name || null,
            contact_email: s.prospect.contact_email || null,
          })
          .select("id")
          .single();
        if (pErr) throw pErr;
        pid = newP!.id;
        setProspectId(pid);
      } else {
        await supabase
          .from("prospects")
          .update({
            company_name: s.prospect.company_name || "Untitled",
            country: s.prospect.country,
            seats: s.prospect.seats,
            sector: s.prospect.sector || null,
            hubspot_deal_url: s.prospect.hubspot_deal_url || null,
            contact_name: s.prospect.contact_name || null,
            contact_email: s.prospect.contact_email || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", pid);
      }

      // Upsert session
      let sid = currentSessionId;
      if (!sid || sid === "new") {
        const { data: newS, error: sErr } = await supabase
          .from("roi_sessions")
          .insert({
            pae_id: user.id,
            prospect_id: pid,
            selected_pains: s.selectedPains,
            pain_overrides: s.painOverrides as any,
            selected_offering: s.offering as any,
          })
          .select("id")
          .single();
        if (sErr) throw sErr;
        sid = newS!.id;
        setCurrentSessionId(sid);
        window.history.replaceState(null, "", `/session/${sid}`);
      } else {
        await supabase
          .from("roi_sessions")
          .update({
            prospect_id: pid,
            selected_pains: s.selectedPains,
            pain_overrides: s.painOverrides as any,
            selected_offering: s.offering as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sid);
      }
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  }, [state, user, prospectId, currentSessionId]);

  const updateState = useCallback((updater: (prev: WizardState) => WizardState) => {
    setState(prev => {
      const next = updater(prev);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => save(next), 5000);
      return next;
    });
  }, [save]);

  const goNext = useCallback(async () => {
    await save();
    setStep(s => Math.min(s + 1, 6));
  }, [save]);

  const goBack = useCallback(() => {
    setStep(s => Math.max(s - 1, 0));
  }, []);

  return {
    step, setStep, state, updateState, save,
    goNext, goBack, loading, saving,
    currentSessionId, prospectId,
  };
}
