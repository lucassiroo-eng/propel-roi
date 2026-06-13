CREATE TABLE IF NOT EXISTS feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  session_id uuid REFERENCES roi_sessions(id),
  page text NOT NULL DEFAULT '',
  step integer,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert" ON feedback_reports
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "feedback_select" ON feedback_reports
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "feedback_update" ON feedback_reports
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
