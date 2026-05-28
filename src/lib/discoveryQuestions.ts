export type Stakeholder = "employee" | "hr" | "manager";

export interface DiscoveryQuestion {
  question: string; // English - will be used as i18n key fallback
  key: string; // i18n key like "discovery.time_off.employee.q1"
}

export const DISCOVERY_QUESTIONS: Record<
  string,
  Partial<Record<Stakeholder, DiscoveryQuestion[]>>
> = {
  // ── Core (Employee Platform) ──────────────────────────────────────────
  core: {
    employee: [
      {
        question:
          "How do you update personal info — address, bank details, emergency contacts?",
        key: "discovery.core.employee.q1",
      },
      {
        question:
          "How do you access company policies or your employment documents?",
        key: "discovery.core.employee.q2",
      },
    ],
    hr: [
      {
        question:
          "How do you manage employee master data today — what tools or spreadsheets are involved?",
        key: "discovery.core.hr.q1",
      },
      {
        question:
          "How long does it take to generate a report on headcount or employee demographics?",
        key: "discovery.core.hr.q2",
      },
    ],
    manager: [
      {
        question:
          "When you need team info — contracts, org chart, reporting lines — how do you get it?",
        key: "discovery.core.manager.q1",
      },
    ],
  },

  // ── Time-off ──────────────────────────────────────────────────────────
  time_off: {
    employee: [
      {
        question:
          "Walk me through requesting a vacation day — what steps and tools are involved?",
        key: "discovery.time_off.employee.q1",
      },
      {
        question: "How do you check your remaining leave balance?",
        key: "discovery.time_off.employee.q2",
      },
    ],
    hr: [
      {
        question:
          "How do you track leave balances, carryover, and absence policies today?",
        key: "discovery.time_off.hr.q1",
      },
      {
        question:
          "What happens when someone calls in sick — what's the admin process?",
        key: "discovery.time_off.hr.q2",
      },
    ],
    manager: [
      {
        question:
          "How do you approve time-off requests and ensure team coverage?",
        key: "discovery.time_off.manager.q1",
      },
    ],
  },

  // ── Time Tracking ─────────────────────────────────────────────────────
  time_tracking: {
    employee: [
      {
        question: "How do you log your working hours today?",
        key: "discovery.time_tracking.employee.q1",
      },
    ],
    hr: [
      {
        question:
          "How are timesheets collected and validated before payroll?",
        key: "discovery.time_tracking.hr.q1",
      },
      {
        question:
          "How do you handle overtime calculations and compliance?",
        key: "discovery.time_tracking.hr.q2",
      },
    ],
    manager: [
      {
        question:
          "How do you monitor your team's hours and flag anomalies?",
        key: "discovery.time_tracking.manager.q1",
      },
    ],
  },

  // ── Shift Management ──────────────────────────────────────────────────
  time_planning: {
    employee: [
      {
        question:
          "How do you find out your work schedule? How far in advance do you know it?",
        key: "discovery.time_planning.employee.q1",
      },
    ],
    hr: [
      {
        question:
          "How are shift rotations created and communicated to employees?",
        key: "discovery.time_planning.hr.q1",
      },
    ],
    manager: [
      {
        question:
          "How do you plan shifts, handle swaps, and manage coverage gaps?",
        key: "discovery.time_planning.manager.q1",
      },
    ],
  },

  // ── Payroll Connect ───────────────────────────────────────────────────
  payroll: {
    hr: [
      {
        question:
          "Walk me through your end-to-end payroll process — tools, steps, people involved.",
        key: "discovery.payroll.hr.q1",
      },
      {
        question:
          "How long does payroll close take and what errors commonly occur?",
        key: "discovery.payroll.hr.q2",
      },
    ],
    manager: [
      {
        question:
          "How do you communicate variable pay or payroll changes for your team?",
        key: "discovery.payroll.manager.q1",
      },
    ],
  },

  // ── Recruitment ───────────────────────────────────────────────────────
  recruitment: {
    hr: [
      {
        question:
          "How do you manage job postings, applications, and your candidate pipeline?",
        key: "discovery.recruitment.hr.q1",
      },
      {
        question:
          "What's your time-to-hire and what slows it down the most?",
        key: "discovery.recruitment.hr.q2",
      },
    ],
    manager: [
      {
        question:
          "How involved are you in hiring — screening, interviews, feedback? How is that coordinated?",
        key: "discovery.recruitment.manager.q1",
      },
    ],
  },

  // ── Performance ───────────────────────────────────────────────────────
  performance: {
    employee: [
      {
        question:
          "How are performance reviews conducted? How often and through what tool?",
        key: "discovery.performance.employee.q1",
      },
    ],
    hr: [
      {
        question:
          "How do you manage the review cycle across the company?",
        key: "discovery.performance.hr.q1",
      },
      {
        question:
          "What's the completion rate and how much chasing is involved?",
        key: "discovery.performance.hr.q2",
      },
    ],
    manager: [
      {
        question:
          "How do you set goals, give feedback, and evaluate your team?",
        key: "discovery.performance.manager.q1",
      },
    ],
  },

  // ── Expenses ──────────────────────────────────────────────────────────
  expenses: {
    employee: [
      {
        question:
          "How do you submit expense reports today? How long does reimbursement take?",
        key: "discovery.expenses.employee.q1",
      },
    ],
    hr: [
      {
        question:
          "How are expenses validated, approved, and reconciled with accounting?",
        key: "discovery.expenses.hr.q1",
      },
    ],
    manager: [
      {
        question: "How do you review and approve team expenses?",
        key: "discovery.expenses.manager.q1",
      },
    ],
  },

  // ── Training ──────────────────────────────────────────────────────────
  trainings: {
    employee: [
      {
        question:
          "How do you find and request training opportunities?",
        key: "discovery.trainings.employee.q1",
      },
    ],
    hr: [
      {
        question:
          "How do you manage the training plan, budget, and compliance tracking?",
        key: "discovery.trainings.hr.q1",
      },
    ],
    manager: [
      {
        question:
          "How do you identify skill gaps and request training for your team?",
        key: "discovery.trainings.manager.q1",
      },
    ],
  },

  // ── Compensation ──────────────────────────────────────────────────────
  compensations: {
    hr: [
      {
        question:
          "How do you manage salary reviews and compensation benchmarking?",
        key: "discovery.compensations.hr.q1",
      },
      {
        question:
          "How transparent is your compensation structure?",
        key: "discovery.compensations.hr.q2",
      },
    ],
    manager: [
      {
        question:
          "How involved are you in salary decisions for your team?",
        key: "discovery.compensations.manager.q1",
      },
    ],
  },

  // ── Engagement ────────────────────────────────────────────────────────
  engagement: {
    hr: [
      {
        question:
          "How do you measure employee satisfaction today? How often?",
        key: "discovery.engagement.hr.q1",
      },
    ],
    manager: [
      {
        question:
          "How do you get pulse feedback from your team?",
        key: "discovery.engagement.manager.q1",
      },
    ],
  },

  // ── Documents ─────────────────────────────────────────────────────────
  documents: {
    employee: [
      {
        question:
          "How do you access payslips, contracts, or certificates?",
        key: "discovery.documents.employee.q1",
      },
    ],
    hr: [
      {
        question:
          "How do you generate, distribute, and store HR documents?",
        key: "discovery.documents.hr.q1",
      },
      {
        question:
          "How long does it take to produce a work certificate or contract amendment?",
        key: "discovery.documents.hr.q2",
      },
    ],
  },

  // ── Procurement ───────────────────────────────────────────────────────
  procurement: {
    hr: [
      {
        question:
          "How do purchase requests flow from request to approval to payment?",
        key: "discovery.procurement.hr.q1",
      },
    ],
    manager: [
      {
        question:
          "How do you request and track team purchases?",
        key: "discovery.procurement.manager.q1",
      },
    ],
  },

  // ── Project Management ────────────────────────────────────────────────
  projects: {
    employee: [
      {
        question: "How do you log time against projects?",
        key: "discovery.projects.employee.q1",
      },
    ],
    manager: [
      {
        question:
          "How do you track project progress and team allocation?",
        key: "discovery.projects.manager.q1",
      },
    ],
  },

  // ── Headcount Planning ────────────────────────────────────────────────
  headcount_planning: {
    hr: [
      {
        question:
          "How do you plan headcount needs and track open positions?",
        key: "discovery.headcount_planning.hr.q1",
      },
    ],
    manager: [
      {
        question:
          "How do you forecast and request new hires?",
        key: "discovery.headcount_planning.manager.q1",
      },
    ],
  },

  // ── Integration: Business Central ─────────────────────────────────────
  integration_business_central: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and Business Central? How often?",
        key: "discovery.integration_business_central.hr.q1",
      },
    ],
  },

  // ── Integration: NetSuite ─────────────────────────────────────────────
  integration_netsuite: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and NetSuite? How often?",
        key: "discovery.integration_netsuite.hr.q1",
      },
    ],
  },

  // ── Integration: Sage 200 ─────────────────────────────────────────────
  integration_sage_200: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and Sage 200? How often?",
        key: "discovery.integration_sage_200.hr.q1",
      },
    ],
  },

  // ── Integration: SAP ──────────────────────────────────────────────────
  integration_sap: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and SAP? How often?",
        key: "discovery.integration_sap.hr.q1",
      },
    ],
  },

  // ── Integration: DATEV ────────────────────────────────────────────────
  integration_datev: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and DATEV? How often?",
        key: "discovery.integration_datev.hr.q1",
      },
    ],
  },

  // ── Integration: A3 ──────────────────────────────────────────────────
  integration_a3: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and A3? How often?",
        key: "discovery.integration_a3.hr.q1",
      },
    ],
  },

  // ── Integration: Xero ─────────────────────────────────────────────────
  integration_xero: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and Xero? How often?",
        key: "discovery.integration_xero.hr.q1",
      },
    ],
  },

  // ── Integration: QuickBooks ───────────────────────────────────────────
  integration_quickbooks: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and QuickBooks? How often?",
        key: "discovery.integration_quickbooks.hr.q1",
      },
    ],
  },

  // ── Integration: Milena ─────────────────────────────────────────────
  integration_milena: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and Milena? How often?",
        key: "discovery.integration_milena.hr.q1",
      },
    ],
  },

  // ── Integration: Suprema / Xiptic ──────────────────────────────────
  integration_suprema_xiptic: {
    hr: [
      {
        question:
          "What manual steps do you take to sync access control or biometric data with your HR system?",
        key: "discovery.integration_suprema_xiptic.hr.q1",
      },
    ],
  },

  // ── Integration: Silae ──────────────────────────────────────────────
  silae: {
    hr: [
      {
        question:
          "What manual data entry do you do between your HR system and Silae? How often?",
        key: "discovery.silae.hr.q1",
      },
    ],
  },
};
