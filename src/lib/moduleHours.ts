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
  { module_id: "core",              stakeholder: "employee", hours_per_month: 0.5,  scales_with: "employees" },
  { module_id: "core",              stakeholder: "hr",       hours_per_month: 30.0, scales_with: "onboardings" },
  { module_id: "core",              stakeholder: "manager",  hours_per_month: 2.0,  scales_with: "managers" },

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
        "Self-service profile updates — no emails to HR",
        "Payslips and certificates downloadable on mobile",
        "Leave requests from mobile with real-time balance",
        "Digital clock-in replaces paper timesheets",
      ],
      hr: [
        "Single employee database — no duplicate spreadsheets",
        "Automated approval workflows for data changes",
        "Onboarding/offboarding checklists run automatically",
        "Auto-accrual engine replaces manual balance calculations",
        "Time data flows to payroll automatically",
        "Overtime calculated per labour law automatically",
      ],
      manager: [
        "Team dashboard with pending approvals and org structure",
        "Visual team calendar — approve/reject with conflict detection",
        "Real-time attendance dashboard",
        "Automatic anomaly alerts",
      ],
    },
    time_planning: {
      employee: [
        "View upcoming shifts on mobile — no paper rosters",
        "Request shift swaps in-app — manager notified instantly",
      ],
      hr: [
        "Auto-generated rosters from demand and labour rules",
        "Overtime and rest compliance checked automatically",
        "Eliminates manual Excel roster creation",
      ],
      manager: [
        "Drag-and-drop planner with conflict detection",
        "Coverage gap warnings and overtime alerts before publishing",
      ],
    },
    payroll: {
      hr: [
        "Auto-sync from time, leave, expenses and variable comp",
        "Eliminates manual data prep before each payroll run",
        "Discrepancy detection catches errors before submission",
      ],
    },
    expenses: {
      employee: [
        "Mobile receipt capture with OCR — snap, categorise, submit",
        "Policy checks at submission prevent rejections",
      ],
      hr: [
        "Automated reconciliation with accounting integration",
        "Policy violations flagged automatically before approval",
      ],
      manager: [
        "One-click approvals with pre-validated policy checks",
        "Team spend dashboards with budget alerts",
      ],
    },
    compensations: {
      hr: [
        "Centralised merit/bonus cycles with budget guardrails",
        "Salary band management in-system — no spreadsheet conflicts",
        "Automated approval routing — no email chains",
      ],
      manager: [
        "Guided review with salary data, benchmarks and remaining budget",
        "Submit compensation decisions in-app",
      ],
    },
    benefits: {
      hr: [
        "Automated enrollment windows with eligibility rules",
        "Vendor integration syncs selections automatically",
      ],
    },
    wellhub: {
      hr: [
        "Integrated wellness platform in the HR portal",
        "Single sign-on — no separate provider registration",
        "Automated usage reporting",
      ],
    },
    complaints: {
      hr: [
        "Anonymous reporting portal with case management",
        "EU Whistleblower Directive compliance out-of-the-box",
        "Case tracking and deadline alerts",
      ],
    },
    engagement: {
      hr: [
        "Automated survey creation, scheduling and distribution",
        "Real-time dashboards by team/department",
      ],
      manager: [
        "Team engagement scores with trend indicators",
        "Declining score alerts and suggested action plans",
      ],
    },
    performance: {
      hr: [
        "Automated review cycles: launch, reminders, calibration",
        "Replaces manual templates and chasing",
      ],
      manager: [
        "Pre-populated review forms with historical data",
        "Team performance dashboard for 1:1 prep",
      ],
    },
    trainings: {
      hr: [
        "Automated rollout with completion tracking",
        "Compliance reporting and subsidy documentation",
      ],
    },
    lms: {
      hr: [
        "Course builder with templates and AI-assisted content",
        "Content library with version control and analytics",
      ],
    },
    recruitment: {
      hr: [
        "End-to-end ATS: posting, pipeline, scheduling, scorecards",
        "Automated candidate status updates and templates",
      ],
      manager: [
        "Structured interview scorecards replace free-form notes",
        "Side-by-side candidate comparison",
      ],
    },
    procurement: {
      hr: [
        "Digital PO workflows with multi-level approval",
        "Maverick spend visibility — identifies off-process purchases",
      ],
    },
    projects: {
      hr: [
        "Project cost and profitability reports auto-generated",
        "Replaces manual cost allocation spreadsheets",
      ],
      manager: [
        "Real-time dashboards: allocation, budget burn, profitability",
        "Replaces manual tracking and month-end reconciliation",
      ],
    },
    crm: {
      hr: [
        "Candidate pools and alumni networks with nurture workflows",
        "Referral program tracking replaces manual outreach",
      ],
    },
    headcount_planning: {
      hr: [
        "Scenario-based workforce planning with budget impact",
        "Replaces spreadsheet-based headcount forecasting",
      ],
      manager: [
        "Approved vs. actual headcount at a glance",
        "Structured position request workflow",
      ],
    },
    space: {
      hr: [
        "Occupancy analytics and booking rules automated",
        "Capacity planning based on real usage data",
      ],
    },
    software_management: {
      hr: [
        "SaaS license tracking with usage monitoring — identifies shelfware",
        "Renewal reminders and spend dashboards",
      ],
    },
    it_inventory: {
      hr: [
        "Centralised IT asset register linked to employee lifecycle",
        "Auto-provisioning on hire, auto-deprovisioning on exit",
      ],
    },
    one: {
      employee: [
        "AI answers HR questions instantly: policies, balances",
        "No more searching the intranet or waiting for HR email",
      ],
      hr: [
        "AI handles routine queries: leave, payslips, policies",
        "Reduces HR inbox volume — frees capacity for strategic work",
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
        "Autoservicio para actualizar datos personales — sin emails a RRHH",
        "Nóminas y certificados descargables desde el móvil",
        "Solicitud de vacaciones desde el móvil con saldo en tiempo real",
        "Fichaje digital que sustituye los partes en papel",
      ],
      hr: [
        "Base de datos única de empleados — sin hojas de cálculo duplicadas",
        "Flujos de aprobación automáticos para cambios de datos",
        "Checklists de onboarding/offboarding automatizados",
        "Motor de devengo automático para cálculo de saldos",
        "Los datos de tiempo fluyen a nómina automáticamente",
        "Horas extra calculadas según legislación laboral",
      ],
      manager: [
        "Panel de equipo con aprobaciones pendientes y organigrama",
        "Calendario visual del equipo — aprobar/rechazar con detección de conflictos",
        "Dashboard de asistencia en tiempo real",
        "Alertas automáticas de anomalías",
      ],
    },
    time_planning: {
      employee: [
        "Consulta de turnos desde el móvil — sin listas en papel",
        "Solicitud de cambio de turno en la app — notificación inmediata al manager",
      ],
      hr: [
        "Generación automática de cuadrantes según demanda y normativa",
        "Cumplimiento de horas extra y descansos verificado automáticamente",
        "Elimina la creación manual de cuadrantes en Excel",
      ],
      manager: [
        "Planificador drag-and-drop con detección de conflictos",
        "Alertas de cobertura y horas extra antes de publicar",
      ],
    },
    payroll: {
      hr: [
        "Sincronización automática de tiempo, ausencias, gastos y variable",
        "Elimina la preparación manual de datos antes de cada nómina",
        "Detección de discrepancias antes del envío",
      ],
    },
    expenses: {
      employee: [
        "Captura de recibos con OCR desde el móvil — foto, categorizar y enviar",
        "Validación de políticas al enviar evita rechazos",
      ],
      hr: [
        "Conciliación automática con integración contable",
        "Violaciones de política señaladas automáticamente",
      ],
      manager: [
        "Aprobaciones con un clic y validación previa de políticas",
        "Dashboards de gasto del equipo con alertas de presupuesto",
      ],
    },
    compensations: {
      hr: [
        "Ciclos centralizados de mérito/bonus con control de presupuesto",
        "Gestión de bandas salariales en el sistema — sin conflictos de versiones",
        "Enrutamiento de aprobaciones automatizado",
      ],
      manager: [
        "Revisión guiada con datos salariales, benchmarks y presupuesto restante",
        "Decisiones de compensación directamente en la app",
      ],
    },
    benefits: {
      hr: [
        "Ventanas de inscripción automáticas con reglas de elegibilidad",
        "Integración con proveedores sincroniza selecciones automáticamente",
      ],
    },
    wellhub: {
      hr: [
        "Plataforma de bienestar integrada en el portal de RRHH",
        "Single sign-on — sin registro separado con el proveedor",
        "Reportes de uso automatizados",
      ],
    },
    complaints: {
      hr: [
        "Portal de denuncias anónimas con gestión de casos",
        "Cumplimiento de la Directiva de Denunciantes de la UE incluido",
        "Seguimiento de casos con alertas de plazos",
      ],
    },
    engagement: {
      hr: [
        "Creación, programación y distribución automatizada de encuestas",
        "Dashboards en tiempo real por equipo/departamento",
      ],
      manager: [
        "Puntuaciones de engagement del equipo con indicadores de tendencia",
        "Alertas por puntuaciones en descenso y planes de acción sugeridos",
      ],
    },
    performance: {
      hr: [
        "Ciclos de evaluación automatizados: lanzamiento, recordatorios, calibración",
        "Sustituye plantillas manuales y seguimiento por email",
      ],
      manager: [
        "Formularios pre-rellenados con datos históricos de rendimiento",
        "Dashboard de rendimiento del equipo para preparar 1:1s",
      ],
    },
    trainings: {
      hr: [
        "Despliegue automatizado con seguimiento de finalización",
        "Reportes de cumplimiento y documentación de subvenciones",
      ],
    },
    lms: {
      hr: [
        "Constructor de cursos con plantillas y contenido asistido por IA",
        "Biblioteca de contenido con control de versiones y analíticas",
      ],
    },
    recruitment: {
      hr: [
        "ATS completo: publicación, pipeline, agenda, scorecards",
        "Actualizaciones automáticas de estado y plantillas de comunicación",
      ],
      manager: [
        "Scorecards de entrevista estructurados sustituyen notas libres",
        "Comparación lado a lado de candidatos",
      ],
    },
    procurement: {
      hr: [
        "Flujos digitales de órdenes de compra con aprobación multinivel",
        "Visibilidad del gasto irregular — identifica compras fuera de proceso",
      ],
    },
    projects: {
      hr: [
        "Informes de coste y rentabilidad de proyectos auto-generados",
        "Sustituye hojas de cálculo de asignación de costes",
      ],
      manager: [
        "Dashboards en tiempo real: asignación, consumo de presupuesto, rentabilidad",
        "Sustituye el seguimiento manual y la conciliación mensual",
      ],
    },
    crm: {
      hr: [
        "Pools de candidatos y redes de alumni con flujos de nurturing",
        "Seguimiento del programa de referidos automatizado",
      ],
    },
    headcount_planning: {
      hr: [
        "Planificación de plantilla con escenarios e impacto presupuestario",
        "Sustituye la previsión de headcount en hojas de cálculo",
      ],
      manager: [
        "Headcount aprobado vs. real de un vistazo",
        "Flujo estructurado de solicitud de posiciones",
      ],
    },
    space: {
      hr: [
        "Analíticas de ocupación y reglas de reserva automatizadas",
        "Planificación de capacidad basada en datos reales de uso",
      ],
    },
    software_management: {
      hr: [
        "Seguimiento de licencias SaaS con monitorización de uso",
        "Recordatorios de renovación y dashboards de gasto",
      ],
    },
    it_inventory: {
      hr: [
        "Registro centralizado de activos IT vinculado al ciclo de vida del empleado",
        "Aprovisionamiento automático al alta, desaprovisionamiento al baja",
      ],
    },
    one: {
      employee: [
        "La IA responde preguntas de RRHH al instante: políticas, saldos",
        "Sin buscar en la intranet ni esperar respuesta de RRHH",
      ],
      hr: [
        "La IA gestiona consultas rutinarias: vacaciones, nóminas, políticas",
        "Reduce el volumen de emails de RRHH — libera capacidad estratégica",
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
        "Mise à jour des données personnelles en libre-service — sans email aux RH",
        "Bulletins de paie et certificats téléchargeables sur mobile",
        "Demande de congés depuis le mobile avec solde en temps réel",
        "Pointage digital remplace les feuilles de présence papier",
      ],
      hr: [
        "Base de données unique des employés — pas de tableurs en double",
        "Flux d'approbation automatiques pour les changements de données",
        "Checklists d'onboarding/offboarding automatisés",
        "Moteur d'acquisition automatique pour le calcul des soldes",
        "Les données de temps alimentent la paie automatiquement",
        "Heures supplémentaires calculées selon la législation du travail",
      ],
      manager: [
        "Tableau de bord d'équipe avec approbations en attente et organigramme",
        "Calendrier d'équipe visuel — approuver/refuser avec détection de conflits",
        "Dashboard de présence en temps réel",
        "Alertes automatiques d'anomalies",
      ],
    },
    time_planning: {
      employee: [
        "Consultation des plannings depuis le mobile — pas de listes papier",
        "Demande d'échange d'horaire dans l'appli — notification instantanée au manager",
      ],
      hr: [
        "Plannings générés automatiquement selon la demande et la réglementation",
        "Conformité heures supplémentaires et repos vérifiée automatiquement",
        "Élimine la création manuelle de plannings Excel",
      ],
      manager: [
        "Planificateur glisser-déposer avec détection de conflits",
        "Alertes de couverture et heures supplémentaires avant publication",
      ],
    },
    payroll: {
      hr: [
        "Synchronisation automatique temps, absences, frais et variable",
        "Élimine la préparation manuelle des données avant chaque paie",
        "Détection des écarts avant l'envoi",
      ],
    },
    expenses: {
      employee: [
        "Capture de reçus par OCR depuis le mobile — photo, catégoriser et envoyer",
        "Vérification des politiques à l'envoi évite les refus",
      ],
      hr: [
        "Rapprochement automatique avec intégration comptable",
        "Violations de politique signalées automatiquement",
      ],
      manager: [
        "Approbation en un clic avec validation préalable des politiques",
        "Tableaux de bord des dépenses d'équipe avec alertes budgétaires",
      ],
    },
    compensations: {
      hr: [
        "Cycles centralisés de mérite/bonus avec contrôle budgétaire",
        "Gestion des grilles salariales dans le système — pas de conflits de versions",
        "Routage des approbations automatisé",
      ],
      manager: [
        "Révision guidée avec données salariales, benchmarks et budget restant",
        "Décisions de rémunération directement dans l'application",
      ],
    },
    benefits: {
      hr: [
        "Fenêtres d'inscription automatiques avec règles d'éligibilité",
        "Intégration fournisseur synchronise les choix automatiquement",
      ],
    },
    wellhub: {
      hr: [
        "Plateforme de bien-être intégrée au portail RH",
        "Authentification unique — pas d'inscription séparée",
        "Rapports d'utilisation automatisés",
      ],
    },
    complaints: {
      hr: [
        "Portail de signalement anonyme avec gestion de dossiers",
        "Conformité Directive Lanceurs d'Alerte UE incluse",
        "Suivi des dossiers avec alertes de délais",
      ],
    },
    engagement: {
      hr: [
        "Création, programmation et distribution automatisées d'enquêtes",
        "Tableaux de bord en temps réel par équipe/département",
      ],
      manager: [
        "Scores d'engagement d'équipe avec indicateurs de tendance",
        "Alertes en cas de baisse et plans d'action suggérés",
      ],
    },
    performance: {
      hr: [
        "Cycles d'évaluation automatisés : lancement, rappels, calibration",
        "Remplace les modèles manuels et le suivi par email",
      ],
      manager: [
        "Formulaires pré-remplis avec données historiques de performance",
        "Dashboard de performance d'équipe pour préparer les 1:1",
      ],
    },
    trainings: {
      hr: [
        "Déploiement automatisé avec suivi de complétion",
        "Rapports de conformité et documentation de subventions",
      ],
    },
    lms: {
      hr: [
        "Constructeur de cours avec modèles et contenu assisté par IA",
        "Bibliothèque de contenu avec contrôle de version et analytiques",
      ],
    },
    recruitment: {
      hr: [
        "ATS complet : publication, pipeline, planification, scorecards",
        "Mises à jour automatiques de statut et modèles de communication",
      ],
      manager: [
        "Scorecards d'entretien structurés remplacent les notes libres",
        "Comparaison côte à côte des candidats",
      ],
    },
    procurement: {
      hr: [
        "Flux digitaux de bons de commande avec approbation multiniveau",
        "Visibilité des dépenses hors processus",
      ],
    },
    projects: {
      hr: [
        "Rapports de coût et rentabilité des projets auto-générés",
        "Remplace les tableurs d'allocation de coûts",
      ],
      manager: [
        "Tableaux de bord temps réel : allocation, consommation budget, rentabilité",
        "Remplace le suivi manuel et la réconciliation mensuelle",
      ],
    },
    crm: {
      hr: [
        "Viviers de candidats et réseaux alumni avec flux de nurturing",
        "Suivi du programme de cooptation automatisé",
      ],
    },
    headcount_planning: {
      hr: [
        "Planification des effectifs par scénarios avec impact budgétaire",
        "Remplace la prévision d'effectifs sur tableur",
      ],
      manager: [
        "Effectifs approuvés vs. réels en un coup d'œil",
        "Flux structuré de demande de postes",
      ],
    },
    space: {
      hr: [
        "Analytiques d'occupation et règles de réservation automatisées",
        "Planification de capacité basée sur les données réelles d'usage",
      ],
    },
    software_management: {
      hr: [
        "Suivi des licences SaaS avec surveillance de l'utilisation",
        "Rappels de renouvellement et tableaux de bord des dépenses",
      ],
    },
    it_inventory: {
      hr: [
        "Registre centralisé des actifs IT lié au cycle de vie de l'employé",
        "Provisionnement auto à l'embauche, déprovisionnement au départ",
      ],
    },
    one: {
      employee: [
        "L'IA répond aux questions RH instantanément : politiques, soldes",
        "Plus besoin de chercher dans l'intranet ou d'attendre un email RH",
      ],
      hr: [
        "L'IA gère les requêtes routinières : congés, bulletins, politiques",
        "Réduit le volume d'emails RH — libère de la capacité stratégique",
      ],
    },
    analytics: {
      hr: [
        "Tableaux de bord pré-construits : effectifs, rotation, diversité",
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
