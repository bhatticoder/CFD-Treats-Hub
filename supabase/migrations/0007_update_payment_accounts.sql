-- ==========================================================================
-- 0007_update_payment_accounts.sql
-- Add payment account numbers to campuses
-- ==========================================================================

-- Update Boys hostel payment number
UPDATE public.campuses 
SET payment_account_info = 'NAYAPAY 03236232156'
WHERE name ILIKE '%boy%' OR gender = 'Male';

-- Update Girls hostel payment number
UPDATE public.campuses 
SET payment_account_info = 'SADAPAY 03236232156'
WHERE name ILIKE '%girl%' OR gender = 'Female';
