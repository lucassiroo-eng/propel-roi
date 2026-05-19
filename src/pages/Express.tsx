import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Check, Download, Pencil, Save,
  FileText, Loader2, Search, Send, Users, Shield,
  Briefcase, X, Zap, ChevronRight, ChevronDown, Package,
  Clock, Wrench, Share2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  extractDealIdFromUrl, fetchDealByHubspotId, fetchAtlasCompany,
} from "@/lib/atlasClient";
import {
  MODULE_CATALOG, CATEGORY_COLORS, buildModulePromptBlock,
} from "@/lib/moduleCatalog";
import {
  moduleLabel, parseModulesFromBundle, getBundlePepm, type BundleRow,
} from "@/lib/offeringEngine";
import {
  getEffectiveHours, getHoursForModule, getCountForEntry, MODULE_HOURS,
  type Stakeholder, type RoiMultipliers,
} from "@/lib/moduleHours";
import {
  buildRoiSlideData, generateRoiSlidePdf, generateMultiSlidePdf,
  type RoiSlideInput,
} from "@/lib/generateRoiSlide";
import type { ModuleSuggestion, RoiConfig, ToolOverride } from "@/hooks/useWizardSession";

const MODULE_REF = buildModulePromptBlock();

const STAKE_STYLE: Record<Stakeholder, { icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.05)",  border: "rgba(59,130,246,0.15)" },
  hr:       { icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.05)",  border: "rgba(16,185,129,0.15)" },
  manager:  { icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.05)",  border: "rgba(245,158,11,0.15)" },
};
const STAKE_LABEL_KEY: Record<Stakeholder, string> = { employee: "express.employees", hr: "express.hr_ftes", manager: "express.managers" };

interface Msg { text: string; done: boolean }

export default function Express() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const STEPS = [t("express.step_import"), t("express.step_modules"), t("express.step_configure"), t("express.step_result")];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const savedSessionId = useRef<string | null>(null);
  const loadedSessionProspect = useRef<string | null>(null);

  const [step, setStep] = useState(0);
  const [loadingSession, setLoadingSession] = useState(false);

  // Step 0
  const [hubspotUrl, setHubspotUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [dealName, setDealName] = useState("");
  const [dealContext, setDealContext] = useState("");
  const [country, setCountry] = useState<"ES" | "FR">("ES");
  const [skipAnalysis, setSkipAnalysis] = useState(false);

  // Step 1
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [moduleSuggestions, setModuleSuggestions] = useState<ModuleSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [selectedBundle, setSelectedBundle] = useState<BundleRow | null>(null);
  const [bundlesOpen, setBundlesOpen] = useState(false);

  // Step 2
  const [roiConfig, setRoiConfig] = useState<RoiConfig>({
    headcounts: { employee: 50, hr: 2, manager: 5 },
    hourly_costs: { employee: 20, hr: 30, manager: 25 },
  });
  const [annualCost, setAnnualCost] = useState(0);

  // Step 3
  const [dlPdf, setDlPdf] = useState<string | null>(null);
  const [hypothesesOpen, setHypothesesOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Bundles ────────────────────────────────────────────
  const { data: bundles } = useQuery({
    queryKey: ["express_bundles", country],
    queryFn: async () => {
      const { data, error } = await supabase.from("bundles").select("*").eq("country", country);
      if (error) throw error;
      return data as BundleRow[];
    },
  });

  const validBundles = useMemo(() => {
    if (!bundles) return [];
    return bundles.filter(b => {
      const mods = parseModulesFromBundle(b);
      return mods.length >= 2;
    });
  }, [bundles]);

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
        setModuleSuggestions((sess.module_suggestions as any) ?? []);

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

        setStep(mods.length > 0 ? 3 : 0);
      } catch {
        toast.error(t("express.session_load_error"));
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams]);

  // ── Fetch deal ──────────────────────────────────────────
  async function handleFetch() {
    const url = hubspotUrl.trim();
    if (!url) return;
    const dealId = extractDealIdFromUrl(url);
    if (!dealId) { toast.error(t("express.hubspot_invalid")); return; }

    setFetching(true);
    setMsgs([{ text: t("express.fetching"), done: false }]);

    try {
      let name = "";
      let context = "";
      let company = "";
      let contentStats = "";

      const deal = await fetchDealByHubspotId(dealId);

      if (deal) {
        name = deal.deal_name ?? "";
        context = deal.deal_context ?? "";
        if (name) setDealName(name);
        if (context) setDealContext(context);

        const s = { notes: deal.numero_de_notas ?? 0, emails: deal.numero_de_emails ?? 0, calls: deal.numero_de_calls ?? 0 };
        const parts: string[] = [];
        if (s.emails > 0) parts.push(`${s.emails} emails`);
        if (s.calls > 0) parts.push(`${s.calls} llamadas`);
        if (s.notes > 0) parts.push(`${s.notes} notas`);

        const next: Msg[] = [{ text: `Deal: ${name || dealId}`, done: true }];
        if (parts.length) { contentStats = parts.join(" · ") + " procesados"; next.push({ text: contentStats, done: true }); }
        setMsgs(next);

        if (deal.atlas_id) {
          setMsgs(prev => [...prev, { text: t("express.searching_company"), done: false }]);
          const co = await fetchAtlasCompany(deal.atlas_id);
          if (co?.company_name) {
            company = co.company_name;
            setCompanyName(company);
            setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: `Empresa: ${company}`, done: true }; return u; });
          } else {
            setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: t("express.company_not_found"), done: true }; return u; });
          }
        }
      } else {
        // Fallback: fetch directly from HubSpot
        setMsgs([{ text: t("express.not_found_hubspot"), done: false }]);
        const { data: hs, error: hsErr } = await supabase.functions.invoke("hubspot-deal", {
          body: { deal_url: url },
        });
        if (hsErr || !hs || hs.error) {
          setMsgs([{ text: t("express.not_found"), done: true }]);
          toast.error(t("express.not_found_toast"));
          setTimeout(() => setStep(1), 1000);
          return;
        }

        name = hs.deal_name ?? "";
        company = hs.company_name ?? "";
        if (name) setDealName(name);
        if (company) setCompanyName(company);

        // Build deal_context from HubSpot notes
        const notes: { body: string; created_at: string }[] = hs.notes ?? [];
        if (notes.length) {
          context = notes.map(n => n.body?.replace(/<[^>]+>/g, " ").trim()).filter(Boolean).join("\n\n");
          setDealContext(context);
        }

        // Map country
        const hsCountry = (hs.country ?? "").toLowerCase();
        if (hsCountry.includes("france") || hsCountry === "fr") setCountry("FR");
        else setCountry("ES");

        // Set seats if available
        const hsSeats = parseInt(hs.employees, 10);
        if (hsSeats > 0) {
          setRoiConfig(prev => ({
            ...prev,
            headcounts: {
              employee: Math.round(hsSeats * 0.8),
              hr: Math.max(1, Math.round(hsSeats * 0.05)),
              manager: Math.round(hsSeats * 0.15),
            },
          }));
        }

        const next: Msg[] = [{ text: `Deal: ${name || dealId}`, done: true }];
        if (company) next.push({ text: `Empresa: ${company}`, done: true });
        if (notes.length) next.push({ text: `${notes.length} notas importadas`, done: true });
        setMsgs(next);
      }

      if (!skipAnalysis) {
        const content = context.slice(0, 6000);
        if (content.trim()) {
          setMsgs(prev => [...prev, { text: t("express.analyzing"), done: false }]);
          setAnalyzing(true);

          const progressHints = [
            "Leyendo emails y notas...",
            "Detectando pain points...",
            "Evaluando módulos relevantes...",
            "Calculando encaje por stakeholder...",
          ];
          let hintIdx = 0;
          const hintTimer = setInterval(() => {
            if (hintIdx < progressHints.length) {
              const hint = progressHints[hintIdx++];
              setMsgs(prev => {
                const u = [...prev];
                u[u.length - 1] = { text: hint, done: false };
                return u;
              });
            }
          }, 2200);

          try {
            const { data: res, error } = await supabase.functions.invoke("ai-unified-analysis", {
              body: { content, country, modules_ref: MODULE_REF },
            });
            clearInterval(hintTimer);
            if (error) throw error;
            const valid = new Set(MODULE_CATALOG.map(c => c.id));
            const seen = new Set<string>();
            const deduped: ModuleSuggestion[] = (res?.modules ?? [])
              .filter((m: any) => valid.has(m.module_id))
              .map((m: any) => ({ module_id: m.module_id, confidence: m.confidence as "strong" | "possible", quote: m.quote || "" }))
              .filter((sg: ModuleSuggestion) => { if (seen.has(sg.module_id)) return false; seen.add(sg.module_id); return true; });

            setModuleSuggestions(deduped);
            setSelectedModules(deduped.map(x => x.module_id));
            setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: t("express.modules_identified", { count: deduped.length }), done: true }; return u; });
          } catch {
            clearInterval(hintTimer);
            setMsgs(prev => { const u = [...prev]; u[u.length - 1] = { text: t("express.analysis_unavailable"), done: true }; return u; });
          }
          setAnalyzing(false);
        }
      } else {
        setMsgs(prev => [...prev, { text: t("express.skip_analysis_done", "Módulos acordados — selecciona manualmente"), done: true }]);
      }

      setTimeout(() => setStep(1), 1000);
    } catch (err: any) {
      toast.error(err.message ?? "Error");
      setMsgs(prev => [...prev, { text: t("express.import_error"), done: true }]);
      setTimeout(() => setStep(1), 1200);
    } finally {
      setFetching(false);
    }
  }

  // ── Module toggle / bundle add ─────────────────────────
  function toggle(id: string) {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  }

  function selectBundle(b: BundleRow) {
    const prev = selectedBundle ? parseModulesFromBundle(selectedBundle) : [];
    const next = parseModulesFromBundle(b);
    setSelectedModules(cur => {
      const withoutPrev = cur.filter(m => !prev.includes(m));
      return Array.from(new Set([...withoutPrev, ...next]));
    });
    setSelectedBundle(b);
    setBundlesOpen(false);
    toast.success(`${b.bundle_name} seleccionado`);
  }

  function clearBundle() {
    if (!selectedBundle) return;
    const bundleMods = parseModulesFromBundle(selectedBundle);
    setSelectedModules(cur => cur.filter(m => !bundleMods.includes(m)));
    setSelectedBundle(null);
  }

  const bundleModuleIds = useMemo(() => {
    if (!selectedBundle) return new Set<string>();
    return new Set(parseModulesFromBundle(selectedBundle));
  }, [selectedBundle]);

  const addonModules = useMemo(() => {
    return selectedModules.filter(id => !bundleModuleIds.has(id));
  }, [selectedModules, bundleModuleIds]);

  const bundlePepm = useMemo(() => {
    if (!selectedBundle) return 0;
    return getBundlePepm(selectedBundle, "yearly", "business");
  }, [selectedBundle]);

  // ── Grouped catalog ────────────────────────────────────
  const grouped = useMemo(() => {
    const q = catSearch.toLowerCase();
    const f = q ? MODULE_CATALOG.filter(m => m.label.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) : MODULE_CATALOG;
    const g: Record<string, typeof MODULE_CATALOG> = {};
    for (const m of f) { if (!g[m.category]) g[m.category] = []; g[m.category].push(m); }
    return g;
  }, [catSearch]);

  // ── ROI calc ───────────────────────────────────────────
  const roi = useMemo(() => {
    if (!selectedModules.length) return null;
    const { headcounts, hourly_costs } = roiConfig;
    const mul: RoiMultipliers = { headcounts, onboardings_per_year: roiConfig.onboardings_per_year, expense_submitters: roiConfig.expense_submitters };
    let mHrs = 0, mMon = 0;
    let toolSavings = 0;
    for (const modId of selectedModules) {
      const toolOvr = roiConfig.tool_overrides?.[modId];
      if (toolOvr) {
        toolSavings += toolOvr.annual_cost;
        continue;
      }
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

  // ── Save to history ─────────────────────────────────────
  const saveToHistory = useCallback(async (status: "generated" | "draft" = "generated") => {
    if (!user) return;
    const savings = roi?.savings ?? 0;
    const roiPct = roi?.pct ?? 0;
    const payback = roi?.payback ?? 0;

    const sessionPayload = {
      status,
      selected_pains: [] as any,
      selected_modules: selectedModules as any,
      module_suggestions: moduleSuggestions as any,
      roi_config: roiConfig as any,
      factorial_annual_cost_eur: annualCost,
      roi_eur: Math.round(savings - annualCost),
      roi_pct: Math.round(roiPct),
      payback_months: Math.round(payback),
      total_annual_benefit_eur: Math.round(savings),
    };

    try {
      if (savedSessionId.current) {
        // Update existing session + prospect
        const { error: sErr } = await supabase
          .from("roi_sessions")
          .update(sessionPayload)
          .eq("id", savedSessionId.current);
        if (sErr) throw sErr;

        if (loadedSessionProspect.current) {
          await supabase
            .from("prospects")
            .update({
              company_name: companyName || dealName || "Express ROI",
              deal_name: dealName || null,
              country,
              seats: roiConfig.headcounts.employee,
            })
            .eq("id", loadedSessionProspect.current);
        }
      } else {
        // Insert new prospect + session
        const { data: prospect, error: pErr } = await supabase
          .from("prospects")
          .insert({
            pae_id: user.id,
            company_name: companyName || dealName || "Express ROI",
            deal_name: dealName || null,
            country,
            seats: roiConfig.headcounts.employee,
          })
          .select("id")
          .single();
        if (pErr) throw pErr;

        const { data: session, error: sErr } = await supabase
          .from("roi_sessions")
          .insert({
            pae_id: user.id,
            prospect_id: prospect!.id,
            ...sessionPayload,
          })
          .select("id")
          .single();
        if (sErr) throw sErr;
        savedSessionId.current = session!.id;
        loadedSessionProspect.current = prospect!.id;
      }
      queryClient.invalidateQueries({ queryKey: ["roi_sessions"] });
    } catch (err: any) {
      console.error("Express save failed:", err.message);
    }
  }, [user, companyName, dealName, country, roiConfig, selectedModules, moduleSuggestions, annualCost, roi, queryClient]);

  // ── PDF ────────────────────────────────────────────────
  async function downloadPdf(type: "summary" | "detail") {
    setDlPdf(type);
    try {
      const lang = (i18n.language ?? "es").slice(0, 2);
      const input: RoiSlideInput = {
        companyName: companyName || dealName || "Company",
        country, language: lang,
        configModules: selectedModules,
        bundleName: selectedBundle?.bundle_name ?? "Factorial",
        bundleModules: selectedBundle ? [...bundleModuleIds] : selectedModules,
        roiConfig, annualCost,
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
        {/* Progress rail */}
        <div className="h-[2px] bg-border/40">
          <div className="h-full bg-foreground transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="px-4 py-2.5">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button onClick={() => step === 0 ? navigate("/") : setStep(s => s - 1)} className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center">
                  <div className="flex items-center gap-1.5 px-1">
                    <div className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-300 ${
                      i < step ? "bg-emerald-500 text-white" : i === step ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground"
                    }`}>
                      {i < step ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={`text-xs hidden sm:inline transition-colors ${i === step ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`w-6 h-px hidden sm:block transition-colors ${i < step ? "bg-emerald-400" : "bg-border"}`} />}
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
              <Zap className="h-8 w-8 text-background" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">ROI Express</h1>
            <p className="text-sm text-muted-foreground mb-10 max-w-[280px] mx-auto leading-relaxed">Pega el link del deal y genera el ROI en minutos</p>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="https://app.hubspot.com/contacts/.../deal/..."
                value={hubspotUrl}
                onChange={e => setHubspotUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !fetching && handleFetch()}
                className="flex-1 h-12 rounded-xl text-sm"
                disabled={fetching}
                autoFocus
              />
              <Button onClick={handleFetch} disabled={fetching || !hubspotUrl.trim()} className="h-12 w-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0 active:scale-95 transition-all">
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setSkipAnalysis(s => !s)}
              disabled={fetching}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 mb-6 text-left transition-all ${
                skipAnalysis
                  ? "border-foreground/30 bg-foreground/[0.04]"
                  : "border-border bg-transparent hover:bg-muted/30"
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                skipAnalysis ? "border-foreground bg-foreground" : "border-border"
              }`}>
                {skipAnalysis && <Check className="h-3 w-3 text-background" />}
              </div>
              <span className={`text-sm ${skipAnalysis ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {t("express.skip_analysis", "Ya tengo los módulos acordados con el prospect")}
              </span>
            </button>

            {msgs.length > 0 && (
              <div className="text-left space-y-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
                {msgs.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                    {m.done ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-white" /></div>
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
                    )}
                    <span className={`${m.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{m.text}</span>
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
                {/* Left: Catalog */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">{t("express.catalog")}</h2>
                    <span className="text-[11px] text-muted-foreground">{t("express.n_modules", { count: MODULE_CATALOG.length })}</span>
                  </div>

                  {/* Bundle selector (collapsible) */}
                  {!catSearch && validBundles.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setBundlesOpen(o => !o)}
                        className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {selectedBundle ? selectedBundle.bundle_name : t("express.choose_bundle")}
                          </span>
                          {selectedBundle && bundlePepm > 0 && (
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {bundlePepm.toFixed(2)} {t("express.pepm")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedBundle && (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {parseModulesFromBundle(selectedBundle).length} mods
                            </span>
                          )}
                          {bundlesOpen
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </button>
                      {bundlesOpen && (
                        <div className="mt-1.5 rounded-lg border border-border bg-card overflow-hidden">
                          {selectedBundle && (
                            <button
                              onClick={clearBundle}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors border-b border-border"
                            >
                              <X className="h-3.5 w-3.5" />
                              Sin bundle
                            </button>
                          )}
                          {validBundles.map((b, i) => {
                            const mods = parseModulesFromBundle(b);
                            const pepm = getBundlePepm(b, "yearly", "business");
                            const active = selectedBundle?.id === b.id;
                            return (
                              <button
                                key={b.id}
                                onClick={() => selectBundle(b)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                                  active ? "bg-foreground/5" : "hover:bg-muted/50"
                                } ${i > 0 || selectedBundle ? "border-t border-border" : ""}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    active ? "border-foreground" : "border-border"
                                  }`}>
                                    {active && <div className="w-2 h-2 rounded-full bg-foreground" />}
                                  </div>
                                  <span className={`text-sm truncate ${active ? "font-semibold text-foreground" : "text-foreground"}`}>
                                    {b.bundle_name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">{mods.length} mods</span>
                                </div>
                                {pepm > 0 && (
                                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                                    {pepm.toFixed(2)} €
                                  </span>
                                )}
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
                            <span className="text-[10px] text-muted-foreground">({mods.length})</span>
                          </div>
                          {mods.map(m => {
                            const sel = selectedModules.includes(m.id);
                            const inBundle = bundleModuleIds.has(m.id);
                            return (
                              <button
                                key={m.id}
                                onClick={() => !inBundle && toggle(m.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ${
                                  inBundle
                                    ? "bg-foreground/5 text-muted-foreground cursor-default"
                                    : sel
                                      ? "bg-foreground/5 text-foreground font-medium"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {m.label}
                                  {inBundle && <span className="text-[10px] text-muted-foreground/60">bundle</span>}
                                </span>
                                {inBundle
                                  ? <Check className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                  : sel
                                    ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    : <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right: Selected */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">Seleccionados</h2>
                    <span className="text-[11px] font-semibold text-foreground tabular-nums bg-foreground/10 px-2 py-0.5 rounded-full">{selectedModules.length}</span>
                  </div>
                  {selectedModules.length === 0 ? (
                    <div className="flex-1 border border-dashed border-border rounded-xl flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Selecciona módulos del catálogo</p>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-2 pb-4">
                        {/* Bundle group */}
                        {selectedBundle && parseModulesFromBundle(selectedBundle).filter(id => selectedModules.includes(id)).length > 0 && (
                          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5" style={{ animation: "fadeIn 0.25s ease-out" }}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5 text-foreground" />
                                <span className="text-xs font-semibold text-foreground">{selectedBundle.bundle_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {bundlePepm > 0 && (
                                  <span className="text-[10px] tabular-nums text-muted-foreground">{bundlePepm.toFixed(2)} €/pers/mes</span>
                                )}
                                <button onClick={clearBundle} className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            {parseModulesFromBundle(selectedBundle).filter(id => selectedModules.includes(id)).map(id => {
                              const cat = MODULE_CATALOG.find(m => m.id === id);
                              return (
                                <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/60 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#94A3B8" }} />
                                  <span className="text-foreground/80">{cat?.label ?? moduleLabel(id)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add-on modules */}
                        {addonModules.map(id => {
                          const cat = MODULE_CATALOG.find(m => m.id === id);
                          const sug = moduleSuggestions.find(sg => sg.module_id === id);
                          return (
                            <div key={id} className="rounded-lg border border-border bg-card p-3 flex items-start gap-3 group hover:shadow-sm transition-shadow" style={{ animation: "fadeIn 0.25s ease-out" }}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#94A3B8" }} />
                                  <span className="text-sm font-medium text-foreground">{cat?.label ?? moduleLabel(id)}</span>
                                  {sug?.confidence === "strong" && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">AI</span>}
                                  {sug?.confidence === "possible" && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Posible</span>}
                                </div>
                                {sug?.quote && <p className="text-xs text-muted-foreground mt-1 italic leading-relaxed line-clamp-2">&ldquo;{sug.quote}&rdquo;</p>}
                              </div>
                              <button onClick={() => toggle(id)} className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                                <X className="h-3.5 w-3.5" />
                              </button>
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
              <span className="text-xs font-medium text-muted-foreground">
                {selectedBundle ? `${selectedBundle.bundle_name} + ${addonModules.length} add-ons` : `${selectedModules.length} módulos`}
              </span>
              <Button onClick={() => setStep(2)} disabled={!selectedModules.length} className="rounded-xl bg-foreground text-background hover:bg-foreground/90 active:scale-95 transition-all">
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
              {/* Section title */}
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("express.configuration")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("express.modules_selected", { count: selectedModules.length })}</p>
              </div>

              {/* Company + Country row */}
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("express.company")}</Label>
                  <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={dealName || t("express.company_placeholder")} className="h-11 font-semibold text-base rounded-xl" />
                </div>
                <div className="w-[160px] space-y-1.5">
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("express.country_label")}</Label>
                  <Select value={country} onValueChange={v => setCountry(v as "ES" | "FR")}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">{"\u{1F1EA}\u{1F1F8}"} {t("express.country_es")}</SelectItem>
                      <SelectItem value="FR">{"\u{1F1EB}\u{1F1F7}"} {t("express.country_fr")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stakeholders */}
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

              {/* Extra inputs */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{t("express.extra_params")}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t("express.onboardings_yr")}</Label>
                    <Input type="number" min={0} className="h-10 text-center font-bold tabular-nums rounded-lg" placeholder="0" value={roiConfig.onboardings_per_year || ""} onChange={e => setRoiConfig(p => ({ ...p, onboardings_per_year: Math.max(0, parseInt(e.target.value) || 0) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">{t("express.factorial_cost_yr")}</Label>
                    <Input type="number" min={0} className="h-10 text-center font-bold tabular-nums rounded-lg" placeholder="0" value={annualCost || ""} onChange={e => setAnnualCost(Math.max(0, parseFloat(e.target.value) || 0))} />
                  </div>
                  {selectedModules.includes("expenses") && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-muted-foreground">{t("express.expense_submitters")}</Label>
                      <Input type="number" min={0} className="h-10 text-center font-bold tabular-nums rounded-lg" placeholder="0" value={roiConfig.expense_submitters || ""} onChange={e => setRoiConfig(p => ({ ...p, expense_submitters: Math.max(0, parseInt(e.target.value) || 0) }))} />
                    </div>
                  )}
                </div>
              </div>

              {/* ROI preview */}
              {roi && roi.savings > 0 && (
                <div className="rounded-2xl bg-foreground/[0.03] border border-foreground/10 p-5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{t("express.preview")}</p>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-extrabold text-foreground tabular-nums">{fmtEur(roi.savings)} €</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("express.savings_yr")}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-foreground tabular-nums">{fmtEur(roi.cost)} €</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("express.cost_yr")}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">{roi.cost > 0 ? `${roi.pct.toFixed(0)}%` : "—"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">ROI</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold text-foreground tabular-nums">{roi.savings > 0 ? `${roi.payback.toFixed(1)}m` : "—"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Payback</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
          <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-xl border-t border-border/60 px-4 py-3">
            <div className="max-w-2xl mx-auto flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl active:scale-95 transition-all">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Atrás
              </Button>
              <Button onClick={() => setStep(3)} disabled={roiConfig.headcounts.employee === 0} className="rounded-xl bg-foreground text-background hover:bg-foreground/90 active:scale-95 transition-all">
                Ver resultado <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </footer>
        </>
      )}

      {/* ──────────── STEP 3: Results ──────────── */}
      {step === 3 && roi && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
            {/* Hero */}
            <div className="text-center slide-up">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{t("express.result_title")}</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{companyName || dealName || t("express.company")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("express.n_modules_n_people", { modules: selectedModules.length, people: totalPeople })}</p>
            </div>

            {/* Primary KPI */}
            {roi.cost > 0 && roi.pct > 0 && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-6 text-center slide-up" style={{ animationDelay: "80ms" }}>
                <p className="text-5xl font-black tabular-nums text-emerald-600 tracking-tight">{roi.pct.toFixed(0)}%</p>
                <p className="text-sm font-semibold text-emerald-700/70 mt-1">{t("express.roi_return")}</p>
              </div>
            )}

            {/* Secondary KPIs */}
            <div className="grid grid-cols-3 gap-3 slide-up" style={{ animationDelay: "160ms" }}>
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

            {/* Hypotheses editor */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setHypothesesOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">{t("express.hypothesis_title")}</span>
                    <p className="text-[11px] text-muted-foreground">{t("express.hypothesis_sub")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{selectedModules.length}</span>
                  {hypothesesOpen
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {hypothesesOpen && (
                <div className="border-t border-border">
                  <div className="px-5 py-3 bg-muted/15 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{roiConfig.headcounts.employee} empleados · {roiConfig.hourly_costs.employee} €/h</span>
                    <span>{roiConfig.headcounts.hr} HR · {roiConfig.hourly_costs.hr} €/h</span>
                    <span>{roiConfig.headcounts.manager} mgrs · {roiConfig.hourly_costs.manager} €/h</span>
                    <button onClick={() => setStep(2)} className="text-foreground font-semibold hover:underline underline-offset-2 ml-auto">
                      {t("express.edit")}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/8">
                          <th className="text-left px-5 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("express.hyp_module", "Módulo")}</th>
                          <th className="text-center px-2 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[72px]">{t("express.hyp_type", "Tipo")}</th>
                          <th className="text-center px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#3B82F6" }}>{t("express.emp_hm")}</th>
                          <th className="text-center px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>{t("express.hr_hm")}</th>
                          <th className="text-center px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#F59E0B" }}>{t("express.mgr_hm")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedModules.map((modId, idx) => {
                          const cat = MODULE_CATALOG.find(m => m.id === modId);
                          const defaults = getHoursForModule(modId);
                          const overrides = roiConfig.hours_overrides?.[modId];
                          const toolOvr = roiConfig.tool_overrides?.[modId];
                          const isTool = !!toolOvr;
                          return (
                            <tr key={modId} className={`hover:bg-muted/20 transition-colors ${idx > 0 ? "border-t border-border/50" : ""}`}>
                              <td className="px-5 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#94A3B8" }} />
                                  <span className="text-foreground text-sm font-medium">{cat?.label ?? moduleLabel(modId)}</span>
                                </div>
                              </td>
                              <td className="px-1 py-2 text-center">
                                <div className="inline-flex rounded-lg border border-border overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isTool) {
                                        setRoiConfig(prev => {
                                          const to = { ...(prev.tool_overrides ?? {}) };
                                          delete to[modId];
                                          return { ...prev, tool_overrides: Object.keys(to).length ? to : undefined };
                                        });
                                      }
                                    }}
                                    className={`px-2 py-1 text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                                      !isTool ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title={t("express.type_hours", "Horas")}
                                  >
                                    <Clock className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isTool) {
                                        setRoiConfig(prev => ({
                                          ...prev,
                                          tool_overrides: {
                                            ...(prev.tool_overrides ?? {}),
                                            [modId]: { tool_name: "", annual_cost: 0 },
                                          },
                                        }));
                                      }
                                    }}
                                    className={`px-2 py-1 text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                                      isTool ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title={t("express.type_tool", "Herramienta")}
                                  >
                                    <Wrench className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                              {isTool ? (
                                <td colSpan={3} className="px-2 py-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder={t("express.tool_name", "Nombre herramienta")}
                                      className="flex-1 h-8 px-2 text-sm rounded-lg border border-violet-300 bg-violet-50/40 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
                                      value={toolOvr.tool_name}
                                      onChange={e => {
                                        const name = e.target.value;
                                        setRoiConfig(prev => ({
                                          ...prev,
                                          tool_overrides: {
                                            ...(prev.tool_overrides ?? {}),
                                            [modId]: { ...prev.tool_overrides![modId], tool_name: name },
                                          },
                                        }));
                                      }}
                                    />
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min={0}
                                        placeholder={t("express.eur_yr_placeholder")}
                                        className="w-[90px] h-8 px-2 text-sm text-center tabular-nums rounded-lg border border-violet-300 bg-violet-50/40 font-bold text-violet-700 focus:outline-none focus:ring-2 focus:ring-ring/40"
                                        value={toolOvr.annual_cost || ""}
                                        onChange={e => {
                                          const cost = Math.max(0, parseFloat(e.target.value) || 0);
                                          setRoiConfig(prev => ({
                                            ...prev,
                                            tool_overrides: {
                                              ...(prev.tool_overrides ?? {}),
                                              [modId]: { ...prev.tool_overrides![modId], annual_cost: cost },
                                            },
                                          }));
                                        }}
                                      />
                                      <span className="text-[10px] text-muted-foreground">€/{t("express.year", "año")}</span>
                                    </div>
                                  </div>
                                </td>
                              ) : (
                                (["employee", "hr", "manager"] as Stakeholder[]).map(sk => {
                                  const def = defaults[sk];
                                  const val = overrides?.[sk] ?? def;
                                  const hasOverride = overrides?.[sk] !== undefined && overrides[sk] !== def;
                                  return (
                                    <td key={sk} className="px-2 py-2 text-center">
                                      {def === 0 && !hasOverride ? (
                                        <span className="text-muted-foreground/25 text-xs">—</span>
                                      ) : (
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          className={`w-[60px] h-8 text-center text-sm tabular-nums rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all ${
                                            hasOverride ? "border-amber-400 bg-amber-50/60 font-bold text-amber-700" : "border-transparent hover:border-border"
                                          }`}
                                          value={val}
                                          onChange={e => {
                                            const v = Math.max(0, parseFloat(e.target.value) || 0);
                                            setRoiConfig(prev => {
                                              const ho = { ...(prev.hours_overrides ?? {}) };
                                              ho[modId] = { ...(ho[modId] ?? {}), [sk]: v };
                                              if (v === def) delete ho[modId]![sk];
                                              if (Object.keys(ho[modId]!).length === 0) delete ho[modId];
                                              return { ...prev, hours_overrides: ho };
                                            });
                                          }}
                                        />
                                      )}
                                    </td>
                                  );
                                })
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* PDF downloads */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { type: "summary" as const, title: t("express.pdf_summary"), desc: t("express.pdf_summary_desc") },
                { type: "detail" as const, title: t("express.pdf_detail"), desc: t("express.pdf_detail_desc") },
              ]).map(pdf => (
                <button key={pdf.type} onClick={() => downloadPdf(pdf.type)} disabled={!!dlPdf} className="rounded-2xl border border-border bg-card p-5 text-left hover:border-foreground/20 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 group active:scale-[0.98]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-background" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{pdf.title}</p>
                      <p className="text-[11px] text-muted-foreground">{pdf.desc}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    {dlPdf === pdf.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {t("express.download_pdf")}
                  </span>
                </button>
              ))}
            </div>

            {/* Save + actions */}
            <div className="flex flex-col items-center gap-4 pt-4 pb-4">
              <Button
                onClick={async () => {
                  setSaving(true);
                  await saveToHistory();
                  setSaving(false);
                  toast.success(savedSessionId.current ? t("express.roi_updated") : t("express.roi_saved"));
                  navigate("/");
                }}
                disabled={saving}
                className="w-full max-w-sm h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-sm font-bold active:scale-[0.98] transition-all shadow-lg shadow-foreground/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {t("express.save_and_back")}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!savedSessionId.current) {
                    setSaving(true);
                    await saveToHistory();
                    setSaving(false);
                  }
                  const url = `${window.location.origin}${import.meta.env.BASE_URL}express?session=${savedSessionId.current}`;
                  await navigator.clipboard.writeText(url);
                  toast.success(t("express.link_copied"));
                }}
                disabled={saving}
                className="w-full max-w-sm h-10 rounded-xl text-sm font-medium"
              >
                <Share2 className="h-4 w-4 mr-2" />
                {t("express.share_link")}
              </Button>
              <button
                onClick={() => { setStep(0); setMsgs([]); setHubspotUrl(""); setSelectedModules([]); setModuleSuggestions([]); setSelectedBundle(null); setCompanyName(""); setDealName(""); setHypothesesOpen(false); savedSessionId.current = null; loadedSessionProspect.current = null; setSkipAnalysis(false); setRoiConfig({ headcounts: { employee: 50, hr: 2, manager: 5 }, hourly_costs: { employee: 20, hr: 30, manager: 25 } }); setSearchParams({}); }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("express.new_analysis")}
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
