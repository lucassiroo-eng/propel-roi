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
  { module_id: "core",              stakeholder: "hr",       hours_per_month: 10.0, scales_with: "onboardings" },
  { module_id: "core",              stakeholder: "manager",  hours_per_month: 1.0,  scales_with: "managers" },

  // Time-off
  { module_id: "time_off",          stakeholder: "hr",       hours_per_month: 10.0, scales_with: "hr_ftes" },
  { module_id: "time_off",          stakeholder: "manager",  hours_per_month: 0.5,  scales_with: "managers" },

  // Time Tracking
  { module_id: "time_tracking",     stakeholder: "employee", hours_per_month: 0.2,  scales_with: "employees" },
  { module_id: "time_tracking",     stakeholder: "hr",       hours_per_month: 10.0, scales_with: "hr_ftes" },
  { module_id: "time_tracking",     stakeholder: "manager",  hours_per_month: 0.5,  scales_with: "managers" },

  // Shift Management
  { module_id: "time_planning",     stakeholder: "employee", hours_per_month: 0.1,  scales_with: "employees" },
  { module_id: "time_planning",     stakeholder: "hr",       hours_per_month: 4.0,  scales_with: "hr_ftes" },
  { module_id: "time_planning",     stakeholder: "manager",  hours_per_month: 12.0, scales_with: "managers" },

  // Payroll Connect
  { module_id: "payroll",           stakeholder: "hr",       hours_per_month: 2.0,  scales_with: "hr_ftes" },

  // Expenses
  { module_id: "expenses",          stakeholder: "employee", hours_per_month: 2.0,  scales_with: "submitters" },
  { module_id: "expenses",          stakeholder: "hr",       hours_per_month: 2.0,  scales_with: "hr_ftes" },
  { module_id: "expenses",          stakeholder: "manager",  hours_per_month: 4.0,  scales_with: "managers" },

  // Compensation
  { module_id: "compensations",     stakeholder: "hr",       hours_per_month: 8.0,  scales_with: "hr_ftes" },
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
  { module_id: "recruitment",       stakeholder: "hr",       hours_per_month: 8.0,  scales_with: "onboardings" },
  { module_id: "recruitment",       stakeholder: "manager",  hours_per_month: 3.0,  scales_with: "onboardings" },

  // Procurement
  { module_id: "procurement",       stakeholder: "hr",       hours_per_month: 1.0,  scales_with: "hr_ftes" },

  // Project Management
  { module_id: "projects",          stakeholder: "hr",       hours_per_month: 8.0,  scales_with: "hr_ftes" },
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
