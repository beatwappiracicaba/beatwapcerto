-- Fix RLS policy for notifications to allow inserts from authenticated users
-- This fixes the 403 error when Sellers try to notify Artists
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
);
