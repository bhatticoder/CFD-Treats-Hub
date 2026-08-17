-- ==========================================================================
-- Migration 0004: Vouchers and Additional Notes
-- ==========================================================================

-- Helper: preorder_is_open
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

-- Helper: generate order number
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

-- 1. Add additional_note to orders
alter table public.orders add column if not exists additional_note text;

-- 2. Create vouchers table
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null check (discount_value > 0),
  min_order_value numeric not null default 0 check (min_order_value >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(campus_id, code)
);

alter table public.vouchers enable row level security;

drop policy if exists "Vouchers are readable by everyone" on public.vouchers;
create policy "Vouchers are readable by everyone" on public.vouchers
  for select using (true);

drop policy if exists "Vouchers are insertable by admins" on public.vouchers;
create policy "Vouchers are insertable by admins" on public.vouchers
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Vouchers are updatable by admins" on public.vouchers;
create policy "Vouchers are updatable by admins" on public.vouchers
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Vouchers are deletable by admins" on public.vouchers;
create policy "Vouchers are deletable by admins" on public.vouchers
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3. Update RPC place_order
drop function if exists public.place_order(text, text, text, text, jsonb);

create or replace function public.place_order(
  p_room_number text,
  p_block text,
  p_payment_method text,
  p_payment_screenshot_url text,
  p_items jsonb,
  p_promo_code text default null,
  p_additional_note text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id    uuid := auth.uid();
  v_campus_id  uuid;
  v_item       record;
  v_line       record;
  v_item_total numeric := 0;
  v_del_fee    numeric := 0;
  v_platform   numeric := 5;     -- PLATFORM_FEE constant
  v_cod_charge numeric := 0;
  v_gst_pct    numeric := 5;     -- GST_PERCENT constant
  v_subtotal   numeric;
  v_gst        numeric;
  v_grand      numeric;
  v_discount_amount numeric := 0;
  v_voucher    record;
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

  -- Compute totals
  v_subtotal := v_item_total + v_del_fee + v_platform + v_cod_charge;

  -- Apply Voucher if provided
  if p_promo_code is null or p_promo_code = '' then
     -- Do nothing
  else
     select * into v_voucher from public.vouchers 
     where campus_id = v_campus_id 
       and upper(code) = upper(p_promo_code)
       and is_active = true;
     
     if found then
       if v_subtotal >= v_voucher.min_order_value then
         if v_voucher.discount_type = 'percentage' then
           v_discount_amount := v_subtotal * (v_voucher.discount_value / 100);
         else
           v_discount_amount := v_voucher.discount_value;
         end if;
         
         -- Ensure discount doesn't exceed subtotal
         if v_discount_amount > v_subtotal then
           v_discount_amount := v_subtotal;
         end if;
       end if;
     end if;
  end if;

  v_subtotal := v_subtotal - v_discount_amount;
  v_gst := v_subtotal * v_gst_pct / 100;
  v_grand := v_subtotal + v_gst;

  -- Generate order number
  v_order_num := public.generate_order_number(v_campus_id);
  v_order_id := gen_random_uuid();

  -- Insert order
  insert into public.orders (
    id, order_number, customer_id, campus_id, room_number, block,
    payment_method, payment_screenshot_url, subtotal, delivery_fee,
    platform_fee, cod_fee, gst, discount_amount, total, is_preorder, promo_code, additional_note
  ) values (
    v_order_id, v_order_num, v_user_id, v_campus_id, p_room_number, p_block,
    p_payment_method::public.payment_method, p_payment_screenshot_url, v_item_total, v_del_fee,
    v_platform, v_cod_charge, v_gst, v_discount_amount, v_grand, false, p_promo_code, p_additional_note
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

-- 4. Update RPC place_preorder
drop function if exists public.place_preorder(text, text, text, text, jsonb);

create or replace function public.place_preorder(
  p_room_number text,
  p_block text,
  p_payment_method text,
  p_payment_screenshot_url text,
  p_items jsonb,
  p_promo_code text default null,
  p_additional_note text default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id    uuid := auth.uid();
  v_campus_id  uuid;
  v_item       record;
  v_line       record;
  v_item_total numeric := 0;
  v_del_fee    numeric := 0;
  v_platform   numeric := 5;
  v_cod_charge numeric := 0;
  v_subtotal   numeric;
  v_gst        numeric;
  v_grand      numeric;
  v_discount_amount numeric := 0;
  v_voucher    record;
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

  -- Apply Voucher if provided
  if p_promo_code is null or p_promo_code = '' then
     -- Do nothing
  else
     select * into v_voucher from public.vouchers 
     where campus_id = v_campus_id 
       and upper(code) = upper(p_promo_code)
       and is_active = true;
     
     if found then
       if v_subtotal >= v_voucher.min_order_value then
         if v_voucher.discount_type = 'percentage' then
           v_discount_amount := v_subtotal * (v_voucher.discount_value / 100);
         else
           v_discount_amount := v_voucher.discount_value;
         end if;
         
         if v_discount_amount > v_subtotal then
           v_discount_amount := v_subtotal;
         end if;
       end if;
     end if;
  end if;

  v_subtotal := v_subtotal - v_discount_amount;
  v_gst := v_subtotal * 5 / 100;
  v_grand := v_subtotal + v_gst;

  v_order_num := public.generate_order_number(v_campus_id);
  v_order_id := gen_random_uuid();

  insert into public.orders (
    id, order_number, customer_id, campus_id, room_number, block,
    payment_method, payment_screenshot_url, subtotal, delivery_fee,
    platform_fee, cod_fee, gst, discount_amount, total, is_preorder, promo_code, additional_note
  ) values (
    v_order_id, v_order_num, v_user_id, v_campus_id, p_room_number, p_block,
    p_payment_method::public.payment_method, p_payment_screenshot_url, v_item_total, v_del_fee,
    v_platform, v_cod_charge, v_gst, v_discount_amount, v_grand, true, p_promo_code, p_additional_note
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
