-- Allow managers to update their own campus (e.g. for shift status)
CREATE POLICY "Manager can update own campus"
  ON public.campuses FOR UPDATE
  USING (public.my_role() = 'manager' AND id = public.my_campus_id())
  WITH CHECK (true);
