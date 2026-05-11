import { useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Users, Briefcase, Shield } from "lucide-react";
import { MODULE_CATALOG } from "@/lib/moduleCatalog";
import { getHoursForModule, defaultHeadcounts, type Stakeholder } from "@/lib/moduleHours";
import type { RoiConfig } from "@/hooks/useWizardSession";
import { useTranslation } from "react-i18next";

interface Props {
  selectedModules: string[];
  seats: number;
  roiConfig: RoiConfig;
  onChange: (config: RoiConfig) => void;
}

const STAKEHOLDER_META: Record<Stakeholder, { label: string; sublabel: string; icon: typeof Users; color: string; bg: string; border: string }> = {
  employee: { label: "Employees",    sublabel: "~80% of seats", icon: Users,     color: "#3B82F6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)" },
  hr:       { label: "HR / Finance", sublabel: "~5% of seats",  icon: Shield,    color: "#10B981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.2)" },
  manager:  { label: "Managers",     sublabel: "~15% of seats", icon: Briefcase, color: "#F59E0B", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)" },
};

function fmt(n: number): string {
  return n.toLocaleString("en", { maximumFractionDigits: 1 });
}

function fmtMoney(n: number): string {
  return "€" + Math.round(n).toLocaleString("en");
}

const DEFAULT_ROI: RoiConfig = { headcounts: { employee: 40, hr: 3, manager: 8 }, hourly_costs: { employee: 25, hr: 35, manager: 30 } };

export function StepROI({ selectedModules, seats, roiConfig = DEFAULT_ROI, onChange }: Props) {
  const { headcounts, hourly_costs } = roiConfig;
  const { t } = useTranslation();

  useEffect(() => {
    const isDefault = headcounts.employee === 40 && headcounts.hr === 3 && headcounts.manager === 8;
    const isEmpty = headcounts.employee + headcounts.hr + headcounts.manager === 0;
    if (isEmpty || isDefault) {
      onChange({ ...roiConfig, headcounts: defaultHeadcounts(seats) });
    }
  }, []);

  function setHeadcount(key: Stakeholder, value: number) {
    onChange({ ...roiConfig, headcounts: { ...headcounts, [key]: Math.max(0, value) } });
  }

  function setHourlyCost(key: Stakeholder, value: number) {
    onChange({ ...roiConfig, hourly_costs: { ...hourly_costs, [key]: Math.max(0, value) } });
  }

  const rows = useMemo(() => {
    return selectedModules.map(moduleId => {
      const catalog = MODULE_CATALOG.find(m => m.id === moduleId);
      const hours = getHoursForModule(moduleId);
      const label = catalog?.label ?? moduleId;
      const color = catalog?.color ?? "#94A3B8";

      const perStakeholder = (["employee", "hr", "manager"] as Stakeholder[]).map(s => {
        const h = hours[s];
        const totalHours = h * headcounts[s];
        const totalMoney = totalHours * hourly_costs[s];
        return { stakeholder: s, hoursPerPerson: h, totalHours, totalMoney };
      });

      const monthlyHours = perStakeholder.reduce((sum, s) => sum + s.totalHours, 0);
      const monthlyMoney = perStakeholder.reduce((sum, s) => sum + s.totalMoney, 0);

      return { moduleId, label, color, perStakeholder, monthlyHours, monthlyMoney, annualMoney: monthlyMoney * 12 };
    });
  }, [selectedModules, headcounts, hourly_costs]);

  const totals = useMemo(() => {
    const monthly = rows.reduce((s, r) => s + r.monthlyMoney, 0);
    const annual = rows.reduce((s, r) => s + r.annualMoney, 0);
    const monthlyHours = rows.reduce((s, r) => s + r.monthlyHours, 0);
    return { monthly, annual, monthlyHours };
  }, [rows]);

  const totalPeople = headcounts.employee + headcounts.hr + headcounts.manager;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">ROI — Time & Cost Savings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your team structure to calculate savings per module
        </p>
      </div>

      {/* Stakeholder cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["employee", "hr", "manager"] as Stakeholder[]).map(key => {
          const meta = STAKEHOLDER_META[key];
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className="rounded-xl p-4 space-y-4 transition-shadow hover:shadow-sm"
              style={{ backgroundColor: meta.bg, border: `1.5px solid ${meta.border}` }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: meta.color }}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{meta.label}</p>
                  <p className="text-[10px] text-muted-foreground">{meta.sublabel}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    People
                  </label>
                  <Input
                    type="number"
                    min={0}
                    className="h-10 text-center text-lg font-bold tabular-nums bg-white/80"
                    value={headcounts[key]}
                    onChange={e => setHeadcount(key, parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    €/hour
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    className="h-10 text-center text-lg font-bold tabular-nums bg-white/80"
                    value={hourly_costs[key]}
                    onChange={e => setHourlyCost(key, parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-muted/40 border border-border/50">
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground">{totalPeople}</strong> people total
          {totalPeople !== seats && (
            <span className="ml-2 text-muted-foreground/70">({seats} seats)</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          Weighted avg: <strong className="text-foreground">€{totalPeople > 0 ? Math.round((headcounts.employee * hourly_costs.employee + headcounts.hr * hourly_costs.hr + headcounts.manager * hourly_costs.manager) / totalPeople) : 0}</strong>/h
        </span>
      </div>

      {/* Module savings table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Module</th>
                {(["employee", "hr", "manager"] as Stakeholder[]).map(s => (
                  <th key={s} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap" style={{ color: STAKEHOLDER_META[s].color }}>
                    {STAKEHOLDER_META[s].label}
                  </th>
                ))}
                <th className="text-right px-3 py-2.5 font-semibold text-foreground">h/month</th>
                <th className="text-right px-4 py-2.5 font-semibold text-foreground">€/year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.moduleId} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="font-medium text-foreground">{row.label}</span>
                    </div>
                  </td>
                  {row.perStakeholder.map(ps => (
                    <td key={ps.stakeholder} className="text-right px-3 py-2.5 tabular-nums">
                      {ps.hoursPerPerson > 0 ? (
                        <span className="text-muted-foreground">
                          {fmt(ps.totalHours)}<span className="text-[10px] ml-0.5">h</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  ))}
                  <td className="text-right px-3 py-2.5 font-medium tabular-nums text-foreground">
                    {fmt(row.monthlyHours)}
                  </td>
                  <td className="text-right px-4 py-2.5 font-semibold tabular-nums text-emerald-600">
                    {fmtMoney(row.annualMoney)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/50">
                <td className="px-4 py-3 font-bold text-foreground">Total</td>
                <td colSpan={3} />
                <td className="text-right px-3 py-3 font-bold tabular-nums text-foreground">
                  {fmt(totals.monthlyHours)}
                </td>
                <td className="text-right px-4 py-3 font-bold tabular-nums text-emerald-600 text-base">
                  {fmtMoney(totals.annual)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{fmt(totals.monthlyHours)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">hours saved / month</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{fmtMoney(totals.monthly)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">saved / month</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-600">{fmtMoney(totals.annual)}</p>
          <p className="text-[11px] text-emerald-700 mt-0.5">saved / year</p>
        </div>
      </div>
    </div>
  );
}
