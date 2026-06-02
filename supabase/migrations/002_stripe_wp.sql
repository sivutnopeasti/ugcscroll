-- 002_stripe_wp.sql
-- Add Stripe subscription columns and WordPress link fields to profiles

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id    text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wp_post_id             integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wp_user_id             integer;

-- Unique indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_idx
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_wp_user_idx
  ON profiles (wp_user_id)
  WHERE wp_user_id IS NOT NULL;

-- Fix public SELECT: show all profiles that have a video (no is_premium gate at DB level)
DROP POLICY IF EXISTS "profiles_public_select" ON profiles;
CREATE POLICY "profiles_public_select"
  ON profiles FOR SELECT
  USING (cloudflare_video_id IS NOT NULL);

-- Allow logged-in creator to always see their own profile (needed for dashboard)
DROP POLICY IF EXISTS "profiles_own_select" ON profiles;
CREATE POLICY "profiles_own_select"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);
