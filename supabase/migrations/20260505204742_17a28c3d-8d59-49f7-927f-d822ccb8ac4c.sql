
ALTER TABLE public.pain_library ADD COLUMN pain_description text;
ALTER TABLE public.pain_library ADD COLUMN pain_description_es text;
ALTER TABLE public.pain_library ADD COLUMN pain_description_fr text;

UPDATE public.pain_library SET
  pain_description = CASE pain_id
    WHEN 'P01' THEN 'Manual time tracking consumes employee and admin time daily and creates exposure to labour inspection penalties.'
    WHEN 'P02' THEN 'Spreadsheet-based scheduling drives over- and under-staffing, generating recurring payroll waste every week.'
    WHEN 'P03' THEN 'Lengthy hiring cycles and agency fees increase cost-per-hire and delay team capacity.'
    WHEN 'P04' THEN 'Training data is scattered, blocking audit readiness and leaving available training subsidies and tax credits unclaimed.'
    WHEN 'P05' THEN 'HR teams spend hours answering recurring payslip, leave and policy queries with no triage system.'
    WHEN 'P06' THEN 'Contracts, NDAs and policy updates are sent and signed manually, creating delays and audit gaps.'
    WHEN 'P07' THEN 'HR data is spread across spreadsheets and emails, requiring significant manual effort to produce reliable reports.'
    WHEN 'P08' THEN 'Manual leave tracking creates risk of payroll errors, employee disputes, and non-compliance with local labour regulations.'
    WHEN 'P09' THEN 'Disengagement is detected too late, resulting in significant replacement costs and lost productivity per departure.'
    WHEN 'P10' THEN 'Lengthy onboarding delays new hire productivity, increasing payroll cost without corresponding output during the ramp-up period.'
    WHEN 'P11' THEN 'Reviews are run manually in forms and spreadsheets, consuming manager time and limiting actionable feedback.'
    WHEN 'P12' THEN 'No structured way to measure employee sentiment, leading to blind spots in culture and retention risks.'
    WHEN 'P13' THEN 'Compensation decisions are subjective and disconnected from market data, creating pay-equity exposure and overpayment.'
    WHEN 'P14' THEN 'Every reporting request triggers manual Excel work, delaying decisions and consuming senior HR capacity.'
    WHEN 'P15' THEN 'Exits happen ad-hoc, leading to unrecovered equipment, persistent access and lost institutional knowledge.'
    WHEN 'P16' THEN 'Manual expense reporting consumes finance hours every month and creates reimbursement reconciliation gaps.'
    WHEN 'P17' THEN 'Off-process purchases escape approval workflows and budget control, inflating annual procurement costs.'
    WHEN 'P18' THEN 'Each payroll cycle requires substantial manual reconciliation and generates correction costs that automation would eliminate.'
    WHEN 'P19' THEN 'Merit, promotion and bonus cycles run in Excel, allowing total comp to exceed budget without controls.'
    WHEN 'P20' THEN 'Unused SaaS licenses inflate cost per employee, while orphan accounts after offboarding create a security risk.'
    WHEN 'P21' THEN 'Goals live in decks rather than systems, so manager and employee time on alignment is wasted.'
    WHEN 'P22' THEN 'Each country runs its own tools and processes, preventing global policies and economies of scale.'
  END,
  primary_module = CASE pain_id
    WHEN 'P02' THEN 'Shifts'
    WHEN 'P05' THEN 'HR Inbox / Helpdesk'
    WHEN 'P06' THEN 'Documents & e-Signature'
    WHEN 'P07' THEN 'Employees'
    WHEN 'P09' THEN 'Performance & Engagement'
    WHEN 'P10' THEN 'Onboarding'
    WHEN 'P14' THEN 'Analytics'
    WHEN 'P15' THEN 'Offboarding'
    WHEN 'P17' THEN 'Spend Management'
    WHEN 'P18' THEN 'Payroll'
    WHEN 'P20' THEN 'IT Hub'
    WHEN 'P21' THEN 'Goals / OKRs'
    WHEN 'P22' THEN 'Multi-entity / Core'
    ELSE primary_module
  END;

UPDATE public.pain_library SET pain_statement = 'Fragmented training records and missed subsidies' WHERE pain_id = 'P04';
