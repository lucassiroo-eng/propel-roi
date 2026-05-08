-- Security-definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-assign pae role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pae')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE country_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_module_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE factorial_one_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_recommendation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE similar_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_data_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_documentation ENABLE ROW LEVEL SECURITY;

-- Reference tables: read by all authenticated
CREATE POLICY "ref_select" ON country_defaults FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON pain_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON pain_module_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON factorial_one_packs FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON bundle_recommendation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON industry_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "ref_select" ON similar_companies FOR SELECT TO authenticated USING (true);

-- Reference tables: write by strategy_admin or super_admin
CREATE POLICY "ref_insert" ON country_defaults FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON country_defaults FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON country_defaults FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON pain_library FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON pain_library FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON pain_library FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON modules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON modules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON modules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON pain_module_map FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON pain_module_map FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON pain_module_map FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON bundles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON bundles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON bundles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON pricing FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON pricing FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON pricing FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON factorial_one_packs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON factorial_one_packs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON factorial_one_packs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON bundle_recommendation_rules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON bundle_recommendation_rules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON bundle_recommendation_rules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON industry_benchmarks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON industry_benchmarks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON industry_benchmarks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "ref_insert" ON similar_companies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_update" ON similar_companies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "ref_delete" ON similar_companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

-- user_roles: users read own, admins read/write all
CREATE POLICY "own_role_select" ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_role_insert" ON user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_role_update" ON user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_role_delete" ON user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- prospects: PAE owns their own
CREATE POLICY "own_prospects_select" ON prospects FOR SELECT TO authenticated USING (pae_id = auth.uid() OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "own_prospects_insert" ON prospects FOR INSERT TO authenticated WITH CHECK (pae_id = auth.uid());
CREATE POLICY "own_prospects_update" ON prospects FOR UPDATE TO authenticated USING (pae_id = auth.uid());
CREATE POLICY "own_prospects_delete" ON prospects FOR DELETE TO authenticated USING (pae_id = auth.uid());

-- roi_sessions: PAE owns their own
CREATE POLICY "own_sessions_select" ON roi_sessions FOR SELECT TO authenticated USING (pae_id = auth.uid() OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "own_sessions_insert" ON roi_sessions FOR INSERT TO authenticated WITH CHECK (pae_id = auth.uid());
CREATE POLICY "own_sessions_update" ON roi_sessions FOR UPDATE TO authenticated USING (pae_id = auth.uid());
CREATE POLICY "own_sessions_delete" ON roi_sessions FOR DELETE TO authenticated USING (pae_id = auth.uid());

-- email_sends: via session ownership
CREATE POLICY "own_emails_select" ON email_sends FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM roi_sessions WHERE roi_sessions.id = email_sends.session_id AND (roi_sessions.pae_id = auth.uid() OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin')))
);
CREATE POLICY "own_emails_insert" ON email_sends FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM roi_sessions WHERE roi_sessions.id = email_sends.session_id AND roi_sessions.pae_id = auth.uid())
);

-- reference_data_audit: admins read, system inserts
CREATE POLICY "audit_select" ON reference_data_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "audit_insert" ON reference_data_audit FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));

-- app_documentation: all authenticated read published; admins write
CREATE POLICY "docs_select" ON app_documentation FOR SELECT TO authenticated USING (is_published = true OR public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "docs_insert" ON app_documentation FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "docs_update" ON app_documentation FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "docs_delete" ON app_documentation FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'strategy_admin') OR public.has_role(auth.uid(), 'super_admin'));