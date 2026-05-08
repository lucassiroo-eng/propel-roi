
-- Add formula_expression column to pain_library
ALTER TABLE public.pain_library ADD COLUMN formula_expression text;

-- Create pain_formula_vars table
CREATE TABLE public.pain_formula_vars (
  id serial PRIMARY KEY,
  pain_id text NOT NULL REFERENCES public.pain_library(pain_id) ON DELETE CASCADE,
  var_key text NOT NULL,
  label_en text NOT NULL,
  label_es text NOT NULL,
  label_fr text NOT NULL,
  unit text NOT NULL DEFAULT '',
  default_value_es numeric,
  default_value_fr numeric,
  source text NOT NULL DEFAULT 'user_input',
  sort_order integer NOT NULL DEFAULT 0,
  is_headline boolean NOT NULL DEFAULT false,
  UNIQUE (pain_id, var_key)
);

-- Enable RLS
ALTER TABLE public.pain_formula_vars ENABLE ROW LEVEL SECURITY;

-- RLS policies (mirror other reference tables)
CREATE POLICY "ref_select" ON public.pain_formula_vars
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "ref_insert" ON public.pain_formula_vars
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'strategy_admin'::text) OR has_role(auth.uid(), 'super_admin'::text));

CREATE POLICY "ref_update" ON public.pain_formula_vars
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'strategy_admin'::text) OR has_role(auth.uid(), 'super_admin'::text));

CREATE POLICY "ref_delete" ON public.pain_formula_vars
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'strategy_admin'::text) OR has_role(auth.uid(), 'super_admin'::text));
