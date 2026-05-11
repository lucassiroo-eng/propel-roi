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

export function defaultHeadcounts(totalSeats: number): { employee: number; hr: number; manager: number } {
  const hr = Math.max(1, Math.round(totalSeats * 0.05));
  const manager = Math.max(1, Math.round(totalSeats * 0.15));
  const employee = Math.max(1, totalSeats - hr - manager);
  return { employee, hr, manager };
}
