
-- The "Authenticated users can create churches" policy was created as RESTRICTIVE,
-- which blocks all inserts (restrictive policies reduce access, they don't grant it).
-- Drop it and recreate as a proper PERMISSIVE policy.
DROP POLICY IF EXISTS "Authenticated users can create churches" ON public.churches;

CREATE POLICY "Authenticated users can create churches"
ON public.churches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
