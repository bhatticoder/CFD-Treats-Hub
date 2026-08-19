-- Helper: get the current user's role
create or replace function public.my_role()
returns text language sql stable security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: get the current user's campus_id
create or replace function public.my_campus_id()
returns uuid language sql stable security definer
as $$
  select campus_id from public.profiles where id = auth.uid();
$$;

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
