
REVOKE EXECUTE ON FUNCTION public.get_user_emails(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_emails(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO authenticated;
