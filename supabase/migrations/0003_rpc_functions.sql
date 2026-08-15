-- ==========================================================================
-- CFD Hostel Treats — RPC Functions (SECURITY DEFINER)
-- All 8 RPCs the frontend expects, plus start_shift (Bug #1 fix)
-- ==========================================================================

-- ==========================================================================
-- Helper: preorder_is_open (mirrors lib/domain/preorder.ts)
-- ==========================================================================
create or replace function public.preorder_is_open(p_campus_id uuid)
returns boolean language plpgsql stable security definer as $$
declare
  v_campus record;
begin
  select preorder_open, preorder_opens_at, preorder_closes_at
  into v_campus
  from public.campuses where id = p_campus_id;

  if not found then return false; end if;
  if v_campus.preorder_open then return true; end if;
  if v_campus.preorder_opens_at is null then return false; end if;
  if now() < v_campus.preorder_opens_at then return false; end if;
  if v_campus.preorder_closes_at is not null and now() > v_campus.preorder_closes_at then
    return false;
  end if;
  return true;
end;
$$;

-- ==========================================================================
-- Helper: generate order number (campus-prefix + daily sequence)
-- ==========================================================================
create or replace function public.generate_order_number(p_campus_id uuid)
returns text language plpgsql as $$
declare
  v_prefix text;
  v_count  int;
begin
  select left(upper(replace(name, ' ', '')), 3) into v_prefix
  from public.campuses where id = p_campus_id;
  v_prefix := coalesce(v_prefix, 'CFD');

  select count(*) + 1 into v_count
  from public.orders
  where campus_id = p_campus_id
    and created_at >= date_trunc('day', now());

  return v_prefix || '-' || to_char(now(), 'MMDD') || '-' || lpad(v_count::text, 3, '0');
end;
$$;

-- ==========================================================================
-- 1. place_order
-- ==========================================================================
create or replace function public.place_order(
  p_room_number text,
  p_block text,
  p_payment_method text,
  p_payment_screenshot_url text,
  p_items jsonb
)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id    uuid := auth.uid();
  v_campus_id  uuid;
  v_item       record;
  v_line       jsonb;
  v_item_total numeric := 0;
  v_del_fee    numeric := 0;
  v_platform   numeric := 5;     -- PLATFORM_FEE constant
  v_cod_charge numeric := 0;
  v_gst_pct    numeric := 5;     -- GST_PERCENT constant
  v_subtotal   numeric;
  v_gst        numeric;
  v_grand      numeric;
  v_order_id   uuid;
  v_order_num  text;
  v_eff_price  numeric;
  v_qty        int;
begin
  -- Get caller's campus
  select campus_id into v_campus_id from public.profiles where id = v_user_id;
  if v_campus_id is null then
    raise exception 'No campus assigned to your profile';
  end if;

  -- Check shift is active
  if not (select shift_active from public.campuses where id = v_campus_id) then
    raise exception 'Shift is not active — ordering is closed for today';
  end if;

  -- COD charge
  if p_payment_method = 'cod' then
    v_cod_charge := 30;  -- COD_EXTRA_CHARGE constant
  end if;

  -- Validate and compute each item server-side
  for v_line in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_line.value ->> 'quantity')::int;

    select * into v_item from public.items
    where id = (v_line.value ->> 'item_id')::uuid
      and campus_id = v_campus_id
      and is_available = true
      and is_preorder = false;

    if not found then
      raise exception 'Item % not found or unavailable', v_line.value ->> 'item_id';
    end if;

    if v_qty > v_item.stock_quantity then
      raise exception 'Insufficient stock for %: requested %, available %',
        v_item.name, v_qty, v_item.stock_quantity;
    end if;

    v_eff_price := coalesce(v_item.discounted_price, v_item.price);
    v_item_total := v_item_total + (v_eff_price * v_qty);
    v_del_fee := v_del_fee + (v_item.delivery_fee * v_qty);

    -- Decrement stock
    update public.items set stock_quantity = stock_quantity - v_qty
    where id = v_item.id;
  end loop;

  -- Compute totals (matches lib/domain/pricing.ts exactly)
  v_subtotal := v_item_total + v_del_fee + v_platform + v_cod_charge;
  v_gst := v_subtotal * v_gst_pct / 100;
  v_grand := v_subtotal + v_gst;

  -- Generate order number
  v_order_num := public.generate_order_number(v_campus_id);
  v_order_id := gen_random_uuid();

  -- Insert order
  insert into public.orders (
    id, order_number, customer_id, campus_id, room_number, block,
    payment_method, payment_screenshot_url, subtotal, delivery_fee,
    platform_fee, cod_fee, gst, discount_amount, total, is_preorder
  ) values (
    v_order_id, v_order_num, v_user_id, v_campus_id, p_room_number, p_block,
    p_payment_method, p_payment_screenshot_url, v_item_total, v_del_fee,
    v_platform, v_cod_charge, v_gst, 0, v_grand, false
  );

  -- Insert order items (snapshot prices)
  for v_line in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_line.value ->> 'quantity')::int;
    select * into v_item from public.items where id = (v_line.value ->> 'item_id')::uuid;
    v_eff_price := coalesce(v_item.discounted_price, v_item.price);

    insert into public.order_items (order_id, item_id, name, quantity, unit_price, total_price)
    values (v_order_id, v_item.id, v_item.name, v_qty, v_eff_price, v_eff_price * v_qty);
  end loop;

  -- Audit log
  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id, detail)
  values (v_user_id, 'customer', 'place_order', 'order', v_order_id::text, v_campus_id,
    jsonb_build_object('total', v_grand, 'payment_method', p_payment_method, 'items', p_items));

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_num);
end;
$$;

-- ==========================================================================
-- 2. place_preorder
-- ==========================================================================
create or replace function public.place_preorder(
  p_room_number text,
  p_block text,
  p_payment_method text,
  p_payment_screenshot_url text,
  p_items jsonb
)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id    uuid := auth.uid();
  v_campus_id  uuid;
  v_item       record;
  v_line       jsonb;
  v_item_total numeric := 0;
  v_del_fee    numeric := 0;
  v_platform   numeric := 5;
  v_cod_charge numeric := 0;
  v_subtotal   numeric;
  v_gst        numeric;
  v_grand      numeric;
  v_order_id   uuid;
  v_order_num  text;
  v_eff_price  numeric;
  v_qty        int;
begin
  select campus_id into v_campus_id from public.profiles where id = v_user_id;
  if v_campus_id is null then
    raise exception 'No campus assigned to your profile';
  end if;

  -- Check preorder is open
  if not public.preorder_is_open(v_campus_id) then
    raise exception 'Pre-orders are currently closed';
  end if;

  if p_payment_method = 'cod' then v_cod_charge := 30; end if;

  for v_line in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_line.value ->> 'quantity')::int;
    select * into v_item from public.items
    where id = (v_line.value ->> 'item_id')::uuid
      and campus_id = v_campus_id
      and is_preorder = true;

    if not found then
      raise exception 'Pre-order item % not found', v_line.value ->> 'item_id';
    end if;

    v_eff_price := coalesce(v_item.discounted_price, v_item.price);
    v_item_total := v_item_total + (v_eff_price * v_qty);
    v_del_fee := v_del_fee + (v_item.delivery_fee * v_qty);
    -- No stock decrement for preorders
  end loop;

  v_subtotal := v_item_total + v_del_fee + v_platform + v_cod_charge;
  v_gst := v_subtotal * 5 / 100;
  v_grand := v_subtotal + v_gst;

  v_order_num := public.generate_order_number(v_campus_id);
  v_order_id := gen_random_uuid();

  insert into public.orders (
    id, order_number, customer_id, campus_id, room_number, block,
    payment_method, payment_screenshot_url, subtotal, delivery_fee,
    platform_fee, cod_fee, gst, discount_amount, total, is_preorder
  ) values (
    v_order_id, v_order_num, v_user_id, v_campus_id, p_room_number, p_block,
    p_payment_method, p_payment_screenshot_url, v_item_total, v_del_fee,
    v_platform, v_cod_charge, v_gst, 0, v_grand, true
  );

  for v_line in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_line.value ->> 'quantity')::int;
    select * into v_item from public.items where id = (v_line.value ->> 'item_id')::uuid;
    v_eff_price := coalesce(v_item.discounted_price, v_item.price);
    insert into public.order_items (order_id, item_id, name, quantity, unit_price, total_price)
    values (v_order_id, v_item.id, v_item.name, v_qty, v_eff_price, v_eff_price * v_qty);
  end loop;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id, detail)
  values (v_user_id, 'customer', 'place_preorder', 'order', v_order_id::text, v_campus_id,
    jsonb_build_object('total', v_grand, 'items', p_items));

  return jsonb_build_object('id', v_order_id, 'order_number', v_order_num);
end;
$$;

-- ==========================================================================
-- 3. mark_delivered
-- ==========================================================================
create or replace function public.mark_delivered(p_order_id uuid)
returns void language plpgsql security definer as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      text;
  v_campus_id uuid;
  v_order     record;
begin
  select role, campus_id into v_role, v_campus_id
  from public.profiles where id = v_user_id;

  if v_role not in ('manager', 'admin') then
    raise exception 'Only managers and admins can mark orders delivered';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'Order not found'; end if;
  if v_order.campus_id != v_campus_id then
    raise exception 'Order does not belong to your campus';
  end if;

  update public.orders
  set order_status = 'delivered', delivered_at = now()
  where id = p_order_id;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id)
  values (v_user_id, v_role, 'mark_delivered', 'order', p_order_id::text, v_campus_id);
end;
$$;

-- ==========================================================================
-- 4. manager_set_discount
-- ==========================================================================
create or replace function public.manager_set_discount(
  p_item_id uuid,
  p_discounted numeric default null
)
returns void language plpgsql security definer as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      text;
  v_campus_id uuid;
  v_item      record;
  v_enabled   boolean;
begin
  select role, campus_id into v_role, v_campus_id
  from public.profiles where id = v_user_id;

  if v_role != 'manager' and v_role != 'admin' then
    raise exception 'Only managers and admins can set discounts';
  end if;

  select * into v_item from public.items where id = p_item_id;
  if not found then raise exception 'Item not found'; end if;
  if v_item.campus_id != v_campus_id then
    raise exception 'Item does not belong to your campus';
  end if;

  -- Check manager_discount_enabled for managers
  if v_role = 'manager' then
    select manager_discount_enabled into v_enabled
    from public.campuses where id = v_campus_id;
    if not v_enabled then
      raise exception 'Manager discounts are disabled for this campus';
    end if;
  end if;

  if p_discounted is not null and p_discounted >= v_item.price then
    raise exception 'Discount price must be less than the base price';
  end if;

  update public.items set discounted_price = p_discounted where id = p_item_id;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id, detail)
  values (v_user_id, v_role, 'set_discount', 'item', p_item_id::text, v_campus_id,
    jsonb_build_object('item', v_item.name, 'old_discount', v_item.discounted_price, 'new_discount', p_discounted));
end;
$$;

-- ==========================================================================
-- 5. register_manager_device
-- ==========================================================================
create or replace function public.register_manager_device(p_device_id text)
returns void language plpgsql security definer as $$
begin
  insert into public.manager_devices (manager_id, device_id, updated_at)
  values (auth.uid(), p_device_id, now())
  on conflict (manager_id)
  do update set device_id = excluded.device_id, updated_at = now();
end;
$$;

-- ==========================================================================
-- 6. is_active_device
-- ==========================================================================
create or replace function public.is_active_device(p_device_id text)
returns boolean language plpgsql stable security definer as $$
begin
  return exists (
    select 1 from public.manager_devices
    where manager_id = auth.uid() and device_id = p_device_id
  );
end;
$$;

-- ==========================================================================
-- 7. end_shift
-- ==========================================================================
create or replace function public.end_shift()
returns void language plpgsql security definer as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      text;
  v_campus_id uuid;
begin
  select role, campus_id into v_role, v_campus_id
  from public.profiles where id = v_user_id;

  if v_role not in ('manager', 'admin') then
    raise exception 'Only staff can end shifts';
  end if;

  update public.campuses set shift_active = false where id = v_campus_id;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id)
  values (v_user_id, v_role, 'end_shift', 'campus', v_campus_id::text, v_campus_id);
end;
$$;

-- ==========================================================================
-- 8. start_shift (Bug #1 fix — the missing counterpart)
-- ==========================================================================
create or replace function public.start_shift()
returns void language plpgsql security definer as $$
declare
  v_user_id   uuid := auth.uid();
  v_role      text;
  v_campus_id uuid;
begin
  select role, campus_id into v_role, v_campus_id
  from public.profiles where id = v_user_id;

  if v_role not in ('manager', 'admin') then
    raise exception 'Only staff can start shifts';
  end if;

  update public.campuses set shift_active = true where id = v_campus_id;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, campus_id)
  values (v_user_id, v_role, 'start_shift', 'campus', v_campus_id::text, v_campus_id);
end;
$$;
