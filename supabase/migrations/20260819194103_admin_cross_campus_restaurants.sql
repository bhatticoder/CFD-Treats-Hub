-- Drop existing policies
drop policy if exists "Staff can view all restaurants for their campus" on public.restaurants;
drop policy if exists "Admin can manage restaurants" on public.restaurants;

-- Recreate view policy: Admins can view all, Managers can only view their own campus
create policy "Staff can view all restaurants"
  on public.restaurants for select
  using (
    (campus_id = public.my_campus_id() and public.my_role() = 'manager')
    or public.my_role() = 'admin'
  );

-- Recreate manage policy: Admins can manage restaurants for any campus
create policy "Admin can manage restaurants"
  on public.restaurants for all
  using (
    public.my_role() = 'admin'
  )
  with check (
    public.my_role() = 'admin'
  );
