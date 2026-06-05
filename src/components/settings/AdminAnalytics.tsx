import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Users, Activity, FileCheck, Globe, TrendingUp, Target, Send, CheckSquare, Square, RefreshCw, GitBranch, Plus, ChevronDown, ChevronRight, Trophy, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const HUBSPOT_STAGE_LABELS: Record<string, string> = {
  // Sales Pipeline
  "closedwon": "Closed Won",
  "closedlost": "Closed Lost",
  "51389338": "Pending Finance",
  "15738025": "Contracting",
  "qualifiedtobuy": "Pricing & Packaging",
  "appointmentscheduled": "Product Alignment",
  "49b7ad85-a23e-426c-9b3b-d44607d1c3af": "Discovery",
  "96e820da-7bc1-4ea3-81a2-bc533ed26934": "Meeting Booked",
  // Partners Distribution
  "35118880": "Closed Won",
  "104503991": "Pending Finance",
  "35118879": "Contract Sent",
  "35118878": "Economical Alignment",
  "35070731": "Project Alignment",
  "35070730": "Demo Booked",
  "35070729": "New Deal",
  "1008401982": "On Hold",
  "35119283": "Closed Lost",
  "5366023400": "MEDDPICC Validation Started",
  "1003800949": "Closed Won",
  "12669405": "Closed Won",
  // SDR pipelines
  "25761537": "Opportunity Lost",
  "1002830341": "Opportunity Lost",
  "1232383511": "Opportunity Lost",
};

function getStageName(stage: string): string {
  return HUBSPOT_STAGE_LABELS[stage] ?? stage;
}

interface UserStat {
  pae_id: string;
  email: string;
  total: number;
  completed: number;
  lastActive: string;
}

interface PainCount {
  pain_id: string;
  label: string;
  count: number;
}

interface ModuleCount {
  module: string;
  count: number;
}

interface HubspotCall {
  date: string;
  calls: number;
}

interface DealTrack {
  deal_id: string;
  company_name: string;
  opened_at: string;
  has_roi: boolean;
}

interface DealFunnel {
  date: string;
  opened: number;
  roi_generated: number;
}

interface PipelineItem {
  id: string;
  company_name: string;
  flow_type: 'express' | 'co_created' | null;
  status: string;
  roi_pct: number;
  roi_eur: number;
  hubspot_deal_url: string | null;
  updated_at: string;
}

const COLORS = [
  "hsl(348, 100%, 60%)",
  "hsl(240, 25%, 19%)",
  "hsl(239, 84%, 67%)",
  "hsl(38, 92%, 50%)",
  "hsl(160, 84%, 39%)",
  "hsl(0, 84%, 60%)",
  "hsl(258, 90%, 66%)",
  "hsl(330, 81%, 60%)",
  "hsl(173, 80%, 40%)",
  "hsl(25, 95%, 53%)",
];

export default function AdminAnalytics() {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [pains, setPains] = useState<PainCount[]>([]);
  const [modules, setModules] = useState<ModuleCount[]>([]);
  const [hubspot, setHubspot] = useState<HubspotCall[]>([]);
  const [deals, setDeals] = useState<DealTrack[]>([]);
  const [dealFunnel, setDealFunnel] = useState<DealFunnel[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pipelineGenerated, setPipelineGenerated] = useState<PipelineItem[]>([]);
  const [pipelineSent, setPipelineSent] = useState<PipelineItem[]>([]);
  const [selectedForSend, setSelectedForSend] = useState<Set<string>>(new Set());
  const [movingToSent, setMovingToSent] = useState(false);
  const [dealStages, setDealStages] = useState<Record<string, { stage: string; closeDate: string | null; checking: boolean }>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSelected, setModalSelected] = useState<Set<string>>(new Set());
  const [tableOpen, setTableOpen] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealCompany, setDealCompany] = useState("");
  const [dealUrl, setDealUrl] = useState("");
  const [addingDeal, setAddingDeal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadPainsAndModules(), loadHubspot(), loadDeals(), loadPipeline()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loading || !pipelineSent.length) return;
    const withUrl = pipelineSent.filter((i) => i.hubspot_deal_url && !dealStages[i.id]);
    if (withUrl.length > 0) {
      Promise.all(withUrl.map((i) => checkDealStage(i.id, i.hubspot_deal_url!)));
    }
  }, [loading, pipelineSent]);

  async function loadPipeline() {
    const { data: sessions } = await supabase
      .from("roi_sessions")
      .select("id, status, flow_type, prospect_id, pae_id, roi_pct, roi_eur, updated_at, created_at")
      .or("status.in.(generated,co_created,sent),roi_pct.gt.0");

    if (!sessions || sessions.length === 0) return;

    const prospectIds = [...new Set(sessions.map((s) => s.prospect_id).filter(Boolean))];
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, company_name, hubspot_deal_url")
      .in("id", prospectIds);

    const prospectMap = new Map<string, { company_name: string; hubspot_deal_url: string | null }>(
      (prospects ?? []).map((p) => [p.id, { company_name: p.company_name, hubspot_deal_url: p.hubspot_deal_url ?? null }])
    );

    const items: PipelineItem[] = sessions.map((s) => ({
      id: s.id,
      company_name: prospectMap.get(s.prospect_id)?.company_name ?? "—",
      flow_type: (s.flow_type as 'express' | 'co_created' | null) ?? null,
      status: s.status ?? "",
      roi_pct: s.roi_pct ?? 0,
      roi_eur: s.roi_eur ?? 0,
      hubspot_deal_url: prospectMap.get(s.prospect_id)?.hubspot_deal_url ?? null,
      updated_at: s.updated_at ?? s.created_at ?? "",
    }));

    setPipelineGenerated(
      items
        .filter((i) => i.status !== "sent" && (["generated", "co_created"].includes(i.status) || i.roi_pct > 0))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    );
    setPipelineSent(
      items
        .filter((i) => i.status === "sent")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    );
  }

  async function moveToSent() {
    if (!selectedForSend.size) return;
    setMovingToSent(true);
    const ids = Array.from(selectedForSend);
    await supabase.from("roi_sessions").update({ status: "sent" }).in("id", ids);
    setSelectedForSend(new Set());
    await loadPipeline();
    setMovingToSent(false);
  }

  async function checkDealStage(sessionId: string, dealUrl: string) {
    setDealStages((prev) => ({ ...prev, [sessionId]: { ...prev[sessionId], checking: true, stage: "", closeDate: null } }));
    try {
      const { data } = await supabase.functions.invoke("hubspot-deal", { body: { deal_url: dealUrl } });
      setDealStages((prev) => ({
        ...prev,
        [sessionId]: { stage: data?.deal_stage ?? "unknown", closeDate: data?.close_date ?? null, checking: false },
      }));
    } catch {
      setDealStages((prev) => ({ ...prev, [sessionId]: { stage: "error", closeDate: null, checking: false } }));
    }
  }

  async function syncAllStages() {
    if (syncingAll) return;
    const withUrl = pipelineSent.filter((i) => i.hubspot_deal_url);
    if (!withUrl.length) {
      alert("Ningún ROI enviado tiene URL de HubSpot asociada. Importa los deals desde HubSpot para activar el sync.");
      return;
    }
    setSyncingAll(true);
    await Promise.all(withUrl.map((i) => checkDealStage(i.id, i.hubspot_deal_url!)));
    setSyncingAll(false);
  }

  async function addManualDeal() {
    const name = dealCompany.trim();
    const url = dealUrl.trim();
    if (!name) return;
    setAddingDeal(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const paeId = user.user?.id;
      const { data: prospect } = await supabase
        .from("prospects")
        .insert({ pae_id: paeId, company_name: name, ...(url ? { hubspot_deal_url: url } : {}), country: "ES", seats: 0 })
        .select("id")
        .single();
      if (prospect) {
        await supabase.from("roi_sessions").insert({ prospect_id: prospect.id, pae_id: paeId, status: "sent", flow_type: "express" });
      }
      setShowDealModal(false);
      setDealCompany("");
      setDealUrl("");
      await loadPipeline();
    } finally {
      setAddingDeal(false);
    }
  }

  async function addToSent() {
    if (!modalSelected.size) return;
    setMovingToSent(true);
    await supabase.from("roi_sessions").update({ status: "sent" }).in("id", Array.from(modalSelected));
    setModalSelected(new Set());
    setShowAddModal(false);
    await loadPipeline();
    setMovingToSent(false);
  }

  async function loadUsers() {
    const { data: sessions } = await supabase
      .from("roi_sessions")
      .select("pae_id, status, created_at, updated_at");

    if (!sessions) return;

    const userIds = [...new Set(sessions.map((s) => s.pae_id))];

    const { data: emailRows } = await supabase.rpc("get_user_emails", {
      _user_ids: userIds,
    });
    const emailMap = new Map<string, string>(
      (emailRows || []).map((r: any) => [r.user_id, r.email])
    );

    const map = new Map<string, UserStat>();
    for (const s of sessions) {
      if (!map.has(s.pae_id)) {
        map.set(s.pae_id, {
          pae_id: s.pae_id,
          email: emailMap.get(s.pae_id) || s.pae_id.slice(0, 8) + "...",
          total: 0,
          completed: 0,
          lastActive: s.updated_at || s.created_at || "",
        });
      }
      const u = map.get(s.pae_id)!;
      u.total++;
      if (s.status === "generated") u.completed++;
      const ts = s.updated_at || s.created_at || "";
      if (ts > u.lastActive) u.lastActive = ts;
    }

    setUsers(Array.from(map.values()).sort((a, b) => b.total - a.total));
    setTotalSessions(sessions.length);
    setTotalCompleted(sessions.filter((s) => s.status === "generated").length);
  }

  async function loadPainsAndModules() {
    const { data: sessions } = await supabase
      .from("roi_sessions")
      .select("selected_pains, selected_offering");

    if (!sessions) return;

    const painMap = new Map<string, number>();
    for (const s of sessions) {
      const sp = s.selected_pains as string[] | null;
      if (sp) {
        for (const p of sp) {
          painMap.set(p, (painMap.get(p) || 0) + 1);
        }
      }
    }

    const { data: painLib } = await supabase
      .from("pain_library")
      .select("pain_id, pain_statement")
      .in("pain_id", Array.from(painMap.keys()));

    const painLabels = new Map((painLib || []).map((p) => [p.pain_id, p.pain_statement]));
    const painArr: PainCount[] = Array.from(painMap.entries())
      .map(([id, count]) => ({
        pain_id: id,
        label: painLabels.get(id) || id,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setPains(painArr);

    const modMap = new Map<string, number>();
    for (const s of sessions) {
      const off = s.selected_offering as any;
      if (off?.bundle_name) {
        modMap.set(off.bundle_name, (modMap.get(off.bundle_name) || 0) + 1);
      }
      if (off?.addon_modules && Array.isArray(off.addon_modules)) {
        for (const m of off.addon_modules) {
          const name = typeof m === "string" ? m : m?.module || m?.name;
          if (name) modMap.set(name, (modMap.get(name) || 0) + 1);
        }
      }
    }
    setModules(
      Array.from(modMap.entries())
        .map(([module, count]) => ({ module, count }))
        .sort((a, b) => b.count - a.count)
    );
  }

  async function loadHubspot() {
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, hubspot_deal_url, created_at")
      .not("hubspot_deal_url", "is", null);

    if (!prospects) return;

    const dateMap = new Map<string, number>();
    for (const p of prospects) {
      const d = p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "unknown";
      dateMap.set(d, (dateMap.get(d) || 0) + 1);
    }

    setHubspot(
      Array.from(dateMap.entries())
        .map(([date, calls]) => ({ date, calls }))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  }

  async function loadDeals() {
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, company_name, hubspot_deal_url, created_at");

    if (!prospects) return;

    const { data: sessions } = await supabase
      .from("roi_sessions")
      .select("prospect_id, status");

    const sessionMap = new Map<string, boolean>();
    for (const s of (sessions ?? [])) {
      const has = sessionMap.get(s.prospect_id) ?? false;
      if (s.status === "generated") sessionMap.set(s.prospect_id, true);
      else if (!has) sessionMap.set(s.prospect_id, false);
    }

    const dealMap = new Map<string, DealTrack>();
    const funnelMap = new Map<string, { opened: number; roi_generated: number }>();

    for (const p of prospects) {
      const url = p.hubspot_deal_url as string | null;
      if (!url) continue;
      const m = url.match(/\/deal\/(\d+)/) ?? url.match(/\/record\/0-3\/(\d+)/);
      const dealId = m ? m[1] : null;
      if (!dealId || dealMap.has(dealId)) continue;

      const hasRoi = sessionMap.get(p.id) ?? false;
      dealMap.set(dealId, {
        deal_id: dealId,
        company_name: (p.company_name as string) ?? dealId,
        opened_at: (p.created_at as string) ?? "",
        has_roi: hasRoi,
      });

      const date = p.created_at ? new Date(p.created_at as string).toISOString().slice(0, 10) : "unknown";
      if (!funnelMap.has(date)) funnelMap.set(date, { opened: 0, roi_generated: 0 });
      const entry = funnelMap.get(date)!;
      entry.opened++;
      if (hasRoi) entry.roi_generated++;
    }

    setDeals(
      Array.from(dealMap.values()).sort((a, b) => b.opened_at.localeCompare(a.opened_at))
    );
    setDealFunnel(
      Array.from(funnelMap.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  }

  // Deduplicate generated ROIs by company — best ROI per company for the modal
  const pipelineGeneratedByCompany = useMemo(() => {
    const sentNames = new Set(pipelineSent.map((i) => i.company_name.trim().toLowerCase()));
    const map = new Map<string, PipelineItem>();
    for (const item of pipelineGenerated) {
      const key = item.company_name.trim().toLowerCase();
      if (sentNames.has(key)) continue;
      const existing = map.get(key);
      if (!existing || item.roi_pct > existing.roi_pct) map.set(key, item);
    }
    return Array.from(map.values()).sort((a, b) => b.roi_pct - a.roi_pct);
  }, [pipelineGenerated, pipelineSent]);

  const WON_STAGES = new Set(["closedwon", "35118880", "1003800949", "12669405"]);
  const wonCount = pipelineSent.filter((i) => {
    const s = dealStages[i.id]?.stage ?? "";
    return WON_STAGES.has(s);
  }).length;


  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading analytics...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Platform Analytics</h2>
      </div>

      {/* ROI Pipeline */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">ROI Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={syncAllStages}
                disabled={syncingAll || pipelineSent.length === 0}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {syncingAll ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Sync HubSpot
              </button>
              <button
                onClick={() => { setModalSelected(new Set()); setShowAddModal(true); }}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3 w-3" /> Añadir ROIs
              </button>
              <button
                onClick={() => setShowDealModal(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-3 w-3" /> Añadir deal
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-4">
          {/* Collapsible sent table */}
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <button
              onClick={() => setTableOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {tableOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-[11px] font-semibold text-foreground">ROIs Enviados</span>
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold min-w-[18px]">
                  {pipelineSent.length}
                </span>
              </div>
              <Send className="h-3 w-3 text-muted-foreground" />
            </button>

            {tableOpen && (
              pipelineSent.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sin enviados — usa "Añadir ROIs" para marcar los enviados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/10">
                        <th className="text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Empresa</th>
                        <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24">Tipo</th>
                        <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16">ROI</th>
                        <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-32">Stage HubSpot</th>
                        <th className="text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-24">Fecha</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {pipelineSent.map((item) => {
                        const ds = dealStages[item.id];
                        const rawStage = ds?.stage ?? "";
                        const isWon = WON_STAGES.has(rawStage) || rawStage === "closedwon";
                        const isLost = rawStage === "closedlost" || rawStage === "35119283" || rawStage === "1002830341" || rawStage === "25761537";
                        return (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-foreground max-w-[200px] truncate">{item.company_name}</td>
                            <td className="px-3 py-2.5 text-center">
                              {item.flow_type === "co_created" ? (
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: "oklch(94% 0.03 250)", color: "oklch(38% 0.12 250)" }}>Co-creado</span>
                              ) : item.flow_type === "express" ? (
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: "oklch(95% 0.06 65)", color: "oklch(42% 0.14 65)" }}>Express</span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold tabular-nums" style={{ color: item.roi_pct > 0 ? "oklch(48% 0.16 145)" : undefined }}>
                              {item.roi_pct > 0 ? `+${item.roi_pct}%` : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {ds?.checking ? (
                                <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground mx-auto" />
                              ) : ds?.stage ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={
                                  isWon ? { backgroundColor: "oklch(94% 0.07 155)", color: "oklch(35% 0.14 155)" }
                                  : isLost ? { backgroundColor: "oklch(95% 0.04 25)", color: "oklch(38% 0.16 25)" }
                                  : { backgroundColor: "oklch(93% 0.01 250)", color: "oklch(45% 0.01 250)" }
                                }>
                                  {isWon ? "Closed Won ✓" : isLost ? "Closed Lost" : getStageName(ds.stage)}
                                </span>
                              ) : item.hubspot_deal_url ? (
                                <button onClick={() => checkDealStage(item.id, item.hubspot_deal_url!)} className="text-[10px] font-medium text-primary hover:underline">Check</button>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{item.updated_at ? formatRelative(item.updated_at) : "—"}</td>
                            <td className="pr-2 py-2.5">
                              <button
                                onClick={async () => {
                                  await supabase.from("roi_sessions").update({ status: "generated" }).eq("id", item.id);
                                  await loadPipeline();
                                }}
                                className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                                title="Quitar de enviados"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Funnel: Enviados → Ganados */}
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-border/60 px-5 py-4 text-center bg-muted/10">
              <p className="text-2xl font-extrabold tabular-nums text-foreground">{pipelineSent.length}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Send className="h-3 w-3" /> Enviados
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground/40 shrink-0" />
            <div className="flex-1 rounded-xl border px-5 py-4 text-center" style={{ borderColor: "oklch(85% 0.08 155)", backgroundColor: "oklch(97% 0.03 155)" }}>
              <p className="text-2xl font-extrabold tabular-nums" style={{ color: "oklch(38% 0.14 155)" }}>{wonCount}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider mt-1 flex items-center justify-center gap-1" style={{ color: "oklch(48% 0.12 155)" }}>
                <Trophy className="h-3 w-3" /> Close Won
              </p>
              {pipelineSent.length > 0 && (
                <p className="text-[10px] mt-0.5" style={{ color: "oklch(52% 0.10 155)" }}>
                  {Math.round((wonCount / pipelineSent.length) * 100)}% conversión
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add ROIs modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Añadir ROIs enviados</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-72 overflow-y-auto -mx-1 px-1">
            {pipelineGeneratedByCompany.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay ROIs pendientes de envío</p>
            ) : (
              pipelineGeneratedByCompany.map((item) => {
                const checked = modalSelected.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => setModalSelected(prev => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                      return next;
                    })}
                    className={cn("w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/40", checked && "bg-primary/5")}
                  >
                    {checked
                      ? <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                      : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">{item.company_name}</span>
                      <span className="text-[10px] text-muted-foreground">{item.updated_at ? new Date(item.updated_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                    </div>
                    {item.flow_type === "co_created" ? (
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "oklch(94% 0.03 250)", color: "oklch(38% 0.12 250)" }}>Co-creado</span>
                    ) : item.flow_type === "express" ? (
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "oklch(95% 0.06 65)", color: "oklch(42% 0.14 65)" }}>Express</span>
                    ) : null}
                    {item.roi_pct > 0 && (
                      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: "oklch(48% 0.16 145)" }}>+{item.roi_pct}%</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">{modalSelected.size} seleccionados</span>
            <div className="flex gap-2">
              <button onClick={() => setShowAddModal(false)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={addToSent}
                disabled={!modalSelected.size || movingToSent}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {movingToSent ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Aceptar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDealModal} onOpenChange={setShowDealModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Añadir deal manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Empresa</label>
              <input
                type="text"
                placeholder="Nombre de la empresa"
                value={dealCompany}
                onChange={e => setDealCompany(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">URL de HubSpot (opcional)</label>
              <input
                type="url"
                placeholder="https://app-eu1.hubspot.com/contacts/..."
                value={dealUrl}
                onChange={e => setDealUrl(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowDealModal(false)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={addManualDeal}
              disabled={!dealCompany.trim() || addingDeal}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {addingDeal ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Añadir
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}


function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
