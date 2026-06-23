import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, BarChart3, Check, Download, Save,
  FileText, Loader2, Send, Users, Shield,
  Briefcase, X, ChevronRight, ChevronDown, Package,
  Search, Share2, Sparkles, MessageSquare, Phone,
  HelpCircle, Maximize2, Eye, CheckCircle2, Wrench, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  extractDealIdFromUrl, fetchDealByHubspotId, fetchAtlasCompany,
} from "@/lib/atlasClient";
import {
  MODULE_CATALOG, CATEGORY_COLORS,
} from "@/lib/moduleCatalog";
import {
  moduleLabel, parseModulesFromBundle, getBundlePepm, type BundleRow,
} from "@/lib/offeringEngine";
import {
  getEffectiveHours, getHoursForModule, getCountForEntry, MODULE_HOURS,
  type Stakeholder, type RoiMultipliers,
} from "@/lib/moduleHours";
import {
  buildRoiSlideData,
  type RoiSlideInput,
} from "@/lib/generateRoiSlide";
import { generateDeckPdf } from "@/lib/generateRoiDeck";
import { FeedbackButton } from "@/components/FeedbackButton";
import { XLPresentationEditor } from "@/components/XLPresentationEditor";
import { GuidedTour, type TourStep } from "@/components/GuidedTour";
import { DISCOVERY_QUESTIONS, MODULE_INFO, getLocalized, getQuestion } from "@/lib/discoveryQuestions";
import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";

const STAKE_STYLE: Record<Stakeholder, { icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.18)" },
  hr:       { icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.18)" },
  manager:  { icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)" },
};
const STAKE_LABEL_KEY: Record<Stakeholder, string> = { employee: "express.employees", hr: "express.hr_ftes", manager: "express.managers" };

interface Msg { text: string; done: boolean }

interface ModjoCall {
  callId: number;
  title: string;
  date: string;
  duration: number;
  users: { name: string; email: string }[];
  deal: { name: string; crmId: string } | null;
  summary: string | null;
}


export default function XLCoCreation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const STEPS = [
    t("cocreation.step_import"), t("cocreation.step_modules"),
    t("cocreation.step_config"), t("cocreation.step_discovery"),
    t("cocreation.step_result"),
  ];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useQuery({
    queryKey: ["user_role_xl_cocreation", user?.id],
    queryFn: async () => {
      if (!user) return false;
      if (user.email === "lucas.siroo@factorial.co") return true;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["strategy_admin", "super_admin"]);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  const savedSessionId = useRef<string | null>(null);
  const loadedSessionProspect = useRef<string | null>(null);

  const [step, setStep] = useState(0);
  const [loadingSession, setLoadingSession] = useState(false);

  // ── Load existing session from URL ──────────────────────
  useEffect(() => {
    const sid = searchParams.get("session");
    if (!sid || savedSessionId.current === sid) return;
    let cancelled = false;
    (async () => {
      setLoadingSession(true);
      try {
        const { data: sess, error } = await supabase
          .from("roi_sessions")
          .select("*, prospects(company_name, country, deal_name, seats)")
          .eq("id", sid)
          .single();
        if (error || !sess || cancelled) return;
        if (sess.pae_id !== user?.id && !isAdmin) {
          toast.error("Session not found");
          return;
        }
        savedSessionId.current = sess.id;
        loadedSessionProspect.current = sess.prospect_id;
        const prospect = (sess as any).prospects;
        if (prospect?.company_name) setCompanyName(prospect.company_name);
        if (prospect?.deal_name) setDealName(prospect.deal_name);
        if (prospect?.country) setCountry(prospect.country as "ES" | "FR");
        const mods: string[] = (sess.selected_modules as any) ?? [];
        setSelectedModules(mods);
        const rc = sess.roi_config as any;
        if (rc) {
          setRoiConfig({
            headcounts: rc.headcounts ?? { employee: 50, hr: 2, manager: 5 },
            hourly_costs: rc.hourly_costs ?? { employee: 20, hr: 30, manager: 25 },
            hours_overrides: rc.hours_overrides,
            tool_overrides: rc.tool_overrides,
            onboardings_per_year: rc.onboardings_per_year,
            expense_submitters: rc.expense_submitters,
          });
        }
        setAnnualCost(sess.factorial_annual_cost_eur ?? 0);
        const customDescs = (sess as any).custom_descriptions;
        if (customDescs && Object.keys(customDescs).length > 0) setEnhancedDescriptions(customDescs);
        setStep((sess as any).current_step ?? (mods.length > 0 ? 4 : 0));
      } catch {
        toast.error(t("express.session_load_error"));
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams]);

  // Demo mode: pre-fill with sample data for guided tour
  const [isDemo, setIsDemo] = useState(false);
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (searchParams.get("demo") !== "true") return;
    setIsDemo(true);
    setCompanyName("Demo Company SL");
    setCountry("ES");
    setSelectedModules(["core", "time_tracking"]);
    setRoiConfig(prev => ({
      ...prev,
      headcounts: { employee: 80, hr: 3, manager: 10 },
      hourly_costs: { employee: 20, hr: 30, manager: 28 },
      hours_overrides: {
        core: { employee: 0.3, hr: 6, manager: 1 },
        time_tracking: { employee: 0.2, hr: 6, manager: 0.5 },
      },
      onboardings_per_year: 20,
    }));
    setAnnualCost(15000);
    setStep(0);
    searchParams.delete("demo");
    setSearchParams(searchParams, { replace: true });
    setTimeout(() => setShowTour(true), 400);
  }, []);

  // Step 0: Import
  const [hubspotUrl, setHubspotUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [dealName, setDealName] = useState("");
  const [hubspotDealId, setHubspotDealId] = useState<string | null>(null);
  const langToCountry: Record<string, string> = { es: "ES", fr: "FR", it: "IT", de: "DE", pt: "PT", en: "UK" };
  const [country, setCountry] = useState(langToCountry[i18n.language?.slice(0, 2)] ?? "ES");

  // Step 1: Modules
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [catSearch, setCatSearch] = useState("");
  const [selectedBundle, setSelectedBundle] = useState<BundleRow | null>(null);
  const [bundlesOpen, setBundlesOpen] = useState(false);

  // Step 2: Config
  const [roiConfig, setRoiConfig] = useState<RoiConfig>({
    headcounts: { employee: 50, hr: 2, manager: 5 },
    hourly_costs: { employee: 20, hr: 30, manager: 25 },
  });

  // Step 3: Discovery
  const [discoveryIdx, setDiscoveryIdx] = useState(0);
  const [discoveryNotes, setDiscoveryNotes] = useState<Record<string, string>>({});
  const [imgBrokenSet, setImgBrokenSet] = useState<Set<string>>(new Set());

  // Step 4: Result
  const [annualCost, setAnnualCost] = useState(0);
  const [dlPdf, setDlPdf] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 5: Personalize
  const [modjoSearch, setModjoSearch] = useState("");
  const [modjoCalls, setModjoCalls] = useState<ModjoCall[]>([]);
  const [searchingCalls, setSearchingCalls] = useState(false);
  const [selectedCallIds, setSelectedCallIds] = useState<Set<number>>(new Set());
  const [personalizing, setPersonalizing] = useState(false);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [enhancedDescriptions, setEnhancedDescriptions] = useState<Record<string, Partial<Record<"employee" | "hr" | "manager", string[]>>> | null>(null);
  const [showPresEditor, setShowPresEditor] = useState(false);
  const [hiddenSlideIds, setHiddenSlideIds] = useState<Set<string>>(new Set());
  // "both" mode: module shows tool inputs + hour inputs simultaneously
  const [bothModeModules, setBothModeModules] = useState<Set<string>>(new Set());

  // Bundles
  const { data: bundles } = useQuery({
    queryKey: ["cocreation_bundles", country],
    queryFn: async () => {
      const { data, error } = await supabase.from("bundles").select("*").eq("country", country);
      if (error) throw error;
      return data as BundleRow[];
    },
  });
  const validBundles = useMemo(() => (bundles ?? []).filter(b => parseModulesFromBundle(b).length >= 2), [bundles]);
  const bundleModuleIds = useMemo(() => selectedBundle ? new Set(parseModulesFromBundle(selectedBundle)) : new Set<string>(), [selectedBundle]);
  const bundlePepm = useMemo(() => selectedBundle ? getBundlePepm(selectedBundle, "yearly", "business") : 0, [selectedBundle]);
  const addonModules = useMemo(() => selectedModules.filter(id => !bundleModuleIds.has(id)), [selectedModules, bundleModuleIds]);
  const catalogIds = useMemo(() => new Set(MODULE_CATALOG.map(m => m.id)), []);
  const discoveryModules = useMemo(() => selectedModules.filter(id => catalogIds.has(id)), [selectedModules, catalogIds]);

  // Grouped catalog
  const grouped = useMemo(() => {
    const q = catSearch.toLowerCase();
    const f = q ? MODULE_CATALOG.filter(m => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) : MODULE_CATALOG;
    const g: Record<string, typeof MODULE_CATALOG> = {};
    for (const m of f) { if (!g[m.category]) g[m.category] = []; g[m.category].push(m); }
    return g;
  }, [catSearch]);

  // ROI calc — "ambos" modules count tool cost + hours savings
  const roi = useMemo(() => {
    if (!selectedModules.length) return null;
    const { headcounts, hourly_costs } = roiConfig;
    const mul: RoiMultipliers = { headcounts, onboardings_per_year: roiConfig.onboardings_per_year, expense_submitters: roiConfig.expense_submitters };
    let mHrs = 0, mMon = 0, toolSavings = 0;
    for (const modId of selectedModules) {
      const toolOvr = roiConfig.tool_overrides?.[modId];
      const isBoth = bothModeModules.has(modId);
      if (toolOvr) toolSavings += toolOvr.annual_cost;
      // count hours for "hours" mode OR "ambos" mode
      if (!toolOvr || isBoth) {
        for (const sk of ["employee", "hr", "manager"] as Stakeholder[]) {
          const h_override = roiConfig.hours_overrides?.[modId]?.[sk] ?? 0;
          if (h_override === 0) continue;
          const e = MODULE_HOURS.find(x => x.module_id === modId && x.stakeholder === sk);
          const cnt = e ? getCountForEntry(e, mul) : headcounts[sk];
          const h = h_override * cnt;
          mHrs += h; mMon += h * hourly_costs[sk];
        }
      }
    }
    const ann = mMon * 12 + toolSavings;
    const c = annualCost;
    return { savings: ann, cost: c, pct: c > 0 ? ((ann - c) / c * 100) : 0, payback: ann > 0 ? (c / ann * 12) : 0, hrs: mHrs };
  }, [selectedModules, roiConfig, annualCost, bothModeModules]);

  function coCreationRoiConfig(): RoiConfig {
    const ho = { ...(roiConfig.hours_overrides ?? {}) };
    for (const modId of selectedModules) {
      if (roiConfig.tool_overrides?.[modId]) continue;
      ho[modId] = {
        employee: ho[modId]?.employee ?? 0,
        hr: ho[modId]?.hr ?? 0,
        manager: ho[modId]?.manager ?? 0,
      };
    }
    return { ...roiConfig, hours_overrides: ho };
  }

  // ── Handlers ────────────────────────────────────────────
  function toggle(id: string) {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  }
  function selectBundle(b: BundleRow) {
    const prev = selectedBundle ? parseModulesFromBundle(selectedBundle) : [];
    const next = parseModulesFromBundle(b);
    setSelectedModules(cur => Array.from(new Set([...cur.filter(m => !prev.includes(m)), ...next])));
    setSelectedBundle(b);
    setBundlesOpen(false);
  }
  function clearBundle() {
    if (!selectedBundle) return;
    setSelectedModules(cur => cur.filter(m => !parseModulesFromBundle(selectedBundle!).includes(m)));
    setSelectedBundle(null);
  }

  async function handleFetch() {
    const url = hubspotUrl.trim();
    if (!url) return;
    const dealId = extractDealIdFromUrl(url);
    if (!dealId) { toast.error(t("express.hubspot_invalid")); return; }
    setHubspotDealId(dealId);
    setFetching(true);
    setMsgs([{ text: t("express.fetching"), done: false }]);
    try {
      const { data: hs, error: hsErr } = await supabase.functions.invoke("hubspot-deal", { body: { deal_url: url } });
      if (hsErr || !hs || hs.error) {
        setMsgs([{ text: t("express.not_found"), done: true }]);
        toast.error(t("express.not_found_toast"));
        return;
      }
      if (hs.deal_name) setDealName(hs.deal_name);
      if (hs.company_name) setCompanyName(hs.company_name);
      const hsCountry = (hs.country ?? "").toLowerCase();
      if (hsCountry.includes("spain") || hsCountry.includes("españa") || hsCountry === "es") setCountry("ES");
      else if (hsCountry.includes("france") || hsCountry === "fr") setCountry("FR");
      else if (hsCountry.includes("ital") || hsCountry === "it") setCountry("IT");
      else if (hsCountry.includes("german") || hsCountry.includes("deutsch") || hsCountry === "de") setCountry("DE");
      else if (hsCountry.includes("portug") || hsCountry === "pt") setCountry("PT");
      else if (hsCountry.includes("united kingdom") || hsCountry.includes("uk") || hsCountry.includes("england")) setCountry("UK");
      const hsSeats = parseInt(hs.employees, 10);
      if (hsSeats > 0) {
        setRoiConfig(prev => ({ ...prev, headcounts: { employee: Math.round(hsSeats * 0.8), hr: Math.max(1, Math.round(hsSeats * 0.05)), manager: Math.round(hsSeats * 0.15) } }));
      }
      setMsgs([{ text: `Deal: ${hs.deal_name || dealId}`, done: true }, ...(hs.company_name ? [{ text: `${t("prospect.company_name", "Company").replace(" *","")}: ${hs.company_name}`, done: true }] : [])]);
      setTimeout(() => setStep(1), 800);
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally { setFetching(false); }
  }

  useEffect(() => {
    if (step === 4 && personalizeOpen && modjoCalls.length === 0 && !searchingCalls && (dealName || companyName)) {
      searchModjoCalls();
    }
  }, [step]);

  async function searchModjoCalls() {
    const query = modjoSearch.trim() || dealName || companyName;
    if (!query || query.length < 3) { toast.error("Search term must be at least 3 characters"); return; }
    setSearchingCalls(true);
    try {
      const { data, error } = await supabase.functions.invoke("modjo-calls", {
        body: { mode: "search", companyName: query, hubspotDealId },
      });
      if (error) throw error;
      setModjoCalls(data?.calls ?? []);
      if (!data?.calls?.length) toast(t("cocreation.no_calls"));
    } catch (err: any) {
      toast.error(err.message ?? "Error searching calls");
    } finally { setSearchingCalls(false); }
  }

  async function handlePersonalize(callIds?: Set<number>, targetModules?: string[]) {
    const ids = callIds ?? selectedCallIds;
    if (ids.size === 0) return;
    setPersonalizing(true);
    try {
      const callsToUse = modjoCalls.filter(c => ids.has(c.callId));
      // Fetch all transcripts in parallel
      const transcripts = await Promise.all(callsToUse.map(async (call) => {
        const { data, error } = await supabase.functions.invoke("modjo-calls", {
          body: { mode: "transcript", callId: call.callId },
        });
        if (error) throw error;
        return data?.transcript ?? "";
      }));
      const combinedTranscript = transcripts.filter(Boolean).join("\n\n---\n\n");
      if (!combinedTranscript) throw new Error("No transcripts");

      const lang = (i18n.language ?? "en").slice(0, 2);
      const { data, error } = await supabase.functions.invoke("ai-enhance-roi-detail", {
        body: { transcript: combinedTranscript, modules: targetModules ?? selectedModules, language: lang },
      });
      if (error) throw error;
      if (!data?.descriptions) throw new Error(data?.error ?? "No descriptions");
      setEnhancedDescriptions(data.descriptions);
      toast.success(t("cocreation.personalized"));
    } catch (err: any) {
      console.error("Personalize error:", err);
      toast.error(err.message ?? "Error");
    } finally { setPersonalizing(false); }
  }

  function stageForStep(s: number): string {
    if (s <= 1) return "pre_call";
    if (s <= 4) return "during_call";
    return "post_call";
  }

  const saveToHistory = useCallback(async (status?: string) => {
    if (!user) return;
    const savings = roi?.savings ?? 0;
    const resolvedStatus = status ?? stageForStep(step);
    const sessionPayload = {
      status: resolvedStatus,
      flow_type: 'xl_co_created',
      current_step: step,
      selected_pains: [] as any,
      selected_modules: selectedModules as any,
      module_suggestions: [] as any,
      roi_config: roiConfig as any,
      factorial_annual_cost_eur: annualCost,
      roi_eur: Math.round(savings - annualCost),
      roi_pct: Math.round(roi?.pct ?? 0),
      payback_months: Math.round(roi?.payback ?? 0),
      total_annual_benefit_eur: Math.round(savings),
      ...(enhancedDescriptions ? { custom_descriptions: enhancedDescriptions as any } : {}),
    };
    try {
      if (savedSessionId.current) {
        await supabase.from("roi_sessions").update(sessionPayload).eq("id", savedSessionId.current);
        if (loadedSessionProspect.current) {
          await supabase.from("prospects").update({ company_name: companyName || dealName || "Co-creation ROI", deal_name: dealName || null, country, seats: roiConfig.headcounts.employee, ...(hubspotUrl.trim() ? { hubspot_deal_url: hubspotUrl.trim() } : {}) }).eq("id", loadedSessionProspect.current);
        }
      } else {
        const { data: prospect, error: pErr } = await supabase.from("prospects").insert({ pae_id: user.id, company_name: companyName || dealName || "Co-creation ROI", deal_name: dealName || null, country, seats: roiConfig.headcounts.employee, ...(hubspotUrl.trim() ? { hubspot_deal_url: hubspotUrl.trim() } : {}) }).select("id").single();
        if (pErr) throw pErr;
        const { data: session, error: sErr } = await supabase.from("roi_sessions").insert({ pae_id: user.id, prospect_id: prospect!.id, ...sessionPayload }).select("id").single();
        if (sErr) throw sErr;
        savedSessionId.current = session!.id;
        loadedSessionProspect.current = prospect!.id;
      }
      queryClient.invalidateQueries({ queryKey: ["xl_roi_sessions"] });
    } catch (err: any) { console.error("Save failed:", err.message); }
  }, [user, companyName, dealName, country, roiConfig, selectedModules, annualCost, roi, queryClient, step]);

  // ── Auto-save when result is reached ──────────────────
  const autoSaved = useRef(false);
  useEffect(() => {
    if (step === 4 && roi && user && !autoSaved.current) {
      autoSaved.current = true;
      saveToHistory("xl_co_created");
    }
  }, [step, roi, user, saveToHistory]);

  async function downloadPdf(type: "summary" | "detail") {
    setDlPdf(type);
    try {
      const lang = (i18n.language ?? "es").slice(0, 2);
      const input: RoiSlideInput = {
        companyName: companyName || dealName || "Company",
        country, language: lang, configModules: selectedModules,
        bundleName: selectedBundle?.bundle_name ?? "Factorial",
        bundleModules: selectedBundle ? [...bundleModuleIds] : selectedModules,
        roiConfig: coCreationRoiConfig(), annualCost,
        ...(type === "detail" && enhancedDescriptions ? { customDescriptions: enhancedDescriptions } : {}),
      };
      const data = buildRoiSlideData(input);
      await generateDeckPdf(data, input, type === "summary" ? "summary" : "full", { hiddenSlideIds, bothModeModules });
      toast.success(t("express.pdf_downloaded"));
    } catch (err: any) { toast.error(err.message ?? "Error"); }
    finally { setDlPdf(null); }
  }

  const fmtEur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
  const totalPeople = roiConfig.headcounts.employee + roiConfig.headcounts.hr + roiConfig.headcounts.manager;
  const lang = i18n.language;
  const localModLabel = useCallback((id: string, fallback?: string) => {
    const info = MODULE_INFO[id];
    if (info) return getLocalized(info.label, lang);
    return fallback ?? moduleLabel(id);
  }, [lang]);
  const currentModule = discoveryModules[discoveryIdx];
  const currentModuleCat = MODULE_CATALOG.find(m => m.id === currentModule);
  const currentQuestions = currentModule ? DISCOVERY_QUESTIONS[currentModule] : undefined;

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const TOUR_STEPS: TourStep[] = [
    // 1: Import (no welcome) — show the HubSpot input
    {
      targetId: "tour-hubspot-input",
      placement: "bottom",
      title: t("tour.t2_title", "1. Import the HubSpot deal"),
      body: t("tour.t2_body", "Paste the deal URL here. The AI fetches company name, contacts, and communication history automatically.\n\nFor this demo it\'s already filled in. Click Next to advance."),
      ctaLabel: t("tour.next_step", "Next →"),
      onEnter: () => { setStep(0); },
    },
    // 2: Modules — centered popup, spotlight on Continue button
    {
      targetId: "tour-modules-continue-btn",
      placement: "center",
      title: t("tour.t3_title", "2. Select Factorial modules"),
      body: t("tour.t3_body", "We've pre-selected Core and Time Tracking.\n\nChoose a bundle (top left) to add multiple modules at once.\n\nWhen ready, click Continue."),
      ctaLabel: t("tour.cta_continue", "Continue →"),
      onEnter: () => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    },
    // 3: Config headcount — popup below the highlighted section
    {
      targetId: "tour-config-headcount",
      placement: "bottom",
      title: t("tour.t4_title", "3. Configure the team"),
      body: t("tour.t4_body", "Headcount y coste por hora ya rellenados. Revisa y ajusta si necesitas. Haz clic en Continuar."),
      ctaLabel: t("tour.cta_continue", "Continue →"),
      onEnter: () => { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); },
    },
    // 4: Discovery — highlight hours inputs, mock data 1-2-1, CTA = Next module
    {
      targetId: "tour-discovery-inputs",
      placement: "left",
      title: t("tour.t5_title", "4. Enter hours during the call"),
      body: t("tour.t5_body", "Ask: 'How many hours/month do you spend on this?' Enter what they tell you.\n\nPre-filled: 1-2-1 per module."),
      ctaLabel: t("tour.cta_next_module", "Next module →"),
      onEnter: () => {
        setStep(3);
        setRoiConfig(prev => ({
          ...prev,
          hours_overrides: {
            core: { employee: 1, hr: 2, manager: 1 },
            time_tracking: { employee: 1, hr: 2, manager: 1 },
          },
        }));
      },
    },
    // 5: Pricing — popup below so ROI result is visible above
    {
      targetId: "tour-pricing-input",
      placement: "bottom",
      title: t("tour.t6_title", "5. Add Factorial\'s price"),
      body: t("tour.t6_body", "Enter the annual Factorial investment to calculate the real ROI.\n\nWe\'ve set €8.000/year — the ROI will show the net savings and payback period.\n\nThe ROI updates automatically as you type."),
      ctaLabel: t("tour.cta_see_roi", "See ROI →"),
      onEnter: () => {
        setStep(4);
        setAnnualCost(20000);
      },
    },
    // 6: PDF download — top so popup is above the buttons
    {
      targetId: "tour-pdf-buttons",
      placement: "top",
      title: t("tour.t7_title", "6. Download the branded deck"),
      body: t("tour.t7_body", "• 1-Pager — Para el Economic Buyer (CFO, CEO)\n• Detalle completo — desglose modulo a modulo\n\nManda el 1-pager despues de la llamada."),
      ctaLabel: t("tour.cta_next", "Siguiente →"),
      onEnter: () => { setStep(4); },
    },
    // 7: Modjo enhance — open the section
    {
      targetId: "tour-modjo-section",
      placement: "top",
      title: t("tour.t8_title", "7. Enhance with the call recording"),
      body: t("tour.t8_body", "Busca la grabacion en Modjo. La IA reemplaza descripciones genericas por citas reales del prospect.\n\n\"RRHH dedica tiempo\" → \"Montse dedica 3 días/mes a reconciliar en Excel\""),
      ctaLabel: t("tour.cta_last", "Empezar un ROI real →"),
      onEnter: () => { setStep(4); setPersonalizeOpen(true); },
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .3s ease-out both}
        .slide-up{animation:slideUp .4s cubic-bezier(.16,1,.3,1) both}
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="h-[2px] bg-border/40">
          <div className="h-full bg-foreground transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="max-w-5xl mx-auto flex items-center h-12 px-6">
          <button onClick={() => navigate("/xl-space")} className="flex items-center gap-2 mr-6 hover:opacity-80 transition-opacity" title={t("nav.home")}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-primary">
              <BarChart3 className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-xs">Propel ROI</span>
          </button>
          <div className="flex-1 flex items-center justify-center gap-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-1 ${i < step ? "cursor-pointer" : ""}`}
                  onClick={() => { if (i < step) { if (i === 3) setDiscoveryIdx(0); setStep(i); } }}
                >
                  <div className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-300 ${i < step ? "bg-emerald-500 text-white hover:bg-emerald-600" : i === step ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground"}`}>
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline transition-colors ${i === step ? "text-foreground font-semibold" : i < step ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground"}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`w-4 h-px hidden sm:block transition-colors ${i < step ? "bg-emerald-400" : "bg-border"}`} />}
              </div>
            ))}
          </div>
          <div className="w-20" />
        </div>
      </header>

      {isDemo && !showTour && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between">
          <span className="text-amber-700 text-xs font-medium">{t("tour.demo_label", "Guided tour")} — {t("tour.demo_active", "demo data pre-loaded")}</span>
          <button onClick={() => { setIsDemo(false); setShowTour(false); }} className="text-amber-500 hover:text-amber-700 text-xs font-medium">{t("tour.demo_exit", "Exit tour")}</button>
        </div>
      )}

      {showTour && (
        <GuidedTour
          steps={TOUR_STEPS}
          currentAppStep={step}
          onClose={() => { setShowTour(false); setIsDemo(false); }}
          onComplete={() => { setShowTour(false); setIsDemo(false); navigate("/xl-space"); }}
        />
      )}

      {/* ──────────── STEP 0: Import ──────────── */}
      {step === 0 && (
        <main className="flex-1 flex items-center justify-center px-5 pb-16">
          <div className="max-w-md w-full text-center slide-up">
            <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-6 shadow-lg shadow-foreground/10">
              <MessageSquare className="h-8 w-8 text-background" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">{t("cocreation.title")}</h1>
            <p className="text-sm text-muted-foreground mb-6 max-w-[300px] mx-auto leading-relaxed">{t("cocreation.subtitle")}</p>

            {/* Language selector */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {([["en", "\u{1F1EC}\u{1F1E7}", "English"], ["es", "\u{1F1EA}\u{1F1F8}", "Español"], ["fr", "\u{1F1EB}\u{1F1F7}", "Français"], ["pt", "\u{1F1F5}\u{1F1F9}", "Português"], ["it", "\u{1F1EE}\u{1F1F9}", "Italiano"], ["de", "\u{1F1E9}\u{1F1EA}", "Deutsch"]] as const).map(([lng, flag, label]) => (
                <button
                  key={lng}
                  onClick={() => { i18n.changeLanguage(lng); localStorage.setItem("propel_locale", lng); }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${i18n.language?.startsWith(lng) ? "bg-foreground text-background shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                >
                  {flag} {label}
                </button>
              ))}
            </div>

            <div id="tour-hubspot-input" className="flex gap-2 mb-6">
              <Input
                placeholder="https://app.hubspot.com/contacts/.../deal/..."
                value={hubspotUrl}
                onChange={e => setHubspotUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !fetching && handleFetch()}
                className="flex-1 h-12 rounded-xl text-sm"
                disabled={fetching}
                autoFocus
              />
              <Button onClick={handleFetch} disabled={fetching || !hubspotUrl.trim()} className="h-12 w-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0">
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            {msgs.length > 0 && (
              <div className="text-left space-y-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
                {msgs.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                    {m.done ? <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-white" /></div> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />}
                    <span className={m.done ? "text-foreground font-medium" : "text-muted-foreground"}>{m.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ──────────── STEP 1: Modules ──────────── */}
      {step === 1 && (
        <>
          <main className="flex-1 overflow-hidden">
            <div id="tour-modules-step" className="max-w-5xl mx-auto w-full px-5 py-5 h-full flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 overflow-hidden min-h-0">
                {/* Catalog */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">{t("express.catalog")}</h2>
                    <span className="text-[11px] text-muted-foreground">{t("express.n_modules", { count: MODULE_CATALOG.length })}</span>
                  </div>
                  {!catSearch && validBundles.length > 0 && (
                    <div id="tour-bundle-selector" className="mb-3">
                      <button onClick={() => setBundlesOpen(o => !o)} className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{selectedBundle ? selectedBundle.bundle_name : t("express.choose_bundle")}</span>
                          {selectedBundle && bundlePepm > 0 && <span className="text-[11px] text-muted-foreground tabular-nums">{bundlePepm.toFixed(2)} {t("express.pepm")}</span>}
                        </div>
                        {bundlesOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {bundlesOpen && (
                        <div className="mt-1.5 rounded-lg border border-border bg-card overflow-hidden">
                          {selectedBundle && <button onClick={clearBundle} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors border-b border-border"><X className="h-3.5 w-3.5" />{t("express.no_bundle")}</button>}
                          {validBundles.map((b, i) => {
                            const mods = parseModulesFromBundle(b);
                            const active = selectedBundle?.id === b.id;
                            return (
                              <button key={b.id} onClick={() => selectBundle(b)} className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${active ? "bg-foreground/5" : "hover:bg-muted/50"} ${i > 0 || selectedBundle ? "border-t border-border" : ""}`}>
                                <div className="flex items-center gap-2.5"><span className={`text-sm truncate ${active ? "font-semibold" : ""}`}>{b.bundle_name}</span><span className="text-[10px] text-muted-foreground">{mods.length} mods</span></div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder={t("express.search_modules")} value={catSearch} onChange={e => setCatSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-4 pr-2 pb-4">
                      {Object.entries(grouped).map(([cat, mods]) => (
                        <div key={cat}>
                          <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-background py-1">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#94A3B8" }} />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</span>
                          </div>
                          {mods.map(m => {
                            const sel = selectedModules.includes(m.id);
                            const inBundle = bundleModuleIds.has(m.id);
                            return (
                              <button key={m.id} onClick={() => !inBundle && toggle(m.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between ${inBundle ? "bg-foreground/5 text-muted-foreground cursor-default" : sel ? "bg-foreground/5 text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                                <span className="flex items-center gap-2">{localModLabel(m.id, m.label)}{inBundle && <span className="text-[10px] text-muted-foreground/60">bundle</span>}</span>
                                {sel || inBundle ? <Check className={`h-3.5 w-3.5 shrink-0 ${inBundle ? "text-muted-foreground/40" : "text-emerald-500"}`} /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                {/* Selected */}
                <div id="tour-selected-modules" className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">{t("express.selected_title")}</h2>
                    <span className="text-[11px] font-semibold text-foreground tabular-nums bg-foreground/10 px-2 py-0.5 rounded-full">{selectedModules.length}</span>
                  </div>
                  {selectedModules.length === 0 ? (
                    <div className="flex-1 border border-dashed border-border rounded-xl flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">{t("express.select_from_catalog")}</p>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-2 pb-4">
                        {selectedModules.map(id => {
                          const cat = MODULE_CATALOG.find(m => m.id === id);
                          const inBundle = bundleModuleIds.has(id);
                          return (
                            <div key={id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3 group" style={{ animation: "fadeIn 0.25s ease-out" }}>
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#94A3B8" }} />
                              <span className="text-sm font-medium text-foreground flex-1">{localModLabel(id, cat?.label)}</span>
                              {inBundle && <span className="text-[10px] text-muted-foreground/60">bundle</span>}
                              {!inBundle && <button onClick={() => toggle(id)} className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          </main>
          <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-xl border-t border-border/60 px-4 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{t("express.n_modules", { count: selectedModules.length })}</span>
                {selectedModules.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={async () => { setSaving(true); await saveToHistory("pre_call"); setSaving(false); toast.success(t("cocreation.saved")); }} disabled={saving} className="h-8 rounded-lg text-xs text-muted-foreground hover:text-foreground">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    {t("cocreation.save_progress")}
                  </Button>
                )}
              </div>
              <Button id="tour-modules-continue-btn" onClick={() => setStep(2)} disabled={!selectedModules.length} className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
                {t("express.continue")} <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </footer>
        </>
      )}

      {/* ──────────── STEP 2: Config ──────────── */}
      {step === 2 && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("express.configuration")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("express.modules_selected", { count: selectedModules.length })}</p>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("express.company")}</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={dealName || t("express.company_placeholder")} className="h-11 font-semibold text-base rounded-xl" />
                </div>
                <div className="w-[160px] space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("express.country_label")}</Label>
                  <Select value={country} onValueChange={v => setCountry(v)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">{"\u{1F1EA}\u{1F1F8}"} {t("express.country_es")}</SelectItem>
                      <SelectItem value="FR">{"\u{1F1EB}\u{1F1F7}"} {t("express.country_fr")}</SelectItem>
                      <SelectItem value="PT">{"\u{1F1F5}\u{1F1F9}"} {t("express.country_pt", "Portugal")}</SelectItem>
                      <SelectItem value="IT">{"\u{1F1EE}\u{1F1F9}"} {t("express.country_it")}</SelectItem>
                      <SelectItem value="DE">{"\u{1F1E9}\u{1F1EA}"} {t("express.country_de")}</SelectItem>
                      <SelectItem value="UK">{"\u{1F1EC}\u{1F1E7}"} {t("express.country_uk")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div id="tour-config-headcount" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["employee", "hr", "manager"] as Stakeholder[]).map(key => {
                  const m = STAKE_STYLE[key];
                  const Icon = m.icon;
                  return (
                    <div key={key} className="rounded-2xl p-4 space-y-3 border" style={{ backgroundColor: m.bg, borderColor: m.border }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: m.color }}><Icon className="h-4 w-4 text-white" /></div>
                        <span className="text-sm font-bold text-foreground">{t(STAKE_LABEL_KEY[key])}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("express.people")}</label>
                          <Input type="number" min={0} className="h-10 text-center font-bold tabular-nums bg-white/80 rounded-lg" value={roiConfig.headcounts[key]} onChange={e => setRoiConfig(p => ({ ...p, headcounts: { ...p.headcounts, [key]: Math.max(0, parseInt(e.target.value) || 0) } }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("express.eur_hour")}</label>
                          <Input type="number" min={0} step={5} className="h-10 text-center font-bold tabular-nums bg-white/80 rounded-lg" value={roiConfig.hourly_costs[key]} onChange={e => setRoiConfig(p => ({ ...p, hourly_costs: { ...p.hourly_costs, [key]: Math.max(0, parseFloat(e.target.value) || 0) } }))} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra params */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t("express.extra_params")}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t("express.onboardings_yr")}</Label>
                    <Input type="number" min={0} className="h-10 text-center font-bold tabular-nums rounded-lg" placeholder="0" value={roiConfig.onboardings_per_year || ""} onChange={e => setRoiConfig(p => ({ ...p, onboardings_per_year: Math.max(0, parseInt(e.target.value) || 0) }))} />
                  </div>
                  {selectedModules.includes("expenses") && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-muted-foreground">{t("express.expense_submitters")}</Label>
                      <Input type="number" min={0} className="h-10 text-center font-bold tabular-nums rounded-lg" placeholder="0" value={roiConfig.expense_submitters || ""} onChange={e => setRoiConfig(p => ({ ...p, expense_submitters: Math.max(0, parseInt(e.target.value) || 0) }))} />
                    </div>
                  )}
                </div>
              </div>
              </div>{/* end tour-config-headcount */}
            </div>
          </main>
          <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-xl border-t border-border/60 px-4 py-3">
            <div className="max-w-2xl mx-auto flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl"><ArrowLeft className="h-4 w-4 mr-1.5" /> {t("express.back")}</Button>
              <Button onClick={() => { setDiscoveryIdx(0); setStep(3); }} disabled={roiConfig.headcounts.employee === 0} className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
                {t("cocreation.step_discovery")} <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </footer>
        </>
      )}

      {/* ──────────── STEP 3: Discovery (module by module slides) ──────────── */}
      {step === 3 && currentModule && (() => {
        const modInfo = MODULE_INFO[currentModule];
        const modColor = modInfo?.color ?? currentModuleCat?.color ?? "#94A3B8";
        const allQuestions = (["employee", "hr", "manager"] as Stakeholder[]).flatMap(sk =>
          (currentQuestions?.[sk] ?? []).map(q => ({ stakeholder: sk, question: q }))
        );
        const valueProps = modInfo?.valueProps ?? [];
        const modImage = modInfo?.image && !imgBrokenSet.has(currentModule) ? modInfo.image : undefined;
        const modLabel = modInfo ? getLocalized(modInfo.label, lang) : (currentModuleCat?.label ?? moduleLabel(currentModule));
        const lightBg = modColor + "08";

        return (
        <>
          <main id="tour-discovery-step" className="flex-1 overflow-hidden flex flex-col" style={{ background: `linear-gradient(150deg, ${modColor}09 0%, transparent 55%)` }}>
            <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-6 py-3 gap-3 min-h-0">

              {/* Progress bar */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 flex-1">
                  {discoveryModules.map((_, i) => (
                    <button key={i} onClick={() => setDiscoveryIdx(i)} className="flex-1 h-1.5 rounded-full transition-all duration-200" style={{ backgroundColor: i === discoveryIdx ? modColor : i < discoveryIdx ? modColor + "45" : "rgba(0,0,0,0.07)" }} />
                  ))}
                </div>
                <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: modColor + "99" }}>
                  {discoveryIdx + 1}/{discoveryModules.length}
                </span>
              </div>

              {(() => {
                const noImage = !modImage;
                const noQuestions = allQuestions.length === 0;

                // Reusable inputs card — flex-col so it can fill height
                const modToolOvr = roiConfig.tool_overrides?.[currentModule];
                const isBothMode = bothModeModules.has(currentModule);
                const isToolMode = !!modToolOvr && !isBothMode;
                const isHoursMode = !modToolOvr;
                // mode: "hours" | "tool" | "both"
                const inputMode = isBothMode ? "both" : modToolOvr ? "tool" : "hours";

                const setMode = (mode: "hours" | "tool" | "both") => {
                  if (mode === "hours") {
                    setBothModeModules(prev => { const n = new Set(prev); n.delete(currentModule); return n; });
                    setRoiConfig(prev => {
                      const to = { ...(prev.tool_overrides ?? {}) };
                      delete to[currentModule];
                      return { ...prev, tool_overrides: Object.keys(to).length ? to : undefined };
                    });
                  } else if (mode === "tool") {
                    setBothModeModules(prev => { const n = new Set(prev); n.delete(currentModule); return n; });
                    setRoiConfig(prev => ({
                      ...prev,
                      tool_overrides: { ...(prev.tool_overrides ?? {}), [currentModule]: modToolOvr ?? { tool_name: "", annual_cost: 0 } },
                    }));
                  } else { // both
                    setBothModeModules(prev => new Set(prev).add(currentModule));
                    setRoiConfig(prev => ({
                      ...prev,
                      tool_overrides: { ...(prev.tool_overrides ?? {}), [currentModule]: modToolOvr ?? { tool_name: "", annual_cost: 0 } },
                    }));
                  }
                };

                const toolInputs = modToolOvr ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 shrink-0" style={{ color: modColor }} />
                      <span className="text-[11px] font-semibold" style={{ color: 'oklch(35% 0.01 250)' }}>Herramienta reemplazada</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Nombre de la herramienta"
                      className="h-9 px-3 text-[13px] rounded-xl border-2 bg-white focus:outline-none w-full"
                      style={{ borderColor: modColor + '50' }}
                      value={modToolOvr.tool_name}
                      onChange={e => {
                        const name = e.target.value;
                        setRoiConfig(prev => ({
                          ...prev,
                          tool_overrides: { ...(prev.tool_overrides ?? {}), [currentModule]: { ...prev.tool_overrides![currentModule], tool_name: name } },
                        }));
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={0} placeholder="0"
                        className="flex-1 h-9 px-3 text-[14px] text-center font-bold tabular-nums rounded-xl border-2 bg-white focus:outline-none"
                        style={{ borderColor: modColor + '50', color: modColor }}
                        value={modToolOvr.annual_cost || ""}
                        onChange={e => {
                          const cost = Math.max(0, parseFloat(e.target.value) || 0);
                          setRoiConfig(prev => ({
                            ...prev,
                            tool_overrides: { ...(prev.tool_overrides ?? {}), [currentModule]: { ...prev.tool_overrides![currentModule], annual_cost: cost } },
                          }));
                        }}
                      />
                      <span className="text-[12px] font-semibold shrink-0" style={{ color: 'oklch(55% 0.005 250)' }}>€/año</span>
                    </div>
                  </div>
                ) : null;

                const hourInputs = (
                  <div className="flex flex-col gap-2">
                    {inputMode === "both" && (
                      <div className="flex items-center gap-2 pt-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: modColor }} />
                        <span className="text-[11px] font-semibold" style={{ color: 'oklch(35% 0.01 250)' }}>Horas ahorradas por tipo</span>
                      </div>
                    )}
                    {(["employee", "hr", "manager"] as Stakeholder[]).map(sk => {
                      const style = STAKE_STYLE[sk];
                      const Icon = style.icon;
                      const val = roiConfig.hours_overrides?.[currentModule]?.[sk] ?? 0;
                      const entry = MODULE_HOURS.find(e => e.module_id === currentModule && e.stakeholder === sk);
                      const scalesWith = entry?.scales_with ?? "employees";
                      const hUnit = scalesWith === "onboardings" ? t("cocreation.h_hire", "h/hire") : scalesWith === "submitters" ? t("cocreation.h_submission", "h/subm.") : t("cocreation.hrs_month");
                      return (
                        <div key={sk} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: style.color + '15' }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: style.color }} />
                          </div>
                          <span className="text-[12px] font-medium flex-1" style={{ color: 'oklch(35% 0.01 250)' }}>{t(STAKE_LABEL_KEY[sk])}</span>
                          <div className="flex items-baseline gap-1.5">
                            <input
                              type="number" step="0.1" min="0"
                              className="w-[58px] h-8 text-center text-[14px] font-bold tabular-nums rounded-xl border-2 bg-white focus:outline-none transition-colors"
                              style={{ borderColor: modColor + '40' }}
                              value={val || ""}
                              onChange={e => {
                                const v = Math.max(0, parseFloat(e.target.value) || 0);
                                setRoiConfig(prev => {
                                  const ho = { ...(prev.hours_overrides ?? {}) };
                                  ho[currentModule] = { ...(ho[currentModule] ?? {}), [sk]: v };
                                  return { ...prev, hours_overrides: ho };
                                });
                              }}
                            />
                            <span className="text-[10px] font-medium" style={{ color: 'oklch(60% 0.005 250)' }}>{hUnit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );

                const inputsCardInner = (
                  <>
                    {/* Header with mode selector */}
                    <div className="px-4 pt-3 pb-2 shrink-0" style={{ backgroundColor: lightBg }}>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5" style={{ color: modColor }}>Tiempo ahorrado con Factorial</p>
                      {/* 3-mode selector */}
                      <div className="flex gap-1.5">
                        {([
                          { mode: "hours" as const, icon: <Clock className="h-3.5 w-3.5" />, label: "Horas" },
                          { mode: "tool"  as const, icon: <Wrench className="h-3.5 w-3.5" />, label: "Herramienta" },
                          { mode: "both"  as const, icon: <><Clock className="h-3.5 w-3.5" /><span className="font-black text-[10px]">+</span><Wrench className="h-3.5 w-3.5" /></>, label: "Ambos" },
                        ]).map(({ mode, icon, label }) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setMode(mode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border"
                            style={{
                              background: inputMode === mode ? modColor : '#fff',
                              color: inputMode === mode ? '#fff' : 'oklch(45% 0.01 250)',
                              borderColor: inputMode === mode ? modColor : 'oklch(85% 0.005 250)',
                              boxShadow: inputMode === mode ? `0 2px 6px ${modColor}40` : 'none',
                            }}
                          >
                            <span className="flex items-center gap-0.5">{icon}</span>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 flex flex-col px-4 py-3 gap-3 overflow-y-auto">
                      {(inputMode === "tool" || inputMode === "both") && toolInputs}
                      {(inputMode === "both") && <div className="border-t border-black/[0.07]" />}
                      {(inputMode === "hours" || inputMode === "both") && hourInputs}

                      {inputMode !== "tool" && currentModule === "core" && (
                        <div className="pt-2 mt-0.5 border-t border-black/[0.06] flex items-center gap-2">
                          <Label className="text-[12px] font-medium flex-1" style={{ color: 'oklch(44% 0.01 250)' }}>{t("cocreation.onboardings_label")}</Label>
                          <Input type="number" min={0} className="h-8 w-[70px] text-center font-bold tabular-nums rounded-xl border-2 text-[14px]" placeholder="0" value={roiConfig.onboardings_per_year || ""} onChange={e => setRoiConfig(p => ({ ...p, onboardings_per_year: Math.max(0, parseInt(e.target.value) || 0) }))} />
                        </div>
                      )}
                      {inputMode !== "tool" && currentModule === "expenses" && (
                        <div className="pt-2 mt-0.5 border-t border-black/[0.06] flex items-center gap-2">
                          <Label className="text-[12px] font-medium flex-1" style={{ color: 'oklch(44% 0.01 250)' }}>{t("cocreation.expense_submitters_label")}</Label>
                          <Input type="number" min={0} className="h-8 w-[70px] text-center font-bold tabular-nums rounded-xl border-2 text-[14px]" placeholder="0" value={roiConfig.expense_submitters || ""} onChange={e => setRoiConfig(p => ({ ...p, expense_submitters: Math.max(0, parseInt(e.target.value) || 0) }))} />
                        </div>
                      )}
                    </div>
                  </>
                );

                if (noImage && noQuestions) {
                  // Full-height 2-col: module info card left, inputs card right
                  return (
                    <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                      {/* Info card */}
                      <div className="rounded-xl flex flex-col justify-start px-6 py-6 gap-4" style={{ backgroundColor: modColor + '07', border: `1px solid ${modColor}18` }}>
                        <span className="inline-flex self-start items-center text-[22px] font-black text-white px-4 py-1.5 rounded-lg tracking-tight leading-none" style={{ backgroundColor: modColor }}>
                          {modLabel}
                        </span>
                        <h2 className="text-[1.45rem] font-extrabold leading-[1.18] tracking-tight" style={{ color: 'oklch(18% 0.015 250)' }}>
                          {modInfo ? getLocalized(modInfo.description, lang) : ""}
                        </h2>
                        {valueProps.length > 0 && (
                          <ul className="space-y-2">
                            {valueProps.map((vp, vi) => (
                              <li key={vi} className="flex items-start gap-2.5">
                                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-[2px]" style={{ backgroundColor: modColor + "22" }}>
                                  <Check className="h-2.5 w-2.5" style={{ color: modColor }} />
                                </div>
                                <p className="text-[12.5px] leading-snug" style={{ color: 'oklch(40% 0.01 250)' }}>{getLocalized(vp, lang)}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {/* Inputs card */}
                      <div id="tour-discovery-inputs" className="rounded-2xl overflow-hidden bg-white flex flex-col" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                        {inputsCardInner}
                      </div>
                    </div>
                  );
                }

                // No image + has questions: full-height 2-col with styled info+questions left, inputs right
                if (noImage) {
                  return (
                    <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                      {/* Left: info card + questions */}
                      <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
                        {/* Info card */}
                        <div className="rounded-xl flex flex-col gap-3 px-5 py-5 shrink-0" style={{ backgroundColor: modColor + '07', border: `1px solid ${modColor}18` }}>
                          <span className="inline-flex self-start items-center text-[11px] font-bold text-white px-3 py-1 rounded-md tracking-wide" style={{ backgroundColor: modColor }}>
                            {modLabel}
                          </span>
                          <h2 className="text-[1.2rem] font-extrabold leading-[1.18] tracking-tight" style={{ color: 'oklch(18% 0.015 250)' }}>
                            {modInfo ? getLocalized(modInfo.description, lang) : ""}
                          </h2>
                          {valueProps.length > 0 && (
                            <ul className="space-y-1.5">
                              {valueProps.map((vp, vi) => (
                                <li key={vi} className="flex items-start gap-2">
                                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-[3px]" style={{ backgroundColor: modColor + "22" }}>
                                    <Check className="h-2 w-2" style={{ color: modColor }} />
                                  </div>
                                  <p className="text-[12px] leading-snug" style={{ color: 'oklch(40% 0.01 250)' }}>{getLocalized(vp, lang)}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {/* Questions card */}
                        <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0" style={{ backgroundColor: modColor + '05', border: `1px solid ${modColor}18` }}>
                          <div className="px-4 py-2 border-b shrink-0" style={{ borderColor: modColor + '18', backgroundColor: modColor + '0D' }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: modColor }}>{t("cocreation.discovery_questions")}</p>
                          </div>
                          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                            {allQuestions.map(({ stakeholder: sk, question: q }, qi) => {
                              const style = STAKE_STYLE[sk];
                              return (
                                <div key={qi} className="flex items-baseline gap-2">
                                  <span className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide" style={{ backgroundColor: style.color + '1A', color: style.color }}>
                                    {t(STAKE_LABEL_KEY[sk])}
                                  </span>
                                  <p className="text-[12px] leading-snug" style={{ color: 'oklch(30% 0.015 250)' }}>{getQuestion(q, lang)}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {/* Right: inputs card */}
                      <div id="tour-discovery-inputs" className="rounded-2xl overflow-hidden bg-white flex flex-col" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                        {inputsCardInner}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex-1 flex flex-col gap-5 min-h-0">
                    {/* TOP ROW — module info left, screenshot right */}
                    <div className="shrink-0 grid gap-4" style={{ height: '48%', gridTemplateColumns: '1fr 1.1fr' }}>
                      {/* Module info */}
                      <div className="flex flex-col justify-center gap-2.5 pr-2">
                        <span className="inline-flex self-start items-center text-[22px] font-black text-white px-4 py-1.5 rounded-lg tracking-tight leading-none" style={{ backgroundColor: modColor }}>
                          {modLabel}
                        </span>
                        <h2 className="text-[1.35rem] font-extrabold leading-[1.18] tracking-tight" style={{ color: 'oklch(18% 0.015 250)' }}>
                          {modInfo ? getLocalized(modInfo.description, lang) : ""}
                        </h2>
                        {valueProps.length > 0 && (
                          <ul className="space-y-1.5">
                            {valueProps.map((vp, vi) => (
                              <li key={vi} className="flex items-start gap-2">
                                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-[3px]" style={{ backgroundColor: modColor + "1A" }}>
                                  <Check className="h-2 w-2" style={{ color: modColor }} />
                                </div>
                                <p className="text-[12px] leading-snug" style={{ color: 'oklch(42% 0.01 250)' }}>{getLocalized(vp, lang)}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {/* Screenshot */}
                      <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: '0 2px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)' }}>
                        <img
                          src={import.meta.env.BASE_URL + modImage!.replace(/^\//, '')}
                          alt=""
                          className="w-full h-full object-contain"
                          onError={() => setImgBrokenSet(prev => new Set(prev).add(currentModule))}
                        />
                      </div>
                    </div>

                    {/* BOTTOM ROW — questions left, inputs right — grows to fill remaining space */}
                    <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                      {/* Questions card */}
                      <div className="rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: modColor + '07', border: `1px solid ${modColor}20` }}>
                        <div className="px-4 py-2 border-b shrink-0" style={{ borderColor: modColor + '18', backgroundColor: modColor + '0D' }}>
                          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: modColor }}>{t("cocreation.discovery_questions")}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                          {allQuestions.map(({ stakeholder: sk, question: q }, qi) => {
                            const style = STAKE_STYLE[sk];
                            return (
                              <div key={qi} className="flex items-baseline gap-2">
                                <span className="inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide" style={{ backgroundColor: style.color + '1A', color: style.color }}>
                                  {t(STAKE_LABEL_KEY[sk])}
                                </span>
                                <p className="text-[12px] leading-snug" style={{ color: 'oklch(30% 0.01 250)' }}>{getQuestion(q, lang)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Inputs card */}
                      <div id="tour-discovery-inputs" className="rounded-2xl overflow-hidden bg-white flex flex-col" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                        {inputsCardInner}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </main>

          <footer className="sticky bottom-0 z-10 bg-white/80 backdrop-blur-xl border-t border-border/50 px-5 py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => discoveryIdx > 0 ? setDiscoveryIdx(i => i - 1) : setStep(2)} className="rounded-xl h-11 text-foreground/60 hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> {discoveryIdx > 0 ? t("cocreation.prev_module") : t("express.back")}
              </Button>
              <span className="text-xs text-muted-foreground hidden sm:block">{modLabel}</span>
              {discoveryIdx < discoveryModules.length - 1 ? (
                <Button onClick={() => setDiscoveryIdx(i => i + 1)} className="rounded-xl h-11 px-8 text-white font-bold shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: modColor }}>
                  {t("cocreation.next_module")} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => setStep(4)} className="rounded-xl h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {t("cocreation.finish_discovery")} <Check className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </footer>
        </>
        );
      })()}

      {/* ──────────── STEP 4: Result ──────────── */}
      {step === 4 && roi && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
            {/* Pricing input */}
            <div id="tour-pricing-input" className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("cocreation.pricing_title")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("cocreation.pricing_sub")}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Input type="number" min={0} className="h-11 w-[140px] text-center font-bold text-lg tabular-nums rounded-xl" placeholder="0" value={annualCost || ""} onChange={e => setAnnualCost(Math.max(0, parseFloat(e.target.value) || 0))} />
                  <span className="text-sm font-semibold text-muted-foreground">€/{t("cocreation.per_year")}</span>
                </div>
              </div>
            </div>

            {/* Hero */}
            <div className="text-center slide-up">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("express.result_title")}</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{companyName || dealName}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("express.n_modules_n_people", { modules: selectedModules.length, people: totalPeople })}</p>
            </div>

            {roi.cost > 0 && roi.pct > 0 && (
              <div id="tour-roi-result" className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-6 text-center">
                <p className="text-5xl font-black tabular-nums text-emerald-600 tracking-tight">{roi.pct.toFixed(0)}%</p>
                <p className="text-sm font-semibold text-emerald-700/70 mt-1">{t("express.roi_return")}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("express.annual_savings"), val: `${fmtEur(roi.savings)} €` },
                { label: t("express.factorial_cost"), val: `${fmtEur(roi.cost)} €` },
                { label: "Payback", val: roi.savings > 0 ? t("express.payback_months", { months: roi.payback.toFixed(1) }) : "—" },
              ].map(k => (
                <div key={k.label} className="rounded-2xl bg-card border border-border p-4 text-center">
                  <p className="text-lg font-extrabold tabular-nums text-foreground">{k.val}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">{k.label}</p>
                </div>
              ))}
            </div>


            {/* Edit presentation — XL */}
            <button
              onClick={() => setShowPresEditor(true)}
              className="w-full rounded-2xl p-4 text-left transition-all group active:scale-[0.99] hover:shadow-md"
              style={{ background: "oklch(96% 0.025 290)", border: "1.5px solid oklch(80% 0.1 290)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(55% 0.22 290)" }}>
                  <Eye className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: "oklch(30% 0.15 290)" }}>Editar presentación</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "oklch(50% 0.08 290)" }}>Preview del deck · slides · argumentos · Modjo</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "oklch(55% 0.22 290)" }} />
              </div>
              {(enhancedDescriptions || hiddenSlideIds.size > 0) && (
                <div className="flex gap-2 mt-2.5 pl-12">
                  {enhancedDescriptions && (
                    <span className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ color: "oklch(40% 0.18 290)", background: "oklch(88% 0.08 290)" }}>
                      <Sparkles className="h-2.5 w-2.5" /> Modjo activo
                    </span>
                  )}
                  {hiddenSlideIds.size > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "oklch(45% 0.14 65)", background: "oklch(92% 0.08 65)" }}>
                      {hiddenSlideIds.size} slides ocultas
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* PDFs */}
            <div id="tour-pdf-buttons" className="grid grid-cols-2 gap-3">
              <button onClick={() => downloadPdf("summary")} disabled={!!dlPdf} className="rounded-2xl border border-border bg-card p-5 text-left hover:border-foreground/20 hover:shadow-sm transition-all disabled:opacity-50 group active:scale-[0.98]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-background" /></div>
                  <div><p className="text-sm font-bold text-foreground">{t("express.pdf_summary")}</p></div>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {dlPdf === "summary" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {t("express.download_pdf")}
                </span>
              </button>
              <button onClick={() => downloadPdf("detail")} disabled={!!dlPdf} className="rounded-2xl border border-border bg-card p-5 text-left hover:border-foreground/20 hover:shadow-sm transition-all disabled:opacity-50 group active:scale-[0.98] relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-background" /></div>
                  <div><p className="text-sm font-bold text-foreground">{t("express.pdf_detail")}</p></div>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {dlPdf === "detail" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {t("express.download_pdf")}
                </span>
                {/* Editado badge — shown when deck has been customised in the editor */}
                {(enhancedDescriptions || hiddenSlideIds.size > 0) && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "oklch(96% 0.025 290)", color: "oklch(40% 0.18 290)", border: "1px solid oklch(82% 0.08 290)" }}>
                    <Sparkles className="h-2.5 w-2.5" /> editado
                  </span>
                )}
              </button>
            </div>

            {/* Personalize with call notes — inline */}
            <div id="tour-modjo-section" className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setPersonalizeOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center"><Sparkles className="h-3.5 w-3.5 text-violet-600" /></div>
                  <span className="text-sm font-semibold text-foreground">{t("cocreation.personalize_title")}</span>
                  {enhancedDescriptions && <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">{t("express.enhance_badge")}</span>}
                </div>
                {personalizeOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
              {personalizeOpen && (
                <div className="border-t border-border px-5 py-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder={dealName || companyName || "Deal name..."}
                      value={modjoSearch}
                      onChange={e => setModjoSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !searchingCalls && searchModjoCalls()}
                      className="flex-1 h-10 rounded-lg text-sm"
                      disabled={searchingCalls}
                    />
                    <Button onClick={searchModjoCalls} disabled={searchingCalls} size="sm" className="h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                      {searchingCalls ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1.5" /> {t("cocreation.search_calls")}</>}
                    </Button>
                  </div>
                  {modjoCalls.length > 0 && (
                    <div className="space-y-2">
                      {modjoCalls.map(call => {
                        const isSelected = selectedCallIds.has(call.callId);
                        const dateStr = call.date ? new Date(call.date).toLocaleDateString() : "";
                        const mins = Math.round(call.duration / 60);
                        return (
                          <button key={call.callId} onClick={() => setSelectedCallIds(prev => {
                            const next = new Set(prev);
                            if (next.has(call.callId)) next.delete(call.callId); else next.add(call.callId);
                            return next;
                          })} className={`w-full rounded-lg border p-3 text-left transition-all text-xs ${isSelected ? "border-violet-400 bg-violet-50" : "border-border hover:border-foreground/20"}`}>
                            <div className="flex items-start gap-2">
                              <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-violet-500 bg-violet-500" : "border-muted-foreground/40"}`}>
                                {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">{call.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                  {dateStr && <span>{dateStr}</span>}
                                  {mins > 0 && <span>{mins} min</span>}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {selectedCallIds.size > 1 && <p className="text-[10px] text-violet-600 font-medium">{selectedCallIds.size} llamadas seleccionadas — los transcripts se combinarán</p>}
                    </div>
                  )}
                  <Button
                    onClick={() => handlePersonalize()}
                    disabled={selectedCallIds.size === 0 || personalizing}
                    size="sm"
                    className="w-full h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold"
                  >
                    {personalizing
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("cocreation.personalizing")}</>
                      : <><Sparkles className="h-4 w-4 mr-2" /> {t("cocreation.personalize_btn")}</>
                    }
                  </Button>
                  {enhancedDescriptions && (
                    <button onClick={() => { setEnhancedDescriptions(null); toast.success(t("express.enhance_clear_done")); }} className="text-[11px] text-muted-foreground hover:text-destructive transition-colors">
                      {t("cocreation.clear")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Save */}
            <div className="flex flex-col items-center gap-3 pt-2 pb-4">
              <Button
                variant="outline"
                onClick={() => { setDiscoveryIdx(0); setStep(3); }}
                className="w-full max-w-sm h-11 rounded-xl text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("express.back_to_discovery", "Volver a Discovery")}
              </Button>
              <Button
                onClick={async () => { setSaving(true); await saveToHistory("during_call"); setSaving(false); toast.success(t("cocreation.saved")); }}
                disabled={saving}
                className="w-full max-w-sm h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-sm font-bold shadow-lg shadow-foreground/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {t("express.save_and_back")}
              </Button>
            </div>
          </div>
        </main>
      )}
      <FeedbackButton sessionId={savedSessionId.current} page="co-creation" step={step} />

      {showPresEditor && roi && (
        <XLPresentationEditor
          roi={buildRoiSlideData({
            companyName: companyName || dealName || "Company",
            country, language: (i18n.language ?? "es").slice(0, 2),
            configModules: selectedModules,
            bundleName: selectedBundle?.bundle_name ?? "Factorial",
            bundleModules: selectedBundle ? [...(new Set([...Array.from(new Set(selectedModules))]))] : selectedModules,
            roiConfig: coCreationRoiConfig(), annualCost,
            customDescriptions: enhancedDescriptions ?? undefined,
          })}
          input={{
            companyName: companyName || dealName || "Company",
            country, language: (i18n.language ?? "es").slice(0, 2),
            configModules: selectedModules,
            bundleName: selectedBundle?.bundle_name ?? "Factorial",
            bundleModules: selectedBundle ? [...(new Set(selectedModules))] : selectedModules,
            roiConfig: coCreationRoiConfig(), annualCost,
            customDescriptions: enhancedDescriptions ?? undefined,
          }}
          enhancedDescriptions={enhancedDescriptions}
          hiddenSlideIds={hiddenSlideIds}
          modjoCalls={modjoCalls}
          selectedCallIds={selectedCallIds}
          modjoSearch={modjoSearch}
          searchingCalls={searchingCalls}
          personalizing={personalizing}
          onModjoSearch={(q) => { setModjoSearch(q); }}
          onSearchCalls={searchModjoCalls}
          onToggleCallId={(id) => setSelectedCallIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
          onPersonalize={() => handlePersonalize()}
          onClearEnhanced={() => setEnhancedDescriptions(null)}
          onSaveDescriptions={(descs) => setEnhancedDescriptions(descs)}
          onHiddenChange={setHiddenSlideIds}
          onClose={() => setShowPresEditor(false)}
        />
      )}
    </div>
  );
}
