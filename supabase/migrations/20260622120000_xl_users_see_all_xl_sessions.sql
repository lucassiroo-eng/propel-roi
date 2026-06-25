-- XL users can read all xl_co_created sessions (shared pipeline visibility)
-- Non-XL non-admin users still only see their own sessions

DROP POLICY IF EXISTS own_sessions_select ON roi_sessions;
DROP POLICY IF EXISTS own_prospects_select ON prospects;

CREATE POLICY own_sessions_select ON roi_sessions
  FOR SELECT
  TO authenticated
  USING (
    pae_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('strategy_admin', 'super_admin')
    )
    OR (
      flow_type = 'xl_co_created'
      AND auth.email() = ANY(ARRAY[
        'lucas.siroo@factorial.co',
        'gloria.nunez@factorial.co',
        'ariadna.isla@factorial.co',
        'andre.reis@factorial.co',
        'juan.ruiz@factorial.co',
        'lorena.tapia@factorial.co',
        'gerard.ghneim@factorial.co',
        'factorial.partners@factorial.co'
      ])
    )
  );

CREATE POLICY own_prospects_select ON prospects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roi_sessions
      WHERE roi_sessions.prospect_id = prospects.id
        AND roi_sessions.pae_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('strategy_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM roi_sessions
      WHERE roi_sessions.prospect_id = prospects.id
        AND roi_sessions.flow_type = 'xl_co_created'
        AND auth.email() = ANY(ARRAY[
          'lucas.siroo@factorial.co',
          'gloria.nunez@factorial.co',
          'ariadna.isla@factorial.co',
          'andre.reis@factorial.co',
          'juan.ruiz@factorial.co',
          'lorena.tapia@factorial.co',
          'gerard.ghneim@factorial.co',
          'factorial.partners@factorial.co'
        ])
    )
  );
