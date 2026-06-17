export type Stakeholder = "employee" | "hr" | "manager";
export type ScalesWith = "employees" | "hr_ftes" | "managers" | "onboardings" | "submitters";

export interface HoursEntry {
  module_id: string;
  stakeholder: Stakeholder;
  hours_per_month: number;
  scales_with: ScalesWith;
}

export const MODULE_HOURS: HoursEntry[] = [
  // Core
  { module_id: "core",              stakeholder: "employee", hours_per_month: 0.3,  scales_with: "employees" },
  { module_id: "core",              stakeholder: "hr",       hours_per_month: 6.0,  scales_with: "onboardings" },
  { module_id: "core",              stakeholder: "manager",  hours_per_month: 1.0,  scales_with: "managers" },

  // Time-off
  { module_id: "time_off",          stakeholder: "hr",       hours_per_month: 6.0,  scales_with: "hr_ftes" },
  { module_id: "time_off",          stakeholder: "manager",  hours_per_month: 0.5,  scales_with: "managers" },

  // Time Tracking
  { module_id: "time_tracking",     stakeholder: "employee", hours_per_month: 0.2,  scales_with: "employees" },
  { module_id: "time_tracking",     stakeholder: "hr",       hours_per_month: 6.0,  scales_with: "hr_ftes" },
  { module_id: "time_tracking",     stakeholder: "manager",  hours_per_month: 0.5,  scales_with: "managers" },

  // Shift Management
  { module_id: "time_planning",     stakeholder: "employee", hours_per_month: 0.1,  scales_with: "employees" },
  { module_id: "time_planning",     stakeholder: "hr",       hours_per_month: 3.0,  scales_with: "hr_ftes" },
  { module_id: "time_planning",     stakeholder: "manager",  hours_per_month: 6.0,  scales_with: "managers" },

  // Payroll Connect
  { module_id: "payroll",           stakeholder: "hr",       hours_per_month: 2.0,  scales_with: "hr_ftes" },

  // Expenses
  { module_id: "expenses",          stakeholder: "employee", hours_per_month: 2.0,  scales_with: "submitters" },
  { module_id: "expenses",          stakeholder: "hr",       hours_per_month: 2.0,  scales_with: "hr_ftes" },
  { module_id: "expenses",          stakeholder: "manager",  hours_per_month: 4.0,  scales_with: "managers" },

  // Compensation
  { module_id: "compensations",     stakeholder: "hr",       hours_per_month: 6.0,  scales_with: "hr_ftes" },
  { module_id: "compensations",     stakeholder: "manager",  hours_per_month: 1.0,  scales_with: "managers" },

  // Salary Advance / Benefits
  { module_id: "benefits",          stakeholder: "hr",       hours_per_month: 2.0,  scales_with: "hr_ftes" },

  // Wellhub
  { module_id: "wellhub",           stakeholder: "hr",       hours_per_month: 0.7,  scales_with: "hr_ftes" },

  // Trust Channel
  { module_id: "complaints",        stakeholder: "hr",       hours_per_month: 0.5,  scales_with: "hr_ftes" },

  // Engagement
  { module_id: "engagement",        stakeholder: "hr",       hours_per_month: 1.0,  scales_with: "hr_ftes" },
  { module_id: "engagement",        stakeholder: "manager",  hours_per_month: 1.0,  scales_with: "managers" },

  // Performance
  { module_id: "performance",       stakeholder: "hr",       hours_per_month: 0.2,  scales_with: "hr_ftes" },
  { module_id: "performance",       stakeholder: "manager",  hours_per_month: 0.2,  scales_with: "managers" },

  // Trainings
  { module_id: "trainings",         stakeholder: "hr",       hours_per_month: 1.0,  scales_with: "hr_ftes" },

  // LMS
  { module_id: "lms",               stakeholder: "hr",       hours_per_month: 3.3,  scales_with: "hr_ftes" },

  // Recruitment
  { module_id: "recruitment",       stakeholder: "hr",       hours_per_month: 5.0,  scales_with: "onboardings" },
  { module_id: "recruitment",       stakeholder: "manager",  hours_per_month: 2.0,  scales_with: "onboardings" },

  // Procurement
  { module_id: "procurement",       stakeholder: "hr",       hours_per_month: 1.0,  scales_with: "hr_ftes" },

  // Project Management
  { module_id: "projects",          stakeholder: "hr",       hours_per_month: 6.0,  scales_with: "hr_ftes" },
  { module_id: "projects",          stakeholder: "manager",  hours_per_month: 2.0,  scales_with: "managers" },

  // CRM
  { module_id: "crm",               stakeholder: "hr",       hours_per_month: 1.5,  scales_with: "hr_ftes" },

  // Headcount Planning
  { module_id: "headcount_planning", stakeholder: "hr",      hours_per_month: 1.0,  scales_with: "hr_ftes" },
  { module_id: "headcount_planning", stakeholder: "manager", hours_per_month: 0.5,  scales_with: "managers" },

  // Spaces
  { module_id: "space",             stakeholder: "hr",       hours_per_month: 0.5,  scales_with: "hr_ftes" },

  // Software Management
  { module_id: "software_management", stakeholder: "hr",     hours_per_month: 2.0,  scales_with: "hr_ftes" },

  // IT Inventory
  { module_id: "it_inventory",      stakeholder: "hr",       hours_per_month: 1.0,  scales_with: "onboardings" },

  // Factorial One (AI)
  { module_id: "one",               stakeholder: "employee", hours_per_month: 1.0,  scales_with: "employees" },
  { module_id: "one",               stakeholder: "hr",       hours_per_month: 1.0,  scales_with: "hr_ftes" },

  // Integrations
  { module_id: "integration_business_central", stakeholder: "hr", hours_per_month: 1.0, scales_with: "hr_ftes" },
  { module_id: "integration_netsuite",         stakeholder: "hr", hours_per_month: 1.0, scales_with: "hr_ftes" },
  { module_id: "integration_sage_200",         stakeholder: "hr", hours_per_month: 1.0, scales_with: "hr_ftes" },
  { module_id: "integration_milena",           stakeholder: "hr", hours_per_month: 1.0, scales_with: "hr_ftes" },
  { module_id: "integration_suprema_xiptic",   stakeholder: "hr", hours_per_month: 0.5, scales_with: "hr_ftes" },
  { module_id: "silae",                        stakeholder: "hr", hours_per_month: 1.0, scales_with: "hr_ftes" },
];

export function getHoursForModule(moduleId: string): Record<Stakeholder, number> {
  const result: Record<Stakeholder, number> = { employee: 0, hr: 0, manager: 0 };
  for (const e of MODULE_HOURS) {
    if (e.module_id === moduleId) result[e.stakeholder] = e.hours_per_month;
  }
  return result;
}

export function getScalesWithForModule(moduleId: string): Record<Stakeholder, ScalesWith> {
  const result: Record<Stakeholder, ScalesWith> = { employee: "employees", hr: "hr_ftes", manager: "managers" };
  for (const e of MODULE_HOURS) {
    if (e.module_id === moduleId) result[e.stakeholder] = e.scales_with;
  }
  return result;
}

export function getEffectiveHours(
  moduleId: string,
  overrides?: Record<string, Partial<Record<string, number>>>,
): Record<Stakeholder, number> {
  const base = getHoursForModule(moduleId);
  const o = overrides?.[moduleId];
  if (!o) return base;
  return {
    employee: o.employee ?? base.employee,
    hr: o.hr ?? base.hr,
    manager: o.manager ?? base.manager,
  };
}

export interface RoiMultipliers {
  headcounts: Record<Stakeholder, number>;
  onboardings_per_year?: number;
  expense_submitters?: number;
}

export function getCountForEntry(entry: HoursEntry, multipliers: RoiMultipliers): number {
  switch (entry.scales_with) {
    case "employees":    return multipliers.headcounts.employee;
    case "hr_ftes":      return multipliers.headcounts.hr;
    case "managers":     return multipliers.headcounts.manager;
    case "onboardings":  return (multipliers.onboardings_per_year ?? 0) / 12;
    case "submitters":   return multipliers.expense_submitters ?? 0;
  }
}

type DescriptionSet = Record<string, Partial<Record<Stakeholder, string[]>>>;

const SAVINGS_DESCRIPTIONS_I18N: Record<string, DescriptionSet> = {
  en: {
    core: {
      employee: [
        "Self-service profile updates and document downloads remove routine HR requests",
        "Payslips and certificates are always accessible on mobile, with no waiting",
      ],
      hr: [
        "Single employee database eliminates duplicate spreadsheets and copy-paste",
        "Automated approval workflows handle data changes without manual routing",
        "Onboarding/offboarding checklists run automatically",
      ],
      manager: [
        "Team dashboard shows pending approvals, org structure, direct reports in one click",
        "No more emailing HR for headcount, contract dates, or employee details",
      ],
    },
    time_off: {
      employee: ["Employees request leave and check balances from their phone without going through HR"],
      hr: [
        "Auto-accrual engine replaces manual balance calculations",
        "Payroll integration syncs leave data automatically, eliminating re-entry",
        "Policy rules prevent over-approval before it happens",
      ],
      manager: [
        "Visual team calendar shows who's off without checking spreadsheets",
        "One-click approve/reject with conflict detection alerts",
      ],
    },
    time_tracking: {
      employee: [
        "Clock-in from any device replaces paper timesheets",
        "Missed clock-ins are resolved in-app with manager approval, no chasing needed",
      ],
      hr: [
        "Time data flows to payroll automatically, removing weekly reconciliation",
        "Overtime is calculated per labour law, so manual compliance checks disappear",
        "Missing entries trigger automatic reminders",
      ],
      manager: [
        "Real-time attendance dashboard replaces morning roll calls",
        "Anomaly alerts (late arrivals, missed clock-outs) sent automatically",
      ],
    },
    time_planning: {
      employee: [
        "Upcoming shifts are visible on mobile, replacing paper rosters and group chats",
        "Shift swap requests handled in-app with instant manager notification",
      ],
      hr: [
        "Auto-generated rosters from demand, labour rules, and preferences",
        "Overtime and rest-period compliance checked automatically",
        "Eliminates weekly manual roster creation entirely",
      ],
      manager: [
        "Drag-and-drop planner with instant conflict detection",
        "Coverage gap warnings and overtime alerts surfaced before publishing",
        "Reduces roster preparation to a fraction of previous time",
      ],
    },
    payroll: {
      hr: [
        "Time, leave, expenses, and variable pay all auto-sync into payroll without manual prep",
        "Discrepancy detection catches errors before submission",
        "Eliminates manual data consolidation across each pay run",
      ],
    },
    expenses: {
      employee: [
        "Mobile receipt capture with OCR auto-categorises and submits expenses instantly",
        "Policy checks at submission prevent rejections and back-and-forth corrections",
      ],
      hr: [
        "Automated reconciliation and approval workflows integrate directly with accounting",
        "Policy violations are flagged before approval, so there is no need to review every line manually",
        "Reduces month-end expense processing significantly",
      ],
      manager: [
        "One-click approvals on pre-validated, policy-checked submissions",
        "Team spend dashboards with budget alerts remove the need to chase reports",
      ],
    },
    compensations: {
      hr: [
        "Centralised merit and bonus cycles with budget guardrails prevent overspend",
        "Approval routing is fully automated, eliminating email chains and version conflicts",
        "Salary bands are managed in-system, so there is no spreadsheet juggling",
      ],
      manager: [
        "Guided review surfaces team salary data, benchmarks, and remaining budget in one place",
        "Compensation decisions are submitted in-app, replacing email threads and offline tracking",
      ],
    },
    benefits: {
      hr: [
        "Automated enrolment windows with eligibility rules remove manual coordination",
        "Vendor integration syncs benefit selections without manual reconciliation",
      ],
    },
    wellhub: {
      hr: [
        "Integrated wellness platform in the HR portal",
        "Single sign-on removes the need for separate provider registration",
        "Automated usage reporting",
      ],
    },
    complaints: {
      hr: [
        "Anonymous reporting portal with built-in case management replaces email-based handling",
        "EU Whistleblower Directive compliance covered out-of-the-box",
        "Deadline alerts and case tracking eliminate manual follow-up",
      ],
    },
    engagement: {
      hr: [
        "Automated survey creation, scheduling, and distribution remove manual setup",
        "Real-time dashboards break results down by team and department, replacing manual Excel analysis",
      ],
      manager: [
        "Team engagement scores in a live dashboard with trend indicators",
        "Declining score alerts come with suggested actions, removing the need for manual interpretation",
      ],
    },
    performance: {
      hr: [
        "Automated review cycles handle launch, reminders, completion tracking, and calibration",
        "Replaces Word and Excel templates and eliminates manual chasing across cycles",
      ],
      manager: [
        "Pre-populated review forms with historical performance data reduce prep time",
        "Team performance dashboard is ready for every one-to-one without manual compilation",
      ],
    },
    trainings: {
      hr: [
        "Automated training rollout with completion tracking and compliance reporting",
        "Subsidy and tax credit documentation is generated automatically, removing manual admin",
      ],
    },
    lms: {
      hr: [
        "Course builder with templates and AI-assisted content creation accelerates development",
        "Content library with version control and completion analytics replaces manual tracking",
      ],
    },
    recruitment: {
      hr: [
        "End-to-end ATS covers job posting, pipeline, interview scheduling, and scorecards",
        "Automated candidate communications and status updates remove manual outreach",
        "Reduces time-to-hire admin significantly across every open role",
      ],
      manager: [
        "Structured interview scorecards replace free-form notes for every candidate",
        "Side-by-side candidate comparison accelerates and standardises hiring decisions",
      ],
    },
    procurement: {
      hr: [
        "Digital PO workflows with multi-level approval routing eliminate manual follow-up",
        "Maverick spend visibility identifies off-process purchases automatically",
      ],
    },
    projects: {
      hr: [
        "Project cost and profitability reports auto-generated from live time data",
        "Replaces manual cost allocation spreadsheets across every project",
      ],
      manager: [
        "Real-time project dashboards show allocation, budget burn, and profitability at a glance",
        "Replaces manual tracking and month-end reconciliation entirely",
      ],
    },
    crm: {
      hr: [
        "Candidate pools and alumni networks managed with automated nurture workflows",
        "Referral programme tracking replaces manual outreach and spreadsheet management",
      ],
    },
    headcount_planning: {
      hr: [
        "Scenario-based workforce planning with real-time budget impact replaces spreadsheet modelling",
        "Headcount forecasting kept current without manual rebuilding",
      ],
      manager: [
        "Approved vs. actual headcount is visible at a glance, without requesting data from HR",
        "Structured position request workflow replaces informal email requisitions",
      ],
    },
    space: {
      hr: [
        "Occupancy analytics and booking rules are automated, removing manual data collection",
        "Capacity planning based on real usage data replaces guesswork",
      ],
    },
    software_management: {
      hr: [
        "SaaS licence tracking with usage monitoring identifies shelfware automatically",
        "Renewal reminders and spend dashboards replace manual vendor tracking",
      ],
    },
    it_inventory: {
      hr: [
        "Centralised IT asset register linked to the employee lifecycle, always up-to-date",
        "Auto-provisioning on hire and auto-deprovisioning on exit remove manual IT tasks",
      ],
    },
    one: {
      employee: [
        "AI answers HR questions instantly, from policy lookups and balance checks to document requests",
        "Reduces time spent searching the intranet or waiting for HR email responses",
      ],
      hr: [
        "AI handles routine queries on leave, payslips, and policies without HR involvement",
        "Frees HR team from repetitive inbox requests to focus on higher-value work",
      ],
    },
    analytics: {
      hr: [
        "Pre-built dashboards for headcount, attrition and diversity",
        "Custom report builder with scheduled delivery",
      ],
    },
    integration_business_central: {
      hr: ["Automated bi-directional sync with Business Central eliminates manual data entry between HR and ERP"],
    },
    integration_netsuite: {
      hr: ["Automated sync of employee and payroll data with Netsuite — single source of truth across HR and finance"],
    },
    integration_sage_200: {
      hr: ["Direct integration with SAGE 200 for payroll and accounting data removes manual export/import"],
    },
    integration_milena: {
      hr: ["Automated payroll data sync with Milena eliminates manual data transfer every pay cycle"],
    },
    integration_suprema_xiptic: {
      hr: ["Automated clock-in data sync from Suprema Xiptic terminals connects access control to HR"],
    },
    silae: {
      hr: ["Direct payroll data sync with SILAE removes manual data exchange with provider"],
    },
  },
  es: {
    core: {
      employee: [
        "Autoservicio para actualizar perfil y descargar documentos elimina peticiones rutinarias a RRHH",
        "Las nóminas y certificados están siempre accesibles desde el móvil, sin esperas",
      ],
      hr: [
        "Base de datos única de empleados elimina hojas de cálculo duplicadas y copiar-pegar",
        "Los flujos de aprobación automatizados gestionan los cambios de datos sin enrutamiento manual",
        "Checklists de onboarding/offboarding se ejecutan automáticamente",
      ],
      manager: [
        "Panel de equipo muestra aprobaciones pendientes, organigrama y reportes directos en un clic",
        "Ya no es necesario enviar emails a RRHH para headcount, fechas de contrato o datos de empleados",
      ],
    },
    time_off: {
      employee: ["Los empleados solicitan vacaciones y consultan su saldo desde el móvil, sin pasar por RRHH"],
      hr: [
        "Motor de acumulación automática sustituye cálculos manuales de saldos",
        "La integración con nómina sincroniza los datos de ausencias automáticamente, sin reintroducción",
        "Reglas de política previenen sobre-aprobación antes de que ocurra",
      ],
      manager: [
        "El calendario visual del equipo muestra quién está ausente sin necesidad de consultar hojas de cálculo",
        "Aprobar/rechazar con un clic con alertas de detección de conflictos",
      ],
    },
    time_tracking: {
      employee: [
        "Fichaje desde cualquier dispositivo sustituye los partes en papel",
        "Los fichajes olvidados se resuelven en la app con aprobación del manager, sin perseguir a nadie",
      ],
      hr: [
        "Los datos de tiempo se sincronizan con nómina de forma automática, sin conciliación semanal",
        "Las horas extra se calculan según la legislación laboral, sin verificación manual",
        "Fichajes olvidados generan recordatorios automáticos",
      ],
      manager: [
        "Panel de asistencia en tiempo real sustituye el control matutino",
        "Alertas de anomalías (llegadas tarde, fichajes olvidados) enviadas automáticamente",
      ],
    },
    time_planning: {
      employee: [
        "Los turnos próximos se consultan en el móvil, sin cuadrantes en papel ni grupos de chat",
        "Solicitudes de cambio de turno gestionadas en la app con notificación inmediata al manager",
      ],
      hr: [
        "Cuadrantes generados automáticamente según demanda, normativa laboral y preferencias",
        "Cumplimiento de horas extra y periodos de descanso verificado automáticamente",
        "Elimina por completo la creación manual semanal de cuadrantes",
      ],
      manager: [
        "Planificador drag-and-drop con detección instantánea de conflictos",
        "Alertas de cobertura y horas extra mostradas antes de publicar",
        "Reduce la preparación de cuadrantes a una fracción del tiempo anterior",
      ],
    },
    payroll: {
      hr: [
        "Tiempo, ausencias, gastos y variable se sincronizan automáticamente con nómina, sin preparación manual",
        "Detección de discrepancias captura errores antes del envío",
        "Elimina la consolidación manual de datos en cada ciclo de nómina",
      ],
    },
    expenses: {
      employee: [
        "Captura de recibos con OCR desde el móvil que auto-categoriza y envía gastos al instante",
        "Validación de políticas al enviar evita rechazos y correcciones de ida y vuelta",
      ],
      hr: [
        "Conciliación automática y flujos de aprobación integrados directamente con contabilidad",
        "Las violaciones de política se señalan antes de la aprobación, sin necesidad de revisar cada línea manualmente",
        "Reduce significativamente el procesamiento de gastos a fin de mes",
      ],
      manager: [
        "Aprobaciones con un clic sobre envíos pre-validados y con políticas verificadas",
        "Dashboards de gasto del equipo con alertas de presupuesto eliminan la necesidad de perseguir informes",
      ],
    },
    compensations: {
      hr: [
        "Automatiza la gestión de bonos y aumentos, eliminando procesos manuales y errores de cálculo en el presupuesto",
        "El enrutamiento de aprobaciones se automatiza por completo, eliminando cadenas de emails y conflictos de versiones",
        "Las bandas salariales se gestionan directamente en el sistema, sin malabares con hojas de cálculo",
      ],
      manager: [
        "Revisión guiada muestra datos salariales del equipo, benchmarks y presupuesto restante en un solo lugar",
        "Las decisiones de compensación se envían desde la app, sin hilos de email ni seguimiento offline",
      ],
    },
    benefits: {
      hr: [
        "Ventanas de inscripción automáticas con reglas de elegibilidad eliminan la coordinación manual",
        "La integración con proveedores sincroniza las selecciones de beneficios, sin conciliación manual",
      ],
    },
    wellhub: {
      hr: [
        "Plataforma de bienestar integrada en el portal de RRHH",
        "Single sign-on integrado, sin registro separado con el proveedor",
        "Reportes de uso automatizados",
      ],
    },
    complaints: {
      hr: [
        "Portal de denuncias anónimas con gestión de casos integrada sustituye la gestión por email",
        "Cumplimiento de la Directiva de Denunciantes de la UE cubierto de serie",
        "Alertas de plazos y seguimiento de casos eliminan el seguimiento manual",
      ],
    },
    engagement: {
      hr: [
        "Creación, programación y distribución automatizada de encuestas eliminan la configuración manual",
        "Los dashboards en tiempo real desglosan resultados por equipo y departamento, eliminando el análisis manual en Excel",
      ],
      manager: [
        "Puntuaciones de engagement del equipo en un dashboard en vivo con indicadores de tendencia",
        "Las alertas por puntuaciones en descenso incluyen acciones sugeridas, sin necesidad de interpretación manual",
      ],
    },
    performance: {
      hr: [
        "Ciclos de evaluación automatizados gestionan lanzamiento, recordatorios, seguimiento y calibración",
        "Sustituye plantillas de Word y Excel y elimina el seguimiento manual entre ciclos",
      ],
      manager: [
        "Formularios pre-rellenados con datos históricos de rendimiento reducen el tiempo de preparación",
        "El dashboard de rendimiento del equipo está listo para cada 1:1 sin recopilación manual",
      ],
    },
    trainings: {
      hr: [
        "Despliegue automatizado de formación con seguimiento de finalización y reportes de cumplimiento",
        "La documentación de subvenciones y créditos fiscales se genera automáticamente, sin administración manual",
      ],
    },
    lms: {
      hr: [
        "Constructor de cursos con plantillas y creación de contenido asistida por IA acelera el desarrollo",
        "Biblioteca de contenido con control de versiones y analíticas de finalización sustituye el seguimiento manual",
      ],
    },
    recruitment: {
      hr: [
        "ATS completo cubre publicación de ofertas, pipeline, agenda de entrevistas y scorecards",
        "Comunicaciones automáticas con candidatos y actualizaciones de estado eliminan el contacto manual",
        "Reduce significativamente la admin de contratación en cada posición abierta",
      ],
      manager: [
        "Scorecards de entrevista estructurados sustituyen notas libres para cada candidato",
        "Comparación lado a lado de candidatos acelera y estandariza las decisiones de contratación",
      ],
    },
    procurement: {
      hr: [
        "Flujos digitales de órdenes de compra con aprobación multinivel eliminan el seguimiento manual",
        "Visibilidad del gasto irregular identifica compras fuera de proceso automáticamente",
      ],
    },
    projects: {
      hr: [
        "Informes de coste y rentabilidad de proyectos auto-generados a partir de datos de tiempo en vivo",
        "Sustituye hojas de cálculo de asignación de costes en cada proyecto",
      ],
      manager: [
        "Dashboards de proyecto en tiempo real muestran asignación, consumo de presupuesto y rentabilidad de un vistazo",
        "Sustituye por completo el seguimiento manual y la conciliación mensual",
      ],
    },
    crm: {
      hr: [
        "Pools de candidatos y redes de alumni gestionados con flujos de nurturing automatizados",
        "Seguimiento del programa de referidos sustituye el contacto manual y la gestión en hojas de cálculo",
      ],
    },
    headcount_planning: {
      hr: [
        "Planificación de plantilla con escenarios e impacto presupuestario en tiempo real sustituye el modelado en hojas de cálculo",
        "Previsión de headcount actualizada sin reconstrucción manual",
      ],
      manager: [
        "El headcount aprobado frente al real se ve de un vistazo, sin solicitar datos a RRHH",
        "Flujo estructurado de solicitud de posiciones sustituye las peticiones informales por email",
      ],
    },
    space: {
      hr: [
        "Las analíticas de ocupación y las reglas de reserva se automatizan, sin recopilación manual de datos",
        "Planificación de capacidad basada en datos reales de uso sustituye las estimaciones",
      ],
    },
    software_management: {
      hr: [
        "Seguimiento de licencias SaaS con monitorización de uso identifica software sin utilizar automáticamente",
        "Recordatorios de renovación y dashboards de gasto sustituyen el seguimiento manual de proveedores",
      ],
    },
    it_inventory: {
      hr: [
        "El registro centralizado de activos IT está vinculado al ciclo de vida del empleado y se mantiene siempre actualizado",
        "Aprovisionamiento automático al alta y desaprovisionamiento a la baja eliminan tareas manuales de IT",
      ],
    },
    one: {
      employee: [
        "La IA responde al instante sobre políticas, saldos de vacaciones o solicitudes de documentos",
        "Reduce el tiempo buscando en la intranet o esperando respuestas de RRHH por email",
      ],
      hr: [
        "La IA gestiona consultas rutinarias sobre vacaciones, nóminas y políticas sin intervención de RRHH",
        "Libera al equipo de RRHH de peticiones repetitivas para centrarse en trabajo de mayor valor",
      ],
    },
    analytics: {
      hr: [
        "Dashboards pre-construidos de headcount, rotación y diversidad",
        "Constructor de informes personalizados con envío programado",
      ],
    },
    integration_business_central: {
      hr: ["Sincronización bidireccional automática con Business Central elimina la entrada manual de datos entre RRHH y ERP"],
    },
    integration_netsuite: {
      hr: ["Sincronización automática de datos de empleados y nómina con Netsuite — fuente única de verdad entre RRHH y finanzas"],
    },
    integration_sage_200: {
      hr: ["Integración directa con SAGE 200 para datos de nómina y contabilidad elimina exportación/importación manual"],
    },
    integration_milena: {
      hr: ["Sincronización automática de datos de nómina con Milena elimina transferencia manual cada ciclo de pago"],
    },
    integration_suprema_xiptic: {
      hr: ["Sincronización automática de fichajes desde terminales Suprema Xiptic conecta control de acceso con RRHH"],
    },
    silae: {
      hr: ["Sincronización directa con SILAE elimina el intercambio manual de datos con el proveedor"],
    },
  },
  fr: {
    core: {
      employee: [
        "Mise à jour du profil et téléchargement de documents en libre-service élimine les demandes courantes aux RH",
        "Les bulletins de paie et certificats sont toujours accessibles sur mobile, sans attente",
      ],
      hr: [
        "Base de données unique des employés élimine les tableurs en double et le copier-coller",
        "Les workflows d'approbation automatisés gèrent les changements de données sans routage manuel",
        "Checklists d'onboarding/offboarding s'exécutent automatiquement",
      ],
      manager: [
        "Tableau de bord d'équipe affiche approbations en attente, organigramme et rapports directs en un clic",
        "Plus besoin d'envoyer des emails aux RH pour les effectifs, dates de contrat ou détails des employés",
      ],
    },
    time_off: {
      employee: ["Les employés demandent des congés et consultent leurs soldes depuis leur téléphone, sans passer par les RH"],
      hr: [
        "Moteur d'accumulation automatique remplace les calculs manuels de soldes",
        "L'intégration paie synchronise les données de congés automatiquement, sans re-saisie",
        "Règles de politique empêchent la sur-approbation avant qu'elle ne se produise",
      ],
      manager: [
        "Le calendrier visuel de l'équipe montre qui est absent sans consulter de tableurs",
        "Approuver/refuser en un clic avec alertes de détection de conflits",
      ],
    },
    time_tracking: {
      employee: [
        "Pointage depuis n'importe quel appareil remplace les feuilles de présence papier",
        "Les pointages oubliés se résolvent dans l'appli avec approbation du manager, sans relance",
      ],
      hr: [
        "Les données de temps alimentent la paie automatiquement, sans rapprochement hebdomadaire",
        "Les heures supplémentaires sont calculées selon la législation du travail, sans vérification manuelle",
        "Pointages manquants déclenchent des rappels automatiques",
      ],
      manager: [
        "Tableau de bord de présence en temps réel remplace l'appel du matin",
        "Alertes d'anomalies (retards, pointages oubliés) envoyées automatiquement",
      ],
    },
    time_planning: {
      employee: [
        "Les prochains créneaux sont visibles sur mobile, sans plannings papier ni groupes de discussion",
        "Demandes d'échange de créneaux gérées dans l'appli avec notification instantanée au manager",
      ],
      hr: [
        "Plannings générés automatiquement selon la demande, la réglementation et les préférences",
        "Conformité heures supplémentaires et périodes de repos vérifiée automatiquement",
        "Élimine entièrement la création manuelle hebdomadaire des plannings",
      ],
      manager: [
        "Planificateur glisser-déposer avec détection instantanée de conflits",
        "Alertes de couverture et heures supplémentaires affichées avant publication",
        "Réduit la préparation des plannings à une fraction du temps précédent",
      ],
    },
    payroll: {
      hr: [
        "Temps, congés, frais et variable se synchronisent automatiquement avec la paie, sans préparation manuelle",
        "Détection des écarts capture les erreurs avant l'envoi",
        "Élimine la consolidation manuelle des données à chaque cycle de paie",
      ],
    },
    expenses: {
      employee: [
        "Capture de reçus par OCR sur mobile qui auto-catégorise et soumet les frais instantanément",
        "Vérification des politiques à la soumission évite les refus et les allers-retours de corrections",
      ],
      hr: [
        "Rapprochement automatique et workflows d'approbation intégrés directement à la comptabilité",
        "Les violations de politique sont signalées avant approbation, sans revue manuelle ligne par ligne",
        "Réduit significativement le traitement des frais en fin de mois",
      ],
      manager: [
        "Approbation en un clic sur des soumissions pré-validées et conformes aux politiques",
        "Tableaux de bord des dépenses d'équipe avec alertes budgétaires éliminent le besoin de relancer pour les rapports",
      ],
    },
    compensations: {
      hr: [
        "Cycles centralisés de mérite et bonus avec garde-fous budgétaires préviennent les dépassements",
        "Le routage des approbations est entièrement automatisé, ce qui élimine les chaînes d'emails et les conflits de versions",
        "Les grilles salariales se gèrent directement dans le système, sans jongler avec les tableurs",
      ],
      manager: [
        "Révision guidée affiche données salariales de l'équipe, benchmarks et budget restant en un seul endroit",
        "Les décisions de rémunération sont soumises dans l'appli, sans fils d'emails ni suivi hors ligne",
      ],
    },
    benefits: {
      hr: [
        "Fenêtres d'inscription automatiques avec règles d'éligibilité éliminent la coordination manuelle",
        "L'intégration fournisseur synchronise les choix de prestations, sans rapprochement manuel",
      ],
    },
    wellhub: {
      hr: [
        "Plateforme de bien-être intégrée au portail RH",
        "L'authentification unique évite toute inscription séparée",
        "Rapports d'utilisation automatisés",
      ],
    },
    complaints: {
      hr: [
        "Portail de signalement anonyme avec gestion de dossiers intégrée remplace la gestion par email",
        "Conformité Directive Lanceurs d'Alerte UE couverte de base",
        "Alertes de délais et suivi des dossiers éliminent le suivi manuel",
      ],
    },
    engagement: {
      hr: [
        "Création, programmation et distribution automatisées d'enquêtes éliminent la configuration manuelle",
        "Les tableaux de bord en temps réel ventilent les résultats par équipe et département, remplaçant l'analyse manuelle sur Excel",
      ],
      manager: [
        "Scores d'engagement d'équipe dans un dashboard en direct avec indicateurs de tendance",
        "Les alertes en cas de baisse proposent des actions concrètes, sans interprétation manuelle nécessaire",
      ],
    },
    performance: {
      hr: [
        "Cycles d'évaluation automatisés gèrent le lancement, les rappels, le suivi de complétion et la calibration",
        "Remplace les modèles Word et Excel et élimine le suivi manuel entre les cycles",
      ],
      manager: [
        "Formulaires pré-remplis avec données historiques de performance réduisent le temps de préparation",
        "Le dashboard de performance d'équipe est prêt pour chaque entretien individuel sans compilation manuelle",
      ],
    },
    trainings: {
      hr: [
        "Déploiement automatisé de formations avec suivi de complétion et rapports de conformité",
        "La documentation de subventions et crédits d'impôt est générée automatiquement, sans administration manuelle",
      ],
    },
    lms: {
      hr: [
        "Constructeur de cours avec modèles et création de contenu assistée par IA accélère le développement",
        "Bibliothèque de contenu avec contrôle de version et analytiques de complétion remplace le suivi manuel",
      ],
    },
    recruitment: {
      hr: [
        "ATS complet couvre la publication d'offres, le pipeline, la planification d'entretiens et les scorecards",
        "Communications automatiques avec les candidats et mises à jour de statut éliminent les relances manuelles",
        "Réduit significativement l'admin de recrutement pour chaque poste ouvert",
      ],
      manager: [
        "Scorecards d'entretien structurés remplacent les notes libres pour chaque candidat",
        "Comparaison côte à côte des candidats accélère et standardise les décisions d'embauche",
      ],
    },
    procurement: {
      hr: [
        "Flux digitaux de bons de commande avec approbation multiniveau éliminent le suivi manuel",
        "Visibilité des dépenses hors processus identifie les achats non conformes automatiquement",
      ],
    },
    projects: {
      hr: [
        "Rapports de coût et rentabilité des projets auto-générés à partir des données de temps en direct",
        "Remplace les tableurs d'allocation de coûts pour chaque projet",
      ],
      manager: [
        "Tableaux de bord projet en temps réel montrent allocation, consommation budget et rentabilité d'un coup d'œil",
        "Remplace entièrement le suivi manuel et la réconciliation mensuelle",
      ],
    },
    crm: {
      hr: [
        "Viviers de candidats et réseaux alumni gérés avec des flux de nurturing automatisés",
        "Suivi du programme de cooptation remplace les relances manuelles et la gestion sur tableur",
      ],
    },
    headcount_planning: {
      hr: [
        "Planification des effectifs par scénarios avec impact budgétaire en temps réel remplace la modélisation sur tableur",
        "Prévision d'effectifs maintenue à jour sans reconstruction manuelle",
      ],
      manager: [
        "Les effectifs approuvés et réels sont visibles d'un coup d'oeil, sans demander de données aux RH",
        "Flux structuré de demande de postes remplace les réquisitions informelles par email",
      ],
    },
    space: {
      hr: [
        "Les analytiques d'occupation et les règles de réservation sont automatisées, sans collecte manuelle de données",
        "Planification de capacité basée sur les données réelles d'usage remplace les estimations",
      ],
    },
    software_management: {
      hr: [
        "Suivi des licences SaaS avec surveillance de l'utilisation identifie les logiciels inutilisés automatiquement",
        "Rappels de renouvellement et tableaux de bord des dépenses remplacent le suivi manuel des fournisseurs",
      ],
    },
    it_inventory: {
      hr: [
        "Le registre centralisé des actifs IT est lié au cycle de vie de l'employé et reste toujours à jour",
        "Provisionnement auto à l'embauche et déprovisionnement au départ éliminent les tâches IT manuelles",
      ],
    },
    one: {
      employee: [
        "L'IA répond instantanément aux questions sur les politiques, les soldes de congés ou les demandes de documents",
        "Réduit le temps passé à chercher dans l'intranet ou à attendre les réponses RH par email",
      ],
      hr: [
        "L'IA gère les requêtes routinières sur les congés, bulletins et politiques sans intervention RH",
        "Libère l'équipe RH des demandes répétitives pour se concentrer sur le travail à plus forte valeur",
      ],
    },
    analytics: {
      hr: [
        "Tableaux de bord pré-construits pour les effectifs, la rotation et la diversité",
        "Constructeur de rapports personnalisés avec envoi programmé",
      ],
    },
    integration_business_central: {
      hr: ["Synchronisation bidirectionnelle automatique avec Business Central élimine la saisie manuelle entre RH et ERP"],
    },
    integration_netsuite: {
      hr: ["Synchronisation automatique des données employés et paie avec Netsuite — source unique de vérité entre RH et finance"],
    },
    integration_sage_200: {
      hr: ["Intégration directe avec SAGE 200 pour les données de paie et comptabilité élimine l'export/import manuel"],
    },
    integration_milena: {
      hr: ["Synchronisation automatique des données de paie avec Milena élimine le transfert manuel à chaque cycle"],
    },
    integration_suprema_xiptic: {
      hr: ["Synchronisation automatique des pointages depuis les terminaux Suprema Xiptic connecte le contrôle d'accès aux RH"],
    },
    silae: {
      hr: ["Synchronisation directe avec SILAE élimine l'échange manuel de données avec le prestataire"],
    },
  },

  it: {
    core: {
      employee: ["Autoservizio per aggiornamenti profilo e download documenti elimina richieste di routine all'HR", "Buste paga e certificati sempre accessibili da mobile, senza attese"],
      hr: ["Database unico dei dipendenti elimina fogli di calcolo duplicati e copia-incolla", "Flussi di approvazione automatici gestiscono le modifiche ai dati senza routing manuale", "Checklist di onboarding/offboarding si eseguono automaticamente"],
      manager: ["Dashboard del team mostra approvazioni, organigramma e riporti diretti in un click", "Niente più email all'HR per organico, date contrattuali o dettagli dei dipendenti"],
    },
    time_off: {
      employee: ["I dipendenti richiedono ferie e consultano i saldi dal telefono senza passare per le HR"],
      hr: ["Motore di maturazione automatica sostituisce i calcoli manuali dei saldi", "Integrazione con paghe sincronizza i dati di assenza automaticamente", "Regole di policy prevengono le approvazioni eccessive prima che accadano"],
      manager: ["Calendario visuale del team mostra chi è assente senza consultare fogli di calcolo", "Approva o rifiuta in un click con avvisi di conflitto di copertura"],
    },
    time_tracking: {
      employee: ["Timbratura da qualsiasi dispositivo sostituisce i fogli presenze cartacei", "Le timbrature mancanti si risolvono nell'app con approvazione del manager"],
      hr: ["I dati di tempo fluiscono alle paghe automaticamente, eliminando la riconciliazione settimanale", "Gli straordinari sono calcolati secondo la normativa, senza controlli manuali", "Le mancanze attivano promemoria automatici"],
      manager: ["Dashboard presenze in tempo reale sostituisce i controlli mattutini", "Avvisi di anomalie (ritardi, timbrature mancanti) inviati automaticamente"],
    },
    time_planning: {
      employee: ["Turni visibili su mobile, sostituendo fogli cartacei e chat di gruppo", "Richieste di scambio turno gestite nell'app con notifica istantanea al manager"],
      hr: ["Turni generati automaticamente da domanda, regole e preferenze", "Conformità straordinari e riposi verificata automaticamente", "Elimina completamente la creazione manuale settimanale dei turni"],
      manager: ["Pianificatore drag-and-drop con rilevamento conflitti istantaneo", "Avvisi di gap di copertura e straordinari prima della pubblicazione"],
    },
    payroll: {
      hr: ["Tempo, assenze, spese e variabili si sincronizzano automaticamente nelle paghe", "Il rilevamento discrepanze cattura errori prima dell'invio", "Elimina la consolidazione manuale dei dati ad ogni ciclo paghe"],
    },
    expenses: {
      employee: ["Cattura ricevute con OCR dal mobile, auto-categorizza e invia le spese istantaneamente", "Controlli di policy al momento dell'invio prevengono rifiuti e correzioni"],
      hr: ["Riconciliazione automatica e flussi di approvazione integrati con la contabilità", "Violazioni di policy segnalate prima dell'approvazione, senza revisione riga per riga"],
      manager: ["Approvazione in un click su invii pre-validati e conformi alla policy", "Dashboard spese del team con avvisi di budget eliminano la necessità di rincorrere report"],
    },
    compensations: {
      hr: ["Cicli di merito e bonus centralizzati con guardrail di budget prevengono le eccedenze", "Routing approvazioni completamente automatico, eliminando catene email"],
      manager: ["Revisione guidata mostra dati salariali del team, benchmark e budget residuo", "Decisioni retributive inviate nell'app, sostituendo email e tracking offline"],
    },
    recruitment: {
      hr: ["ATS completo: pubblicazione offerte, pipeline candidati, agenda colloqui e scorecard", "Comunicazioni automatiche con i candidati eliminano il follow-up manuale via email"],
      manager: ["Scorecard strutturate sostituiscono appunti liberi per ogni candidato", "Confronto side-by-side dei candidati accelera le decisioni di assunzione"],
    },
    performance: {
      hr: ["Cicli di valutazione automatizzati gestiscono lancio, promemoria e calibrazione", "Sostituisce template Word/Excel ed elimina il rincorso manuale tra i cicli"],
      manager: ["Moduli pre-compilati con dati storici riducono il tempo di preparazione", "Dashboard performance del team pronta per ogni one-to-one"],
    },
    engagement: {
      hr: ["Creazione, programmazione e distribuzione automatica dei sondaggi", "Dashboard in tempo reale con risultati per team e reparto"],
      manager: ["Punteggi engagement del team in dashboard live con indicatori di tendenza", "Avvisi su punteggi in calo con azioni suggerite"],
    },
    trainings: {
      hr: ["Distribuzione automatica della formazione con tracciamento completamento e reporting conformità", "Documentazione sussidi e crediti fiscali generata automaticamente"],
    },
    benefits: {
      hr: ["Finestre di iscrizione automatiche con regole di idoneità eliminano il coordinamento manuale", "Integrazione fornitori sincronizza le selezioni benefit senza riconciliazione manuale"],
    },
    wellhub: {
      hr: ["Piattaforma benessere integrata nel portale HR", "Single sign-on elimina la registrazione separata al provider", "Reporting utilizzo automatizzato"],
    },
    complaints: {
      hr: ["Portale segnalazioni anonime con gestione casi integrata", "Conformità Direttiva Whistleblower UE inclusa", "Avvisi scadenze e tracking casi eliminano il follow-up manuale"],
    },
    one: {
      employee: ["L'IA risponde istantaneamente alle domande HR: policy, saldi, richieste documenti", "Riduce il tempo speso a cercare nell'intranet o aspettare risposte via email"],
      hr: ["L'IA gestisce le richieste di routine su ferie, buste paga e policy senza intervento HR", "Libera il team HR dalle richieste ripetitive per lavoro a maggior valore"],
    },
    projects: {
      hr: ["Report costi e redditività progetto generati automaticamente dai dati di tempo"],
      manager: ["Dashboard progetto in tempo reale mostra allocazione, budget e redditività"],
    },
    procurement: {
      hr: ["Flussi PO digitali con approvazione multi-livello eliminano il follow-up manuale"],
    },
    lms: {
      hr: ["Course builder con template e creazione contenuti assistita da IA accelera lo sviluppo"],
    },
    headcount_planning: {
      hr: ["Pianificazione organico basata su scenari con impatto budget in tempo reale"],
      manager: ["Organico approvato vs effettivo visibile a colpo d'occhio senza chiedere all'HR"],
    },
    silae: {
      hr: ["Sincronizzazione diretta dati paghe con SILAE elimina lo scambio manuale di dati"],
    },
  },
  de: {
    core: {
      employee: ["Self-Service für Profilaktualisierungen und Dokumenten-Downloads beseitigt Routineanfragen an HR", "Gehaltsabrechnungen und Bescheinigungen sind jederzeit mobil verfügbar, ohne Wartezeiten"],
      hr: ["Zentrale Mitarbeiterdatenbank beseitigt doppelte Tabellen und Copy-Paste", "Automatisierte Genehmigungsworkflows bearbeiten Datenänderungen ohne manuelles Routing", "Onboarding/Offboarding-Checklisten laufen automatisch ab"],
      manager: ["Team-Dashboard zeigt offene Genehmigungen, Organigramm und direkte Berichte auf einen Klick", "Keine E-Mails mehr an HR für Personalstand, Vertragsdaten oder Mitarbeiterdetails"],
    },
    time_off: {
      employee: ["Mitarbeiter beantragen Urlaub und prüfen Salden vom Handy — ohne HR-Kontakt"],
      hr: ["Automatische Saldenberechnung ersetzt manuelle Urlaubskontenverwaltung", "Lohnintegration synchronisiert Abwesenheitsdaten automatisch", "Richtlinienregeln verhindern Überzeichnungen bevor sie passieren"],
      manager: ["Visueller Teamkalender zeigt Abwesenheiten ohne Tabellenprüfung", "Ein-Klick-Genehmigung mit Konflikterkennungs-Warnungen"],
    },
    time_tracking: {
      employee: ["Digitale Zeiterfassung von jedem Gerät ersetzt Papier-Stundenzettel", "Fehlende Stempelungen werden in der App mit Manager-Genehmigung gelöst"],
      hr: ["Zeitdaten fließen automatisch in die Lohnabrechnung — ohne wöchentliche Abstimmung", "Überstunden werden gesetzeskonform berechnet, manuelle Prüfungen entfallen", "Fehlende Einträge lösen automatische Erinnerungen aus"],
      manager: ["Echtzeit-Anwesenheits-Dashboard ersetzt morgendliche Kontrollen", "Anomalie-Warnungen (Verspätungen, fehlende Stempelungen) automatisch gesendet"],
    },
    time_planning: {
      employee: ["Kommende Schichten auf dem Handy sichtbar — ersetzt Papierpläne und Gruppenchats", "Schichttausch-Anfragen in der App mit sofortiger Manager-Benachrichtigung"],
      hr: ["Automatisch generierte Dienstpläne aus Bedarf, Arbeitsregeln und Präferenzen", "Überstunden- und Ruhezeit-Compliance automatisch geprüft", "Eliminiert die wöchentliche manuelle Dienstplanerstellung vollständig"],
      manager: ["Drag-and-Drop-Planer mit sofortiger Konflikterkennung", "Deckungslücken- und Überstundenwarnungen vor der Veröffentlichung"],
    },
    payroll: {
      hr: ["Zeit, Abwesenheiten, Spesen und variable Vergütung synchronisieren sich automatisch mit der Lohnabrechnung", "Diskrepanzerkennung fängt Fehler vor der Übermittlung ab", "Eliminiert manuelle Datenkonsolidierung bei jedem Lohnlauf"],
    },
    expenses: {
      employee: ["Mobile Belegerfassung mit OCR kategorisiert und übermittelt Spesen sofort", "Richtlinienprüfung bei Einreichung verhindert Ablehnungen und Korrekturrunden"],
      hr: ["Automatisierte Abstimmung und Genehmigungsworkflows integriert mit der Buchhaltung", "Richtlinienverstöße werden vor der Genehmigung markiert — keine zeilenweise Prüfung mehr"],
      manager: ["Ein-Klick-Genehmigung auf vorab validierte, richtlinienkonforme Einreichungen", "Team-Ausgaben-Dashboards mit Budget-Warnungen ersetzen das Nachfragen von Berichten"],
    },
    compensations: {
      hr: ["Zentrale Merit- und Bonuszyklen mit Budget-Leitplanken verhindern Mehrausgaben", "Genehmigungsrouting vollständig automatisiert — keine E-Mail-Ketten mehr"],
      manager: ["Geführte Überprüfung zeigt Team-Gehaltsdaten, Benchmarks und Restbudget", "Vergütungsentscheidungen werden in der App eingereicht statt per E-Mail"],
    },
    recruitment: {
      hr: ["Vollständiges ATS: Stellenausschreibung, Pipeline, Terminplanung und Scorecards", "Automatisierte Kandidatenkommunikation eliminiert manuelles Follow-up per E-Mail"],
      manager: ["Strukturierte Interview-Scorecards ersetzen freie Notizen für jeden Kandidaten", "Seite-an-Seite-Kandidatenvergleich beschleunigt Einstellungsentscheidungen"],
    },
    performance: {
      hr: ["Automatisierte Bewertungszyklen handhaben Start, Erinnerungen und Kalibrierung", "Ersetzt Word/Excel-Templates und eliminiert manuelles Nachfassen"],
      manager: ["Vorausgefüllte Bewertungsformulare mit historischen Daten reduzieren die Vorbereitungszeit", "Team-Performance-Dashboard bereit für jedes Einzelgespräch"],
    },
    engagement: {
      hr: ["Automatisierte Umfrageerstellung, Planung und Verteilung", "Echtzeit-Dashboards mit Ergebnissen nach Team und Abteilung"],
      manager: ["Team-Engagement-Scores in Live-Dashboard mit Trendanzeigen", "Warnungen bei sinkenden Scores mit vorgeschlagenen Maßnahmen"],
    },
    trainings: {
      hr: ["Automatisierte Schulungsverteilung mit Abschluss-Tracking und Compliance-Reporting", "Fördermittel- und Steuergutschrift-Dokumentation automatisch erstellt"],
    },
    benefits: {
      hr: ["Automatisierte Anmeldefenster mit Berechtigungsregeln eliminieren manuelle Koordination", "Anbieterintegration synchronisiert Benefit-Auswahl ohne manuelle Abstimmung"],
    },
    wellhub: {
      hr: ["Integrierte Wellness-Plattform im HR-Portal", "Single Sign-On beseitigt separate Anbieterregistrierung", "Automatisiertes Nutzungsreporting"],
    },
    complaints: {
      hr: ["Anonymes Meldeportal mit integriertem Fallmanagement", "EU-Hinweisgeberschutzrichtlinie standardmäßig abgedeckt", "Fristenwarnungen und Fallverfolgung eliminieren manuelles Nachfassen"],
    },
    one: {
      employee: ["KI beantwortet HR-Fragen sofort: Richtlinien, Salden, Dokumentenanfragen", "Reduziert die Zeit für Intranet-Suche oder Warten auf HR-E-Mail-Antworten"],
      hr: ["KI bearbeitet Routineanfragen zu Urlaub, Gehaltsabrechnungen und Richtlinien ohne HR-Eingriff", "Befreit das HR-Team von repetitiven Anfragen für wertvollere Arbeit"],
    },
    projects: {
      hr: ["Projektkosten- und Rentabilitätsberichte automatisch aus Echtzeit-Zeitdaten erstellt"],
      manager: ["Echtzeit-Projekt-Dashboard zeigt Zuordnung, Budgetverbrauch und Rentabilität"],
    },
    procurement: {
      hr: ["Digitale PO-Workflows mit mehrstufiger Genehmigung eliminieren manuelles Nachfassen"],
    },
    lms: {
      hr: ["Kurs-Builder mit Templates und KI-unterstützter Inhaltserstellung beschleunigt die Entwicklung"],
    },
    headcount_planning: {
      hr: ["Szenariobasierte Personalplanung mit Echtzeit-Budgetauswirkung"],
      manager: ["Genehmigter vs. tatsächlicher Personalstand auf einen Blick sichtbar"],
    },
    silae: {
      hr: ["Direkte Lohndatensynchronisation mit SILAE eliminiert manuellen Datenaustausch"],
    },
  },
  pt: {
    core: {
      employee: ["Atualizações de perfil e descarregamento de documentos em self-service eliminam pedidos rotineiros ao RH", "Recibos de vencimento e certificados sempre acessíveis no telemóvel, sem esperas"],
      hr: ["Base de dados única de colaboradores elimina folhas de cálculo duplicadas e cópia-colagem", "Fluxos de aprovação automáticos gerem alterações de dados sem encaminhamento manual", "Checklists de onboarding/offboarding executam-se automaticamente"],
      manager: ["Painel de equipa mostra aprovações pendentes, organograma e reportes diretos num clique", "Sem necessidade de contactar o RH para headcount, datas de contrato ou dados de colaboradores"],
    },
    time_off: {
      employee: ["Os colaboradores pedem férias e consultam saldos a partir do telemóvel, sem passar pelo RH"],
      hr: ["Motor de acumulação automática substitui cálculos manuais de saldos", "A integração com vencimentos sincroniza dados de ausências automaticamente, sem reintrodução", "Regras de política impedem aprovação excessiva antes que aconteça"],
      manager: ["Calendário visual da equipa mostra quem está ausente sem consultar folhas de cálculo", "Aprovar/rejeitar com um clique com alertas de deteção de conflitos"],
    },
    time_tracking: {
      employee: ["Registo de ponto digital a partir de qualquer dispositivo substitui folhas de presença em papel", "Entradas em falta resolvem-se na app com aprovação do gestor"],
      hr: ["Dados de tempo fluem para vencimentos automaticamente, sem conciliação semanal", "Horas extra calculadas de acordo com a legislação, sem verificações manuais", "Entradas em falta acionam lembretes automáticos"],
      manager: ["Dashboard de presenças em tempo real substitui verificações matinais", "Alertas de anomalias (atrasos, entradas em falta) enviados automaticamente"],
    },
    time_planning: {
      employee: ["Turnos futuros visíveis no telemóvel, substituindo escalas em papel e chats de grupo", "Pedidos de troca de turno geridos na app com notificação imediata ao gestor"],
      hr: ["Turnos gerados automaticamente a partir de necessidades, regras e preferências", "Conformidade com horas extra e descanso verificada automaticamente", "Elimina completamente a criação manual semanal de escalas"],
      manager: ["Vista de cobertura em tempo real mostra lacunas de pessoal antes de se tornarem problemas", "Trocas de turno aprovadas num clique sem telefonemas nem mensagens"],
    },
    payroll: {
      hr: ["Dados de RH fluem para vencimentos automaticamente — sem reintrodução em cada ciclo", "Horas extra, ausências e variáveis sincronizam-se automaticamente, eliminando consolidação manual"],
      manager: ["Dashboards de custos da equipa com alertas de orçamento eliminam a necessidade de relatórios manuais"],
    },
    expenses: {
      employee: ["Foto do recibo e submissão em segundos, eliminando relatórios de despesas manuais", "O estado da despesa é sempre visível na app — sem necessidade de perguntar ao RH"],
      hr: ["Validação automática de políticas elimina revisão manual de cada submissão", "Sincronização com vencimentos elimina reintrodução de dados de despesas"],
      manager: ["Dashboards de gastos da equipa com alertas de orçamento eliminam seguimento manual"],
    },
    recruitment: {
      hr: ["Publicação automática em múltiplos portais de emprego elimina contacto manual com cada plataforma", "Comunicações automáticas com candidatos e atualizações de estado eliminam contacto manual", "Reduz significativamente a administração de recrutamento em cada posição aberta"],
      manager: ["Scorecards estruturados substituem avaliações ad-hoc e notas dispersas", "Visibilidade do pipeline em tempo real sem pedidos de atualização por email"],
    },
    performance: {
      employee: ["Autoavaliações estruturadas substituem documentos Word dispersos e emails de ida e volta", "Feedback contínuo registado na plataforma substitui conversas informais sem seguimento"],
      hr: ["Ciclos de avaliação automatizados gerem lançamento, lembretes, conclusão e calibração", "Substitui modelos Word e Excel e elimina o seguimento manual entre ciclos"],
      manager: ["Dashboards de desempenho em tempo real mostram o estado do ciclo sem pedir atualizações", "Visibilidade dos OKR da equipa permite coaching orientado por dados em vez de perceções subjetivas"],
    },
    trainings: {
      employee: ["Catálogo de formação centralizado substitui pedidos por email ao RH", "Progresso e certificados acessíveis na app sem esperar pelo RH"],
      hr: ["Inscrição automática em formações obrigatórias elimina coordenação manual", "Relatórios de cumprimento em tempo real substituem folhas de cálculo de seguimento"],
      manager: ["Visibilidade do progresso formativo da equipa elimina verificações manuais de estado"],
    },
    compensations: {
      hr: ["Dados salariais e de mercado centralizados eliminam consolidação manual em cada ciclo de revisão", "Fluxos de aprovação automatizados gerem aumentos e bónus sem encaminhamento manual por email"],
      manager: ["Simulações de orçamento em tempo real substituem folhas de cálculo de impacto salarial", "Aprovações de compensação num clique com trilha de auditoria completa"],
    },
    engagement: {
      hr: ["Inquéritos pulse automáticos com análise de tendências eliminam configuração manual", "Dashboards em tempo real segmentam resultados por equipa e departamento, eliminando análise manual em Excel"],
      manager: ["Alertas de equipas em risco permitem intervenção antecipada antes de problemas de retenção"],
    },
    procurement: {
      hr: ["Fluxos de aprovação digitais com encaminhamento multinível eliminam seguimento manual de compras", "Alertas de orçamento em tempo real eliminam reconciliações de fim de período"],
      manager: ["Visibilidade do estado de todas as compras da equipa elimina pedidos de atualização por email"],
    },
    projects: {
      employee: ["Registo de tempo por projeto a partir de qualquer dispositivo substitui folhas de horas em papel", "Atribuições de projeto claramente visíveis eliminam comunicação manual sobre prioridades"],
      hr: ["Dados de custo por projeto sincronizam automaticamente com nóminas, eliminando reconciliação manual"],
      manager: ["Dashboard de rentabilidade de projeto em tempo real substitui relatórios mensais manuais", "Alertas de desvio de orçamento eliminam surpresas de fim de projeto"],
    },
    headcount_planning: {
      hr: ["Planeamento de posições centralizado elimina folhas de cálculo de headcount dispersas", "Fluxos de aprovação de contratação automatizados substituem cadeias de email entre RH e gestão"],
      manager: ["Visibilidade em tempo real do pipeline de contratação elimina pedidos de estado por email", "Simulações de impacto orçamental de headcount substituem análises manuais em Excel"],
    },
    lms: {
      employee: ["Conteúdo formativo centralizado e acessível no telemóvel elimina procura manual de materiais", "Inscrição automática em formações baseada no cargo elimina pedidos ao RH"],
      hr: ["Seguimento de conclusão automatizado substitui folhas de cálculo de formação", "Lembretes de formação obrigatória eliminam seguimento manual de cumprimento"],
    },
    complaints: {
      hr: ["Canal de denúncias digital com trilha de auditoria substitui gestão de queixas por email", "Relatórios de cumprimento automáticos eliminam documentação manual de incidentes"],
      manager: ["Gestão estruturada de casos reduz tempo em conflitos de equipa não documentados"],
    },
    benefits_standard: {
      employee: ["Portal de benefícios em autoatendimento elimina consultas ao RH sobre vantagens disponíveis", "Inscrição e alterações de benefícios geridas pelo colaborador sem intervenção do RH"],
      hr: ["Gestão de inscrições automatizada elimina processamento manual de formulários de benefícios", "Relatórios de utilização em tempo real substituem auditorias manuais trimestrais"],
    },
    benefits: {
      employee: ["Acesso imediato ao salário já ganho reduz stress financeiro entre pagamentos", "Pedidos de adiantamento geridos na app sem burocracia nem esperas"],
      hr: ["Processo 100% digital de adiantamentos elimina gestão manual de pedidos e reconciliação"],
    },
    space: {
      employee: ["Reserva de secretária e sala em segundos pelo telemóvel, sem emails de agendamento", "Visibilidade de quem está no escritório elimina coordenação manual para dias de equipa"],
      hr: ["Análise de ocupação em tempo real substitui relatórios manuais de utilização do espaço"],
      manager: ["Planeamento de dias de equipa simplificado com visibilidade de presença em tempo real"],
    },
    it_inventory: {
      hr: ["Aprovisionamento automático de equipamento e acessos na entrada elimina listas de verificação manuais", "Desaprovisionamento automático na saída garante conformidade de segurança sem intervenção manual"],
    },
    one: {
      employee: ["IA responde instantaneamente a perguntas de RH, eliminando emails e chamadas à equipa de RH", "Disponível 24/7 para consultas sobre políticas, vencimentos e benefícios sem esperar por resposta humana"],
      hr: ["Reduz significativamente volume de consultas rotineiras, libertando tempo de RH para trabalho estratégico"],
    },
    integration_business_central: {
      hr: ["Sincronização automática bidirecional com Business Central elimina introdução manual de dados entre RH e ERP"],
    },
    integration_netsuite: {
      hr: ["Sincronização automática de dados RH com NetSuite elimina reconciliação manual entre sistemas"],
    },
    integration_sage_200: {
      hr: ["Sincronização automática de dados de vencimentos com Sage 200 elimina introdução manual em cada ciclo"],
    },
    integration_milena: {
      hr: ["Transferência automática de dados de vencimentos para Milena elimina sincronização manual"],
    },
    integration_suprema_xiptic: {
      hr: ["Sincronização automática de registos de ponto dos terminais Suprema elimina reconciliação manual com RH"],
    },
    silae: {
      hr: ["Sincronização automática de dados de processamento salarial com SILAE elimina introdução manual em França"],
    },
  },
};

export function getSavingsDescriptions(lang: string): Record<string, Partial<Record<Stakeholder, string[]>>> {
  return SAVINGS_DESCRIPTIONS_I18N[lang] ?? SAVINGS_DESCRIPTIONS_I18N.en;
}

export const SAVINGS_DESCRIPTIONS: Record<string, Partial<Record<Stakeholder, string>>> = Object.fromEntries(
  Object.entries(SAVINGS_DESCRIPTIONS_I18N.en).map(([modId, stakeholders]) => [
    modId,
    Object.fromEntries(
      Object.entries(stakeholders).map(([s, bullets]) => [s, (bullets as string[]).join(". ") + "."])
    ),
  ])
);

export function defaultHeadcounts(totalSeats: number): { employee: number; hr: number; manager: number } {
  const hr = Math.max(1, Math.round(totalSeats * 0.05));
  const manager = Math.max(1, Math.round(totalSeats * 0.15));
  const employee = Math.max(1, totalSeats - hr - manager);
  return { employee, hr, manager };
}
