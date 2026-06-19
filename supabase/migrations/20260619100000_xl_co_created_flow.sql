-- Allow 'xl_co_created' as a valid flow_type (XL Space private flow)
ALTER TABLE roi_sessions DROP CONSTRAINT IF EXISTS roi_sessions_flow_type_check;
ALTER TABLE roi_sessions ADD CONSTRAINT roi_sessions_flow_type_check
  CHECK (flow_type IN ('express', 'co_created', 'mini_roi', 'xl_co_created'));
