-- ==========================================================================
-- CFD Hostel Treats — Row Level Security Policies
-- ==========================================================================

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

-- ==========================================================================
-- CAMPUSES — public select (needed pre-login for registration dropdown)
-- ==========================================================================
create policy "Anyone can view active campuses"
  on public.campuses for select
  using (is_active = true);

create policy "Admin can update own campus"
  on public.campuses for update
  using (public.my_role() = 'admin' and id = public.my_campus_id())
  with check (true);

create policy "Admin can update any campus (cross-campus pages)"
  on public.campuses for update
  using (public.my_role() = 'admin')
  with check (true);

create policy "Admin can insert campuses"
  on public.campuses for insert
  with check (public.my_role() = 'admin');

create policy "Admin can delete campuses"
  on public.campuses for delete
  using (public.my_role() = 'admin');

-- ==========================================================================
-- PROFILES
-- ==========================================================================
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users can insert own profile (registration)"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Admin can view profiles in their campus"
  on public.profiles for select
  using (
    public.my_role() = 'admin'
    and (campus_id = public.my_campus_id() or true)  -- admins can see all for cross-campus pages
  );

create policy "Admin can update profiles"
  on public.profiles for update
  using (public.my_role() = 'admin')
  with check (true);

create policy "Manager can view own profile"
  on public.profiles for select
  using (public.my_role() = 'manager' and id = auth.uid());

-- ==========================================================================
-- RESTAURANTS — public select for active; staff can manage
-- ==========================================================================
create policy "Anyone can view active restaurants"
  on public.restaurants for select
  using (is_active = true);

create policy "Staff can view all restaurants for their campus"
  on public.restaurants for select
  using (
    campus_id = public.my_campus_id()
    and public.my_role() in ('admin', 'manager')
  );

create policy "Admin can manage restaurants"
  on public.restaurants for all
  using (
    campus_id = public.my_campus_id()
    and public.my_role() = 'admin'
  )
  with check (
    campus_id = public.my_campus_id()
    and public.my_role() = 'admin'
  );

-- ==========================================================================
-- ITEMS — public select for available; staff can manage
-- ==========================================================================
create policy "Anyone can view available items"
  on public.items for select
  using (true);  -- filtering by is_available done in queries

create policy "Admin can manage items for own campus"
  on public.items for all
  using (
    campus_id = public.my_campus_id()
    and public.my_role() = 'admin'
  )
  with check (
    campus_id = public.my_campus_id()
    and public.my_role() = 'admin'
  );

create policy "Manager can update items for own campus (discounts)"
  on public.items for update
  using (
    campus_id = public.my_campus_id()
    and public.my_role() = 'manager'
  )
  with check (
    campus_id = public.my_campus_id()
    and public.my_role() = 'manager'
  );

-- ==========================================================================
-- ORDERS — customer sees own; staff sees own campus
-- ==========================================================================
create policy "Customer can view own orders"
  on public.orders for select
  using (customer_id = auth.uid());

create policy "Staff can view orders for own campus"
  on public.orders for select
  using (
    campus_id = public.my_campus_id()
    and public.my_role() in ('admin', 'manager')
  );

create policy "Staff can update orders for own campus"
  on public.orders for update
  using (
    campus_id = public.my_campus_id()
    and public.my_role() in ('admin', 'manager')
  )
  with check (true);

-- No direct client insert on orders — only via RPCs
-- Orders are created through place_order/place_preorder SECURITY DEFINER RPCs

-- ==========================================================================
-- ORDER_ITEMS — same as orders (via join)
-- ==========================================================================
create policy "Customer can view own order items"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.customer_id = auth.uid()
    )
  );

create policy "Staff can view order items for own campus"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.campus_id = public.my_campus_id()
      and public.my_role() in ('admin', 'manager')
    )
  );

-- ==========================================================================
-- NOTIFICATIONS — campus-scoped (Fix for Bug #5)
-- ==========================================================================
create policy "Users can view notifications for their campus"
  on public.notifications for select
  using (campus_id = public.my_campus_id());

create policy "Staff can insert notifications for own campus"
  on public.notifications for insert
  with check (
    campus_id = public.my_campus_id()
    and public.my_role() in ('admin', 'manager')
  );

-- ==========================================================================
-- AUDIT_LOG — admin read-only; never client-writable
-- ==========================================================================
create policy "Admin can read audit log"
  on public.audit_log for select
  using (public.my_role() = 'admin');

-- No insert/update/delete policies — only written by SECURITY DEFINER RPCs

-- ==========================================================================
-- MANAGER_DEVICES — manager can only read/write own row
-- ==========================================================================
create policy "Manager can manage own device"
  on public.manager_devices for all
  using (manager_id = auth.uid())
  with check (manager_id = auth.uid());

-- ==========================================================================
-- Email domain enforcement trigger (Fix for Bug #2 server-side)
-- ==========================================================================
create or replace function public.enforce_email_domain()
returns trigger language plpgsql as $$
declare
  v_domain text;
begin
  -- Look up the campus's required domain suffix
  if new.campus_id is not null then
    select domain_suffix into v_domain
    from public.campuses
    where id = new.campus_id;

    if v_domain is not null and not (lower(new.email) like '%' || lower(v_domain)) then
      raise exception 'Email must end with %', v_domain;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_email_domain
  before insert on public.profiles
  for each row execute function public.enforce_email_domain();
