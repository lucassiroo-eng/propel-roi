import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, Activity, FileCheck, Globe, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

const COLORS = [
  "hsl(348, 100%, 60%)", // radical red
  "hsl(240, 25%, 19%)",  // midnight
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
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadPainsAndModules(), loadHubspot()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    const { data: sessions } = await supabase
      .from("roi_sessions")
      .select("pae_id, status, created_at, updated_at");

    if (!sessions) return;

    const userIds = [...new Set(sessions.map((s) => s.pae_id))];

    // Resolve emails via the DB function
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

  const completionRate = totalSessions > 0
    ? Math.round((totalCompleted / totalSessions) * 100)
    : 0;

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Users className="h-4 w-4" />} label="Active users" value={users.length} />
        <KpiCard icon={<Activity className="h-4 w-4" />} label="Analyses started" value={totalSessions} />
        <KpiCard
          icon={<FileCheck className="h-4 w-4" />}
          label="Completed"
          value={totalCompleted}
          sub={`${completionRate}% rate`}
        />
        <KpiCard
          icon={<Globe className="h-4 w-4" />}
          label="HubSpot imports"
          value={hubspot.reduce((s, h) => s + h.calls, 0)}
        />
      </div>

      {/* Users table */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4">
          <CardTitle className="text-sm font-medium">User Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">User</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2.5 w-20">Started</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2.5 w-24">Completed</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-2.5 w-28 hidden sm:table-cell">Last active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.pae_id}
                    className={cn(
                      "border-b border-border/30 transition-colors hover:bg-muted/30",
                      i % 2 === 0 && "bg-muted/10"
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground truncate max-w-[200px]">
                      {u.email}
                    </td>
                    <td className="text-center px-3 py-2.5 text-muted-foreground">{u.total}</td>
                    <td className="text-center px-3 py-2.5">
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[20px] rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        u.completed > 0
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {u.completed}
                      </span>
                    </td>
                    <td className="text-right px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {u.lastActive ? formatRelative(u.lastActive) : "—"}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-muted-foreground">No users yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* HubSpot imports over time */}
      {hubspot.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-sm font-medium">HubSpot Imports Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hubspot}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout for pains + modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top pains */}
        <Card className="border-border/50">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Top Pains</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-1.5">
              {pains.map((p, i) => {
                const maxCount = pains[0]?.count || 1;
                const pct = Math.round((p.count / maxCount) * 100);
                return (
                  <div key={p.pain_id} className="group">
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-foreground truncate max-w-[70%]" title={p.label}>
                        {p.pain_id}
                      </span>
                      <span className="text-muted-foreground font-medium">{p.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
              {pains.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modules / Bundles */}
        <Card className="border-border/50">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Bundles & Modules</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-1.5">
              {modules.length > 0 ? modules.map((m, i) => {
                const maxCount = modules[0]?.count || 1;
                const pct = Math.round((m.count / maxCount) * 100);
                return (
                  <div key={m.module}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-foreground truncate max-w-[70%]">{m.module}</span>
                      <span className="text-muted-foreground font-medium">{m.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="py-3.5 px-4 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-[11px] font-medium">{label}</span>
        </div>
        <span className="text-2xl font-bold text-foreground tracking-tight">{value}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
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
