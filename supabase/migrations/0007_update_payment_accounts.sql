-- ==========================================================================
-- 0007_update_payment_accounts.sql
-- Add payment account numbers to campuses
-- ==========================================================================

-- 1. Ensure the column exists
ALTER TABLE public.campuses ADD COLUMN IF NOT EXISTS payment_account_info text;

-- 2. Update Boys hostel payment number
UPDATE public.campuses 
SET payment_account_info = 'NAYAPAY 03236232156'
WHERE name ILIKE '%boy%' OR gender = 'Male';

-- Update Girls hostel payment number
UPDATE public.campuses 
SET payment_account_info = 'SADAPAY 03236232156'
WHERE name ILIKE '%girl%' OR gender = 'Female';
