-- Fix order number generation to avoid duplicate keys when orders are deleted
create or replace function public.generate_order_number(p_campus_id uuid)
returns text language plpgsql as $$
declare
  v_prefix text;
  v_max_seq int;
begin
  select left(upper(replace(name, ' ', '')), 3) into v_prefix
  from public.campuses where id = p_campus_id;
  v_prefix := coalesce(v_prefix, 'CFD');
  
  -- Extract the last 3 digits of the order number for today's orders matching this prefix globally
  select coalesce(max(substring(order_number from '\d{3}$')::int), 0) into v_max_seq
  from public.orders
  where order_number like (v_prefix || '-' || to_char(now(), 'MMDD') || '-%')
    and created_at >= date_trunc('day', now());
    
  return v_prefix || '-' || to_char(now(), 'MMDD') || '-' || lpad((v_max_seq + 1)::text, 3, '0');
end;
$$;
