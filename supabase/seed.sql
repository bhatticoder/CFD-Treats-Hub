-- ==========================================================================
-- Seed data for local development
-- Run after applying all migrations.
-- ==========================================================================

-- Test campus
insert into public.campuses (id, name, domain_suffix, gender, cod_cap_percent, shift_active, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'CFD Campus (Boys)',
  '@cfd.nu.edu.pk',
  'Male',
  100,
  true,
  true
);

-- Note: To seed an admin, first sign up via the app, then run:
-- UPDATE profiles SET role = 'admin' WHERE email = '<your-email>';
--
-- To seed test items, use the admin inventory manager in the UI.
