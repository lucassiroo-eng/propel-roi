import type { RoiSlideData, RoiSlideInput } from "./generateRoiSlide";
import { MODULE_HOURS, getEffectiveHours, getCountForEntry, getSavingsDescriptions, type Stakeholder, type RoiMultipliers } from "./moduleHours";
import { MODULE_CATALOG } from "./moduleCatalog";
import { MODULE_INFO, getLocalized } from "./discoveryQuestions";
import jsPDF from "jspdf";

const PILL_COLORS: Record<string, string> = {
  core: "#6B7280", time_tracking: "#6B7280", time_off: "#6B7280", time_planning: "#6B7280",
  payroll: "#FB923C", expenses: "#14B8A6", recruitment: "#E05C75",
  performance: "#7C3AED", trainings: "#059669", compensations: "#D946EF",
  engagement: "#F59E0B", procurement: "#0EA5E9", projects: "#8B5CF6",
  complaints: "#64748B", benefits: "#EC4899", wellhub: "#22C55E",
  documents: "#6B7280", headcount_planning: "#6B7280", lms: "#059669",
};

function modColor(id: string): string {
  return PILL_COLORS[id] ?? MODULE_CATALOG.find(m => m.id === id)?.color ?? "#6B7280";
}

function fmtEur(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "€0";
  const s = Math.abs(Math.round(n)).toString();
  let r = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) r += ".";
    r += s[i];
  }
  return "€" + r;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const STAKEHOLDER_ICONS: Record<Stakeholder, { emoji: string; bg: string }> = {
  employee: { emoji: "👤", bg: "#EFF6FF" },
  hr: { emoji: "🛡", bg: "#F0FDF4" },
  manager: { emoji: "💼", bg: "#FFFBEB" },
};

function stakeholderLabel(s: Stakeholder, lang: string): string {
  const labels: Record<string, Record<Stakeholder, string>> = {
    es: { employee: "Empleados", hr: "Admin RRHH", manager: "Managers" },
    en: { employee: "Employees", hr: "HR Admin", manager: "Managers" },
    fr: { employee: "Employés", hr: "Admin RH", manager: "Managers" },
  };
  return (labels[lang] ?? labels.es)[s];
}

function scalesWithLabel(sw: string, lang: string): string {
  const labels: Record<string, Record<string, string>> = {
    es: { employees: "empleados", hr_ftes: "admins", managers: "managers", onboardings: "altas al año", submitters: "submitters" },
    en: { employees: "employees", hr_ftes: "admins", managers: "managers", onboardings: "hires/year", submitters: "submitters" },
    fr: { employees: "employés", hr_ftes: "admins", managers: "managers", onboardings: "recrutements/an", submitters: "soumetteurs" },
  };
  return (labels[lang] ?? labels.es)[sw] ?? sw;
}

const MODULE_SHORT_DESC: Record<string, Record<string, string>> = {
  es: {
    core: "Gestión centralizada de empleados y onboarding automático",
    time_tracking: "Fichaje digital y registro de jornada laboral",
    time_off: "Gestión de vacaciones, bajas y permisos",
    time_planning: "Planificación de turnos y cuadrantes",
    payroll: "Sincronización automática con el proveedor de nómina",
    expenses: "Captura OCR y aprobación de notas de gasto",
    recruitment: "ATS para gestionar procesos de contratación",
    performance: "Evaluaciones de desempeño y objetivos",
    trainings: "Gestión de formación y desarrollo",
    compensations: "Revisiones salariales y bandas retributivas",
    engagement: "Encuestas de clima y engagement",
    procurement: "Gestión de compras y proveedores",
    projects: "Seguimiento de proyectos y costes",
    complaints: "Canal de denuncias y cumplimiento normativo",
    benefits: "Anticipo de nómina y beneficios flexibles",
    wellhub: "Bienestar corporativo y gimnasios",
    documents: "Gestión documental y firma digital",
    headcount_planning: "Planificación de plantilla",
    lms: "Plataforma de aprendizaje online",
  },
  en: {
    core: "Centralized employee management and automated onboarding",
    time_tracking: "Digital time tracking and attendance",
    time_off: "Leave management — holidays, sick days, permits",
    time_planning: "Shift planning and scheduling",
    payroll: "Automatic sync with payroll provider",
    expenses: "OCR capture and expense approval",
    recruitment: "ATS for hiring process management",
    performance: "Performance reviews and goals",
    trainings: "Training and development management",
    compensations: "Salary reviews and pay bands",
    engagement: "Employee engagement surveys",
    procurement: "Procurement and vendor management",
    projects: "Project tracking and costing",
    complaints: "Whistleblowing channel and compliance",
    benefits: "Salary advance and flexible benefits",
    wellhub: "Corporate wellness and gym access",
    documents: "Document management and e-signature",
    headcount_planning: "Headcount planning",
    lms: "Online learning platform",
  },
  fr: {
    core: "Gestion centralisée des employés et onboarding automatisé",
    time_tracking: "Pointage numérique et suivi du temps",
    time_off: "Gestion des congés, absences et permissions",
    time_planning: "Planification des horaires et rotations",
    payroll: "Synchronisation automatique avec le prestataire de paie",
    expenses: "Capture OCR et approbation des notes de frais",
    recruitment: "ATS pour gérer les processus de recrutement",
    performance: "Évaluations de performance et objectifs",
    trainings: "Gestion de la formation et du développement",
    compensations: "Revues salariales et grilles de rémunération",
    engagement: "Enquêtes de climat et engagement",
    procurement: "Gestion des achats et fournisseurs",
    projects: "Suivi des projets et des coûts",
    complaints: "Canal d'alerte et conformité",
    benefits: "Avance sur salaire et avantages flexibles",
    wellhub: "Bien-être en entreprise et accès salle de sport",
    documents: "Gestion documentaire et signature électronique",
    headcount_planning: "Planification des effectifs",
    lms: "Plateforme d'apprentissage en ligne",
  },
};

// Country → language mapping:
//   ES → ui=es, modules=es
//   FR → ui=fr, modules=en
//   *  → ui=en, modules=en
function resolveLangs(country: string): { uiLang: string; modLang: string } {
  const c = (country || "").toUpperCase();
  if (c === "ES") return { uiLang: "es", modLang: "es" };
  if (c === "FR") return { uiLang: "fr", modLang: "en" };
  return { uiLang: "en", modLang: "en" };
}

function getModuleDesc(modId: string, lang: string): string {
  return (MODULE_SHORT_DESC[lang] ?? MODULE_SHORT_DESC.en)[modId] ?? "";
}

function localizedModuleName(modId: string, modLang: string): string {
  const info = MODULE_INFO[modId];
  if (info) return getLocalized(info.label, modLang);
  return modId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

interface StakeholderRow {
  stakeholder: Stakeholder;
  hours_per_unit: number;
  count: number;
  scales_with: string;
  total_hours: number;
  hourly_cost: number;
  monthly_savings: number;
  annual_savings: number;
  description: string;
}

interface ModuleDetail {
  id: string;
  name: string;
  color: string;
  category_desc: string;
  rows: StakeholderRow[];
  total_hours: number;
  total_annual: number;
  tool_override?: { tool_name: string; annual_cost: number };
}

function buildDetails(input: RoiSlideInput, data: RoiSlideData, uiLang: string, modLang: string): ModuleDetail[] {
  const { roiConfig, configModules } = input;
  const { headcounts, hourly_costs } = roiConfig;
  const multipliers: RoiMultipliers = {
    headcounts,
    onboardings_per_year: roiConfig.onboardings_per_year,
    expense_submitters: roiConfig.expense_submitters,
  };
  const descs = getSavingsDescriptions(uiLang);
  const customDescs = input.customDescriptions;

  const details: ModuleDetail[] = [];

  for (const modId of configModules) {
    const catalog = MODULE_CATALOG.find(m => m.id === modId);
    const slideModule = data.modules.find(m => m.id === modId);
    if (!slideModule) continue;

    const color = modColor(modId);
    const catDesc = catalog?.category ?? "";
    const name = localizedModuleName(modId, modLang);

    if (slideModule.tool_override) {
      details.push({
        id: modId,
        name,
        color,
        category_desc: catDesc,
        rows: [],
        total_hours: 0,
        total_annual: slideModule.annual_savings,
        tool_override: slideModule.tool_override,
      });
      continue;
    }

    const hours = getEffectiveHours(modId, roiConfig.hours_overrides);
    const rows: StakeholderRow[] = [];
    let totalH = 0;

    for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
      const entry = MODULE_HOURS.find(e => e.module_id === modId && e.stakeholder === s);
      if (!entry || hours[s] === 0) continue;
      const count = getCountForEntry(entry, multipliers);
      const th = hours[s] * count;
      const ms = th * hourly_costs[s];
      const descArr = customDescs?.[modId]?.[s] ?? descs[modId]?.[s] ?? [];
      rows.push({
        stakeholder: s,
        hours_per_unit: hours[s],
        count,
        scales_with: entry.scales_with,
        total_hours: th,
        hourly_cost: hourly_costs[s],
        monthly_savings: ms,
        annual_savings: ms * 12,
        description: descArr[0] ?? "",
      });
      totalH += th;
    }

    details.push({
      id: modId,
      name,
      color,
      category_desc: catDesc,
      rows,
      total_hours: totalH,
      total_annual: slideModule.annual_savings,
    });
  }
  return details;
}

// ── i18n ─────────────────────────────────────────────
interface DeckI18n {
  proposal: string; cover_subtitle: string; confidential: string;
  annual_savings: string; roi: string; payback: string;
  roi_sub: (v: string) => string; payback_sub: (m: string) => string; savings_vs_sub: (cost: string) => string;
  what_is: string; module: string; description: string; h_month: string; savings_year: string;
  total: string; tool_label: string;
  type_employee: string; hypothesis: string; assumption: string; estimated_saving: string;
  total_annual: string;
  replaces_before: string; replaces_after: string; replaces_current_cost: string;
  replaces_factorial: string; replaces_included: string; replaces_direct: string; replaces_extra: string;
  disclaimer: (emp: number, hr: number, mgr: number, onb: number) => string;
  ae_title: string;
  h_year_saved: string; h_month_saved: string; per: string; hourly_cost: string; year: string;
}

function getI18n(lang: string): DeckI18n {
  const i18n: Record<string, DeckI18n> = {
    es: {
      proposal: "Propuesta ROI Factorial", cover_subtitle: "De procesos manuales a una plataforma centralizada para tus",
      confidential: "Confidencial",
      annual_savings: "Ahorro anual estimado", roi: "ROI anual", payback: "Payback",
      roi_sub: v => `por cada €1 invertido<br>recuperas ${v}`,
      payback_sub: m => `la inversión se recupera<br>en ${m} meses`,
      savings_vs_sub: c => `frente a ${c}/año de inversión<br>en Factorial`,
      what_is: "Qué es", module: "Módulo", description: "Descripción", h_month: "h/mes ahorradas", savings_year: "Ahorro / año",
      total: "Total ahorros anuales estimados", tool_label: "Herram.",
      type_employee: "Tipo de empleado", hypothesis: "Hipótesis de ahorro", assumption: "Asunción y cálculo", estimated_saving: "Ahorro estimado",
      total_annual: "Total ahorro anual",
      replaces_before: "Antes", replaces_after: "Después", replaces_current_cost: "Coste actual",
      replaces_factorial: "Factorial", replaces_included: "Incluido en el plan contratado",
      replaces_direct: "Ahorro directo", replaces_extra: "adicional",
      disclaimer: (e, h, m, o) => `Estimación: ${e} empleados · ${h} admin RRHH · ${m} managers · ${o} altas/año. No garantiza resultados.`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/año ahorradas", h_month_saved: "h/mes ahorradas", per: "por", hourly_cost: "coste horario", year: "año",
    },
    en: {
      proposal: "Factorial ROI Proposal", cover_subtitle: "From manual processes to a centralized platform for your",
      confidential: "Confidential",
      annual_savings: "Estimated annual savings", roi: "Annual ROI", payback: "Payback",
      roi_sub: v => `for every €1 invested<br>you get back ${v}`,
      payback_sub: m => `investment recovered<br>in ${m} months`,
      savings_vs_sub: c => `vs. ${c}/year investment<br>in Factorial`,
      what_is: "What it is", module: "Module", description: "Description", h_month: "h/month saved", savings_year: "Savings / year",
      total: "Total estimated annual savings", tool_label: "Tool",
      type_employee: "Employee type", hypothesis: "Savings hypothesis", assumption: "Assumption & calculation", estimated_saving: "Estimated savings",
      total_annual: "Total annual savings",
      replaces_before: "Before", replaces_after: "After", replaces_current_cost: "Current cost",
      replaces_factorial: "Factorial", replaces_included: "Included in your plan",
      replaces_direct: "Direct savings", replaces_extra: "additional",
      disclaimer: (e, h, m, o) => `Estimate: ${e} employees · ${h} HR admin · ${m} managers · ${o} hires/year. No guarantee of results.`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/year saved", h_month_saved: "h/month saved", per: "per", hourly_cost: "hourly cost", year: "year",
    },
    fr: {
      proposal: "Proposition ROI Factorial", cover_subtitle: "Des processus manuels à une plateforme centralisée pour vos",
      confidential: "Confidentiel",
      annual_savings: "Économies annuelles estimées", roi: "ROI annuel", payback: "Payback",
      roi_sub: v => `pour chaque €1 investi<br>vous récupérez ${v}`,
      payback_sub: m => `investissement récupéré<br>en ${m} mois`,
      savings_vs_sub: c => `contre ${c}/an d'investissement<br>dans Factorial`,
      what_is: "Description", module: "Module", description: "Description", h_month: "h/mois économisées", savings_year: "Économies / an",
      total: "Total économies annuelles estimées", tool_label: "Outil",
      type_employee: "Type d'employé", hypothesis: "Hypothèse d'économie", assumption: "Hypothèse et calcul", estimated_saving: "Économie estimée",
      total_annual: "Total économies annuelles",
      replaces_before: "Avant", replaces_after: "Après", replaces_current_cost: "Coût actuel",
      replaces_factorial: "Factorial", replaces_included: "Inclus dans votre plan",
      replaces_direct: "Économie directe", replaces_extra: "supplémentaire",
      disclaimer: (e, h, m, o) => `Estimation: ${e} employés · ${h} admin RH · ${m} managers · ${o} recrutements/an. Sans garantie de résultats.`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/an économisées", h_month_saved: "h/mois économisées", per: "par", hourly_cost: "coût horaire", year: "an",
    },
  };
  return i18n[lang] ?? i18n.es;
}

function fmtMonth(lang: string): string {
  const d = new Date();
  const m: Record<string, string[]> = {
    es: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    fr: ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"],
  };
  return `${(m[lang] ?? m.es)[d.getMonth()]} ${d.getFullYear()}`;
}

// ── CSS ──────────────────────────────────────────────
// All colors hardcoded (no var()) — html2canvas doesn't resolve CSS custom properties reliably
const C = { coral: "#FF355E", dark: "#25253D", gray: "#6C6C7D", lgray: "#AEAEB8", border: "#E9E9EC", bg: "#F9F9FB", pad: "80px" };

const DECK_CSS = `
*{margin:0;padding:0;box-sizing:border-box;border:none;outline:none}
body{font-family:'DM Sans',system-ui,sans-serif;background:#f3f4f6;display:flex;flex-direction:column;align-items:center;gap:40px;padding:40px 0}
.slide{width:1280px;height:720px;background:${C.bg};overflow:hidden;box-shadow:0 20px 64px rgba(0,0,0,.12);flex-shrink:0;position:relative}
.iso{position:absolute;top:22px;right:28px;width:30px;height:30px;opacity:.65}
.brand{position:absolute;top:26px;left:${C.pad};right:100px;font-size:11px;font-weight:500;color:${C.lgray};letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.kpis{display:flex;margin:0 ${C.pad};padding:14px 0 16px;border-bottom:1px solid ${C.border}!important}
.kpi{flex:1}.kpi+.kpi{border-left:1px solid ${C.border}!important;padding-left:36px;margin-left:36px}
.kpi-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:${C.lgray};margin-bottom:6px}
.kpi-val{font-size:44px;font-weight:800;letter-spacing:-.04em;line-height:1}
.kpi-sub{font-size:11px;color:${C.gray};margin-top:5px;line-height:1.4}

.btbl{width:100%;border-collapse:collapse}
.btbl thead th{padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#fff;background:${C.dark};text-align:left}
.btbl thead th:last-child{text-align:right}
.btbl thead tr th:first-child{border-radius:4px 0 0 4px}.btbl thead tr th:last-child{border-radius:0 4px 4px 0}
.btbl tbody td{padding:6px 12px;font-size:12px;color:${C.dark};border-bottom:1px solid ${C.border}!important;vertical-align:middle}
.btbl tbody td:nth-child(3){text-align:center;font-weight:600;font-variant-numeric:tabular-nums;color:${C.gray}}
.btbl tbody td:last-child{text-align:right;font-weight:700;font-size:13px;font-variant-numeric:tabular-nums}
.btbl tbody tr:last-child td{border-bottom:none!important}
.btbl .btot td{font-weight:800;font-size:13px;border-top:2px solid ${C.border}!important;border-bottom:none!important;padding:9px 12px;background:${C.bg}}
.btbl .btot td:last-child{font-size:15px;color:${C.coral}}
.mdot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:8px;vertical-align:middle}

.mhd{position:absolute;top:48px;left:0;right:0;min-height:72px;display:flex;align-items:center;justify-content:space-between;padding:8px ${C.pad};border-bottom:1px solid ${C.border}!important}
.mhd-name{font-size:24px;font-weight:800;letter-spacing:-.025em;white-space:nowrap}
.mhd-cat{font-size:12px;color:${C.lgray};font-weight:500;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:600px}
.mhd-r{text-align:right;flex-shrink:0;margin-left:24px}
.mhd-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${C.lgray};margin-bottom:1px;white-space:nowrap}
.mhd-val{font-size:28px;font-weight:800;letter-spacing:-.03em;white-space:nowrap}

.htbl{position:absolute;top:120px;left:${C.pad};right:${C.pad};bottom:48px;width:calc(100% - 160px);border-collapse:collapse;table-layout:fixed}
.htbl thead th{padding:7px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#fff;background:${C.dark};text-align:left;white-space:nowrap;height:32px}
.htbl thead th:last-child{text-align:right}
.htbl thead th:nth-child(1){width:14%}.htbl thead th:nth-child(2){width:34%}.htbl thead th:nth-child(3){width:30%}.htbl thead th:nth-child(4){width:22%}
.htbl tbody td{padding:10px;font-size:13px;color:${C.dark};border-bottom:1px solid ${C.border}!important;vertical-align:top;overflow:hidden}
.htbl tbody tr:last-child td{border-bottom:none!important}
.htbl tbody td:nth-child(4){text-align:right;vertical-align:middle}
.sk{display:flex;align-items:center;gap:8px}
.sk-ico{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.sk-nm{font-size:13px;font-weight:700;color:${C.dark}}
.ht{font-size:13px;color:${C.gray};line-height:1.45;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
.calc-block{font-size:13px;line-height:1.6;color:${C.lgray}}
.calc-block .bold{font-weight:700;color:${C.dark}}
.calc-block .key{color:${C.gray};font-weight:500}
.calc-res{font-size:13px;font-weight:600;color:${C.dark};margin:2px 0;display:block}
.sav-mon{font-size:12px;color:${C.gray};font-variant-numeric:tabular-nums;margin-bottom:2px}
.sav-ann{font-size:18px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.htot{position:absolute;bottom:0;left:0;right:0;height:48px;background:${C.dark};display:flex;align-items:center;justify-content:space-between;padding:0 ${C.pad}}
.htot-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.4)}
.htot-val{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
`;

const ISO_SVG = `<svg style="display:none"><symbol id="iso" viewBox="0 0 714 714" fill="none"><path d="M581.784 634.362C520.414 684.16 442.192 714 357 714C271.808 714 193.586 684.16 132.216 634.362C193.586 584.563 271.808 554.723 357 554.723C442.192 554.723 520.414 584.563 581.784 634.362Z" fill="#FF355E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M130.258 548.192C86.681 496.565 60.415 429.85 60.415 357C60.415 193.201 193.201 60.415 357 60.415C520.799 60.415 653.585 193.201 653.585 357C653.585 429.85 627.319 496.565 583.742 548.192C598.735 557.56 613.105 567.827 626.773 578.918L632.744 583.763C683.513 522.1 714 443.11 714 357C714 159.834 554.166 0 357 0C159.834 0 0 159.834 0 357C0 443.11 30.487 522.099 81.256 583.763L87.227 578.918C100.895 567.827 115.265 557.56 130.258 548.192Z" fill="#FF355E"/><path d="M488.815 346.015C488.815 418.815 429.8 477.831 357 477.831C284.2 477.831 225.185 418.815 225.185 346.015C225.185 273.216 284.2 214.2 357 214.2C429.8 214.2 488.815 273.216 488.815 346.015Z" fill="#FF355E"/></symbol></svg>`;
const ISO_USE = `<svg class="iso"><use href="#iso"/></svg>`;

// ── Slide generators ─────────────────────────────────

function coverSlide(data: RoiSlideData, t: DeckI18n, lang: string): string {
  const empLabel: Record<string, string> = { es: "empleados", en: "employees", fr: "employés" };
  const nameLen = data.company_name.length;
  const nameFontSize = nameLen > 40 ? 48 : nameLen > 28 ? 60 : 80;
  return `<div class="slide" style="background:#FF355E">
  <svg style="position:absolute;top:40px;right:48px;width:52px;height:52px;opacity:.3"><use href="#iso" style="fill:#fff"/></svg>
  <div style="position:absolute;top:48px;left:80px;font-size:15px;color:rgba(255,255,255,.55);font-weight:400">${escHtml(t.proposal)} · ${fmtMonth(lang)}</div>
  <div style="position:absolute;top:100px;left:80px;right:120px">
    <div style="font-size:${nameFontSize}px;font-weight:800;color:#fff;letter-spacing:-.04em;line-height:1.05">${escHtml(data.company_name)}</div>
  </div>
  <div style="position:absolute;top:320px;left:80px;max-width:580px">
    <div style="font-size:20px;color:rgba(255,255,255,.6);font-weight:400;line-height:1.5">${t.cover_subtitle} ${data.total_employees} ${empLabel[lang] ?? empLabel.es}.</div>
  </div>
  <div style="position:absolute;bottom:40px;left:80px;right:80px">
    <div style="border-top:1px solid rgba(255,255,255,.2)!important;padding-top:14px">
      <div style="font-size:13px;color:rgba(255,255,255,.35)">${t.confidential} · ${fmtMonth(lang)}</div>
    </div>
  </div>
</div>`;
}

function summarySlide(data: RoiSlideData, details: ModuleDetail[], t: DeckI18n, lang: string, totalSlides: number): string {
  const rawPer1 = data.annual_cost > 0 ? data.total_annual_savings / data.annual_cost : 0;
  const roiPer1 = rawPer1.toFixed(2).replace(".", ",");
  const totalH = details.reduce((s, d) => s + d.total_hours, 0);

  const titleTemplates: Record<string, string> = {
    es: `Factorial tiene un retorno de la inversión de <span style="color:#FF355E">${data.roi_percent}%</span><br>para ${escHtml(data.company_name)}`,
    en: `Factorial delivers a <span style="color:#FF355E">${data.roi_percent}%</span> return on investment<br>for ${escHtml(data.company_name)}`,
    fr: `Factorial offre un retour sur investissement de <span style="color:#FF355E">${data.roi_percent}%</span><br>pour ${escHtml(data.company_name)}`,
  };

  const moduleRows = details.map(d => {
    const hCol = d.tool_override
      ? `<td style="font-size:10px;color:#6C6C7D">${escHtml(d.tool_override.tool_name || t.tool_label)}</td>`
      : `<td>${Math.round(d.total_hours * 10) / 10} h</td>`;
    const desc = getModuleDesc(d.id, lang) || d.category_desc || d.name;
    return `<tr><td><span class="mdot" style="background:${d.color}"></span><strong>${escHtml(d.name)}</strong></td><td style="color:#6C6C7D">${escHtml(desc)}</td>${hCol}<td>${fmtEur(d.total_annual)}</td></tr>`;
  }).join("\n");

  return `<div class="slide" id="s1">
  ${ISO_USE}
  <div class="brand">${escHtml(t.proposal)}</div>
  <div style="position:absolute;top:52px;left:80px;right:80px">
    <div style="font-size:32px;font-weight:800;color:#25253D;letter-spacing:-.025em;line-height:1.1">${titleTemplates[lang] ?? titleTemplates.es}</div>
  </div>
  <div class="kpis" style="position:absolute;top:132px;left:0;right:0">
    <div class="kpi">
      <div class="kpi-lbl">${t.annual_savings}</div>
      <div class="kpi-val" style="color:#FF355E">${fmtEur(data.total_annual_savings)}</div>
      <div class="kpi-sub">${t.savings_vs_sub(fmtEur(data.annual_cost))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">${t.roi}</div>
      <div class="kpi-val" style="color:#25253D">${data.roi_percent}%</div>
      <div class="kpi-sub">${t.roi_sub("€" + roiPer1)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-lbl">${t.payback}</div>
      <div class="kpi-val" style="color:#25253D">${data.payback_months} m</div>
      <div class="kpi-sub">${t.payback_sub(String(data.payback_months))}</div>
    </div>
  </div>
  <div style="position:absolute;top:278px;left:80px;right:80px">
    <table class="btbl">
      <thead><tr><th style="width:20%">${t.module}</th><th style="width:40%">${t.what_is}</th><th style="width:16%">${t.h_month}</th><th style="width:24%;text-align:right">${t.savings_year}</th></tr></thead>
      <tbody>
        ${moduleRows}
        <tr class="btot"><td colspan="2">${t.total}</td><td style="text-align:center;font-weight:800">${Math.round(totalH * 10) / 10} h</td><td>${fmtEur(data.total_annual_savings)}</td></tr>
      </tbody>
    </table>
  </div>
  <div style="position:absolute;bottom:14px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:baseline">
    <span style="font-size:10px;color:#AEAEB8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:16px">${t.disclaimer(data.total_employees, data.hr_count, data.manager_count, data.onboardings)}</span>
    <span style="font-size:11px;color:#AEAEB8">2 / ${totalSlides}</span>
  </div>
</div>`;
}

function moduleSlide(detail: ModuleDetail, data: RoiSlideData, t: DeckI18n, lang: string, slideNum: number, totalSlides: number): string {
  const color = detail.color;

  if (detail.tool_override) {
    const fallbackTool: Record<string, string> = { es: "herramienta actual", en: "current tool", fr: "outil actuel" };
    const toolName = detail.tool_override.tool_name || (fallbackTool[lang] ?? fallbackTool.es);
    const monthlyCost = fmtEur(Math.round(detail.total_annual / 12));
    const moLabel = { es: "/mes", en: "/mo", fr: "/mois" }[lang] ?? "/mes";
    const yrLabel = { es: "/año", en: "/year", fr: "/an" }[lang] ?? "/año";
    return `<div class="slide">
  ${ISO_USE}
  <div class="brand">${escHtml(t.proposal)}</div>
  <div class="mhd">
    <div><div class="mhd-name" style="color:${color}">${escHtml(detail.name)}</div><div class="mhd-cat">${escHtml(detail.category_desc)}</div></div>
    <div class="mhd-r"><div class="mhd-lbl">${t.annual_savings}</div><div class="mhd-val" style="color:${color}">${fmtEur(detail.total_annual)}</div></div>
  </div>
  <div style="position:absolute;top:120px;left:80px;right:80px;bottom:48px;display:flex;flex-direction:column;justify-content:center;gap:40px">
    <div style="display:flex;align-items:center;justify-content:center;gap:48px">
      <div style="width:320px;padding:28px 32px;border-radius:12px;border:2px solid #E9E9EC!important;background:#fff">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#AEAEB8;margin-bottom:12px">${t.replaces_before}</div>
        <div style="font-size:18px;font-weight:700;color:#25253D;margin-bottom:6px">${escHtml(toolName)}</div>
        <div style="font-size:14px;color:#6C6C7D;margin-bottom:16px">${t.replaces_current_cost}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <span style="font-size:32px;font-weight:800;color:#25253D;letter-spacing:-.02em">${monthlyCost}</span>
          <span style="font-size:14px;color:#AEAEB8">${moLabel}</span>
        </div>
        <div style="font-size:13px;color:#AEAEB8;margin-top:4px">${fmtEur(detail.total_annual)} ${yrLabel}</div>
      </div>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M8 24h28M30 18l6 6-6 6" stroke="#FF355E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div style="width:320px;padding:28px 32px;border-radius:12px;border:2px solid #FF355E!important;background:rgba(255,53,94,.04)">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#FF355E;margin-bottom:12px">${t.replaces_after}</div>
        <div style="font-size:18px;font-weight:700;color:#25253D;margin-bottom:6px">${t.replaces_factorial} ${escHtml(detail.name)}</div>
        <div style="font-size:14px;color:#6C6C7D;margin-bottom:16px">${t.replaces_included}</div>
        <div style="display:flex;align-items:baseline;gap:8px">
          <span style="font-size:32px;font-weight:800;color:#FF355E;letter-spacing:-.02em">€0</span>
          <span style="font-size:14px;color:#AEAEB8">${t.replaces_extra}</span>
        </div>
      </div>
    </div>
    <div style="text-align:center;max-width:640px;margin:0 auto">
      <div style="font-size:15px;color:#25253D;line-height:1.6"><strong>${t.replaces_direct}: ${fmtEur(detail.total_annual)}/${t.year}</strong></div>
    </div>
  </div>
  <div class="htot"><span class="htot-lbl">${t.total_annual}</span><span class="htot-val">${fmtEur(detail.total_annual)}</span></div>
  <div style="position:absolute;bottom:56px;right:80px;font-size:10px;color:#AEAEB8">${slideNum} / ${totalSlides}</div>
</div>`;
  }

  const clamp = detail.rows.length <= 2 ? 6 : 4;
  const rowsHtml = detail.rows.map(r => {
    const ico = STAKEHOLDER_ICONS[r.stakeholder];
    const swLbl = scalesWithLabel(r.scales_with, lang);
    const isAnnual = r.scales_with === "onboardings";
    const hUnitLabel: Record<string, string> = { es: isAnnual ? "h/alta" : "h/mes", en: isAnnual ? "h/hire" : "h/month", fr: isAnnual ? "h/recrutement" : "h/mois" };
    const hUnit = `${r.hours_per_unit} ${hUnitLabel[lang] ?? hUnitLabel.es}`;
    const totalLabel = isAnnual ? `= ${Math.round(r.total_hours)} ${t.h_year_saved}` : `= ${Math.round(r.total_hours * 10) / 10} ${t.h_month_saved}`;
    const moLabel: Record<string, string> = { es: "/mes", en: "/mo", fr: "/mois" };
    const yrLabel: Record<string, string> = { es: "/año", en: "/year", fr: "/an" };
    const monthlySav = isAnnual ? fmtEur(Math.round(r.annual_savings / 12)) + ` ${moLabel[lang] ?? moLabel.es}` : fmtEur(Math.round(r.monthly_savings)) + ` ${moLabel[lang] ?? moLabel.es}`;
    return `<tr>
        <td><div class="sk"><div class="sk-ico" style="background:${ico.bg}">${ico.emoji}</div><div class="sk-nm">${stakeholderLabel(r.stakeholder, lang)}</div></div></td>
        <td><div class="ht" style="-webkit-line-clamp:${clamp}">${escHtml(r.description)}</div></td>
        <td><div class="calc-block"><div class="bold">${hUnit} ${t.per} ${swLbl.replace(/s$/, "")}</div><div class="key">× ${Math.round(r.count)} ${swLbl}</div><div class="calc-res">${totalLabel}</div><div>× ${fmtEur(r.hourly_cost)}/h ${t.hourly_cost}</div></div></td>
        <td><div class="sav-mon">${monthlySav}</div><div class="sav-ann" style="color:${color}">${fmtEur(Math.round(r.annual_savings))} ${yrLabel[lang] ?? yrLabel.es}</div></td>
      </tr>`;
  }).join("\n");

  return `<div class="slide">
  ${ISO_USE}
  <div class="brand">${escHtml(t.proposal)}</div>
  <div class="mhd">
    <div><div class="mhd-name" style="color:${color}">${escHtml(detail.name)}</div><div class="mhd-cat">${escHtml(detail.category_desc)}</div></div>
    <div class="mhd-r"><div class="mhd-lbl">${t.annual_savings}</div><div class="mhd-val" style="color:${color}">${fmtEur(detail.total_annual)}</div></div>
  </div>
  <table class="htbl">
    <thead><tr><th>${t.type_employee}</th><th>${t.hypothesis}</th><th>${t.assumption}</th><th>${t.estimated_saving}</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="htot"><span class="htot-lbl">${t.total_annual}</span><span class="htot-val">${fmtEur(detail.total_annual)}</span></div>
  <div style="position:absolute;bottom:56px;right:80px;font-size:10px;color:#AEAEB8">${slideNum} / ${totalSlides}</div>
</div>`;
}

// ── Public API ───────────────────────────────────────

export function generateDeckHtml(data: RoiSlideData, input: RoiSlideInput, mode: "summary" | "full"): string {
  const { uiLang, modLang } = resolveLangs(input.country);
  const t = getI18n(uiLang);
  const details = buildDetails(input, data, uiLang, modLang);
  const totalSlides = mode === "summary" ? 2 : 2 + details.length;

  let slides = coverSlide(data, t, uiLang) + "\n\n" + summarySlide(data, details, t, uiLang, totalSlides);

  if (mode === "full") {
    details.forEach((d, i) => {
      slides += "\n\n" + moduleSlide(d, data, t, uiLang, i + 3, totalSlides);
    });
  }

  return `<!DOCTYPE html>
<html lang="${uiLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280">
<title>ROI Deck — ${escHtml(data.company_name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap" rel="stylesheet">
<style>${DECK_CSS}</style>
</head>
<body>
${ISO_SVG}
${slides}
</body>
</html>`;
}

// ── PDF export (iframe → html2canvas → jsPDF) ────────

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
    const cssResp = await fetch("https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap");
    let css = await cssResp.text();
    const urlRe = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
    const urls = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = urlRe.exec(css)) !== null) urls.add(m[1]);
    await Promise.all([...urls].map(async (url) => {
      try {
        const resp = await fetch(url);
        const buf = await resp.arrayBuffer();
        const b64 = arrayBufferToBase64(buf);
        const mime = url.includes(".woff2") ? "font/woff2" : "font/woff";
        css = css.replaceAll(url, `data:${mime};base64,${b64}`);
      } catch { /* fallback to URL */ }
    }));
    cachedFontCss = css;
    return css;
  } catch { return ""; }
}

async function waitForFonts(iframe: HTMLIFrameElement): Promise<void> {
  const doc = iframe.contentDocument!;
  await Promise.race([doc.fonts.ready, new Promise(r => setTimeout(r, 2000))]);
  try { await Promise.race([doc.fonts.load("700 16px 'DM Sans'"), new Promise(r => setTimeout(r, 1000))]); } catch {}
  await new Promise(r => setTimeout(r, 100));
}

export async function generateDeckPdf(data: RoiSlideData, input: RoiSlideInput, mode: "summary" | "full"): Promise<void> {
  const [html2canvas, fontCss] = await Promise.all([loadHtml2Canvas(), getInlineFontCss()]);

  const html = generateDeckHtml(data, input, mode);

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1280px;height:720px;border:none;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  try {
    let srcdoc = html;
    if (fontCss) {
      srcdoc = srcdoc.replace(
        '<link href="https://fonts.googleapis.com/css2?family=DM+Sans',
        `<style>${fontCss}</style>\n<link href="https://fonts.googleapis.com/css2?family=DM+Sans`
      );
    }
    await new Promise<void>(resolve => { iframe.onload = () => resolve(); iframe.srcdoc = srcdoc; });
    await waitForFonts(iframe);

    const slides = iframe.contentDocument!.querySelectorAll(".slide") as NodeListOf<HTMLElement>;
    if (slides.length === 0) throw new Error("No slides found");

    const slideHtmls = Array.from(slides).map(s => s.outerHTML);

    const styleMatch = srcdoc.match(/<style>([\s\S]*?)<\/style>/g);
    const allStyles = styleMatch ? styleMatch.join("\n") : "";
    const svgDefs = ISO_SVG;

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1280, 720] });

    for (let i = 0; i < slideHtmls.length; i++) {
      if (i > 0) pdf.addPage([1280, 720], "landscape");

      const singleSlideDoc = `<!DOCTYPE html><html><head>${allStyles}</head><body style="margin:0;padding:0;width:1280px;height:720px;overflow:hidden">${svgDefs}${slideHtmls[i]}</body></html>`;
      iframe.contentDocument!.open();
      iframe.contentDocument!.write(singleSlideDoc);
      iframe.contentDocument!.close();

      iframe.contentDocument!.body.offsetHeight;
      await new Promise(r => setTimeout(r, 120));

      const slide = iframe.contentDocument!.querySelector(".slide") as HTMLElement;
      if (!slide) continue;

      slide.style.position = "relative";
      slide.style.opacity = "1";

      const canvas = await html2canvas(slide, {
        width: 1280, height: 720, scale: 2,
        useCORS: true, logging: false, backgroundColor: "#F9F9FB",
        windowWidth: 1280, windowHeight: 720,
        foreignObjectRendering: true,
      });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 1280, 720);
    }

    const suffix = mode === "summary" ? "1-Pager" : "Full";
    pdf.save(`ROI-${suffix}-${data.company_name || "report"}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}
