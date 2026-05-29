export type Stakeholder = "employee" | "hr" | "manager";

export interface DiscoveryQuestion {
  en: string;
  es: string;
  fr: string;
}

export function getQuestion(q: DiscoveryQuestion, lang: string): string {
  if (lang.startsWith("es")) return q.es;
  if (lang.startsWith("fr")) return q.fr;
  return q.en;
}

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
