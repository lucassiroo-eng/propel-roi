CREATE TABLE country_defaults (
  country text PRIMARY KEY,
  currency text NOT NULL,
  avg_loaded_hourly_cost_eur numeric NOT NULL,
  source_note text
);

CREATE TABLE pain_library (
  pain_id text PRIMARY KEY,
  persona text NOT NULL,
  pain_statement text NOT NULL,
  primary_module text,
  benefit_driver text,
  benefit_type text,
  default_kpi text,
  default_value_es numeric,
  default_value_fr numeric,
  is_archived boolean DEFAULT FALSE,
  display_order int DEFAULT 0
);

CREATE TABLE modules (
  module text PRIMARY KEY,
  description text,
  features text,
  notes text,
  available_es boolean DEFAULT TRUE,
  available_fr boolean DEFAULT TRUE
);

CREATE TABLE pain_module_map (
  id bigserial PRIMARY KEY,
  pain_id text REFERENCES pain_library(pain_id) ON DELETE CASCADE,
  module text REFERENCES modules(module) ON DELETE CASCADE,
  role text CHECK (role IN ('primary','supporting')),
  notes text
);

CREATE TABLE bundles (
  id bigserial PRIMARY KEY,
  bundle_name text NOT NULL,
  tier text CHECK (tier IN ('Starter','Pro')),
  country text NOT NULL CHECK (country IN ('ES','FR')),
  included_modules text,
  business_pepm_monthly numeric,
  enterprise_pepm_monthly numeric,
  business_pepm_yearly numeric,
  enterprise_pepm_yearly numeric,
  floor_seats numeric,
  UNIQUE(bundle_name, country)
);

CREATE TABLE pricing (
  id bigserial PRIMARY KEY,
  country text NOT NULL CHECK (country IN ('ES','FR')),
  sku_type text NOT NULL,
  sku_name text NOT NULL,
  architecture text,
  credits_or_seats text,
  price_business_monthly text,
  price_enterprise_monthly text,
  price_business_yearly text,
  price_enterprise_yearly text,
  floor text,
  includes_modules text,
  notes text
);

CREATE TABLE factorial_one_packs (
  id bigserial PRIMARY KEY,
  segment text,
  pack_name text,
  credits_included int,
  price_eur_monthly numeric,
  price_eur_yearly_per_month numeric,
  notes text
);

CREATE TABLE bundle_recommendation_rules (
  rule_id text PRIMARY KEY,
  triggering_pains text NOT NULL,
  recommended_bundle text NOT NULL,
  rationale text,
  min_pains int
);

CREATE TABLE industry_benchmarks (
  id bigserial PRIMARY KEY,
  sector text NOT NULL,
  country text NOT NULL CHECK (country IN ('ES','FR')),
  n_customers int,
  avg_seats numeric,
  median_seats numeric,
  avg_cmrr_eur numeric,
  median_cmrr_eur numeric,
  attach_rates jsonb,
  refreshed_at timestamptz DEFAULT now(),
  UNIQUE(sector, country)
);

CREATE TABLE similar_companies (
  id bigserial PRIMARY KEY,
  sector text NOT NULL,
  country text NOT NULL CHECK (country IN ('ES','FR')),
  size_bucket text NOT NULL,
  n_customers int,
  avg_seats numeric,
  avg_cmrr_eur numeric,
  core_modules_top3 text,
  common_addons text,
  refreshed_at timestamptz DEFAULT now(),
  UNIQUE(sector, country, size_bucket)
);

CREATE TABLE user_roles (
  user_id uuid PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('pae','manager','strategy_admin','super_admin')),
  manager_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pae_id uuid NOT NULL,
  company_name text NOT NULL,
  country text NOT NULL CHECK (country IN ('ES','FR')),
  seats int,
  sector text,
  hubspot_deal_url text,
  contact_name text,
  contact_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX prospects_pae_id_idx ON prospects(pae_id);

CREATE TABLE roi_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES prospects(id) ON DELETE CASCADE,
  pae_id uuid NOT NULL,
  selected_pains text[] NOT NULL DEFAULT '{}',
  pain_overrides jsonb DEFAULT '{}'::jsonb,
  selected_offering jsonb,
  total_annual_benefit_eur numeric,
  factorial_annual_cost_eur numeric,
  roi_eur numeric,
  roi_pct numeric,
  payback_months numeric,
  status text DEFAULT 'draft' CHECK (status IN ('draft','generated','sent')),
  pdf_url text,
  snapshot jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX roi_sessions_pae_id_idx ON roi_sessions(pae_id);
CREATE INDEX roi_sessions_prospect_id_idx ON roi_sessions(prospect_id);

CREATE TABLE email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES roi_sessions(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  cc_email text,
  subject text,
  body text,
  resend_message_id text,
  delivery_status text DEFAULT 'queued',
  sent_at timestamptz DEFAULT now()
);

CREATE TABLE reference_data_audit (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  row_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  before jsonb,
  after jsonb,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  reason text
);
CREATE INDEX reference_data_audit_table_idx ON reference_data_audit(table_name, row_id, changed_at DESC);

CREATE TABLE app_documentation (
  id bigserial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','admin')),
  content_md text NOT NULL,
  display_order int DEFAULT 0,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT TRUE
);