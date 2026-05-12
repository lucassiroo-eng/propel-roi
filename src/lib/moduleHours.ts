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
  { module_id: "core",              stakeholder: "hr",       hours_per_month: 10,   scales_with: "onboardings" },
  { module_id: "core",              stakeholder: "manager",  hours_per_month: 1.0,  scales_with: "managers" },

  // Time Off
  { module_id: "time_off",          stakeholder: "employee", hours_per_month: 0.2,  scales_with: "employees" },
  { module_id: "time_off",          stakeholder: "hr",       hours_per_month: 6.0,  scales_with: "hr_ftes" },
  { module_id: "time_off",          stakeholder: "manager",  hours_per_month: 1.0,  scales_with: "managers" },

  // Time Tracking
  { module_id: "time_tracking",     stakeholder: "employee", hours_per_month: 0.7,  scales_with: "employees" },
  { module_id: "time_tracking",     stakeholder: "hr",       hours_per_month: 4.0,  scales_with: "hr_ftes" },
  { module_id: "time_tracking",     stakeholder: "manager",  hours_per_month: 0.5,  scales_with: "managers" },

  // Shift Management
  { module_id: "time_planning",     stakeholder: "employee", hours_per_month: 0.5,  scales_with: "employees" },
  { module_id: "time_planning",     stakeholder: "hr",       hours_per_month: 5.0,  scales_with: "hr_ftes" },
  { module_id: "time_planning",     stakeholder: "manager",  hours_per_month: 3.0,  scales_with: "managers" },

  // Payroll Connect
  { module_id: "payroll",           stakeholder: "hr",       hours_per_month: 6.0,  scales_with: "hr_ftes" },

  // Expenses
  { module_id: "expenses",          stakeholder: "employee", hours_per_month: 0.5,  scales_with: "submitters" },
  { module_id: "expenses",          stakeholder: "hr",       hours_per_month: 8.0,  scales_with: "hr_ftes" },
  { module_id: "expenses",          stakeholder: "manager",  hours_per_month: 1.0,  scales_with: "managers" },

  // Compensation
  { module_id: "compensations",     stakeholder: "hr",       hours_per_month: 4.2,  scales_with: "hr_ftes" },
  { module_id: "compensations",     stakeholder: "manager",  hours_per_month: 0.5,  scales_with: "managers" },

  // Benefits
  { module_id: "benefits",          stakeholder: "hr",       hours_per_month: 3.0,  scales_with: "hr_ftes" },

  // Wellhub
  { module_id: "wellhub",           stakeholder: "hr",       hours_per_month: 0.7,  scales_with: "hr_ftes" },

  // Trust Channel
  { module_id: "complaints",        stakeholder: "hr",       hours_per_month: 0.8,  scales_with: "hr_ftes" },

  // Engagement
  { module_id: "engagement",        stakeholder: "hr",       hours_per_month: 2.5,  scales_with: "hr_ftes" },
  { module_id: "engagement",        stakeholder: "manager",  hours_per_month: 0.5,  scales_with: "managers" },

  // Performance
  { module_id: "performance",       stakeholder: "hr",       hours_per_month: 3.0,  scales_with: "hr_ftes" },
  { module_id: "performance",       stakeholder: "manager",  hours_per_month: 1.0,  scales_with: "managers" },

  // Trainings
  { module_id: "trainings",         stakeholder: "hr",       hours_per_month: 4.7,  scales_with: "hr_ftes" },
  { module_id: "trainings",         stakeholder: "manager",  hours_per_month: 0.8,  scales_with: "managers" },

  // LMS
  { module_id: "lms",               stakeholder: "hr",       hours_per_month: 3.3,  scales_with: "hr_ftes" },

  // Recruitment
  { module_id: "recruitment",       stakeholder: "hr",       hours_per_month: 8.0,  scales_with: "onboardings" },
  { module_id: "recruitment",       stakeholder: "manager",  hours_per_month: 2.5,  scales_with: "onboardings" },

  // Procurement
  { module_id: "procurement",       stakeholder: "hr",       hours_per_month: 2.5,  scales_with: "hr_ftes" },
  { module_id: "procurement",       stakeholder: "manager",  hours_per_month: 0.5,  scales_with: "managers" },

  // Project Management
  { module_id: "projects",          stakeholder: "hr",       hours_per_month: 1.7,  scales_with: "hr_ftes" },
  { module_id: "projects",          stakeholder: "manager",  hours_per_month: 1.2,  scales_with: "managers" },

  // CRM
  { module_id: "crm",               stakeholder: "hr",       hours_per_month: 1.5,  scales_with: "hr_ftes" },

  // Headcount Planning
  { module_id: "headcount_planning", stakeholder: "hr",      hours_per_month: 2.5,  scales_with: "hr_ftes" },
  { module_id: "headcount_planning", stakeholder: "manager", hours_per_month: 0.5,  scales_with: "managers" },

  // Spaces
  { module_id: "space",             stakeholder: "hr",       hours_per_month: 1.0,  scales_with: "hr_ftes" },

  // Software Management
  { module_id: "software_management", stakeholder: "hr",     hours_per_month: 1.7,  scales_with: "hr_ftes" },

  // IT Inventory
  { module_id: "it_inventory",      stakeholder: "hr",       hours_per_month: 1.0,  scales_with: "onboardings" },

  // Factorial One (AI)
  { module_id: "one",               stakeholder: "employee", hours_per_month: 0.2,  scales_with: "employees" },
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
    employee: "Self-service profile updates replace emailing HR (~2 min/change × 3/month). Payslips and certificates downloadable on mobile — zero HR requests.",
    hr: "Single employee database eliminates duplicate spreadsheets and copy-paste. Automated approval workflows and onboarding/offboarding checklists save ~2.5h/week.",
    manager: "Team dashboard shows pending approvals, org structure and direct reports in one click. No more emailing HR for headcount or contract details.",
  },
  time_off: {
    employee: "Request leave from mobile in 30 seconds — no paper forms or email chains. Real-time balance visible anytime, eliminating balance-check queries.",
    hr: "Auto-accrual engine replaces manual balance calculations. Payroll integration syncs leave data automatically, policy rules prevent over-approval (~1.5h/week saved).",
    manager: "Visual team calendar shows who's off — no checking spreadsheets. One-click approve/reject with automatic conflict detection alerts.",
  },
  time_tracking: {
    employee: "Mobile/desktop clock-in replaces paper timesheets (~2 min/day × 20 days). Forgot to clock in? Edit requests with manager approval in-app.",
    hr: "Time data flows to payroll automatically — no weekly reconciliation. Overtime calculated per labour law, missing entries trigger automatic reminders (~1h/week).",
    manager: "Real-time attendance dashboard replaces morning roll calls. Anomaly alerts (late arrivals, missed clock-outs) sent automatically.",
  },
  time_planning: {
    employee: "View upcoming shifts on mobile — no paper rosters or WhatsApp groups. Request shift swaps directly in-app, manager notified instantly.",
    hr: "Auto-generated rosters from demand, labour rules and preferences. Overtime and rest compliance checked automatically, eliminates weekly Excel roster creation (~1.2h/week).",
    manager: "Drag-and-drop planner with instant conflict detection. Coverage gap warnings and overtime alerts before publishing (~45 min/week saved).",
  },
  compensations: {
    hr: "Centralised merit/bonus cycles with budget guardrails. Salary band management in-system — no spreadsheet version conflicts. Approval routing automated.",
    manager: "Guided review with team salary data, benchmarks and remaining budget. Submit compensation decisions in-app instead of email threads.",
  },
  payroll: {
    hr: "Auto-sync from time, leave, expenses and variable comp into payroll. Eliminates manual data prep (~6h/run × 12 runs/year). Discrepancy detection catches errors before submission.",
  },
  benefits: {
    hr: "Automated enrollment windows with eligibility rules. Vendor integration syncs selections — no manual reconciliation (~3h/month saved).",
  },
  wellhub: {
    hr: "Automated usage reporting replaces manual provider data collection. Enrollment management handled by platform.",
  },
  complaints: {
    hr: "Anonymous reporting portal with built-in case management. EU Whistleblower Directive compliance out-of-the-box, case tracking and deadline alerts.",
  },
  engagement: {
    hr: "Automated survey creation, scheduling and distribution. Real-time dashboards by team/department — no manual Excel analysis (~2.5h/month saved).",
    manager: "Team engagement scores in dashboard with trend indicators. Declining score alerts and suggested action plans for proactive management.",
  },
  performance: {
    hr: "Automated review cycles: launch, reminders, completion tracking and calibration. Replaces Word/Excel templates and manual chasing (~18h/cycle × 2/year).",
    manager: "Pre-populated review forms with historical performance data. Team performance dashboard for 1:1 prep (~3h/cycle × 2 cycles/year).",
  },
  trainings: {
    hr: "Automated rollout with completion tracking and compliance reporting. Subsidy and tax credit documentation generated automatically (~4.5h/month).",
    manager: "Team completion dashboards with skill gap visibility. Mandatory training compliance status at a glance.",
  },
  lms: {
    hr: "Course builder with templates and AI-assisted content creation. Content library with version control and completion analytics (~7h/course × 6/year).",
  },
  recruitment: {
    hr: "End-to-end ATS: job posting, pipeline, interview scheduling, scorecards. Automated candidate status updates and communication templates (~8h/hire).",
    manager: "Structured interview scorecards replace free-form notes. Side-by-side candidate comparison for hiring decisions (~2.5h/hire).",
  },
  expenses: {
    employee: "Mobile receipt capture with OCR — snap photo, auto-categorise, submit. Policy checks at submission prevent rejections and back-and-forth.",
    hr: "Automated reconciliation and approval workflows with accounting integration. Policy violations flagged before approval (~8h/month saved).",
    manager: "One-click approvals with pre-validated policy checks. Team spend dashboards with budget alerts and category breakdowns.",
  },
  procurement: {
    hr: "Digital PO workflows with multi-level approval routing and budget controls. Maverick spend visibility — identifies off-process purchases.",
    manager: "Self-service purchase requests with real-time budget visibility. Status tracking in-app — no email follow-ups needed.",
  },
  projects: {
    hr: "Project cost and profitability reports auto-generated from time data. Replaces manual cost allocation spreadsheets.",
    manager: "Real-time project dashboards: allocation, budget burn and profitability. Replaces manual tracking and month-end reconciliation (~1h/month).",
  },
  crm: {
    hr: "Candidate pools and alumni networks with automated nurture workflows. Referral program tracking replaces manual outreach management.",
  },
  headcount_planning: {
    hr: "Scenario-based workforce planning with real-time budget impact. Replaces spreadsheet-based headcount forecasting with approved vs. actual tracking.",
    manager: "Approved vs. actual headcount at a glance. Structured position request workflow — no email requisitions needed.",
  },
  space: {
    hr: "Occupancy analytics and booking rules automated. Capacity planning based on real usage data for real-estate decisions.",
  },
  software_management: {
    hr: "SaaS license tracking with usage monitoring — identifies shelfware (paid but unused licenses). Renewal reminders and spend dashboards.",
  },
  it_inventory: {
    hr: "Centralised IT asset register linked to employee lifecycle. Auto-provisioning on hire, auto-deprovisioning on exit (~2.5h/month saved).",
  },
  one: {
    employee: "AI answers HR questions instantly: policy lookups, balance checks, processes. Reduces time searching intranet or waiting for HR email response.",
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
