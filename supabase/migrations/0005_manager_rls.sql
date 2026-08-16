CREATE POLICY "Managers can update own campus"
  ON public.campuses FOR UPDATE
  USING (public.my_role() = 'manager' AND id = public.my_campus_id())
  WITH CHECK (true);

-- Allow admins to update ANY campus
CREATE POLICY "Admins can update any campus"
  ON public.campuses FOR UPDATE
  USING (public.my_role() = 'admin')
  WITH CHECK (true);
