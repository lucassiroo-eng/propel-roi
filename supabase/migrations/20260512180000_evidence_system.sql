-- ═══════════════════════════════════════════════════════════════════
-- Evidence-based pain/module mapping system
-- ═══════════════════════════════════════════════════════════════════

-- 1) Per-pain matching rules
CREATE TABLE IF NOT EXISTS evidence_rules (
  id bigserial PRIMARY KEY,
  pain_id text REFERENCES pain_library(pain_id) ON DELETE CASCADE,
  module_id text,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'direct_quote', 'metric', 'situation', 'tool_mention', 'sentiment', 'process_gap'
  )),
  pattern text NOT NULL,
  examples text[] DEFAULT '{}',
  strength text NOT NULL DEFAULT 'moderate' CHECK (strength IN ('strong', 'moderate', 'weak')),
  requires_context jsonb,
  negation_phrases text[] DEFAULT '{}',
  supporting_modules text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_rules_pain_idx ON evidence_rules(pain_id);
CREATE INDEX IF NOT EXISTS evidence_rules_module_idx ON evidence_rules(module_id);

-- 2) Per-module evidence profiles
CREATE TABLE IF NOT EXISTS module_evidence_profiles (
  id bigserial PRIMARY KEY,
  module_id text NOT NULL UNIQUE,
  strong_signals text[] NOT NULL DEFAULT '{}',
  moderate_signals text[] NOT NULL DEFAULT '{}',
  weak_signals text[] DEFAULT '{}',
  anti_signals text[] DEFAULT '{}',
  sector_boost jsonb,
  country_relevance jsonb,
  min_employees int,
  reasoning_template text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 3) Stored evidence matches per session
CREATE TABLE IF NOT EXISTS evidence_matches (
  id bigserial PRIMARY KEY,
  session_id uuid REFERENCES roi_sessions(id) ON DELETE CASCADE,
  pain_id text REFERENCES pain_library(pain_id),
  module_id text,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'direct_quote', 'metric', 'situation', 'tool_mention', 'sentiment', 'process_gap'
  )),
  source_text text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN (
    'client_email', 'client_call', 'pae_note', 'hubspot_note'
  )),
  source_date date,
  attribution text NOT NULL CHECK (attribution IN (
    'client_verbatim', 'client_paraphrase', 'pae_interpretation', 'inferred'
  )),
  rule_id bigint REFERENCES evidence_rules(id),
  confidence numeric NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  supporting_modules text[] DEFAULT '{}',
  ai_rationale text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_matches_session_idx ON evidence_matches(session_id);

-- 4) Enrich pain_library
ALTER TABLE pain_library
  ADD COLUMN IF NOT EXISTS confidence_threshold numeric DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS min_evidence_count int DEFAULT 1;

-- 5) RLS
ALTER TABLE evidence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_evidence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_rules_read" ON evidence_rules FOR SELECT USING (true);
CREATE POLICY "module_evidence_profiles_read" ON module_evidence_profiles FOR SELECT USING (true);
CREATE POLICY "evidence_matches_read" ON evidence_matches FOR SELECT USING (true);
CREATE POLICY "evidence_matches_insert" ON evidence_matches FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- Seed module_evidence_profiles from MODULE_CATALOG
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO module_evidence_profiles (module_id, strong_signals, moderate_signals, weak_signals, anti_signals, sector_boost) VALUES
('core',
 ARRAY['employee data scattered across systems','manual onboarding process','no employee directory or self-service portal'],
 ARRAY['employees emailing HR for payslips/certificates','data in multiple systems that dont match'],
 ARRAY['growing company with >50 employees'],
 ARRAY['already has a mature HRIS like Workday or SAP SuccessFactors'],
 '{"Software & IT Services": 0.05}'::jsonb),

('time_off',
 ARRAY['leave tracked in spreadsheets','employees dont know their balance','managers approve leave by email'],
 ARRAY['people have taken more days than entitled','reconciling leave with payroll takes hours'],
 ARRAY['company with seasonal workforce'],
 ARRAY['already has dedicated leave management'],
 NULL),

('time_tracking',
 ARRAY['manual timesheets or paper sign-in','need to comply with time tracking law','no clock-in system'],
 ARRAY['overtime not tracked until month-end','reconciling time data for payroll takes hours'],
 ARRAY['large headcount with deskless workers'],
 ARRAY['already uses Kronos or SAP time module'],
 '{"manufacturing": 0.15, "hospitality": 0.2, "retail": 0.15, "construction": 0.2}'::jsonb),

('time_planning',
 ARRAY['shifts planned in Excel or WhatsApp','scheduling conflicts between employees','creating weekly schedule takes hours'],
 ARRAY['last-minute shift changes are chaotic','overtime caused by bad scheduling'],
 ARRAY['company with shift-based workforce'],
 ARRAY['already has dedicated scheduling like Deputy or When I Work'],
 '{"hospitality": 0.2, "retail": 0.15, "manufacturing": 0.15}'::jsonb),

('compensations',
 ARRAY['salary reviews done in Excel','no visibility on salary bands','comp review via email back-and-forth'],
 ARRAY['budget overruns from comp cycles','managers dont know market rates for their team'],
 ARRAY['company doing annual comp review'],
 ARRAY['already has comp tool like Pave or Figures'],
 NULL),

('payroll',
 ARRAY['payroll prep takes a full day','manually copy data from time/leave/expenses into payroll','errors discovered after payroll run'],
 ARRAY['monthly discrepancies between HR data and payroll','multiple manual steps before each payroll'],
 ARRAY['company processing payroll internally'],
 ARRAY['fully outsourced payroll with no data sync needs'],
 NULL),

('benefits',
 ARRAY['employees dont know what benefits they are eligible for','flexible remuneration managed in spreadsheets'],
 ARRAY['benefits enrollment is manual with back-and-forth','cant report on benefits utilisation'],
 ARRAY['company with >100 employees in ES'],
 ARRAY['no benefits program planned'],
 '{"Software & IT Services": 0.1}'::jsonb),

('expenses',
 ARRAY['paper receipts and Excel expense reports','expense reports sit on desk for days','policy violations discovered after reimbursement'],
 ARRAY['month-end expense reconciliation is painful','no visibility on team spending'],
 ARRAY['company with travelling employees'],
 ARRAY['already uses SAP Concur or Spendesk'],
 NULL),

('recruitment',
 ARRAY['candidates managed in email threads','interview scheduling takes too many emails','no structured evaluation process'],
 ARRAY['job postings are manual per platform','dont know time-to-hire or conversion rates'],
 ARRAY['company hiring >10 people per year'],
 ARRAY['already has ATS like Greenhouse or Lever'],
 NULL),

('performance',
 ARRAY['reviews in Word docs that nobody can find','no structured way to set and track goals','HR chases managers to complete reviews'],
 ARRAY['managers hate the review process','ratings vary wildly across teams'],
 ARRAY['company with >50 employees'],
 ARRAY['already has performance tool like Lattice or 15Five'],
 NULL),

('trainings',
 ARRAY['training completion tracked in spreadsheets','mandatory training compliance hard to monitor','cant prove training completion for audits'],
 ARRAY['assigning training to new joiners is forgotten','L&D documentation is manual'],
 ARRAY['regulated industry requiring training records'],
 ARRAY['already has full LMS'],
 NULL),

('lms',
 ARRAY['training created in PowerPoint shared by email','no way to test if employees understood content'],
 ARRAY['building a course takes weeks','cant track learning progress or knowledge gaps'],
 ARRAY['company investing in internal training content'],
 ARRAY['already has LMS like Docebo or TalentLMS'],
 NULL),

('engagement',
 ARRAY['annual survey in Google Forms','dont know why people leave until exit interview','employee satisfaction is a black box'],
 ARRAY['managers never see team survey results','survey participation rate is terrible'],
 ARRAY['company concerned about retention'],
 ARRAY['already uses Culture Amp or Peakon'],
 NULL),

('complaints',
 ARRAY['need to comply with EU Whistleblower Directive','no anonymous reporting channel'],
 ARRAY['complaints come by email and get lost','auditors asked about complaint process'],
 ARRAY['company with >50 employees in EU'],
 ARRAY['already has whistleblower tool like EthicsPoint'],
 '{"Construction & Engineering": 0.1}'::jsonb),

('procurement',
 ARRAY['purchase orders done by email','maverick spend with no approval','no budget visibility at PO submission'],
 ARRAY['cant report total spend by category or vendor'],
 ARRAY['company with distributed purchasing'],
 ARRAY['already has procurement tool like Coupa'],
 NULL),

('projects',
 ARRAY['dont know real project cost until finished','time logging in separate tool or not done at all'],
 ARRAY['project profitability calculated manually','cant see resource allocation in real-time'],
 ARRAY['professional services or consulting firm'],
 ARRAY['already has PSA tool like Mavenlink'],
 NULL),

('headcount_planning',
 ARRAY['headcount planning is a yearly spreadsheet','cant model what-if scenarios with budget impact'],
 ARRAY['managers dont know if positions are approved','actuals vs plan always diverge'],
 ARRAY['company with >200 employees'],
 ARRAY['already has Anaplan or Workday Adaptive Planning'],
 NULL),

('space',
 ARRAY['dont know how many people come to office','desk booking is first-come chaos'],
 ARRAY['meeting rooms booked but empty','need occupancy data for real-estate decisions'],
 ARRAY['hybrid work company with multiple offices'],
 ARRAY['fully remote company'],
 NULL),

('software_management',
 ARRAY['dont know how many SaaS licenses being paid for','tools with 50 licenses but only 10 users'],
 ARRAY['renewals catch company by surprise','cant report total software spend'],
 ARRAY['company with >20 SaaS tools'],
 ARRAY['already has Productiv or Zylo'],
 NULL),

('it_inventory',
 ARRAY['laptops and equipment tracked in spreadsheet','forget to collect equipment when someone leaves'],
 ARRAY['orphan accounts because offboarding is manual','dont know what equipment each employee has'],
 ARRAY['company with >100 employees'],
 ARRAY['already has ITSM with asset management'],
 NULL),

('one',
 ARRAY['HR spends half the day answering same questions','employees cant find policies on intranet'],
 ARRAY['simple questions generate HR tickets','need to reduce HR workload but cant hire more'],
 ARRAY['company with >200 employees and lean HR team'],
 ARRAY['already has HR chatbot'],
 NULL),

('analytics',
 ARRAY['no HR dashboards - pull data into Excel monthly','data-driven HR decisions needed but no tooling'],
 ARRAY['headcount reporting is manual and outdated','HR KPI tracking in spreadsheets'],
 ARRAY['company with >100 employees'],
 ARRAY['already has People Analytics tool'],
 NULL),

('crm',
 ARRAY['candidate relationships tracked in spreadsheet','no talent pool for future positions'],
 ARRAY['alumni network is just an email list','referral programs managed manually'],
 ARRAY['company doing volume hiring'],
 ARRAY['already has sourcing CRM like Beamery'],
 NULL),

('wellhub',
 ARRAY['want wellness programs but managing vendors is too much','employees ask about gym memberships'],
 ARRAY['cant track who is using wellness benefits'],
 ARRAY['company focused on employer branding'],
 ARRAY['already has wellness provider integrated'],
 NULL)

ON CONFLICT (module_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- Seed evidence_rules from MODULE_CATALOG signals (module-level rules)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO evidence_rules (module_id, evidence_type, pattern, strength, supporting_modules) VALUES
-- core
('core', 'situation', 'employee data managed in Excel or Google Sheets', 'strong', ARRAY['core']),
('core', 'situation', 'employees emailing HR for basic info like payslips or certificates', 'moderate', ARRAY['core']),
('core', 'situation', 'data in multiple systems that dont match', 'strong', ARRAY['core']),
('core', 'situation', 'onboarding takes forever or steps get forgotten', 'strong', ARRAY['core', 'trainings']),
('core', 'situation', 'employee directory is always outdated', 'moderate', ARRAY['core']),
-- time_off
('time_off', 'situation', 'leave tracked in a spreadsheet', 'strong', ARRAY['time_off']),
('time_off', 'direct_quote', 'employees asking how many days they have left', 'moderate', ARRAY['time_off']),
('time_off', 'situation', 'managers approve leave by email and sometimes forget', 'strong', ARRAY['time_off']),
('time_off', 'metric', 'people have taken more days off than entitled', 'strong', ARRAY['time_off']),
('time_off', 'situation', 'reconciling leave with payroll takes hours', 'moderate', ARRAY['time_off', 'payroll']),
-- time_tracking
('time_tracking', 'situation', 'employees fill timesheets manually and often forget', 'strong', ARRAY['time_tracking']),
('time_tracking', 'situation', 'hours reconciling time data for payroll', 'strong', ARRAY['time_tracking', 'payroll']),
('time_tracking', 'metric', 'no visibility on overtime until month-end', 'moderate', ARRAY['time_tracking']),
('time_tracking', 'tool_mention', 'attendance tracked with paper sign-in sheets', 'strong', ARRAY['time_tracking']),
('time_tracking', 'process_gap', 'need to comply with time tracking law but have no system', 'strong', ARRAY['time_tracking']),
-- time_planning
('time_planning', 'tool_mention', 'shifts planned in Excel or WhatsApp', 'strong', ARRAY['time_planning']),
('time_planning', 'situation', 'scheduling conflicts between employees on same shift', 'strong', ARRAY['time_planning']),
('time_planning', 'situation', 'last-minute changes are chaotic - finding replacements is hard', 'moderate', ARRAY['time_planning']),
('time_planning', 'metric', 'bad scheduling causes unbudgeted overtime', 'strong', ARRAY['time_planning', 'time_tracking']),
-- compensations
('compensations', 'tool_mention', 'salary reviews done in Excel', 'strong', ARRAY['compensations']),
('compensations', 'process_gap', 'no visibility on salary bands across company', 'strong', ARRAY['compensations']),
('compensations', 'situation', 'comp review is emails back and forth between HR and managers', 'moderate', ARRAY['compensations']),
('compensations', 'metric', 'budget overruns because no real-time tracking during reviews', 'strong', ARRAY['compensations']),
-- payroll
('payroll', 'metric', 'payroll prep takes a full day before every run', 'strong', ARRAY['payroll']),
('payroll', 'situation', 'manually copy data from time leave expenses into payroll', 'strong', ARRAY['payroll']),
('payroll', 'situation', 'errors caught after payroll has already run', 'strong', ARRAY['payroll']),
('payroll', 'metric', 'monthly discrepancies between HR data and payroll', 'moderate', ARRAY['payroll']),
-- benefits
('benefits', 'process_gap', 'employees dont know what benefits they are eligible for', 'strong', ARRAY['benefits']),
('benefits', 'tool_mention', 'flexible remuneration managed in spreadsheets', 'strong', ARRAY['benefits']),
('benefits', 'situation', 'benefits enrollment is manual with lots of back-and-forth', 'moderate', ARRAY['benefits']),
-- expenses
('expenses', 'situation', 'employees collect paper receipts and fill Excel forms', 'strong', ARRAY['expenses']),
('expenses', 'situation', 'expense reports sit on desk for days', 'moderate', ARRAY['expenses']),
('expenses', 'situation', 'policy violations discovered after reimbursement', 'strong', ARRAY['expenses']),
('expenses', 'process_gap', 'no visibility on team spending until too late', 'moderate', ARRAY['expenses']),
-- recruitment
('recruitment', 'situation', 'candidates managed in email threads and lost', 'strong', ARRAY['recruitment']),
('recruitment', 'situation', 'scheduling interviews takes too many emails', 'moderate', ARRAY['recruitment']),
('recruitment', 'process_gap', 'no structured evaluation - hiring based on gut feelings', 'strong', ARRAY['recruitment']),
('recruitment', 'metric', 'dont know time-to-hire or conversion rates', 'moderate', ARRAY['recruitment']),
-- performance
('performance', 'tool_mention', 'reviews in Word docs - nobody can find last years', 'strong', ARRAY['performance']),
('performance', 'sentiment', 'managers hate the review process - too bureaucratic', 'moderate', ARRAY['performance']),
('performance', 'process_gap', 'no structured way to set and track goals', 'strong', ARRAY['performance']),
('performance', 'situation', 'HR spends weeks chasing managers to complete reviews', 'moderate', ARRAY['performance']),
-- trainings
('trainings', 'tool_mention', 'training completion tracked in spreadsheet', 'strong', ARRAY['trainings']),
('trainings', 'process_gap', 'mandatory training compliance hard to monitor', 'strong', ARRAY['trainings']),
('trainings', 'process_gap', 'cant prove employees completed training for audits', 'strong', ARRAY['trainings']),
-- engagement
('engagement', 'tool_mention', 'annual survey in Google Forms - takes weeks to analyse', 'strong', ARRAY['engagement']),
('engagement', 'process_gap', 'dont know why people leave until exit interview', 'strong', ARRAY['engagement']),
('engagement', 'sentiment', 'employee satisfaction is a black box', 'moderate', ARRAY['engagement']),
-- complaints
('complaints', 'process_gap', 'need to comply with EU Whistleblower Directive', 'strong', ARRAY['complaints']),
('complaints', 'process_gap', 'no anonymous reporting channel', 'strong', ARRAY['complaints']),
('complaints', 'situation', 'complaints come by email and get lost', 'moderate', ARRAY['complaints']),
-- procurement
('procurement', 'situation', 'purchase orders done by email - nobody tracks them', 'strong', ARRAY['procurement']),
('procurement', 'situation', 'maverick spend - people buy without approval', 'strong', ARRAY['procurement']),
-- projects
('projects', 'process_gap', 'dont know real project cost until finished', 'strong', ARRAY['projects']),
('projects', 'situation', 'time logging in separate tool or not done at all', 'moderate', ARRAY['projects', 'time_tracking']),
-- other modules
('space', 'process_gap', 'dont know how many people come to office each day', 'strong', ARRAY['space']),
('space', 'situation', 'desk booking is first-come-first-served chaos', 'strong', ARRAY['space']),
('software_management', 'process_gap', 'dont know how many SaaS licenses being paid for', 'strong', ARRAY['software_management']),
('software_management', 'metric', 'tools with many licenses but few actual users', 'strong', ARRAY['software_management']),
('it_inventory', 'tool_mention', 'laptops and equipment tracked in spreadsheet', 'strong', ARRAY['it_inventory']),
('it_inventory', 'situation', 'forget to collect equipment when someone leaves', 'strong', ARRAY['it_inventory']),
('one', 'situation', 'HR spends half the day answering same questions', 'strong', ARRAY['one']),
('one', 'process_gap', 'employees cant find policies on intranet', 'moderate', ARRAY['one']),
('analytics', 'tool_mention', 'no HR dashboards - pull data into Excel monthly', 'strong', ARRAY['analytics']),
('analytics', 'process_gap', 'data-driven decisions needed but no tooling', 'moderate', ARRAY['analytics']),
('headcount_planning', 'tool_mention', 'headcount planning is a yearly spreadsheet', 'strong', ARRAY['headcount_planning']),
('headcount_planning', 'process_gap', 'cant model what-if scenarios with budget impact', 'moderate', ARRAY['headcount_planning']),
('lms', 'situation', 'training created in PowerPoint and shared by email', 'strong', ARRAY['lms']),
('lms', 'process_gap', 'no way to test if employees understood the content', 'moderate', ARRAY['lms']),
('crm', 'tool_mention', 'candidate relationships tracked in spreadsheet', 'strong', ARRAY['crm']),
('crm', 'process_gap', 'no talent pool for future positions', 'moderate', ARRAY['crm']),
('wellhub', 'process_gap', 'want wellness programs but managing vendors is too much', 'moderate', ARRAY['wellhub']);
