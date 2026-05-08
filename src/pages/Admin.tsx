import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { AdminTableEditor } from "@/components/admin/AdminTableEditor";
import { AuditHistory } from "@/components/admin/AuditHistory";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigate } from "react-router-dom";
import { Loader2, ShieldCheck, History } from "lucide-react";
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

export default function Admin() {
  const { user } = useAuth();
  const [activeTable, setActiveTable] = useState("pain_library");
  const [showAudit, setShowAudit] = useState(false);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["user_role_admin_page", user?.id],
    queryFn: async () => {
      if (!user) return false;
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
        <Button
          variant={showAudit ? "default" : "ghost"}
          size="sm"
          className="ml-auto"
          onClick={() => setShowAudit(!showAudit)}
        >
          <History className="h-3.5 w-3.5 mr-1" /> Audit
        </Button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Table selector - horizontal scroll */}
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
        </div>

        {showAudit ? (
          <AuditHistory tableName={activeTable} />
        ) : (
          <AdminTableEditor
            config={config}
            filterOptions={hasCountryFilter ? COUNTRY_FILTERS : undefined}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}
