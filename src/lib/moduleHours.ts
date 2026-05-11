export type Stakeholder = "employee" | "hr" | "manager";

export interface HoursEntry {
  module_id: string;
  stakeholder: Stakeholder;
  hours_per_month: number;
}

export const MODULE_HOURS: HoursEntry[] = [
  { module_id: "core",              stakeholder: "employee", hours_per_month: 0.5 },
  { module_id: "core",              stakeholder: "hr",       hours_per_month: 10 },
  { module_id: "core",              stakeholder: "manager",  hours_per_month: 0.8 },

  { module_id: "time_off",          stakeholder: "employee", hours_per_month: 0.2 },
  { module_id: "time_off",          stakeholder: "hr",       hours_per_month: 6.7 },
  { module_id: "time_off",          stakeholder: "manager",  hours_per_month: 1.2 },

  { module_id: "time_tracking",     stakeholder: "employee", hours_per_month: 0.4 },
  { module_id: "time_tracking",     stakeholder: "hr",       hours_per_month: 4 },
  { module_id: "time_tracking",     stakeholder: "manager",  hours_per_month: 1.7 },

  { module_id: "time_planning",     stakeholder: "employee", hours_per_month: 0.3 },
  { module_id: "time_planning",     stakeholder: "hr",       hours_per_month: 5 },
  { module_id: "time_planning",     stakeholder: "manager",  hours_per_month: 3.3 },

  { module_id: "compensations",     stakeholder: "hr",       hours_per_month: 4.2 },
  { module_id: "compensations",     stakeholder: "manager",  hours_per_month: 0.5 },

  { module_id: "payroll",           stakeholder: "hr",       hours_per_month: 6 },

  { module_id: "benefits",          stakeholder: "employee", hours_per_month: 0.2 },
  { module_id: "benefits",          stakeholder: "hr",       hours_per_month: 3 },

  { module_id: "wellhub",           stakeholder: "employee", hours_per_month: 0.1 },
  { module_id: "wellhub",           stakeholder: "hr",       hours_per_month: 0.7 },

  { module_id: "complaints",        stakeholder: "hr",       hours_per_month: 0.8 },

  { module_id: "engagement",        stakeholder: "employee", hours_per_month: 0.1 },
  { module_id: "engagement",        stakeholder: "hr",       hours_per_month: 2.5 },
  { module_id: "engagement",        stakeholder: "manager",  hours_per_month: 0.5 },

  { module_id: "performance",       stakeholder: "employee", hours_per_month: 0.2 },
  { module_id: "performance",       stakeholder: "hr",       hours_per_month: 3 },
  { module_id: "performance",       stakeholder: "manager",  hours_per_month: 1 },

  { module_id: "trainings",         stakeholder: "employee", hours_per_month: 0.3 },
  { module_id: "trainings",         stakeholder: "hr",       hours_per_month: 4.7 },
  { module_id: "trainings",         stakeholder: "manager",  hours_per_month: 0.8 },

  { module_id: "lms",               stakeholder: "employee", hours_per_month: 0.2 },
  { module_id: "lms",               stakeholder: "hr",       hours_per_month: 3.3 },
  { module_id: "lms",               stakeholder: "manager",  hours_per_month: 0.4 },

  { module_id: "recruitment",       stakeholder: "hr",       hours_per_month: 5 },
  { module_id: "recruitment",       stakeholder: "manager",  hours_per_month: 1.5 },

  { module_id: "expenses",          stakeholder: "employee", hours_per_month: 0.4 },
  { module_id: "expenses",          stakeholder: "hr",       hours_per_month: 8 },
  { module_id: "expenses",          stakeholder: "manager",  hours_per_month: 0.8 },

  { module_id: "procurement",       stakeholder: "hr",       hours_per_month: 2.5 },
  { module_id: "procurement",       stakeholder: "manager",  hours_per_month: 0.5 },

  { module_id: "projects",          stakeholder: "employee", hours_per_month: 0.2 },
  { module_id: "projects",          stakeholder: "hr",       hours_per_month: 1.7 },
  { module_id: "projects",          stakeholder: "manager",  hours_per_month: 1.2 },

  { module_id: "crm",               stakeholder: "hr",       hours_per_month: 1.5 },

  { module_id: "headcount_planning", stakeholder: "hr",      hours_per_month: 2.5 },
  { module_id: "headcount_planning", stakeholder: "manager", hours_per_month: 0.5 },

  { module_id: "space",             stakeholder: "employee", hours_per_month: 0.2 },
  { module_id: "space",             stakeholder: "hr",       hours_per_month: 0.8 },

  { module_id: "software_management", stakeholder: "hr",     hours_per_month: 1.7 },

  { module_id: "it_inventory",      stakeholder: "hr",       hours_per_month: 2.3 },

  { module_id: "one",               stakeholder: "employee", hours_per_month: 0.2 },
  { module_id: "one",               stakeholder: "hr",       hours_per_month: 1.7 },
];

export function getHoursForModule(moduleId: string): Record<Stakeholder, number> {
  const result: Record<Stakeholder, number> = { employee: 0, hr: 0, manager: 0 };
  for (const e of MODULE_HOURS) {
    if (e.module_id === moduleId) result[e.stakeholder] = e.hours_per_month;
  }
  return result;
}

export const SAVINGS_DESCRIPTIONS: Record<string, Partial<Record<Stakeholder, string>>> = {
  core: {
    employee: "Self-service profile updates & mobile payslip downloads",
    hr: "Single employee database, automated workflows & onboarding checklists",
    manager: "Team dashboard with approvals, org structure & direct reports",
  },
  time_off: {
    employee: "Request leave from mobile, real-time balance visible anytime",
    hr: "Auto-accrual engine, payroll sync & policy rules prevent over-approval",
    manager: "Visual team calendar with one-click approve & conflict detection",
  },
  time_tracking: {
    employee: "Mobile/desktop clock-in replaces paper timesheets",
    hr: "Time data flows to payroll automatically, overtime per labour law",
    manager: "Real-time attendance dashboard with anomaly alerts",
  },
  time_planning: {
    employee: "View shifts on mobile, request swaps directly in-app",
    hr: "Auto-generated rosters from demand, rules & preferences",
    manager: "Drag-and-drop planner with conflict detection & overtime alerts",
  },
  compensations: {
    hr: "Centralised merit/bonus cycles with salary bands & budget guardrails",
    manager: "Guided review with salary data, benchmarks & remaining budget",
  },
  payroll: {
    hr: "Auto-sync from time, leave, expenses & variable comp into payroll",
  },
  benefits: {
    employee: "Browse & enroll in benefits from self-service portal",
    hr: "Automated enrollment windows with vendor integration",
  },
  wellhub: {
    employee: "Access wellness programs directly from HR portal",
    hr: "Automated usage reporting & enrollment management",
  },
  complaints: {
    hr: "Anonymous reporting portal with case management & deadline alerts",
  },
  engagement: {
    employee: "Quick pulse surveys on mobile — 2-minute completion",
    hr: "Automated survey scheduling & real-time team dashboards",
    manager: "Team engagement scores with trend indicators & action plans",
  },
  performance: {
    employee: "Structured self-assessment with goal tracking",
    hr: "Automated review cycles with calibration & completion tracking",
    manager: "Pre-populated review forms with historical performance data",
  },
  trainings: {
    employee: "Self-paced training catalogue accessible from mobile",
    hr: "Automated rollout with completion tracking & compliance reporting",
    manager: "Team completion dashboards with skill gap visibility",
  },
  lms: {
    employee: "Self-paced learning paths with progress tracking",
    hr: "Course builder with AI-assisted content creation & analytics",
    manager: "Team learning progress dashboards",
  },
  recruitment: {
    hr: "End-to-end ATS: posting, pipeline, scheduling & scorecards",
    manager: "Structured interview scorecards & candidate comparison",
  },
  expenses: {
    employee: "Mobile receipt capture with OCR — snap, categorise, submit",
    hr: "Automated reconciliation with policy violations flagged before approval",
    manager: "One-click approvals with team spend dashboards & budget alerts",
  },
  procurement: {
    hr: "Digital PO workflows with budget controls & maverick spend visibility",
    manager: "Self-service purchase requests with real-time budget visibility",
  },
  projects: {
    employee: "Log time against projects from the clock-in interface",
    hr: "Auto-generated project cost & profitability reports",
    manager: "Real-time project dashboards: allocation, budget burn, profitability",
  },
  crm: {
    hr: "Candidate pools & alumni networks with automated nurture workflows",
  },
  headcount_planning: {
    hr: "Scenario-based workforce planning with real-time budget impact",
    manager: "Approved vs. actual headcount at a glance with position requests",
  },
  space: {
    employee: "Mobile desk and room booking with visual office maps",
    hr: "Occupancy analytics & capacity planning from real usage data",
  },
  software_management: {
    hr: "SaaS license tracking with usage monitoring & renewal alerts",
  },
  it_inventory: {
    hr: "IT asset register linked to employee lifecycle, auto-provisioning",
  },
  one: {
    employee: "AI answers HR questions instantly: policies, balances, processes",
    hr: "AI handles routine queries, reduces HR inbox volume by up to 40%",
  },
  analytics: {
    hr: "Pre-built dashboards for headcount, attrition & diversity with scheduled reports",
  },
};

export function defaultHeadcounts(totalSeats: number): { employee: number; hr: number; manager: number } {
  const hr = Math.max(1, Math.round(totalSeats * 0.05));
  const manager = Math.max(1, Math.round(totalSeats * 0.15));
  const employee = Math.max(1, totalSeats - hr - manager);
  return { employee, hr, manager };
}
