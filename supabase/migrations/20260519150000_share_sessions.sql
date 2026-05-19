-- Allow any authenticated user to read any session (for shared links)
-- This replaces the restrictive owner-only SELECT policy
DROP POLICY IF EXISTS "own_sessions_select" ON roi_sessions;
CREATE POLICY "sessions_select_authenticated" ON roi_sessions
  FOR SELECT TO authenticated USING (true);

-- Allow any authenticated user to read any prospect (needed to load shared sessions)
DROP POLICY IF EXISTS "own_prospects_select" ON prospects;
CREATE POLICY "prospects_select_authenticated" ON prospects
  FOR SELECT TO authenticated USING (true);
