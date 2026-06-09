-- Migration 003: muuta age INTEGER → TEXT
-- Syy: WP-integraatio lähettää ikä-taksonomian merkkijonona esim. "18-24", "25-34"

ALTER TABLE profiles
  ALTER COLUMN age TYPE text USING age::text;

COMMENT ON COLUMN profiles.age IS
  'Ikä tai ikäryhmä (esim. "28" tai "18-24") — synkataan WordPress-taksonomista';
