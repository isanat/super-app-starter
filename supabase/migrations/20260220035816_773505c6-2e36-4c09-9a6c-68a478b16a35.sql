
-- Allow authenticated users to search/find churches (needed for musicians to join a church)
-- Without this, musicians can't find a church because they have no user_role yet
CREATE POLICY "Authenticated users can search churches"
ON public.churches
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);
