
CREATE OR REPLACE FUNCTION public.get_user_emails(_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id AS user_id, au.email::text AS email
  FROM auth.users au
  WHERE au.id = ANY(_user_ids)
    AND has_role(auth.uid(), 'super_admin')
$$;
