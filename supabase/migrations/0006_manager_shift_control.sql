-- ==========================================================================
-- 0006_manager_shift_control.sql
-- Add manager_shift_control_enabled to campuses and update RPCs
-- ==========================================================================

-- 1. Add column if it doesn't exist
ALTER TABLE public.campuses ADD COLUMN IF NOT EXISTS manager_shift_control_enabled boolean not null default true;

-- 2. Update start_shift RPC to check this flag
create or replace function public.start_shift()
returns void language plpgsql security definer as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      text;
  v_campus_id uuid;
  v_enabled   boolean;
begin
  select role, campus_id into v_role, v_campus_id
  from public.profiles where id = v_user_id;

  if v_role not in ('manager', 'admin') then
    raise exception 'Only staff can start shifts';
  end if;

  if v_role = 'manager' then
    select manager_shift_control_enabled into v_enabled
    from public.campuses where id = v_campus_id;
    if not v_enabled then
      raise exception 'Manager shift control is disabled for this campus';
    end if;
  end if;

  update public.campuses set shift_active = true where id = v_campus_id;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id)
  values (v_user_id, v_role, 'start_shift', 'campus', v_campus_id::text, v_campus_id);
end;
$$;

-- 3. Update end_shift RPC to check this flag
create or replace function public.end_shift()
returns void language plpgsql security definer as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      text;
  v_campus_id uuid;
  v_enabled   boolean;
begin
  select role, campus_id into v_role, v_campus_id
  from public.profiles where id = v_user_id;

  if v_role not in ('manager', 'admin') then
    raise exception 'Only staff can end shifts';
  end if;

  if v_role = 'manager' then
    select manager_shift_control_enabled into v_enabled
    from public.campuses where id = v_campus_id;
    if not v_enabled then
      raise exception 'Manager shift control is disabled for this campus';
    end if;
  end if;

  update public.campuses set shift_active = false where id = v_campus_id;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id)
  values (v_user_id, v_role, 'end_shift', 'campus', v_campus_id::text, v_campus_id);
end;
$$;
