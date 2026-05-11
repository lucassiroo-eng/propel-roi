export interface ModuleDef {
  id: string;
  label: string;
  category: string;
  color: string;
  signals: string[];
  savings: string[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Core":                   "#3B82F6",
  "Compensation & Payroll": "#10B981",
  "Benefits & Wellbeing":   "#EC4899",
  "Compliance":             "#EF4444",
  "Talent & Development":   "#8B5CF6",
  "Finance & Spend":        "#F59E0B",
  "Strategic HR":           "#06B6D4",
  "IT & Facilities":        "#64748B",
  "AI":                     "#6366F1",
};

export const MODULE_CATALOG: ModuleDef[] = [
  {
    id: "core",
    label: "Core HR",
    category: "Core",
    color: "#3B82F6",
    signals: [
      "We manage employee data in Excel / Google Sheets",
      "Employees keep emailing HR for basic info — payslips, certificates",
      "We have data in 3 systems and nothing matches",
      "Onboarding takes forever, we forget steps every time",
      "Our employee directory is always outdated",
    ],
    savings: [
      "Centralises all employee data in a single source of truth",
      "Self-service portal: employees update info, download payslips",
      "Automated onboarding checklists with task assignment",
    ],
  },
  {
    id: "time_off",
    label: "Time Off",
    category: "Core",
    color: "#60A5FA",
    signals: [
      "We track leave in a spreadsheet and it's a mess",
      "Employees keep asking how many days they have left",
      "Managers approve leave by email and sometimes forget",
      "People have taken more days than they had",
      "Reconciling leave with payroll takes hours",
    ],
    savings: [
      "Auto-accrual engine calculates balances in real-time",
      "Employees see balance and request leave from mobile",
      "Calendar sync avoids scheduling conflicts",
    ],
  },
  {
    id: "time_tracking",
    label: "Time Tracking",
    category: "Core",
    color: "#2563EB",
    signals: [
      "Employees fill timesheets manually and often forget",
      "We spend hours reconciling time data for payroll",
      "No visibility on overtime until month-end",
      "Attendance is tracked with paper sign-in sheets",
      "We need to comply with time tracking law but have no system",
    ],
    savings: [
      "Mobile/desktop clock-in replaces paper timesheets",
      "Automatic overtime calculation and alerts",
      "Direct feed into payroll — no manual reconciliation",
    ],
  },
  {
    id: "time_planning",
    label: "Shift Management",
    category: "Core",
    color: "#F59E0B",
    signals: [
      "Creating the weekly schedule takes hours in Excel",
      "Employees check schedules on paper or WhatsApp",
      "We constantly have conflicts — two people off same shift",
      "Last-minute changes are chaotic — finding replacements is hard",
      "Bad scheduling causes overtime we didn't budget for",
    ],
    savings: [
      "Auto-generated rosters from demand, preferences, and labour rules",
      "Mobile shift swap and replacement marketplace",
      "Overtime forecasting before the schedule is published",
    ],
  },
  {
    id: "compensations",
    label: "Compensation",
    category: "Compensation & Payroll",
    color: "#10B981",
    signals: [
      "Salary reviews are done in Excel — everyone has a different version",
      "No visibility on salary bands across the company",
      "Comp review is emails back and forth between HR and managers",
      "Budget overruns because there's no real-time tracking",
      "Managers don't know market rate for their team",
    ],
    savings: [
      "Centralised merit/bonus/promotion cycles with budget guardrails",
      "Salary band visualisation and pay equity analytics",
      "Real-time budget tracking during review cycles",
    ],
  },
  {
    id: "payroll",
    label: "Payroll Connect",
    category: "Compensation & Payroll",
    color: "#059669",
    signals: [
      "Payroll prep takes a full day before every run",
      "We manually copy data from time, leave, expenses into payroll",
      "We catch errors after payroll has already run",
      "Monthly discrepancies between HR data and payroll",
    ],
    savings: [
      "Auto-sync from time tracking, leave, expenses, and variable comp",
      "Discrepancy alerts before payroll is submitted",
      "Payroll-ready export in provider's format",
    ],
  },
  {
    id: "benefits",
    label: "Benefits / Flex. Retribution",
    category: "Benefits & Wellbeing",
    color: "#EC4899",
    signals: [
      "Employees don't know what benefits they're eligible for",
      "Flexible remuneration is a nightmare in spreadsheets",
      "Benefits enrollment is manual with lots of back-and-forth",
      "We can't report on benefits utilisation",
    ],
    savings: [
      "Self-service enrollment: meals, transport, childcare, health insurance",
      "Automatic tax-advantage calculations for flex retribution",
      "Real-time utilisation dashboards",
    ],
  },
  {
    id: "wellhub",
    label: "Wellhub",
    category: "Benefits & Wellbeing",
    color: "#F472B6",
    signals: [
      "We want wellness programs but managing vendors is too much work",
      "Employees ask about gym memberships and we have no answer",
      "We can't track who's using wellness benefits",
    ],
    savings: [
      "Integrated wellness platform (gym, mental health) in HR portal",
      "Single sign-on access to wellness providers",
    ],
  },
  {
    id: "complaints",
    label: "Trust Channel",
    category: "Compliance",
    color: "#EF4444",
    signals: [
      "We need to comply with the EU Whistleblower Directive",
      "Complaints come by email and we lose track",
      "We don't have an anonymous reporting channel",
      "Auditors asked about our complaint process",
    ],
    savings: [
      "Anonymous reporting portal accessible to all employees",
      "Built-in case management with audit trail",
      "Compliance dashboard for regulatory reporting",
    ],
  },
  {
    id: "engagement",
    label: "Engagement Surveys",
    category: "Talent & Development",
    color: "#A78BFA",
    signals: [
      "Our annual survey is in Google Forms — takes weeks to analyse",
      "Managers never see their team's results",
      "We don't know why people leave until the exit interview",
      "Employee satisfaction is a black box",
      "Survey participation rate is terrible",
    ],
    savings: [
      "Quick pulse surveys and eNPS on mobile — 2-minute completion",
      "Automated scheduling and reminders boost participation",
      "Manager dashboards with team-level insights",
    ],
  },
  {
    id: "performance",
    label: "Performance Management",
    category: "Talent & Development",
    color: "#7C3AED",
    signals: [
      "Reviews are in Word docs — nobody can find last year's",
      "Managers hate the review process — too bureaucratic",
      "No structured way to set and track goals",
      "HR spends weeks chasing managers to complete reviews",
      "Ratings vary wildly across teams — no calibration",
    ],
    savings: [
      "Automated review cycle: launch, reminders, completion tracking",
      "Structured templates with OKR/goal tracking",
      "Calibration tools to ensure cross-team consistency",
    ],
  },
  {
    id: "trainings",
    label: "Training Management",
    category: "Talent & Development",
    color: "#8B5CF6",
    signals: [
      "We track training completion in a spreadsheet",
      "Mandatory training compliance is hard to monitor",
      "We can't prove employees completed training for audits",
      "Assigning training to new joiners is always forgotten",
      "L&D subsidy documentation is all manual",
    ],
    savings: [
      "Self-paced catalogue with automated assignment and reminders",
      "Completion tracking with audit-ready reports",
      "Auto-assign onboarding courses to new hires",
    ],
  },
  {
    id: "lms",
    label: "LMS (Content Creator)",
    category: "Talent & Development",
    color: "#6D28D9",
    signals: [
      "We create training in PowerPoint and share it by email",
      "No way to test if employees understood the content",
      "Building a course takes us weeks",
      "We can't track learning progress or knowledge gaps",
    ],
    savings: [
      "Course builder with templates, video, and AI-assisted creation",
      "Quizzes and assessments to verify knowledge retention",
      "Learning path analytics per employee",
    ],
  },
  {
    id: "recruitment",
    label: "Recruitment (ATS)",
    category: "Talent & Development",
    color: "#C084FC",
    signals: [
      "We manage candidates in email threads and lose track",
      "Scheduling interviews takes forever — too many emails",
      "No structured evaluation — hiring is gut feelings",
      "Job postings are manual — one by one on each platform",
      "We don't know our time-to-hire or conversion rates",
    ],
    savings: [
      "End-to-end ATS: multi-platform posting, pipeline, auto-updates",
      "Interview scheduling with calendar integration",
      "Structured scorecards and collaborative evaluation",
    ],
  },
  {
    id: "expenses",
    label: "Expense Management",
    category: "Finance & Spend",
    color: "#F59E0B",
    signals: [
      "Employees collect paper receipts and fill Excel forms",
      "Expense reports sit on my desk for days",
      "We discover policy violations after reimbursement",
      "Month-end expense reconciliation is a nightmare",
      "No visibility on team spending until it's too late",
    ],
    savings: [
      "Mobile receipt capture with OCR — snap, categorise, submit",
      "Policy checks at submission time — violations blocked",
      "Real-time spend dashboards by team, category, project",
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    category: "Finance & Spend",
    color: "#D97706",
    signals: [
      "Purchase orders are done by email — nobody tracks them",
      "Maverick spend — people buy without approval",
      "No budget visibility when someone submits a PO",
      "Can't report on total spend by category or vendor",
    ],
    savings: [
      "Digital PO workflows with multi-level approval",
      "Real-time budget visibility per department",
      "Spend analytics by vendor, category, and project",
    ],
  },
  {
    id: "projects",
    label: "Project Management",
    category: "Finance & Spend",
    color: "#FBBF24",
    signals: [
      "We don't know real project cost until it's finished",
      "Time logging is in a separate tool — or not done at all",
      "Project profitability calculated manually in spreadsheets",
      "Can't see who's allocated to what in real-time",
    ],
    savings: [
      "Time logging against projects from the same clock-in interface",
      "Auto-generated project cost reports (labour + expenses)",
      "Resource allocation visibility across projects",
    ],
  },
  {
    id: "crm",
    label: "CRM (Talent Pool)",
    category: "Strategic HR",
    color: "#06B6D4",
    signals: [
      "We track candidate relationships in a spreadsheet",
      "Our alumni network is just an old email list",
      "Referral programs are managed manually",
      "We have no talent pool for future positions",
    ],
    savings: [
      "Candidate pool management for proactive recruiting",
      "Alumni networks with automated engagement",
      "Referral tracking with reward automation",
    ],
  },
  {
    id: "headcount_planning",
    label: "Headcount Planning",
    category: "Strategic HR",
    color: "#0891B2",
    signals: [
      "Headcount planning is a spreadsheet once a year",
      "Can't model 'what if we hire 5 more in Q3' with budget impact",
      "Managers don't know if their positions are approved",
      "Actuals vs. plan is always off — nobody catches it",
    ],
    savings: [
      "Scenario-based workforce planning with budget impact analysis",
      "Approved vs. actual headcount tracking in real-time",
      "Manager self-service for position requests",
    ],
  },
  {
    id: "space",
    label: "Space Management",
    category: "IT & Facilities",
    color: "#64748B",
    signals: [
      "We don't know how many people come to the office each day",
      "Desk booking is first-come-first-served chaos",
      "Meeting rooms are 'booked' but empty",
      "We need occupancy data to decide on office space",
    ],
    savings: [
      "Mobile desk and room booking with visual office maps",
      "Team visibility — see who's in which day",
      "Occupancy analytics for real-estate decisions",
    ],
  },
  {
    id: "software_management",
    label: "Software Management",
    category: "IT & Facilities",
    color: "#475569",
    signals: [
      "We don't know how many SaaS licenses we're paying for",
      "Tools with 50 licenses but only 10 users",
      "Renewals catch us by surprise every year",
      "Can't report on total software spend",
    ],
    savings: [
      "SaaS license tracking with usage monitoring",
      "Shelfware identification — flag unused licenses",
      "Renewal calendar with automated alerts",
    ],
  },
  {
    id: "it_inventory",
    label: "IT Inventory",
    category: "IT & Facilities",
    color: "#94A3B8",
    signals: [
      "We track laptops and equipment in a spreadsheet",
      "When someone leaves, we forget to collect equipment",
      "Orphan accounts on tools because offboarding is manual",
      "We don't know what equipment each employee has",
    ],
    savings: [
      "Centralised IT asset register linked to employee profiles",
      "Auto-provisioning/de-provisioning on hire/leave",
      "Equipment assignment tracking with return workflow",
    ],
  },
  {
    id: "one",
    label: "Factorial One (AI)",
    category: "AI",
    color: "#6366F1",
    signals: [
      "HR spends half the day answering the same questions",
      "Employees can't find policies on the intranet",
      "Simple questions like 'how many vacation days' generate tickets",
      "We need to reduce HR workload but can't hire more",
    ],
    savings: [
      "AI answers HR questions instantly: policies, balances, processes",
      "Natural language search across all HR data",
      "Reduces HR ticket volume by automating repetitive queries",
    ],
  },
  {
    id: "analytics",
    label: "HR Analytics",
    category: "Core",
    color: "#38BDF8",
    signals: [
      "No HR dashboards — we pull data into Excel each month",
      "Data-driven decisions needed but no tooling",
      "Headcount reporting is manual and always outdated",
      "HR KPI tracking is done in spreadsheets",
    ],
    savings: [
      "Pre-built dashboards for headcount, attrition, diversity",
      "Custom report builder with scheduled delivery",
      "Real-time metrics accessible to leadership",
    ],
  },
];

export function buildModulePromptBlock(): string {
  return MODULE_CATALOG.map(m =>
    `- **${m.id}** (${m.label}) [${m.category}]\n  Signals: ${m.signals.join("; ")}\n  Saves: ${m.savings.join("; ")}`
  ).join("\n");
}
