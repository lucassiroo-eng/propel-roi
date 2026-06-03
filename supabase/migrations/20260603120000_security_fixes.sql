-- Security fixes: tighten RLS policies

-- 1. evidence_matches: restrict to authenticated owner only
DROP POLICY IF EXISTS "evidence_matches_read" ON evidence_matches;
DROP POLICY IF EXISTS "evidence_matches_insert" ON evidence_matches;

CREATE POLICY "evidence_matches_read" ON evidence_matches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roi_sessions
      WHERE id = evidence_matches.session_id
        AND pae_id = auth.uid()
    )
  );

CREATE POLICY "evidence_matches_insert" ON evidence_matches
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roi_sessions
      WHERE id = evidence_matches.session_id
        AND pae_id = auth.uid()
    )
  );

-- 2. evidence_rules and module_evidence_profiles: require authenticated
DROP POLICY IF EXISTS "evidence_rules_read" ON evidence_rules;
DROP POLICY IF EXISTS "module_evidence_profiles_read" ON module_evidence_profiles;

CREATE POLICY "evidence_rules_read" ON evidence_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "module_evidence_profiles_read" ON module_evidence_profiles
  FOR SELECT TO authenticated USING (true);

-- 3. roi_sessions UPDATE: restrict to session owner or admin
DROP POLICY IF EXISTS "admin_sessions_update" ON roi_sessions;

CREATE POLICY "own_sessions_update" ON roi_sessions
  FOR UPDATE TO authenticated
  USING (
    pae_id = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'strategy_admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 4. Reference tables: remove anon read access
DROP POLICY IF EXISTS "pain_library_read" ON pain_library;
DROP POLICY IF EXISTS "modules_read" ON modules;
DROP POLICY IF EXISTS "pricing_read" ON pricing;
DROP POLICY IF EXISTS "bundles_read" ON bundles;
DROP POLICY IF EXISTS "bundle_recommendation_rules_read" ON bundle_recommendation_rules;
DROP POLICY IF EXISTS "country_defaults_read" ON country_defaults;
DROP POLICY IF EXISTS "factorial_one_packs_read" ON factorial_one_packs;
DROP POLICY IF EXISTS "industry_benchmarks_read" ON industry_benchmarks;
DROP POLICY IF EXISTS "similar_companies_read" ON similar_companies;

CREATE POLICY "pain_library_read" ON pain_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules_read" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "pricing_read" ON pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "bundles_read" ON bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "bundle_recommendation_rules_read" ON bundle_recommendation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "country_defaults_read" ON country_defaults FOR SELECT TO authenticated USING (true);
CREATE POLICY "factorial_one_packs_read" ON factorial_one_packs FOR SELECT TO authenticated USING (true);
CREATE POLICY "industry_benchmarks_read" ON industry_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "similar_companies_read" ON similar_companies FOR SELECT TO authenticated USING (true);
