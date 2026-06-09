-- Migration 003: muuta age INTEGER → TEXT
-- Syy: WP-integraatio lähettää ikä-taksonomian merkkijonona esim. "18-24", "25-34"

-- 1. Poista integer-rajoite (age >= 13 AND age <= 100) — ei sovellu tekstityyppiin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_age_check;

-- 2. Muuta saraketyyppi säilyttäen olemassa olevat arvot (int → text automaattisesti)
ALTER TABLE profiles
  ALTER COLUMN age TYPE text USING age::text;

COMMENT ON COLUMN profiles.age IS
  'Ikä tai ikäryhmä (esim. "28" tai "18-24") — synkataan WordPress-taksonomista';
