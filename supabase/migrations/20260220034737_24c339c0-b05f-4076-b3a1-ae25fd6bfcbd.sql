
-- Fix 1: Create a public view of profiles that excludes sensitive contact info (email, phone)
CREATE VIEW public.profiles_public AS
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

-- Fix 2: Drop the overly permissive "Members can view church profiles" policy 
-- that allows ALL members (even pending) to see email/phone of other members.
-- Members will use the profiles_public view instead (no email/phone).
-- Directors retain full access to profiles (including email/phone) for administration.
DROP POLICY IF EXISTS "Members can view church profiles" ON public.profiles;

-- Fix 3: Restrict notifications INSERT policy
-- Remove the policy that allows any authenticated user to insert notifications for ANY user_id.
-- Notifications should be system-generated only (no client-side inserts needed).
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- Allow directors to insert notifications for members of their church only
-- (for sending announcements/reminders)
CREATE POLICY "Directors can insert notifications for church members"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'director'
      AND ur.status = 'approved'
      AND EXISTS (
        SELECT 1 FROM public.user_roles target_role
        WHERE target_role.user_id = notifications.user_id
          AND target_role.church_id = ur.church_id
          AND target_role.status = 'approved'
      )
  )
);
