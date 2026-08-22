-- Update profiles to cascade delete when a campus is deleted
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_campus_id_fkey,
  ADD CONSTRAINT profiles_campus_id_fkey 
  FOREIGN KEY (campus_id) 
  REFERENCES public.campuses(id) 
  ON DELETE CASCADE;

-- Update orders to cascade delete when a campus is deleted
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_campus_id_fkey,
  ADD CONSTRAINT orders_campus_id_fkey 
  FOREIGN KEY (campus_id) 
  REFERENCES public.campuses(id) 
  ON DELETE CASCADE;
