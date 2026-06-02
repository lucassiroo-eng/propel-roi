-- Add flow_type to distinguish Express vs Co-creation ROIs
ALTER TABLE roi_sessions
  ADD COLUMN IF NOT EXISTS flow_type text DEFAULT 'express'
  CHECK (flow_type IN ('express', 'co_created'));

-- Allow any authenticated user to update sessions (internal admin tool)
DROP POLICY IF EXISTS "admin_sessions_update" ON roi_sessions;
CREATE POLICY "admin_sessions_update" ON roi_sessions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
