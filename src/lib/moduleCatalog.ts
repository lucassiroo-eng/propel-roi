export interface ModuleDef {
  id: string;
  label: string;
  category: string;
  color: string;
  signals: string[];
  savings: string[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Core HR":              "#6B7280",
  "Time":                 "#F59E0B",
  "Payroll & Benefits":   "#FB923C",
  "Talent":               "#E05C75",
  "Finance":              "#14B8A6",
  "IT":                   "#0D9488",
  "AI":                   "#E05C75",
  "Integrations":         "#6366F1",
};

function catColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#94A3B8";
}

export const MODULE_CATALOG: ModuleDef[] = [
  {
    id: "core",
    label: "Core HR",
    category: "Core HR",
    color: catColor("Core HR"),
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
    category: "Time",
    color: catColor("Time"),
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
    category: "Time",
    color: catColor("Time"),
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
    category: "Time",
    color: catColor("Time"),
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
    category: "Payroll & Benefits",
    color: catColor("Payroll & Benefits"),
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
    category: "Payroll & Benefits",
    color: catColor("Payroll & Benefits"),
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
    category: "Payroll & Benefits",
    color: catColor("Payroll & Benefits"),
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
    category: "Payroll & Benefits",
    color: catColor("Payroll & Benefits"),
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
    category: "Talent",
    color: catColor("Talent"),
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
    category: "Talent",
    color: catColor("Talent"),
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
    category: "Talent",
    color: catColor("Talent"),
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
    category: "Talent",
    color: catColor("Talent"),
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
    category: "Talent",
    color: catColor("Talent"),
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
    category: "Talent",
    color: catColor("Talent"),
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
    category: "Finance",
    color: catColor("Finance"),
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
    category: "Finance",
    color: catColor("Finance"),
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
    category: "Finance",
    color: catColor("Finance"),
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
    category: "Talent",
    color: catColor("Talent"),
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
    category: "Finance",
    color: catColor("Finance"),
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
    category: "IT",
    color: catColor("IT"),
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
    category: "IT",
    color: catColor("IT"),
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
    category: "IT",
    color: catColor("IT"),
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
    color: catColor("AI"),
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
    category: "Core HR",
    color: catColor("Core HR"),
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
  // ── Integrations ──
  {
    id: "integration_business_central",
    label: "Business Central",
    category: "Integrations",
    color: catColor("IT"),
    signals: [
      "We use Microsoft Business Central as our ERP",
      "Manual data entry between HR and Business Central",
      "Need to sync employee data with our ERP",
    ],
    savings: [
      "Automated bi-directional sync with Business Central",
      "Employee data flows directly to ERP without manual entry",
    ],
  },
  {
    id: "integration_netsuite",
    label: "Netsuite",
    category: "Integrations",
    color: catColor("IT"),
    signals: [
      "We use Oracle Netsuite for finance/ERP",
      "Duplicating employee records between HR system and Netsuite",
    ],
    savings: [
      "Automated sync of employee and payroll data with Netsuite",
      "Single source of truth across HR and finance",
    ],
  },
  {
    id: "integration_sage_200",
    label: "SAGE 200",
    category: "Integrations",
    color: catColor("IT"),
    signals: [
      "We use SAGE 200 for accounting",
      "Manual export/import between HR and SAGE",
    ],
    savings: [
      "Direct integration with SAGE 200 for payroll and accounting data",
    ],
  },
  {
    id: "integration_milena",
    label: "Milena",
    category: "Integrations",
    color: catColor("IT"),
    signals: [
      "We use Milena for payroll processing",
      "Manual data transfer to Milena every pay cycle",
    ],
    savings: [
      "Automated payroll data sync with Milena",
    ],
  },
  {
    id: "integration_suprema_xiptic",
    label: "Suprema Xiptic",
    category: "Integrations",
    color: catColor("IT"),
    signals: [
      "We use Suprema/Xiptic for access control or biometric attendance",
      "Clock-in data from terminals isn't connected to HR",
    ],
    savings: [
      "Automated clock-in data sync from Suprema Xiptic terminals",
    ],
  },
  {
    id: "silae",
    label: "SILAE Integration",
    category: "Integrations",
    color: catColor("IT"),
    signals: [
      "We use SILAE for payroll in France",
      "Manual data exchange with SILAE provider",
    ],
    savings: [
      "Direct payroll data sync with SILAE",
    ],
  },
];

export const INTEGRATION_MODULES = new Set([
  "integration_business_central", "integration_netsuite", "integration_sage_200",
  "integration_milena", "integration_suprema_xiptic", "silae",
]);

export function buildModulePromptBlock(): string {
  return MODULE_CATALOG.map(m =>
    `- **${m.id}** (${m.label}) [${m.category}]\n  Signals: ${m.signals.join("; ")}\n  Saves: ${m.savings.join("; ")}`
  ).join("\n");
}
