-- RLS: non-admin users can only read their own sessions and prospects
-- Admins (users with strategy_admin or super_admin role) can read all

-- Drop existing permissive policies
DROP POLICY IF EXISTS own_sessions_select ON roi_sessions;
DROP POLICY IF EXISTS own_prospects_select ON prospects;

-- roi_sessions: own rows OR admin
CREATE POLICY own_sessions_select ON roi_sessions
  FOR SELECT
  TO authenticated
  USING (
    pae_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('strategy_admin', 'super_admin')
    )
  );

-- prospects: own rows (via session) OR admin
CREATE POLICY own_prospects_select ON prospects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roi_sessions
      WHERE roi_sessions.prospect_id = prospects.id
        AND roi_sessions.pae_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('strategy_admin', 'super_admin')
    )
  );
