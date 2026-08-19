create or replace function public.check_email_eligibility(p_email text)
returns boolean language plpgsql security definer as $$
declare
  v_exists boolean;
  v_domain_match boolean;
begin
  -- 1. Check if the email already exists in profiles (and is active)
  -- This covers pre-added admins, managers, or previously registered users.
  select exists (
    select 1 from public.profiles
    where lower(email) = lower(p_email)
    and is_active = true
  ) into v_exists;

  if v_exists then
    return true;
  end if;

  -- 2. If it does not exist, check if it matches ANY active campus's domain suffix
  select exists (
    select 1 from public.campuses
    where is_active = true
    and domain_suffix is not null
    and domain_suffix <> ''
    and lower(p_email) like '%' || lower(domain_suffix)
  ) into v_domain_match;

  return v_domain_match;
end;
$$;
