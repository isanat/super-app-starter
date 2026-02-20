
-- Recreate the view with SECURITY INVOKER so it respects the querying user's RLS policies
-- This ensures the underlying profiles table RLS is enforced for the querying user
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  church_id,
  name,
  bio,
  photo_url,
  instruments,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;
