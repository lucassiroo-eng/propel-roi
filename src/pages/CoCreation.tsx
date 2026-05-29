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
  ArrowLeft, ArrowRight, Check, Download, Save,
  FileText, Loader2, Send, Users, Shield,
  Briefcase, X, ChevronRight, ChevronDown, Package,
  Search, Share2, Sparkles, MessageSquare, Phone,
  HelpCircle, Maximize2, Eye,
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
  buildRoiSlideData, generateRoiSlideHtml, generateRoiSlidePdf, generateMultiSlidePdf,
  type RoiSlideInput,
} from "@/lib/generateRoiSlide";
import { DISCOVERY_QUESTIONS, getQuestion } from "@/lib/discoveryQuestions";
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

/* ─── Slide Preview (reused from Express) ─── */
function SlidePreview({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1440);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [fullscreen]);

  const fsScale = typeof window !== "undefined"
    ? Math.min(window.innerWidth / 1440, window.innerHeight / 810)
    : 0.5;

  return (
    <>
      <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden bg-slate-100 border border-border/60 group cursor-pointer" style={{ height: Math.round(810 * scale) }} onClick={() => setFullscreen(true)}>
        <iframe srcDoc={html} title="ROI Slide Preview" sandbox="allow-same-origin" className="absolute top-0 left-0 border-0 pointer-events-none" style={{ width: 1440, height: 810, transform: `scale(${scale})`, transformOrigin: "top left" }} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
            <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
          </div>
        </div>
      </div>
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setFullscreen(false)}>
          <button onClick={() => setFullscreen(false)} className="absolute top-5 right-5 z-10 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"><X className="h-5 w-5" /></button>
          <div onClick={e => e.stopPropagation()} className="relative rounded-xl overflow-hidden shadow-2xl" style={{ width: Math.round(1440 * fsScale), height: Math.round(810 * fsScale) }}>
            <iframe srcDoc={html} title="ROI Slide Fullscreen" sandbox="allow-same-origin" className="absolute top-0 left-0 border-0" style={{ width: 1440, height: 810, transform: `scale(${fsScale})`, transformOrigin: "top left" }} />
          </div>
          <p className="absolute bottom-5 text-white/40 text-xs font-medium">ESC to close</p>
        </div>
      )}
    </>
  );
}

export default function CoCreation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const STEPS = [
    t("cocreation.step_import"), t("cocreation.step_modules"),
    t("cocreation.step_config"), t("cocreation.step_discovery"),
    t("cocreation.step_result"), t("cocreation.step_personalize"),
  ];
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
        setStep(mods.length > 0 ? 4 : 0);
      } catch {
        toast.error(t("express.session_load_error"));
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams]);

  // Step 0: Import
  const [hubspotUrl, setHubspotUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [dealName, setDealName] = useState("");
  const [country, setCountry] = useState<"ES" | "FR">("ES");

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

  // Step 4: Result
  const [annualCost, setAnnualCost] = useState(0);
  const [dlPdf, setDlPdf] = useState<string | null>(null);
  const [slidePreviewOpen, setSlidePreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 5: Personalize
  const [modjoSearch, setModjoSearch] = useState("");
  const [modjoCalls, setModjoCalls] = useState<ModjoCall[]>([]);
  const [searchingCalls, setSearchingCalls] = useState(false);
  const [selectedCall, setSelectedCall] = useState<ModjoCall | null>(null);
  const [personalizing, setPersonalizing] = useState(false);
  const [enhancedDescriptions, setEnhancedDescriptions] = useState<Record<string, Partial<Record<"employee" | "hr" | "manager", string[]>>> | null>(null);

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

  // Grouped catalog
  const grouped = useMemo(() => {
    const q = catSearch.toLowerCase();
    const f = q ? MODULE_CATALOG.filter(m => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) : MODULE_CATALOG;
    const g: Record<string, typeof MODULE_CATALOG> = {};
    for (const m of f) { if (!g[m.category]) g[m.category] = []; g[m.category].push(m); }
    return g;
  }, [catSearch]);

  // ROI calc
  const roi = useMemo(() => {
    if (!selectedModules.length) return null;
    const { headcounts, hourly_costs } = roiConfig;
    const mul: RoiMultipliers = { headcounts, onboardings_per_year: roiConfig.onboardings_per_year, expense_submitters: roiConfig.expense_submitters };
    let mHrs = 0, mMon = 0, toolSavings = 0;
    for (const modId of selectedModules) {
      const toolOvr = roiConfig.tool_overrides?.[modId];
      if (toolOvr) { toolSavings += toolOvr.annual_cost; continue; }
      const hrs = getEffectiveHours(modId, roiConfig.hours_overrides);
      for (const sk of ["employee", "hr", "manager"] as Stakeholder[]) {
        const e = MODULE_HOURS.find(x => x.module_id === modId && x.stakeholder === sk);
        const cnt = e ? getCountForEntry(e, mul) : headcounts[sk];
        const h = hrs[sk] * cnt;
        mHrs += h; mMon += h * hourly_costs[sk];
      }
    }
    const ann = mMon * 12 + toolSavings;
    const c = annualCost;
    return { savings: ann, cost: c, pct: c > 0 ? ((ann - c) / c * 100) : 0, payback: ann > 0 ? (c / ann * 12) : 0, hrs: mHrs };
  }, [selectedModules, roiConfig, annualCost]);

  const slideHtml = useMemo(() => {
    if (!roi || !selectedModules.length) return null;
    const lang = (i18n.language ?? "en").slice(0, 2);
    const input: RoiSlideInput = {
      companyName: companyName || dealName || "Company",
      country, language: lang,
      configModules: selectedModules,
      bundleName: selectedBundle?.bundle_name ?? "Factorial",
      bundleModules: selectedBundle ? [...bundleModuleIds] : selectedModules,
      roiConfig, annualCost,
      ...(enhancedDescriptions ? { customDescriptions: enhancedDescriptions } : {}),
    };
    return generateRoiSlideHtml(buildRoiSlideData(input));
  }, [roi, selectedModules, roiConfig, annualCost, companyName, dealName, country, i18n.language, selectedBundle, bundleModuleIds, enhancedDescriptions]);

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
    setFetching(true);
    setMsgs([{ text: t("express.fetching"), done: false }]);
    try {
      const deal = await fetchDealByHubspotId(dealId);
      if (deal) {
        if (deal.deal_name) setDealName(deal.deal_name);
        setMsgs([{ text: `Deal: ${deal.deal_name || dealId}`, done: true }]);
        if (deal.atlas_id) {
          setMsgs(prev => [...prev, { text: t("express.searching_company"), done: false }]);
          const co = await fetchAtlasCompany(deal.atlas_id);
          if (co?.company_name) {
            setCompanyName(co.company_name);
            setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: `Empresa: ${co.company_name}`, done: true }; return u; });
          }
        }
      } else {
        setMsgs([{ text: t("express.not_found_hubspot"), done: false }]);
        const { data: hs, error: hsErr } = await supabase.functions.invoke("hubspot-deal", { body: { deal_url: url } });
        if (hsErr || !hs || hs.error) {
          setMsgs([{ text: t("express.not_found"), done: true }]);
          toast.error(t("express.not_found_toast"));
          return;
        }
        if (hs.deal_name) setDealName(hs.deal_name);
        if (hs.company_name) setCompanyName(hs.company_name);
        const hsCountry = (hs.country ?? "").toLowerCase();
        if (hsCountry.includes("france") || hsCountry === "fr") setCountry("FR");
        const hsSeats = parseInt(hs.employees, 10);
        if (hsSeats > 0) {
          setRoiConfig(prev => ({ ...prev, headcounts: { employee: Math.round(hsSeats * 0.8), hr: Math.max(1, Math.round(hsSeats * 0.05)), manager: Math.round(hsSeats * 0.15) } }));
        }
        setMsgs([{ text: `Deal: ${hs.deal_name || dealId}`, done: true }, ...(hs.company_name ? [{ text: `Empresa: ${hs.company_name}`, done: true }] : [])]);
      }
      setTimeout(() => setStep(1), 800);
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally { setFetching(false); }
  }

  function extractSearchTerm(name: string): string {
    const noise = new Set(["s.l.", "s.a.", "sl", "sa", "sas", "srl", "gmbh", "ltd", "inc", "from", "pimec", "factorial", "the", "and", "de", "del", "la", "el", "les", "des", "-"]);
    const words = name.split(/[\s\-·,]+/).filter(w => w.length >= 3 && !noise.has(w.toLowerCase()));
    return words.sort((a, b) => b.length - a.length)[0] ?? name.slice(0, 20);
  }

  useEffect(() => {
    if (step === 5 && modjoCalls.length === 0 && !searchingCalls && (dealName || companyName)) {
      searchModjoCalls();
    }
  }, [step]);

  async function searchModjoCalls() {
    const query = modjoSearch.trim() || extractSearchTerm(dealName || companyName);
    if (!query || query.length < 3) { toast.error("Search term must be at least 3 characters"); return; }
    setSearchingCalls(true);
    try {
      const { data, error } = await supabase.functions.invoke("modjo-calls", {
        body: { mode: "search", companyName: query },
      });
      if (error) throw error;
      setModjoCalls(data?.calls ?? []);
      if (!data?.calls?.length) toast(t("cocreation.no_calls"));
    } catch (err: any) {
      toast.error(err.message ?? "Error searching calls");
    } finally { setSearchingCalls(false); }
  }

  async function handlePersonalize() {
    if (!selectedCall) return;
    setPersonalizing(true);
    try {
      const { data: transcriptData, error: tErr } = await supabase.functions.invoke("modjo-calls", {
        body: { mode: "transcript", callId: selectedCall.callId },
      });
      if (tErr) throw tErr;
      if (!transcriptData?.transcript) throw new Error("No transcript");

      const lang = (i18n.language ?? "en").slice(0, 2);
      const { data, error } = await supabase.functions.invoke("ai-enhance-roi-detail", {
        body: { transcript: transcriptData.transcript, modules: selectedModules, language: lang },
      });
      if (error) throw error;
      if (!data?.descriptions) throw new Error(data?.error ?? "No descriptions");
      setEnhancedDescriptions(data.descriptions);
      toast.success(t("cocreation.personalized"));
      setStep(4);
    } catch (err: any) {
      console.error("Personalize error:", err);
      toast.error(err.message ?? "Error");
    } finally { setPersonalizing(false); }
  }

  const saveToHistory = useCallback(async (status: string = "co_created") => {
    if (!user) return;
    const savings = roi?.savings ?? 0;
    const sessionPayload = {
      status,
      selected_pains: [] as any,
      selected_modules: selectedModules as any,
      module_suggestions: [] as any,
      roi_config: roiConfig as any,
      factorial_annual_cost_eur: annualCost,
      roi_eur: Math.round(savings - annualCost),
      roi_pct: Math.round(roi?.pct ?? 0),
      payback_months: Math.round(roi?.payback ?? 0),
      total_annual_benefit_eur: Math.round(savings),
    };
    try {
      if (savedSessionId.current) {
        await supabase.from("roi_sessions").update(sessionPayload).eq("id", savedSessionId.current);
        if (loadedSessionProspect.current) {
          await supabase.from("prospects").update({ company_name: companyName || dealName || "Co-creation ROI", deal_name: dealName || null, country, seats: roiConfig.headcounts.employee }).eq("id", loadedSessionProspect.current);
        }
      } else {
        const { data: prospect, error: pErr } = await supabase.from("prospects").insert({ pae_id: user.id, company_name: companyName || dealName || "Co-creation ROI", deal_name: dealName || null, country, seats: roiConfig.headcounts.employee }).select("id").single();
        if (pErr) throw pErr;
        const { data: session, error: sErr } = await supabase.from("roi_sessions").insert({ pae_id: user.id, prospect_id: prospect!.id, ...sessionPayload }).select("id").single();
        if (sErr) throw sErr;
        savedSessionId.current = session!.id;
        loadedSessionProspect.current = prospect!.id;
      }
      queryClient.invalidateQueries({ queryKey: ["roi_sessions"] });
    } catch (err: any) { console.error("Save failed:", err.message); }
  }, [user, companyName, dealName, country, roiConfig, selectedModules, annualCost, roi, queryClient]);

  async function downloadPdf(type: "summary" | "detail") {
    setDlPdf(type);
    try {
      const lang = (i18n.language ?? "es").slice(0, 2);
      const input: RoiSlideInput = {
        companyName: companyName || dealName || "Company",
        country, language: lang, configModules: selectedModules,
        bundleName: selectedBundle?.bundle_name ?? "Factorial",
        bundleModules: selectedBundle ? [...bundleModuleIds] : selectedModules,
        roiConfig, annualCost,
        ...(type === "detail" && enhancedDescriptions ? { customDescriptions: enhancedDescriptions } : {}),
      };
      const data = buildRoiSlideData(input);
      if (type === "summary") await generateRoiSlidePdf(data);
      else await generateMultiSlidePdf(data, input);
      toast.success(t("express.pdf_downloaded"));
    } catch (err: any) { toast.error(err.message ?? "Error"); }
    finally { setDlPdf(null); }
  }

  const fmtEur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
  const totalPeople = roiConfig.headcounts.employee + roiConfig.headcounts.hr + roiConfig.headcounts.manager;
  const currentModule = selectedModules[discoveryIdx];
  const currentModuleCat = MODULE_CATALOG.find(m => m.id === currentModule);
  const currentQuestions = currentModule ? DISCOVERY_QUESTIONS[currentModule] : undefined;

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .3s ease-out both}
        .slide-up{animation:slideUp .4s cubic-bezier(.16,1,.3,1) both}
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="h-[2px] bg-border/40">
          <div className="h-full bg-foreground transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="px-4 py-2.5">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button onClick={() => step === 0 ? navigate("/") : setStep(s => s - 1)} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center">
                  <div className="flex items-center gap-1.5 px-1">
                    <div className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-300 ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground"}`}>
                      {i < step ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={`text-xs hidden sm:inline transition-colors ${i === step ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`w-4 h-px hidden sm:block transition-colors ${i < step ? "bg-emerald-400" : "bg-border"}`} />}
                </div>
              ))}
            </div>
            <div className="w-9" />
          </div>
        </div>
      </header>

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
              {([["en", "\u{1F1EC}\u{1F1E7}", "English"], ["es", "\u{1F1EA}\u{1F1F8}", "Español"], ["fr", "\u{1F1EB}\u{1F1F7}", "Français"]] as const).map(([lng, flag, label]) => (
                <button
                  key={lng}
                  onClick={() => { i18n.changeLanguage(lng); localStorage.setItem("propel_locale", lng); }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${i18n.language?.startsWith(lng) ? "bg-foreground text-background shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                >
                  {flag} {label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-6">
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
            <div className="max-w-5xl mx-auto w-full px-5 py-5 h-full flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 overflow-hidden min-h-0">
                {/* Catalog */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">{t("express.catalog")}</h2>
                    <span className="text-[11px] text-muted-foreground">{t("express.n_modules", { count: MODULE_CATALOG.length })}</span>
                  </div>
                  {!catSearch && validBundles.length > 0 && (
                    <div className="mb-3">
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
                                <span className="flex items-center gap-2">{m.label}{inBundle && <span className="text-[10px] text-muted-foreground/60">bundle</span>}</span>
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
                <div className="flex flex-col min-h-0">
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
                              <span className="text-sm font-medium text-foreground flex-1">{cat?.label ?? moduleLabel(id)}</span>
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
              <span className="text-xs font-medium text-muted-foreground">{t("express.n_modules", { count: selectedModules.length })}</span>
              <Button onClick={() => setStep(2)} disabled={!selectedModules.length} className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
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
                  <Select value={country} onValueChange={v => setCountry(v as "ES" | "FR")}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">{"\u{1F1EA}\u{1F1F8}"} {t("express.country_es")}</SelectItem>
                      <SelectItem value="FR">{"\u{1F1EB}\u{1F1F7}"} {t("express.country_fr")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

      {/* ──────────── STEP 3: Discovery (module by module) ──────────── */}
      {step === 3 && currentModule && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
              {/* Module header */}
              <div className="text-center slide-up">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  {t("cocreation.module_n_of_total", { n: discoveryIdx + 1, total: selectedModules.length })}
                </p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentModuleCat?.color ?? "#94A3B8" }} />
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
                    {currentModuleCat?.label ?? moduleLabel(currentModule)}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">{t("cocreation.discovery_sub")}</p>
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5">
                {selectedModules.map((_, i) => (
                  <button key={i} onClick={() => setDiscoveryIdx(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === discoveryIdx ? "bg-foreground scale-125" : i < discoveryIdx ? "bg-emerald-400" : "bg-border"}`} />
                ))}
              </div>

              {/* Questions + hour inputs per stakeholder */}
              <div className="space-y-4">
                {(["employee", "hr", "manager"] as Stakeholder[]).map(sk => {
                  const style = STAKE_STYLE[sk];
                  const Icon = style.icon;
                  const questions = currentQuestions?.[sk];
                  const defaults = getHoursForModule(currentModule);
                  const val = roiConfig.hours_overrides?.[currentModule]?.[sk] ?? defaults[sk];

                  return (
                    <div key={sk} className="rounded-2xl border p-5 space-y-4" style={{ borderColor: style.border, backgroundColor: style.bg }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: style.color }}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-bold text-foreground">{t(STAKE_LABEL_KEY[sk])}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            className="w-[72px] h-9 text-center text-sm font-bold tabular-nums rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-ring/40"
                            style={{ borderColor: style.border }}
                            value={val}
                            onChange={e => {
                              const v = Math.max(0, parseFloat(e.target.value) || 0);
                              setRoiConfig(prev => {
                                const ho = { ...(prev.hours_overrides ?? {}) };
                                ho[currentModule] = { ...(ho[currentModule] ?? {}), [sk]: v };
                                if (v === defaults[sk]) { delete ho[currentModule]![sk]; if (!Object.keys(ho[currentModule]!).length) delete ho[currentModule]; }
                                return { ...prev, hours_overrides: ho };
                              });
                            }}
                          />
                          <span className="text-[11px] text-muted-foreground font-medium">{t("cocreation.hrs_month")}</span>
                        </div>
                      </div>

                      {questions && questions.length > 0 && (
                        <div className="space-y-2.5 pl-[42px]">
                          {questions.map((q, qi) => (
                            <div key={qi} className="flex items-start gap-2">
                              <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: style.color }} />
                              <p className="text-sm text-foreground/80 leading-relaxed">{getQuestion(q, i18n.language)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("cocreation.discovery_notes")}</label>
                <Textarea
                  placeholder={t("cocreation.discovery_notes_placeholder")}
                  value={discoveryNotes[currentModule] ?? ""}
                  onChange={e => setDiscoveryNotes(prev => ({ ...prev, [currentModule]: e.target.value }))}
                  className="mt-2 min-h-[80px] text-sm"
                />
              </div>
            </div>
          </main>

          <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-xl border-t border-border/60 px-4 py-3">
            <div className="max-w-3xl mx-auto flex justify-between gap-3">
              <Button variant="outline" onClick={() => discoveryIdx > 0 ? setDiscoveryIdx(i => i - 1) : setStep(2)} className="rounded-xl">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> {discoveryIdx > 0 ? t("cocreation.prev_module") : t("express.back")}
              </Button>
              {discoveryIdx < selectedModules.length - 1 ? (
                <Button onClick={() => setDiscoveryIdx(i => i + 1)} className="rounded-xl bg-foreground text-background hover:bg-foreground/90">
                  {t("cocreation.next_module")} <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Button onClick={() => setStep(4)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                  {t("cocreation.finish_discovery")} <Check className="h-4 w-4 ml-1.5" />
                </Button>
              )}
            </div>
          </footer>
        </>
      )}

      {/* ──────────── STEP 4: Result ──────────── */}
      {step === 4 && roi && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
            {/* Pricing input */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("cocreation.pricing_title")}</p>
              <p className="text-[11px] text-muted-foreground mb-3">{t("cocreation.pricing_sub")}</p>
              <Input type="number" min={0} className="h-11 text-center font-bold text-lg tabular-nums rounded-xl max-w-[200px]" placeholder="0 €" value={annualCost || ""} onChange={e => setAnnualCost(Math.max(0, parseFloat(e.target.value) || 0))} />
            </div>

            {/* Hero */}
            <div className="text-center slide-up">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("express.result_title")}</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{companyName || dealName}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("express.n_modules_n_people", { modules: selectedModules.length, people: totalPeople })}</p>
            </div>

            {roi.cost > 0 && roi.pct > 0 && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-6 text-center">
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

            {/* Slide preview */}
            {slideHtml && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <button onClick={() => setSlidePreviewOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></div>
                    <span className="text-sm font-semibold text-foreground">{t("express.slide_preview")}</span>
                  </div>
                  {slidePreviewOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {slidePreviewOpen && <div className="border-t border-border p-4"><SlidePreview html={slideHtml} /></div>}
              </div>
            )}

            {/* PDFs */}
            <div className="grid grid-cols-2 gap-3">
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
                {enhancedDescriptions && <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full"><Sparkles className="h-3 w-3" /> {t("express.enhance_badge")}</span>}
              </button>
            </div>

            {/* Personalize CTA */}
            {enhancedDescriptions ? (
              <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{t("cocreation.personalized")}</p>
                      <p className="text-xs text-muted-foreground">{t("cocreation.personalized_sub")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setStep(5)} className="h-8 rounded-lg text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-100">
                      {t("cocreation.re_personalize")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEnhancedDescriptions(null); toast.success(t("express.enhance_cleared")); }} className="h-8 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      {t("cocreation.clear")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setStep(5)} className="w-full rounded-2xl border border-dashed border-violet-300 bg-violet-50/30 p-5 text-left hover:border-violet-400 hover:bg-violet-50/60 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-200 transition-colors">
                    <Sparkles className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t("cocreation.personalize_title")}</p>
                    <p className="text-xs text-muted-foreground">{t("cocreation.personalize_cta")}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}

            {/* Save */}
            <div className="flex flex-col items-center gap-3 pt-2 pb-4">
              <Button
                onClick={async () => { setSaving(true); await saveToHistory(); setSaving(false); toast.success(t("express.roi_saved")); }}
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

      {/* ──────────── STEP 5: Personalize with Modjo ──────────── */}
      {step === 5 && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
            <div className="text-center slide-up">
              <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground mb-2">{t("cocreation.personalize_title")}</h2>
              <p className="text-sm text-muted-foreground max-w-[360px] mx-auto">{t("cocreation.personalize_sub")}</p>
            </div>

            {/* Search calls */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder={extractSearchTerm(dealName || companyName) || "Company name..."}
                  value={modjoSearch}
                  onChange={e => setModjoSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !searchingCalls && searchModjoCalls()}
                  className="flex-1 h-11 rounded-xl text-sm"
                  disabled={searchingCalls}
                />
                <Button onClick={searchModjoCalls} disabled={searchingCalls} className="h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                  {searchingCalls ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-1.5" /> {t("cocreation.search_calls")}</>}
                </Button>
              </div>

              {modjoCalls.length > 0 && (
                <div className="mt-4 space-y-2">
                  {modjoCalls.map(call => {
                    const isSelected = selectedCall?.callId === call.callId;
                    const dateStr = call.date ? new Date(call.date).toLocaleDateString() : "";
                    const mins = Math.round(call.duration / 60);
                    return (
                      <button
                        key={call.callId}
                        onClick={() => setSelectedCall(isSelected ? null : call)}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${isSelected ? "border-violet-400 bg-violet-50" : "border-border hover:border-foreground/20"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{call.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                              {dateStr && <span>{dateStr}</span>}
                              {mins > 0 && <span>{t("cocreation.call_duration", { min: mins })}</span>}
                              {call.users.map(u => u.name).filter(Boolean).join(", ") && (
                                <span className="truncate">{call.users.map(u => u.name).filter(Boolean).join(", ")}</span>
                              )}
                            </div>
                            {call.summary && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{call.summary}</p>}
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Personalize button */}
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={handlePersonalize}
                disabled={!selectedCall || personalizing}
                className="w-full max-w-sm h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
              >
                {personalizing
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("cocreation.personalizing")}</>
                  : <><Sparkles className="h-4 w-4 mr-2" /> {t("cocreation.personalize_btn")}</>
                }
              </Button>

              <button onClick={() => { setStep(4); }} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-2">
                {t("cocreation.skip_personalize")}
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
