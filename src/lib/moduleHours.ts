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

export const SAVINGS_DESCRIPTIONS: Record<string, Partial<Record<Stakeholder, string>>> = {
  core: {
    employee: "Self-service profile updates replace emailing HR (~2 min/change × ~1/month). Payslips and certificates downloadable on mobile — zero HR requests. Request leave from mobile in 30 seconds — real-time balance visible anytime. Mobile/desktop clock-in replaces paper timesheets (~2 min/day × 20 days).",
    hr: "Single employee database eliminates duplicate spreadsheets and copy-paste. Automated approval workflows for data changes — no manual routing. Onboarding/offboarding checklists run automatically (~2.5h/week). Auto-accrual engine replaces manual balance calculations. Time data flows to payroll automatically — no weekly reconciliation. Overtime calculated per labour law — no manual compliance checks.",
    manager: "Team dashboard shows pending approvals, org structure, direct reports in one click. Visual team calendar shows who's off — one-click approve/reject with conflict detection. Real-time attendance dashboard replaces morning roll calls. Anomaly alerts sent automatically.",
  },
  time_planning: {
    employee: "View upcoming shifts on mobile — no paper rosters or WhatsApp groups. Request shift swaps directly in-app — manager notified instantly (6 min/month).",
    hr: "Auto-generated rosters from demand + labour rules + preferences. Overtime and rest compliance checked automatically. Eliminates weekly Excel roster creation (~1h/week).",
    manager: "Drag-and-drop planner with instant conflict detection. Coverage gap warnings and overtime alerts before publishing (~3h/week).",
  },
  payroll: {
    hr: "Auto-sync from time, leave, expenses, variable comp into payroll. Eliminates manual data prep (~0.5h/run × 12 runs/year). Discrepancy detection catches errors before payroll submission.",
  },
  expenses: {
    employee: "Mobile receipt capture with OCR — snap photo, auto-categorise, submit. Policy checks at submission prevent rejections — no more back-and-forth.",
    hr: "Automated reconciliation and approval workflows with accounting integration. Policy violations flagged before approval (~8h/month).",
    manager: "One-click approvals with pre-validated policy checks. Team spend dashboards with budget alerts.",
  },
  compensations: {
    hr: "Centralised merit/bonus cycles with budget guardrails. Salary band management in-system — no spreadsheet version conflicts. Approval routing automated — eliminates email chains.",
    manager: "Guided review with team salary data, benchmarks, and remaining budget. Submit compensation decisions in-app instead of email threads.",
  },
  benefits: {
    hr: "Automated enrollment windows with eligibility rules. Vendor integration syncs selections — no manual reconciliation (~3h/month).",
  },
  wellhub: {
    hr: "Integrated wellness platform (gym, mental health) in HR portal. Single sign-on — no separate provider registration. Automated usage reporting — no manual data collection.",
  },
  complaints: {
    hr: "Anonymous reporting portal with built-in case management. EU Whistleblower Directive compliance out-of-the-box. Case tracking and deadline alerts replace email-based handling.",
  },
  engagement: {
    hr: "Automated survey creation, scheduling, and distribution. Real-time dashboards by team/dept — no manual Excel analysis (~2.5h/month).",
    manager: "Team engagement scores in dashboard with trend indicators. Declining score alerts and suggested action plans.",
  },
  performance: {
    hr: "Automated review cycles: launch, reminders, completion tracking, calibration. Replaces Word/Excel templates and manual chasing (~18h/cycle × 2/year).",
    manager: "Pre-populated review forms with historical performance data. Team performance dashboard for 1:1 prep (~3h/cycle × 2 cycles).",
  },
  trainings: {
    hr: "Automated rollout with completion tracking and compliance reporting. Subsidy and tax credit documentation generated automatically (~4.5h/month).",
  },
  lms: {
    hr: "Course builder with templates and AI-assisted content creation. Content library with version control and completion analytics (~7h/course × 6/yr).",
  },
  recruitment: {
    hr: "End-to-end ATS: job posting, pipeline, interview scheduling, scorecards. Automated candidate status updates and communication templates (~8h/hire).",
    manager: "Structured interview scorecards replace free-form notes. Side-by-side candidate comparison for hiring decisions (~2.5h/hire).",
  },
  procurement: {
    hr: "Digital PO workflows with multi-level approval routing and budget controls. Maverick spend visibility — identifies off-process purchases.",
  },
  projects: {
    hr: "Project cost and profitability reports auto-generated from time data. Replaces manual cost allocation spreadsheets.",
    manager: "Real-time project dashboards: allocation, budget burn, profitability. Replaces manual tracking and month-end reconciliation (~1h/month).",
  },
  crm: {
    hr: "Candidate pools and alumni networks with automated nurture workflows. Referral program tracking replaces manual outreach management.",
  },
  headcount_planning: {
    hr: "Scenario-based workforce planning with real-time budget impact. Replaces spreadsheet-based headcount forecasting.",
    manager: "Approved vs. actual headcount at a glance. Structured position request workflow — no email requisitions.",
  },
  space: {
    hr: "Occupancy analytics and booking rules automated. Capacity planning based on real usage data.",
  },
  software_management: {
    hr: "SaaS license tracking with usage monitoring — identifies shelfware. Renewal reminders and spend dashboards replace manual vendor tracking.",
  },
  it_inventory: {
    hr: "Centralised IT asset register linked to employee lifecycle. Auto-provisioning on hire, auto-deprovisioning on exit (~2.5h/month).",
  },
  one: {
    employee: "AI answers HR questions instantly: policy lookups, balance checks. Reduces time searching intranet or waiting for HR email response.",
    hr: "AI handles routine queries: leave, payslips, policies. Reduces HR inbox volume by up to 40% — frees time for strategic work.",
  },
  analytics: {
    hr: "Pre-built dashboards for headcount, attrition and diversity. Custom report builder with scheduled delivery — real-time metrics for leadership.",
  },
};

export function defaultHeadcounts(totalSeats: number): { employee: number; hr: number; manager: number } {
  const hr = Math.max(1, Math.round(totalSeats * 0.05));
  const manager = Math.max(1, Math.round(totalSeats * 0.15));
  const employee = Math.max(1, totalSeats - hr - manager);
  return { employee, hr, manager };
}
