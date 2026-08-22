-- Add halls array to campuses
ALTER TABLE public.campuses ADD COLUMN halls text[] DEFAULT '{}'::text[];

-- Backfill existing campuses
UPDATE public.campuses SET halls = ARRAY['Iqbal', 'Jinnah'] WHERE name ILIKE '%Boys%';
UPDATE public.campuses SET halls = ARRAY['Main Building'] WHERE name ILIKE '%Girls%';
