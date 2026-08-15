-- ==========================================================================
-- CFD Hostel Treats — Auth Role Constraints & Validation
-- ==========================================================================

-- This function verifies if a given email is already associated with an 
-- admin or manager profile in the database. 
-- It runs as SECURITY DEFINER so that unauthenticated (anon) users can invoke 
-- it during the login flow *before* an OTP is sent.

CREATE OR REPLACE FUNCTION public.check_external_auth_role(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = p_email 
    AND role IN ('admin', 'manager')
    AND is_active = true
  );
$$;

-- Grant execution to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.check_external_auth_role(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_external_auth_role(text) TO authenticated;
