-- Migration 0009: Push Subscriptions and Delivery Self-Pickup

-- 1. Add delivery controls to campuses table
ALTER TABLE public.campuses
ADD COLUMN IF NOT EXISTS delivery_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS collection_room TEXT;

-- 2. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to make it safe to re-run)
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role full access on push_subscriptions" ON public.push_subscriptions;

-- Allow users to manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also allow service_role to manage
CREATE POLICY "Service role full access on push_subscriptions"
ON public.push_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
