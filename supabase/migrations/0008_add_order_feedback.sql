-- ==========================================================================
-- 0008_add_order_feedback.sql
-- Add feedback column to orders table for customer comments
-- ==========================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS feedback text;
