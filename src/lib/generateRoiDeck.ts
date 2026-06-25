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
    it: { employee: "Dipendenti", hr: "Admin HR", manager: "Manager" },
    de: { employee: "Mitarbeiter", hr: "HR-Admin", manager: "Manager" },
    pt: { employee: "Colaboradores", hr: "Admin RH", manager: "Gestores" },
  };
  return (labels[lang] ?? labels.es)[s];
}

function scalesWithLabel(sw: string, lang: string): string {
  const labels: Record<string, Record<string, string>> = {
    es: { employees: "empleados", hr_ftes: "admins", managers: "managers", onboardings: "altas al año", submitters: "submitters" },
    en: { employees: "employees", hr_ftes: "admins", managers: "managers", onboardings: "hires/year", submitters: "submitters" },
    fr: { employees: "employés", hr_ftes: "admins", managers: "managers", onboardings: "recrutements/an", submitters: "soumetteurs" },
    it: { employees: "dipendenti", hr_ftes: "admin", managers: "manager", onboardings: "assunzioni/anno", submitters: "submitter" },
    de: { employees: "Mitarbeiter", hr_ftes: "Admins", managers: "Manager", onboardings: "Einstellungen/Jahr", submitters: "Einreicher" },
    pt: { employees: "colaboradores", hr_ftes: "admins", managers: "gestores", onboardings: "contratações/ano", submitters: "submetedores" },
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
  it: {
    core: "Gestione centralizzata dipendenti e onboarding automatico",
    time_tracking: "Timbratura digitale e registro presenze",
    time_off: "Gestione ferie, permessi e assenze",
    time_planning: "Pianificazione turni e rotazioni",
    payroll: "Sincronizzazione automatica con il provider paghe",
    expenses: "Cattura OCR e approvazione note spese",
    recruitment: "ATS per la gestione dei processi di selezione",
    performance: "Valutazioni delle performance e obiettivi",
    trainings: "Gestione formazione e sviluppo",
    compensations: "Revisioni salariali e fasce retributive",
    engagement: "Sondaggi di clima ed engagement",
    procurement: "Gestione acquisti e fornitori",
    projects: "Monitoraggio progetti e costi",
    complaints: "Canale di segnalazione e conformità",
    benefits: "Anticipo stipendio e benefit flessibili",
    benefits_standard: "Benefit flessibili e retribuzione",
    headcount_planning: "Pianificazione organico",
    lms: "Piattaforma di apprendimento online",
    space: "Gestione spazi e prenotazione postazioni",
    it_inventory: "Inventario IT e provisioning",
    one: "Assistente HR con intelligenza artificiale",
    integration_business_central: "Integrazione con Business Central",
    integration_netsuite: "Integrazione con NetSuite",
    integration_sage_200: "Integrazione con Sage 200",
    integration_milena: "Integrazione con Milena",
    integration_suprema_xiptic: "Integrazione con Suprema/Xiptic",
    silae: "Integrazione con SILAE",
  },
  de: {
    core: "Zentrale Mitarbeiterverwaltung und automatisiertes Onboarding",
    time_tracking: "Digitale Zeiterfassung und Anwesenheit",
    time_off: "Urlaubs- und Abwesenheitsmanagement",
    time_planning: "Schichtplanung und Dienstpläne",
    payroll: "Automatische Synchronisation mit dem Lohnanbieter",
    expenses: "OCR-Erfassung und Spesenfreigabe",
    recruitment: "ATS für Bewerbermanagement",
    performance: "Leistungsbeurteilungen und Zielvereinbarungen",
    trainings: "Schulungs- und Weiterbildungsmanagement",
    compensations: "Gehaltsüberprüfungen und Vergütungsbänder",
    engagement: "Mitarbeiterbefragungen und Engagement",
    procurement: "Einkaufs- und Lieferantenmanagement",
    projects: "Projekt-Tracking und Kostenerfassung",
    complaints: "Hinweisgebersystem und Compliance",
    benefits: "Gehaltsvorschuss und flexible Benefits",
    benefits_standard: "Flexible Benefits und Vergütung",
    headcount_planning: "Personalplanung",
    lms: "Online-Lernplattform",
    space: "Raummanagement und Schreibtischbuchung",
    it_inventory: "IT-Inventar und Gerätebereitstellung",
    one: "KI-gestützter HR-Assistent",
    integration_business_central: "Integration mit Business Central",
    integration_netsuite: "Integration mit NetSuite",
    integration_sage_200: "Integration mit Sage 200",
    integration_milena: "Integration mit Milena",
    integration_suprema_xiptic: "Integration mit Suprema/Xiptic",
    silae: "Integration mit SILAE",
  },
  pt: {
    core: "Gestão centralizada de colaboradores e onboarding automático",
    time_tracking: "Registo de ponto digital e controlo de presença",
    time_off: "Gestão de férias, licenças e ausências",
    time_planning: "Planeamento de turnos e escalas",
    payroll: "Sincronização automática com o provedor de vencimentos",
    expenses: "Captura OCR e aprovação de notas de despesas",
    recruitment: "ATS para gestão de processos de recrutamento",
    performance: "Avaliações de desempenho e objetivos",
    trainings: "Gestão de formação e desenvolvimento",
    compensations: "Revisões salariais e bandas de remuneração",
    engagement: "Inquéritos de clima e engagement",
    procurement: "Gestão de compras e fornecedores",
    projects: "Acompanhamento de projetos e custos",
    complaints: "Canal de denúncias e conformidade",
    benefits: "Adiantamento salarial e benefícios flexíveis",
    headcount_planning: "Planeamento de headcount",
    lms: "Plataforma de aprendizagem online",
    space: "Gestão de espaços e reservas",
    it_inventory: "Inventário de TI e aprovisionamento",
    one: "Assistente de RH com IA",
    benefits_standard: "Benefícios e retribuição flexível",
    integration_business_central: "Integração com Business Central",
    integration_netsuite: "Integração com NetSuite",
    integration_sage_200: "Integração com Sage 200",
    integration_milena: "Integração com Milena",
    integration_suprema_xiptic: "Integração com Suprema/Xiptic",
    silae: "Integração com SILAE",
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
  if (c === "IT") return { uiLang: "it", modLang: "en" };
  if (c === "DE") return { uiLang: "de", modLang: "en" };
  if (c === "PT") return { uiLang: "pt", modLang: "en" };
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
  // Custom descriptions are AI-generated in EN/ES from Modjo transcripts.
  // For other languages use the localized descriptions instead.
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
      if (hours[s] === 0) continue;
      const count = entry ? getCountForEntry(entry, multipliers) : headcounts[s];
      const th = hours[s] * count;
      const ms = th * hourly_costs[s];
      const descArr = customDescs?.[modId]?.[s] ?? descs[modId]?.[s] ?? [];
      // Generic fallback per stakeholder × language so no row is ever empty
      const genericFallback: Record<string, Record<string, string>> = {
        es: { employee: "Factorial automatiza este proceso, ahorrando tiempo a cada persona del equipo.", hr: "Factorial elimina tareas manuales repetitivas del equipo de RRHH.", manager: "Factorial reduce el tiempo de gestión y seguimiento para los responsables." },
        en: { employee: "Factorial automates this process, saving time for each team member.", hr: "Factorial eliminates repetitive manual tasks for the HR team.", manager: "Factorial reduces management and tracking time for team leads." },
        fr: { employee: "Factorial automatise ce processus, économisant du temps à chaque membre de l'équipe.", hr: "Factorial élimine les tâches manuelles répétitives pour l'équipe RH.", manager: "Factorial réduit le temps de gestion et de suivi pour les responsables." },
        it: { employee: "Factorial automatizza questo processo, risparmiando tempo a ogni membro del team.", hr: "Factorial elimina le attività manuali ripetitive per il team HR.", manager: "Factorial riduce i tempi di gestione e monitoraggio per i responsabili." },
        de: { employee: "Factorial automatisiert diesen Prozess und spart jedem Teammitglied Zeit.", hr: "Factorial eliminiert repetitive manuelle Aufgaben für das HR-Team.", manager: "Factorial reduziert den Verwaltungs- und Nachverfolgungsaufwand für Führungskräfte." },
        pt: { employee: "Factorial automatiza este processo, poupando tempo a cada membro da equipa.", hr: "Factorial elimina tarefas manuais repetitivas para a equipa de RH.", manager: "Factorial reduz o tempo de gestão e acompanhamento para os responsáveis." },
      };
      const fallback = (genericFallback[uiLang] ?? genericFallback.en)[s] ?? "";
      rows.push({
        stakeholder: s,
        hours_per_unit: hours[s],
        count,
        scales_with: entry?.scales_with ?? (s === "employee" ? "employees" : s === "hr" ? "hr_ftes" : "managers"),
        total_hours: th,
        hourly_cost: hourly_costs[s],
        monthly_savings: ms,
        annual_savings: ms * 12,
        description: descArr[0] ?? fallback,
      });
      totalH += th;
    }

    const rowsTotal = rows.reduce((s, r) => s + r.annual_savings, 0);
    details.push({
      id: modId,
      name,
      color,
      category_desc: catDesc,
      rows,
      total_hours: totalH,
      total_annual: rows.length > 0 ? Math.round(rowsTotal) : slideModule.annual_savings,
    });
  }
  return details;
}

// ── i18n ─────────────────────────────────────────────
interface DeckI18n {
  proposal: string; cover_subtitle: string; confidential: string;
  annual_savings: string; roi: string; payback: string;
  roi_sub: (v: string) => string; payback_sub: (m: string) => string; savings_vs_sub: (cost: string) => string; savings_vs_label: string; savings_vs_detail: string;
  what_is: string; module: string; description: string; h_month: string; savings_year: string;
  total: string; tool_label: string;
  type_employee: string; hypothesis: string; assumption: string; estimated_saving: string;
  total_annual: string;
  replaces_before: string; replaces_after: string; replaces_current_cost: string;
  replaces_factorial: string; replaces_included: string; replaces_included_plan: string; replaces_direct: string; replaces_extra: string;
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
      savings_vs_sub: c => `frente a ${c}/año de inversión<br>en Factorial`, savings_vs_label: "Inversión Factorial:", savings_vs_detail: "coste anual de la plataforma",
      what_is: "Qué es", module: "Módulo", description: "Descripción", h_month: "Ahorro al mes", savings_year: "Ahorro / año",
      total: "Total ahorros anuales estimados", tool_label: "Herram.",
      type_employee: "Tipo de empleado", hypothesis: "Hipótesis de ahorro", assumption: "Asunción y cálculo", estimated_saving: "Ahorro estimado",
      total_annual: "Total ahorro anual",
      replaces_before: "Antes", replaces_after: "Después", replaces_current_cost: "Coste actual",
      replaces_factorial: "Factorial", replaces_included: "Incluido en el plan contratado", replaces_included_plan: "Incluido con tu plan",
      replaces_direct: "Ahorro directo", replaces_extra: "adicional",
      disclaimer: (e, h, m, o) => `Estimación basada en ${e} empleados · ${h} admin RRHH · ${m} managers · ${o} altas/año`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/año ahorradas", h_month_saved: "h/mes ahorradas", per: "por", hourly_cost: "coste horario", year: "año",
    },
    en: {
      proposal: "Factorial ROI Proposal", cover_subtitle: "From manual processes to a centralized platform for your",
      confidential: "Confidential",
      annual_savings: "Estimated annual savings", roi: "Annual ROI", payback: "Payback",
      roi_sub: v => `for every €1 invested<br>you get back ${v}`,
      payback_sub: m => `investment recovered<br>in ${m} months`,
      savings_vs_sub: c => `vs. ${c}/year investment<br>in Factorial`, savings_vs_label: "Factorial investment:", savings_vs_detail: "annual platform cost",
      what_is: "What it is", module: "Module", description: "Description", h_month: "Monthly savings", savings_year: "Savings / year",
      total: "Total estimated annual savings", tool_label: "Tool",
      type_employee: "Employee type", hypothesis: "Savings hypothesis", assumption: "Assumption & calculation", estimated_saving: "Estimated savings",
      total_annual: "Total annual savings",
      replaces_before: "Before", replaces_after: "After", replaces_current_cost: "Current cost",
      replaces_factorial: "Factorial", replaces_included: "Included in your plan", replaces_included_plan: "Included with your plan",
      replaces_direct: "Direct savings", replaces_extra: "additional",
      disclaimer: (e, h, m, o) => `Estimate based on ${e} employees · ${h} HR admin · ${m} managers · ${o} hires/year`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/year saved", h_month_saved: "h/month saved", per: "per", hourly_cost: "hourly cost", year: "year",
    },
    fr: {
      proposal: "Proposition ROI Factorial", cover_subtitle: "Des processus manuels à une plateforme centralisée pour vos",
      confidential: "Confidentiel",
      annual_savings: "Économies annuelles estimées", roi: "ROI annuel", payback: "Payback",
      roi_sub: v => `pour chaque €1 investi<br>vous récupérez ${v}`,
      payback_sub: m => `investissement récupéré<br>en ${m} mois`,
      savings_vs_sub: c => `contre ${c}/an d'investissement<br>dans Factorial`, savings_vs_label: "Investissement Factorial :", savings_vs_detail: "coût annuel de la plateforme",
      what_is: "Description", module: "Module", description: "Description", h_month: "Économies mensuelles", savings_year: "Économies / an",
      total: "Total économies annuelles estimées", tool_label: "Outil",
      type_employee: "Type d'employé", hypothesis: "Hypothèse d'économie", assumption: "Hypothèse et calcul", estimated_saving: "Économie estimée",
      total_annual: "Total économies annuelles",
      replaces_before: "Avant", replaces_after: "Après", replaces_current_cost: "Coût actuel",
      replaces_factorial: "Factorial", replaces_included: "Inclus dans votre plan", replaces_included_plan: "Inclus avec votre plan",
      replaces_direct: "Économie directe", replaces_extra: "supplémentaire",
      disclaimer: (e, h, m, o) => `Estimation basée sur ${e} employés · ${h} admin RH · ${m} managers · ${o} recrutements/an`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/an économisées", h_month_saved: "h/mois économisées", per: "par", hourly_cost: "coût horaire", year: "an",
    },
    it: {
      proposal: "Proposta ROI Factorial", cover_subtitle: "Da processi manuali a una piattaforma centralizzata per i tuoi",
      confidential: "Confidenziale",
      annual_savings: "Risparmio annuale stimato", roi: "ROI annuale", payback: "Payback",
      roi_sub: v => `per ogni €1 investito<br>recuperi ${v}`,
      payback_sub: m => `l'investimento si recupera<br>in ${m} mesi`,
      savings_vs_sub: c => `rispetto a ${c}/anno di investimento<br>in Factorial`, savings_vs_label: "Investimento Factorial:", savings_vs_detail: "costo annuale della piattaforma",
      what_is: "Descrizione", module: "Modulo", description: "Descrizione", h_month: "Risparmio mensile", savings_year: "Risparmio / anno",
      total: "Totale risparmi annuali stimati", tool_label: "Strumento",
      type_employee: "Tipo di dipendente", hypothesis: "Ipotesi di risparmio", assumption: "Assunzione e calcolo", estimated_saving: "Risparmio stimato",
      total_annual: "Totale risparmio annuale",
      replaces_before: "Prima", replaces_after: "Dopo", replaces_current_cost: "Costo attuale",
      replaces_factorial: "Factorial", replaces_included: "Incluso nel piano sottoscritto", replaces_included_plan: "Incluso con il tuo piano",
      replaces_direct: "Risparmio diretto", replaces_extra: "aggiuntivo",
      disclaimer: (e, h, m, o) => `Stima basata su ${e} dipendenti · ${h} admin HR · ${m} manager · ${o} assunzioni/anno`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/anno risparmiate", h_month_saved: "h/mese risparmiate", per: "per", hourly_cost: "costo orario", year: "anno",
    },
    de: {
      proposal: "Factorial ROI-Vorschlag", cover_subtitle: "Von manuellen Prozessen zu einer zentralen Plattform für Ihre",
      confidential: "Vertraulich",
      annual_savings: "Geschätzte jährliche Einsparungen", roi: "Jährlicher ROI", payback: "Payback",
      roi_sub: v => `für jeden investierten €1<br>erhalten Sie ${v} zurück`,
      payback_sub: m => `die Investition amortisiert sich<br>in ${m} Monaten`,
      savings_vs_sub: c => `gegenüber ${c}/Jahr Investition<br>in Factorial`, savings_vs_label: "Factorial-Investition:", savings_vs_detail: "jährliche Plattformkosten",
      what_is: "Beschreibung", module: "Modul", description: "Beschreibung", h_month: "Monatliche Einsparung", savings_year: "Einsparung / Jahr",
      total: "Geschätzte jährliche Gesamteinsparungen", tool_label: "Tool",
      type_employee: "Mitarbeitertyp", hypothesis: "Einsparungshypothese", assumption: "Annahme und Berechnung", estimated_saving: "Geschätzte Einsparung",
      total_annual: "Jährliche Gesamteinsparung",
      replaces_before: "Vorher", replaces_after: "Nachher", replaces_current_cost: "Aktuelle Kosten",
      replaces_factorial: "Factorial", replaces_included: "Im gebuchten Plan enthalten", replaces_included_plan: "In Ihrem Plan enthalten",
      replaces_direct: "Direkte Einsparung", replaces_extra: "zusätzlich",
      disclaimer: (e, h, m, o) => `Schätzung basierend auf ${e} Mitarbeitern · ${h} HR-Admins · ${m} Managern · ${o} Einstellungen/Jahr`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/Jahr eingespart", h_month_saved: "h/Monat eingespart", per: "pro", hourly_cost: "Stundenkosten", year: "Jahr",
    },
    pt: {
      proposal: "Proposta ROI Factorial", cover_subtitle: "De processos manuais a uma plataforma centralizada para os seus",
      confidential: "Confidencial",
      annual_savings: "Poupança anual estimada", roi: "ROI anual", payback: "Payback",
      roi_sub: v => `por cada €1 investido<br>recupera ${v}`,
      payback_sub: m => `o investimento recupera-se<br>em ${m} meses`,
      savings_vs_sub: c => `face a ${c}/ano de investimento<br>no Factorial`, savings_vs_label: "Investimento Factorial:", savings_vs_detail: "custo anual da plataforma",
      what_is: "Descrição", module: "Módulo", description: "Descrição", h_month: "Poupança mensal", savings_year: "Poupança / ano",
      total: "Total poupanças anuais estimadas", tool_label: "Ferramenta",
      type_employee: "Tipo de colaborador", hypothesis: "Hipótese de poupança", assumption: "Estimativa e cálculo", estimated_saving: "Poupança estimada",
      total_annual: "Total poupança anual",
      replaces_before: "Antes", replaces_after: "Depois", replaces_current_cost: "Custo atual",
      replaces_factorial: "Factorial", replaces_included: "Incluído no plano contratado", replaces_included_plan: "Incluído com o seu plano",
      replaces_direct: "Poupança direta", replaces_extra: "adicional",
      disclaimer: (e, h, m, o) => `Estimativa baseada em ${e} colaboradores · ${h} admin RH · ${m} gestores · ${o} contratações/ano`,
      ae_title: "Account Executive · Factorial",
      h_year_saved: "h/ano poupadas", h_month_saved: "h/mês poupadas", per: "por", hourly_cost: "custo horário", year: "ano",
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
    it: ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"],
    de: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
    pt: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
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
.kpi-val{font-size:48px;font-weight:800;letter-spacing:-.04em;line-height:1}
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
.btbl .btot td:last-child{font-size:17px;color:${C.coral}}
.mdot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:8px;vertical-align:middle}

.mhd{position:absolute;top:48px;left:0;right:0;min-height:72px;display:flex;align-items:center;justify-content:space-between;padding:8px ${C.pad};border-bottom:1px solid ${C.border}!important}
.mhd-name{font-size:24px;font-weight:800;letter-spacing:-.025em;white-space:nowrap}
.mhd-cat{font-size:12px;color:${C.lgray};font-weight:500;margin-top:2px;white-space:nowrap}
.mhd-r{text-align:right;flex-shrink:0;margin-left:24px}
.mhd-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${C.lgray};margin-bottom:1px;white-space:nowrap}
.mhd-val{font-size:32px;font-weight:800;letter-spacing:-.03em;white-space:nowrap}

.htbl{position:absolute;top:120px;left:${C.pad};right:${C.pad};bottom:48px;width:calc(100% - 160px);border-collapse:collapse;table-layout:fixed}
.htbl thead th{padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#fff;background:${C.dark};text-align:left;white-space:nowrap;height:40px}
.htbl thead th:last-child{text-align:right}
.htbl thead th:nth-child(1){width:17%}.htbl thead th:nth-child(2){width:33%}.htbl thead th:nth-child(3){width:28%}.htbl thead th:nth-child(4){width:22%}
.htbl tbody td{padding:14px 12px;font-size:13px;color:${C.dark};border-bottom:1px solid ${C.border}!important;vertical-align:top;overflow:hidden}
.htbl tbody tr:last-child td{border-bottom:none!important}
.htbl tbody td:nth-child(4){text-align:right;vertical-align:middle}
.sk{display:flex;align-items:center;gap:10px}
.sk-ico{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.sk-nm{font-size:14px;font-weight:800;color:${C.dark};letter-spacing:-.01em}
.ht{font-size:12px;color:${C.gray};line-height:1.5}
.calc-block{font-size:12px;line-height:1.7;color:${C.lgray}}
.calc-step{display:flex;align-items:baseline;gap:6px;margin-bottom:1px}
.calc-step .cl{font-size:11px;color:${C.lgray};min-width:14px}
.calc-step .cv{font-size:13px;font-weight:700;color:${C.dark}}
.calc-step .cm{font-size:12px;color:${C.gray}}
.calc-res{font-size:13px;font-weight:700;color:${C.dark};margin:3px 0 1px;padding:3px 0;border-top:1px solid ${C.border};display:block}
.calc-cost{font-size:11px;color:${C.lgray}}
.sav-mon{font-size:12px;color:${C.gray};font-variant-numeric:tabular-nums;margin-bottom:3px}
.sav-ann{font-size:22px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.htot{position:absolute;bottom:0;left:0;right:0;height:48px;background:${C.dark};display:flex;align-items:center;justify-content:space-between;padding:0 ${C.pad}}
.htot-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.4)}
.htot-val{font-size:26px;font-weight:800;color:#fff;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
`;

const ISO_SVG = `<svg style="display:none"><symbol id="iso" viewBox="0 0 714 714" fill="none"><path d="M581.784 634.362C520.414 684.16 442.192 714 357 714C271.808 714 193.586 684.16 132.216 634.362C193.586 584.563 271.808 554.723 357 554.723C442.192 554.723 520.414 584.563 581.784 634.362Z" fill="#FF355E"/><path fill-rule="evenodd" clip-rule="evenodd" d="M130.258 548.192C86.681 496.565 60.415 429.85 60.415 357C60.415 193.201 193.201 60.415 357 60.415C520.799 60.415 653.585 193.201 653.585 357C653.585 429.85 627.319 496.565 583.742 548.192C598.735 557.56 613.105 567.827 626.773 578.918L632.744 583.763C683.513 522.1 714 443.11 714 357C714 159.834 554.166 0 357 0C159.834 0 0 159.834 0 357C0 443.11 30.487 522.099 81.256 583.763L87.227 578.918C100.895 567.827 115.265 557.56 130.258 548.192Z" fill="#FF355E"/><path d="M488.815 346.015C488.815 418.815 429.8 477.831 357 477.831C284.2 477.831 225.185 418.815 225.185 346.015C225.185 273.216 284.2 214.2 357 214.2C429.8 214.2 488.815 273.216 488.815 346.015Z" fill="#FF355E"/></symbol></svg>`;
const ISO_USE = `<svg class="iso"><use href="#iso"/></svg>`;

// ── Slide generators ─────────────────────────────────

function coverSlide(data: RoiSlideData, t: DeckI18n, lang: string): string {
  const empLabel: Record<string, string> = { es: "empleados", en: "employees", fr: "employés", it: "dipendenti", de: "Mitarbeiter", pt: "colaboradores" };
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
    it: `Factorial offre un ritorno sull'investimento del <span style="color:#FF355E">${data.roi_percent}%</span><br>per ${escHtml(data.company_name)}`,
    de: `Factorial liefert eine Kapitalrendite von <span style="color:#FF355E">${data.roi_percent}%</span><br>für ${escHtml(data.company_name)}`,
    pt: `Factorial tem um retorno sobre o investimento de <span style="color:#FF355E">${data.roi_percent}%</span><br>para ${escHtml(data.company_name)}`,
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
      <div style="font-size:14px;font-weight:700;color:#25253D;margin-top:8px">${t.savings_vs_label} ${fmtEur(data.annual_cost)}/${t.year}</div>
      <div class="kpi-sub">${t.savings_vs_detail}</div>
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
  <div style="position:absolute;bottom:14px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:10px;color:#AEAEB8;white-space:nowrap">${t.disclaimer(data.total_employees, data.hr_count, data.manager_count, data.onboardings)}</span>
    <span style="font-size:11px;color:#AEAEB8;flex-shrink:0;margin-left:16px;white-space:nowrap;letter-spacing:.02em">2&nbsp;/&nbsp;${totalSlides}</span>
  </div>
</div>`;
}

function moduleSlide(detail: ModuleDetail, data: RoiSlideData, t: DeckI18n, lang: string, slideNum: number, totalSlides: number): string {
  const color = detail.color;

  if (detail.tool_override) {
    const fallbackTool: Record<string, string> = { es: "herramienta actual", en: "current tool", fr: "outil actuel", it: "strumento attuale", de: "aktuelles Tool", pt: "ferramenta atual" };
    const toolName = detail.tool_override.tool_name || (fallbackTool[lang] ?? fallbackTool.es);
    const monthlyCost = fmtEur(Math.round(detail.total_annual / 12));
    const moLabel = { es: "/mes", en: "/mo", fr: "/mois", it: "/mese", de: "/Monat", pt: "/mês" }[lang] ?? "/mes";
    const yrLabel = { es: "/año", en: "/year", fr: "/an", it: "/anno", de: "/Jahr", pt: "/ano" }[lang] ?? "/año";
    return `<div class="slide">
  ${ISO_USE}
  <div class="brand">${escHtml(t.proposal)}</div>
  <div class="mhd">
    <div><div class="mhd-name" style="color:${color}">${escHtml(detail.name)}</div><div class="mhd-cat">${escHtml(detail.category_desc)}</div></div>
    <div class="mhd-r"><div class="mhd-lbl">${t.annual_savings}</div><div class="mhd-val" style="color:${color}">${fmtEur(detail.total_annual)}</div></div>
  </div>
  <div style="position:absolute;top:120px;left:80px;right:80px;bottom:48px;display:flex;flex-direction:column;justify-content:center;gap:40px">
    <div style="display:flex;align-items:stretch;justify-content:center;gap:48px">
      <div style="width:320px;padding:28px 32px;border-radius:12px;border:2px solid #E9E9EC!important;background:#fff;display:flex;flex-direction:column">
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
      <div style="width:320px;padding:28px 32px;border-radius:12px;border:2px solid #FF355E!important;background:rgba(255,53,94,.04);display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#FF355E;margin-bottom:12px">${t.replaces_after}</div>
        <div style="font-size:18px;font-weight:700;color:#25253D;margin-bottom:6px">${t.replaces_factorial} ${escHtml(detail.name)}</div>
        <div style="font-size:22px;font-weight:800;color:#FF355E;margin-top:20px">${t.replaces_included_plan}</div>
      </div>
    </div>
    <div style="text-align:center;max-width:640px;margin:0 auto">
      <div style="font-size:15px;color:#25253D;line-height:1.6"><strong>${t.replaces_direct}: ${fmtEur(detail.total_annual)}/${t.year}</strong></div>
    </div>
  </div>
  <div class="htot"><span class="htot-lbl">${t.total_annual}</span><span class="htot-val">${fmtEur(detail.total_annual)}</span></div>
  <div style="position:absolute;bottom:56px;right:82px;font-size:11px;color:#AEAEB8;white-space:nowrap;letter-spacing:.02em">${slideNum}&nbsp;/&nbsp;${totalSlides}</div>
</div>`;
  }

  const rowsHtml = detail.rows.map(r => {
    const ico = STAKEHOLDER_ICONS[r.stakeholder];
    const swLbl = scalesWithLabel(r.scales_with, lang);
    const isAnnual = r.scales_with === "onboardings";
    const hUnitLabel: Record<string, string> = { es: isAnnual ? "h/alta" : "h/mes", en: isAnnual ? "h/hire" : "h/month", fr: isAnnual ? "h/recrutement" : "h/mois", it: isAnnual ? "h/assunzione" : "h/mese", de: isAnnual ? "h/Einstellung" : "h/Monat", pt: isAnnual ? "h/contratação" : "h/mês" };
    const hUnit = `${r.hours_per_unit} ${hUnitLabel[lang] ?? hUnitLabel.es}`;
    const totalLabel = isAnnual ? `= ${Math.round(r.total_hours * 12)} ${t.h_year_saved}` : `= ${Math.round(r.total_hours * 10) / 10} ${t.h_month_saved}`;
    const moLabel: Record<string, string> = { es: "/mes", en: "/mo", fr: "/mois", it: "/mese", de: "/Monat", pt: "/mês" };
    const yrLabel: Record<string, string> = { es: "/año", en: "/year", fr: "/an", it: "/anno", de: "/Jahr", pt: "/ano" };
    const monthlySav = isAnnual ? fmtEur(Math.round(r.annual_savings / 12)) + ` ${moLabel[lang] ?? moLabel.es}` : fmtEur(Math.round(r.monthly_savings)) + ` ${moLabel[lang] ?? moLabel.es}`;
    const skColors: Record<string, string> = { employee: "#3B82F6", hr: "#10B981", manager: "#F59E0B" };
    const skColor = skColors[r.stakeholder] ?? "#6B7280";
    return `<tr style="border-left:3px solid ${skColor}!important">
        <td style="padding-left:14px!important">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="width:36px;height:36px;border-radius:10px;background:${ico.bg};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${ico.emoji}</div>
            <div>
              <div style="font-size:14px;font-weight:800;color:#25253D;letter-spacing:-.01em;line-height:1.2;white-space:nowrap">${stakeholderLabel(r.stakeholder, lang)}</div>
              <div style="font-size:10px;font-weight:600;color:#AEAEB8;margin-top:2px;text-transform:uppercase;letter-spacing:.04em">${isAnnual ? Math.round(r.count * 12) : Math.round(r.count)} ${swLbl}</div>
            </div>
          </div>
        </td>
        <td><div class="ht">${escHtml(r.description)}</div></td>
        <td>
          <div style="font-size:14px;font-weight:800;color:#25253D">${r.hours_per_unit} ${hUnitLabel[lang] ?? hUnitLabel.es} <span style="font-size:12px;font-weight:400;color:#6C6C7D">${t.per} ${swLbl.replace(/s$/, "")}</span></div>
          <div style="font-size:12px;color:#6C6C7D;margin:3px 0">× ${isAnnual ? Math.round(r.count * 12) : Math.round(r.count)} ${swLbl}</div>
          <div style="font-size:14px;font-weight:800;color:#25253D;margin:5px 0 3px;padding-top:5px;border-top:1px solid #E9E9EC">${totalLabel}</div>
          <div style="font-size:11px;color:#AEAEB8">× ${fmtEur(r.hourly_cost)}/h ${t.hourly_cost}</div>
        </td>
        <td>
          <div style="font-size:12px;color:#6C6C7D;margin-bottom:3px">${monthlySav}</div>
          <div style="font-size:24px;font-weight:800;letter-spacing:-.02em;color:${color};font-variant-numeric:tabular-nums">${fmtEur(Math.round(r.annual_savings))} ${yrLabel[lang] ?? yrLabel.es}</div>
        </td>
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
  <div style="position:absolute;bottom:56px;right:82px;font-size:11px;color:#AEAEB8;white-space:nowrap;letter-spacing:.02em">${slideNum}&nbsp;/&nbsp;${totalSlides}</div>
</div>`;
}

// ── XL Slides (split slide 2 into 2+3) ──────────────

function xlSummarySlide2(data: RoiSlideData, details: ModuleDetail[], t: DeckI18n, lang: string, totalSlides: number, extraHourDetails: ModuleDetail[] = []): string {
  const rawPer1 = data.annual_cost > 0 ? data.total_annual_savings / data.annual_cost : 0;
  const roiPer1 = rawPer1.toFixed(2).replace(".", ",");
  const toolDetails = details.filter(d => d.tool_override);
  // "ambos" hour details show in the hours column too
  const hourDetails = [...details.filter(d => !d.tool_override), ...extraHourDetails];
  const totalH = hourDetails.reduce((s, d) => s + d.total_hours, 0);
  const toolTotal = toolDetails.reduce((s, d) => s + d.total_annual, 0);
  const hourTotal = hourDetails.reduce((s, d) => s + d.total_annual, 0);

  const xl18n: Record<string, { tools: string; hours: string; replaces: string; total_tools: string; total_hours: string; saved_month: string }> = {
    es: { tools: "Ahorro por herramientas reemplazadas", hours: "Ahorro por automatización de horas", replaces: "Reemplazado por", total_tools: "Total herramientas", total_hours: "Total horas ahorradas", saved_month: "h/mes" },
    en: { tools: "Tool replacement savings", hours: "Hours automation savings", replaces: "Replaced by", total_tools: "Total tools", total_hours: "Total hours saved", saved_month: "h/month" },
    fr: { tools: "Économies sur outils remplacés", hours: "Économies par automatisation des heures", replaces: "Remplacé par", total_tools: "Total outils", total_hours: "Total heures économisées", saved_month: "h/mois" },
    it: { tools: "Risparmio su strumenti sostituiti", hours: "Risparmio per automazione ore", replaces: "Sostituito da", total_tools: "Totale strumenti", total_hours: "Totale ore risparmiate", saved_month: "h/mese" },
    de: { tools: "Einsparung durch ersetzte Tools", hours: "Einsparung durch Stundenautomatisierung", replaces: "Ersetzt durch", total_tools: "Gesamt Tools", total_hours: "Gesamte eingesparte Stunden", saved_month: "h/Monat" },
    pt: { tools: "Poupança por ferramentas substituídas", hours: "Poupança por automatização de horas", replaces: "Substituído por", total_tools: "Total ferramentas", total_hours: "Total horas poupadas", saved_month: "h/mês" },
  };
  const xl = xl18n[lang] ?? xl18n.es;
  const moLabel = { es: "/mes", en: "/mo", fr: "/mois", it: "/mese", de: "/Monat", pt: "/mês" }[lang] ?? "/mes";
  const yrLabel = { es: "/año", en: "/year", fr: "/an", it: "/anno", de: "/Jahr", pt: "/ano" }[lang] ?? "/año";

  const titleTemplates: Record<string, string> = {
    es: `Factorial tiene un retorno de la inversión de <span style="color:#FF355E">${data.roi_percent}%</span><br>para ${escHtml(data.company_name)}`,
    en: `Factorial delivers a <span style="color:#FF355E">${data.roi_percent}%</span> return on investment<br>for ${escHtml(data.company_name)}`,
    fr: `Factorial offre un retour sur investissement de <span style="color:#FF355E">${data.roi_percent}%</span><br>pour ${escHtml(data.company_name)}`,
    it: `Factorial offre un ritorno sull'investimento del <span style="color:#FF355E">${data.roi_percent}%</span><br>per ${escHtml(data.company_name)}`,
    de: `Factorial liefert eine Kapitalrendite von <span style="color:#FF355E">${data.roi_percent}%</span><br>für ${escHtml(data.company_name)}`,
    pt: `Factorial tem um retorno sobre o investimento de <span style="color:#FF355E">${data.roi_percent}%</span><br>para ${escHtml(data.company_name)}`,
  };

  const toolRows = toolDetails.map(d => `
    <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:14px;padding:9px 0;border-bottom:1px solid #EBEBF0!important">
      <div>
        <div style="font-size:13px;font-weight:800;color:#25253D;line-height:1.25;margin-bottom:5px">${escHtml(d.tool_override!.tool_name)}</div>
        <div style="display:inline-flex;align-items:center;gap:5px;background:#F8F8FC;border-radius:20px;padding:2px 10px 2px 6px">
          <span style="font-size:10px;color:#FF355E;font-weight:700">→</span>
          <span style="width:5px;height:5px;border-radius:50%;background:${d.color};flex-shrink:0;display:inline-block"></span>
          <span style="font-size:10px;color:#6C6C7D;font-weight:500">${escHtml(d.name)}</span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:15px;font-weight:800;color:#FF355E;white-space:nowrap;letter-spacing:-.02em">${fmtEur(d.total_annual)}<span style="font-size:9px;font-weight:500;color:#AEAEB8;letter-spacing:0">${yrLabel}</span></div>
        <div style="font-size:9.5px;color:#AEAEB8;white-space:nowrap;margin-top:1px">${fmtEur(Math.round(d.total_annual / 12))}${moLabel}</div>
      </div>
    </div>`).join("");

  // Aggregate hours and savings by stakeholder across all hour modules
  const stakeAgg: Record<string, { totalH: number; totalAnnual: number }> = {};
  for (const d of hourDetails) {
    for (const r of d.rows) {
      if (!stakeAgg[r.stakeholder]) stakeAgg[r.stakeholder] = { totalH: 0, totalAnnual: 0 };
      stakeAgg[r.stakeholder].totalH += r.total_hours;
      stakeAgg[r.stakeholder].totalAnnual += r.annual_savings;
    }
  }
  const stakeLabels: Record<string, Record<string, string>> = {
    es: { employee: "Empleados", hr: "Admin RRHH", manager: "Managers" },
    en: { employee: "Employees", hr: "HR Admin", manager: "Managers" },
    fr: { employee: "Employés", hr: "Admin RH", manager: "Managers" },
    it: { employee: "Dipendenti", hr: "Admin HR", manager: "Manager" },
    de: { employee: "Mitarbeiter", hr: "HR-Admin", manager: "Manager" },
    pt: { employee: "Colaboradores", hr: "Admin RH", manager: "Gestores" },
  };
  const stakeDesc: Record<string, Record<string, (h: string) => string>> = {
    es: { employee: h => `Ahorran ${h} ${xl.saved_month} en gestiones de RRHH`, hr: h => `Reducen ${h} ${xl.saved_month} de carga administrativa`, manager: h => `Recuperan ${h} ${xl.saved_month} en seguimiento y aprobaciones` },
    en: { employee: h => `Save ${h} ${xl.saved_month} on HR admin tasks`, hr: h => `Reduce ${h} ${xl.saved_month} of manual workload`, manager: h => `Recover ${h} ${xl.saved_month} on tracking & approvals` },
    fr: { employee: h => `Économisent ${h} ${xl.saved_month} sur les tâches admin`, hr: h => `Réduisent ${h} ${xl.saved_month} de charge administrative`, manager: h => `Récupèrent ${h} ${xl.saved_month} sur le suivi et les approbations` },
    it: { employee: h => `Risparmiano ${h} ${xl.saved_month} su task admin`, hr: h => `Riducono ${h} ${xl.saved_month} di carico manuale`, manager: h => `Recuperano ${h} ${xl.saved_month} su tracking e approvazioni` },
    de: { employee: h => `Sparen ${h} ${xl.saved_month} bei Admin-Aufgaben`, hr: h => `Reduzieren ${h} ${xl.saved_month} manuelle Arbeit`, manager: h => `Gewinnen ${h} ${xl.saved_month} bei Tracking & Genehmigungen` },
    pt: { employee: h => `Poupam ${h} ${xl.saved_month} em tarefas admin`, hr: h => `Reduzem ${h} ${xl.saved_month} de carga manual`, manager: h => `Recuperam ${h} ${xl.saved_month} em seguimento e aprovações` },
  };
  const stakeColors: Record<string, string> = { employee: "#3B82F6", hr: "#10B981", manager: "#F59E0B" };
  const stakeIcons: Record<string, string> = { employee: "👤", hr: "🛡", manager: "💼" };

  const hourRows = (["employee", "hr", "manager"] as const)
    .filter(s => stakeAgg[s]?.totalH > 0)
    .map(s => {
      const { totalH, totalAnnual } = stakeAgg[s];
      const hStr = Math.round(totalH * 10) / 10;
      const desc = (stakeDesc[lang] ?? stakeDesc.es)[s]?.(String(hStr)) ?? "";
      const lbl = (stakeLabels[lang] ?? stakeLabels.es)[s];
      return `
    <div style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #EBEBF0!important">
      <div style="width:34px;height:34px;border-radius:10px;background:${stakeColors[s]};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;box-shadow:0 2px 8px ${stakeColors[s]}40">${stakeIcons[s]}</div>
      <div style="min-width:0">
        <div style="font-size:12px;font-weight:800;color:#25253D;margin-bottom:2px">${lbl}</div>
        <div style="font-size:10.5px;color:#6C6C7D;line-height:1.4">${desc}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:17px;font-weight:800;color:#25253D;letter-spacing:-.025em;white-space:nowrap">${fmtEur(Math.round(totalAnnual))}</div>
        <div style="font-size:9px;color:#AEAEB8;white-space:nowrap;margin-top:1px">${hStr} ${xl.saved_month}</div>
      </div>
    </div>`;
    }).join("");

  const showBothSections = toolDetails.length > 0 && hourDetails.length > 0;
  const leftWidth = showBothSections ? "48%" : "100%";
  const showRight = hourDetails.length > 0;

  return `<div class="slide" id="s1">
  ${ISO_USE}
  <div class="brand">${escHtml(t.proposal)}</div>
  <div style="position:absolute;top:52px;left:80px;right:80px">
    <div style="font-size:32px;font-weight:800;color:#25253D;letter-spacing:-.025em;line-height:1.1">${titleTemplates[lang] ?? titleTemplates.es}</div>
  </div>
  <div class="kpis" style="position:absolute;top:132px;left:0;right:0">
    <div class="kpi"><div class="kpi-lbl">${t.annual_savings}</div><div class="kpi-val" style="color:#FF355E">${fmtEur(data.total_annual_savings)}</div><div style="font-size:14px;font-weight:700;color:#25253D;margin-top:8px">${t.savings_vs_label} ${fmtEur(data.annual_cost)}/${t.year}</div><div class="kpi-sub">${t.savings_vs_detail}</div></div>
    <div class="kpi"><div class="kpi-lbl">${t.roi}</div><div class="kpi-val" style="color:#25253D">${data.roi_percent}%</div><div class="kpi-sub">${t.roi_sub("€" + roiPer1)}</div></div>
    <div class="kpi"><div class="kpi-lbl">${t.payback}</div><div class="kpi-val" style="color:#25253D">${data.payback_months} m</div><div class="kpi-sub">${t.payback_sub(String(data.payback_months))}</div></div>
  </div>
  <div style="position:absolute;top:290px;left:80px;right:80px;bottom:30px;display:flex;gap:0">
    ${toolDetails.length > 0 ? `
    <div style="flex:1;min-width:0;padding-right:28px;${showRight ? "border-right:1.5px solid #EBEBF0" : ""}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
        <div style="width:8px;height:8px;border-radius:2px;background:#FF355E;flex-shrink:0"></div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#AEAEB8">${xl.tools}</span>
      </div>
      <div>${toolRows}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:10px 14px;background:#FFF5F7;border-radius:8px">
        <span style="font-size:11px;font-weight:700;color:#C0003C;white-space:nowrap">${xl.total_tools}</span>
        <span style="font-size:18px;font-weight:800;color:#FF355E;white-space:nowrap;letter-spacing:-.03em">${fmtEur(toolTotal)}</span>
      </div>
    </div>` : ""}
    ${showRight ? `
    <div style="flex:1;min-width:0;${toolDetails.length > 0 ? "padding-left:28px" : ""}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
        <div style="width:8px;height:8px;border-radius:2px;background:#25253D;flex-shrink:0"></div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#AEAEB8">${xl.hours}</span>
      </div>
      <div>${hourRows}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:10px 14px;background:#F8F8FC;border-radius:8px">
        <span style="font-size:11px;font-weight:700;color:#6C6C7D;white-space:nowrap">${xl.total_hours}: ${Math.round(totalH * 10) / 10} ${xl.saved_month}</span>
        <span style="font-size:18px;font-weight:800;color:#25253D;white-space:nowrap;letter-spacing:-.03em;margin-left:8px">${fmtEur(hourTotal)}</span>
      </div>
    </div>` : ""}
  </div>
  <div style="position:absolute;bottom:14px;right:80px;font-size:11px;color:#AEAEB8;white-space:nowrap;letter-spacing:.02em">2&nbsp;/&nbsp;${totalSlides}</div>
</div>`;
}

function xlModuleListSlide3(data: RoiSlideData, details: ModuleDetail[], t: DeckI18n, lang: string, totalSlides: number, bothHourDetails: ModuleDetail[] = []): string {
  const bothHourById = new Map(bothHourDetails.map(d => [d.id, d]));
  const totalH = details.filter(d => !d.tool_override).reduce((s, d) => s + d.total_hours, 0)
    + bothHourDetails.reduce((s, d) => s + d.total_hours, 0);

  const xl18nTitle: Record<string, string> = {
    es: "Detalle de ahorro por módulo", en: "Savings detail by module",
    fr: "Détail des économies par module", it: "Dettaglio risparmio per modulo",
    de: "Einsparungsdetail nach Modul", pt: "Detalhe de poupança por módulo",
  };

  const totalRowCount = details.length + bothHourDetails.length;
  const fontSize = totalRowCount > 9 ? "10px" : totalRowCount > 7 ? "11px" : "12px";
  const rowPad = totalRowCount > 9 ? "5px 10px" : totalRowCount > 7 ? "6px 12px" : "7px 12px";
  const savFontSize = totalRowCount > 9 ? "11px" : "13px";

  const moduleRows = details.map(d => {
    const desc = getModuleDesc(d.id, lang) || d.category_desc || d.name;
    const hourDetail = bothHourById.get(d.id);

    if (d.tool_override && hourDetail) {
      // "Ambos" module — tool row + indented hours row
      const toolLabel: Record<string, string> = { es: "herramienta", en: "tool", fr: "outil", it: "strumento", de: "Tool", pt: "ferramenta" };
      const hoursLabel: Record<string, string> = { es: "horas", en: "hours", fr: "heures", it: "ore", de: "Stunden", pt: "horas" };
      return `<tr>
        <td style="padding:${rowPad}"><span class="mdot" style="background:${d.color}"></span><strong style="font-size:${fontSize}">${escHtml(d.name)}</strong> <span style="font-size:8px;color:#AEAEB8;font-weight:600;text-transform:uppercase;letter-spacing:.06em">${toolLabel[lang] ?? toolLabel.es}</span></td>
        <td style="color:#6C6C7D;font-size:${fontSize};padding:${rowPad}">${escHtml(desc)}</td>
        <td style="font-size:10px;color:#6C6C7D;padding:${rowPad}">${escHtml(d.tool_override.tool_name || t.tool_label)}</td>
        <td style="text-align:right;font-weight:700;font-size:${savFontSize};padding:${rowPad}">${fmtEur(d.total_annual)}</td>
      </tr>
      <tr style="background:#FAFAFA">
        <td style="padding:${rowPad};padding-left:22px!important"><span style="font-size:8px;color:#AEAEB8;font-weight:600;text-transform:uppercase;letter-spacing:.06em">↳ ${hoursLabel[lang] ?? hoursLabel.es}</span></td>
        <td style="color:#AEAEB8;font-size:10px;padding:${rowPad}"></td>
        <td style="text-align:center;font-weight:600;color:#6C6C7D;font-size:11px;padding:${rowPad}">${Math.round(hourDetail.total_hours * 10) / 10} h</td>
        <td style="text-align:right;font-weight:700;font-size:${savFontSize};color:#6C6C7D;padding:${rowPad}">${fmtEur(hourDetail.total_annual)}</td>
      </tr>`;
    }

    const hCol = d.tool_override
      ? `<td style="font-size:10px;color:#6C6C7D;padding:${rowPad}">${escHtml(d.tool_override.tool_name || t.tool_label)}</td>`
      : `<td style="text-align:center;font-weight:600;color:#6C6C7D;padding:${rowPad}">${Math.round(d.total_hours * 10) / 10} h</td>`;
    return `<tr>
      <td style="padding:${rowPad}"><span class="mdot" style="background:${d.color}"></span><strong style="font-size:${fontSize}">${escHtml(d.name)}</strong></td>
      <td style="color:#6C6C7D;font-size:${fontSize};padding:${rowPad}">${escHtml(desc)}</td>
      ${hCol}
      <td style="text-align:right;font-weight:700;font-size:${savFontSize};padding:${rowPad}">${fmtEur(d.total_annual)}</td>
    </tr>`;
  }).join("\n");

  return `<div class="slide">
  ${ISO_USE}
  <div class="brand">${escHtml(t.proposal)}</div>
  <div class="mhd">
    <div>
      <div class="mhd-name" style="color:#25253D">${xl18nTitle[lang] ?? xl18nTitle.es}</div>
      <div class="mhd-cat">${escHtml(data.company_name)}</div>
    </div>
    <div class="mhd-r">
      <div class="mhd-lbl">${t.total_annual}</div>
      <div class="mhd-val" style="color:#FF355E">${fmtEur(data.total_annual_savings)}</div>
    </div>
  </div>
  <div style="position:absolute;top:120px;left:80px;right:80px;bottom:56px;overflow:hidden">
    <table class="btbl" style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="width:22%">${t.module}</th>
        <th style="width:40%">${t.what_is}</th>
        <th style="width:14%;text-align:center">${t.h_month}</th>
        <th style="width:24%;text-align:right">${t.savings_year}</th>
      </tr></thead>
      <tbody>
        ${moduleRows}
        <tr class="btot">
          <td colspan="2">${t.total}</td>
          <td style="text-align:center;font-weight:800">${Math.round(totalH * 10) / 10} h</td>
          <td>${fmtEur(data.total_annual_savings)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div style="position:absolute;bottom:14px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:10px;color:#AEAEB8">${t.disclaimer(data.total_employees, data.hr_count, data.manager_count, data.onboardings)}</span>
    <span style="font-size:11px;color:#AEAEB8;letter-spacing:.02em">3&nbsp;/&nbsp;${totalSlides}</span>
  </div>
</div>`;
}

// ── Public API ───────────────────────────────────────

export interface XLDeckOptions {
  hiddenSlideIds?: Set<string>;
  bothModeModules?: Set<string>; // modules with tool + hours (generate 2 slides each)
}

export function generateDeckHtml(data: RoiSlideData, input: RoiSlideInput, mode: "summary" | "full", xlOptions?: XLDeckOptions): string {
  const { uiLang, modLang } = resolveLangs(input.country);
  const t = getI18n(uiLang);
  const details = buildDetails(input, data, uiLang, modLang).filter(d => d.total_annual > 0 && (d.tool_override || d.rows.length > 0));
  const isXL = !!xlOptions;
  const hideToolSlides = isXL && (xlOptions?.hiddenSlideIds?.size ?? 0) > 0;
  const bothIds = xlOptions?.bothModeModules ?? new Set<string>();

  // For "ambos" modules: rebuild hour details without tool_override in BOTH input AND data
  let bothHourDetails: ModuleDetail[] = [];
  if (isXL && bothIds.size > 0) {
    const inputForHours: typeof input = {
      ...input,
      roiConfig: {
        ...input.roiConfig,
        tool_overrides: input.roiConfig.tool_overrides
          ? Object.fromEntries(Object.entries(input.roiConfig.tool_overrides).filter(([k]) => !bothIds.has(k)))
          : undefined,
      },
    };
    // Also strip tool_override from data.modules so buildDetails doesn't skip them
    const dataForHours: typeof data = {
      ...data,
      modules: data.modules.map((m: any) => bothIds.has(m.id) ? { ...m, tool_override: undefined } : m),
    };
    bothHourDetails = buildDetails(inputForHours, dataForHours, uiLang, modLang)
      .filter(d => bothIds.has(d.id) && !d.tool_override && d.rows.length > 0);
  }

  const totalSlides = isXL
    ? (mode === "summary" ? 3 : 3
        + details.filter(d => !d.tool_override).length
        + bothHourDetails.length
        + (hideToolSlides ? 0 : details.filter(d => d.tool_override).length))
    : (mode === "summary" ? 2 : 2 + details.length);

  // Recalculate totals — "ambos" modules count both tool + hours savings
  const realTotal = details.reduce((s, d) => s + d.total_annual, 0)
    + bothHourDetails.reduce((s, d) => s + d.total_annual, 0);
  const annualCost = input.annualCost ?? data.annual_cost ?? 0;
  const realRoiPct = annualCost > 0 ? Math.round(((realTotal - annualCost) / annualCost) * 100) : data.roi_percent;
  const realPayback = realTotal > 0 ? Math.max(1, Math.round((annualCost / realTotal) * 12)) : data.payback_months;
  const correctedData: RoiSlideData = {
    ...data,
    total_annual_savings: Math.round(realTotal),
    roi_percent: realRoiPct,
    payback_months: realPayback,
  };

  let slides: string;
  if (isXL) {
    slides = coverSlide(correctedData, t, uiLang)
      + "\n\n" + xlSummarySlide2(correctedData, details, t, uiLang, totalSlides, bothHourDetails)
      + "\n\n" + xlModuleListSlide3(correctedData, details, t, uiLang, totalSlides, bothHourDetails);
    if (mode === "full") {
      // Hour slides (standard hour modules + "ambos" hour slides)
      const hourSlides = details.filter(d => !d.tool_override);
      const allHourSlides = [...hourSlides, ...bothHourDetails];
      allHourSlides.forEach((d, i) => {
        slides += "\n\n" + moduleSlide(d, correctedData, t, uiLang, i + 4, totalSlides);
      });
      // Tool slides: optional toggle; includes "ambos" tool slides
      if (!hideToolSlides) {
        const toolSlides = details.filter(d => d.tool_override);
        toolSlides.forEach((d, i) => {
          slides += "\n\n" + moduleSlide(d, correctedData, t, uiLang, allHourSlides.length + i + 4, totalSlides);
        });
      }
    }
  } else {
    slides = coverSlide(correctedData, t, uiLang) + "\n\n" + summarySlide(correctedData, details, t, uiLang, totalSlides);
    if (mode === "full") {
      details.forEach((d, i) => {
        slides += "\n\n" + moduleSlide(d, correctedData, t, uiLang, i + 3, totalSlides);
      });
    }
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

export async function generateDeckPdf(data: RoiSlideData, input: RoiSlideInput, mode: "summary" | "full", xlOptions?: XLDeckOptions): Promise<void> {
  const [html2canvas, fontCss] = await Promise.all([loadHtml2Canvas(), getInlineFontCss()]);

  const html = generateDeckHtml(data, input, mode, xlOptions);

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
