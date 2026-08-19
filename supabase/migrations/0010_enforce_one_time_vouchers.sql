-- ==========================================================================
-- Migration 0010: Enforce one-time use per user for vouchers & remove stock delivery fees
-- ==========================================================================

-- 1. Update place_order to check if voucher is already used by this customer
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
    -- Delivery fee is 0 for stock orders
    v_del_fee := 0;

    -- Decrement stock
    update public.items set stock_quantity = stock_quantity - v_qty
    where id = v_item.id;
  end loop;

  -- Compute totals
  v_subtotal := v_item_total + v_del_fee + v_platform + v_cod_charge;

  -- Apply Voucher if provided
  if p_promo_code is not null and p_promo_code != '' then
     -- ENFORCE ONE TIME USE
     if exists (
       select 1 from public.orders 
       where customer_id = v_user_id 
         and upper(promo_code) = upper(p_promo_code) 
         and order_status != 'cancelled'
     ) then
       raise exception 'You have already used this promo code';
     end if;

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


-- 2. Update place_preorder to check if voucher is already used by this customer
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
    -- Delivery fee is applied for pre-orders
    v_del_fee := v_del_fee + (v_item.delivery_fee * v_qty);
    -- No stock decrement for preorders
  end loop;

  v_subtotal := v_item_total + v_del_fee + v_platform + v_cod_charge;

  -- Apply Voucher if provided
  if p_promo_code is not null and p_promo_code != '' then
     -- ENFORCE ONE TIME USE
     if exists (
       select 1 from public.orders 
       where customer_id = v_user_id 
         and upper(promo_code) = upper(p_promo_code) 
         and order_status != 'cancelled'
     ) then
       raise exception 'You have already used this promo code';
     end if;

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
