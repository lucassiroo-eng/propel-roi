ALTER TABLE roi_sessions DROP CONSTRAINT IF EXISTS roi_sessions_status_check;
ALTER TABLE roi_sessions ADD CONSTRAINT roi_sessions_status_check CHECK (status IN ('draft','generated','sent','co_created'));
