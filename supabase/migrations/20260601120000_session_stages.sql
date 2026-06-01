-- Add current_step to resume sessions at the right place
ALTER TABLE roi_sessions
  ADD COLUMN IF NOT EXISTS current_step int DEFAULT 0;

-- Expand status to include stage-based statuses
ALTER TABLE roi_sessions DROP CONSTRAINT IF EXISTS roi_sessions_status_check;
ALTER TABLE roi_sessions ADD CONSTRAINT roi_sessions_status_check
  CHECK (status IN ('draft','generated','sent','co_created','pre_call','during_call','post_call'));
