-- Allow 'mini_roi' as a valid flow_type
ALTER TABLE roi_sessions DROP CONSTRAINT IF EXISTS roi_sessions_flow_type_check;
ALTER TABLE roi_sessions ADD CONSTRAINT roi_sessions_flow_type_check
  CHECK (flow_type IN ('express', 'co_created', 'mini_roi'));

-- Store full mini-roi state for resume (analysis, modules, html, etc.)
ALTER TABLE roi_sessions ADD COLUMN IF NOT EXISTS mini_roi_data jsonb;
