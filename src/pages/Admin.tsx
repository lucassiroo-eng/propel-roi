import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { AdminTableEditor } from "@/components/admin/AdminTableEditor";
import { AuditHistory } from "@/components/admin/AuditHistory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldCheck, History, BarChart3, TrendingUp, FileText, Users, Percent } from "lucide-react";
import type { TableEditorConfig } from "@/hooks/useAdminTable";

const TABLE_CONFIGS: Record<string, TableEditorConfig> = {
  pain_library: {
    table: "pain_library",
    primaryKey: "pain_id",
    columns: [
      { key: "pain_id", label: "Pain ID", type: "text" },
      { key: "persona", label: "Persona", type: "text", required: true },
      { key: "pain_statement", label: "Statement", type: "textarea", required: true },
      { key: "primary_module", label: "Primary Module", type: "text" },
      { key: "benefit_driver", label: "Benefit Driver", type: "text" },
      { key: "benefit_type", label: "Benefit Type", type: "text" },
      { key: "default_kpi", label: "Default KPI", type: "text" },
      { key: "default_value_es", label: "Value ES", type: "number" },
      { key: "default_value_fr", label: "Value FR", type: "number" },
      { key: "display_order", label: "Order", type: "number" },
      { key: "is_archived", label: "Archived", type: "boolean" },
    ],
    defaultRow: { persona: "HR Director", pain_statement: "", is_archived: false, display_order: 0 },
  },
  pain_module_map: {
    table: "pain_module_map",
    primaryKey: "id",
    columns: [
      { key: "id", label: "ID", type: "number", editable: false },
      { key: "pain_id", label: "Pain ID", type: "text" },
      { key: "module", label: "Module", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
    defaultRow: {},
  },
  modules: {
    table: "modules",
    primaryKey: "module",
    columns: [
      { key: "module", label: "Module", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "features", label: "Features", type: "textarea" },
      { key: "notes", label: "Notes", type: "text" },
      { key: "available_es", label: "ES", type: "boolean" },
      { key: "available_fr", label: "FR", type: "boolean" },
    ],
    defaultRow: { available_es: true, available_fr: true },
  },
  pricing: {
    table: "pricing",
    primaryKey: "id",
    filterColumn: "country",
    columns: [
      { key: "id", label: "ID", type: "number", editable: false },
      { key: "country", label: "Country", type: "text" },
      { key: "sku_type", label: "SKU Type", type: "text", required: true },
      { key: "sku_name", label: "SKU Name", type: "text", required: true },
      { key: "price_business_monthly", label: "Biz Monthly", type: "text" },
      { key: "price_business_yearly", label: "Biz Yearly", type: "text" },
      { key: "price_enterprise_monthly", label: "Ent Monthly", type: "text" },
      { key: "price_enterprise_yearly", label: "Ent Yearly", type: "text" },
      { key: "floor", label: "Floor", type: "text" },
      { key: "architecture", label: "Architecture", type: "text" },
      { key: "credits_or_seats", label: "Credits/Seats", type: "text" },
      { key: "includes_modules", label: "Includes", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
    defaultRow: { sku_type: "module", sku_name: "" },
  },
  bundles: {
    table: "bundles",
    primaryKey: "id",
    filterColumn: "country",
    columns: [
      { key: "id", label: "ID", type: "number", editable: false },
      { key: "country", label: "Country", type: "text" },
      { key: "bundle_name", label: "Bundle Name", type: "text", required: true },
      { key: "tier", label: "Tier", type: "text" },
      { key: "floor_seats", label: "Floor Seats", type: "number" },
      { key: "included_modules", label: "Included Modules", type: "textarea" },
      { key: "business_pepm_monthly", label: "Biz PEPM Mo", type: "number" },
      { key: "business_pepm_yearly", label: "Biz PEPM Yr", type: "number" },
      { key: "enterprise_pepm_monthly", label: "Ent PEPM Mo", type: "number" },
      { key: "enterprise_pepm_yearly", label: "Ent PEPM Yr", type: "number" },
    ],
    defaultRow: { bundle_name: "", country: "ES" },
  },
  bundle_recommendation_rules: {
    table: "bundle_recommendation_rules",
    primaryKey: "rule_id",
    columns: [
      { key: "rule_id", label: "Rule ID", type: "text" },
      { key: "recommended_bundle", label: "Bundle", type: "text", required: true },
      { key: "triggering_pains", label: "Triggering Pains", type: "textarea", required: true },
      { key: "min_pains", label: "Min Pains", type: "number" },
      { key: "rationale", label: "Rationale", type: "textarea" },
    ],
    defaultRow: { recommended_bundle: "", triggering_pains: "" },
  },
  country_defaults: {
    table: "country_defaults",
    primaryKey: "country",
    columns: [
      { key: "country", label: "Country", type: "text" },
      { key: "currency", label: "Currency", type: "text", required: true },
      { key: "avg_loaded_hourly_cost_eur", label: "Avg Hourly Cost €", type: "number", required: true, min: 10, max: 100 },
      { key: "source_note", label: "Source Note", type: "text" },
    ],
    defaultRow: { currency: "EUR", avg_loaded_hourly_cost_eur: 30 },
  },
};

const TABLE_TABS = [
  { key: "pain_library", label: "Pains" },
  { key: "pain_module_map", label: "Pain→Module" },
  { key: "modules", label: "Modules" },
  { key: "pricing", label: "Pricing" },
  { key: "bundles", label: "Bundles" },
  { key: "bundle_recommendation_rules", label: "Rules" },
  { key: "country_defaults", label: "Country" },
];

const COUNTRY_FILTERS = [
  { value: "ES", label: "🇪🇸 ES" },
  { value: "FR", label: "🇫🇷 FR" },
];

const ADMIN_EMAIL = "lucas.siroo@factorial.co";

function MetricCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "18" }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function MetricsDashboard() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin_metrics_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roi_sessions")
        .select("id, status, roi_eur, roi_pct, payback_months, total_annual_benefit_eur, factorial_annual_cost_eur, updated_at, prospect_id, prospects(company_name, country, seats)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const metrics = useMemo(() => {
    if (!sessions?.length) return null;
    const total = sessions.length;
    const generated = sessions.filter(s => s.status === "generated").length;
    const withRoi = sessions.filter(s => s.roi_pct != null && s.roi_pct > 0);
    const avgRoi = withRoi.length > 0 ? Math.round(withRoi.reduce((a, s) => a + s.roi_pct, 0) / withRoi.length) : 0;
    const totalSavings = sessions.reduce((a, s) => a + (s.total_annual_benefit_eur ?? 0), 0);
    const avgSavings = withRoi.length > 0 ? Math.round(totalSavings / withRoi.length) : 0;
    const totalCost = sessions.reduce((a, s) => a + (s.factorial_annual_cost_eur ?? 0), 0);
    const withPayback = sessions.filter(s => s.payback_months != null && s.payback_months > 0);
    const avgPayback = withPayback.length > 0 ? (withPayback.reduce((a, s) => a + s.payback_months, 0) / withPayback.length).toFixed(1) : "—";

    const byCountry: Record<string, number> = {};
    for (const s of sessions) {
      const c = s.prospects?.country ?? "?";
      byCountry[c] = (byCountry[c] ?? 0) + 1;
    }

    const recent = sessions.slice(0, 10);

    return { total, generated, avgRoi, totalSavings, avgSavings, totalCost, avgPayback, byCountry, recent };
  }, [sessions]);

  const fmtEur = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 0 });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return <p className="text-center text-muted-foreground py-8">No hay datos de sesiones</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total deals" value={String(metrics.total)} icon={FileText} color="#3B82F6" />
        <MetricCard label="ROI generado" value={String(metrics.generated)} sub={`${metrics.total > 0 ? Math.round((metrics.generated / metrics.total) * 100) : 0}% del total`} icon={TrendingUp} color="#10B981" />
        <MetricCard label="ROI medio" value={`${metrics.avgRoi}%`} icon={Percent} color="#F59E0B" />
        <MetricCard label="Payback medio" value={`${metrics.avgPayback}m`} icon={BarChart3} color="#8B5CF6" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MetricCard label="Ahorro total" value={`${fmtEur(metrics.totalSavings)} €`} icon={TrendingUp} color="#10B981" />
        <MetricCard label="Ahorro medio" value={`${fmtEur(metrics.avgSavings)} €`} sub="por deal con ROI" icon={BarChart3} color="#3B82F6" />
        <MetricCard label="Coste total" value={`${fmtEur(metrics.totalCost)} €`} sub="Factorial facturado" icon={FileText} color="#EF4444" />
      </div>

      {Object.keys(metrics.byCountry).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Por país</p>
          <div className="flex gap-4">
            {Object.entries(metrics.byCountry).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
              <div key={c} className="flex items-center gap-2">
                <span className="text-lg">{c === "ES" ? "\u{1F1EA}\u{1F1F8}" : c === "FR" ? "\u{1F1EB}\u{1F1F7}" : "\u{1F30D}"}</span>
                <span className="text-sm font-bold text-foreground">{n}</span>
                <span className="text-xs text-muted-foreground">deals</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Últimos deals</p>
        </div>
        <div className="divide-y divide-border">
          {metrics.recent.map((s: any) => (
            <div key={s.id} className="px-5 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.prospects?.company_name ?? "Sin nombre"}</p>
                <p className="text-[11px] text-muted-foreground">{s.prospects?.country ?? "?"} · {new Date(s.updated_at).toLocaleDateString("es-ES")}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {s.roi_pct != null && s.roi_pct > 0 && (
                  <span className="text-xs font-bold text-emerald-600 tabular-nums">{s.roi_pct}%</span>
                )}
                {s.total_annual_benefit_eur != null && (
                  <span className="text-xs font-semibold text-foreground tabular-nums">{fmtEur(s.total_annual_benefit_eur)} €</span>
                )}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  s.status === "generated" ? "bg-violet-50 text-violet-600" :
                  s.status === "sent" ? "bg-blue-50 text-blue-600" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const [activeTable, setActiveTable] = useState("pain_library");
  const [showAudit, setShowAudit] = useState(false);
  const [view, setView] = useState<"metrics" | "tables">("metrics");

  const isAdminEmail = user?.email === ADMIN_EMAIL;

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["user_role_admin_page", user?.id],
    queryFn: async () => {
      if (!user) return false;
      if (user.email === ADMIN_EMAIL) return true;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["strategy_admin", "super_admin"]);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user,
  });

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  const config = TABLE_CONFIGS[activeTable];
  const hasCountryFilter = config.filterColumn === "country";

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="font-semibold text-foreground">Admin</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant={view === "metrics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("metrics")}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Metrics
          </Button>
          <Button
            variant={view === "tables" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("tables")}
          >
            <History className="h-3.5 w-3.5 mr-1" /> Tables
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {view === "metrics" ? (
          <MetricsDashboard />
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {TABLE_TABS.map((t) => (
                <Button
                  key={t.key}
                  variant={activeTable === t.key ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => { setActiveTable(t.key); setShowAudit(false); }}
                >
                  {t.label}
                </Button>
              ))}
              <Button
                variant={showAudit ? "default" : "ghost"}
                size="sm"
                className="shrink-0 text-xs ml-auto"
                onClick={() => setShowAudit(!showAudit)}
              >
                <History className="h-3 w-3 mr-1" /> Audit
              </Button>
            </div>

            {showAudit ? (
              <AuditHistory tableName={activeTable} />
            ) : (
              <AdminTableEditor
                config={config}
                filterOptions={hasCountryFilter ? COUNTRY_FILTERS : undefined}
              />
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
