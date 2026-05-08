
-- Drop existing authenticated-only SELECT policies and recreate with anon + authenticated
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pain_library', 'bundles', 'country_defaults', 'bundle_recommendation_rules',
    'factorial_one_packs', 'industry_benchmarks', 'modules', 'pain_module_map',
    'pricing', 'similar_companies'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS ref_select ON public.%I', t);
    EXECUTE format('CREATE POLICY ref_select ON public.%I FOR SELECT TO anon, authenticated USING (true)', t);
  END LOOP;
END $$;
