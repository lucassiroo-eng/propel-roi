export type Stakeholder = "employee" | "hr" | "manager";

export interface LocalizedText {
  en: string;
  es: string;
  fr: string;
}

export type DiscoveryQuestion = LocalizedText;

export function getLocalized(t: LocalizedText, lang: string): string {
  if (lang.startsWith("es")) return t.es;
  if (lang.startsWith("fr")) return t.fr;
  return t.en;
}

export const getQuestion = getLocalized;

export interface ModuleInfo {
  label: LocalizedText;
  description: LocalizedText;
}

export const MODULE_INFO: Record<string, ModuleInfo> = {
  core: {
    label: { en: "Employee Platform / Core", es: "Plataforma del Empleado / Core", fr: "Plateforme Employé / Core" },
    description: { en: "Central hub for employee data, documents, and self-service", es: "Hub central de datos de empleados, documentos y autoservicio", fr: "Hub central des données employés, documents et libre-service" },
  },
  time_off: {
    label: { en: "Time Off", es: "Ausencias", fr: "Congés" },
    description: { en: "Leave requests, balances, and approval workflows", es: "Solicitudes de ausencia, saldos y flujos de aprobación", fr: "Demandes de congés, soldes et workflows d'approbation" },
  },
  time_tracking: {
    label: { en: "Time Tracking", es: "Control Horario", fr: "Suivi du Temps" },
    description: { en: "Clock-in/out, timesheets, and overtime management", es: "Fichaje, hojas de horas y gestión de horas extra", fr: "Pointage, feuilles de temps et gestion des heures sup" },
  },
  time_planning: {
    label: { en: "Shift Management", es: "Gestión de Turnos", fr: "Gestion des Plannings" },
    description: { en: "Shift planning, rotations, and team scheduling", es: "Planificación de turnos, rotaciones y horarios de equipo", fr: "Planification des rotations, des équipes et des plannings" },
  },
  payroll: {
    label: { en: "Payroll Connect", es: "Nóminas", fr: "Paie" },
    description: { en: "Payroll data sync and variable pay management", es: "Sincronización de datos de nómina y gestión de variables", fr: "Synchronisation des données de paie et gestion des variables" },
  },
  recruitment: {
    label: { en: "Recruitment", es: "Selección", fr: "Recrutement" },
    description: { en: "Job postings, candidate pipeline, and hiring workflows", es: "Ofertas, pipeline de candidatos y flujos de contratación", fr: "Offres d'emploi, pipeline de candidats et workflows d'embauche" },
  },
  performance: {
    label: { en: "Performance", es: "Desempeño", fr: "Performance" },
    description: { en: "Reviews, goals, and continuous feedback", es: "Evaluaciones, objetivos y feedback continuo", fr: "Évaluations, objectifs et feedback continu" },
  },
  expenses: {
    label: { en: "Expenses", es: "Gastos", fr: "Notes de Frais" },
    description: { en: "Expense submission, approval, and reimbursement", es: "Presentación, aprobación y reembolso de gastos", fr: "Soumission, approbation et remboursement des frais" },
  },
  trainings: {
    label: { en: "Training", es: "Formación", fr: "Formation" },
    description: { en: "Training plans, compliance tracking, and certifications", es: "Planes de formación, seguimiento de cumplimiento y certificaciones", fr: "Plans de formation, suivi de conformité et certifications" },
  },
  compensations: {
    label: { en: "Compensation", es: "Compensación", fr: "Rémunération" },
    description: { en: "Salary reviews, benchmarking, and budget control", es: "Revisiones salariales, benchmarking y control presupuestario", fr: "Revues salariales, benchmarking et contrôle budgétaire" },
  },
  engagement: {
    label: { en: "Engagement", es: "Engagement", fr: "Engagement" },
    description: { en: "Pulse surveys, eNPS, and team satisfaction", es: "Encuestas pulse, eNPS y satisfacción del equipo", fr: "Enquêtes pulse, eNPS et satisfaction des équipes" },
  },
  documents: {
    label: { en: "Documents", es: "Documentos", fr: "Documents" },
    description: { en: "Document generation, e-signature, and digital vault", es: "Generación de documentos, firma electrónica y archivo digital", fr: "Génération de documents, signature électronique et coffre-fort numérique" },
  },
  procurement: {
    label: { en: "Procurement", es: "Compras", fr: "Achats" },
    description: { en: "Purchase requests, approvals, and vendor management", es: "Solicitudes de compra, aprobaciones y gestión de proveedores", fr: "Demandes d'achat, approbations et gestion des fournisseurs" },
  },
  projects: {
    label: { en: "Projects", es: "Proyectos", fr: "Projets" },
    description: { en: "Project time tracking and team allocation", es: "Control de tiempo por proyecto y asignación de equipo", fr: "Suivi du temps par projet et allocation d'équipe" },
  },
  headcount_planning: {
    label: { en: "Headcount Planning", es: "Planificación de Plantilla", fr: "Planification des Effectifs" },
    description: { en: "Workforce planning and position management", es: "Planificación de plantilla y gestión de posiciones", fr: "Planification des effectifs et gestion des postes" },
  },
  lms: {
    label: { en: "LMS", es: "LMS", fr: "LMS" },
    description: { en: "Learning management system with courses and quizzes", es: "Sistema de gestión del aprendizaje con cursos y tests", fr: "Système de gestion de l'apprentissage avec cours et quiz" },
  },
  complaints: {
    label: { en: "Trust Channel", es: "Canal de Denuncias", fr: "Canal de Confiance" },
    description: { en: "Anonymous reporting and whistleblower compliance", es: "Canal de denuncias anónimas y cumplimiento normativo", fr: "Signalement anonyme et conformité lanceur d'alerte" },
  },
  benefits_standard: {
    label: { en: "Benefits", es: "Beneficios", fr: "Avantages" },
    description: { en: "Flexible benefits enrollment and management", es: "Inscripción y gestión de beneficios flexibles", fr: "Inscription et gestion des avantages sociaux" },
  },
  benefits: {
    label: { en: "Salary Advance", es: "Anticipo de Nómina", fr: "Avance sur Salaire" },
    description: { en: "On-demand salary advance for employees", es: "Anticipo de nómina a demanda para empleados", fr: "Avance sur salaire à la demande pour les employés" },
  },
  wellhub: {
    label: { en: "Wellhub", es: "Wellhub", fr: "Wellhub" },
    description: { en: "Integrated wellness programs for employees", es: "Programas de bienestar integrados para empleados", fr: "Programmes de bien-être intégrés pour les employés" },
  },
};

export const DISCOVERY_QUESTIONS: Record<
  string,
  Partial<Record<Stakeholder, DiscoveryQuestion[]>>
> = {
  // ── Core (Employee Platform) ──────────────────────────────────────────
  core: {
    employee: [
      {
        en: "How do you handle your day-to-day HR tasks today?",
        es: "¿Cómo gestionáis las tareas de RRHH del día a día?",
        fr: "Comment gérez-vous vos tâches RH au quotidien ?",
      },
    ],
    hr: [
      {
        en: "What tools do you use to manage employee data?",
        es: "¿Qué herramientas usáis para gestionar los datos de empleados?",
        fr: "Quels outils utilisez-vous pour gérer les données employés ?",
      },
    ],
    manager: [
      {
        en: "How do you access information about your team?",
        es: "¿Cómo accedéis a la información de vuestro equipo?",
        fr: "Comment accédez-vous aux informations de votre équipe ?",
      },
    ],
  },

  // ── Time-off ──────────────────────────────────────────────────────────
  time_off: {
    employee: [
      {
        en: "How do you request time off today?",
        es: "¿Cómo solicitáis las ausencias actualmente?",
        fr: "Comment demandez-vous vos congés aujourd'hui ?",
      },
    ],
    hr: [
      {
        en: "How do you manage absences and leave balances?",
        es: "¿Cómo gestionáis las ausencias y los saldos de vacaciones?",
        fr: "Comment gérez-vous les absences et les soldes de congés ?",
      },
    ],
    manager: [
      {
        en: "How do you handle leave approvals for your team?",
        es: "¿Cómo gestionáis las aprobaciones de ausencias de vuestro equipo?",
        fr: "Comment gérez-vous les approbations de congés de votre équipe ?",
      },
    ],
  },

  // ── Time Tracking ─────────────────────────────────────────────────────
  time_tracking: {
    employee: [
      {
        en: "How do you track your working hours?",
        es: "¿Cómo registráis vuestras horas de trabajo?",
        fr: "Comment suivez-vous vos heures de travail ?",
      },
    ],
    hr: [
      {
        en: "How do you collect and validate timesheets?",
        es: "¿Cómo recopiláis y validáis los registros horarios?",
        fr: "Comment collectez-vous et validez-vous les feuilles de temps ?",
      },
    ],
    manager: [
      {
        en: "How do you monitor your team's hours?",
        es: "¿Cómo controláis las horas de vuestro equipo?",
        fr: "Comment suivez-vous les heures de votre équipe ?",
      },
    ],
  },

  // ── Shift Management ──────────────────────────────────────────────────
  time_planning: {
    employee: [
      {
        en: "How do you find out your work schedule?",
        es: "¿Cómo os enteráis de vuestro horario de trabajo?",
        fr: "Comment connaissez-vous votre planning de travail ?",
      },
    ],
    hr: [
      {
        en: "How are shifts planned and communicated?",
        es: "¿Cómo se planifican y comunican los turnos?",
        fr: "Comment les plannings sont-ils créés et communiqués ?",
      },
    ],
    manager: [
      {
        en: "How do you organize shifts and handle changes?",
        es: "¿Cómo organizáis los turnos y gestionáis los cambios?",
        fr: "Comment organisez-vous les rotations et gérez-vous les changements ?",
      },
    ],
  },

  // ── Payroll Connect ───────────────────────────────────────────────────
  payroll: {
    hr: [
      {
        en: "What does your payroll process look like today?",
        es: "¿Cómo es vuestro proceso de nóminas actualmente?",
        fr: "À quoi ressemble votre processus de paie aujourd'hui ?",
      },
    ],
    manager: [
      {
        en: "How do you communicate pay-related changes for your team?",
        es: "¿Cómo comunicáis los cambios salariales de vuestro equipo?",
        fr: "Comment communiquez-vous les changements de rémunération pour votre équipe ?",
      },
    ],
  },

  // ── Recruitment ───────────────────────────────────────────────────────
  recruitment: {
    hr: [
      {
        en: "How do you manage your hiring process?",
        es: "¿Cómo gestionáis vuestro proceso de selección?",
        fr: "Comment gérez-vous votre processus de recrutement ?",
      },
    ],
    manager: [
      {
        en: "How are you involved in hiring for your team?",
        es: "¿Cómo participáis en la contratación para vuestro equipo?",
        fr: "Comment participez-vous au recrutement pour votre équipe ?",
      },
    ],
  },

  // ── Performance ───────────────────────────────────────────────────────
  performance: {
    employee: [
      {
        en: "How are performance reviews done today?",
        es: "¿Cómo se hacen las evaluaciones de desempeño actualmente?",
        fr: "Comment les évaluations de performance sont-elles réalisées aujourd'hui ?",
      },
    ],
    hr: [
      {
        en: "How do you manage the review cycle?",
        es: "¿Cómo gestionáis el ciclo de evaluaciones?",
        fr: "Comment gérez-vous le cycle d'évaluations ?",
      },
    ],
    manager: [
      {
        en: "How do you set goals and give feedback to your team?",
        es: "¿Cómo fijáis objetivos y dais feedback a vuestro equipo?",
        fr: "Comment fixez-vous les objectifs et donnez-vous du feedback à votre équipe ?",
      },
    ],
  },

  // ── Expenses ──────────────────────────────────────────────────────────
  expenses: {
    employee: [
      {
        en: "How do you submit expenses today?",
        es: "¿Cómo presentáis los gastos actualmente?",
        fr: "Comment soumettez-vous vos notes de frais aujourd'hui ?",
      },
    ],
    hr: [
      {
        en: "How are expenses validated and processed?",
        es: "¿Cómo se validan y procesan los gastos?",
        fr: "Comment les notes de frais sont-elles validées et traitées ?",
      },
    ],
    manager: [
      {
        en: "How do you review and approve team expenses?",
        es: "¿Cómo revisáis y aprobáis los gastos de vuestro equipo?",
        fr: "Comment examinez-vous et approuvez-vous les dépenses de votre équipe ?",
      },
    ],
  },

  // ── Training ──────────────────────────────────────────────────────────
  trainings: {
    employee: [
      {
        en: "How do you access training opportunities?",
        es: "¿Cómo accedéis a las oportunidades de formación?",
        fr: "Comment accédez-vous aux opportunités de formation ?",
      },
    ],
    hr: [
      {
        en: "How do you manage the training plan?",
        es: "¿Cómo gestionáis el plan de formación?",
        fr: "Comment gérez-vous le plan de formation ?",
      },
    ],
    manager: [
      {
        en: "How do you identify training needs for your team?",
        es: "¿Cómo identificáis las necesidades de formación de vuestro equipo?",
        fr: "Comment identifiez-vous les besoins en formation de votre équipe ?",
      },
    ],
  },

  // ── Compensation ──────────────────────────────────────────────────────
  compensations: {
    hr: [
      {
        en: "How do you manage salary reviews?",
        es: "¿Cómo gestionáis las revisiones salariales?",
        fr: "Comment gérez-vous les revues salariales ?",
      },
    ],
    manager: [
      {
        en: "How are you involved in compensation decisions?",
        es: "¿Cómo participáis en las decisiones de compensación?",
        fr: "Comment participez-vous aux décisions de rémunération ?",
      },
    ],
  },

  // ── Engagement ────────────────────────────────────────────────────────
  engagement: {
    hr: [
      {
        en: "How do you measure employee satisfaction?",
        es: "¿Cómo medís la satisfacción de los empleados?",
        fr: "Comment mesurez-vous la satisfaction des employés ?",
      },
    ],
    manager: [
      {
        en: "How do you get feedback from your team?",
        es: "¿Cómo obtenéis feedback de vuestro equipo?",
        fr: "Comment recueillez-vous le feedback de votre équipe ?",
      },
    ],
  },

  // ── Documents ─────────────────────────────────────────────────────────
  documents: {
    employee: [
      {
        en: "How do you access your HR documents?",
        es: "¿Cómo accedéis a vuestros documentos de RRHH?",
        fr: "Comment accédez-vous à vos documents RH ?",
      },
    ],
    hr: [
      {
        en: "How do you generate and distribute HR documents?",
        es: "¿Cómo generáis y distribuís los documentos de RRHH?",
        fr: "Comment générez-vous et distribuez-vous les documents RH ?",
      },
    ],
  },

  // ── Procurement ───────────────────────────────────────────────────────
  procurement: {
    hr: [
      {
        en: "How do purchase requests work today?",
        es: "¿Cómo funcionan las solicitudes de compra actualmente?",
        fr: "Comment fonctionnent les demandes d'achat aujourd'hui ?",
      },
    ],
    manager: [
      {
        en: "How do you manage team purchases?",
        es: "¿Cómo gestionáis las compras de vuestro equipo?",
        fr: "Comment gérez-vous les achats de votre équipe ?",
      },
    ],
  },

  // ── Project Management ────────────────────────────────────────────────
  projects: {
    employee: [
      {
        en: "How do you log time against projects?",
        es: "¿Cómo registráis el tiempo en los proyectos?",
        fr: "Comment enregistrez-vous le temps passé sur les projets ?",
      },
    ],
    manager: [
      {
        en: "How do you track project progress?",
        es: "¿Cómo hacéis seguimiento del progreso de los proyectos?",
        fr: "Comment suivez-vous l'avancement des projets ?",
      },
    ],
  },

  // ── Headcount Planning ────────────────────────────────────────────────
  headcount_planning: {
    hr: [
      {
        en: "How do you plan headcount needs?",
        es: "¿Cómo planificáis las necesidades de plantilla?",
        fr: "Comment planifiez-vous les besoins en effectifs ?",
      },
    ],
    manager: [
      {
        en: "How do you forecast and request new hires?",
        es: "¿Cómo preveéis y solicitáis nuevas contrataciones?",
        fr: "Comment prévoyez-vous et demandez-vous de nouveaux recrutements ?",
      },
    ],
  },

  // ── Integration: Business Central ─────────────────────────────────────
  integration_business_central: {
    hr: [
      {
        en: "What data do you sync manually with Business Central?",
        es: "¿Qué datos sincronizáis manualmente con Business Central?",
        fr: "Quelles données synchronisez-vous manuellement avec Business Central ?",
      },
    ],
  },

  // ── Integration: NetSuite ─────────────────────────────────────────────
  integration_netsuite: {
    hr: [
      {
        en: "What data do you sync manually with NetSuite?",
        es: "¿Qué datos sincronizáis manualmente con NetSuite?",
        fr: "Quelles données synchronisez-vous manuellement avec NetSuite ?",
      },
    ],
  },

  // ── Integration: Sage 200 ─────────────────────────────────────────────
  integration_sage_200: {
    hr: [
      {
        en: "What data do you sync manually with Sage 200?",
        es: "¿Qué datos sincronizáis manualmente con Sage 200?",
        fr: "Quelles données synchronisez-vous manuellement avec Sage 200 ?",
      },
    ],
  },

  // ── Integration: SAP ──────────────────────────────────────────────────
  integration_sap: {
    hr: [
      {
        en: "What data do you sync manually with SAP?",
        es: "¿Qué datos sincronizáis manualmente con SAP?",
        fr: "Quelles données synchronisez-vous manuellement avec SAP ?",
      },
    ],
  },

  // ── Integration: DATEV ────────────────────────────────────────────────
  integration_datev: {
    hr: [
      {
        en: "What data do you sync manually with DATEV?",
        es: "¿Qué datos sincronizáis manualmente con DATEV?",
        fr: "Quelles données synchronisez-vous manuellement avec DATEV ?",
      },
    ],
  },

  // ── Integration: A3 ──────────────────────────────────────────────────
  integration_a3: {
    hr: [
      {
        en: "What data do you sync manually with A3?",
        es: "¿Qué datos sincronizáis manualmente con A3?",
        fr: "Quelles données synchronisez-vous manuellement avec A3 ?",
      },
    ],
  },

  // ── Integration: Xero ─────────────────────────────────────────────────
  integration_xero: {
    hr: [
      {
        en: "What data do you sync manually with Xero?",
        es: "¿Qué datos sincronizáis manualmente con Xero?",
        fr: "Quelles données synchronisez-vous manuellement avec Xero ?",
      },
    ],
  },

  // ── Integration: QuickBooks ───────────────────────────────────────────
  integration_quickbooks: {
    hr: [
      {
        en: "What data do you sync manually with QuickBooks?",
        es: "¿Qué datos sincronizáis manualmente con QuickBooks?",
        fr: "Quelles données synchronisez-vous manuellement avec QuickBooks ?",
      },
    ],
  },

  // ── Integration: Milena ─────────────────────────────────────────────
  integration_milena: {
    hr: [
      {
        en: "What data do you sync manually with Milena?",
        es: "¿Qué datos sincronizáis manualmente con Milena?",
        fr: "Quelles données synchronisez-vous manuellement avec Milena ?",
      },
    ],
  },

  // ── Integration: Suprema / Xiptic ──────────────────────────────────
  integration_suprema_xiptic: {
    hr: [
      {
        en: "What data do you sync manually with your access control system?",
        es: "¿Qué datos sincronizáis manualmente con vuestro sistema de control de acceso?",
        fr: "Quelles données synchronisez-vous manuellement avec votre système de contrôle d'accès ?",
      },
    ],
  },

  // ── Integration: Silae ──────────────────────────────────────────────
  silae: {
    hr: [
      {
        en: "What data do you sync manually with Silae?",
        es: "¿Qué datos sincronizáis manualmente con Silae?",
        fr: "Quelles données synchronisez-vous manuellement avec Silae ?",
      },
    ],
  },
};
