-- ====================================
-- Parent profiles — personalization gated by Supabase Auth
-- Run in Supabase SQL Editor
-- ====================================

CREATE TABLE IF NOT EXISTS parent_profiles (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT,
  family_name    TEXT NOT NULL DEFAULT '',
  neighborhood   TEXT,
  children       JSONB NOT NULL DEFAULT '[]'::jsonb,
  interests      TEXT[] NOT NULL DEFAULT '{}',
  notifications  JSONB NOT NULL DEFAULT '{"whatsapp":true,"emailWeekly":true,"reminders":false}'::jsonb,
  phone          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION parent_profiles_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_parent_profiles_updated_at ON parent_profiles;
CREATE TRIGGER trg_parent_profiles_updated_at
  BEFORE UPDATE ON parent_profiles
  FOR EACH ROW EXECUTE FUNCTION parent_profiles_touch_updated_at();

ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_profiles_select ON parent_profiles;
DROP POLICY IF EXISTS parent_profiles_insert ON parent_profiles;
DROP POLICY IF EXISTS parent_profiles_update ON parent_profiles;
DROP POLICY IF EXISTS parent_profiles_delete ON parent_profiles;

CREATE POLICY parent_profiles_select ON parent_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY parent_profiles_insert ON parent_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY parent_profiles_update ON parent_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY parent_profiles_delete ON parent_profiles
  FOR DELETE USING (auth.uid() = user_id);
