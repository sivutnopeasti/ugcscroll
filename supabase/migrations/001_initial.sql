-- 001_initial.sql
-- UGC Scroll – initial schema

CREATE TABLE IF NOT EXISTS profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name                 text NOT NULL,
  age                  integer CHECK (age >= 13 AND age <= 100),
  city                 text,
  bio                  text,
  cloudflare_video_id  text,
  video_thumbnail_url  text,
  likes_count          integer NOT NULL DEFAULT 0,
  is_premium           boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_name  text NOT NULL,
  sender_email text NOT NULL,
  company      text,
  message      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_premium_idx ON profiles (is_premium, cloudflare_video_id) WHERE is_premium = true;
CREATE INDEX IF NOT EXISTS contact_requests_profile_id_idx ON contact_requests (profile_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Public: view only premium profiles that have a video
CREATE POLICY "profiles_public_select"
  ON profiles FOR SELECT
  USING (is_premium = true AND cloudflare_video_id IS NOT NULL);

-- Creator: insert own profile
CREATE POLICY "profiles_own_insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Creator: update own profile
CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Creator: delete own profile
CREATE POLICY "profiles_own_delete"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can submit a contact request
CREATE POLICY "contact_public_insert"
  ON contact_requests FOR INSERT
  WITH CHECK (true);

-- Only the profile owner can view their contact requests
CREATE POLICY "contact_own_select"
  ON contact_requests FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Service role function to safely increment/decrement likes_count
CREATE OR REPLACE FUNCTION increment_likes(p_id uuid, delta integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET likes_count = GREATEST(0, likes_count + delta)
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
