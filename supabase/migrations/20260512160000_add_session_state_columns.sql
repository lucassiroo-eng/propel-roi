-- Add columns to persist full wizard state across sessions
ALTER TABLE roi_sessions
  ADD COLUMN IF NOT EXISTS selected_modules jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS module_suggestions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS roi_config jsonb,
  ADD COLUMN IF NOT EXISTS custom_pains jsonb DEFAULT '[]'::jsonb;

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS deal_name text;
