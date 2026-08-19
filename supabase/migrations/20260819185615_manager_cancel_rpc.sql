create or replace function public.manager_cancel_order(
  p_order_id uuid,
  p_reason text default null
) returns void language plpgsql security definer as $$
declare
  v_role text;
  v_campus_id uuid;
  v_order_campus uuid;
begin
  -- Get user info
  select role, campus_id into v_role, v_campus_id
  from public.profiles where id = auth.uid();

  -- Verify role
  if v_role not in ('admin', 'manager') then
    raise exception 'Unauthorized';
  end if;

  -- Verify campus match
  select campus_id into v_order_campus
  from public.orders where id = p_order_id;

  if v_role = 'manager' and v_order_campus != v_campus_id then
    raise exception 'Cannot cancel orders for a different campus';
  end if;

  -- Perform the cancellation (this runs as postgres, bypassing triggers on 'manager' role)
  update public.orders
  set order_status = 'cancelled',
      cancel_reason = p_reason
  where id = p_order_id;

  -- Add audit log
  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id, detail)
  values (auth.uid(), v_role::public.user_role, 'cancel_order', 'order', p_order_id::text, v_campus_id, jsonb_build_object('reason', p_reason));
end;
$$;
