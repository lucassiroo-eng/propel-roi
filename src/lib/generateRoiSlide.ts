import type { RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG } from "@/lib/moduleCatalog";
import { moduleLabel } from "@/lib/offeringEngine";
import {
  getEffectiveHours, getCountForEntry, MODULE_HOURS, SAVINGS_DESCRIPTIONS,
  getSavingsDescriptions,
  type Stakeholder, type RoiMultipliers,
} from "@/lib/moduleHours";
import jsPDF from "jspdf";

const PILL_COLORS = ["#4B5563", "#F97316", "#0F766E", "#E11D48", "#DB2777", "#059669", "#7C3AED", "#C026D3"];

function fmtEur(n: number): string {
  const rounded = Math.round(n);
  const s = Math.abs(rounded).toString();
  let result = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) result += ".";
    result += s[i];
  }
  return (rounded < 0 ? "-€" : "€") + result;
}

const FACTORIAL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 28" width="120" height="28"><text x="0" y="22" font-family="Inter,sans-serif" font-weight="800" font-size="22" fill="#FF355E">factorial</text></svg>`;

const FACTORIAL_LOGO_DATA_URI = "data:image/svg+xml," + encodeURIComponent(FACTORIAL_LOGO_SVG);

function fmtDate(lang: string): string {
  const d = new Date();
  const months: Record<string, string[]> = {
    es: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
    en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    fr: ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],
  };
  const m = (months[lang] ?? months.es)[d.getMonth()];
  return `${d.getDate()} ${m} ${d.getFullYear()}`;
}

export interface RoiSlideInput {
  companyName: string;
  companyLogoUrl?: string;
  country: string;
  language: string;
  configModules: string[];
  bundleName?: string;
  bundleModules?: string[];
  roiConfig: RoiConfig;
  annualCost: number;
}

export interface RoiSlideModule {
  id: string;
  name: string;
  hours_per_month: number;
  annual_savings: number;
  in_bundle: boolean;
}

export interface RoiSlideHighlight {
  module_name: string;
  benefit: string;
}

export interface RoiSlideData {
  company_name: string;
  company_logo_url?: string;
  date: string;
  language: string;
  bundle_name?: string;
  modules: RoiSlideModule[];
  total_hours: number;
  total_annual_savings: number;
  annual_cost: number;
  roi_percent: number;
  payback_months: number;
  highlights: RoiSlideHighlight[];
  total_employees: number;
  hr_count: number;
  manager_count: number;
  onboardings: number;
}

export function buildRoiSlideData(input: RoiSlideInput): RoiSlideData {
  const { roiConfig, configModules, annualCost } = input;
  const { headcounts, hourly_costs } = roiConfig;
  const bundleSet = new Set(input.bundleModules ?? []);
  const multipliers: RoiMultipliers = {
    headcounts,
    onboardings_per_year: roiConfig.onboardings_per_year,
    expense_submitters: roiConfig.expense_submitters,
  };

  const modules: RoiSlideModule[] = [];
  let totalHours = 0;
  let totalSavings = 0;

  for (const modId of configModules) {
    const hours = getEffectiveHours(modId, roiConfig.hours_overrides);
    let modHours = 0;
    let modMoney = 0;
    for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
      const entry = MODULE_HOURS.find(e => e.module_id === modId && e.stakeholder === s);
      const count = entry ? getCountForEntry(entry, multipliers) : headcounts[s];
      const h = hours[s] * count;
      modHours += h;
      modMoney += h * hourly_costs[s];
    }
    const catalog = MODULE_CATALOG.find(m => m.id === modId);
    modules.push({
      id: modId,
      name: catalog?.label ?? moduleLabel(modId),
      hours_per_month: Math.round(modHours),
      annual_savings: Math.round(modMoney * 12),
      in_bundle: bundleSet.has(modId),
    });
    totalHours += modHours;
    totalSavings += modMoney * 12;
  }

  const roiPercent = annualCost > 0 ? Math.round(((totalSavings - annualCost) / annualCost) * 100) : 0;
  const paybackMonths = totalSavings > 0 ? Math.max(1, Math.round((annualCost / totalSavings) * 12)) : 0;

  const langDescs = getSavingsDescriptions(input.language);
  const highlights: RoiSlideHighlight[] = [...modules]
    .sort((a, b) => b.annual_savings - a.annual_savings)
    .slice(0, 3)
    .map(m => {
      const desc = langDescs[m.id];
      const bullets = desc?.hr ?? desc?.employee ?? desc?.manager ?? [];
      const benefit = bullets[0] ?? "";
      return { module_name: m.name, benefit };
    })
    .filter(h => h.benefit.length > 1);

  return {
    company_name: input.companyName,
    company_logo_url: input.companyLogoUrl,
    date: fmtDate(input.language),
    language: input.language,
    bundle_name: input.bundleName,
    modules,
    total_hours: Math.round(totalHours),
    total_annual_savings: Math.round(totalSavings),
    annual_cost: Math.round(annualCost),
    roi_percent: roiPercent,
    payback_months: paybackMonths,
    highlights,
    total_employees: headcounts.employee,
    hr_count: headcounts.hr,
    manager_count: headcounts.manager,
    onboardings: roiConfig.onboardings_per_year ?? 0,
  };
}

export function generateUserPrompt(data: RoiSlideData): string {
  return JSON.stringify(data, null, 2);
}

function getSummaryI18n(data: RoiSlideData, lang: string): Record<string, string> {
  const i18n: Record<string, Record<string, string>> = {
    es: {
      title_prefix: "ROI esperado de",
      subtitle_prefix: "Análisis de retorno de inversión para",
      col_modules: "Módulos",
      col_hours: "Horas / mes",
      col_savings: "Ahorro / año",
      total_label: "Ahorro Total",
      kpi_savings: "Total Ahorros Anuales",
      kpi_cost: "Coste Anual de Factorial",
      kpi_roi: "ROI Anual",
      payback: "retorno en",
      months: "meses",
      highlights_title: "Impacto por módulo",
      addon_label: "Add-on",
      footer: `Estimación basada en un estudio de la consultoría interna de Factorial, contando con ${data.total_employees} usuarios, ${data.hr_count} administrador${data.hr_count > 1 ? "es" : ""} de RRHH, ${data.manager_count} gerentes y ${data.onboardings} altas al año.`,
    },
    en: {
      title_prefix: "Expected ROI of",
      subtitle_prefix: "ROI analysis for",
      col_modules: "Modules",
      col_hours: "Hours / month",
      col_savings: "Savings / year",
      total_label: "Total Savings",
      kpi_savings: "Total Annual Savings",
      kpi_cost: "Annual Factorial Cost",
      kpi_roi: "Annual ROI",
      payback: "payback in",
      months: "months",
      highlights_title: "Impact per module",
      addon_label: "Add-on",
      footer: `Estimate based on Factorial's internal consulting study, with ${data.total_employees} users, ${data.hr_count} HR admin${data.hr_count > 1 ? "s" : ""}, ${data.manager_count} managers and ${data.onboardings} annual hires.`,
    },
    fr: {
      title_prefix: "ROI attendu de",
      subtitle_prefix: "Analyse du retour sur investissement pour",
      col_modules: "Modules",
      col_hours: "Heures / mois",
      col_savings: "Économies / an",
      total_label: "Économies Totales",
      kpi_savings: "Économies Annuelles Totales",
      kpi_cost: "Coût Annuel Factorial",
      kpi_roi: "ROI Annuel",
      payback: "retour en",
      months: "mois",
      highlights_title: "Impact par module",
      addon_label: "Add-on",
      footer: `Estimation basée sur une étude du cabinet interne de Factorial, avec ${data.total_employees} utilisateurs, ${data.hr_count} administrateur${data.hr_count > 1 ? "s" : ""} RH, ${data.manager_count} managers et ${data.onboardings} recrutements par an.`,
    },
  };
  return i18n[lang] ?? i18n.es;
}

function buildBrandHtml(data: RoiSlideData): string {
  return data.company_logo_url
    ? `<span class="company-name">${escHtml(data.company_name)}</span>
        <div class="brand-divider"></div>
        <img src="${escHtml(data.company_logo_url)}" alt="${escHtml(data.company_name)}">
        <div class="brand-divider"></div>
        <img src="${FACTORIAL_LOGO_DATA_URI}" alt="Factorial">`
    : `<span class="company-name">${escHtml(data.company_name)}</span>
        <div class="brand-divider"></div>
        <img src="${FACTORIAL_LOGO_DATA_URI}" alt="Factorial">`;
}

function generateSummarySlideBody(data: RoiSlideData): string {
  const lang = data.language ?? "es";
  const t = getSummaryI18n(data, lang);

  const mc = data.modules.length;
  const rowPad = mc <= 3 ? 16 : mc <= 5 ? 12 : mc <= 7 ? 9 : 7;
  const pillPadV = mc <= 3 ? 9 : mc <= 5 ? 7 : 5;
  const pillPadH = mc <= 3 ? 20 : mc <= 5 ? 17 : 14;
  const pillFont = mc <= 3 ? 15 : mc <= 5 ? 14 : 12;
  const cellFont = mc <= 3 ? 18 : mc <= 5 ? 16 : 15;
  const dotSize = mc <= 3 ? 8 : 6;
  const totalFont = mc <= 3 ? 24 : mc <= 5 ? 22 : 20;
  const totalLabelFont = mc <= 3 ? 17 : mc <= 5 ? 16 : 15;

  const bundleMods = data.modules.filter(m => m.in_bundle);
  const addonMods = data.modules.filter(m => !m.in_bundle);
  const hasBundleName = !!data.bundle_name;
  const hasAddons = addonMods.length > 0;
  const groupHeaderFont = mc <= 5 ? 11 : 10;

  const renderModRow = (m: RoiSlideModule, i: number) => {
    const color = PILL_COLORS[i % PILL_COLORS.length];
    return `          <tr>
            <td><span class="pill" style="background:${color};padding:${pillPadV}px ${pillPadH}px;font-size:${pillFont}px;"><span class="dot" style="width:${dotSize}px;height:${dotSize}px;"></span>${escHtml(m.name)}</span></td>
            <td style="font-size:${cellFont}px;">${m.hours_per_month > 0 ? `${m.hours_per_month}h` : "—"}</td>
            <td style="font-size:${cellFont}px;">${m.annual_savings > 0 ? fmtEur(m.annual_savings) : "—"}</td>
          </tr>`;
  };

  let moduleRows: string;
  if (hasBundleName && (bundleMods.length > 0 || hasAddons)) {
    const bundleHeader = `          <tr class="group-header"><td colspan="3"><span class="group-label">&#9654; ${escHtml(data.bundle_name!)}</span></td></tr>`;
    const bundleRows = bundleMods.map((m) => {
      const idx = data.modules.indexOf(m);
      return renderModRow(m, idx);
    }).join("\n");
    const addonHeader = hasAddons ? `          <tr class="group-header"><td colspan="3"><span class="group-label">&#43; ${t.addon_label}</span></td></tr>` : "";
    const addonRows = addonMods.map((m) => {
      const idx = data.modules.indexOf(m);
      return renderModRow(m, idx);
    }).join("\n");
    moduleRows = [bundleHeader, bundleRows, addonHeader, addonRows].filter(Boolean).join("\n");
  } else {
    moduleRows = data.modules.map((m, i) => renderModRow(m, i)).join("\n");
  }

  const highlightCards = data.highlights.map((h, i) => {
    const color = PILL_COLORS[i % PILL_COLORS.length];
    return `      <div class="quote-card" style="border-color: ${color};">
        <div class="quote-icon" style="background:${color};">&#x2713;</div>
        <div class="quote-body">
          <div class="quote-text"><span class="who">${escHtml(h.module_name)}</span> &mdash; <span class="quote-action" style="color: ${color};">${escHtml(h.benefit)}</span></div>
        </div>
      </div>`;
  }).join("\n");

  const brandHtml = buildBrandHtml(data);

  return `<div class="slide summary-slide" style="--row-pad:${rowPad}px;--total-font:${totalFont}px;--total-label-font:${totalLabelFont}px;">

  <div class="header">
    <div class="header-left">
      <div class="title">${t.title_prefix} <span class="accent">${data.roi_percent}%</span></div>
      <div class="subtitle">${t.subtitle_prefix} ${escHtml(data.company_name)}</div>
    </div>
    <div class="header-right">
      <div class="header-date">${escHtml(data.date)}</div>
      <div class="header-brand">
        ${brandHtml}
      </div>
    </div>
  </div>

  <div class="card-area">
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>
      </div>
      <div class="kpi-label">${t.kpi_savings}</div>
      <div class="kpi-value-box"><span class="kpi-value">${fmtEur(data.total_annual_savings)}</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>
      </div>
      <div class="kpi-label">${t.kpi_cost}</div>
      <div class="kpi-value-box"><span class="kpi-value">${fmtEur(data.annual_cost)}</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><rect x="8" y="13" width="3" height="3" rx="0.5"/><rect x="13" y="13" width="3" height="3" rx="0.5"/></svg>
      </div>
      <div class="kpi-label">${t.kpi_roi}</div>
      <div class="kpi-value-box"><span class="kpi-value">${data.roi_percent}% &middot; ${t.payback} ${data.payback_months} ${t.months}</span></div>
    </div>
  </div>

  <div class="right-col">

    <div class="table-section">
      <table class="module-table">
        <thead>
          <tr>
            <th>${t.col_modules}</th>
            <th>${t.col_hours}</th>
            <th>${t.col_savings}</th>
          </tr>
        </thead>
        <tbody>
${moduleRows}
          <tr class="total-row">
            <td class="total-label" style="font-size:${totalLabelFont}px;">${t.total_label}</td>
            <td class="total-hours" style="font-size:${totalLabelFont + 1}px;">${data.total_hours}h</td>
            <td class="total-savings" style="font-size:${totalFont}px;">${fmtEur(data.total_annual_savings)}</td>
          </tr>
        </tbody>
      </table>
    </div>

${data.highlights.length > 0 ? `    <div class="quotes-section">
      <div class="quotes-title">${t.highlights_title}</div>

${highlightCards}
    </div>` : ""}

  </div>

  <div class="footer">
    <p>${t.footer}</p>
  </div>

</div>`;
}

export function generateRoiSlideHtml(data: RoiSlideData): string {
  const lang = data.language ?? "es";
  const mc = data.modules.length;
  const rowPad = mc <= 3 ? 16 : mc <= 5 ? 12 : mc <= 7 ? 9 : 7;
  const cellFont = mc <= 3 ? 18 : mc <= 5 ? 16 : 15;
  const groupHeaderFont = mc <= 5 ? 11 : 10;

  const slideBody = generateSummarySlideBody(data);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1440">
<title>ROI Slide — ${escHtml(data.company_name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; }

  .slide {
    width: 1440px; height: 810px; background: #fff; border-top: 4px solid #374151;
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: auto 1fr auto;
    overflow: hidden;
  }

  .header {
    grid-column: 1 / -1;
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 44px 14px 44px;
    border-bottom: 1px solid #F3F4F6;
  }
  .header-left .title { font-size: 32px; font-weight: 800; font-style: italic; color: #1F2937; line-height: 1.15; }
  .header-left .title .accent { color: #FF355E; }
  .header-left .subtitle { font-size: 13px; color: #6B7280; margin-top: 2px; font-weight: 500; }
  .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
  .header-date { font-size: 11px; color: #9CA3AF; font-weight: 500; }
  .header-brand { display: flex; align-items: center; gap: 14px; }
  .header-brand .company-name { font-size: 16px; font-weight: 700; color: #1F2937; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .header-brand .brand-divider { width: 1px; height: 22px; background: #D1D5DB; }
  .header-brand img { height: 20px; object-fit: contain; }

  .card-area {
    grid-row: 2 / 4;
    display: flex; flex-direction: column; justify-content: center; gap: 12px;
    padding: 20px 20px 20px 36px;
  }
  .kpi-card {
    background: linear-gradient(145deg, #FF355E 0%, #FF5C7F 100%);
    border-radius: 16px;
    padding: 16px 14px; text-align: center;
    flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
    box-shadow: 0 6px 20px rgba(255, 53, 94, 0.2);
    position: relative;
    overflow: hidden;
  }
  .kpi-card::before {
    content: ''; position: absolute; top: -20px; right: -20px;
    width: 80px; height: 80px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }
  .kpi-icon svg { width: 32px; height: 32px; fill: none; stroke: rgba(255,255,255,0.95); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .kpi-label { color: #fff; font-size: 15px; font-weight: 700; margin: 4px 0 8px 0; letter-spacing: 0.02em; }
  .kpi-value-box { background: #fff; border-radius: 10px; padding: 8px 14px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.08); max-width: 100%; }
  .kpi-value { color: #FF355E; font-size: 20px; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .kpi-card:last-child .kpi-value { font-size: 14px; }
  .kpi-card:last-child .kpi-value-box { padding: 6px 10px; }

  .right-col {
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  .table-section {
    padding: 12px 44px 0 48px;
    flex: 1;
    display: flex; flex-direction: column; justify-content: center;
  }
  .module-table { width: 100%; border-collapse: collapse; }
  .module-table thead th {
    color: #9CA3AF; font-size: ${mc <= 5 ? 12 : 10}px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0 ${mc <= 5 ? 14 : 10}px 0; text-align: left;
    border-bottom: 1px solid #F3F4F6;
  }
  .module-table thead th:nth-child(2) { text-align: center; width: 120px; }
  .module-table thead th:nth-child(3) { text-align: right; width: 120px; }

  .module-table tbody tr { transition: background 0.15s; }
  .module-table tbody tr:hover { background: #FAFAFA; }
  .module-table tbody td { padding: ${rowPad}px 0; vertical-align: middle; border-bottom: 1px solid #F9FAFB; font-variant-numeric: tabular-nums; }
  .module-table tbody td:nth-child(2) { text-align: center; font-size: ${cellFont}px; color: #374151; font-weight: 600; width: 120px; }
  .module-table tbody td:nth-child(3) { text-align: right; font-size: ${cellFont}px; color: #374151; font-weight: 600; width: 120px; }

  .pill {
    display: inline-flex; align-items: center; gap: 6px;
    border-radius: 20px;
    color: #fff; font-weight: 700; white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  .pill .dot { border-radius: 50%; background: rgba(255,255,255,0.5); }

  .group-header td { padding: ${Math.max(rowPad - 4, 4)}px 0 ${Math.max(rowPad - 6, 2)}px 0; border-bottom: none; }
  .group-label { font-size: ${groupHeaderFont}px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; }

  .total-row td { padding-top: ${rowPad + 4}px !important; border-top: 2px solid #E5E7EB; border-bottom: none; }

  .quotes-section {
    padding: 12px 44px 10px 48px;
    border-top: 1px solid #F3F4F6;
    display: flex; flex-direction: column; gap: 7px;
    flex: 0 0 auto;
  }
  .quotes-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; margin-bottom: 3px; }
  .quote-card {
    display: flex; align-items: center; gap: 11px;
    padding: 10px 16px;
    border-radius: 11px;
    background: #F9FAFB;
    border-left: 3px solid;
  }
  .quote-icon { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; color: #fff; }
  .quote-body { flex: 1; min-width: 0; }
  .quote-text { font-size: 13px; color: #374151; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quote-text .who { font-weight: 700; }
  .quote-action { font-weight: 600; }

  .footer { grid-column: 2 / 3; padding: 0 44px 22px 48px; align-self: end; }
  .footer p { color: #B0B8C4; font-size: 9px; line-height: 1.3; }
</style>
</head>
<body>
${slideBody}
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Multi-slide HTML: summary + per-module detail slides ──

interface ModuleDetailRow {
  stakeholder: Stakeholder;
  hours_per_person: number;
  count: number;
  total_hours: number;
  hourly_cost: number;
  monthly_savings: number;
  annual_savings: number;
  scales_with: string;
  bullets: string[];
}

interface ModuleDetail {
  id: string;
  name: string;
  color: string;
  rows: ModuleDetailRow[];
  total_hours: number;
  total_monthly: number;
  total_annual: number;
}

const CORE_SUBMODULES = new Set(["time_tracking", "time_off"]);

function buildModuleDetails(input: RoiSlideInput, data: RoiSlideData): ModuleDetail[] {
  const { roiConfig, configModules } = input;
  const { headcounts, hourly_costs } = roiConfig;
  const lang = input.language ?? "es";
  const descs = getSavingsDescriptions(lang);
  const multipliers: RoiMultipliers = {
    headcounts,
    onboardings_per_year: roiConfig.onboardings_per_year,
    expense_submitters: roiConfig.expense_submitters,
  };

  function buildRows(modId: string) {
    const hours = getEffectiveHours(modId, roiConfig.hours_overrides);
    const rows: ModuleDetailRow[] = [];
    let totalH = 0, totalM = 0, totalA = 0;
    for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
      const hpm = hours[s];
      if (hpm === 0) continue;
      const entry = MODULE_HOURS.find(e => e.module_id === modId && e.stakeholder === s);
      const count = entry ? getCountForEntry(entry, multipliers) : headcounts[s];
      const scalesWith = entry?.scales_with ?? s;
      const totalHours = hpm * count;
      const monthly = totalHours * hourly_costs[s];
      const annual = monthly * 12;
      const bullets = descs[modId]?.[s] ?? [];
      rows.push({ stakeholder: s, hours_per_person: hpm, count: Math.round(count * 100) / 100, total_hours: Math.round(totalHours * 100) / 100, hourly_cost: hourly_costs[s], monthly_savings: Math.round(monthly), annual_savings: Math.round(annual), scales_with: scalesWith, bullets });
      totalH += totalHours; totalM += monthly; totalA += annual;
    }
    return { rows, totalH, totalM, totalA };
  }

  const details: ModuleDetail[] = [];
  const skip = new Set<string>();

  for (const modId of configModules) {
    if (skip.has(modId)) continue;
    const slideModule = data.modules.find(m => m.id === modId);
    if (!slideModule) continue;

    const { rows, totalH, totalM, totalA } = buildRows(modId);

    // Merge time_tracking & time_off into Core
    if (modId === "core") {
      for (const sub of CORE_SUBMODULES) {
        if (!configModules.includes(sub)) continue;
        skip.add(sub);
        const subResult = buildRows(sub);
        const subCatalog = MODULE_CATALOG.find(m => m.id === sub);
        const subLabel = subCatalog?.label ?? moduleLabel(sub);
        for (const r of subResult.rows) {
          const merged = { ...r, bullets: r.bullets.map(b => `[${subLabel}] ${b}`) };
          rows.push(merged);
        }
      }
    }

    if (rows.length === 0) continue;

    const recalcH = rows.reduce((s, r) => s + r.total_hours, 0);
    const recalcM = rows.reduce((s, r) => s + r.monthly_savings, 0);
    const recalcA = rows.reduce((s, r) => s + r.annual_savings, 0);

    const colorIdx = data.modules.findIndex(m => m.id === modId);
    details.push({
      id: modId,
      name: slideModule.name,
      color: PILL_COLORS[colorIdx >= 0 ? colorIdx % PILL_COLORS.length : 0],
      rows,
      total_hours: Math.round(recalcH * 100) / 100,
      total_monthly: Math.round(recalcM),
      total_annual: Math.round(recalcA),
    });
  }
  return details;
}

const STAKEHOLDER_LABELS: Record<string, Record<Stakeholder, string>> = {
  es: { employee: "Empleados", hr: "RRHH / Finanzas", manager: "Gerentes" },
  en: { employee: "Employees", hr: "HR / Finance", manager: "Managers" },
  fr: { employee: "Employés", hr: "RH / Finance", manager: "Managers" },
};

const SCALES_WITH_LABELS: Record<string, Record<string, string>> = {
  es: { employees: "empleados", hr_ftes: "FTEs RRHH", managers: "gerentes", onboardings: "altas/mes", submitters: "personas con gastos" },
  en: { employees: "employees", hr_ftes: "HR FTEs", managers: "managers", onboardings: "hires/month", submitters: "expense submitters" },
  fr: { employees: "employés", hr_ftes: "FTEs RH", managers: "managers", onboardings: "recrutements/mois", submitters: "soumetteurs de frais" },
};

function generateDetailSlideHtml(detail: ModuleDetail, data: RoiSlideData, lang: string): string {
  const i18n: Record<string, Record<string, string>> = {
    es: { detail_title: "Detalle del cálculo", stakeholder: "Stakeholder", h_person: "h/pers/mes", count: "Personas", total_h: "Horas totales/mes", eur_h: "€/hora", monthly: "Ahorro/mes", annual: "Ahorro/año", total: "Total módulo", pct_of_total: "del ahorro total", hours_month: "Horas/mes", benefits: "Beneficios" },
    en: { detail_title: "Calculation detail", stakeholder: "Stakeholder", h_person: "h/pers/month", count: "People", total_h: "Total hours/month", eur_h: "€/hour", monthly: "Savings/month", annual: "Savings/year", total: "Module total", pct_of_total: "of total savings", hours_month: "Hours/month", benefits: "Benefits" },
    fr: { detail_title: "Détail du calcul", stakeholder: "Partie prenante", h_person: "h/pers/mois", count: "Personnes", total_h: "Heures totales/mois", eur_h: "€/heure", monthly: "Économies/mois", annual: "Économies/an", total: "Total module", pct_of_total: "des économies totales", hours_month: "Heures/mois", benefits: "Bénéfices" },
  };
  const t = i18n[lang] ?? i18n.es;
  const sLabels = STAKEHOLDER_LABELS[lang] ?? STAKEHOLDER_LABELS.es;
  const swLabels = SCALES_WITH_LABELS[lang] ?? SCALES_WITH_LABELS.es;
  const pctOfTotal = data.total_annual_savings > 0 ? Math.round((detail.total_annual / data.total_annual_savings) * 100) : 0;

  const brandHtml = data.company_logo_url
    ? `<span class="company-name">${escHtml(data.company_name)}</span>
        <div class="brand-divider"></div>
        <img src="${escHtml(data.company_logo_url)}" alt="${escHtml(data.company_name)}">
        <div class="brand-divider"></div>
        <img src="${FACTORIAL_LOGO_DATA_URI}" alt="Factorial">`
    : `<span class="company-name">${escHtml(data.company_name)}</span>
        <div class="brand-divider"></div>
        <img src="${FACTORIAL_LOGO_DATA_URI}" alt="Factorial">`;

  const tableRows = detail.rows.map(r => `
            <tr>
              <td><span class="stakeholder-pill" style="background:${r.stakeholder === "employee" ? "rgba(59,130,246,0.1);color:#3B82F6" : r.stakeholder === "hr" ? "rgba(16,185,129,0.1);color:#10B981" : "rgba(245,158,11,0.1);color:#F59E0B"}">${sLabels[r.stakeholder]}</span></td>
              <td>${r.hours_per_person}h</td>
              <td>${r.count} <span class="scales-hint">${swLabels[r.scales_with] ?? r.scales_with}</span></td>
              <td>${Math.round(r.total_hours * 10) / 10}h</td>
              <td>${fmtEur(r.hourly_cost)}</td>
              <td>${fmtEur(r.monthly_savings)}</td>
              <td class="annual-cell">${fmtEur(r.annual_savings)}</td>
            </tr>`).join("\n");

  const bulletsByStakeholder = new Map<Stakeholder, string[]>();
  for (const r of detail.rows) {
    if (r.bullets.length === 0) continue;
    const existing = bulletsByStakeholder.get(r.stakeholder) ?? [];
    existing.push(...r.bullets);
    bulletsByStakeholder.set(r.stakeholder, existing);
  }
  const descriptionCards = [...bulletsByStakeholder.entries()].map(([s, bullets]) => {
    const color = s === "employee" ? "#3B82F6" : s === "hr" ? "#10B981" : "#F59E0B";
    const lis = bullets.map(b => `<li>${escHtml(b)}</li>`).join("");
    return `
        <div class="desc-card" style="border-color:${color};">
          <div class="desc-label">${sLabels[s]}</div>
          <ul class="desc-bullets">${lis}</ul>
        </div>`;
  }).join("\n");

  return `
  <div class="slide detail-slide">
    <div class="header">
      <div class="header-left">
        <div class="title"><span class="module-pill" style="background:${detail.color};">${escHtml(detail.name)}</span> <span class="detail-label">${t.detail_title}</span></div>
      </div>
      <div class="header-right">
        <div class="header-date">${escHtml(data.date)}</div>
        <div class="header-brand">${brandHtml}</div>
      </div>
    </div>

    <div class="detail-content">
      <div class="kpi-strip">
        <div class="detail-kpi" style="border-color:${detail.color};">
          <div class="detail-kpi-value" style="color:${detail.color};">${Math.round(detail.total_hours)}h</div>
          <div class="detail-kpi-label">${t.hours_month}</div>
        </div>
        <div class="detail-kpi" style="border-color:${detail.color};">
          <div class="detail-kpi-value" style="color:${detail.color};">${fmtEur(detail.total_monthly)}</div>
          <div class="detail-kpi-label">${t.monthly}</div>
        </div>
        <div class="detail-kpi" style="border-color:#FF355E;">
          <div class="detail-kpi-value" style="color:#FF355E;">${fmtEur(detail.total_annual)}</div>
          <div class="detail-kpi-label">${t.annual}</div>
        </div>
        <div class="detail-kpi" style="border-color:#374151;">
          <div class="detail-kpi-value">${pctOfTotal}%</div>
          <div class="detail-kpi-label">${t.pct_of_total}</div>
        </div>
      </div>

      <table class="detail-table">
        <thead>
          <tr>
            <th>${t.stakeholder}</th>
            <th>${t.h_person}</th>
            <th>${t.count}</th>
            <th>${t.total_h}</th>
            <th>${t.eur_h}</th>
            <th>${t.monthly}</th>
            <th>${t.annual}</th>
          </tr>
        </thead>
        <tbody>
${tableRows}
          <tr class="total-row">
            <td class="total-label">${t.total}</td>
            <td></td>
            <td></td>
            <td class="total-val">${Math.round(detail.total_hours * 10) / 10}h</td>
            <td></td>
            <td class="total-val">${fmtEur(detail.total_monthly)}</td>
            <td class="total-val total-annual">${fmtEur(detail.total_annual)}</td>
          </tr>
        </tbody>
      </table>

      ${descriptionCards.length > 0 ? `<div class="desc-section"><div class="desc-section-title">${t.benefits}</div><div class="desc-cards">${descriptionCards}</div></div>` : ""}
    </div>
  </div>`;
}

export function generateMultiSlideHtml(data: RoiSlideData, input: RoiSlideInput): string {
  const lang = data.language ?? "es";
  const summarySlideBody = generateSummarySlideBody(data);
  const details = buildModuleDetails(input, data);
  const detailSlides = details.map(d => generateDetailSlideHtml(d, data, lang)).join("\n\n");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1440">
<title>ROI Report — ${escHtml(data.company_name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #f3f4f6; display: flex; flex-direction: column; align-items: center; gap: 40px; padding: 40px 0; }

  @media print {
    body { background: #fff; gap: 0; padding: 0; }
    .slide { break-after: page; box-shadow: none !important; }
  }

  .slide {
    width: 1440px; height: 810px; background: #fff; border-top: 4px solid #374151;
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: auto 1fr auto;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    flex-shrink: 0;
  }

  .header {
    grid-column: 1 / -1;
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 44px 14px 44px;
    border-bottom: 1px solid #F3F4F6;
  }
  .header-left .title { font-size: 32px; font-weight: 800; font-style: italic; color: #1F2937; line-height: 1.15; }
  .header-left .title .accent { color: #FF355E; }
  .header-left .subtitle { font-size: 13px; color: #6B7280; margin-top: 2px; font-weight: 500; }
  .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
  .header-date { font-size: 11px; color: #9CA3AF; font-weight: 500; }
  .header-brand { display: flex; align-items: center; gap: 14px; }
  .header-brand .company-name { font-size: 16px; font-weight: 700; color: #1F2937; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .header-brand .brand-divider { width: 1px; height: 22px; background: #D1D5DB; }
  .header-brand img { height: 20px; object-fit: contain; }

  /* ── Summary slide (slide 1) ── */
  .card-area {
    grid-row: 2 / 4;
    display: flex; flex-direction: column; justify-content: center; gap: 12px;
    padding: 20px 20px 20px 36px;
  }
  .kpi-card {
    background: linear-gradient(145deg, #FF355E 0%, #FF5C7F 100%);
    border-radius: 16px;
    padding: 16px 14px; text-align: center;
    flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
    box-shadow: 0 6px 20px rgba(255, 53, 94, 0.2);
    position: relative; overflow: hidden;
  }
  .kpi-card::before {
    content: ''; position: absolute; top: -20px; right: -20px;
    width: 80px; height: 80px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }
  .kpi-icon svg { width: 32px; height: 32px; fill: none; stroke: rgba(255,255,255,0.95); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .kpi-label { color: #fff; font-size: 15px; font-weight: 700; margin: 4px 0 8px 0; letter-spacing: 0.02em; }
  .kpi-value-box { background: #fff; border-radius: 10px; padding: 8px 14px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.08); max-width: 100%; }
  .kpi-value { color: #FF355E; font-size: 20px; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .kpi-card:last-child .kpi-value { font-size: 14px; }
  .kpi-card:last-child .kpi-value-box { padding: 6px 10px; }

  .right-col { display: flex; flex-direction: column; overflow: hidden; }

  .table-section { padding: 12px 44px 0 48px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .module-table { width: 100%; border-collapse: collapse; }
  .module-table thead th {
    color: #9CA3AF; font-size: 12px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0 14px 0; text-align: left;
    border-bottom: 1px solid #F3F4F6;
  }
  .module-table thead th:nth-child(2) { text-align: center; width: 120px; }
  .module-table thead th:nth-child(3) { text-align: right; width: 120px; }

  .module-table tbody tr { transition: background 0.15s; }
  .module-table tbody tr:hover { background: #FAFAFA; }
  .module-table tbody td { padding: 12px 0; vertical-align: middle; border-bottom: 1px solid #F9FAFB; font-variant-numeric: tabular-nums; }
  .module-table tbody td:nth-child(2) { text-align: center; font-size: 16px; color: #374151; font-weight: 600; width: 120px; }
  .module-table tbody td:nth-child(3) { text-align: right; font-size: 16px; color: #374151; font-weight: 600; width: 120px; }

  .pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 17px; border-radius: 20px;
    color: #fff; font-weight: 700; font-size: 14px; white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  .pill .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.5); }

  .group-header td { padding: 6px 0 4px 0; border-bottom: none; }
  .group-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; }

  .module-table .total-row td { padding-top: 16px !important; border-top: 2px solid #E5E7EB; border-bottom: none; }
  .module-table .total-row .total-label { font-size: 16px; font-weight: 700; color: #1F2937; }
  .module-table .total-row .total-hours { font-size: 17px; font-weight: 700; color: #374151; text-align: center; font-variant-numeric: tabular-nums; }
  .module-table .total-row .total-savings { font-size: 22px; font-weight: 800; color: #FF355E; text-align: right; font-variant-numeric: tabular-nums; }

  .quotes-section {
    padding: 12px 44px 10px 48px;
    border-top: 1px solid #F3F4F6;
    display: flex; flex-direction: column; gap: 7px;
    flex: 0 0 auto;
  }
  .quotes-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; margin-bottom: 3px; }
  .quote-card {
    display: flex; align-items: center; gap: 11px;
    padding: 10px 16px; border-radius: 11px;
    background: #F9FAFB; border-left: 3px solid;
  }
  .quote-icon { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; color: #fff; }
  .quote-body { flex: 1; min-width: 0; }
  .quote-text { font-size: 13px; color: #374151; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .quote-text .who { font-weight: 700; }
  .quote-action { font-weight: 600; }

  .footer { grid-column: 2 / 3; padding: 0 44px 22px 48px; align-self: end; }
  .footer p { color: #B0B8C4; font-size: 9px; line-height: 1.3; }

  /* ── Detail slides ── */
  .detail-slide {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .detail-slide .header-left .title { font-size: 28px; display: flex; align-items: center; gap: 14px; }
  .module-pill {
    display: inline-block; padding: 6px 18px; border-radius: 20px;
    color: #fff; font-weight: 700; font-size: 20px; font-style: normal;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  .detail-label { font-size: 22px; font-weight: 600; color: #6B7280; font-style: normal; }

  .detail-content {
    grid-column: 1 / -1;
    padding: 24px 48px 28px 48px;
    display: flex; flex-direction: column; gap: 22px;
    overflow: hidden;
  }

  .kpi-strip {
    display: flex; gap: 16px;
  }
  .detail-kpi {
    flex: 1; background: #FAFAFA; border-radius: 14px;
    padding: 16px 20px; text-align: center;
    border-left: 4px solid;
  }
  .detail-kpi-value { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .detail-kpi-label { font-size: 12px; color: #6B7280; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }

  .detail-table { width: 100%; border-collapse: collapse; }
  .detail-table thead th {
    color: #9CA3AF; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 0 0 12px 0; text-align: left;
    border-bottom: 1px solid #E5E7EB;
  }
  .detail-table thead th:nth-child(n+2) { text-align: right; }
  .detail-table tbody td {
    padding: 14px 0; vertical-align: middle; border-bottom: 1px solid #F3F4F6;
    font-size: 15px; color: #374151; font-variant-numeric: tabular-nums;
  }
  .detail-table tbody td:nth-child(n+2) { text-align: right; font-weight: 600; }
  .annual-cell { color: #FF355E !important; font-weight: 700 !important; }

  .stakeholder-pill {
    display: inline-block; padding: 5px 14px; border-radius: 16px;
    font-weight: 700; font-size: 13px; white-space: nowrap;
  }
  .scales-hint { font-size: 10px; color: #9CA3AF; font-weight: 500; display: block; margin-top: 1px; }

  .detail-table .total-row td { padding-top: 14px; border-top: 2px solid #E5E7EB; border-bottom: none; }
  .total-label { font-weight: 700; color: #1F2937; font-size: 15px; }
  .total-val { font-weight: 700; color: #374151; }
  .total-annual { font-size: 18px; font-weight: 800; color: #FF355E !important; }

  .desc-section { display: flex; flex-direction: column; gap: 10px; }
  .desc-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; }
  .desc-cards { display: flex; gap: 14px; flex-wrap: wrap; }
  .desc-card {
    flex: 1; min-width: 280px;
    background: #F9FAFB; border-radius: 12px; padding: 14px 18px;
    border-left: 4px solid; font-size: 12px; color: #4B5563; line-height: 1.6;
  }
  .desc-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; color: #6B7280; }
  .desc-bullets { list-style: none; padding: 0; margin: 0; }
  .desc-bullets li { position: relative; padding-left: 14px; margin-bottom: 4px; }
  .desc-bullets li::before { content: ''; position: absolute; left: 0; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: 0.4; }
</style>
</head>
<body>

${summarySlideBody}

${detailSlides}

</body>
</html>`;
}

// ── PDF generation: render in hidden iframe, capture with html2canvas + jsPDF ──

let html2canvasLoaded: Promise<any> | null = null;

function loadHtml2Canvas(): Promise<any> {
  if ((window as any).html2canvas) return Promise.resolve((window as any).html2canvas);
  if (html2canvasLoaded) return html2canvasLoaded;
  html2canvasLoaded = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => resolve((window as any).html2canvas);
    s.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.head.appendChild(s);
  });
  return html2canvasLoaded;
}

let cachedFontCss: string | null = null;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

async function getInlineFontCss(): Promise<string> {
  if (cachedFontCss) return cachedFontCss;
  try {
    const cssResp = await fetch("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
    let css = await cssResp.text();
    const urlRe = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
    const entries: { url: string; b64: string; mime: string }[] = [];
    const urls = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(css)) !== null) urls.add(m[1]);
    await Promise.all([...urls].map(async (url) => {
      try {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const mime = url.includes(".woff2") ? "font/woff2" : url.includes(".ttf") ? "font/ttf" : "font/woff";
        entries.push({ url, b64, mime });
      } catch { /* keep original URL as fallback */ }
    }));
    for (const e of entries) {
      css = css.replaceAll(e.url, `data:${e.mime};base64,${e.b64}`);
    }
    cachedFontCss = css;
    return css;
  } catch {
    return "";
  }
}

const GOOGLE_FONTS_LINK = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">';

function prepareCaptureHtml(html: string, bodyStyleFrom: string, bodyStyleTo: string, fontCss: string): string {
  let out = html.replace(bodyStyleFrom, bodyStyleTo);
  if (fontCss) {
    out = out.replace(GOOGLE_FONTS_LINK, "");
  }
  return out;
}

async function waitForIframeFonts(iframe: HTMLIFrameElement): Promise<void> {
  const iframeDoc = iframe.contentDocument!;
  const iframeWin = iframe.contentWindow!;
  await Promise.race([iframeDoc.fonts.ready, new Promise(r => setTimeout(r, 4000))]);
  await new Promise<void>((resolve) => {
    const check = () => {
      if ((iframeWin as any).__fontsReady) { resolve(); return; }
      setTimeout(check, 50);
    };
    check();
    setTimeout(resolve, 4000);
  });
  await new Promise(r => setTimeout(r, 400));
}

async function inlineExternalImages(root: HTMLElement): Promise<void> {
  const imgs = root.querySelectorAll("img");
  await Promise.all(Array.from(imgs).map(async (img) => {
    if (!img.src || img.src.startsWith("data:")) return;
    try {
      const resp = await fetch(img.src, { mode: "cors" });
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      img.src = dataUrl;
    } catch { /* keep original */ }
  }));
}

async function captureSlide(slide: HTMLElement, html2canvas: any): Promise<string> {
  await inlineExternalImages(slide);
  const canvas = await html2canvas(slide, {
    width: 1440, height: 810, scale: 2,
    useCORS: true, logging: false, backgroundColor: "#ffffff",
    windowWidth: 1440, windowHeight: 810,
    foreignObjectRendering: true,
  });
  return canvas.toDataURL("image/png");
}

export async function generateRoiSlidePdf(data: RoiSlideData): Promise<void> {
  const [html2canvas, fontCss] = await Promise.all([
    loadHtml2Canvas(),
    getInlineFontCss(),
  ]);

  const html = generateRoiSlideHtml(data);
  const captureHtml = prepareCaptureHtml(
    html,
    "background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh;",
    "background: #fff; margin: 0; padding: 0;",
    fontCss,
  ).replace("</style>", `</style>\n<style>${fontCss}</style>\n<script>document.fonts.ready.then(function(){document.body.offsetHeight;window.__fontsReady=true;});</script>`);

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1440px;height:810px;border:none;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve) => { iframe.onload = () => resolve(); iframe.srcdoc = captureHtml; });
    await waitForIframeFonts(iframe);

    const slide = iframe.contentDocument!.querySelector(".slide") as HTMLElement;
    if (!slide) throw new Error("Slide element not found");

    const img = await captureSlide(slide, html2canvas);
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1440, 810] });
    pdf.addImage(img, "PNG", 0, 0, 1440, 810);
    pdf.save(`ROI-Slide-${data.company_name || "report"}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function generateMultiSlidePdf(data: RoiSlideData, input: RoiSlideInput): Promise<void> {
  const [html2canvas, fontCss] = await Promise.all([
    loadHtml2Canvas(),
    getInlineFontCss(),
  ]);

  const html = generateMultiSlideHtml(data, input);
  const captureHtml = prepareCaptureHtml(
    html,
    "background: #f3f4f6; display: flex; flex-direction: column; align-items: center; gap: 40px; padding: 40px 0;",
    "background: #fff; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 0;",
    fontCss,
  ).replace("</style>", `</style>\n<style>${fontCss}</style>\n<script>document.fonts.ready.then(function(){document.body.offsetHeight;window.__fontsReady=true;});</script>`);

  const slideCount = (html.match(/class="slide/g) || []).length;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:1440px;height:${810 * slideCount}px;border:none;pointer-events:none;z-index:-1;`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve) => { iframe.onload = () => resolve(); iframe.srcdoc = captureHtml; });
    await waitForIframeFonts(iframe);

    const slides = iframe.contentDocument!.querySelectorAll(".slide") as NodeListOf<HTMLElement>;
    if (slides.length === 0) throw new Error("No slides found");

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1440, 810] });
    for (let i = 0; i < slides.length; i++) {
      if (i > 0) pdf.addPage([1440, 810], "landscape");
      const img = await captureSlide(slides[i], html2canvas);
      pdf.addImage(img, "PNG", 0, 0, 1440, 810);
    }

    pdf.save(`ROI-Report-${data.company_name || "report"}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}
