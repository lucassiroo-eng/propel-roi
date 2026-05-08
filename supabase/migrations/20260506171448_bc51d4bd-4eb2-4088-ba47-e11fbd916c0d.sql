
-- Add trigger column to pain_library
ALTER TABLE public.pain_library ADD COLUMN IF NOT EXISTS trigger_phrases text;

-- Add default_value_other and auto_manual to pain_formula_vars
ALTER TABLE public.pain_formula_vars ADD COLUMN IF NOT EXISTS default_value_other numeric;
ALTER TABLE public.pain_formula_vars ADD COLUMN IF NOT EXISTS auto_manual text NOT NULL DEFAULT 'manual';
